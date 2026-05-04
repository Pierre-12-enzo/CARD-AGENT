// pages/dashboard/AuditLogs.jsx - CARD-AGENT NAVY & CRIMSON - FULL FEATURES
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
import { useAuth } from '../../context/AuthContext';
import { auditAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Action Categories
const ACTION_CATEGORIES = [
  { value: 'delete', label: '🗑️ Delete', actions: ['DELETE_USER', 'DELETE_STAFF', 'DELETE_SCHOOL', 'DELETE_STUDENT', 'DELETE_CARD', 'DELETE_TEMPLATE', 'DELETE_PHOTO'] },
  { value: 'create', label: '✨ Create', actions: ['CREATE_USER', 'CREATE_STAFF', 'CREATE_SCHOOL', 'CREATE_STUDENT', 'CREATE_TEMPLATE', 'CREATE_REGISTER'] },
  { value: 'update', label: '✏️ Update', actions: ['UPDATE_USER', 'UPDATE_STAFF', 'UPDATE_SCHOOL', 'UPDATE_STUDENT', 'UPDATE_CARD', 'UPDATE_TEMPLATE', 'UPDATE_ATTENDANCE', 'UPDATE_SETTINGS', 'UPDATE_STAFF_PERMISSIONS'] },
  { value: 'login', label: '🔐 Auth', actions: ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET'] },
  { value: 'card', label: '🪪 Card', actions: ['GENERATE_CARD', 'UPDATE_CARD', 'DELETE_CARD', 'BULK_GENERATE_CARDS', 'PRINT_CARD', 'DOWNLOAD_CARD'] },
  { value: 'student', label: '👨‍🎓 Student', actions: ['CREATE_STUDENT', 'UPDATE_STUDENT', 'DELETE_STUDENT', 'BULK_CREATE_STUDENTS', 'IMPORT_STUDENTS_CSV', 'EXPORT_STUDENTS'] },
  { value: 'staff', label: '👥 Co-Worker', actions: ['CREATE_STAFF', 'UPDATE_STAFF', 'DELETE_STAFF', 'DEACTIVATE_STAFF', 'ACTIVATE_STAFF', 'UPDATE_STAFF_PERMISSIONS', 'RESEND_STAFF_INVITE', 'BULK_CREATE_STAFF'] },
  { value: 'photo', label: '📸 Photo', actions: ['UPLOAD_PHOTO', 'BULK_UPLOAD_PHOTOS', 'DELETE_PHOTO'] },
  { value: 'license', label: '🔑 License', actions: ['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_GENERATED'] },
  { value: 'system', label: '⚙️ System', actions: ['SYSTEM_ERROR', 'SYSTEM_WARNING', 'API_KEY_CREATED', 'API_KEY_REVOKED'] }
];

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
    case 'critical': return 'bg-red-100 text-red-700 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const getStatusIcon = (status) => {
  return status === 'success' ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500';
};

const getUserRoleColor = (role) => {
  switch (role) {
    case 'super_admin': return 'bg-purple-100 text-purple-700';
    case 'admin': return 'bg-slate-100 text-slate-700';
    case 'co_worker': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
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
  if (log?.userInfo?.email) return log.userInfo.email;
  if (log?.userId?.email) return log.userId.email;
  return '-';
};

const getUserRole = (log) => {
  if (log?.userInfo?.role) return log.userInfo.role;
  if (log?.userId?.role) return log.userId.role;
  return 'co_worker';
};

const getCompanyName = (log) => {
  if (log?.companyInfo?.name) return log.companyInfo.name;
  if (log?.companyId?.name) return log.companyId.name;
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

  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [pageLimit, setPageLimit] = useState(20);

  const [filters, setFilters] = useState({
    startDate: '', endDate: '', actionCategory: '', actionType: '',
    userId: '', search: '', importance: '', status: ''
  });
  const [availableActions, setAvailableActions] = useState([]);

  const lastFetchRef = useRef(null);
  const isMountedRef = useRef(true);
  const newLogsCountRef = useRef(0);
  const newLogsTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);

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

  const fetchAuditLogs = useCallback(async (showLoading = true) => {
    if (isFetchingRef.current) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isFetchingRef.current = true;
    if (!isMountedRef.current) return;
    if (showLoading) setLoading(true);

    try {
      const params = { page: pagination.page, limit: pageLimit, fetchUsers: initialLoad ? 'true' : 'false', ...getFilterParams() };
      const response = await auditAPI.getLogs(params, { signal: abortController.signal, skipCache: true });

      if (abortController.signal.aborted || !isMountedRef.current) return;

      if (response.success) {
        setLogs(response.logs || []);
        setStats(response.stats);
        if (response.pagination) setPagination(response.pagination);
        setAccessibleUsers(response.accessibleUsers || []);
        setCurrentUserInfo(response.currentUser);
        if (user?.role === 'super_admin' && response.logs) detectAnomalies(response.logs);
        lastFetchRef.current = new Date();
        setInitialLoad(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') console.error('Fetch error:', error);
    } finally {
      if (isMountedRef.current && showLoading) setLoading(false);
      isFetchingRef.current = false;
    }
  }, [pagination.page, pageLimit, getFilterParams, user?.role, initialLoad]);

  const detectAnomalies = useCallback((logsList) => {
    if (!logsList?.length) { setAnomalies([]); return; }
    const now = Date.now();
    const newAnomalies = [];
    const recentFailedLogins = logsList.filter(log => log.action === 'LOGIN_FAILED' && new Date(log.createdAt).getTime() > (now - 5 * 60 * 1000));
    if (recentFailedLogins.length >= 3) {
      newAnomalies.push({ type: 'brute_force', severity: 'critical', message: `${recentFailedLogins.length} failed logins in last 5 min`, timestamp: new Date() });
    }
    const massDeletions = logsList.filter(log => (log.action === 'DELETE_STUDENT' || log.action === 'DELETE_STAFF') && new Date(log.createdAt).getTime() > (now - 60 * 1000));
    if (massDeletions.length >= 5) {
      newAnomalies.push({ type: 'mass_deletion', severity: 'critical', message: `${massDeletions.length} deletions in last 1 min`, timestamp: new Date() });
    }
    setAnomalies(newAnomalies);
  }, []);

  const isCurrentUser = (log) => {
    const currentId = currentUserInfo?.id || currentUserInfo?._id;
    if (log?.userId && typeof log.userId === 'object' && log.userId._id) return currentId === log.userId._id;
    if (typeof log?.userId === 'string') return currentId === log.userId;
    return false;
  };

  const debouncedSearch = useMemo(() => debounce((val) => setFilters(prev => ({ ...prev, search: val })), 400), []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    auditAPI.clearCache();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ startDate: '', endDate: '', actionCategory: '', actionType: '', userId: '', search: '', importance: '', status: '' });
    auditAPI.clearCache();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const handleNewAudit = (newLog) => {
      if (realtimeEnabled && isMountedRef.current) {
        setLogs(prev => [newLog, ...prev]);
        newLogsCountRef.current += 1;
        setNewLogsCount(newLogsCountRef.current);
        if (newLogsTimerRef.current) clearTimeout(newLogsTimerRef.current);
        newLogsTimerRef.current = setTimeout(() => { newLogsCountRef.current = 0; if (isMountedRef.current) setNewLogsCount(0); }, 5000);
      }
    };
    const handleCriticalAudit = (criticalLog) => {
      if (!isMountedRef.current) return;
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 right-4 bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl z-50 animate-bounce';
      toast.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span>⚠️</span><div><p style="font-weight:bold;">Critical Event</p><p style="font-size:13px;">${criticalLog.action} - ${getUserName(criticalLog)}</p></div></div>`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 5000);
    };
    socket.on('audit:new', handleNewAudit);
    socket.on('audit:critical', handleCriticalAudit);
    return () => { socket.off('audit:new', handleNewAudit); socket.off('audit:critical', handleCriticalAudit); if (newLogsTimerRef.current) clearTimeout(newLogsTimerRef.current); };
  }, [socket, realtimeEnabled]);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; if (newLogsTimerRef.current) clearTimeout(newLogsTimerRef.current); }; }, []);
  useEffect(() => { fetchAuditLogs(true); }, []);
  useEffect(() => { if (!initialLoad) fetchAuditLogs(true); }, [pagination.page, pageLimit]);

  // Polling fallback
  useEffect(() => {
    let interval;
    if (!socket || !socket.connected) { interval = setInterval(() => { if (isMountedRef.current) fetchAuditLogs(false); }, 30000); }
    return () => { if (interval) clearInterval(interval); };
  }, [socket, fetchAuditLogs]);

  useEffect(() => {
    if (filters.actionCategory) {
      const category = ACTION_CATEGORIES.find(c => c.value === filters.actionCategory);
      setAvailableActions(category ? category.actions : []);
    } else { setAvailableActions([]); }
  }, [filters.actionCategory]);

  // Export
  const fetchAllFilteredData = useCallback(async () => {
    const filterParams = getFilterParams();
    let allLogs = []; let page = 1; let hasMore = true;
    while (hasMore) {
      const res = await auditAPI.getLogs({ page, limit: 100, ...filterParams });
      if (res.success && res.logs?.length > 0) { allLogs = [...allLogs, ...res.logs]; page++; } else hasMore = false;
    }
    return allLogs;
  }, [getFilterParams]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const allData = await fetchAllFilteredData();
      if (!allData?.length) { alert('No logs to export'); setExporting(false); return; }
      const exportData = allData.map(log => ({
        'Timestamp': new Date(log.createdAt).toLocaleString(), 'User': getUserName(log),
        'Email': getUserEmail(log), 'Role': getUserRole(log),
        'Action': log.action?.replace(/_/g, ' ') || '-', 'Status': log.status || '-',
        'Importance': log.importance || 'low', 'Company': getCompanyName(log),
        'IP': log.ipAddress || '-', 'Details': typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '-')
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 40 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
      XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
      alert(`Exported ${allData.length} records`);
    } catch (e) { console.error(e); } finally { if (isMountedRef.current) setExporting(false); }
  };

  const handlePrint = async () => {
    try {
      const allData = await fetchAllFilteredData();
      if (!allData?.length) { alert('No logs to print'); return; }
      const printWindow = window.open('', '_blank');
      const rows = allData.map(log => `
        <tr>
          <td>${new Date(log.createdAt).toLocaleString()}</td><td>${getUserName(log)}</td>
          <td>${getUserRole(log)}</td><td>${log.action?.replace(/_/g, ' ') || '-'}</td>
          <td class="${log.status === 'success' ? 'success' : 'failure'}">${log.status}</td>
          <td class="${log.importance === 'critical' ? 'critical' : ''}">${log.importance || 'low'}</td>
          <td>${getCompanyName(log)}</td><td>${log.ipAddress || '-'}</td>
        </tr>`).join('');
      printWindow.document.write(`
        <html><head><title>Audit Logs</title>
        <style>
          @page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:10px}
          table{width:100%;border-collapse:collapse}th{background:#0F172A;color:#fff;padding:6px 4px;text-align:left}
          td{padding:4px;border-bottom:1px solid #e2e8f0}.success{color:#16a34a;font-weight:bold}
          .failure{color:#dc2626;font-weight:bold}.critical{color:#ea580c;background:#fef2f2}
          h1{color:#0F172A;margin-bottom:4px}.meta{color:#64748b;margin-bottom:8px}
          @media print{body{print-color-adjust:exact}}
        </style></head>
        <body><h1>CARD-AGENT Audit Logs</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Total: ${allData.length} records</div>
        <table><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Status</th><th>Importance</th><th>Company</th><th>IP</th></tr></thead><tbody>${rows}</tbody></table></body></html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } catch (e) { console.error(e); }
  };

  const roleBadge = () => {
    switch (user?.role) {
      case 'super_admin': return { text: 'Super Admin - Full Access', color: 'bg-purple-600' };
      case 'admin': return { text: 'Admin - Company View', color: 'bg-slate-700' };
      case 'co_worker': return { text: 'Co-Worker - Assigned View', color: 'bg-red-600' };
      default: return { text: 'Audit Logs', color: 'bg-slate-600' };
    }
  };

  const badge = roleBadge();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-5 sm:p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">🔒 Audit Logs</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>
                {socket?.connected && (
                  <span className="px-2 py-1 bg-green-500 rounded-full text-xs flex items-center space-x-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span><span>Live</span>
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-sm mt-2">Complete system activity tracking with real-time updates</p>
            </div>
            <div className="flex space-x-2">
              {newLogsCount > 0 && (
                <button onClick={() => { fetchAuditLogs(true); setNewLogsCount(0); newLogsCountRef.current = 0; }}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 animate-pulse text-sm">
                  <i className="pi pi-refresh text-xs"></i><span>{newLogsCount} New</span>
                </button>
              )}
              <button onClick={handleExport} disabled={exporting}
                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm disabled:opacity-50">
                <i className="pi pi-file-excel"></i><span>{exporting ? '...' : 'Export'}</span>
              </button>
              <button onClick={handlePrint}
                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm">
                <i className="pi pi-print"></i><span>Print</span>
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl"></div>
      </div>

      {/* Real-time Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" checked={realtimeEnabled} onChange={(e) => setRealtimeEnabled(e.target.checked)}
            className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
          <span className="text-sm text-slate-600">Real-time Updates</span>
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500">Show:</span>
          <select value={pageLimit} onChange={(e) => { setPageLimit(Number(e.target.value)); setPagination(p => ({ ...p, page: 1 })); }}
            className="px-2 py-1 border border-slate-300 rounded-lg text-xs">
            <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Anomaly Alerts */}
      {user?.role === 'super_admin' && anomalies.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="pi pi-exclamation-triangle text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800">⚠️ Anomalies Detected</h3>
              {anomalies.map((a, i) => (
                <p key={i} className="text-sm text-red-700 mt-1">• {a.message} ({new Date(a.timestamp).toLocaleTimeString()})</p>
              ))}
            </div>
            <button onClick={() => setAnomalies([])} className="text-red-500 hover:text-red-700"><i className="pi pi-times"></i></button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">🔍 Filters</h3>
          <button onClick={resetFilters} className="text-xs text-red-600 hover:text-red-700 flex items-center space-x-1">
            <i className="pi pi-trash text-xs"></i><span>Clear All</span>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs" />
          <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs" />
          <select value={filters.actionCategory} onChange={(e) => handleFilterChange('actionCategory', e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs">
            <option value="">All Categories</option>
            {ACTION_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {availableActions.length > 0 && (
            <select value={filters.actionType} onChange={(e) => handleFilterChange('actionType', e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs">
              <option value="">All in Category</option>
              {availableActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          )}
          <select value={filters.importance} onChange={(e) => handleFilterChange('importance', e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs">
            <option value="">All Importance</option>
            <option value="critical">🔴 Critical</option><option value="high">🟠 High</option><option value="medium">🟡 Medium</option>
          </select>
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs">
            <option value="">All Status</option><option value="success">✅ Success</option><option value="failure">❌ Failed</option>
          </select>
          {accessibleUsers.length > 0 && (
            <select value={filters.userId} onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs">
              <option value="">All Users</option>
              {accessibleUsers.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role})</option>)}
            </select>
          )}
          <div className="relative">
            <i className="pi pi-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" placeholder="Search..." defaultValue={filters.search}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs" />
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="Total Actions" value={stats.totalCount?.[0]?.count || 0} icon="pi-chart-line" />
          <MiniStat label="Success Rate" value={stats.successRate?.[0]?.total > 0 ? ((stats.successRate[0].success / stats.successRate[0].total) * 100).toFixed(1) + '%' : '0%'} icon="pi-check-circle" />
          <MiniStat label="Failures" value={stats.successRate?.[0]?.failed || 0} icon="pi-times-circle" red />
          <MiniStat label="Critical" value={stats.byImportance?.find(i => i._id === 'critical')?.count || 0} icon="pi-exclamation-triangle" red />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Importance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse"></div></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-16 text-slate-400">No audit logs found</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-slate-700">{new Date(log.createdAt).toLocaleTimeString()}</p>
                      <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={`text-xs font-medium ${isCurrentUser(log) ? 'text-red-600' : 'text-slate-700'}`}>
                          {isCurrentUser(log) ? 'You' : getUserName(log)}
                        </span>
                        <span className="text-xs text-slate-400">{getUserEmail(log)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getUserRoleColor(getUserRole(log))}`}>
                        {getUserRole(log)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <i className={`${getActionIcon(log.action)} text-slate-400 text-xs`}></i>
                        <span className="text-xs text-slate-700">{log.action?.replace(/_/g, ' ') || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><i className={`pi ${getStatusIcon(log.status)} text-sm`}></i></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getImportanceColor(log.importance)}`}>
                        {log.importance || 'low'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{getCompanyName(log)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => { setSelectedLog(log); setShowDetailsModal(true); }}
                        className="text-slate-400 hover:text-red-600 text-xs font-medium">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 gap-3">
            <p className="text-xs text-slate-500">
              Showing {((pagination.page - 1) * pageLimit) + 1} to {Math.min(pagination.page * pageLimit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center space-x-1">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs disabled:opacity-50 hover:bg-slate-50">Previous</button>
              {(() => {
                const pages = [];
                const total = pagination.pages;
                const current = pagination.page;
                if (total <= 5) for (let i = 1; i <= total; i++) pages.push(i);
                else {
                  pages.push(1);
                  if (current > 3) pages.push('...');
                  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
                  if (current < total - 2) pages.push('...');
                  pages.push(total);
                }
                return pages.map((p, i) => p === '...' ? <span key={i} className="px-2 text-slate-400">...</span> :
                  <button key={p} onClick={() => setPagination(pr => ({ ...pr, page: p }))}
                    className={`w-8 h-8 rounded-lg text-xs font-medium ${pagination.page === p ? 'bg-red-600 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}>{p}</button>
                );
              })()}
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs disabled:opacity-50 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-1.5 flex items-center space-x-2 border border-slate-200 z-30">
        <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-xs text-slate-500">{socket?.connected ? 'Real-time' : 'Polling'}</span>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-5 border-b border-slate-200 flex justify-between items-center z-10">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedLog.importance === 'critical' ? 'bg-red-100' : 'bg-slate-100'}`}>
                  <i className={`pi ${selectedLog.importance === 'critical' ? 'pi-exclamation-triangle text-red-600' : 'pi-info-circle text-slate-600'}`}></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Log Details</h2>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedLog._id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><i className="pi pi-times"></i></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailBox label="Action" value={selectedLog.action?.replace(/_/g, ' ')} />
                <DetailBox label="Status">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedLog.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedLog.status}</span>
                </DetailBox>
              </div>
              <DetailBox label="User" value={`${getUserName(selectedLog)}${isCurrentUser(selectedLog) ? ' (You)' : ''}`} />
              <DetailBox label="Email" value={getUserEmail(selectedLog)} />
              <DetailBox label="Company" value={getCompanyName(selectedLog)} />
              <DetailBox label="Timestamp" value={new Date(selectedLog.createdAt).toLocaleString()} />
              <DetailBox label="IP Address" value={selectedLog.ipAddress || 'N/A'} />
              {selectedLog.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-red-700">Error</p>
                  <p className="text-sm text-red-600">{selectedLog.errorMessage}</p>
                </div>
              )}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Details</p>
                  <pre className="bg-slate-50 p-3 rounded-xl text-xs overflow-x-auto max-h-60 border border-slate-200">{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, icon, red }) => (
  <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3 flex items-center justify-between">
    <div>
      <p className={`text-lg font-bold ${red ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${red ? 'bg-red-100' : 'bg-slate-100'}`}>
      <i className={`${icon} ${red ? 'text-red-600' : 'text-slate-600'} text-sm`}></i>
    </div>
  </div>
);

const DetailBox = ({ label, value, children }) => (
  <div className="bg-slate-50 rounded-xl p-3">
    <p className="text-xs text-slate-500 mb-1">{label}</p>
    {children || <p className="text-sm font-medium text-slate-800">{value || 'N/A'}</p>}
  </div>
);

export default AuditLogs;