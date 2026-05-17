// models/Company.js - COMPLETE & OPTIMIZED
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Company name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Company name must be at least 2 characters'],
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    registrationNumber: {
        type: String,
        unique: true,
        sparse: true
    },

    // Contact Information
    phone: {
        type: String,
        required: [true, 'Company phone is required']
    },
    email: {
        type: String,
        required: [true, 'Company email is required'],
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: {
        type: String,
        default: ''
    },

    // Address
    address: {
        province: { type: String, required: true },
        district: { type: String, required: true },
        sector: { type: String, required: true },
        country: { type: String, default: 'Rwanda' }
    },

    // Branding
    logo: {
        url: { type: String, default: '' },
        publicId: String
    },

    // License - Fixed with partial unique index
    license: {
        key: {
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'revoked', 'expired'],
            default: 'pending'
        },
        issuedAt: Date,
        expiresAt: Date,
        maxOrganizations: { type: Number, default: 10 },
        maxCardsPerMonth: { type: Number, default: 5000 },
        features: {
            type: [String],
            default: ['basic']
        }
    },

    // Owner
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Settings
    settings: {
        timezone: { type: String, default: 'Africa/Kigali' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        language: { type: String, enum: ['en', 'fr'], default: 'en' },
        cardDefaults: {
            prefix: { type: String, default: 'CARD' },
            expiryPeriod: { type: Number, default: 365 }
        }
    },

    // Stats
    stats: {
        totalOrganizations: { type: Number, default: 0 },
        totalStudents: { type: Number, default: 0 },
        totalCards: { type: Number, default: 0 },
        totalStaff: { type: Number, default: 0 }
    },

    isActive: { type: Boolean, default: false },
    verifiedAt: Date

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== INDEXES ====================

// ✅ Partial unique index for license keys (only applies when key is not null)
companySchema.index(
    { 'license.key': 1 },
    {
        unique: true,
        partialFilterExpression: { 'license.key': { $exists: true, $ne: null } },
        sparse: true,
        name: 'unique_license_key_idx'
    }
);

// Company name index
companySchema.index({ name: 1 });

// Admin ID index (already has index: true, but explicitly define for clarity)
companySchema.index({ adminId: 1 }, { name: 'admin_id_idx' });

// Status + Active combo index for filtering
companySchema.index({ isActive: 1, 'license.status': 1 }, { name: 'active_license_status_idx' });

// Registration number index
companySchema.index({ registrationNumber: 1 }, { unique: true, sparse: true, name: 'reg_number_idx' });

// ==================== MIDDLEWARE ====================

// Generate registration number before save
companySchema.pre('save', async function (next) {
    if (!this.registrationNumber) {
        try {
            const year = new Date().getFullYear();
            const count = await mongoose.model('Company').countDocuments();
            this.registrationNumber = `CMP-${year}-${(count + 1).toString().padStart(4, '0')}`;
        } catch (error) {
            console.error('Error generating registration number:', error);
            // Fallback registration number
            this.registrationNumber = `CMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        }
    }
    next();
});

// Auto-update timestamps for license status changes
companySchema.pre('save', function (next) {
    if (this.isModified('license.status')) {
        if (this.license.status === 'active' && !this.license.issuedAt) {
            this.license.issuedAt = new Date();
            this.isActive = true;
        }
        if (this.license.status === 'revoked') {
            this.isActive = false;
        }
    }
    next();
});

// ==================== VIRTUALS ====================

// Full address virtual
companySchema.virtual('fullAddress').get(function () {
    const parts = [this.address.sector, this.address.district, this.address.province];
    parts.push(this.address.country);
    return parts.join(', ');
});

// License status display
companySchema.virtual('licenseStatusDisplay').get(function () {
    const statusMap = {
        pending: '⏳ Pending Activation',
        active: '✅ Active',
        revoked: '❌ Revoked',
        expired: '⚠️ Expired'
    };
    return statusMap[this.license.status] || this.license.status;
});

// Company age (days since creation)
companySchema.virtual('ageDays').get(function () {
    if (!this.createdAt) return 0;
    const diff = Date.now() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// License remaining days
companySchema.virtual('licenseRemainingDays').get(function () {
    if (!this.license.expiresAt || this.license.status !== 'active') return 0;
    const diff = this.license.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
});

// ==================== INSTANCE METHODS ====================

// Check if license is valid
companySchema.methods.isLicenseValid = function () {
    if (this.license.status !== 'active') return false;
    if (this.license.expiresAt && this.license.expiresAt < new Date()) return false;
    return true;
};

// Activate license
companySchema.methods.activateLicense = async function (licenseKey) {
    this.license.key = licenseKey;
    this.license.status = 'active';
    this.license.issuedAt = new Date();
    this.isActive = true;
    await this.save();
    return this;
};

// Revoke license
companySchema.methods.revokeLicense = async function (reason = '') {
    this.license.status = 'revoked';
    this.isActive = false;
    await this.save();
    return this;
};

// Update stats
companySchema.methods.updateStats = async function () {
    const School = mongoose.model('School');
    const Student = mongoose.model('Student');
    const User = mongoose.model('User');

    const [orgCount, studentCount, staffCount, cardCount] = await Promise.all([
        School.countDocuments({ companyId: this._id }),
        Student.countDocuments({ companyId: this._id }),
        User.countDocuments({ companyId: this._id, role: 'co_worker' }),
        Student.countDocuments({ companyId: this._id, card_generated: true })
    ]);

    this.stats = {
        totalOrganizations: orgCount,
        totalStudents: studentCount,
        totalStaff: staffCount,
        totalCards: cardCount
    };

    await this.save();
    return this.stats;
};

// ==================== STATIC METHODS ====================

// Find company by license key
companySchema.statics.findByLicenseKey = function (licenseKey) {
    return this.findOne({ 'license.key': licenseKey });
};

// Get all pending companies
companySchema.statics.getPendingCompanies = function () {
    return this.find({ 'license.status': 'pending', isActive: false })
        .populate('adminId', 'firstName lastName email')
        .sort({ createdAt: -1 });
};

// Get companies needing attention (expiring soon, expired, etc.)
companySchema.statics.getCompaniesNeedingAttention = function () {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.find({
        $or: [
            { 'license.status': 'pending' },
            { 'license.status': 'expired' },
            {
                'license.status': 'active',
                'license.expiresAt': { $lt: thirtyDaysFromNow }
            }
        ]
    }).populate('adminId', 'firstName lastName email');
};

// Get dashboard stats for super admin
companySchema.statics.getSuperAdminStats = async function () {
    const stats = await this.aggregate([
        {
            $facet: {
                totalCompanies: [{ $count: 'count' }],
                activeCompanies: [
                    { $match: { isActive: true, 'license.status': 'active' } },
                    { $count: 'count' }
                ],
                pendingCompanies: [
                    { $match: { 'license.status': 'pending' } },
                    { $count: 'count' }
                ],
                revokedCompanies: [
                    { $match: { 'license.status': 'revoked' } },
                    { $count: 'count' }
                ],
                byPlan: [
                    { $group: { _id: '$license.features', count: { $sum: 1 } } }
                ]
            }
        }
    ]);

    return {
        total: stats[0]?.totalCompanies[0]?.count || 0,
        active: stats[0]?.activeCompanies[0]?.count || 0,
        pending: stats[0]?.pendingCompanies[0]?.count || 0,
        revoked: stats[0]?.revokedCompanies[0]?.count || 0,
        byPlan: stats[0]?.byPlan || []
    };
};

module.exports = mongoose.model('Company', companySchema);