// services/socket.js - FIXED VERSION
import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

// Get the backend URL based on environment
const getSocketUrl = () => {
    // Development
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000'; // Backend port
    }
    // Production
    // Production - USE YOUR BACKEND URL, NOT window.location.origin
    return import.meta.env.VITE_API_URL;
};

const SOCKET_URL = getSocketUrl();
console.log('🔌 Socket URL:', SOCKET_URL);

// Initialize socket with authentication token
export const initializeSocket = (token) => {
    // Don't reinitialize if already connected with same token
    if (socket && socket.connected && currentToken === token) {
        console.log('✅ Socket already connected, ID:', socket.id);
        return socket;
    }

    // Disconnect existing socket if any
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

    // ✅ FIXED: Only use auth, not query
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

    // Socket event listeners
    socket.on('connect', () => {
        console.log('✅ Socket connected successfully! ID:', socket.id);
        console.log('📡 Transport:', socket.io.engine.transport.name);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        console.log('📡 Will retry with polling if needed...');

        // Fallback to polling if websocket fails
        if (socket.io.engine.transport.name === 'websocket') {
            console.log('🔄 Falling back to polling...');
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Server initiated disconnect, attempt to reconnect
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

// Disconnect socket
export const disconnectSocket = () => {
    if (socket) {
        console.log('🔌 Manually disconnecting socket...');
        socket.disconnect();
        socket = null;
        currentToken = null;
    }
};

// Get current socket instance
export const getSocket = () => {
    return socket;
};

// Check if socket is connected
export const isSocketConnected = () => {
    return socket && socket.connected;
};

// Reconnect socket with new token
export const reconnectSocket = (token) => {
    console.log('🔄 Reconnecting socket with new token...');
    if (socket) {
        disconnectSocket();
    }
    return initializeSocket(token);
};

// Export default for convenience
export default socket;