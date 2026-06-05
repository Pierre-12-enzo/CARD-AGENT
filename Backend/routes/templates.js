// routes/templates.js
const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Template = require('../models/Template');
const School = require('../models/School');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed!'));
  }
});

// GET all templates - can filter by organization
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.query;
    const query = { companyId: req.user.companyId };

    if (organizationId) {
      query.schoolId = organizationId;
    }

    // Co-worker: only show templates for orgs they have permission for
    if (req.user.role === 'co_worker') {
      const allowedOrgIds = req.user.permissions
        .filter(p => p.canManageTemplates || p.canGenerateCards)
        .map(p => p.organizationId);
      query.schoolId = { $in: allowedOrgIds };
      if (organizationId) {
        if (!allowedOrgIds.includes(organizationId)) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
        query.schoolId = organizationId;
      }
    }

    const templates = await Template.find(query)
      .populate('schoolId', 'name type')
      .sort({ isDefault: -1, createdAt: -1 });

    // Update the mapping in GET / endpoint to include fields
    const templatesWithUrls = templates.map(template => {
      const templateObj = template.toObject();
      return {
        ...templateObj,
        frontSideUrl: templateObj.frontSide?.public_id ?
          cloudinary.url(templateObj.frontSide.public_id, {
            width: 400, height: 300, crop: 'fill', quality: 'auto'
          }) : null,
        backSideUrl: templateObj.backSide?.public_id ?
          cloudinary.url(templateObj.backSide.public_id, {
            width: 400, height: 300, crop: 'fill', quality: 'auto'
          }) : null,
        templateType: templateObj.templateType || (templateObj.backSide ? 'two-sided' : 'single-sided'),
        // ✅ ADD THIS LINE to include fields in list response
        fields: templateObj.fields || [],
        originalWidth: templateObj.originalWidth,
        originalHeight: templateObj.originalHeight
      };
    });

    res.json({ success: true, templates: templatesWithUrls });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to get default fields based on template type (ALL FIELDS REQUIRED)
const getDefaultFields = (templateType = 'student') => {
  const isStudent = templateType === 'student';

  // Photo styling based on template type
  const photoStyling = isStudent ? {
    borderColor: '#005800',
    borderWidth: 3,
    borderRadius: 10,
    placeholderColor: '#10B981',
    placeholderBg: 'rgba(16, 185, 129, 0.05)',
    showCameraIcon: true,
    showPlaceholderText: true,
    noBorder: false
  } : {
    borderColor: '#1e293b',
    borderWidth: 3,
    borderRadius: 10,
    placeholderColor: '#64748b',
    placeholderBg: 'rgba(30, 41, 59, 0.05)',
    showCameraIcon: true,
    showPlaceholderText: true,
    noBorder: false
  };

  if (isStudent) {
    // STUDENT TEMPLATE FIELDS - ALL REQUIRED
    return [
      {
        name: "photo",
        label: "Photo",
        type: "photo",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 50, y: 230, width: 250, height: 250 },
        styling: photoStyling
      },
      {
        name: "name",
        label: "Full Name",
        type: "text",
        requirement: "required",
        position: { x: 580, y: 225, maxWidth: 500, fontSize: 22, isBold: true, textAlign: "left" },
        dataSource: { sourceType: "student_field", fieldPath: "name" }
      },
      {
        name: "student_id",
        label: "Student ID",
        type: "text",
        requirement: "required",
        position: { x: 580, y: 475, maxWidth: 400, fontSize: 20, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "student_field", fieldPath: "student_id" }
      },
      {
        name: "class",
        label: "Class",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 580, y: 270, maxWidth: 300, fontSize: 20, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "student_field", fieldPath: "studentDetails.class" }
      },
      {
        name: "level",
        label: "Level",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 580, y: 320, maxWidth: 500, fontSize: 20, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "student_field", fieldPath: "studentDetails.level" }
      },
      {
        name: "gender",
        label: "Gender",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 580, y: 375, maxWidth: 300, fontSize: 18, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "student_field", fieldPath: "gender" }
      },
      {
        name: "residence",
        label: "Residence",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 620, y: 420, maxWidth: 300, fontSize: 18, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "student_field", fieldPath: "residence" }
      },
      {
        name: "academic_year",
        label: "Academic Year",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 670, y: 472, maxWidth: 300, fontSize: 18, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "student_field", fieldPath: "studentDetails.academic_year" }
      }
    ];
  } else {
    // EMPLOYEE TEMPLATE FIELDS - ALL REQUIRED
    return [
      {
        name: "photo",
        label: "Photo",
        type: "photo",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 50, y: 230, width: 250, height: 250 },
        styling: photoStyling
      },
      {
        name: "name",
        label: "Full Name",
        type: "text",
        requirement: "required",
        position: { x: 580, y: 225, maxWidth: 500, fontSize: 22, isBold: true, textAlign: "left" },
        dataSource: { sourceType: "employee_field", fieldPath: "name" }
      },
      {
        name: "employee_id",
        label: "Employee ID",
        type: "text",
        requirement: "required",
        position: { x: 580, y: 475, maxWidth: 400, fontSize: 20, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "employee_field", fieldPath: "employeeDetails.employeeId" }
      },
      {
        name: "department",
        label: "Department",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 580, y: 270, maxWidth: 400, fontSize: 20, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "employee_field", fieldPath: "employeeDetails.department" }
      },
      {
        name: "position",
        label: "Position",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 580, y: 320, maxWidth: 400, fontSize: 20, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "employee_field", fieldPath: "employeeDetails.position" }
      },
      {
        name: "gender",
        label: "Gender",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 580, y: 375, maxWidth: 300, fontSize: 18, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "employee_field", fieldPath: "gender" }
      },
      {
        name: "residence",
        label: "Residence",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 620, y: 420, maxWidth: 300, fontSize: 18, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "employee_field", fieldPath: "residence" }
      },
      {
        name: "work_phone",
        label: "Work Phone",
        type: "text",
        requirement: "required",  // ✅ CHANGED from "optional" to "required"
        position: { x: 580, y: 420, maxWidth: 300, fontSize: 18, isBold: false, textAlign: "left" },
        dataSource: { sourceType: "employee_field", fieldPath: "employeeDetails.workPhone" }
      }
    ];
  }
};

// UPLOAD template (UPDATED with default fields)
router.post('/upload', upload.fields([
  { name: 'frontSide', maxCount: 1 },
  { name: 'backSide', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, description, setAsDefault, templateType, organizationId, defaultPersonType } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Template name is required' });
    }
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID is required' });
    }
    if (!req.files || !req.files.frontSide) {
      return res.status(400).json({ success: false, error: 'Front side image is required' });
    }

    // Verify organization belongs to company
    const org = await School.findOne({
      _id: organizationId,
      companyId: req.user.companyId
    });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Co-worker permission check
    if (req.user.role === 'co_worker') {
      const orgPerm = req.user.permissions.find(
        p => p.organizationId.toString() === organizationId
      );
      if (!orgPerm || !orgPerm.canManageTemplates) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const frontFile = req.files.frontSide[0];
    const hasBackSide = req.files.backSide && req.files.backSide[0];
    const actualTemplateType = templateType || (hasBackSide ? 'two-sided' : 'single-sided');

    const frontUpload = await uploadToCloudinary(frontFile, 'front');
    if (!frontUpload || !frontUpload.secure_url) {
      throw new Error('Failed to upload front side');
    }

    // Get template dimensions from uploaded image
    let originalWidth = null;
    let originalHeight = null;
    try {
      const { loadImage } = require('canvas');
      const image = await loadImage(frontUpload.secure_url);
      originalWidth = image.width;
      originalHeight = image.height;
      console.log(`📐 Template dimensions: ${originalWidth}x${originalHeight}`);
    } catch (dimError) {
      console.warn('Could not get image dimensions:', dimError.message);
    }

    const templateData = {
      name,
      description: description || '',
      companyId: req.user.companyId,
      schoolId: organizationId,
      templateType: actualTemplateType,
      defaultPersonType: defaultPersonType || 'student',
      frontSide: {
        filename: frontFile.originalname,
        filepath: frontUpload.secure_url,
        url: frontUpload.secure_url,
        secure_url: frontUpload.secure_url,
        public_id: frontUpload.public_id,
        width: originalWidth,
        height: originalHeight
      },
      // 🔥 ADD DEFAULT FIELDS
      fields: getDefaultFields(actualTemplateType),
      // Store original dimensions for scaling
      originalWidth: originalWidth,
      originalHeight: originalHeight,
      isDefault: setAsDefault === 'true' || setAsDefault === true
    };

    if (hasBackSide) {
      const backFile = req.files.backSide[0];
      const backUpload = await uploadToCloudinary(backFile, 'back');
      if (backUpload && backUpload.secure_url) {
        templateData.backSide = {
          filename: backFile.originalname,
          filepath: backUpload.secure_url,
          url: backUpload.secure_url,
          secure_url: backUpload.secure_url,
          public_id: backUpload.public_id
        };
      }
    }

    // If set as default, unset other defaults for this organization
    if (templateData.isDefault) {
      await Template.updateMany(
        { schoolId: organizationId },
        { $set: { isDefault: false } }
      );
    }

    const template = new Template(templateData);
    await template.save();

    res.json({
      success: true,
      message: 'Template uploaded successfully!',
      template: {
        _id: template._id,
        name: template.name,
        templateType: template.templateType,
        organization: org.name,
        fieldsCount: template.fields?.length || 0
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

// GET single template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    }).populate('schoolId', 'name type');

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Co-worker permission check
    if (req.user.role === 'co_worker') {
      const orgPerm = req.user.permissions.find(
        p => p.organizationId.toString() === template.schoolId._id.toString()
      );
      if (!orgPerm || !orgPerm.canGenerateCards) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const templateObj = template.toObject();
    const response = {
      success: true,
      template: {
        ...templateObj,
        frontSideUrl: templateObj.frontSide?.public_id ?
          cloudinary.url(templateObj.frontSide.public_id, {
            width: 400, height: 300, crop: 'fill', quality: 'auto'
          }) : null,
        backSideUrl: templateObj.backSide?.public_id ?
          cloudinary.url(templateObj.backSide.public_id, {
            width: 400, height: 300, crop: 'fill', quality: 'auto'
          }) : null,
        // Ensure fields are included
        fields: templateObj.fields || [],
        // Include original dimensions for scaling
        originalWidth: templateObj.originalWidth || templateObj.frontSide?.width,
        originalHeight: templateObj.originalHeight || templateObj.frontSide?.height
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Also add a helper endpoint to add fields to existing templates
router.post('/:id/add-default-fields', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    if (template.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Only add fields if they don't exist
    if (!template.fields || template.fields.length === 0) {
      template.fields = getDefaultFields(template.templateType);
      await template.save();
      res.json({ success: true, message: 'Default fields added', fieldsCount: template.fields.length });
    } else {
      res.json({ success: true, message: 'Fields already exist', fieldsCount: template.fields.length });
    }

  } catch (error) {
    console.error('Add fields error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SET default template
router.patch('/:id/set-default', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    if (template.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await Template.updateMany(
      { schoolId: template.schoolId },
      { $set: { isDefault: false } }
    );

    template.isDefault = true;
    await template.save();

    res.json({ success: true, message: 'Default template updated' });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE template
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    if (template.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const deletePromises = [];
    if (template.frontSide?.public_id) {
      deletePromises.push(cloudinary.uploader.destroy(template.frontSide.public_id));
    }
    if (template.backSide?.public_id) {
      deletePromises.push(cloudinary.uploader.destroy(template.backSide.public_id));
    }
    await Promise.allSettled(deletePromises);
    await Template.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Template deleted successfully' });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PREVIEW template
router.get('/preview/:id', async (req, res) => {
  try {
    const template = await Template.findOne({
      $or: [
        { _id: req.params.id },
        { 'frontSide.filename': req.params.id },
        { 'backSide.filename': req.params.id }
      ]
    });

    let publicId = req.params.id;
    if (template) {
      publicId = template.frontSide?.public_id || publicId;
    }

    const url = cloudinary.url(publicId, {
      fetch_format: 'auto', quality: 'auto', width: 800, crop: 'limit'
    });
    res.redirect(url);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function uploadToCloudinary(file, side) {
  const base64String = file.buffer.toString('base64');
  const dataUri = `data:${file.mimetype};base64,${base64String}`;
  return await cloudinary.uploader.upload(dataUri, {
    folder: `card-agent/templates/${side}`,
    public_id: `${side}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    transformation: [
      { width: 1200, height: 800, crop: "limit" },
      { quality: "auto:good" }
    ]
  });
}

module.exports = router;