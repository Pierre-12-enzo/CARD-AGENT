// pages/auth/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(true);

  useEffect(() => {
    if (!token || !email) {
      setValidToken(false);
    }
  }, [token, email]);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) newErrors.newPassword = passwordError;
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token, email, formData.newPassword);
      if (response.success) {
        toast.success('Password reset successfully! Please login with your new password.');
        navigate('/login');
      } else {
        toast.error(response.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.error || 'Invalid or expired reset link');
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="pi pi-exclamation-triangle text-red-600 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Invalid Reset Link</h2>
          <p className="text-slate-600 mb-6">
            The password reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center mr-2">
            <i className="pi pi-id-card text-white text-sm"></i>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
            CARD-AGENT
          </h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Create New Password</h2>
          <p className="text-slate-500 text-sm mt-1">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${errors.newPassword ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
              />
              <i className="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Minimum 6 characters, at least one uppercase letter and one number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
              />
              <i className="pi pi-check-circle absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all disabled:opacity-50"
          >
            {loading ? (
              <><i className="pi pi-spinner pi-spin mr-2"></i>Resetting...</>
            ) : (
              <><i className="pi pi-key mr-2"></i>Reset Password</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-red-600 hover:text-red-700 transition-colors">
            <i className="pi pi-arrow-left mr-1"></i>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;