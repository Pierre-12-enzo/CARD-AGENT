// components/marketing/sections/Stats.jsx
// Animated count-up stats band.
import React from 'react';
import SectionReveal from '../ui/SectionReveal';
import AnimatedCounter from '../ui/AnimatedCounter';

const STATS = [
  { value: 50000, suffix: '+', label: 'Cards generated', decimals: 0 },
  { value: 120, suffix: '+', label: 'Organizations onboarded', decimals: 0 },
  { value: 99.9, suffix: '%', label: 'Platform uptime', decimals: 1 },
  { value: 60, suffix: '%', label: 'Faster than manual', decimals: 0 },
];

const Stats = () => {
  return (
    <section className="relative py-16 bg-marketing border-y border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-40" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <SectionReveal key={s.label} delay={i * 0.08} className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-crimson-gradient">
                <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.decimals} />
              </div>
              <div className="mt-2 text-sm text-slate-400">{s.label}</div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
