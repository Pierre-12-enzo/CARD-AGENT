// middleware/auditMiddleware.js
const AuditLog = require('../models/AuditLog');

/**
 * Middleware to automatically log actions
 */
const auditMiddleware = (action, options = {}) => {
    return async (req, res, next) => {
        // Store start time for response time calculation
        req._startTime = Date.now();
        
        // Store original json method
        const originalJson = res.json;
        
        // Override json method to capture response
        res.json = function(data) {
            // Log after response is sent
            setImmediate(async () => {
                try {
                    const logData = {
                        userId: req.user?._id,
                        action: typeof action === 'function' ? action(req) : action,
                        schoolId: req.user?.schoolId || req.body?.schoolId || req.params?.schoolId,
                        details: {
                            body: options.logBody ? req.body : undefined,
                            params: options.logParams ? req.params : undefined,
                            query: options.logQuery ? req.query : undefined,
                            ...(typeof options.details === 'function' 
                               ? options.details(req, data) 
                               : options.details)
                        },
                        status: data.success !== false ? 'success' : 'failure',
                        errorMessage: data.error || data.message,
                        targetId: req.params?.id || req.body?._id,
                        targetModel: options.targetModel,
                        req: options.logRequest ? req : null,
                        importance: options.importance || 'medium'
                    };
                    
                    await AuditLog.log(logData);
                } catch (error) {
                    console.error('Audit middleware error:', error);
                }
            });
            
            // Call original json
            return originalJson.call(this, data);
        };
        
        next();
    };
};

module.exports = auditMiddleware;
