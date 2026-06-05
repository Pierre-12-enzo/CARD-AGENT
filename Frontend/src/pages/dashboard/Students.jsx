// pages/dashboard/Students.jsx - CARD-AGENT with Clean University/Corporate Level Handling
import React, { useState, useEffect, useRef } from 'react';
import { studentAPI, organizationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const Students = () => {
  const { user } = useAuth();

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

  // Bulk Import State
  const [csvFile, setCsvFile] = useState(null);
  const [photoZipFile, setPhotoZipFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

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
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [idWarning, setIdWarning] = useState('');

  const modalRef = useRef(null);

  // ==================== SMART LEVEL LOGIC - CLEAN VERSION ====================

  /**
   * Check if level field should be hidden (for university/corporate)
   */
  const shouldHideLevel = () => {
    if (!selectedOrg) return false;
    const orgType = selectedOrg.type;
    return orgType === 'corporate' || orgType === 'university';
  };

  /**
   * Get the default level based on organization type
   */
  const getDefaultLevel = () => {
    if (!selectedOrg) return '';

    const orgType = selectedOrg.type;

    // Types that don't need level at all
    if (orgType === 'corporate' || orgType === 'university') return 'n_a';

    // Primary schools
    if (orgType === 'primary') return 'Primary';

    // Secondary schools based on level setting
    const orgLevel = selectedOrg.level;
    if (orgLevel === 'o_level') return 'O-Level';
    if (orgLevel === 'a_level') return 'A-Level';
    if (orgLevel === 'tvet') return 'L3';
    if (orgLevel === 'mixed') return ''; // User must choose

    return '';
  };

  /**
   * Get available level options based on organization
   */
  const getLevelOptions = () => {
    if (!selectedOrg) return [];

    const orgType = selectedOrg.type;
    const orgLevel = selectedOrg.level;

    // Corporate & University - no level options (hidden)
    if (orgType === 'corporate') return [];
    if (orgType === 'university') return [];

    // Primary school
    if (orgType === 'primary') return [{ value: 'Primary', label: 'Primary' }];

    // TVET
    if (orgType === 'tvet' || orgLevel === 'tvet') {
      return [
        { value: 'L3', label: 'Level 3' },
        { value: 'L4', label: 'Level 4' },
        { value: 'L5', label: 'Level 5' }
      ];
    }

    // Secondary school
    if (orgLevel === 'o_level') return [{ value: 'O-Level', label: 'O-Level' }];
    if (orgLevel === 'a_level') return [{ value: 'A-Level', label: 'A-Level' }];
    if (orgLevel === 'mixed') {
      return [
        { value: 'O-Level', label: 'O-Level' },
        { value: 'A-Level', label: 'A-Level' }
      ];
    }

    return [];
  };

  /**
   * Check if level field should be disabled (locked to one value)
   */
  const isLevelLocked = () => {
    if (!selectedOrg) return false;
    const orgType = selectedOrg.type;
    const orgLevel = selectedOrg.level;

    if (shouldHideLevel()) return true;
    if (orgType === 'primary') return true;
    return ['o_level', 'a_level', 'tvet'].includes(orgLevel);
  };

  /**
   * Get placeholder text for Class field based on organization type
   */
  const getClassPlaceholder = () => {
    if (!selectedOrg) return 'Enter class/section';

    switch (selectedOrg.type) {
      case 'university':
        return 'e.g., Year 1 CS-A, Year 2 IT-B, Masters in CS';
      case 'corporate':
        return 'e.g., Finance Dept, HR Team, Sales Division';
      case 'primary':
      case 'secondary':
        return 'e.g., S1A, P5B, Form 3A';
      default:
        return 'Enter class/section';
    }
  };

  /**
   * Get helper text for Class field
   */
  const getClassHelperText = () => {
    if (!selectedOrg) return '';
    if (selectedOrg.type === 'university') {
      return '💡 Include year and section: "Year 1 CS-A", "Year 2 IT-B"';
    }
    if (selectedOrg.type === 'corporate') {
      return '💡 Use department or team name';
    }
    return '';
  };

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
      const response = await studentAPI.getByOrganization(selectedOrg._id, { limit: 500 });
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

  const validateStudentId = (id, personType) => {
    if (!id || !id.trim()) {
      if (personType === 'employee') return '';
      return 'Student ID is required';
    }

    if (personType === 'student') {
      const exists = students.find(s =>
        s.student_id?.toLowerCase() === id.trim().toLowerCase() &&
        s._id !== editingStudent?._id
      );
      if (exists) {
        return `⚠️ Student ID "${id}" already exists (${exists.name})`;
      }

      if (!/^[A-Za-z0-9]+-\d{3,}$/.test(id) && !/^[A-Za-z0-9]+$/.test(id)) {
        return '💡 Recommended format: ClassName-Number (e.g., S1A-001)';
      }
    }

    return '';
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'photo' && files?.[0]) {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) { toast.error('Photo too large! Max 5MB'); return; }
      setFormData(prev => ({ ...prev, photo: file }));
    } else if (name === 'student_id') {
      setFormData(prev => ({ ...prev, student_id: value }));
      const warning = validateStudentId(value, formData.personType);
      setIdWarning(warning);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePersonTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      personType: type,
      student_id: type === 'employee' ? '' : prev.student_id,
      level: getDefaultLevel()
    }));
    setIdWarning('');
    setFormErrors({});
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id || '',
      name: student.name || '',
      personType: student.personType || 'student',
      class: student.studentDetails?.class || '',
      level: student.studentDetails?.level || getDefaultLevel(),
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
    setIdWarning('');
    setFormErrors({});
    setShowAddModal(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Name is required';

    if (formData.personType === 'student' && !formData.student_id.trim()) {
      errors.student_id = 'Student ID is required';
    }

    if (formData.personType === 'student' && formData.student_id.trim()) {
      const exists = students.find(s =>
        s.student_id?.toLowerCase() === formData.student_id.trim().toLowerCase() &&
        s._id !== editingStudent?._id
      );
      if (exists) {
        errors.student_id = `ID already taken by ${exists.name}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const submitData = new FormData();
      submitData.append('organizationId', selectedOrg._id);
      submitData.append('name', formData.name);
      submitData.append('personType', formData.personType);
      submitData.append('gender', formData.gender);
      submitData.append('residence', formData.residence);
      submitData.append('phone', formData.phone);
      submitData.append('email', formData.email);

      if (formData.student_id.trim()) {
        submitData.append('student_id', formData.student_id.trim());
      }

      if (formData.personType === 'student') {
        submitData.append('class', formData.class);
        // Only send level if not hidden (university/corporate skip)
        if (!shouldHideLevel()) {
          submitData.append('level', formData.level);
        } else {
          submitData.append('level', 'n_a');
        }
        submitData.append('academic_year', formData.academic_year);
        submitData.append('parent_phone', formData.parent_phone);
      } else {
        submitData.append('department', formData.department);
        submitData.append('position', formData.position);
        if (formData.employeeId) submitData.append('employeeId', formData.employeeId);
        submitData.append('workPhone', formData.workPhone);
      }

      if (formData.photo instanceof File) submitData.append('photo', formData.photo);

      if (editingStudent) {
        const res = await studentAPI.update(editingStudent._id, submitData);
        if (res.success || !res.error) {
          toast.success('Record updated successfully!');
          resetForm();
          loadStudents();
        }
      } else {
        const res = await studentAPI.create(submitData);
        if (res.success || res._id) {
          toast.success(`${formData.personType === 'student' ? 'Student' : 'Employee'} created successfully!`);
          resetForm();
          loadStudents();
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!window.confirm(`Delete "${studentName}"? This cannot be undone.`)) return;
    try {
      await studentAPI.delete(studentId);
      toast.success('Deleted successfully');
      loadStudents();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '', name: '', personType: 'student',
      class: '', level: getDefaultLevel(), academic_year: '', parent_phone: '',
      department: '', position: '', employeeId: '', workPhone: '',
      gender: '', residence: '', phone: '', email: '', photo: null
    });
    setFormErrors({});
    setIdWarning('');
    setEditingStudent(null);
    setShowAddModal(false);
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

  // ==================== BULK IMPORT FUNCTIONS ====================

  const downloadStudentTemplate = () => {
    const template = [
      {
        student_id: 'S1A-001',
        name: 'John Doe',
        class: 'S1A',
        level: 'O-Level',
        gender: 'Male',
        residence: 'Kigali',
        academic_year: '2026',
        parent_phone: '0788123456'
      },
      {
        student_id: 'S1A-002',
        name: 'Alice Smith',
        class: 'S1A',
        level: 'O-Level',
        gender: 'Female',
        residence: 'Musanze',
        academic_year: '2026',
        parent_phone: '0788987654'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 10 },
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
    XLSX.writeFile(wb, 'students_import_template.xlsx');
    toast.success('Student template downloaded!');
  };

  const downloadEmployeeTemplate = () => {
    const template = [
      {
        employeeId: 'MON-001',
        name: 'Jane Smith',
        department: 'Finance',
        position: 'Accountant',
        gender: 'Female',
        residence: 'Kigali',
        phone: '0788123456',
        email: 'jane@company.com',
        note: 'Leave employeeId blank for auto-generation'
      },
      {
        employeeId: 'MON-002',
        name: 'Bob Johnson',
        department: 'HR',
        position: 'Manager',
        gender: 'Male',
        residence: 'Gisenyi',
        phone: '0788987654',
        email: 'bob@company.com',
        note: 'Leave employeeId blank for auto-generation'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
      { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 30 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees Template');
    XLSX.writeFile(wb, 'employees_import_template.xlsx');
    toast.success('Employee template downloaded!');
  };

  const handleCsvFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setBulkPreview(jsonData.slice(0, 5));
      } catch (error) {
        console.error('Parse error:', error);
        toast.error('Failed to parse file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async (withPhotos = false) => {
    if (!csvFile || !selectedOrg) {
      toast.error('Select an organization and upload a file');
      return;
    }

    setBulkLoading(true);
    setImportProgress({ status: 'uploading', message: 'Uploading...' });

    try {
      let result;
      if (withPhotos && photoZipFile) {
        result = await studentAPI.bulkImportWithPhotos(selectedOrg._id, csvFile, photoZipFile);
      } else {
        result = await studentAPI.bulkImportCSV(selectedOrg._id, csvFile);
      }

      if (result.success) {
        setBulkResults({
          created: result.results?.created || 0,
          updated: result.results?.updated || 0,
          skipped: result.results?.skipped || 0,
          errors: result.results?.errors || [],
          withPhotos: result.results?.withPhotos || 0
        });
        toast.success(`Import complete! ${result.results?.created || 0} created, ${result.results?.updated || 0} updated`);
        loadStudents();
      } else {
        toast.error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setBulkLoading(false);
      setImportProgress(null);
    }
  };

  const resetBulkImport = () => {
    setShowBulkImport(false);
    setCsvFile(null);
    setPhotoZipFile(null);
    setBulkPreview([]);
    setBulkResults(null);
    setImportProgress(null);
  };

  // ==================== COMPUTED ====================
  const studentCount = students.filter(s => s.personType === 'student').length;
  const employeeCount = students.filter(s => s.personType === 'employee').length;
  const withPhotos = students.filter(s => s.has_photo).length;
  const cardsGenerated = students.filter(s => s.card_generated).length;
  const levelOptions = getLevelOptions();
  const levelLocked = isLevelLocked();
  const hideLevel = shouldHideLevel();
  const classPlaceholder = getClassPlaceholder();
  const classHelperText = getClassHelperText();

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
            onClick={() => { setEditingStudent(null); setFormData(prev => ({ ...prev, student_id: '', name: '', level: getDefaultLevel() })); setIdWarning(''); setShowAddModal(true); }}
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
                  <span className="capitalize">{org.type === 'corporate' ? '🏢' : org.type === 'university' ? '🎓' : '🏫'}</span> {org.name}
                  <span className="ml-2 text-xs opacity-75">({org.stats?.total || 0})</span>
                </button>
              ))}
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

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-slide-down">
            <FilterSelect label="Type" name="personType" value={filters.personType} onChange={(e) => { setFilters(prev => ({ ...prev, personType: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, { value: 'student', label: 'Students' }, { value: 'employee', label: 'Employees' }]} />
            <FilterSelect label="Gender" name="gender" value={filters.gender} onChange={(e) => { setFilters(prev => ({ ...prev, gender: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
            <FilterSelect label="Photo" name="hasPhoto" value={filters.hasPhoto} onChange={(e) => { setFilters(prev => ({ ...prev, hasPhoto: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, { value: 'true', label: 'With Photo' }, { value: 'false', label: 'No Photo' }]} />
            <FilterSelect label="Card" name="cardGenerated" value={filters.cardGenerated} onChange={(e) => { setFilters(prev => ({ ...prev, cardGenerated: e.target.value })); setCurrentPage(1); }}
              options={[{ value: '', label: 'All' }, { value: 'true', label: 'Generated' }, { value: 'false', label: 'Pending' }]} />
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Level</th>
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
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {student.studentDetails?.level === 'n_a' ? '—' : (student.studentDetails?.level || 'N/A')}
                      </td>
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
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Ready</span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pending</span>
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
          </div>
        )}
      </div>

      {/* ==================== ADD/EDIT MODAL ==================== */}
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
              {/* Organization Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xs text-slate-500">Organization</p>
                <p className="font-medium text-slate-800 text-sm">{selectedOrg?.name}</p>
                <p className="text-xs text-slate-500 capitalize">
                  Type: {selectedOrg?.type} • {selectedOrg?.type === 'university' ? 'Use Class field for year/section' : selectedOrg?.type === 'corporate' ? 'Use Department field' : `Level: ${selectedOrg?.level || 'mixed'}`}
                </p>
              </div>

              {/* Person Type Toggle */}
              <div className="flex gap-2">
                <button type="button" onClick={() => handlePersonTypeChange('student')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.personType === 'student' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                  <i className="pi pi-graduation-cap mr-1"></i> Student
                </button>
                <button type="button" onClick={() => handlePersonTypeChange('employee')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.personType === 'employee' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                  <i className="pi pi-briefcase mr-1"></i> Employee
                </button>
              </div>

              {/* ID Field */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {formData.personType === 'student' ? 'Student ID *' : 'ID Number'}
                  </label>
                  {formData.personType === 'employee' ? (
                    <div className="relative">
                      <input
                        type="text"
                        name="student_id"
                        value={formData.student_id}
                        disabled
                        className="w-full px-3 py-2.5 border border-slate-200 bg-slate-100 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                        placeholder="Auto-generated"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <i className="pi pi-lock text-slate-400 text-xs"></i>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        name="student_id"
                        value={formData.student_id}
                        onChange={handleInputChange}
                        placeholder="e.g., S1A-001, STU001"
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-red-500 ${formErrors.student_id ? 'border-red-300 bg-red-50' : idWarning && !formErrors.student_id ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-slate-50'
                          }`}
                        required
                      />
                      {formErrors.student_id && (
                        <p className="mt-1 text-xs text-red-500 flex items-center">
                          <i className="pi pi-exclamation-circle mr-1"></i> {formErrors.student_id}
                        </p>
                      )}
                      {idWarning && !formErrors.student_id && (
                        <p className="mt-1 text-xs text-amber-600 flex items-center">
                          <i className="pi pi-info-circle mr-1"></i> {idWarning}
                        </p>
                      )}
                    </>
                  )}
                  {formData.personType === 'employee' && (
                    <p className="mt-1 text-xs text-slate-400 flex items-center">
                      <i className="pi pi-info-circle mr-1"></i>
                      Auto-generated: {selectedOrg?.name?.replace(/[^a-zA-Z]/g, '').substring(0, 3)?.toUpperCase() || 'ORG'}-XXX
                    </p>
                  )}
                </div>
                <InputField label="Full Name *" name="name" value={formData.name} onChange={handleInputChange} error={formErrors.name} />
              </div>

              {/* Student-specific fields */}
              {formData.personType === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Class Field - Always shown, with smart placeholder */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Class / Section</label>
                    <input
                      type="text"
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      placeholder={classPlaceholder}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
                    />
                    {classHelperText && (
                      <p className="mt-1 text-xs text-slate-400">{classHelperText}</p>
                    )}
                  </div>

                  {/* Level Field - Hidden for University/Corporate, shown for others */}
                  {!hideLevel && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Level</label>
                      {levelLocked ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.level}
                            disabled
                            className="w-full px-3 py-2.5 border border-slate-200 bg-slate-100 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <i className="pi pi-lock text-slate-400 text-xs"></i>
                          </div>
                        </div>
                      ) : (
                        <select
                          name="level"
                          value={formData.level}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                        >
                          <option value="">Select Level</option>
                          {levelOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Show disabled level field for university/corporate */}
                  {hideLevel && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Level</label>
                      <div className="relative">
                        <input
                          type="text"
                          value="N/A (use Class field)"
                          disabled
                          className="w-full px-3 py-2.5 border border-slate-200 bg-slate-100 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <i className="pi pi-info-circle text-slate-400 text-xs"></i>
                        </div>
                      </div>
                    </div>
                  )}

                  <InputField label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleInputChange} />
                  <InputField label="Parent Phone" name="parent_phone" value={formData.parent_phone} onChange={handleInputChange} />
                </div>
              )}

              {/* Employee-specific fields */}
              {formData.personType === 'employee' && (
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Department" name="department" value={formData.department} onChange={handleInputChange} />
                  <InputField label="Position" name="position" value={formData.position} onChange={handleInputChange} />
                  <InputField label="Work Phone" name="workPhone" value={formData.workPhone} onChange={handleInputChange} />
                  <InputField label="Email" name="email" value={formData.email} onChange={handleInputChange} type="email" />
                </div>
              )}

              {/* Common fields */}
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
                {formData.personType !== 'employee' && (
                  <>
                    <InputField label="Phone" name="phone" value={formData.phone} onChange={handleInputChange} />
                    <InputField label="Email" name="email" value={formData.email} onChange={handleInputChange} type="email" />
                  </>
                )}
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
              <button onClick={handleSubmit} disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 flex items-center space-x-2">
                {saving && <i className="pi pi-spinner pi-spin"></i>}
                <span>{editingStudent ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BULK IMPORT MODAL ==================== */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Bulk Import</h3>
              <button onClick={resetBulkImport} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <i className="pi pi-times"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-sm text-slate-600">
                  Importing to: <span className="font-semibold text-slate-800">{selectedOrg?.name || 'Select an organization first'}</span>
                </p>
                {selectedOrg?.type === 'university' && (
                  <p className="text-xs text-blue-600 mt-1">💡 For universities: Put year + section in Class field (e.g., "Year 1 CS-A")</p>
                )}
              </div>

              {!bulkResults ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">📋 Instructions</h4>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Download the appropriate template below</li>
                      <li>Fill in the data (leave Employee ID blank for auto-generation)</li>
                      <li>For {selectedOrg?.type === 'university' ? 'universities: put year+section in Class column' : 'photos: name each file as student_id.jpg'}</li>
                      <li>Upload CSV + optional photos ZIP</li>
                      <li>Click Import</li>
                    </ol>
                  </div>

                  {/* Template Downloads */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={downloadStudentTemplate}
                      className="p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-center">
                      <i className="pi pi-download text-red-600 text-xl mb-1 block"></i>
                      <span className="text-sm font-medium text-red-700">Student Template</span>
                      <p className="text-xs text-red-500 mt-1">.xlsx format</p>
                    </button>
                    <button onClick={downloadEmployeeTemplate}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-center">
                      <i className="pi pi-download text-slate-600 text-xl mb-1 block"></i>
                      <span className="text-sm font-medium text-slate-700">Employee Template</span>
                      <p className="text-xs text-slate-500 mt-1">.xlsx format</p>
                    </button>
                  </div>

                  {/* CSV Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CSV/Excel File *</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-red-300 transition-colors">
                      <input type="file" accept=".csv,.xlsx,.xls" className="hidden" id="csv-upload" onChange={handleCsvFileSelect} />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <i className="pi pi-file-excel text-2xl text-slate-400 mb-1 block"></i>
                        <span className="text-sm text-slate-600">{csvFile ? csvFile.name : 'Click to upload CSV/Excel'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Photo ZIP (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Photos ZIP (Optional)
                      <span className="text-xs text-slate-400 ml-2">- name photos as student_id.jpg</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-red-300 transition-colors">
                      <input type="file" accept=".zip" className="hidden" id="zip-upload" onChange={(e) => setPhotoZipFile(e.target.files[0])} />
                      <label htmlFor="zip-upload" className="cursor-pointer">
                        <i className="pi pi-images text-2xl text-slate-400 mb-1 block"></i>
                        <span className="text-sm text-slate-600">{photoZipFile ? photoZipFile.name : 'Click to upload photos ZIP'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <h4 className="text-sm font-semibold text-amber-800 mb-1">📸 Photo Naming Guide</h4>
                    <p className="text-xs text-amber-700">
                      Name each photo to match the <strong>student_id/employeeId</strong> in your CSV.<br />
                      Example: <code className="bg-amber-100 px-1 rounded">S1A-001.jpg</code> or <code className="bg-amber-100 px-1 rounded">MON-001.jpg</code>
                    </p>
                  </div>

                  {bulkPreview.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2">Preview (First 5 Rows)</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-40">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              {Object.keys(bulkPreview[0]).slice(0, 8).map(key => (
                                <th key={key} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkPreview.map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).slice(0, 8).map((val, j) => (
                                  <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">{String(val || '')}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importProgress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3">
                      <i className="pi pi-spinner pi-spin text-blue-600"></i>
                      <span className="text-sm text-blue-700">{importProgress.message}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800">Import Results</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ResultStat label="Created" value={bulkResults.created} color="green" />
                    <ResultStat label="Updated" value={bulkResults.updated} color="blue" />
                    <ResultStat label="Skipped" value={bulkResults.skipped} color="amber" />
                    <ResultStat label="With Photos" value={bulkResults.withPhotos} color="purple" />
                  </div>
                  {bulkResults.errors?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                      <p className="font-medium text-red-800 text-sm mb-2">Errors:</p>
                      {bulkResults.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-700">
                          {err.student_id}: {err.error || err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
              <button onClick={resetBulkImport} className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium">
                {bulkResults ? 'Close' : 'Cancel'}
              </button>
              {!bulkResults && csvFile && (
                <>
                  <button onClick={() => handleBulkImport(false)} disabled={bulkLoading}
                    className="px-5 py-2.5 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 disabled:opacity-50 flex items-center space-x-2">
                    {bulkLoading ? <i className="pi pi-spinner pi-spin"></i> : <i className="pi pi-upload"></i>}
                    <span>Import CSV</span>
                  </button>
                  {photoZipFile && (
                    <button onClick={() => handleBulkImport(true)} disabled={bulkLoading}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 flex items-center space-x-2">
                      <i className="pi pi-images"></i>
                      <span>Import + Photos</span>
                    </button>
                  )}
                </>
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
              <button onClick={() => setShowPhotoModal(false)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
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
    <i className={`${icon} text-lg mb-1 ${color === 'red' ? 'text-red-500' : 'text-slate-500'}`}></i>
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

const InputField = ({ label, name, value, onChange, type = 'text', error, disabled }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} disabled={disabled}
      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-red-500 ${disabled ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' :
        error ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50'
        }`} />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const ResultStat = ({ label, value, color }) => {
  const colors = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700'
  };
  return (
    <div className={`rounded-xl p-3 text-center ${colors[color]}`}>
      <p className="text-xl font-bold">{value || 0}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
};

export default Students;