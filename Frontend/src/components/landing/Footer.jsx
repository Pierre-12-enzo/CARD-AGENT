// components/landing/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="animate-on-scroll">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">CAP_mis</h3>
                <p className="text-sm text-gray-400">Smart School Administration</p>
              </div>
            </div>
            <p className="text-gray-400">
              Transforming school administration with modern technology solutions.
            </p>
          </div>
          
          <div className="animate-on-scroll" style={{ animationDelay: '0.1s' }}>
            <h4 className="text-lg font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              <li><Link to="/documentation" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
              <li><a href="#api" className="text-gray-400 hover:text-white transition-colors">API</a></li>
            </ul>
          </div>
          
          <div className="animate-on-scroll" style={{ animationDelay: '0.2s' }}>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#blog" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#careers" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div className="animate-on-scroll" style={{ animationDelay: '0.3s' }}>
            <h4 className="text-lg font-semibold mb-4">Connect</h4>
            <ul className="space-y-2">
              <li><Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">Login</Link></li>
              <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors">Register</Link></li>
              <li><a href="mailto:dusenge.enzo87@gmail.com" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
              <li><a href="tel:+250793166542" className="text-gray-400 hover:text-white transition-colors">+250 793 166 542</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm animate-on-scroll" style={{ animationDelay: '0.4s' }}>
          <p>&copy; {new Date().getFullYear()} CAP_mis. All rights reserved. Made with ❤️ for schools worldwide.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;