// services/socket.js - COMPLETE VERSION
import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

// Get the backend URL based on environment
const getSocketUrl = () => {
    // Development
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000'; // Backend port, not frontend
    }
    // Production
    return window.location.origin; // Use same domain
};

const SOCKET_URL = getSocketUrl();
console.log('🔌 Socket URL:', SOCKET_URL);

// Initialize socket with authentication token
export const initializeSocket = (token) => {
    // Don't reinitialize if already connected with same token
    if (socket && socket.connected && currentToken === token) {
        console.log('✅ Socket already connected');
        return socket;
    }

    // Disconnect existing socket if any
    if (socket) {
        console.log('🔄 Disconnecting existing socket...');
        socket.disconnect();
    }

    console.log('🔌 Initializing socket connection...');

    // Create new socket connection with auth token
    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
        auth: {
            token: token
        },
        query: {
            token: token
        }
    });

    currentToken = token;

    // Socket event listeners
    socket.on('connect', () => {
        console.log('✅ Socket connected successfully:', socket.id);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        // Don't clear token on auth error immediately, might be temporary
        if (error.message === 'Authentication error') {
            console.error('Socket authentication failed - token may be invalid');
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Server disconnected, attempt to reconnect
            socket.connect();
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error);
    });

    return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
    if (socket) {
        console.log('🔌 Disconnecting socket...');
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
    if (socket) {
        disconnectSocket();
    }
    return initializeSocket(token);
};

// Export default for convenience
export default socket;