// components/auth/steps/CompletionStep.jsx - NAVY & CRIMSON THEME
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';

const CompletionStep = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
        }
        return prev - 1;
      });
    }, 1000);

    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
    return () => {
      clearInterval(timer);
      clearTimeout(confettiTimer);
    };
  }, [navigate]);

  const steps = [
    { icon: '🏢', text: 'Complete your company profile', color: 'from-slate-700 to-slate-800' },
    { icon: '🏫', text: 'Add client organizations', color: 'from-red-600 to-red-500' },
    { icon: '👥', text: 'Add students & employees', color: 'from-slate-700 to-slate-800' },
    { icon: '🪪', text: 'Generate professional ID cards', color: 'from-red-600 to-red-500' }
  ];

  return (
    <div className="relative">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          colors={['#DC2626', '#EF4444', '#0F172A', '#1E293B', '#F87171', '#334155']}
        />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-8 py-8 relative z-10"
      >
        {/* Success Animation */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative w-32 h-32 mx-auto"
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, rgba(220,38,38,0) 70%)' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              style={{ background: 'radial-gradient(circle, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0) 70%)' }}
            />

            <motion.div
              className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-700 to-red-600 rounded-full flex items-center justify-center shadow-2xl"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(220,38,38,0.5)",
                  "0 0 40px rgba(220,38,38,0.8)",
                  "0 0 20px rgba(220,38,38,0.5)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-16 h-16 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            </motion.div>

            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-red-400 rounded-full"
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(i * 45 * Math.PI / 180) * 80,
                  y: Math.sin(i * 45 * Math.PI / 180) * 80,
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        </div>

        {/* Welcome Message */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-slate-800 via-red-600 to-slate-800 bg-clip-text text-transparent">
              Welcome to CARD-AGENT! 🎉
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-2">Your account is ready</p>
          <p className="text-gray-500 max-w-md mx-auto">
            You're all set to start creating professional ID cards for your clients.
          </p>
        </motion.div>

        {/* Next Steps Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-slate-50 via-white to-red-50 rounded-3xl p-8 border border-slate-200 max-w-2xl mx-auto backdrop-blur-sm"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center justify-center">
            <span className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm">🎯</span>
            </span>
            Your Next Steps
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center mr-3 shadow-md group-hover:scale-110 transition-transform`}>
                  <span className="text-white text-lg">{step.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-0.5">Step {index + 1}</div>
                  <div className="text-sm font-medium text-gray-800">{step.text}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Countdown Timer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="#E5E7EB" strokeWidth="4" fill="none" />
                <motion.circle
                  cx="32" cy="32" r="28"
                  stroke="url(#navyGradient)"
                  strokeWidth="4" fill="none" strokeLinecap="round"
                  initial={{ pathLength: 1 }}
                  animate={{ pathLength: 0 }}
                  transition={{ duration: 5, ease: "linear" }}
                  style={{ strokeDasharray: 175.93, strokeDashoffset: 0 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-red-600">{countdown}</span>
              </div>
            </div>
          </div>
          <p className="text-gray-500">
            Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/dashboard')}
          className="relative px-10 py-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10 flex items-center">
            Go to Dashboard
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </motion.button>

        <svg width="0" height="0">
          <defs>
            <linearGradient id="navyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </div>
  );
};

export default CompletionStep;