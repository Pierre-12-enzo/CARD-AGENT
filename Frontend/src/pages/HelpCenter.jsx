// pages/HelpCenter.jsx - Comprehensive Documentation & Help Center
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const HelpCenter = () => {
    const location = useLocation();
    const [activeSection, setActiveSection] = useState('getting-started');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        // Check URL hash for direct section linking
        const hash = location.hash.replace('#', '');
        if (hash && sections.some(s => s.id === hash)) {
            setActiveSection(hash);
            document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [location]);

    const sections = [
        { id: 'getting-started', title: '🚀 Getting Started', icon: 'pi-rocket' },
        { id: 'registration', title: '📝 Company Registration', icon: 'pi-building' },
        { id: 'organizations', title: '🏢 Organization Management', icon: 'pi-building' },
        { id: 'people', title: '👥 People Management', icon: 'pi-users' },
        { id: 'templates', title: '🎨 Template Management', icon: 'pi-image' },
        { id: 'card-generation', title: '🪪 Card Generation', icon: 'pi-qrcode' },
        { id: 'co-workers', title: '🤝 Co-worker Management', icon: 'pi-user-plus' },
        { id: 'audit', title: '📋 Audit & Activity', icon: 'pi-history' },
        { id: 'settings', title: '⚙️ Settings', icon: 'pi-cog' },
        { id: 'faq', title: '❓ FAQ', icon: 'pi-question-circle' },
        { id: 'tutorials', title: '🎥 Video Tutorials', icon: 'pi-play' }
    ];

    const faqs = [
        {
            q: "What's the difference between a Student and an Employee?",
            a: "Students are for educational institutions (schools, universities) and have fields like Class, Level, Academic Year. Employees are for corporate organizations and have fields like Department, Position, Employee ID. Both can have ID cards generated."
        },
        {
            q: "How do I upload photos in bulk?",
            a: "1. Prepare a ZIP file with photos named as student_id.jpg or employeeId.jpg\n2. Go to Students page → Bulk Photos button\n3. Select your ZIP file and upload\n4. The system will match photos to people without photos automatically"
        },
        {
            q: "Why are some students skipped during card generation?",
            a: "Students are skipped if they're missing required fields defined in your template (e.g., name, student_id, photo). Check the validation preview before generation to see which students will be skipped and why."
        },
        {
            q: "Can I generate cards for both students and employees?",
            a: "Yes! The system supports both student and employee ID cards. Just select the appropriate person type when adding records or use the filters in the Card Generation page."
        },
        {
            q: "How do co-worker permissions work?",
            a: "Permissions are hierarchical:\n• 'Generate ID Cards' includes all card generation features\n• Individual permissions like 'Upload Photos' can be assigned separately\n• Co-workers can only access organizations they're assigned to"
        },
        {
            q: "What happens when I delete an organization?",
            a: "Deleting an organization removes all associated students, employees, templates, and card history. This action is permanent and cannot be undone. Consider deactivating instead if you might need the data later."
        }
    ];

    const videos = [
        { id: 1, title: 'Getting Started with CARD-AGENT', duration: '5:23', thumbnail: '/api/placeholder/320/180' },
        { id: 2, title: 'How to Create and Manage Templates', duration: '8:15', thumbnail: '/api/placeholder/320/180' },
        { id: 3, title: 'Bulk Import: Students + Photos', duration: '6:42', thumbnail: '/api/placeholder/320/180' },
        { id: 4, title: 'Generating ID Cards (Single & Batch)', duration: '7:30', thumbnail: '/api/placeholder/320/180' },
        { id: 5, title: 'Managing Co-workers & Permissions', duration: '4:58', thumbnail: '/api/placeholder/320/180' }
    ];

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const getSearchResults = () => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        const results = [];

        sections.forEach(section => {
            const sectionContent = document.getElementById(section.id)?.innerText || '';
            if (section.title.toLowerCase().includes(query) || sectionContent.toLowerCase().includes(query)) {
                results.push(section);
            }
        });

        faqs.forEach((faq, index) => {
            if (faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query)) {
                results.push({ id: `faq-${index}`, title: `FAQ: ${faq.q.substring(0, 50)}...`, icon: 'pi-question-circle' });
            }
        });

        return results;
    };

    const searchResults = getSearchResults();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>
                <div className="absolute top-20 right-20 w-64 h-64 bg-red-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-slate-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                    <div className="text-center max-w-3xl mx-auto">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                            className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
                        >
                            <i className="pi pi-book text-white text-3xl"></i>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
                        >
                            Help Center & Documentation
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-lg text-slate-300 mb-8"
                        >
                            Everything you need to know about using CARD-AGENT
                        </motion.p>

                        {/* Search Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="max-w-2xl mx-auto relative"
                        >
                            <div className="relative">
                                <i className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input
                                    type="text"
                                    placeholder="Search documentation, FAQs, tutorials..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            {/* Search Results */}
                            <AnimatePresence>
                                {searchQuery && searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto z-20"
                                    >
                                        {searchResults.map((result, idx) => (
                                            <a
                                                key={idx}
                                                href={`#${result.id}`}
                                                onClick={() => {
                                                    setActiveSection(result.id);
                                                    setSearchQuery('');
                                                }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                            >
                                                <i className={`${result.icon} text-red-500`}></i>
                                                <span className="text-slate-700">{result.title}</span>
                                            </a>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="sticky top-6 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">On this page</p>
                            <nav className="space-y-1">
                                {sections.map(section => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveSection(section.id);
                                            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${activeSection === section.id
                                            ? 'bg-red-50 text-red-700 font-medium border-l-2 border-red-500'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                            }`}
                                    >
                                        <i className={`${section.icon} text-sm ${activeSection === section.id ? 'text-red-500' : 'text-slate-400'}`}></i>
                                        <span>{section.title}</span>
                                    </a>
                                ))}
                            </nav>

                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <div className="bg-gradient-to-br from-red-50 to-slate-50 rounded-xl p-4 text-center">
                                    <i className="pi pi-headset text-2xl text-red-500 mb-2 block"></i>
                                    <p className="text-sm font-medium text-slate-800">Need more help?</p>
                                    <p className="text-xs text-slate-500 mt-1">Contact our support team</p>
                                    <a href="mailto:support@cardagent.com" className="inline-block mt-3 text-xs text-red-600 hover:text-red-700">
                                        support@cardagent.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 space-y-8">
                        {/* Getting Started */}
                        <section id="getting-started" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-rocket text-red-400"></i>
                                    Getting Started
                                </h2>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-600 mb-6">
                                    Welcome to CARD-AGENT! This guide will help you understand the complete workflow of our ID card management system.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    {[
                                        { step: 1, title: 'Register Company', desc: 'Create your company account', icon: 'pi-building', color: 'slate' },
                                        { step: 2, title: 'Add Organization', desc: 'Set up schools/departments', icon: 'pi-flag', color: 'slate' },
                                        { step: 3, title: 'Import People', desc: 'Add students/employees', icon: 'pi-users', color: 'red' },
                                        { step: 4, title: 'Generate Cards', desc: 'Create ID cards', icon: 'pi-qrcode', color: 'red' }
                                    ].map(step => (
                                        <div key={step.step} className="text-center p-4 bg-slate-50 rounded-xl">
                                            <div className={`w-10 h-10 ${step.color === 'red' ? 'bg-red-600' : 'bg-slate-700'} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                                                <i className={`${step.icon} text-white text-sm`}></i>
                                            </div>
                                            <p className="text-lg font-bold text-slate-800">{step.step}</p>
                                            <p className="font-medium text-slate-800 text-sm">{step.title}</p>
                                            <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                                    <i className="pi pi-info-circle text-blue-600 text-lg mt-0.5"></i>
                                    <div>
                                        <p className="text-sm text-blue-800 font-medium">Quick Tip</p>
                                        <p className="text-sm text-blue-700">Start by completing your company registration. After approval, you can begin adding organizations and people.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Company Registration */}
                        <section id="registration" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-building text-red-400"></i>
                                    Company Registration
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="prose prose-slate max-w-none">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Step-by-Step Registration Process</h3>
                                    <ol className="space-y-4 list-decimal list-inside text-slate-600">
                                        <li><strong>Personal Information</strong> - Enter your name, email, phone number, and create a secure password</li>
                                        <li><strong>Company Information</strong> - Provide your organization name, type, address, and upload your company logo</li>
                                        <li><strong>License Activation</strong> - Enter the license key provided by CARD-AGENT to activate your account</li>
                                        <li><strong>Complete Registration</strong> - Review your information and submit for approval</li>
                                    </ol>

                                    <div className="mt-6 bg-amber-50 rounded-xl p-4">
                                        <h4 className="font-semibold text-amber-800 mb-2">⚠️ Important Notes</h4>
                                        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                                            <li>License keys are required for activation - contact sales@cardagent.com if you don't have one</li>
                                            <li>Registration progress is saved automatically - you can resume later</li>
                                            <li>After registration, you'll be redirected to your dashboard</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Organization Management */}
                        <section id="organizations" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-building text-red-400"></i>
                                    Organization Management
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                            <i className="pi pi-plus-circle text-red-500"></i>
                                            Creating Organizations
                                        </h3>
                                        <ul className="space-y-2 text-sm text-slate-600">
                                            <li>• Navigate to <strong>Organizations</strong> from the sidebar</li>
                                            <li>• Click <strong>Add Organization</strong> button</li>
                                            <li>• Fill in organization details (name, type, contact info, address)</li>
                                            <li>• Upload organization logo (optional)</li>
                                            <li>• Select organization type: School, University, Corporate, etc.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                            <i className="pi pi-cog text-red-500"></i>
                                            Organization Types
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="p-3 bg-slate-50 rounded-lg">
                                                <p className="font-medium text-slate-800">🏫 Schools & Universities</p>
                                                <p className="text-xs text-slate-500">Support for class, level, academic year fields</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg">
                                                <p className="font-medium text-slate-800">🏢 Corporate</p>
                                                <p className="text-xs text-slate-500">Support for department, position fields</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* People Management */}
                        <section id="people" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-users text-red-400"></i>
                                    People Management (Students & Employees)
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-3">Adding People</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 border border-slate-200 rounded-xl">
                                                <p className="font-medium text-slate-800 mb-2">➕ Single Add</p>
                                                <p className="text-sm text-slate-600">Click "Add New" button → Fill in details → Upload photo → Save</p>
                                            </div>
                                            <div className="p-4 border border-slate-200 rounded-xl">
                                                <p className="font-medium text-slate-800 mb-2">📁 Bulk Import (CSV)</p>
                                                <p className="text-sm text-slate-600">Download template → Fill data → Upload CSV → Optional: Add photos ZIP</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-3">Photo Management</h3>
                                        <ul className="space-y-2 text-sm text-slate-600">
                                            <li>• <strong>Single Upload:</strong> Edit person → Upload photo</li>
                                            <li>• <strong>Bulk Upload:</strong> Prepare ZIP with photos named as student_id.jpg → Use "Bulk Photos" button</li>
                                            <li>• Photos are automatically optimized and stored in Cloudinary</li>
                                            <li>• Supported formats: JPG, JPEG, PNG (Max 5MB per photo)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Template Management */}
                        <section id="templates" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-image text-red-400"></i>
                                    Template Management
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-3">Creating Templates</h3>
                                        <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
                                            <li>Go to <strong>Templates</strong> page</li>
                                            <li>Click <strong>Upload Template</strong></li>
                                            <li>Upload front and back (optional) card designs (PNG/JPG)</li>
                                            <li>Add fields (text fields, photo field)</li>
                                            <li>Map each field to data sources (name, student_id, class, etc.)</li>
                                            <li>Position fields using drag & drop on the preview</li>
                                            <li>Save template</li>
                                        </ol>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-3">Field Types</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                                <i className="pi pi-font text-blue-500"></i>
                                                <span className="text-sm">Text Fields - Names, IDs, classes, departments</span>
                                            </div>
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                                <i className="pi pi-image text-green-500"></i>
                                                <span className="text-sm">Photo Field - Student/Employee photo with styling options</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Card Generation */}
                        <section id="card-generation" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-red-700 to-red-600 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-qrcode text-white"></i>
                                    Card Generation (Main Feature)
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                <i className="pi pi-user text-red-500"></i>
                                                Single Card
                                            </h3>
                                            <p className="text-sm text-slate-600 mb-3">Generate one ID card at a time</p>
                                            <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                                                <li>Select organization and template</li>
                                                <li>Choose a person (or quick create)</li>
                                                <li>Position fields on the preview</li>
                                                <li>Click "Generate Cards"</li>
                                            </ol>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                <i className="pi pi-users text-red-500"></i>
                                                Batch Cards
                                            </h3>
                                            <p className="text-sm text-slate-600 mb-3">Generate multiple cards at once</p>
                                            <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                                                <li>Select organization and template</li>
                                                <li>Choose data source (Database or CSV)</li>
                                                <li>Apply filters or upload CSV</li>
                                                <li>Position fields</li>
                                                <li>Click "Generate Cards" - watch real-time progress</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 rounded-xl p-4">
                                        <h4 className="font-semibold text-green-800 mb-2">✨ Real-time Progress Features</h4>
                                        <ul className="text-sm text-green-700 space-y-1">
                                            <li>• Live progress bar with percentage</li>
                                            <li>• Current student being processed</li>
                                            <li>• Generated/Failed/Skipped counts</li>
                                            <li>• ETA (Estimated Time Arrival)</li>
                                            <li>• Auto-download when complete</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Co-worker Management */}
                        <section id="co-workers" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-user-plus text-red-400"></i>
                                    Co-worker Management
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-2">Adding Co-workers</h3>
                                        <p className="text-sm text-slate-600 mb-3">Co-workers can help manage students, generate cards, upload photos, etc.</p>
                                        <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                                            <li>Go to <strong>Co-workers</strong> page (Admin only)</li>
                                            <li>Click <strong>Add Co-worker</strong> or <strong>Bulk Import</strong></li>
                                            <li>Enter email, name, and select organizations</li>
                                            <li>Assign permissions (Manage Students, Generate Cards, Upload Photos, etc.)</li>
                                            <li>Send invitation - co-worker receives email to set password</li>
                                        </ol>
                                    </div>

                                    <div className="bg-purple-50 rounded-xl p-4">
                                        <h4 className="font-semibold text-purple-800 mb-2">🔐 Permission Types</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <i className="pi pi-users text-purple-600"></i>
                                                <span>Manage Students</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <i className="pi pi-qrcode text-purple-600"></i>
                                                <span>Generate Cards</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <i className="pi pi-camera text-purple-600"></i>
                                                <span>Upload Photos</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <i className="pi pi-file-excel text-purple-600"></i>
                                                <span>Bulk Import</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <i className="pi pi-image text-purple-600"></i>
                                                <span>Manage Templates</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <i className="pi pi-chart-line text-purple-600"></i>
                                                <span>View Analytics</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Audit & Activity */}
                        <section id="audit" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-history text-red-400"></i>
                                    Audit & Activity Logs
                                </h2>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-600 mb-4">
                                    The audit system tracks all important actions in your organization for security and compliance.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="font-medium text-slate-800">Tracked Activities</p>
                                        <ul className="text-sm text-slate-600 mt-2 space-y-1">
                                            <li>• User logins and logouts</li>
                                            <li>• Student/employee creation, updates, deletions</li>
                                            <li>• Card generation (single and batch)</li>
                                            <li>• Template changes</li>
                                            <li>• Organization modifications</li>
                                        </ul>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="font-medium text-slate-800">Using Audit Logs</p>
                                        <ul className="text-sm text-slate-600 mt-2 space-y-1">
                                            <li>• Filter by date range</li>
                                            <li>• Search by user or action type</li>
                                            <li>• Export logs for external review</li>
                                            <li>• View detailed changes (before/after)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Settings */}
                        <section id="settings" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-cog text-red-400"></i>
                                    User Settings
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-2">Profile Settings</h3>
                                        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                                            <li>Update personal information (name, email, phone)</li>
                                            <li>Change profile picture</li>
                                            <li>View your role and permissions</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-2">Security</h3>
                                        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                                            <li>Change password (requires current password)</li>
                                            <li>Enable two-factor authentication (coming soon)</li>
                                            <li>View active sessions (coming soon)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* FAQ Section */}
                        <section id="faq" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-question-circle text-red-400"></i>
                                    Frequently Asked Questions
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    {faqs.map((faq, index) => (
                                        <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                            >
                                                <span className="font-medium text-slate-800">{faq.q}</span>
                                                <i className={`pi ${expandedFaq === index ? 'pi-chevron-up' : 'pi-chevron-down'} text-slate-400 text-sm`}></i>
                                            </button>
                                            {expandedFaq === index && (
                                                <div className="p-4 pt-0 pb-4 text-sm text-slate-600 bg-slate-50 border-t border-slate-200 whitespace-pre-line">
                                                    {faq.a}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Video Tutorials */}
                        <section id="tutorials" className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden scroll-mt-20">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <i className="pi pi-play text-red-400"></i>
                                    Video Tutorials
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {videos.map(video => (
                                        <div
                                            key={video.id}
                                            onClick={() => {
                                                setSelectedVideo(video);
                                                setShowVideoModal(true);
                                            }}
                                            className="group cursor-pointer rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all duration-300"
                                        >
                                            <div className="relative bg-slate-800 h-32 flex items-center justify-center">
                                                <i className="pi pi-play-circle text-white text-4xl group-hover:scale-110 transition-transform duration-300"></i>
                                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                                    {video.duration}
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <p className="text-sm font-medium text-slate-800">{video.title}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 text-center text-sm text-slate-500">
                                    More tutorials coming soon...
                                </div>
                            </div>
                        </section>

                        {/* Support Footer */}
                        <div className="bg-gradient-to-br from-red-50 to-slate-50 rounded-2xl p-6 text-center">
                            <i className="pi pi-life-ring text-3xl text-red-500 mb-3 block"></i>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Still have questions?</h3>
                            <p className="text-slate-600 text-sm mb-4">Our support team is here to help you</p>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <a
                                    href="mailto:dusenge.enzo87@gmail.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                    <i className="pi pi-envelope"></i>
                                    Email Support
                                </a>
                                <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                                    <i className="pi pi-home"></i>
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            {showVideoModal && selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowVideoModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-semibold text-slate-800">{selectedVideo.title}</h3>
                            <button onClick={() => setShowVideoModal(false)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                                <i className="pi pi-times text-slate-600"></i>
                            </button>
                        </div>
                        <div className="p-4 bg-slate-900">
                            <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center">
                                <i className="pi pi-play-circle text-white text-6xl opacity-50"></i>
                            </div>
                        </div>
                        <div className="p-4 text-center text-sm text-slate-500">
                            Video tutorial placeholder - Actual video content will be added here
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpCenter;