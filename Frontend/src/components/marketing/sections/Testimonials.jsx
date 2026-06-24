// components/marketing/sections/Testimonials.jsx
// Quote cards from (placeholder) customers.
import React from 'react';
import SectionReveal from '../ui/SectionReveal';

const QUOTES = [
  {
    quote: 'We generated 2,400 student ID cards for back-to-school in a single afternoon. What used to take a week now takes hours.',
    name: 'Headteacher',
    org: 'Secondary School, Kigali',
  },
  {
    quote: 'The template designer is genuinely visual — our team designs the card, maps the fields, and the batch does the rest. Zero hand-editing.',
    name: 'IT Manager',
    org: 'University, Rwanda',
  },
  {
    quote: 'Real-time progress on every batch meant we could watch thousands of staff cards render live. The audit trail gives our admin full confidence.',
    name: 'Operations Lead',
    org: 'Corporate Group',
  },
];

const Testimonials = () => {
  return (
    <section className="relative section-pad bg-marketing overflow-hidden">
      <div className="absolute inset-0 bg-line-grid opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-rose-200 glass mb-4">
            Loved by teams
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Built for the people who{' '}
            <span className="text-crimson-gradient">actually run it</span>
          </h2>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {QUOTES.map((q, i) => (
            <SectionReveal key={i} delay={i * 0.1}>
              <figure className="h-full rounded-2xl glass-card p-6 flex flex-col">
                <i className="pi pi-quote-left text-red-500/60 text-2xl mb-3" />
                <blockquote className="text-slate-200 leading-relaxed flex-1">"{q.quote}"</blockquote>
                <figcaption className="mt-5 pt-4 border-t border-white/10">
                  <div className="text-sm font-semibold text-white">{q.name}</div>
                  <div className="text-xs text-slate-400">{q.org}</div>
                </figcaption>
              </figure>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
