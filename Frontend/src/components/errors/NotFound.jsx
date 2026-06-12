// pages/NotFound.jsx - UPDATED FOR CARD-AGENT SYSTEM
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [floatingElements] = useState([
    { id: 1, x: 15, y: 25, delay: 0 },
    { id: 2, x: 75, y: 55, delay: 0.3 },
    { id: 3, x: 45, y: 75, delay: 0.6 },
    { id: 4, x: 85, y: 15, delay: 0.9 },
    { id: 5, x: 10, y: 70, delay: 1.2 },
  ]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Get user role from localStorage or context for dynamic redirect
  const getUserRole = () => {
    try {
      const token = localStorage.getItem('capmis_token');
      if (!token) return null;
      // Simple role detection - you can expand this
      return 'admin'; // Default fallback
    } catch {
      return null;
    }
  };

  const getDashboardLink = () => {
    const role = getUserRole();
    if (role === 'super_admin') return '/super-admin/dashboard';
    if (role === 'co_worker') return '/co-worker/dashboard';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 overflow-hidden relative">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Floating Card Elements - ID Card Shapes */}
      {floatingElements.map((item) => (
        <motion.div
          key={item.id}
          className="absolute w-28 h-40"
          initial={{ x: `${item.x}%`, y: `${item.y}%`, rotate: Math.random() * 20 - 10 }}
          animate={{
            y: [`${item.y}%`, `${item.y + 5}%`, `${item.y}%`],
            rotate: [Math.random() * 20 - 10, Math.random() * 20 - 10]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut"
          }}
          style={{
            transformStyle: 'preserve-3d',
            transform: `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0)`
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-slate-600/20 rounded-2xl shadow-2xl backdrop-blur-sm border border-red-500/30 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-red-500/30 rounded-lg mb-2"></div>
            <div className="w-16 h-2 bg-slate-400/30 rounded mb-1"></div>
            <div className="w-12 h-2 bg-slate-400/30 rounded"></div>
          </div>
        </motion.div>
      ))}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl w-full text-center"
        >
          {/* Glowing Centerpiece */}
          <div className="relative inline-block mb-12">
            {/* Outer Glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  '0 0 60px rgba(220, 38, 38, 0.3)',
                  '0 0 80px rgba(220, 38, 38, 0.5)',
                  '0 0 60px rgba(220, 38, 38, 0.3)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Middle Ring */}
            <motion.div
              className="absolute inset-0 border-4 border-red-400/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />

            {/* Main 404 Display */}
            <motion.div
              className="relative w-64 h-64 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex flex-col items-center justify-center shadow-2xl border border-red-500/20"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Animated Number 4 */}
              <div className="relative">
                <motion.span
                  className="text-8xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  4
                </motion.span>

                {/* Floating Zero as ID Card */}
                <motion.div
                  className="absolute top-0 left-24"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, 0, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="w-20 h-20 rounded-xl border-2 border-red-500/50 flex flex-col items-center justify-center bg-slate-800/50 backdrop-blur-sm">
                    <div className="w-8 h-8 bg-red-500/30 rounded-lg mb-1"></div>
                    <span className="text-xs text-red-400 font-mono">ID</span>
                  </div>
                </motion.div>

                {/* Second 4 */}
                <motion.span
                  className="absolute top-0 left-44 text-8xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  4
                </motion.span>
              </div>

              {/* Card Icon Floating */}
              <motion.div
                className="absolute -top-4 -right-4"
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                <div className="w-16 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">CARD</span>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Error Message */}
          <motion.h1
            className="text-5xl md:text-6xl font-bold text-white mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Page Not Found
          </motion.h1>

          <motion.p
            className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            The card or page you're looking for seems to have been misplaced or never issued.
            Let's get you back to the main dashboard.
          </motion.p>

          {/* System Stats */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            {[
              { label: 'Cards Generated', value: '15K+', icon: 'pi-qrcode', color: 'red' },
              { label: 'Active Orgs', value: '50+', icon: 'pi-building', color: 'slate' },
              { label: 'System Status', value: 'Online', icon: 'pi-check-circle', color: 'green' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-${stat.color === 'red' ? 'red' : stat.color === 'green' ? 'green' : 'slate'}-500/20 rounded-2xl p-6 shadow-xl`}
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-3xl font-bold text-${stat.color === 'red' ? 'red' : stat.color === 'green' ? 'green' : 'slate'}-400`}>
                    {stat.value}
                  </div>
                  <i className={`pi ${stat.icon} text-2xl text-${stat.color === 'red' ? 'red' : stat.color === 'green' ? 'green' : 'slate'}-400/50`}></i>
                </div>
                <div className="text-slate-400 text-sm mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={getDashboardLink()}
                className="group relative px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-semibold text-lg shadow-2xl overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <i className="pi pi-home mr-2 text-white group-hover:rotate-12 transition-transform"></i>
                  Return to Dashboard
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/card-generation"
                className="group relative px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border border-red-500/30 rounded-xl text-red-400 font-semibold text-lg shadow-xl overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <i className="pi pi-plus-circle mr-2 group-hover:rotate-90 transition-transform"></i>
                  Generate New Card
                </span>
                <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Quick Help Section */}
          <motion.div
            className="mt-12 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-sm mb-3 flex items-center justify-center gap-2">
                <i className="pi pi-question-circle text-red-400"></i>
                Need help finding something?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search for students, cards, or templates..."
                  className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white text-sm font-medium hover:from-red-700 hover:to-red-600 transition-all duration-300">
                  Search
                </button>
              </div>
            </div>
          </motion.div>

          {/* Footer Note */}
          <motion.p
            className="mt-8 text-slate-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            If you believe this is an error, contact your system administrator at{' '}
            <a href="mailto:support@cardagent.com" className="text-red-400 hover:text-red-300 transition-colors">
              support@cardagent.com
            </a>
          </motion.p>
        </motion.div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-red-400 rounded-full"
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
            }}
            animate={{
              y: [null, `-${Math.random() * 100}px`],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default NotFound;