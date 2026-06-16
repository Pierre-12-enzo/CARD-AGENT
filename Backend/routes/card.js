// routes/card.js - COMPLETE REWRITE with dynamic fields + validation + scaling fix
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createCanvas, loadImage, registerFont } = require('canvas');
const cloudinary = require('cloudinary').v2;
const Student = require('../models/Student');
const Template = require('../models/Template');
const School = require('../models/School');
const authMiddleware = require('../middleware/authMiddleware');
const archiver = require('archiver');
const socketService = require('../services/socketService');
const CardHistory = require('../models/CardHistory');



const progressStore = new Map();
module.exports.progressStore = progressStore;


const { parseCSVFromBuffer } = require('../utilis/csvParser');
const { extractAndUploadPhotosToCloudinary } = require('../utilis/cloudinaryUpload');
const { loadImageFromUrl } = require('../utilis/imageLoader');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 300000
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Font registration
const fontPath = require.resolve('@canvas-fonts/arial');
try {
  registerFont(fontPath, { family: 'Arial' });
  registerFont(fontPath, { family: 'Arial', weight: 'bold' });
  console.log('✅ Arial font registered successfully');

  // Add roundRect to Canvas context if not exists (add this after font registration)
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
      return this;
    };
  }
} catch (error) {
  console.warn('⚠️ Could not register Arial font:', error.message);
}

// ==================== HELPER: GET FIELD VALUE FROM STUDENT ====================
function getFieldValue(student, fieldPath) {
  if (!fieldPath) return null;
  const parts = fieldPath.split('.');
  let value = student;
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return null;
    }
  }
  return value !== undefined && value !== null ? value : null;
}

// ==================== HELPER: EVALUATE COMPUTED EXPRESSION ====================
function evaluateComputedExpression(expression, student) {
  if (!expression) return null;

  // Find all {field.path} placeholders
  const matches = expression.match(/\{([^}]+)\}/g);
  if (!matches) return expression;

  let result = expression;
  for (const match of matches) {
    const path = match.slice(1, -1);
    const value = getFieldValue(student, path);
    result = result.replace(match, value !== null ? String(value) : '');
  }
  return result;
}

// ==================== HELPER: VALIDATE STUDENT FOR TEMPLATE ====================
async function validateStudentForTemplate(student, template) {
  const missingFields = [];
  const warnings = [];

  console.log(`🔍 Validating ${student.name} against template ${template.name}`);
  console.log(`Template has ${template.fields?.length || 0} fields`);

  for (const field of template.fields) {
    // Skip photo fields - handled separately
    if (field.type === 'photo') continue;

    // Determine if this field is required for this student
    let isRequired = field.requirement === 'required';

    // Handle conditional requirements
    if (field.requirement === 'conditional' && field.conditionalRule) {
      const { dependsOn, requiredIfEquals } = field.conditionalRule;
      const dependsValue = student[dependsOn];
      if (dependsValue === requiredIfEquals) {
        isRequired = true;
      }
    }

    console.log(`Field: ${field.label}, isRequired: ${isRequired}, requirement: ${field.requirement}`);

    if (!isRequired) continue;

    // Get the actual value
    let value = null;

    if (field.dataSource) {
      switch (field.dataSource.sourceType) {
        case 'student_field':
        case 'employee_field':
          value = getFieldValue(student, field.dataSource.fieldPath);
          break;
        case 'static':
          value = field.dataSource.staticValue;
          break;
        case 'computed':
          value = field.dataSource.computedExpression ? 'computed' : null;
          break;
      }
    } else {
      // Try auto-detect from common fields
      const autoMap = {
        'name': student.name,
        'student_id': student.student_id,
        'class': student.studentDetails?.class,
        'level': student.studentDetails?.level,
        'gender': student.gender,
        'residence': student.residence,
        'academic_year': student.studentDetails?.academic_year,
        'department': student.employeeDetails?.department,
        'position': student.employeeDetails?.position,
        'employeeId': student.employeeDetails?.employeeId
      };
      value = autoMap[field.name];
    }

    const isValidValue = value !== null && value !== undefined && value !== '';

    console.log(`  Value for ${field.label}: "${value}", isValid: ${isValidValue}`);

    if (!isValidValue) {
      missingFields.push({
        fieldName: field.name,
        fieldLabel: field.label,
        reason: `Required field "${field.label}" has no data`
      });
    }
  }

  // Check photo requirement
  const photoField = template.fields.find(f => f.type === 'photo');
  if (photoField && photoField.requirement === 'required') {
    const photoUrl = getPhotoUrl(student);
    if (!photoUrl) {
      missingFields.push({
        fieldName: 'photo',
        fieldLabel: 'Photo',
        reason: 'Photo is required but student has no photo uploaded'
      });
    }
  }

  console.log(`Validation result for ${student.name}: isValid=${missingFields.length === 0}, missing=${missingFields.length}`);

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  };
}

// ==================== HELPER: GENERATE CARD WITH DYNAMIC FIELDS ====================
async function generateCardWithDynamicFields(student, template, studentPhotoUrl) {
  try {
    console.log(`🎨 Generating dynamic card for ${student.name}`);

    // Load template image
    const templateImage = await loadImage(template.frontSide.secure_url);
    const ORIGINAL_WIDTH = templateImage.width;
    const ORIGINAL_HEIGHT = templateImage.height;
    const TARGET_WIDTH = 850;
    const TARGET_HEIGHT = Math.round((TARGET_WIDTH * ORIGINAL_HEIGHT) / ORIGINAL_WIDTH);
    const scaleFactor = TARGET_WIDTH / ORIGINAL_WIDTH;

    const canvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(templateImage, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // Scale coordinate helper
    const scaleCoord = (coord) => {
      if (!coord) return null;
      return {
        x: Math.round(coord.x * scaleFactor),
        y: Math.round(coord.y * scaleFactor),
        width: coord.width ? Math.round(coord.width * scaleFactor) : undefined,
        height: coord.height ? Math.round(coord.height * scaleFactor) : undefined,
        maxWidth: coord.maxWidth ? Math.round(coord.maxWidth * scaleFactor) : undefined,  // ← Add this
        fontSize: coord.fontSize ? Math.round(coord.fontSize * scaleFactor) : undefined   // ← Add this for reference
      };
    };

    // Process each field from template
    for (const field of template.fields) {
      if (!field.position) continue;

      const scaledPos = scaleCoord(field.position);
      if (!scaledPos) continue;

      // Handle photo fields
      if (field.type === 'photo') {
        console.log('📸 Photo field styling:', JSON.stringify(field.styling, null, 2));

        // Extract photo URL properly using the helper
        let photoUrl = null;

        if (studentPhotoUrl && typeof studentPhotoUrl === 'string') {
          photoUrl = studentPhotoUrl;
        } else if (student.photo_url) {
          if (typeof student.photo_url === 'string') {
            photoUrl = student.photo_url;
          } else if (typeof student.photo_url === 'object') {
            photoUrl = student.photo_url.secure_url || student.photo_url.url || null;
          }
        }

        // Get styling from field (with defaults)
        const styling = field.styling || {};
        const {
          borderColor = '#005800',
          borderWidth = 3,
          borderRadius = 10,
          noBorder = false
        } = styling;

        if (photoUrl && scaledPos.width && scaledPos.height) {
          try {
            console.log(`📸 Loading photo for ${student.name} from: ${photoUrl.substring(0, 80)}`);
            const studentPhoto = await loadImageFromUrl(photoUrl);

            // Draw photo with clipping (rounded corners)
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(scaledPos.x, scaledPos.y, scaledPos.width, scaledPos.height, borderRadius);
            ctx.clip();
            ctx.drawImage(studentPhoto, scaledPos.x, scaledPos.y, scaledPos.width, scaledPos.height);
            ctx.restore();

            // Add border (if not disabled and border width > 0)
            if (!noBorder && borderWidth > 0) {
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(scaledPos.x, scaledPos.y, scaledPos.width, scaledPos.height, borderRadius);
              ctx.strokeStyle = borderColor;
              ctx.lineWidth = borderWidth;
              ctx.stroke();
              ctx.restore();
            }

            console.log(`✅ Photo placed for ${student.name}`);
          } catch (photoError) {
            console.warn(`⚠️ Could not load photo for ${student.name}:`, photoError.message);
            drawPhotoPlaceholder(ctx, scaledPos, styling);
          }
        } else {
          // No photo available - draw placeholder with styling
          if (scaledPos.width && scaledPos.height) {
            console.log(`📷 No photo available for ${student.name}, drawing placeholder`);
            drawPhotoPlaceholder(ctx, scaledPos, styling);
          }
        }
        continue;
      }

      // Handle text fields
      // Handle text fields - NO FONT SCALING (user sets final size)
      if (field.type === 'text') {
        let textValue = null;

        if (field.dataSource) {
          switch (field.dataSource.sourceType) {
            case 'student_field':
            case 'employee_field':
              textValue = getFieldValue(student, field.dataSource.fieldPath);
              break;
            case 'static':
              textValue = field.dataSource.staticValue;
              break;
            case 'computed':
              textValue = evaluateComputedExpression(field.dataSource.computedExpression, student);
              break;
          }
        }

        // Auto-detect fallback for common fields
        if (!textValue) {
          const autoMap = {
            'name': student.name,
            'student_id': student.student_id,
            'class': student.studentDetails?.class,
            'level': student.studentDetails?.level,
            'gender': student.gender,
            'residence': student.residence,
            'academic_year': student.studentDetails?.academic_year,
            'department': student.employeeDetails?.department,
            'position': student.employeeDetails?.position,
            'employeeId': student.employeeDetails?.employeeId
          };
          textValue = autoMap[field.name];
        }

        if (!textValue) continue;

        // ✅ USE FONT SIZE DIRECTLY - NO SCALING
        const fontSize = Math.max(8, field.position.fontSize || 20);

        console.log(`🔤 Using font: ${fontSize}px (user set: ${field.position.fontSize || 20})`);

        // Configure text rendering
        ctx.textBaseline = 'top';
        ctx.textAlign = field.position.textAlign || 'left';
        ctx.font = `${field.position.isBold ? 'bold ' : ''}${fontSize}px Arial`;
        ctx.fillStyle = field.position.fontColor || '#000000';

        let displayText = String(textValue).trim();

        // Handle text truncation (maxWidth is already scaled in scaleCoord)
        const maxWidth = scaledPos.maxWidth;
        if (maxWidth) {
          let currentSize = fontSize;
          ctx.font = `${field.position.isBold ? 'bold ' : ''}${currentSize}px Arial`;
          while (currentSize > 8 && ctx.measureText(displayText).width > maxWidth) {
            currentSize--;
            ctx.font = `${field.position.isBold ? 'bold ' : ''}${currentSize}px Arial`;
          }
          if (ctx.measureText(displayText).width > maxWidth) {
            while (displayText.length > 3 && ctx.measureText(displayText + '...').width > maxWidth) {
              displayText = displayText.slice(0, -1);
            }
            displayText += '...';
          }
        }

        ctx.fillText(displayText, scaledPos.x, scaledPos.y);
        console.log(`✅ Rendered ${field.label}: "${displayText}" at (${scaledPos.x}, ${scaledPos.y}) with font ${fontSize}px`);
      }
    }

    const frontBuffer = canvas.toBuffer('image/png');

    // Handle back side
    let backBuffer = null;
    if (template.templateType === 'two-sided' && template.backSide?.secure_url) {
      try {
        const backTemplate = await loadImageFromUrl(template.backSide.secure_url);
        const backCanvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
        const backCtx = backCanvas.getContext('2d');
        backCtx.imageSmoothingEnabled = true;
        backCtx.imageSmoothingQuality = 'high';
        backCtx.drawImage(backTemplate, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        backBuffer = backCanvas.toBuffer('image/png');
      } catch (backError) {
        console.warn('Could not generate back side:', backError.message);
      }
    }

    return { frontBuffer, backBuffer };

  } catch (error) {
    console.error(`❌ Card generation failed for ${student.name}:`, error);
    throw error;
  }
}


// ==================== HELPER:  SAVE CARD GENERATION HISTORY ========================
async function saveCardHistory(person, template, generationType, batchId, status = 'success', errorMessage = null, duration = null, generatedBy = null) {
  try {
    // Use the provided generatedBy or fallback to person.createdBy or system
    const userId = generatedBy || person.createdBy || person.companyId;

    const historyEntry = new CardHistory({
      personId: person._id,
      templateId: template._id,
      organizationId: person.schoolId,
      companyId: person.companyId,
      generatedBy: userId,
      generationType: generationType,
      batchId: batchId,
      status: status,
      errorMessage: errorMessage,
      metadata: {
        templateName: template.name,
        templateType: template.templateType,
        personName: person.name,
        personId: person.student_id,
        generationDuration: duration
      }
    });

    await historyEntry.save();
    console.log(`✅ Card history saved: ${status} - ${person.name} - ${template.name}`);
    return historyEntry;
  } catch (error) {
    console.error('Failed to save card history:', error);
    // Don't throw - just log, history shouldn't break card generation
    return null;
  }
}


// DrawPhotoPlaceholder 
function drawPhotoPlaceholder(ctx, coords, styling = {}) {
  const { x, y, width, height } = coords;
  const {
    borderColor = '#005800',
    borderWidth = 3,
    borderRadius = 10,
    placeholderColor = '#10B981',
    placeholderBg = 'rgba(16, 185, 129, 0.05)',
    showCameraIcon = true,
    showPlaceholderText = true,
    noBorder = false
  } = styling;

  ctx.save();

  // Draw background
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fillStyle = placeholderBg;
  ctx.fill();

  // Draw border (if not disabled and border width > 0)
  if (!noBorder && borderWidth > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }

  // Draw camera icon
  if (showCameraIcon) {
    ctx.fillStyle = placeholderColor;
    const iconSize = Math.min(36, height * 0.3);
    ctx.font = `bold ${iconSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const yOffset = showPlaceholderText ? 15 : 0;
    ctx.fillText('📷', x + width / 2, y + height / 2 - yOffset);
  }

  // Draw text
  if (showPlaceholderText) {
    ctx.fillStyle = '#666666';
    const textSize = Math.max(10, Math.min(14, height * 0.1));
    ctx.font = `${textSize}px Arial`;
    ctx.fillText('Add Photo', x + width / 2, y + height - 20);
  }

  ctx.restore();
}

// Helper function to ensure photo fields have complete styling
function ensurePhotoStyling(fields, defaultPersonType = 'student') {
  const defaultStyling = defaultPersonType === 'student' ? {
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

  return fields.map(field => {
    if (field.type === 'photo') {
      return {
        ...field,
        styling: {
          ...defaultStyling,
          ...(field.styling || {})
        }
      };
    }
    return field;
  });
}

// helper function to get PhotouRL
function getPhotoUrl(student) {
  if (!student) return null;

  // Get the photo_url value
  let photoUrl = student.photo_url;

  // If it's an object, extract the secure_url or url
  if (photoUrl && typeof photoUrl === 'object') {
    photoUrl = photoUrl.secure_url || photoUrl.url || null;
  }

  // Ensure it's a string
  if (photoUrl && typeof photoUrl !== 'string') {
    console.warn(`⚠️ Invalid photo_url type for ${student.name}: ${typeof photoUrl}`);
    return null;
  }

  return photoUrl;
}

async function createZipInMemory(files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    files.forEach(file => archive.append(file.buffer, { name: file.name }));
    archive.finalize();
  });
}

// ==================== PREVIEW VALIDATION ENDPOINT ====================
router.post('/preview-validation', authMiddleware, async (req, res) => {
  try {
    const { templateId, organizationId, studentId, personType, filters } = req.body;

    console.log('🔍 Preview validation request:', { templateId, organizationId, studentId, personType });

    // Validate required fields
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    let students = [];

    // Case 1: Single student validation (for single card generation)
    if (studentId) {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }
      students = [student];
    }
    // Case 2: Batch validation from database
    else if (organizationId) {
      const query = { schoolId: organizationId, companyId: req.user.companyId, isActive: true };

      if (personType && personType !== 'all') {
        query.personType = personType;
      }

      if (filters) {
        if (filters.class && filters.class !== 'all' && filters.class !== '') {
          query['studentDetails.class'] = filters.class;
        }
        if (filters.level && filters.level !== 'all' && filters.level !== '') {
          query['studentDetails.level'] = filters.level;
        }
        if (filters.academic_year && filters.academic_year !== 'all' && filters.academic_year !== '') {
          query['studentDetails.academic_year'] = filters.academic_year;
        }
        if (filters.department && filters.department !== 'all' && filters.department !== '') {
          query['employeeDetails.department'] = filters.department;
        }
        if (filters.position && filters.position !== 'all' && filters.position !== '') {
          query['employeeDetails.position'] = filters.position;
        }
        if (filters.gender && filters.gender !== 'all' && filters.gender !== '') {
          query.gender = filters.gender;
        }
      }

      students = await Student.find(query);
    }
    else {
      return res.status(400).json({
        success: false,
        error: 'Either studentId or organizationId is required'
      });
    }

    if (students.length === 0) {
      return res.json({
        success: true,
        totalStudents: 0,
        validCount: 0,
        skippedCount: 0,
        validationResults: [],
        templateFields: template.fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          requirement: f.requirement
        }))
      });
    }

    const validationResults = [];
    let validCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      const validation = await validateStudentForTemplate(student, template);
      validationResults.push({
        student: {
          _id: student._id,
          name: student.name,
          student_id: student.student_id,
          personType: student.personType,
          has_photo: student.has_photo
        },
        isValid: validation.isValid,
        missingFields: validation.missingFields
      });

      if (validation.isValid) validCount++;
      else skippedCount++;
    }

    res.json({
      success: true,
      totalStudents: students.length,
      validCount,
      skippedCount,
      validationResults,
      templateFields: template.fields.map(f => ({
        name: f.name,
        label: f.label,
        type: f.type,
        requirement: f.requirement
      }))
    });

  } catch (error) {
    console.error('Preview validation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// ==================== UPDATE TEMPLATE FIELDS ENDPOINT ====================
router.put('/template/:templateId/fields', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { fields } = req.body;

    console.log('📥 UPDATE TEMPLATE FIELDS - Received');

    const template = await Template.findOne({ _id: templateId, companyId: req.user.companyId });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // ✅ CRITICAL: Ensure photo fields have complete styling
    const defaultStyling = {
      borderColor: '#005800',
      borderWidth: 3,
      borderRadius: 10,
      placeholderColor: '#10B981',
      placeholderBg: 'rgba(16, 185, 129, 0.05)',
      showCameraIcon: true,
      showPlaceholderText: true,
      noBorder: false
    };

    const updatedFields = fields.map(field => {
      if (field.type === 'photo') {
        return {
          ...field,
          styling: {
            ...defaultStyling,
            ...(field.styling || {})
          }
        };
      }
      return field;
    });

    template.fields = updatedFields;
    await template.save();

    // Verify
    const savedPhotoField = template.fields.find(f => f.type === 'photo');
    console.log('✅ Saved photo styling:', savedPhotoField?.styling?.borderColor);

    res.json({ success: true, message: 'Template fields updated' });

  } catch (error) {
    console.error('Update template fields error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================== SINGLE CARD GENERATION ====================
router.post('/generate-single-card', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  let student = null;
  let template = null;

  try {
    const { studentId, templateId } = req.body;

    console.log('🎴 Single card generation request:', { studentId, templateId, user: req.user?.email });

    if (!studentId || !templateId) {
      return res.status(400).json({ success: false, error: 'Student ID and Template ID are required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Check permissions
    if (req.user.role !== 'super_admin' && student.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Validate student before generating
    const validation = await validateStudentForTemplate(student, template);
    if (!validation.isValid) {
      await saveCardHistory(
        student, template, 'single', null, 'failed',
        `Missing fields: ${validation.missingFields.map(f => f.fieldLabel).join(', ')}`,
        Date.now() - startTime, req.user.id
      );

      return res.status(400).json({
        success: false,
        error: 'Student missing required fields',
        missingFields: validation.missingFields
      });
    }

    // Get photo URL safely
    const photoUrl = getPhotoUrl(student);
    const { frontBuffer, backBuffer } = await generateCardWithDynamicFields(student, template, photoUrl);

    const zipBuffer = await createZipInMemory([
      { name: `${student.student_id}/front-side.png`, buffer: frontBuffer },
      ...(backBuffer ? [{ name: `${student.student_id}/back-side.png`, buffer: backBuffer }] : [])
    ]);

    // Update student card generation stats
    student.card_generated = true;
    student.card_generation_count = (student.card_generation_count || 0) + 1;
    student.last_card_generated = new Date();
    if (!student.first_card_generated) student.first_card_generated = new Date();
    await student.save();

    await saveCardHistory(student, template, 'single', null, 'success', null, Date.now() - startTime, req.user.id);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${student.student_id}-id-card.zip"`,
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);

  } catch (error) {
    console.error('Single card generation error:', error);

    if (student && template) {
      try {
        await saveCardHistory(student, template, 'single', null, 'failed', error.message, Date.now() - startTime, req.user?.id);
      } catch (historyError) {
        console.error('Failed to save error history:', historyError);
      }
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ORGANIZATIONS ENDPOINT ====================
router.get('/organizations', authMiddleware, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    let orgQuery = { companyId, isActive: true };

    if (req.user.role === 'co_worker') {
      const allowedOrgIds = req.user.permissions
        .filter(p => p.canGenerateCards || p.canManageStudents)
        .map(p => p.organizationId);
      orgQuery._id = { $in: allowedOrgIds };
    }

    const organizations = await School.find(orgQuery).select('name type logo code stats');

    const orgsWithCounts = await Promise.all(organizations.map(async (org) => {
      const totalPeople = await Student.countDocuments({ schoolId: org._id, isActive: true });
      const withPhotos = await Student.countDocuments({ schoolId: org._id, has_photo: true, isActive: true });
      const cardsGenerated = await Student.countDocuments({ schoolId: org._id, card_generated: true, isActive: true });

      return {
        _id: org._id,
        name: org.name,
        type: org.type,
        code: org.code,
        logo: org.logo?.url,
        stats: { totalPeople, withPhotos, cardsGenerated, pending: totalPeople - cardsGenerated }
      };
    }));

    res.json({ success: true, organizations: orgsWithCounts });

  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET STUDENTS FOR ORGANIZATION ====================
router.get('/organization/:orgId/students', authMiddleware, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { search, personType, hasPhoto, cardGenerated, page = 1, limit = 50 } = req.query;

    const org = await School.findOne({ _id: orgId, companyId: req.user.companyId });
    if (!org) return res.status(404).json({ success: false, error: 'Organization not found' });

    if (req.user.role === 'co_worker') {
      const orgPerm = req.user.permissions.find(p => p.organizationId.toString() === orgId);
      if (!orgPerm || !orgPerm.canGenerateCards) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const query = { schoolId: orgId, companyId: req.user.companyId, isActive: true };
    if (personType) query.personType = personType;
    if (hasPhoto === 'true') query.has_photo = true;
    if (hasPhoto === 'false') query.has_photo = false;
    if (cardGenerated === 'true') query.card_generated = true;
    if (cardGenerated === 'false') query.card_generated = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { student_id: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      Student.find(query).select('student_id name personType studentDetails employeeDetails has_photo photo_url card_generated gender').sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
      Student.countDocuments(query)
    ]);

    res.json({
      success: true,
      organization: { _id: org._id, name: org.name, type: org.type },
      students,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });

  } catch (error) {
    console.error('Get org students error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================== CSV BATCH PROCESSING - USING YOUR CSV PARSER ====================
router.post('/process-csv-generate',
  authMiddleware,
  upload.fields([{ name: 'csv', maxCount: 1 }, { name: 'photoZip', maxCount: 1 }]),
  async (req, res) => {
    const startTime = Date.now();

    try {
      // 1. VALIDATION
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      if (!req.files?.csv) {
        return res.status(400).json({ success: false, error: 'CSV file is required' });
      }
      if (!req.body.templateId) {
        return res.status(400).json({ success: false, error: 'Template ID is required' });
      }
      if (!req.body.organizationId) {
        return res.status(400).json({ success: false, error: 'Organization ID is required' });
      }

      const organizationId = req.body.organizationId;
      const batchId = req.body.batchId || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('📦 CSV Batch request:', { organizationId, templateId: req.body.templateId, batchId });

      // 2. INITIAL PROGRESS
      progressStore.set(batchId, {
        batchId,
        status: 'processing',
        total: 0,
        processed: 0,
        generated: 0,
        failed: 0,
        skipped: 0,
        percentage: 0,
        message: 'Initializing...',
        currentStudent: null,
        failedStudents: [],
        skippedStudents: []
      });

      // 3. VERIFY ORGANIZATION & TEMPLATE
      const org = await School.findOne({ _id: organizationId, companyId: req.user.companyId });
      if (!org) {
        progressStore.delete(batchId);
        return res.status(404).json({ success: false, error: 'Organization not found' });
      }

      const template = await Template.findById(req.body.templateId);
      if (!template) {
        progressStore.delete(batchId);
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      // 4. PARSE CSV USING YOUR EXISTING PARSER
      progressStore.set(batchId, {
        ...progressStore.get(batchId),
        message: 'Parsing CSV file...'
      });

      let csvStudents = [];
      try {
        csvStudents = await parseCSVFromBuffer(req.files.csv[0].buffer);
        console.log(`📊 Parsed ${csvStudents.length} records from CSV`);
      } catch (parseError) {
        console.error('CSV parsing error:', parseError);
        progressStore.delete(batchId);
        return res.status(400).json({ success: false, error: `CSV parsing failed: ${parseError.message}` });
      }

      if (csvStudents.length === 0) {
        progressStore.delete(batchId);
        return res.status(400).json({ success: false, error: 'No valid records found in CSV' });
      }

      // 5. EXTRACT PHOTOS FROM ZIP
      let photoCloudinaryMap = {};
      if (req.files.photoZip?.[0]) {
        progressStore.set(batchId, {
          ...progressStore.get(batchId),
          message: `Processing ZIP file with photos...`
        });

        try {
          photoCloudinaryMap = await extractAndUploadPhotosToCloudinary(req.files.photoZip[0].buffer);
          console.log(`✅ Uploaded ${Object.keys(photoCloudinaryMap).length} photos`);
        } catch (zipError) {
          console.error('ZIP processing failed:', zipError.message);
        }
      }

      // 6. SAVE OR UPDATE STUDENTS (with progress tracking)
      progressStore.set(batchId, {
        ...progressStore.get(batchId),
        message: `Saving ${csvStudents.length} students to database...`,
        total: csvStudents.length
      });

      const savedStudents = [];
      const saveErrors = [];

      for (let i = 0; i < csvStudents.length; i++) {
        const studentData = csvStudents[i];

        // Update progress every 10 students
        if (i % 10 === 0 && i > 0) {
          progressStore.set(batchId, {
            ...progressStore.get(batchId),
            message: `Saving students: ${i}/${csvStudents.length}...`,
            processed: i
          });
        }

        try {
          // Determine the ID field based on person type
          const personId = studentData.personType === 'student'
            ? studentData.student_id
            : studentData.employeeDetails?.employeeId;

          if (!personId) {
            saveErrors.push({
              name: studentData.name,
              id: 'N/A',
              reason: 'Missing ID field'
            });
            continue;
          }

          // Check if person exists
          const existingPerson = await Student.findOne({
            $or: [
              { student_id: personId, schoolId: organizationId },
              { 'employeeDetails.employeeId': personId, schoolId: organizationId }
            ]
          });

          const cloudinaryPhoto = photoCloudinaryMap[personId];

          if (existingPerson) {
            // Update existing person
            existingPerson.name = studentData.name;
            existingPerson.gender = studentData.gender || existingPerson.gender;
            existingPerson.residence = studentData.residence || existingPerson.residence;

            if (studentData.personType === 'student') {
              existingPerson.studentDetails = {
                ...existingPerson.studentDetails,
                class: studentData.studentDetails?.class || existingPerson.studentDetails?.class,
                level: studentData.studentDetails?.level || existingPerson.studentDetails?.level,
                academic_year: studentData.studentDetails?.academic_year || existingPerson.studentDetails?.academic_year,
                parent_phone: studentData.studentDetails?.parent_phone || existingPerson.studentDetails?.parent_phone
              };
            } else {
              existingPerson.employeeDetails = {
                ...existingPerson.employeeDetails,
                department: studentData.employeeDetails?.department || existingPerson.employeeDetails?.department,
                position: studentData.employeeDetails?.position || existingPerson.employeeDetails?.position,
                workPhone: studentData.employeeDetails?.workPhone || existingPerson.employeeDetails?.workPhone
              };
            }

            if (cloudinaryPhoto) {
              existingPerson.photo_url = cloudinaryPhoto.secure_url;
              existingPerson.photo_public_id = cloudinaryPhoto.public_id;
              existingPerson.has_photo = true;
            }

            await existingPerson.save();
            savedStudents.push(existingPerson);
          } else {
            // Create new person
            const newPersonData = {
              name: studentData.name,
              schoolId: organizationId,
              companyId: req.user.companyId,
              personType: studentData.personType,
              gender: studentData.gender || '',
              residence: studentData.residence || '',
              photo_url: cloudinaryPhoto?.secure_url,
              photo_public_id: cloudinaryPhoto?.public_id,
              has_photo: !!cloudinaryPhoto
            };

            if (studentData.personType === 'student') {
              newPersonData.student_id = studentData.student_id;
              newPersonData.studentDetails = studentData.studentDetails || {};
            } else {
              newPersonData.employeeDetails = studentData.employeeDetails || {};
            }

            const newPerson = new Student(newPersonData);
            await newPerson.save();
            savedStudents.push(newPerson);
          }
        } catch (error) {
          console.error(`Failed to save person:`, error.message);
          saveErrors.push({
            name: studentData.name,
            id: studentData.student_id || studentData.employeeDetails?.employeeId,
            reason: `Database error: ${error.message}`
          });
        }
      }

      console.log(`✅ Saved ${savedStudents.length} students, ${saveErrors.length} errors`);

      // 7. VALIDATE STUDENTS AGAINST TEMPLATE (SAME LOGIC AS batch-from-db)
      progressStore.set(batchId, {
        ...progressStore.get(batchId),
        message: `Validating ${savedStudents.length} students against template...`
      });

      const validStudents = [];
      const skippedStudents = [...saveErrors];

      for (const student of savedStudents) {
        const validation = await validateStudentForTemplate(student, template);
        if (validation.isValid) {
          validStudents.push(student);
        } else {
          skippedStudents.push({
            name: student.name,
            id: student.student_id || student.employeeDetails?.employeeId,
            reason: `Missing required fields: ${validation.missingFields.map(f => f.fieldLabel).join(', ')}`
          });
        }
      }

      console.log(`✅ Valid: ${validStudents.length}, Skipped: ${skippedStudents.length}`);

      if (validStudents.length === 0) {
        const finalProgress = {
          batchId,
          status: 'completed',
          total: savedStudents.length,
          processed: savedStudents.length,
          generated: 0,
          failed: 0,
          skipped: skippedStudents.length,
          percentage: 100,
          failedStudents: [],
          skippedStudents: skippedStudents,
          message: `No valid students found. ${skippedStudents.length} students skipped.`
        };
        progressStore.set(batchId, finalProgress);

        res.setHeader('X-Batch-Id', batchId);
        res.set({
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="batch-cards-${Date.now()}.zip"`
        });

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);
        archive.finalize();

        setTimeout(() => progressStore.delete(batchId), 3600000);
        return;
      }

      // 8. SETUP FOR CARD GENERATION
      progressStore.set(batchId, {
        batchId,
        status: 'generating',
        total: validStudents.length,
        processed: 0,
        generated: 0,
        failed: 0,
        skipped: skippedStudents.length,
        percentage: 0,
        failedStudents: [],
        skippedStudents: skippedStudents,
        message: `Starting generation for ${validStudents.length} students...`
      });

      // Set response headers for streaming ZIP
      res.setHeader('X-Batch-Id', batchId);
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="batch-cards-${Date.now()}.zip"`
      });

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      let generatedCount = 0;
      let failedCount = 0;
      const failedStudents = [];

      // 9. GENERATE CARDS (SAME LOOP AS batch-from-db)
      for (let i = 0; i < validStudents.length; i++) {
        const currentStudent = validStudents[i];
        const currentIndex = i + 1;
        const percentage = Math.round((currentIndex / validStudents.length) * 100);

        // Update progress
        const currentProgress = {
          batchId,
          status: 'generating',
          total: validStudents.length,
          processed: currentIndex,
          generated: generatedCount,
          failed: failedCount,
          skipped: skippedStudents.length,
          percentage: percentage,
          currentStudent: {
            name: currentStudent.name,
            id: currentStudent.student_id || currentStudent.employeeDetails?.employeeId,
            index: currentIndex,
            total: validStudents.length,
            status: 'generating'
          },
          failedStudents: failedStudents,
          skippedStudents: skippedStudents,
          message: `Generating card ${currentIndex} of ${validStudents.length}: ${currentStudent.name}`
        };

        progressStore.set(batchId, currentProgress);
        console.log(`📊 Progress: ${percentage}% - ${currentStudent.name}`);

        try {
          const photoUrl = getPhotoUrl(currentStudent);
          const { frontBuffer, backBuffer } = await generateCardWithDynamicFields(currentStudent, template, photoUrl);

          const folderName = currentStudent.student_id || currentStudent.employeeDetails?.employeeId || currentStudent._id;
          archive.append(frontBuffer, { name: `${folderName}/front-side.png` });
          if (backBuffer) {
            archive.append(backBuffer, { name: `${folderName}/back-side.png` });
          }

          // Update student record
          currentStudent.card_generated = true;
          currentStudent.card_generation_count = (currentStudent.card_generation_count || 0) + 1;
          currentStudent.last_card_generated = new Date();
          if (!currentStudent.first_card_generated) currentStudent.first_card_generated = new Date();
          await currentStudent.save();

          await saveCardHistory(currentStudent, template, 'batch', batchId, 'success', null, Date.now() - startTime, req.user.id);
          generatedCount++;

        } catch (error) {
          console.error(`Failed for ${currentStudent.name}:`, error.message);
          failedCount++;
          failedStudents.push({
            name: currentStudent.name,
            id: currentStudent.student_id || currentStudent.employeeDetails?.employeeId,
            reason: error.message
          });

          await saveCardHistory(currentStudent, template, 'batch', batchId, 'failed', error.message, Date.now() - startTime, req.user.id);
        }
      }

      // 10. FINAL PROGRESS
      const finalProgress = {
        batchId,
        status: 'completed',
        total: validStudents.length,
        processed: validStudents.length,
        generated: generatedCount,
        failed: failedCount,
        skipped: skippedStudents.length,
        percentage: 100,
        failedStudents: failedStudents,
        skippedStudents: skippedStudents,
        message: `✅ Complete! Generated ${generatedCount} of ${validStudents.length} cards. Failed: ${failedCount}, Skipped: ${skippedStudents.length}`
      };

      progressStore.set(batchId, finalProgress);
      console.log(`✅ CSV Batch ${batchId} complete: ${generatedCount} generated, ${failedCount} failed, ${skippedStudents.length} skipped`);

      await archive.finalize();

      // Clean up after 1 hour
      setTimeout(() => {
        progressStore.delete(batchId);
      }, 3600000);

    } catch (error) {
      console.error('CSV Batch processing error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }
);


// ==================== BATCH GENERATION FROM DATABASE - FIXED ====================
router.post('/generate-batch-from-db', authMiddleware, async (req, res) => {
  const startTime = Date.now();

  try {
    const { templateId, filters, organizationId, personType, batchId: frontendBatchId } = req.body;

    console.log('📦 Batch from DB request:', { templateId, organizationId, personType, frontendBatchId });

    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID is required' });
    }

    // Build query
    const query = { schoolId: organizationId, companyId: req.user.companyId, isActive: true };

    if (personType && personType !== 'all') {
      query.personType = personType;
    }
    if (filters) {
      if (filters.class && filters.class !== 'all' && filters.class !== '') query['studentDetails.class'] = filters.class;
      if (filters.level && filters.level !== 'all' && filters.level !== '') query['studentDetails.level'] = filters.level;
      if (filters.academic_year && filters.academic_year !== 'all' && filters.academic_year !== '') query['studentDetails.academic_year'] = filters.academic_year;
      if (filters.department && filters.department !== 'all' && filters.department !== '') query['employeeDetails.department'] = filters.department;
      if (filters.position && filters.position !== 'all' && filters.position !== '') query['employeeDetails.position'] = filters.position;
      if (filters.gender && filters.gender !== 'all' && filters.gender !== '') query.gender = filters.gender;
    }

    const students = await Student.find(query);

    if (students.length === 0) {
      return res.status(404).json({ success: false, error: 'No students found matching the filters' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // USE THE FRONTEND BATCH ID - DON'T GENERATE A NEW ONE
    const batchId = frontendBatchId || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('✅ Using batch ID:', batchId);

    // Store progress in memory
    progressStore.set(batchId, {
      batchId,
      status: 'processing',
      total: students.length,
      processed: 0,
      generated: 0,
      failed: 0,
      skipped: 0,
      percentage: 0,
      failedStudents: [],
      skippedStudents: [],
      startTime: Date.now()
    });

    // Set response headers for streaming ZIP
    res.setHeader('X-Batch-Id', batchId);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="batch-cards-${Date.now()}.zip"`
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    let generatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const failedStudents = [];
    const skippedStudents = [];

    for (let i = 0; i < students.length; i++) {
      const rawStudent = students[i];
      const currentIndex = i + 1;
      const percentage = Math.round((currentIndex / students.length) * 100);

      // Update progress store
      const progress = progressStore.get(batchId);
      if (progress) {
        progress.processed = currentIndex;
        progress.generated = generatedCount;
        progress.failed = failedCount;
        progress.skipped = skippedCount;
        progress.percentage = percentage;
        progress.currentStudent = {
          name: rawStudent.name,
          id: rawStudent.student_id || rawStudent.employeeDetails?.employeeId
        };
        progressStore.set(batchId, progress);
      }

      // Validate student before generating
      const validation = await validateStudentForTemplate(rawStudent, template);

      if (!validation.isValid) {
        const errorMsg = `Missing: ${validation.missingFields.map(f => f.fieldLabel).join(', ')}`;
        skippedCount++;
        skippedStudents.push({
          name: rawStudent.name,
          id: rawStudent.student_id || rawStudent.employeeDetails?.employeeId,
          reason: errorMsg
        });
        continue;
      }

      try {
        const student = {
          ...rawStudent.toObject(),
          photo_url: getPhotoUrl(rawStudent)
        };

        const { frontBuffer, backBuffer } = await generateCardWithDynamicFields(
          student, template, student.photo_url
        );

        const folderName = student.student_id || student.employeeDetails?.employeeId || student._id;
        archive.append(frontBuffer, { name: `${folderName}/front-side.png` });
        if (backBuffer) {
          archive.append(backBuffer, { name: `${folderName}/back-side.png` });
        }

        rawStudent.card_generated = true;
        rawStudent.card_generation_count = (rawStudent.card_generation_count || 0) + 1;
        rawStudent.last_card_generated = new Date();
        if (!rawStudent.first_card_generated) rawStudent.first_card_generated = new Date();
        await rawStudent.save();

        await saveCardHistory(rawStudent, template, 'batch', batchId, 'success', null, Date.now() - startTime, req.user.id);
        generatedCount++;

      } catch (error) {
        console.error(`Failed for ${rawStudent.name}:`, error.message);
        failedCount++;
        failedStudents.push({
          name: rawStudent.name,
          id: rawStudent.student_id || rawStudent.employeeDetails?.employeeId,
          reason: error.message
        });

        await saveCardHistory(rawStudent, template, 'batch', batchId, 'failed', error.message, Date.now() - startTime, req.user.id);
      }
    }

    // Update final progress
    progressStore.set(batchId, {
      batchId,
      status: 'completed',
      total: students.length,
      processed: students.length,
      generated: generatedCount,
      failed: failedCount,
      skipped: skippedCount,
      percentage: 100,
      failedStudents: failedStudents,
      skippedStudents: skippedStudents
    });

    await archive.finalize();
    console.log(`✅ Batch ${batchId} complete: ${generatedCount} generated, ${failedCount} failed, ${skippedCount} skipped`);

    setTimeout(() => progressStore.delete(batchId), 3600000);

  } catch (error) {
    console.error('Batch from DB error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// ==================== BATCH PROGRESS ENDPOINT - FIXED ====================
router.get('/batch-progress/:batchId', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;

    console.log('📊 Getting batch progress for:', batchId);

    const progress = progressStore.get(batchId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    res.json({
      success: true,
      progress: {
        batchId: progress.batchId,
        status: progress.status,
        total: progress.total,
        processed: progress.processed || 0,
        generated: progress.generated || 0,
        failed: progress.failed || 0,
        skipped: progress.skipped || 0,
        percentage: progress.percentage || 0,
        message: progress.message,
        currentStudent: progress.currentStudent,
        failedStudents: progress.failedStudents || [],
        skippedStudents: progress.skippedStudents || []
      }
    });
  } catch (error) {
    console.error('Get batch progress error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TEMPLATE DIMENSIONS ====================
router.get('/template-dimensions/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    // Add validation
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    if (!template.frontSide?.secure_url) {
      return res.status(400).json({ success: false, error: 'Template has no image' });
    }

    const templateImage = await loadImageFromUrl(template.frontSide.secure_url);
    const originalDimensions = { width: templateImage.width, height: templateImage.height };

    const TARGET_WIDTH = 850;
    const scaledHeight = Math.round((TARGET_WIDTH * originalDimensions.height) / originalDimensions.width);
    const scaleFactor = TARGET_WIDTH / originalDimensions.width;

    res.json({
      success: true,
      dimensions: {
        original: originalDimensions,
        scaled: { width: TARGET_WIDTH, height: scaledHeight, scaleFactor: scaleFactor.toFixed(4) },
        preview: {
          width: 800,
          height: Math.round((800 * originalDimensions.height) / originalDimensions.width),
          scaleFactor: (800 / originalDimensions.width).toFixed(4)
        }
      }
    });

  } catch (error) {
    console.error('Error getting template dimensions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================== STUDENT PHOTO UPLOAD - FIXED WITH UNSIGNED PRESET ====================
router.post('/upload-student-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.body;

    console.log('📸 Photo upload request:', { studentId, userId: req.user?.id, role: req.user?.role });

    if (!studentId || !req.file) {
      return res.status(400).json({ success: false, error: 'Student ID and photo are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Permission checks
    if (req.user.role === 'super_admin') {
      // Allow
    } else if (req.user.role === 'admin') {
      if (student.companyId?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - Student belongs to different company'
        });
      }
    } else if (req.user.role === 'co_worker') {
      const hasPermission = req.user.permissions?.some(
        p => p.organizationId?.toString() === student.schoolId?.toString() &&
          p.canUploadPhotos === true
      );
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to upload photos for this organization'
        });
      }
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // ✅ FIXED: Delete old photo if exists
    if (student.photo_public_id) {
      try {
        await cloudinary.uploader.destroy(student.photo_public_id);
        console.log('🗑️ Deleted old photo:', student.photo_public_id);
      } catch (e) {
        console.warn('Could not delete old photo:', e.message);
      }
    }

    // ✅ FIXED: Upload new photo using unsigned preset
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const FormData = require('form-data');
    const fetch = require('node-fetch');
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', 'card_agent_unsigned');
    const studentIdClean = student.student_id || student._id;
    formData.append('public_id', `student_${studentIdClean}_${Date.now()}`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      }
    );

    const uploadResult = await response.json();

    if (!response.ok || !uploadResult.secure_url) {
      console.error('❌ Cloudinary upload failed:', uploadResult);
      return res.status(500).json({
        success: false,
        error: uploadResult.error?.message || 'Photo upload failed'
      });
    }

    console.log('✅ Photo uploaded to Cloudinary:', uploadResult.secure_url);

    // Update student
    student.photo_url = uploadResult.secure_url;
    student.photo_public_id = uploadResult.public_id;
    student.has_photo = true;
    student.photo_uploaded_at = new Date();
    student.photo_metadata = {
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes
    };

    await student.save();

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photo_url: uploadResult.secure_url,
      student: {
        _id: student._id,
        name: student.name,
        has_photo: true
      }
    });

  } catch (error) {
    console.error('❌ Photo upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// ==================== LIST ALL ACTIVE BATCHES (optional, for debugging) ====================
router.get('/active-batches', authMiddleware, async (req, res) => {
  try {
    const activeBatches = Array.from(progressStore.entries()).map(([id, data]) => ({
      batchId: id,
      status: data.status,
      total: data.total,
      processed: data.processed,
      generated: data.generated,
      failed: data.failed,
      skipped: data.skipped,
      percentage: data.percentage
    }));

    res.json({
      success: true,
      batches: activeBatches
    });
  } catch (error) {
    console.error('Get active batches error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;