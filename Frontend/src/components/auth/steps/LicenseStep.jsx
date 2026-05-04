// components/auth/steps/LicenseStep.jsx - NAVY & CRIMSON THEME
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const LicenseStep = ({ onSubmit, loading }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!licenseKey.trim()) {
      newErrors.licenseKey = 'License key is required';
    } else if (licenseKey.trim().length < 8) {
      newErrors.licenseKey = 'Invalid license key format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ licenseKey: licenseKey.trim().toUpperCase() });
    }
  };

  // Auto-format: uppercase and add dashes
  const handleLicenseChange = (e) => {
    let value = e.target.value.toUpperCase();
    // Auto-format: CARD-XXXX-XXXX
    if (value.length === 4 && !value.includes('-')) {
      value = value + '-';
    }
    if (value.length === 9 && value.split('-').length === 2) {
      value = value + '-';
    }
    setLicenseKey(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="relative mb-6">
        <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-red-600 to-red-400 rounded-full"></div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Activate License
        </h2>
        <p className="text-sm text-gray-500 mt-1">Enter your license key to activate CARD-AGENT</p>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-slate-200"
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white text-lg">🔑</span>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 mb-1">Where to find your license key?</h4>
            <p className="text-sm text-slate-600">
              Your license key was provided when you purchased CARD-AGENT. 
              It should be in the format: <span className="font-mono font-bold text-red-600">CARD-XXXX-XXXX</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">
              If you don't have a license key, contact our sales team at{' '}
              <span className="text-red-600 font-medium">sales@cardagent.rw</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* License Key Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          License Key <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <input
            type="text"
            value={licenseKey}
            onChange={handleLicenseChange}
            maxLength={14}
            className={`w-full pl-12 pr-4 py-4 bg-white/90 backdrop-blur-sm border-2 rounded-2xl text-lg font-mono tracking-wider text-center focus:outline-none transition-all duration-300 ${
              errors.licenseKey
                ? 'border-red-300 focus:border-red-400 bg-red-50'
                : licenseKey.length >= 10
                  ? 'border-green-300 focus:border-red-400 bg-green-50'
                  : 'border-gray-200 focus:border-red-400'
            }`}
            placeholder="CARD-XXXX-XXXX"
          />
          {licenseKey.length >= 10 && !errors.licenseKey && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
          )}
        </div>
        {errors.licenseKey && (
          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs text-red-500 flex items-center">
            <span className="mr-1">⚠️</span> {errors.licenseKey}
          </motion.p>
        )}
      </div>

      {/* Features included */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200"
      >
        <h4 className="font-semibold text-gray-800 mb-3">Included with your license:</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🪪', text: 'Unlimited Card Designs' },
            { icon: '🏫', text: 'Multiple Organizations' },
            { icon: '👥', text: 'Co-worker Accounts' },
            { icon: '📊', text: 'Real-time Analytics' },
            { icon: '☁️', text: 'Cloud Photo Storage' },
            { icon: '📥', text: 'CSV Bulk Import' }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center space-x-2"
            >
              <span className="text-lg">{feature.icon}</span>
              <span className="text-sm text-gray-600">{feature.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <motion.button
          whileHover={{ scale: 1.02, x: -2 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-all flex items-center group"
        >
          <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !licenseKey.trim()}
          className="relative px-8 py-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10 flex items-center">
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Activating...
              </>
            ) : (
              <>
                Complete Registration
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
        </motion.button>
      </div>
    </form>
  );
};

export default LicenseStep;
