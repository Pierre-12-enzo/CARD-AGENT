// components/DynamicFieldMapper.jsx - COMPLETELY FIXED
import React, { useState, useEffect } from 'react';

const DynamicFieldMapper = ({ template, students, onSave, onBack, initialMappings }) => {
    const [fields, setFields] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showAddField, setShowAddField] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');
    const [templateType, setTemplateType] = useState(template?.defaultPersonType || 'student');
    const [showStylingPanel, setShowStylingPanel] = useState(null);

    const sampleStudent = students?.find(s => s) || null;

    // Default styling based on template type
    const getDefaultStyling = (type) => {
        return type === 'student' ? {
            borderColor: '#005800',
            borderWidth: 3,
            borderRadius: 10,
            placeholderColor: '#10B981',
            placeholderBg: 'rgba(16, 185, 129, 0.05)',
            showCameraIcon: true,
            showPlaceholderText: true,
            noBorder: false
        } : {
            borderColor: '#1e293b',
            borderWidth: 3,
            borderRadius: 10,
            placeholderColor: '#64748b',
            placeholderBg: 'rgba(30, 41, 59, 0.05)',
            showCameraIcon: true,
            showPlaceholderText: true,
            noBorder: false
        };
    };

    // Get available data sources - ONLY for the current template type
    const getAvailableDataSourcesForType = (type) => {
        const commonSources = [
            { label: 'Name', path: 'name', category: 'Basic' },
            { label: 'Gender', path: 'gender', category: 'Basic' },
            { label: 'Residence', path: 'residence', category: 'Basic' }
        ];

        const studentSources = [
            { label: 'Student ID', path: 'student_id', category: 'Student' },
            { label: 'Class', path: 'studentDetails.class', category: 'Student' },
            { label: 'Level', path: 'studentDetails.level', category: 'Student' },
            { label: 'Academic Year', path: 'studentDetails.academic_year', category: 'Student' },
            { label: 'Parent Phone', path: 'studentDetails.parent_phone', category: 'Student' }
        ];

        const employeeSources = [
            { label: 'Employee ID', path: 'employeeDetails.employeeId', category: 'Employee' },
            { label: 'Department', path: 'employeeDetails.department', category: 'Employee' },
            { label: 'Position', path: 'employeeDetails.position', category: 'Employee' },
            { label: 'Work Phone', path: 'employeeDetails.workPhone', category: 'Employee' }
        ];

        if (type === 'student') {
            return [...commonSources, ...studentSources];
        }
        if (type === 'employee') {
            return [...commonSources, ...employeeSources];
        }
        return [...commonSources, ...studentSources, ...employeeSources];
    };

    // Get default fields for template type (ALL FIELDS REQUIRED)
    const getDefaultFieldsForType = (type) => {
        if (type === 'student') {
            return [
                {
                    name: 'photo', label: 'Photo', type: 'photo', requirement: 'required',
                    position: { x: 50, y: 230, width: 250, height: 250 },
                    styling: getDefaultStyling('student'),
                    uniqueId: `photo-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'name', label: 'Full Name', type: 'text', requirement: 'required',
                    position: { x: 580, y: 225, maxWidth: 500, fontSize: 22, isBold: true, textAlign: 'left' },
                    dataSource: { sourceType: 'student_field', fieldPath: 'name' },
                    uniqueId: `name-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'student_id', label: 'Student ID', type: 'text', requirement: 'required',
                    position: { x: 580, y: 475, maxWidth: 400, fontSize: 20, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'student_field', fieldPath: 'student_id' },
                    uniqueId: `student_id-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'class', label: 'Class', type: 'text', requirement: 'required',
                    position: { x: 580, y: 270, maxWidth: 300, fontSize: 20, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'student_field', fieldPath: 'studentDetails.class' },
                    uniqueId: `class-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'level', label: 'Level', type: 'text', requirement: 'required',
                    position: { x: 580, y: 320, maxWidth: 500, fontSize: 20, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'student_field', fieldPath: 'studentDetails.level' },
                    uniqueId: `level-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'gender', label: 'Gender', type: 'text', requirement: 'required',
                    position: { x: 580, y: 375, maxWidth: 300, fontSize: 18, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'student_field', fieldPath: 'gender' },
                    uniqueId: `gender-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'residence', label: 'Residence', type: 'text', requirement: 'required',
                    position: { x: 620, y: 420, maxWidth: 300, fontSize: 18, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'student_field', fieldPath: 'residence' },
                    uniqueId: `residence-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'academic_year', label: 'Academic Year', type: 'text', requirement: 'required',
                    position: { x: 670, y: 472, maxWidth: 300, fontSize: 18, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'student_field', fieldPath: 'studentDetails.academic_year' },
                    uniqueId: `academic_year-${Date.now()}-${Math.random()}`
                }
            ];
        } else {
            // Employee template
            return [
                {
                    name: 'photo', label: 'Photo', type: 'photo', requirement: 'required',
                    position: { x: 50, y: 230, width: 250, height: 250 },
                    styling: getDefaultStyling('employee'),
                    uniqueId: `photo-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'name', label: 'Full Name', type: 'text', requirement: 'required',
                    position: { x: 580, y: 225, maxWidth: 500, fontSize: 22, isBold: true, textAlign: 'left' },
                    dataSource: { sourceType: 'employee_field', fieldPath: 'name' },
                    uniqueId: `name-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'employee_id', label: 'Employee ID', type: 'text', requirement: 'required',
                    position: { x: 580, y: 475, maxWidth: 400, fontSize: 20, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'employee_field', fieldPath: 'employeeDetails.employeeId' },
                    uniqueId: `employee_id-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'department', label: 'Department', type: 'text', requirement: 'required',
                    position: { x: 580, y: 270, maxWidth: 400, fontSize: 20, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'employee_field', fieldPath: 'employeeDetails.department' },
                    uniqueId: `department-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'position', label: 'Position', type: 'text', requirement: 'required',
                    position: { x: 580, y: 320, maxWidth: 400, fontSize: 20, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'employee_field', fieldPath: 'employeeDetails.position' },
                    uniqueId: `position-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'gender', label: 'Gender', type: 'text', requirement: 'required',
                    position: { x: 580, y: 375, maxWidth: 300, fontSize: 18, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'employee_field', fieldPath: 'gender' },
                    uniqueId: `gender-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'residence', label: 'Residence', type: 'text', requirement: 'required',
                    position: { x: 620, y: 420, maxWidth: 300, fontSize: 18, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'employee_field', fieldPath: 'residence' },
                    uniqueId: `residence-${Date.now()}-${Math.random()}`
                },
                {
                    name: 'work_phone', label: 'Work Phone', type: 'text', requirement: 'required',
                    position: { x: 580, y: 420, maxWidth: 300, fontSize: 18, isBold: false, textAlign: 'left' },
                    dataSource: { sourceType: 'employee_field', fieldPath: 'employeeDetails.workPhone' },
                    uniqueId: `work_phone-${Date.now()}-${Math.random()}`
                }
            ];
        }
    };

    // Initialize fields from template or create default
    useEffect(() => {
        if (template?.fields && template.fields.length > 0) {
            // Convert existing fields - ensure requirement is set correctly
            const convertedFields = template.fields.map(f => {
                // If it's a text field or photo field, ensure requirement is set
                if ((f.type === 'text' || f.type === 'photo') && !f.requirement) {
                    return { ...f, requirement: 'required', uniqueId: f._id || `${f.name}-${Date.now()}-${Math.random()}` };
                }
                return { ...f, uniqueId: f._id || `${f.name}-${Date.now()}-${Math.random()}` };
            });
            setFields(convertedFields);

            // Detect template type from fields
            const hasEmployeeFields = convertedFields.some(f => f.name === 'employee_id' || f.name === 'department');
            const hasStudentFields = convertedFields.some(f => f.name === 'student_id' || f.name === 'class');

            if (hasEmployeeFields && !hasStudentFields) {
                setTemplateType('employee');
            } else if (hasStudentFields && !hasEmployeeFields) {
                setTemplateType('student');
            } else if (template.defaultPersonType) {
                setTemplateType(template.defaultPersonType);
            }
        } else {
            const defaultFields = getDefaultFieldsForType(templateType);
            setFields(defaultFields);
        }
    }, [template]);

    const updateField = (uniqueId, updates) => {
        setFields(prev => prev.map(field => {
            if (field.uniqueId === uniqueId) {
                if (updates.position && field.type === 'photo') {
                    return {
                        ...field,
                        position: updates.position,
                        styling: field.styling || getDefaultStyling(templateType)
                    };
                }
                return { ...field, ...updates };
            }
            return field;
        }));
    };

    const removeField = (uniqueId) => {
        if (window.confirm('Remove this field from the template?')) {
            setFields(prev => prev.filter(field => field.uniqueId !== uniqueId));
        }
    };

    const addNewField = () => {
        if (!newFieldName.trim()) {
            alert('Field name is required');
            return;
        }

        const newField = {
            name: newFieldName.toLowerCase().replace(/\s/g, '_'),
            label: newFieldLabel || newFieldName,
            type: newFieldType,
            requirement: 'required',
            position: { x: 100, y: 100, fontSize: 20, isBold: false },
            dataSource: { sourceType: templateType === 'student' ? 'student_field' : 'employee_field', fieldPath: '' },
            ...(newFieldType === 'photo' && {
                styling: getDefaultStyling(templateType)
            }),
            uniqueId: `new-${Date.now()}-${Math.random()}`
        };

        setFields(prev => [...prev, newField]);
        setShowAddField(false);
        setNewFieldName('');
        setNewFieldLabel('');
        setNewFieldType('text');
    };

    // Reset fields when template type changes
    const handleTemplateTypeChange = (type) => {
        setTemplateType(type);
        setFields(getDefaultFieldsForType(type));
    };

    const getPreviewValue = (field) => {
        if (!sampleStudent) return '—';
        if (field.type === 'photo') return '📷 Photo Preview';
        if (field.dataSource?.sourceType === 'static') return field.dataSource.staticValue || '—';
        if (field.dataSource?.fieldPath) {
            const parts = field.dataSource.fieldPath.split('.');
            let value = sampleStudent;
            for (const part of parts) {
                value = value?.[part];
            }
            return value || '—';
        }
        return '—';
    };

    const handleSave = async () => {
        setSaving(true);

        // Ensure all fields have proper requirement and styling
        const fieldsToSave = fields.map(({ uniqueId, ...field }) => {
            // Ensure text and photo fields are required by default
            if ((field.type === 'text' || field.type === 'photo') && !field.requirement) {
                field.requirement = 'required';
            }
            if (field.type === 'photo') {
                const defaultStyling = getDefaultStyling(templateType);
                field.styling = {
                    ...defaultStyling,
                    ...(field.styling || {})
                };
            }
            return field;
        });

        console.log('📤 Saving fields:', fieldsToSave.map(f => ({ name: f.name, requirement: f.requirement })));

        await onSave(fieldsToSave, fields);
        setSaving(false);
    };

    const photoFields = fields.filter(f => f.type === 'photo');
    const textFields = fields.filter(f => f.type === 'text');

    return (
        <div className="space-y-6">
            {/* Template Type Selector */}
            <div className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                    <i className="pi pi-tag text-red-500"></i>
                    <h4 className="font-semibold text-slate-800">Template Type</h4>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                    Select the card type. This determines which data fields are available.
                    <span className="text-amber-600 block mt-1">⚠️ All fields are required by default. Students/Employees missing any field will be skipped.</span>
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => handleTemplateTypeChange('student')}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all ${templateType === 'student'
                            ? 'border-red-500 bg-red-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-red-200'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <i className="pi pi-graduation-cap text-lg"></i>
                            <span className="font-medium">Student Card</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Student ID, Class, Level, Academic Year + Photo</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTemplateTypeChange('employee')}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all ${templateType === 'employee'
                            ? 'border-red-500 bg-red-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-red-200'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <i className="pi pi-briefcase text-lg"></i>
                            <span className="font-medium">Employee Card</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Employee ID, Department, Position, Work Phone + Photo</p>
                    </button>
                </div>
            </div>

            {/* Header Info */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                    <i className="pi pi-info-circle text-blue-600"></i>
                    <h4 className="font-semibold text-blue-800">Field Mapping - {templateType === 'student' ? 'Student' : 'Employee'} Template</h4>
                </div>
                <p className="text-sm text-blue-600">
                    Define which fields appear on this card.
                    <strong className="block mt-1 text-red-600">⚠️ Required fields MUST have data or cards will be SKIPPED!</strong>
                </p>
            </div>

            {/* Photo Fields Section */}
            {photoFields.length > 0 && (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-slate-700 flex items-center gap-2">
                            <i className="pi pi-image text-purple-500"></i> Photo Fields ({photoFields.length})
                        </h4>
                        <button
                            onClick={() => {
                                const newPhotoField = {
                                    name: `photo_${Date.now()}`,
                                    label: 'Photo',
                                    type: 'photo',
                                    requirement: 'required',
                                    position: { x: 50, y: 230, width: 250, height: 250 },
                                    styling: getDefaultStyling(templateType),
                                    uniqueId: `photo-${Date.now()}-${Math.random()}`
                                };
                                setFields(prev => [...prev, newPhotoField]);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                            <i className="pi pi-plus"></i> Add Photo Field
                        </button>
                    </div>

                    {photoFields.map(field => (
                        <div key={field.uniqueId} className="border rounded-xl p-4 bg-purple-50/30">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <label className="font-semibold text-slate-800">{field.label}</label>
                                    <p className="text-xs text-slate-500">
                                        Position: ({field.position?.x || 0}, {field.position?.y || 0}) • {field.position?.width || 250}x{field.position?.height || 250}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowStylingPanel(showStylingPanel === field.uniqueId ? null : field.uniqueId)}
                                        className="text-xs px-2 py-1 bg-white border rounded-lg hover:bg-slate-50"
                                    >
                                        <i className="pi pi-palette mr-1"></i> Styling
                                    </button>
                                    <select
                                        value={field.requirement || 'required'}
                                        onChange={(e) => updateField(field.uniqueId, { requirement: e.target.value })}
                                        className="text-xs px-2 py-1 border rounded-lg bg-white"
                                    >
                                        <option value="required">Required ✓</option>
                                        <option value="optional">Optional</option>
                                    </select>
                                    <button onClick={() => removeField(field.uniqueId)} className="text-red-500 hover:text-red-700 text-sm">
                                        <i className="pi pi-trash"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Photo Styling Panel */}
                            {showStylingPanel === field.uniqueId && (
                                <div className="mt-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <i className="pi pi-palette text-purple-500"></i>
                                        Photo Frame Customization
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Border Color</label>
                                            <input
                                                type="color"
                                                value={field.styling?.borderColor || (templateType === 'student' ? '#005800' : '#1e293b')}
                                                onChange={(e) => updateField(field.uniqueId, {
                                                    styling: { ...field.styling, borderColor: e.target.value }
                                                })}
                                                className="w-full h-9 border rounded cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Border Width</label>
                                            <input
                                                type="number"
                                                value={field.styling?.borderWidth || 3}
                                                onChange={(e) => updateField(field.uniqueId, {
                                                    styling: { ...field.styling, borderWidth: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Border Radius</label>
                                            <input
                                                type="number"
                                                value={field.styling?.borderRadius || 10}
                                                onChange={(e) => updateField(field.uniqueId, {
                                                    styling: { ...field.styling, borderRadius: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                min="0"
                                                max="50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Icon/Text Color</label>
                                            <input
                                                type="color"
                                                value={field.styling?.placeholderColor || (templateType === 'student' ? '#10B981' : '#64748b')}
                                                onChange={(e) => updateField(field.uniqueId, {
                                                    styling: { ...field.styling, placeholderColor: e.target.value }
                                                })}
                                                className="w-full h-9 border rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4 mt-3 pt-2 border-t border-slate-100">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={field.styling?.showCameraIcon !== false}
                                                onChange={(e) => updateField(field.uniqueId, {
                                                    styling: { ...field.styling, showCameraIcon: e.target.checked }
                                                })}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-slate-600">Show Camera Icon</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={field.styling?.showPlaceholderText !== false}
                                                onChange={(e) => updateField(field.uniqueId, {
                                                    styling: { ...field.styling, showPlaceholderText: e.target.checked }
                                                })}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-slate-600">Show "Add Photo" Text</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={field.styling?.noBorder === true}
                                                onChange={(e) => updateField(field.uniqueId, {
                                                    styling: { ...field.styling, noBorder: e.target.checked, borderWidth: e.target.checked ? 0 : (field.styling?.borderWidth || 3) }
                                                })}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-slate-600">No Border</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Text Fields Section */}
            {textFields.length > 0 && (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-slate-700 flex items-center gap-2">
                            <i className="pi pi-font text-blue-500"></i> Text Fields ({textFields.length})
                        </h4>
                        <button onClick={() => setShowAddField(true)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            <i className="pi pi-plus"></i> Add Custom Field
                        </button>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {textFields.map(field => (
                            <div key={field.uniqueId} className="border rounded-xl p-4">
                                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                    <div>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateField(field.uniqueId, { label: e.target.value })}
                                            className="font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                                            placeholder="Field Label"
                                        />
                                        <p className="text-xs text-slate-500">Internal name: {field.name}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={field.requirement || 'required'}
                                            onChange={(e) => updateField(field.uniqueId, { requirement: e.target.value })}
                                            className="text-xs px-2 py-1 border rounded-lg bg-white"
                                        >
                                            <option value="required">Required ✓</option>
                                            <option value="optional">Optional</option>
                                            <option value="conditional">Conditional</option>
                                        </select>
                                        <button onClick={() => removeField(field.uniqueId)} className="text-red-500 hover:text-red-700 text-sm">
                                            <i className="pi pi-trash"></i>
                                        </button>
                                    </div>
                                </div>

                                {field.requirement === 'conditional' && (
                                    <div className="mb-3 p-2 bg-amber-50 rounded-lg flex gap-2">
                                        <select
                                            value={field.conditionalRule?.dependsOn || ''}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                conditionalRule: { dependsOn: e.target.value, requiredIfEquals: field.conditionalRule?.requiredIfEquals || '' }
                                            })}
                                            className="flex-1 text-sm px-2 py-1 border rounded"
                                        >
                                            <option value="">Depends on...</option>
                                            <option value="personType">Person Type</option>
                                        </select>
                                        <select
                                            value={field.conditionalRule?.requiredIfEquals || ''}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                conditionalRule: { dependsOn: field.conditionalRule?.dependsOn || 'personType', requiredIfEquals: e.target.value }
                                            })}
                                            className="flex-1 text-sm px-2 py-1 border rounded"
                                        >
                                            <option value="">Equals...</option>
                                            <option value="student">Student</option>
                                            <option value="employee">Employee</option>
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    <div>
                                        <label className="text-xs text-slate-500">X</label>
                                        <input type="number" value={field.position?.x || 0} onChange={(e) => updateField(field.uniqueId, { position: { ...field.position, x: parseInt(e.target.value) || 0 } })} className="w-full px-2 py-1 border rounded text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Y</label>
                                        <input type="number" value={field.position?.y || 0} onChange={(e) => updateField(field.uniqueId, { position: { ...field.position, y: parseInt(e.target.value) || 0 } })} className="w-full px-2 py-1 border rounded text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Font Size</label>
                                        <input type="number" value={field.position?.fontSize || 20} onChange={(e) => updateField(field.uniqueId, { position: { ...field.position, fontSize: parseInt(e.target.value) || 20 } })} className="w-full px-2 py-1 border rounded text-sm" />
                                    </div>
                                    <div className="flex items-center gap-2 pt-5">
                                        <label className="text-xs text-slate-500">Bold</label>
                                        <input type="checkbox" checked={field.position?.isBold || false} onChange={(e) => updateField(field.uniqueId, { position: { ...field.position, isBold: e.target.checked } })} className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={field.dataSource?.sourceType || (templateType === 'student' ? 'student_field' : 'employee_field')}
                                        onChange={(e) => updateField(field.uniqueId, { dataSource: { sourceType: e.target.value, fieldPath: '', staticValue: '', computedExpression: '' } })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    >
                                        <option value="student_field">From Student Data</option>
                                        <option value="employee_field">From Employee Data</option>
                                        <option value="static">Static Value</option>
                                        <option value="computed">Computed Expression</option>
                                    </select>

                                    {field.dataSource?.sourceType === 'static' ? (
                                        <input type="text" placeholder="Enter static value" value={field.dataSource?.staticValue || ''} onChange={(e) => updateField(field.uniqueId, { dataSource: { ...field.dataSource, staticValue: e.target.value } })} className="px-3 py-2 border rounded-lg text-sm" />
                                    ) : field.dataSource?.sourceType === 'computed' ? (
                                        <input type="text" placeholder='e.g., "Class: {studentDetails.class}"' value={field.dataSource?.computedExpression || ''} onChange={(e) => updateField(field.uniqueId, { dataSource: { ...field.dataSource, computedExpression: e.target.value } })} className="px-3 py-2 border rounded-lg text-sm" />
                                    ) : (
                                        <select value={field.dataSource?.fieldPath || ''} onChange={(e) => updateField(field.uniqueId, { dataSource: { ...field.dataSource, fieldPath: e.target.value } })} className="px-3 py-2 border rounded-lg text-sm">
                                            <option value="">Select data source...</option>
                                            {getAvailableDataSourcesForType(templateType).map(ds => (
                                                <option key={ds.path} value={ds.path}>{ds.label} ({ds.category})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {sampleStudent && (
                                    <div className="mt-3 text-xs bg-slate-50 p-2 rounded-lg">
                                        <span className="text-slate-500">Preview: </span>
                                        <span className="font-mono text-slate-700">{getPreviewValue(field)}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Field Modal */}
            {showAddField && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-96">
                        <h3 className="text-lg font-bold mb-4">Add Custom Field</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Field Name (e.g., parent_name)" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            <input type="text" placeholder="Display Label (e.g., Parent Name)" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                <option value="text">Text Field</option>
                                <option value="photo">Photo Field</option>
                            </select>
                            <p className="text-xs text-amber-600 mt-1">⚠️ New fields will be REQUIRED by default</p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddField(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                            <button onClick={addNewField} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Add Field</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t">
                <button onClick={onBack} className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50">
                    <i className="pi pi-arrow-left mr-2"></i> Back
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50">
                    {saving ? <><i className="pi pi-spinner pi-spin mr-2"></i>Saving...</> : <><i className="pi pi-save mr-2"></i>Save Template Fields</>}
                </button>
            </div>
        </div>
    );
};

export default DynamicFieldMapper;