// pages/co-worker/PhotoUpload.jsx - CARD-AGENT
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, organizationAPI, cardAPI } from '../../services/api';

const PhotoUpload = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [results, setResults] = useState([]);
  const [photoZipFile, setPhotoZipFile] = useState(null);

  useEffect(() => {
    const allowedOrgs = user?.permissions
      ?.filter(p => p.canUploadPhotos)
      .map(p => p.organizationId) || [];
    
    organizationAPI.getAll({ limit: 100 }).then(res => {
      if (res.success) {
        setOrganizations((res.organizations || []).filter(o => allowedOrgs.includes(o._id)));
      }
    });
  }, [user]);

  useEffect(() => {
    if (selectedOrgId) loadStudents();
  }, [selectedOrgId]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getByOrganization(selectedOrgId, { limit: 500, hasPhoto: 'false' });
      if (res.success) setStudents(res.students || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSingleUpload = async (studentId) => {
    setUploading(studentId);
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { setUploading(null); return; }
        const fd = new FormData();
        fd.append('studentId', studentId);
        fd.append('photo', file);
        try {
          const res = await cardAPI.uploadStudentPhoto(fd);
          if (res.success) {
            setResults(prev => [...prev, { type: 'success', message: res.student?.name || 'Photo uploaded' }]);
            loadStudents();
          }
        } catch (err) { setResults(prev => [...prev, { type: 'error', message: 'Upload failed' }]); }
        setUploading(null);
      };
      input.click();
    } catch (e) { setUploading(null); }
  };

  const handleBulkUpload = async () => {
    if (!photoZipFile || !selectedOrgId) return;
    setUploading('bulk');
    try {
      const res = await studentAPI.bulkImportWithPhotos(selectedOrgId, null, photoZipFile);
      setResults([{ type: 'success', message: `Uploaded photos for ${res.results?.withPhotos || 0} people` }]);
      loadStudents();
    } catch (e) { setResults([{ type: 'error', message: 'Bulk upload failed' }]); }
    finally { setUploading(null); setPhotoZipFile(null); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">Photo Upload</h2>
        <p className="text-slate-500 mt-1">Upload photos for students and employees</p>
      </div>

      {/* Organization Selector */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm">
          <option value="">Select organization...</option>
          {organizations.map(org => (
            <option key={org._id} value={org._id}>{org.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk Upload */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Bulk Upload (ZIP)</h3>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center mb-3">
          <input type="file" accept=".zip" className="hidden" id="bulk-photo" onChange={(e) => setPhotoZipFile(e.target.files[0])} />
          <label htmlFor="bulk-photo" className="cursor-pointer">
            <i className="pi pi-images text-2xl text-slate-400 mb-1 block"></i>
            <span className="text-sm text-slate-600">{photoZipFile ? photoZipFile.name : 'Upload ZIP with photos (named as student_id.jpg)'}</span>
          </label>
        </div>
        <button onClick={handleBulkUpload} disabled={!photoZipFile || uploading === 'bulk'}
          className="w-full py-2.5 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 disabled:opacity-50">
          {uploading === 'bulk' ? <i className="pi pi-spinner pi-spin mr-2"></i> : null}
          Bulk Upload Photos
        </button>
      </div>

      {/* Individual Upload */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Individual Upload ({students.length} without photos)</h3>
        {loading ? (
          <div className="text-center py-8"><div className="w-8 h-8 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto"></div></div>
        ) : students.length === 0 ? (
          <p className="text-slate-400 text-center py-8">All people have photos!</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.slice(0, 50).map(s => (
              <div key={s._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.student_id}</p>
                </div>
                <button onClick={() => handleSingleUpload(s._id)} disabled={uploading === s._id}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                  {uploading === s._id ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
          <h3 className="font-semibold text-slate-800 mb-2">Results</h3>
          {results.map((r, i) => (
            <div key={i} className={`text-sm ${r.type === 'success' ? 'text-green-600' : 'text-red-600'} py-1`}>
              <i className={`pi ${r.type === 'success' ? 'pi-check-circle' : 'pi-times-circle'} mr-2`}></i>{r.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;