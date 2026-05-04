// models/School.js
const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Organization name is required'],
        trim: true,
        minlength: [3, 'Organization name must be at least 3 characters'],
        maxlength: [100, 'Organization name cannot exceed 100 characters']
    },
    code: {
        type: String,
        unique: true,
        sparse: true
    },

    // Organization type
    type: {
        type: String,
        enum: ['secondary', 'primary', 'tvet', 'university', 'corporate', 'other'],
        default: 'secondary'
    },

    // Level (for schools)
    level: {
        type: String,
        enum: ['o_level', 'a_level', 'tvet', 'mixed', 'n_a'],
        default: 'n_a'
    },

    // Contact Information
    phone: {
        type: String,
        required: [true, 'Organization phone is required']
    },
    email: {
        type: String,
        required: [true, 'Organization email is required'],
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: String,

    // Address
    address: {
        province: { type: String, required: true },
        district: { type: String, required: true },
        sector: { type: String },
        country: { type: String, default: 'Rwanda' }
    },

    // Branding
    logo: {
        url: { type: String, default: '' },
        publicId: String
    },

    // Parent Company (who manages this organization)
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // Created by (admin or staff who added this org)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Settings
    settings: {
        timezone: { type: String, default: 'Africa/Kigali' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        language: { type: String, enum: ['en', 'fr'], default: 'en' },
        cardDefaults: {
            template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
            prefix: { type: String, default: 'STD' },
            expiryPeriod: { type: Number, default: 365 }
        }
    },

    // Stats
    stats: {
        totalStudents: { type: Number, default: 0 },
        totalCards: { type: Number, default: 0 },
        totalTemplates: { type: Number, default: 0 },
        lastStudentAdded: Date,
        lastCardGenerated: Date
    },

    isActive: { type: Boolean, default: true }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Generate code before save
schoolSchema.pre('save', async function (next) {
    if (!this.code) {
        const prefix = this.type === 'corporate' ? 'ORG' : 'SCH';
        const year = new Date().getFullYear();
        const count = await mongoose.model('School').countDocuments();
        this.code = `${prefix}-${year}-${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

// Virtual for full address
schoolSchema.virtual('fullAddress').get(function () {
    const parts = [this.address.sector, this.address.district, this.address.province];
    parts.push(this.address.country);
    return parts.join(', ');
});

// Index for unique name per company
schoolSchema.index({ name: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('School', schoolSchema);