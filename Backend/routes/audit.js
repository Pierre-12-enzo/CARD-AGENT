// routes/audit.js - CARD-AGENT WITH CORRECT ROLE-BASED ACCESS CONTROL
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const School = require('../models/School');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ============================================
// BUILD QUERY BASED ON USER ROLE
// ============================================
const buildAuditQuery = async (req, filters = {}) => {
    const query = {};
    const user = req.user;

    if (user.role === 'super_admin') {
        // ✅ SUPER ADMIN: See EVERYTHING across all companies
        if (filters.companyId) query.companyId = filters.companyId;
        if (filters.userId) query.userId = filters.userId;
        if (filters.schoolId) query.schoolId = filters.schoolId;

    }
    else if (user.role === 'admin') {
        // ✅ ADMIN: See everything in their company
        // This includes: admin's own actions + all co-workers' actions
        query.companyId = user.companyId;

        // Optional: Filter by specific user if requested
        if (filters.userId) {
            // Verify the requested user belongs to admin's company
            const targetUser = await User.findOne({
                _id: filters.userId,
                companyId: user.companyId
            });
            if (!targetUser) {
                throw new Error('Access denied - User not in your company');
            }
            query.userId = filters.userId;
        }

        // Optional: Filter by organization
        if (filters.schoolId) {
            const school = await School.findOne({
                _id: filters.schoolId,
                companyId: user.companyId
            });
            if (!school) {
                throw new Error('Access denied - Organization not in your company');
            }
            query.schoolId = filters.schoolId;
        }
    }
    else if (user.role === 'co_worker') {
        // ✅ CO-WORKER: See their own actions + other co-workers in same company
        // But NOT admin actions

        // First, get all co-workers in the same company
        const coWorkerIds = await User.find({
            companyId: user.companyId,
            role: 'co_worker'
        }).distinct('_id');

        // Co-worker can see: themselves + other co-workers
        // But NOT admin users
        query.$and = [
            {
                $or: [
                    { userId: user._id },
                    { userId: { $in: coWorkerIds } }
                ]
            },
            {
                'userInfo.role': { $ne: 'admin' }  // Exclude admin actions
            },
            {
                companyId: user.companyId
            }
        ];

        // If filtering by specific user, ensure they are a co-worker
        if (filters.userId) {
            const targetUser = await User.findOne({
                _id: filters.userId,
                companyId: user.companyId,
                role: 'co_worker'
            });
            if (!targetUser) {
                throw new Error('Access denied - Can only view co-worker activities');
            }
            // Override the $and with specific user filter
            query.userId = filters.userId;
            delete query.$and;
        }

        // Filter by organization (only if co-worker has permission)
        if (filters.schoolId) {
            const hasPermission = user.permissions?.some(
                p => p.organizationId.toString() === filters.schoolId && p.canViewAuditLogs
            );
            if (!hasPermission) {
                throw new Error('Access denied - No permission to view audit logs for this organization');
            }
            query.schoolId = filters.schoolId;
        }
    }

    // ==================== COMMON FILTERS ====================
    if (filters.action) {
        if (filters.action.includes(',')) {
            query.action = { $in: filters.action.split(',') };
        } else {
            query.action = filters.action;
        }
    }

    if (filters.status) query.status = filters.status;
    if (filters.importance) query.importance = filters.importance;

    // Date filters
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    // Text search
    if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        query.$or = [
            { 'userInfo.name': searchRegex },
            { 'userInfo.email': searchRegex },
            { 'companyInfo.name': searchRegex },
            { action: searchRegex },
            { 'details.result': searchRegex }
        ];
    }

    return query;
};

// ============================================
// GET /logs - Main audit logs endpoint
// ============================================
router.get('/logs', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action,
            userId,
            companyId,
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
            companyId,
            schoolId,
            status,
            importance,
            startDate,
            endDate,
            search
        });

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Fetch logs and total count
        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('userId', 'firstName lastName email role')
                .populate('companyId', 'name'),
            AuditLog.countDocuments(query)
        ]);

        // Get stats based on filtered query
        const stats = await AuditLog.aggregate([
            { $match: query },
            {
                $facet: {
                    totalCount: [{ $count: 'count' }],
                    successRate: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                                failed: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } }
                            }
                        }
                    ],
                    byImportance: [
                        { $group: { _id: '$importance', count: { $sum: 1 } } }
                    ],
                    byAction: [
                        { $group: { _id: '$action', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ]
                }
            }
        ]);

        // ==================== GET ACCESSIBLE USERS FOR FILTER DROPDOWN ====================
        let accessibleUsers = [];
        let accessibleOrganizations = [];

        if (req.user.role === 'super_admin') {
            // Super admin can see all users
            accessibleUsers = await User.find({}, 'firstName lastName email role companyId')
                .populate('companyId', 'name')
                .limit(100);

            // Super admin can see all organizations
            accessibleOrganizations = await School.find({}, 'name type code companyId')
                .populate('companyId', 'name')
                .limit(100);

        }
        else if (req.user.role === 'admin') {
            // Admin can see all users in their company (admin + co-workers)
            accessibleUsers = await User.find({
                companyId: req.user.companyId,
                role: { $in: ['admin', 'co_worker'] }
            }, 'firstName lastName email role companyId');

            // Admin can see all organizations in their company
            accessibleOrganizations = await School.find({
                companyId: req.user.companyId
            }, 'name type code');
        }
        else if (req.user.role === 'co_worker') {
            // Co-worker can only see other co-workers in their company (not admin)
            accessibleUsers = await User.find({
                companyId: req.user.companyId,
                role: 'co_worker'
            }, 'firstName lastName email role companyId');

            // Co-worker can only see organizations they have permission for
            const allowedOrgIds = req.user.permissions
                ?.filter(p => p.canViewAuditLogs)
                .map(p => p.organizationId) || [];

            accessibleOrganizations = await School.find({
                _id: { $in: allowedOrgIds },
                companyId: req.user.companyId
            }, 'name type code');
        }

        res.json({
            success: true,
            logs,
            stats: stats[0] || {
                totalCount: [{ count: 0 }],
                successRate: [{ total: 0, success: 0, failed: 0 }],
                byImportance: [],
                byAction: []
            },
            accessibleUsers,
            accessibleOrganizations,
            currentUser: {
                id: req.user.id,
                name: `${req.user.firstName} ${req.user.lastName}`,
                role: req.user.role,
                companyId: req.user.companyId
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Audit logs error:', error);
        res.status(error.message === 'Access denied' ? 403 : 500).json({
            success: false,
            error: error.message || 'Failed to fetch audit logs'
        });
    }
});

// ============================================
// GET /trail/:model/:id - Entity audit trail
// ============================================
router.get('/trail/:model/:id', async (req, res) => {
    try {
        const { model, id } = req.params;
        const { limit = 100, startDate, endDate } = req.query;

        // First, check if user has access to this entity
        if (req.user.role === 'admin') {
            if (model === 'Student') {
                const student = await Student.findById(id).populate('schoolId');
                if (student?.schoolId?.companyId?.toString() !== req.user.companyId?.toString()) {
                    return res.status(403).json({ success: false, error: 'Access denied' });
                }
            } else if (model === 'School') {
                const school = await School.findById(id);
                if (school?.companyId?.toString() !== req.user.companyId?.toString()) {
                    return res.status(403).json({ success: false, error: 'Access denied' });
                }
            }
        } else if (req.user.role === 'co_worker') {
            // Check if co-worker has permission for this entity's organization
            let organizationId = null;
            if (model === 'Student') {
                const student = await Student.findById(id).populate('schoolId');
                organizationId = student?.schoolId?._id;
            } else if (model === 'School') {
                organizationId = id;
            }

            const hasPermission = req.user.permissions?.some(
                p => p.organizationId?.toString() === organizationId?.toString() && p.canViewAuditLogs
            );
            if (!hasPermission) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        }

        const baseQuery = await buildAuditQuery(req, { startDate, endDate });

        const query = {
            ...baseQuery,
            targetId: id,
            targetModel: model
        };

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('userId', 'firstName lastName email role');

        res.json({ success: true, logs, entityId: id, entityModel: model });

    } catch (error) {
        console.error('Audit trail error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /user/:userId - User activity
// ============================================
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        // Verify access to this user's data
        if (req.user.role === 'co_worker' && userId !== req.user.id) {
            // Co-worker can only see their own activity
            const targetUser = await User.findById(userId);
            if (targetUser?.role === 'admin' || targetUser?.companyId?.toString() !== req.user.companyId?.toString()) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        }

        const baseQuery = await buildAuditQuery(req, { userId });

        const logs = await AuditLog.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('userId', 'firstName lastName email role');

        res.json({ success: true, logs });

    } catch (error) {
        console.error('User activity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /stats/summary - Quick stats for dashboard
// ============================================
router.get('/stats/summary', async (req, res) => {
    try {
        const query = await buildAuditQuery(req, {});

        const stats = await AuditLog.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    today: {
                        $sum: {
                            $cond: [
                                { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                                1, 0
                            ]
                        }
                    },
                    critical: {
                        $sum: {
                            $cond: [{ $eq: ['$importance', 'critical'] }, 1, 0]
                        }
                    },
                    failed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'failure'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            stats: stats[0] || { total: 0, today: 0, critical: 0, failed: 0 }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;

