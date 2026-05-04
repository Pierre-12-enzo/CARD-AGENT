// pages/co-worker/AuditLogs.jsx - CARD-AGENT - Co-Worker View
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditAPI } from '../../services/api';

const CoWorkerAuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Co-worker can only see their own actions + same org peer actions (not admin)
      const response = await auditAPI.getLogs({
        page: pagination.page,
        limit: pagination.limit,
        userId: user?.id // Only their own logs
      });
      if (response.success) {
        setLogs(response.logs || []);
        if (response.pagination) setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [pagination.page]);

  const getActionIcon = (action) => {
    if (!action) return 'pi-info-circle';
    if (action.includes('CREATE')) return 'pi-plus-circle';
    if (action.includes('UPDATE')) return 'pi-pencil';
    if (action.includes('DELETE')) return 'pi-trash';
    if (action.includes('GENERATE')) return 'pi-qrcode';
    if (action.includes('UPLOAD')) return 'pi-upload';
    return 'pi-info-circle';
  };

  const getStatusColor = (status) => status === 'success' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
          My Activity Logs
        </h2>
        <p className="text-slate-500 mt-1">Your recent actions and activity history</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-16">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-16 text-slate-400">No activity recorded yet</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <i className={`${getActionIcon(log.action)} text-slate-400 text-xs`}></i>
                        <span className="text-xs text-slate-700">{log.action?.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {typeof log.details === 'object' 
                        ? (log.details?.studentName || log.details?.organizationName || JSON.stringify(log.details).slice(0, 60))
                        : String(log.details || '-').slice(0, 60)}
                    </td>
                    <td className="px-4 py-3">
                      <i className={`pi ${log.status === 'success' ? 'pi-check-circle' : 'pi-times-circle'} ${getStatusColor(log.status)} text-sm`}></i>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
            <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex space-x-1">
              <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-50">Prev</button>
              <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoWorkerAuditLogs;