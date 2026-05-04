// models/Template.js - UPDATED: Back side is now optional
const mongoose = require('mongoose');

const templateSideSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    filepath: { type: String, required: true },
    url: { type: String },
    secure_url: { type: String },
    public_id: { type: String }
});

const templateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    // frontSide is REQUIRED
    frontSide: {
        type: templateSideSchema,
        required: true
    },
    // backSide is now OPTIONAL
    backSide: {
        type: templateSideSchema,
        required: false
    },
    templateType: {
        type: String,
        enum: ['single-sided', 'two-sided'],
        default: 'two-sided'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Template', templateSchema);