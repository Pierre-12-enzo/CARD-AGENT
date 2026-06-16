// middleware/globalAudit.js - PROFESSIONAL AUDIT SYSTEM
const AuditLog = require('../models/AuditLog');

// Cache for storing old records before update (prevents duplicate DB calls)
const oldRecordCache = new Map();

const skipPaths = [
  '/api/health', '/health', '/favicon.ico',
  '/api/students/photo', '/api/templates/preview',
  '/api/card/batch-progress', '/api/card/template-dimensions',
  '/api/auth/login', '/api/auth/register', '/api/auth/check-email',
  '/api/auth/forgot-password', '/api/auth/reset-password',
  '/api/audit/logs', '/api/audit/stats'
];

const globalAudit = async (req, res, next) => {
  // Skip certain paths
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Store start time
  req._startTime = Date.now();

  // 🔥 For PUT/PATCH requests, fetch the old record BEFORE it's modified
  if ((req.method === 'PUT' || req.method === 'PATCH') && req.params.id) {
    try {
      const oldRecord = await getOldRecord(req);
      if (oldRecord) {
        oldRecordCache.set(getCacheKey(req), oldRecord);
      }
    } catch (err) {
      console.error('Failed to fetch old record for audit:', err.message);
    }
  }

  const originalJson = res.json;
  res.json = function (body) {
    res.json = originalJson;

    setImmediate(async () => {
      try {
        if (!req.user) return;

        // Only log mutations (POST, PUT, PATCH, DELETE)
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
        if (!isMutation) return;

        const action = getActionName(req);
        if (!action || action === 'SKIP') return;

        const isSuccess = body && body.success !== false && !body.error;

        // Get the old record from cache and clean it
        const cacheKey = getCacheKey(req);
        const oldRecord = oldRecordCache.get(cacheKey);
        if (oldRecordCache.has(cacheKey)) {
          oldRecordCache.delete(cacheKey);
        }

        // Build rich audit log
        const auditData = await buildAuditData(req, body, action, isSuccess, oldRecord);

        const auditLog = await AuditLog.create(auditData);

        // Professional console output
        console.log(`📝 [AUDIT] ${action} | User: ${req.user.email} | ${auditData.targetModel || 'System'} | ${isSuccess ? '✅' : '❌'}`);

      } catch (error) {
        console.error('❌ [AUDIT] Failed:', error.message);
      }
    });

    return originalJson.call(this, body);
  };

  next();
};

// ==================== HELPER FUNCTIONS ====================

function getCacheKey(req) {
  return `${req.method}:${req.params.id}`;
}

async function getOldRecord(req) {
  const url = req.originalUrl;
  const id = req.params.id;

  // Student
  if (url.includes('/students') && !url.includes('/photo')) {
    const Student = require('../models/Student');
    return await Student.findById(id).lean();
  }

  // Co-worker
  if (url.includes('/co-workers')) {
    const User = require('../models/User');
    return await User.findById(id).select('firstName lastName email role permissions isActive').lean();
  }

  // Organization/School
  if (url.includes('/organizations') || url.includes('/school')) {
    const School = require('../models/School');
    return await School.findById(id).lean();
  }

  // Template
  if (url.includes('/templates')) {
    const Template = require('../models/Template');
    return await Template.findById(id).lean();
  }

  return null;
}

function getActionName(req) {
  const method = req.method;
  const url = req.originalUrl;

  // ==================== STUDENT ROUTES ====================
  if (url.includes('/students')) {
    if (method === 'POST') {
      if (url.includes('/bulk-import-with-photos')) return 'BULK_UPLOAD_PHOTOS';
      if (url.includes('/bulk-import')) return 'BULK_CREATE_STUDENTS';
      return 'CREATE_STUDENT';
    }
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE_STUDENT';
    if (method === 'DELETE') {
      if (url.includes('/delete-all')) return 'BULK_DELETE_STUDENTS';
      return 'DELETE_STUDENT';
    }
  }

  // ==================== ORGANIZATION ROUTES ====================
  if (url.includes('/organizations') || url.includes('/school')) {
    if (method === 'POST') return 'CREATE_SCHOOL';
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE_SCHOOL';
    if (method === 'DELETE') return 'DELETE_SCHOOL';
  }

  // ==================== CO-WORKER ROUTES ====================
  if (url.includes('/co-workers')) {
    if (method === 'POST') {
      if (url.includes('/bulk')) return 'BULK_CREATE_STAFF';
      if (url.includes('/resend-invite')) return 'RESEND_STAFF_INVITE';
      return 'CREATE_STAFF';
    }
    if (method === 'PUT' || method === 'PATCH') {
      if (url.includes('/permissions')) return 'UPDATE_STAFF_PERMISSIONS';
      return 'UPDATE_STAFF';
    }
    if (method === 'DELETE') {
      if (req.query.permanent === 'true') return 'DELETE_STAFF';
      return 'DEACTIVATE_STAFF';
    }
  }

  // ==================== CARD ROUTES ====================
  if (url.includes('/card')) {
    if (method === 'POST') {
      if (url.includes('/generate-single')) return 'GENERATE_CARD';
      if (url.includes('/process-csv-generate')) return 'BULK_GENERATE_CARDS';
      if (url.includes('/upload-student-photo')) return 'UPLOAD_PHOTO';
      return 'GENERATE_CARD';
    }
    if (method === 'DELETE') return 'DELETE_CARD';
  }

  // ==================== TEMPLATE ROUTES ====================
  if (url.includes('/templates')) {
    if (method === 'POST') return 'CREATE_TEMPLATE';
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE_TEMPLATE';
    if (method === 'DELETE') return 'DELETE_TEMPLATE';
  }

  // ==================== AUTH ROUTES ====================
  if (url.includes('/auth')) {
    if (url.includes('/login')) return 'LOGIN';
    if (url.includes('/logout')) return 'LOGOUT';
    if (url.includes('/change-password')) return 'PASSWORD_CHANGE';
    if (url.includes('/reset-password')) return 'PASSWORD_RESET';
  }

  return null;
}

async function buildAuditData(req, body, action, isSuccess, oldRecord) {
  const url = req.originalUrl;

  // Get target information
  const { targetId, targetModel, targetName } = await getTargetInfo(req, body, oldRecord);

  // ✅ Get school/organization ID - with better detection
  const schoolId = await getSchoolId(req, body, oldRecord);

  // ✅ For student operations, try to get school from the student
  let finalSchoolId = schoolId;
  if (!schoolId && (action === 'UPDATE_STUDENT' || action === 'DELETE_STUDENT')) {
    try {
      const Student = require('../models/Student');
      const student = await Student.findById(targetId).select('schoolId');
      if (student?.schoolId) {
        finalSchoolId = student.schoolId.toString();
      }
    } catch (err) {
      // Silently continue
    }
  }

  // Build changes (before/after)
  let changes = null;
  if (oldRecord && (req.method === 'PUT' || req.method === 'PATCH')) {
    changes = buildChanges(action, oldRecord, req.body, body);
  }

  // Build human-readable summary
  const summary = buildSummary(action, targetName, changes, req.body, body);

  // ✅ Get school info for the audit log
  let schoolInfo = null;
  if (finalSchoolId) {
    try {
      const School = require('../models/School');
      const school = await School.findById(finalSchoolId).select('name code');
      if (school) {
        schoolInfo = {
          name: school.name,
          code: school.code
        };
      }
    } catch (err) {
      // Silently continue
    }
  }

  return {
    userId: req.user.id,
    action: action,
    companyId: req.user.companyId,
    schoolId: finalSchoolId || null,
    schoolInfo: schoolInfo,
    targetId: targetId,
    targetModel: targetModel,
    details: {
      method: req.method,
      path: url,
      summary: summary,
      requestBody: sanitizeBody(req.body),
      responseBody: sanitizeResponseBody(body),
      oldRecord: oldRecord ? sanitizeOldRecord(oldRecord) : null
    },
    changes: changes ? { before: changes.before, after: changes.after } : null,
    status: isSuccess ? 'success' : 'failure',
    errorMessage: !isSuccess ? (body?.error || body?.message || 'Unknown error') : null,
    importance: getImportance(action, req),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestMethod: req.method,
    requestUrl: url,
    responseTime: Date.now() - req._startTime
  };
}

async function getTargetInfo(req, body, oldRecord) {
  const url = req.originalUrl;

  // Student
  if (url.includes('/students')) {
    const id = req.params.id || body?.student?._id || oldRecord?._id;
    const name = oldRecord?.name || body?.name || body?.student?.name;
    const identifier = oldRecord?.student_id || body?.student_id;
    return {
      targetId: id,
      targetModel: 'Student',
      targetName: name ? `${name} (${identifier || id})` : identifier || id
    };
  }

  // Co-worker
  if (url.includes('/co-workers')) {
    const id = req.params.id || body?.coWorker?._id || oldRecord?._id;
    const name = oldRecord ? `${oldRecord.firstName} ${oldRecord.lastName}` : `${body?.firstName || ''} ${body?.lastName || ''}`.trim();
    return {
      targetId: id,
      targetModel: 'User',
      targetName: name || body?.email || id
    };
  }

  // Organization
  if (url.includes('/organizations') || url.includes('/school')) {
    const id = req.params.id || body?.organization?._id || oldRecord?._id;
    const name = oldRecord?.name || body?.name;
    return {
      targetId: id,
      targetModel: 'School',
      targetName: name || id
    };
  }

  // Template
  if (url.includes('/templates')) {
    const id = req.params.id || body?.template?._id || oldRecord?._id;
    const name = oldRecord?.name || body?.name;
    return {
      targetId: id,
      targetModel: 'Template',
      targetName: name || id
    };
  }

  // Card
  if (url.includes('/card')) {
    return {
      targetId: body?.studentId || body?.student_id || null,
      targetModel: 'Card',
      targetName: body?.studentName || body?.student_id || 'ID Card'
    };
  }

  return { targetId: null, targetModel: null, targetName: null };
}

async function getSchoolId(req, body, oldRecord) {
  // ==================== FROM PARAMS ====================
  if (req.params.orgId) return req.params.orgId;
  if (req.params.schoolId) return req.params.schoolId;
  if (req.params.organizationId) return req.params.organizationId;
  if (req.params.id && req.originalUrl.includes('/organizations/')) {
    return req.params.id;
  }

  // ==================== FROM BODY ====================
  // Direct body fields
  if (req.body?.organizationId) return req.body.organizationId;
  if (req.body?.schoolId) return req.body.schoolId;
  if (req.body?.organization_id) return req.body.organization_id;
  if (req.body?.school_id) return req.body.school_id;

  // For card generation
  if (req.body?.organization) return req.body.organization;
  if (body?.organization?._id) return body.organization._id;

  // For bulk operations
  if (req.body?.organizationId) return req.body.organizationId;
  if (req.body?.filters?.organizationId) return req.body.filters.organizationId;

  // ==================== FROM OLD RECORD ====================
  if (oldRecord?.schoolId) return oldRecord.schoolId;
  if (oldRecord?.schoolId?.toString) return oldRecord.schoolId.toString();
  if (oldRecord?.organizationId) return oldRecord.organizationId;

  // ==================== FROM QUERY ====================
  if (req.query.organizationId) return req.query.organizationId;
  if (req.query.schoolId) return req.query.schoolId;
  if (req.query.orgId) return req.query.orgId;

  // ==================== FROM USER PERMISSIONS ====================
  // For co-workers with single organization
  if (req.user?.permissions?.length === 1) {
    return req.user.permissions[0].organizationId;
  }

  // ==================== FROM STUDENT ====================
  // For student-specific operations, try to get school from student
  if (req.params.id && req.originalUrl.includes('/students')) {
    try {
      const Student = require('../models/Student');
      const student = await Student.findById(req.params.id).select('schoolId');
      if (student?.schoolId) return student.schoolId.toString();
    } catch (err) {
      console.warn('Could not fetch student for schoolId:', err.message);
    }
  }

  // ==================== FROM TEMPLATE ====================
  // For template operations
  if (req.params.id && req.originalUrl.includes('/templates')) {
    try {
      const Template = require('../models/Template');
      const template = await Template.findById(req.params.id).select('schoolId');
      if (template?.schoolId) return template.schoolId.toString();
    } catch (err) {
      console.warn('Could not fetch template for schoolId:', err.message);
    }
  }

  // ==================== FROM CO-WORKER PERMISSIONS ====================
  // For co-worker routes, get from permissions
  if (req.originalUrl.includes('/co-workers') && req.body?.permissions) {
    const perms = req.body.permissions;
    if (Array.isArray(perms) && perms.length > 0) {
      return perms[0].organizationId;
    }
  }

  return null;
}

function buildChanges(action, oldRecord, requestBody, responseBody) {
  const before = {};
  const after = {};

  // Student changes
  if (action === 'UPDATE_STUDENT' && oldRecord) {
    const fields = ['name', 'student_id', 'gender', 'residence', 'phone', 'email'];
    fields.forEach(field => {
      if (requestBody[field] && requestBody[field] !== oldRecord[field]) {
        before[field] = oldRecord[field];
        after[field] = requestBody[field];
      }
    });

    // Student details
    if (oldRecord.studentDetails) {
      const studentFields = ['class', 'level', 'academic_year', 'parent_phone'];
      studentFields.forEach(field => {
        if (requestBody[field] && requestBody[field] !== oldRecord.studentDetails?.[field]) {
          before[field] = oldRecord.studentDetails[field];
          after[field] = requestBody[field];
        }
      });
    }

    // Employee details
    if (oldRecord.employeeDetails) {
      const employeeFields = ['department', 'position', 'employeeId', 'workPhone'];
      employeeFields.forEach(field => {
        if (requestBody[field] && requestBody[field] !== oldRecord.employeeDetails?.[field]) {
          before[field] = oldRecord.employeeDetails[field];
          after[field] = requestBody[field];
        }
      });
    }
  }

  // Co-worker changes
  if (action === 'UPDATE_STAFF' && oldRecord) {
    const fields = ['firstName', 'lastName', 'phoneNumber', 'isActive'];
    fields.forEach(field => {
      if (requestBody[field] !== undefined && requestBody[field] !== oldRecord[field]) {
        before[field] = oldRecord[field];
        after[field] = requestBody[field];
      }
    });
  }

  // Organization changes
  if (action === 'UPDATE_SCHOOL' && oldRecord) {
    const fields = ['name', 'type', 'level', 'phone', 'email'];
    fields.forEach(field => {
      if (requestBody[field] && requestBody[field] !== oldRecord[field]) {
        before[field] = oldRecord[field];
        after[field] = requestBody[field];
      }
    });
  }

  return Object.keys(before).length > 0 ? { before, after } : null;
}

function buildSummary(action, targetName, changes, requestBody, responseBody) {
  const summaries = {
    'CREATE_STUDENT': `Created student: ${targetName || requestBody?.name || 'Unknown'}`,
    'UPDATE_STUDENT': `Updated student: ${targetName}`,
    'DELETE_STUDENT': `Deleted student: ${targetName}`,
    'BULK_CREATE_STUDENTS': `Bulk import: ${responseBody?.results?.created || 0} created, ${responseBody?.results?.updated || 0} updated, ${responseBody?.results?.skipped || 0} failed`,
    'CREATE_STAFF': `Added team member: ${requestBody?.firstName} ${requestBody?.lastName} (${requestBody?.email})`,
    'UPDATE_STAFF': `Updated team member: ${targetName}`,
    'UPDATE_STAFF_PERMISSIONS': `Updated permissions for: ${targetName}`,
    'DEACTIVATE_STAFF': `Deactivated team member: ${targetName}`,
    'ACTIVATE_STAFF': `Activated team member: ${targetName}`,
    'DELETE_STAFF': `Permanently deleted team member: ${targetName}`,
    'CREATE_SCHOOL': `Created organization: ${requestBody?.name}`,
    'UPDATE_SCHOOL': `Updated organization: ${targetName}`,
    'DELETE_SCHOOL': `Deleted organization: ${targetName}`,
    'GENERATE_CARD': `Generated card for: ${targetName || requestBody?.studentName || 'student'}`,
    'BULK_GENERATE_CARDS': `Batch generated ${responseBody?.stats?.generated || 0} cards`,
    'CREATE_TEMPLATE': `Created template: ${requestBody?.name}`,
    'UPDATE_TEMPLATE': `Updated template: ${targetName}`,
    'DELETE_TEMPLATE': `Deleted template: ${targetName}`,
    'UPLOAD_PHOTO': `Uploaded photo for: ${targetName}`,
    'LOGIN': `Logged in`,
    'LOGOUT': `Logged out`,
    'PASSWORD_CHANGE': `Changed password`
  };

  let summary = summaries[action] || `${action.replace(/_/g, ' ')}: ${targetName || 'Unknown'}`;

  // Add change details if available
  if (changes && Object.keys(changes.before).length > 0) {
    const changeList = Object.keys(changes.before).map(key => {
      return `${key}: "${changes.before[key]}" → "${changes.after[key]}"`;
    }).join(', ');
    summary += ` (${changeList})`;
  }

  return summary;
}

function getImportance(action, req) {
  if (action.includes('DELETE')) return 'high';
  if (action.includes('BULK')) return 'high';
  if (action.includes('PERMISSIONS')) return 'high';
  if (action.includes('GENERATE') && req.originalUrl.includes('batch')) return 'high';
  if (action.includes('LOGIN') && req.body?.email) return 'medium';
  return 'medium';
}

function sanitizeBody(body) {
  if (!body) return undefined;
  const sanitized = { ...body };
  const sensitive = ['password', 'confirmPassword', 'currentPassword', 'newPassword', 'token', 'licenseKey', 'apiKey', 'secret'];
  sensitive.forEach(field => delete sanitized[field]);
  delete sanitized._id;
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeResponseBody(body) {
  if (!body) return undefined;
  const sanitized = { ...body };
  delete sanitized.token;
  delete sanitized.password;
  return sanitized;
}

function sanitizeOldRecord(record) {
  if (!record) return null;
  const sanitized = { ...record };
  delete sanitized.__v;
  delete sanitized.password;
  delete sanitized.photo_public_id;
  return sanitized;
}

module.exports = globalAudit;