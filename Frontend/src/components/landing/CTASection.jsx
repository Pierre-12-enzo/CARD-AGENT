// components/landing/CTASection.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-600 to-green-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-on-scroll">
          Ready to Transform Your School?
        </h2>
        <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto animate-on-scroll" style={{ animationDelay: '0.2s' }}>
          Join hundreds of schools already using CAP_mis to streamline administration and enhance parent communication.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-on-scroll" style={{ animationDelay: '0.4s' }}>
          <Link
            to="/login"
            className="px-8 py-4 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-2xl"
          >
            Start Free Trial
          </Link>
          <Link
            to="/documentation"
            className="px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white hover:bg-white/10 transform hover:scale-105 transition-all duration-300"
          >
            View Documentation
          </Link>
        </div>
        <p className="mt-6 text-emerald-200 animate-on-scroll" style={{ animationDelay: '0.6s' }}>
          No credit card required • 14-day free trial • Full support included
        </p>
      </div>
    </section>
  );
};

export default CTASection;