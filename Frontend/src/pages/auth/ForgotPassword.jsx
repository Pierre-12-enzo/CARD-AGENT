// pages/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.forgotPassword(email);
      if (response.success) {
        setSubmitted(true);
        toast.success('Password reset email sent! Check your inbox.');
      } else {
        setError(response.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="pi pi-envelope text-green-600 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h2>
          <p className="text-slate-600 mb-4">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Click the link in the email to reset your password. The link expires in 1 hour.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Back to Login
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
          <h2 className="text-2xl font-bold text-slate-800">Forgot Password?</h2>
          <p className="text-slate-500 text-sm mt-1">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 pl-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                autoComplete="email"
              />
              <i className="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all disabled:opacity-50"
          >
            {loading ? (
              <><i className="pi pi-spinner pi-spin mr-2"></i>Sending...</>
            ) : (
              <><i className="pi pi-send mr-2"></i>Send Reset Link</>
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

export default ForgotPassword;

