// middleware/globalAudit.js
const AuditLog = require('../models/AuditLog');
const socketService = require('../services/socketService');

const globalAudit = (req, res, next) => {
  // Skip these paths
  const skipPaths = [
    '/health',
    '/favicon.ico',
    '/public',
    '/css',
    '/js',
    '/images',
    '/auth/register',
    '/auth/check-email',
    '/auth/check-school',
    '/auth/check-company',
    '/auth/plans',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/card/batch-progress',
    '/card/template-dimensions',
    '/card/student-photo',
    '/students/photo',
    '/students/health',
    '/templates/preview',
  ];

  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip if no authenticated user or GET requests (optional - log GETs if you want)
  if (!req.user) {
    return next();
  }

  // Skip GET requests (less noise) - remove this line if you want GET logged
  if (req.method === 'GET') {
    return next();
  }

  // Store start time
  req._startTime = Date.now();

  // Capture the original json method
  const originalJson = res.json;

  res.json = function (body) {
    // Restore original
    res.json = originalJson;

    // Log in background - don't block response
    setImmediate(async () => {
      try {
        const status = res.statusCode >= 400 ? 'failure' : 'success';
        const isSuccess = body && body.success !== false;

        const logData = {
          userId: req.user.id,
          action: getActionName(req),
          companyId: req.user.companyId || null,
          schoolId: req.body?.organizationId || req.params?.orgId || req.body?.schoolId || null,
          targetId: getTargetId(req, body),
          targetModel: getTargetModel(req.path),
          details: {
            method: req.method,
            path: req.path,
            params: req.params,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            body: sanitizeBody(req.body),
            result: isSuccess ? 'success' : body?.error || 'failed'
          },
          status: isSuccess ? 'success' : 'failure',
          errorMessage: !isSuccess ? (body?.error || body?.message) : undefined,
          importance: getImportance(req),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestUrl: req.originalUrl,
          responseTime: Date.now() - req._startTime
        };

        console.log('📝 Creating audit log:', {
          action: logData.action,
          companyId: logData.companyId,
          userId: logData.userId
        });

        const auditLog = await AuditLog.create(logData);

        // Emit socket event for real-time audit updates
        if (auditLog) {
          socketService.emit('audit:new', {
            _id: auditLog._id,
            action: auditLog.action,
            status: auditLog.status,
            importance: auditLog.importance,
            companyId: auditLog.companyId,
            userId: req.user.id,
            targetModel: auditLog.targetModel,
            targetId: auditLog.targetId,
            details: auditLog.details,
            createdAt: auditLog.createdAt
          });
        }

      } catch (error) {
        console.error('Audit log failed:', error.message);
        // Never break the response for audit failures
      }
    });

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Determine action name from request
 */
function getActionName(req) {
  const method = req.method;
  const path = req.path;

  // Map routes to actions
  if (path.includes('/auth/login')) return 'LOGIN';
  if (path.includes('/auth/register/complete')) return 'CREATE_REGISTER';

  if (path.includes('/students/bulk-import')) return 'BULK_CREATE_STUDENTS';
  if (path.includes('/students/delete-all')) return 'BULK_DELETE_STUDENTS';
  if (path.includes('/students')) {
    if (method === 'POST') return 'CREATE_STUDENT';
    if (method === 'PUT') return 'UPDATE_STUDENT';
    if (method === 'DELETE') return 'DELETE_STUDENT';
  }

  if (path.includes('/organizations')) {
    if (method === 'POST') return 'CREATE_SCHOOL';
    if (method === 'PUT') return 'UPDATE_SCHOOL';
    if (method === 'DELETE') return 'DELETE_SCHOOL';
  }

  if (path.includes('/co-workers/bulk')) return 'BULK_CREATE_STAFF';
  if (path.includes('/co-workers')) {
    if (method === 'POST') return 'CREATE_STAFF';
    if (method === 'PUT') return 'UPDATE_STAFF';
    if (method === 'PATCH') return 'UPDATE_STAFF_PERMISSIONS';
    if (method === 'DELETE') return 'DELETE_STAFF';
  }

  if (path.includes('/templates/upload')) return 'CREATE_TEMPLATE';
  if (path.includes('/templates')) {
    if (method === 'DELETE') return 'DELETE_TEMPLATE';
  }

  if (path.includes('/card/generate-single')) return 'GENERATE_CARD';
  if (path.includes('/card/process-csv-generate')) return 'BULK_GENERATE_CARDS';
  if (path.includes('/card/upload-student-photo')) return 'UPLOAD_PHOTO';

  if (path.includes('/company/license')) return 'SUBSCRIPTION_UPDATED';
  if (path.includes('/company')) {
    if (method === 'PUT') return 'UPDATE_SETTINGS';
  }

  if (path.includes('/auth/change-password')) return 'PASSWORD_CHANGE';
  if (path.includes('/auth/profile')) return 'UPDATE_USER';

  // Default
  return `${method}_${path.split('/').filter(Boolean).join('_')}`.toUpperCase();
}

/**
 * Extract target ID from request or response
 */
function getTargetId(req, body) {
  // From params
  if (req.params.id) return req.params.id;
  // From body response
  if (body?.student?._id) return body.student._id;
  if (body?.organization?._id) return body.organization._id;
  if (body?.coWorker?.id) return body.coWorker.id;
  if (body?.company?.id) return body.company.id;
  // From body request
  if (req.body?.studentId) return req.body.studentId;
  if (req.body?.organizationId) return req.body.organizationId;
  return null;
}

/**
 * Map path to model name
 */
function getTargetModel(path) {
  if (path.includes('students')) return 'Student';
  if (path.includes('organizations')) return 'School';
  if (path.includes('co-workers')) return 'User';
  if (path.includes('templates')) return 'Template';
  if (path.includes('card')) return 'Card';
  if (path.includes('company')) return 'Company';
  if (path.includes('auth')) return 'User';
  return null;
}

/**
 * Determine importance level
 */
function getImportance(req) {
  if (req.method === 'DELETE') return 'high';
  if (req.path.includes('license') || req.path.includes('revoke')) return 'critical';
  if (req.path.includes('bulk')) return 'high';
  if (req.path.includes('auth')) return 'high';
  return 'medium';
}

/**
 * Sanitize request body - remove sensitive fields
 */
function sanitizeBody(body) {
  if (!body) return undefined;
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.confirmPassword;
  delete sanitized.currentPassword;
  delete sanitized.newPassword;
  delete sanitized.token;
  delete sanitized.licenseKey;
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

module.exports = globalAudit;