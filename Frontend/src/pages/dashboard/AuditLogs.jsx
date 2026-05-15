// pages/dashboard/AuditLogs.jsx - CARD-AGENT CRIMSON THEME WITH LOADING STATES
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
import { useAuth } from '../../context/AuthContext';
import { auditAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Action Categories
const ACTION_CATEGORIES = [
  { value: 'delete', label: '🗑️ Delete Actions', actions: ['DELETE_USER', 'DELETE_STAFF', 'DELETE_SCHOOL', 'DELETE_STUDENT', 'DELETE_CARD', 'DELETE_TEMPLATE', 'DELETE_PHOTO'] },
  { value: 'create', label: '✨ Create Actions', actions: ['CREATE_USER', 'CREATE_STAFF', 'CREATE_SCHOOL', 'CREATE_STUDENT', 'CREATE_TEMPLATE', 'CREATE_REGISTER'] },
  { value: 'update', label: '✏️ Update Actions', actions: ['UPDATE_USER', 'UPDATE_STAFF', 'UPDATE_SCHOOL', 'UPDATE_STUDENT', 'UPDATE_CARD', 'UPDATE_TEMPLATE', 'UPDATE_ATTENDANCE', 'UPDATE_SETTINGS', 'UPDATE_PERMISSIONS'] },
  { value: 'login', label: '🔐 Login Actions', actions: ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET'] },
  { value: 'card', label: '🪪 Card Actions', actions: ['GENERATE_CARD', 'UPDATE_CARD', 'DELETE_CARD', 'BULK_GENERATE_CARDS', 'PRINT_CARD', 'DOWNLOAD_CARD'] },
  { value: 'student', label: '👨‍🎓 Student Actions', actions: ['CREATE_STUDENT', 'UPDATE_STUDENT', 'DELETE_STUDENT', 'BULK_CREATE_STUDENTS', 'IMPORT_STUDENTS_CSV', 'EXPORT_STUDENTS'] },
  { value: 'staff', label: '👥 Staff Actions', actions: ['CREATE_STAFF', 'UPDATE_STAFF', 'DELETE_STAFF', 'DEACTIVATE_STAFF', 'ACTIVATE_STAFF', 'UPDATE_STAFF_PERMISSIONS', 'RESEND_STAFF_INVITE', 'BULK_CREATE_STAFF'] },
  { value: 'attendance', label: '📋 Attendance Actions', actions: ['MARK_ATTENDANCE', 'BULK_MARK_ATTENDANCE', 'UPDATE_ATTENDANCE'] },
  { value: 'photo', label: '📸 Photo Actions', actions: ['UPLOAD_PHOTO', 'BULK_UPLOAD_PHOTOS', 'DELETE_PHOTO'] },
  { value: 'subscription', label: '💳 Subscription Actions', actions: ['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_GENERATED'] },
  { value: 'system', label: '⚙️ System Actions', actions: ['SYSTEM_ERROR', 'SYSTEM_WARNING', 'API_KEY_CREATED', 'API_KEY_REVOKED'] }
];

// Helper functions
const getActionIcon = (action) => {
  if (!action) return 'pi-info-circle';
  if (action.includes('CREATE')) return 'pi-plus-circle';
  if (action.includes('UPDATE') || action.includes('EDIT')) return 'pi-pencil';
  if (action.includes('DELETE') || action.includes('DEACTIVATE')) return 'pi-trash';
  if (action.includes('LOGIN')) return 'pi-sign-in';
  if (action.includes('LOGOUT')) return 'pi-sign-out';
  if (action.includes('GENERATE')) return 'pi-qrcode';
  return 'pi-info-circle';
};

const getImportanceColor = (importance) => {
  switch (importance) {
    case 'critical': return 'bg-red-100 text-red-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status) => {
  if (status === 'success') return 'pi-check-circle text-green-500';
  return 'pi-times-circle text-red-500';
};

const getUserRoleColor = (role) => {
  switch (role) {
    case 'super_admin': return 'bg-purple-100 text-purple-700';
    case 'admin': return 'bg-slate-100 text-slate-700';
    case 'co_worker': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getUserName = (log) => {
  if (log?.userInfo && typeof log.userInfo === 'object' && log.userInfo.name) return log.userInfo.name;
  if (log?.userId && typeof log.userId === 'object') {
    if (log.userId.firstName && log.userId.lastName) return `${log.userId.firstName} ${log.userId.lastName}`;
    if (log.userId.email) return log.userId.email;
  }
  if (typeof log?.userId === 'string') return log.userId;
  return 'Unknown';
};

const getUserEmail = (log) => {
  if (log?.userInfo && typeof log.userInfo === 'object' && log.userInfo.email) return log.userInfo.email;
  if (log?.userId && typeof log.userId === 'object' && log.userId.email) return log.userId.email;
  return '-';
};

const getUserRole = (log) => {
  if (log?.userInfo && typeof log.userInfo === 'object' && log.userInfo.role) return log.userInfo.role;
  if (log?.userId && typeof log.userId === 'object' && log.userId.role) return log.userId.role;
  return 'co_worker';
};

const getSchoolName = (log) => {
  if (log?.schoolInfo && typeof log.schoolInfo === 'object' && log.schoolInfo.name) return log.schoolInfo.name;
  if (log?.schoolId && typeof log.schoolId === 'object' && log.schoolId.name) return log.schoolId.name;
  return '-';
};

const AuditLogs = () => {
  const { user, socket } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState(null);
  const [accessibleUsers, setAccessibleUsers] = useState([]);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterLoading, setFilterLoading] = useState({
    category: false,
    user: false,
    date: false,
    importance: false,
    status: false
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [pageLimit, setPageLimit] = useState(20);
  const lastFetchRef = useRef(null);
  const isMountedRef = useRef(true);
  const newLogsCountRef = useRef(0);
  const newLogsTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const filterTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    actionCategory: '',
    actionType: '',
    userId: '',
    search: '',
    importance: '',
    status: ''
  });

  const [availableActions, setAvailableActions] = useState([]);

  // Build filter params
  const getFilterParams = useCallback(() => {
    let actionFilter = '';
    if (filters.actionType) {
      actionFilter = filters.actionType;
    } else if (filters.actionCategory) {
      const category = ACTION_CATEGORIES.find(c => c.value === filters.actionCategory);
      if (category) actionFilter = category.actions.join(',');
    }

    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (actionFilter) params.action = actionFilter;
    if (filters.userId) params.userId = filters.userId;
    if (filters.search) params.search = filters.search;
    if (filters.importance) params.importance = filters.importance;
    if (filters.status) params.status = filters.status;
    return params;
  }, [filters]);

  // Main fetch function
  const fetchAuditLogs = useCallback(async (showLoading = true) => {
    if (isFetchingRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isFetchingRef.current = true;

    if (!isMountedRef.current) return;
    if (showLoading) setLoading(true);

    try {
      const params = {
        page: pagination.page,
        limit: pageLimit,
        fetchUsers: initialLoad ? 'true' : 'false',
        ...getFilterParams()
      };

      const response = await auditAPI.getLogs(params, {
        signal: abortController.signal,
        skipCache: true
      });

      if (abortController.signal.aborted) return;
      if (!isMountedRef.current) return;

      if (response.success) {
        setLogs(response.logs || []);
        setStats(response.stats);

        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.pages
          });
        }

        setAccessibleUsers(response.accessibleUsers || []);
        setCurrentUserInfo(response.currentUser);

        if (user?.role === 'super_admin' && response.logs) {
          detectAnomalies(response.logs);
        }

        lastFetchRef.current = new Date();
        setInitialLoad(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
        console.error('Error fetching audit logs:', error);
      }
    } finally {
      if (isMountedRef.current && showLoading) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [pagination.page, pageLimit, getFilterParams, user?.role, initialLoad]);

  // Debounced search function
  const debouncedSearchFilter = useMemo(
    () => debounce((searchValue) => {
      setFilters(prev => ({ ...prev, search: searchValue }));
      setIsFiltering(false);
    }, 500),
    []
  );

  const handleSearchChange = (value) => {
    setIsFiltering(true);
    debouncedSearchFilter(value);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilterLoading(prev => ({ ...prev, [key]: true }));
    setFilters(prev => ({ ...prev, [key]: value }));

    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    auditAPI.clearCache();

    filterTimeoutRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      filterTimeoutRef.current = null;
      setFilterLoading(prev => ({ ...prev, [key]: false }));
    }, 100);
  };

  // Detect anomalies
  const detectAnomalies = useCallback((logsList) => {
    if (!logsList || logsList.length === 0) {
      setAnomalies([]);
      return;
    }

    const newAnomalies = [];
    const now = Date.now();

    const recentFailedLogins = logsList.filter(log =>
      log.action === 'LOGIN_FAILED' &&
      new Date(log.createdAt).getTime() > (now - 5 * 60 * 1000)
    );

    if (recentFailedLogins.length >= 3) {
      newAnomalies.push({
        type: 'brute_force',
        severity: 'critical',
        message: `${recentFailedLogins.length} failed login attempts in the last 5 minutes`,
        users: [...new Set(recentFailedLogins.map(l => getUserEmail(l)))],
        timestamp: new Date()
      });
    }

    const massDeletions = logsList.filter(log =>
      (log.action === 'DELETE_STUDENT' || log.action === 'DELETE_STAFF' || log.action === 'DELETE_USER') &&
      new Date(log.createdAt).getTime() > (now - 60 * 1000)
    );

    if (massDeletions.length >= 5) {
      newAnomalies.push({
        type: 'mass_deletion',
        severity: 'critical',
        message: `${massDeletions.length} deletions in the last 1 minute`,
        timestamp: new Date()
      });
    }

    setAnomalies(newAnomalies);
  }, []);

  const isCurrentUser = (log) => {
    const currentId = currentUserInfo?.id || currentUserInfo?._id;
    if (log?.userId && typeof log.userId === 'object' && log.userId._id) return currentId === log.userId._id;
    if (typeof log?.userId === 'string') return currentId === log.userId;
    return false;
  };

  const formatUserName = (log) => {
    const name = getUserName(log);
    if (isCurrentUser(log)) {
      return <span className="font-semibold text-red-600">You ({name})</span>;
    }
    return <span className="text-sm font-medium text-gray-900">{name}</span>;
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'super_admin': return { text: 'Super Admin - Full Access', color: 'bg-purple-600' };
      case 'admin': return { text: 'Admin - Company View', color: 'bg-slate-700' };
      case 'co_worker': return { text: 'Co-Worker - Limited View', color: 'bg-red-600' };
      default: return { text: 'Audit Logs', color: 'bg-gray-600' };
    }
  };

  // Socket.io listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewAudit = (newLog) => {
      if (realtimeEnabled && isMountedRef.current) {
        setLogs(prev => [newLog, ...prev]);
        newLogsCountRef.current += 1;
        setNewLogsCount(newLogsCountRef.current);

        if (newLogsTimerRef.current) clearTimeout(newLogsTimerRef.current);
        newLogsTimerRef.current = setTimeout(() => {
          newLogsCountRef.current = 0;
          if (isMountedRef.current) setNewLogsCount(0);
        }, 5000);
      }
    };

    const handleCriticalAudit = (criticalLog) => {
      if (!isMountedRef.current) return;
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-bounce';
      toast.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><span>⚠️</span><div><p style="font-weight: bold;">Critical Security Event</p><p style="font-size: 14px;">${criticalLog.action} - ${getUserName(criticalLog)}</p></div></div>`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
      }, 5000);
    };

    socket.on('audit:new', handleNewAudit);
    socket.on('audit:critical', handleCriticalAudit);

    return () => {
      socket.off('audit:new', handleNewAudit);
      socket.off('audit:critical', handleCriticalAudit);
      if (newLogsTimerRef.current) clearTimeout(newLogsTimerRef.current);
    };
  }, [socket, realtimeEnabled]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (newLogsTimerRef.current) clearTimeout(newLogsTimerRef.current);
    };
  }, []);

  // Update available actions when category changes
  useEffect(() => {
    if (filters.actionCategory) {
      const category = ACTION_CATEGORIES.find(c => c.value === filters.actionCategory);
      setAvailableActions(category ? category.actions : []);
    } else {
      setAvailableActions([]);
    }
  }, [filters.actionCategory]);

  // Fetch when page changes
  useEffect(() => {
    if (!initialLoad) {
      fetchAuditLogs(true);
    }
  }, [pagination.page]);

  // Fetch when filters change (after page reset)
  useEffect(() => {
    if (!initialLoad && pagination.page === 1) {
      fetchAuditLogs(true);
    }
  }, [filters.startDate, filters.endDate, filters.actionCategory, filters.actionType,
  filters.userId, filters.search, filters.importance, filters.status]);

  // Initial load
  useEffect(() => {
    fetchAuditLogs(true);
  }, []);

  // Real-time polling fallback
  useEffect(() => {
    let interval;
    if (!socket || !socket.connected) {
      interval = setInterval(() => {
        if (isMountedRef.current) {
          fetchAuditLogs(false);
        }
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [socket, fetchAuditLogs]);

  const resetFilters = () => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    setFilters({
      startDate: '', endDate: '', actionCategory: '', actionType: '',
      userId: '', search: '', importance: '', status: ''
    });
    auditAPI.clearCache();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageLimitChange = (newLimit) => {
    setPageLimit(newLimit);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Fetch ALL filtered data for export/print
  const fetchAllFilteredData = useCallback(async () => {
    const filterParams = getFilterParams();
    let allLogs = [];
    let currentPageNum = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const params = { page: currentPageNum, limit, ...filterParams };
        const response = await auditAPI.getLogs(params);

        if (response.success && response.logs && response.logs.length > 0) {
          allLogs = [...allLogs, ...response.logs];
          if (currentPageNum >= response.pagination.pages) {
            hasMore = false;
          } else {
            currentPageNum++;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error('Error fetching page for export:', error);
        hasMore = false;
      }
    }

    return allLogs;
  }, [getFilterParams]);

  // Export to Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const allData = await fetchAllFilteredData();
      if (!isMountedRef.current) return;

      if (!allData || allData.length === 0) {
        alert('No logs to export with current filters');
        setExporting(false);
        return;
      }

      const exportData = allData.map(log => ({
        'Timestamp': new Date(log.createdAt).toLocaleString(),
        'User': getUserName(log),
        'User Email': getUserEmail(log),
        'User Role': getUserRole(log),
        'Action': log.action?.replace(/_/g, ' ') || '-',
        'Status': log.status?.charAt(0).toUpperCase() + log.status?.slice(1) || '-',
        'Importance': log.importance?.charAt(0).toUpperCase() + log.importance?.slice(1) || 'Low',
        'School': getSchoolName(log),
        'IP Address': log.ipAddress || '-',
        'Details': typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '-'),
        'Error': log.errorMessage || '-'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 },
        { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
        { wch: 18 }, { wch: 40 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const fileName = `audit_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      saveAs(blob, fileName);

      alert(`✅ Successfully exported ${allData.length} records!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export logs. Please try again.');
    } finally {
      if (isMountedRef.current) setExporting(false);
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header - CRIMSON THEME */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-5 sm:p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl sm:text-2xl font-bold">🔒 Audit Logs</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>{roleBadge.text}</span>
                {socket?.connected && (
                  <span className="px-2 py-1 bg-green-500 rounded-full text-xs flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-sm mt-2">
                {user?.role === 'super_admin' && 'Complete system activity tracking across all organizations with real-time updates'}
                {user?.role === 'admin' && 'Monitoring your company and staff activities'}
                {user?.role === 'co_worker' && 'Tracking your activities and peer co-worker actions'}
              </p>
            </div>
            <div className="flex space-x-3">
              {newLogsCount > 0 && (
                <button
                  onClick={() => { fetchAuditLogs(true); setNewLogsCount(0); newLogsCountRef.current = 0; }}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 animate-pulse"
                >
                  <i className="pi pi-refresh"></i>
                  <span>{newLogsCount} New</span>
                </button>
              )}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <i className="pi pi-file-excel"></i>
                <span>{exporting ? 'Exporting...' : 'Export'}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl"></div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={realtimeEnabled}
              onChange={(e) => setRealtimeEnabled(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Real-time Updates</span>
          </label>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={pageLimit}
              onChange={(e) => handlePageLimitChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-red-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Updated: {lastFetchRef.current ? new Date(lastFetchRef.current).toLocaleTimeString() : '--:--:--'}
        </div>
      </div>

      {/* Loading overlay for filtering */}
      {isFiltering && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl p-4 flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-700">Filtering...</span>
          </div>
        </div>
      )}

      {/* Anomaly Alerts */}
      {user?.role === 'super_admin' && anomalies.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 animate-pulse">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="pi pi-exclamation-triangle text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800">⚠️ Critical Anomalies Detected</h3>
              <div className="mt-2 space-y-1">
                {anomalies.map((anomaly, idx) => (
                  <p key={idx} className="text-sm text-red-700">
                    • {anomaly.message} ({new Date(anomaly.timestamp).toLocaleTimeString()})
                  </p>
                ))}
              </div>
            </div>
            <button onClick={() => setAnomalies([])} className="text-red-500 hover:text-red-700">
              <i className="pi pi-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">🔍 Filters</h3>
          <button
            onClick={resetFilters}
            disabled={loading}
            className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1 disabled:opacity-50"
          >
            <i className="pi pi-trash text-xs"></i>
            <span>Clear All</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
              {filterLoading.date && <i className="pi pi-spin pi-spinner ml-2 text-red-500 text-xs"></i>}
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
              {isFiltering && <i className="pi pi-spin pi-spinner ml-2 text-red-500 text-xs"></i>}
            </label>
            <div className="relative">
              <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={filters.search}
                placeholder="Search..."
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Importance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importance
              {filterLoading.importance && <i className="pi pi-spin pi-spinner ml-2 text-red-500 text-xs"></i>}
            </label>
            <select
              value={filters.importance}
              onChange={(e) => handleFilterChange('importance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">All Importance</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
              {filterLoading.status && <i className="pi pi-spin pi-spinner ml-2 text-red-500 text-xs"></i>}
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">All Status</option>
              <option value="success">✅ Success</option>
              <option value="failure">❌ Failure</option>
            </select>
          </div>

          {/* Action Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Category
              {filterLoading.category && <i className="pi pi-spin pi-spinner ml-2 text-red-500 text-xs"></i>}
            </label>
            <select
              value={filters.actionCategory}
              onChange={(e) => handleFilterChange('actionCategory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">All Actions</option>
              {ACTION_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Specific Action (conditional) */}
          {availableActions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specific Action</label>
              <select
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All in Category</option>
                {availableActions.map(action => (
                  <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {/* User filter */}
          {accessibleUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
                {filterLoading.user && <i className="pi pi-spin pi-spinner ml-2 text-red-500 text-xs"></i>}
              </label>
              <select
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Users</option>
                {accessibleUsers.map(u => (
                  <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role === 'co_worker' ? 'Co-Worker' : u.role})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active filters summary */}
        {(Object.values(filters).some(f => f) || loading) && (
          <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {loading && (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              <span className="text-xs text-gray-500">
                {loading ? 'Loading...' : 'Filters applied'}
              </span>
            </div>
            {!loading && (
              <span className="text-xs text-red-600">
                {(() => {
                  const activeCount = Object.values(filters).filter(v => v).length;
                  return activeCount > 0 ? `${activeCount} active filter(s)` : 'No filters';
                })()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards - CRIMSON THEME */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3">
            <p className="text-2xl font-bold text-slate-800">{stats.totalCount?.[0]?.count || 0}</p>
            <p className="text-xs text-slate-500">Total Actions</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3">
            <p className="text-2xl font-bold text-green-600">
              {stats.successRate?.[0]?.total > 0
                ? ((stats.successRate[0].success / stats.successRate[0].total) * 100).toFixed(1) + '%'
                : '0%'}
            </p>
            <p className="text-xs text-slate-500">Success Rate</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3">
            <p className="text-2xl font-bold text-red-600">{stats.successRate?.[0]?.failed || 0}</p>
            <p className="text-xs text-slate-500">Failures</p>
          </div>
          <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3">
            <p className="text-2xl font-bold text-orange-600">
              {stats.byImportance?.find(i => i._id === 'critical')?.count || 0}
            </p>
            <p className="text-xs text-slate-500">Critical Events</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Importance</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Organization</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {[...Array(8)].map((_, colIdx) => (
                      <td key={colIdx} className="py-3 px-4">
                        <div className="h-4 bg-slate-100 rounded"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <i className="pi pi-inbox text-gray-400 text-4xl mb-2 block"></i>
                    <p className="text-gray-500">No audit logs found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log._id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{new Date(log.createdAt).toLocaleTimeString()}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        {formatUserName(log)}
                        <span className="text-xs text-gray-500">{getUserEmail(log)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getUserRoleColor(getUserRole(log))}`}>
                        {getUserRole(log) === 'co_worker' ? 'Co-Worker' : getUserRole(log)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <i className={`pi ${getActionIcon(log.action)} text-red-500 text-sm`}></i>
                        <span className="text-sm text-gray-900">{log.action?.replace(/_/g, ' ') || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <i className={`pi ${getStatusIcon(log.status)} text-base`}></i>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(log.importance)}`}>
                        {log.importance || 'low'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-900">{getSchoolName(log)}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => { setSelectedLog(log); setShowDetailsModal(true); }}
                        className="text-red-600 hover:text-red-700 text-sm flex items-center space-x-1 mx-auto"
                      >
                        <i className="pi pi-eye text-xs"></i>
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 gap-4">
            <p className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pageLimit) + 1} to {Math.min(pagination.page * pageLimit, pagination.total)} of {pagination.total} logs
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <i className="pi pi-chevron-left text-xs mr-1"></i>Previous
              </button>
              <div className="flex space-x-1">
                {(() => {
                  const totalPages = pagination.pages;
                  const currentPage = pagination.page;
                  let pagesToShow = [];
                  if (totalPages <= 5) {
                    pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1);
                  } else if (currentPage <= 3) {
                    pagesToShow = [1, 2, 3, 4, '...', totalPages];
                  } else if (currentPage >= totalPages - 2) {
                    pagesToShow = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                  } else {
                    pagesToShow = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                  }
                  return pagesToShow.map((page, idx) => (
                    page === '...' ?
                      <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-500">...</span> :
                      <button
                        key={page}
                        onClick={() => handlePageChange(Number(page))}
                        className={`w-8 h-8 rounded-lg transition-colors ${pagination.page === page ? 'bg-red-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                      >
                        {page}
                      </button>
                  ));
                })()}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Next<i className="pi pi-chevron-right text-xs ml-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-1.5 flex items-center space-x-2 border border-slate-200 z-30">
        <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-xs text-gray-600">{socket?.connected ? 'Real-time' : 'Polling'}</span>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-5 border-b border-gray-200 flex justify-between items-center z-10">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedLog.importance === 'critical' ? 'bg-red-100' : 'bg-slate-100'}`}>
                  <i className={`pi ${selectedLog.importance === 'critical' ? 'pi-exclamation-triangle text-red-600' : 'pi-info-circle text-slate-600'}`}></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
                  <p className="text-xs text-gray-500 font-mono">Event ID: {selectedLog._id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <i className="pi pi-times text-gray-600"></i>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Action</label>
                  <p className="text-base font-semibold text-gray-900">{selectedLog.action?.replace(/_/g, ' ') || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status & Importance</label>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedLog.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedLog.status}
                    </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(selectedLog.importance)}`}>
                      {selectedLog.importance || 'medium'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">User</label>
                <p className="text-sm font-medium text-gray-900">
                  {getUserName(selectedLog)}
                  {isCurrentUser(selectedLog) && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">You</span>}
                </p>
                <p className="text-sm text-gray-600">Email: {getUserEmail(selectedLog)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${getUserRoleColor(getUserRole(selectedLog))}`}>
                    {getUserRole(selectedLog) === 'co_worker' ? 'Co-Worker' : getUserRole(selectedLog)}
                  </span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Organization</label>
                <p className="text-sm font-medium text-gray-900">{getSchoolName(selectedLog)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Timestamp</label>
                <p className="text-sm text-gray-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">IP Address</label>
                <code className="text-sm bg-white px-3 py-1 rounded border">{selectedLog.ipAddress || 'N/A'}</code>
              </div>
              {selectedLog.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <label className="block text-xs font-medium text-red-700 mb-2">Error</label>
                  <p className="text-sm text-red-700">{selectedLog.errorMessage}</p>
                </div>
              )}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Details</label>
                  <pre className="bg-white p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-60 border">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;