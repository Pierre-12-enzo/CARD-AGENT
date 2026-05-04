const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Who performed the action
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true
    },
    
    // User info at time of action (in case user changes later)
    userInfo: {
        email: String,
        role: String,
        name: String
    },
    
    // Where the action happened
    schoolId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'School',
        index: true
    },
    
    // School info at time of action
    schoolInfo: {
        name: String,
        code: String
    },
    
    // What action was performed
    action: { 
        type: String, 
        required: true,
        enum: [
            // Auth actions
            'CREATE_REGISTER', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
            
            // User management
            'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'DEACTIVATE_USER', 'DEACTIVATE_STAFF', 'ACTIVATE_STAFF', 'DELETE_STAFF', 'ACTIVATE_USER',
            'CREATE_STAFF', 'UPDATE_STAFF', 'DELETE_STAFF', 'UPDATE_STAFF_PERMISSIONS',
            'RESEND_STAFF_INVITE', 'BULK_CREATE_STAFF',
            
            // School management
            'CREATE_SCHOOL', 'UPDATE_SCHOOL', 'DELETE_SCHOOL',
            
            // Student management
            'CREATE_STUDENT', 'UPDATE_STUDENT', 'DELETE_STUDENT', 'BULK_CREATE_STUDENTS',
            'IMPORT_STUDENTS_CSV', 'EXPORT_STUDENTS',
            
            // Card management
            'GENERATE_CARD', 'UPDATE_CARD', 'DELETE_CARD', 'BULK_GENERATE_CARDS',
            'PRINT_CARD', 'DOWNLOAD_CARD',
            
            // Template management
            'CREATE_TEMPLATE', 'UPDATE_TEMPLATE', 'DELETE_TEMPLATE', 'DUPLICATE_TEMPLATE',
            
            // Attendance
            'MARK_ATTENDANCE', 'BULK_MARK_ATTENDANCE', 'UPDATE_ATTENDANCE',
            
            // Photo uploads
            'UPLOAD_PHOTO', 'BULK_UPLOAD_PHOTOS', 'DELETE_PHOTO',
            
            // Subscription/Payment
            'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELLED',
            'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_GENERATED',
            
            // Settings
            'UPDATE_SETTINGS', 'UPDATE_PERMISSIONS',
            
            // API
            'API_KEY_CREATED', 'API_KEY_REVOKED',
            
            // System
            'SYSTEM_ERROR', 'SYSTEM_WARNING'
        ],
        index: true
    },
    
    // Details of what was changed (stored as flexible object)
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Before and after values (for updates)
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    
    // Target of the action (what was affected)
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel'
    },
    targetModel: {
        type: String,
        enum: ['User', 'School', 'Student', 'Card', 'Template', 'Attendance', 'Subscription']
    },
    
    // Status of the action
    status: {
        type: String,
        enum: ['success', 'failure', 'pending'],
        default: 'success',
        index: true
    },
    
    // Error message if failed
    errorMessage: String,
    
    // Request metadata
    ipAddress: String,
    userAgent: String,
    requestMethod: String,
    requestUrl: String,
    
    // Response time (ms)
    responseTime: Number,
    
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Importance level
    importance: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
        index: true
    }
    
}, { 
    timestamps: true,
    // Create a capped collection to prevent unlimited growth
    // This is optional - remove if you want unlimited history
    //capped: { size: 1024 * 1024 * 100, max: 10000 } // 100MB, 10000 documents
});

// ===== INDEXES =====
auditLogSchema.index({ createdAt: -1 }); // For sorting by date
auditLogSchema.index({ userId: 1, createdAt: -1 }); // User's history
auditLogSchema.index({ schoolId: 1, createdAt: -1 }); // School's history
auditLogSchema.index({ action: 1, createdAt: -1 }); // Action type history
auditLogSchema.index({ targetId: 1, targetModel: 1 }); // Find logs for specific entity
auditLogSchema.index({ importance: 1, createdAt: -1 }); // Critical events first
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 }); // 60 days

// ===== COMPOUND INDEXES =====
auditLogSchema.index({ schoolId: 1, action: 1, createdAt: -1 }); // School + action
auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 }); // User + action
auditLogSchema.index({ status: 1, createdAt: -1 }); // Failed actions

// ===== MIDDLEWARE =====
auditLogSchema.pre('save', async function(next) {
    // Auto-populate user info if not provided
    if (this.userId && !this.userInfo?.email) {
        try {
            const User = mongoose.model('User');
            const user = await User.findById(this.userId).select('email role firstName lastName');
            if (user) {
                this.userInfo = {
                    email: user.email,
                    role: user.role,
                    name: user.firstName && user.lastName ? 
                          `${user.firstName} ${user.lastName}` : user.email
                };
            }
        } catch (error) {
            console.error('Error populating user info in audit log:', error);
        }
    }
    
    // Auto-populate school info if not provided
    if (this.schoolId && !this.schoolInfo?.name) {
        try {
            const School = mongoose.model('School');
            const school = await School.findById(this.schoolId).select('name code');
            if (school) {
                this.schoolInfo = {
                    name: school.name,
                    code: school.code
                };
            }
        } catch (error) {
            console.error('Error populating school info in audit log:', error);
        }
    }
    
    next();
});
// models/AuditLog.js - ADD POST-SAVE HOOK
auditLogSchema.post('save', async function(doc) {
  try {
    // Populate required fields for real-time emission
    const populatedDoc = await doc.populate('userId', 'firstName lastName email role');
    
    const logData = {
      _id: doc._id,
      action: doc.action,
      status: doc.status,
      importance: doc.importance,
      userId: doc.userId,
      userInfo: {
        name: populatedDoc.userId ? 
          `${populatedDoc.userId.firstName} ${populatedDoc.userId.lastName}` : 'Unknown',
        email: populatedDoc.userId?.email,
        role: populatedDoc.userId?.role
      },
      schoolId: doc.schoolId,
      schoolInfo: doc.schoolInfo,
      targetModel: doc.targetModel,
      targetId: doc.targetId,
      details: doc.details,
      ipAddress: doc.ipAddress,
      createdAt: doc.createdAt
    };
    
    // Emit to socket.io if available
    const io = require('../server').io;
    if (io) {
      // Emit to specific rooms based on hierarchy
      if (doc.userId) {
        io.to(`user_${doc.userId}`).emit('audit:new', logData);
      }
      
      if (doc.schoolId) {
        io.to(`school_${doc.schoolId}`).emit('audit:new', logData);
      }
      
      // Critical events to super admins
      if (doc.importance === 'critical') {
        io.to('role_super_admin').emit('audit:critical', logData);
      }
      
      // Broadcast to all connected clients with appropriate permissions
      io.emit('audit:global', { 
        action: doc.action, 
        importance: doc.importance,
        schoolId: doc.schoolId
      });
    }
  } catch (error) {
    console.error('Failed to emit real-time audit log:', error);
  }
});

// ===== STATIC METHODS =====

/**
 * Log an action
 */
auditLogSchema.statics.log = async function({
    userId,
    action,
    schoolId = null,
    details = {},
    changes = null,
    targetId = null,
    targetModel = null,
    status = 'success',
    errorMessage = null,
    req = null,
    importance = 'medium',
    metadata = {}
}) {
    try {
        const logData = {
            userId,
            action,
            schoolId,
            details,
            changes,
            targetId,
            targetModel,
            status,
            errorMessage,
            importance,
            metadata
        };
        
        // Add request info if available
        if (req) {
            logData.ipAddress = req.ip || req.connection?.remoteAddress;
            logData.userAgent = req.get('User-Agent');
            logData.requestMethod = req.method;
            logData.requestUrl = req.originalUrl || req.url;
            logData.responseTime = req._startTime ? Date.now() - req._startTime : null;
        }
        
        const log = await this.create(logData);
        return log;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - logging should never break the main flow
        return null;
    }
};

/**
 * Get audit trail for a specific entity
 */
auditLogSchema.statics.getAuditTrail = async function(entityId, entityModel, options = {}) {
    const {
        limit = 50,
        skip = 0,
        startDate,
        endDate,
        actions = []
    } = options;
    
    const query = {
        targetId: entityId,
        targetModel: entityModel
    };
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (actions.length > 0) {
        query.action = { $in: actions };
    }
    
    return this.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

/**
 * Get user activity
 */
auditLogSchema.statics.getUserActivity = async function(userId, options = {}) {
    const {
        limit = 50,
        skip = 0,
        startDate,
        endDate,
        schools = [] // Array of schoolIds to filter by
    } = options;
    
    const query = { userId };
    
    if (schools.length > 0) {
        query.schoolId = { $in: schools };
    }
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    return this.find(query)
        .populate('schoolId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

/**
 * Get school activity summary
 */
auditLogSchema.statics.getSchoolActivity = async function(schoolId, options = {}) {
    const {
        days = 30,
        groupBy = 'day' // 'day', 'week', 'month', 'action'
    } = options;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const match = {
        schoolId,
        createdAt: { $gte: startDate }
    };
    
    let group = {};
    if (groupBy === 'action') {
        group = { _id: '$action', count: { $sum: 1 } };
    } else {
        const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : 
                          groupBy === 'week' ? '%Y-%U' : '%Y-%m';
        group = {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            count: { $sum: 1 }
        };
    }
    
    return this.aggregate([
        { $match: match },
        { $group: group },
        { $sort: { _id: -1 } }
    ]);
};

/**
 * Get summary statistics
 */
auditLogSchema.statics.getStats = async function(options = {}) {
    const {
        schoolId,
        userId,
        days = 30,
        importance
    } = options;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const match = { createdAt: { $gte: startDate } };
    if (schoolId) match.schoolId = schoolId;
    if (userId) match.userId = userId;
    if (importance) match.importance = importance;
    
    const stats = await this.aggregate([
        { $match: match },
        {
            $facet: {
                totalCount: [{ $count: 'count' }],
                byAction: [
                    { $group: { _id: '$action', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ],
                byUser: [
                    { $group: { _id: '$userId', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                    { $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }}
                ],
                byDay: [
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                byImportance: [
                    { $group: { _id: '$importance', count: { $sum: 1 } } }
                ],
                successRate: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            success: {
                                $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                            },
                            failed: {
                                $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
                            }
                        }
                    }
                ]
            }
        }
    ]);
    
    return stats[0];
};

// ===== VIRTUALS =====
auditLogSchema.virtual('formattedAction').get(function() {
    return this.action.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
});

auditLogSchema.virtual('timeAgo').get(function() {
    const diff = Date.now() - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
});

module.exports = mongoose.model('AuditLog', auditLogSchema);