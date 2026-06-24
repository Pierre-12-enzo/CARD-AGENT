// components/marketing/sections/HowItWorks.jsx
// Four-step scroll-reveal flow with an animated connecting line.
import React from 'react';
import SectionReveal from '../ui/SectionReveal';

const STEPS = [
  { n: '01', icon: 'pi pi-user-plus', title: 'Create your workspace', body: 'Register your company and add the organizations (schools, departments) you manage.' },
  { n: '02', icon: 'pi pi-pencil', title: 'Design a template', body: 'Visually place text, photo and QR fields on a front/back card layout. Save and reuse it.' },
  { n: '03', icon: 'pi pi-cloud-upload', title: 'Import your people', body: 'Bulk-import students or staff via CSV + photo ZIP, or add them one by one.' },
  { n: '04', icon: 'pi pi-print', title: 'Generate & download', body: 'Pick a template, run single or batch generation, and download a print-ready ZIP.' },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative section-pad bg-marketing overflow-hidden">
      <div className="absolute inset-0 bg-line-grid opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-rose-200 glass mb-4">
            How it works
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            From zero to printed cards in{' '}
            <span className="text-crimson-gradient">four steps</span>
          </h2>
        </SectionReveal>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <SectionReveal key={s.n} delay={i * 0.12}>
                <div className="relative text-center lg:text-left">
                  {/* Node */}
                  <div className="relative mx-auto lg:mx-0 mb-6 w-16 h-16 rounded-2xl glass-card flex items-center justify-center neon-crimson">
                    <i className={`${s.icon} text-2xl text-red-400`} />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-red-500/80 mb-1">{s.n}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{s.body}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
