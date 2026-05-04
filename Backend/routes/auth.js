const express = require('express');
const router = express.Router();
const User = require('../models/User');
const company = require('../models/Company');
const Company = require('../models/Company');
const RegistrationProgress = require('../models/RegistrationProgress');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendWelcomeEmail, sendNewRegistrationAlert, sendPasswordResetEmail } = require('../utilis/emailService');
const {
    uploadAvatar,
    uploadcompanyLogo,
    deleteImage
} = require('../utilis/cloudinaryAuth'); // New simple uploader

const { sendEmail } = require('../utilis/emailService'); // We'll create this
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================

// ✅ CHECK email availability (you already have this - keep it!)
router.get('/check-email/:email', async (req, res) => {
    try {
        const exists = await User.findOne({ email: req.params.email.toLowerCase() });
        res.json({
            available: !exists,
            message: exists ? 'Email already registered' : 'Email available'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//check Company name
router.get('/check-company/:name', async (req, res) => {
    try {
        const exists = await Company.findOne({
            name: { $regex: new RegExp(`^${req.params.name}$`, 'i') }
        });
        let suggestions = [];
        if (exists) {
            const baseName = req.params.name;
            suggestions = [
                `${baseName} Ltd`,
                `${baseName} Rwanda`,
                `${baseName} Solutions`,
                `${baseName} Services`
            ];
        }
        res.json({ available: !exists, suggestions: exists ? suggestions : [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================
// MULTI-STEP REGISTRATION (NEW Professional Flow)
// ============================================

// STEP 1: Save Personal Info
router.post('/register/step1/personal', async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request headers:', req.headers['content-type']);
        const { email, firstName, lastName, phoneNumber, password } = req.body;

        // Validate
        if (!email || !firstName || !lastName || !phoneNumber || !password) {
            console.log('All personal fields are required'); // Move this BEFORE the return
            return res.status(400).json({
                success: false,
                error: 'All personal fields are required'
            });
        }

        console.log('Received data:', { email, firstName, lastName, phoneNumber, password: '***' }); // Better logging

        // Check if email already registered
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Check password strength
        const passwordStrength = checkPasswordStrength(password);
        if (passwordStrength.score < 50) {
            return res.status(400).json({
                success: false,
                error: 'Password is too weak',
                strength: passwordStrength
            });
        }

        // Save/Update progress
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                step: 2,
                'data.personal': {
                    firstName,
                    lastName,
                    phoneNumber,
                    password: await bcrypt.hash(password, 10) // Hash immediately for security
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Personal info saved',
            nextStep: 'company',
            progressId: progress._id
        });

    } catch (error) {
        console.error('Step 1 error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// STEP 2: Save company Info (with Cloudinary for logo)
router.post('/register/step2/company',
    upload.single('logo'), // 👈 This handles the file upload
    async (req, res) => {
        try {
            console.log('📥 Step 2 - req.body:', req.body);
            console.log('📥 Step 2 - req.file:', req.file); // This contains the uploaded file

            // Extract fields from req.body
            const { email, companyName, companyType, companyEmail, companyPhone, province, district, sector, country } = req.body;

            // Handle address - it might be stringified or object
            const addressObj = {
                province: province || '',
                district: district || '',
                sector: sector || '',
                country: country || 'Rwanda'
            };

            console.log('📧 Email received:', email);

            // Validate required fields
            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            if (!companyName || !companyType || !companyPhone || !companyEmail) {
                return res.status(400).json({
                    success: false,
                    error: 'All company fields are required'
                });
            }

            // Check if company name exists
            const existingcompany = await company.findOne({
                name: { $regex: new RegExp(`^${companyName}$`, 'i') }
            });

            if (existingcompany) {
                return res.status(400).json({
                    success: false,
                    error: 'company name already registered'
                });
            }

            // Upload logo to Cloudinary if file was uploaded
            let logoData = {};
            if (req.file) {
                try {
                    // Convert buffer to base64 for Cloudinary
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

                    // Upload using your cloudinaryAuth utility
                    logoData = await uploadcompanyLogo(base64Image, `company_${Date.now()}`);
                    console.log('✅ Logo uploaded:', logoData.url);
                } catch (uploadError) {
                    console.error('Logo upload error:', uploadError);
                    // Continue without logo if upload fails
                }
            }

            // Update progress
            const progress = await RegistrationProgress.findOneAndUpdate(
                { email: email.toLowerCase() },
                {
                    step: 3,
                    'data.company': {
                        name: companyName,
                        type: companyType,
                        phone: companyPhone,
                        email: companyEmail,
                        address: addressObj,  // Save the complete address object
                        logo: logoData
                    }
                },
                { new: true, upsert: true }
            );

            if (!progress) {
                return res.status(404).json({
                    success: false,
                    error: 'Registration session not found. Please start over.'
                });
            }

            res.json({
                success: true,
                message: 'company info saved',
                nextStep: 'plan',
                progressId: progress._id,
                logoPreview: logoData.url
            });

        } catch (error) {
            console.error('Step 2 error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to save company info'
            });
        }
    }
);

// STEP 3: License Activation
router.post('/register/step3/license', async (req, res) => {
    try {
        const { email, licenseKey } = req.body;

        if (!licenseKey) {
            return res.status(400).json({
                success: false,
                error: 'License key is required'
            });
        }

        // Update progress
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                step: 4,
                'data.license': { licenseKey }
            },
            { new: true }
        );

        if (!progress) {
            return res.status(404).json({
                success: false,
                error: 'Registration session not found'
            });
        }

        res.json({
            success: true,
            message: 'License key saved',
            nextStep: 'complete'
        });

    } catch (error) {
        console.error('Step 3 error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// STEP 4: Complete Registration
router.post('/register/complete', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('📥 Complete registration for:', email);

        const progress = await RegistrationProgress.findOne({ email: email.toLowerCase() });

        if (!progress) {
            return res.status(404).json({
                success: false,
                error: 'Registration session not found'
            });
        }

        const { personal, company: companyData, license: licenseData } = progress.data;

        // Validate
        if (!personal) {
            return res.status(400).json({ success: false, error: 'Personal information is missing' });
        }
        if (!companyData) {
            return res.status(400).json({ success: false, error: 'Company information is missing' });
        }
        if (!licenseData?.licenseKey) {
            return res.status(400).json({ success: false, error: 'License key is missing' });
        }

        // Validate license key (super_admin creates these manually)
        // For now, accept any key and mark as pending activation
        const licenseStatus = 'pending'; // Super admin will activate manually

        // Generate unique username
        const cleanPhone = cleanPhoneNumber(personal.phoneNumber);
        const baseUsername = `${personal.firstName.toLowerCase()}.${personal.lastName.toLowerCase()}`;
        let username = baseUsername;
        let counter = 1;
        while (await User.findOne({ username })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        // Create Company
        const company = await Company.create({
            name: companyData.name,
            phone: companyData.phone,
            email: companyData.email,
            website: companyData.website,
            address: {
                province: companyData.address?.province || '',
                district: companyData.address?.district || '',
                sector: companyData.address?.sector || '',
                country: companyData.address?.country || 'Rwanda'
            },
            logo: companyData.logo || {},
            license: {
                key: licenseData.licenseKey,
                status: licenseStatus,
                issuedAt: null,
                expiresAt: null
            },
            adminId: null, // Will update after user creation
            isActive: false // Inactive until license validated
        });

        // Create User (Admin)
        const user = await User.create({
            firstName: personal.firstName,
            lastName: personal.lastName,
            username: username,
            email: email.toLowerCase(),
            phoneNumber: cleanPhone,
            password: personal.password,
            role: 'admin',
            companyId: company._id,
            avatar: {
                initials: `${personal.firstName[0]}${personal.lastName[0]}`.toUpperCase()
            },
            metadata: {
                registrationStep: 4,
                registrationCompleted: true
            },
            isEmailVerified: false,
            isActive: true
        });

        // Update company with adminId
        company.adminId = user._id;
        await company.save();

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, companyId: company._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send welcome email
        try {
            await sendWelcomeEmail(user, company);
            await sendNewRegistrationAlert(company, user); // Alerts all super admins

        } catch (emailErr) {
            console.error('Welcome email failed:', emailErr);
        }

        // Clean up
        await RegistrationProgress.deleteOne({ _id: progress._id });

        res.status(201).json({
            success: true,
            message: 'Registration completed! Awaiting license activation.',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                company: {
                    id: company._id,
                    name: company.name
                },
                licenseStatus
            },
            token,
            redirectTo: '/dashboard'
        });

    } catch (error) {
        console.error('❌ Complete registration error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================
// LOGIN (Enhanced with role-based redirect)
// ============================================

// routes/auth.js - COMPLETE LOGIN ROUTE with co-worker First Login Check
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for:', email);

        // Find user with populated company data
        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+password')
            .populate('companyId', 'name logo license');

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Your account has been deactivated. Contact support.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ Password mismatch for:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // ✅ CHECK FIRST LOGIN FOR co-worker ONLY
        const isFirstLogin = user.role === 'co-worker' && user.metadata?.needsPasswordChange === true;

        if (isFirstLogin) {
            console.log('⚠️ First login for co-worker user:', email, '- Will redirect to password change');
        }

        // Update last login
        await user.updateLastLogin(req.ip, req.get('User-Agent'));

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // ✅ Determine redirect based on role AND first login status
        let redirectTo = '/dashboard';

        if (user.role === 'super_admin') {
            redirectTo = '/super-admin/dashboard';
        } else if (user.role === 'admin') {
            redirectTo = '/dashboard';
        } else if (user.role === 'co-worker') {
            // ✅ co-worker: Redirect to settings/password change on first login
            if (isFirstLogin) {
                redirectTo = '/co-worker/settings?forcePasswordChange=true';
            } else {
                redirectTo = '/co-worker/dashboard';
            }
        }

        // Build user response with populated company data
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            role: user.role,
            initials: user.initials,
            avatar: user.avatar?.url || '',
            isActive: user.isActive,
            // company data (now populated)
            companyId: user.companyId ? {
                id: user.companyId._id,
                name: user.companyId.name,
                logo: user.companyId.logo?.url || null
            } : null,
            permissions: user.role === 'co-worker' ? user.permissions : undefined,
            // ✅ Add first login flag for frontend
            needsPasswordChange: user.role === 'co-worker' ? (user.metadata?.needsPasswordChange || false) : false
        };

        // Add subscription for admin users
        if (user.role === 'admin' && user.companyId) {
            userResponse.company = {
                id: user.companyId._id,
                name: user.companyId.name,
                licenseStatus: user.companyId.license?.status
            };
        }

        // Send response
        res.json({
            success: true,
            message: isFirstLogin ? 'First login! Please change your password.' : 'Login successful',
            token,
            redirectTo,
            user: userResponse,
            // ✅ Extra flag for frontend to show password change modal
            requiresPasswordChange: isFirstLogin
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during login'
        });
    }
});

// ============================================
// EMAIL VERIFICATION
// ============================================

router.get('/verify-email/:token', async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification token'
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully! You can now login.'
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Resend verification email
router.post('/resend-verification', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                error: 'Email already verified'
            });
        }

        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - CAP',
            template: 'verify-email',
            context: {
                name: user.firstName,
                verifyUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
            }
        });

        res.json({
            success: true,
            message: 'Verification email sent'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROFILE & USER MANAGEMENT
// ============================================

// Get Profile (enhanced with virtuals)
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('companyId')
            .select('-password');

        // Add computed properties
        const profileData = user.toObject();
        profileData.fullName = user.fullName;
        profileData.isSubscriptionActive = user.isSubscriptionActive;

        if (user.role === 'co-worker') {
            const creator = await User.findById(user.createdBy).select('firstName lastName');
            profileData.createdBy = creator ? `${creator.firstName} ${creator.lastName}` : null;
        }

        res.json({
            success: true,
            user: profileData
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Update Profile (enhanced with Cloudinary for avatar)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, username, phoneNumber, email, avatar } = req.body;

        // Check email uniqueness if provided
        if (email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user.id }
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists'
                });
            }
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (email) updateData.email = email.toLowerCase();

        // Handle avatar upload if provided
        if (avatar && avatar.startsWith('data:image')) {
            try {
                // Delete old avatar if exists
                if (req.user.avatar?.publicId) {
                    await deleteImage(req.user.avatar.publicId);
                }

                // Upload new avatar using the simple uploader
                const uploadResult = await uploadAvatar(avatar, req.user.id);

                updateData.avatar = {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId
                };
            } catch (uploadError) {
                console.error('Avatar upload error:', uploadError);
                // Don't fail the whole request if avatar upload fails
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password').populate('companyId');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                ...user.toObject(),
                fullName: user.fullName,
                initials: user.initials
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// routes/auth.js - Change Password Route
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword, isFirstLogin } = req.body;
        const user = await User.findById(req.userId).select('+password');

        // Handle first login (no current password required)
        if (isFirstLogin && user.metadata?.needsPasswordChange === true) {
            // Hash new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);

            // Clear the needsPasswordChange flag
            user.metadata.needsPasswordChange = false;
            await user.save();

            return res.json({
                success: true,
                message: 'Password set successfully'
            });
        }

        // Normal password change (requires current password)
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
});

// Get all users (for super_admin only)
router.get('/',
    authMiddleware,
    roleMiddleware(['super_admin']),
    async (req, res) => {
        try {
            const users = await User.find()
                .populate('companyId', 'name')
                .select('-password')
                .sort({ createdAt: -1 });

            // Add computed fields
            const enhancedUsers = users.map(user => ({
                ...user.toObject(),
                fullName: user.fullName,
                status: user.isActive ? 'active' : 'inactive'
            }));

            res.json({
                success: true,
                users: enhancedUsers,
                total: enhancedUsers.length
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Get users by company (for admin to see their co-worker)
router.get('/company/:companyId',
    authMiddleware,
    async (req, res) => {
        try {
            // Check if user has access to this company
            if (req.user.role !== 'super_admin' &&
                req.user.companyId.toString() !== req.params.companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            const users = await User.find({
                companyId: req.params.companyId,
                role: { $in: ['admin', 'co-worker'] }
            })
                .select('-password')
                .sort({ role: 1, createdAt: -1 });

            res.json({
                success: true,
                users,
                total: users.length
            });

        } catch (error) {
            console.error('Get company users error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);


// REQUEST password reset (user enters emails)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal that user doesn't exist (security)
            return res.json({
                success: true,
                message: 'If email exists, reset link will be sent'
            });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();
        await sendPasswordResetEmail(user, resetToken);
        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${user.email}`;


        // Password reset email
        await sendEmail({
            to: user.email,
            subject: '🔐 Reset Your CAP Password',
            template: 'password-reset',
            context: {
                firstName: user.firstName,
                resetUrl: `${FRONTEND_URL}/reset-password?token=${resetToken}`,
                expiryHours: 1,
                supportEmail: 'support@cap.com'
            }
        });
        res.json({
            success: true,
            message: 'Password reset email sent'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ACTUALLY reset password (when user clicks link)
router.post('/reset-password', async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

        // Hash the token (since we stored hashed version)
        const crypto = require('crypto');
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Optional: Send confirmation email
        await sendEmail({
            to: user.email,
            subject: '✅ Your Password Has Been Changed',
            template: 'password-changed', // You might want to create this
            context: {
                firstName: user.firstName,
                loginUrl: `${process.env.FRONTEND_URL}/login`,
                supportEmail: process.env.SUPPORT_EMAIL
            }
        });

        res.json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
















// ============================================
// HELPER FUNCTIONS
// ============================================

function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return { score: 0, strength: 'No password' };

    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    // No common patterns
    if (!/(123|abc|password|qwerty|admin)/i.test(password)) score += 10;

    const strength =
        score >= 90 ? 'Very Strong' :
            score >= 70 ? 'Strong' :
                score >= 50 ? 'Medium' :
                    score >= 25 ? 'Weak' : 'Very Weak';

    return { score, strength };
}

async function generateUniqueUsername(baseUsername) {
    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
}
const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    return digits;
};

module.exports = router;