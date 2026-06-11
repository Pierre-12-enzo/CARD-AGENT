// services/socketService.js
const EventEmitter = require('events');

class SocketService extends EventEmitter {
    constructor() {
        super();
        this.io = null;
        this.connectedUsers = new Map(); // Track connected users
    }

    /**
     * Initialize with Socket.io instance
     */
    init(io) {
        this.io = io;

        // ==================== STUDENT EVENTS ====================
        this.on('student:created', (data) => {
            this.emitToCompany(data.companyId, 'student:created', data);
            this.emitToOrg(data.organizationId, 'student:created', data);
        });

        this.on('student:updated', (data) => {
            this.emitToCompany(data.companyId, 'student:updated', data);
            this.emitToOrg(data.organizationId, 'student:updated', data);
        });

        this.on('student:deleted', (data) => {
            this.emitToCompany(data.companyId, 'student:deleted', data);
            this.emitToOrg(data.organizationId, 'student:deleted', data);
        });

        this.on('student:bulk-import', (data) => {
            this.emitToCompany(data.companyId, 'student:bulk-import', data);
            this.emitToUser(data.userId, 'student:bulk-import-progress', data);
        });

        // ==================== CARD EVENTS ====================
        this.on('card:generated', (data) => {
            this.emitToCompany(data.companyId, 'card:generated', data);
            this.emitToUser(data.userId, 'card:generated', data);
        });

        this.on('card:batch-started', (data) => {
            this.emitToUser(data.userId, 'card:batch-started', data);
        });

        this.on('card:batch-progress', (data) => {
            this.emitToUser(data.userId, 'card:batch-progress', data);
        });

        this.on('card:batch-complete', (data) => {
            this.emitToUser(data.userId, 'card:batch-complete', data);
        });

        this.on('card:batch-error', (data) => {
            this.emitToUser(data.userId, 'card:batch-error', data);
        });

        // ==================== ORGANIZATION EVENTS ====================
        this.on('organization:created', (data) => {
            this.emitToCompany(data.companyId, 'organization:created', data);
        });

        this.on('organization:updated', (data) => {
            this.emitToCompany(data.companyId, 'organization:updated', data);
            this.emitToOrg(data.organizationId, 'organization:updated', data);
        });

        this.on('organization:deleted', (data) => {
            this.emitToCompany(data.companyId, 'organization:deleted', data);
        });

        // ==================== CO-WORKER EVENTS ====================
        this.on('co-worker:invited', (data) => {
            this.emitToCompany(data.companyId, 'co-worker:invited', data);
        });

        this.on('co-worker:updated', (data) => {
            this.emitToCompany(data.companyId, 'co-worker:updated', data);
        });

        this.on('co-worker:deleted', (data) => {
            this.emitToCompany(data.companyId, 'co-worker:deleted', data);
        });

        // ==================== TEMPLATE EVENTS ====================
        this.on('template:created', (data) => {
            this.emitToCompany(data.companyId, 'template:created', data);
            this.emitToOrg(data.organizationId, 'template:created', data);
        });

        this.on('template:deleted', (data) => {
            this.emitToCompany(data.companyId, 'template:deleted', data);
            this.emitToOrg(data.organizationId, 'template:deleted', data);
        });

        // ==================== AUDIT EVENTS ====================
        this.on('audit:new', (data) => {
            this.emitToCompany(data.companyId, 'audit:new', data);
            if (data.userId) {
                this.emitToUser(data.userId, 'audit:new', data);
            }
            if (data.importance === 'critical') {
                this.emitToRole('super_admin', 'audit:critical', data);
            }
        });

        // ==================== NOTIFICATION EVENTS ====================
        this.on('notification:new', (data) => {
            this.emitToUser(data.userId, 'notification:new', data);
        });

        console.log('✅ SocketService initialized with all event handlers');
    }

    /**
     * Track a newly connected user
     */
    trackUser(socketId, userData) {
        this.connectedUsers.set(socketId, {
            ...userData,
            connectedAt: new Date()
        });
    }

    /**
     * Remove disconnected user
     */
    untrackUser(socketId) {
        this.connectedUsers.delete(socketId);
    }

    /**
     * Get online users count for a company
     */
    getOnlineCount(companyId) {
        let count = 0;
        this.connectedUsers.forEach((user) => {
            if (user.companyId?.toString() === companyId?.toString()) {
                count++;
            }
        });
        return count;
    }

    /**
     * Emit to all users in a company
     */
    emitToCompany(companyId, event, data) {
        if (this.io && companyId) {
            this.io.to(`company_${companyId}`).emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Emit to a specific user
     */
    emitToUser(userId, event, data) {
        if (this.io && userId) {
            this.io.to(`user_${userId}`).emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Emit to all users with a specific role
     */
    emitToRole(role, event, data) {
        if (this.io) {
            this.io.to(`role_${role}`).emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Emit to a specific organization's connected users
     */
    emitToOrg(organizationId, event, data) {
        if (this.io && organizationId) {
            this.io.to(`org_${organizationId}`).emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Broadcast to all connected clients
     */
    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get connected users stats
     */
    getStats() {
        const stats = {
            total: this.connectedUsers.size,
            byRole: {},
            byCompany: {}
        };

        this.connectedUsers.forEach((user) => {
            // By role
            stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
            // By company
            if (user.companyId) {
                const companyKey = user.companyId.toString();
                stats.byCompany[companyKey] = (stats.byCompany[companyKey] || 0) + 1;
            }
        });

        return stats;
    }


    /**
     * get batch status
     */

    getBatchStatus(batchId, userId) {
        // This would need access to the progressStore
        // You might want to pass a callback or emit directly
        if (global.progressStore && global.progressStore.has(batchId)) {
            this.emitToUser(userId, 'card:batch-progress', global.progressStore.get(batchId));
        }
    }

}

// Singleton instance
module.exports = new SocketService();