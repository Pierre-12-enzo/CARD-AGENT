// components/marketing/sections/CardShowcase.jsx
// Visual showcase of sample generated ID cards (CSS-built, no assets needed).
import React from 'react';
import SectionReveal from '../ui/SectionReveal';

// A single sample card rendered with pure CSS (front + back variants)
const SampleCard = ({ variant = 'front', theme = 'crimson' }) => {
  const accent = theme === 'crimson' ? '#dc2626' : '#f87171';
  if (variant === 'back') {
    return (
      <div className="relative w-full aspect-[1.586/1] rounded-2xl glass-card p-4 overflow-hidden">
        <div className="absolute inset-0 bg-line-grid opacity-20" />
        <div className="relative flex flex-col h-full">
          <div className="text-[10px] tracking-widest text-red-400 font-mono">AUTHORIZED ACCESS</div>
          <div className="mt-auto">
            <div className="flex gap-0.5 items-end h-8">
              {Array.from({ length: 22 }).map((_, i) => (
                <div key={i} className="bg-slate-300/80" style={{ width: 2, height: `${30 + (i * 7) % 70}%` }} />
              ))}
            </div>
            <div className="mt-2 text-[9px] text-slate-400 font-mono">0000 1827 5631 CAP</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-[1.586/1] rounded-2xl glass-card p-4 overflow-hidden neon-crimson">
      <div className="absolute inset-0 bg-line-grid opacity-20" />
      <div className="relative flex gap-3 h-full">
        {/* Photo chip */}
        <div className="w-1/4 aspect-square rounded-lg" style={{ background: `linear-gradient(135deg, ${accent}, #7f1d1d)` }} />
        {/* Details */}
        <div className="flex-1 flex flex-col">
          <div className="text-[10px] tracking-widest text-red-400 font-mono">CAP_mis ID</div>
          <div className="mt-1 h-2 w-3/4 rounded bg-white/70" />
          <div className="mt-1.5 h-1.5 w-1/2 rounded bg-white/30" />
          <div className="mt-auto">
            <div className="h-1 w-2/3 rounded bg-white/20 mb-1" />
            <div className="h-1 w-1/2 rounded bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
};

const SHOWCASE = [
  { v: 'front', t: 'crimson' },
  { v: 'back', t: 'rose' },
  { v: 'front', t: 'rose' },
  { v: 'back', t: 'crimson' },
  { v: 'front', t: 'crimson' },
  { v: 'back', t: 'rose' },
];

const CardShowcase = () => {
  const loop = [...SHOWCASE, ...SHOWCASE];
  return (
    <section className="relative section-pad bg-marketing overflow-hidden">
      <div className="aurora-blob w-96 h-96 bg-red-700/15 top-10 right-0" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
        <SectionReveal className="text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-rose-200 glass mb-4">
            Output quality
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Print-ready cards,{' '}
            <span className="text-crimson-gradient">every single time</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Crisp PNGs at print resolution, single-sided or two-sided, zipped per person.
          </p>
        </SectionReveal>
      </div>

      {/* Marquee row */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max gap-6 animate-marquee px-4">
          {loop.map((s, i) => (
            <div key={i} className="w-64 sm:w-72 shrink-0">
              <SampleCard variant={s.v} theme={s.t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CardShowcase;
