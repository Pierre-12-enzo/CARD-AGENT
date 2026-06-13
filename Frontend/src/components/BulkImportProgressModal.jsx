// components/BulkImportProgressModal.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useState } from 'react';

const BulkImportProgressModal = ({ isOpen, onClose, progress, type = 'import' }) => {
    // Force re-render when progress changes
    const [renderKey, setRenderKey] = useState(0);

    useEffect(() => {
        if (progress && progress.percentage !== undefined) {
            setRenderKey(prev => prev + 1);
        }
    }, [progress?.percentage, progress?.stage, progress?.created, progress?.processed]);

    if (!isOpen) return null;

    // Extract values with proper defaults - CRITICAL: use the actual field names
    const stage = progress?.stage || 'starting';
    const percentage = progress?.percentage || 0;
    const message = progress?.message || 'Starting import...';
    const status = progress?.status || 'processing';
    const total = progress?.total || 0;
    const created = progress?.created || 0;
    const updated = progress?.updated || 0;
    const skipped = progress?.skipped || 0;
    const processed = progress?.processed || 0;
    const currentItem = progress?.currentItem || null;
    const errors = progress?.errors || [];
    const skippedStudents = progress?.skippedStudents || [];

    const getStageIcon = () => {
        switch (stage) {
            case 'parsing_csv': return '📄';
            case 'extracting_photos': return '📸';
            case 'saving_students': return '💾';
            case 'completed': return '✅';
            default: return '🔄';
        }
    };

    const getStageTitle = () => {
        switch (stage) {
            case 'parsing_csv': return 'Parsing CSV File';
            case 'extracting_photos': return 'Extracting Photos';
            case 'saving_students': return 'Saving Records';
            case 'completed': return 'Complete';
            default: return 'Starting...';
        }
    };

    const isComplete = status === 'completed';
    const isError = status === 'error';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isComplete ? 'bg-green-100' : 'bg-red-100'}`}>
                            <span role="img" aria-label="stage icon">{getStageIcon()}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {type === 'photo' ? 'Bulk Photo Upload' : 'Bulk Import Progress'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {isComplete ? 'Complete!' : isError ? 'Failed' : 'Processing...'}
                            </p>
                        </div>
                    </div>
                    {isComplete && (
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                            <i className="pi pi-times text-slate-600"></i>
                        </button>
                    )}
                </div>

                <div className="p-5 space-y-4">
                    {/* Warning if processing */}
                    {!isComplete && !isError && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                            <i className="pi pi-info-circle text-amber-600"></i>
                            <p className="text-xs text-amber-700">Do not close this window while import is in progress.</p>
                        </div>
                    )}

                    {/* Stage Info */}
                    <div>
                        <p className="text-sm font-medium text-slate-800">{getStageTitle()}</p>
                        <p className="text-sm text-slate-500 mt-1">{message}</p>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between text-sm text-slate-600 mb-1">
                            <span>Progress</span>
                            <span className="font-semibold">{Math.round(percentage)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    {(total > 0 || processed > 0) && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="bg-slate-50 rounded-xl p-2 text-center">
                                <p className="text-xl font-bold text-slate-700">{processed || 0}</p>
                                <p className="text-xs text-slate-500">Processed</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-2 text-center">
                                <p className="text-xl font-bold text-slate-700">{total || 0}</p>
                                <p className="text-xs text-slate-500">Total</p>
                            </div>
                        </div>
                    )}

                    {/* Results Grid */}
                    {(created > 0 || updated > 0 || skipped > 0) && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                            <div className="bg-green-50 rounded-xl p-2 text-center">
                                <p className="text-xl font-bold text-green-700">{created}</p>
                                <p className="text-xs text-green-600">Created</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-2 text-center">
                                <p className="text-xl font-bold text-blue-700">{updated}</p>
                                <p className="text-xs text-blue-600">Updated</p>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-2 text-center">
                                <p className="text-xl font-bold text-amber-700">{skipped}</p>
                                <p className="text-xs text-amber-600">Skipped</p>
                            </div>
                        </div>
                    )}

                    {/* Current Item */}
                    {currentItem && currentItem.name && !isComplete && (
                        <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-xs text-blue-600 font-medium mb-1">Currently Processing</p>
                            <p className="text-sm font-semibold text-blue-800">{currentItem.name}</p>
                            <p className="text-xs text-blue-600">ID: {currentItem.id}</p>
                            {currentItem.index && currentItem.total && (
                                <p className="text-xs text-blue-600 mt-1">
                                    {currentItem.index} of {currentItem.total}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Errors Section */}
                    {errors && errors.length > 0 && (
                        <details className="text-sm">
                            <summary className="text-red-600 cursor-pointer font-medium flex items-center gap-2">
                                <i className="pi pi-exclamation-triangle text-red-500"></i>
                                <span>View errors ({errors.length})</span>
                            </summary>
                            <div className="mt-2 max-h-32 overflow-y-auto bg-red-50 rounded-lg p-2">
                                {errors.map((err, idx) => (
                                    <div key={idx} className="text-xs text-red-700 py-1 border-b border-red-100 last:border-0">
                                        <span className="font-mono">{err.student_id || err.filename || 'Unknown'}</span>
                                        <span>: {err.error || err.message || err.reason || 'Unknown error'}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}

                    {/* Skipped Section */}
                    {skippedStudents && skippedStudents.length > 0 && (
                        <details className="text-sm">
                            <summary className="text-amber-600 cursor-pointer font-medium flex items-center gap-2">
                                <i className="pi pi-info-circle text-amber-500"></i>
                                <span>View skipped ({skippedStudents.length})</span>
                            </summary>
                            <div className="mt-2 max-h-32 overflow-y-auto bg-amber-50 rounded-lg p-2">
                                {skippedStudents.map((item, idx) => (
                                    <div key={idx} className="text-xs text-amber-700 py-1 border-b border-amber-100 last:border-0">
                                        <span className="font-mono">{item.id || item.filename || 'Unknown'}</span>
                                        <span>: {item.reason || 'No reason provided'}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}

                    {/* Debug Info - REMOVE AFTER TESTING */}
                    <div className="bg-yellow-50 rounded-xl p-2 text-xs text-yellow-700">
                        <strong>Debug:</strong> Stage: {stage} | %: {percentage} | Created: {created} | Updated: {updated} | Processed: {processed}/{total}
                    </div>

                    {/* Close Button when complete */}
                    {isComplete && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all"
                        >
                            Close
                        </button>
                    )}

                    {/* Cancel button during processing */}
                    {!isComplete && !isError && (
                        <button
                            onClick={() => {
                                if (window.confirm('Cancel this import? Already processed records will remain.')) {
                                    onClose();
                                }
                            }}
                            className="w-full py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all"
                        >
                            Cancel Import
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkImportProgressModal;