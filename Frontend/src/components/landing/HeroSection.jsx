// components/landing/HeroSection.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef(null);
  const diagramRef = useRef(null);

  // Animation steps for the 3D diagram
  const steps = [
    { id: 0, title: 'Student Registration', desc: 'Add students with photos & parent contacts' },
    { id: 1, title: 'ID Card Generation', desc: 'Create professional ID cards instantly' },
    { id: 2, title: 'Permission Management', desc: 'Digital slips with SMS notifications' },
    { id: 3, title: 'Real-time Tracking', desc: 'Monitor attendance and permissions' },
  ];

  // Mouse movement effect for 3D perspective
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current || !diagramRef.current) return;
      
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      
      diagramRef.current.style.transform = `
        perspective(1000px)
        rotateY(${x * 10}deg)
        rotateX(${-y * 10}deg)
        scale3d(1, 1, 1)
      `;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  // Auto-cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 gap-4 h-full">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className="border-r border-b border-emerald-500/20"></div>
            ))}
          </div>
        </div>
        
        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-emerald-400 rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${6 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
        
        {/* Light Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white animate-fade-in">
            <div className="flex items-center mb-8">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl animate-float">
                  <span className="text-white font-bold text-2xl">C</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
              <div className="ml-4">
                <h1 className="text-5xl font-bold">CAP_mis</h1>
                <p className="text-emerald-300 text-sm font-medium">Card Attendance & Permission MIS</p>
              </div>
            </div>

            <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Transform Your School's{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Digital Future
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 mb-10 max-w-xl">
              A complete 3D-animated platform that revolutionizes student management, ID card generation, and permission tracking for modern schools.
            </p>

            {/* Interactive Steps */}
            <div className="mb-8">
              <div className="flex space-x-4 mb-4">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(index)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      activeStep === index
                        ? 'bg-emerald-600 text-white scale-105'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Step {index + 1}
                  </button>
                ))}
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-2">{steps[activeStep].title}</h3>
                <p className="text-gray-300">{steps[activeStep].desc}</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl overflow-hidden transform hover:scale-105 transition-all duration-300"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              <button className="group relative px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-emerald-500 overflow-hidden transform hover:scale-105 transition-all duration-300">
                <span className="relative z-10">Watch 3D Demo</span>
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-1">500+</div>
                <div className="text-sm text-gray-400">Cards/Day</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-1">98%</div>
                <div className="text-sm text-gray-400">Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-1">70%</div>
                <div className="text-sm text-gray-400">Time Saved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-1">24/7</div>
                <div className="text-sm text-gray-400">Support</div>
              </div>
            </div>
          </div>

          {/* Right - 3D Diagram */}
          <div 
            ref={containerRef}
            className="relative h-[600px] lg:h-[700px] flex items-center justify-center perspective-1000"
          >
            <div 
              ref={diagramRef}
              className="relative w-full h-full transition-transform duration-300 ease-out"
            >
              {/* Central Hub */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full shadow-2xl flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-emerald-600 font-bold text-2xl">CAP</span>
                  </div>
                </div>
              </div>

              {/* Orbiting Nodes */}
              {steps.map((step, index) => {
                const angle = (index / steps.length) * 2 * Math.PI;
                const radius = 200;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                return (
                  <div
                    key={step.id}
                    className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
                      activeStep === index ? 'scale-110' : 'scale-100'
                    }`}
                    style={{
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) ${
                        activeStep === index ? 'scale(1.1)' : 'scale(1)'
                      }`,
                    }}
                  >
                    {/* Connection Line */}
                    <div
                      className="absolute top-1/2 left-1/2 w-24 h-1 bg-gradient-to-r from-emerald-500/50 to-green-500/50 origin-left"
                      style={{
                        transform: `rotate(${angle * (180 / Math.PI)}deg)`,
                        width: `${radius}px`,
                      }}
                    ></div>
                    
                    {/* Node */}
                    <div
                      className={`relative w-32 h-32 rounded-2xl transition-all duration-500 ${
                        activeStep === index
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-2xl shadow-emerald-500/50'
                          : 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg'
                      }`}
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur opacity-30"></div>
                      <div className="relative w-full h-full rounded-2xl bg-gray-900 p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl mb-2">
                          {index === 0 && '👨‍🎓'}
                          {index === 1 && '🪪'}
                          {index === 2 && '📝'}
                          {index === 3 && '📊'}
                        </div>
                        <h3 className="text-sm font-semibold text-white text-center">{step.title}</h3>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Data Flow Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {steps.map((_, index) => {
                  const nextIndex = (index + 1) % steps.length;
                  const angle1 = (index / steps.length) * 2 * Math.PI;
                  const angle2 = (nextIndex / steps.length) * 2 * Math.PI;
                  const radius = 200;
                  const x1 = Math.cos(angle1) * radius;
                  const y1 = Math.sin(angle1) * radius;
                  const x2 = Math.cos(angle2) * radius;
                  const y2 = Math.sin(angle2) * radius;
                  
                  return (
                    <line
                      key={index}
                      x1={`${50 + (x1 / 4)}%`}
                      y1={`${50 + (y1 / 4)}%`}
                      x2={`${50 + (x2 / 4)}%`}
                      y2={`${50 + (y2 / 4)}%`}
                      stroke="url(#gradient)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.5"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="20"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </line>
                  );
                })}
                
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Floating Elements */}
              <div className="absolute top-20 left-20 w-6 h-6 bg-emerald-400 rounded-full opacity-60 animate-float-slow"></div>
              <div className="absolute bottom-32 right-32 w-8 h-8 bg-green-500 rounded-full opacity-40 animate-float-fast"></div>
              <div className="absolute top-40 right-20 w-4 h-4 bg-emerald-300 rounded-full opacity-70 animate-float"></div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="text-emerald-400 text-center">
            <div className="mb-2">Scroll to explore</div>
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;