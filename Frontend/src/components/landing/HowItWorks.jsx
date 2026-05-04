// components/landing/HowItWorksSection.jsx
import React from 'react';

const HowItWorksSection = () => {
  const steps = [
    { number: '01', title: 'Register & Setup', description: 'Create your account and configure school settings in minutes.', icon: '⚙️' },
    { number: '02', title: 'Add Students', description: 'Import student data via CSV or add individually with photos.', icon: '📥' },
    { number: '03', title: 'Generate Cards', description: 'Create professional ID cards using our template designer.', icon: '🖨️' },
    { number: '04', title: 'Manage Daily', description: 'Handle permissions, track attendance, and send notifications.', icon: '📱' },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 to-green-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How It{' '}
            <span className="text-emerald-600">Works</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get started in four simple steps and transform your school administration today.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className="relative group animate-on-scroll"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 group-hover:border-emerald-300 transition-all duration-300 group-hover:shadow-2xl h-full">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span className="text-white text-2xl">{step.icon}</span>
                </div>
                <div className="text-4xl font-bold text-gray-300 mb-3 text-center">{step.number}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">{step.title}</h3>
                <p className="text-gray-600 text-center">{step.description}</p>
              </div>
              
              {/* Connecting Arrow (except last) */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                  <div className="text-emerald-400 text-2xl">→</div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Timeline for mobile */}
        <div className="mt-12 lg:hidden">
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-emerald-400 to-green-500 opacity-30"></div>
            <div className="space-y-12">
              {steps.map((step, idx) => (
                <div key={idx} className="relative flex items-center">
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center border-4 border-white">
                    <span className="text-white text-sm font-bold">{step.number}</span>
                  </div>
                  <div className={`w-1/2 ${idx % 2 === 0 ? 'pr-8 text-right' : 'pl-8'}`}>
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                      <div className="text-2xl mb-2">{step.icon}</div>
                      <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-600 text-sm">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;