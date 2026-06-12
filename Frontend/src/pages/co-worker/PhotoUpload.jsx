// pages/co-worker/PhotoUpload.jsx - COMPLETE WITH PER-ORGANIZATION STATS
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, organizationAPI, cardAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PhotoUpload = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [results, setResults] = useState([]);
  const [photoZipFile, setPhotoZipFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [studentsWithoutPhotos, setStudentsWithoutPhotos] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

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
    if (selectedOrgId) {
      loadStudents();
      fetchStudentsWithoutPhotos();
    } else {
      // Reset when no organization selected
      setStudents([]);
      setStudentsWithoutPhotos(null);
    }
  }, [selectedOrgId]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getByOrganization(selectedOrgId, { limit: 500, hasPhoto: 'false' });
      if (res.success) setStudents(res.students || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsWithoutPhotos = async () => {
    if (!selectedOrgId) {
      setStudentsWithoutPhotos(null);
      return;
    }
    setLoadingStats(true);
    try {
      console.log('📊 Fetching stats for organization:', selectedOrgId);

      const statsResponse = await studentAPI.getStats({ organizationId: selectedOrgId });

      if (statsResponse.success) {
        const withoutPhotos = (statsResponse.stats?.studentsWithoutPhotos || 0) + (statsResponse.stats?.employeesWithoutPhotos || 0);
        setStudentsWithoutPhotos({
          count: withoutPhotos,
          total: statsResponse.stats?.totalPeople || 0,
          hasPending: withoutPhotos > 0
        });
      } else {
        console.error('Stats response not successful:', statsResponse);
        setStudentsWithoutPhotos({ count: 0, total: 0, hasPending: false });
      }
    } catch (error) {
      console.error('Failed to fetch photo stats:', error);

      // Handle 403 specifically
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view stats for this organization');
        setStudentsWithoutPhotos({ count: 0, total: 0, hasPending: false });
      } else {
        toast.error('Failed to load photo statistics');
        setStudentsWithoutPhotos({ count: 0, total: 0, hasPending: false });
      }
    } finally {
      setLoadingStats(false);
    }
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

        if (file.size > 5 * 1024 * 1024) {
          toast.error('Photo too large! Maximum size is 5MB');
          setUploading(null);
          return;
        }

        if (!file.type.startsWith('image/')) {
          toast.error('Only image files are allowed');
          setUploading(null);
          return;
        }

        const fd = new FormData();
        fd.append('studentId', studentId);
        fd.append('photo', file);
        try {
          const res = await cardAPI.uploadStudentPhoto(fd);
          if (res.success) {
            toast.success(`Photo uploaded successfully for ${res.student?.name || 'student'}`);
            setResults(prev => [{ type: 'success', message: res.student?.name || 'Photo uploaded' }, ...prev.slice(0, 9)]);
            loadStudents();
            fetchStudentsWithoutPhotos();
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Upload failed');
          setResults(prev => [{ type: 'error', message: 'Upload failed' }, ...prev.slice(0, 9)]);
        }
        setUploading(null);
      };
      input.click();
    } catch (e) {
      setUploading(null);
      toast.error('Failed to select file');
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization first');
      return;
    }

    if (!studentsWithoutPhotos?.hasPending) {
      toast.error('All students and employees in this organization already have photos! No upload needed.');
      return;
    }

    if (!photoZipFile) {
      toast.error('Please select a ZIP file containing photos');
      return;
    }

    if (photoZipFile.size > 100 * 1024 * 1024) {
      toast.error('ZIP file too large! Maximum size is 100MB');
      return;
    }

    const confirmed = window.confirm(
      `📸 Bulk Photo Upload\n\n` +
      `Organization: ${organizations.find(o => o._id === selectedOrgId)?.name || 'Selected'}\n` +
      `People without photos: ${studentsWithoutPhotos.count}\n` +
      `Photos in ZIP: Will be matched by ID\n\n` +
      `⚠️ Important:\n` +
      `• Photos will be matched by student_id/employeeId\n` +
      `• Only people without photos will be updated\n` +
      `• Existing photos will NOT be replaced\n` +
      `• Unmatched photos will be skipped\n\n` +
      `Continue with upload?`
    );

    if (!confirmed) return;

    setBulkUploading(true);
    try {
      const formData = new FormData();
      formData.append('photoZip', photoZipFile);
      formData.append('organizationId', selectedOrgId);

      const res = await studentAPI.bulkUploadPhotos(formData);

      if (res.success) {
        const { uploaded, skipped, failed } = res.results;
        if (uploaded > 0) {
          toast.success(`✅ Successfully uploaded ${uploaded} photos!`);
        }
        if (skipped?.length > 0) {
          toast.warning(`⚠️ ${skipped.length} photos were skipped (no matching student or already has photo)`);
        }
        if (failed > 0) {
          toast.error(`❌ ${failed} photos failed to upload`);
        }

        setResults([
          { type: 'success', message: `Uploaded: ${uploaded} photos` },
          ...(skipped?.length > 0 ? [{ type: 'warning', message: `Skipped: ${skipped.length} photos` }] : []),
          ...(failed > 0 ? [{ type: 'error', message: `Failed: ${failed} photos` }] : []),
          ...results.slice(0, 7)
        ]);

        loadStudents();
        fetchStudentsWithoutPhotos();
        setPhotoZipFile(null);
        const fileInput = document.getElementById('bulk-photo');
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(res.error || 'Bulk upload failed');
        setResults(prev => [{ type: 'error', message: res.error || 'Bulk upload failed' }, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error(error.response?.data?.error || 'Bulk upload failed');
      setResults(prev => [{ type: 'error', message: 'Bulk upload failed' }, ...prev.slice(0, 9)]);
    } finally {
      setBulkUploading(false);
    }
  };

  const getWarningMessage = () => {
    if (!selectedOrgId) {
      return null;
    }
    if (loadingStats) {
      return { type: 'info', message: 'Loading organization photo status...' };
    }
    if (!studentsWithoutPhotos?.hasPending && studentsWithoutPhotos?.total > 0) {
      return { type: 'success', message: '✓ All people in this organization already have photos! No upload needed.' };
    }
    if (studentsWithoutPhotos?.count === 0 && studentsWithoutPhotos?.total === 0) {
      return { type: 'info', message: 'No students or employees found in this organization. Add some first.' };
    }
    if (studentsWithoutPhotos?.count > 0) {
      return {
        type: 'info',
        message: `📸 ${studentsWithoutPhotos.count} person(s) need photos. Upload a ZIP file with photos named by ID.`,
        action: true
      };
    }
    return null;
  };

  const warning = getWarningMessage();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">Photo Upload</h2>
        <p className="text-slate-500 mt-1">Upload photos for students and employees</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Organization</label>
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
        >
          <option value="">Select organization...</option>
          {organizations.map(org => (
            <option key={org._id} value={org._id}>{org.name}</option>
          ))}
        </select>
      </div>

      {warning && (
        <div className={`rounded-xl p-4 ${warning.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
          warning.type === 'success' ? 'bg-green-50 border border-green-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
          <div className="flex items-start gap-3">
            <i className={`pi ${warning.type === 'warning' ? 'pi-exclamation-triangle text-amber-600' :
              warning.type === 'success' ? 'pi-check-circle text-green-600' :
                'pi-info-circle text-blue-600'
              } text-sm mt-0.5`}></i>
            <div className="flex-1">
              <p className={`text-sm ${warning.type === 'warning' ? 'text-amber-700' :
                warning.type === 'success' ? 'text-green-700' :
                  'text-blue-700'
                }`}>
                {warning.message}
              </p>
              {warning.action && studentsWithoutPhotos?.count > 0 && (
                <div className="mt-2 flex gap-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    📷 Pending: {studentsWithoutPhotos.count}
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    ✅ Completed: {(studentsWithoutPhotos?.total || 0) - (studentsWithoutPhotos?.count || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Bulk Upload (ZIP)</h3>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <i className="pi pi-info-circle"></i> How It Works
          </h4>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Upload a ZIP file containing photos named as <strong>student_id.jpg</strong> or <strong>employeeId.jpg</strong></li>
            <li>The system will match photos to existing people without photos</li>
            <li>Only people WITHOUT photos will be updated - existing photos are safe</li>
            <li>Unmatched photos will be skipped with a report</li>
            <li>Supported formats: JPG, JPEG, PNG</li>
          </ul>
        </div>

        <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${!studentsWithoutPhotos?.hasPending && studentsWithoutPhotos?.total > 0
          ? 'border-green-300 bg-green-50/30 cursor-not-allowed opacity-60'
          : !selectedOrgId || studentsWithoutPhotos?.total === 0
            ? 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
            : 'border-slate-300 hover:border-red-300 cursor-pointer'
          }`}>
          <input
            type="file"
            accept=".zip"
            className="hidden"
            id="bulk-photo"
            onChange={(e) => setPhotoZipFile(e.target.files[0])}
            disabled={!studentsWithoutPhotos?.hasPending || !selectedOrgId || studentsWithoutPhotos?.total === 0}
          />
          <label
            htmlFor="bulk-photo"
            className={`block ${(!studentsWithoutPhotos?.hasPending || !selectedOrgId || studentsWithoutPhotos?.total === 0) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <i className={`pi pi-images text-3xl mb-2 block ${!studentsWithoutPhotos?.hasPending && studentsWithoutPhotos?.total > 0
              ? 'text-green-400'
              : !selectedOrgId || studentsWithoutPhotos?.total === 0
                ? 'text-slate-300'
                : 'text-slate-400'
              }`}></i>
            <span className="text-sm text-slate-600">
              {photoZipFile ? photoZipFile.name : 'Select ZIP file with photos'}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Name photos as student_id.jpg (e.g., S1A-001.jpg)
            </p>
            {photoZipFile && (
              <p className="text-xs text-slate-500 mt-2">
                File size: {(photoZipFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </label>
        </div>

        <button
          onClick={handleBulkUpload}
          disabled={!photoZipFile || bulkUploading || !selectedOrgId || !studentsWithoutPhotos?.hasPending || studentsWithoutPhotos?.total === 0}
          className="w-full mt-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {bulkUploading ? (
            <><i className="pi pi-spinner pi-spin mr-2"></i>Uploading...</>
          ) : (
            <><i className="pi pi-upload mr-2"></i>
              {!selectedOrgId
                ? 'Select Organization First'
                : !studentsWithoutPhotos?.hasPending && studentsWithoutPhotos?.total > 0
                  ? 'All People Have Photos ✓'
                  : studentsWithoutPhotos?.total === 0
                    ? 'No People in Organization'
                    : 'Upload Photos for People Without Photos'}
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">
          Individual Upload
          {studentsWithoutPhotos && selectedOrgId && (
            <span className="text-sm font-normal text-slate-500 ml-2">
              ({studentsWithoutPhotos.count} without photos)
            </span>
          )}
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-500 mt-2">Loading...</p>
          </div>
        ) : !selectedOrgId ? (
          <div className="text-center py-8">
            <i className="pi pi-info-circle text-4xl text-slate-300 mb-2 block"></i>
            <p className="text-slate-500">Select an organization to view people without photos</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <i className="pi pi-check-circle text-4xl text-green-400 mb-2 block"></i>
            <p className="text-slate-500">All people have photos!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.slice(0, 50).map(s => (
              <div key={s._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{s.student_id}</p>
                </div>
                <button
                  onClick={() => handleSingleUpload(s._id)}
                  disabled={uploading === s._id}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {uploading === s._id ? (
                    <><i className="pi pi-spinner pi-spin mr-1"></i>Uploading...</>
                  ) : (
                    <>Upload Photo</>
                  )}
                </button>
              </div>
            ))}
            {students.length > 50 && (
              <p className="text-center text-xs text-slate-400 py-2">
                +{students.length - 50} more people. Use filters to find specific people.
              </p>
            )}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center justify-between">
            <span>Recent Activity</span>
            <button
              onClick={() => setResults([])}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Clear All
            </button>
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`text-sm py-2 px-3 rounded-lg flex items-center gap-2 ${r.type === 'success' ? 'text-green-700 bg-green-50' :
                r.type === 'warning' ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                }`}>
                <i className={`pi ${r.type === 'success' ? 'pi-check-circle' :
                  r.type === 'warning' ? 'pi-exclamation-triangle' : 'pi-times-circle'
                  } text-sm`}></i>
                <span>{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;