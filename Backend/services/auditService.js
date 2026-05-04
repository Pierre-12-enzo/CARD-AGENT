// services/auditService.js
const AuditLog = require('../models/AuditLog');

class AuditService {
    /**
     * Quick log method - use for manual logging
     */
    static async log(action, req, options = {}) {
        try {
            const logData = {
                userId: req.user?._id,
                action,
                schoolId: options.schoolId || req.user?.schoolId,
                details: options.details || {},
                changes: options.changes || null,
                targetId: options.targetId,
                targetModel: options.targetModel,
                status: options.status || 'success',
                errorMessage: options.errorMessage,
                importance: options.importance || 'medium',
                metadata: options.metadata || {},
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                requestMethod: req.method,
                requestUrl: req.originalUrl
            };
            
            // Don't await - fire and forget (non-blocking)
            AuditLog.create(logData).catch(err => 
                console.error('Background audit log failed:', err)
            );
            
            return true;
        } catch (error) {
            console.error('Audit service error:', error);
            return false;
        }
    }

    /**
     * Create audit middleware factory
     */
    static middleware(action, options = {}) {
        return (req, res, next) => {
            // Store original end
            const originalEnd = res.end;
            const originalJson = res.json;
            
            // Capture response data
            let responseBody;
            
            // Override json
            res.json = function(data) {
                responseBody = data;
                return originalJson.call(this, data);
            };
            
            // Override end
            res.end = function() {
                // Log in background after response
                setImmediate(() => {
                    const status = res.statusCode < 400 ? 'success' : 'failure';
                    
                    // Skip logging for 404s or static files if needed
                    if (options.skip404 && res.statusCode === 404) return;
                    
                    const logData = {
                        userId: req.user?._id,
                        action: typeof action === 'function' ? action(req) : action,
                        schoolId: options.schoolId || req.user?.schoolId,
                        details: {
                            ...(options.logBody ? { body: req.body } : {}),
                            ...(options.logParams ? { params: req.params } : {}),
                            ...(options.logQuery ? { query: req.query } : {}),
                            response: options.logResponse ? responseBody : undefined,
                            ...(typeof options.details === 'function' ? 
                                options.details(req, responseBody) : options.details)
                        },
                        status,
                        errorMessage: responseBody?.error || responseBody?.message,
                        targetId: options.targetId || req.params?.id,
                        targetModel: options.targetModel,
                        importance: options.importance || 'medium',
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        requestMethod: req.method,
                        requestUrl: req.originalUrl,
                        responseTime: Date.now() - (req._startTime || Date.now())
                    };
                    
                    AuditLog.create(logData).catch(console.error);
                });
                
                return originalEnd.apply(this, arguments);
            };
            
            // Store start time
            req._startTime = Date.now();
            next();
        };
    }

    /**
     * Create a route decorator for specific logging needs
     */
    static forRoute(routeConfig) {
        return (req, res, next) => {
            req.auditConfig = routeConfig;
            next();
        };
    }
}

module.exports = AuditService;