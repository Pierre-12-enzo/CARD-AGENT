// routes/card.js - CARD-AGENT with Organization support
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createCanvas, loadImage, registerFont } = require('canvas');
const cloudinary = require('cloudinary').v2;
const Student = require('../models/Student');
const Template = require('../models/Template');
const School = require('../models/School'); // School = Organization
const authMiddleware = require('../middleware/authMiddleware');
const archiver = require('archiver');
const socketService = require('../services/socketService');

// Progress tracking store (in-memory, for production use Redis)
const progressStore = new Map();

// Import utilities
const { parseCSVFromBuffer } = require('../utilis/csvParser');
const { extractAndUploadPhotosToCloudinary, uploadToCloudinaryWithRetry } = require('../utilis/cloudinaryUpload');
const { loadImageFromUrl } = require('../utilis/imageLoader');

// Configure Cloudinary
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
} catch (error) {
  console.warn('⚠️ Could not register Arial font:', error.message);
}

// ==================== ORGANIZATIONS FOR CARD GENERATION ====================

// GET organizations for card generation (grouped view with stats)
router.get('/organizations', authMiddleware, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // If co_worker, only show orgs they have permission for
    let orgQuery = { companyId, isActive: true };
    if (req.user.role === 'co_worker') {
      const allowedOrgIds = req.user.permissions
        .filter(p => p.canGenerateCards || p.canManageStudents)
        .map(p => p.organizationId);
      orgQuery._id = { $in: allowedOrgIds };
    }

    const organizations = await School.find(orgQuery)
      .select('name type logo code stats');

    // Get counts
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
        stats: {
          totalPeople,
          withPhotos,
          cardsGenerated,
          pending: totalPeople - cardsGenerated
        }
      };
    }));

    res.json({
      success: true,
      organizations: orgsWithCounts
    });

  } catch (error) {
    console.error('Get organizations for cards error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET students for a specific organization (for card generation)
router.get('/organization/:orgId/students', authMiddleware, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { search, personType, hasPhoto, cardGenerated, page = 1, limit = 50 } = req.query;

    // Verify org belongs to company
    const org = await School.findOne({ _id: orgId, companyId: req.user.companyId });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Check co-worker permission
    if (req.user.role === 'co_worker') {
      const orgPerm = req.user.permissions.find(
        p => p.organizationId.toString() === orgId
      );
      if (!orgPerm || !orgPerm.canGenerateCards) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const query = {
      schoolId: orgId,
      companyId: req.user.companyId,
      isActive: true
    };

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
      Student.find(query)
        .select('student_id name personType studentDetails employeeDetails has_photo photo_url card_generated gender')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(query)
    ]);

    res.json({
      success: true,
      organization: {
        _id: org._id,
        name: org.name,
        type: org.type
      },
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get org students for cards error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SINGLE CARD GENERATION ====================

router.post('/generate-single-card', upload.none(), async (req, res) => {
  try {
    console.log('🎯 Starting single card generation...');

    const { studentId, templateId, coordinates } = req.body;

    if (!studentId || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and Template ID are required'
      });
    }

    let parsedCoordinates = {};
    try {
      parsedCoordinates = coordinates ? JSON.parse(coordinates) : {};
    } catch (parseError) {
      console.warn('⚠️ Could not parse coordinates:', parseError.message);
    }

    const template = await Template.findById(templateId);
    const student = await Student.findById(studentId);

    if (!template) throw new Error('Template not found');
    if (!student) throw new Error('Student not found');

    // Check company access
    if (req.user.role !== 'super_admin' && student.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    console.log(`🖼️ Generating card for: ${student.name}`);

    // ========== SOCKET: Notify generation started ==========
    socketService.emit('card:generated', {
      userId: req.user.id,
      companyId: req.user.companyId,
      status: 'started',
      student: {
        id: student._id,
        name: student.name,
        studentId: student.student_id
      }
    });

    const { frontBuffer, backBuffer } = await generateCardsWithCloudinary(
      student, template, parsedCoordinates, student.photo_url
    );

    const zipBuffer = await createZipInMemory([
      { name: `${student.student_id}/front-side.png`, buffer: frontBuffer },
      ...(backBuffer ? [{ name: `${student.student_id}/back-side.png`, buffer: backBuffer }] : [])
    ]);

    student.card_generated = true;
    student.card_generation_count = (student.card_generation_count || 0) + 1;
    student.last_card_generated = new Date();
    if (!student.first_card_generated) student.first_card_generated = new Date();
    await student.save();

    // ========== SOCKET: Notify generation complete ==========
    socketService.emit('card:generated', {
      userId: req.user.id,
      companyId: req.user.companyId,
      status: 'completed',
      student: {
        id: student._id,
        name: student.name,
        studentId: student.student_id
      }
    });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${student.student_id}-id-card.zip"`,
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);
    console.log(`📥 Card sent for ${student.name}`);

  } catch (error) {
    console.error('❌ Single card generation error:', error);

    // ========== SOCKET: Notify error ==========
    socketService.emit('card:generated', {
      userId: req.user.id,
      companyId: req.user.companyId,
      status: 'failed',
      error: error.message
    });

    res.status(500).json({ success: false, error: error.message });
  }
});
// ==================== BATCH PROCESSING FROM CSV/ZIP ====================

router.post('/process-csv-generate', upload.fields([
  { name: 'csv', maxCount: 1 },
  { name: 'photoZip', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🚀 Starting batch processing with Cloudinary...');

    if (!req.files || !req.files.csv) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }
    if (!req.body.templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }
    if (!req.body.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID is required' });
    }

    const organizationId = req.body.organizationId;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Verify organization
    const org = await School.findOne({ _id: organizationId, companyId: req.user.companyId });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    console.log('📁 Files received:', {
      csvSize: `${(req.files.csv[0].size / 1024).toFixed(2)} KB`,
      hasPhotoZip: !!req.files.photoZip,
      templateId: req.body.templateId,
      organization: org.name
    });

    // Initialize progress
    const initialProgress = {
      batchId,
      status: 'starting',
      processed: 0,
      generated: 0,
      failed: 0,
      total: 0,
      currentStudent: null,
      percentage: 0,
      startTime: new Date()
    };
    progressStore.set(batchId, initialProgress);

    // ========== SOCKET: Batch started ==========
    socketService.emit('card:batch-started', {
      userId: req.user.id,
      companyId: req.user.companyId,
      batchId,
      organization: org.name
    });

    // Parse CSV
    const students = await parseCSVFromBuffer(req.files.csv[0].buffer);
    const studentsWithOrg = students.map(student => ({
      ...student,
      schoolId: organizationId,
      companyId: req.user.companyId
    }));
    console.log(`✅ Parsed ${studentsWithOrg.length} students from CSV`);

    let progress = progressStore.get(batchId);
    progress.status = 'parsing_csv';
    progress.total = studentsWithOrg.length;
    progressStore.set(batchId, progress);

    // ========== SOCKET: CSV parsed ==========
    socketService.emit('card:batch-progress', {
      userId: req.user.id,
      batchId,
      percentage: 5,
      status: 'parsing_csv',
      message: `Parsed ${studentsWithOrg.length} students from CSV`
    });

    // Extract & upload photos
    let photoCloudinaryMap = {};
    if (req.files.photoZip && req.files.photoZip[0]) {
      console.log('📦 Extracting photos from ZIP and uploading to Cloudinary...');

      socketService.emit('card:batch-progress', {
        userId: req.user.id,
        batchId,
        percentage: 10,
        status: 'uploading_photos',
        message: 'Uploading photos to Cloudinary...'
      });

      photoCloudinaryMap = await extractAndUploadPhotosToCloudinary(req.files.photoZip[0].buffer);
      console.log(`✅ Uploaded ${Object.keys(photoCloudinaryMap).length} photos to Cloudinary`);
    }

    // Save students
    console.log('💾 Saving/updating students in database...');
    progress.status = 'saving_students';
    progressStore.set(batchId, progress);

    socketService.emit('card:batch-progress', {
      userId: req.user.id,
      batchId,
      percentage: 15,
      status: 'saving_students',
      message: 'Saving students to database...'
    });

    const savedStudents = [];
    for (const studentData of studentsWithOrg) {
      try {
        const existingStudent = await Student.findOne({ student_id: studentData.student_id });
        const cloudinaryPhoto = photoCloudinaryMap[studentData.student_id];

        if (existingStudent) {
          Object.assign(existingStudent, studentData);
          if (cloudinaryPhoto) {
            existingStudent.photo_url = cloudinaryPhoto.secure_url;
            existingStudent.photo_public_id = cloudinaryPhoto.public_id;
            existingStudent.photo_metadata = {
              width: cloudinaryPhoto.width, height: cloudinaryPhoto.height,
              format: cloudinaryPhoto.format, bytes: cloudinaryPhoto.bytes
            };
            existingStudent.has_photo = true;
            existingStudent.photo_uploaded_at = new Date();
          }
          await existingStudent.save();
          savedStudents.push(existingStudent);
        } else {
          const student = new Student({
            ...studentData,
            photo_url: cloudinaryPhoto ? cloudinaryPhoto.secure_url : null,
            photo_public_id: cloudinaryPhoto ? cloudinaryPhoto.public_id : null,
            photo_metadata: cloudinaryPhoto ? {
              width: cloudinaryPhoto.width, height: cloudinaryPhoto.height,
              format: cloudinaryPhoto.format, bytes: cloudinaryPhoto.bytes
            } : null,
            has_photo: !!cloudinaryPhoto,
            photo_uploaded_at: cloudinaryPhoto ? new Date() : null
          });
          await student.save();
          savedStudents.push(student);
        }
      } catch (error) {
        console.error(`❌ Failed to save student ${studentData.student_id}:`, error.message);
      }
    }

    console.log(`✅ Total students saved: ${savedStudents.length}`);

    // Get template
    const template = await Template.findById(req.body.templateId);
    if (!template) {
      progressStore.delete(batchId);
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const coordinates = req.body.coordinates ? JSON.parse(req.body.coordinates) : {};

    // ========== SOCKET: Starting card generation ==========
    progress.status = 'generating_cards';
    progress.percentage = 20;
    progressStore.set(batchId, progress);

    socketService.emit('card:batch-progress', {
      userId: req.user.id,
      batchId,
      percentage: 20,
      status: 'generating_cards',
      message: `Starting card generation for ${savedStudents.length} students...`,
      total: savedStudents.length,
      processed: 0,
      generated: 0,
      failed: 0
    });

    // Set response headers for ZIP stream
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="batch-id-cards-${Date.now()}.zip"`
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    let generatedCount = 0;
    const totalStudents = savedStudents.length;

    // ========== GENERATE EACH CARD WITH PROGRESS ==========
    for (let i = 0; i < savedStudents.length; i++) {
      const student = savedStudents[i];
      try {
        // Update progress in memory
        const currentPercentage = 20 + Math.round(((i + 1) / totalStudents) * 70); // 20% to 90%

        progress.currentStudent = {
          name: student.name,
          id: student.student_id,
          index: i + 1,
          total: totalStudents
        };
        progress.percentage = currentPercentage;
        progress.processed = i + 1;
        progress.generated = generatedCount;
        progressStore.set(batchId, progress);

        // ========== SOCKET: Progress update (every card or every 5 cards for performance) ==========
        if (i % 5 === 0 || i === totalStudents - 1 || i === 0) {
          socketService.emit('card:batch-progress', {
            userId: req.user.id,
            batchId,
            percentage: currentPercentage,
            status: 'generating_cards',
            message: `Generating card ${i + 1}/${totalStudents}: ${student.name}`,
            currentStudent: {
              name: student.name,
              id: student.student_id,
              index: i + 1
            },
            total: totalStudents,
            processed: i + 1,
            generated: generatedCount,
            failed: progress.failed
          });
        }

        console.log(`🔄 Generating card ${i + 1}/${totalStudents}: ${student.name}`);

        const { frontBuffer, backBuffer } = await generateCardsWithCloudinary(
          student, template, coordinates, student.photo_url
        );

        archive.append(frontBuffer, { name: `${student.student_id}/front-side.png` });
        if (backBuffer) {
          archive.append(backBuffer, { name: `${student.student_id}/back-side.png` });
        }

        student.card_generated = true;
        student.card_generation_count = (student.card_generation_count || 0) + 1;
        student.last_card_generated = new Date();
        if (!student.first_card_generated) student.first_card_generated = new Date();
        await student.save();

        generatedCount++;

      } catch (error) {
        console.error(`❌ Card generation failed for ${student.name}:`, error.message);
        progress.failed++;
        progressStore.set(batchId, progress);

        // ========== SOCKET: Notify individual failure ==========
        socketService.emit('card:batch-progress', {
          userId: req.user.id,
          batchId,
          percentage: progress.percentage,
          status: 'generating_cards',
          message: `Failed: ${student.name} - ${error.message}`,
          currentStudent: {
            name: student.name,
            id: student.student_id,
            error: error.message
          },
          total: totalStudents,
          processed: i + 1,
          generated: generatedCount,
          failed: progress.failed
        });
      }
    }

    // Finalize
    progress.status = 'finalizing';
    progress.percentage = 95;
    progress.generated = generatedCount;
    progress.endTime = new Date();
    progress.duration = (progress.endTime - progress.startTime) / 1000;
    progressStore.set(batchId, progress);

    // ========== SOCKET: Finalizing ==========
    socketService.emit('card:batch-progress', {
      userId: req.user.id,
      batchId,
      percentage: 95,
      status: 'finalizing',
      message: 'Finalizing ZIP file...',
      total: totalStudents,
      processed: totalStudents,
      generated: generatedCount,
      failed: progress.failed
    });

    archive.finalize();

    // ========== SOCKET: Complete ==========
    setTimeout(() => {
      socketService.emit('card:batch-complete', {
        userId: req.user.id,
        companyId: req.user.companyId,
        batchId,
        status: 'completed',
        message: `Batch complete! ${generatedCount} cards generated, ${progress.failed} failed.`,
        stats: {
          total: totalStudents,
          generated: generatedCount,
          failed: progress.failed,
          duration: progress.duration
        },
        downloadReady: true
      });
    }, 1000);

    // Cleanup
    setTimeout(() => {
      if (progressStore.has(batchId)) progressStore.delete(batchId);
    }, 5 * 60 * 1000);

    console.log(`📥 Streaming ${generatedCount} cards to download`);
    console.log('✅ Batch processing completed successfully!');

  } catch (error) {
    console.error('❌ Batch processing error:', error);

    // ========== SOCKET: Error ==========
    socketService.emit('card:batch-error', {
      userId: req.user.id,
      batchId: batchId || 'unknown',
      error: error.message,
      status: 'error'
    });

    if (batchId && progressStore.has(batchId)) {
      const progress = progressStore.get(batchId);
      progress.status = 'error';
      progress.error = error.message;
      progressStore.set(batchId, progress);
      setTimeout(() => {
        if (progressStore.has(batchId)) progressStore.delete(batchId);
      }, 2 * 60 * 1000);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BATCH PROGRESS TRACKING ====================

router.get('/batch-progress/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const progress = progressStore.get(batchId);

    if (!progress) {
      return res.status(404).json({ success: false, error: 'Batch progress not found' });
    }

    res.json({ success: true, progress });

  } catch (error) {
    console.error('❌ Progress tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CARD HISTORY ====================

router.get('/history', authMiddleware, async (req, res) => {
  try {
    console.log('📊 Getting card history...');

    const matchQuery = {};

    if (req.userRole === 'admin') {
      matchQuery.companyId = req.companyId;
    }
    if (req.userRole === 'super_admin' && req.query.companyId) {
      matchQuery.companyId = req.query.companyId;
    }
    if (req.query.organizationId) {
      matchQuery.schoolId = req.query.organizationId;
    }

    const stats = await Student.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalStudentsWithCards: { $sum: 1 },
          totalCardsGenerated: { $sum: '$card_generation_count' },
          averageCardsPerStudent: { $avg: '$card_generation_count' },
          maxCardsGenerated: { $max: '$card_generation_count' }
        }
      }
    ]);

    const result = stats[0] || {
      totalStudentsWithCards: 0,
      totalCardsGenerated: 0,
      averageCardsPerStudent: 0,
      maxCardsGenerated: 0
    };

    res.json({
      success: true,
      statistics: {
        totalCards: result.totalCardsGenerated,
        totalStudents: result.totalStudentsWithCards,
        averageCardsPerStudent: Math.round(result.averageCardsPerStudent * 100) / 100,
        maxCardsByStudent: result.maxCardsGenerated
      }
    });

  } catch (error) {
    console.error('❌ Card history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STUDENT CARD HISTORY ====================

router.get('/history/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .select('student_id name card_generation_count last_card_generated first_card_generated createdAt companyId');

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (req.user.role === 'admin' && student.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      student: {
        _id: student._id,
        student_id: student.student_id,
        name: student.name,
        card_generation_count: student.card_generation_count,
        last_card_generated: student.last_card_generated,
        first_card_generated: student.first_card_generated,
        student_since: student.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Student card history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TEMPLATE DIMENSIONS ====================

router.get('/template-dimensions/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const templateImage = await loadImageFromUrl(template.frontSide.secure_url || template.frontSide.url);
    const originalDimensions = { width: templateImage.width, height: templateImage.height };

    const TARGET_WIDTH = 850;
    const scaledHeight = Math.round((TARGET_WIDTH * originalDimensions.height) / originalDimensions.width);
    const scaleFactor = TARGET_WIDTH / originalDimensions.width;

    const dimensions = {
      original: originalDimensions,
      scaled: {
        width: TARGET_WIDTH,
        height: scaledHeight,
        scaleFactor: scaleFactor.toFixed(4)
      },
      preview: {
        width: 800,
        height: Math.round((800 * originalDimensions.height) / originalDimensions.width),
        scaleFactor: (800 / originalDimensions.width).toFixed(4)
      }
    };

    res.json({ success: true, dimensions });

  } catch (error) {
    console.error('❌ Error getting template dimensions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STUDENT PHOTO UPLOAD ====================

router.post('/upload-student-photo', upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !req.file) {
      return res.status(400).json({ success: false, error: 'Student ID and photo are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (req.user.role !== 'super_admin' && student.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    console.log(`📸 Uploading photo for ${student.name}...`);

    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: 'card-agent/people/photos',
        public_id: `student-${student.student_id}-${Date.now()}`,
        overwrite: true,
        transformation: [
          { width: 500, height: 500, crop: "fill" },
          { quality: "auto:good" }
        ]
      }
    );

    student.photo_url = uploadResult.secure_url;
    student.photo_public_id = uploadResult.public_id;
    student.photo_metadata = {
      width: uploadResult.width, height: uploadResult.height,
      format: uploadResult.format, bytes: uploadResult.bytes
    };
    student.has_photo = true;
    student.photo_uploaded_at = new Date();
    await student.save();

    console.log(`✅ Photo uploaded for ${student.name}`);

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photo_url: uploadResult.secure_url,
      student: { id: student._id, name: student.name, has_photo: true }
    });

  } catch (error) {
    console.error('❌ Photo upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STUDENT PHOTO RETRIEVAL ====================

router.get('/student-photo/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.user.role === 'admin' && student.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!student.photo_url) {
      return res.status(404).json({ error: 'Student photo not found' });
    }

    res.redirect(student.photo_url);

  } catch (error) {
    console.error('❌ Student photo retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function generateCardsWithCloudinary(student, template, coordinates, studentPhotoUrl) {
  try {
    console.log(`🎨 Generating card for ${student.name} ${studentPhotoUrl ? '(with photo)' : '(no photo)'}`);

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

    // Scale coordinates
    const scaleCoordinate = (coord) => {
      if (!coord) return null;
      const scaled = { ...coord };
      scaled.x = Math.round(coord.x * scaleFactor);
      scaled.y = Math.round(coord.y * scaleFactor);
      if (coord.width) scaled.width = Math.round(coord.width * scaleFactor);
      if (coord.height) scaled.height = Math.round(coord.height * scaleFactor);
      if (coord.maxWidth) scaled.maxWidth = Math.round(coord.maxWidth * scaleFactor);
      return scaled;
    };

    const scaledCoordinates = {};
    for (const [field, coord] of Object.entries(coordinates)) {
      scaledCoordinates[field] = scaleCoordinate(coord);
    }

    // Add photo
    const photoConfig = {
      borderColor: '#005800',
      borderWidth: 3,
      borderRadius: 10
    };

    if (studentPhotoUrl && scaledCoordinates.photo) {
      try {
        const studentPhoto = await loadImageFromUrl(studentPhotoUrl);
        const { x, y, width, height } = scaledCoordinates.photo;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, photoConfig.borderRadius);
        ctx.clip();
        ctx.drawImage(studentPhoto, x, y, width, height);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, photoConfig.borderRadius);
        ctx.strokeStyle = photoConfig.borderColor;
        ctx.lineWidth = photoConfig.borderWidth;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.stroke();
        ctx.restore();

        console.log(`✅ Added photo for ${student.name}`);
      } catch (photoError) {
        console.warn(`⚠️ Could not load photo for ${student.name}:`, photoError.message);
        drawPhotoPlaceholder(ctx, scaledCoordinates.photo);
      }
    } else if (scaledCoordinates.photo) {
      drawPhotoPlaceholder(ctx, scaledCoordinates.photo);
    }

    // Add text fields
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const fontConfig = {
      name: { size: 22, isBold: true, color: '#000000', fontFamily: 'Arial' },
      class: { size: 22, isBold: false, color: '#000000', fontFamily: 'Arial' },
      level: { size: 22, isBold: false, color: '#000000', fontFamily: 'Arial' },
      gender: { size: 22, isBold: false, color: '#000000', fontFamily: 'Arial' },
      residence: { size: 22, isBold: false, color: '#000000', fontFamily: 'Arial' },
      academic_year: { size: 22, isBold: false, color: '#000000', fontFamily: 'Arial' }
    };

    const addText = (text, field, coord) => {
      if (!text || !coord || !coord.x || !coord.y) return;

      const config = fontConfig[field] || { size: 24, isBold: true, color: '#000000', fontFamily: 'Arial' };

      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.font = `${config.isBold ? 'bold ' : ''}${config.size}px ${config.fontFamily}`;
      ctx.fillStyle = config.color;

      let displayText = String(text || '').trim();
      if (!displayText) return;

      const maxWidth = coord.maxWidth;
      if (maxWidth) {
        let currentSize = config.size;
        ctx.font = `${config.isBold ? 'bold ' : ''}${currentSize}px ${config.fontFamily}`;
        while (currentSize > 16 && ctx.measureText(displayText).width > maxWidth) {
          currentSize--;
          ctx.font = `${config.isBold ? 'bold ' : ''}${currentSize}px ${config.fontFamily}`;
        }
        if (ctx.measureText(displayText).width > maxWidth) {
          while (displayText.length > 3 && ctx.measureText(displayText + '...').width > maxWidth) {
            displayText = displayText.slice(0, -1);
          }
          displayText += '...';
        }
      }

      ctx.fillText(displayText, coord.x, coord.y);
    };


    // Name is top-level
    addText(student.name, 'name', scaledCoordinates.name);

    // Student-specific fields
    if (student.personType === 'student') {
      addText(student.studentDetails?.class, 'class', scaledCoordinates.class);
      addText(student.studentDetails?.level, 'level', scaledCoordinates.level);
      addText(student.studentDetails?.academic_year, 'academic_year', scaledCoordinates.academic_year);
    } else {
      // Employee-specific fields - map to available coordinates
      addText(student.employeeDetails?.department, 'class', scaledCoordinates.class);
      addText(student.employeeDetails?.position, 'level', scaledCoordinates.level);
    }

    // Common fields
    addText(student.gender, 'gender', scaledCoordinates.gender);
    addText(student.residence, 'residence', scaledCoordinates.residence);


    const frontBuffer = canvas.toBuffer('image/png');

    // Back side
    let backBuffer = null;
    try {
      if (template.backSide && template.backSide.secure_url) {
        const backTemplate = await loadImageFromUrl(template.backSide.secure_url);
        const backCanvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
        const backCtx = backCanvas.getContext('2d');
        backCtx.imageSmoothingEnabled = true;
        backCtx.imageSmoothingQuality = 'high';
        backCtx.drawImage(backTemplate, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        backBuffer = backCanvas.toBuffer('image/png');
      } else {
        const backCanvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
        const backCtx = backCanvas.getContext('2d');
        backCtx.fillStyle = '#FFFFFF';
        backCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        backCtx.fillStyle = '#000000';
        backCtx.font = 'bold 24px Arial';
        backCtx.textAlign = 'center';
        backCtx.fillText(student.name, TARGET_WIDTH / 2, 100);
        backCtx.font = '18px Arial';
        backCtx.fillText(`ID: ${student.student_id}`, TARGET_WIDTH / 2, 140);
        backBuffer = backCanvas.toBuffer('image/png');
      }
    } catch (backError) {
      console.warn('⚠️ Creating default back side:', backError.message);
    }

    return { frontBuffer, backBuffer };

  } catch (error) {
    console.error(`❌ Card generation failed for ${student.name}:`, error);
    throw error;
  }
}

function drawPhotoPlaceholder(ctx, photoCoords) {
  const { x, y, width, height } = photoCoords;
  const borderRadius = 10;

  ctx.save();

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📷', x + width / 2, y + height / 2);

  ctx.fillStyle = '#666666';
  ctx.font = '12px Arial';
  ctx.fillText('Add Photo', x + width / 2, y + height - 15);

  ctx.restore();
}

async function createZipInMemory(files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    files.forEach(file => {
      archive.append(file.buffer, { name: file.name });
    });

    archive.finalize();
  });
}

module.exports = router;