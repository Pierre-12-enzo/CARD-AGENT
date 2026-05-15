// middleware/globalAudit.js
const AuditLog = require('../models/AuditLog');

const globalAudit = (req, res, next) => {
  const skipPaths = [
    '/api/health',
    '/health',
    '/favicon.ico',
    '/api/students/photo',
    '/api/templates/preview',
    '/api/card/batch-progress',
    '/api/card/template-dimensions',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/check-email',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ];

  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Store start time
  req._startTime = Date.now();

  const originalJson = res.json;

  res.json = function (body) {
    res.json = originalJson;

    setImmediate(async () => {
      try {
        // Check if user exists
        if (!req.user) {
          return;
        }

        // Only log mutations (POST, PUT, PATCH, DELETE)
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
        /*const isImportantGet = req.method === 'GET' && (
          req.originalUrl.includes('/api/audit/logs') ||
          req.originalUrl.includes('/api/company/dashboard') ||
          req.originalUrl.includes('/api/auth/login') ||
          req.originalUrl.includes('/api/auth/logout')
        );
        */

        if (!isMutation) {
          return;
        }


        // Get action name using full URL
        const action = getActionName(req);

        // Skip if action is invalid
        if (!action || action === 'UPDATE_UNKNOWN' || action === 'CREATE_UNKNOWN') {
          console.log('⏭️ [AUDIT] Skipping invalid action:', action);
          return;
        }

        const isSuccess = body && body.success !== false && !body.error;

        console.log('💾 [AUDIT] Creating log:', action, 'User:', req.user.email);

        const logData = {
          userId: req.user.id,
          action: action,
          companyId: req.user.companyId || null,
          schoolId: getSchoolId(req, body),
          targetId: getTargetId(req, body),
          targetModel: getTargetModel(req.originalUrl),
          details: {
            method: req.method,
            path: req.originalUrl,
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

        const auditLog = await AuditLog.create(logData);
        console.log('✅ [AUDIT] Saved:', auditLog._id);

      } catch (error) {
        console.error('❌ [AUDIT] Failed:', error.message);
      }
    });

    return originalJson.call(this, body);
  };

  next();
};

// ==================== HELPER FUNCTIONS ====================

function getActionName(req) {
  const method = req.method;
  // ✅ CRITICAL: Use originalUrl for full path matching
  const fullUrl = req.originalUrl;

  console.log('🔍 Getting action name for:', { method, fullUrl });

  // ==================== STUDENT ROUTES ====================
  if (fullUrl.includes('/students')) {
    if (method === 'POST') {
      if (fullUrl.includes('/bulk-import-with-photos')) return 'BULK_UPLOAD_PHOTOS';
      if (fullUrl.includes('/bulk-import')) return 'BULK_CREATE_STUDENTS';
      return 'CREATE_STUDENT';
    }
    if (method === 'PUT') return 'UPDATE_STUDENT';
    if (method === 'PATCH') return 'UPDATE_STUDENT';
    if (method === 'DELETE') {
      if (fullUrl.includes('/delete-all')) return 'BULK_DELETE_STUDENTS';
      return 'DELETE_STUDENT';
    }
  }

  // ==================== ORGANIZATION/SCHOOL ROUTES ====================
  if (fullUrl.includes('/organizations')) {
    if (method === 'POST') return 'CREATE_SCHOOL';
    if (method === 'PUT') return 'UPDATE_SCHOOL';
    if (method === 'DELETE') return 'DELETE_SCHOOL';
  }

  // ==================== CO-WORKER ROUTES ====================
  if (fullUrl.includes('/co-workers')) {
    if (method === 'POST') {
      if (fullUrl.includes('/bulk')) return 'BULK_CREATE_STAFF';
      if (fullUrl.includes('/resend-invite')) return 'RESEND_STAFF_INVITE';
      return 'CREATE_STAFF';
    }
    if (method === 'PUT') return 'UPDATE_STAFF';
    if (method === 'PATCH') {
      if (fullUrl.includes('/permissions')) return 'UPDATE_STAFF_PERMISSIONS';
      return 'UPDATE_STAFF';
    }
    if (method === 'DELETE') {
      if (req.query.permanent === 'true') return 'DELETE_STAFF';
      return 'DEACTIVATE_STAFF';
    }
  }

  // ==================== AUTH ROUTES ====================
  if (fullUrl.includes('/auth')) {
    if (fullUrl.includes('/login')) return 'LOGIN';
    if (fullUrl.includes('/logout')) return 'LOGOUT';
    if (fullUrl.includes('/change-password')) return 'PASSWORD_CHANGE';
    if (fullUrl.includes('/reset-password')) return 'PASSWORD_RESET';
    if (fullUrl.includes('/forgot-password')) return 'PASSWORD_RESET';
    if (fullUrl.includes('/register')) {
      if (fullUrl.includes('/complete')) return 'CREATE_REGISTER';
      return 'CREATE_REGISTER';
    }
    if (fullUrl.includes('/profile')) {
      if (method === 'PUT') return 'UPDATE_USER';
    }
  }

  // ==================== CARD ROUTES ====================
  if (fullUrl.includes('/card')) {
    if (method === 'POST') {
      if (fullUrl.includes('/generate-single')) return 'GENERATE_CARD';
      if (fullUrl.includes('/process-csv-generate')) return 'BULK_GENERATE_CARDS';
      if (fullUrl.includes('/upload-student-photo')) return 'UPLOAD_PHOTO';
      return 'GENERATE_CARD';
    }
    if (method === 'PUT') return 'UPDATE_CARD';
    if (method === 'DELETE') return 'DELETE_CARD';
  }

  // ==================== TEMPLATE ROUTES ====================
  if (fullUrl.includes('/templates')) {
    if (method === 'POST') {
      if (fullUrl.includes('/upload')) return 'CREATE_TEMPLATE';
      return 'CREATE_TEMPLATE';
    }
    if (method === 'PUT') return 'UPDATE_TEMPLATE';
    if (method === 'PATCH') {
      if (fullUrl.includes('/set-default')) return 'UPDATE_TEMPLATE';
      return 'UPDATE_TEMPLATE';
    }
    if (method === 'DELETE') return 'DELETE_TEMPLATE';
  }

  // ==================== COMPANY ROUTES ====================
  if (fullUrl.includes('/company')) {
    if (fullUrl.includes('/license')) {
      if (method === 'POST') return 'SUBSCRIPTION_CREATED';
      if (method === 'PUT') return 'SUBSCRIPTION_UPDATED';
      if (method === 'DELETE') return 'SUBSCRIPTION_CANCELLED';
    }
    if (fullUrl.includes('/revoke-license')) return 'SUBSCRIPTION_CANCELLED';
    if (method === 'PUT') {
      if (fullUrl.includes('/profile')) return 'UPDATE_SETTINGS';
      return 'UPDATE_SETTINGS';
    }
  }

  // ==================== AUDIT ROUTES ====================
  if (fullUrl.includes('/audit')) {
    if (method === 'GET') return 'VIEW_AUDIT_LOGS';
    if (method === 'POST') {
      if (fullUrl.includes('/export')) return 'EXPORT_AUDIT_LOGS';
    }
  }

  // ==================== DEFAULT ====================
  console.warn(`⚠️ Unmapped route: ${method} ${fullUrl}`);
  return null; // Return null for unmapped routes
}

function getSchoolId(req, body) {
  if (req.params.orgId) return req.params.orgId;
  if (req.params.schoolId) return req.params.schoolId;
  if (req.body?.organizationId) return req.body.organizationId;
  if (req.body?.schoolId) return req.body.schoolId;
  if (body?.organization?._id) return body.organization._id;
  if (body?.student?.schoolId) return body.student.schoolId;
  return null;
}

function getTargetId(req, body) {
  if (req.params.id) return req.params.id;
  if (body?.student?._id) return body.student._id;
  if (body?.organization?._id) return body.organization._id;
  if (body?.coWorker?.id) return body.coWorker.id;
  return null;
}

function getTargetModel(url) {
  if (url.includes('students')) return 'Student';
  if (url.includes('organizations')) return 'School';
  if (url.includes('co-workers')) return 'User';
  if (url.includes('templates')) return 'Template';
  if (url.includes('card')) return 'Card';
  if (url.includes('company')) return 'Company';
  return null;
}

function getImportance(req) {
  if (req.method === 'DELETE') return 'high';
  if (req.originalUrl.includes('license') || req.originalUrl.includes('revoke')) return 'critical';
  if (req.originalUrl.includes('bulk')) return 'high';
  return 'medium';
}

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