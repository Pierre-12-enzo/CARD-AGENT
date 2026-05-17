const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const RegistrationProgress = require('../models/RegistrationProgress');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
    sendWelcomeEmail,
    sendNewRegistrationAlert,
    sendPasswordResetEmail
} = require('../utilis/emailService');
const {
    uploadAvatar,
    uploadCompanyLogo,
    deleteImage
} = require('../utilis/cloudinaryAuth');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================
// PUBLIC ROUTES
// ============================================

// Check email availability
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

// Check company name availability
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

// Resume registration progress
router.get('/register/resume/:email', async (req, res) => {
    try {
        const progress = await RegistrationProgress.findOne({
            email: req.params.email.toLowerCase()
        });

        if (!progress) {
            return res.json({ success: false, progress: null });
        }

        res.json({
            success: true,
            progress: {
                _id: progress._id,
                email: progress.email,
                step: progress.step,
                data: progress.data
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save registration progress
router.post('/register/save-progress', async (req, res) => {
    try {
        const { email, step, data } = req.body;
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: email.toLowerCase() },
            { step, data },
            { upsert: true, new: true }
        );
        res.json({ success: true, progressId: progress._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MULTI-STEP REGISTRATION
// ============================================

// STEP 1: Personal Info
router.post('/register/step1/personal', async (req, res) => {
    try {
        const { email, firstName, lastName, phoneNumber, password } = req.body;

        if (!email || !firstName || !lastName || !phoneNumber || !password) {
            return res.status(400).json({
                success: false,
                error: 'All personal fields are required'
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        const passwordStrength = checkPasswordStrength(password);
        if (passwordStrength.score < 50) {
            return res.status(400).json({
                success: false,
                error: 'Password is too weak',
                strength: passwordStrength
            });
        }

        // ✅ Store plain password (will be hashed by User model when created)
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                step: 2,
                'data.personal': {
                    firstName,
                    lastName,
                    phoneNumber,
                    password: password  // Plain password, not hashed!
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

// STEP 2: Company Info - CREATE USER FIRST, THEN COMPANY
// STEP 2: Company Info - FIXED (Create user first, then company)
router.post('/register/step2/company',
    upload.single('logo'),
    async (req, res) => {
        try {
            console.log('📥 Step 2 - Starting...');

            // Extract email - handle both formats
            let email = req.body.email;
            if (Array.isArray(email)) email = email[0];
            if (!email && req.body.regEmail) email = req.body.regEmail;
            email = String(email).toLowerCase();

            const companyName = req.body.name || req.body.companyName;
            const companyPhone = req.body.phone || req.body.companyPhone;
            const companyEmail = req.body.companyEmail || email;

            console.log(`📝 Processing registration for: ${email}`);
            console.log(`🏢 Company: ${companyName}`);

            if (!email || !companyName || !companyPhone || !companyEmail) {
                return res.status(400).json({
                    success: false,
                    error: 'Email, company name, phone, and email are required'
                });
            }

            // Get personal data from progress
            const progress = await RegistrationProgress.findOne({ email });
            if (!progress || !progress.data?.personal) {
                return res.status(404).json({
                    success: false,
                    error: 'Personal information not found. Please complete step 1 first.'
                });
            }

            const personal = progress.data.personal;

            // Check if company name exists
            const existingCompany = await Company.findOne({
                name: { $regex: new RegExp(`^${companyName}$`, 'i') }
            });
            if (existingCompany) {
                return res.status(400).json({
                    success: false,
                    error: 'Company name already registered'
                });
            }

            // Upload logo
            let logoData = {};
            if (req.file) {
                try {
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                    logoData = await uploadCompanyLogo(base64Image, `company_${Date.now()}`);
                    console.log('✅ Logo uploaded');
                } catch (uploadError) {
                    console.error('Logo upload error:', uploadError);
                }
            }

            // ✅ Generate username
            const baseUsername = `${personal.firstName.toLowerCase()}.${personal.lastName.toLowerCase()}`;
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            // ✅ Clean phone number
            const cleanPhone = personal.phoneNumber?.replace(/\D/g, '') || '';

            // ========== 1️⃣ CREATE USER FIRST ==========
            const user = await User.create({
                firstName: personal.firstName,
                lastName: personal.lastName,
                username,
                email,
                phoneNumber: cleanPhone,
                password: personal.password,  // Plain password - will be hashed by model
                role: 'admin',
                companyId: null,  // Will update after company creation
                avatar: {
                    initials: `${personal.firstName[0]}${personal.lastName[0]}`.toUpperCase()
                },
                metadata: {
                    registrationStep: 2,
                    registrationCompleted: false
                },
                isEmailVerified: false,
                isActive: true
            });
            console.log('✅ User created:', user.email, 'ID:', user._id);

            // ========== 2️⃣ CREATE COMPANY WITH USER ID ==========
            const company = await Company.create({
                name: companyName,
                phone: companyPhone,
                email: companyEmail.toLowerCase(),
                website: req.body.website || '',
                address: {
                    province: req.body.province || '',
                    district: req.body.district || '',
                    sector: req.body.sector || '',
                    country: req.body.country || 'Rwanda'
                },
                logo: logoData,
                adminId: user._id,  // ✅ Now we have the user ID!
                license: {
                    key: null,
                    status: 'pending',
                    issuedAt: null,
                    expiresAt: null,
                    maxOrganizations: 10,
                    maxCardsPerMonth: 5000
                },
                isActive: false
            });
            console.log('✅ Company created:', company._id);

            // ========== 3️⃣ UPDATE USER WITH COMPANY ID ==========
            user.companyId = company._id;
            await user.save();
            console.log('✅ User linked to company');

            // ========== 4️⃣ UPDATE PROGRESS ==========
            progress.step = 3;
            progress.data.company = {
                name: companyName,
                phone: companyPhone,
                email: companyEmail,
                website: req.body.website || '',
                address: {
                    province: req.body.province || '',
                    district: req.body.district || '',
                    sector: req.body.sector || '',
                    country: req.body.country || 'Rwanda'
                },
                logo: logoData
            };
            await progress.save();

            // ========== 5️⃣ SEND ALERT TO SUPER ADMINS ==========
            sendNewRegistrationAlert(company, user).catch(err => {
                console.error('Admin alert failed:', err);
            });

            // 🔥 EMIT REAL-TIME NOTIFICATION TO SUPER ADMINS
            try {
                const socketService = require('../services/socketService');
                socketService.emitToRole('super_admin', 'company:new-registration', {
                    companyName: company.name,
                    adminName: `${user.firstName} ${user.lastName}`,
                    adminEmail: user.email,
                    companyPhone: company.phone,
                    companyId: company._id,
                    timestamp: new Date().toISOString()
                });
                console.log('📡 Real-time alert sent to super admins');
            } catch (socketErr) {
                console.error('Socket emission failed:', socketErr);
            }

            res.json({
                success: true,
                message: 'Company registered! Now enter your license key.',
                nextStep: 'license',
                progressId: progress._id,
                logoPreview: logoData.url,
                companyId: company._id
            });

        } catch (error) {
            console.error('❌ Step 2 error:', error);

            // Clean up if something failed
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    error: 'Email or company name already exists'
                });
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to save company info'
            });
        }
    }
);

// STEP 3: License Key
router.post('/register/step3/license', async (req, res) => {
    try {
        const { email, licenseKey } = req.body;

        if (!licenseKey) {
            return res.status(400).json({
                success: false,
                error: 'License key is required'
            });
        }

        const emailStr = String(email).toLowerCase();
        const formattedKey = licenseKey.trim().toUpperCase();

        // Find user and update company license key
        const user = await User.findOne({ email: emailStr });
        if (user && user.companyId) {
            const company = await Company.findById(user.companyId);
            if (company) {
                company.license.key = formattedKey;
                await company.save();
                console.log('✅ License key saved:', formattedKey);
            }
        }

        // Update progress
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: emailStr },
            {
                step: 4,
                'data.license': { licenseKey: formattedKey }
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


// STEP 4: Complete Registration - Just finalize
router.post('/register/complete', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('📥 Complete registration for:', email);

        const emailStr = String(email).toLowerCase();
        const user = await User.findOne({ email: emailStr }).populate('companyId');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found. Please restart registration.'
            });
        }

        // Mark registration as complete
        user.metadata.registrationCompleted = true;
        user.metadata.registrationStep = 4;
        await user.save();

        const company = user.companyId;

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, companyId: company._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send welcome email
        try {
            await sendWelcomeEmail(user, company);
        } catch (emailErr) {
            console.error('Welcome email failed:', emailErr);
        }

        // Clean up progress
        await RegistrationProgress.deleteOne({ email: emailStr });

        res.status(200).json({
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
                licenseStatus: company.license?.status || 'pending'
            },
            token,
            redirectTo: '/dashboard'
        });

    } catch (error) {
        console.error('❌ Complete registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// LOGIN
// ============================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Login attempt for:', email);

        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+password')
            .populate('companyId', 'name logo license');

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Your account has been deactivated. Contact support.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ Password mismatch for:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // 🔥 CHECK LICENSE STATUS FOR ADMIN USERS
        if (user.role === 'admin' && user.companyId) {
            const company = await Company.findById(user.companyId);

            if (!company) {
                return res.status(403).json({
                    success: false,
                    error: 'Company not found. Please contact support.',
                    code: 'COMPANY_NOT_FOUND'
                });
            }

            if (company.license?.status === 'pending') {
                return res.status(403).json({
                    success: false,
                    error: 'Your license is pending activation. You will receive an email with your license key once approved.',
                    code: 'LICENSE_PENDING',
                    licenseStatus: 'pending'
                });
            }

            if (company.license?.status === 'revoked') {
                return res.status(403).json({
                    success: false,
                    error: 'Your license has been revoked. Please contact support for more information.',
                    code: 'LICENSE_REVOKED',
                    licenseStatus: 'revoked'
                });
            }
        }

        const isFirstLogin = user.role === 'co_worker' && user.metadata?.needsPasswordChange === true;

        if (isFirstLogin) {
            console.log('⚠️ First login for co-worker:', email);
        }

        await user.updateLastLogin(req.ip, req.get('User-Agent'));

        const token = jwt.sign(
            { id: user._id, role: user.role, companyId: user.companyId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        let redirectTo = '/dashboard';
        if (user.role === 'super_admin') redirectTo = '/super-admin/dashboard';
        else if (user.role === 'admin') redirectTo = '/dashboard';
        else if (user.role === 'co_worker') {
            redirectTo = isFirstLogin ? '/co-worker/settings?forcePasswordChange=true' : '/co-worker/dashboard';
        }

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
            companyId: user.companyId ? {
                id: user.companyId._id,
                name: user.companyId.name,
                logo: user.companyId.logo?.url || null
            } : null,
            permissions: user.role === 'co_worker' ? user.permissions : undefined,
            needsPasswordChange: user.role === 'co_worker' ? (user.metadata?.needsPasswordChange || false) : false
        };

        if (user.role === 'admin' && user.companyId) {
            userResponse.company = {
                id: user.companyId._id,
                name: user.companyId.name,
                licenseStatus: user.companyId.license?.status
            };
        }

        res.json({
            success: true,
            message: isFirstLogin ? 'First login! Please change your password.' : 'Login successful',
            token,
            redirectTo,
            user: userResponse,
            requiresPasswordChange: isFirstLogin
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error during login' });
    }
});

// ============================================
// EMAIL VERIFICATION
// ============================================

router.get('/verify-email/:token', async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Email verified successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROFILE
// ============================================

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('companyId')
            .select('-password');

        const profileData = user.toObject();
        profileData.fullName = user.fullName;

        if (user.role === 'co_worker') {
            const creator = await User.findById(user.createdBy).select('firstName lastName');
            profileData.createdBy = creator ? `${creator.firstName} ${creator.lastName}` : null;
        }

        res.json({ success: true, user: profileData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, username, phoneNumber, email, avatar } = req.body;

        if (email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user.id }
            });
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'Email already exists' });
            }
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (email) updateData.email = email.toLowerCase();

        if (avatar && avatar.startsWith('data:image')) {
            try {
                if (req.user.avatar?.publicId) {
                    await deleteImage(req.user.avatar.publicId);
                }
                const uploadResult = await uploadAvatar(avatar, req.user.id);
                updateData.avatar = { url: uploadResult.url, publicId: uploadResult.publicId };
            } catch (uploadError) {
                console.error('Avatar upload error:', uploadError);
            }
        }

        const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true, runValidators: true })
            .select('-password').populate('companyId');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: { ...user.toObject(), fullName: user.fullName, initials: user.initials }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PASSWORD
// ============================================

router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword, isFirstLogin } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        if (isFirstLogin && user.metadata?.needsPasswordChange === true) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            user.metadata.needsPasswordChange = false;
            await user.save();
            return res.json({ success: true, message: 'Password set successfully' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
});

// ============================================
// PASSWORD RESET
// ============================================

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.json({ success: true, message: 'If email exists, reset link will be sent' });
        }

        const resetToken = user.generatePasswordResetToken();
        await user.save();
        await sendPasswordResetEmail(user, resetToken);

        res.json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// HELPERS
// ============================================

function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return { score: 0, strength: 'No password' };
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    if (!/(123|abc|password|qwerty|admin)/i.test(password)) score += 10;

    const strength = score >= 90 ? 'Very Strong' : score >= 70 ? 'Strong' : score >= 50 ? 'Medium' : score >= 25 ? 'Weak' : 'Very Weak';
    return { score, strength };
}

const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
};

module.exports = router;