import axios from 'axios';

// Cache utility
class APICache {
  constructor(ttl = 30000) {
    this.cache = new Map();
    this.ttl = ttl;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  clear() { this.cache.clear(); }
}

// Environment detection
const getApiBaseUrl = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🚀 CARD-AGENT API:', API_BASE_URL);

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('capmis_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        localStorage.removeItem('capmis_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      return error.response?.data || { success: false, error: 'Network error' };
    }
  },

  // Multi-step Registration
  getRegistrationProgress: async (email) => {
    const response = await api.get(`/auth/register/resume/${encodeURIComponent(email)}`);
    return response.data;
  },

  saveRegistrationProgress: async (email, step, data) => {
    const response = await api.post('/auth/register/save-progress', { email, step, data });
    return response.data;
  },

  savePersonalInfo: async (data) => {
    const response = await api.post('/auth/register/step1/personal', data);
    return response.data;
  },

  saveCompanyInfo: async (formData) => {
    const response = await api.post('/auth/register/step2/company', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  activateLicense: async (data) => {
    const response = await api.post('/auth/register/step3/license', data);
    return response.data;
  },

  completeRegistration: async (data) => {
    const response = await api.post('/auth/register/complete', data);
    return response.data;
  },

  // Helpers
  checkEmail: async (email) => {
    const response = await api.get(`/auth/check-email/${email}`);
    return response.data;
  },

  checkCompanyName: async (name) => {
    const response = await api.get(`/company/check-name/${encodeURIComponent(name)}`);
    return response.data;
  },

  // Profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },

  logout: async () => {
    localStorage.removeItem('capmis_token');
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }
};

// ============================================
// COMPANY API
// ============================================
export const companyAPI = {
  // Get current user's company
  getMyCompany: async () => {
    const response = await api.get('/company/me');
    return response.data;
  },

  // Get company by ID
  getCompany: async (id) => {
    const response = await api.get(`/company/${id}`);
    return response.data;
  },

  // Update company profile
  updateProfile: async (formData) => {
    const response = await api.put('/company/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Get dashboard stats
  getDashboard: async () => {
    const response = await api.get('/company/dashboard');
    return response.data;
  },

  // Get organizations for current company
  getOrganizations: async (params = {}) => {
    const response = await api.get('/company/organizations', { params });
    return response.data;
  },

  // SUPER ADMIN ONLY
  getAllCompanies: async (params = {}) => {
    const response = await api.get('/company', { params });
    return response.data;
  },

  activateLicense: async (companyId, licenseData) => {
    const response = await api.post(`/company/${companyId}/license`, licenseData);
    return response.data;
  },

  revokeLicense: async (companyId, reason) => {
    const response = await api.post(`/company/${companyId}/revoke-license`, { reason });
    return response.data;
  },

  updateLicense: async (companyId, licenseData) => {
    const response = await api.put(`/company/${companyId}/license`, licenseData);
    return response.data;
  }
};

// ============================================
// ORGANIZATIONS API (Schools/Clients)
// ============================================
export const organizationAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/organizations', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/organizations', data);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/organizations/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/organizations/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/organizations/${id}`);
    return response.data;
  }
};

// ============================================
// STUDENT API
// ============================================
export const studentAPI = {
  // Grouped by organization (dashboard cards)
  getGroupedByOrganization: async () => {
    const response = await api.get('/students/grouped-by-organization');
    return response.data;
  },

  // Get students for specific organization
  getByOrganization: async (orgId, params = {}) => {
    const response = await api.get(`/students/organization/${orgId}`, { params });
    return response.data;
  },

  // Get filter options for organization
  getFilterOptions: async (orgId) => {
    const response = await api.get(`/students/organization/${orgId}/filter-options`);
    return response.data;
  },

  // Get all students
  getAll: async (params = {}) => {
    const response = await api.get('/students', { params });
    return response.data;
  },

  // Create student
  create: async (formData) => {
    const response = await api.post('/students', formData, {
      headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },

  // Update student
  update: async (id, formData) => {
    const config = formData instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const response = await api.put(`/students/${id}`, formData, config);
    return response.data;
  },

  // Delete student
  delete: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  // Get student photo URL
  getPhotoUrl: (studentId, size = 'medium') => {
    return `${API_BASE_URL}/students/photo/${studentId}?size=${size}`;
  },

  // Bulk import CSV
  bulkImportCSV: async (organizationId, csvFile) => {
    const formData = new FormData();
    formData.append('csv', csvFile);
    formData.append('organizationId', organizationId);
    const response = await api.post('/students/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000
    });
    return response.data;
  },

  // Bulk import with photos
  bulkImportWithPhotos: async (organizationId, csvFile, photoZipFile) => {
    const formData = new FormData();
    formData.append('csv', csvFile);
    formData.append('organizationId', organizationId);
    if (photoZipFile) formData.append('photoZip', photoZipFile);
    const response = await api.post('/students/bulk-import-with-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000
    });
    return response.data;
  },

  // Delete all students for an organization
  deleteAll: async (organizationId) => {
    const response = await api.delete('/students/delete-all', {
      params: { organizationId }
    });
    return response.data;
  },

  // Get stats
  getStats: async (params = {}) => {
    const response = await api.get('/students/stats', { params });
    return response.data;
  }
};

// ============================================
// CARD API
// ============================================
export const cardAPI = {
  // Get organizations for card generation
  getOrganizations: async () => {
    const response = await api.get('/card/organizations');
    return response.data;
  },

  // Get students for card generation in an org
  getOrgStudents: async (orgId, params = {}) => {
    const response = await api.get(`/card/organization/${orgId}/students`, { params });
    return response.data;
  },

  // Generate single card
  generateSingle: async (data) => {
    const response = await api.post('/card/generate-single-card', data, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Batch process CSV + optional photos
  processCSVAndGenerate: async (formData) => {
    const response = await api.post('/card/process-csv-generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
      timeout: 600000
    });
    return response.data;
  },

  // Get batch progress
  getBatchProgress: async (batchId) => {
    const response = await api.get(`/card/batch-progress/${batchId}`);
    return response.data;
  },

  // Get template dimensions
  getTemplateDimensions: async (templateId) => {
    const response = await api.get(`/card/template-dimensions/${templateId}`);
    return response.data;
  },

  // Upload student photo
  uploadStudentPhoto: async (formData) => {
    const response = await api.post('/card/upload-student-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Get card history
  getCardHistory: async (params = {}) => {
    const response = await api.get('/card/history', { params });
    return response.data;
  },

  // Get student card history
  getStudentCardHistory: async (studentId) => {
    const response = await api.get(`/card/history/student/${studentId}`);
    return response.data;
  }
};

// ============================================
// TEMPLATE API
// ============================================
export const templateAPI = {
  getTemplates: async (params = {}) => {
    const response = await api.get('/templates', { params });
    return response.data;
  },

  uploadTemplate: async (formData) => {
    const response = await api.post('/templates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  setDefault: async (templateId) => {
    const response = await api.patch(`/templates/${templateId}/set-default`);
    return response.data;
  },

  delete: async (templateId) => {
    const response = await api.delete(`/templates/${templateId}`);
    return response.data;
  },

  getPreviewUrl: (publicId) => {
    return `${API_BASE_URL}/templates/preview/${encodeURIComponent(publicId)}`;
  }
};

// ============================================
// CO-WORKERS API
// ============================================
export const coWorkerAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/co-workers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/co-workers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/co-workers', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/co-workers/${id}`, data);
    return response.data;
  },

  updatePermissions: async (id, permissions) => {
    const response = await api.patch(`/co-workers/${id}/permissions`, { permissions });
    return response.data;
  },

  delete: async (id, permanent = false) => {
    const response = await api.delete(`/co-workers/${id}${permanent ? '?permanent=true' : ''}`);
    return response.data;
  },

  resendInvite: async (id) => {
    const response = await api.post(`/co-workers/${id}/resend-invite`);
    return response.data;
  },

  bulkCreate: async (staffList) => {
    const response = await api.post('/co-workers/bulk', { staffList });
    return response.data;
  }
};

// ============================================
// AUDIT API
// ============================================
const auditCache = new APICache();

export const auditAPI = {
  getLogs: async (params = {}, options = {}) => {
    const cacheKey = `audit_${JSON.stringify(params)}`;
    if (!options.skipCache) {
      const cached = auditCache.get(cacheKey);
      if (cached) return cached;
    }
    const response = await api.get('/audit/logs', { params, signal: options.signal });
    if (params.page === '1' || params.page === 1) {
      auditCache.set(cacheKey, response.data);
    }
    return response.data;
  },

  clearCache: () => auditCache.clear(),

  getTrail: async (model, id, params = {}) => {
    const response = await api.get(`/audit/trail/${model}/${id}`, { params });
    return response.data;
  },

  getUserActivity: async (userId, params = {}) => {
    const response = await api.get(`/audit/user/${userId}`, { params });
    return response.data;
  },

  exportLogs: async (params = {}) => {
    const response = await api.post('/audit/export', params, { responseType: 'blob' });
    return response.data;
  }
};

// ============================================
// UTILITY
// ============================================
export const checkServerStatus = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Server is not responding');
  }
};

export default api;