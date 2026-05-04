// pages/co-worker/Settings.jsx - CARD-AGENT CO-WORKER SETTINGS
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

const CoWorkerSettings = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: '', lastName: '', email: '', username: '', phoneNumber: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({ email: true, system: true, security: true });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const forceFromUrl = params.get('forcePasswordChange') === 'true';
    const needsFromUser = user?.needsPasswordChange === true;
    if (forceFromUrl || needsFromUser) {
      setIsFirstLogin(true);
      setSaveStatus('force_change_required');
    }
  }, [location, user]);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '', lastName: user.lastName || '',
        email: user.email || '', username: user.username || '',
        phoneNumber: user.phoneNumber || '',
      });
      if (user.notifications) setNotifications(user.notifications);
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault(); setLoading(true); setSaveStatus('saving');
    try {
      const res = await authAPI.updateProfile({ ...profileData, notifications });
      if (res.success && res.user) { updateUser(res.user); setSaveStatus('success'); setTimeout(() => setSaveStatus(''), 3000); }
      else setSaveStatus('error');
    } catch (e) { setSaveStatus('error'); } finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) { setSaveStatus('password_mismatch'); return; }
    if (passwordData.newPassword.length < 6) { setSaveStatus('password_weak'); return; }
    if (!isFirstLogin && !passwordData.currentPassword) { setSaveStatus('password_no_current'); return; }
    setLoading(true); setSaveStatus('saving');
    try {
      const payload = isFirstLogin
        ? { newPassword: passwordData.newPassword, isFirstLogin: true }
        : { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword };
      const res = await authAPI.changePassword(payload);
      if (res.success) {
        setSaveStatus('password_success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        if (isFirstLogin) { setIsFirstLogin(false); updateUser({ needsPasswordChange: false }); setTimeout(() => navigate('/co-worker/dashboard'), 2000); }
      } else setSaveStatus('password_error');
    } catch (e) { setSaveStatus('password_error'); } finally { setLoading(false); }
  };

  const getStatusMessage = () => {
    const msgs = {
      saving: { text: 'Saving...', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'pi-spinner pi-spin' },
      success: { text: 'Profile updated!', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'pi-check-circle' },
      error: { text: 'Failed to update', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_mismatch: { text: 'Passwords do not match', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_weak: { text: 'Min 6 characters', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_no_current: { text: 'Enter current password', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_success: { text: isFirstLogin ? 'Password set! Redirecting...' : 'Password changed!', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'pi-check-circle' },
      password_error: { text: 'Check current password', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      force_change_required: { text: '⚠️ FIRST LOGIN: Set a new password to continue.', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: 'pi-exclamation-triangle' }
    };
    return msgs[saveStatus] || null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-6 lg:p-8 text-white">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold mb-2">Settings</h1>
                <p className="text-slate-300 text-sm lg:text-lg">
                  {isFirstLogin ? 'Set your password to continue' : 'Manage your profile & security'}
                </p>
              </div>
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-red-600 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30 transform rotate-6">
                <i className="pi pi-user text-white text-2xl lg:text-3xl"></i>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-gradient-to-bl from-red-500/20 to-transparent rounded-full blur-3xl"></div>
        </div>

        {/* First Login Warning */}
        {isFirstLogin && (
          <div className="bg-amber-50 border-2 border-amber-500 rounded-2xl p-5">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="pi pi-exclamation-triangle text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-bold text-amber-800">⚠️ Set Your Password</h3>
                <p className="text-amber-700 text-sm mt-1">First time login. Set a new password for security.</p>
              </div>
            </div>
          </div>
        )}

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4 space-y-1">
              <SideTab icon="pi-user" label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
              <SideTab icon="pi-shield" label="Security" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
              {!isFirstLogin && (
                <SideTab icon="pi-bell" label="Notifications" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
              )}
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-red-50 rounded-2xl shadow-lg border border-slate-200/50 p-5 mt-4">
              <h4 className="font-semibold text-slate-800 mb-3">Account Info</h4>
              <div className="space-y-2">
                <InfoItem label="Username" value={`@${user?.username}`} />
                <InfoItem label="Role" value="Co-Worker" />
                <InfoItem label="Status" value={isFirstLogin ? 'First Login' : 'Active'} />
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
              {statusMessage && (
                <div className={`mb-5 p-4 rounded-xl border flex items-center space-x-3 ${statusMessage.bg} ${statusMessage.border}`}>
                  <i className={`pi ${statusMessage.icon} ${statusMessage.color} text-xl`}></i>
                  <span className={`font-medium ${statusMessage.color}`}>{statusMessage.text}</span>
                </div>
              )}

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
                      <FormInput label="Email" type="email" value={profileData.email} disabled />
                      <FormInput label="Username" value={profileData.username} disabled />
                      <FormInput label="Phone" type="tel" value={profileData.phoneNumber} onChange={(v) => setProfileData(p => ({ ...p, phoneNumber: v }))} />
                    </div>
                    {!isFirstLogin && (
                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 shadow-lg flex items-center space-x-2">
                          {loading && <i className="pi pi-spinner pi-spin"></i>}<span>Update Profile</span>
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{isFirstLogin ? 'Set Password' : 'Change Password'}</h3>
                    <i className="pi pi-shield text-red-500 text-xl"></i>
                  </div>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {!isFirstLogin && (
                      <FormInput label="Current Password" type="password" value={passwordData.currentPassword} onChange={(v) => setPasswordData(p => ({ ...p, currentPassword: v }))} required />
                    )}
                    <FormInput label="New Password" type="password" value={passwordData.newPassword} onChange={(v) => setPasswordData(p => ({ ...p, newPassword: v }))} required hint="Min 6 characters" />
                    <FormInput label="Confirm Password" type="password" value={passwordData.confirmPassword} onChange={(v) => setPasswordData(p => ({ ...p, confirmPassword: v }))} required />
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-600 disabled:opacity-50 shadow-lg flex items-center space-x-2">
                        {loading && <i className="pi pi-spinner pi-spin"></i>}<span>{isFirstLogin ? 'Set Password & Continue' : 'Change Password'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'notifications' && !isFirstLogin && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800">Notifications</h3>
                    <i className="pi pi-bell text-red-500 text-xl"></i>
                  </div>
                  <div className="space-y-4">
                    <ToggleRow label="Email" description="Receive updates via email" enabled={notifications.email} onChange={(v) => setNotifications(p => ({ ...p, email: v }))} />
                    <ToggleRow label="System" description="System alerts" enabled={notifications.system} onChange={(v) => setNotifications(p => ({ ...p, system: v }))} />
                    <ToggleRow label="Security" description="Security alerts" enabled={notifications.security} onChange={(v) => setNotifications(p => ({ ...p, security: v }))} />
                  </div>
                </div>
              )}
            </div>

            {!isFirstLogin && (
              <div className="bg-white rounded-2xl shadow-lg border border-red-200/30 p-6 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Logout</h3>
                    <p className="text-sm text-slate-500">Sign out of your account</p>
                  </div>
                  <button onClick={logout} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center space-x-2">
                    <i className="pi pi-sign-out"></i><span>Logout</span>
                  </button>
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
const SideTab = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-sm ${
    active ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-600 hover:bg-slate-50'
  }`}>
    <i className={`${icon} text-base ${active ? 'text-red-600' : 'text-slate-500'}`}></i><span className="font-medium">{label}</span>
  </button>
);

const InfoItem = ({ label, value }) => (
  <div className="flex justify-between py-1.5"><span className="text-sm text-slate-500">{label}</span><span className="text-sm font-medium text-slate-700">{value}</span></div>
);

const FormInput = ({ label, type = 'text', value, onChange, required, disabled, hint }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 ${disabled ? 'opacity-60' : ''}`} />
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const ToggleRow = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
    <div><p className="font-medium text-slate-800 text-sm">{label}</p><p className="text-xs text-slate-500">{description}</p></div>
    <button type="button" onClick={() => onChange(!enabled)} className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-red-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-5' : 'left-0.5'}`}></span>
    </button>
  </div>
);

export default CoWorkerSettings;