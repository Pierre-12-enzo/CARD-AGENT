// components/Dashboard.jsx - ADD 404 CATCH-ALL ROUTE
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import NotFound from './errors/NotFound';  // ← ADD THIS IMPORT
import toast from 'react-hot-toast';


import HelpCenter from '../pages/HelpCenter';


// Admin Pages
import Overview from '../pages/dashboard/Overview';
import CardGeneration from '../pages/dashboard/CardGeneration';
import Organizations from '../pages/dashboard/Organizations';
import Students from '../pages/dashboard/Students';
import Templates from '../pages/dashboard/Templates';
import CoWorkers from '../pages/dashboard/CoWorkers';
import AuditLogs from '../pages/dashboard/AuditLogs';
import Settings from '../pages/dashboard/Settings';

// Super Admin Pages
import SuperAdminOverview from '../pages/superadmin/Overview';
import CompaniesManager from '../pages/superadmin/CompaniesManager';
import LicensesManager from '../pages/superadmin/LicensesManager';
import SuperAdminSettings from '../pages/superadmin/Settings';

// Co-worker Pages
import CoWorkerOverview from '../pages/co-worker/Overview';
import CoWorkerAuditLogs from '../pages/co-worker/AuditLogs';
import BulkImport from '../pages/co-worker/BulkImport';
import PhotoUpload from '../pages/co-worker/PhotoUpload';
import CoWorkerSettings from '../pages/co-worker/Settings';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && mobileSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setMobileSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, mobileSidebarOpen]);

  useEffect(() => {
    if (isMobile) setMobileSidebarOpen(false);
  }, [location.pathname, isMobile]);

  // Role-based redirect
  if (user?.role === 'super_admin' && !location.pathname.startsWith('/super-admin')) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }
  if (user?.role === 'co_worker' && !location.pathname.startsWith('/co-worker')) {
    return <Navigate to="/co-worker/dashboard" replace />;
  }
  if (user?.role === 'admin' && (location.pathname.startsWith('/super-admin') || location.pathname.startsWith('/co-worker'))) {
    return <Navigate to="/dashboard" replace />;
  }

  const getNavItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { icon: 'pi pi-chart-line', label: 'Overview', path: '/super-admin/dashboard' },
        { icon: 'pi pi-building', label: 'Companies', path: '/super-admin/companies' },
        { icon: 'pi pi-key', label: 'Licenses', path: '/super-admin/licenses' },
        { icon: 'pi pi-calendar', label: 'Audit Logs', path: '/super-admin/audit-logs' },
        { icon: 'pi pi-cog', label: 'Settings', path: '/super-admin/settings' },
        { icon: 'pi pi-question-circle', label: 'Help Center', path: '/super-admin/help' }

      ];
    }
    if (user?.role === 'co_worker') {
      const perms = user?.permissions || [];
      const items = [
        { icon: 'pi pi-chart-line', label: 'Overview', path: '/co-worker/dashboard', show: true },
        { icon: 'pi pi-cog', label: 'Settings', path: '/co-worker/settings', show: true },
        { icon: 'pi pi-question-circle', label: 'Help Center', path: '/co-worker/help' }

      ];

      const hasPerm = (perm) => perms.some(p => p[perm]);
      items.push({ icon: 'pi pi-users', label: 'Students', path: '/co-worker/students', show: hasPerm('canManageStudents') });
      items.push({ icon: 'pi pi-qrcode', label: 'Cards', path: '/co-worker/cards', show: hasPerm('canGenerateCards') });
      items.push({ icon: 'pi pi-calendar', label: 'Audit Logs', path: '/co-worker/audit-logs', show: hasPerm('canViewAuditLogs') });
      items.push({ icon: 'pi pi-images', label: 'Photos', path: '/co-worker/photos', show: hasPerm('canUploadPhotos') });
      items.push({ icon: 'pi pi-csv', label: 'CSV Upload', path: '/co-worker/bulk-import', show: hasPerm('canUploadCSV') });
      items.push({ icon: 'pi pi-image', label: 'Templates', path: '/co-worker/templates', show: hasPerm('canManageTemplates') });

      return items.filter(i => i.show);
    }
    // Admin
    return [
      { icon: 'pi pi-chart-line', label: 'Overview', path: '/dashboard' },
      { icon: 'pi pi-building', label: 'Organizations', path: '/dashboard/organizations' },
      { icon: 'pi pi-users', label: 'Students', path: '/dashboard/students' },
      { icon: 'pi pi-qrcode', label: 'Card Studio', path: '/dashboard/card-studio' },
      { icon: 'pi pi-image', label: 'Templates', path: '/dashboard/templates' },
      { icon: 'pi pi-user-plus', label: 'Co-Workers', path: '/dashboard/co-workers' },
      { icon: 'pi pi-calendar', label: 'Audit Logs', path: '/dashboard/audit-logs' },
      { icon: 'pi pi-cog', label: 'Settings', path: '/dashboard/settings' },
      { icon: 'pi pi-question-circle', label: 'Help Center', path: '/dashboard/help' }

    ];
  };

  const isActiveRoute = (path) => {
    if (path === '/dashboard' || path === '/super-admin/dashboard' || path === '/co-worker/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const navItems = getNavItems();

  const getPageTitle = () => {
    const item = navItems.find(i => isActiveRoute(i.path));
    return item?.label || 'Dashboard';
  };

  const getPageSubtitle = () => {
    const subtitles = {
      '/dashboard': 'System overview & analytics',
      '/dashboard/organizations': 'Manage client schools & organizations',
      '/dashboard/students': 'Manage students & employees',
      '/dashboard/card-studio': 'Design & generate ID cards',
      '/dashboard/templates': 'Create & manage card templates',
      '/dashboard/co-workers': 'Manage team members & permissions',
      '/dashboard/audit-logs': 'View system activity & changes',
      '/dashboard/settings': 'Account & company settings',
      '/super-admin/dashboard': 'Platform overview',
      '/super-admin/companies': 'Manage all companies',
      '/super-admin/licenses': 'Manage license keys',
      '/super-admin/audit-logs': 'View all system activity',
      '/super-admin/settings': 'Platform configuration',
      '/co-worker/dashboard': 'Your workspace',
      '/co-worker/students': 'Manage assigned students',
      '/co-worker/cards': 'Generate ID cards',
      '/co-worker/audit-logs': 'View your activity',
      '/co-worker/settings': 'Profile & password'
    };
    return subtitles[location.pathname] || 'Manage your operations';
  };

  const sidebarContent = (
    <>
      {/* Logo Section */}
      <div className="relative z-10 p-4 border-b border-slate-200/30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-xl shadow-slate-500/30 transform hover:rotate-12 transition-transform duration-500">
              <i className="pi pi-id-card text-white text-sm"></i>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          {(sidebarOpen || isMobile) && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
                CARD-AGENT
              </h1>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')} Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => isMobile && setMobileSidebarOpen(false)}
            className={`w-full flex items-center space-x-3 p-2.5 rounded-xl transition-all duration-200 relative ${isActiveRoute(item.path)
              ? 'bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-700 border border-red-200/50'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
              }`}
          >
            <i className={`${item.icon} text-base ${isActiveRoute(item.path) ? 'text-red-600' : 'text-slate-500'}`}></i>
            {(sidebarOpen || isMobile) && (
              <span className={`font-semibold text-sm ${isActiveRoute(item.path) ? 'text-red-700' : 'text-slate-600'}`}>
                {item.label}
              </span>
            )}
            {isActiveRoute(item.path) && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
            )}
          </Link>
        ))}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-200/30 flex-shrink-0 space-y-3">
        {(sidebarOpen || isMobile) ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-slate-50 to-red-50 rounded-xl border border-slate-200/50">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 capitalize truncate">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                toast.loading('Logging out...', { id: 'logout' });
                try {
                  await logout();
                  toast.success('Logged out successfully!', { id: 'logout' });
                } catch (error) {
                  toast.error('Logout failed', { id: 'logout' });
                }
              }}
              className="w-full flex items-center justify-center space-x-2 px-2 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <i className="pi pi-sign-out text-base"></i>
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xs">{user?.firstName?.charAt(0)}</span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              title="Logout"
            >
              <i className="pi pi-sign-out text-base"></i>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 flex">
      {/* Mobile Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-white/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/30 transition-all duration-300 ease-in-out flex flex-col fixed h-screen z-50`}>
          {sidebarContent}
        </div>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <div
          ref={sidebarRef}
          className={`fixed top-0 left-0 h-screen w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/30 transition-transform duration-300 ease-in-out flex flex-col z-50 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          {sidebarContent}
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isMobile ? 'ml-0' : (sidebarOpen ? 'ml-60' : 'ml-16')}`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/30 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isMobile && (
                <button onClick={() => setMobileSidebarOpen(true)} className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <i className="pi pi-bars text-slate-700 text-base"></i>
                </button>
              )}
              {!isMobile && (
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <i className={`pi ${sidebarOpen ? 'pi-bars' : 'pi-arrow-right'} text-slate-700 text-base`}></i>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent truncate">
                  {getPageTitle()}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 truncate">
                  {getPageSubtitle()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="hidden sm:block text-right">
                <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">Hi, {user?.firstName}!</p>
                <p className="text-xs sm:text-sm text-slate-500">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-800 to-red-600 rounded-xl flex items-center justify-center">
                <i className="pi pi-verified text-white text-xs sm:text-sm"></i>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - WITH 404 CATCH-ALL ROUTE */}
        <main className="flex-1 overflow-auto">
          {user?.role === 'admin' && (
            <Routes>
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/" element={<Overview />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/students" element={<Students />} />
              <Route path="/card-studio" element={<CardGeneration />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/co-workers" element={<CoWorkers />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
              {/* ✅ CATCH ALL - Any invalid admin route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}

          {user?.role === 'super_admin' && (
            <Routes>
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/dashboard" element={<SuperAdminOverview />} />
              <Route path="/companies" element={<CompaniesManager />} />
              <Route path="/licenses" element={<LicensesManager />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<SuperAdminSettings />} />
              {/* ✅ CATCH ALL - Any invalid super admin route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}

          {user?.role === 'co_worker' && (
            <Routes>
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/dashboard" element={<CoWorkerOverview />} />
              <Route path="/students" element={<Students />} />
              <Route path="/cards" element={<CardGeneration />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/audit-logs" element={<CoWorkerAuditLogs />} />
              <Route path="/bulk-import" element={<BulkImport />} />
              <Route path="/photos" element={<PhotoUpload />} />
              <Route path="/settings" element={<CoWorkerSettings />} />
              {/* ✅ CATCH ALL - Any invalid co-worker route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;