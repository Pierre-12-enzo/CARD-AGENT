// constants/permissions.js

export const PERMISSIONS = {
  // Independent Permissions
  CAN_MANAGE_STUDENTS: 'canManageStudents',
  CAN_UPLOAD_PHOTOS: 'canUploadPhotos',
  CAN_BULK_IMPORT_STUDENTS: 'canUploadCSV',
  CAN_GENERATE_CARDS: 'canGenerateCards',
  CAN_MANAGE_TEMPLATES: 'canManageTemplates',
  CAN_VIEW_ANALYTICS: 'canViewAnalytics',
  CAN_VIEW_AUDIT_LOGS: 'canViewAuditLogs'
};

// Hierarchy: canGenerateCards auto-includes everything needed for card generation
export const PERMISSION_HIERARCHY = {
  [PERMISSIONS.CAN_GENERATE_CARDS]: {
    includes: [
      PERMISSIONS.CAN_MANAGE_STUDENTS,      // For quick create
      PERMISSIONS.CAN_UPLOAD_PHOTOS,         // For photo upload
      PERMISSIONS.CAN_BULK_IMPORT_STUDENTS,  // For bulk import
      PERMISSIONS.CAN_MANAGE_TEMPLATES       // For template management
    ],
    label: 'Generate ID Cards',
    description: 'Full card generation access including student management, photo uploads, bulk import, and templates'
  }
};

// Permission display configuration
export const PERMISSION_CONFIG = {
  [PERMISSIONS.CAN_MANAGE_STUDENTS]: {
    label: 'Manage Students',
    icon: 'pi pi-users',
    description: 'Create, edit, and delete student/employee records',
    color: 'red',
    category: 'Student Management'
  },
  [PERMISSIONS.CAN_UPLOAD_PHOTOS]: {
    label: 'Upload Photos',
    icon: 'pi pi-camera',
    description: 'Upload single or bulk photos for students/employees',
    color: 'blue',
    category: 'Student Management'
  },
  [PERMISSIONS.CAN_BULK_IMPORT_STUDENTS]: {
    label: 'Bulk Import Students',
    icon: 'pi pi-file-excel',
    description: 'Import students/employees via CSV/Excel files',
    color: 'blue',
    category: 'Student Management'
  },
  [PERMISSIONS.CAN_GENERATE_CARDS]: {
    label: 'Generate ID Cards',
    icon: 'pi pi-qrcode',
    description: 'Full card generation access (includes student management, photos, bulk import, and templates)',
    color: 'green',
    category: 'Card Management'
  },
  [PERMISSIONS.CAN_MANAGE_TEMPLATES]: {
    label: 'Manage Templates',
    icon: 'pi pi-image',
    description: 'Create, edit, and delete card templates',
    color: 'green',
    category: 'Card Management'
  },
  [PERMISSIONS.CAN_VIEW_ANALYTICS]: {
    label: 'View Analytics',
    icon: 'pi pi-chart-line',
    description: 'View dashboard analytics and reports',
    color: 'purple',
    category: 'Analytics'
  },
  [PERMISSIONS.CAN_VIEW_AUDIT_LOGS]: {
    label: 'View Audit Logs',
    icon: 'pi pi-history',
    description: 'View system audit logs and activity history',
    color: 'purple',
    category: 'Analytics'
  }
};

// Group permissions by category for UI
export const PERMISSION_CATEGORIES = {
  'Card Generation (Full Access)': [
    PERMISSIONS.CAN_GENERATE_CARDS
  ],
  'Student Management': [
    PERMISSIONS.CAN_MANAGE_STUDENTS,
    PERMISSIONS.CAN_UPLOAD_PHOTOS,
    PERMISSIONS.CAN_BULK_IMPORT_STUDENTS
  ],
  'Card Management': [
    PERMISSIONS.CAN_MANAGE_TEMPLATES
  ],
  'Analytics': [
    PERMISSIONS.CAN_VIEW_ANALYTICS,
    PERMISSIONS.CAN_VIEW_AUDIT_LOGS
  ]
};

// Helper: Get child permissions for a parent
export const getChildPermissions = (permission) => {
  return PERMISSION_HIERARCHY[permission]?.includes || [];
};

// Helper: Check if a permission has children
export const hasChildren = (permission) => {
  return !!(PERMISSION_HIERARCHY[permission]?.includes?.length);
};

// Helper: Get parent permission that auto-enables this permission
export const getParentPermission = (childPermission) => {
  for (const [parent, data] of Object.entries(PERMISSION_HIERARCHY)) {
    if (data.includes.includes(childPermission)) {
      return parent;
    }
  }
  return null;
};

// Helper: Get all permissions (flat array)
export const getAllPermissions = () => {
  return Object.values(PERMISSIONS);
};

// Helper: Get permission label
export const getPermissionLabel = (permission) => {
  return PERMISSION_CONFIG[permission]?.label || permission;
};

// Helper: Get permission icon
export const getPermissionIcon = (permission) => {
  return PERMISSION_CONFIG[permission]?.icon || 'pi pi-tag';
};