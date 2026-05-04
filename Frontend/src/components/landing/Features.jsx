// components/landing/FeaturesSection.jsx
import React from 'react';

const FeaturesSection = () => {
  const features = [
    {
      icon: '👨‍🎓',
      title: 'Student Management',
      description: 'Complete digital records with photos, parent contacts, and automated class organization.',
      color: 'emerald'
    },
    {
      icon: '🪪',
      title: 'ID Card Generator',
      description: 'Professional ID cards with custom templates, batch processing, and instant printing.',
      color: 'green'
    },
    {
      icon: '📝',
      title: 'Permission System',
      description: 'Digital permission slips with SMS notifications and real-time approval tracking.',
      color: 'blue'
    },
    {
      icon: '📱',
      title: 'SMS Integration',
      description: 'Instant TextBee SMS notifications to parents for permissions and updates.',
      color: 'purple'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Real-time insights, reports, and performance metrics for decision making.',
      color: 'indigo'
    },
    {
      icon: '🔄',
      title: 'Bulk Operations',
      description: 'Import/export hundreds of students, generate cards in batches, and automate workflows.',
      color: 'orange'
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Complete{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              School Solution
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to manage your school administration efficiently and professionally.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx}
              className="group p-6 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 animate-on-scroll hover-3d"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={`w-14 h-14 bg-gradient-to-r from-${feature.color}-500 to-${feature.color}-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;