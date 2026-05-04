// routes/audit.js - WITH HIERARCHICAL ACCESS CONTROL
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Helper function to build hierarchical query based on user role
const buildAuditQuery = async (req, filters = {}) => {
    const query = {};
    const user = req.user;

    if (user.role === 'super_admin') {
        // SUPER ADMIN: See EVERYTHING across all schools
        // No school restriction
        if (filters.schoolId) query.schoolId = filters.schoolId;
        if (filters.userId) query.userId = filters.userId;
        if (filters.action) {
            if (filters.action.includes(',')) {
                query.action = { $in: filters.action.split(',') };
            } else {
                query.action = filters.action;
            }
        }
        if (filters.status) query.status = filters.status;
        if (filters.importance) query.importance = filters.importance;

    } else if (user.role === 'admin') {
        // ADMIN: See their school + staff they created
        query.schoolId = user.schoolId;

        // Find all staff members created by this admin
        const staffIds = await User.find({
            schoolId: user.schoolId,
            createdBy: user._id,
            role: 'staff'
        }).distinct('_id');

        // Include admin's own actions + their staff's actions
        query.$or = [
            { userId: user._id },           // Admin's own actions
            { userId: { $in: staffIds } }   // Staff actions
        ];

        if (filters.userId) {
            // If filtering by specific user, ensure they're in the allowed list
            const allowedUserIds = [user._id, ...staffIds];
            if (!allowedUserIds.includes(filters.userId)) {
                throw new Error('Access denied - You can only view your staff members');
            }
            query.userId = filters.userId;
        }

        if (filters.action) {
            if (filters.action.includes(',')) {
                query.action = { $in: filters.action.split(',') };
            } else {
                query.action = filters.action;
            }
        }
        if (filters.status) query.status = filters.status;
        if (filters.importance) query.importance = filters.importance;

    } else if (user.role === 'staff') {
        // STAFF: See only staff members from same school AND same creator/admin
        // Find all staff members created by the same admin who created this staff
        const currentStaff = await User.findById(user._id);
        const sameCreatorAdminId = currentStaff?.createdBy;

        const peerStaffIds = await User.find({
            schoolId: user.schoolId,
            createdBy: sameCreatorAdminId,
            role: 'staff'
        }).distinct('_id');

        // Staff can see their own actions + peer staff actions
        query.$or = [
            { userId: user._id },                    // Own actions
            { userId: { $in: peerStaffIds } }        // Peer staff actions
        ];
        query.schoolId = user.schoolId;

        if (filters.userId) {
            const allowedUserIds = [user._id, ...peerStaffIds];
            if (!allowedUserIds.includes(filters.userId)) {
                throw new Error('Access denied - You can only view your own and peer staff actions');
            }
            query.userId = filters.userId;
        }

        if (filters.action) query.action = filters.action;
        if (filters.status) query.status = filters.status;
    }

    // Date filters
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    // Text search
    if (filters.search) {
        query.$and = [query.$or ? { $or: query.$or } : {}, {
            $or: [
                { 'userInfo.email': new RegExp(filters.search, 'i') },
                { 'userInfo.name': new RegExp(filters.search, 'i') },
                { 'schoolInfo.name': new RegExp(filters.search, 'i') },
                { action: new RegExp(filters.search, 'i') },
                { errorMessage: new RegExp(filters.search, 'i') }
            ]
        }];
        delete query.$or; // Remove the original $or to avoid nesting issues
    }

    return query;
};

// Get audit logs with role-based filtering
router.get('/logs',
    authMiddleware,
    async (req, res) => {
        try {
            const {
                page = 1,
                limit = 50,
                action,
                userId,
                schoolId,
                status,
                importance,
                startDate,
                endDate,
                search
            } = req.query;

            // Build query based on user role
            const query = await buildAuditQuery(req, {
                action,
                userId,
                schoolId,
                status,
                importance,
                startDate,
                endDate,
                search
            });

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const [logs, total] = await Promise.all([
                AuditLog.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .populate('userId', 'firstName lastName email role')
                    .populate('schoolId', 'name'),
                AuditLog.countDocuments(query)
            ]);

            // Get summary stats based on role
            const statsQuery = { ...query };
            delete statsQuery.$and; // Clean up for stats

            const stats = await AuditLog.getStats({
                schoolId: req.user.role === 'admin' ? req.user.schoolId : undefined,
                days: 30,
                customMatch: statsQuery
            });

            // Get accessible users for filter dropdown
            let accessibleUsers = [];
            if (req.user.role === 'super_admin') {
                accessibleUsers = await User.find({}, 'firstName lastName email role schoolId')
                    .limit(100);
            } else if (req.user.role === 'admin') {
                const staffIds = await User.find({
                    schoolId: req.user.schoolId,
                    createdBy: req.user._id,
                    role: 'staff'
                }).distinct('_id');
                accessibleUsers = await User.find({
                    _id: { $in: [req.user._id, ...staffIds] }
                }, 'firstName lastName email role');
            } else if (req.user.role === 'staff') {
                const currentStaff = await User.findById(req.user._id);
                const peerStaffIds = await User.find({
                    schoolId: req.user.schoolId,
                    createdBy: currentStaff?.createdBy,
                    role: 'staff'
                }).distinct('_id');
                accessibleUsers = await User.find({
                    _id: { $in: [req.user._id, ...peerStaffIds] }
                }, 'firstName lastName email role');
            }

            res.json({
                success: true,
                logs,
                stats,
                accessibleUsers,
                userRole: req.user.role,
                currentUser: {
                    id: req.user._id,
                    name: `${req.user.firstName} ${req.user.lastName}`,
                    role: req.user.role
                },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Audit view error:', error);
            res.status(403).json({ error: error.message || 'Access denied' });
        }
    }
);

// Get audit trail for specific entity (with access control)
router.get('/trail/:model/:id',
    authMiddleware,
    async (req, res) => {
        try {
            const { model, id } = req.params;

            // Check if user has access to this entity
            const entity = await AuditLog.findOne({ targetId: id, targetModel: model });
            if (entity) {
                const query = await buildAuditQuery(req, {});
                if (entity.schoolId && query.schoolId && query.schoolId.toString() !== entity.schoolId.toString()) {
                    return res.status(403).json({ error: 'Access denied to this entity\'s audit trail' });
                }
            }

            const logs = await AuditLog.getAuditTrail(id, model, {
                limit: req.query.limit || 100,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            });

            res.json({
                success: true,
                logs,
                entityId: id,
                entityModel: model
            });

        } catch (error) {
            console.error('Audit trail error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;