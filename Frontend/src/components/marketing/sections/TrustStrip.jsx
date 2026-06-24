// components/marketing/sections/TrustStrip.jsx
// Marquee strip of "trusted by" organization types.
import React from 'react';

const ORGS = [
  'Secondary Schools', 'Universities', 'TVET Institutes', 'Corporate HQs',
  'Primary Schools', 'Government Agencies', 'Hospitals', 'NGOs',
];

const TrustStrip = () => {
  // Duplicate the list for a seamless loop
  const items = [...ORGS, ...ORGS];
  return (
    <section className="relative py-10 border-y border-white/5 bg-marketing overflow-hidden">
      <div className="text-center text-xs uppercase tracking-[0.25em] text-slate-500 mb-6">
        Built for organizations of every kind
      </div>
      <div className="relative overflow-hidden no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-12">
          {items.map((label, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400 whitespace-nowrap">
              <i className="pi pi-building text-red-500/70" />
              <span className="text-base font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
