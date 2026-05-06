// components/auth/Login.jsx - NAVY & CRIMSON THEME with PrimeIcons
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formErrors, setFormErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'email':
        if (!value.trim()) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email address';
        break;
      case 'password':
        if (!value.trim()) error = 'Password is required';
        else if (value.length < 6) error = 'Password must be at least 6 characters';
        break;
      default: break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (touched[name]) setFormErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setFormErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) { errors[key] = err; isValid = false; }
    });
    setFormErrors(errors);
    if (!isValid) setTouched({ email: true, password: true });
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    if (!validateForm()) return;
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        const redirectPath = result.redirectTo || '/dashboard';
        if (result.needsPasswordChange) {
          navigate('/co-worker/settings');
        } else {
          navigate(redirectPath);
        }
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => formData.email && formData.password && !formErrors.email && !formErrors.password;

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');

    if (reason === 'license_revoked') {
      setError('Your license has been revoked. Please contact support for more information.');
    }
  }, []);

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center mr-3 shadow-lg transform hover:rotate-12 transition-transform duration-300">
                <i className="pi pi-id-card text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
                  CARD-AGENT
                </h1>
                <p className="text-sm text-slate-500 font-medium">Professional Card Generation System</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">Sign in to your account to continue</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="pi pi-exclamation-triangle text-red-500"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address {formErrors.email && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  id="email" name="email" type="email" required
                  value={formData.email} onChange={handleChange} onBlur={handleBlur}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 pl-10 ${formErrors.email && touched.email
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-red-500 focus:border-red-400'
                    }`}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className={`pi pi-envelope ${formErrors.email && touched.email ? 'text-red-400' : 'text-gray-400'}`}></i>
                </div>
                {formErrors.email && touched.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i className="pi pi-times-circle text-red-500"></i>
                  </div>
                )}
              </div>
              {formErrors.email && touched.email && (
                <p className="mt-2 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password {formErrors.password && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  id="password" name="password" type="password" required
                  value={formData.password} onChange={handleChange} onBlur={handleBlur}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 pl-10 ${formErrors.password && touched.password
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-red-500 focus:border-red-400'
                    }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className={`pi pi-lock ${formErrors.password && touched.password ? 'text-red-400' : 'text-gray-400'}`}></i>
                </div>
                {formErrors.password && touched.password && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i className="pi pi-times-circle text-red-500"></i>
                  </div>
                )}
              </div>
              {formErrors.password && touched.password && (
                <p className="mt-2 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Remember me</label>
              </div>
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-red-600 hover:text-red-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transform transition-all duration-300 relative overflow-hidden group ${loading || !isFormValid() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
                }`}
            >
              <span className="relative z-10 flex items-center">
                {loading ? (
                  <>
                    <i className="pi pi-spinner pi-spin mr-2"></i>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="pi pi-sign-in mr-2"></i>
                    Sign in
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to CARD-AGENT?</span>
              </div>
            </div>
            <div className="mt-4">
              <Link
                to="/register"
                className="w-full flex justify-center py-3 px-4 border-2 border-slate-800 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-800 hover:text-white transition-all duration-300 transform hover:scale-[1.02]"
              >
                <i className="pi pi-user-plus mr-2"></i>
                Create your account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-red-400 rounded-full opacity-60 animate-float"></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-red-300 rounded-full opacity-40 animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-slate-400 rounded-full opacity-50 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-red-500/20 to-transparent rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-slate-500/20 to-transparent rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 gap-4 h-full">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border-r border-b border-slate-500/30"></div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 h-full flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div className="relative mx-auto mb-6 w-32 h-40">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-500 rounded-2xl shadow-2xl transform rotate-3 animate-float"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-xl transform -rotate-2 translate-y-1 animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="w-32 h-32 mx-auto mb-6 mt-6 bg-gradient-to-br from-slate-800 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6">
                  <i className="pi pi-id-card text-white text-4xl"></i>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Professional Card Generation</h3>
              <p className="text-slate-300 text-lg leading-relaxed">
                Design, generate, and manage ID cards for schools, organizations, and businesses.
              </p>
            </div>

            <div className="space-y-4 text-left bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <FeatureItem icon="pi pi-bolt" title="Batch Processing" desc="Generate 500+ cards in minutes" />
              <FeatureItem icon="pi pi-palette" title="Smart Templates" desc="Drag & drop visual designer" />
              <FeatureItem icon="pi pi-chart-bar" title="Real-time Analytics" desc="Track usage and performance" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc }) => (
  <div className="flex items-center text-white group">
    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
      <i className={`${icon} text-white text-xs`}></i>
    </div>
    <div>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-slate-400">{desc}</div>
    </div>
  </div>
);

export default Login;