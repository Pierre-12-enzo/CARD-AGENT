// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    student_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: [true, 'Name is required']
    },

    // Type: student or employee
    personType: {
        type: String,
        enum: ['student', 'employee'],
        default: 'student'
    },

    // For students
    studentDetails: {
        class: { type: String },
        level: { type: String, default: 'N/A' },
        academic_year: { type: String },
        parent_phone: { type: String }
    },

    // For employees
    employeeDetails: {
        department: { type: String },
        position: { type: String },
        employeeId: { type: String },
        workPhone: { type: String }
    },

    // Common fields
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'N/A'],
        default: 'N/A'
    },
    dateOfBirth: Date,
    residence: {
        type: String,
        default: 'N/A'
    },
    phone: String,
    email: String,

    // Organization association
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },

    // Company association (denormalized for faster queries)
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // Created by
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Photo
    photo_url: { type: String },
    photo_public_id: { type: String },
    photo_metadata: {
        width: Number,
        height: Number,
        format: String,
        bytes: Number
    },
    has_photo: {
        type: Boolean,
        default: false
    },
    photo_uploaded_at: Date,

    // Card generation tracking
    card_generated: {
        type: Boolean,
        default: false
    },
    card_generation_count: {
        type: Number,
        default: 0
    },
    last_card_generated: Date,
    first_card_generated: Date,

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

// Compound unique: student_id must be unique within a school
studentSchema.index({ student_id: 1, schoolId: 1 }, { unique: true });
studentSchema.index({ companyId: 1, personType: 1 });

module.exports = mongoose.model('Student', studentSchema);