// pages/superadmin/Settings.jsx - CARD-AGENT SUPER ADMIN SETTINGS
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const SuperAdminSettings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: '', lastName: '', email: '', username: '', phoneNumber: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({ email: true, system: true, security: true });

  const [systemSettings, setSystemSettings] = useState({
    defaultMaxOrgs: 999, defaultMaxCards: 999999, auditRetentionDays: 60, maintenanceMode: false
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '', lastName: user.lastName || '',
        email: user.email || '', username: user.username || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
    const saved = localStorage.getItem('cardagent_platform_settings');
    if (saved) setSystemSettings(JSON.parse(saved));
  }, [user]);

  const showStatus = (key) => { setSaveStatus(key); setTimeout(() => setSaveStatus(''), 4000); };

  const handleProfileUpdate = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await authAPI.updateProfile(profileData);
      if (res.success && res.user) { updateUser(res.user); showStatus('profile_success'); }
      else showStatus('profile_error');
    } catch (e) { showStatus('profile_error'); } finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) { showStatus('password_mismatch'); return; }
    if (passwordData.newPassword.length < 6) { showStatus('password_weak'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword, isFirstLogin: false });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showStatus('password_success');
    } catch (e) { showStatus('password_error'); } finally { setLoading(false); }
  };

  const handleSystemSave = () => {
    setLoading(true);
    try {
      localStorage.setItem('cardagent_platform_settings', JSON.stringify(systemSettings));
      showStatus('system_success');
    } catch (e) { showStatus('system_error'); } finally { setLoading(false); }
  };

  const statusMsg = {
    saving: { text: 'Saving...', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'pi-spinner pi-spin' },
    profile_success: { text: 'Profile updated!', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'pi-check-circle' },
    profile_error: { text: 'Failed to update', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
    password_success: { text: 'Password changed!', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'pi-check-circle' },
    password_mismatch: { text: 'Passwords do not match', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
    password_weak: { text: 'Min 6 characters', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
    password_error: { text: 'Current password incorrect', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
    system_success: { text: 'Platform settings saved!', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'pi-check-circle' },
    system_error: { text: 'Failed to save', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
  };

  const msg = statusMsg[saveStatus];

  const tabs = [
    { id: 'profile', icon: 'pi pi-user', label: 'Profile' },
    { id: 'security', icon: 'pi pi-shield', label: 'Security' },
    { id: 'notifications', icon: 'pi pi-bell', label: 'Notifications' },
    { id: 'system', icon: 'pi pi-sliders-h', label: 'Platform' },
    { id: 'about', icon: 'pi pi-info-circle', label: 'About' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold">Platform Settings</h1>
                <span className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs text-purple-200">SUPER ADMIN</span>
              </div>
              <p className="text-slate-300 text-sm">Manage your profile, security, and platform configuration</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6">
              <i className="pi pi-cog text-white text-2xl"></i>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-2 space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-sm font-medium ${activeTab === tab.id ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                <i className={`${tab.icon} text-base ${activeTab === tab.id ? 'text-purple-600' : 'text-slate-500'}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl shadow-lg border border-slate-200/50 p-5 mt-4">
            <h4 className="font-semibold text-slate-800 mb-3">Account Info</h4>
            <div className="space-y-2">
              <InfoRow label="Role" value="Super Admin" />
              <InfoRow label="Access" value="Full Platform" />
              <InfoRow label="Email" value={user?.email} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
            {msg && (
              <div className={`mb-5 p-4 rounded-xl border flex items-center space-x-3 ${msg.bg} ${msg.border}`}>
                <i className={`pi ${msg.icon} ${msg.color} text-lg`}></i>
                <span className={`font-medium text-sm ${msg.color}`}>{msg.text}</span>
              </div>
            )}

            {/* PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Profile Information</h3>
                  <i className="pi pi-user-edit text-purple-500 text-xl"></i>
                </div>
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="First Name" value={profileData.firstName} onChange={(v) => setProfileData(p => ({ ...p, firstName: v }))} required />
                    <FormInput label="Last Name" value={profileData.lastName} onChange={(v) => setProfileData(p => ({ ...p, lastName: v }))} required />
                    <FormInput label="Email" type="email" value={profileData.email} disabled />
                    <FormInput label="Username" value={profileData.username} disabled />
                    <FormInput label="Phone" type="tel" value={profileData.phoneNumber} onChange={(v) => setProfileData(p => ({ ...p, phoneNumber: v }))} />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 shadow-lg flex items-center space-x-2">
                      {loading && <i className="pi pi-spinner pi-spin"></i>}<span>Update Profile</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Change Password</h3>
                  <i className="pi pi-shield text-purple-500 text-xl"></i>
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
                  <FormInput label="Current Password" type="password" value={passwordData.currentPassword} onChange={(v) => setPasswordData(p => ({ ...p, currentPassword: v }))} required />
                  <FormInput label="New Password" type="password" value={passwordData.newPassword} onChange={(v) => setPasswordData(p => ({ ...p, newPassword: v }))} required />
                  <FormInput label="Confirm Password" type="password" value={passwordData.confirmPassword} onChange={(v) => setPasswordData(p => ({ ...p, confirmPassword: v }))} required />
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 shadow-lg flex items-center space-x-2">
                      {loading && <i className="pi pi-spinner pi-spin"></i>}<span>Change Password</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Notification Preferences</h3>
                  <i className="pi pi-bell text-purple-500 text-xl"></i>
                </div>
                <div className="space-y-4">
                  <ToggleRow label="Email Alerts" description="Get notified about new company registrations and critical events"
                    enabled={notifications.email} onChange={(v) => setNotifications(p => ({ ...p, email: v }))} />
                  <ToggleRow label="System Alerts" description="Platform maintenance and update notifications"
                    enabled={notifications.system} onChange={(v) => setNotifications(p => ({ ...p, system: v }))} />
                  <ToggleRow label="Security Alerts" description="Immediate alerts for anomalies and security threats"
                    enabled={notifications.security} onChange={(v) => setNotifications(p => ({ ...p, security: v }))} />
                </div>
              </div>
            )}

            {/* PLATFORM SETTINGS */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Platform Configuration</h3>
                  <i className="pi pi-sliders-h text-purple-500 text-xl"></i>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Default Max Organizations" type="number" value={systemSettings.defaultMaxOrgs}
                      onChange={(v) => setSystemSettings(p => ({ ...p, defaultMaxOrgs: parseInt(v) || 0 }))} />
                    <FormInput label="Default Max Cards/Month" type="number" value={systemSettings.defaultMaxCards}
                      onChange={(v) => setSystemSettings(p => ({ ...p, defaultMaxCards: parseInt(v) || 0 }))} />
                    <FormInput label="Audit Log Retention (Days)" type="number" value={systemSettings.auditRetentionDays}
                      onChange={(v) => setSystemSettings(p => ({ ...p, auditRetentionDays: parseInt(v) || 60 }))} />
                  </div>
                  <ToggleRow label="Maintenance Mode" description="Take platform offline for all users except super admins"
                    enabled={systemSettings.maintenanceMode} onChange={(v) => setSystemSettings(p => ({ ...p, maintenanceMode: v }))} />
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button onClick={handleSystemSave} disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 shadow-lg flex items-center space-x-2">
                      {loading && <i className="pi pi-spinner pi-spin"></i>}<span>Save Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">About CARD-AGENT</h3>
                  <i className="pi pi-info-circle text-purple-500 text-xl"></i>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">System Information</h4>
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Version" value="2.0.0" />
                      <InfoRow label="Edition" value="Super Admin" />
                      <InfoRow label="Framework" value="MERN Stack" />
                      <InfoRow label="Storage" value="Cloudinary" />
                      <InfoRow label="Database" value="MongoDB Atlas" />
                      <InfoRow label="Real-time" value="Socket.io" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-red-50 rounded-2xl p-5 border border-purple-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Platform Management</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      As a super admin, you have full control over the platform including company management, license issuance, and system configuration.
                    </p>
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Companies" value="Full Management" />
                      <InfoRow label="Licenses" value="Generate & Revoke" />
                      <InfoRow label="Audit Logs" value="Platform-wide" />
                      <InfoRow label="Support" value="admin@cardagent.rw" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-1.5">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-700">{value}</span>
  </div>
);

const FormInput = ({ label, type = 'text', value, onChange, required, disabled }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${disabled ? 'opacity-60' : ''}`} />
  </div>
);

const ToggleRow = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
    <div>
      <p className="font-medium text-slate-800 text-sm">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <button type="button" onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-5' : 'left-0.5'}`}></span>
    </button>
  </div>
);

export default SuperAdminSettings;