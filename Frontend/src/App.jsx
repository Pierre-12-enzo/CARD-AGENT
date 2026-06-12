// App.jsx - CARD-AGENT with NotFound route
import React from 'react';
import { Toaster } from 'react-hot-toast';
import SocketListener from './components/SocketListener';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './pages/auth/Login';
import MultiStepRegistration from './pages/auth/MultiStepRegistration';
import NotFound from './components/errors/NotFound';  // ← ADD THIS IMPORT
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

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

// Role-based redirect from root "/"
const RoleBasedDashboard = () => {
  const { user } = useAuth();

  console.log('🎭 RoleBasedDashboard - User:', user?.role);

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'super_admin':
      return <Navigate to="/super-admin/dashboard" replace />;
    case 'co_worker':
      return <Navigate to="/co-worker/dashboard" replace />;
    case 'admin':
    default:
      return <Navigate to="/dashboard" replace />;
  }
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

          {/* Root redirect based on role */}
          <Route path="/" element={<RoleBasedDashboard />} />

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