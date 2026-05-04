import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [floatingElements] = useState([
    { id: 1, x: 20, y: 30, delay: 0 },
    { id: 2, x: 70, y: 60, delay: 0.3 },
    { id: 3, x: 40, y: 80, delay: 0.6 },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden relative">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Floating Cards Animation */}
      {floatingElements.map((item) => (
        <motion.div
          key={item.id}
          className="absolute w-32 h-40"
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
          <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-2xl shadow-2xl backdrop-blur-sm border border-emerald-500/30" />
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
                  '0 0 60px rgba(16, 185, 129, 0.3)',
                  '0 0 80px rgba(16, 185, 129, 0.5)',
                  '0 0 60px rgba(16, 185, 129, 0.3)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            {/* Middle Ring */}
            <motion.div
              className="absolute inset-0 border-4 border-emerald-400/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Main 404 Display */}
            <motion.div
              className="relative w-64 h-64 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex flex-col items-center justify-center shadow-2xl border border-emerald-500/20"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Animated Number 4 */}
              <div className="relative">
                <motion.span
                  className="text-8xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  4
                </motion.span>
                
                {/* Floating Zero */}
                <motion.div
                  className="absolute top-0 left-24"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, 0, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="w-20 h-20 rounded-full border-4 border-emerald-500/50 flex items-center justify-center">
                    <span className="text-5xl font-bold text-emerald-400">0</span>
                  </div>
                </motion.div>
                
                {/* Second 4 */}
                <motion.span
                  className="absolute top-0 left-44 text-8xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  4
                </motion.span>
              </div>
              
              {/* ID Card Icon Floating */}
              <motion.div
                className="absolute -top-4 -right-4"
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                <div className="w-16 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ID</span>
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
            className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            The card you're looking for seems to have been misplaced or never issued. 
            Let's get you back to the main dashboard.
          </motion.p>

          {/* Animated Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            {[
              { label: 'Cards Generated', value: '10K+', color: 'emerald' },
              { label: 'Active Users', value: '500+', color: 'green' },
              { label: 'System Uptime', value: '99.9%', color: 'teal' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-${stat.color}-500/20 rounded-2xl p-6 shadow-xl`}
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <div className={`text-3xl font-bold text-${stat.color}-400 mb-2`}>
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
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
                to="/dashboard"
                className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl text-white font-semibold text-lg shadow-2xl overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Return to Dashboard
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/card-generation"
                className="group relative px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-900 border border-emerald-500/30 rounded-xl text-emerald-400 font-semibold text-lg shadow-xl overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Generate New Card
                </span>
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            className="mt-12 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search for students, cards, or permissions..."
                className="w-full px-6 py-4 bg-gray-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
              />
              <button className="absolute right-2 top-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl text-white hover:from-emerald-600 hover:to-green-700 transition-all duration-300">
                Search
              </button>
            </div>
          </motion.div>

          {/* Footer Note */}
          <motion.p
            className="mt-12 text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            If you believe this is an error, contact the system administrator at{' '}
            <span className="text-emerald-400">admin@capmis.edu</span>
          </motion.p>
        </motion.div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-emerald-400 rounded-full"
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