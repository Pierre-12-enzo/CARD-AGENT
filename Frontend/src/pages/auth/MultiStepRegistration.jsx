// pages/auth/MultiStepRegistration.jsx - NAVY & CRIMSON THEME
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import StepIndicator from '../../components/auth/StepIndicator';
import PersonalInfoStep from '../../components/auth/steps/PersonalInfoStep';
import CompanyInfoStep from '../../components/auth/steps/CompanyInfoStep';
import LicenseStep from '../../components/auth/steps/LicenseStep';
import CompletionStep from '../../components/auth/steps/CompletionStep';

const MultiStepRegistration = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(true);
    const [error, setError] = useState('');
    const [registrationData, setRegistrationData] = useState({
        email: '',
        progressId: null,
        personal: null,
        company: null,
        license: null
    });

    useEffect(() => {
        checkForSavedProgress();
    }, []);

    const checkForSavedProgress = async () => {
        setLoadingProgress(true);
        try {
            const urlEmail = searchParams.get('email');
            const savedEmail = localStorage.getItem('registration_email');
            const emailToCheck = urlEmail || savedEmail;

            if (!emailToCheck) {
                setLoadingProgress(false);
                return;
            }

            const response = await authAPI.getRegistrationProgress(emailToCheck);
            if (response.success && response.progress) {
                const progress = response.progress;
                setRegistrationData({
                    email: progress.email,
                    progressId: progress._id,
                    personal: progress.data?.personal || null,
                    company: progress.data?.company || null,
                    license: progress.data?.license || null
                });
                setCurrentStep(progress.step || 1);
                setError({ type: 'info', message: `Welcome back! Continuing from step ${progress.step || 1}...` });
                setTimeout(() => setError(''), 5000);
            } else {
                localStorage.removeItem('registration_email');
                localStorage.removeItem('registration_step');
            }
        } catch (err) {
            console.error(err);
            console.log('No saved progress found');
            localStorage.removeItem('registration_email');
            localStorage.removeItem('registration_step');
        } finally {
            setLoadingProgress(false);
        }
    };

    const saveProgress = async (step, data) => {
        if (!registrationData.email) return;
        try {
            await authAPI.saveRegistrationProgress(registrationData.email, step, data);
            localStorage.setItem('registration_step', step.toString());
        } catch (err) {
            console.error('Failed to save progress:', err);
        }
    };

    const handleStepComplete = async (stepData) => {
        setLoading(true);
        setError('');

        try {
            let response;

            if (currentStep === 1) {
                response = await authAPI.savePersonalInfo({
                    email: stepData.email,
                    firstName: stepData.firstName,
                    lastName: stepData.lastName,
                    phoneNumber: stepData.phoneNumber,
                    password: stepData.password
                });

                if (response.success) {
                    setRegistrationData(prev => ({
                        ...prev,
                        email: stepData.email,
                        progressId: response.progressId,
                        personal: {
                            firstName: stepData.firstName,
                            lastName: stepData.lastName,
                            phoneNumber: stepData.phoneNumber
                        }
                    }));
                    localStorage.setItem('registration_email', stepData.email);
                    localStorage.setItem('registration_step', '2');
                    await saveProgress(2, { personal: stepData });
                    setCurrentStep(2);
                }
            } else if (currentStep === 2) {
                const formData = stepData; // Already FormData
                formData.append('email', registrationData.email);

                response = await authAPI.saveCompanyInfo(formData);

                if (response.success) {
                    const companyData = {
                        name: stepData.get('name'),
                        email: stepData.get('email'),
                        phone: stepData.get('phone'),
                        website: stepData.get('website'),
                        province: stepData.get('province'),
                        district: stepData.get('district'),
                        sector: stepData.get('sector'),
                        country: stepData.get('country')
                    };

                    setRegistrationData(prev => ({ ...prev, company: companyData }));
                    localStorage.setItem('registration_step', '3');
                    await saveProgress(3, { company: companyData });
                    setCurrentStep(3);
                }
            } else if (currentStep === 3) {
                response = await authAPI.activateLicense({
                    email: registrationData.email,
                    licenseKey: stepData.licenseKey
                });

                if (response.success) {
                    setRegistrationData(prev => ({
                        ...prev,
                        license: { licenseKey: stepData.licenseKey }
                    }));
                    localStorage.setItem('registration_step', '4');
                    await saveProgress(4, { license: stepData });

                    // Complete registration
                    const completeResponse = await authAPI.completeRegistration({
                        email: registrationData.email
                    });

                    if (completeResponse.success) {
                        localStorage.setItem('capmis_token', completeResponse.token);
                        localStorage.removeItem('registration_email');
                        localStorage.removeItem('registration_step');
                        setCurrentStep(4); // Go to CompletionStep
                    }
                }
            }
        } catch (err) {
            console.error('Step error:', err);
            setError(err.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualResume = () => {
        const email = localStorage.getItem('registration_email');
        if (email) {
            checkForSavedProgress();
        } else {
            setError('No saved registration found. Please start fresh.');
        }
    };

    const handleStartFresh = () => {
        localStorage.removeItem('registration_email');
        localStorage.removeItem('registration_step');
        setRegistrationData({
            email: '',
            progressId: null,
            personal: null,
            company: null,
            license: null
        });
        setCurrentStep(1);
        setError('');
    };

    if (loadingProgress) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 mx-auto mb-4"
                    >
                        <svg className="w-full h-full text-red-500" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="80, 200" strokeDashoffset="0" />
                        </svg>
                    </motion.div>
                    <p className="text-slate-300 font-semibold">Loading your progress...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-red-50">
            {/* Left Side - Form Section */}
            <div className="flex-1 flex flex-col justify-start py-6 px-4 sm:px-6 lg:px-12 xl:px-16 overflow-y-auto max-h-screen">
                <motion.div
                    className="mx-auto w-full max-w-xl"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="mb-4">
                        <div className="flex items-center">
                            <motion.div
                                className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center mr-3 shadow-lg"
                                whileHover={{ rotate: 12, scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <span className="text-white text-lg font-bold">CA</span>
                            </motion.div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
                                    CARD-AGENT
                                </h1>
                                <p className="text-xs text-slate-500 font-medium">Professional Card Generation System</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Create your account</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Start generating professional ID cards for your clients
                        </p>
                    </div>

                    {/* Resume Controls */}
                    {localStorage.getItem('registration_email') && currentStep === 1 && (
                        <motion.div className="flex space-x-2 mb-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                            <button
                                onClick={handleManualResume}
                                className="px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-red-50 border border-red-300 rounded-lg text-red-700 text-xs font-semibold transition-all flex items-center shadow-md hover:shadow-lg"
                            >
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Resume
                            </button>
                            <button
                                onClick={handleStartFresh}
                                className="px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-gray-100 rounded-lg text-gray-700 text-xs font-semibold transition-all flex items-center shadow-md hover:shadow-lg"
                            >
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Fresh Start
                            </button>
                        </motion.div>
                    )}

                    {/* Resume Banner */}
                    {registrationData.email && currentStep > 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-2.5 bg-gradient-to-r from-slate-50 to-red-50 border border-slate-200 rounded-xl backdrop-blur-sm"
                        >
                            <p className="text-slate-700 text-xs flex items-center">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Continuing: <strong className="mx-1">{registrationData.email}</strong>
                            </p>
                        </motion.div>
                    )}

                    {/* Step Indicator */}
                    <div className="mb-5">
                        <StepIndicator
                            steps={[
                                { number: 1, title: 'Personal', icon: 'pi pi-user' },
                                { number: 2, title: 'Company', icon: 'pi pi-building' },
                                { number: 3, title: 'License', icon: 'pi pi-key' },
                                { number: 4, title: 'Complete', icon: 'pi pi-check-circle' }
                            ]}
                            currentStep={currentStep}
                        />
                    </div>

                    {/* Error/Info message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mb-4 p-2.5 rounded-lg border text-xs ${error.type === 'info'
                                    ? 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-300 text-slate-800'
                                    : 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-800'
                                    }`}
                            >
                                <span className="flex items-center">
                                    <span className="mr-1.5">{error.type === 'info' ? 'ℹ️' : '⚠️'}</span>
                                    {typeof error === 'string' ? error : error.message}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step Content */}
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        transition={{ duration: 0.3, type: "spring", damping: 20 }}
                        className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/50"
                    >
                        {currentStep === 1 && (
                            <PersonalInfoStep
                                onSubmit={handleStepComplete}
                                initialData={registrationData.personal}
                                loading={loading}
                            />
                        )}
                        {currentStep === 2 && (
                            <CompanyInfoStep
                                onSubmit={handleStepComplete}
                                initialData={registrationData.company}
                                registrationEmail={registrationData.email}  // 🔥 PASS EMAIL
                                loading={loading}
                            />
                        )}
                        {currentStep === 3 && (
                            <LicenseStep
                                onSubmit={handleStepComplete}
                                loading={loading}
                            />
                        )}
                        {currentStep === 4 && (
                            <CompletionStep />
                        )}
                    </motion.div>

                    {/* Login link */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-center">
                        <p className="text-xs text-gray-600">
                            Already have an account?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="text-red-600 hover:text-red-700 font-semibold transition-colors relative group"
                            >
                                Sign in
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                            </button>
                        </p>
                    </motion.div>
                </motion.div>
            </div>

            {/* Right Side - Branding */}
            <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0">
                    <motion.div
                        className="absolute top-10 left-10 w-48 h-48 bg-gradient-to-br from-red-500/20 to-slate-500/20 rounded-full blur-3xl"
                        animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute bottom-10 right-10 w-64 h-64 bg-gradient-to-tr from-slate-500/15 to-red-500/15 rounded-full blur-3xl"
                        animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1.5 h-1.5 bg-red-400/40 rounded-full"
                            initial={{ x: Math.random() * 100 + '%', y: Math.random() * 100 + '%' }}
                            animate={{ y: [null, '-100%'], opacity: [0.4, 0] }}
                            transition={{
                                duration: Math.random() * 5 + 5,
                                repeat: Infinity,
                                delay: Math.random() * 5,
                                ease: "linear"
                            }}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        {/* Animated Card Stack */}
                        <motion.div
                            className="mb-6"
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, type: "spring" }}
                        >
                            <div className="relative mx-auto w-36 h-44">
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-500 rounded-2xl shadow-xl"
                                    animate={{ rotate: [0, 6, 0], y: [0, -3, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                />
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl shadow-lg"
                                    animate={{ rotate: [0, -4, 0], y: [0, 2, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                />
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-slate-800 to-red-600 rounded-2xl shadow-2xl flex items-center justify-center"
                                    whileHover={{ scale: 1.05, rotate: 2 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <div className="text-center">
                                        <span className="text-4xl mb-2 block">🪪</span>
                                        <span className="text-white text-sm font-bold">ID Card</span>
                                        <div className="mt-3 h-0.5 w-12 bg-white/30 rounded-full mx-auto"></div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.h3
                            className="text-2xl font-bold bg-gradient-to-r from-white via-red-300 to-white bg-clip-text text-transparent mb-3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            Professional Card Generation
                        </motion.h3>

                        <motion.p
                            className="text-slate-300 text-sm leading-relaxed mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            Design, generate, and manage ID cards for schools, organizations, and businesses with our powerful batch processing system.
                        </motion.p>

                        <motion.div
                            className="grid gap-3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <FeatureCard icon="⚡" title="Batch Processing" description="Generate 500+ cards in minutes" color="from-red-600 to-red-500" />
                            <FeatureCard icon="🎨" title="Smart Templates" description="Drag & drop visual designer" color="from-slate-700 to-slate-800" />
                            <FeatureCard icon="📊" title="Real-time Analytics" description="Track usage and performance" color="from-red-600 to-red-500" />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon, title, description, color }) => (
    <motion.div
        whileHover={{ scale: 1.02, x: 3 }}
        className="flex items-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 shadow-md hover:shadow-lg transition-all group"
    >
        <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center mr-3 shadow-md group-hover:scale-105 transition-transform`}>
            <span className="text-white text-base">{icon}</span>
        </div>
        <div className="text-left flex-1">
            <h4 className="font-semibold text-white text-sm">{title}</h4>
            <p className="text-xs text-slate-300">{description}</p>
        </div>
    </motion.div>
);

export default MultiStepRegistration;