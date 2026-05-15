// routes/co-workers.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const School = require('../models/School');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const bcrypt = require('bcryptjs');
const { sendAccountDeactivatedEmail, sendAccountDeletedPermanentEmail,
    sendCoWorkerInvite, sendPermissionsUpdatedEmail
} = require('../utilis/emailService');

// ============================================
// CO-WORKER MANAGEMENT (Admin Only)
// ============================================

/**
 * @desc    Get all co-workers for admin's company
 * @route   GET /api/co-workers
 * @access  Private (Admin)
 */
router.get('/',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const query = { role: 'co_worker' };

            if (req.user.role === 'admin') {
                query.companyId = req.user.companyId;
            }

            if (req.user.role === 'super_admin' && req.query.companyId) {
                query.companyId = req.query.companyId;
            }

            const coWorkers = await User.find(query)
                .populate('companyId', 'name')
                .populate('createdBy', 'firstName lastName email')
                .select('-password')
                .sort({ createdAt: -1 });

            const enhanced = coWorkers.map(member => ({
                ...member.toObject(),
                fullName: member.fullName,
                initials: member.initials,
                status: member.isActive ? 'active' : 'inactive',
                lastLogin: member.lastLogin?.at,
                creatorName: member.createdBy ?
                    `${member.createdBy.firstName} ${member.createdBy.lastName}` : null,
                organizationsCount: member.permissions?.length || 0
            }));

            res.json({
                success: true,
                count: enhanced.length,
                coWorkers: enhanced
            });

        } catch (error) {
            console.error('Get co-workers error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Get single co-worker
 * @route   GET /api/co-workers/:id
 * @access  Private (Admin)
 */
router.get('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const coWorker = await User.findOne({
                _id: req.params.id,
                role: 'co_worker'
            })
                .populate('companyId', 'name address phone email')
                .populate('createdBy', 'firstName lastName email')
                .populate('permissions.organizationId', 'name type logo')
                .select('-password');

            if (!coWorker) {
                return res.status(404).json({
                    success: false,
                    error: 'Co-worker not found'
                });
            }

            if (req.user.role === 'admin' &&
                coWorker.companyId._id.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            const stats = {
                totalActions: await AuditLog.countDocuments({ userId: coWorker._id }),
                lastActions: await AuditLog.find({ userId: coWorker._id })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('action details createdAt')
            };

            res.json({
                success: true,
                coWorker: {
                    ...coWorker.toObject(),
                    fullName: coWorker.fullName,
                    initials: coWorker.initials,
                    stats
                }
            });

        } catch (error) {
            console.error('Get co-worker error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Create new co-worker
 * @route   POST /api/co-workers
 * @access  Private (Admin)
 */
router.post('/',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                email,
                phoneNumber,
                permissions, // Array of { organizationId, organizationName, ...perms }
                companyId
            } = req.body;

            if (!firstName || !lastName || !email) {
                return res.status(400).json({
                    success: false,
                    error: 'First name, last name, and email are required'
                });
            }

            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'User with this email already exists'
                });
            }

            let targetCompanyId = req.user.companyId;
            if (req.user.role === 'super_admin' && companyId) {
                targetCompanyId = companyId;
            }

            const company = await Company.findById(targetCompanyId);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    error: 'Company not found'
                });
            }

            const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
            const username = await generateUniqueUsername(baseUsername);
            const tempPassword = generateTemporaryPassword();

            // Process permissions - ensure they're valid organizations
            let validPermissions = [];
            if (permissions && Array.isArray(permissions)) {
                for (const perm of permissions) {
                    const org = await School.findOne({
                        _id: perm.organizationId,
                        companyId: targetCompanyId
                    });
                    if (org) {
                        validPermissions.push({
                            organizationId: org._id,
                            organizationName: org.name,
                            canViewAnalytics: perm.canViewAnalytics || false,
                            canGenerateCards: perm.canGenerateCards || false,
                            canManageStudents: perm.canManageStudents || false,
                            canManageTemplates: perm.canManageTemplates || false,
                            canUploadCSV: perm.canUploadCSV || false,
                            canUploadPhotos: perm.canUploadPhotos || false,
                            canMarkAttendance: perm.canMarkAttendance || false,
                            canViewAuditLogs: perm.canViewAuditLogs || false
                        });
                    }
                }
            }

            const coWorker = await User.create({
                firstName,
                lastName,
                username,
                email: email.toLowerCase(),
                phoneNumber,
                password: await bcrypt.hash(tempPassword, 10),
                role: 'co_worker',
                companyId: targetCompanyId,
                createdBy: req.user.id,
                permissions: validPermissions,
                metadata: {
                    registrationCompleted: true,
                    needsPasswordChange: true
                },
                isEmailVerified: false
            });

            // Send invitation email
            const orgNames = validPermissions.map(p => p.organizationName).join(', ');
            await sendCoWorkerInvite(coWorker, company, req.user, tempPassword);

            await AuditLog.create({
                action: 'CREATE_STAFF',
                userId: req.user._id,
                companyId: targetCompanyId,
                details: {
                    staffId: coWorker._id,
                    staffEmail: coWorker.email,
                    permissionsCount: validPermissions.length
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'Co-worker created successfully',
                coWorker: {
                    id: coWorker._id,
                    firstName: coWorker.firstName,
                    lastName: coWorker.lastName,
                    email: coWorker.email,
                    permissions: coWorker.permissions,
                    company: { id: company._id, name: company.name }
                }
            });

        } catch (error) {
            console.error('Create co-worker error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);


/**
 * @desc    Bulk create co-workers
 * @route   POST /api/co-workers/bulk
 * @access  Private (Admin)
 */
router.post('/bulk',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { staffList } = req.body;

            console.log('📦 [BULK] Received staff list:', staffList?.length);

            if (!staffList || !Array.isArray(staffList) || staffList.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Staff list is required'
                });
            }

            const results = {
                success: [],
                failed: []
            };

            for (const staff of staffList) {
                try {
                    console.log(`🔄 Processing: ${staff.email}`);

                    // Check if user exists
                    const existingUser = await User.findOne({ email: staff.email.toLowerCase() });
                    if (existingUser) {
                        results.failed.push({
                            email: staff.email,
                            reason: 'User with this email already exists'
                        });
                        continue;
                    }

                    // Find organization by name
                    const organization = await School.findOne({
                        name: { $regex: new RegExp(`^${staff.organizationName}$`, 'i') },
                        companyId: req.user.companyId
                    });

                    if (!organization) {
                        results.failed.push({
                            email: staff.email,
                            reason: `Organization "${staff.organizationName}" not found in your company`
                        });
                        continue;
                    }

                    // Create permissions
                    const permissions = [{
                        organizationId: organization._id,
                        organizationName: organization.name,
                        canManageStudents: staff.canManageStudents || false,
                        canGenerateCards: staff.canGenerateCards || false,
                        canManageTemplates: staff.canManageTemplates || false,
                        canUploadCSV: staff.canUploadCSV || false,
                        canUploadPhotos: staff.canUploadPhotos || false,
                        canViewAnalytics: staff.canViewAnalytics || false,
                        canViewAuditLogs: staff.canViewAuditLogs || false,
                        canMarkAttendance: staff.canMarkAttendance || false
                    }];

                    // Generate username and password
                    const baseUsername = `${staff.firstName.toLowerCase()}.${staff.lastName.toLowerCase()}`;
                    const username = await generateUniqueUsername(baseUsername);
                    const tempPassword = generateTemporaryPassword();

                    // Create co-worker
                    const coWorker = await User.create({
                        firstName: staff.firstName,
                        lastName: staff.lastName,
                        username,
                        email: staff.email.toLowerCase(),
                        phoneNumber: staff.phoneNumber,
                        password: await bcrypt.hash(tempPassword, 10),
                        role: 'co_worker',
                        companyId: req.user.companyId,
                        createdBy: req.user._id,
                        permissions: permissions,
                        metadata: {
                            registrationCompleted: true,
                            needsPasswordChange: true
                        },
                        isEmailVerified: false
                    });

                    // Send invitation email
                    const company = await Company.findById(req.user.companyId);
                    await sendCoWorkerInvite(coWorker, company, req.user, tempPassword);

                    results.success.push({
                        id: coWorker._id,
                        name: `${coWorker.firstName} ${coWorker.lastName}`,
                        email: coWorker.email
                    });

                    console.log(`✅ Created: ${coWorker.email}`);

                } catch (error) {
                    console.error(`❌ Failed for ${staff.email}:`, error.message);
                    results.failed.push({
                        email: staff.email,
                        reason: error.message
                    });
                }
            }

            console.log(`📊 Bulk import complete: ${results.success.length} success, ${results.failed.length} failed`);

            res.json({
                success: true,
                message: `Bulk import completed: ${results.success.length} created, ${results.failed.length} failed`,
                results
            });

        } catch (error) {
            console.error('Bulk create error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Update co-worker
 * @route   PUT /api/co-workers/:id
 * @access  Private (Admin)
 */
router.put('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { firstName, lastName, phoneNumber, permissions, isActive } = req.body;

            const coWorker = await User.findOne({
                _id: req.params.id,
                role: 'co_worker'
            });

            if (!coWorker) {
                return res.status(404).json({
                    success: false,
                    error: 'Co-worker not found'
                });
            }

            if (req.user.role === 'admin' &&
                coWorker.companyId.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // ✅ FIX: Get the company for this co-worker
            const company = await Company.findById(coWorker.companyId);

            if (!company) {
                console.warn('⚠️ Company not found for co-worker:', coWorker.companyId);
            }

            const changes = {};

            if (firstName) {
                changes.firstName = { from: coWorker.firstName, to: firstName };
                coWorker.firstName = firstName;
            }
            if (lastName) {
                changes.lastName = { from: coWorker.lastName, to: lastName };
                coWorker.lastName = lastName;
            }
            if (phoneNumber) {
                changes.phoneNumber = { from: coWorker.phoneNumber, to: phoneNumber };
                coWorker.phoneNumber = phoneNumber;
            }
            if (isActive !== undefined) {
                changes.isActive = { from: coWorker.isActive, to: isActive };
                coWorker.isActive = isActive;
            }

            // Update permissions (array format)
            let permissionsChanges = null;
            if (permissions && Array.isArray(permissions)) {
                const oldPermissions = [...coWorker.permissions];
                coWorker.permissions = permissions;

                // ✅ Pass both old and new permissions
                const permissionsChanges = {
                    from: oldPermissions,
                    to: permissions
                };
                changes.permissions = permissionsChanges;

                // Send email with the changes
                if (company) {
                    await sendPermissionsUpdatedEmail(coWorker, company, req.user, permissionsChanges);
                }
            }
            await coWorker.save();

            // ✅ FIX: Only send email if company exists
            if (company && permissionsChanges) {
                await sendPermissionsUpdatedEmail(coWorker, company, req.user, permissionsChanges);
            } else if (permissionsChanges) {
                console.log('📧 Email not sent - company not found for co-worker');
            }

            await AuditLog.create({
                action: 'UPDATE_STAFF',
                userId: req.user._id,
                companyId: coWorker.companyId,
                details: {
                    staffId: coWorker._id,
                    staffEmail: coWorker.email,
                    changes
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            if (isActive === false) {
                // ✅ FIX: Only send email if company exists
                if (company) {
                    await sendAccountDeactivatedEmail(coWorker, company.name, req.user);
                }
            }

            res.json({
                success: true,
                message: 'Co-worker updated successfully',
                coWorker: {
                    id: coWorker._id,
                    firstName: coWorker.firstName,
                    lastName: coWorker.lastName,
                    email: coWorker.email,
                    permissions: coWorker.permissions,
                    isActive: coWorker.isActive
                }
            });

        } catch (error) {
            console.error('Update co-worker error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Update co-worker permissions
 * @route   PATCH /api/co-workers/:id/permissions
 * @access  Private (Admin)
 */
router.patch('/:id/permissions',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { permissions } = req.body;

            const coWorker = await User.findOne({
                _id: req.params.id,
                role: 'co_worker'
            });

            if (!coWorker) {
                return res.status(404).json({
                    success: false,
                    error: 'Co-worker not found'
                });
            }

            if (req.user.role === 'admin' &&
                coWorker.companyId.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // ✅ FIX: Get the company for this co-worker
            const company = await Company.findById(coWorker.companyId);

            const oldPermissions = [...coWorker.permissions];
            coWorker.permissions = permissions;
            await coWorker.save();

            // ✅ FIX: Only send email if company exists
            if (company) {
                const permissionsChanges = { from: oldPermissions, to: permissions };
                await sendPermissionsUpdatedEmail(coWorker, company, req.user, permissionsChanges);
            }

            await AuditLog.create({
                action: 'UPDATE_STAFF_PERMISSIONS',
                userId: req.user._id,
                companyId: coWorker.companyId,
                details: {
                    staffId: coWorker._id,
                    staffEmail: coWorker.email,
                    oldPermissions,
                    newPermissions: permissions
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Permissions updated',
                permissions: coWorker.permissions
            });

        } catch (error) {
            console.error('Update permissions error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

router.delete('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { permanent } = req.query;

            const coWorker = await User.findOne({
                _id: req.params.id,
                role: 'co_worker'
            }).populate('companyId', 'name');

            if (!coWorker) {
                return res.status(404).json({
                    success: false,
                    error: 'Co-worker not found'
                });
            }

            if (req.user.role === 'admin' &&
                coWorker.companyId._id.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // ✅ FIX: Get company name from populated coWorker
            const companyName = coWorker.companyId?.name || 'your company';

            if (permanent === 'true') {
                const staffEmail = coWorker.email;
                const staffName = `${coWorker.firstName} ${coWorker.lastName}`;

                await User.findByIdAndDelete(coWorker._id);

                await sendAccountDeletedPermanentEmail(coWorker, companyName, req.user);

                await AuditLog.create({
                    action: 'DELETE_STAFF',
                    userId: req.user._id,
                    companyId: coWorker.companyId._id,
                    details: { staffId: coWorker._id, staffEmail, staffName },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                res.json({ success: true, message: 'Co-worker permanently deleted' });
            } else {
                coWorker.isActive = false;
                await coWorker.save();

                await sendAccountDeactivatedEmail(coWorker, companyName, req.user);

                await AuditLog.create({
                    action: 'DEACTIVATE_STAFF',
                    userId: req.user._id,
                    companyId: coWorker.companyId._id,
                    details: {
                        staffId: coWorker._id,
                        staffEmail: coWorker.email,
                        staffName: `${coWorker.firstName} ${coWorker.lastName}`
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                res.json({ success: true, message: 'Co-worker deactivated successfully' });
            }

        } catch (error) {
            console.error('Delete co-worker error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

router.post('/:id/resend-invite',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const coWorker = await User.findOne({
                _id: req.params.id,
                role: 'co_worker'
            }).populate('companyId');

            if (!coWorker) {
                return res.status(404).json({
                    success: false,
                    error: 'Co-worker not found'
                });
            }

            if (req.user.role === 'admin' &&
                coWorker.companyId._id.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            const tempPassword = generateTemporaryPassword();
            coWorker.password = await bcrypt.hash(tempPassword, 10);
            coWorker.metadata.needsPasswordChange = true;
            await coWorker.save();

            // ✅ FIX: Use sendCoWorkerInvite instead of sendEmail
            const company = coWorker.companyId;
            await sendCoWorkerInvite(coWorker, company, req.user, tempPassword);

            await AuditLog.create({
                action: 'RESEND_STAFF_INVITE',
                userId: req.user._id,
                companyId: coWorker.companyId._id,
                details: { staffId: coWorker._id, staffEmail: coWorker.email },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json({ success: true, message: 'Invitation resent successfully' });

        } catch (error) {
            console.error('Resend invite error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// HELPERS
// ============================================

async function generateUniqueUsername(baseUsername) {
    let username = baseUsername;
    let counter = 1;
    while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }
    return username;
}

function generateTemporaryPassword() {
    const length = 10;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password + "A1!";
}

module.exports = router;