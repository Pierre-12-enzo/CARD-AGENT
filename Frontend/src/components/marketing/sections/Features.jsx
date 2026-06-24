// components/marketing/sections/Features.jsx
// Glass bento grid of accurate product features with 3D tilt cards.
import React from 'react';
import SectionReveal from '../ui/SectionReveal';
import TiltCard from '../ui/TiltCard';

const FEATURES = [
  {
    icon: 'pi pi-pencil',
    title: 'Visual Template Designer',
    body: 'Drag-and-drop text, photo, QR and barcode fields onto your card. Set fonts, colors and positions visually — what you design is exactly what prints.',
    span: 'lg:col-span-2',
  },
  {
    icon: 'pi pi-file-excel',
    title: 'Bulk CSV + Photo Import',
    body: 'Upload a CSV and a photo ZIP; we match names, create records and generate every card in one run.',
    span: '',
  },
  {
    icon: 'pi pi-sliders-h',
    title: 'Dynamic Fields',
    body: 'Student or employee fields, computed expressions and conditional rules — render exactly the right data per person.',
    span: '',
  },
  {
    icon: 'pi pi-bolt',
    title: 'Real-time Batch Progress',
    body: 'Live Socket.IO progress for every batch — see current card, percentage, failures and skips as they happen.',
    span: '',
  },
  {
    icon: 'pi pi-shield',
    title: 'Role-based Permissions',
    body: 'Super admin, company admin and per-organization co-workers with granular, auditable permissions.',
    span: '',
  },
  {
    icon: 'pi pi-history',
    title: 'Full Audit Trail',
    body: 'Every generation, login and change is logged. Filterable, exportable history you can trust.',
    span: 'lg:col-span-2',
  },
];

const Features = () => {
  return (
    <section id="features" className="relative section-pad bg-marketing overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-50" />
      <div className="aurora-blob w-96 h-96 bg-red-700/15 top-1/3 -left-20" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <SectionReveal className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-rose-200 glass mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Everything you need to{' '}
            <span className="text-crimson-gradient">issue cards at scale</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            A complete pipeline from template design to printed card — without the manual busywork.
          </p>
        </SectionReveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <SectionReveal key={f.title} delay={i * 0.07} className={f.span}>
              <div className="group h-full">
                <TiltCard className="h-full">
                  <div className="relative h-full rounded-2xl glass-card p-6 sm:p-7">
                    {/* Icon chip */}
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-600/15 border border-red-500/30 text-red-400 text-xl mb-5 group-hover:neon-crimson transition-shadow">
                      <i className={f.icon} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{f.body}</p>
                  </div>
                </TiltCard>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
