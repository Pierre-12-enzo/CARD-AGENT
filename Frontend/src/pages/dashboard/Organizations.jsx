// pages/dashboard/Organizations.jsx - CARD-AGENT NAVY & CRIMSON
import React, { useState, useEffect, useRef } from 'react';
import { organizationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Organizations = () => {
  const { user } = useAuth();
  
  // ==================== STATE ====================
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, schools: 0, corporate: 0, totalPeople: 0 });
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [viewingOrg, setViewingOrg] = useState(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Form
  const [formData, setFormData] = useState({
    name: '', type: 'secondary', level: 'mixed',
    phone: '', email: '', website: '',
    province: '', district: '', sector: '', country: 'Rwanda',
    logo: null, logoPreview: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  // ==================== LOAD DATA ====================
  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [searchTerm, typeFilter, organizations]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const response = await organizationAPI.getAll({ limit: 100 });
      if (response.success) {
        const orgs = response.organizations || [];
        setOrganizations(orgs);
        
        // Calculate stats
        const schools = orgs.filter(o => o.type !== 'corporate').length;
        const corporate = orgs.filter(o => o.type === 'corporate').length;
        const totalPeople = orgs.reduce((sum, o) => sum + (o.stats?.total || 0), 0);
        setStats({ total: orgs.length, schools, corporate, totalPeople });
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = organizations;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.name?.toLowerCase().includes(term) ||
        o.code?.toLowerCase().includes(term) ||
        o.email?.toLowerCase().includes(term)
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(o => o.type === typeFilter);
    }
    
    setFilteredOrgs(filtered);
  };

  // ==================== FORM HANDLERS ====================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, logo: 'Logo must be less than 2MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logo: file, logoPreview: reader.result }));
    };
    reader.readAsDataURL(file);
    setFormErrors(prev => ({ ...prev, logo: '' }));
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo: null, logoPreview: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Organization name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.province.trim()) errors.province = 'Province is required';
    if (!formData.district.trim()) errors.district = 'District is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('type', formData.type);
      submitData.append('level', formData.type === 'corporate' ? 'n_a' : formData.level);
      submitData.append('phone', formData.phone);
      submitData.append('email', formData.email);
      submitData.append('website', formData.website);
      submitData.append('province', formData.province);
      submitData.append('district', formData.district);
      submitData.append('sector', formData.sector);
      submitData.append('country', formData.country);
      if (formData.logo instanceof File) submitData.append('logo', formData.logo);

      if (editingOrg) {
        await organizationAPI.update(editingOrg._id, submitData);
      } else {
        await organizationAPI.create(submitData);
      }
      
      resetForm();
      loadOrganizations();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name || '',
      type: org.type || 'secondary',
      level: org.level || 'mixed',
      phone: org.phone || '',
      email: org.email || '',
      website: org.website || '',
      province: org.address?.province || '',
      district: org.address?.district || '',
      sector: org.address?.sector || '',
      country: org.address?.country || 'Rwanda',
      logo: null,
      logoPreview: org.logo?.url || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (org) => {
    const hasPeople = (org.stats?.total || org.stats?.totalPeople || 0) > 0;
    if (hasPeople) {
      if (!confirm(`"${org.name}" has ${org.stats?.total || org.stats?.totalPeople} records. Deactivate instead?`)) return;
      try {
        await organizationAPI.delete(org._id);
        loadOrganizations();
      } catch (error) {
        alert('Failed to delete: ' + error.message);
      }
    } else {
      if (!confirm(`Permanently delete "${org.name}"?`)) return;
      try {
        await organizationAPI.delete(org._id);
        loadOrganizations();
      } catch (error) {
        alert('Failed to delete: ' + error.message);
      }
    }
    setShowDeleteConfirm(null);
  };

  const handleViewDetails = async (org) => {
    try {
      const response = await organizationAPI.getById(org._id);
      if (response.success) {
        setViewingOrg(response.organization);
      }
    } catch (error) {
      console.error('Failed to load details:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'secondary', level: 'mixed',
      phone: '', email: '', website: '',
      province: '', district: '', sector: '', country: 'Rwanda',
      logo: null, logoPreview: ''
    });
    setFormErrors({});
    setEditingOrg(null);
    setShowAddModal(false);
  };

  const getTypeIcon = (type) => {
    const icons = { secondary: '🏫', primary: '🎒', tvet: '🔧', university: '🎓', corporate: '🏢', other: '📋' };
    return icons[type] || '📋';
  };

  const getTypeLabel = (type) => {
    const labels = { secondary: 'Secondary School', primary: 'Primary School', tvet: 'TVET', university: 'University', corporate: 'Corporate', other: 'Other' };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      secondary: 'bg-blue-100 text-blue-700 border-blue-200',
      primary: 'bg-green-100 text-green-700 border-green-200',
      tvet: 'bg-amber-100 text-amber-700 border-amber-200',
      university: 'bg-purple-100 text-purple-700 border-purple-200',
      corporate: 'bg-slate-100 text-slate-700 border-slate-200',
      other: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-red-600 bg-clip-text text-transparent">
            Organizations
          </h2>
          <p className="text-slate-500 mt-1">
            Manage your client schools and companies
          </p>
        </div>
        <button
          onClick={() => { setEditingOrg(null); resetForm(); setShowAddModal(true); }}
          className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
        >
          <i className="pi pi-plus"></i>
          <span>Add Organization</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="pi pi-building" label="Total" value={stats.total} gradient="from-slate-700 to-slate-800" />
        <StatCard icon="pi pi-graduation-cap" label="Schools" value={stats.schools} gradient="from-red-600 to-red-500" />
        <StatCard icon="pi pi-briefcase" label="Corporate" value={stats.corporate} gradient="from-slate-800 to-slate-700" />
        <StatCard icon="pi pi-users" label="Total People" value={stats.totalPeople} gradient="from-red-700 to-red-600" />
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search organizations by name, code, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-800"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Types</option>
            <option value="secondary">Secondary Schools</option>
            <option value="primary">Primary Schools</option>
            <option value="tvet">TVET Schools</option>
            <option value="university">Universities</option>
            <option value="corporate">Corporate</option>
            <option value="other">Other</option>
          </select>
        </div>
        {(searchTerm || typeFilter !== 'all') && (
          <div className="mt-3 text-sm text-slate-500">
            <i className="pi pi-info-circle mr-1 text-red-500"></i>
            Found <span className="font-semibold text-slate-700">{filteredOrgs.length}</span> organizations
          </div>
        )}
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredOrgs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => (
            <div key={org._id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/50 hover:shadow-xl hover:border-red-200 transition-all duration-300 overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl overflow-hidden border border-slate-200">
                      {org.logo ? (
                        <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        getTypeIcon(org.type)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 truncate text-sm">{org.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTypeColor(org.type)}`}>
                        {getTypeLabel(org.type)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                    {org.code}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="px-5 pb-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-slate-800">{org.stats?.total || org.stats?.totalPeople || 0}</p>
                    <p className="text-xs text-slate-500">People</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-red-600">{org.stats?.cardsGenerated || 0}</p>
                    <p className="text-xs text-slate-500">Cards</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-slate-800">{org.stats?.templates || 0}</p>
                    <p className="text-xs text-slate-500">Templates</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 pb-4 pt-1 flex justify-end space-x-1 border-t border-slate-100">
                <button
                  onClick={() => handleViewDetails(org)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="View Details"
                >
                  <i className="pi pi-eye text-sm"></i>
                </button>
                <button
                  onClick={() => handleEdit(org)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <i className="pi pi-pencil text-sm"></i>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(org)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <i className="pi pi-trash text-sm"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-slate-200/50">
          <i className="pi pi-building text-5xl text-slate-300 mb-4 block"></i>
          <p className="text-slate-500 text-lg font-medium">No organizations found</p>
          <p className="text-slate-400 text-sm mt-1">
            {searchTerm || typeFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first client organization'}
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">
                {editingOrg ? 'Edit Organization' : 'Add Organization'}
              </h3>
              <button onClick={resetForm} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <i className="pi pi-times text-slate-600"></i>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-5 space-y-5">
              {/* Type & Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                    <option value="secondary">Secondary School</option>
                    <option value="primary">Primary School</option>
                    <option value="tvet">TVET School</option>
                    <option value="university">University</option>
                    <option value="corporate">Corporate / Organization</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {formData.type !== 'corporate' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Level</label>
                    <select name="level" value={formData.level} onChange={handleInputChange}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                      <option value="mixed">Mixed (O & A Level)</option>
                      <option value="o_level">O-Level Only</option>
                      <option value="a_level">A-Level Only</option>
                      <option value="tvet">TVET</option>
                      <option value="primary">Primary</option>
                      <option value="n_a">N/A</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Organization Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm ${formErrors.name ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-red-500`}
                  placeholder="e.g., Lycée de Kigali" />
                {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm ${formErrors.phone ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-red-500`}
                    placeholder="+250 788 123 456" />
                  {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm ${formErrors.email ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-red-500`}
                    placeholder="info@school.edu" />
                  {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Website (Optional)</label>
                <input type="url" name="website" value={formData.website} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  placeholder="https://www.example.com" />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Address</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Province *</label>
                    <input type="text" name="province" value={formData.province} onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm ${formErrors.province ? 'border-red-300' : 'border-slate-300'}`}
                      placeholder="Kigali City" />
                    {formErrors.province && <p className="mt-1 text-xs text-red-500">{formErrors.province}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">District *</label>
                    <input type="text" name="district" value={formData.district} onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm ${formErrors.district ? 'border-red-300' : 'border-slate-300'}`}
                      placeholder="Gasabo" />
                    {formErrors.district && <p className="mt-1 text-xs text-red-500">{formErrors.district}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Sector</label>
                    <input type="text" name="sector" value={formData.sector} onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                      placeholder="Kimihurura" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Country</label>
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                      placeholder="Rwanda" />
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Logo (Optional)</label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                    {formData.logoPreview ? (
                      <img src={formData.logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <i className="pi pi-image text-slate-400 text-xl"></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleLogoSelect}
                      className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                    {formErrors.logo && <p className="mt-1 text-xs text-red-500">{formErrors.logo}</p>}
                    {formData.logoPreview && (
                      <button onClick={removeLogo} className="mt-1 text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
              <button onClick={resetForm}
                className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-600 disabled:opacity-50 flex items-center space-x-2">
                {saving && <i className="pi pi-spinner pi-spin"></i>}
                <span>{editingOrg ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="pi pi-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Organization?</h3>
              <p className="text-slate-500 text-sm mb-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{showDeleteConfirm.name}"</span>?
              </p>
              {(showDeleteConfirm.stats?.total || showDeleteConfirm.stats?.totalPeople || 0) > 0 && (
                <p className="text-amber-600 text-sm bg-amber-50 rounded-lg p-2 mt-2">
                  This organization has {showDeleteConfirm.stats?.total || showDeleteConfirm.stats?.totalPeople} records. It will be soft-deleted.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingOrg(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl border border-slate-200">
                  {viewingOrg.logo?.url ? <img src={viewingOrg.logo.url} className="w-full h-full object-cover rounded-xl" /> : getTypeIcon(viewingOrg.type)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{viewingOrg.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTypeColor(viewingOrg.type)}`}>
                    {getTypeLabel(viewingOrg.type)}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingOrg(null)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <i className="pi pi-times"></i>
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto max-h-[calc(85vh-80px)]">
              <DetailRow icon="pi pi-tag" label="Code" value={viewingOrg.code} />
              <DetailRow icon="pi pi-phone" label="Phone" value={viewingOrg.phone} />
              <DetailRow icon="pi pi-envelope" label="Email" value={viewingOrg.email} />
              {viewingOrg.website && <DetailRow icon="pi pi-globe" label="Website" value={viewingOrg.website} />}
              <DetailRow icon="pi pi-map-marker" label="Address"
                value={`${viewingOrg.address?.sector || ''}, ${viewingOrg.address?.district || ''}, ${viewingOrg.address?.province || ''}`} />
              
              <div className="border-t border-slate-200 pt-3 mt-3">
                <h4 className="font-semibold text-slate-700 mb-2">Statistics</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-slate-800">{viewingOrg.stats?.students || 0}</p>
                    <p className="text-xs text-slate-500">Students</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-slate-800">{viewingOrg.stats?.employees || 0}</p>
                    <p className="text-xs text-slate-500">Employees</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-red-600">{viewingOrg.stats?.cardsGenerated || 0}</p>
                    <p className="text-xs text-slate-500">Cards</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== SUB-COMPONENTS =====

const StatCard = ({ icon, label, value, gradient }) => (
  <div className="bg-white rounded-xl shadow border border-slate-200/50 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center`}>
        <i className={`${icon} text-white text-sm`}></i>
      </div>
    </div>
  </div>
);

const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-start space-x-3">
    <i className={`${icon} text-slate-400 mt-0.5`}></i>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || 'N/A'}</p>
    </div>
  </div>
);

export default Organizations;
