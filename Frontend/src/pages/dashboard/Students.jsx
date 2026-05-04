// pages/dashboard/Students.jsx - CARD-AGENT NAVY & CRIMSON
import React, { useState, useEffect, useRef } from 'react';
import { studentAPI, organizationAPI } from '../../services/api';

const Students = () => {

  // ==================== STATE ====================
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ personType: '', gender: '', hasPhoto: '', cardGenerated: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ genders: [], classes: [], levels: [], departments: [] });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Form
  const [formData, setFormData] = useState({
    student_id: '', name: '', personType: 'student',
    class: '', level: '', academic_year: '', parent_phone: '',
    department: '', position: '', employeeId: '', workPhone: '',
    gender: '', residence: '', phone: '', email: '',
    photo: null
  });

  // Bulk Import
  const [csvFile, setCsvFile] = useState(null);
  const [photoZipFile, setPhotoZipFile] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const modalRef = useRef(null);

  // ==================== LOAD DATA ====================
  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadStudents();
      loadFilterOptions();
    }
  }, [selectedOrg]);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, filters, students]);

  useEffect(() => {
    setTotalPages(Math.ceil(filteredStudents.length / itemsPerPage) || 1);
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [filteredStudents, itemsPerPage]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await organizationAPI.getAll({ limit: 100 });
      if (response.success) {
        setOrganizations(response.organizations || []);
        // Auto-select first org if none selected
        if (!selectedOrg && response.organizations?.length > 0) {
          setSelectedOrg(response.organizations[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedOrg?._id) return;
    setLoading(true);
    try {
      const response = await studentAPI.getByOrganization(selectedOrg._id, { limit: 200 });
      if (response.success) {
        setStudents(response.students || []);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    if (!selectedOrg?._id) return;
    try {
      const response = await studentAPI.getFilterOptions(selectedOrg._id);
      if (response.success) {
        setFilterOptions(response.filters || {});
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  // ==================== FILTERING ====================
  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(term) ||
        s.student_id?.toLowerCase().includes(term) ||
        s.studentDetails?.class?.toLowerCase().includes(term) ||
        s.employeeDetails?.department?.toLowerCase().includes(term)
      );
    }

    if (filters.personType) filtered = filtered.filter(s => s.personType === filters.personType);
    if (filters.gender) filtered = filtered.filter(s => s.gender === filters.gender);
    if (filters.hasPhoto === 'true') filtered = filtered.filter(s => s.has_photo);
    if (filters.hasPhoto === 'false') filtered = filtered.filter(s => !s.has_photo);
    if (filters.cardGenerated === 'true') filtered = filtered.filter(s => s.card_generated);
    if (filters.cardGenerated === 'false') filtered = filtered.filter(s => !s.card_generated);

    setFilteredStudents(filtered);
  };

  const getCurrentPageStudents = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  };

  // ==================== HANDLERS ====================
  const handleOrgChange = (org) => {
    setSelectedOrg(org);
    setSearchTerm('');
    setFilters({ personType: '', gender: '', hasPhoto: '', cardGenerated: '' });
    setCurrentPage(1);
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo' && files?.[0]) {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) { alert('Photo too large! Max 5MB'); return; }
      setFormData(prev => ({ ...prev, photo: file }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id || '',
      name: student.name || '',
      personType: student.personType || 'student',
      class: student.studentDetails?.class || '',
      level: student.studentDetails?.level || '',
      academic_year: student.studentDetails?.academic_year || '',
      parent_phone: student.studentDetails?.parent_phone || '',
      department: student.employeeDetails?.department || '',
      position: student.employeeDetails?.position || '',
      employeeId: student.employeeDetails?.employeeId || '',
      workPhone: student.employeeDetails?.workPhone || '',
      gender: student.gender || '',
      residence: student.residence || '',
      phone: student.phone || '',
      email: student.email || '',
      photo: null
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('organizationId', selectedOrg._id);
      submitData.append('name', formData.name);
      submitData.append('student_id', formData.student_id);
      submitData.append('personType', formData.personType);
      submitData.append('gender', formData.gender);
      submitData.append('residence', formData.residence);
      submitData.append('phone', formData.phone);
      submitData.append('email', formData.email);

      if (formData.personType === 'student') {
        submitData.append('class', formData.class);
        submitData.append('level', formData.level);
        submitData.append('academic_year', formData.academic_year);
        submitData.append('parent_phone', formData.parent_phone);
      } else {
        submitData.append('department', formData.department);
        submitData.append('position', formData.position);
        submitData.append('employeeId', formData.employeeId);
        submitData.append('workPhone', formData.workPhone);
      }

      if (formData.photo instanceof File) submitData.append('photo', formData.photo);

      if (editingStudent) {
        await studentAPI.update(editingStudent._id, submitData);
      } else {
        await studentAPI.create(submitData);
      }

      resetForm();
      loadStudents();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!confirm(`Delete "${studentName}"? This cannot be undone.`)) return;
    try {
      await studentAPI.delete(studentId);
      loadStudents();
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleBulkImport = async (withPhotos = false) => {
    if (!csvFile || !selectedOrg) return;
    setLoading(true);
    setImportProgress({ status: 'uploading', message: 'Uploading...' });

    try {
      let result;
      if (withPhotos) {
        result = await studentAPI.bulkImportWithPhotos(selectedOrg._id, csvFile, photoZipFile);
      } else {
        result = await studentAPI.bulkImportCSV(selectedOrg._id, csvFile);
      }

      setImportProgress({ status: 'success', message: `Done! ${result.results?.created || 0} created, ${result.results?.updated || 0} updated` });
      loadStudents();
      setTimeout(() => setImportProgress(null), 5000);
    } catch (error) {
      setImportProgress({ status: 'error', message: error.message });
      setTimeout(() => setImportProgress(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '', name: '', personType: 'student',
      class: '', level: '', academic_year: '', parent_phone: '',
      department: '', position: '', employeeId: '', workPhone: '',
      gender: '', residence: '', phone: '', email: '', photo: null
    });
    setEditingStudent(null);
    setShowAddModal(false);
    setShowBulkImport(false);
    setCsvFile(null);
    setPhotoZipFile(null);
    setImportProgress(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ personType: '', gender: '', hasPhoto: '', cardGenerated: '' });
    setShowFilters(false);
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ==================== STATS ====================
  const studentCount = students.filter(s => s.personType === 'student').length;
  const employeeCount = students.filter(s => s.personType === 'employee').length;
  const withPhotos = students.filter(s => s.has_photo).length;
  const cardsGenerated = students.filter(s => s.card_generated).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
            Students & Employees
          </h2>
          <p className="text-slate-500 mt-1">
            {students.length} records across organizations
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg"
          >
            <i className="pi pi-upload"></i>
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => { setEditingStudent(null); setFormData(prev => ({ ...prev, student_id: '', name: '' })); setShowAddModal(true); }}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg"
          >
            <i className="pi pi-user-plus"></i>
            <span>Add New</span>
          </button>
        </div>
      </div>

      {/* Organization Selector Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-600 flex items-center">
            <i className="pi pi-building mr-2 text-red-500"></i>Organization:
          </span>
          {loadingOrgs ? (
            <div className="flex items-center space-x-2 text-slate-400">
              <i className="pi pi-spinner pi-spin"></i><span>Loading...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {organizations.map(org => (
                <button
                  key={org._id}
                  onClick={() => handleOrgChange(org)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedOrg?._id === org._id
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                >
                  <span className="capitalize">{org.type === 'corporate' ? '🏢' : '🏫'}</span> {org.name}
                  <span className="ml-2 text-xs opacity-75">({org.stats?.total || org.stats?.totalPeople || 0})</span>
                </button>
              ))}
              {organizations.length === 0 && (
                <span className="text-slate-400 text-sm">No organizations yet. Create one first.</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {selectedOrg && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickStat icon="pi pi-users" label="Students" value={studentCount} color="slate" />
          <QuickStat icon="pi pi-briefcase" label="Employees" value={employeeCount} color="red" />
          <QuickStat icon="pi pi-image" label="With Photos" value={withPhotos} color="slate" />
          <QuickStat icon="pi pi-qrcode" label="Cards Ready" value={cardsGenerated} color="red" />
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search by name, ID, class, department..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-800"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 ${showFilters ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              <i className="pi pi-filter"></i><span>Filters</span>
            </button>
            <button onClick={resetFilters} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-all">
              <i className="pi pi-refresh"></i>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-slide-down">
            <FilterSelect label="Type" name="personType" value={filters.personType} onChange={(e) => { setFilters(prev => ({ ...prev, personType: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, { value: 'student', label: 'Students' }, { value: 'employee', label: 'Employees' }]} />
            <FilterSelect label="Gender" name="gender" value={filters.gender} onChange={(e) => { setFilters(prev => ({ ...prev, gender: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, ...(filterOptions.genders || []).map(g => ({ value: g, label: g }))]} />
            <FilterSelect label="Photo" name="hasPhoto" value={filters.hasPhoto} onChange={(e) => { setFilters(prev => ({ ...prev, hasPhoto: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, { value: 'true', label: 'With Photo' }, { value: 'false', label: 'No Photo' }]} />
            <FilterSelect label="Card" name="cardGenerated" value={filters.cardGenerated} onChange={(e) => { setFilters(prev => ({ ...prev, cardGenerated: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, { value: 'true', label: 'Generated' }, { value: 'false', label: 'Pending' }]} />
          </div>
        )}

        {/* Active Filters */}
        {(searchTerm || Object.values(filters).some(f => f)) && (
          <div className="mt-3 text-sm text-slate-500">
            <i className="pi pi-info-circle mr-1 text-red-500"></i>
            Found <span className="font-semibold text-slate-700">{filteredStudents.length}</span> records
            {searchTerm && <span> • Search: "{searchTerm}"</span>}
            {filters.personType && <span> • {filters.personType}</span>}
            {filters.gender && <span> • {filters.gender}</span>}
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-16">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredStudents.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Class/Dept</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Photo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Card</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getCurrentPageStudents().map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                          {student.student_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 text-sm">{student.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${student.personType === 'student'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                          }`}>
                          {student.personType === 'student' ? '🎓 Student' : '💼 Employee'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {student.personType === 'student'
                          ? student.studentDetails?.class || 'N/A'
                          : student.employeeDetails?.department || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.gender || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {student.has_photo ? (
                          <button onClick={() => { setSelectedPhoto({ url: student.photo_url, name: student.name, id: student.student_id }); setShowPhotoModal(true); }}
                            className="text-green-600 hover:text-green-700 text-xs font-medium bg-green-50 px-2 py-1 rounded-lg">
                            <i className="pi pi-check-circle mr-1"></i>View
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No photo</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {student.card_generated ? (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            Ready
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-1">
                          <button onClick={() => handleEdit(student)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Edit">
                            <i className="pi pi-pencil text-sm"></i>
                          </button>
                          <button onClick={() => handleDelete(student._id, student.name)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <i className="pi pi-trash text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                <span className="text-sm text-slate-500">
                  Showing {Math.min(itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
                </span>
                <div className="flex items-center space-x-1">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center disabled:opacity-50">
                    <i className="pi pi-chevron-left text-xs"></i>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === pageNum ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center disabled:opacity-50">
                    <i className="pi pi-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <i className="pi pi-users text-5xl text-slate-300 mb-4 block"></i>
            <p className="text-slate-500 text-lg font-medium">
              {selectedOrg ? 'No records found' : 'Select an organization to view records'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {selectedOrg ? 'Try adjusting search or filters' : 'Choose an organization from the bar above'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">
                {editingStudent ? 'Edit Record' : 'Add New Record'}
              </h3>
              <button onClick={resetForm} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <i className="pi pi-times text-slate-600"></i>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-5 space-y-5">
              {/* Person Type Toggle */}
              <div className="flex gap-2">
                <button onClick={() => setFormData(prev => ({ ...prev, personType: 'student' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.personType === 'student' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                  <i className="pi pi-graduation-cap mr-1"></i> Student
                </button>
                <button onClick={() => setFormData(prev => ({ ...prev, personType: 'employee' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.personType === 'employee' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                  <i className="pi pi-briefcase mr-1"></i> Employee
                </button>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-4">
                <InputField label="ID Number *" name="student_id" value={formData.student_id} onChange={handleInputChange} />
                <InputField label="Full Name *" name="name" value={formData.name} onChange={handleInputChange} />
              </div>

              {/* Student-specific */}
              {formData.personType === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Class" name="class" value={formData.class} onChange={handleInputChange} />
                  <InputField label="Level" name="level" value={formData.level} onChange={handleInputChange} />
                  <InputField label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleInputChange} />
                  <InputField label="Parent Phone" name="parent_phone" value={formData.parent_phone} onChange={handleInputChange} />
                </div>
              )}

              {/* Employee-specific */}
              {formData.personType === 'employee' && (
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Department" name="department" value={formData.department} onChange={handleInputChange} />
                  <InputField label="Position" name="position" value={formData.position} onChange={handleInputChange} />
                  <InputField label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleInputChange} />
                  <InputField label="Work Phone" name="workPhone" value={formData.workPhone} onChange={handleInputChange} />
                </div>
              )}

              {/* Common Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <InputField label="Residence" name="residence" value={formData.residence} onChange={handleInputChange} />
                <InputField label="Phone" name="phone" value={formData.phone} onChange={handleInputChange} />
                <InputField label="Email" name="email" value={formData.email} onChange={handleInputChange} type="email" />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Photo</label>
                <input type="file" name="photo" accept="image/*" onChange={handleInputChange}
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                {editingStudent?.photo_url && (
                  <div className="mt-2 flex items-center space-x-3">
                    <img src={editingStudent.photo_url} alt="Current" className="w-12 h-12 rounded-lg object-cover border" />
                    <span className="text-xs text-slate-500">Upload new to replace</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
              <button onClick={resetForm} className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50">
                {loading ? <i className="pi pi-spinner pi-spin mr-2"></i> : null}
                {editingStudent ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">Bulk Import</h3>
              <button onClick={resetForm} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <i className="pi pi-times"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Importing to: <span className="font-semibold text-slate-800">{selectedOrg?.name}</span>
              </p>
              <FileUpload label="CSV File *" accept=".csv" file={csvFile} onSelect={setCsvFile} />
              <FileUpload label="Photos ZIP (Optional)" accept=".zip" file={photoZipFile} onSelect={setPhotoZipFile} />

              {importProgress && (
                <div className={`p-3 rounded-xl text-sm ${importProgress.status === 'success' ? 'bg-green-50 text-green-700' :
                    importProgress.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                  {importProgress.status === 'uploading' && <i className="pi pi-spinner pi-spin mr-2"></i>}
                  {importProgress.message}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
              <button onClick={resetForm} className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700">Cancel</button>
              <button onClick={() => handleBulkImport(false)} disabled={!csvFile || loading}
                className="px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 disabled:opacity-50">
                Import CSV
              </button>
              {photoZipFile && (
                <button onClick={() => handleBulkImport(true)} disabled={!csvFile || loading}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 disabled:opacity-50">
                  Import + Photos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPhotoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold text-slate-800">{selectedPhoto.name}</p>
                <p className="text-xs text-slate-500">{selectedPhoto.id}</p>
              </div>
              <button onClick={() => setShowPhotoModal(false)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <i className="pi pi-times"></i>
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-100">
              <img src={selectedPhoto.url} alt={selectedPhoto.name} className="max-h-96 rounded-xl object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== SUB-COMPONENTS =====

const QuickStat = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow border border-slate-200/50 p-3 text-center">
    <i className={`${icon} text-lg mb-1 ${color === 'red' ? 'text-red-500' : 'text-slate-600'}`}></i>
    <p className="text-xl font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

const FilterSelect = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
    <select name={name} value={value} onChange={onChange}
      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700">
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const InputField = ({ label, name, value, onChange, type = 'text', required }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} required={required}
      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
  </div>
);

const FileUpload = ({ label, accept, file, onSelect }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-red-300 transition-colors">
      <input type="file" accept={accept} className="hidden" id={label.replace(/\s/g, '')}
        onChange={(e) => e.target.files[0] && onSelect(e.target.files[0])} />
      <label htmlFor={label.replace(/\s/g, '')} className="cursor-pointer">
        <i className="pi pi-file text-2xl text-slate-400 mb-1 block"></i>
        <span className="text-sm text-slate-600">{file ? file.name : 'Click to upload'}</span>
      </label>
    </div>
  </div>
);

export default Students;