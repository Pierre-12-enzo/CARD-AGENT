// components/landing/LandingPage.jsx
import React from 'react';
import HeroSection from './HeroSection';
import Features from './Features';
import HowItWorks from './HowItWorks';
import CTASection from './CTASection';
import Footer from './Footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <Features />
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;