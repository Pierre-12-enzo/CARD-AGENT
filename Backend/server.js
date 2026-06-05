// server.js - MODIFIED FOR RENDER DEPLOYMENT
require("dotenv").config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const globalAudit = require('./middleware/globalAudit');
const AuditService = require('./services/auditService');

const app = express();

// ==================== CREATE HTTP SERVER WITH SOCKET.IO ====================
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://card-agent-virid.vercel.app',
        // Add your custom domain if any
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`⚠️ Blocked Socket.io CORS from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
});

// Make io accessible
app.set('io', io);
global.io = io;

// ==================== SOCKET.IO AUTHENTICATION ====================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('firstName lastName email role companyId isActive');

    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    socket.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    };

    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Authentication failed'));
  }
});

// Socket service
const socketService = require('./services/socketService');
socketService.init(io);

// Socket connection handler
// Socket connection handler - UPDATE THIS SECTION
io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.user?.email} (${socket.user?.role})`);

  socketService.trackUser(socket.id, {
    id: socket.user.id,
    email: socket.user.email,
    role: socket.user.role,
    companyId: socket.user.companyId
  });

  socket.join(`user_${socket.user.id}`);
  socket.join(`role_${socket.user.role}`);

  if (socket.user.companyId) {
    socket.join(`company_${socket.user.companyId}`);
  }

  socket.on('subscribe:student', (orgId) => {
    if (orgId) socket.join(`org_${orgId}`);
  });

  // ✅ FIX: Add batch subscription handler
  socket.on('card:subscribe', (data) => {
    if (data && data.batchId) {
      console.log(`📡 Client ${socket.id} subscribed to batch: ${data.batchId}`);
      socket.join(`batch_${data.batchId}`);
    }
  });

  socket.on('unsubscribe:student', (orgId) => {
    if (orgId) socket.leave(`org_${orgId}`);
  });

  socket.on('unsubscribe:batch', (data) => {
    if (data && data.batchId) {
      console.log(`📡 Client ${socket.id} unsubscribed from batch: ${data.batchId}`);
      socket.leave(`batch_${data.batchId}`);
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: Date.now(),
      onlineUsers: socketService.getStats()
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${socket.user?.email}`);
    socketService.untrackUser(socket.id);
  });
});

module.exports = { app, server, io };

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  'http://localhost:5173',
  'https://card-agent-virid.vercel.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
//app.options('*', cors(corsOptions));

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// ==================== AUTHENTICATION ====================
const authMiddleware = require('./middleware/authMiddleware');

const publicPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/check-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/'
];

app.use(async (req, res, next) => {
  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  if (isPublicPath) {
    return next();
  }
  return authMiddleware(req, res, next);
});

app.use(globalAudit);

// ==================== API ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/card', require('./routes/card'));
app.use('/api/students', require('./routes/student'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/co-workers', require('./routes/co-worker.js'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/company', require('./routes/company.js'));
app.use('/api/organizations', require('./routes/school.js'));
app.use('/api/card-history', require('./routes/cardHistory.js'));

// ==================== MONGOOSE CONNECTION ====================
const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 60000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 30000,
  retryWrites: true,
  retryReads: true,
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(e => {
    console.error('❌ MongoDB connection error:', e.message);
  });

// ==================== HEALTH CHECK (IMPORTANT FOR RENDER KEEP-ALIVE) ====================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socketio: io ? 'ready' : 'not initialized',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'CAP_mis Backend API',
    version: '1.0.0',
    status: 'operational'
  });
});

// ==================== ERROR HANDLING ====================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('🔥 Global error:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'Cross-origin request blocked'
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 CAP_mis Backend Server running on Render`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS Allowed: ${allowedOrigins.join(', ')}`);
  console.log(`🔌 Socket.io: Enabled`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  io.close(() => {
    server.close(() => {
      mongoose.connection.close(() => {
        process.exit(0);
      });
    });
  });
});