// App.jsx - CARD-AGENT with public marketing site + NotFound route
import React, { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import SocketListener from './components/SocketListener';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './pages/auth/Login';
import MultiStepRegistration from './pages/auth/MultiStepRegistration';
import NotFound from './components/errors/NotFound';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Code-split the heavy marketing site (incl. Three.js) into its own chunk
const MarketingLayout = lazy(() => import('./components/marketing/MarketingLayout'));

// Branded fallback for the lazy marketing chunk
const MarketingFallback = () => (
  <div className="min-h-screen bg-marketing flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-white/10 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400 text-sm">Loading CARD-AGENT…</p>
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('🛡️ ProtectedRoute check:', { user, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ User authenticated, rendering children');
  return children;
};

// Root "/" renders the public marketing site for visitors, and the dashboard
// for anyone already logged in. Authenticated users still see the marketing
// site via a "Go to dashboard" button in the navbar.
const Home = () => {
  const { user } = useAuth();

  if (user) {
    switch (user.role) {
      case 'super_admin':
        return <Navigate to="/super-admin/dashboard" replace />;
      case 'co_worker':
        return <Navigate to="/co-worker/dashboard" replace />;
      case 'admin':
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // Not logged in → show the public marketing site
  return (
    <Suspense fallback={<MarketingFallback />}>
      <MarketingLayout />
    </Suspense>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketListener />
        <Toaster position="top-right" />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<MultiStepRegistration />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root: public marketing site (visitors) or dashboard (logged in) */}
          <Route path="/" element={<Home />} />

          {/* Admin routes */}
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Super Admin routes */}
          <Route path="/super-admin/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Co-Worker routes */}
          <Route path="/co-worker/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* 404 Not Found - Catch all unmatched routes */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;