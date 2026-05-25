// models/CardHistory.js
const mongoose = require('mongoose');

const cardHistorySchema = new mongoose.Schema({
    // Which person (student/employee)
    personId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    
    // Which template was used
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
        required: true
    },
    
    // Organization
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    
    // Company
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    
    // Who generated the card
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Generation details
    generationType: {
        type: String,
        enum: ['single', 'batch', 'auto'],
        default: 'single'
    },
    
    batchId: {
        type: String,
        index: true
    },
    
    // Card details
    cardType: {
        type: String,
        enum: ['front', 'back', 'both'],
        default: 'both'
    },
    
    // Status
    status: {
        type: String,
        enum: ['success', 'failed', 'partial'],
        default: 'success'
    },
    
    // Error message if failed
    errorMessage: String,
    
    // Metadata
    metadata: {
        templateName: String,
        templateType: String,
        personName: String,
        personId: String,
        generationDuration: Number, // in milliseconds
        fileSize: Number, // in bytes
    },
    
    // For tracking
    generationCount: {
        type: Number,
        default: 1
    }
    
}, {
    timestamps: true
});

// Indexes for faster queries
cardHistorySchema.index({ createdAt: -1 });
cardHistorySchema.index({ personId: 1, createdAt: -1 });
cardHistorySchema.index({ organizationId: 1, createdAt: -1 });
cardHistorySchema.index({ generatedBy: 1, createdAt: -1 });

// Static method to get statistics
cardHistorySchema.statics.getStatistics = async function(companyId, organizationId = null) {
    const match = { companyId: mongoose.Types.ObjectId(companyId) };
    if (organizationId) {
        match.organizationId = mongoose.Types.ObjectId(organizationId);
    }
    
    const stats = await this.aggregate([
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
    
    return stats[0] || {
        totalCards: 0,
        successfulCards: 0,
        failedCards: 0,
        uniquePeopleCount: 0,
        batchGenerations: 0,
        singleGenerations: 0
    };
};

module.exports = mongoose.model('CardHistory', cardHistorySchema);