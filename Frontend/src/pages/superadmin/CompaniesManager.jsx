// pages/superadmin/CompaniesManager.jsx - CARD-AGENT
import React, { useState, useEffect } from 'react';
import { companyAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const CompaniesManager = () => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchCompanies(); }, []);

  useEffect(() => {
    let filtered = companies;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => c.name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term) || c.adminId?.firstName?.toLowerCase().includes(term) || c.adminId?.lastName?.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.license?.status === statusFilter);
    }
    setFilteredCompanies(filtered);
  }, [searchTerm, statusFilter, companies]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.getAllCompanies({ limit: 200 });
      if (res.success) {
        setCompanies(res.companies || []);
        setFilteredCompanies(res.companies || []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleViewDetails = async (company) => {
    try {
      const res = await companyAPI.getCompany(company._id);
      if (res.success) { setSelectedCompany(res.company); setShowDetails(true); }
    } catch (e) { console.error(e); }
  };

  const handleDeactivate = async (companyId) => {
    setActionLoading(true);
    try {
      await companyAPI.revokeLicense(companyId, 'Deactivated by super admin');
      showNotification('success', 'Company deactivated successfully');
      setShowDeactivate(null);
      fetchCompanies();
    } catch (e) { showNotification('error', 'Failed to deactivate'); }
    finally { setActionLoading(false); }
  };

  const handleReactivate = async (companyId) => {
    setActionLoading(true);
    try {
      await companyAPI.updateLicense(companyId, { status: 'active' });
      showNotification('success', 'Company reactivated');
      fetchCompanies();
    } catch (e) { showNotification('error', 'Failed to reactivate'); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">Companies</h2>
          <p className="text-slate-500 mt-1">Manage all registered companies</p>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`p-4 rounded-xl ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <i className={`pi ${notification.type === 'success' ? 'pi-check-circle' : 'pi-times-circle'} mr-2`}></i>{notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <QuickStat label="Total" value={companies.length} color="slate" />
        <QuickStat label="Active" value={companies.filter(c => c.license?.status === 'active').length} color="green" />
        <QuickStat label="Pending" value={companies.filter(c => c.license?.status === 'pending').length} color="amber" />
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="text-center py-16"><div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">License</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Orgs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">People</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-12 text-slate-400">No companies found</td></tr>
                ) : filteredCompanies.map(company => (
                  <tr key={company._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-sm">{company.name}</div>
                      <div className="text-xs text-slate-500">{company.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {company.adminId?.firstName} {company.adminId?.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-500">{company.license?.key || 'No key'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{company.stats?.organizations || 0}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{company.stats?.students || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${company.license?.status === 'active' ? 'bg-green-100 text-green-700' :
                          company.license?.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                        }`}>{company.license?.status || 'pending'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-1">
                        <button onClick={() => handleViewDetails(company)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="View">
                          <i className="pi pi-eye text-xs"></i></button>
                        {company.license?.status === 'active' ? (
                          <button onClick={() => setShowDeactivate(company)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Deactivate">
                            <i className="pi pi-ban text-xs"></i></button>
                        ) : company.license?.status === 'revoked' ? (
                          <button onClick={() => handleReactivate(company._id)} disabled={actionLoading} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Reactivate">
                            <i className="pi pi-check-circle text-xs"></i></button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && selectedCompany && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetails(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">{selectedCompany.name}</h3>
                <button onClick={() => setShowDetails(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="pi pi-times text-xs"></i></button>
              </div>
              <div className="p-5 space-y-3">
                <DetailRow label="Registration" value={selectedCompany.registrationNumber} />
                <DetailRow label="Email" value={selectedCompany.email} />
                <DetailRow label="Phone" value={selectedCompany.phone} />
                <DetailRow label="Website" value={selectedCompany.website || 'N/A'} />
                <DetailRow label="Address" value={`${selectedCompany.address?.district}, ${selectedCompany.address?.province}`} />
                <DetailRow label="Admin" value={`${selectedCompany.adminId?.firstName} ${selectedCompany.adminId?.lastName}`} />
                <div className="border-t pt-3 mt-3">
                  <DetailRow label="License Key" value={selectedCompany.license?.key || 'Not issued'} />
                  <DetailRow label="Status">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCompany.license?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedCompany.license?.status || 'pending'}
                    </span>
                  </DetailRow>
                  <DetailRow label="Max Organizations" value={selectedCompany.license?.maxOrganizations || 'Unlimited'} />
                  <DetailRow label="Max Cards/Month" value={selectedCompany.license?.maxCardsPerMonth || 'Unlimited'} />
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-slate-700 text-sm mb-2">Stats</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-bold text-slate-800">{selectedCompany.stats?.organizations || 0}</p><p className="text-xs text-slate-500">Organizations</p></div>
                    <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-bold text-slate-800">{selectedCompany.stats?.students || 0}</p><p className="text-xs text-slate-500">People</p></div>
                    <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-bold text-slate-800">{selectedCompany.stats?.coWorkers || 0}</p><p className="text-xs text-slate-500">Co-Workers</p></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivate Confirmation */}
      <AnimatePresence>
        {showDeactivate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="pi pi-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Deactivate Company?</h3>
                <p className="text-slate-500 text-sm mt-1">"{showDeactivate.name}" will be deactivated. Admins cannot log in. Data is preserved.</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeactivate(null)} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium">Cancel</button>
                <button onClick={() => handleDeactivate(showDeactivate._id)} disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">Deactivate</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuickStat = ({ label, value, color }) => (
  <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3 text-center">
    <p className={`text-xl font-bold ${color === 'green' ? 'text-green-600' : color === 'amber' ? 'text-amber-600' : 'text-slate-700'}`}>{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

const DetailRow = ({ label, value, children }) => (
  <div className="flex justify-between py-1.5 border-b border-slate-100">
    <span className="text-xs text-slate-500">{label}</span>
    {children || <span className="text-xs font-medium text-slate-800 text-right max-w-[60%]">{value || 'N/A'}</span>}
  </div>
);

export default CompaniesManager;