// components/marketing/sections/Hero.jsx
// Hero: headline + CTAs layered over the 3D floating-cards scene (lazy-loaded).
import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Heavy WebGL chunk is split into its own bundle
const HeroScene = lazy(() => import('../three/HeroScene'));

// Lightweight fallback shown while 3D loads (also the reduced-motion path)
const SceneFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="relative w-56 h-36 rounded-2xl glass-card neon-crimson animate-float-slow rotate-[-8deg]" />
    <div className="absolute right-10 top-16 w-52 h-32 rounded-2xl glass-card animate-float-fast rotate-[10deg]" />
    <div className="aurora-blob w-72 h-72 bg-red-600/30 -z-10" />
  </div>
);

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-marketing">
      {/* Background atmospherics */}
      <div className="absolute inset-0 bg-line-grid opacity-40" />
      <div className="aurora-blob w-[40rem] h-[40rem] bg-red-700/20 top-[-10rem] left-[-8rem]" />
      <div className="aurora-blob w-[32rem] h-[32rem] bg-rose-600/15 bottom-[-8rem] right-[-6rem]" style={{ animationDelay: '4s' }} />

      {/* 3D scene layer (behind content) */}
      <div className="absolute inset-0">
        <Suspense fallback={<SceneFallback />}>
          <HeroScene />
        </Suspense>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 pb-20 text-center">
        {/* Announcement pill */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs sm:text-sm text-rose-200 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Now with real-time batch generation &amp; audit trails
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.05]"
        >
          Design &amp; generate{' '}
          <span className="text-shimmer">professional ID cards</span>{' '}
          at scale.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto"
        >
          The complete platform for schools, universities, and companies to design
          templates, import thousands of records, and print-ready cards in minutes —
          not days.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/register"
            className="group relative w-full sm:w-auto px-8 py-4 rounded-xl btn-primary font-semibold text-base neon-crimson"
          >
            Start free
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base text-white border border-white/15 glass hover:border-red-500/40 transition-colors"
          >
            See how it works
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400"
        >
          <span className="inline-flex items-center gap-2"><i className="pi pi-check-circle text-red-500" /> No credit card to start</span>
          <span className="inline-flex items-center gap-2"><i className="pi pi-check-circle text-red-500" /> Batch from CSV + ZIP</span>
          <span className="inline-flex items-center gap-2"><i className="pi pi-check-circle text-red-500" /> Real-time progress</span>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 animate-bounce hidden sm:block">
        <i className="pi pi-chevron-down text-lg" />
      </div>
    </section>
  );
};

export default Hero;
