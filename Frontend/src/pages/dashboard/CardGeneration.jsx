// pages/dashboard/CardGeneration.jsx - CARD-AGENT with Drag & Drop + Student/Employee Support
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import { cardAPI, templateAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CardGeneration = () => {
    // ==================== STATE ====================
    const [activeStep, setActiveStep] = useState('upload');
    const [generationMode, setGenerationMode] = useState('batch');
    const [batchMethod, setBatchMethod] = useState('upload');
    const [generationStatus, setGenerationStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [batchInfo, setBatchInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [photoUploadStatus, setPhotoUploadStatus] = useState('idle');
    const [batchId, setBatchId] = useState(null);
    const [showStudentSelect, setShowStudentSelect] = useState(false);
    const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Organizations & Person Filter
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [personFilter, setPersonFilter] = useState('all'); // 'all', 'student', 'employee'

    // Quick create
    const [quickStudent, setQuickStudent] = useState({
        student_id: '', name: '', personType: 'student',
        class: '', level: '', gender: '', residence: '', academic_year: '',
        department: '', position: '', employeeId: ''
    });

    // Batch filters
    const [batchFilters, setBatchFilters] = useState({ class: '', level: '', academic_year: '' });
    const [filterOptions, setFilterOptions] = useState({ classes: [], levels: [], academicYears: [] });
    const [loadingFilters, setLoadingFilters] = useState(false);

    // Files
    const [csvFile, setCsvFile] = useState(null);
    const [photoZipFile, setPhotoZipFile] = useState(null);

    // 🔥 Coordinates - kept for flexibility + drag support
    const [coordinates, setCoordinates] = useState({
        photo: { x: 50, y: 230, width: 250, height: 250 },
        name: { x: 580, y: 225, maxWidth: 500 },
        student_id: { x: 580, y: 475, maxWidth: 400 },
        class: { x: 580, y: 270, maxWidth: 300 },
        level: { x: 580, y: 320, maxWidth: 500 },
        gender: { x: 580, y: 375, maxWidth: 300 },
        residence: { x: 620, y: 420, maxWidth: 300 },
        academic_year: { x: 670, y: 472, maxWidth: 300 }
    });

    const [templateDimensions, setTemplateDimensions] = useState({ width: 1080, height: 607 });
    const [templatePreviewUrl, setTemplatePreviewUrl] = useState('');
    const [draggingField, setDraggingField] = useState(null);
    const previewContainerRef = useRef(null);

    // ==================== LOAD DATA ====================
    useEffect(() => { loadOrganizations(); loadTemplates(); }, []);
    useEffect(() => { if (selectedOrgId) { loadOrgStudents(); } }, [selectedOrgId]);
    useEffect(() => { if (selectedTemplateId) { loadTemplateDimensions(); loadTemplatePreview(); } }, [selectedTemplateId]);

    const loadOrganizations = async () => {
        try {
            const response = await cardAPI.getOrganizations();
            if (response.success) setOrganizations(response.organizations || []);
        } catch (error) { console.error('Failed to load organizations:', error); }
    };

    const loadOrgStudents = async () => {
        try {
            const response = await cardAPI.getOrgStudents(selectedOrgId, { limit: 500 });
            if (response.success) setStudents(response.students || []);
        } catch (error) { console.error('Failed to load students:', error); }
    };

    const loadTemplates = async () => {
        try {
            const params = selectedOrgId ? { organizationId: selectedOrgId } : {};
            const response = await templateAPI.getTemplates(params);
            if (response.success) {
                setTemplates(response.templates || []);
                const defaultTemplate = response.templates.find(t => t.isDefault);
                if (defaultTemplate) setSelectedTemplateId(defaultTemplate._id);
            }
        } catch (error) { console.error('Failed to load templates:', error); }
    };

    const loadTemplateDimensions = async () => {
        if (!selectedTemplateId) return;
        try {
            const response = await cardAPI.getTemplateDimensions(selectedTemplateId);
            if (response.success) {
                setTemplateDimensions({
                    width: response.dimensions.preview?.width || 800,
                    height: response.dimensions.preview?.height || 450,
                    scaleFactor: response.dimensions.scaled?.scaleFactor || 0.7083,
                    originalWidth: response.dimensions.original?.width || 1200,
                    originalHeight: response.dimensions.original?.height || 678
                });
            }
        } catch (error) { console.error('Failed to load dimensions:', error); }
    };

    const loadTemplatePreview = async () => {
        const template = templates.find(t => t._id === selectedTemplateId);
        if (template?.frontSideUrl) {
            setTemplatePreviewUrl(template.frontSideUrl);
        }
    };

    // ==================== FILTERING ====================
    const filteredStudents = students.filter(student => {
        const term = searchTerm.toLowerCase().trim();
        let matches = true;
        if (term) {
            matches = (student.name?.toLowerCase() || '').includes(term) ||
                (student.student_id?.toLowerCase() || '').includes(term) ||
                (student.studentDetails?.class?.toLowerCase() || '').includes(term) ||
                (student.employeeDetails?.department?.toLowerCase() || '').includes(term);
        }
        if (personFilter !== 'all') {
            matches = matches && student.personType === personFilter;
        }
        return matches;
    });

    // ==================== DRAG HANDLERS ====================
    const handleDrag = (field, e, data) => {
        const container = previewContainerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const scaleX = templateDimensions.originalWidth / rect.width;
        const scaleY = templateDimensions.originalHeight / rect.height;

        setCoordinates(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                x: Math.round(data.x * scaleX),
                y: Math.round(data.y * scaleY)
            }
        }));
    };

    const handleCoordinateInputChange = (field, key, value) => {
        setCoordinates(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [key]: parseInt(value) || 0
            }
        }));
    };

    // ==================== HANDLERS ====================
    const handleOrgChange = async (orgId) => {
        setSelectedOrgId(orgId);
        setSelectedStudent(null);
        setPersonFilter('all');
        if (orgId) { await loadOrgStudents(); await loadTemplates(); }
    };

    const handleSingleStudentSelect = (studentId) => {
        const student = students.find(s => s._id === studentId);
        if (!student) return;
        setSelectedStudent(student);
        if (!selectedTemplateId) { toast.error('Select a template first'); setActiveStep('template'); return; }
        if (!student.has_photo) { setShowPhotoModal(true); } else { setActiveStep('process'); }
    };

    const handleQuickCreateStudent = async () => {
        if (!quickStudent.name) { toast.error('Name is required'); return; }
        if (quickStudent.personType === 'student' && !quickStudent.student_id) { toast.error('Student ID is required'); return; }
        if (!selectedOrgId) { toast.error('Select an organization first'); return; }
        try {
            const response = await cardAPI.quickCreateStudent({ ...quickStudent, organizationId: selectedOrgId });
            if (response.success) {
                toast.success(`${quickStudent.personType === 'student' ? 'Student' : 'Employee'} created!`);
                setShowQuickCreateModal(false);
                setQuickStudent({ student_id: '', name: '', personType: 'student', class: '', level: '', gender: '', residence: '', academic_year: '', department: '', position: '', employeeId: '' });
                await loadOrgStudents();
                if (response.student) { setSelectedStudent(response.student); setActiveStep('process'); }
            }
        } catch (error) { toast.error(error.response?.data?.error || 'Failed to create'); }
    };

    const handlePhotoUploadOnly = async () => {
        if (!uploadedPhoto || !selectedStudent) return;
        try {
            setPhotoUploadStatus('uploading');
            const formData = new FormData();
            formData.append('studentId', selectedStudent._id);
            formData.append('photo', uploadedPhoto);
            const response = await cardAPI.uploadStudentPhoto(formData);
            if (response.success) {
                const updated = students.map(s => s._id === selectedStudent._id ? { ...s, has_photo: true, photo_url: response.photo_url } : s);
                setStudents(updated);
                setSelectedStudent(prev => ({ ...prev, has_photo: true, photo_url: response.photo_url }));
                setShowPhotoModal(false);
                setUploadedPhoto(null);
                setActiveStep('process');
            }
        } catch (error) { toast.error('Photo upload failed'); }
        finally { setPhotoUploadStatus('idle'); }
    };

    const generateSingleCard = async (student) => {
        if (!selectedTemplateId || !student) { toast.error('Select a template and person'); return; }
        setGenerationStatus('processing'); setProgress(0);
        try {
            const blob = await cardAPI.generateSingle({
                studentId: student._id,
                templateId: selectedTemplateId,
                coordinates: JSON.stringify(coordinates)
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `id-card-${student.student_id}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setGenerationStatus('completed'); setProgress(100);
            setBatchInfo({ totalCards: 1, processed: 1, failed: 0, studentName: student.name });
            toast.success('Card generated!');
        } catch (error) {
            setGenerationStatus('error');
            toast.error(`Failed: ${error.message}`);
        }
    };

    const handleCSVProcessing = async () => {
        if (!selectedTemplateId || !csvFile || !selectedOrgId) {
            toast.error('Select organization, template, and CSV'); return;
        }
        setGenerationStatus('processing'); setProgress(0);
        const formData = new FormData();
        formData.append('csv', csvFile);
        formData.append('templateId', selectedTemplateId);
        formData.append('organizationId', selectedOrgId);
        formData.append('coordinates', JSON.stringify(coordinates));
        if (personFilter !== 'all') formData.append('personType', personFilter);
        if (photoZipFile) formData.append('photoZip', photoZipFile);
        try {
            const blob = await cardAPI.processCSVAndGenerate(formData);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch-cards-${Date.now()}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setGenerationStatus('completed'); setProgress(100);
            toast.success('Batch complete!');
        } catch (error) {
            setGenerationStatus('error');
            toast.error('Batch failed: ' + error.message);
        }
    };

    const handleBatchFromDatabase = async () => {
        if (!selectedTemplateId || !selectedOrgId) {
            toast.error('Select organization and template'); return;
        }
        const filtered = filteredStudents.filter(s => s.personType === 'student' || s.personType === 'employee');
        if (filtered.length === 0) { toast.error('No people match your filters'); return; }

        setGenerationStatus('processing'); setProgress(0);
        try {
            const response = await cardAPI.generateBatchFromDB({
                templateId: selectedTemplateId,
                filters: { ...batchFilters, personType: personFilter },
                coordinates: JSON.stringify(coordinates),
                organizationId: selectedOrgId
            });
            if (response instanceof Blob) {
                const url = window.URL.createObjectURL(response);
                const a = document.createElement('a');
                a.href = url;
                a.download = `batch-cards-${Date.now()}.zip`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
            setGenerationStatus('completed'); setProgress(100);
            setBatchInfo({ totalCards: filtered.length, processed: filtered.length, failed: 0 });
            toast.success(`Generated ${filtered.length} cards!`);
        } catch (error) {
            setGenerationStatus('error');
            toast.error('Batch failed: ' + error.message);
        }
    };

    const selectedTemplate = templates.find(t => t._id === selectedTemplateId);
    const selectedOrg = organizations.find(o => o._id === selectedOrgId);
    const studentCount = students.filter(s => s.personType === 'student').length;
    const employeeCount = students.filter(s => s.personType === 'employee').length;

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
                        Card Generation Studio
                    </h1>
                    <p className="text-slate-500 mt-1">Design and generate professional ID cards for students & employees</p>
                </div>

                {/* Organization Selector */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Select Organization <span className="text-red-500">*</span>
                            </label>
                            <select value={selectedOrgId} onChange={(e) => handleOrgChange(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 transition-all text-slate-700">
                                <option value="">Choose an organization...</option>
                                {organizations.map(org => (
                                    <option key={org._id} value={org._id}>
                                        {org.name} ({org.type}) - {org.stats?.totalPeople || 0} people
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedOrg && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 rounded-xl">
                                <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
                                    <i className="pi pi-building text-white text-sm"></i>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{selectedOrg.name}</p>
                                    <p className="text-xs text-slate-500 capitalize">
                                        {selectedOrg.type} • 🎓{studentCount} students • 💼{employeeCount} employees
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Generation Mode</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => { setGenerationMode('batch'); setActiveStep('upload'); }}
                            className={`p-5 rounded-2xl border-2 text-left transition-all ${generationMode === 'batch' ? 'border-red-500 bg-red-50 shadow-lg' : 'border-slate-200 hover:border-red-300'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${generationMode === 'batch' ? 'bg-red-600' : 'bg-slate-200'}`}>
                                    <i className={`pi pi-users text-lg ${generationMode === 'batch' ? 'text-white' : 'text-slate-600'}`}></i>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Batch Processing</h3>
                                    <p className="text-sm text-slate-500">Multiple cards at once</p>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => { setGenerationMode('single'); setActiveStep('upload'); }}
                            className={`p-5 rounded-2xl border-2 text-left transition-all ${generationMode === 'single' ? 'border-red-500 bg-red-50 shadow-lg' : 'border-slate-200 hover:border-red-300'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${generationMode === 'single' ? 'bg-red-600' : 'bg-slate-200'}`}>
                                    <i className={`pi pi-user text-lg ${generationMode === 'single' ? 'text-white' : 'text-slate-600'}`}></i>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Single Card</h3>
                                    <p className="text-sm text-slate-500">Generate one at a time</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* 🔥 Person Type Filter (for batch from database) */}
                {selectedOrgId && generationMode === 'batch' && batchMethod === 'database' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4 mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Type</label>
                        <div className="flex gap-2">
                            {[
                                { value: 'all', label: 'All', count: students.length },
                                { value: 'student', label: 'Students', count: studentCount },
                                { value: 'employee', label: 'Employees', count: employeeCount }
                            ].map(opt => (
                                <button key={opt.value} onClick={() => setPersonFilter(opt.value)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${personFilter === opt.value
                                            ? 'bg-red-600 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}>
                                    {opt.label} ({opt.count})
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Workflow Steps */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 mb-6">
                    <div className="grid grid-cols-4 gap-3">
                        <StepButton step="1" title="Setup" active={activeStep === 'upload'} onClick={() => setActiveStep('upload')} />
                        <StepButton step="2" title="Template" active={activeStep === 'template'} onClick={() => setActiveStep('template')} />
                        <StepButton step="3" title="Position" active={activeStep === 'coordinates'} onClick={() => setActiveStep('coordinates')} />
                        <StepButton step="4" title="Generate" active={activeStep === 'process'} onClick={() => setActiveStep('process')} />
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Controls */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">

                            {/* STEP 1: UPLOAD/SELECT */}
                            {activeStep === 'upload' && generationMode === 'batch' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-slate-800">Batch Data Source</h3>
                                    <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
                                        <button onClick={() => setBatchMethod('upload')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${batchMethod === 'upload' ? 'bg-white shadow text-red-600' : 'text-slate-600'}`}>
                                            <i className="pi pi-upload mr-1"></i> Upload CSV/ZIP
                                        </button>
                                        <button onClick={() => setBatchMethod('database')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${batchMethod === 'database' ? 'bg-white shadow text-red-600' : 'text-slate-600'}`}>
                                            <i className="pi pi-database mr-1"></i> From Database ({students.length})
                                        </button>
                                    </div>

                                    {batchMethod === 'upload' && (
                                        <div className="space-y-4">
                                            <FileUploadCard title="Data (CSV/Excel)" accept=".csv,.xlsx,.xls" icon="pi-file-excel" color="red" onFileSelect={setCsvFile} />
                                            <FileUploadCard title="Photos (ZIP)" accept=".zip" icon="pi-images" color="slate" note="Name photos as student_id.jpg" onFileSelect={setPhotoZipFile} />
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                                                <i className="pi pi-info-circle mr-2"></i>
                                                CSV must include: student_id, name, class, level, residence, gender, academic_year
                                            </div>
                                        </div>
                                    )}

                                    {batchMethod === 'database' && (
                                        <div className="space-y-4">
                                            {!selectedOrgId ? (
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                                    <i className="pi pi-info-circle text-amber-500 text-2xl mb-2 block"></i>
                                                    <p className="text-amber-800 font-medium">Select an organization first</p>
                                                </div>
                                            ) : (
                                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                                    <p className="font-medium text-red-800">
                                                        {filteredStudents.length} people ready
                                                        ({filteredStudents.filter(s => s.personType === 'student').length} students,
                                                        {filteredStudents.filter(s => s.personType === 'employee').length} employees)
                                                    </p>
                                                    <p className="text-sm text-red-600 mt-1">From {selectedOrg?.name}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button onClick={() => {
                                        if (!selectedOrgId) { toast.error('Select an organization'); return; }
                                        if (batchMethod === 'upload' && !csvFile) { toast.error('Select a CSV file'); return; }
                                        if (!selectedTemplateId) { toast.error('Select template first'); setActiveStep('template'); return; }
                                        setActiveStep('process');
                                    }} className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all">
                                        Continue <i className="pi pi-arrow-right ml-2"></i>
                                    </button>
                                </div>
                            )}

                            {activeStep === 'upload' && generationMode === 'single' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-slate-800">Select or Create</h3>
                                    {!selectedOrgId ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                                            <i className="pi pi-building text-amber-500 text-3xl mb-3 block"></i>
                                            <p className="text-amber-800 font-medium">Please select an organization first</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* 🔥 Person type filter for single mode */}
                                            <div className="flex gap-2">
                                                {['all', 'student', 'employee'].map(type => (
                                                    <button key={type} onClick={() => setPersonFilter(type)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${personFilter === type ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                        {type === 'all' ? 'All' : type === 'student' ? '🎓 Students' : '💼 Employees'}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="relative">
                                                <button onClick={() => setShowStudentSelect(!showStudentSelect)}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-left flex justify-between items-center hover:border-red-300 transition-colors">
                                                    <span className={selectedStudent ? 'text-slate-800' : 'text-slate-400'}>
                                                        {selectedStudent ? `${selectedStudent.name} (${selectedStudent.student_id})` : 'Select existing person...'}
                                                    </span>
                                                    <i className={`pi pi-chevron-${showStudentSelect ? 'up' : 'down'} text-slate-500`}></i>
                                                </button>
                                                {showStudentSelect && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10">
                                                        <div className="p-3 border-b">
                                                            <input type="text" placeholder="Search..." value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" autoFocus />
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {filteredStudents.slice(0, 15).map(s => (
                                                                <button key={s._id} onClick={() => { handleSingleStudentSelect(s._id); setShowStudentSelect(false); }}
                                                                    className="w-full text-left p-3 hover:bg-slate-50 border-b flex justify-between items-center">
                                                                    <div>
                                                                        <div className="font-medium text-slate-800 text-sm">{s.name}</div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {s.student_id} • {s.personType === 'student' ? '🎓' : '💼'} {s.studentDetails?.class || s.employeeDetails?.department || ''}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        {!s.has_photo && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">No Photo</span>}
                                                                        {s.card_generated && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ready</span>}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">OR</span></div></div>
                                            <button onClick={() => setShowQuickCreateModal(true)}
                                                className="w-full border-2 border-dashed border-red-300 py-4 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors">
                                                <i className="pi pi-plus mr-2"></i> Quick Create & Generate
                                            </button>
                                            <button onClick={() => {
                                                if (!selectedTemplateId) { toast.error('Select template first'); setActiveStep('template'); }
                                                else if (selectedStudent) setActiveStep('process');
                                                else toast.error('Select a person first');
                                            }} disabled={!selectedStudent}
                                                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:from-red-700 hover:to-red-600 transition-all">
                                                Continue to Generate
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: TEMPLATE */}
                            {activeStep === 'template' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Select Template</h3>
                                    {templates.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <i className="pi pi-image text-4xl mb-3 block"></i>No templates found
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 max-h-96 overflow-y-auto">
                                            {templates.map(template => (
                                                <div key={template._id} onClick={() => setSelectedTemplateId(template._id)}
                                                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedTemplateId === template._id ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800">{template.name}</h4>
                                                            <p className="text-xs text-slate-500 capitalize">{template.templateType === 'two-sided' ? 'Double-sided' : 'Single-sided'}</p>
                                                        </div>
                                                        {template.isDefault && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Default</span>}
                                                    </div>
                                                    {template.frontSideUrl && <div className="mt-2 w-full h-20 bg-slate-100 rounded-lg overflow-hidden"><img src={template.frontSideUrl} className="w-full h-full object-cover" /></div>}
                                                    {selectedTemplateId === template._id && <p className="text-xs text-red-600 mt-2 text-center font-medium">✓ Selected</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={() => setActiveStep('coordinates')} disabled={!selectedTemplateId}
                                        className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium disabled:opacity-50">Continue to Positioning</button>
                                </div>
                            )}

                            {/* 🔥 STEP 3: COORDINATES - DRAG & DROP + MANUAL INPUT */}
                            {activeStep === 'coordinates' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">Position Fields</h3>
                                            <p className="text-sm text-slate-500">Drag fields on the preview or enter coordinates manually</p>
                                        </div>
                                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Drag & Drop Mode</span>
                                    </div>

                                    {/* 🔥 Drag & Drop Preview */}
                                    {templatePreviewUrl && (
                                        <div className="relative border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-200"
                                            ref={previewContainerRef}
                                            style={{ minHeight: '300px' }}>
                                            <img src={templatePreviewUrl} alt="Template" className="w-full" draggable={false} />

                                            {/* Draggable Fields */}
                                            {Object.entries(coordinates).map(([field, coord]) => {
                                                const previewScale = templateDimensions.width / templateDimensions.originalWidth;
                                                const displayX = (coord.x * previewScale) || 0;
                                                const displayY = (coord.y * previewScale) || 0;

                                                return (
                                                    <Draggable
                                                        key={field}
                                                        position={{ x: displayX, y: displayY }}
                                                        onStop={(e, data) => handleDrag(field, e, data)}
                                                        bounds="parent"
                                                    >
                                                        <div
                                                            className={`absolute cursor-move px-2 py-1 rounded-md text-xs font-medium shadow-md border-2 transition-all hover:shadow-lg ${draggingField === field
                                                                    ? 'bg-red-600 text-white border-red-700 z-50 scale-110'
                                                                    : field === 'photo'
                                                                        ? 'bg-purple-500/80 text-white border-purple-600'
                                                                        : 'bg-white/90 text-slate-700 border-slate-400'
                                                                }`}
                                                            onMouseDown={() => setDraggingField(field)}
                                                            onMouseUp={() => setDraggingField(null)}
                                                        >
                                                            {field === 'photo' ? '📷 Photo' : field.replace('_', ' ')}
                                                        </div>
                                                    </Draggable>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 🔥 Manual Coordinate Inputs (kept for precision) */}
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-2">Fine-tune coordinates manually</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                            {Object.entries(coordinates).map(([field, coord]) => (
                                                <div key={field} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1.5 border border-slate-200">
                                                    <span className="text-xs text-slate-500 capitalize w-12 truncate">{field.replace('_', ' ')}</span>
                                                    <input
                                                        type="number"
                                                        placeholder="X"
                                                        value={coord.x}
                                                        onChange={(e) => handleCoordinateInputChange(field, 'x', e.target.value)}
                                                        className="w-12 px-1 py-0.5 border border-slate-200 rounded text-xs text-center"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Y"
                                                        value={coord.y}
                                                        onChange={(e) => handleCoordinateInputChange(field, 'y', e.target.value)}
                                                        className="w-12 px-1 py-0.5 border border-slate-200 rounded text-xs text-center"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={() => setActiveStep('process')}
                                        className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium">
                                        Continue to Generate
                                    </button>
                                </div>
                            )}

                            {/* STEP 4: GENERATE */}
                            {activeStep === 'process' && (
                                <div className="space-y-6 text-center">
                                    <h3 className="text-lg font-semibold text-slate-800">Ready to Generate</h3>

                                    {generationMode === 'single' && selectedStudent && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{selectedStudent.personType === 'student' ? '🎓' : '💼'}</span>
                                                <div>
                                                    <p className="font-medium text-slate-800">{selectedStudent.name}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {selectedStudent.student_id} • {selectedStudent.personType}
                                                        {selectedStudent.personType === 'student'
                                                            ? ` • ${selectedStudent.studentDetails?.class || ''}`
                                                            : ` • ${selectedStudent.employeeDetails?.department || ''}`
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            {!selectedStudent.has_photo && <p className="text-xs text-amber-600 mt-1">⚠️ No photo</p>}
                                        </div>
                                    )}

                                    {generationMode === 'batch' && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
                                            <p className="font-medium text-slate-800">
                                                {batchMethod === 'upload' && csvFile
                                                    ? `CSV: ${csvFile.name}`
                                                    : `${filteredStudents.length} people from ${selectedOrg?.name}`
                                                }
                                            </p>
                                            {personFilter !== 'all' && (
                                                <p className="text-sm text-slate-500 mt-1">Filtered: {personFilter}s only</p>
                                            )}
                                        </div>
                                    )}

                                    {selectedTemplate && (
                                        <div className="text-left text-sm text-slate-600">
                                            Template: <span className="font-medium text-slate-800">{selectedTemplate.name}</span>
                                            <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded-full capitalize">{selectedTemplate.templateType}</span>
                                        </div>
                                    )}

                                    <button onClick={() => {
                                        if (!selectedOrgId) { toast.error('Select an organization'); return; }
                                        if (generationMode === 'single') generateSingleCard(selectedStudent);
                                        else if (batchMethod === 'database') handleBatchFromDatabase();
                                        else handleCSVProcessing();
                                    }} disabled={generationStatus === 'processing' || !selectedOrgId}
                                        className="bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg disabled:opacity-50 hover:from-red-700 hover:to-red-600 transition-all shadow-lg hover:shadow-xl">
                                        {generationStatus === 'processing' ? (
                                            <><i className="pi pi-spinner pi-spin mr-2"></i>Generating...</>
                                        ) : (
                                            <><i className="pi pi-play mr-2"></i>Generate Cards</>
                                        )}
                                    </button>

                                    {generationStatus === 'processing' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm text-slate-600"><span>Progress</span><span>{Math.round(progress)}%</span></div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-red-600 to-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                    {generationStatus === 'completed' && (
                                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-green-800">
                                            <i className="pi pi-check-circle mr-2"></i>Complete! Download started.
                                        </div>
                                    )}
                                    {generationStatus === 'error' && (
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800">
                                            <i className="pi pi-times-circle mr-2"></i>Failed. Please try again.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 sticky top-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Live Preview</h3>
                            <div className="bg-slate-900 rounded-xl p-3">
                                {selectedTemplate?.frontSideUrl ? (
                                    <img src={selectedTemplate.frontSideUrl} alt="Template" className="w-full rounded-lg" />
                                ) : (
                                    <div className="text-center text-slate-400 py-16">
                                        <i className="pi pi-image text-4xl mb-3 block"></i>
                                        <p className="text-sm">Select a template</p>
                                    </div>
                                )}
                            </div>
                            {selectedOrg && (
                                <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-500">Organization</p>
                                    <p className="font-medium text-slate-800 text-sm">{selectedOrg.name}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">🎓 {studentCount} Students</span>
                                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">💼 {employeeCount} Employees</span>
                                    </div>
                                </div>
                            )}
                            {selectedTemplate && (
                                <div className="mt-2 p-3 bg-red-50 rounded-xl">
                                    <p className="text-xs text-red-500">Template</p>
                                    <p className="font-medium text-red-800 text-sm">{selectedTemplate.name}</p>
                                    <p className="text-xs text-red-600 capitalize">{selectedTemplate.templateType}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Create Modal */}
            {showQuickCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-800">Quick Create</h3>
                            <button onClick={() => setShowQuickCreateModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                                <i className="pi pi-times text-slate-600"></i>
                            </button>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setQuickStudent(p => ({ ...p, personType: 'student' }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium ${quickStudent.personType === 'student' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <i className="pi pi-graduation-cap mr-1"></i> Student
                            </button>
                            <button onClick={() => setQuickStudent(p => ({ ...p, personType: 'employee' }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium ${quickStudent.personType === 'employee' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <i className="pi pi-briefcase mr-1"></i> Employee
                            </button>
                        </div>
                        <div className="space-y-3">
                            {quickStudent.personType === 'employee' && (
                                <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-500">
                                    💡 Employee ID will be auto-generated. Leave blank.
                                </div>
                            )}
                            <input type="text" placeholder={quickStudent.personType === 'student' ? 'ID Number *' : 'ID (auto-generated)'}
                                value={quickStudent.student_id}
                                onChange={(e) => setQuickStudent(p => ({ ...p, student_id: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
                                required={quickStudent.personType === 'student'} />
                            <input type="text" placeholder="Full Name *" value={quickStudent.name}
                                onChange={(e) => setQuickStudent(p => ({ ...p, name: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                            {quickStudent.personType === 'student' ? (
                                <>
                                    <input type="text" placeholder="Class" value={quickStudent.class} onChange={(e) => setQuickStudent(p => ({ ...p, class: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
                                    <input type="text" placeholder="Level" value={quickStudent.level} onChange={(e) => setQuickStudent(p => ({ ...p, level: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
                                </>
                            ) : (
                                <>
                                    <input type="text" placeholder="Department" value={quickStudent.department} onChange={(e) => setQuickStudent(p => ({ ...p, department: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
                                    <input type="text" placeholder="Position" value={quickStudent.position} onChange={(e) => setQuickStudent(p => ({ ...p, position: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
                                </>
                            )}
                            <select value={quickStudent.gender} onChange={(e) => setQuickStudent(p => ({ ...p, gender: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm">
                                <option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option>
                            </select>
                            <input type="text" placeholder="Residence" value={quickStudent.residence} onChange={(e) => setQuickStudent(p => ({ ...p, residence: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
                            <input type="text" placeholder="Academic Year" value={quickStudent.academic_year} onChange={(e) => setQuickStudent(p => ({ ...p, academic_year: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowQuickCreateModal(false)} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
                            <button onClick={handleQuickCreateStudent} className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-2.5 rounded-xl font-medium hover:from-red-700 hover:to-red-600">Create & Generate</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Modal */}
            {showPhotoModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <i className="pi pi-camera text-white text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Photo Required</h3>
                        <p className="text-slate-500 mt-1">{selectedStudent.name} needs a photo before generating card</p>
                        {uploadedPhoto && (
                            <div className="w-24 h-24 mx-auto mt-3 border-2 border-slate-200 rounded-xl overflow-hidden">
                                <img src={URL.createObjectURL(uploadedPhoto)} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                        )}
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 my-4 hover:border-red-300 transition-colors">
                            <input type="file" accept="image/*" className="hidden" id="photo-upload"
                                onChange={(e) => { if (e.target.files[0]) setUploadedPhoto(e.target.files[0]); }} />
                            <label htmlFor="photo-upload" className="inline-block bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg cursor-pointer text-slate-700 font-medium">
                                <i className="pi pi-upload mr-2"></i>Choose Photo
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowPhotoModal(false); setUploadedPhoto(null); }}
                                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium">Cancel</button>
                            <button onClick={handlePhotoUploadOnly} disabled={!uploadedPhoto || photoUploadStatus === 'uploading'}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-2.5 rounded-xl font-medium disabled:opacity-50">
                                {photoUploadStatus === 'uploading' ? <><i className="pi pi-spinner pi-spin mr-2"></i>Uploading...</> : 'Save & Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== SUB-COMPONENTS =====
const StepButton = ({ step, title, active, onClick }) => (
    <button onClick={onClick} className={`text-center p-3 rounded-xl transition-all ${active ? 'bg-red-50 border-2 border-red-500' : 'border-2 border-transparent hover:bg-slate-50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-bold ${active ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{step}</div>
        <div className={`text-xs sm:text-sm font-medium ${active ? 'text-red-600' : 'text-slate-600'}`}>{title}</div>
    </button>
);

const FileUploadCard = ({ title, accept, icon, color, onFileSelect, note }) => {
    const [file, setFile] = useState(null);
    return (
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-red-300 transition-colors">
            <div className={`w-12 h-12 ${color === 'red' ? 'bg-red-600' : 'bg-slate-700'} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <i className={`${icon} text-white text-xl`}></i>
            </div>
            <p className="font-medium text-slate-700">{title}</p>
            <input type="file" accept={accept} className="hidden" id={title.replace(/\s/g, '')}
                onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); onFileSelect(f); } }} />
            <label htmlFor={title.replace(/\s/g, '')} className="inline-block mt-2 text-sm bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-lg cursor-pointer text-slate-700 transition-colors">
                {file ? file.name : 'Choose File'}
            </label>
            {note && <p className="text-xs text-slate-400 mt-1">{note}</p>}
        </div>
    );
};

export default CardGeneration;