// pages/co-worker/BulkImport.jsx - CARD-AGENT
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, organizationAPI } from '../../services/api';

const BulkImport = () => {
    const { user } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [photoZipFile, setPhotoZipFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        // Only show orgs where user has canUploadCSV permission
        const allowedOrgs = user?.permissions
            ?.filter(p => p.canUploadCSV)
            .map(p => p.organizationId) || [];

        organizationAPI.getAll({ limit: 100 }).then(res => {
            if (res.success) {
                setOrganizations((res.organizations || []).filter(o => allowedOrgs.includes(o._id)));
            }
        });
    }, [user]);

    const handleImport = async (withPhotos = false) => {
        if (!csvFile || !selectedOrgId) { alert('Select organization and CSV file'); return; }
        setLoading(true); setResult(null);
        try {
            let res;
            if (withPhotos) {
                res = await studentAPI.bulkImportWithPhotos(selectedOrgId, csvFile, photoZipFile);
            } else {
                res = await studentAPI.bulkImportCSV(selectedOrgId, csvFile);
            }
            setResult({ type: 'success', message: `Created: ${res.results?.created || 0}, Updated: ${res.results?.updated || 0}` });
        } catch (error) {
            setResult({ type: 'error', message: error.message || 'Import failed' });
        } finally { setLoading(false); }
    };

    const downloadTemplate = () => {
        const csv = "student_id,name,class,level,residence,gender,academic_year\nSTU001,John Doe,S1A,O-Level,Kigali,Male,2025\nSTU002,Jane Smith,S2B,A-Level,Musanze,Female,2025";
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'import_template.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">Bulk Import</h2>
                <p className="text-slate-500 mt-1">Import students/employees from CSV</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 max-w-2xl">
                {/* Organization */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Organization *</label>
                    <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                        <option value="">Select organization...</option>
                        {organizations.map(org => (
                            <option key={org._id} value={org._id}>{org.name}</option>
                        ))}
                    </select>
                </div>

                {/* CSV Upload */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">CSV File *</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-red-300 transition-colors">
                        <input type="file" accept=".csv" className="hidden" id="csv-file" onChange={(e) => setCsvFile(e.target.files[0])} />
                        <label htmlFor="csv-file" className="cursor-pointer">
                            <i className="pi pi-file-excel text-3xl text-slate-400 mb-2 block"></i>
                            <p className="text-slate-600">{csvFile ? csvFile.name : 'Click to upload CSV'}</p>
                        </label>
                    </div>
                    <button onClick={downloadTemplate} className="mt-2 text-xs text-red-600 hover:text-red-700">
                        <i className="pi pi-download mr-1"></i>Download template
                    </button>
                </div>

                {/* Photo ZIP (Optional) */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Photos ZIP (Optional)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-red-300 transition-colors">
                        <input type="file" accept=".zip" className="hidden" id="zip-file" onChange={(e) => setPhotoZipFile(e.target.files[0])} />
                        <label htmlFor="zip-file" className="cursor-pointer">
                            <i className="pi pi-images text-3xl text-slate-400 mb-2 block"></i>
                            <p className="text-slate-600">{photoZipFile ? photoZipFile.name : 'Click to upload photos ZIP'}</p>
                        </label>
                    </div>
                </div>

                {/* Result */}
                {result && (
                    <div className={`p-4 rounded-xl mb-4 ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <i className={`pi ${result.type === 'success' ? 'pi-check-circle' : 'pi-times-circle'} mr-2`}></i>
                        {result.message}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                    <button onClick={() => handleImport(false)} disabled={!csvFile || loading}
                        className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 disabled:opacity-50 transition-all">
                        {loading ? <i className="pi pi-spinner pi-spin mr-2"></i> : <i className="pi pi-upload mr-2"></i>}
                        Import CSV
                    </button>
                    {photoZipFile && (
                        <button onClick={() => handleImport(true)} disabled={!csvFile || loading}
                            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all">
                            Import CSV + Photos
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkImport;