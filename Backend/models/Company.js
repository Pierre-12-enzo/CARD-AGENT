// models/Company.js
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
    website: String,

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

    // License
    license: {
        key: { type: String, unique: true, sparse: true },
        status: {
            type: String,
            enum: ['pending', 'active', 'revoked', 'expired'],
            default: 'pending'
        },
        issuedAt: Date,
        expiresAt: Date,
        maxOrganizations: { type: Number, default: 10 },
        maxCardsPerMonth: { type: Number, default: 5000 },
        features: [String]
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

// Generate registration number before save
companySchema.pre('save', async function(next) {
    if (!this.registrationNumber) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('Company').countDocuments();
        this.registrationNumber = `CMP-${year}-${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

// Virtual for full address
companySchema.virtual('fullAddress').get(function() {
    const parts = [this.address.sector, this.address.district, this.address.province];
    parts.push(this.address.country);
    return parts.join(', ');
});

module.exports = mongoose.model('Company', companySchema);

