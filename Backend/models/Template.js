// models/Template.js - COMPLETE REWRITE with dynamic fields support
const mongoose = require('mongoose');

const templateSideSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    filepath: { type: String, required: true },
    url: { type: String },
    secure_url: { type: String },
    public_id: { type: String },
    width: { type: Number },
    height: { type: Number }
});

// Field position schema
const fieldPositionSchema = new mongoose.Schema({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    maxWidth: { type: Number },
    fontSize: { type: Number, default: 22 },
    fontColor: { type: String, default: '#000000' },
    isBold: { type: Boolean, default: false },
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' }
});

// Data source schema
const dataSourceSchema = new mongoose.Schema({
    sourceType: {
        type: String,
        enum: ['student_field', 'employee_field', 'static', 'computed'],
        default: 'student_field'
    },
    fieldPath: { type: String },  // e.g., "studentDetails.class" or "employeeDetails.position"
    staticValue: { type: String },
    computedExpression: { type: String }  // e.g., "Class: {studentDetails.class} - Section A"
});

// Conditional rule schema
const conditionalRuleSchema = new mongoose.Schema({
    dependsOn: { type: String },  // e.g., "personType"
    requiredIfEquals: { type: String }  // e.g., "employee"
});

// Individual field definition
const templateFieldSchema = new mongoose.Schema({
   //
  name: String,
  label: String,
  type: { type: String, enum: ['text', 'photo', 'barcode', 'qr'] },
  requirement: { type: String, enum: ['required', 'optional', 'conditional'], default: 'optional' },
  position: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    maxWidth: Number,
    fontSize: Number,
    fontColor: String,
    isBold: Boolean,
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' }
  },
  dataSource: {
    sourceType: { type: String, enum: ['student_field', 'employee_field', 'static', 'computed'] },
    fieldPath: String,
    staticValue: String,
    computedExpression: String
  },
  conditionalRule: {
    dependsOn: String,
    requiredIfEquals: String
  },
  // ✅ ADD THIS - styling for photo fields
  styling: {
    borderColor: { type: String, default: '#005800' },
    borderWidth: { type: Number, default: 3 },
    borderRadius: { type: Number, default: 10 },
    placeholderColor: { type: String, default: '#10B981' },
    placeholderBg: { type: String, default: 'rgba(16, 185, 129, 0.05)' },
    showCameraIcon: { type: Boolean, default: true },
    showPlaceholderText: { type: Boolean, default: true },
    noBorder: { type: Boolean, default: false }
  }  

});

const templateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },

    // Images
    frontSide: { type: templateSideSchema, required: true },
    backSide: { type: templateSideSchema, required: false },

    templateType: {
        type: String,
        enum: ['single-sided', 'two-sided'],
        default: 'single-sided'
    },

    isDefault: { type: Boolean, default: false },

    // 🔥 NEW: Dynamic fields definition
    fields: [templateFieldSchema],

    // Template metadata
    targetPersonTypes: {
        type: [String],
        enum: ['student', 'employee'],
        default: ['student', 'employee']
    },

    // Original dimensions (for scaling)
    originalWidth: { type: Number },
    originalHeight: { type: Number },

    // Organization association
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

    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('Template', templateSchema);