// components/marketing/MarketingLayout.jsx
// The full public marketing page: Navbar + sections + Footer, with Lenis smooth scroll.
import React, { useEffect } from 'react';
import Lenis from 'lenis';
import Navbar from './Navbar';
import Footer from './Footer';
import Hero from './sections/Hero';
import TrustStrip from './sections/TrustStrip';
import Features from './sections/Features';
import HowItWorks from './sections/HowItWorks';
import CardShowcase from './sections/CardShowcase';
import Stats from './sections/Stats';
import Pricing from './sections/Pricing';
import Testimonials from './sections/Testimonials';
import FAQ from './sections/FAQ';
import FinalCTA from './sections/FinalCTA';

const MarketingLayout = () => {
  // Buttery smooth scrolling (respects reduced-motion via CSS guard on html)
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-marketing text-white selection:bg-red-600/40">
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <CardShowcase />
        <Stats />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default MarketingLayout;
