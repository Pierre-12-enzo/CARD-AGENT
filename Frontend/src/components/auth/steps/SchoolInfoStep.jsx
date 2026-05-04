// components/auth/steps/SchoolInfoStep.jsx - FUTURISTIC REDESIGN
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const SchoolInfoStep = ({ onSubmit, initialData, loading }) => {
  const [schoolData, setSchoolData] = useState({
    schoolName: initialData?.name || '',
    schoolType: initialData?.type || 'secondary',
    schoolEmail: initialData?.email || '',
    schoolPhone: initialData?.phone || '',
    province: initialData?.province || '',
    district: initialData?.district || '',
    sector: initialData?.sector || '',
    country: initialData?.country || 'Rwanda',
    logo: null,
    logoPreview: initialData?.logo?.url || ''
  });

  const [errors, setErrors] = useState({});
  const [schoolNameAvailable, setSchoolNameAvailable] = useState(true);
  const [checkingName, setCheckingName] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const schoolTypes = [
    { value: 'secondary', label: 'Secondary School', icon: '🏫', color: 'from-blue-400 to-cyan-500' },
    { value: 'primary', label: 'Primary School', icon: '🎒', color: 'from-emerald-400 to-green-500' },
    { value: 'both', label: 'Both', icon: '🌟', color: 'from-purple-400 to-pink-500' }
  ];

  const checkSchoolName = async (name) => {
    if (!name || name.length < 3) return;
    setCheckingName(true);
    try {
      const response = await authAPI.checkSchoolName(name);
      setSchoolNameAvailable(response.available);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('School name check failed:', error);
    } finally {
      setCheckingName(false);
    }
  };

  const handleSchoolNameChange = (e) => {
    const name = e.target.value;
    setSchoolData({ ...schoolData, schoolName: name });

    if (name.length >= 3) {
      const timeoutId = setTimeout(() => checkSchoolName(name), 500);
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
      setSchoolData({ ...schoolData, logo: file, logoPreview: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSchoolData({ ...schoolData, logo: null, logoPreview: '' });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!schoolData.schoolName?.trim()) newErrors.schoolName = 'School name is required';
    else if (!schoolNameAvailable) newErrors.schoolName = 'School name already registered';
    if (!schoolData.schoolType) newErrors.schoolType = 'School type is required';
    if (!schoolData.schoolEmail?.trim()) newErrors.schoolEmail = 'School email is required';
    else if (!/\S+@\S+\.\S+/.test(schoolData.schoolEmail)) newErrors.schoolEmail = 'Invalid email format';
    if (!schoolData.schoolPhone?.trim()) newErrors.schoolPhone = 'School phone is required';
    if (!schoolData.province?.trim()) newErrors.province = 'Province is required';
    if (!schoolData.district?.trim()) newErrors.district = 'District is required';
    if (!schoolData.sector?.trim()) newErrors.sector = 'Sector is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('schoolName', schoolData.schoolName);
    formData.append('schoolType', schoolData.schoolType);
    formData.append('schoolEmail', schoolData.schoolEmail);
    formData.append('schoolPhone', schoolData.schoolPhone);
    formData.append('province', schoolData.province);
    formData.append('district', schoolData.district);
    formData.append('sector', schoolData.sector);
    formData.append('country', schoolData.country);
    if (schoolData.logo) formData.append('logo', schoolData.logo);

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
        setSchoolData({ ...schoolData, logo: file, logoPreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="relative mb-6">
        <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-emerald-400 to-green-500 rounded-full"></div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          School Information
        </h2>
        <p className="text-sm text-gray-500 mt-1">Tell us about your institution</p>
      </div>

      {/* Logo Upload - Drag & Drop */}
      <div className="flex items-start space-x-6">
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative w-28 h-28 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${isDragging
                ? 'border-4 border-emerald-400 bg-emerald-50 scale-105'
                : 'border-3 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100'
              }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />

            {schoolData.logoPreview ? (
              <>
                <img src={schoolData.logoPreview} alt="Logo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <motion.div
                className="w-full h-full flex flex-col items-center justify-center"
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              >
                <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-gray-500 text-center px-2">
                  {isDragging ? 'Drop here' : 'Upload Logo'}
                </span>
              </motion.div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">PNG, JPG up to 2MB</p>
        </motion.div>

        <div className="flex-1">
          <p className="text-sm text-gray-700 mb-2">
            Add your school logo to personalize your account
          </p>
          <div className="flex space-x-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => document.querySelector('input[type="file"]').click()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-green-500 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Choose File
            </motion.button>
            {schoolData.logoPreview && (
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

      {/* School Name with Suggestions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          School Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <motion.div
            animate={checkingName ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            className="relative"
          >
            <input
              type="text"
              value={schoolData.schoolName}
              onChange={handleSchoolNameChange}
              className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.schoolName || (!schoolNameAvailable && schoolData.schoolName)
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-emerald-400'
                }`}
              placeholder="e.g., Lycée de Kigali"
            />
            {checkingName && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full"
                />
              </div>
            )}
            {!checkingName && schoolData.schoolName && schoolNameAvailable && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        <AnimatePresence>
          {!schoolNameAvailable && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl"
            >
              <p className="text-xs text-emerald-700 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                Try these alternatives:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSchoolData({ ...schoolData, schoolName: suggestion });
                      checkSchoolName(suggestion);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 rounded-lg text-sm text-gray-700 transition-all border border-emerald-200 shadow-sm"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errors.schoolName && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-1 text-xs text-red-500 flex items-center"
            >
              <span className="mr-1">⚠️</span> {errors.schoolName}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* School Type - Animated Cards */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          School Type <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {schoolTypes.map((type) => (
            <motion.button
              key={type.value}
              type="button"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSchoolData({ ...schoolData, schoolType: type.value })}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden ${schoolData.schoolType === type.value
                  ? `border-transparent shadow-lg`
                  : 'border-gray-200 bg-white hover:border-emerald-200'
                }`}
            >
              {/* Background gradient for selected state */}
              {schoolData.schoolType === type.value && (
                <motion.div
                  layoutId="selectedType"
                  className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-10`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <div className="relative z-10">
                <span className="text-2xl mb-2 block">{type.icon}</span>
                <div className={`text-sm font-medium ${schoolData.schoolType === type.value ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                  {type.label}
                </div>
              </div>

              {schoolData.schoolType === type.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 z-10"
                >
                  <div className={`w-5 h-5 bg-gradient-to-br ${type.color} rounded-full flex items-center justify-center`}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Contact Information - Side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School Email <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              value={schoolData.schoolEmail}
              onChange={(e) => setSchoolData({ ...schoolData, schoolEmail: e.target.value })}
              className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.schoolEmail ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                }`}
              placeholder="info@school.edu"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉️</div>
          </div>
          <AnimatePresence>
            {errors.schoolEmail && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-1 text-xs text-red-500"
              >
                {errors.schoolEmail}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School Phone <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              value={schoolData.schoolPhone}
              onChange={(e) => setSchoolData({ ...schoolData, schoolPhone: e.target.value })}
              className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.schoolPhone ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                }`}
              placeholder="+250 788 123 456"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📞</div>
          </div>
          <AnimatePresence>
            {errors.schoolPhone && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-1 text-xs text-red-500"
              >
                {errors.schoolPhone}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Address Section with Map Icon */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">📍</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">School Address</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Province *</label>
            <input
              type="text"
              value={schoolData.province}
              onChange={(e) => setSchoolData({ ...schoolData, province: e.target.value })}
              className={`w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-sm focus:outline-none transition-all duration-300 ${errors.province ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                }`}
              placeholder="Southern Province"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">District *</label>
            <input
              type="text"
              value={schoolData.district}
              onChange={(e) => setSchoolData({ ...schoolData, district: e.target.value })}
              className={`w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-sm focus:outline-none transition-all duration-300 ${errors.district ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                }`}
              placeholder="Huye"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sector *</label>
            <input
              type="text"
              value={schoolData.sector}
              onChange={(e) => setSchoolData({ ...schoolData, sector: e.target.value })}
              className={`w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-sm focus:outline-none transition-all duration-300 ${errors.sector ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                }`}
              placeholder="Ngoma"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
            <input
              type="text"
              value={schoolData.country}
              onChange={(e) => setSchoolData({ ...schoolData, country: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-all duration-300"
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
          className="relative px-8 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10 flex items-center">
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Saving...
              </>
            ) : (
              <>
                Continue to Plans
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

export default SchoolInfoStep;