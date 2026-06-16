// pages/admin/AuditLogs.jsx - UPDATED WITH USER-FRIENDLY DISPLAY

import React, { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    schoolId: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);
  const [dateRange, setDateRange] = useState('today');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      if (dateRange !== 'custom') {
        const dates = getDateRange(dateRange);
        if (dates.startDate) params.startDate = dates.startDate;
        if (dates.endDate) params.endDate = dates.endDate;
      }

      const response = await auditAPI.getLogs(params);
      if (response.success) {
        setLogs(response.logs || []);
        setStats(response.stats);
        setPagination(response.pagination);
        setUsers(response.accessibleUsers || []);
        setOrganizations(response.accessibleOrganizations || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters, dateRange]);

  const getDateRange = (range) => {
    const now = new Date();
    const start = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: now.toISOString() };
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case 'week':
        start.setDate(start.getDate() - 7);
        return { startDate: start.toISOString(), endDate: now.toISOString() };
      case 'month':
        start.setMonth(start.getMonth() - 1);
        return { startDate: start.toISOString(), endDate: now.toISOString() };
      default:
        return {};
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return 'pi-plus-circle';
    if (action.includes('UPDATE')) return 'pi-pencil';
    if (action.includes('DELETE')) return 'pi-trash';
    if (action.includes('GENERATE')) return 'pi-qrcode';
    if (action.includes('BULK')) return 'pi-users';
    if (action.includes('LOGIN')) return 'pi-sign-in';
    if (action.includes('LOGOUT')) return 'pi-sign-out';
    if (action.includes('UPLOAD')) return 'pi-upload';
    if (action.includes('TEMPLATE')) return 'pi-image';
    return 'pi-tag';
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
    if (action.includes('GENERATE')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (action.includes('BULK')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (action.includes('LOGIN')) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (action.includes('LOGOUT')) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (action.includes('UPLOAD')) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    if (action.includes('TEMPLATE')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusBadge = (status) => {
    if (status === 'success') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><i className="pi pi-check-circle text-xs"></i> Success</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"><i className="pi pi-times-circle text-xs"></i> Failed</span>;
  };

  const formatActionDisplay = (action) => {
    const displayMap = {
      'CREATE_STUDENT': 'Created Student',
      'UPDATE_STUDENT': 'Updated Student',
      'DELETE_STUDENT': 'Deleted Student',
      'BULK_CREATE_STUDENTS': 'Bulk Import Students',
      'BULK_DELETE_STUDENTS': 'Bulk Delete Students',
      'CREATE_STAFF': 'Added Staff Member',
      'UPDATE_STAFF': 'Updated Staff Member',
      'UPDATE_STAFF_PERMISSIONS': 'Updated Permissions',
      'DELETE_STAFF': 'Deleted Staff Member',
      'DEACTIVATE_STAFF': 'Deactivated Staff Member',
      'RESEND_STAFF_INVITE': 'Resent Invitation',
      'CREATE_SCHOOL': 'Created Organization',
      'UPDATE_SCHOOL': 'Updated Organization',
      'DELETE_SCHOOL': 'Deleted Organization',
      'CREATE_TEMPLATE': 'Created Template',
      'UPDATE_TEMPLATE': 'Updated Template',
      'DELETE_TEMPLATE': 'Deleted Template',
      'GENERATE_CARD': 'Generated ID Card',
      'BULK_GENERATE_CARDS': 'Batch Generated Cards',
      'UPLOAD_PHOTO': 'Uploaded Photo',
      'BULK_UPLOAD_PHOTOS': 'Bulk Uploaded Photos',
      'LOGIN': 'Logged In',
      'LOGOUT': 'Logged Out',
      'PASSWORD_CHANGE': 'Changed Password',
      'PASSWORD_RESET': 'Reset Password',
      'UPDATE_SETTINGS': 'Updated Settings',
      'SUBSCRIPTION_CREATED': 'License Activated',
      'SUBSCRIPTION_UPDATED': 'License Updated',
      'SUBSCRIPTION_CANCELLED': 'License Revoked'
    };
    return displayMap[action] || action.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-RW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const getEntityLink = (log) => {
    if (!log.targetId) return null;

    const basePath = log.targetModel?.toLowerCase();
    if (basePath === 'student') return `/dashboard/students/${log.targetId}`;
    if (basePath === 'school') return `/dashboard/organizations/${log.targetId}`;
    if (basePath === 'template') return `/dashboard/templates/${log.targetId}`;
    if (basePath === 'user') return `/dashboard/co-workers/${log.targetId}`;
    return null;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
            Audit Logs
          </h2>
          <p className="text-slate-500 mt-1">Complete history of all actions across the system</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <i className="pi pi-refresh"></i>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard icon="pi pi-history" label="Total Events" value={stats.totalCount?.[0]?.count || 0} color="slate" />
          <StatCard icon="pi pi-check-circle" label="Successful" value={stats.successRate?.[0]?.success || 0} color="green" />
          <StatCard icon="pi pi-times-circle" label="Failed" value={stats.successRate?.[0]?.failed || 0} color="red" />
          <StatCard icon="pi pi-chart-line" label="Today" value={stats.todayCount || 0} color="blue" />
          <StatCard icon="pi pi-exclamation-triangle" label="Critical" value={stats.criticalCount || 0} color="amber" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            >
              <option value="">All Actions</option>
              <option value="CREATE_STUDENT">Create Student</option>
              <option value="UPDATE_STUDENT">Update Student</option>
              <option value="DELETE_STUDENT">Delete Student</option>
              <option value="BULK_CREATE_STUDENTS">Bulk Import</option>
              <option value="CREATE_STAFF">Add Staff</option>
              <option value="UPDATE_STAFF">Update Staff</option>
              <option value="GENERATE_CARD">Generate Card</option>
              <option value="BULK_GENERATE_CARDS">Batch Generate</option>
              <option value="CREATE_TEMPLATE">Create Template</option>
              <option value="UPDATE_TEMPLATE">Update Template</option>
              <option value="CREATE_SCHOOL">Create Organization</option>
              <option value="UPDATE_SCHOOL">Update Organization</option>
              <option value="DELETE_SCHOOL">Delete Organization</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="UPLOAD_PHOTO">Upload Photo</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">User</label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failed</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate?.split('T')[0] || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate?.split('T')[0] || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        {/* Reset Filters */}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => {
              setFilters({ action: '', userId: '', schoolId: '', status: '', startDate: '', endDate: '' });
              setDateRange('today');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:text-red-600 transition-colors flex items-center gap-1"
          >
            <i className="pi pi-refresh text-xs"></i> Reset Filters
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
            <i className="pi pi-clock text-5xl text-slate-300 mb-4 block"></i>
            <p className="text-slate-500 text-lg font-medium">No audit logs found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          logs.map((log) => {
            const entityLink = getEntityLink(log);

            return (
              <div key={log._id} className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden hover:shadow-md transition-shadow">
                {/* Main Row */}
                <div className="p-4 cursor-pointer" onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Left: Action & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getActionColor(log.action)}`}>
                          <i className={`pi ${getActionIcon(log.action)} text-xs`}></i>
                          {formatActionDisplay(log.action)}
                        </div>
                        {getStatusBadge(log.status)}
                        {log.importance === 'high' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                            <i className="pi pi-exclamation-triangle text-xs"></i> High
                          </span>
                        )}
                      </div>

                      {/* Human-readable summary */}
                      <p className="text-sm text-slate-700">
                        {log.details?.summary || `${formatActionDisplay(log.action)}`}
                      </p>

                      {/* Target entity with link */}
                      {log.targetId && (
                        <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                          <i className="pi pi-link text-slate-400"></i>
                          <span>{log.targetModel}: </span>
                          {entityLink ? (
                            <a href={entityLink} className="text-red-600 hover:underline truncate">
                              {log.targetId}
                            </a>
                          ) : (
                            <span className="truncate">{log.targetId}</span>
                          )}
                        </div>
                      )}

                      {/* Organization */}
                      {log.schoolInfo?.name && (
                        <div className="mt-0.5 text-xs text-slate-400 flex items-center gap-1">
                          <i className="pi pi-building text-slate-300"></i>
                          <span>{log.schoolInfo.name}</span>
                          {log.schoolInfo.code && (
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                              {log.schoolInfo.code}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: User & Time */}
                    <div className="flex items-center gap-3 sm:justify-end flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-700">
                          {log.userInfo?.name || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">{log.userInfo?.role}</p>
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs">
                          {log.userInfo?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <i className={`pi pi-chevron-${expandedLog === log._id ? 'up' : 'down'} text-slate-400 text-xs flex-shrink-0`}></i>
                    </div>
                  </div>

                  {/* Meta Row */}
                  <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                    <span className="flex items-center gap-1">
                      <i className="pi pi-clock"></i>
                      {formatDate(log.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <i className="pi pi-calendar"></i>
                      {formatTimeAgo(log.createdAt)}
                    </span>
                    {log.ipAddress && (
                      <span className="flex items-center gap-1">
                        <i className="pi pi-globe"></i>
                        {log.ipAddress}
                      </span>
                    )}
                    {log.responseTime && (
                      <span className="flex items-center gap-1">
                        <i className="pi pi-stopwatch"></i>
                        {log.responseTime}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details - User-Friendly */}
                {expandedLog === log._id && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
                    {/* Changes (Before/After) */}
                    {log.changes?.before && Object.keys(log.changes.before).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                          <i className="pi pi-pencil text-blue-500"></i> Changes Made
                        </h4>
                        <div className="bg-white rounded-lg p-3 space-y-2 text-xs border border-slate-200">
                          {Object.keys(log.changes.before).map(field => (
                            <div key={field} className="grid grid-cols-3 gap-2 items-center py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-600 font-medium capitalize">{field.replace(/_/g, ' ')}:</span>
                              <span className="text-red-600 line-through text-sm">{String(log.changes.before[field] || '—')}</span>
                              <span className="text-green-600 text-sm">→ {String(log.changes.after[field] || '—')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Details - Only show if useful */}
                    {log.details?.requestBody && Object.keys(log.details.requestBody).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                          <i className="pi pi-send text-slate-500"></i> Request Data
                        </h4>
                        <details className="bg-white rounded-lg border border-slate-200">
                          <summary className="px-3 py-2 text-xs text-slate-500 cursor-pointer hover:bg-slate-50">
                            View request details
                          </summary>
                          <pre className="p-3 bg-slate-100 rounded-b-lg text-[10px] overflow-x-auto">
                            {JSON.stringify(log.details.requestBody, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}

                    {/* Error Message */}
                    {log.errorMessage && (
                      <div>
                        <h4 className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                          <i className="pi pi-exclamation-triangle"></i> Error
                        </h4>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                          {log.errorMessage}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg border border-slate-200/50 px-4 py-3 flex-wrap gap-3">
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages} • {pagination.total} total records
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <i className="pi pi-chevron-left text-xs"></i>
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              Next
              <i className="pi pi-chevron-right text-xs"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    slate: 'from-slate-600 to-slate-700',
    green: 'from-emerald-500 to-green-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600'
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-slate-800">{value?.toLocaleString() || 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
        <div className={`w-8 h-8 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <i className={`${icon} text-white text-xs`}></i>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;