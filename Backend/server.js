// server.js - WITH SOCKET.IO ADDED
require("dotenv").config();
const express = require('express');
const http = require('http'); // ✅ ADD THIS - For creating HTTP server
const socketIo = require('socket.io'); // ✅ ADD THIS
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken'); // ✅ ADD THIS - For socket auth
const User = require('./models/User'); // ✅ ADD THIS - For socket auth
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
        'https://card-agent-virid.vercel.app',  // ✅ Add your Vercel domain

      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible to routes and middleware
app.set('io', io);

// ==================== SOCKET.IO AUTHENTICATION MIDDLEWARE ====================
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

    // Attach user to socket
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

// In server.js, after io.use
io.engine.on('connection_error', (err) => {
  console.log('❌ Socket connection error:', err.message);
  console.log('Request:', err.req);
});

// ==================== INITIALIZE SOCKET SERVICE ====================
const socketService = require('./services/socketService');
socketService.init(io);

// ==================== SOCKET.IO CONNECTION HANDLER ====================
io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.user?.email} (${socket.user?.role})`);

  // Track user
  socketService.trackUser(socket.id, {
    id: socket.user.id,
    email: socket.user.email,
    role: socket.user.role,
    companyId: socket.user.companyId
  });

  // Join rooms
  socket.join(`user_${socket.user.id}`);
  socket.join(`role_${socket.user.role}`);

  if (socket.user.companyId) {
    socket.join(`company_${socket.user.companyId}`);
  }

  // If co-worker, join their permitted organization rooms
  if (socket.user.role === 'co_worker') {
    User.findById(socket.user.id).select('permissions').then(user => {
      if (user?.permissions) {
        user.permissions.forEach(perm => {
          socket.join(`org_${perm.organizationId}`);
        });
      }
    }).catch(err => console.error('Error joining org rooms:', err));
  }

  // Handle subscription to specific events
  socket.on('subscribe:student', (orgId) => {
    if (orgId) socket.join(`org_${orgId}`);
  });

  socket.on('subscribe:batch', (batchId) => {
    if (batchId) socket.join(`batch_${batchId}`);
  });

  socket.on('unsubscribe:student', (orgId) => {
    if (orgId) socket.leave(`org_${orgId}`);
  });

  socket.on('unsubscribe:batch', (batchId) => {
    if (batchId) socket.leave(`batch_${batchId}`);
  });

  // Handle ping/pong
  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: Date.now(),
      onlineUsers: socketService.getStats()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${socket.user?.email}`);
    socketService.untrackUser(socket.id);
  });
});

// ==================== EXPORT IO FOR USE IN OTHER FILES ====================

// ✅ Store io in app locals instead of exporting directly
app.set('io', io);

// ✅ Also make it available globally for models
global.io = io;

// Then export
module.exports = { app, server, io };


// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  //'https://cap-mis.vercel.app',
  'http://localhost:5173',
  //'https://cap-mis.ilelio.rw'
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

// Handle preflight requests
//app.options('/*', cors(corsOptions));

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

// ✅ GLOBAL AUTHENTICATION MIDDLEWARE
const authMiddleware = require('./middleware/authMiddleware');

// Public paths that don't need authentication
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

  // Apply auth for protected routes
  return authMiddleware(req, res, next);
});

// ✅ AUDIT MIDDLEWARE (Now req.user will be available)
app.use(globalAudit);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/card', require('./routes/card'));
app.use('/api/students', require('./routes/student'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/co-workers', require('./routes/co-worker.js'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/company', require('./routes/company'));
app.use('/api/organizations', require('./routes/school'));
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
  .then(() => console.log('✅ MongoDB → CAP_mis connected successfully'))
  .catch(e => {
    console.error('❌ MongoDB connection error:', e.message);
    console.log('📌 Please check:');
    console.log('   1. Is MongoDB Atlas cluster running?');
    console.log('   2. Is IP whitelisted in Atlas?');
    console.log('   3. Are credentials correct in .env?');
  });

mongoose.connection.on('connected', () => {
  console.log('📊 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ==================== ROUTES ====================
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
    status: 'operational',
    socketio: true,
    endpoints: [
      '/api/auth',
      '/api/card',
      '/api/students',
      '/api/templates',
      '/api/analytics',
      '/api/audit'
    ]
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
      error: 'Cross-origin request blocked',
      message: 'Your origin is not allowed to access this API'
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


// ==================== SERVER START (using server variable, not app.listen) ====================
const PORT = process.env.PORT || 5000;

// ✅ IMPORTANT: Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 CAP_mis Backend Server`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔌 Socket.io: Enabled and ready`);
  console.log('='.repeat(50));

  console.log('📝 Configuration:');
  console.log(`   - MongoDB: ${process.env.MONGO_URI ? 'Configured' : 'Missing'}`);
  console.log(`   - Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Missing'}`);
  console.log(`   - Socket.io: Real-time audit events enabled`);
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  //CronManager.stopAll();
  io.close(() => {
    console.log('Socket.io closed');
    server.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  //CronManager.stopAll();
  io.close(() => {
    console.log('Socket.io closed');
    server.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  });
});