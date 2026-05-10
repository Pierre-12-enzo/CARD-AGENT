// routes/audit.js - CARD-AGENT WITH COMPANY-BASED ACCESS CONTROL
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Build query based on user role
const buildAuditQuery = async (req, filters = {}) => {
    const query = {};
    const user = req.user;

    if (user.role === 'super_admin') {
        // 🔥 SUPER ADMIN: See EVERYTHING
        if (filters.companyId) query.companyId = filters.companyId;
        if (filters.userId) query.userId = filters.userId;

    } else if (user.role === 'admin') {
        // Admin sees only their company
        query.companyId = user.companyId;

        // Find all co-workers in this company
        const coWorkerIds = await User.find({
            companyId: user.companyId,
            role: 'co_worker'
        }).distinct('_id');

        // Admin sees: their own actions + all co-workers' actions
        // But NOT super_admin actions
        query.$and = [
            {
                $or: [
                    { userId: user._id },
                    { userId: { $in: coWorkerIds } }
                ]
            },
            {
                'userInfo.role': { $ne: 'super_admin' }
            }
        ];

        if (filters.userId) {
            const allowedIds = [user._id.toString(), ...coWorkerIds.map(id => id.toString())];
            if (!allowedIds.includes(filters.userId.toString())) {
                throw new Error('Access denied');
            }
            // Override the $and with specific user filter
            query.userId = filters.userId;
            delete query.$and;
        }
    }
    else if (user.role === 'co_worker') {
        // 🔥 CO-WORKER: See only their own actions
        query.userId = user._id;
        query.companyId = user.companyId;
    }

    // Common filters
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
        const originalOr = query.$or || [];
        query.$and = [
            ...(originalOr.length > 0 ? [{ $or: originalOr }] : []),
            {
                $or: [
                    { 'userInfo.name': searchRegex },
                    { 'userInfo.email': searchRegex },
                    { 'companyInfo.name': searchRegex },
                    { action: searchRegex },
                    { details: searchRegex }
                ]
            }
        ];
        delete query.$or;
    }

    return query;
};

// ============================================
// GET /logs - Main audit logs endpoint
// ============================================
router.get('/logs',
    authMiddleware,
    async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                action,
                userId,
                companyId,
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

            // 🔥 Stats based on FILTERED query
            const statsMatch = { ...query };
            delete statsMatch.$and;

            const stats = await AuditLog.aggregate([
                { $match: statsMatch },
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

            // 🔥 Get accessible users for filter dropdown
            let accessibleUsers = [];
            if (req.user.role === 'super_admin') {
                accessibleUsers = await User.find({}, 'firstName lastName email role companyId')
                    .limit(100);
            } else if (req.user.role === 'admin') {
                accessibleUsers = await User.find({
                    companyId: req.user.companyId,
                    role: { $in: ['admin', 'co_worker'] }
                }, 'firstName lastName email role');
            } else if (req.user.role === 'co_worker') {
                accessibleUsers = await User.find({
                    _id: req.user.id
                }, 'firstName lastName email role');
            }

            res.json({
                success: true,
                logs,
                stats: stats[0] || null,
                accessibleUsers,
                currentUser: {
                    id: req.user.id,
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
            console.error('Audit logs error:', error);
            res.status(error.message === 'Access denied' ? 403 : 500).json({
                success: false,
                error: error.message || 'Failed to fetch audit logs'
            });
        }
    }
);

// ============================================
// GET /trail/:model/:id - Entity audit trail
// ============================================
router.get('/trail/:model/:id',
    authMiddleware,
    async (req, res) => {
        try {
            const { model, id } = req.params;
            const { limit = 100, startDate, endDate } = req.query;

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
    }
);

// ============================================
// GET /user/:userId - User activity
// ============================================
router.get('/user/:userId',
    authMiddleware,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = 50 } = req.query;

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
    }
);

module.exports = router;