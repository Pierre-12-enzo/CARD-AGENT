// pages/superadmin/LicensesManager.jsx - CARD-AGENT
import React, { useState, useEffect } from 'react';
import { companyAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const TIERS = [
  { value: 'unlimited', label: 'Unlimited', maxOrgs: 999, maxCards: 999999, color: 'purple' },
  { value: 'basic', label: 'Basic', maxOrgs: 5, maxCards: 5000, color: 'slate' },
  { value: 'pro', label: 'Pro', maxOrgs: 20, maxCards: 50000, color: 'red' },
  { value: 'enterprise', label: 'Enterprise', maxOrgs: 100, maxCards: 999999, color: 'amber' },
];

const LicensesManager = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [licenseForm, setLicenseForm] = useState({ tier: 'unlimited', maxOrganizations: 999, maxCardsPerMonth: 999999, expiresAt: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.getAllCompanies({ limit: 200 });
      if (res.success) setCompanies(res.companies || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTierChange = (tier) => {
    const t = TIERS.find(t => t.value === tier);
    setLicenseForm({
      tier: tier,
      maxOrganizations: t?.maxOrgs || 999,
      maxCardsPerMonth: t?.maxCards || 999999,
      expiresAt: ''
    });
  };

  const handleGenerate = async () => {
    if (!selectedCompany) return;
    setActionLoading(true);
    try {
      await companyAPI.activateLicense(selectedCompany, {
        maxOrganizations: licenseForm.maxOrganizations,
        maxCardsPerMonth: licenseForm.maxCardsPerMonth,
        expiresAt: licenseForm.expiresAt || null
      });
      showNotification('success', 'License generated and activated!');
      setShowGenerateModal(false);
      setSelectedCompany('');
      fetchCompanies();
    } catch (e) { showNotification('error', 'Failed to generate license'); }
    finally { setActionLoading(false); }
  };

  const handleUpdate = async () => {
    if (!showUpdateModal) return;
    setActionLoading(true);
    try {
      await companyAPI.updateLicense(showUpdateModal._id, {
        maxOrganizations: licenseForm.maxOrganizations,
        maxCardsPerMonth: licenseForm.maxCardsPerMonth
      });
      showNotification('success', 'License limits updated!');
      setShowUpdateModal(null);
      fetchCompanies();
    } catch (e) { showNotification('error', 'Failed to update'); }
    finally { setActionLoading(false); }
  };

  const handleRevoke = async () => {
    if (!showRevokeModal) return;
    setActionLoading(true);
    try {
      await companyAPI.revokeLicense(showRevokeModal._id, 'Revoked by super admin');
      showNotification('success', 'License revoked');
      setShowRevokeModal(null);
      fetchCompanies();
    } catch (e) { showNotification('error', 'Failed to revoke'); }
    finally { setActionLoading(false); }
  };

  const pendingCompanies = companies.filter(c => c.license?.status === 'pending' || !c.license?.key);
  const activeLicenses = companies.filter(c => c.license?.status === 'active');

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">License Manager</h2>
          <p className="text-slate-500 mt-1">Generate, manage, and revoke license keys</p>
        </div>
        <button onClick={() => { setSelectedCompany(''); setLicenseForm({ tier: 'unlimited', maxOrganizations: 999, maxCardsPerMonth: 999999, expiresAt: '' }); setShowGenerateModal(true); }}
          className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 shadow-lg flex items-center space-x-2">
          <i className="pi pi-key"></i><span>Generate License</span>
        </button>
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

      {/* Pending Companies */}
      <div className="bg-white rounded-2xl shadow-lg border border-amber-200/50 p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
          <i className="pi pi-clock text-amber-500 mr-2"></i>Pending License ({pendingCompanies.length})
        </h3>
        {pendingCompanies.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No pending companies</p>
        ) : (
          <div className="space-y-2">
            {pendingCompanies.map(c => (
              <div key={c._id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.adminId?.firstName} {c.adminId?.lastName} • {c.email}</p>
                </div>
                <button onClick={() => { setSelectedCompany(c._id); setShowGenerateModal(true); }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">Generate</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Licenses */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-3">Active Licenses ({activeLicenses.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">License Key</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Max Orgs</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Max Cards/Mo</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Issued</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeLicenses.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-400">No active licenses</td></tr>
              ) : activeLicenses.map(c => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-2">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{c.license?.key || 'N/A'}</code>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">{c.license?.maxOrganizations || '∞'}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{c.license?.maxCardsPerMonth?.toLocaleString() || '∞'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{c.license?.issuedAt ? new Date(c.license.issuedAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center space-x-1">
                      <button onClick={() => { setShowUpdateModal(c); setLicenseForm({ maxOrganizations: c.license?.maxOrganizations || 999, maxCardsPerMonth: c.license?.maxCardsPerMonth || 999999 }); }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Update Limits"><i className="pi pi-pencil text-xs"></i></button>
                      <button onClick={() => setShowRevokeModal(c)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Revoke"><i className="pi pi-ban text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate License Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Generate License</h3></div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                  <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                    <option value="">Select company...</option>
                    {pendingCompanies.map(c => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
                    {activeLicenses.map(c => <option key={c._id} value={c._id}>{c.name} (Re-issue)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">License Tier</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TIERS.map(tier => (
                      <button key={tier.value} type="button" onClick={() => handleTierChange(tier.value)}
                        className={`p-3 rounded-xl text-center border-2 transition-all text-xs ${licenseForm.tier === tier.value
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 text-slate-600 hover:border-red-300'
                          }`}>
                        <span className="font-semibold block">{tier.label}</span>
                        <span className="text-xs opacity-70">{tier.maxOrgs} orgs</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Max Organizations</label>
                    <input type="number" value={licenseForm.maxOrganizations} onChange={(e) => setLicenseForm(p => ({ ...p, maxOrganizations: parseInt(e.target.value) || 0, tier: 'custom' }))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Max Cards/Month</label>
                    <input type="number" value={licenseForm.maxCardsPerMonth} onChange={(e) => setLicenseForm(p => ({ ...p, maxCardsPerMonth: parseInt(e.target.value) || 0, tier: 'custom' }))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expiry (Optional)</label>
                  <input type="date" value={licenseForm.expiresAt} onChange={(e) => setLicenseForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
                <button onClick={() => setShowGenerateModal(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700">Cancel</button>
                <button onClick={handleGenerate} disabled={!selectedCompany || actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium disabled:opacity-50">
                  {actionLoading ? <i className="pi pi-spinner pi-spin mr-2"></i> : null}Generate & Activate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Limits Modal */}
      <AnimatePresence>
        {showUpdateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowUpdateModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-800">Update Limits - {showUpdateModal.name}</h3></div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Organizations</label>
                  <input type="number" value={licenseForm.maxOrganizations} onChange={(e) => setLicenseForm(p => ({ ...p, maxOrganizations: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Cards/Month</label>
                  <input type="number" value={licenseForm.maxCardsPerMonth} onChange={(e) => setLicenseForm(p => ({ ...p, maxCardsPerMonth: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
                <button onClick={() => setShowUpdateModal(null)} className="px-5 py-2.5 border border-slate-300 rounded-xl">Cancel</button>
                <button onClick={handleUpdate} disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium disabled:opacity-50">Update</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke Confirmation */}
      <AnimatePresence>
        {showRevokeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><i className="pi pi-exclamation-triangle text-red-600 text-xl"></i></div>
              <h3 className="text-lg font-bold text-slate-800">Revoke License?</h3>
              <p className="text-slate-500 text-sm mt-1">"{showRevokeModal.name}" will lose access immediately.</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowRevokeModal(null)} className="flex-1 py-2.5 border border-slate-300 rounded-xl">Cancel</button>
                <button onClick={handleRevoke} disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">Revoke</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LicensesManager;