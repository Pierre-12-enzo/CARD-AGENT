// components/marketing/sections/Pricing.jsx
// Four pricing tiers mirroring the existing license TIERS. CTA routes to /register
// for now; Phase 2 will wire these to Paystack checkout.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SectionReveal from '../ui/SectionReveal';

// Billing toggle (monthly/annual). Prices are placeholders until Paystack is wired.
const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For a single school getting started',
    monthly: 15,
    annual: 12,
    currency: '$',
    maxOrgs: 5,
    maxCards: '5,000',
    features: [
      'Up to 5 organizations',
      '5,000 cards / month',
      'Visual template designer',
      'CSV + photo bulk import',
      'Role-based co-workers',
      'Email support',
    ],
    cta: 'Start with Basic',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing schools & companies',
    monthly: 49,
    annual: 39,
    currency: '$',
    maxOrgs: 20,
    maxCards: '50,000',
    features: [
      'Up to 20 organizations',
      '50,000 cards / month',
      'Two-sided card templates',
      'Real-time batch progress',
      'Audit trail & exports',
      'Priority support',
    ],
    cta: 'Choose Pro',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For large institutions & networks',
    monthly: 149,
    annual: 119,
    currency: '$',
    maxOrgs: 100,
    maxCards: 'Unlimited',
    features: [
      'Up to 100 organizations',
      'Unlimited cards / month',
      'Advanced permissions',
      'Dedicated onboarding',
      'Custom branding',
      'SLA & dedicated support',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    tagline: 'No limits, full power',
    monthly: null, // custom
    annual: null,
    currency: '',
    maxOrgs: '∞',
    maxCards: '∞',
    features: [
      'Unlimited organizations',
      'Unlimited cards',
      'All features unlocked',
      'White-glove migration',
      'On-prem option available',
      '24/7 priority support',
    ],
    cta: 'Talk to us',
    highlighted: false,
  },
];

const PriceLabel = ({ plan, annual }) => {
  if (plan.monthly === null) {
    return <span className="text-3xl font-bold text-white">Custom</span>;
  }
  const price = annual ? plan.annual : plan.monthly;
  return (
    <span className="text-4xl font-bold text-white">
      {plan.currency}{price}
      <span className="text-base font-normal text-slate-400">/mo</span>
    </span>
  );
};

const Pricing = () => {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="relative section-pad bg-marketing overflow-hidden">
      <div className="aurora-blob w-96 h-96 bg-red-700/15 bottom-0 left-1/2 -translate-x-1/2" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-rose-200 glass mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Simple plans that{' '}
            <span className="text-crimson-gradient">scale with you</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Start free. Upgrade when you need more organizations or cards.
          </p>
        </SectionReveal>

        {/* Billing toggle */}
        <SectionReveal className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm ${!annual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
          <button
            type="button"
            onClick={() => setAnnual((v) => !v)}
            className="relative w-14 h-7 rounded-full glass border border-white/10"
            aria-label="Toggle annual billing"
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-red-600 transition-transform ${annual ? 'translate-x-7' : 'translate-x-1'}`}
            />
          </button>
          <span className={`text-sm ${annual ? 'text-white' : 'text-slate-500'}`}>
            Annual <span className="text-red-400">(save 20%)</span>
          </span>
        </SectionReveal>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan, i) => (
            <SectionReveal key={plan.id} delay={i * 0.07}>
              <div
                className={`relative h-full rounded-2xl p-6 flex flex-col ${
                  plan.highlighted
                    ? 'glass-card neon-crimson lg:-translate-y-3'
                    : 'glass'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-semibold">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-400 min-h-[40px]">{plan.tagline}</p>
                <div className="mt-4 mb-1">
                  <PriceLabel plan={plan} annual={annual} />
                </div>
                <div className="text-xs text-slate-500 mb-6">
                  {plan.monthly !== null && annual ? 'billed annually' : plan.monthly !== null ? 'billed monthly' : '\u00A0'}
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <i className="pi pi-check text-red-500 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`w-full text-center px-4 py-3 rounded-xl font-semibold transition-colors ${
                    plan.highlighted
                      ? 'btn-primary neon-crimson text-white'
                      : 'glass border border-white/15 text-white hover:border-red-500/40'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </SectionReveal>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-10">
          All plans include the template designer, audit trail and real-time batch progress.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
