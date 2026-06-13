// services/socket.js - FIXED FOR DEVELOPMENT
import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

// Get the backend URL based on environment
const getSocketUrl = () => {
    // 1. Check if we're in development mode FIRST
    const isDevelopment = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
        console.log('🔌 Development mode - using localhost mode');
        return 'http://localhost:5000';
    }

    // 2. For production, use environment variable
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
        // Convert https://card-agent-256t.onrender.com/api to https://card-agent-256t.onrender.com
        const socketUrl = apiUrl.replace(/\/api$/, '');
        console.log('🔌 Production mode - using:', socketUrl);
        return socketUrl;
    }

    // 3. Fallback (should never hit in production if env vars are set)
    console.warn('⚠️ No VITE_API_URL found, using fallback');
    return 'https://card-agent-backend.onrender.com';
};

const SOCKET_URL = getSocketUrl();
console.log('🔌 Socket URL:', SOCKET_URL);

// Initialize socket with authentication token
export const initializeSocket = (token) => {
    if (socket && socket.connected && currentToken === token) {
        console.log('✅ Socket already connected, ID:', socket.id);
        return socket;
    }

    if (socket) {
        console.log('🔄 Disconnecting existing socket...');
        socket.disconnect();
        socket = null;
    }

    if (!token) {
        console.error('❌ Cannot initialize socket: No token provided');
        return null;
    }

    console.log('🔌 Initializing socket connection with token...');

    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true,
        auth: {
            token: token
        }
    });

    currentToken = token;

    socket.on('connect', () => {
        console.log('✅ Socket connected successfully! ID:', socket.id);
        console.log('📡 Transport:', socket.io.engine.transport.name);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        if (socket.io.engine.transport.name === 'websocket') {
            console.log('🔄 Falling back to polling...');
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            console.log('🔄 Attempting to reconnect...');
            socket.connect();
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed after all attempts');
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        console.log('🔌 Manually disconnecting socket...');
        socket.disconnect();
        socket = null;
        currentToken = null;
    }
};

export const waitForSocketConnection = (maxWaitMs = 5000) => {
    return new Promise((resolve, reject) => {
        if (socket && socket.connected) {
            resolve(socket);
            return;
        }

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (socket && socket.connected) {
                clearInterval(checkInterval);
                resolve(socket);
            } else if (Date.now() - startTime > maxWaitMs) {
                clearInterval(checkInterval);
                reject(new Error('Socket connection timeout'));
            }
        }, 100);
    });
};

export const getSocket = () => socket;
export const isSocketConnected = () => socket && socket.connected;
export const reconnectSocket = (token) => {
    console.log('🔄 Reconnecting socket with new token...');
    if (socket) disconnectSocket();
    return initializeSocket(token);
};

export default socket;