// pages/dashboard/Settings.jsx - CARD-AGENT NAVY & CRIMSON - FULL CINEMATIC
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, companyAPI, studentAPI } from '../../services/api';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Profile
  const [profileData, setProfileData] = useState({
    firstName: '', lastName: '', email: '', username: '', phoneNumber: '',
    currentPassword: '', newPassword: '', confirmPassword: '',
    notifications: { email: true, system: true, security: true }
  });

  // Company
  const [companyData, setCompanyData] = useState({
    name: '', phone: '', email: '', website: '',
    province: '', district: '', sector: '', country: 'Rwanda'
  });

  // System
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true, compressionQuality: 85, maxFileSize: 10, retentionPeriod: 30
  });

  // Cleanup stats
  const [cleanupStats, setCleanupStats] = useState({ students: 0, withPhotos: 0 });
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        firstName: user.firstName || '', lastName: user.lastName || '',
        email: user.email || '', username: user.username || '',
        phoneNumber: user.phoneNumber || ''
      }));
    }
    loadCompanyData();
    loadCleanupStats();
  }, [user]);

  const loadCompanyData = async () => {
    try {
      const res = await companyAPI.getMyCompany();
      if (res.success && res.company) {
        setCompanyData({
          name: res.company.name || '', phone: res.company.phone || '',
          email: res.company.email || '', website: res.company.website || '',
          province: res.company.address?.province || '',
          district: res.company.address?.district || '',
          sector: res.company.address?.sector || '',
          country: res.company.address?.country || 'Rwanda'
        });
      }
    } catch (e) { console.error('Failed to load company:', e); }
  };

  const loadCleanupStats = async () => {
    try {
      const res = await studentAPI.getStats();
      if (res.success) {
        setCleanupStats({ students: res.stats?.totalStudents || 0, withPhotos: res.stats?.studentsWithPhotos || 0 });
      }
    } catch (e) { console.error('Failed to load stats:', e); }
  };

  const showStatus = (key) => { setSaveStatus(key); setTimeout(() => setSaveStatus(''), 4000); };

  const handleProfileUpdate = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await authAPI.updateProfile(profileData);
      if (res.success && res.user) updateUser(res.user);
      showStatus('profile_success');
    } catch (e) { showStatus('profile_error'); } finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (profileData.newPassword !== profileData.confirmPassword) { showStatus('password_mismatch'); return; }
    if (profileData.newPassword.length < 6) { showStatus('password_weak'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: profileData.currentPassword, newPassword: profileData.newPassword, isFirstLogin: false });
      setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      showStatus('password_success');
    } catch (e) { showStatus('password_error'); } finally { setLoading(false); }
  };

  const handleCompanyUpdate = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(companyData).forEach(([k, v]) => fd.append(k, v));
      await companyAPI.updateProfile(fd);
      showStatus('company_success');
    } catch (e) { showStatus('company_error'); } finally { setLoading(false); }
  };

  const handleSystemSettingsSave = async () => {
    setLoading(true); setSaveStatus('saving_system');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('cardagent_system_settings', JSON.stringify(systemSettings));
      showStatus('system_success');
    } catch (e) { showStatus('system_error'); } finally { setLoading(false); }
  };

  const handleDeleteAllStudents = async () => {
    if (confirmAction !== 'delete-students') { setConfirmAction('delete-students'); setConfirmationText(''); return; }
    if (confirmationText.toLowerCase() !== 'delete all students') { setCleanupResult({ type: 'error', message: 'Please type "DELETE ALL STUDENTS" exactly' }); return; }
    setCleaning(true);
    try {
      const res = await studentAPI.deleteAll(cleanupStats.organizationId);
      if (res.success) { setCleanupResult({ type: 'success', message: `Deleted ${res.deletedCount} students` }); loadCleanupStats(); }
      else setCleanupResult({ type: 'error', message: res.error || 'Failed' });
    } catch (e) { setCleanupResult({ type: 'error', message: e.message }); }
    finally { setCleaning(false); setConfirmAction(null); setConfirmationText(''); }
  };

  const statusMessages = {
    saving: 'Saving changes...', profile_success: 'Profile updated successfully!', profile_error: 'Failed to update profile',
    password_success: 'Password changed successfully!', password_mismatch: 'Passwords do not match', password_weak: 'Password must be at least 6 characters', password_error: 'Current password is incorrect',
    company_success: 'Company updated successfully!', company_error: 'Failed to update company',
    saving_system: 'Saving system settings...', system_success: 'System settings saved!', system_error: 'Failed to save settings'
  };

  const statusMessage = statusMessages[saveStatus];
  const isSuccess = saveStatus.includes('success');
  const isError = saveStatus.includes('error') || saveStatus.includes('mismatch') || saveStatus.includes('weak');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Cinematic Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-6 sm:p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Control Panel</h1>
              <p className="text-slate-300 text-sm sm:text-base">Manage your profile, security, company, and system preferences</p>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-600 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30 transform rotate-6">
              <i className="pi pi-cog text-white text-2xl sm:text-3xl"></i>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-3 space-y-1">
            <SideTab icon="pi pi-user" label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            <SideTab icon="pi pi-shield" label="Security" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
            <SideTab icon="pi pi-building" label="Company" active={activeTab === 'company'} onClick={() => setActiveTab('company')} />
            <SideTab icon="pi pi-bell" label="Notifications" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
            <SideTab icon="pi pi-sliders-h" label="System" active={activeTab === 'system'} onClick={() => setActiveTab('system')} />
            <SideTab icon="pi pi-info-circle" label="About" active={activeTab === 'about'} onClick={() => setActiveTab('about')} />
            <SideTab icon="pi pi-trash" label="Cleanup" active={activeTab === 'cleanup'} onClick={() => setActiveTab('cleanup')} />
          </div>

          {/* Account Overview */}
          <div className="bg-gradient-to-br from-slate-50 to-red-50 rounded-2xl shadow-lg border border-slate-200/50 p-5 mt-4">
            <h4 className="font-semibold text-slate-800 mb-3">Account Overview</h4>
            <div className="space-y-2">
              <OverviewItem label="Role" value={user?.role?.replace('_', ' ')} />
              <OverviewItem label="Company" value={companyData.name || 'N/A'} />
              <OverviewItem label="Email" value={user?.email} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
            {/* Status Message */}
            {statusMessage && (
              <div className={`mb-5 p-4 rounded-xl border flex items-center space-x-3 ${
                isSuccess ? 'bg-green-50 border-green-200' : isError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <i className={`pi ${isSuccess ? 'pi-check-circle text-green-600' : isError ? 'pi-times-circle text-red-600' : 'pi-spinner pi-spin text-blue-600'}`}></i>
                <span className={`text-sm font-medium ${isSuccess ? 'text-green-700' : isError ? 'text-red-700' : 'text-blue-700'}`}>{statusMessage}</span>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Profile Information</h3>
                  <i className="pi pi-user-edit text-red-500 text-xl"></i>
                </div>
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="First Name" value={profileData.firstName} onChange={(v) => setProfileData(p => ({ ...p, firstName: v }))} required />
                    <FormInput label="Last Name" value={profileData.lastName} onChange={(v) => setProfileData(p => ({ ...p, lastName: v }))} required />
                    <FormInput label="Email" type="email" value={profileData.email} onChange={(v) => setProfileData(p => ({ ...p, email: v }))} disabled />
                    <FormInput label="Username" value={profileData.username} onChange={(v) => setProfileData(p => ({ ...p, username: v }))} disabled />
                    <FormInput label="Phone" type="tel" value={profileData.phoneNumber} onChange={(v) => setProfileData(p => ({ ...p, phoneNumber: v }))} />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 shadow-lg transition-all flex items-center space-x-2">
                      {loading && <i className="pi pi-spinner pi-spin"></i>}
                      <span>Update Profile</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Change Password</h3>
                  <i className="pi pi-shield text-red-500 text-xl"></i>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <i className="pi pi-info-circle text-amber-600 mt-0.5"></i>
                    <div>
                      <p className="font-semibold text-amber-800">Password Requirements</p>
                      <p className="text-sm text-amber-700 mt-1">Use at least 6 characters with a mix of letters, numbers, and symbols</p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <FormInput label="Current Password" type="password" value={profileData.currentPassword} onChange={(v) => setProfileData(p => ({ ...p, currentPassword: v }))} required />
                  <FormInput label="New Password" type="password" value={profileData.newPassword} onChange={(v) => setProfileData(p => ({ ...p, newPassword: v }))} required />
                  <FormInput label="Confirm New Password" type="password" value={profileData.confirmPassword} onChange={(v) => setProfileData(p => ({ ...p, confirmPassword: v }))} required />
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 shadow-lg transition-all flex items-center space-x-2">
                      {loading && <i className="pi pi-spinner pi-spin"></i>}
                      <span>Change Password</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* COMPANY TAB */}
            {activeTab === 'company' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Company Information</h3>
                  <i className="pi pi-building text-red-500 text-xl"></i>
                </div>
                <form onSubmit={handleCompanyUpdate} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Company Name" value={companyData.name} onChange={(v) => setCompanyData(p => ({ ...p, name: v }))} />
                    <FormInput label="Phone" type="tel" value={companyData.phone} onChange={(v) => setCompanyData(p => ({ ...p, phone: v }))} />
                    <FormInput label="Email" type="email" value={companyData.email} onChange={(v) => setCompanyData(p => ({ ...p, email: v }))} />
                    <FormInput label="Website" value={companyData.website} onChange={(v) => setCompanyData(p => ({ ...p, website: v }))} />
                  </div>
                  <h4 className="font-semibold text-slate-700 mt-2">Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Province" value={companyData.province} onChange={(v) => setCompanyData(p => ({ ...p, province: v }))} />
                    <FormInput label="District" value={companyData.district} onChange={(v) => setCompanyData(p => ({ ...p, district: v }))} />
                    <FormInput label="Sector" value={companyData.sector} onChange={(v) => setCompanyData(p => ({ ...p, sector: v }))} />
                    <FormInput label="Country" value={companyData.country} onChange={(v) => setCompanyData(p => ({ ...p, country: v }))} />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 shadow-lg transition-all flex items-center space-x-2">
                      {loading && <i className="pi pi-spinner pi-spin"></i>}
                      <span>Update Company</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Notification Preferences</h3>
                  <i className="pi pi-bell text-red-500 text-xl"></i>
                </div>
                <div className="space-y-4">
                  <ToggleRow label="Email Notifications" description="Receive important updates via email"
                    enabled={profileData.notifications.email}
                    onChange={(enabled) => setProfileData(p => ({ ...p, notifications: { ...p.notifications, email: enabled } }))} />
                  <ToggleRow label="System Alerts" description="Get notified about system maintenance and updates"
                    enabled={profileData.notifications.system}
                    onChange={(enabled) => setProfileData(p => ({ ...p, notifications: { ...p.notifications, system: enabled } }))} />
                  <ToggleRow label="Security Alerts" description="Immediate notifications for security-related events"
                    enabled={profileData.notifications.security}
                    onChange={(enabled) => setProfileData(p => ({ ...p, notifications: { ...p.notifications, security: enabled } }))} />
                </div>
              </div>
            )}

            {/* SYSTEM TAB */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">System Configuration</h3>
                  <i className="pi pi-sliders-h text-red-500 text-xl"></i>
                </div>
                <div className="space-y-5">
                  <ToggleRow label="Auto Backup" description="Automatically backup data daily"
                    enabled={systemSettings.autoBackup}
                    onChange={(enabled) => setSystemSettings(p => ({ ...p, autoBackup: enabled }))} />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Compression Quality: {systemSettings.compressionQuality}%</label>
                    <input type="range" min="50" max="100" value={systemSettings.compressionQuality}
                      onChange={(e) => setSystemSettings(p => ({ ...p, compressionQuality: parseInt(e.target.value) }))}
                      className="w-full accent-red-600" />
                  </div>
                  <FormInput label="Max File Size (MB)" type="number" value={systemSettings.maxFileSize}
                    onChange={(v) => setSystemSettings(p => ({ ...p, maxFileSize: parseInt(v) || 10 }))} />
                  <FormInput label="Data Retention (Days)" type="number" value={systemSettings.retentionPeriod}
                    onChange={(v) => setSystemSettings(p => ({ ...p, retentionPeriod: parseInt(v) || 30 }))} />
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button onClick={handleSystemSettingsSave} disabled={loading}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 shadow-lg transition-all flex items-center space-x-2">
                      {loading && <i className="pi pi-spinner pi-spin"></i>}
                      <span>Save Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">About CARD-AGENT</h3>
                  <i className="pi pi-info-circle text-red-500 text-xl"></i>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">System Information</h4>
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Version" value="2.0.0" />
                      <InfoRow label="License" value="Per Company" />
                      <InfoRow label="Framework" value="MERN Stack" />
                      <InfoRow label="Storage" value="Cloudinary" />
                      <InfoRow label="Support" value="support@cardagent.rw" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-slate-50 rounded-2xl p-5 border border-red-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Quick Support</h4>
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 bg-white rounded-xl border border-slate-200 hover:border-red-300 transition-colors">
                        <span className="font-medium text-slate-700">Documentation</span>
                        <p className="text-sm text-slate-500 mt-1">User guides and tutorials</p>
                      </button>
                      <button className="w-full text-left p-3 bg-white rounded-xl border border-slate-200 hover:border-red-300 transition-colors">
                        <span className="font-medium text-slate-700">Contact Support</span>
                        <p className="text-sm text-slate-500 mt-1">Get help from our team</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CLEANUP TAB */}
            {activeTab === 'cleanup' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">System Cleanup</h3>
                  <i className="pi pi-trash text-red-500 text-xl"></i>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-slate-500">Total Records</p><p className="text-2xl font-bold text-slate-800">{cleanupStats.students}</p></div>
                      <i className="pi pi-users text-slate-400 text-xl"></i>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-50/50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm text-red-600">With Photos</p><p className="text-2xl font-bold text-red-700">{cleanupStats.withPhotos}</p></div>
                      <i className="pi pi-image text-red-400 text-xl"></i>
                    </div>
                  </div>
                </div>
                {cleanupResult && (
                  <div className={`p-4 rounded-xl border ${cleanupResult.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex items-start space-x-3">
                      <i className={`pi ${cleanupResult.type === 'success' ? 'pi-check-circle' : 'pi-times-circle'} mt-0.5`}></i>
                      <p className="text-sm font-medium">{cleanupResult.message}</p>
                    </div>
                  </div>
                )}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <i className="pi pi-exclamation-triangle text-red-600 mt-0.5"></i>
                    <div>
                      <p className="font-semibold text-red-800">⚠️ Dangerous Action</p>
                      <p className="text-sm text-red-700 mt-1">This will permanently delete all student records and their photos from Cloudinary. This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
                <button onClick={handleDeleteAllStudents} disabled={cleaning || cleanupStats.students === 0}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center space-x-2">
                  {cleaning ? <><i className="pi pi-spinner pi-spin"></i><span>Processing...</span></> : <><i className="pi pi-trash"></i><span>Delete All Records ({cleanupStats.students})</span></>}
                </button>
                {confirmAction === 'delete-students' && (
                  <div className="bg-white border-2 border-red-300 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-slate-700">Type "DELETE ALL STUDENTS" to confirm:</p>
                    <input type="text" value={confirmationText} onChange={(e) => setConfirmationText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="DELETE ALL STUDENTS" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => { setConfirmAction(null); setConfirmationText(''); }}
                        className="flex-1 py-2 border border-slate-300 rounded-lg text-sm">Cancel</button>
                      <button onClick={handleDeleteAllStudents}
                        disabled={confirmationText.toLowerCase() !== 'delete all students'}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">Confirm Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== SUB-COMPONENTS =====

const SideTab = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-sm ${
    active ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
  }`}>
    <i className={`${icon} text-base ${active ? 'text-red-600' : 'text-slate-500'}`}></i>
    <span className="font-medium">{label}</span>
  </button>
);

const OverviewItem = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5">
    <span className="text-sm text-slate-500 capitalize">{label}</span>
    <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{value || 'N/A'}</span>
  </div>
);

const FormInput = ({ label, type = 'text', value, onChange, required, disabled }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} />
  </div>
);

const ToggleRow = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
    <div className="flex-1">
      <p className="font-medium text-slate-800 text-sm">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <button type="button" onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-red-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-5' : 'left-0.5'}`}></span>
    </button>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-slate-600">{label}</span>
    <span className="font-medium text-slate-800">{value}</span>
  </div>
);

export default Settings;
