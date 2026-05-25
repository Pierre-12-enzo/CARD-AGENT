// components/DynamicFieldMapper.jsx - COMPLETE REWRITE
// Features: No duplicate keys, Add/Remove fields, Per-template field storage
import React, { useState, useEffect } from 'react';

const DynamicFieldMapper = ({ template, students, onSave, onBack, initialMappings }) => {
    const [fields, setFields] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showAddField, setShowAddField] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');

    // Sample student for preview
    const sampleStudent = students?.find(s => s) || null;

    // Available source fields from Student model
    const availableDataSources = [
        { label: 'Name', path: 'name', category: 'Basic', personType: 'both' },
        { label: 'Student ID', path: 'student_id', category: 'Basic', personType: 'both' },
        { label: 'Gender', path: 'gender', category: 'Basic', personType: 'both' },
        { label: 'Residence', path: 'residence', category: 'Basic', personType: 'both' },
        { label: 'Class', path: 'studentDetails.class', category: 'Student', personType: 'student' },
        { label: 'Level', path: 'studentDetails.level', category: 'Student', personType: 'student' },
        { label: 'Academic Year', path: 'studentDetails.academic_year', category: 'Student', personType: 'student' },
        { label: 'Parent Phone', path: 'studentDetails.parent_phone', category: 'Student', personType: 'student' },
        { label: 'Department', path: 'employeeDetails.department', category: 'Employee', personType: 'employee' },
        { label: 'Position', path: 'employeeDetails.position', category: 'Employee', personType: 'employee' },
        { label: 'Employee ID', path: 'employeeDetails.employeeId', category: 'Employee', personType: 'employee' },
        { label: 'Work Phone', path: 'employeeDetails.workPhone', category: 'Employee', personType: 'employee' }
    ];

    // Initialize fields from template or create default
    useEffect(() => {
        if (template?.fields && template.fields.length > 0) {
            // Use existing template fields
            setFields(template.fields.map(f => ({
                ...f,
                uniqueId: f._id || `${f.name}-${Date.now()}-${Math.random()}`
            })));
        } else {
            // Create default fields for new template
            const defaultFields = [
                {
                    name: 'photo', label: 'Photo', type: 'photo', requirement: 'optional',
                    position: { x: 50, y: 230, width: 250, height: 250 },
                    uniqueId: `photo-${Date.now()}`
                },
                {
                    name: 'name', label: 'Full Name', type: 'text', requirement: 'required',
                    position: { x: 580, y: 225, maxWidth: 500, fontSize: 22, isBold: true },
                    dataSource: { sourceType: 'student_field', fieldPath: 'name' },
                    uniqueId: `name-${Date.now()}`
                },
                {
                    name: 'student_id', label: 'ID Number', type: 'text', requirement: 'required',
                    position: { x: 580, y: 475, maxWidth: 400, fontSize: 20 },
                    dataSource: { sourceType: 'student_field', fieldPath: 'student_id' },
                    uniqueId: `student_id-${Date.now()}`
                }
            ];
            setFields(defaultFields);
        }
    }, [template]);

    // Update a specific field
    const updateField = (uniqueId, updates) => {
        setFields(prev => prev.map(field =>
            field.uniqueId === uniqueId ? { ...field, ...updates } : field
        ));
    };

    // Remove a field
    const removeField = (uniqueId) => {
        if (window.confirm('Remove this field from the template?')) {
            setFields(prev => prev.filter(field => field.uniqueId !== uniqueId));
        }
    };

    // Add a new custom field
    const addNewField = () => {
        if (!newFieldName.trim()) {
            alert('Field name is required');
            return;
        }

        const newField = {
            name: newFieldName.toLowerCase().replace(/\s/g, '_'),
            label: newFieldLabel || newFieldName,
            type: newFieldType,
            requirement: 'optional',
            position: { x: 100, y: 100, fontSize: 20, isBold: false },
            dataSource: { sourceType: 'student_field', fieldPath: '' },
            uniqueId: `new-${Date.now()}-${Math.random()}`
        };

        setFields(prev => [...prev, newField]);
        setShowAddField(false);
        setNewFieldName('');
        setNewFieldLabel('');
        setNewFieldType('text');
    };

    // Get preview value for a field
    const getPreviewValue = (field) => {
        if (!sampleStudent) return '—';

        if (field.type === 'photo') {
            return sampleStudent.has_photo ? '📷 Has photo' : '📷 No photo';
        }

        if (field.dataSource?.sourceType === 'static') {
            return field.dataSource.staticValue || '—';
        }

        if (field.dataSource?.sourceType === 'computed') {
            let preview = field.dataSource.computedExpression || '';
            availableDataSources.forEach(ds => {
                const parts = ds.path.split('.');
                let value = sampleStudent;
                for (const part of parts) {
                    value = value?.[part];
                }
                preview = preview.replace(new RegExp(`\\{${ds.path}\\}`, 'g'), value || '');
            });
            return preview || '—';
        }

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

    // Save all fields
    const handleSave = async () => {
        setSaving(true);
        // Remove uniqueId before saving to database
        const fieldsToSave = fields.map(({ uniqueId, ...field }) => field);
        await onSave(fieldsToSave, fields);
        setSaving(false);
    };

    // Separate fields by type
    const photoFields = fields.filter(f => f.type === 'photo');
    const textFields = fields.filter(f => f.type === 'text');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                    <i className="pi pi-info-circle text-blue-600"></i>
                    <h4 className="font-semibold text-blue-800">Field Mapping</h4>
                </div>
                <p className="text-sm text-blue-600">
                    Define which fields appear on this template and connect them to data sources.
                    Required fields must have data or students will be skipped.
                </p>
            </div>

            {/* Photo Fields Section */}
            {photoFields.length > 0 && (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-slate-700 flex items-center gap-2">
                            <i className="pi pi-image text-purple-500"></i> Photo Fields
                        </h4>
                        <button
                            onClick={() => {
                                const newPhotoField = {
                                    name: `photo_${Date.now()}`,
                                    label: 'Photo',
                                    type: 'photo',
                                    requirement: 'optional',
                                    position: { x: 50, y: 230, width: 250, height: 250 },
                                    uniqueId: `photo-${Date.now()}`
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
                                        Position: ({field.position?.x || 0}, {field.position?.y || 0})
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={field.requirement || 'optional'}
                                        onChange={(e) => updateField(field.uniqueId, { requirement: e.target.value })}
                                        className="text-xs px-2 py-1 border rounded-lg"
                                    >
                                        <option value="required">Required</option>
                                        <option value="optional">Optional</option>
                                    </select>
                                    <button
                                        onClick={() => removeField(field.uniqueId)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        <i className="pi pi-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="text-sm text-slate-600">
                                📸 Student photo will be placed here automatically
                            </div>
                            {sampleStudent && !sampleStudent.has_photo && (
                                <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                    <i className="pi pi-exclamation-triangle"></i>
                                    Sample student has no photo
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
                        <button
                            onClick={() => setShowAddField(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
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
                                        <p className="text-xs text-slate-500">
                                            Internal name: {field.name}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={field.requirement || 'optional'}
                                            onChange={(e) => updateField(field.uniqueId, { requirement: e.target.value })}
                                            className="text-xs px-2 py-1 border rounded-lg"
                                        >
                                            <option value="required">Required</option>
                                            <option value="optional">Optional</option>
                                            <option value="conditional">Conditional</option>
                                        </select>
                                        <button
                                            onClick={() => removeField(field.uniqueId)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            <i className="pi pi-trash"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Conditional rule */}
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

                                {/* Position inputs */}
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    <div>
                                        <label className="text-xs text-slate-500">X</label>
                                        <input
                                            type="number"
                                            value={field.position?.x || 0}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                position: { ...field.position, x: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Y</label>
                                        <input
                                            type="number"
                                            value={field.position?.y || 0}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                position: { ...field.position, y: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Font Size</label>
                                        <input
                                            type="number"
                                            value={field.position?.fontSize || 20}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                position: { ...field.position, fontSize: parseInt(e.target.value) || 20 }
                                            })}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-5">
                                        <label className="text-xs text-slate-500">Bold</label>
                                        <input
                                            type="checkbox"
                                            checked={field.position?.isBold || false}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                position: { ...field.position, isBold: e.target.checked }
                                            })}
                                            className="w-4 h-4"
                                        />
                                    </div>
                                </div>

                                {/* Data source selector */}
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={field.dataSource?.sourceType || 'student_field'}
                                        onChange={(e) => updateField(field.uniqueId, {
                                            dataSource: { sourceType: e.target.value, fieldPath: '', staticValue: '', computedExpression: '' }
                                        })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    >
                                        <option value="student_field">From Student Data</option>
                                        <option value="employee_field">From Employee Data</option>
                                        <option value="static">Static Value</option>
                                        <option value="computed">Computed Expression</option>
                                    </select>

                                    {field.dataSource?.sourceType === 'static' ? (
                                        <input
                                            type="text"
                                            placeholder="Enter static value"
                                            value={field.dataSource?.staticValue || ''}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                dataSource: { ...field.dataSource, staticValue: e.target.value }
                                            })}
                                            className="px-3 py-2 border rounded-lg text-sm"
                                        />
                                    ) : field.dataSource?.sourceType === 'computed' ? (
                                        <input
                                            type="text"
                                            placeholder='e.g., "Class: {studentDetails.class}"'
                                            value={field.dataSource?.computedExpression || ''}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                dataSource: { ...field.dataSource, computedExpression: e.target.value }
                                            })}
                                            className="px-3 py-2 border rounded-lg text-sm"
                                        />
                                    ) : (
                                        <select
                                            value={field.dataSource?.fieldPath || ''}
                                            onChange={(e) => updateField(field.uniqueId, {
                                                dataSource: { ...field.dataSource, fieldPath: e.target.value }
                                            })}
                                            className="px-3 py-2 border rounded-lg text-sm"
                                        >
                                            <option value="">Select data source...</option>
                                            {availableDataSources.map(ds => (
                                                <option key={ds.path} value={ds.path}>
                                                    {ds.label} ({ds.category})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Preview */}
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
                            <input
                                type="text"
                                placeholder="Field Name (e.g., parent_name)"
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="Display Label (e.g., Parent Name)"
                                value={newFieldLabel}
                                onChange={(e) => setNewFieldLabel(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                            <select
                                value={newFieldType}
                                onChange={(e) => setNewFieldType(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="text">Text Field</option>
                                <option value="photo">Photo Field</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddField(false)}
                                className="flex-1 px-4 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addNewField}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
                            >
                                Add Field
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t">
                <button
                    onClick={onBack}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
                >
                    <i className="pi pi-arrow-left mr-2"></i> Back
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50"
                >
                    {saving ? <><i className="pi pi-spinner pi-spin mr-2"></i>Saving...</> : <><i className="pi pi-save mr-2"></i>Save Template Fields</>}
                </button>
            </div>
        </div>
    );
};

export default DynamicFieldMapper;