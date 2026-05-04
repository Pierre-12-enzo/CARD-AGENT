// components/auth/StepIndicator.jsx - NAVY & CRIMSON THEME
import React from 'react';
import { motion } from 'framer-motion';

const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="relative py-6">
      {/* Background Progress Bar */}
      <div className="absolute top-1/2 left-0 w-full h-1.5 bg-gray-200 rounded-full -translate-y-1/2">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
          className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-400 rounded-full relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>

      {/* Step Circles */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <motion.div
              key={step.number}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  boxShadow: isActive
                    ? "0 0 20px rgba(220,38,38,0.5)"
                    : isCompleted
                      ? "0 0 10px rgba(220,38,38,0.3)"
                      : "none"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isCompleted
                    ? 'bg-gradient-to-br from-red-600 to-red-500 text-white'
                    : isActive
                      ? 'bg-white border-3 border-red-500 text-red-600'
                      : 'bg-gray-100 border-2 border-gray-300 text-gray-500'
                  }`}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {isCompleted ? (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : (
                  <span className="relative z-10">
                    {step.icon ? (
                      <i className={`${step.icon} text-lg`}></i>
                    ) : (
                      stepNumber
                    )}
                  </span>
                )}

                {isCompleted && !isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.1, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                )}
              </motion.div>

              <motion.div
                animate={{
                  opacity: isActive || isCompleted ? 1 : 0.6,
                  y: isActive ? -2 : 0
                }}
                className="mt-3 text-center"
              >
                <div className={`text-xs font-semibold ${isActive ? 'text-red-600' : isCompleted ? 'text-red-500' : 'text-gray-500'
                  }`}>
                  STEP {stepNumber}
                </div>
                <div className={`text-sm font-medium mt-0.5 ${isActive ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                  }`}>
                  {step.title}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;