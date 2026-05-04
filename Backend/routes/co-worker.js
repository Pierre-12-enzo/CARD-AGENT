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
                createdBy: req.user._id,
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
            if (permissions && Array.isArray(permissions)) {
                const oldPermissions = [...coWorker.permissions];
                coWorker.permissions = permissions;
                changes.permissions = { from: oldPermissions, to: permissions };
            }

            await coWorker.save();
            await sendPermissionsUpdatedEmail(coWorker, company, req.user, permissionsChanges);

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
                await sendAccountDeactivatedEmail(coWorker, companyName, req.user);
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

            const oldPermissions = [...coWorker.permissions];
            coWorker.permissions = permissions;
            await coWorker.save();
            await sendPermissionsUpdatedEmail(coWorker, company, req.user, permissionsChanges);

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

/**
 * @desc    Delete co-worker
 * @route   DELETE /api/co-workers/:id
 * @access  Private (Admin)
 */
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

            if (permanent === 'true') {
                const companyName = coWorker.companyId.name;
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

                const companyName = coWorker.companyId.name;

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

/**
 * @desc    Resend invitation
 * @route   POST /api/co-workers/:id/resend-invite
 * @access  Private (Admin)
 */
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

            await sendEmail({
                to: coWorker.email,
                subject: `Reminder: You've been added to ${coWorker.companyId.name}`,
                template: 'staff-invite',
                context: {
                    firstName: coWorker.firstName,
                    companyName: coWorker.companyId.name,
                    adminName: `${req.user.firstName} ${req.user.lastName}`,
                    email: coWorker.email,
                    tempPassword: tempPassword,
                    loginUrl: `${process.env.FRONTEND_URL}/login`,
                    changePasswordUrl: `${process.env.FRONTEND_URL}/change-password`
                }
            });

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