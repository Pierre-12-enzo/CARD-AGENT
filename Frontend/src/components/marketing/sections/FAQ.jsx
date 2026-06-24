// components/marketing/sections/FAQ.jsx
// Accessible accordion of common questions.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionReveal from '../ui/SectionReveal';

const FAQS = [
  {
    q: 'How long does it take to set up?',
    a: 'Minutes. Register your company, add an organization, design a template, and you can generate your first card right away. Bulk import via CSV + photo ZIP turns thousands of records into cards in one run.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. CARD-AGENT runs entirely in your browser. Everything — template design, batch generation, audit logs — is web-based and works on any modern browser.',
  },
  {
    q: 'What format are the generated cards?',
    a: 'Print-ready PNGs at high resolution, zipped per person with separate front-side and back-side files. Two-sided templates produce both sides automatically.',
  },
  {
    q: 'Can different staff members have different access?',
    a: 'Yes. There are three roles — super admin, company admin, and co-worker — and co-workers get granular per-organization permissions (generate cards, upload photos, manage students, view audit logs, and more).',
  },
  {
    q: 'Is my data secure?',
    a: 'Authentication is JWT-based with role enforcement on every request, and every action is written to an immutable audit trail. Photos and assets are stored securely and managed per organization.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. Plans are subscription-based and you can upgrade, downgrade or cancel at any time. Your data stays yours.',
  },
];

const FAQItem = ({ item, isOpen, onToggle, index }) => (
  <SectionReveal delay={index * 0.05}>
    <div className="rounded-2xl glass overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-white">{item.q}</span>
        <i className={`pi ${isOpen ? 'pi-minus' : 'pi-plus'} text-red-400 transition-transform`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="px-5 sm:px-6 pb-5 text-slate-400 leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </SectionReveal>
);

const FAQ = () => {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative section-pad bg-marketing overflow-hidden">
      <div className="aurora-blob w-96 h-96 bg-red-700/15 top-1/4 right-0" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-rose-200 glass mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Questions,{' '}
            <span className="text-crimson-gradient">answered</span>
          </h2>
        </SectionReveal>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <FAQItem
              key={i}
              index={i}
              item={item}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
