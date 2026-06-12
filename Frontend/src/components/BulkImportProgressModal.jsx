// components/BulkImportProgressModal.jsx
import React from 'react';

const BulkImportProgressModal = ({ isOpen, onClose, progress, type = 'import' }) => {
    if (!isOpen) return null;

    const getStageIcon = () => {
        switch (progress.stage) {
            case 'parsing_csv': return '📄';
            case 'extracting_photos': return '📸';
            case 'saving_students': return '💾';
            case 'completed': return '✅';
            default: return '🔄';
        }
    };

    const getStageTitle = () => {
        switch (progress.stage) {
            case 'parsing_csv': return 'Parsing CSV File';
            case 'extracting_photos': return 'Extracting Photos';
            case 'saving_students': return 'Saving Records';
            case 'completed': return 'Complete';
            default: return 'Starting...';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">
                        {type === 'photo' ? 'Bulk Photo Upload' : 'Bulk Import Progress'}
                    </h3>
                    {progress.status === 'completed' && (
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <i className="pi pi-times"></i>
                        </button>
                    )}
                </div>

                <div className="p-5 space-y-4">
                    {/* Stage Indicator */}
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${progress.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            {getStageIcon()}
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">{getStageTitle()}</p>
                            <p className="text-sm text-slate-500">{progress.message}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between text-sm text-slate-600 mb-1">
                            <span>Progress</span>
                            <span>{progress.percentage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${progress.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${progress.percentage || 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    {progress.total > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <StatCard label="Total" value={progress.total} color="slate" />
                            <StatCard label="Created" value={progress.created || 0} color="green" />
                            <StatCard label="Updated" value={progress.updated || 0} color="blue" />
                            <StatCard label="Skipped" value={progress.skipped || 0} color="amber" />
                        </div>
                    )}

                    {/* Current Item */}
                    {progress.currentItem && progress.status !== 'completed' && (
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Currently Processing</p>
                            <p className="text-sm font-medium text-slate-800">{progress.currentItem.name}</p>
                            <p className="text-xs text-slate-500">
                                {progress.currentItem.index} of {progress.currentItem.total}
                            </p>
                        </div>
                    )}

                    {/* Errors */}
                    {progress.errors?.length > 0 && (
                        <details className="text-sm">
                            <summary className="text-red-600 cursor-pointer font-medium">
                                View errors ({progress.errors.length})
                            </summary>
                            <div className="mt-2 max-h-32 overflow-y-auto bg-red-50 rounded-lg p-2">
                                {progress.errors.map((err, idx) => (
                                    <p key={idx} className="text-xs text-red-700 py-1">
                                        {err.student_id || err.filename}: {err.error || err.reason}
                                    </p>
                                ))}
                            </div>
                        </details>
                    )}

                    {/* Close Button when complete */}
                    {progress.status === 'completed' && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color }) => {
    const colors = {
        slate: 'bg-slate-50 text-slate-700',
        green: 'bg-green-50 text-green-700',
        blue: 'bg-blue-50 text-blue-700',
        amber: 'bg-amber-50 text-amber-700'
    };
    return (
        <div className={`rounded-xl p-2 text-center ${colors[color]}`}>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs">{label}</p>
        </div>
    );
};

export default BulkImportProgressModal;