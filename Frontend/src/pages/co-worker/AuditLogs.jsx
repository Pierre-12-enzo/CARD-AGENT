// pages/co-worker/AuditLogs.jsx - CO-WORKER VIEW
import React, { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CoWorkerAuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'my_actions', 'team_actions'
  const [dateRange, setDateRange] = useState('week');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        days: dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : 30
      };

      // Add filter for team actions if needed
      if (filter === 'my_actions') {
        params.userId = user?.id;
      }

      const response = await auditAPI.getLogs(params);

      if (response.success) {
        setLogs(response.logs || []);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filter, dateRange]);

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return 'pi-plus-circle';
    if (action.includes('UPDATE')) return 'pi-pencil';
    if (action.includes('DELETE')) return 'pi-trash';
    if (action.includes('GENERATE')) return 'pi-id-card';
    if (action.includes('UPLOAD')) return 'pi-camera';
    return 'pi-info-circle';
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700';
    if (action.includes('GENERATE')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-700';
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return d.toLocaleDateString('en-RW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCurrentUser = (logUserId) => {
    return logUserId === user?.id;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
          Team Activity
        </h2>
        <p className="text-slate-500 mt-1">
          View your actions and team activity in organizations you have access to
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => { setFilter('all'); setPagination(prev => ({ ...prev, page: 1 })); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <i className="pi pi-users mr-1"></i> All Activity
            </button>
            <button
              onClick={() => { setFilter('my_actions'); setPagination(prev => ({ ...prev, page: 1 })); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'my_actions'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <i className="pi pi-user mr-1"></i> My Actions
            </button>
          </div>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
          <i className="pi pi-inbox text-5xl text-slate-300 mb-4 block"></i>
          <p className="text-slate-500 text-lg font-medium">No activity found</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'my_actions'
              ? "You haven't performed any actions recently"
              : "No team activity in your organizations"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isOwn = isCurrentUser(log.userId?._id);

            return (
              <div key={log._id} className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getActionColor(log.action)}`}>
                    <i className={`${getActionIcon(log.action)} text-sm`}></i>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-medium text-slate-800 text-sm">
                        {log.userInfo?.name || 'Unknown User'}
                      </span>
                      {isOwn && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px]">
                          <i className="pi pi-user text-[8px]"></i>
                          You
                        </span>
                      )}
                      {log.schoolInfo?.name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                          <i className="pi pi-building text-[8px]"></i>
                          {log.schoolInfo.name}
                        </span>
                      )}
                      {log.status === 'failure' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px]">
                          <i className="pi pi-times-circle text-[8px]"></i>
                          Failed
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700">
                      {log.details?.message || `${log.action} performed`}
                    </p>

                    {log.details?.changes && log.details.changes.length > 0 && (
                      <div className="mt-1 text-xs text-slate-500">
                        <i className="pi pi-pencil mr-1"></i>
                        {log.details.changes.join(' • ')}
                      </div>
                    )}

                    {log.errorMessage && (
                      <div className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                        <i className="pi pi-exclamation-triangle mr-1"></i>
                        {log.errorMessage}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <i className="pi pi-clock"></i>
                        {formatDate(log.createdAt)}
                      </span>
                      {log.userInfo?.role === 'co_worker' && (
                        <span className="flex items-center gap-1">
                          <i className="pi pi-briefcase"></i>
                          Team Member
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg border border-slate-200/50 px-4 py-3">
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <i className="pi pi-info-circle text-blue-500 text-sm mt-0.5"></i>
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">What you're seeing:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Your own actions across all organizations</li>
              <li>Actions by other team members in organizations you have access to</li>
              <li>You cannot see admin actions or activities from other organizations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoWorkerAuditLogs;