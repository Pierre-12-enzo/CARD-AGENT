// routes/cardHistory.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CardHistory = require('../models/CardHistory');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// ==================== GET CARD HISTORY ====================
router.get('/', async (req, res) => {
    try {
        const {
            personId,
            organizationId,
            limit = 50,
            page = 1,
            status,
            generationType,
            startDate,
            endDate
        } = req.query;

        const query = { companyId: new mongoose.Types.ObjectId(req.user.companyId) };

        if (personId) query.personId = new mongoose.Types.ObjectId(personId);
        if (organizationId) query.organizationId = new mongoose.Types.ObjectId(organizationId);
        if (status) query.status = status;
        if (generationType) query.generationType = generationType;

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [history, total] = await Promise.all([
            CardHistory.find(query)
                .populate('personId', 'name student_id photo_url personType')
                .populate('templateId', 'name templateType')
                .populate('generatedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            CardHistory.countDocuments(query)
        ]);

        res.json({
            success: true,
            history,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get card history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET STATISTICS ====================
router.get('/statistics', async (req, res) => {
    try {
        const { organizationId } = req.query;

        const match = {
            companyId: new mongoose.Types.ObjectId(req.user.companyId),
            status: 'success'
        };

        if (organizationId) {
            match.organizationId = new mongoose.Types.ObjectId(organizationId);
        }

        // Get total statistics
        const stats = await CardHistory.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalCards: { $sum: 1 },
                    successfulCards: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                    failedCards: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    uniquePeople: { $addToSet: '$personId' },
                    batchGenerations: { $sum: { $cond: [{ $eq: ['$generationType', 'batch'] }, 1, 0] } },
                    singleGenerations: { $sum: { $cond: [{ $eq: ['$generationType', 'single'] }, 1, 0] } }
                }
            },
            {
                $project: {
                    totalCards: 1,
                    successfulCards: 1,
                    failedCards: 1,
                    uniquePeopleCount: { $size: '$uniquePeople' },
                    batchGenerations: 1,
                    singleGenerations: 1
                }
            }
        ]);

        // Get daily generation stats for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyStats = await CardHistory.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(req.user.companyId),
                    createdAt: { $gte: thirtyDaysAgo },
                    status: 'success'
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        generationType: "$generationType"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    single: { $sum: { $cond: [{ $eq: ["$_id.generationType", "single"] }, "$count", 0] } },
                    batch: { $sum: { $cond: [{ $eq: ["$_id.generationType", "batch"] }, "$count", 0] } },
                    total: { $sum: "$count" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get weekly trend
        const weeklyStats = await CardHistory.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(req.user.companyId),
                    createdAt: { $gte: thirtyDaysAgo },
                    status: 'success'
                }
            },
            {
                $group: {
                    _id: {
                        week: { $week: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.week": -1 } },
            { $limit: 4 }
        ]);

        const result = stats[0] || {
            totalCards: 0,
            successfulCards: 0,
            failedCards: 0,
            uniquePeopleCount: 0,
            batchGenerations: 0,
            singleGenerations: 0
        };

        res.json({
            success: true,
            stats: result,
            dailyStats,
            weeklyStats
        });

    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET CARD HISTORY FOR SPECIFIC PERSON ====================
router.get('/person/:personId', async (req, res) => {
    try {
        const { personId } = req.params;
        const { limit = 20 } = req.query;

        // Verify person belongs to user's company
        const person = await Student.findOne({
            _id: personId,
            companyId: req.user.companyId
        });

        if (!person) {
            return res.status(404).json({ success: false, error: 'Person not found' });
        }

        const history = await CardHistory.find({
            personId,
            companyId: req.user.companyId
        })
            .populate('templateId', 'name templateType')
            .populate('generatedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const stats = await CardHistory.aggregate([
            {
                $match: {
                    personId: new mongoose.Types.ObjectId(personId),
                    companyId: new mongoose.Types.ObjectId(req.user.companyId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalCards: { $sum: 1 },
                    successfulCards: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                    failedCards: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
                }
            }
        ]);

        res.json({
            success: true,
            person: {
                _id: person._id,
                name: person.name,
                student_id: person.student_id,
                personType: person.personType,
                totalCardsGenerated: history.length,
                lastCardGenerated: history[0]?.createdAt || null
            },
            history,
            stats: stats[0] || { totalCards: 0, successfulCards: 0, failedCards: 0 }
        });

    } catch (error) {
        console.error('Get person card history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET RECENT ACTIVITY ====================
router.get('/recent', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const recent = await CardHistory.find({
            companyId: req.user.companyId
        })
            .populate('personId', 'name student_id photo_url personType')
            .populate('templateId', 'name')
            .populate('generatedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            recent,
            count: recent.length
        });

    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;