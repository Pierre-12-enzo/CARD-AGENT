// pages/dashboard/CardGeneration.jsx - CARD-AGENT NAVY & CRIMSON - FULL
import React, { useState, useRef, useEffect } from 'react';
import { cardAPI, templateAPI } from '../../services/api';

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

    // Organizations
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');

    // Quick create
    const [quickStudent, setQuickStudent] = useState({
        student_id: '', name: '', personType: 'student',
        class: '', level: '', gender: '', residence: '', academic_year: '',
        department: '', position: '', employeeId: ''
    });

    // Batch filters
    const [batchFilters, setBatchFilters] = useState({ class: '', level: '', academic_year: '' });
    const [filterOptions, setFilterOptions] = useState({ classes: [], levels: [], academicYears: [] });
    const [filteredBatchStudents, setFilteredBatchStudents] = useState([]);
    const [loadingFilters, setLoadingFilters] = useState(false);

    // Files
    const [csvFile, setCsvFile] = useState(null);
    const [photoZipFile, setPhotoZipFile] = useState(null);

    // Coordinates
    const [coordinates, setCoordinates] = useState({
        photo: { x: 50, y: 230, width: 250, height: 250 },
        name: { x: 580, y: 225, maxWidth: 500 },
        class: { x: 580, y: 270, maxWidth: 300 },
        level: { x: 580, y: 320, maxWidth: 500 },
        gender: { x: 580, y: 375, maxWidth: 300 },
        residence: { x: 620, y: 420, maxWidth: 300 },
        academic_year: { x: 670, y: 472, maxWidth: 300 }
    });

    const [templateDimensions, setTemplateDimensions] = useState({ width: 1080, height: 607 });

    // ==================== LOAD DATA ====================
    useEffect(() => { loadOrganizations(); loadTemplates(); }, []);
    useEffect(() => { if (selectedOrgId) { loadOrgStudents(); loadFilterOptions(); } }, [selectedOrgId]);
    useEffect(() => { if (selectedTemplateId) loadTemplateDimensions(); }, [selectedTemplateId]);

    const loadOrganizations = async () => {
        try {
            const response = await cardAPI.getOrganizations();
            if (response.success) setOrganizations(response.organizations || []);
        } catch (error) { console.error('Failed to load organizations:', error); }
    };

    const loadOrgStudents = async () => {
        try {
            const response = await cardAPI.getOrgStudents(selectedOrgId, { limit: 200 });
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

    const loadFilterOptions = async () => {
        try {
            const response = await cardAPI.getFilterOptions();
            if (response.success) setFilterOptions(response.options || { classes: [], levels: [], academicYears: [] });
        } catch (error) { console.error('Failed to load filter options:', error); }
    };

    const loadTemplateDimensions = async () => {
        if (!selectedTemplateId) return;
        try {
            const response = await cardAPI.getTemplateDimensions(selectedTemplateId);
            if (response.success) {
                setTemplateDimensions({
                    width: response.dimensions.scaled?.width || 850,
                    height: response.dimensions.scaled?.height || 478,
                    scaleFactor: response.dimensions.scaled?.scaleFactor || 0.7083
                });
            }
        } catch (error) { console.error('Failed to load dimensions:', error); }
    };

    const applyBatchFilters = async () => {
        setLoadingFilters(true);
        try {
            const params = new URLSearchParams();
            if (batchFilters.class) params.append('class', batchFilters.class);
            if (batchFilters.level) params.append('level', batchFilters.level);
            if (batchFilters.academic_year) params.append('academic_year', batchFilters.academic_year);
            const response = await cardAPI.getFilteredStudents(params);
            if (response.success) setFilteredBatchStudents(response.students);
        } catch (error) { console.error('Failed to apply filters:', error); }
        finally { setLoadingFilters(false); }
    };

    // ==================== HANDLERS ====================
    const handleOrgChange = async (orgId) => {
        setSelectedOrgId(orgId);
        setSelectedStudent(null);
        if (orgId) { await loadOrgStudents(); await loadTemplates(); }
    };

    const handleSingleStudentSelect = (studentId) => {
        const student = students.find(s => s._id === studentId);
        if (!student) return;
        setSelectedStudent(student);
        if (!selectedTemplateId) { alert('Select a template first'); setActiveStep('template'); return; }
        if (!student.has_photo) { setShowPhotoModal(true); } else { setActiveStep('process'); }
    };

    const handleQuickCreateStudent = async () => {
        if (!quickStudent.student_id || !quickStudent.name) { alert('Student ID and Name are required'); return; }
        if (!selectedOrgId) { alert('Select an organization first'); return; }
        try {
            const response = await cardAPI.quickCreateStudent({ ...quickStudent, organizationId: selectedOrgId });
            if (response.success) {
                setShowQuickCreateModal(false);
                setQuickStudent({ student_id: '', name: '', personType: 'student', class: '', level: '', gender: '', residence: '', academic_year: '', department: '', position: '', employeeId: '' });
                await loadOrgStudents();
                if (response.student) { setSelectedStudent(response.student); setActiveStep('process'); }
            }
        } catch (error) { alert('Failed to create student: ' + (error.response?.data?.error || error.message)); }
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
        } catch (error) { alert('Photo upload failed'); }
        finally { setPhotoUploadStatus('idle'); }
    };

    const generateSingleStudentCard = async (student) => {
        if (!selectedTemplateId || !student) { alert('Select a template and student'); return; }
        setGenerationStatus('processing'); setProgress(0);
        try {
            const blob = await cardAPI.generateSingle({ studentId: student._id, templateId: selectedTemplateId, coordinates: JSON.stringify(coordinates) });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `id-card-${student.student_id}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            setGenerationStatus('completed'); setProgress(100);
            setBatchInfo({ totalCards: 1, processed: 1, failed: 0, studentName: student.name });
        } catch (error) { setGenerationStatus('error'); alert(`Failed: ${error.message}`); }
    };

    const handleCSVProcessing = async () => {
        if (!selectedTemplateId || !csvFile || !selectedOrgId) { alert('Select organization, template, and CSV'); return; }
        setGenerationStatus('processing'); setProgress(0);
        const formData = new FormData();
        formData.append('csv', csvFile); formData.append('templateId', selectedTemplateId);
        formData.append('organizationId', selectedOrgId); formData.append('coordinates', JSON.stringify(coordinates));
        if (photoZipFile) formData.append('photoZip', photoZipFile);
        try {
            const blob = await cardAPI.processCSVAndGenerate(formData);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `batch-cards-${Date.now()}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            setGenerationStatus('completed'); setProgress(100);
        } catch (error) { setGenerationStatus('error'); alert('Batch failed: ' + error.message); }
    };

    const handleBatchFromDatabase = async () => {
        if (!selectedTemplateId || !selectedOrgId) { alert('Select organization and template'); return; }
        if (students.length === 0) { alert('No students in this organization'); return; }
        setGenerationStatus('processing'); setProgress(0);
        try {
            const response = await cardAPI.generateBatchFromDB({
                templateId: selectedTemplateId, filters: batchFilters, coordinates: JSON.stringify(coordinates), organizationId: selectedOrgId
            });
            if (response instanceof Blob) {
                const url = window.URL.createObjectURL(response);
                const a = document.createElement('a'); a.href = url; a.download = `batch-cards-${Date.now()}.zip`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            }
            setGenerationStatus('completed'); setProgress(100);
            setBatchInfo({ totalCards: students.length, processed: students.length, failed: 0 });
        } catch (error) { setGenerationStatus('error'); alert('Batch failed: ' + error.message); }
    };

    const filteredStudents = students.filter(student => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return (student.name?.toLowerCase() || '').includes(term) || (student.student_id?.toLowerCase() || '').includes(term) || (student.studentDetails?.class?.toLowerCase() || '').includes(term);
    });

    const selectedTemplate = templates.find(t => t._id === selectedTemplateId);
    const selectedOrg = organizations.find(o => o._id === selectedOrgId);

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
                        Card Generation Studio
                    </h1>
                    <p className="text-slate-500 mt-1">Design and generate professional ID cards</p>
                </div>

                {/* Organization Selector */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Select Organization <span className="text-red-500">*</span>
                            </label>
                            <select value={selectedOrgId} onChange={(e) => handleOrgChange(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-slate-700">
                                <option value="">Choose an organization...</option>
                                {organizations.map(org => (
                                    <option key={org._id} value={org._id}>{org.name} ({org.type}) - {org.stats?.totalPeople || 0} people</option>
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
                                    <p className="text-xs text-slate-500 capitalize">{selectedOrg.type} • {students.length} people</p>
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
                                        <button onClick={() => { setBatchMethod('database'); if (selectedOrgId) applyBatchFilters(); }}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${batchMethod === 'database' ? 'bg-white shadow text-red-600' : 'text-slate-600'}`}>
                                            <i className="pi pi-database mr-1"></i> From Database ({students.length})
                                        </button>
                                    </div>

                                    {batchMethod === 'upload' && (
                                        <div className="space-y-4">
                                            <FileUploadCard title="Student Data (CSV)" accept=".csv" icon="pi-file-excel" color="red" onFileSelect={setCsvFile} />
                                            <FileUploadCard title="Student Photos (ZIP)" accept=".zip" icon="pi-images" color="slate" note="Optional" onFileSelect={setPhotoZipFile} />
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
                                                <>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <select value={batchFilters.class} onChange={(e) => setBatchFilters(p => ({ ...p, class: e.target.value }))}
                                                            className="px-3 py-2 border border-slate-300 rounded-xl text-sm">
                                                            <option value="">All Classes</option>
                                                            {filterOptions.classes?.map(c => <option key={c}>{c}</option>)}
                                                        </select>
                                                        <select value={batchFilters.level} onChange={(e) => setBatchFilters(p => ({ ...p, level: e.target.value }))}
                                                            className="px-3 py-2 border border-slate-300 rounded-xl text-sm">
                                                            <option value="">All Levels</option>
                                                            {filterOptions.levels?.map(l => <option key={l}>{l}</option>)}
                                                        </select>
                                                        <select value={batchFilters.academic_year} onChange={(e) => setBatchFilters(p => ({ ...p, academic_year: e.target.value }))}
                                                            className="px-3 py-2 border border-slate-300 rounded-xl text-sm">
                                                            <option value="">All Years</option>
                                                            {filterOptions.academicYears?.map(y => <option key={y}>{y}</option>)}
                                                        </select>
                                                    </div>
                                                    <button onClick={applyBatchFilters} className="w-full bg-slate-100 py-2 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                                                        Apply Filters
                                                    </button>
                                                    {loadingFilters ? (
                                                        <div className="text-center py-4"><i className="pi pi-spinner pi-spin mr-2"></i> Loading...</div>
                                                    ) : (
                                                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                                            <p className="font-medium text-red-800">{students.length} students ready</p>
                                                            <p className="text-sm text-red-600 mt-1">From {selectedOrg?.name}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <button onClick={() => {
                                        if (!selectedOrgId) { alert('Select an organization'); return; }
                                        if (batchMethod === 'upload' && !csvFile) { alert('Select a CSV file'); return; }
                                        if (!selectedTemplateId) { alert('Select template first'); setActiveStep('template'); return; }
                                        setActiveStep('process');
                                    }} className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all">
                                        Continue <i className="pi pi-arrow-right ml-2"></i>
                                    </button>
                                </div>
                            )}

                            {activeStep === 'upload' && generationMode === 'single' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-slate-800">Select or Create Student</h3>
                                    {!selectedOrgId ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                                            <i className="pi pi-building text-amber-500 text-3xl mb-3 block"></i>
                                            <p className="text-amber-800 font-medium">Please select an organization first</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <button onClick={() => setShowStudentSelect(!showStudentSelect)}
                                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-left flex justify-between items-center hover:border-red-300 transition-colors">
                                                    <span className={selectedStudent ? 'text-slate-800' : 'text-slate-400'}>
                                                        {selectedStudent ? `${selectedStudent.name} (${selectedStudent.student_id})` : 'Select existing student...'}
                                                    </span>
                                                    <i className={`pi pi-chevron-${showStudentSelect ? 'up' : 'down'} text-slate-500`}></i>
                                                </button>
                                                {showStudentSelect && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10">
                                                        <div className="p-3 border-b">
                                                            <input type="text" placeholder="Search students..." value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" autoFocus />
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {filteredStudents.slice(0, 15).map(s => (
                                                                <button key={s._id} onClick={() => { handleSingleStudentSelect(s._id); setShowStudentSelect(false); }}
                                                                    className="w-full text-left p-3 hover:bg-slate-50 border-b flex justify-between items-center">
                                                                    <div>
                                                                        <div className="font-medium text-slate-800">{s.name}</div>
                                                                        <div className="text-xs text-slate-500">{s.student_id} • {s.studentDetails?.class || s.employeeDetails?.department || ''}</div>
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
                                                <i className="pi pi-plus mr-2"></i> Create New Student & Generate Card
                                            </button>
                                            <button onClick={() => {
                                                if (!selectedTemplateId) { alert('Select template first'); setActiveStep('template'); }
                                                else if (selectedStudent) setActiveStep('process');
                                                else alert('Select a student first');
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
                                                        <div><h4 className="font-semibold text-slate-800">{template.name}</h4><p className="text-xs text-slate-500 capitalize">{template.templateType}</p></div>
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

                            {/* STEP 3: COORDINATES */}
                            {activeStep === 'coordinates' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Field Positions</h3>
                                    <p className="text-sm text-slate-500">Adjust where each field appears on the card</p>
                                    <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                        {Object.entries(coordinates).map(([field, coord]) => (
                                            <div key={field} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <p className="font-medium text-slate-700 capitalize mb-2">{field.replace('_', ' ')}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input type="number" placeholder="X" value={coord.x}
                                                        onChange={(e) => setCoordinates(prev => ({ ...prev, [field]: { ...prev[field], x: parseInt(e.target.value) || 0 } }))}
                                                        className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                                                    <input type="number" placeholder="Y" value={coord.y}
                                                        onChange={(e) => setCoordinates(prev => ({ ...prev, [field]: { ...prev[field], y: parseInt(e.target.value) || 0 } }))}
                                                        className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setActiveStep('process')}
                                        className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium">Continue to Generate</button>
                                </div>
                            )}

                            {/* STEP 4: GENERATE */}
                            {activeStep === 'process' && (
                                <div className="space-y-6 text-center">
                                    <h3 className="text-lg font-semibold text-slate-800">Ready to Generate</h3>
                                    {generationMode === 'single' && selectedStudent && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
                                            <p className="font-medium text-slate-800">{selectedStudent.name}</p>
                                            <p className="text-sm text-slate-500">{selectedStudent.student_id}</p>
                                            {!selectedStudent.has_photo && <p className="text-xs text-amber-600 mt-1">⚠️ No photo</p>}
                                        </div>
                                    )}
                                    {generationMode === 'batch' && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
                                            <p className="font-medium text-slate-800">
                                                {batchMethod === 'upload' && csvFile ? `CSV: ${csvFile.name}` : `${students.length} students from ${selectedOrg?.name}`}
                                            </p>
                                        </div>
                                    )}
                                    {selectedTemplate && <div className="text-left text-sm text-slate-600">Template: <span className="font-medium text-slate-800">{selectedTemplate.name}</span></div>}
                                    <button onClick={() => {
                                        if (!selectedOrgId) { alert('Select an organization'); return; }
                                        if (generationMode === 'single') generateSingleStudentCard(selectedStudent);
                                        else if (batchMethod === 'database') handleBatchFromDatabase();
                                        else handleCSVProcessing();
                                    }} disabled={generationStatus === 'processing' || !selectedOrgId}
                                        className="bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg disabled:opacity-50 hover:from-red-700 hover:to-red-600 transition-all shadow-lg hover:shadow-xl">
                                        {generationStatus === 'processing' ? <><i className="pi pi-spinner pi-spin mr-2"></i>Generating...</> : <><i className="pi pi-play mr-2"></i>Generate Cards</>}
                                    </button>
                                    {generationStatus === 'processing' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm text-slate-600"><span>Progress</span><span>{Math.round(progress)}%</span></div>
                                            <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-gradient-to-r from-red-600 to-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
                                        </div>
                                    )}
                                    {generationStatus === 'completed' && <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-green-800"><i className="pi pi-check-circle mr-2"></i>Complete! Download started.</div>}
                                    {generationStatus === 'error' && <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800"><i className="pi pi-times-circle mr-2"></i>Failed. Try again.</div>}
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
                                    <img src={selectedTemplate.frontSideUrl} alt="Template Preview" className="w-full rounded-lg" />
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
                            <button onClick={() => setShowQuickCreateModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"><i className="pi pi-times text-slate-600"></i></button>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setQuickStudent(p => ({ ...p, personType: 'student' }))} className={`flex-1 py-2 rounded-lg text-sm font-medium ${quickStudent.personType === 'student' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}><i className="pi pi-graduation-cap mr-1"></i> Student</button>
                            <button onClick={() => setQuickStudent(p => ({ ...p, personType: 'employee' }))} className={`flex-1 py-2 rounded-lg text-sm font-medium ${quickStudent.personType === 'employee' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}><i className="pi pi-briefcase mr-1"></i> Employee</button>
                        </div>
                        <div className="space-y-3">
                            <input type="text" placeholder="ID Number *" value={quickStudent.student_id} onChange={(e) => setQuickStudent(p => ({ ...p, student_id: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                            <input type="text" placeholder="Full Name *" value={quickStudent.name} onChange={(e) => setQuickStudent(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
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
                            <select value={quickStudent.gender} onChange={(e) => setQuickStudent(p => ({ ...p, gender: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"><option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option></select>
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
                        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><i className="pi pi-camera text-white text-2xl"></i></div>
                        <h3 className="text-xl font-bold text-slate-800">Photo Required</h3>
                        <p className="text-slate-500 mt-1">{selectedStudent.name} needs a photo</p>
                        {uploadedPhoto && <div className="w-24 h-24 mx-auto mt-3 border-2 border-slate-200 rounded-xl overflow-hidden"><img src={URL.createObjectURL(uploadedPhoto)} className="w-full h-full object-cover" /></div>}
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 my-4 hover:border-red-300 transition-colors">
                            <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={(e) => { if (e.target.files[0]) setUploadedPhoto(e.target.files[0]); }} />
                            <label htmlFor="photo-upload" className="inline-block bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg cursor-pointer text-slate-700 font-medium"><i className="pi pi-upload mr-2"></i>Choose Photo</label>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowPhotoModal(false); setUploadedPhoto(null); }} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium">Cancel</button>
                            <button onClick={handlePhotoUploadOnly} disabled={!uploadedPhoto || photoUploadStatus === 'uploading'} className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-2.5 rounded-xl font-medium disabled:opacity-50">
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
            <input type="file" accept={accept} className="hidden" id={title.replace(/\s/g, '')} onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); onFileSelect(f); } }} />
            <label htmlFor={title.replace(/\s/g, '')} className="inline-block mt-2 text-sm bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-lg cursor-pointer text-slate-700 transition-colors">{file ? file.name : 'Choose File'}</label>
            {note && <p className="text-xs text-slate-400 mt-1">{note}</p>}
        </div>
    );
};

export default CardGeneration;