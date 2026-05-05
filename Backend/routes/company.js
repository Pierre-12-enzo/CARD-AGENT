// routes/company.js
const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const School = require('../models/School');
const Student = require('../models/Student');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { uploadSchoolLogo, deleteImage } = require('../utilis/cloudinaryAuth');
const multer = require('multer');
const crypto = require('crypto');
const { sendLicenseActivatedEmail, sendLicenseRevokedEmail } = require('../utilis/emailService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================
// SUPER ADMIN ROUTES
// ============================================

/**
 * @desc    Get all companies (super admin only)
 * @route   GET /api/company
 */
router.get('/',
    authMiddleware,
    roleMiddleware(['super_admin']),
    async (req, res) => {
        try {
            const { status, search, page = 1, limit = 20 } = req.query;

            const query = {};
            if (status) query['license.status'] = status;
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { registrationNumber: { $regex: search, $options: 'i' } }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const [companies, total] = await Promise.all([
                Company.find(query)
                    .populate('adminId', 'firstName lastName email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Company.countDocuments(query)
            ]);

            // Get stats for each company
            const companiesWithStats = await Promise.all(companies.map(async (company) => {
                const [orgCount, studentCount, staffCount] = await Promise.all([
                    School.countDocuments({ companyId: company._id }),
                    Student.countDocuments({ companyId: company._id }),
                    User.countDocuments({ companyId: company._id, role: 'co_worker' })
                ]);

                return {
                    ...company.toObject(),
                    stats: {
                        organizations: orgCount,
                        students: studentCount,
                        coWorkers: staffCount
                    }
                };
            }));

            res.json({
                success: true,
                companies: companiesWithStats,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Get companies error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Get single company
 * @route   GET /api/company/:id
 */
router.get('/:id',
    authMiddleware,
    async (req, res) => {
        try {
            const company = await Company.findById(req.params.id)
                .populate('adminId', 'firstName lastName email phoneNumber');

            if (!company) {
                return res.status(404).json({ success: false, error: 'Company not found' });
            }

            // Access control: super_admin sees all, admin sees their own
            if (req.user.role === 'admin' && company._id.toString() !== req.user.companyId?.toString()) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Get detailed stats
            const [orgCount, studentCount, staffCount, recentActivity] = await Promise.all([
                School.countDocuments({ companyId: company._id }),
                Student.countDocuments({ companyId: company._id }),
                User.countDocuments({ companyId: company._id, role: 'co_worker' }),
                AuditLog.find({ companyId: company._id })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .select('action details createdAt')
            ]);

            // Organization breakdown
            const organizations = await School.find({ companyId: company._id })
                .select('name type stats');

            res.json({
                success: true,
                company: {
                    ...company.toObject(),
                    stats: {
                        organizations: orgCount,
                        students: studentCount,
                        coWorkers: staffCount
                    },
                    organizations,
                    recentActivity
                }
            });

        } catch (error) {
            console.error('Get company error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Get current user's company (admin sees their own)
 * @route   GET /api/company/me
 */
router.get('/me',
    authMiddleware,
    roleMiddleware(['admin']),
    async (req, res) => {
        try {
            const company = await Company.findOne({ adminId: req.user.id })
                .populate('adminId', 'firstName lastName email phoneNumber');

            if (!company) {
                return res.status(404).json({ success: false, error: 'Company not found' });
            }

            const [orgCount, studentCount, staffCount, organizations] = await Promise.all([
                School.countDocuments({ companyId: company._id }),
                Student.countDocuments({ companyId: company._id }),
                User.countDocuments({ companyId: company._id, role: 'co_worker' }),
                School.find({ companyId: company._id }).select('name type logo stats')
            ]);

            res.json({
                success: true,
                company: {
                    ...company.toObject(),
                    stats: {
                        organizations: orgCount,
                        students: studentCount,
                        coWorkers: staffCount
                    },
                    organizations
                }
            });

        } catch (error) {
            console.error('Get my company error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// ADMIN ROUTES (Company Owner)
// ============================================

/**
 * @desc    Update company profile
 * @route   PUT /api/company/profile
 */
router.put('/profile',
    authMiddleware,
    roleMiddleware(['admin']),
    upload.single('logo'),
    async (req, res) => {
        try {
            const company = await Company.findOne({ adminId: req.user.id });
            if (!company) {
                return res.status(404).json({ success: false, error: 'Company not found' });
            }

            const { name, phone, email, website, province, district, sector, country } = req.body;

            if (name) company.name = name;
            if (phone) company.phone = phone;
            if (email) company.email = email;
            if (website !== undefined) company.website = website;
            if (province) company.address.province = province;
            if (district) company.address.district = district;
            if (sector) company.address.sector = sector;
            if (country) company.address.country = country;

            // Handle logo upload
            if (req.file) {
                try {
                    if (company.logo?.publicId) {
                        await deleteImage(company.logo.publicId);
                    }
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                    const logoData = await uploadSchoolLogo(base64Image, `company_${company._id}`);
                    company.logo = {
                        url: logoData.url,
                        publicId: logoData.publicId
                    };
                } catch (uploadError) {
                    console.error('Logo upload error:', uploadError);
                }
            }

            await company.save();

            await AuditLog.create({
                action: 'UPDATE_SETTINGS',
                userId: req.user.id,
                companyId: company._id,
                details: { type: 'company_profile' },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Company profile updated',
                company: {
                    id: company._id,
                    name: company.name,
                    email: company.email,
                    phone: company.phone,
                    logo: company.logo?.url
                }
            });

        } catch (error) {
            console.error('Update company error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Get company statistics dashboard
 * @route   GET /api/company/dashboard
 */
router.get('/dashboard',
    authMiddleware,
    roleMiddleware(['admin']),
    async (req, res) => {
        try {
            const companyId = req.user.companyId;

            const [
                totalOrgs,
                totalStudents,
                totalCoWorkers,
                totalCardsGenerated,
                recentStudents,
                recentCards,
                orgBreakdown
            ] = await Promise.all([
                School.countDocuments({ companyId, isActive: true }),
                Student.countDocuments({ companyId, isActive: true }),
                User.countDocuments({ companyId, role: 'co_worker', isActive: true }),
                Student.countDocuments({ companyId, card_generated: true }),
                Student.find({ companyId, isActive: true })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('name student_id personType createdAt'),
                Student.find({ companyId, card_generated: true })
                    .sort({ last_card_generated: -1 })
                    .limit(5)
                    .select('name student_id last_card_generated'),
                School.aggregate([
                    { $match: { companyId: mongoose.Types.ObjectId(companyId), isActive: true } },
                    {
                        $lookup: {
                            from: 'students',
                            localField: '_id',
                            foreignField: 'schoolId',
                            as: 'students'
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            type: 1,
                            studentCount: { $size: '$students' },
                            cardsGenerated: {
                                $size: {
                                    $filter: {
                                        input: '$students',
                                        as: 's',
                                        cond: { $eq: ['$$s.card_generated', true] }
                                    }
                                }
                            }
                        }
                    }
                ])
            ]);

            res.json({
                success: true,
                dashboard: {
                    summary: {
                        totalOrganizations: totalOrgs,
                        totalStudents,
                        totalCoWorkers,
                        totalCardsGenerated,
                        pendingCards: totalStudents - totalCardsGenerated
                    },
                    recentStudents,
                    recentCards,
                    organizationBreakdown: orgBreakdown
                }
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// SUPER ADMIN - LICENSE MANAGEMENT
// ============================================

/**
 * @desc    Generate/Acivate license for a company
 * @route   POST /api/company/:id/license
 */
router.post('/:id/license',
    authMiddleware,
    roleMiddleware(['super_admin']),
    async (req, res) => {
        try {
            const company = await Company.findById(req.params.id);
            if (!company) {
                return res.status(404).json({ success: false, error: 'Company not found' });
            }

            const { maxOrganizations = 999, maxCardsPerMonth = 999999, expiresAt } = req.body;

            // Generate license key
            const crypto = require('crypto');
            const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
            const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
            const licenseKey = `CARD-${part1}-${part2}`;

            company.license = {
                key: licenseKey,
                status: 'active',
                issuedAt: new Date(),
                expiresAt: expiresAt || null,
                maxOrganizations,
                maxCardsPerMonth,
                features: ['students', 'cards', 'templates', 'co_workers', 'csv_import', 'photo_upload']
            };
            company.isActive = true;
            company.verifiedAt = new Date();
            await company.save();

            // 🔥 SEND LICENSE KEY TO ADMIN VIA EMAIL
            let emailSent = false;
            try {
                const adminUser = await User.findById(company.adminId);
                if (adminUser) {
                    const { sendLicenseActivatedEmail } = require('../utilis/emailService');
                    await sendLicenseActivatedEmail(adminUser, company);
                    emailSent = true;
                    console.log('✅ License key emailed to:', adminUser.email);
                }
            } catch (emailErr) {
                console.error('License email failed:', emailErr);
            }

            // Audit log
            const AuditLog = require('../models/AuditLog');
            await AuditLog.create({
                action: 'SUBSCRIPTION_CREATED',
                userId: req.user.id,
                companyId: company._id,
                details: { licenseKey, maxOrganizations, maxCardsPerMonth },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                importance: 'high'
            });

            res.json({
                success: true,
                message: emailSent
                    ? 'License activated! Key has been emailed to the admin.'
                    : 'License activated! (Email notification failed)',
                license: {
                    key: licenseKey,
                    status: 'active',
                    maxOrganizations,
                    maxCardsPerMonth,
                    emailSentTo: emailSent ? company.email : null
                }
            });

        } catch (error) {
            console.error('License activation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Revoke company license
 * @route   POST /api/company/:id/revoke-license
 */
router.post('/:id/revoke-license',
    authMiddleware,
    roleMiddleware(['super_admin']),
    async (req, res) => {
        try {
            const company = await Company.findById(req.params.id);
            if (!company) {
                return res.status(404).json({ success: false, error: 'Company not found' });
            }

            company.license.status = 'revoked';
            company.isActive = false;
            await company.save();
            await sendLicenseRevokedEmail(adminUser, company, req.body.reason);
            await AuditLog.create({
                action: 'SUBSCRIPTION_CANCELLED',
                userId: req.user.id,
                companyId: company._id,
                details: { reason: req.body.reason || 'License revoked by super admin' },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                importance: 'critical'
            });

            res.json({
                success: true,
                message: 'License revoked successfully'
            });

        } catch (error) {
            console.error('Revoke license error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Update license limits
 * @route   PUT /api/company/:id/license
 */
router.put('/:id/license',
    authMiddleware,
    roleMiddleware(['super_admin']),
    async (req, res) => {
        try {
            const company = await Company.findById(req.params.id);
            if (!company) {
                return res.status(404).json({ success: false, error: 'Company not found' });
            }

            const { maxOrganizations, maxCardsPerMonth, expiresAt } = req.body;

            if (maxOrganizations !== undefined) company.license.maxOrganizations = maxOrganizations;
            if (maxCardsPerMonth !== undefined) company.license.maxCardsPerMonth = maxCardsPerMonth;
            if (expiresAt !== undefined) company.license.expiresAt = expiresAt;

            await company.save();

            await AuditLog.create({
                action: 'SUBSCRIPTION_UPDATED',
                userId: req.user.id,
                companyId: company._id,
                details: { maxOrganizations, maxCardsPerMonth, expiresAt },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'License updated',
                license: company.license
            });

        } catch (error) {
            console.error('Update license error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// ADMIN - ORGANIZATION MANAGEMENT (within company)
// ============================================

/**
 * @desc    Get all organizations for current company
 * @route   GET /api/company/organizations
 */
router.get('/organizations',
    authMiddleware,
    roleMiddleware(['admin', 'co_worker']),
    async (req, res) => {
        try {
            const companyId = req.user.companyId;
            const { type, search, page = 1, limit = 50 } = req.query;

            const query = { companyId, isActive: true };

            if (type && type !== 'all') query.type = type;
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { code: { $regex: search, $options: 'i' } }
                ];
            }

            // Co-worker: only show orgs they have permission for
            if (req.user.role === 'co_worker') {
                const allowedOrgIds = req.user.permissions.map(p => p.organizationId);
                query._id = { $in: allowedOrgIds };
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const [organizations, total] = await Promise.all([
                School.find(query)
                    .select('name type code logo stats')
                    .sort({ type: 1, name: 1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                School.countDocuments(query)
            ]);

            // Add live student counts
            const orgsWithCounts = await Promise.all(organizations.map(async (org) => {
                const [studentCount, employeeCount, cardsGenerated] = await Promise.all([
                    Student.countDocuments({ schoolId: org._id, personType: 'student', isActive: true }),
                    Student.countDocuments({ schoolId: org._id, personType: 'employee', isActive: true }),
                    Student.countDocuments({ schoolId: org._id, card_generated: true })
                ]);

                return {
                    _id: org._id,
                    name: org.name,
                    type: org.type,
                    code: org.code,
                    logo: org.logo?.url,
                    stats: {
                        students: studentCount,
                        employees: employeeCount,
                        total: studentCount + employeeCount,
                        cardsGenerated
                    }
                };
            }));

            res.json({
                success: true,
                organizations: orgsWithCounts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Get organizations error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// HELPER - CHECK COMPANY NAME
// ============================================

router.get('/check-name/:name', async (req, res) => {
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
                `${baseName} Services`,
                `${baseName} Pro`
            ];
        }

        res.json({
            available: !exists,
            suggestions
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;