// components/dashboard/Documentation.jsx
import React, { useState } from 'react';
import {  motion, AnimatePresence } from 'framer-motion';

const Documentation = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  const sections = [
    { id: 'overview', title: 'System Overview', icon: 'pi-home' },
    { id: 'getting-started', title: 'Getting Started', icon: 'pi-play' },
    { id: 'students', title: 'Student Management', icon: 'pi-users' },
    { id: 'templates', title: 'ID Card Templates', icon: 'pi-image' },
    { id: 'permissions', title: 'Permission Slips', icon: 'pi-file' },
    { id: 'sms', title: 'SMS Notifications', icon: 'pi-send' },
    { id: 'reports', title: 'Reports & Analytics', icon: 'pi-chart-bar' },
    { id: 'import-export', title: 'Import/Export', icon: 'pi-database' },
    { id: 'printing', title: 'Printing', icon: 'pi-print' },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: 'pi-wrench' },
    { id: 'faq', title: 'FAQ', icon: 'pi-question-circle' },
    { id: 'support', title: 'Support', icon: 'pi-lifebelt' }
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              CAP_mis Documentation
            </h1>
            <p className="text-gray-600 text-lg">
              Complete guide to using the Student Management & ID Card System
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <i className="pi pi-search absolute left-3 top-2.5 text-gray-400"></i>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
            Version 1.0.0
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Updated: December 2024
          </span>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
            MERN Stack
          </span>
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
            For School Administrators
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-4 md:p-6 sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Documentation</h3>
              <span className="text-sm text-gray-500">{filteredSections.length} sections</span>
            </div>
            
            <nav className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all ${
                    activeSection === section.id
                      ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <i className={`pi ${section.icon}`}></i>
                  <span className="text-left">{section.title}</span>
                </button>
              ))}
              
              {filteredSections.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <i className="pi pi-search mb-2 text-xl"></i>
                  <p>No sections found</p>
                </div>
              )}
            </nav>
            
            {/* Quick Stats */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
              <div className="space-y-2">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 text-sm text-emerald-600 hover:text-emerald-700 w-full text-left"
                >
                  <i className="pi pi-print"></i>
                  <span>Print this Guide</span>
                </button>
                <a 
                  href="#support" 
                  onClick={() => setActiveSection('support')}
                  className="flex items-center space-x-2 text-sm text-emerald-600 hover:text-emerald-700"
                >
                  <i className="pi pi-exclamation-circle"></i>
                  <span>Report an Issue</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderSectionContent(activeSection)}
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <div className="flex justify-between">
                <button 
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) setActiveSection(sections[currentIndex - 1].id);
                  }}
                  className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700"
                >
                  <i className="pi pi-chevron-left"></i>
                  <span>Previous</span>
                </button>
                
                <button 
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex < sections.length - 1) setActiveSection(sections[currentIndex + 1].id);
                  }}
                  className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700"
                >
                  <span>Next</span>
                  <i className="pi pi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== SECTION COMPONENTS ====================

const OverviewSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">System Overview</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-home text-white text-xl"></i>
      </div>
    </div>
    
    <div className="prose max-w-none">
      <p className="text-lg text-gray-700 mb-6">
        CAP_mis (Complete Administrative Platform for Management Information System) is a comprehensive 
        web-based solution designed specifically for educational institutions to streamline student 
        administration, enhance communication, and improve operational efficiency.
      </p>
      
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 mb-8">
        <h3 className="text-xl font-semibold text-blue-900 mb-4">🎯 Key Objectives</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <i className="pi pi-check-circle text-blue-600 mt-1"></i>
            <span>Digitize student records and ID cards</span>
          </div>
          <div className="flex items-start space-x-3">
            <i className="pi pi-check-circle text-blue-600 mt-1"></i>
            <span>Automate permission slip management</span>
          </div>
          <div className="flex items-start space-x-3">
            <i className="pi pi-check-circle text-blue-600 mt-1"></i>
            <span>Enable real-time parent communication</span>
          </div>
          <div className="flex items-start space-x-3">
            <i className="pi pi-check-circle text-blue-600 mt-1"></i>
            <span>Generate comprehensive reports and analytics</span>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-6">✨ Core Features</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <FeatureCard
          icon="pi-users"
          title="Student Management"
          description="Complete CRUD operations for student records with photo management"
        />
        <FeatureCard
          icon="pi-id-card"
          title="ID Card Generation"
          description="Dynamic ID card generation with custom templates and batch processing"
        />
        <FeatureCard
          icon="pi-file-edit"
          title="Permission Slips"
          description="Digital permission slips with approval workflow and SMS notifications"
        />
        <FeatureCard
          icon="pi-send"
          title="SMS Integration"
          description="Automated SMS notifications to parents via TextBee API"
        />
        <FeatureCard
          icon="pi-chart-bar"
          title="Analytics Dashboard"
          description="Real-time analytics, charts, and performance metrics"
        />
        <FeatureCard
          icon="pi-database"
          title="Import/Export"
          description="Bulk data import via CSV and export to multiple formats"
        />
        <FeatureCard
          icon="pi-print"
          title="Printing System"
          description="Print permission slips, reports, and ID cards"
        />
        <FeatureCard
          icon="pi-cloud"
          title="Cloud Storage"
          description="Cloudinary integration for secure media storage"
        />
        <FeatureCard
          icon="pi-shield"
          title="Security & Backup"
          description="Role-based access, data encryption, and cleanup tools"
        />
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">🏗️ System Architecture</h3>
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Technology Stack</h4>
            <p className="text-gray-600">Modern MERN stack with cloud services integration</p>
          </div>
          <i className="pi pi-server text-gray-500 text-2xl"></i>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <TechStackItem 
            name="React.js" 
            description="Frontend framework"
            color="bg-blue-100 text-blue-800"
            icon="pi pi-desktop"
          />
          <TechStackItem 
            name="Node.js" 
            description="Backend runtime"
            color="bg-green-100 text-green-800"
            icon="pi pi-server"
          />
          <TechStackItem 
            name="MongoDB" 
            description="Database"
            color="bg-emerald-100 text-emerald-800"
            icon="pi pi-database"
          />
          <TechStackItem 
            name="Express.js" 
            description="Backend framework"
            color="bg-gray-100 text-gray-800"
            icon="pi pi-code"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TechStackItem 
            name="Cloudinary" 
            description="Media storage"
            color="bg-yellow-100 text-yellow-800"
            icon="pi pi-cloud"
          />
          <TechStackItem 
            name="TextBee" 
            description="SMS service"
            color="bg-purple-100 text-purple-800"
            icon="pi pi-send"
          />
          <TechStackItem 
            name="Render" 
            description="Backend hosting"
            color="bg-orange-100 text-orange-800"
            icon="pi pi-hosting"
          />
          <TechStackItem 
            name="Vercel" 
            description="Frontend hosting"
            color="bg-black text-white"
            icon="pi pi-globe"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200 mt-8">
        <h3 className="text-xl font-semibold text-emerald-900 mb-4">👥 User Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <i className="pi pi-user text-emerald-600"></i>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">School Administrator</h4>
                <p className="text-sm text-gray-600">Full system access</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center space-x-2">
                <i className="pi pi-check text-emerald-600 text-xs"></i>
                <span>Manage all students and staff</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="pi pi-check text-emerald-600 text-xs"></i>
                <span>Configure system settings</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="pi pi-check text-emerald-600 text-xs"></i>
                <span>Generate reports and analytics</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="pi pi-check text-emerald-600 text-xs"></i>
                <span>Approve permission slips</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="pi pi-user-plus text-blue-600"></i>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Staff (Coming Soon)</h4>
                <p className="text-sm text-gray-600">Limited access</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center space-x-2">
                <i className="pi pi-check text-blue-600 text-xs"></i>
                <span>Create permission slips</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="pi pi-check text-blue-600 text-xs"></i>
                <span>View assigned students</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="pi pi-check text-blue-600 text-xs"></i>
                <span>Basic reporting</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const GettingStartedSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Getting Started</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-play text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <StepCard
        number="1"
        title="Access the System"
        description={
          <>
            Open your browser (Chrome, Edge, or Brave recommended) and navigate to your CAP_mis URL.<br/>
            <span className="text-sm text-gray-500 mt-1 block">
              💡 <strong>Note:</strong> System is hosted on Vercel (frontend) and Render (backend)
            </span>
          </>
        }
        icon="pi-globe"
      />
      
      <StepCard
        number="2"
        title="Login with Credentials"
        description="Use the administrator credentials provided by your system administrator. Contact support if you don't have credentials."
        icon="pi-sign-in"
      />
      
      <StepCard
        number="3"
        title="Configure SMS (TextBee)"
        description="Set up TextBee API credentials in System Settings to enable SMS notifications to parents."
        icon="pi-cog"
      />
      
      <StepCard
        number="4"
        title="Upload ID Card Templates"
        description="Upload front and back templates for student ID cards before generating cards."
        icon="pi-image"
      />
      
      <StepCard
        number="5"
        title="Add Students"
        description="Import students via CSV or add them individually to populate the system."
        icon="pi-user-plus"
      />
      
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
        <div className="flex items-start space-x-4">
          <i className="pi pi-lightbulb text-amber-600 text-2xl mt-1"></i>
          <div>
            <h4 className="font-semibold text-amber-900 mb-2">🚀 Quick Start Tip</h4>
            <p className="text-amber-800">
              Start with 5-10 test students to familiarize yourself with the system workflow before 
              performing bulk operations. Test ID card generation and permission slip creation to ensure 
              everything works correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StudentsSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Student Management</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-users text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GuideCard
          title="➕ Add Single Student"
          steps={[
            'Navigate to Students → Add Student',
            'Fill in all required student details',
            'Upload student photo (optional)',
            'Enter parent phone number for SMS',
            'Click "Save Student" to add to database'
          ]}
          icon="pi-user-plus"
        />
        
        <GuideCard
          title="📁 Bulk Import via CSV"
          steps={[
            'Prepare CSV file with required format',
            'Go to Students → Bulk Import',
            'Upload your CSV file',
            'Map columns if needed',
            'Preview and confirm import'
          ]}
          icon="pi-upload"
        />
      </div>
      
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
        <h3 className="font-semibold text-emerald-900 mb-4">📋 Required CSV Format</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-emerald-100">
                <th className="px-4 py-3 text-left font-semibold text-emerald-900">Column Name</th>
                <th className="px-4 py-3 text-left font-semibold text-emerald-900">Required</th>
                <th className="px-4 py-3 text-left font-semibold text-emerald-900">Example</th>
                <th className="px-4 py-3 text-left font-semibold text-emerald-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-emerald-200">
                <td className="px-4 py-3 font-medium">student_id</td>
                <td className="px-4 py-3"><span className="text-red-500">Yes</span></td>
                <td className="px-4 py-3 font-mono">STU2024001</td>
                <td className="px-4 py-3">Unique student identifier</td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="px-4 py-3 font-medium">name</td>
                <td className="px-4 py-3"><span className="text-red-500">Yes</span></td>
                <td className="px-4 py-3 font-mono">John Doe</td>
                <td className="px-4 py-3">Full student name</td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="px-4 py-3 font-medium">class</td>
                <td className="px-4 py-3"><span className="text-red-500">Yes</span></td>
                <td className="px-4 py-3 font-mono">Form 4A</td>
                <td className="px-4 py-3">Class/grade</td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="px-4 py-3 font-medium">level</td>
                <td className="px-4 py-3">No</td>
                <td className="px-4 py-3 font-mono">Secondary</td>
                <td className="px-4 py-3">Education level</td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="px-4 py-3 font-medium">parent_phone</td>
                <td className="px-4 py-3"><span className="text-red-500">Yes</span></td>
                <td className="px-4 py-3 font-mono">+250793166542</td>
                <td className="px-4 py-3">Parent phone (with country code)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">gender</td>
                <td className="px-4 py-3">No</td>
                <td className="px-4 py-3 font-mono">Male/Female</td>
                <td className="px-4 py-3">Student gender</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-emerald-700">
          <p>💡 <strong>Tip:</strong> Download the sample CSV template from the import page to ensure correct formatting.</p>
        </div>
      </div>
    </div>
  </div>
);

const TemplatesSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">ID Card Templates</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-image text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📐 Technical Requirements</h3>
          <ul className="space-y-3">
            <RequirementItem
              icon="pi-check-circle"
              color="text-emerald-600"
              text="PNG, JPG, or PDF format"
            />
            <RequirementItem
              icon="pi-check-circle"
              color="text-emerald-600"
              text="Recommended size: 1000x700 pixels"
            />
            <RequirementItem
              icon="pi-check-circle"
              color="text-emerald-600"
              text="High resolution (300 DPI recommended)"
            />
            <RequirementItem
              icon="pi-check-circle"
              color="text-emerald-600"
              text="Both front and back sides required"
            />
            <RequirementItem
              icon="pi-check-circle"
              color="text-emerald-600"
              text="File size under 10MB per side"
            />
          </ul>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🎨 Design Guidelines</h3>
          <ul className="space-y-3">
            <RequirementItem
              icon="pi-info-circle"
              color="text-blue-600"
              text="Leave clear areas for dynamic data (name, photo, etc.)"
            />
            <RequirementItem
              icon="pi-info-circle"
              color="text-blue-600"
              text="Include institution logo and branding"
            />
            <RequirementItem
              icon="pi-info-circle"
              color="text-blue-600"
              text="Use contrasting colors for readability"
            />
            <RequirementItem
              icon="pi-info-circle"
              color="text-blue-600"
              text="Designate photo area (recommended: 200x250px)"
            />
            <RequirementItem
              icon="pi-info-circle"
              color="text-blue-600"
              text="Add security features (watermarks, holograms)"
            />
          </ul>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4">🔄 Upload Process</h3>
        <div className="space-y-4">
          <StepItem 
            step="1"
            title="Go to Templates → Upload Template"
            description="Access the template management section"
          />
          <StepItem 
            step="2"
            title="Enter Template Details"
            description="Provide name and description for identification"
          />
          <StepItem 
            step="3"
            title="Upload Front and Back Images"
            description="Upload both sides of the ID card template"
          />
          <StepItem 
            step="4"
            title="Set as Default (Optional)"
            description="Mark as default for automatic selection"
          />
          <StepItem 
            step="5"
            title="Position Dynamic Elements"
            description="Set coordinates for student data placement"
          />
        </div>
      </div>
    </div>
  </div>
);

const PermissionsSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Permission Slips</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-file text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
        <h3 className="font-semibold text-purple-900 mb-6 text-center">🔄 Complete Workflow</h3>
        <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
          <WorkflowStep 
            number="1" 
            title="Create Permission" 
            description="Staff creates permission slip with student details"
            icon="pi-file-edit"
          />
          <ArrowRight />
          <WorkflowStep 
            number="2" 
            title="SMS Notification" 
            description="Parent receives instant SMS notification"
            icon="pi-send"
          />
          <ArrowRight />
          <WorkflowStep 
            number="3" 
            title="Admin Approval" 
            description="Administrator reviews and approves"
            icon="pi-check-circle"
          />
          <ArrowRight />
          <WorkflowStep 
            number="4" 
            title="Student Departure" 
            description="Student leaves with printed slip"
            icon="pi-sign-out"
          />
          <ArrowRight />
          <WorkflowStep 
            number="5" 
            title="Return & Close" 
            description="Mark student returned, SMS sent to parent"
            icon="pi-sign-in"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">📝 Creating Permission Slips</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Navigate to Permissions → Create Permission</li>
            <li>Select student from dropdown</li>
            <li>Fill in permission details (reason, destination, dates)</li>
            <li>Add guardian information</li>
            <li>Click "Create Permission"</li>
            <li>System automatically sends SMS to parent</li>
          </ol>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Permission Statuses</h3>
          <div className="space-y-3">
            <StatusBadge color="bg-green-100 text-green-800" text="approved" />
            <StatusBadge color="bg-yellow-100 text-yellow-800" text="pending" />
            <StatusBadge color="bg-blue-100 text-blue-800" text="active" />
            <StatusBadge color="bg-emerald-100 text-emerald-800" text="returned" />
            <StatusBadge color="bg-red-100 text-red-800" text="cancelled" />
          </div>
          <p className="text-sm text-gray-600 mt-4">
            💡 <strong>Tip:</strong> Change status to "returned" when student comes back to automatically send SMS to parent.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const SMSSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">SMS Notifications</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-send text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-4">⚙️ TextBee Setup Guide</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Create TextBee account at <a href="https://textbee.com" className="text-blue-600 hover:underline">textbee.com</a></li>
            <li>Verify your account and add funds</li>
            <li>Navigate to API Settings in TextBee dashboard</li>
            <li>Copy your API Key and API Secret</li>
            <li>In CAP_mis, go to Profile → System Settings</li>
            <li>Enter TextBee credentials in SMS Configuration</li>
            <li>Click "Test SMS" to verify setup</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Note:</strong> SMS costs are charged by TextBee based on destination countries.
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-4">📨 Automatic SMS Triggers</h3>
          <div className="space-y-4">
            <SMSTrigger 
              event="New Permission Created"
              message="Dear Parent, [Student] has permission to leave for [Reason]. Return: [Time]"
            />
            <SMSTrigger 
              event="Student Returned"
              message="Dear Parent, [Student] has returned to school safely at [Time]"
            />
            <SMSTrigger 
              event="ID Card Generated"
              message="Dear Parent, ID card for [Student] has been generated and is ready"
            />
            <SMSTrigger 
              event="Emergency Alert"
              message="URGENT: [Message] - School Administration"
            />
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-4">📱 SMS Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <i className="pi pi-check text-amber-600 mt-1"></i>
            <div>
              <p className="font-medium text-amber-800">Phone Format</p>
              <p className="text-sm text-amber-700">Use international format: +250XXXXXXXXX</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <i className="pi pi-check text-amber-600 mt-1"></i>
            <div>
              <p className="font-medium text-amber-800">Message Length</p>
              <p className="text-sm text-amber-700">Keep under 160 characters for single SMS</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <i className="pi pi-check text-amber-600 mt-1"></i>
            <div>
              <p className="font-medium text-amber-800">Timing</p>
              <p className="text-sm text-amber-700">Send during school hours (8 AM - 5 PM)</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <i className="pi pi-check text-amber-600 mt-1"></i>
            <div>
              <p className="font-medium text-amber-800">Testing</p>
              <p className="text-sm text-amber-700">Always test with your phone first</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ReportsSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Reports & Analytics</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-chart-bar text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportTypeCard
          title="📈 Dashboard Summary"
          description="Real-time overview of system statistics"
          items={['Total Students', 'Active Permissions', 'SMS Sent', 'ID Cards Generated']}
        />
        <ReportTypeCard
          title="📊 Permission Analytics"
          description="Detailed permission slip analysis"
          items={['By Class', 'By Reason', 'Return Timeliness', 'Monthly Trends']}
        />
        <ReportTypeCard
          title="👥 Student Reports"
          description="Student performance and activity"
          items={['Attendance', 'Permission History', 'ID Card Status', 'Parent Contact']}
        />
      </div>
      
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">📅 Generating Reports</h3>
        <div className="space-y-4">
          <StepItem 
            step="1"
            title="Navigate to Analytics Dashboard"
            description="Access from main menu or dashboard widget"
          />
          <StepItem 
            step="2"
            title="Select Report Type"
            description="Choose from available report templates"
          />
          <StepItem 
            step="3"
            title="Set Date Range & Filters"
            description="Customize report parameters as needed"
          />
          <StepItem 
            step="4"
            title="Generate Report"
            description="System processes and displays data"
          />
          <StepItem 
            step="5"
            title="Export or Print"
            description="Export to PDF/Excel or print directly"
          />
        </div>
      </div>
    </div>
  </div>
);

const ImportExportSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Import & Export</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-database text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">⬆️ Data Import</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <i className="pi pi-file-excel text-green-600 mt-1"></i>
              <div>
                <p className="font-medium">CSV Import</p>
                <p className="text-sm text-gray-600">Bulk import students with photos</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <i className="pi pi-images text-blue-600 mt-1"></i>
              <div>
                <p className="font-medium">Photo ZIP Import</p>
                <p className="text-sm text-gray-600">Upload multiple student photos at once</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <i className="pi pi-cloud-upload text-purple-600 mt-1"></i>
              <div>
                <p className="font-medium">Template Import</p>
                <p className="text-sm text-gray-600">Upload ID card template packages</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">⬇️ Data Export</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <i className="pi pi-file-pdf text-red-600 mt-1"></i>
              <div>
                <p className="font-medium">PDF Reports</p>
                <p className="text-sm text-gray-600">Professional formatted reports</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <i className="pi pi-file-excel text-green-600 mt-1"></i>
              <div>
                <p className="font-medium">Excel Export</p>
                <p className="text-sm text-gray-600">Spreadsheet format for analysis</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <i className="pi pi-id-card text-orange-600 mt-1"></i>
              <div>
                <p className="font-medium">ID Card ZIP</p>
                <p className="text-sm text-gray-600">Batch download generated ID cards</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const PrintingSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Printing System</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-print text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">🖨️ Print Permission Slips</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Navigate to Permissions → Permission List</li>
            <li>Select permission to print</li>
            <li>Click "Print" button</li>
            <li>System generates printable PDF</li>
            <li>Use browser print dialog (Ctrl+P)</li>
            <li>Select printer and print</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Use A4 paper for best results. Permission slips include QR code for verification.
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">🪪 Print ID Cards</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Generate ID cards first</li>
            <li>Go to Card Generation → History</li>
            <li>Select cards to print</li>
            <li>Click "Print Selected"</li>
            <li>Use ID card paper (PVC recommended)</li>
            <li>Adjust printer settings for thickness</li>
          </ol>
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              🏆 <strong>Pro Tip:</strong> For professional cards, export to PDF and send to printing service.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TroubleshootingSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Troubleshooting</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-700 rounded-xl flex items-center justify-center">
        <i className="pi pi-wrench text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TroubleshootCard
          issue="SMS Not Sending"
          solutions={[
            'Check TextBee API credentials',
            'Verify account has sufficient balance',
            'Ensure phone numbers are in international format',
            'Check internet connection'
          ]}
        />
        <TroubleshootCard
          issue="ID Card Generation Failed"
          solutions={[
            'Verify template is uploaded',
            'Check template coordinates are set',
            'Ensure student photo exists',
            'Try single card generation first'
          ]}
        />
        <TroubleshootCard
          issue="Slow Performance"
          solutions={[
            'Clear browser cache',
            'Check internet speed',
            'Reduce batch size for bulk operations',
            'Close other browser tabs'
          ]}
        />
        <TroubleshootCard
          issue="Login Problems"
          solutions={[
            'Clear browser cookies',
            'Reset password if forgotten',
            'Try different browser (Chrome/Edge)',
            'Contact system administrator'
          ]}
        />
      </div>
    </div>
  </div>
);

const FAQSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-question-circle text-white text-xl"></i>
      </div>
    </div>
    
    <div className="space-y-6">
      <FAQItem
        question="How many students can the system handle?"
        answer="The system can handle unlimited students. Performance depends on your hosting plan. The free Render tier supports up to 500 students comfortably."
      />
      <FAQItem
        question="Can parents access the system?"
        answer="Currently, only school administrators have access. Parent portal is planned for future updates."
      />
      <FAQItem
        question="Is there a mobile app?"
        answer="Not currently, but the system is fully responsive and works on mobile browsers."
      />
      <FAQItem
        question="How secure is the data?"
        answer="All data is encrypted, uses secure HTTPS, and is stored on Cloudinary (for media) and MongoDB (for data) with regular backups."
      />
      <FAQItem
        question="Can I customize the SMS messages?"
        answer="Yes, SMS templates can be customized in the system settings section."
      />
      <FAQItem
        question="What browsers are supported?"
        answer="Chrome (recommended), Microsoft Edge, and Brave. Latest versions are required."
      />
    </div>
  </div>
);

const SupportSection = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Support & Contact</h2>
      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
        <i className="pi pi-lifebelt text-white text-xl"></i>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <ContactCard
        icon="pi-envelope"
        title="Email Support"
        contact="dusenge.enzo87@gmail.com"
        description="For technical issues and system support"
      />
      <ContactCard
        icon="pi-phone"
        title="Phone Support"
        contact="+250 793 166 542"
        description="Available during business hours"
      />
      <ContactCard
        icon="pi-clock"
        title="Response Time"
        contact="24-48 hours"
        description="For email inquiries"
      />
    </div>
    
    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200">
      <h3 className="font-semibold text-red-900 mb-4">🚨 Emergency Support</h3>
      <p className="text-red-800 mb-4">
        For system outages or critical issues preventing school operations, call the support number immediately.
      </p>
      <div className="flex items-center space-x-3">
        <i className="pi pi-exclamation-triangle text-red-600 text-xl"></i>
        <p className="font-semibold text-red-900">Emergency: +250 793 166 542</p>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">📋 When Contacting Support</h3>
      <ul className="space-y-3">
        <li className="flex items-start space-x-3">
          <i className="pi pi-info-circle text-blue-600 mt-1"></i>
          <span>Include your school name and user account</span>
        </li>
        <li className="flex items-start space-x-3">
          <i className="pi pi-info-circle text-blue-600 mt-1"></i>
          <span>Describe the issue clearly with steps to reproduce</span>
        </li>
        <li className="flex items-start space-x-3">
          <i className="pi pi-info-circle text-blue-600 mt-1"></i>
          <span>Include screenshots if possible</span>
        </li>
        <li className="flex items-start space-x-3">
          <i className="pi pi-info-circle text-blue-600 mt-1"></i>
          <span>Note any error messages displayed</span>
        </li>
      </ul>
    </div>
  </div>
);

// ==================== HELPER COMPONENTS ====================

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 transition-all hover:shadow-lg group">
    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      <i className={`pi ${icon} text-white text-xl`}></i>
    </div>
    <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);

const StepCard = ({ number, title, description, icon }) => (
  <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-200 hover:border-emerald-200 transition-colors">
    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-white font-bold">{number}</span>
    </div>
    <div className="flex-1">
      <div className="flex items-center space-x-3 mb-2">
        <i className={`pi ${icon} text-emerald-600`}></i>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="text-gray-700">{description}</div>
    </div>
  </div>
);

const GuideCard = ({ title, steps, icon }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200">
    <div className="flex items-center space-x-3 mb-4">
      {icon && <i className={`pi ${icon} text-emerald-600`}></i>}
      <h4 className="font-semibold text-gray-900">{title}</h4>
    </div>
    <ol className="list-decimal pl-5 space-y-2">
      {steps.map((step, index) => (
        <li key={index} className="text-gray-700 pl-1">{step}</li>
      ))}
    </ol>
  </div>
);

const TechStackItem = ({ name, description, color, icon }) => (
  <div className="flex flex-col items-center p-4 rounded-xl text-center">
    <div className={`w-12 h-12 ${color.split(' ')[0]} rounded-lg flex items-center justify-center mb-2`}>
      <i className={`pi ${icon} ${color.split(' ')[1]} text-lg`}></i>
    </div>
    <span className={`font-medium ${color.split(' ')[1]}`}>{name}</span>
    <span className="text-xs text-gray-600 mt-1">{description}</span>
  </div>
);

const RequirementItem = ({ icon, color, text }) => (
  <li className="flex items-start space-x-3">
    <i className={`${icon} ${color} mt-1`}></i>
    <span>{text}</span>
  </li>
);

const StepItem = ({ step, title, description }) => (
  <div className="flex items-start space-x-4">
    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-white text-sm font-bold">{step}</span>
    </div>
    <div>
      <h4 className="font-medium text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

const WorkflowStep = ({ number, title, description, icon }) => (
  <div className="text-center flex flex-col items-center">
    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
      <span className="text-white font-bold text-xl">{number}</span>
    </div>
    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 border border-purple-200">
      <i className={`pi ${icon} text-purple-600 text-xl`}></i>
    </div>
    <h5 className="font-semibold text-gray-900">{title}</h5>
    <p className="text-sm text-gray-600 max-w-[120px]">{description}</p>
  </div>
);

const ArrowRight = () => (
  <div className="hidden md:block text-purple-400 text-2xl">→</div>
);

const StatusBadge = ({ color, text }) => (
  <div className="flex items-center space-x-3">
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {text}
    </div>
    <span className="text-sm text-gray-600 capitalize">{text} status</span>
  </div>
);

const SMSTrigger = ({ event, message }) => (
  <div className="p-3 bg-white rounded-lg border border-green-200">
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium text-green-900">{event}</span>
      <i className="pi pi-bell text-green-600"></i>
    </div>
    <p className="text-sm text-green-800 bg-green-50 p-2 rounded">"{message}"</p>
  </div>
);

const ReportTypeCard = ({ title, description, items }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200">
    <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
    <p className="text-sm text-gray-600 mb-4">{description}</p>
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-center space-x-2">
          <i className="pi pi-chart-line text-orange-600 text-sm"></i>
          <span className="text-sm text-gray-700">{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const TroubleshootCard = ({ issue, solutions }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-200">
    <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
      <i className="pi pi-exclamation-triangle text-red-600"></i>
      <span>{issue}</span>
    </h4>
    <ul className="space-y-2">
      {solutions.map((solution, index) => (
        <li key={index} className="flex items-start space-x-2">
          <i className="pi pi-check text-green-600 mt-1"></i>
          <span className="text-gray-700">{solution}</span>
        </li>
      ))}
    </ul>
  </div>
);

const FAQItem = ({ question, answer }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-200">
    <h4 className="font-semibold text-gray-900 mb-3 flex items-start space-x-3">
      <i className="pi pi-question text-yellow-600 mt-1"></i>
      <span>{question}</span>
    </h4>
    <div className="pl-9">
      <p className="text-gray-700">{answer}</p>
    </div>
  </div>
);

const ContactCard = ({ icon, title, contact, description }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 text-center">
    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
      <i className={`pi ${icon} text-white text-xl`}></i>
    </div>
    <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
    <p className="text-lg font-medium text-emerald-600 mb-2">{contact}</p>
    <p className="text-sm text-gray-600">{description}</p>
  </div>
);

const renderSectionContent = (section) => {
  switch (section) {
    case 'overview': return <OverviewSection />;
    case 'getting-started': return <GettingStartedSection />;
    case 'students': return <StudentsSection />;
    case 'templates': return <TemplatesSection />;
    case 'permissions': return <PermissionsSection />;
    case 'sms': return <SMSSection />;
    case 'reports': return <ReportsSection />;
    case 'import-export': return <ImportExportSection />;
    case 'printing': return <PrintingSection />;
    case 'troubleshooting': return <TroubleshootingSection />;
    case 'faq': return <FAQSection />;
    case 'support': return <SupportSection />;
    default: return <OverviewSection />;
  }
};

export default Documentation;