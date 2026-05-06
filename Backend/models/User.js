// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // ===== BASIC INFO =====
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters'],
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters'],
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores and hyphens']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phoneNumber: {
        type: String,
        trim: true,
        set: function (v) {
            if (!v) return v;
            // Remove all non-digit characters
            const digits = v.replace(/\D/g, '');

            // Standardize to +250XXXXXXXXX format
            if (digits.length === 9 && digits[0] === '7') {
                return '+250' + digits;
            }
            if (digits.length === 12 && digits.startsWith('2507')) {
                return '+' + digits;
            }
            if (digits.length === 13 && digits.startsWith('2507')) {
                return '+' + digits;
            }
            // If already has +, keep as is
            if (v.startsWith('+') && digits.length === 13 && digits.startsWith('2507')) {
                return v.replace(/\s/g, '');
            }
            return v;
        },
        validate: {
            validator: function (v) {
                if (!v) return true;
                // Remove all non-digit characters for validation
                const digits = v.replace(/\D/g, '');

                // Valid Rwanda formats:
                //10 digits starting with 0 (e.g., 0788850304)
                if(digits.length === 10 && digits[0] === '0') return true;
                // 9 digits starting with 7 (e.g., 788123456)
                if (digits.length === 9 && digits[0] === '7') return true;
                // 12 digits starting with 2507 (e.g., 250788123456)
                if (digits.length === 12 && digits.startsWith('2507')) return true;
                // 13 digits starting with 2507 (e.g., 250788123456 with +)
                if (digits.length === 13 && digits.startsWith('2507')) return true;

                return false;
            },
            message: 'Please enter a valid Rwanda phone number (e.g., 0788123456, +250788123456)'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },

    // ===== AVATAR =====
    avatar: {
        url: { type: String, default: '' },
        publicId: String,
        initials: String
    },

    // ===== ROLE & ACCESS =====
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'co_worker'],
        default: 'co_worker',
        index: true
    },

    // ===== COMPANY ASSOCIATION =====

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: function () {
            if (this.role === 'super_admin') return false;
            // For admin/co_worker, only required AFTER registration is complete
            return this.metadata?.registrationCompleted === true;
        },
        index: true,
        validate: {
            validator: function (v) {
                // Super admin doesn't need companyId
                if (this.role === 'super_admin') return true;
                // During registration, allow null
                if (!this.metadata?.registrationCompleted) return true;
                // After registration, must have companyId
                return v != null;
            },
            message: 'Company ID is required for non-super admin users'
        }
    },

    // ===== CREATOR TRACKING =====
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.role === 'co_worker';
        },
        index: true
    },

    // ===== CO-WORKER PERMISSIONS (Organization-specific) =====
    permissions: [{
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true
        },
        organizationName: {
            type: String,
            required: true
        },
        canViewAnalytics: { type: Boolean, default: false },
        canGenerateCards: { type: Boolean, default: false },
        canManageStudents: { type: Boolean, default: false },
        canManageTemplates: { type: Boolean, default: false },
        canUploadCSV: { type: Boolean, default: false },
        canUploadPhotos: { type: Boolean, default: false },
        canViewAuditLogs: { type: Boolean, default: false }
    }],

    // ===== ACCOUNT STATUS =====
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // ===== PASSWORD RESET =====
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ===== LOGIN TRACKING =====
    lastLogin: {
        at: Date,
        ip: String,
        userAgent: String
    },
    loginHistory: [{
        at: Date,
        ip: String,
        userAgent: String,
        success: Boolean
    }],

    // ===== TWO FACTOR AUTH =====
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,

    // ===== PREFERENCES =====
    preferences: {
        language: { type: String, default: 'en', enum: ['en', 'fr'] },
        theme: { type: String, default: 'light', enum: ['light', 'dark', 'system'] },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        dashboardLayout: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },

    // ===== METADATA =====
    metadata: {
        registrationStep: { type: Number, default: 1 },
        registrationCompleted: { type: Boolean, default: false },
        needsPasswordChange: {
            type: Boolean,
            default: true,
            required: function () { return this.role === 'co_worker'; }
        },
        invitationToken: String,
        invitationExpires: Date,
        lastActive: Date,
        notes: String,
        tags: [String]
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== VIRTUAL PROPERTIES =====
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('initials').get(function () {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// ===== INDEXES =====
userSchema.index({ email: 1, role: 1 });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// ===== MIDDLEWARE =====
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    if (this.password && this.password.startsWith('$2b$')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.pre('save', function (next) {
    if (this.isModified('firstName') || this.isModified('lastName')) {
        this.avatar.initials = `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
    }
    next();
});

// ===== INSTANCE METHODS =====
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function (permission, organizationId = null) {
    if (this.role === 'super_admin') return true;
    if (this.role === 'admin') return true;

    if (this.role === 'co_worker' && organizationId) {
        const orgPerm = this.permissions.find(
            p => p.organizationId.toString() === organizationId.toString()
        );
        return orgPerm ? orgPerm[permission] === true : false;
    }

    return false;
};

userSchema.methods.getPermissionsForOrg = function (organizationId) {
    if (this.role === 'super_admin' || this.role === 'admin') {
        return {
            canViewAnalytics: true,
            canGenerateCards: true,
            canManageStudents: true,
            canManageTemplates: true,
            canUploadCSV: true,
            canUploadPhotos: true,
            canViewAuditLogs: true
        };
    }

    return this.permissions.find(
        p => p.organizationId.toString() === organizationId.toString()
    ) || null;
};

userSchema.methods.updateLastLogin = async function (ip, userAgent) {
    this.lastLogin = { at: new Date(), ip, userAgent };
    this.loginHistory.push({ at: new Date(), ip, userAgent, success: true });
    if (this.loginHistory.length > 50) {
        this.loginHistory = this.loginHistory.slice(-50);
    }
    await this.save();
};

userSchema.methods.generateEmailVerificationToken = function () {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    return token;
};

userSchema.methods.generatePasswordResetToken = function () {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    return token;
};

// ===== STATIC METHODS =====
userSchema.statics.findByCompany = function (companyId, role = null) {
    const query = { companyId, isActive: true };
    if (role) query.role = role;
    return this.find(query).select('-password');
};

userSchema.statics.getWithCompany = function (userId) {
    return this.findById(userId)
        .populate('companyId')
        .select('-password');
};

userSchema.statics.getDashboardData = async function (userId) {
    const user = await this.findById(userId)
        .populate('companyId')
        .select('-password');

    if (!user) return null;

    const dashboardData = {
        user: {
            id: user._id,
            name: user.fullName,
            role: user.role,
            initials: user.initials,
            avatar: user.avatar.url
        }
    };

    if (user.role === 'admin' && user.companyId) {
        const Student = mongoose.model('Student');
        const School = mongoose.model('School');
        const User = mongoose.model('User');

        const [orgCount, studentCount, staffCount] = await Promise.all([
            School.countDocuments({ companyId: user.companyId }),
            Student.countDocuments({ companyId: user.companyId }),
            User.countDocuments({ companyId: user.companyId, role: 'co_worker' })
        ]);

        dashboardData.company = {
            id: user.companyId._id,
            name: user.companyId.name,
            license: user.companyId.license,
            stats: {
                organizations: orgCount,
                students: studentCount,
                staff: staffCount
            }
        };
    }

    if (user.role === 'co_worker') {
        dashboardData.permissions = user.permissions;
        dashboardData.company = {
            id: user.companyId?._id,
            name: user.companyId?.name
        };
    }

    return dashboardData;
};

module.exports = mongoose.model('User', userSchema);