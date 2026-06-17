// routes/audit.js - FIXED WITH accessibleUsers AND accessibleOrganizations

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
        if (filters.companyId) query.companyId = filters.companyId;
        if (filters.userId) query.userId = filters.userId;
        if (filters.schoolId) query.schoolId = filters.schoolId;
    }
    else if (user.role === 'admin') {
        query.companyId = user.companyId;

        if (filters.userId) {
            const targetUser = await User.findOne({
                _id: filters.userId,
                companyId: user.companyId
            });
            if (!targetUser) {
                throw new Error('Access denied - User not in your company');
            }
            query.userId = filters.userId;
        }

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
        const coWorkerIds = await User.find({
            companyId: user.companyId,
            role: 'co_worker'
        }).distinct('_id');

        query.$and = [
            {
                $or: [
                    { userId: user._id },
                    { userId: { $in: coWorkerIds } }
                ]
            },
            {
                'userInfo.role': { $ne: 'admin' }
            },
            {
                companyId: user.companyId
            }
        ];

        if (filters.userId) {
            const targetUser = await User.findOne({
                _id: filters.userId,
                companyId: user.companyId,
                role: 'co_worker'
            });
            if (!targetUser) {
                throw new Error('Access denied - Can only view co-worker activities');
            }
            query.userId = filters.userId;
            delete query.$and;
        }

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

    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

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
// GET /logs - WITH accessibleUsers AND accessibleOrganizations
// ============================================
router.get('/logs', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action,
            userId,
            schoolId,
            status,
            startDate,
            endDate,
            days
        } = req.query;

        const query = {};

        // ==================== ROLE-BASED FILTERING ====================
        if (req.user.role === 'super_admin') {
            if (userId) query.userId = userId;
            if (schoolId) query.schoolId = schoolId;
        }
        else if (req.user.role === 'admin') {
            query.companyId = req.user.companyId;
            if (userId) {
                const targetUser = await User.findOne({ _id: userId, companyId: req.user.companyId });
                if (!targetUser) {
                    return res.status(403).json({ success: false, error: 'Access denied' });
                }
                query.userId = userId;
            }
            if (schoolId) {
                const school = await School.findOne({ _id: schoolId, companyId: req.user.companyId });
                if (!school) {
                    return res.status(403).json({ success: false, error: 'Access denied' });
                }
                query.schoolId = schoolId;
            }
        }
        else if (req.user.role === 'co_worker') {
            // Co-worker logic...
            const allowedOrgIds = req.user.permissions
                ?.filter(p => p.canViewAuditLogs === true || p.canManageStudents === true)
                .map(p => p.organizationId?.toString()) || [];

            if (allowedOrgIds.length === 0) {
                return res.json({
                    success: true,
                    logs: [],
                    accessibleUsers: [],
                    accessibleOrganizations: [],
                    message: 'No audit log permissions',
                    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
                });
            }

            const allCoWorkers = await User.find({
                companyId: req.user.companyId,
                role: 'co_worker',
                'permissions.organizationId': { $in: allowedOrgIds }
            }).distinct('_id');

            const visibleUserIds = [...new Set([req.user.id, ...allCoWorkers.map(id => id.toString())])];

            query.$and = [
                { userId: { $in: visibleUserIds } },
                { schoolId: { $in: allowedOrgIds } },
                { companyId: req.user.companyId }
            ];
            query['userInfo.role'] = { $ne: 'admin' };

            if (userId) {
                if (!visibleUserIds.includes(userId)) {
                    return res.status(403).json({ success: false, error: 'Access denied' });
                }
                query.userId = userId;
            }
        }

        // ==================== DATE FILTER ====================
        if (days) {
            const startDateObj = new Date();
            startDateObj.setDate(startDateObj.getDate() - parseInt(days));
            query.createdAt = { $gte: startDateObj };
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // ==================== ACTION FILTER ====================
        if (action) {
            query.action = action;
        }

        // ==================== STATUS FILTER ====================
        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('userId', 'firstName lastName email role'),
            AuditLog.countDocuments(query)
        ]);

        // ==================== GET accessibleUsers AND accessibleOrganizations ====================
        let accessibleUsers = [];
        let accessibleOrganizations = [];

        if (req.user.role === 'admin') {
            // ✅ Admin: Get all co-workers and organizations in their company
            accessibleUsers = await User.find({
                companyId: req.user.companyId,
                role: 'co_worker',
                isActive: true
            })
                .select('_id firstName lastName email')
                .lean();

            accessibleOrganizations = await School.find({
                companyId: req.user.companyId,
                isActive: true
            })
                .select('_id name')
                .lean();
        }
        else if (req.user.role === 'super_admin') {
            // ✅ Super Admin: Get all companies and their admins (or all users)
            accessibleUsers = await User.find({
                role: { $in: ['admin', 'co_worker'] },
                isActive: true
            })
                .select('_id firstName lastName email')
                .lean();

            accessibleOrganizations = await School.find({
                isActive: true
            })
                .select('_id name')
                .lean();
        }
        else if (req.user.role === 'co_worker') {
            // ✅ Co-worker: Get only co-workers in their orgs
            const allowedOrgIds = req.user.permissions?.map(p => p.organizationId?.toString()) || [];
            accessibleUsers = await User.find({
                companyId: req.user.companyId,
                role: 'co_worker',
                isActive: true,
                'permissions.organizationId': { $in: allowedOrgIds }
            })
                .select('_id firstName lastName email')
                .lean();

            accessibleOrganizations = await School.find({
                _id: { $in: allowedOrgIds },
                isActive: true
            })
                .select('_id name')
                .lean();
        }

        // Transform logs for co-worker view (remove sensitive info)
        const safeLogs = logs.map(log => {
            const logObj = log.toObject();
            return {
                _id: logObj._id,
                action: logObj.action,
                details: logObj.details,
                status: logObj.status,
                createdAt: logObj.createdAt,
                userInfo: logObj.userInfo,
                schoolInfo: logObj.schoolInfo,
                changes: logObj.changes,
                importance: logObj.importance,
                errorMessage: logObj.errorMessage,
                ipAddress: logObj.ipAddress,
                responseTime: logObj.responseTime,
                targetId: logObj.targetId,
                targetModel: logObj.targetModel
            };
        });

        res.json({
            success: true,
            logs: safeLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            accessibleUsers,
            accessibleOrganizations
        });

    } catch (error) {
        console.error('Audit logs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /stats/summary - Quick stats for dashboard
// ============================================
router.get('/stats/summary', async (req, res) => {
    try {
        // ... existing stats logic ...
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;