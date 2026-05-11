// pages/dashboard/CoWorkers.jsx - CARD-AGENT NAVY & CRIMSON
import React, { useState, useEffect } from 'react';
import { coWorkerAPI, organizationAPI } from '../../services/api';
import { AnimatePresence, motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
const CoWorkers = () => {
  const [coWorkers, setCoWorkers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [filteredCoWorkers, setFilteredCoWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCoWorker, setSelectedCoWorker] = useState(null);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);


  // Form state
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '', isActive: true,
    permissions: []
  });

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCoWorkers();
  }, [coWorkers, searchTerm, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coWorkersRes, orgsRes] = await Promise.all([
        coWorkerAPI.getAll(),
        organizationAPI.getAll({ limit: 100 })
      ]);
      if (coWorkersRes.success) {
        setCoWorkers(coWorkersRes.coWorkers || []);
        setFilteredCoWorkers(coWorkersRes.coWorkers || []);
      }
      if (orgsRes.success) {
        setOrganizations(orgsRes.organizations || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCoWorkers = () => {
    let filtered = [...coWorkers];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.firstName?.toLowerCase().includes(term) ||
        c.lastName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term)
      );
    }
    if (statusFilter === 'active') filtered = filtered.filter(c => c.isActive);
    if (statusFilter === 'inactive') filtered = filtered.filter(c => !c.isActive);
    setFilteredCoWorkers(filtered);
    setCurrentPage(1);
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
  };

  const handleEdit = (coWorker) => {
    setSelectedCoWorker(coWorker);
    setFormData({
      firstName: coWorker.firstName || '',
      lastName: coWorker.lastName || '',
      email: coWorker.email || '',
      phoneNumber: coWorker.phoneNumber || '',
      isActive: coWorker.isActive !== false,
      permissions: coWorker.permissions || []
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedCoWorker(null);
    setFormData({
      firstName: '', lastName: '', email: '', phoneNumber: '', isActive: true,
      permissions: organizations.map(org => ({
        organizationId: org._id,
        organizationName: org.name,
        canViewAnalytics: false, canGenerateCards: false, canManageStudents: false,
        canManageTemplates: false, canUploadCSV: false, canUploadPhotos: false,
        canMarkAttendance: false, canViewAuditLogs: false
      }))
    });
    setShowModal(true);
  };

  const handlePermissionChange = (orgId, permKey) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.map(p =>
        p.organizationId === orgId ? { ...p, [permKey]: !p[permKey] } : p
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      showNotification('error', 'First name, last name, and email are required');
      return;
    }

    setSaving(true);
    try {
      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        permissions: formData.permissions.filter(p =>
          p.canGenerateCards || p.canManageStudents || p.canManageTemplates ||
          p.canUploadCSV || p.canUploadPhotos || p.canViewAnalytics || p.canViewAuditLogs
        )
      };

      let response;
      if (selectedCoWorker) {
        response = await coWorkerAPI.update(selectedCoWorker._id, data);
      } else {
        response = await coWorkerAPI.create(data);
      }

      if (response.success) {
        showNotification('success', selectedCoWorker ? 'Co-worker updated!' : 'Co-worker created! Invitation email sent.');
        setShowModal(false);
        loadData();
      } else {
        showNotification('error', response.error || 'Failed to save');
      }
    } catch (error) {
      showNotification('error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (permanent = false) => {
    if (!selectedCoWorker) return;
    try {
      const response = await coWorkerAPI.delete(selectedCoWorker._id, permanent);
      if (response.success) {
        showNotification('success', permanent ? 'Permanently deleted' : 'Deactivated successfully');
        setShowDeleteModal(false);
        setSelectedCoWorker(null);
        loadData();
      }
    } catch (error) {
      showNotification('error', error.message || 'Failed to delete');
    }
  };

  const handleResendInvite = async (id) => {
    try {
      const response = await coWorkerAPI.resendInvite(id);
      if (response.success) {
        showNotification('success', 'Invitation resent!');
      }
    } catch (error) {
      showNotification('error', error.message || 'Failed to resend');
    }
  };

  // Download Co-Worker import template
  const downloadCoWorkerTemplate = () => {
    const template = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '0788123456',
        organizationName: 'Monfort',  // Must match an existing organization
        canManageStudents: 'YES',
        canGenerateCards: 'YES',
        canManageTemplates: 'NO',
        canUploadCSV: 'NO',
        canUploadPhotos: 'NO',
        canViewAnalytics: 'NO',
        canViewAuditLogs: 'NO'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);

    // Add column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Co-Workers Template');
    XLSX.writeFile(wb, 'co_workers_import_template.xlsx');
  };

  // Handle file upload
  const handleBulkFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setBulkPreview(jsonData.slice(0, 5)); // Show first 5 rows
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!bulkFile) {
      toast.error('Please upload a file first');
      return;
    }

    setBulkLoading(true);
    setBulkResults(null);

    try {
      const data = new Uint8Array(await bulkFile.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const staffList = jsonData.map(row => ({
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phoneNumber: row.phoneNumber?.toString(),
        permissions: [{
          organizationName: row.organizationName,
          canManageStudents: String(row.canManageStudents).toUpperCase() === 'YES',
          canGenerateCards: String(row.canGenerateCards).toUpperCase() === 'YES',
          canManageTemplates: String(row.canManageTemplates).toUpperCase() === 'YES',
          canUploadCSV: String(row.canUploadCSV).toUpperCase() === 'YES',
          canUploadPhotos: String(row.canUploadPhotos).toUpperCase() === 'YES',
          canViewAnalytics: String(row.canViewAnalytics).toUpperCase() === 'YES',
          canViewAuditLogs: String(row.canViewAuditLogs).toUpperCase() === 'YES'
        }]
      }));

      const response = await coWorkerAPI.bulkCreate(staffList);
      setBulkResults(response.results);

      if (response.results?.success?.length > 0) {
        toast.success(`${response.results.success.length} co-workers imported!`);
        loadData();
      }
      if (response.results?.failed?.length > 0) {
        toast.error(`${response.results.failed.length} failed to import`);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Failed to import co-workers');
    } finally {
      setBulkLoading(false);
    }
  };

  const totalPages = Math.ceil(filteredCoWorkers.length / itemsPerPage) || 1;
  const paginatedCoWorkers = filteredCoWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = coWorkers.filter(c => c.isActive).length;
  const pendingCount = coWorkers.filter(c => !c.lastLogin && c.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-semibold">Loading co-workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
            Co-Workers
          </h2>
          <p className="text-slate-500 mt-1">Manage team members and their organization permissions</p>
        </div>
        <div className='flex gap-3'>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg"
          >
            <i className="pi pi-upload"></i>
            <span>Bulk Import</span>
          </button>
          <button onClick={handleAddNew}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl">
            <i className="pi pi-user-plus"></i>
            <span>Add Co-Worker</span>
          </button>
        </div>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <QuickStat icon="pi pi-users" label="Total" value={coWorkers.length} color="slate" />
        <QuickStat icon="pi pi-check-circle" label="Active" value={activeCount} color="red" />
        <QuickStat icon="pi pi-envelope" label="Pending" value={pendingCount} color="slate" />
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Search by name, email..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
            <option value={10}>10/page</option>
            <option value={25}>25/page</option>
            <option value={50}>50/page</option>
          </select>
        </div>
        {(searchTerm || statusFilter !== 'all') && (
          <p className="mt-3 text-sm text-slate-500">
            Found <span className="font-semibold text-slate-700">{filteredCoWorkers.length}</span> co-workers
          </p>
        )}
      </div>

      {/* Co-Workers Grid */}
      {filteredCoWorkers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCoWorkers.map((coWorker) => (
              <CoWorkerCard
                key={coWorker._id}
                coWorker={coWorker}
                onEdit={() => handleEdit(coWorker)}
                onResend={() => handleResendInvite(coWorker._id)}
                onDelete={() => { setSelectedCoWorker(coWorker); setShowDeleteModal(true); }}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing {Math.min(itemsPerPage, filteredCoWorkers.length)} of {filteredCoWorkers.length}
              </span>
              <div className="flex items-center space-x-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-50">
                  <i className="pi pi-chevron-left text-xs"></i>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (currentPage <= 3) p = i + 1;
                  else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = currentPage - 2 + i;
                  return (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === p ? 'bg-red-600 text-white' : 'border border-slate-200 text-slate-600'}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-50">
                  <i className="pi pi-chevron-right text-xs"></i>
                </button>
              </div>
            </div>
          )}
        </>

      ) : (
        <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-slate-200/50">
          <i className="pi pi-users text-5xl text-slate-300 mb-4 block"></i>
          <p className="text-slate-500 text-lg font-medium">No co-workers found</p>
          <p className="text-slate-400 text-sm mt-1">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first team member'}
          </p>
        </div>
      )}

      {/* Notification Toast */}
      <AnimatePresence>
        {notification.show && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 right-4 z-[100] max-w-md">
            <div className={`rounded-xl shadow-lg p-4 flex items-start border-l-4 ${notification.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <i className={`pi ${notification.type === 'success' ? 'pi-check-circle text-green-500' : 'pi-exclamation-triangle text-red-500'} text-xl mr-3`}></i>
              <p className={`text-sm font-medium flex-1 ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{notification.message}</p>
              <button onClick={() => setNotification({ show: false })} className="text-slate-400 hover:text-slate-600">
                <i className="pi pi-times"></i>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">
                  {selectedCoWorker ? 'Edit Co-Worker' : 'Add Co-Worker'}
                </h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                  <i className="pi pi-times text-slate-600"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="p-5 space-y-5">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="First Name *" name="firstName" value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} />
                    <InputField label="Last Name *" name="lastName" value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Email *" name="email" type="email" value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!!selectedCoWorker} />
                    <InputField label="Phone" name="phoneNumber" type="tel" value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))} />
                  </div>

                  {/* Status Toggle (Edit only) */}
                  {selectedCoWorker && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Account Status</p>
                        <p className="text-xs text-slate-500">{formData.isActive ? 'Active - can login' : 'Inactive - cannot login'}</p>
                      </div>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${formData.isActive ? 'bg-red-600' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.isActive ? 'left-6' : 'left-0.5'}`}></span>
                      </button>
                    </div>
                  )}

                  {/* Organization Permissions */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Organization Permissions
                    </label>
                    {organizations.length === 0 ? (
                      <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl text-center">
                        No organizations yet. Create organizations first to assign permissions.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {organizations.map(org => {
                          const orgPerms = formData.permissions.find(p => p.organizationId === org._id) || {};
                          const activeCount = Object.values(orgPerms).filter(v => v === true).length - 2;
                          return (
                            <details key={org._id} className="bg-slate-50 rounded-xl border border-slate-200 group">
                              <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 rounded-xl">
                                <div className="flex items-center space-x-2">
                                  <i className={`pi pi-chevron-right text-xs text-slate-400 transition-transform group-open:rotate-90`}></i>
                                  <span className="text-sm font-medium text-slate-700">{org.name}</span>
                                  <span className="text-xs text-slate-400 capitalize">({org.type})</span>
                                </div>
                                {activeCount > 0 && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{activeCount} permissions</span>
                                )}
                              </summary>
                              <div className="p-3 grid grid-cols-2 gap-2 border-t border-slate-200">
                                {[
                                  { key: 'canManageStudents', label: 'Students', icon: 'pi pi-users' },
                                  { key: 'canGenerateCards', label: 'Generate Cards', icon: 'pi pi-qrcode' },
                                  { key: 'canManageTemplates', label: 'Templates', icon: 'pi pi-image' },
                                  { key: 'canUploadPhotos', label: 'Upload Photos', icon: 'pi pi-camera' },
                                  { key: 'canUploadCSV', label: 'Import CSV', icon: 'pi pi-file-excel' },
                                  { key: 'canViewAnalytics', label: 'Analytics', icon: 'pi pi-chart-line' },
                                  { key: 'canViewAuditLogs', label: 'Audit Logs', icon: 'pi pi-history' },
                                  { key: 'canMarkAttendance', label: 'Attendance', icon: 'pi pi-calendar' },
                                ].map(perm => (
                                  <label key={perm.key}
                                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${orgPerms[perm.key] ? 'bg-red-50 border border-red-200' : 'hover:bg-white'
                                      }`}>
                                    <input type="checkbox" checked={orgPerms[perm.key] || false}
                                      onChange={() => handlePermissionChange(org._id, perm.key)}
                                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
                                    <i className={`${perm.icon} text-xs ${orgPerms[perm.key] ? 'text-red-600' : 'text-slate-400'}`}></i>
                                    <span className={`text-xs ${orgPerms[perm.key] ? 'text-red-700 font-medium' : 'text-slate-600'}`}>
                                      {perm.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-100">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 flex items-center space-x-2">
                    {saving && <i className="pi pi-spinner pi-spin"></i>}
                    <span>{selectedCoWorker ? 'Update' : 'Create & Send Invite'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteModal && selectedCoWorker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="pi pi-exclamation-triangle text-red-600 text-2xl"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Remove Co-Worker?</h3>
                <p className="text-slate-500 text-sm mb-1">
                  <span className="font-semibold text-slate-700">{selectedCoWorker.firstName} {selectedCoWorker.lastName}</span>
                </p>
                <p className="text-slate-500 text-sm">Choose how to remove this co-worker:</p>
              </div>
              <div className="space-y-3 mt-6">
                <button onClick={() => handleDelete(false)}
                  className="w-full text-left p-4 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                      <i className="pi pi-ban text-amber-600"></i>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Deactivate</p>
                      <p className="text-xs text-slate-500">Cannot login, data preserved</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => handleDelete(true)}
                  className="w-full text-left p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
                      <i className="pi pi-trash text-red-600"></i>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Permanently Delete</p>
                      <p className="text-xs text-slate-500">Cannot be undone</p>
                    </div>
                  </div>
                </button>
              </div>
              <button onClick={() => setShowDeleteModal(false)}
                className="w-full mt-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Bulk Import Co-Workers</h3>
              <button onClick={() => { setShowBulkModal(false); setBulkFile(null); setBulkPreview([]); setBulkResults(null); }}
                className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <i className="pi pi-times"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {!bulkResults ? (
                <>
                  {/* Instructions */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 mb-2">📋 Instructions</h4>
                    <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                      <li>Download the template file below</li>
                      <li>Fill in co-worker details (use YES/NO for permissions)</li>
                      <li>Organization name must match an existing organization</li>
                      <li>Upload the completed file</li>
                      <li>Click "Import Co-Workers"</li>
                    </ol>
                  </div>

                  {/* Download Template */}
                  <button
                    onClick={downloadCoWorkerTemplate}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all flex items-center justify-center space-x-2"
                  >
                    <i className="pi pi-download"></i>
                    <span>Download Template (Excel)</span>
                  </button>

                  {/* File Upload */}
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-red-300 transition-colors">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleBulkFileUpload}
                      className="hidden"
                      id="bulk-file-upload"
                    />
                    <label htmlFor="bulk-file-upload" className="cursor-pointer">
                      <i className="pi pi-cloud-upload text-3xl text-slate-400 mb-2 block"></i>
                      <p className="text-slate-600 font-medium">
                        {bulkFile ? bulkFile.name : 'Click to upload file'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Excel (.xlsx, .xls) or CSV files</p>
                    </label>
                  </div>

                  {/* Preview */}
                  {bulkPreview.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2">Preview (First 5 Rows)</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              {Object.keys(bulkPreview[0]).slice(0, 6).map(key => (
                                <th key={key} className="px-3 py-2 text-left font-semibold text-slate-600">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkPreview.map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).slice(0, 6).map((val, j) => (
                                  <td key={j} className="px-3 py-2 text-slate-700">{String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Results */
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800">Import Results</h4>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-800 font-medium">✅ Success: {bulkResults.success?.length || 0}</p>
                    {bulkResults.success?.slice(0, 10).map((item, i) => (
                      <p key={i} className="text-sm text-green-700">{item.name} ({item.email})</p>
                    ))}
                  </div>
                  {bulkResults.failed?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-800 font-medium">❌ Failed: {bulkResults.failed.length}</p>
                      {bulkResults.failed.map((item, i) => (
                        <p key={i} className="text-sm text-red-700">{item.email}: {item.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => { setShowBulkModal(false); setBulkFile(null); setBulkPreview([]); setBulkResults(null); }}
                className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium"
              >
                {bulkResults ? 'Close' : 'Cancel'}
              </button>
              {!bulkResults && bulkFile && (
                <button
                  onClick={handleBulkImport}
                  disabled={bulkLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 flex items-center space-x-2"
                >
                  {bulkLoading ? (
                    <><i className="pi pi-spinner pi-spin"></i><span>Importing...</span></>
                  ) : (
                    <><i className="pi pi-upload"></i><span>Import Co-Workers</span></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== SUB-COMPONENTS =====

const QuickStat = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow border border-slate-200/50 p-4 text-center">
    <i className={`${icon} text-lg mb-1 ${color === 'red' ? 'text-red-500' : 'text-slate-500'}`}></i>
    <p className="text-xl font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

const CoWorkerCard = ({ coWorker, onEdit, onResend, onDelete }) => {
  const permCount = coWorker.permissions?.length || 0;
  const orgNames = coWorker.permissions?.map(p => p.organizationName).slice(0, 2).join(', ') || 'No orgs';
  const hasMore = (coWorker.permissions?.length || 0) > 2;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 hover:shadow-xl hover:border-red-200 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {(coWorker.firstName?.charAt(0) || '')}{(coWorker.lastName?.charAt(0) || '')}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{coWorker.firstName} {coWorker.lastName}</h3>
            <p className="text-xs text-slate-500">{coWorker.email}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${coWorker.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
          {coWorker.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-1">Organizations:</p>
        <p className="text-xs text-slate-700">{orgNames}{hasMore ? ` +${coWorker.permissions.length - 2} more` : ''}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
        <span>{permCount} org{permCount !== 1 ? 's' : ''} assigned</span>
        <span>{coWorker.lastLogin ? `Last: ${new Date(coWorker.lastLogin).toLocaleDateString()}` : 'Never logged in'}</span>
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <button onClick={onEdit}
          className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors">
          <i className="pi pi-pencil mr-1"></i> Edit
        </button>
        {!coWorker.lastLogin && (
          <button onClick={onResend}
            className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors">
            <i className="pi pi-envelope mr-1"></i> Resend
          </button>
        )}
        <button onClick={onDelete}
          className="py-2 px-3 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors">
          <i className="pi pi-trash"></i>
        </button>
      </div>
    </div>
  );
};

const InputField = ({ label, name, value, onChange, type = 'text', disabled }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} disabled={disabled}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} />
  </div>
);

export default CoWorkers;