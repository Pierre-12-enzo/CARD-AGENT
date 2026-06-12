// pages/co-worker/BulkImport.jsx - COMPLETE WITH EMPLOYEE TEMPLATE
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, organizationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const BulkImport = () => {
    const { user } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [csvFile, setCsvFile] = useState(null);
    const [photoZipFile, setPhotoZipFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [importType, setImportType] = useState(null);

    useEffect(() => {
        const allowedOrgs = user?.permissions
            ?.filter(p => p.canUploadCSV)
            .map(p => p.organizationId) || [];

        organizationAPI.getAll({ limit: 100 }).then(res => {
            if (res.success) {
                const filteredOrgs = (res.organizations || []).filter(o => allowedOrgs.includes(o._id));
                setOrganizations(filteredOrgs);
            }
        });
    }, [user]);

    const handleOrgChange = (orgId) => {
        setSelectedOrgId(orgId);
        setSelectedOrg(organizations.find(o => o._id === orgId));
        setResult(null);
        setCsvFile(null);
        setPhotoZipFile(null);
    };

    const validateFile = (file, type) => {
        if (!file) return false;

        if (type === 'csv') {
            const isValid = file.type === 'text/csv' || file.name.endsWith('.csv');
            if (!isValid) {
                toast.error('Please select a valid CSV file');
                return false;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error('CSV file too large! Maximum size is 10MB');
                return false;
            }
        }

        if (type === 'zip') {
            const isValid = file.type === 'application/zip' || file.name.endsWith('.zip');
            if (!isValid) {
                toast.error('Please select a valid ZIP file');
                return false;
            }
            if (file.size > 100 * 1024 * 1024) {
                toast.error('ZIP file too large! Maximum size is 100MB');
                return false;
            }
        }

        return true;
    };

    const handleImport = async (withPhotos = false) => {
        if (!csvFile || !selectedOrgId) {
            toast.error('Please select an organization and CSV file');
            return;
        }

        if (withPhotos && !photoZipFile) {
            toast.error('Please select a ZIP file with photos');
            return;
        }

        setImportType(withPhotos);
        setShowConfirmation(true);
    };

    const executeImport = async () => {
        const withPhotos = importType;
        setLoading(true);
        setShowConfirmation(false);

        try {
            let res;
            if (withPhotos) {
                toast.loading('Importing students with photos...', { id: 'bulk-import' });
                res = await studentAPI.bulkImportWithPhotos(selectedOrgId, csvFile, photoZipFile);
                toast.dismiss('bulk-import');
            } else {
                toast.loading('Importing students...', { id: 'bulk-import' });
                res = await studentAPI.bulkImportCSV(selectedOrgId, csvFile);
                toast.dismiss('bulk-import');
            }

            if (res.success) {
                const created = res.results?.created || 0;
                const updated = res.results?.updated || 0;
                const skipped = res.results?.skipped || 0;
                const withPhotosCount = res.results?.withPhotos || 0;

                setResult({
                    type: 'success',
                    message: `✅ Import complete!`,
                    details: {
                        created,
                        updated,
                        skipped,
                        withPhotos: withPhotosCount
                    }
                });

                if (created > 0) toast.success(`${created} new records created`);
                if (updated > 0) toast.success(`${updated} existing records updated`);
                if (skipped > 0) toast.warning(`${skipped} records failed to import`);
                if (withPhotosCount > 0) toast.success(`${withPhotosCount} photos uploaded`);

                // Reset form after successful import
                setCsvFile(null);
                setPhotoZipFile(null);
                // Reset file inputs
                const csvInput = document.getElementById('csv-file');
                const zipInput = document.getElementById('zip-file');
                if (csvInput) csvInput.value = '';
                if (zipInput) zipInput.value = '';
            } else {
                toast.error(res.error || 'Import failed');
                setResult({ type: 'error', message: res.error || 'Import failed' });
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.error(error.response?.data?.error || error.message || 'Import failed');
            setResult({ type: 'error', message: error.response?.data?.error || error.message || 'Import failed' });
        } finally {
            setLoading(false);
            setImportType(null);
        }
    };

    const downloadStudentTemplate = () => {
        const csv = "student_id,name,class,level,residence,gender,academic_year\nS1A-001,John Doe,S1A,O-Level,Kigali,Male,2025\nS1A-002,Jane Smith,S1A,O-Level,Musanze,Female,2025\nS2A-001,Peter Pan,S2A,A-Level,Kigali,Male,2025";
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Student template downloaded!');
    };

    const downloadEmployeeTemplate = () => {
        const csv = "employeeId,name,department,position,gender,residence,phone,email\nEMP-001,John Doe,Finance,Accountant,Male,Kigali,0788123456,john@company.com\nEMP-002,Jane Smith,HR,Manager,Female,Musanze,0788987654,jane@company.com\nEMP-003,Peter Pan,IT,Developer,Male,Kigali,0788112233,peter@company.com";
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employees_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Employee template downloaded!');
    };

    const getOrgTypeHint = () => {
        if (!selectedOrg) return null;
        if (selectedOrg.type === 'university') {
            return (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                    💡 For universities: Put year and section in Class field (e.g., "Year 1 CS-A")
                </div>
            );
        }
        if (selectedOrg.type === 'corporate') {
            return (
                <div className="mt-2 text-xs text-purple-600 bg-purple-50 p-2 rounded-lg">
                    💡 For corporate: Use Department field for team/division, Position for job title
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">Bulk Import</h2>
                <p className="text-slate-500 mt-1">Import students or employees from CSV files</p>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-5 text-center">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="pi pi-exclamation-triangle text-amber-600 text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Import</h3>
                            <p className="text-slate-500 text-sm mb-4">
                                You are about to import records into <strong>{selectedOrg?.name}</strong>.
                                {importType && <span className="block mt-1">This will also upload photos from the ZIP file.</span>}
                            </p>
                            <div className="bg-amber-50 rounded-xl p-3 mb-4 text-left">
                                <p className="text-xs text-amber-700 flex items-center gap-2">
                                    <i className="pi pi-info-circle"></i>
                                    <span>This action may take a few moments depending on file size.</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeImport}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600"
                                >
                                    Confirm Import
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 max-w-2xl">
                {/* Organization Selection */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Organization *</label>
                    <select
                        value={selectedOrgId}
                        onChange={(e) => handleOrgChange(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
                    >
                        <option value="">Select organization...</option>
                        {organizations.map(org => (
                            <option key={org._id} value={org._id}>
                                {org.type === 'corporate' ? '🏢' : org.type === 'university' ? '🎓' : '🏫'} {org.name}
                            </option>
                        ))}
                    </select>
                    {getOrgTypeHint()}
                </div>

                {/* Template Downloads */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Download Templates</label>
                    <div className="flex gap-3">
                        <button
                            onClick={downloadStudentTemplate}
                            className="flex-1 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="pi pi-download"></i>
                            Student Template
                        </button>
                        <button
                            onClick={downloadEmployeeTemplate}
                            className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="pi pi-download"></i>
                            Employee Template
                        </button>
                    </div>
                </div>

                {/* CSV Upload */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">CSV File *</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-red-300 transition-colors">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            id="csv-file"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (validateFile(file, 'csv')) {
                                    setCsvFile(file);
                                    setResult(null);
                                }
                            }}
                        />
                        <label htmlFor="csv-file" className="cursor-pointer">
                            <i className="pi pi-file-excel text-3xl text-slate-400 mb-2 block"></i>
                            <p className="text-slate-600 font-medium">
                                {csvFile ? csvFile.name : 'Click to upload CSV file'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Accepted format: .csv (Max 10MB)</p>
                        </label>
                    </div>
                </div>

                {/* Photo ZIP (Optional) */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Photos ZIP (Optional)
                        <span className="text-xs text-slate-400 ml-2">- name photos as student_id.jpg</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-red-300 transition-colors">
                        <input
                            type="file"
                            accept=".zip"
                            className="hidden"
                            id="zip-file"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (validateFile(file, 'zip')) {
                                    setPhotoZipFile(file);
                                }
                            }}
                        />
                        <label htmlFor="zip-file" className="cursor-pointer">
                            <i className="pi pi-images text-3xl text-slate-400 mb-2 block"></i>
                            <p className="text-slate-600 font-medium">
                                {photoZipFile ? photoZipFile.name : 'Click to upload photos ZIP (optional)'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Accepted format: .zip (Max 100MB)</p>
                        </label>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <i className="pi pi-info-circle"></i> Photo Naming Guide
                    </h4>
                    <p className="text-xs text-amber-700">
                        Name each photo to match the <strong>student_id/employeeId</strong> in your CSV.<br />
                        Example: <code className="bg-amber-100 px-1 rounded">S1A-001.jpg</code> or <code className="bg-amber-100 px-1 rounded">EMP-001.jpg</code>
                    </p>
                </div>

                {/* Result Display */}
                {result && (
                    <div className={`p-4 rounded-xl mb-5 ${result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                        <div className={`flex items-center gap-2 mb-2 ${result.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                            <i className={`pi ${result.type === 'success' ? 'pi-check-circle' : 'pi-times-circle'}`}></i>
                            <span className="font-medium">{result.message}</span>
                        </div>
                        {result.details && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                <div className="bg-green-100 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-green-700">{result.details.created}</p>
                                    <p className="text-xs text-green-600">Created</p>
                                </div>
                                <div className="bg-blue-100 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-blue-700">{result.details.updated}</p>
                                    <p className="text-xs text-blue-600">Updated</p>
                                </div>
                                <div className="bg-amber-100 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-amber-700">{result.details.skipped}</p>
                                    <p className="text-xs text-amber-600">Skipped</p>
                                </div>
                                {result.details.withPhotos > 0 && (
                                    <div className="bg-purple-100 rounded-lg p-2 text-center col-span-3">
                                        <p className="text-lg font-bold text-purple-700">{result.details.withPhotos}</p>
                                        <p className="text-xs text-purple-600">Photos Uploaded</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => handleImport(false)}
                        disabled={!csvFile || !selectedOrgId || loading}
                        className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {loading && importType === false ? (
                            <><i className="pi pi-spinner pi-spin"></i><span>Importing...</span></>
                        ) : (
                            <><i className="pi pi-upload"></i><span>Import CSV Only</span></>
                        )}
                    </button>

                    <button
                        onClick={() => handleImport(true)}
                        disabled={!csvFile || !selectedOrgId || loading}
                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {loading && importType === true ? (
                            <><i className="pi pi-spinner pi-spin"></i><span>Importing...</span></>
                        ) : (
                            <><i className="pi pi-images"></i><span>Import + Photos</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkImport;