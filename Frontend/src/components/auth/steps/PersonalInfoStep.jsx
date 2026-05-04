// components/auth/steps/PersonalInfoStep.jsx - NAVY & CRIMSON THEME
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const PersonalInfoStep = ({ onSubmit, initialData, loading }) => {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phoneNumber: initialData?.phoneNumber || '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, strength: '' });
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    const strength =
      score >= 90 ? 'Very Strong' :
        score >= 70 ? 'Strong' :
          score >= 50 ? 'Good' :
            score >= 25 ? 'Weak' : 'Very Weak';

    return { score, strength };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const checkEmailAvailability = async (email) => {
    if (!email) return;
    setCheckingEmail(true);
    try {
      const response = await authAPI.checkEmail(email);
      setEmailAvailable(response.available);
    } catch (error) {
      console.error('Email check failed:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({ ...formData, email });

    if (email.includes('@') && email.includes('.')) {
      const timeoutId = setTimeout(() => checkEmailAvailability(email), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    } else if (!emailAvailable) {
      newErrors.email = 'Email already registered';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const getStrengthColor = () => {
    const colors = {
      'Very Weak': 'from-red-700 to-red-600',
      'Weak': 'from-orange-600 to-orange-500',
      'Good': 'from-yellow-500 to-yellow-400',
      'Strong': 'from-red-600 to-red-500',
      'Very Strong': 'from-red-600 to-red-500'
    };
    return colors[passwordStrength.strength] || 'from-gray-400 to-gray-500';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="relative mb-6">
        <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-red-600 to-red-400 rounded-full"></div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Personal Information
        </h2>
        <p className="text-sm text-gray-500 mt-1">Let's start with your basic details</p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            onFocus={() => setFocusedField('firstName')}
            onBlur={() => setFocusedField(null)}
            className={`w-full px-4 pt-6 pb-2 bg-white/80 backdrop-blur-sm border-2 rounded-2xl text-gray-900 placeholder-transparent focus:outline-none transition-all duration-300 ${errors.firstName ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
            placeholder="First Name"
          />
          <label className={`absolute left-4 text-sm pointer-events-none transition-all duration-300 ${formData.firstName || focusedField === 'firstName' ? 'text-xs -translate-y-3 top-5' : 'top-5'
            } ${errors.firstName ? 'text-red-500' : 'text-gray-500'}`}>
            First Name <span className="text-red-400">*</span>
          </label>
          {!errors.firstName && formData.firstName && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
          )}
          <AnimatePresence>
            {errors.firstName && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-1 text-xs text-red-500 flex items-center">
                <span className="mr-1">⚠️</span> {errors.firstName}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            onFocus={() => setFocusedField('lastName')}
            onBlur={() => setFocusedField(null)}
            className={`w-full px-4 pt-6 pb-2 bg-white/80 backdrop-blur-sm border-2 rounded-2xl text-gray-900 placeholder-transparent focus:outline-none transition-all duration-300 ${errors.lastName ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
            placeholder="Last Name"
          />
          <label className={`absolute left-4 text-sm pointer-events-none transition-all duration-300 ${formData.lastName || focusedField === 'lastName' ? 'text-xs -translate-y-3 top-5' : 'top-5'
            } ${errors.lastName ? 'text-red-500' : 'text-gray-500'}`}>
            Last Name <span className="text-red-400">*</span>
          </label>
          {!errors.lastName && formData.lastName && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
          )}
          <AnimatePresence>
            {errors.lastName && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-1 text-xs text-red-500 flex items-center">
                <span className="mr-1">⚠️</span> {errors.lastName}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Email Field */}
      <div className="relative">
        <input
          type="email"
          value={formData.email}
          onChange={handleEmailChange}
          className={`w-full px-4 pt-6 pb-2 bg-white/80 backdrop-blur-sm border-2 rounded-2xl text-gray-900 placeholder-transparent focus:outline-none transition-all duration-300 ${errors.email ? 'border-red-300 focus:border-red-400'
              : emailAvailable && formData.email ? 'border-green-300 focus:border-red-400'
                : 'border-gray-200 focus:border-red-400'
            }`}
          placeholder="Email Address"
        />
        <label className={`absolute left-4 text-sm pointer-events-none transition-all duration-300 ${formData.email ? 'text-xs -translate-y-3 top-5' : 'top-5'
          } ${errors.email ? 'text-red-500' : 'text-gray-500'}`}>
          Email Address <span className="text-red-400">*</span>
        </label>
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {checkingEmail && (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full" />
          )}
          {!checkingEmail && formData.email && emailAvailable && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
          {!checkingEmail && formData.email && !emailAvailable && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✕</span>
            </motion.div>
          )}
        </div>
        <AnimatePresence>
          {errors.email && (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-1 text-xs text-red-500 flex items-center">
              <span className="mr-1">⚠️</span> {errors.email}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Phone Field */}
      <div className="relative">
        <input
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          className={`w-full px-4 pt-6 pb-2 bg-white/80 backdrop-blur-sm border-2 rounded-2xl text-gray-900 placeholder-transparent focus:outline-none transition-all duration-300 ${errors.phoneNumber ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
            }`}
          placeholder="Phone Number"
        />
        <label className={`absolute left-4 text-sm pointer-events-none transition-all duration-300 ${formData.phoneNumber ? 'text-xs -translate-y-3 top-5' : 'top-5'
          } ${errors.phoneNumber ? 'text-red-500' : 'text-gray-500'}`}>
          Phone Number <span className="text-red-400">*</span>
        </label>
        <AnimatePresence>
          {errors.phoneNumber && (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-1 text-xs text-red-500 flex items-center">
              <span className="mr-1">⚠️</span> {errors.phoneNumber}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handlePasswordChange}
            className={`w-full px-4 pt-6 pb-2 bg-white/80 backdrop-blur-sm border-2 rounded-2xl text-gray-900 placeholder-transparent focus:outline-none transition-all duration-300 ${errors.password ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
            placeholder="Password"
          />
          <label className={`absolute left-4 text-sm pointer-events-none transition-all duration-300 ${formData.password ? 'text-xs -translate-y-3 top-5' : 'top-5'
            } ${errors.password ? 'text-red-500' : 'text-gray-500'}`}>
            Password <span className="text-red-400">*</span>
          </label>
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        {/* Password Strength Meter */}
        <AnimatePresence>
          {formData.password && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Password Strength:</span>
                  <span className={`text-sm font-bold bg-gradient-to-r ${getStrengthColor()} bg-clip-text text-transparent`}>
                    {passwordStrength.strength}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${passwordStrength.score}%` }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className={`h-full bg-gradient-to-r ${getStrengthColor()}`}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {errors.password && (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xs text-red-500 flex items-center">
              <span className="mr-1">⚠️</span> {errors.password}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Password */}
      <div className="relative">
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          className={`w-full px-4 pt-6 pb-2 bg-white/80 backdrop-blur-sm border-2 rounded-2xl text-gray-900 placeholder-transparent focus:outline-none transition-all duration-300 ${errors.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
            }`}
          placeholder="Confirm Password"
        />
        <label className={`absolute left-4 text-sm pointer-events-none transition-all duration-300 ${formData.confirmPassword ? 'text-xs -translate-y-3 top-5' : 'top-5'
          } ${errors.confirmPassword ? 'text-red-500' : 'text-gray-500'}`}>
          Confirm Password <span className="text-red-400">*</span>
        </label>
        {formData.confirmPassword && formData.password === formData.confirmPassword && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </motion.div>
        )}
        <AnimatePresence>
          {errors.confirmPassword && (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-1 text-xs text-red-500 flex items-center">
              <span className="mr-1">⚠️</span> {errors.confirmPassword}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={loading}
        className="relative w-full py-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <span className="relative z-10 flex items-center justify-center">
          {loading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3" />
              Creating Account...
            </>
          ) : (
            <>
              Continue
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </span>
      </motion.button>
    </form>
  );
};

export default PersonalInfoStep;