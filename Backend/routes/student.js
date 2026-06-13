// routes/student.js - COMPLETE UPDATED VERSION

const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const Student = require('../models/Student');
const School = require('../models/School');
const authMiddleware = require('../middleware/authMiddleware');
const socketService = require('../services/socketService');

// Import utilities
const { parseCSVFromBuffer } = require('../utilis/csvParser');
const { extractAndUploadPhotosToCloudinary } = require('../utilis/cloudinaryUpload');

// ==================== PROGRESS STORE ====================
const bulkImportProgress = new Map();

// Helper function to emit progress with correct event type
function emitBulkProgress(importId, userId, stage, data, eventType = 'bulk-import') {
  console.log(`📡 EMITTING PROGRESS: ${stage} for ${eventType}`, { importId, userId, ...data });

  const progress = bulkImportProgress.get(importId);
  if (progress) {
    Object.assign(progress, data);
    bulkImportProgress.set(importId, progress);
  }

  // Emit to the correct event channel based on type
  const eventName = eventType === 'bulk-photo' ? 'bulk-photo:progress' : 'bulk-import:progress';

  socketService.emit(eventName, {
    importId,
    userId,
    stage,
    ...data
  });
}

// ==================== MULTER CONFIGURATIONS ====================

// Cloudinary storage for student photos
const studentPhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      const studentId = req.body.student_id || 'unknown';
      return `card-agent/people/photos/${studentId}`;
    },
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `student-photo-${uniqueSuffix}`;
    },
    transformation: [
      { width: 400, height: 400, crop: "thumb", gravity: "face" },
      { quality: "auto:good" },
      { fetch_format: "auto" }
    ],
    tags: (req, file) => {
      const studentId = req.body.student_id || 'unknown';
      return [`student-${studentId}`];
    }
  }
});

// Multer upload middleware
const uploadPhoto = multer({
  storage: studentPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png) are allowed for photos!'));
    }
  }
});

const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isCSV = file.mimetype.includes('csv') || file.originalname.toLowerCase().endsWith('.csv');
    if (isCSV) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'));
    }
  }
});

const uploadMixed = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'csv') {
      const isCSV = file.mimetype.includes('csv') || file.originalname.toLowerCase().endsWith('.csv');
      if (isCSV) return cb(null, true);
    }
    if (file.fieldname === 'photoZip') {
      const isZIP = file.mimetype.includes('zip') || file.mimetype.includes('compressed') || file.originalname.toLowerCase().endsWith('.zip');
      if (isZIP) return cb(null, true);
    }
    cb(new Error(`Invalid file type for ${file.fieldname}`));
  }
});

const uploadBulkPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isZIP = file.mimetype.includes('zip') || file.mimetype.includes('compressed') || file.originalname.toLowerCase().endsWith('.zip');
    if (isZIP) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed for bulk photo upload!'));
    }
  }
});

// Global use authMiddleware
router.use(authMiddleware);

// ============================================
// GET all students
// ============================================
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'super_admin') {
      if (req.query.schoolId) {
        query.schoolId = req.query.schoolId;
      }
    } else {
      query.companyId = req.user.companyId;
      if (req.user.role === 'co_worker') {
        const allowedOrgIds = req.user.permissions?.map(p => p.organizationId) || [];
        query.schoolId = { $in: allowedOrgIds };
      }
    }
    const students = await Student.find(query).sort({ student_id: 1 });
    const studentsWithUrls = students.map(student => ({
      ...student.toObject(),
      photo_url: student.photo_public_id ?
        cloudinary.url(student.photo_public_id, {
          width: 200, height: 200, crop: 'fill', gravity: 'face',
          quality: 'auto', fetch_format: 'auto'
        }) : null
    }));
    res.json(studentsWithUrls);
  } catch (e) {
    console.error('❌ Error fetching students:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// CREATE a new student/employee
// ============================================
router.post('/', uploadPhoto.single('photo'), async (req, res) => {
  try {
    const data = req.body;
    const companyId = req.user.companyId;
    let organizationId;

    if (req.user.role === 'super_admin') {
      organizationId = data.organizationId || data.schoolId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required for super_admin' });
      }
    } else if (req.user.role === 'admin') {
      organizationId = data.organizationId || data.schoolId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }
    } else if (req.user.role === 'co_worker') {
      organizationId = data.organizationId || data.schoolId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }
      const hasPermission = req.user.permissions?.some(
        p => p.organizationId.toString() === organizationId && p.canManageStudents
      );
      if (!hasPermission) {
        return res.status(403).json({ error: 'You do not have permission to manage students in this organization' });
      }
    }

    let query = { _id: organizationId };
    if (req.user.role !== 'super_admin') {
      query.companyId = companyId;
    }
    const organization = await School.findOne(query);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    let photoData = null;
    if (req.file) {
      photoData = {
        url: req.file.path,
        secure_url: req.file.path,
        public_id: req.file.filename,
        width: req.file.width,
        height: req.file.height,
        bytes: req.file.size,
        format: req.file.format
      };
    }

    const personType = data.personType || 'student';
    let studentData = {
      name: data.name,
      personType: personType,
      gender: data.gender || 'N/A',
      residence: data.residence || 'N/A',
      phone: data.phone || '',
      email: data.email || '',
      schoolId: organizationId,
      companyId: organization.companyId,
      createdBy: req.user.id,
      photo_url: photoData ? photoData.secure_url : null,
      photo_public_id: photoData ? photoData.public_id : null,
      photo_metadata: photoData ? {
        width: photoData.width,
        height: photoData.height,
        format: photoData.format,
        bytes: photoData.bytes
      } : null,
      has_photo: !!photoData,
      photo_uploaded_at: photoData ? new Date() : null,
    };

    if (personType === 'student') {
      if (!data.student_id || !data.student_id.trim()) {
        return res.status(400).json({ error: 'Student ID is required for students' });
      }
      studentData.student_id = data.student_id.trim();
      studentData.studentDetails = {
        class: data.class || 'N/A',
        level: data.level || 'N/A',
        academic_year: data.academic_year || '',
        parent_phone: data.parent_phone || ''
      };
    }

    if (personType === 'employee') {
      studentData.employeeDetails = {
        department: data.department || '',
        position: data.position || '',
        employeeId: data.employeeId || '',
        workPhone: data.workPhone || ''
      };
      if (!data.employeeId && !data.student_id) {
        const orgPrefix = organization.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'EMP';
        const employeeCount = await Student.countDocuments({ schoolId: organizationId, personType: 'employee' });
        const newEmployeeId = `${orgPrefix}-${String(employeeCount + 1).padStart(3, '0')}`;
        studentData.student_id = newEmployeeId;
        studentData.employeeDetails.employeeId = newEmployeeId;
      } else if (data.student_id) {
        studentData.student_id = data.student_id;
        studentData.employeeDetails.employeeId = data.student_id;
      } else if (data.employeeId) {
        studentData.student_id = data.employeeId;
        studentData.employeeDetails.employeeId = data.employeeId;
      }
    }

    const student = new Student(studentData);
    await student.save();
    res.status(201).json(student);
  } catch (e) {
    console.error('❌ Error creating student:', e);
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Student ID already exists for this organization' });
    }
    res.status(400).json({ error: e.message });
  }
});

// ============================================
// UPDATE a student
// ============================================
router.put('/:id', uploadPhoto.single('photo'), async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (req.user.role !== 'super_admin' && student.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ error: 'Access denied - Student belongs to different company' });
    }

    const update = {
      name: data.name || student.name,
      gender: data.gender || student.gender,
      residence: data.residence || student.residence,
      phone: data.phone || student.phone,
      email: data.email || student.email
    };

    if (student.personType === 'student') {
      update.studentDetails = {
        class: data.class || student.studentDetails?.class || 'N/A',
        level: data.level || student.studentDetails?.level || 'N/A',
        academic_year: data.academic_year || student.studentDetails?.academic_year || '',
        parent_phone: data.parent_phone || student.studentDetails?.parent_phone || ''
      };
      if (data.student_id) {
        update.student_id = data.student_id;
      }
    }

    if (student.personType === 'employee') {
      update.employeeDetails = {
        department: data.department || student.employeeDetails?.department || '',
        position: data.position || student.employeeDetails?.position || '',
        employeeId: data.employeeId || student.employeeDetails?.employeeId || '',
        workPhone: data.workPhone || student.employeeDetails?.workPhone || ''
      };
      if (data.student_id) {
        update.student_id = data.student_id;
        update.employeeDetails.employeeId = data.student_id;
      }
    }

    if (req.file) {
      if (student.photo_public_id) {
        try {
          await cloudinary.uploader.destroy(student.photo_public_id);
        } catch (deleteError) {
          console.warn('⚠️ Could not delete old photo:', deleteError.message);
        }
      }
      update.photo_url = req.file.path;
      update.photo_public_id = req.file.filename;
      update.photo_metadata = {
        width: req.file.width,
        height: req.file.height,
        format: req.file.format,
        bytes: req.file.size
      };
      update.has_photo = true;
      update.photo_uploaded_at = new Date();
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    res.json(updatedStudent);
  } catch (e) {
    console.error('❌ Error updating student:', e);
    res.status(400).json({ error: e.message });
  }
});

// ============================================
// GET student photo URL
// ============================================
router.get('/photo/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { size = 'medium' } = req.query;
    const student = await Student.findById(studentId);
    if (!student || !student.photo_public_id) {
      return res.status(404).json({ error: 'Student photo not found' });
    }
    const sizePresets = {
      thumbnail: { width: 100, height: 100, crop: 'fill' },
      small: { width: 200, height: 200, crop: 'fill' },
      medium: { width: 400, height: 400, crop: 'fill' },
      large: { width: 800, height: 800, crop: 'limit' }
    };
    const preset = sizePresets[size] || sizePresets.medium;
    const url = cloudinary.url(student.photo_public_id, {
      ...preset,
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    });
    res.redirect(url);
  } catch (error) {
    console.error('❌ Student photo retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET students grouped by organization
// ============================================
router.get('/grouped-by-organization', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const organizations = await School.find({ companyId, isActive: true }).select('name type logo stats');
    const grouped = await Promise.all(organizations.map(async (org) => {
      const studentCount = await Student.countDocuments({ schoolId: org._id, companyId, personType: 'student', isActive: true });
      const employeeCount = await Student.countDocuments({ schoolId: org._id, companyId, personType: 'employee', isActive: true });
      const withPhotos = await Student.countDocuments({ schoolId: org._id, companyId, has_photo: true, isActive: true });
      const cardsGenerated = await Student.countDocuments({ schoolId: org._id, companyId, card_generated: true, isActive: true });
      return {
        organization: { _id: org._id, name: org.name, type: org.type, logo: org.logo?.url },
        stats: {
          totalStudents: org.type === 'corporate' ? employeeCount : studentCount,
          totalEmployees: employeeCount,
          withPhotos,
          cardsGenerated,
          pendingCards: (org.type === 'corporate' ? employeeCount : studentCount) - cardsGenerated
        }
      };
    }));
    const totalStudents = await Student.countDocuments({ companyId, personType: 'student', isActive: true });
    const totalEmployees = await Student.countDocuments({ companyId, personType: 'employee', isActive: true });
    const totalOrganizations = organizations.length;
    res.json({
      success: true,
      summary: { totalOrganizations, totalStudents, totalEmployees, totalPeople: totalStudents + totalEmployees },
      organizations: grouped
    });
  } catch (error) {
    console.error('Grouped students error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET STUDENT STATISTICS
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const query = { companyId: req.user.companyId };
    if (req.query.organizationId) {
      query.schoolId = req.query.organizationId;
    }
    if (req.user.role === 'co_worker') {
      const allowedOrgIds = req.user.permissions?.map(p => p.organizationId) || [];
      if (allowedOrgIds.length > 0) {
        query.schoolId = { $in: allowedOrgIds };
      } else {
        return res.json({
          success: true,
          stats: {
            totalStudents: 0, studentsWithPhotos: 0, studentsWithoutPhotos: 0,
            totalEmployees: 0, employeesWithPhotos: 0, employeesWithoutPhotos: 0,
            totalPeople: 0, cardGenerated: 0, pendingCards: 0
          }
        });
      }
    }
    const [totalStudents, studentsWithPhotos, totalEmployees, employeesWithPhotos, cardGenerated] = await Promise.all([
      Student.countDocuments({ ...query, personType: 'student', isActive: true }),
      Student.countDocuments({ ...query, personType: 'student', has_photo: true, isActive: true }),
      Student.countDocuments({ ...query, personType: 'employee', isActive: true }),
      Student.countDocuments({ ...query, personType: 'employee', has_photo: true, isActive: true }),
      Student.countDocuments({ ...query, card_generated: true, isActive: true })
    ]);
    res.json({
      success: true,
      stats: {
        totalStudents, studentsWithPhotos, studentsWithoutPhotos: totalStudents - studentsWithPhotos,
        totalEmployees, employeesWithPhotos, employeesWithoutPhotos: totalEmployees - employeesWithPhotos,
        totalPeople: totalStudents + totalEmployees, cardGenerated, pendingCards: (totalStudents + totalEmployees) - cardGenerated
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET students for specific organization
// ============================================
router.get('/organization/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { search, personType, class: className, level, gender, hasPhoto, cardGenerated, page = 1, limit = 20 } = req.query;
    const org = await School.findOne({ _id: orgId, companyId: req.user.companyId });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    if (req.user.role === 'co_worker') {
      const orgPerm = req.user.permissions.find(p => p.organizationId.toString() === orgId);
      if (!orgPerm || !orgPerm.canManageStudents) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }
    const query = { schoolId: orgId, companyId: req.user.companyId, isActive: true };
    if (personType) query.personType = personType;
    if (className && personType !== 'employee') query['studentDetails.class'] = className;
    if (level && personType !== 'employee') query['studentDetails.level'] = level;
    if (gender) query.gender = gender;
    if (hasPhoto === 'true') query.has_photo = true;
    if (hasPhoto === 'false') query.has_photo = false;
    if (cardGenerated === 'true') query.card_generated = true;
    if (cardGenerated === 'false') query.card_generated = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { student_id: { $regex: search, $options: 'i' } },
        { 'studentDetails.class': { $regex: search, $options: 'i' } },
        { 'employeeDetails.department': { $regex: search, $options: 'i' } },
        { 'employeeDetails.employeeId': { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      Student.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
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

// ============================================
// GET filter options for organization
// ============================================
router.get('/organization/:orgId/filter-options', async (req, res) => {
  try {
    const { orgId } = req.params;
    const companyId = req.user.companyId;
    const org = await School.findOne({ _id: orgId, companyId });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    const baseQuery = { schoolId: orgId, companyId, isActive: true };
    const [genders, classes, levels, departments, academicYears] = await Promise.all([
      Student.distinct('gender', baseQuery),
      Student.distinct('studentDetails.class', { ...baseQuery, personType: 'student' }),
      Student.distinct('studentDetails.level', { ...baseQuery, personType: 'student' }),
      Student.distinct('employeeDetails.department', { ...baseQuery, personType: 'employee' }),
      Student.distinct('studentDetails.academic_year', { ...baseQuery, personType: 'student' })
    ]);
    res.json({
      success: true,
      filters: {
        genders: genders.filter(g => g),
        classes: classes.filter(c => c).sort(),
        levels: levels.filter(l => l).sort(),
        departments: departments.filter(d => d).sort(),
        academicYears: academicYears.filter(y => y).sort()
      }
    });
  } catch (error) {
    console.error('Filter options error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DELETE ALL STUDENTS FOR ORGANIZATION
// ============================================
router.delete('/delete-all', async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'organizationId is required' });
    }
    const organization = await School.findOne({ _id: organizationId, companyId: req.user.companyId });
    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found or access denied' });
    }
    if (req.user.role === 'co_worker') {
      const hasPermission = req.user.permissions?.some(p => p.organizationId?.toString() === organizationId && p.canManageStudents);
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }
    const totalCount = await Student.countDocuments({ schoolId: organizationId });
    if (totalCount === 0) {
      return res.json({ success: true, message: 'No records to delete', deletedCount: 0, deletedPhotos: 0 });
    }

    // Delete in batches to avoid timeout
    const BATCH_SIZE = 100;
    let deletedPhotos = 0;
    let deletedRecords = 0;
    const errors = [];

    for (let i = 0; i < totalCount; i += BATCH_SIZE) {
      const batch = await Student.find({ schoolId: organizationId }).limit(BATCH_SIZE).skip(i);
      for (const person of batch) {
        if (person.photo_public_id) {
          try {
            await cloudinary.uploader.destroy(person.photo_public_id);
            deletedPhotos++;
          } catch (photoError) {
            console.warn(`⚠️ Failed to delete photo for ${person.name}:`, photoError.message);
            errors.push({ id: person._id, name: person.name, error: photoError.message });
          }
        }
      }
      const batchIds = batch.map(p => p._id);
      const result = await Student.deleteMany({ _id: { $in: batchIds } });
      deletedRecords += result.deletedCount;
      console.log(`🗑️ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.deletedCount} records`);
    }

    console.log(`✅ Deleted ${deletedRecords} people and ${deletedPhotos} photos`);
    res.json({
      success: true,
      message: `Successfully deleted ${deletedRecords} people and ${deletedPhotos} photos`,
      deletedCount: deletedRecords,
      deletedPhotos: deletedPhotos,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Delete all error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DELETE a student
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    if (req.user.role === 'super_admin') {
      // Allow
    } else if (req.user.role === 'admin') {
      if (student.companyId?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied - Student belongs to different company' });
      }
    } else if (req.user.role === 'co_worker') {
      const hasPermission = req.user.permissions?.some(p => p.organizationId.toString() === student.schoolId?.toString() && p.canManageStudents);
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Access denied - No permission for this organization' });
      }
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (student.photo_public_id) {
      try {
        await cloudinary.uploader.destroy(student.photo_public_id);
      } catch (photoError) {
        console.warn('⚠️ Could not delete student photo:', photoError.message);
      }
    }
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Student deleted successfully`, studentName: student.name });
  } catch (error) {
    console.error('❌ Student deletion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BULK IMPORT STUDENTS FROM CSV - WITH PROGRESS
// ============================================
router.post('/bulk-import', uploadCSV.single('csv'), async (req, res) => {
  try {
    console.log('📦 Starting bulk import...');
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'organizationId is required' });
    }

    // ✅ USE PROVIDED IMPORT ID OR GENERATE ONE
    const importId = req.body.importId || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userId = req.user.id;

    // Store initial progress
    bulkImportProgress.set(importId, {
      importId,
      status: 'processing',
      stage: 'starting',
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      skippedStudents: [],
      message: 'Starting bulk import...'
    });

    socketService.emit('bulk-import:started', {
      importId,
      userId,
      stage: 'starting',
      message: 'Starting bulk import...',
      total: 0
    });

    // Verify organization
    const organization = await School.findOne({ _id: organizationId, companyId: req.user.companyId });
    if (!organization) {
      bulkImportProgress.delete(importId);
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Stage 1: Parse CSV
    emitBulkProgress(importId, userId, 'parsing_csv', {
      message: 'Parsing CSV file...',
      percentage: 10
    });

    const students = await parseCSVFromBuffer(req.file.buffer);
    const totalStudents = students.length;

    emitBulkProgress(importId, userId, 'parsing_csv', {
      message: `Parsed ${totalStudents} records from CSV`,
      total: totalStudents,
      percentage: 20
    });

    // Stage 2: Save students with progress
    emitBulkProgress(importId, userId, 'saving_students', {
      message: `Saving ${totalStudents} students to database...`,
      percentage: 25,
      total: totalStudents,
      processed: 0
    });

    const results = {
      total: totalStudents,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      skippedStudents: []
    };

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const currentIndex = i + 1;
      const percentage = 25 + Math.round((currentIndex / totalStudents) * 70);

      if (currentIndex % 5 === 0 || currentIndex === totalStudents) {
        emitBulkProgress(importId, userId, 'saving_students', {
          message: `Processing ${currentIndex} of ${totalStudents}: ${studentData.name}`,
          percentage: percentage,
          processed: currentIndex,
          created: results.created,
          updated: results.updated,
          skipped: results.skipped,
          currentItem: {
            name: studentData.name,
            id: studentData.student_id,
            index: currentIndex,
            total: totalStudents
          }
        });
      }

      try {
        studentData.schoolId = organizationId;
        studentData.companyId = req.user.companyId;
        studentData.createdBy = req.user.id;

        const existingStudent = await Student.findOne({
          student_id: studentData.student_id,
          schoolId: organizationId
        });

        if (existingStudent) {
          Object.assign(existingStudent, studentData);
          await existingStudent.save();
          results.updated++;
        } else {
          const student = new Student(studentData);
          await student.save();
          results.created++;
        }
      } catch (error) {
        results.skipped++;
        const errorMsg = error.code === 11000 ? 'Duplicate ID' : error.message;
        results.errors.push({
          student_id: studentData.student_id,
          name: studentData.name,
          error: errorMsg
        });
        results.skippedStudents.push({
          id: studentData.student_id,
          name: studentData.name,
          reason: errorMsg
        });
        console.error(`❌ Failed for ${studentData.student_id}:`, errorMsg);
      }
    }

    const finalProgress = {
      importId,
      userId,
      stage: 'completed',
      total: totalStudents,
      processed: totalStudents,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errors: results.errors,
      skippedStudents: results.skippedStudents,
      percentage: 100,
      message: `✅ Complete! Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}`
    };

    bulkImportProgress.set(importId, finalProgress);

    socketService.emit('bulk-import:complete', {
      importId,
      userId,
      total: totalStudents,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errors: results.errors,
      skippedStudents: results.skippedStudents,
      message: finalProgress.message
    });

    setTimeout(() => bulkImportProgress.delete(importId), 300000);

    res.json({
      success: true,
      importId,
      message: finalProgress.message,
      results
    });
  } catch (error) {
    console.error('❌ Bulk import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BULK IMPORT WITH PHOTOS - WITH PROGRESS
// ============================================
router.post('/bulk-import-with-photos', uploadMixed.fields([{ name: 'csv', maxCount: 1 }, { name: 'photoZip', maxCount: 1 }]), async (req, res) => {
  try {
    console.log('📦 Starting bulk import with photos...');
    if (!req.files || !req.files.csv) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'organizationId is required' });
    }


    const importId = req.body.importId || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userId = req.user.id;

    // Store initial progress
    bulkImportProgress.set(importId, {
      importId,
      status: 'processing',
      stage: 'starting',
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      withPhotos: 0,
      errors: [],
      skippedStudents: [],
      message: 'Starting bulk import...'
    });

    socketService.emit('bulk-import:started', {
      importId,
      userId,
      stage: 'starting',
      message: 'Starting bulk import...',
      total: 0
    });

    // Verify organization
    const organization = await School.findOne({ _id: organizationId, companyId: req.user.companyId });
    if (!organization) {
      bulkImportProgress.delete(importId);
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Stage 1: Parse CSV
    emitBulkProgress(importId, userId, 'parsing_csv', {
      message: 'Parsing CSV file...',
      percentage: 5
    });

    const csvFile = req.files.csv[0];
    const students = await parseCSVFromBuffer(csvFile.buffer);
    const totalStudents = students.length;

    emitBulkProgress(importId, userId, 'parsing_csv', {
      message: `✅ Parsed ${totalStudents} records from CSV`,
      total: totalStudents,
      percentage: 15
    });

    // Stage 2: Extract photos from ZIP
    let photoCloudinaryMap = {};
    if (req.files.photoZip?.[0]) {
      emitBulkProgress(importId, userId, 'extracting_photos', {
        message: 'Extracting and uploading photos from ZIP...',
        percentage: 20
      });

      photoCloudinaryMap = await extractAndUploadPhotosToCloudinary(req.files.photoZip[0].buffer);
      const photoCount = Object.keys(photoCloudinaryMap).length;

      emitBulkProgress(importId, userId, 'extracting_photos', {
        message: `✅ Uploaded ${photoCount} photos`,
        percentage: 30,
        processed: photoCount,
        total: photoCount
      });
    }

    // Stage 3: Save students with progress
    emitBulkProgress(importId, userId, 'saving_students', {
      message: `💾 Saving ${totalStudents} students to database...`,
      percentage: 35,
      total: totalStudents,
      processed: 0
    });

    const results = {
      total: totalStudents,
      created: 0,
      updated: 0,
      skipped: 0,
      withPhotos: 0,
      errors: [],
      skippedStudents: []
    };

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const currentIndex = i + 1;
      const percentage = 35 + Math.round((currentIndex / totalStudents) * 60);

      if (currentIndex % 3 === 0 || currentIndex === totalStudents) {
        emitBulkProgress(importId, userId, 'saving_students', {
          message: `💾 Processing ${currentIndex} of ${totalStudents}: ${studentData.name}`,
          percentage: percentage,
          processed: currentIndex,
          created: results.created,
          updated: results.updated,
          skipped: results.skipped,
          currentItem: {
            name: studentData.name,
            id: studentData.student_id,
            index: currentIndex,
            total: totalStudents
          }
        });
      }

      try {
        studentData.schoolId = organizationId;
        studentData.companyId = req.user.companyId;
        studentData.createdBy = req.user.id;

        const cloudinaryPhoto = photoCloudinaryMap[studentData.student_id];

        if (cloudinaryPhoto) {
          studentData.photo_url = cloudinaryPhoto.secure_url;
          studentData.photo_public_id = cloudinaryPhoto.public_id;
          studentData.photo_metadata = {
            width: cloudinaryPhoto.width,
            height: cloudinaryPhoto.height,
            format: cloudinaryPhoto.format,
            bytes: cloudinaryPhoto.bytes
          };
          studentData.has_photo = true;
          studentData.photo_uploaded_at = new Date();
          results.withPhotos++;
        }

        const existingStudent = await Student.findOne({
          student_id: studentData.student_id,
          schoolId: organizationId
        });

        if (existingStudent) {
          Object.assign(existingStudent, studentData);
          await existingStudent.save();
          results.updated++;
        } else {
          const student = new Student(studentData);
          await student.save();
          results.created++;
        }
      } catch (error) {
        results.skipped++;
        const errorMsg = error.code === 11000 ? 'Duplicate ID' : error.message;
        results.errors.push({
          student_id: studentData.student_id,
          name: studentData.name,
          error: errorMsg
        });
        results.skippedStudents.push({
          id: studentData.student_id,
          name: studentData.name,
          reason: errorMsg
        });
        console.error(`❌ Failed for ${studentData.student_id}:`, errorMsg);
      }
    }

    const finalProgress = {
      importId,
      userId,
      stage: 'completed',
      total: totalStudents,
      processed: totalStudents,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      withPhotos: results.withPhotos,
      errors: results.errors,
      skippedStudents: results.skippedStudents,
      percentage: 100,
      message: `✅ Complete! Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, With Photos: ${results.withPhotos}`
    };

    bulkImportProgress.set(importId, finalProgress);

    socketService.emit('bulk-import:complete', {
      importId,
      userId,
      total: totalStudents,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      withPhotos: results.withPhotos,
      errors: results.errors,
      skippedStudents: results.skippedStudents,
      message: finalProgress.message
    });

    setTimeout(() => bulkImportProgress.delete(importId), 300000);

    res.json({
      success: true,
      importId,
      message: finalProgress.message,
      results
    });
  } catch (error) {
    console.error('❌ Bulk import with photos error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BULK PHOTO UPLOAD FOR EXISTING STUDENTS - WITH PROGRESS
// ============================================
router.post('/bulk-upload-photos', uploadBulkPhoto.single('photoZip'), async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'ZIP file is required' });
    }

    const importId = req.body.importId || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userId = req.user.id;

    // Store initial progress
    bulkImportProgress.set(importId, {
      importId,
      status: 'processing',
      stage: 'extracting_photos',
      total: 0,
      processed: 0,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      skippedFiles: [],
      message: 'Starting photo upload...'
    });

    socketService.emit('bulk-photo:started', {
      importId,
      userId,
      stage: 'extracting_photos',
      message: 'Starting photo upload...'
    });

    // Verify organization
    const org = await School.findOne({ _id: organizationId, companyId: req.user.companyId });
    if (!org) {
      bulkImportProgress.delete(importId);
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Check permission
    if (req.user.role === 'co_worker') {
      const hasPermission = req.user.permissions?.some(p => p.organizationId?.toString() === organizationId && p.canUploadPhotos);
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'No permission to upload photos' });
      }
    }

    // Extract photos
    emitBulkProgress(importId, userId, 'extracting_photos', {
      message: 'Extracting photos from ZIP...',
      percentage: 10
    }, 'bulk-photo');

    const photoCloudinaryMap = await extractAndUploadPhotosToCloudinary(req.file.buffer);
    const photoFilenames = Object.keys(photoCloudinaryMap);
    const totalPhotos = photoFilenames.length;

    emitBulkProgress(importId, userId, 'extracting_photos', {
      message: `Extracted ${totalPhotos} photos, matching with students...`,
      total: totalPhotos,
      percentage: 30
    }, 'bulk-photo');

    // Find students without photos
    const studentsWithoutPhotos = await Student.find({
      schoolId: organizationId,
      companyId: req.user.companyId,
      has_photo: false,
      isActive: true,
      student_id: { $in: photoFilenames }
    });

    emitBulkProgress(importId, userId, 'matching_photos', {
      message: `Found ${studentsWithoutPhotos.length} students without photos`,
      total: totalPhotos,
      processed: studentsWithoutPhotos.length,
      percentage: 40
    }, 'bulk-photo');

    const results = {
      total: totalPhotos,
      matched: studentsWithoutPhotos.length,
      uploaded: 0,
      failed: 0,
      skipped: [],
      details: []
    };

    // Upload with progress
    for (let i = 0; i < studentsWithoutPhotos.length; i++) {
      const student = studentsWithoutPhotos[i];
      const currentIndex = i + 1;
      const percentage = 40 + Math.round((currentIndex / studentsWithoutPhotos.length) * 55);

      emitBulkProgress(importId, userId, 'uploading_photos', {
        message: `Uploading photo ${currentIndex} of ${studentsWithoutPhotos.length}: ${student.name}`,
        percentage: percentage,
        processed: currentIndex,
        uploaded: results.uploaded,
        failed: results.failed,
        currentItem: {
          name: student.name,
          id: student.student_id,
          index: currentIndex,
          total: studentsWithoutPhotos.length
        }
      }, 'bulk-photo');

      const photoData = photoCloudinaryMap[student.student_id];
      if (photoData) {
        try {
          student.photo_url = photoData.secure_url;
          student.photo_public_id = photoData.public_id;
          student.has_photo = true;
          student.photo_uploaded_at = new Date();
          student.photo_metadata = {
            width: photoData.width,
            height: photoData.height,
            format: photoData.format,
            bytes: photoData.bytes
          };
          await student.save();
          results.uploaded++;
          results.details.push({
            student_id: student.student_id,
            name: student.name,
            status: 'success'
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            student_id: student.student_id,
            name: student.name,
            status: 'failed',
            error: error.message
          });
        }
      }
    }

    // Track unmatched photos
    const matchedIds = studentsWithoutPhotos.map(s => s.student_id);
    const unmatchedPhotos = photoFilenames.filter(id => !matchedIds.includes(id));
    results.skipped = unmatchedPhotos.map(id => ({
      filename: id,
      reason: 'No student found with this ID or student already has photo'
    }));

    const finalProgress = {
      importId,
      userId,
      stage: 'completed',
      total: totalPhotos,
      processed: totalPhotos,
      uploaded: results.uploaded,
      failed: results.failed,
      skipped: results.skipped.length,
      skippedFiles: results.skipped,
      details: results.details,
      percentage: 100,
      message: `✅ Complete! Uploaded: ${results.uploaded}, Failed: ${results.failed}, Skipped: ${results.skipped.length}`
    };

    bulkImportProgress.set(importId, finalProgress);

    socketService.emit('bulk-photo:complete', {
      importId,
      userId,
      total: totalPhotos,
      uploaded: results.uploaded,
      failed: results.failed,
      skipped: results.skipped.length,
      skippedFiles: results.skipped,
      details: results.details,
      message: finalProgress.message
    });

    setTimeout(() => bulkImportProgress.delete(importId), 300000);

    res.json({
      success: true,
      importId,
      message: finalProgress.message,
      results
    });
  } catch (error) {
    console.error('Bulk photo upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Health check
// ============================================
router.get('/health/check', async (req, res) => {
  try {
    const count = await Student.countDocuments();
    res.json({ success: true, status: 'ok', studentCount: count, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, status: 'error', error: error.message });
  }
});

module.exports = router;