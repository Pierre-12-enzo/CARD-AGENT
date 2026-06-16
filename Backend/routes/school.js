// routes/school.js - Organization Management (Clients of Card Production Company)
const express = require('express');
const router = express.Router();
const School = require('../models/School');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Template = require('../models/Template');
const AuditLog = require('../models/AuditLog');
const CardHistory = require('../models/CardHistory');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { uploadSchoolLogo, deleteImage } = require('../utilis/cloudinaryAuth');
const multer = require('multer');
const path = require('path');

// Configure multer with better error handling
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    console.log('🔍 Multer file filter - Checking file:', file.originalname);
    console.log('   Mimetype:', file.mimetype);

    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        console.log('✅ File accepted');
        return cb(null, true);
    } else {
        console.log('❌ File rejected - Invalid type');
        return cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    },
    fileFilter: fileFilter
});

// Add error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large! Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    next();
};

// Apply auth to ALL routes
router.use(authMiddleware);

// ============================================
// CREATE ORGANIZATION - WITH DEBUG LOGS
// ============================================
router.post('/',
    roleMiddleware(['admin', 'super_admin']),
    upload.single('logo'),
    async (req, res) => {
        try {
            const {
                name, type, level, phone, email, website,
                province, district, sector, country
            } = req.body;

            console.log('=========================================');
            console.log('📝 CREATING ORGANIZATION');
            console.log('   Name:', name);
            console.log('   Type:', type);
            console.log('   Phone:', phone);
            console.log('   Email:', email);
            console.log('   Has file?', !!req.file);

            if (req.file) {
                console.log('   File name:', req.file.originalname);
                console.log('   File size:', req.file.size, 'bytes');
                console.log('   File mimetype:', req.file.mimetype);
            }

            // Validate
            if (!name || !type || !phone || !email) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, type, phone, and email are required'
                });
            }

            // Check if organization name already exists
            const existing = await School.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                companyId: req.user.companyId
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Organization with this name already exists'
                });
            }

            // Check license limit
            const company = await Company.findById(req.user.companyId);
            const currentOrgCount = await School.countDocuments({ companyId: req.user.companyId });
            if (company.license.maxOrganizations && currentOrgCount >= company.license.maxOrganizations) {
                return res.status(400).json({
                    success: false,
                    error: `Organization limit reached (${company.license.maxOrganizations}). Contact support to upgrade.`
                });
            }

            // Upload logo if provided
            let logoData = { url: '', publicId: '' };
            if (req.file) {
                try {
                    console.log('📸 Attempting to upload logo to Cloudinary...');
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                    console.log('   Base64 length:', base64Image.length);

                    const uploadResult = await uploadSchoolLogo(base64Image, `org_${Date.now()}`);
                    console.log('   Upload result:', uploadResult);

                    if (uploadResult && uploadResult.url) {
                        logoData = {
                            url: uploadResult.url,
                            publicId: uploadResult.publicId
                        };
                        console.log('✅ Logo uploaded successfully:', logoData.url);
                    } else {
                        console.error('❌ Upload result missing URL:', uploadResult);
                    }
                } catch (uploadError) {
                    console.error('❌ Logo upload error:', uploadError.message);
                    console.error('   Full error:', uploadError);
                    // Don't fail the whole request
                }
            } else {
                console.log('📸 No logo file provided');
            }

            // Build address
            const address = {
                province: province || '',
                district: district || '',
                sector: sector || '',
                country: country || 'Rwanda'
            };

            console.log('📦 Creating organization with logo:', logoData);

            // Create organization
            const organization = await School.create({
                name,
                type: type || 'secondary',
                level: level || (type === 'corporate' ? 'n_a' : 'mixed'),
                phone,
                email: email.toLowerCase(),
                website: website || '',
                address,
                logo: logoData,
                companyId: req.user.companyId,
                createdBy: req.user.id,
                settings: {
                    cardDefaults: {
                        prefix: type === 'corporate' ? 'EMP' : 'STD',
                        expiryPeriod: 365
                    }
                }
            });

            console.log('✅ Organization saved to database');
            console.log('   Saved logo:', organization.logo);
            console.log('=========================================');

            // Update company stats
            await Company.findByIdAndUpdate(req.user.companyId, {
                $inc: { 'stats.totalOrganizations': 1 }
            });

            

            res.status(201).json({
                success: true,
                message: 'Organization created successfully',
                organization: {
                    _id: organization._id,
                    name: organization.name,
                    type: organization.type,
                    code: organization.code,
                    logo: organization.logo
                }
            });

        } catch (error) {
            console.error('❌ Create organization error:', error);
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    error: Object.values(error.errors).map(e => e.message).join(', ')
                });
            }
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// GET ALL ORGANIZATIONS
// ============================================
router.get('/', async (req, res) => {
    try {
        const { type, search, status, page = 1, limit = 50 } = req.query;

        const query = { companyId: req.user.companyId };

        if (type && type !== 'all') query.type = type;
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
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
                .populate('createdBy', 'firstName lastName')
                .sort({ type: 1, name: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            School.countDocuments(query)
        ]);

        // Add live stats
        const organizationsWithStats = await Promise.all(organizations.map(async (org) => {
            const [studentCount, employeeCount, cardsGenerated, templatesCount] = await Promise.all([
                Student.countDocuments({ schoolId: org._id, personType: 'student', isActive: true }),
                Student.countDocuments({ schoolId: org._id, personType: 'employee', isActive: true }),
                Student.countDocuments({ schoolId: org._id, card_generated: true }),
                Template.countDocuments({ schoolId: org._id })
            ]);

            return {
                ...org.toObject(),
                stats: {
                    students: studentCount,
                    employees: employeeCount,
                    total: studentCount + employeeCount,
                    cardsGenerated,
                    templates: templatesCount
                }
            };
        }));

        res.json({
            success: true,
            organizations: organizationsWithStats,
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
});

// ============================================
// GET SINGLE ORGANIZATION
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const organization = await School.findOne({
            _id: req.params.id,
            companyId: req.user.companyId
        }).populate('createdBy', 'firstName lastName');

        if (!organization) {
            return res.status(404).json({ success: false, error: 'Organization not found' });
        }

        // Co-worker permission check
        if (req.user.role === 'co_worker') {
            const hasAccess = req.user.permissions.some(
                p => p.organizationId.toString() === req.params.id
            );
            if (!hasAccess) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        }

        // Get detailed stats
        const [
            studentCount, employeeCount, cardsGenerated,
            withPhotos, templatesCount, recentStudents, recentActivity
        ] = await Promise.all([
            Student.countDocuments({ schoolId: organization._id, personType: 'student', isActive: true }),
            Student.countDocuments({ schoolId: organization._id, personType: 'employee', isActive: true }),
            Student.countDocuments({ schoolId: organization._id, card_generated: true }),
            Student.countDocuments({ schoolId: organization._id, has_photo: true }),
            Template.countDocuments({ schoolId: organization._id }),
            Student.find({ schoolId: organization._id, isActive: true })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name student_id personType photo_url createdAt'),
            AuditLog.find({ targetId: organization._id, targetModel: 'School' })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('action details createdAt')
        ]);

        res.json({
            success: true,
            organization: {
                ...organization.toObject(),
                stats: {
                    students: studentCount,
                    employees: employeeCount,
                    total: studentCount + employeeCount,
                    cardsGenerated,
                    withPhotos,
                    templates: templatesCount
                },
                recentStudents,
                recentActivity
            }
        });

    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// UPDATE ORGANIZATION
// ============================================
router.put('/:id',
    roleMiddleware(['admin', 'super_admin']),
    upload.single('logo'),
    async (req, res) => {
        try {
            const organization = await School.findOne({
                _id: req.params.id,
                companyId: req.user.companyId
            });

            if (!organization) {
                return res.status(404).json({ success: false, error: 'Organization not found' });
            }

            const { name, type, level, phone, email, website, province, district, sector, country, isActive } = req.body;

            // Track changes
            const changes = {};

            if (name && name !== organization.name) {
                // Check uniqueness
                const existing = await School.findOne({
                    name: { $regex: new RegExp(`^${name}$`, 'i') },
                    companyId: req.user.companyId,
                    _id: { $ne: organization._id }
                });
                if (existing) {
                    return res.status(400).json({ success: false, error: 'Organization name already exists' });
                }
                changes.name = { from: organization.name, to: name };
                organization.name = name;
            }

            if (type) { changes.type = { from: organization.type, to: type }; organization.type = type; }
            if (level) { changes.level = { from: organization.level, to: level }; organization.level = level; }
            if (phone) { changes.phone = { from: organization.phone, to: phone }; organization.phone = phone; }
            if (email) { changes.email = { from: organization.email, to: email }; organization.email = email.toLowerCase(); }
            if (website !== undefined) { changes.website = { from: organization.website, to: website }; organization.website = website; }
            if (isActive !== undefined) { changes.isActive = { from: organization.isActive, to: isActive }; organization.isActive = isActive; }

            // Address
            if (province || district || sector || country) {
                changes.address = { from: { ...organization.address } };
                if (province) organization.address.province = province;
                if (district) organization.address.district = district;
                if (sector) organization.address.sector = sector;
                if (country) organization.address.country = country;
                changes.address.to = { ...organization.address };
            }

            // Logo
            if (req.file) {
                try {
                    if (organization.logo?.publicId) {
                        await deleteImage(organization.logo.publicId);
                    }
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                    const logoData = await uploadSchoolLogo(base64Image, `org_${organization._id}`);
                    organization.logo = { url: logoData.url, publicId: logoData.publicId };
                    changes.logo = 'updated';
                } catch (uploadError) {
                    console.error('Logo upload error:', uploadError);
                }
            }

            await organization.save();


            res.json({
                success: true,
                message: 'Organization updated successfully',
                organization: {
                    _id: organization._id,
                    name: organization.name,
                    type: organization.type,
                    code: organization.code,
                    logo: organization.logo?.url
                }
            });

        } catch (error) {
            console.error('Update organization error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// DELETE ORGANIZATION - WITH CASCADE DELETE (People + Templates)
// ============================================
router.delete('/:id',
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const organization = await School.findOne({
                _id: req.params.id,
                companyId: req.user.companyId
            });

            if (!organization) {
                return res.status(404).json({ success: false, error: 'Organization not found' });
            }

            // Get counts before deletion
            const studentCount = await Student.countDocuments({ schoolId: organization._id });
            const employeeCount = await Student.countDocuments({ schoolId: organization._id, personType: 'employee' });
            const templateCount = await Template.countDocuments({ schoolId: organization._id });
            const cardHistoryCount = await CardHistory?.countDocuments({ organizationId: organization._id }) || 0;

            // Check if user confirmed cascade delete
            const { permanent, cascade } = req.query;

            // Show warning if has data and cascade is not explicitly true
            if (!cascade && (studentCount > 0 || templateCount > 0)) {
                return res.status(400).json({
                    success: false,
                    error: 'This organization has associated data. Please confirm cascade deletion.',
                    requiresCascade: true,
                    stats: {
                        students: studentCount,
                        employees: employeeCount,
                        templates: templateCount,
                        cardHistory: cardHistoryCount
                    },
                    message: `Organization has ${studentCount} people and ${templateCount} templates. They will be permanently deleted. Card history (${cardHistoryCount} records) will be preserved.`
                });
            }

            if (permanent === 'true') {
                // ==================== CASCADE DELETE ====================

                // 1. Delete all students/employees
                if (studentCount > 0) {
                    console.log(`🗑️ Deleting ${studentCount} people from organization...`);

                    // Delete photos from Cloudinary first
                    const people = await Student.find({ schoolId: organization._id });
                    let deletedPhotos = 0;
                    for (const person of people) {
                        if (person.photo_public_id) {
                            try {
                                await cloudinary.uploader.destroy(person.photo_public_id);
                                deletedPhotos++;
                            } catch (photoError) {
                                console.warn(`⚠️ Could not delete photo for ${person.name}:`, photoError.message);
                            }
                        }
                    }
                    console.log(`📸 Deleted ${deletedPhotos} photos from Cloudinary`);

                    // Delete all people from database
                    const result = await Student.deleteMany({ schoolId: organization._id });
                    console.log(`✅ Deleted ${result.deletedCount} people from database`);
                }

                // 2. Delete all templates
                if (templateCount > 0) {
                    console.log(`🗑️ Deleting ${templateCount} templates...`);

                    // Delete template images from Cloudinary
                    const templates = await Template.find({ schoolId: organization._id });
                    let deletedTemplateImages = 0;
                    for (const template of templates) {
                        if (template.frontSide?.public_id) {
                            try {
                                await cloudinary.uploader.destroy(template.frontSide.public_id);
                                deletedTemplateImages++;
                            } catch (err) {
                                console.warn(`⚠️ Could not delete template image:`, err.message);
                            }
                        }
                        if (template.backSide?.public_id) {
                            try {
                                await cloudinary.uploader.destroy(template.backSide.public_id);
                                deletedTemplateImages++;
                            } catch (err) {
                                console.warn(`⚠️ Could not delete template back image:`, err.message);
                            }
                        }
                    }
                    console.log(`📸 Deleted ${deletedTemplateImages} template images from Cloudinary`);

                    // Delete all templates from database
                    const result = await Template.deleteMany({ schoolId: organization._id });
                    console.log(`✅ Deleted ${result.deletedCount} templates from database`);
                }

                // 3. Delete organization logo from cloudinary
                if (organization.logo?.publicId) {
                    try {
                        await deleteImage(organization.logo.publicId);
                        console.log(`🗑️ Deleted organization logo: ${organization.logo.publicId}`);
                    } catch (e) {
                        console.warn('Could not delete logo:', e.message);
                    }
                }

                // 4. SOFT DELETE - Just mark organization as inactive (keep the record)
                // This preserves card history and audit logs
                organization.isActive = false;
                organization.deletedAt = new Date();
                organization.deletedBy = req.user.id;
                organization.deletionMetadata = {
                    peopleDeleted: studentCount,
                    templatesDeleted: templateCount,
                    photosDeleted: deletedPhotos || 0,
                    cardHistoryPreserved: cardHistoryCount
                };
                await organization.save();

                // 5. Update company stats
                await Company.findByIdAndUpdate(req.user.companyId, {
                    $inc: { 'stats.totalOrganizations': -1 }
                });

                

                res.json({
                    success: true,
                    message: `Organization "${organization.name}" has been deleted.`,
                    details: {
                        peopleDeleted: studentCount,
                        templatesDeleted: templateCount,
                        cardHistoryPreserved: cardHistoryCount,
                        organizationDeactivated: true
                    }
                });

            } else {
                // ==================== SOFT DELETE (Deactivate only) ====================
                organization.isActive = false;
                await organization.save();


                res.json({
                    success: true,
                    message: `Organization "${organization.name}" has been deactivated. ${studentCount} people, ${templateCount} templates, and ${cardHistoryCount} card records are preserved but inaccessible.`
                });
            }

        } catch (error) {
            console.error('❌ Delete organization error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// GET ORGANIZATION TYPES (for dropdowns)
// ============================================
router.get('/types/list', async (req, res) => {
    try {
        const types = [
            { value: 'secondary', label: 'Secondary School', icon: '🏫', levelLabel: 'O-Level / A-Level' },
            { value: 'primary', label: 'Primary School', icon: '🎒', levelLabel: 'Primary' },
            { value: 'tvet', label: 'TVET School', icon: '🔧', levelLabel: 'Technical/Vocational' },
            { value: 'university', label: 'University', icon: '🎓', levelLabel: 'Higher Education' },
            { value: 'corporate', label: 'Corporate / Organization', icon: '🏢', levelLabel: 'N/A' },
            { value: 'other', label: 'Other', icon: '📋', levelLabel: 'N/A' }
        ];

        res.json({ success: true, types });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;


