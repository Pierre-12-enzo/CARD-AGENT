// pages/dashboard/CardGeneration.jsx - FIXED VERSION
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { DndContext, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cardAPI, templateAPI, studentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useBatchProgress from '../../hooks/useBatchProgress';
import BatchProgressModal from '../../components/BatchProgressModal';
import DynamicFieldMapper from '../../components/DynamicFieldMapper';
import toast from 'react-hot-toast';

const CardGeneration = () => {
    // ==================== AUTH ====================
    const { user } = useAuth();

    // ==================== STEP STATE ====================
    const [activeStep, setActiveStep] = useState('upload');
    const [generationMode, setGenerationMode] = useState('batch');
    const [batchMethod, setBatchMethod] = useState('upload');

    // ==================== BATCH PROGRESS (WebSocket) ====================
    const { progress: batchProgress, resetProgress: resetBatchProgress, socketReady, subscribeToBatch } = useBatchProgress();
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [currentBatchId, setCurrentBatchId] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [isBatchRunning, setIsBatchRunning] = useState(false);

    // ==================== DATA STATE ====================
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [students, setStudents] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // ==================== STUDENT SELECTION ====================
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [personFilter, setPersonFilter] = useState('all');
    const [showStudentSelect, setShowStudentSelect] = useState(false);
    const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [photoUploadStatus, setPhotoUploadStatus] = useState('idle');
    const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
    const [missingFields, setMissingFields] = useState([]);

    // ==================== QUICK CREATE ====================
    const [quickStudent, setQuickStudent] = useState({
        student_id: '',
        name: '',
        personType: 'student',
        class: '',
        level: '',
        gender: '',
        residence: '',
        academic_year: '',
        parent_phone: '',
        department: '',
        position: '',
        employeeId: '',
        workPhone: '',
        photoFile: null,
        photoPreview: null
    });

    // ==================== BATCH FILTERS ====================
    const [batchFilters, setBatchFilters] = useState({
        class: '',
        level: '',
        academic_year: '',
        department: '',
        position: '',
        gender: ''
    });

    const [filterOptions, setFilterOptions] = useState({
        classes: [],
        levels: [],
        academicYears: [],
        departments: [],
        positions: [],
        genders: ['Male', 'Female', 'Other']
    });

    // ==================== FILES ====================
    const [csvFile, setCsvFile] = useState(null);
    const [photoZipFile, setPhotoZipFile] = useState(null);

    // ==================== FIELD MAPPING ====================
    const [showFieldMapper, setShowFieldMapper] = useState(false);
    const [fieldMappings, setFieldMappings] = useState({});

    // ==================== VALIDATION ====================
    const [validationResult, setValidationResult] = useState(null);
    const [validating, setValidating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('idle');

    // ==================== COORDINATES ====================
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

    // ==================== TEMPLATE DIMENSIONS ====================
    const [templateDimensions, setTemplateDimensions] = useState({
        originalWidth: 1200,
        originalHeight: 678,
        previewWidth: 800,
        previewHeight: 452,
        scaleFactor: 800 / 1200
    });

    // ==================== DRAG & DROP ====================
    const [activeDragField, setActiveDragField] = useState(null);
    const previewContainerRef = useRef(null);
    const abortControllerRef = useRef(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // Expose updateFieldPosition to window for resize handle access
    useEffect(() => {
        window.updateFieldPosition = (fieldName, x, y, extra = {}) => {
            updateFieldPosition(fieldName, x, y, extra);
        };
        return () => {
            delete window.updateFieldPosition;
        };
    }, []);

    // Monitor batch progress
    useEffect(() => {
        if (batchProgress?.status === 'generating' || batchProgress?.status === 'started' || batchProgress?.status === 'processing') {
            setIsBatchRunning(true);
            setGenerationStatus('processing');
        } else if (batchProgress?.status === 'completed' || batchProgress?.status === 'error') {
            setIsBatchRunning(false);
            if (batchProgress?.status === 'completed') {
                setGenerationStatus('completed');
                // Auto-download when complete
                if (downloadUrl) {
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `batch-cards-${Date.now()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success(`${batchProgress.generated || 0} cards generated successfully!`);
                }
            } else {
                setGenerationStatus('error');
            }
        }
    }, [batchProgress, downloadUrl]);

    // ==================== LOAD DATA ====================
    useEffect(() => {
        loadOrganizations();
    }, []);

    useEffect(() => {
        if (selectedOrgId) {
            loadTemplates(selectedOrgId);
            loadOrgStudents();
        }
    }, [selectedOrgId]);

    useEffect(() => {
        if (selectedTemplateId) {
            loadTemplateDimensions();
            const template = templates.find(t => t._id === selectedTemplateId);
            setSelectedTemplate(template);
        }
    }, [selectedTemplateId, templates]);

    useEffect(() => {
        if (selectedOrgId && batchMethod === 'database') {
            fetchFilterOptions();
        }
    }, [selectedOrgId, personFilter, batchMethod]);

    const fetchFilterOptions = async () => {
        try {
            const response = await studentAPI.getFilterOptions(selectedOrgId);
            if (response.success) {
                setFilterOptions({
                    classes: response.filters?.classes || [],
                    levels: response.filters?.levels || [],
                    academicYears: response.filters?.academicYears || [],
                    departments: response.filters?.departments || [],
                    positions: response.filters?.positions || [],
                    genders: ['Male', 'Female', 'Other']
                });
            }
        } catch (error) {
            console.error('Failed to fetch filter options:', error);
        }
    };

    const loadOrganizations = async () => {
        try {
            const response = await cardAPI.getOrganizations();
            if (response.success) {
                setOrganizations(response.organizations || []);
                if (response.organizations?.length > 0 && !selectedOrgId) {
                    setSelectedOrgId(response.organizations[0]._id);
                }
            }
        } catch (error) {
            console.error('Failed to load organizations:', error);
            toast.error('Failed to load organizations');
        }
    };

    const loadOrgStudents = async () => {
        if (!selectedOrgId) return;
        try {
            const response = await cardAPI.getOrgStudents(selectedOrgId, { limit: 500 });
            if (response.success) {
                setStudents(response.students || []);
            }
        } catch (error) {
            console.error('Failed to load students:', error);
        }
    };

    const loadTemplates = async (orgId) => {
        if (!orgId) return;
        try {
            const response = await templateAPI.getTemplates({ organizationId: orgId });
            if (response.success) {
                setTemplates(response.templates || []);
                const defaultTemplate = response.templates.find(t => t.isDefault);
                if (defaultTemplate) {
                    setSelectedTemplateId(defaultTemplate._id);
                } else if (response.templates.length > 0) {
                    setSelectedTemplateId(response.templates[0]._id);
                }
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            toast.error('Failed to load templates');
        }
    };

    const loadTemplateDimensions = async () => {
        if (!selectedTemplateId) return;
        try {
            const response = await cardAPI.getTemplateDimensions(selectedTemplateId);
            if (response.success && response.dimensions) {
                const previewWidth = 800;
                const previewHeight = response.dimensions.preview?.height || 452;
                const scaleFactor = response.dimensions.preview?.scaleFactor || (previewWidth / response.dimensions.original?.width);

                setTemplateDimensions({
                    originalWidth: response.dimensions.original?.width || 1200,
                    originalHeight: response.dimensions.original?.height || 678,
                    previewWidth,
                    previewHeight,
                    scaleFactor: parseFloat(scaleFactor)
                });
            }
        } catch (error) {
            console.error('Failed to load dimensions:', error);
        }
    };

    const getFilteredBatchStudents = useCallback(() => {
        return students.filter(student => {
            if (personFilter !== 'all' && student.personType !== personFilter) return false;

            if (student.personType === 'student') {
                if (batchFilters.class && student.studentDetails?.class !== batchFilters.class) return false;
                if (batchFilters.level && student.studentDetails?.level !== batchFilters.level) return false;
                if (batchFilters.academic_year && student.studentDetails?.academic_year !== batchFilters.academic_year) return false;
            }

            if (student.personType === 'employee') {
                if (batchFilters.department && student.employeeDetails?.department !== batchFilters.department) return false;
                if (batchFilters.position && student.employeeDetails?.position !== batchFilters.position) return false;
            }

            if (batchFilters.gender && student.gender !== batchFilters.gender) return false;

            return true;
        });
    }, [students, personFilter, batchFilters]);

    // ==================== DRAG & DROP HANDLER ====================
    const handleDragStart = useCallback((event) => {
        setActiveDragField(event.active.id);
    }, []);

    // ==================== FIELD MAPPING HANDLERS ====================
    const handleSaveFieldMappings = async (updatedFields, mappings) => {
        try {
            await cardAPI.updateTemplateFields(selectedTemplateId, updatedFields);
            setFieldMappings(mappings);
            setShowFieldMapper(false);
            toast.success('Field mappings saved successfully');

            const refreshedTemplate = await cardAPI.getTemplate(selectedTemplateId);
            if (refreshedTemplate.success) {
                setSelectedTemplate(refreshedTemplate.template);
            }

            setActiveStep('coordinates');
        } catch (error) {
            console.error('Failed to save field mappings:', error);
            toast.error('Failed to save field mappings');
        }
    };

    // ==================== VALIDATION BEFORE GENERATION ====================
    const runValidation = async () => {
        setValidating(true);
        try {
            const response = await cardAPI.previewValidation({
                templateId: selectedTemplateId,
                organizationId: selectedOrgId,
                filters: batchMethod === 'database' ? batchFilters : {},
                personType: personFilter
            });

            if (response.success) {
                setValidationResult(response);
                if (response.validCount === 0) {
                    toast.error('No valid students! Please check template requirements.');
                } else if (response.skippedCount > 0) {
                    toast.warning(`${response.skippedCount} students will be skipped due to missing data`);
                } else {
                    toast.success(`${response.validCount} students are ready for card generation`);
                }
            }
        } catch (error) {
            console.error('Validation failed:', error);
            toast.error('Validation failed');
        } finally {
            setValidating(false);
        }
    };

    // ==================== SINGLE CARD GENERATION ====================
    // ==================== SINGLE CARD GENERATION - SIMPLIFIED ====================
    const generateSingleCard = async (student) => {
        if (!selectedTemplateId || !student) {
            toast.error('Select a template and person');
            return;
        }

        setGenerationStatus('processing');

        try {
            // Skip preview-validation - let backend handle validation
            // The backend will return 400 with missingFields if validation fails

            const blob = await cardAPI.generateSingle({
                studentId: student._id,
                templateId: selectedTemplateId
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `id-card-${student.student_id || student.employeeDetails?.employeeId || 'person'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setGenerationStatus('completed');
            toast.success('Card generated successfully!');

        } catch (error) {
            console.error('Single card generation error:', error);

            // Check if the error contains missing fields information
            if (error.response?.data?.missingFields) {
                setMissingFields(error.response.data.missingFields);
                setShowMissingFieldsModal(true);
            } else {
                toast.error(`Generation failed: ${error.response?.data?.error || error.message}`);
            }

            setGenerationStatus('error');
        }
    };

    // ==================== BATCH GENERATION ====================
    const startBatchGeneration = async () => {
        if (!selectedTemplateId || !selectedOrgId) {
            toast.error('Select organization and template');
            return;
        }

        if (batchMethod === 'upload' && !csvFile) {
            toast.error('Please select a CSV file');
            return;
        }

        abortControllerRef.current = new AbortController();

        setShowProgressModal(true);
        resetBatchProgress();
        setGenerationStatus('processing');
        setDownloadUrl(null);
        setIsBatchRunning(true);

        try {
            let blob;

            // Generate a single batch ID that will be used by both frontend and backend
            const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setCurrentBatchId(batchId);

            // Subscribe to progress BEFORE making the API call
            subscribeToBatch(batchId);

            if (batchMethod === 'database') {
                const filteredStudents = getFilteredBatchStudents();

                if (filteredStudents.length === 0) {
                    toast.error('No people match your filters');
                    setShowProgressModal(false);
                    setGenerationStatus('idle');
                    setIsBatchRunning(false);
                    return;
                }

                blob = await cardAPI.generateBatchFromDB({
                    templateId: selectedTemplateId,
                    filters: batchFilters,
                    organizationId: selectedOrgId,
                    personType: personFilter,
                    batchId: batchId  // Send the batchId to backend
                }, {
                    signal: abortControllerRef.current.signal
                });
            } else {
                const formData = new FormData();
                formData.append('csv', csvFile);
                formData.append('templateId', selectedTemplateId);
                formData.append('organizationId', selectedOrgId);
                formData.append('coordinates', JSON.stringify(coordinates));
                formData.append('batchId', batchId);  // Send the batchId to backend
                if (photoZipFile) formData.append('photoZip', photoZipFile);
                if (personFilter !== 'all') formData.append('personType', personFilter);

                blob = await cardAPI.processCSVAndGenerate(formData, {
                    signal: abortControllerRef.current.signal
                });
            }

            const url = window.URL.createObjectURL(blob);
            setDownloadUrl(url);

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                toast.error('Batch generation was cancelled');
            } else {
                console.error('Batch generation error:', error);
                const errorMessage = error.response?.data?.error || error.message || 'Generation failed';
                toast.error(`Generation failed: ${errorMessage}`);
            }
            setShowProgressModal(false);
            setGenerationStatus('error');
            setIsBatchRunning(false);
        }
    };

    const cancelBatchGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsBatchRunning(false);
        setGenerationStatus('idle');
        resetBatchProgress();
    };

    const handleCloseProgressModal = () => {
        if (isBatchRunning && batchProgress?.status === 'generating') {
            const confirmClose = window.confirm(
                '⚠️ Warning: Cards are still being generated!\n\n' +
                'If you close this window, the generation will be cancelled and you will lose all progress.\n\n' +
                'Are you sure you want to cancel?'
            );
            if (confirmClose) {
                cancelBatchGeneration();
                setShowProgressModal(false);
                setDownloadUrl(null);
                toast.info('Batch generation cancelled');
            }
        } else {
            setShowProgressModal(false);
            resetBatchProgress();
            setDownloadUrl(null);
            setIsBatchRunning(false);
            setGenerationStatus('idle');
        }
    };

    const handleDownload = () => {
        if (downloadUrl) {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `batch-cards-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('Download started!');
        }
    };

    // ==================== PHOTO HANDLERS ====================
    const handlePhotoUploadOnly = async () => {
        if (!uploadedPhoto || !selectedStudent) return;

        setPhotoUploadStatus('uploading');
        try {
            const formData = new FormData();
            formData.append('studentId', selectedStudent._id);
            formData.append('photo', uploadedPhoto);

            const response = await cardAPI.uploadStudentPhoto(formData);
            if (response.success) {
                const updatedStudents = students.map(s =>
                    s._id === selectedStudent._id ? { ...s, has_photo: true, photo_url: response.photo_url } : s
                );
                setStudents(updatedStudents);
                setSelectedStudent(prev => ({ ...prev, has_photo: true, photo_url: response.photo_url }));
                setShowPhotoModal(false);
                setUploadedPhoto(null);
                setActiveStep('process');
                toast.success('Photo uploaded successfully!');
            }
        } catch (error) {
            toast.error('Photo upload failed');
        } finally {
            setPhotoUploadStatus('idle');
        }
    };

    // ==================== QUICK CREATE STUDENT ====================
    const handleQuickCreateStudent = async () => {
        if (!quickStudent.name) {
            toast.error('Name is required');
            return;
        }

        if (quickStudent.personType === 'student' && !quickStudent.student_id) {
            toast.error('Student ID is required');
            return;
        }

        if (!selectedOrgId) {
            toast.error('Select an organization first');
            return;
        }

        try {
            const formData = new FormData();

            formData.append('name', quickStudent.name);
            formData.append('personType', quickStudent.personType);
            formData.append('gender', quickStudent.gender);
            formData.append('residence', quickStudent.residence);
            formData.append('organizationId', selectedOrgId);

            if (quickStudent.personType === 'student') {
                formData.append('student_id', quickStudent.student_id);
                formData.append('class', quickStudent.class);
                formData.append('level', quickStudent.level);
                formData.append('academic_year', quickStudent.academic_year);
                if (quickStudent.parent_phone) formData.append('parent_phone', quickStudent.parent_phone);
            }

            if (quickStudent.personType === 'employee') {
                if (quickStudent.employeeId) formData.append('employeeId', quickStudent.employeeId);
                if (quickStudent.department) formData.append('department', quickStudent.department);
                if (quickStudent.position) formData.append('position', quickStudent.position);
                if (quickStudent.workPhone) formData.append('workPhone', quickStudent.workPhone);
            }

            if (quickStudent.photoFile) {
                formData.append('photo', quickStudent.photoFile);
            }

            const response = await studentAPI.create(formData);

            if (response && response._id) {
                toast.success(`${quickStudent.personType === 'student' ? 'Student' : 'Employee'} created successfully!`);

                if (quickStudent.photoPreview) {
                    URL.revokeObjectURL(quickStudent.photoPreview);
                }

                setShowQuickCreateModal(false);
                setQuickStudent({
                    student_id: '', name: '', personType: 'student',
                    class: '', level: '', gender: '', residence: '',
                    academic_year: '', parent_phone: '',
                    department: '', position: '', employeeId: '', workPhone: '',
                    photoFile: null, photoPreview: null
                });

                await loadOrgStudents();
                setSelectedStudent(response);
                setActiveStep('process');
            }

        } catch (error) {
            console.error('Quick create error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create';
            toast.error(errorMessage);
        }
    };

    const filteredStudentsList = useMemo(() => {
        return students.filter(student => {
            const term = searchTerm.toLowerCase().trim();
            let matches = true;
            if (term) {
                matches = (student.name?.toLowerCase() || '').includes(term) ||
                    (student.student_id?.toLowerCase() || '').includes(term) ||
                    (student.employeeDetails?.employeeId?.toLowerCase() || '').includes(term);
            }
            if (personFilter !== 'all') {
                matches = matches && student.personType === personFilter;
            }
            return matches;
        });
    }, [students, searchTerm, personFilter]);

    const studentCount = students.filter(s => s.personType === 'student').length;
    const employeeCount = students.filter(s => s.personType === 'employee').length;
    const selectedOrg = organizations.find(o => o._id === selectedOrgId);

    const sampleStudent = useMemo(() => {
        if (students.length > 0) {
            return students[0];
        }
        return null;
    }, [students]);

    const updateFieldPosition = useCallback((fieldName, x, y, extra = {}) => {
        if (!selectedTemplate) return;

        // CRITICAL: These x,y from the preview are already in ORIGINAL dimensions
        // because we convert them in handleDragEnd. So we don't need to scale here.

        let width = extra.width;
        let height = extra.height;

        // If width/height are from preview (scaled), convert to original
        if (width !== undefined && extra.isFromPreview) {
            width = Math.round(width / templateDimensions.scaleFactor);
        }
        if (height !== undefined && extra.isFromPreview) {
            height = Math.round(height / templateDimensions.scaleFactor);
        }

        const updatedFields = selectedTemplate.fields.map(field => {
            if (field.name === fieldName) {
                return {
                    ...field,
                    position: {
                        ...field.position,
                        x: Math.max(0, x),
                        y: Math.max(0, y),
                        ...(width !== undefined && { width: Math.max(50, width) }),
                        ...(height !== undefined && { height: Math.max(50, height) }),
                        ...extra
                    }
                };
            }
            return field;
        });

        setSelectedTemplate(prev => ({
            ...prev,
            fields: updatedFields
        }));
    }, [selectedTemplate, templateDimensions.scaleFactor]);
    const saveFieldPositions = async () => {
        if (!selectedTemplate || !selectedTemplate.fields) return;

        try {
            await cardAPI.updateTemplateFields(selectedTemplateId, selectedTemplate.fields);
            toast.success('Field positions saved');
        } catch (error) {
            console.error('Failed to save positions:', error);
            toast.error('Failed to save positions');
        }
    };
    const handleDragEnd = useCallback((event) => {
        const { active, delta } = event;
        if (!active || !previewContainerRef.current || !selectedTemplate) return;

        setActiveDragField(null);

        const fieldName = active.id;
        const field = selectedTemplate.fields.find(f => f.name === fieldName);
        if (!field || !field.position) return;

        // Get the actual preview container dimensions
        const containerRect = previewContainerRef.current.getBoundingClientRect();
        const previewWidth = containerRect.width;

        // Get the original template dimensions
        const originalWidth = templateDimensions.originalWidth;

        // Calculate the ACTUAL scale factor based on current preview size
        const actualScaleFactor = previewWidth / originalWidth;

        // Delta from dnd-kit is in screen pixels (preview coordinates)
        // Convert to original dimensions
        const deltaX_original = Math.round(delta.x / actualScaleFactor);
        const deltaY_original = Math.round(delta.y / actualScaleFactor);

        const newX = Math.max(0, (field.position.x || 0) + deltaX_original);
        const newY = Math.max(0, (field.position.y || 0) + deltaY_original);

        console.log(`🔍 Drag Debug:`, {
            field: fieldName,
            originalPosition: { x: field.position.x, y: field.position.y },
            deltaPreview: { x: delta.x, y: delta.y },
            actualScaleFactor,
            deltaOriginal: { x: deltaX_original, y: deltaY_original },
            newPosition: { x: newX, y: newY },
            previewWidth,
            originalWidth
        });

        updateFieldPosition(fieldName, newX, newY);
    }, [selectedTemplate, templateDimensions.originalWidth, updateFieldPosition]);
    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
                        Card Generation Studio
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Dynamic field mapping + Real-time batch progress + Drag & drop positioning
                    </p>
                </div>

                {/* Organization Selector */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-5 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Select Organization <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedOrgId || ''}
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                            >
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
                        <button
                            onClick={() => { setGenerationMode('batch'); setActiveStep('upload'); }}
                            className={`p-5 rounded-2xl border-2 text-left transition-all ${generationMode === 'batch' ? 'border-red-500 bg-red-50 shadow-lg' : 'border-slate-200 hover:border-red-300'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${generationMode === 'batch' ? 'bg-red-600' : 'bg-slate-200'}`}>
                                    <i className={`pi pi-users text-lg ${generationMode === 'batch' ? 'text-white' : 'text-slate-600'}`}></i>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Batch Processing</h3>
                                    <p className="text-sm text-slate-500">Multiple cards at once with real-time progress</p>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => { setGenerationMode('single'); setActiveStep('upload'); }}
                            className={`p-5 rounded-2xl border-2 text-left transition-all ${generationMode === 'single' ? 'border-red-500 bg-red-50 shadow-lg' : 'border-slate-200 hover:border-red-300'}`}
                        >
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
                    <div className="grid grid-cols-5 gap-2">
                        <StepButton step="1" title="Setup" icon="pi-cog" active={activeStep === 'upload'} onClick={() => setActiveStep('upload')} />
                        <StepButton step="2" title="Template" icon="pi-image" active={activeStep === 'template'} onClick={() => setActiveStep('template')} />
                        <StepButton step="3" title="Map Fields" icon="pi-link" active={activeStep === 'fieldMapping'} onClick={() => setActiveStep('fieldMapping')} />
                        <StepButton step="4" title="Position" icon="pi-arrows-alt" active={activeStep === 'coordinates'} onClick={() => setActiveStep('coordinates')} />
                        <StepButton step="5" title="Generate" icon="pi-play" active={activeStep === 'process'} onClick={() => setActiveStep('process')} />
                    </div>
                </div>
            </div>

            {/* Missing Fields Modal */}
            {/* Missing Fields Modal - Make sure it shows when missingFields.length > 0 */}
            {showMissingFieldsModal && missingFields.length > 0 && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i className="pi pi-exclamation-triangle text-amber-600 text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Cannot Generate Card</h3>
                            <p className="text-slate-500 mt-1">Missing required information</p>
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4 mb-4">
                            <p className="text-sm font-medium text-amber-800 mb-2">Required fields missing:</p>
                            <ul className="space-y-1">
                                {missingFields.map((field, idx) => (
                                    <li key={idx} className="text-sm text-amber-700 flex items-center gap-2">
                                        <i className="pi pi-times-circle text-amber-500 text-xs"></i>
                                        {field.fieldLabel || field}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowMissingFieldsModal(false);
                                    setMissingFields([]);
                                }}
                                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowMissingFieldsModal(false);
                                    // Optionally navigate to edit student page
                                    if (selectedStudent) {
                                        // Navigate to student edit page
                                        // navigate(`/students/${selectedStudent._id}/edit`);
                                    }
                                }}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-2.5 rounded-xl font-medium hover:from-red-700 hover:to-red-600"
                            >
                                Edit Student
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* In BatchProgressModal component, add a waiting state */}
            {batchProgress?.status === 'waiting' && (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="pi pi-spin pi-spinner text-amber-600 text-2xl"></i>
                    </div>
                    <p className="text-amber-800 font-medium">{batchProgress.message || 'Processing upload...'}</p>
                    <p className="text-sm text-amber-600 mt-1">This may take a moment</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Controls */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">

                        {/* ==================== STEP 1: UPLOAD/SELECT ==================== */}
                        {activeStep === 'upload' && generationMode === 'batch' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-slate-800">Batch Data Source</h3>

                                <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
                                    <button
                                        onClick={() => setBatchMethod('upload')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${batchMethod === 'upload' ? 'bg-white shadow text-red-600' : 'text-slate-600'}`}
                                    >
                                        <i className="pi pi-upload mr-1"></i> Upload CSV/ZIP
                                    </button>
                                    <button
                                        onClick={() => setBatchMethod('database')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${batchMethod === 'database' ? 'bg-white shadow text-red-600' : 'text-slate-600'}`}
                                    >
                                        <i className="pi pi-database mr-1"></i> From Database ({students.length})
                                    </button>
                                </div>

                                {batchMethod === 'upload' && (
                                    <div className="space-y-4">
                                        <FileUploadCard title="Student Data (CSV)" accept=".csv" icon="pi-file-excel" color="red" onFileSelect={setCsvFile} />
                                        <FileUploadCard title="Student Photos (ZIP)" accept=".zip" icon="pi-images" color="slate" note="Name photos as student_id.jpg" onFileSelect={setPhotoZipFile} />
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
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setPersonFilter('all')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${personFilter === 'all' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                                    >
                                                        All ({students.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setPersonFilter('student')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${personFilter === 'student' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                                    >
                                                        🎓 Students ({students.filter(s => s.personType === 'student').length})
                                                    </button>
                                                    <button
                                                        onClick={() => setPersonFilter('employee')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${personFilter === 'employee' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                                    >
                                                        💼 Employees ({students.filter(s => s.personType === 'employee').length})
                                                    </button>
                                                </div>

                                                {personFilter !== 'employee' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={batchFilters.class}
                                                            onChange={(e) => setBatchFilters(prev => ({ ...prev, class: e.target.value }))}
                                                            className="px-3 py-2 border rounded-xl text-sm"
                                                        >
                                                            <option value="">All Classes</option>
                                                            {filterOptions.classes.map(c => (
                                                                <option key={c} value={c}>{c}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={batchFilters.level}
                                                            onChange={(e) => setBatchFilters(prev => ({ ...prev, level: e.target.value }))}
                                                            className="px-3 py-2 border rounded-xl text-sm"
                                                        >
                                                            <option value="">All Levels</option>
                                                            {filterOptions.levels.map(l => (
                                                                <option key={l} value={l}>{l}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={batchFilters.academic_year}
                                                            onChange={(e) => setBatchFilters(prev => ({ ...prev, academic_year: e.target.value }))}
                                                            className="px-3 py-2 border rounded-xl text-sm col-span-2"
                                                        >
                                                            <option value="">All Academic Years</option>
                                                            {filterOptions.academicYears.map(y => (
                                                                <option key={y} value={y}>{y}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {personFilter !== 'student' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={batchFilters.department}
                                                            onChange={(e) => setBatchFilters(prev => ({ ...prev, department: e.target.value }))}
                                                            className="px-3 py-2 border rounded-xl text-sm"
                                                        >
                                                            <option value="">All Departments</option>
                                                            {filterOptions.departments.map(d => (
                                                                <option key={d} value={d}>{d}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={batchFilters.position}
                                                            onChange={(e) => setBatchFilters(prev => ({ ...prev, position: e.target.value }))}
                                                            className="px-3 py-2 border rounded-xl text-sm"
                                                        >
                                                            <option value="">All Positions</option>
                                                            {filterOptions.positions.map(p => (
                                                                <option key={p} value={p}>{p}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <select
                                                    value={batchFilters.gender}
                                                    onChange={(e) => setBatchFilters(prev => ({ ...prev, gender: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-xl text-sm"
                                                >
                                                    <option value="">All Genders</option>
                                                    {filterOptions.genders.map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>

                                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                                    <p className="font-medium text-red-800">
                                                        {getFilteredBatchStudents().length} people match your filters
                                                    </p>
                                                    <p className="text-sm text-red-600 mt-1">
                                                        From {selectedOrg?.name}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        if (!selectedOrgId) { toast.error('Select an organization'); return; }
                                        if (batchMethod === 'upload' && !csvFile) { toast.error('Select a CSV file'); return; }
                                        if (!selectedTemplateId) { toast.error('Select template first'); setActiveStep('template'); return; }
                                        setActiveStep('template');
                                    }}
                                    className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all"
                                >
                                    Continue to Template <i className="pi pi-arrow-right ml-2"></i>
                                </button>
                            </div>
                        )}

                        {activeStep === 'upload' && generationMode === 'single' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-slate-800">Select or Create Person</h3>

                                {!selectedOrgId ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                                        <i className="pi pi-building text-amber-500 text-3xl mb-3 block"></i>
                                        <p className="text-amber-800 font-medium">Please select an organization first</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            {['all', 'student', 'employee'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setPersonFilter(type)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${personFilter === type ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                                >
                                                    {type === 'all' ? 'All' : type === 'student' ? '🎓 Students' : '💼 Employees'}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <button
                                                onClick={() => setShowStudentSelect(!showStudentSelect)}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-left flex justify-between items-center hover:border-red-300 transition-colors"
                                            >
                                                <span className={selectedStudent ? 'text-slate-800' : 'text-slate-400'}>
                                                    {selectedStudent ? `${selectedStudent.name} (${selectedStudent.student_id || selectedStudent.employeeDetails?.employeeId})` : 'Select existing person...'}
                                                </span>
                                                <i className={`pi pi-chevron-${showStudentSelect ? 'up' : 'down'} text-slate-500`}></i>
                                            </button>

                                            {showStudentSelect && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10">
                                                    <div className="p-3 border-b">
                                                        <input
                                                            type="text"
                                                            placeholder="Search..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {filteredStudentsList.slice(0, 15).map(s => (
                                                            <button
                                                                key={s._id}
                                                                onClick={() => {
                                                                    setSelectedStudent(s);
                                                                    setShowStudentSelect(false);
                                                                    if (!s.has_photo) setShowPhotoModal(true);
                                                                }}
                                                                className="w-full text-left p-3 hover:bg-slate-50 border-b flex justify-between items-center"
                                                            >
                                                                <div>
                                                                    <div className="font-medium text-slate-800 text-sm">{s.name}</div>
                                                                    <div className="text-xs text-slate-500">
                                                                        {s.student_id || s.employeeDetails?.employeeId} • {s.personType === 'student' ? '🎓' : '💼'} {s.studentDetails?.class || s.employeeDetails?.department || ''}
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

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">OR</span></div>
                                        </div>

                                        <button
                                            onClick={() => setShowQuickCreateModal(true)}
                                            className="w-full border-2 border-dashed border-red-300 py-4 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors"
                                        >
                                            <i className="pi pi-plus mr-2"></i> Quick Create & Generate
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (!selectedTemplateId) { toast.error('Select template first'); setActiveStep('template'); }
                                                else if (selectedStudent) setActiveStep('process');
                                                else toast.error('Select a person first');
                                            }}
                                            disabled={!selectedStudent}
                                            className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:from-red-700 hover:to-red-600 transition-all"
                                        >
                                            Continue to Generate
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ==================== STEP 2: TEMPLATE ==================== */}
                        {activeStep === 'template' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800">Select Template</h3>

                                {templates.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <i className="pi pi-image text-4xl mb-3 block"></i>
                                        No templates found for this organization
                                    </div>
                                ) : (
                                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                                        {templates.map(template => (
                                            <div
                                                key={template._id}
                                                onClick={() => setSelectedTemplateId(template._id)}
                                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedTemplateId === template._id ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800">{template.name}</h4>
                                                        <p className="text-xs text-slate-500 capitalize">
                                                            {template.templateType === 'two-sided' ? '🔄 Double-sided' : '📄 Single-sided'}
                                                            {template.fields?.length > 0 && ` • ${template.fields.length} fields`}
                                                        </p>
                                                    </div>
                                                    {template.isDefault && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">⭐ Default</span>}
                                                </div>
                                                {template.frontSide?.secure_url && (
                                                    <div className="mt-2 w-full h-20 bg-slate-100 rounded-lg overflow-hidden">
                                                        <img src={template.frontSide.secure_url} className="w-full h-full object-cover" alt={template.name} />
                                                    </div>
                                                )}
                                                {selectedTemplateId === template._id && <p className="text-xs text-red-600 mt-2 text-center font-medium">✓ Selected</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        if (!selectedTemplateId) { toast.error('Select a template'); return; }
                                        const template = templates.find(t => t._id === selectedTemplateId);
                                        if (!template?.fields || template.fields.length === 0) {
                                            toast.warning('This template has no fields defined. Please map fields first.');
                                            setActiveStep('fieldMapping');
                                        } else {
                                            setActiveStep('fieldMapping');
                                        }
                                    }}
                                    disabled={!selectedTemplateId}
                                    className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium disabled:opacity-50"
                                >
                                    Continue to Field Mapping <i className="pi pi-arrow-right ml-2"></i>
                                </button>
                            </div>
                        )}

                        {/* ==================== STEP 3: FIELD MAPPING ==================== */}
                        {activeStep === 'fieldMapping' && selectedTemplate && (
                            <DynamicFieldMapper
                                template={selectedTemplate}
                                students={students}
                                initialMappings={fieldMappings}
                                onSave={handleSaveFieldMappings}
                                onBack={() => setActiveStep('template')}
                            />
                        )}

                        {/* ==================== STEP 4: COORDINATES ==================== */}
                        {activeStep === 'coordinates' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Position Fields</h3>
                                        <p className="text-sm text-slate-500">
                                            Drag & drop fields to position them on the card | {selectedTemplate?.fields?.length || 0} fields configured
                                        </p>
                                        {generationMode === 'single' && selectedStudent && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                Previewing data for: {selectedStudent.name} ({selectedStudent.student_id || selectedStudent.employeeDetails?.employeeId})
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">🖱️ Drag & Drop Active</span>
                                    </div>
                                </div>

                                {(!selectedTemplate?.fields || selectedTemplate.fields.length === 0) ? (
                                    <div className="text-center py-16 bg-amber-50 rounded-xl border-2 border-dashed border-amber-300">
                                        <i className="pi pi-exclamation-triangle text-4xl text-amber-500 mb-3 block"></i>
                                        <p className="text-amber-800 font-medium">No fields defined for this template</p>
                                        <p className="text-sm text-amber-600 mt-1">Please go back to Field Mapping and add fields first</p>
                                        <button onClick={() => setActiveStep('fieldMapping')} className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                                            Go to Field Mapping
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {selectedTemplate?.frontSide?.secure_url ? (
                                            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                                <div ref={previewContainerRef} className="relative border-2 border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-900" style={{ width: `${templateDimensions.previewWidth}px`, margin: '0 auto' }}>

                                                    <img
                                                        src={selectedTemplate.frontSide.secure_url}
                                                        alt="Template"
                                                        style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
                                                        draggable={false}
                                                        onLoad={(e) => {
                                                            const img = e.target;
                                                            const actualWidth = img.clientWidth;
                                                            const actualHeight = img.clientHeight;
                                                            const originalWidth = selectedTemplate.originalWidth || templateDimensions.originalWidth;
                                                            const actualScaleFactor = actualWidth / originalWidth;
                                                            setTemplateDimensions(prev => ({ ...prev, actualPreviewWidth: actualWidth, actualPreviewHeight: actualHeight, actualScaleFactor }));
                                                        }}
                                                    />

                                                    <div className="absolute inset-0 pointer-events-none opacity-10">
                                                        <div className="grid grid-cols-12 h-full w-full">
                                                            {Array.from({ length: 12 }).map((_, i) => (<div key={i} className="border-r border-white h-full"></div>))}
                                                            {Array.from({ length: 8 }).map((_, i) => (<div key={i} className="border-b border-white w-full"></div>))}
                                                        </div>
                                                    </div>

                                                    {selectedTemplate.fields.map((field) => {
                                                        if (!field.position) return null;

                                                        const scale = templateDimensions.scaleFactor;
                                                        const previewX = (field.position.x || 0) * scale;
                                                        const previewY = (field.position.y || 0) * scale;

                                                        const getFieldPreviewValue = () => {
                                                            if (field.type === 'photo') return '📷 Photo';

                                                            if (generationMode === 'single' && selectedStudent) {
                                                                if (field.dataSource?.fieldPath) {
                                                                    const parts = field.dataSource.fieldPath.split('.');
                                                                    let value = selectedStudent;
                                                                    for (const part of parts) {
                                                                        value = value?.[part];
                                                                    }
                                                                    if (value) return String(value).substring(0, 30);
                                                                }
                                                                const autoMap = {
                                                                    'name': selectedStudent.name,
                                                                    'student_id': selectedStudent.student_id,
                                                                    'class': selectedStudent.studentDetails?.class,
                                                                    'level': selectedStudent.studentDetails?.level,
                                                                    'gender': selectedStudent.gender,
                                                                    'residence': selectedStudent.residence,
                                                                    'academic_year': selectedStudent.studentDetails?.academic_year,
                                                                    'department': selectedStudent.employeeDetails?.department,
                                                                    'position': selectedStudent.employeeDetails?.position
                                                                };
                                                                if (autoMap[field.name]) return String(autoMap[field.name]).substring(0, 30);
                                                                return field.label || field.name;
                                                            }

                                                            if (sampleStudent) {
                                                                if (field.dataSource?.fieldPath) {
                                                                    const parts = field.dataSource.fieldPath.split('.');
                                                                    let value = sampleStudent;
                                                                    for (const part of parts) {
                                                                        value = value?.[part];
                                                                    }
                                                                    if (value) return String(value).substring(0, 30);
                                                                }
                                                                const autoMapBatch = {
                                                                    'name': sampleStudent.name,
                                                                    'student_id': sampleStudent.student_id,
                                                                    'class': sampleStudent.studentDetails?.class,
                                                                    'level': sampleStudent.studentDetails?.level,
                                                                    'gender': sampleStudent.gender,
                                                                    'residence': sampleStudent.residence,
                                                                    'academic_year': sampleStudent.studentDetails?.academic_year
                                                                };
                                                                if (autoMapBatch[field.name]) return String(autoMapBatch[field.name]).substring(0, 30);
                                                            }

                                                            return field.label || field.name;
                                                        };

                                                        const displayText = getFieldPreviewValue();

                                                        const photoWidth = field.type === 'photo' && field.position?.width
                                                            ? field.position.width * scale
                                                            : undefined;
                                                        const photoHeight = field.type === 'photo' && field.position?.height
                                                            ? field.position.height * scale
                                                            : undefined;

                                                        return (
                                                            <DraggableItem
                                                                key={field.uniqueId || field.name}
                                                                id={field.name}
                                                                displayX={previewX}
                                                                displayY={previewY}
                                                                label={displayText}
                                                                isPhotoField={field.type === 'photo'}
                                                                isActive={activeDragField === field.name}
                                                                field={field}
                                                                sampleStudent={sampleStudent}
                                                                selectedStudent={selectedStudent}
                                                                generationMode={generationMode}
                                                                previewScale={scale}
                                                                previewPhotoWidth={photoWidth}
                                                                previewPhotoHeight={photoHeight}
                                                                onPositionChange={(newX, newY) => {
                                                                    updateFieldPosition(field.name, newX, newY);
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </DndContext>
                                        ) : (
                                            <div className="text-center py-16 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300">
                                                <i className="pi pi-image text-4xl text-slate-400 mb-3 block"></i>
                                                <p className="text-slate-500">Loading template preview...</p>
                                            </div>
                                        )}

                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex justify-between flex-wrap gap-2">
                                            <span>📐 Original: {templateDimensions.originalWidth}×{templateDimensions.originalHeight}</span>
                                            <span>🖥️ Preview: {templateDimensions.previewWidth}×{templateDimensions.previewHeight}</span>
                                            <span>📏 Scale: {(templateDimensions.scaleFactor * 100).toFixed(1)}%</span>
                                            <span>📋 Fields: {selectedTemplate.fields.length}</span>
                                            {generationMode === 'single' && selectedStudent && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🎯 Live Preview</span>
                                            )}
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                            <p className="text-xs font-medium text-slate-600 mb-3">🎯 Fine-Tune Coordinates (Original Dimensions)</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                                {selectedTemplate.fields.map((field) => (
                                                    <div key={field.uniqueId || field.name} className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
                                                        <span className="text-xs text-slate-500 capitalize w-24 truncate font-medium">{field.label || field.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-400">X</span>
                                                            <input type="number" value={field.position?.x || 0} onChange={(e) => updateFieldPosition(field.name, parseInt(e.target.value) || 0, field.position?.y || 0)} className="w-16 px-1.5 py-1 border border-slate-200 rounded-md text-xs text-center focus:ring-1 focus:ring-red-500" />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-400">Y</span>
                                                            <input type="number" value={field.position?.y || 0} onChange={(e) => updateFieldPosition(field.name, field.position?.x || 0, parseInt(e.target.value) || 0)} className="w-16 px-1.5 py-1 border border-slate-200 rounded-md text-xs text-center focus:ring-1 focus:ring-red-500" />
                                                        </div>
                                                        {field.type === 'photo' && (
                                                            <>
                                                                <div className="flex items-center gap-1 ml-1">
                                                                    <span className="text-[10px] text-slate-400">W</span>
                                                                    <input
                                                                        type="number"
                                                                        value={field.position?.width || 250}
                                                                        onChange={(e) => updateFieldPosition(field.name, field.position?.x || 0, field.position?.y || 0, { width: parseInt(e.target.value) || 250 })}
                                                                        className="w-14 px-1.5 py-1 border border-slate-200 rounded-md text-xs text-center"
                                                                        min="50"
                                                                        max="500"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-slate-400">H</span>
                                                                    <input
                                                                        type="number"
                                                                        value={field.position?.height || 250}
                                                                        onChange={(e) => updateFieldPosition(field.name, field.position?.x || 0, field.position?.y || 0, { height: parseInt(e.target.value) || 250 })}
                                                                        className="w-14 px-1.5 py-1 border border-slate-200 rounded-md text-xs text-center"
                                                                        min="50"
                                                                        max="500"
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2 text-center">⚡ Drag on preview above, or edit coordinates directly</p>
                                        </div>

                                        <button onClick={() => { saveFieldPositions(); setActiveStep('process'); }} className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all shadow-lg">
                                            Continue to Generate <i className="pi pi-arrow-right ml-2"></i>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ==================== STEP 5: GENERATE ==================== */}
                        {activeStep === 'process' && (
                            <div className="space-y-6 text-center">
                                <h3 className="text-lg font-semibold text-slate-800">Ready to Generate</h3>

                                {validationResult && generationMode === 'batch' && (
                                    <div className={`rounded-xl p-4 text-left ${validationResult.validCount > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="font-semibold">✅ Valid: {validationResult.validCount}</span>
                                                <span className="ml-4 text-amber-600">⚠️ Skipped: {validationResult.skippedCount}</span>
                                            </div>
                                            {validationResult.skippedCount > 0 && (
                                                <details className="text-sm">
                                                    <summary className="text-amber-600 cursor-pointer">View skipped</summary>
                                                    <div className="mt-2 max-h-32 overflow-y-auto">
                                                        {validationResult.validationResults?.filter(r => !r.isValid).map((r, idx) => (
                                                            <div key={idx} className="text-xs text-amber-700 py-1 border-t border-amber-100">
                                                                {r.student?.name || r.name}: {r.missingFields?.map(f => f.fieldLabel).join(', ')}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {generationMode === 'single' && selectedStudent && (
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{selectedStudent.personType === 'student' ? '🎓' : '💼'}</span>
                                            <div>
                                                <p className="font-medium text-slate-800">{selectedStudent.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {selectedStudent.student_id || selectedStudent.employeeDetails?.employeeId} • {selectedStudent.personType}
                                                    {selectedStudent.personType === 'student' ? ` • ${selectedStudent.studentDetails?.class || ''}` : ` • ${selectedStudent.employeeDetails?.department || ''}`}
                                                </p>
                                            </div>
                                        </div>
                                        {!selectedStudent.has_photo && <p className="text-xs text-amber-600 mt-1">⚠️ No photo - placeholder will be used</p>}
                                    </div>
                                )}

                                {generationMode === 'batch' && (
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
                                        <p className="font-medium text-slate-800">
                                            {batchMethod === 'upload' && csvFile
                                                ? `CSV: ${csvFile.name}`
                                                : `${getFilteredBatchStudents().length} people from ${selectedOrg?.name}`
                                            }
                                        </p>
                                        {personFilter !== 'all' && <p className="text-sm text-slate-500 mt-1">Filtered: {personFilter}s only</p>}
                                    </div>
                                )}

                                {selectedTemplate && (
                                    <div className="text-left text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                                        <span className="font-medium text-slate-800">{selectedTemplate.name}</span>
                                        <span className="ml-2 text-xs bg-slate-200 px-2 py-0.5 rounded-full capitalize">{selectedTemplate.templateType}</span>
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        if (generationMode === 'single') {
                                            generateSingleCard(selectedStudent);
                                        } else {
                                            startBatchGeneration();
                                        }
                                    }}
                                    disabled={generationStatus === 'processing' || (generationMode === 'batch' && validationResult?.validCount === 0)}
                                    className="bg-gradient-to-r from-red-600 to-red-500 text-white px-10 py-4 rounded-2xl font-bold text-lg disabled:opacity-50 hover:from-red-700 hover:to-red-600 transition-all shadow-xl"
                                >
                                    {generationStatus === 'processing' ? (
                                        <><i className="pi pi-spinner pi-spin mr-2"></i>Generating Cards...</>
                                    ) : (
                                        <><i className="pi pi-bolt mr-2"></i>Generate Cards</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 sticky top-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Template Preview</h3>
                        <div className="bg-slate-900 rounded-xl p-3 flex justify-center">
                            {selectedTemplate?.frontSide?.secure_url ? (
                                <img
                                    src={selectedTemplate.frontSide.secure_url}
                                    alt="Template"
                                    className="rounded-lg max-w-full"
                                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                                />
                            ) : (
                                <div className="text-center text-slate-400 py-16">
                                    <i className="pi pi-image text-4xl mb-3 block"></i>
                                    <p className="text-sm">Select a template</p>
                                </div>
                            )}
                        </div>
                        {selectedOrg && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500">Organization</p>
                                    <p className="font-semibold text-slate-800">{selectedOrg.name}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">🎓 {studentCount} Students</span>
                                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">💼 {employeeCount} Employees</span>
                                </div>
                            </div>
                        )}
                        {selectedTemplate && (
                            <div className="mt-2 p-4 bg-red-50 rounded-xl space-y-2">
                                <div>
                                    <p className="text-xs text-red-500">Selected Template</p>
                                    <p className="font-semibold text-red-800">{selectedTemplate.name}</p>
                                </div>
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full capitalize font-medium">
                                    {selectedTemplate.templateType === 'two-sided' ? '🔄 Double-sided' : '📄 Single-sided'}
                                </span>
                                {selectedTemplate.fields && (
                                    <p className="text-xs text-red-600">📋 {selectedTemplate.fields.length} fields configured</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Batch Progress Modal */}
            <BatchProgressModal
                isOpen={showProgressModal}
                onClose={handleCloseProgressModal}
                progress={batchProgress}
                onDownload={handleDownload}
                batchId={currentBatchId}
                socketReady={socketReady}
                isRunning={isBatchRunning}
            />

            {/* Quick Create Modal */}
            {showQuickCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-4 border-b">
                            <h3 className="text-xl font-bold text-slate-800">Quick Create Person</h3>
                            <button onClick={() => setShowQuickCreateModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                                <i className="pi pi-times text-slate-600"></i>
                            </button>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setQuickStudent(p => ({ ...p, personType: 'student' }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${quickStudent.personType === 'student' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                <i className="pi pi-graduation-cap mr-1"></i> Student
                            </button>
                            <button
                                onClick={() => setQuickStudent(p => ({ ...p, personType: 'employee' }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${quickStudent.personType === 'employee' ? 'bg-slate-700 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                <i className="pi pi-briefcase mr-1"></i> Employee
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-red-300 transition-colors">
                                {quickStudent.photoPreview ? (
                                    <div className="relative inline-block">
                                        <img src={quickStudent.photoPreview} alt="Preview" className="w-24 h-24 rounded-xl object-cover mx-auto mb-2 shadow-lg" />
                                        <button
                                            onClick={() => setQuickStudent(p => ({ ...p, photoFile: null, photoPreview: null }))}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                        >
                                            <i className="pi pi-times text-xs"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                                            <i className="pi pi-camera text-white text-2xl"></i>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">Upload Photo (Optional)</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="quick-photo-upload"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    const preview = URL.createObjectURL(file);
                                                    setQuickStudent(p => ({ ...p, photoFile: file, photoPreview: preview }));
                                                }
                                            }}
                                        />
                                        <label htmlFor="quick-photo-upload" className="inline-block mt-2 text-sm bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-lg cursor-pointer text-slate-700 transition-colors">
                                            Choose Photo
                                        </label>
                                    </>
                                )}
                                <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 5MB</p>
                            </div>

                            {quickStudent.personType === 'student' ? (
                                <input
                                    type="text"
                                    placeholder="Student ID *"
                                    value={quickStudent.student_id}
                                    onChange={(e) => setQuickStudent(p => ({ ...p, student_id: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
                                />
                            ) : (
                                <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-500 flex items-center gap-2">
                                    <i className="pi pi-info-circle"></i>
                                    Employee ID will be auto-generated. Leave blank for auto-generation.
                                </div>
                            )}

                            <input
                                type="text"
                                placeholder="Full Name *"
                                value={quickStudent.name}
                                onChange={(e) => setQuickStudent(p => ({ ...p, name: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
                            />

                            {quickStudent.personType === 'student' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Class"
                                            value={quickStudent.class}
                                            onChange={(e) => setQuickStudent(p => ({ ...p, class: e.target.value }))}
                                            className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                        />
                                        <select
                                            value={quickStudent.level}
                                            onChange={(e) => setQuickStudent(p => ({ ...p, level: e.target.value }))}
                                            className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                        >
                                            <option value="">Select Level</option>
                                            <option value="O Level">O Level</option>
                                            <option value="A Level">A Level</option>
                                            <option value="Primary">Primary</option>
                                            <option value="University">University</option>
                                        </select>
                                    </div>
                                    <select
                                        value={quickStudent.gender}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, gender: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    >
                                        <option value="">Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Residence"
                                        value={quickStudent.residence}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, residence: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Academic Year (e.g., 2025-2026)"
                                        value={quickStudent.academic_year}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, academic_year: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Parent Phone (Optional)"
                                        value={quickStudent.parent_phone}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, parent_phone: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    />
                                </>
                            )}

                            {quickStudent.personType === 'employee' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Employee ID (Optional - will auto-generate)"
                                        value={quickStudent.employeeId}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, employeeId: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={quickStudent.department}
                                            onChange={(e) => setQuickStudent(p => ({ ...p, department: e.target.value }))}
                                            className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Position"
                                            value={quickStudent.position}
                                            onChange={(e) => setQuickStudent(p => ({ ...p, position: e.target.value }))}
                                            className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                        />
                                    </div>
                                    <select
                                        value={quickStudent.gender}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, gender: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    >
                                        <option value="">Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Residence"
                                        value={quickStudent.residence}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, residence: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Work Phone"
                                        value={quickStudent.workPhone}
                                        onChange={(e) => setQuickStudent(p => ({ ...p, workPhone: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                                    />
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowQuickCreateModal(false)} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50">
                                Cancel
                            </button>
                            <button onClick={handleQuickCreateStudent} className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-2.5 rounded-xl font-medium hover:from-red-700 hover:to-red-600 shadow-lg">
                                Create & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Upload Modal */}
            {showPhotoModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl animate-scale-in">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <i className="pi pi-camera text-white text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Photo Required</h3>
                        <p className="text-slate-500 mt-1">{selectedStudent.name} needs a photo</p>
                        {uploadedPhoto && (
                            <div className="w-24 h-24 mx-auto mt-3 border-2 border-slate-200 rounded-xl overflow-hidden shadow-md">
                                <img src={URL.createObjectURL(uploadedPhoto)} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                        )}
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 my-4 hover:border-red-300 transition-colors">
                            <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={(e) => { if (e.target.files[0]) setUploadedPhoto(e.target.files[0]); }} />
                            <label htmlFor="photo-upload" className="inline-block bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors">
                                <i className="pi pi-upload mr-2"></i>Choose Photo
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowPhotoModal(false); setUploadedPhoto(null); }} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
                            <button onClick={handlePhotoUploadOnly} disabled={!uploadedPhoto || photoUploadStatus === 'uploading'} className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-2.5 rounded-xl font-medium disabled:opacity-50 hover:from-red-700 hover:to-red-600">
                                {photoUploadStatus === 'uploading' ? <><i className="pi pi-spinner pi-spin mr-2"></i>Uploading...</> : 'Save & Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== SUB-COMPONENTS ====================

const StepButton = ({ step, title, icon, active, onClick }) => (
    <button onClick={onClick} className={`text-center p-2 rounded-xl transition-all duration-300 ${active ? 'bg-red-50 border-2 border-red-500 shadow-lg scale-105' : 'border-2 border-transparent hover:bg-slate-50 hover:scale-105'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-bold transition-all ${active ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg' : 'bg-slate-200 text-slate-600'}`}>
            <i className={`pi ${icon} text-xs`}></i>
        </div>
        <div className={`text-xs font-semibold ${active ? 'text-red-600' : 'text-slate-600'}`}>{title}</div>
    </button>
);

const FileUploadCard = ({ title, accept, icon, color, onFileSelect, note }) => {
    const [fileName, setFileName] = useState(null);
    const inputId = title.replace(/\s/g, '');

    return (
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-red-300 transition-colors">
            <div className={`w-12 h-12 ${color === 'red' ? 'bg-gradient-to-br from-red-600 to-red-500' : 'bg-gradient-to-br from-slate-700 to-slate-800'} rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                <i className={`${icon} text-white text-xl`}></i>
            </div>
            <p className="font-medium text-slate-700">{title}</p>
            <input
                type="file"
                accept={accept}
                className="hidden"
                id={inputId}
                onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                        setFileName(f.name);
                        onFileSelect(f);
                    }
                }}
            />
            <label
                htmlFor={inputId}
                className="inline-block mt-2 text-sm bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-lg cursor-pointer text-slate-700 transition-colors"
            >
                {fileName || 'Choose File'}
            </label>
            {note && <p className="text-xs text-slate-400 mt-1">{note}</p>}
        </div>
    );
};

// In CardGeneration.jsx - COMPLETE FIXED DraggableItem component

const DraggableItem = ({
    id, displayX, displayY, label, isPhotoField, isActive, field,
    sampleStudent, selectedStudent, generationMode, previewScale,
    previewPhotoWidth, previewPhotoHeight, onPositionChange
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
    const [photoUrl, setPhotoUrl] = useState(null);

    useEffect(() => {
        if (isPhotoField && field) {
            let url = null;
            if (generationMode === 'single' && selectedStudent) {
                url = selectedStudent.photo_url;
            } else if (sampleStudent) {
                url = sampleStudent.photo_url;
            }

            if (url && typeof url === 'object') {
                url = url.secure_url || url.url || null;
            }
            setPhotoUrl(url);
        }
    }, [isPhotoField, field, sampleStudent, selectedStudent, generationMode]);

    const style = {
        position: 'absolute',
        left: `${displayX}px`,
        top: `${displayY}px`,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 100 : 10,
        cursor: 'grab',
    };

    // For photo fields
    if (isPhotoField && field) {
        const styling = field.styling || {};
        const {
            borderColor = '#005800',
            borderWidth = 3,
            borderRadius = 10,
            placeholderColor = '#10B981',
            placeholderBg = 'rgba(16, 185, 129, 0.05)',
            showCameraIcon = true,
            showPlaceholderText = true,
            noBorder = false
        } = styling;

        const width = previewPhotoWidth || (field.position?.width || 250) * (previewScale || 1);
        const height = previewPhotoHeight || (field.position?.height || 250) * (previewScale || 1);

        return (
            <div
                ref={setNodeRef}
                style={{ ...style, width: `${width}px`, height: `${height}px` }}
                {...listeners}
                {...attributes}
                className={`select-none transition-transform duration-150 ${isDragging ? 'scale-105 z-50' : 'hover:scale-102'}`}
            >
                <div
                    className="relative overflow-hidden bg-white shadow-lg"
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        borderRadius: `${borderRadius}px`,
                        border: !noBorder && borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
                        backgroundColor: placeholderBg
                    }}
                >
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            style={{ borderRadius: `${borderRadius}px` }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            {showCameraIcon && (
                                <span className="text-3xl mb-1" style={{ color: placeholderColor }}>📷</span>
                            )}
                            {showPlaceholderText && (
                                <span className="text-xs" style={{ color: '#666' }}>Add Photo</span>
                            )}
                        </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-white border border-gray-300 rounded cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startWidth = width;
                            const startHeight = height;

                            const onMouseMove = (moveEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                const deltaY = moveEvent.clientY - startY;
                                const newWidth = Math.max(50, startWidth + deltaX);
                                const newHeight = Math.max(50, startHeight + deltaY);

                                if (window.updateFieldPosition) {
                                    window.updateFieldPosition(
                                        field.name,
                                        field.position?.x || 0,
                                        field.position?.y || 0,
                                        {
                                            width: Math.round(newWidth / (previewScale || 1)),
                                            height: Math.round(newHeight / (previewScale || 1))
                                        }
                                    );
                                }
                            };

                            const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            };

                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                        }}
                    >
                        <i className="pi pi-arrows-alt text-xs"></i>
                    </div>
                </div>
                <div className="absolute -top-5 left-0 text-[10px] font-medium bg-black/70 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                    {field.label}
                </div>
            </div>
        );
    }

    // FOR TEXT FIELDS - Apply actual styling from field.position
    const position = field?.position || {};
    const {
        fontSize = 20,
        isBold = false,
        fontColor = '#000000',
        textAlign = 'left'
    } = position;

    // Calculate scaled font size for preview
    const previewFontSize = Math.max(10, Math.round(fontSize * (previewScale || 1)));

    // Get the actual text value to display
    let displayText = label; // Default to label

    if (generationMode === 'single' && selectedStudent) {
        // For single card mode, show actual student data
        if (field.dataSource?.fieldPath) {
            const parts = field.dataSource.fieldPath.split('.');
            let value = selectedStudent;
            for (const part of parts) {
                value = value?.[part];
            }
            if (value) displayText = String(value);
        } else {
            const autoMap = {
                'name': selectedStudent.name,
                'student_id': selectedStudent.student_id,
                'class': selectedStudent.studentDetails?.class,
                'level': selectedStudent.studentDetails?.level,
                'gender': selectedStudent.gender,
                'residence': selectedStudent.residence,
                'academic_year': selectedStudent.studentDetails?.academic_year,
                'department': selectedStudent.employeeDetails?.department,
                'position': selectedStudent.employeeDetails?.position
            };
            if (autoMap[field.name]) displayText = String(autoMap[field.name]);
        }
    } else if (sampleStudent) {
        // For batch mode, show sample data
        if (field.dataSource?.fieldPath) {
            const parts = field.dataSource.fieldPath.split('.');
            let value = sampleStudent;
            for (const part of parts) {
                value = value?.[part];
            }
            if (value) displayText = String(value);
        } else {
            const autoMapBatch = {
                'name': sampleStudent.name,
                'student_id': sampleStudent.student_id,
                'class': sampleStudent.studentDetails?.class,
                'level': sampleStudent.studentDetails?.level,
                'gender': sampleStudent.gender,
                'residence': sampleStudent.residence,
                'academic_year': sampleStudent.studentDetails?.academic_year
            };
            if (autoMapBatch[field.name]) displayText = String(autoMapBatch[field.name]);
        }
    }

    // Truncate long text for preview
    if (displayText.length > 30) {
        displayText = displayText.substring(0, 27) + '...';
    }

    // Text alignment styles
    const justifyContent =
        textAlign === 'center' ? 'center' :
            textAlign === 'right' ? 'flex-end' : 'flex-start';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`select-none transition-transform duration-150 ${isDragging ? 'scale-110 z-50' : 'hover:scale-102'}`}
        >
            <div
                className={`px-2 py-1 rounded-md shadow-lg border-2 backdrop-blur-sm whitespace-nowrap max-w-[300px] ${isDragging ? 'border-red-400 bg-red-500/90' : 'border-transparent bg-white/95'}`}
                style={{
                    fontSize: `${previewFontSize}px`,
                    fontWeight: isBold ? 'bold' : 'normal',
                    color: fontColor,
                    textAlign: textAlign,
                    display: 'flex',
                    justifyContent: justifyContent,
                    alignItems: 'center',
                    boxShadow: isDragging ? '0 10px 25px -5px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
            >
                {displayText}
                {isDragging && <span className="ml-2 text-[10px] opacity-80 animate-pulse">↗️</span>}
            </div>
            
        </div>
    );
};

export default CardGeneration;