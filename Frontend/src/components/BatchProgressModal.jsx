// components/BatchProgressModal.jsx - UPDATED with close warning and isRunning prop
import React, { useState } from 'react';

const BatchProgressModal = ({
    isOpen,
    onClose,
    progress,
    onDownload,
    batchId,
    socketReady,
    isRunning = false
}) => {
    const [activeTab, setActiveTab] = useState('generated');

    if (!isOpen) return null;

    const {
        status,
        percentage = 0,
        processed = 0,
        generated = 0,
        failed = 0,
        skipped = 0,
        total = 0,
        currentStudent = null,
        failedStudents = [],
        skippedStudents = [],
        eta = null,
        message = ''
    } = progress;

    const isComplete = status === 'completed';
    const isError = status === 'error';
    const isProcessing = status === 'processing' || status === 'started' || status === 'generating';
    const showFallback = !socketReady && isProcessing;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-blue-500'
                            }`}>
                            {isComplete ? (
                                <i className="pi pi-check text-white text-xl"></i>
                            ) : isError ? (
                                <i className="pi pi-times text-white text-xl"></i>
                            ) : (
                                <i className="pi pi-spinner pi-spin text-white text-xl"></i>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                {isComplete ? 'Generation Complete!' : isError ? 'Generation Failed' : 'Generating Cards'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Batch ID: {batchId?.slice(-12)}
                            </p>
                        </div>
                    </div>
                    {(isComplete || isError) && (
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                            <i className="pi pi-times text-slate-600"></i>
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Warning if generation is in progress */}
                    {isProcessing && isRunning && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                            <i className="pi pi-exclamation-triangle text-red-600"></i>
                            <div className="text-sm text-red-700">
                                <span className="font-medium">Do not close this window!</span>
                                <p className="text-xs mt-0.5">Closing will cancel the generation and you will lose all progress.</p>
                            </div>
                        </div>
                    )}

                    {/* Socket Connection Warning */}
                    {showFallback && (
                        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                            <i className="pi pi-wifi text-amber-600 animate-pulse"></i>
                            <div className="text-sm text-amber-700">
                                <span className="font-medium">Connecting to real-time updates...</span>
                                <p className="text-xs mt-0.5">Your cards are still being generated. Please wait.</p>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-sm text-slate-600 mb-2">
                            <span>Progress</span>
                            <span className="font-semibold">{Math.round(percentage)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-3 rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                                    }`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        <div className="bg-slate-50 rounded-xl p-2 text-center">
                            <p className="text-xl font-bold text-slate-800">{processed}</p>
                            <p className="text-xs text-slate-500">Processed</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-2 text-center">
                            <p className="text-xl font-bold text-emerald-600">{generated}</p>
                            <p className="text-xs text-emerald-600">Generated ✅</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-2 text-center">
                            <p className="text-xl font-bold text-amber-600">{skipped}</p>
                            <p className="text-xs text-amber-600">Skipped ⚠️</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-2 text-center">
                            <p className="text-xl font-bold text-red-600">{failed}</p>
                            <p className="text-xs text-red-600">Failed ❌</p>
                        </div>
                    </div>

                    {/* Total count */}
                    {total > 0 && (
                        <div className="text-center text-sm text-slate-500 mb-4">
                            Total: {total} {total === 1 ? 'person' : 'people'}
                        </div>
                    )}

                    {/* Current Student (during generation) */}
                    {isProcessing && currentStudent && currentStudent.status !== 'skipped' && currentStudent.status !== 'failed' && (
                        <div className="bg-blue-50 rounded-xl p-4 mb-4">
                            <p className="text-xs text-blue-600 font-medium mb-1">Currently Processing</p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800">{currentStudent.name}</p>
                                    <p className="text-xs text-slate-500">ID: {currentStudent.id}</p>
                                </div>
                                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                                    {currentStudent.index} / {currentStudent.total}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ETA */}
                    {isProcessing && eta && !showFallback && (
                        <div className="bg-amber-50 rounded-xl p-3 mb-4 flex items-center gap-2">
                            <i className="pi pi-clock text-amber-600"></i>
                            <div>
                                <p className="text-sm font-medium text-amber-800">Estimated Time Remaining</p>
                                <p className="text-xs text-amber-600">{eta}</p>
                            </div>
                        </div>
                    )}

                    {/* Status Message */}
                    {message && (
                        <div className={`text-sm p-3 rounded-xl mb-4 ${isError ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {message}
                        </div>
                    )}

                    {/* Tabs for Results */}
                    {(failedStudents.length > 0 || skippedStudents.length > 0) && isComplete && (
                        <div className="mb-4">
                            <div className="flex gap-2 border-b border-slate-200">
                                {generated > 0 && (
                                    <button
                                        onClick={() => setActiveTab('generated')}
                                        className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'generated' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}
                                    >
                                        ✅ Generated ({generated})
                                    </button>
                                )}
                                {skippedStudents.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab('skipped')}
                                        className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'skipped' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500'}`}
                                    >
                                        ⚠️ Skipped ({skippedStudents.length})
                                    </button>
                                )}
                                {failedStudents.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab('failed')}
                                        className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'failed' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500'}`}
                                    >
                                        ❌ Failed ({failedStudents.length})
                                    </button>
                                )}
                            </div>

                            <div className="mt-3 max-h-48 overflow-y-auto">
                                {activeTab === 'skipped' && skippedStudents.length > 0 && (
                                    <div className="space-y-2">
                                        {skippedStudents.map((student, idx) => (
                                            <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                <p className="font-medium text-slate-800 text-sm">{student.name}</p>
                                                <p className="text-xs text-amber-600 mt-1">⚠️ {student.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'failed' && failedStudents.length > 0 && (
                                    <div className="space-y-2">
                                        {failedStudents.map((student, idx) => (
                                            <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                                                <p className="font-medium text-slate-800 text-sm">{student.name}</p>
                                                <p className="text-xs text-red-600 mt-1">❌ {student.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'generated' && generated === 0 && (
                                    <div className="text-center py-8 text-slate-400">
                                        <i className="pi pi-info-circle text-3xl mb-2 block"></i>
                                        <p className="text-sm">No cards were generated</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    {isComplete && generated > 0 && (
                        <div className="flex gap-3">
                            <button
                                onClick={onDownload}
                                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="pi pi-download"></i>
                                Download Batch ZIP ({generated} cards)
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-slate-600 text-white py-3 rounded-xl font-medium hover:bg-slate-700 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {isComplete && generated === 0 && (
                        <button
                            onClick={onClose}
                            className="w-full bg-slate-600 text-white py-3 rounded-xl font-medium hover:bg-slate-700 transition-all"
                        >
                            Close
                        </button>
                    )}

                    {isError && (
                        <button
                            onClick={onClose}
                            className="w-full bg-slate-600 text-white py-3 rounded-xl font-medium hover:bg-slate-700 transition-all"
                        >
                            Close
                        </button>
                    )}

                    {isProcessing && (
                        <div className="text-center">
                            <button
                                onClick={onClose}
                                className="text-red-600 text-sm underline hover:text-red-700"
                            >
                                Cancel Generation
                            </button>
                            <div className="text-xs text-slate-400 mt-2">
                                {showFallback ? (
                                    <>
                                        <i className="pi pi-spinner pi-spin mr-1"></i>
                                        Connecting to server... Please wait
                                    </>
                                ) : (
                                    'Generating cards... Do not close this window'
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BatchProgressModal;