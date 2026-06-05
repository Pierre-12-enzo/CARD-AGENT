// pages/dashboard/Templates.jsx - CARD-AGENT NAVY & CRIMSON
import React, { useState, useEffect } from 'react';
import { templateAPI, organizationAPI } from '../../services/api';

const Templates = () => {
    const [templates, setTemplates] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        description: '',
        frontSide: null,
        backSide: null,
        templateType: 'two-sided',
        setAsDefault: false,
        defaultPersonType: 'student'
    });

    useEffect(() => {
        loadOrganizations();
    }, []);

    useEffect(() => {
        if (selectedOrgId) loadTemplates();
    }, [selectedOrgId]);

    const loadOrganizations = async () => {
        try {
            const response = await organizationAPI.getAll({ limit: 100 });
            if (response.success) {
                setOrganizations(response.organizations || []);
            }
        } catch (error) {
            console.error('Failed to load organizations:', error);
        }
    };

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const params = selectedOrgId ? { organizationId: selectedOrgId } : {};
            const response = await templateAPI.getTemplates(params);
            if (response.success) {
                setTemplates(response.templates || []);
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!newTemplate.frontSide) {
            alert('Front side is required');
            return;
        }
        if (!selectedOrgId) {
            alert('Please select an organization first');
            return;
        }
        if (newTemplate.templateType === 'two-sided' && !newTemplate.backSide) {
            alert('Please select back side for two-sided template, or switch to single-sided');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('name', newTemplate.name || `Template ${Date.now()}`);
            formData.append('description', newTemplate.description);
            formData.append('frontSide', newTemplate.frontSide);
            formData.append('templateType', newTemplate.templateType);
            formData.append('defaultPersonType', newTemplate.defaultPersonType);

            formData.append('organizationId', selectedOrgId);
            if (newTemplate.backSide) formData.append('backSide', newTemplate.backSide);
            formData.append('setAsDefault', newTemplate.setAsDefault.toString());

            const response = await templateAPI.uploadTemplate(formData);
            if (response.success) {
                setShowUploadModal(false);
                setNewTemplate({
                    name: '', description: '', frontSide: null, backSide: null,
                    templateType: 'two-sided', setAsDefault: false, defaultPersonType: 'student'
                });
                await loadTemplates();
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSetDefault = async (templateId) => {
        try {
            await templateAPI.setDefault(templateId);
            await loadTemplates();
        } catch (error) {
            alert(error.message || 'Failed to set default');
        }
    };

    const handleDelete = async (template) => {
        if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
        try {
            await templateAPI.delete(template._id);
            await loadTemplates();
        } catch (error) {
            alert(error.message || 'Delete failed');
        }
    };

    const selectedOrg = organizations.find(o => o._id === selectedOrgId);
    const singleSided = templates.filter(t => t.templateType !== 'two-sided').length;
    const doubleSided = templates.filter(t => t.templateType === 'two-sided').length;
    const defaultCount = templates.filter(t => t.isDefault).length;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
                        Template Studio
                    </h2>
                    <p className="text-slate-500 mt-1">Create and manage card templates per organization</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                    <i className="pi pi-plus"></i>
                    <span>New Template</span>
                </button>
            </div>

            {/* Organization Selector */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-600 flex items-center">
                        <i className="pi pi-building mr-2 text-red-500"></i>Organization:
                    </span>
                    <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-red-500 min-w-[200px]"
                    >
                        <option value="">All Organizations</option>
                        {organizations.map(org => (
                            <option key={org._id} value={org._id}>{org.name}</option>
                        ))}
                    </select>
                    {selectedOrg && (
                        <span className="text-sm text-slate-500">
                            Showing templates for <span className="font-semibold text-slate-700">{selectedOrg.name}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickStat icon="pi pi-images" label="Total" value={templates.length} color="slate" />
                <QuickStat icon="pi pi-star" label="Default" value={defaultCount} color="red" />
                <QuickStat icon="pi pi-file" label="Single-sided" value={singleSided} color="slate" />
                <QuickStat icon="pi pi-copy" label="Double-sided" value={doubleSided} color="red" />
            </div>

            {/* Templates Grid */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                {loading ? (
                    <div className="text-center py-16">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 mt-4">Loading templates...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <i className="pi pi-images text-3xl text-slate-400"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Templates Yet</h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
                            {selectedOrgId
                                ? 'Create your first template for this organization'
                                : 'Select an organization or create your first template'}
                        </p>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 transition-all inline-flex items-center space-x-2"
                        >
                            <i className="pi pi-plus"></i>
                            <span>Create Template</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                        {templates.map(template => (
                            <TemplateCard
                                key={template._id}
                                template={template}
                                onSetDefault={handleSetDefault}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <UploadModal
                    newTemplate={newTemplate}
                    setNewTemplate={setNewTemplate}
                    onSubmit={handleUpload}
                    onCancel={() => setShowUploadModal(false)}
                    uploading={uploading}
                    selectedOrgName={selectedOrg?.name}
                />
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

const TemplateCard = ({ template, onSetDefault, onDelete }) => {
    const [frontLoaded, setFrontLoaded] = useState(false);
    const [backLoaded, setBackLoaded] = useState(false);
    const isTwoSided = template.templateType === 'two-sided' && template.backSideUrl;

    return (
        <div className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl border-2 ${template.isDefault ? 'border-red-500 shadow-lg shadow-red-100' : 'border-slate-200 hover:border-red-300'
            }`}>
            {/* Badges */}
            <div className="absolute top-3 left-3 right-3 z-10 flex justify-between">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isTwoSided ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                    <i className={`pi ${isTwoSided ? 'pi-copy' : 'pi-file'} text-xs mr-1`}></i>
                    {isTwoSided ? 'Double-sided' : 'Single-sided'}
                </span>
                {template.isDefault && (
                    <span className="bg-red-600 text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-lg">
                        <i className="pi pi-star-fill text-xs"></i>
                        Default
                    </span>
                )}
            </div>

            {/* Preview */}
            <div className={`p-4 pt-12 bg-gradient-to-br from-slate-50 to-slate-100 ${isTwoSided ? 'flex gap-3' : ''}`}>
                <div className={isTwoSided ? 'flex-1' : 'w-full'}>
                    <div className="text-xs text-slate-400 mb-1.5">Front Side</div>
                    <div className="aspect-[4/3] bg-white rounded-xl overflow-hidden shadow-md border border-slate-200">
                        {template.frontSideUrl ? (
                            <img src={template.frontSideUrl} alt="Front" className="w-full h-full object-cover"
                                onLoad={() => setFrontLoaded(true)}
                                onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                <i className="pi pi-image text-slate-300 text-2xl"></i>
                            </div>
                        )}
                    </div>
                </div>
                {isTwoSided && (
                    <div className="flex-1">
                        <div className="text-xs text-slate-400 mb-1.5">Back Side</div>
                        <div className="aspect-[4/3] bg-white rounded-xl overflow-hidden shadow-md border border-slate-200">
                            {template.backSideUrl ? (
                                <img src={template.backSideUrl} alt="Back" className="w-full h-full object-cover"
                                    onLoad={() => setBackLoaded(true)}
                                    onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                    <i className="pi pi-image text-slate-300 text-2xl"></i>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Info & Actions */}
            <div className="p-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 truncate text-sm">{template.name}</h3>
                {template.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{template.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                    {new Date(template.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="flex gap-2 mt-3">
                    {!template.isDefault && (
                        <button onClick={() => onSetDefault(template._id)}
                            className="flex-1 bg-slate-100 text-slate-700 py-2 px-3 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-1">
                            <i className="pi pi-star text-xs"></i> Set Default
                        </button>
                    )}
                    <button onClick={() => onDelete(template)}
                        className="flex-1 bg-slate-100 text-slate-600 py-2 px-3 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-1">
                        <i className="pi pi-trash text-xs"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const UploadModal = ({ newTemplate, setNewTemplate, onSubmit, onCancel, uploading, selectedOrgName }) => {
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);

    const handleFileSelect = (side, e) => {
        const file = e.target.files[0];
        if (file) {
            setNewTemplate(prev => ({
                ...prev,
                [side]: file,
                name: prev.name || file.name.replace(/\.[^/.]+$/, '')
            }));
            const reader = new FileReader();
            reader.onloadend = () => {
                if (side === 'frontSide') setFrontPreview(reader.result);
                else setBackPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeFile = (side) => {
        setNewTemplate(prev => ({ ...prev, [side]: null }));
        if (side === 'frontSide') setFrontPreview(null);
        else setBackPreview(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Create New Template</h3>
                        {selectedOrgName && <p className="text-xs text-slate-500 mt-0.5">For: {selectedOrgName}</p>}
                    </div>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                        <i className="pi pi-times text-slate-600"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-5 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Template Name <span className="text-red-500">*</span></label>
                        <input type="text" value={newTemplate.name}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Standard ID Card"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500" />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                        <textarea value={newTemplate.description}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description..."
                            rows={2}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-500" />
                    </div>


                    {/* Person Type (Student vs Employee) */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-2">
                            Card Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setNewTemplate(prev => ({ ...prev, defaultPersonType: 'student' }))}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${newTemplate.defaultPersonType === 'student'
                                    ? 'border-red-500 bg-red-50 shadow-md'
                                    : 'border-slate-200 hover:border-red-300'
                                    }`}
                            >
                                <i className="pi pi-graduation-cap text-xl mb-1 block text-slate-600"></i>
                                <span className="font-medium text-sm text-slate-700">Student Card</span>
                                <p className="text-xs text-slate-500 mt-1">Student ID, Class, Level, Academic Year</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewTemplate(prev => ({ ...prev, defaultPersonType: 'employee' }))}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${newTemplate.defaultPersonType === 'employee'
                                    ? 'border-red-500 bg-red-50 shadow-md'
                                    : 'border-slate-200 hover:border-red-300'
                                    }`}
                            >
                                <i className="pi pi-briefcase text-xl mb-1 block text-slate-600"></i>
                                <span className="font-medium text-sm text-slate-700">Employee Card</span>
                                <p className="text-xs text-slate-500 mt-1">Employee ID, Department, Position, Work Phone</p>
                            </button>
                        </div>
                    </div>

                    {/* Type Toggle */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-2">Template Type</label>
                        <div className="flex gap-3">
                            <button type="button"
                                onClick={() => setNewTemplate(prev => ({ ...prev, templateType: 'single-sided', backSide: null }))}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${newTemplate.templateType === 'single-sided'
                                    ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'
                                    }`}>
                                <i className="pi pi-file text-xl mb-1 block text-slate-600"></i>
                                <span className="font-medium text-sm text-slate-700">Single-sided</span>
                            </button>
                            <button type="button"
                                onClick={() => setNewTemplate(prev => ({ ...prev, templateType: 'two-sided' }))}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${newTemplate.templateType === 'two-sided'
                                    ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'
                                    }`}>
                                <i className="pi pi-copy text-xl mb-1 block text-slate-600"></i>
                                <span className="font-medium text-sm text-slate-700">Double-sided</span>
                            </button>
                        </div>
                    </div>


                    {/* Front Side */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Front Side <span className="text-red-500">*</span>
                        </label>
                        <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${frontPreview ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-red-400'
                            }`}>
                            {frontPreview ? (
                                <div className="relative">
                                    <img src={frontPreview} alt="Front preview" className="max-h-32 mx-auto rounded-lg" />
                                    <button type="button" onClick={() => removeFile('frontSide')}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                                        <i className="pi pi-times"></i>
                                    </button>
                                    <p className="text-xs text-center text-red-600 mt-2">{newTemplate.frontSide?.name}</p>
                                </div>
                            ) : (
                                <label className="block text-center cursor-pointer py-6">
                                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                        onChange={(e) => handleFileSelect('frontSide', e)} className="hidden" />
                                    <i className="pi pi-cloud-upload text-2xl text-slate-400 mb-2 block"></i>
                                    <p className="text-sm text-slate-600">Click to upload front side</p>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Back Side */}
                    {newTemplate.templateType === 'two-sided' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                Back Side <span className="text-red-500">*</span>
                            </label>
                            <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${backPreview ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-red-400'
                                }`}>
                                {backPreview ? (
                                    <div className="relative">
                                        <img src={backPreview} alt="Back preview" className="max-h-32 mx-auto rounded-lg" />
                                        <button type="button" onClick={() => removeFile('backSide')}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                                            <i className="pi pi-times"></i>
                                        </button>
                                        <p className="text-xs text-center text-red-600 mt-2">{newTemplate.backSide?.name}</p>
                                    </div>
                                ) : (
                                    <label className="block text-center cursor-pointer py-6">
                                        <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                            onChange={(e) => handleFileSelect('backSide', e)} className="hidden" />
                                        <i className="pi pi-cloud-upload text-2xl text-slate-400 mb-2 block"></i>
                                        <p className="text-sm text-slate-600">Click to upload back side</p>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Set as Default */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={newTemplate.setAsDefault}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, setAsDefault: e.target.checked }))}
                            className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500" />
                        <span className="text-sm text-slate-700">Set as default template for this organization</span>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
                    <button onClick={onCancel}
                        className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-100">
                        Cancel
                    </button>
                    <button onClick={onSubmit}
                        disabled={uploading || !newTemplate.frontSide || (newTemplate.templateType === 'two-sided' && !newTemplate.backSide)}
                        className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 flex items-center space-x-2">
                        {uploading ? (
                            <><i className="pi pi-spinner pi-spin"></i><span>Uploading...</span></>
                        ) : (
                            <><i className="pi pi-upload"></i><span>Upload Template</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Templates;