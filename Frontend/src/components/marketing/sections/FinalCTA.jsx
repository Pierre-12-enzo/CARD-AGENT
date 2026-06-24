// components/marketing/sections/FinalCTA.jsx
// Big closing call-to-action panel.
import React from 'react';
import { Link } from 'react-router-dom';
import SectionReveal from '../ui/SectionReveal';

const FinalCTA = () => {
  return (
    <section className="relative section-pad bg-marketing overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="relative rounded-3xl glass-strong neon-crimson px-6 py-16 sm:px-16 text-center overflow-hidden">
            {/* Inner glow */}
            <div className="aurora-blob w-80 h-80 bg-red-600/30 -top-20 -left-10" />
            <div className="aurora-blob w-72 h-72 bg-rose-500/20 -bottom-16 -right-10" style={{ animationDelay: '3s' }} />

            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-bold text-white">
                Ready to issue your first{' '}
                <span className="text-shimmer">1,000 cards?</span>
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-xl mx-auto">
                Set up your workspace and design your first template in minutes.
                No credit card needed to get started.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl btn-primary font-semibold neon-crimson"
                >
                  Get started free
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-white border border-white/15 glass hover:border-red-500/40 transition-colors"
                >
                  I already have an account
                </Link>
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
};

export default FinalCTA;
