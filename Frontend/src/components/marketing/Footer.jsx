// components/marketing/Footer.jsx
// Navy footer with real contact info and nav links.
import React from 'react';
import { Link } from 'react-router-dom';

const FOOTER_SECTIONS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'How it Works', href: '#how-it-works' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Blog', href: '#blog' },
      { label: 'Careers', href: '#careers' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Support', href: 'mailto:dusenge.enzo87@gmail.com' },
      { label: 'Phone', href: 'tel:+250793166542' },
      { label: 'Twitter / X', href: '#' },
      { label: 'LinkedIn', href: '#' },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="relative bg-[#070b16] text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-red-700 flex items-center justify-center neon-crimson">
                <i className="pi pi-id-card text-white text-sm" />
              </div>
              <div>
                <div className="font-bold text-white text-base tracking-tight">CARD-AGENT</div>
                <div className="text-[10px] text-slate-400 -mt-0.5">ID Card Platform</div>
              </div>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              The complete platform for designing, generating, and managing professional
              ID cards for schools, universities, and companies.
            </p>
            <div className="mt-5 flex gap-3">
              <a href="tel:+250793166542" className="w-9 h-9 rounded-lg glass flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors" aria-label="Call us">
                <i className="pi pi-phone text-sm" />
              </a>
              <a href="mailto:dusenge.enzo87@gmail.com" className="w-9 h-9 rounded-lg glass flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors" aria-label="Email us">
                <i className="pi pi-envelope text-sm" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') || link.href.startsWith('mailto') || link.href.startsWith('tel') ? (
                      <a
                        href={link.href}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} CARD-AGENT &middot; All rights reserved. Made with ❤️ in Rwanda.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
