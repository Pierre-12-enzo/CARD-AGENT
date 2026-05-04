// components/auth/steps/CompanyInfoStep.jsx - NAVY & CRIMSON THEME
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const CompanyInfoStep = ({ onSubmit, initialData, loading }) => {
  const [companyData, setCompanyData] = useState({
    companyName: initialData?.name || '',
    companyEmail: initialData?.email || '',
    companyPhone: initialData?.phone || '',
    website: initialData?.website || '',
    province: initialData?.province || '',
    district: initialData?.district || '',
    sector: initialData?.sector || '',
    country: initialData?.country || 'Rwanda',
    logo: null,
    logoPreview: initialData?.logo?.url || ''
  });

  const [errors, setErrors] = useState({});
  const [companyNameAvailable, setCompanyNameAvailable] = useState(true);
  const [checkingName, setCheckingName] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const checkCompanyName = async (name) => {
    if (!name || name.length < 3) return;
    setCheckingName(true);
    try {
      const response = await authAPI.checkCompanyName(name);
      setCompanyNameAvailable(response.available);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Company name check failed:', error);
    } finally {
      setCheckingName(false);
    }
  };

  const handleCompanyNameChange = (e) => {
    const name = e.target.value;
    setCompanyData({ ...companyData, companyName: name });
    if (name.length >= 3) {
      const timeoutId = setTimeout(() => checkCompanyName(name), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, logo: 'Please upload an image file' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, logo: 'Logo must be less than 2MB' });
      return;
    }
    setErrors({ ...errors, logo: '' });
    const reader = new FileReader();
    reader.onloadend = () => {
      setCompanyData({ ...companyData, logo: file, logoPreview: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setCompanyData({ ...companyData, logo: null, logoPreview: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!companyData.companyName?.trim()) newErrors.companyName = 'Company name is required';
    else if (!companyNameAvailable) newErrors.companyName = 'Company name already registered';
    if (!companyData.companyEmail?.trim()) newErrors.companyEmail = 'Company email is required';
    else if (!/\S+@\S+\.\S+/.test(companyData.companyEmail)) newErrors.companyEmail = 'Invalid email format';
    if (!companyData.companyPhone?.trim()) newErrors.companyPhone = 'Company phone is required';
    if (!companyData.province?.trim()) newErrors.province = 'Province is required';
    if (!companyData.district?.trim()) newErrors.district = 'District is required';
    if (!companyData.sector?.trim()) newErrors.sector = 'Sector is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('name', companyData.companyName);
    formData.append('email', companyData.companyEmail);
    formData.append('phone', companyData.companyPhone);
    formData.append('website', companyData.website);
    formData.append('province', companyData.province);
    formData.append('district', companyData.district);
    formData.append('sector', companyData.sector);
    formData.append('country', companyData.country);
    if (companyData.logo) formData.append('logo', companyData.logo);

    onSubmit(formData);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyData({ ...companyData, logo: file, logoPreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="relative mb-6">
        <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-red-600 to-red-400 rounded-full"></div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Company Information
        </h2>
        <p className="text-sm text-gray-500 mt-1">Tell us about your card production company</p>
      </div>

      {/* Logo Upload */}
      <div className="flex items-start space-x-6">
        <motion.div className="relative" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative w-28 h-28 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-4 border-red-500 bg-red-50 scale-105 shadow-lg'
                : 'border-3 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:border-red-300'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            {companyData.logoPreview ? (
              <>
                <img src={companyData.logoPreview} alt="Logo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20 shadow-lg"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <motion.div className="w-full h-full flex flex-col items-center justify-center" animate={isDragging ? { scale: 1.1 } : { scale: 1 }}>
                <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-gray-500 text-center px-2">{isDragging ? 'Drop here' : 'Upload Logo'}</span>
              </motion.div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">PNG, JPG up to 2MB</p>
        </motion.div>

        <div className="flex-1">
          <p className="text-sm text-gray-700 mb-2">Add your company logo to build trust with clients</p>
          <div className="flex space-x-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => document.querySelector('input[type="file"]').click()}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Choose File
            </motion.button>
            {companyData.logoPreview && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={removeLogo}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-300 transition-all"
              >
                Remove
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={companyData.companyName}
            onChange={handleCompanyNameChange}
            className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${
              errors.companyName || (!companyNameAvailable && companyData.companyName)
                ? 'border-red-300 focus:border-red-400'
                : 'border-gray-200 focus:border-red-400'
            }`}
            placeholder="e.g., Elite Card Productions Ltd"
          />
          {checkingName && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full" />
            </div>
          )}
          {!checkingName && companyData.companyName && companyNameAvailable && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
          )}
        </div>
        <AnimatePresence>
          {!companyNameAvailable && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700 mb-2 flex items-center">
                <span className="mr-2">💡</span>Try these alternatives:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setCompanyData({ ...companyData, companyName: suggestion });
                      checkCompanyName(suggestion);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-red-100 rounded-lg text-sm text-gray-700 transition-all border border-red-200 shadow-sm"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {errors.companyName && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-1 text-xs text-red-500 flex items-center">
              <span className="mr-1">⚠️</span> {errors.companyName}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Contact Info - Side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              value={companyData.companyEmail}
              onChange={(e) => setCompanyData({ ...companyData, companyEmail: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                errors.companyEmail ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
              placeholder="info@company.com"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
          </div>
          <AnimatePresence>
            {errors.companyEmail && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-1 text-xs text-red-500">{errors.companyEmail}</motion.p>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Phone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              value={companyData.companyPhone}
              onChange={(e) => setCompanyData({ ...companyData, companyPhone: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                errors.companyPhone ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
              placeholder="+250 788 123 456"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📞</span>
          </div>
          <AnimatePresence>
            {errors.companyPhone && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-1 text-xs text-red-500">{errors.companyPhone}</motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Website (Optional)</label>
        <div className="relative">
          <input
            type="url"
            value={companyData.website}
            onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
            className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 transition-all duration-300"
            placeholder="https://www.example.com"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🌐</span>
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-red-600 to-red-400 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">📍</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Company Address</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Province *</label>
            <input
              type="text"
              value={companyData.province}
              onChange={(e) => setCompanyData({ ...companyData, province: e.target.value })}
              className={`w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-sm focus:outline-none transition-all duration-300 ${
                errors.province ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
              placeholder="Kigali City"
            />
            {errors.province && <p className="mt-1 text-xs text-red-500">{errors.province}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">District *</label>
            <input
              type="text"
              value={companyData.district}
              onChange={(e) => setCompanyData({ ...companyData, district: e.target.value })}
              className={`w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-sm focus:outline-none transition-all duration-300 ${
                errors.district ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
              placeholder="Gasabo"
            />
            {errors.district && <p className="mt-1 text-xs text-red-500">{errors.district}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sector *</label>
            <input
              type="text"
              value={companyData.sector}
              onChange={(e) => setCompanyData({ ...companyData, sector: e.target.value })}
              className={`w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-sm focus:outline-none transition-all duration-300 ${
                errors.sector ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-red-400'
              }`}
              placeholder="Kimihurura"
            />
            {errors.sector && <p className="mt-1 text-xs text-red-500">{errors.sector}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
            <input
              type="text"
              value={companyData.country}
              onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 transition-all duration-300"
              placeholder="Rwanda"
            />
          </div>
        </div>
      </div>

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
          disabled={loading}
          className="relative px-8 py-3 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10 flex items-center">
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Saving...
              </>
            ) : (
              <>
                Continue to License
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

export default CompanyInfoStep;