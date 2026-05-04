// models/RegistrationProgress.js
const mongoose = require('mongoose');

const registrationProgressSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    step: {
        type: Number,
        default: 1,
        enum: [1, 2, 3] // 1: Personal Info, 2: Company Info, 3: License Activation
    },
    data: {
        personal: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        company: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        license: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000),
        index: { expires: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('RegistrationProgress', registrationProgressSchema);
