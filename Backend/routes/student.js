// routes/student.js - UPDATED WITH CLOUDINARY
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const Student = require('../models/Student');
const School = require('../models/School');
const authMiddleware = require('../middleware/authMiddleware');

// Import utilities
const { parseCSVFromBuffer } = require('../utilis/csvParser');
const { extractAndUploadPhotosToCloudinary } = require('../utilis/cloudinaryUpload');


// Make sure CLOUDINARY env variables are set

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

// --------------------------------------------------
// Multer upload middleware
// --------------------------------------------------
// 1. For photo uploads to Cloudinary
const uploadPhoto = multer({
  storage: studentPhotoStorage,  // ✅ Use Cloudinary storage
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for photos
  },
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

// 2. For CSV uploads (memory storage)
const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for CSV
  fileFilter: (req, file, cb) => {
    const isCSV = file.mimetype.includes('csv') ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (isCSV) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'));
    }
  }
});

// 3. For mixed uploads (CSV + ZIP)
const uploadMixed = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB total
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.fieldname === 'csv') {
      const isCSV = file.mimetype.includes('csv') ||
        file.originalname.toLowerCase().endsWith('.csv');
      if (isCSV) return cb(null, true);
    }

    // Accept ZIP files
    if (file.fieldname === 'photoZip') {
      const isZIP = file.mimetype.includes('zip') ||
        file.mimetype.includes('compressed') ||
        file.originalname.toLowerCase().endsWith('.zip');
      if (isZIP) return cb(null, true);
    }

    cb(new Error(`Invalid file type for ${file.fieldname}`));
  }
});



// --------------------------------------------------
// 1. GET all students (with Cloudinary URLs)
// --------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const query = {};

    // If admin, only show their school's students
    if (req.user.role !== 'super_admin') {
      query.schoolId = req.user.schoolId;
    }

    // If super_admin, allow filtering by schoolId
    if (req.user.role === 'super_admin' && req.query.schoolId) {
      query.schoolId = req.query.schoolId;
    }

    const students = await Student.find(query).sort({ student_id: 1 });

    // Add Cloudinary URLs to each student
    const studentsWithUrls = students.map(student => ({
      ...student.toObject(),
      photo_url: student.photo_public_id ?
        cloudinary.url(student.photo_public_id, {
          width: 200,
          height: 200,
          crop: 'fill',
          gravity: 'face',
          quality: 'auto',
          fetch_format: 'auto'
        }) : null
    }));

    res.json(studentsWithUrls);
  } catch (e) {
    console.error('❌ Error fetching students:', e);
    res.status(500).json({ error: e.message });
  }
});

// --------------------------------------------------
// 2. CREATE a new student (with Cloudinary photo)
// --------------------------------------------------
// CREATE a new student - ADD schoolId FROM AUTH
router.post('/', authMiddleware, uploadPhoto.single('photo'), async (req, res) => {
  try {
    const data = req.body;

    // If admin, automatically set schoolId from user
    if (req.user.role !== 'super_admin') {
      data.schoolId = req.user.schoolId;
    }

    // If super_admin, they can specify schoolId in body
    if (req.user.role === 'super_admin' && !data.schoolId) {
      return res.status(400).json({ error: 'schoolId is required for super admin' });
    }

    // If photo was uploaded via Cloudinary
    let photoData = null;
    if (req.file) {
      photoData = {
        url: req.file.path,
        secure_url: req.file.path,
        public_id: req.file.filename,
        originalname: req.file.originalname,
        width: req.file.width,
        height: req.file.height,
        bytes: req.file.size,
        format: req.file.format
      };
    }

    const student = new Student({
      student_id: data.student_id,
      name: data.name,
      class: data.class || 'N/A',
      level: data.level || 'N/A',
      residence: data.residence || 'N/A',
      gender: data.gender || 'N/A',
      academic_year: data.academic_year || 'N/A',
      parent_phone: data.parent_phone || '',
      schoolId: data.schoolId, // Add schoolId
      // Store Cloudinary data
      photo_url: photoData ? photoData.secure_url : null,
      photo_public_id: photoData ? photoData.public_id : null,
      photo_metadata: photoData ? {
        width: photoData.width,
        height: photoData.height,
        format: photoData.format,
        bytes: photoData.bytes
      } : null,
      has_photo: !!photoData,
      schoolId: req.body.organizationId, // The organization (school/client)
      companyId: req.user.companyId
    });

    await student.save();
    res.status(201).json(student);
  } catch (e) {
    console.error('❌ Error creating student:', e);
    res.status(400).json({ error: e.message });
  }
});

// --------------------------------------------------
// 3. UPDATE a student (Cloudinary photo replace)

router.put('/:id', authMiddleware, uploadPhoto.single('photo'), async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if admin has access to this student
    if (req.user.role !== 'super_admin' && student.schoolId?.toString() !== req.user.schoolId?.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('📷 Current student photo:', {
      has_photo: student.has_photo,
      photo_public_id: student.photo_public_id,
      photo_url: student.photo_url
    });

    const update = {
      name: data.name,
      class: data.class || 'N/A',
      level: data.level || 'N/A',
      residence: data.residence || 'N/A',
      gender: data.gender || 'N/A',
      academic_year: data.academic_year || 'N/A',
      parent_phone: data.parent_phone || ''
    };

    // Replace photo if a new one is uploaded
    if (req.file) {
      console.log('🖼️ Processing new photo upload...');

      // Delete old photo from Cloudinary if exists
      if (student.photo_public_id) {
        try {
          console.log(`🗑️ Deleting old photo: ${student.photo_public_id}`);
          await cloudinary.uploader.destroy(student.photo_public_id);
          console.log(`✅ Deleted old photo from Cloudinary`);
        } catch (deleteError) {
          console.warn('⚠️ Could not delete old photo:', deleteError.message);
        }
      }

      // Store new Cloudinary data
      console.log('☁️ Uploading new photo to Cloudinary...');
      update.photo_url = req.file.path;
      update.photo_public_id = req.file.filename;
      update.photo_metadata = {
        width: req.file.width,
        height: req.file.height,
        format: req.file.format,
        bytes: req.file.size
      };
      update.has_photo = true;
      update.photo_updated_at = new Date();

      console.log('✅ Photo update data:', {
        photo_url: update.photo_url,
        has_photo: update.has_photo
      });
    } else {
      console.log('📭 No new photo file in request');
    }

    console.log('💾 Saving student update...');
    const updatedStudent = await Student.findByIdAndUpdate(id, update, { new: true });

    console.log('✅ Student updated successfully:', {
      _id: updatedStudent._id,
      name: updatedStudent.name,
      has_photo: updatedStudent.has_photo,
      photo_url: updatedStudent.photo_url
    });

    res.json(updatedStudent);
  } catch (e) {
    console.error('❌ Error updating student:', e);
    res.status(400).json({ error: e.message });
  }
});



// --------------------------------------------------
// 4. GET student photo URL (optimized)
// --------------------------------------------------
router.get('/photo/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { size = 'medium' } = req.query;

    const student = await Student.findById(studentId);

    if (!student || !student.photo_public_id) {
      return res.status(404).json({ error: 'Student photo not found' });
    }

    // Define size presets
    const sizePresets = {
      thumbnail: { width: 100, height: 100, crop: 'fill' },
      small: { width: 200, height: 200, crop: 'fill' },
      medium: { width: 400, height: 400, crop: 'fill' },
      large: { width: 800, height: 800, crop: 'limit' }
    };

    const preset = sizePresets[size] || sizePresets.medium;

    // Generate Cloudinary URL with optimizations
    const url = cloudinary.url(student.photo_public_id, {
      ...preset,
      gravity: 'face', // Focus on face for thumbnails
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    });

    // Redirect to Cloudinary URL
    res.redirect(url);

  } catch (error) {
    console.error('❌ Student photo retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

// routes/student.js - ADD THESE ROUTES

// GET students grouped by organization (for dashboard cards)
router.get('/grouped-by-organization', authMiddleware, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Get all organizations for this company
    const organizations = await School.find({ companyId, isActive: true })
      .select('name type logo stats');

    // Get student counts per organization
    const grouped = await Promise.all(organizations.map(async (org) => {
      const studentCount = await Student.countDocuments({
        schoolId: org._id,
        companyId,
        isActive: true
      });
      const employeeCount = await Student.countDocuments({
        schoolId: org._id,
        companyId,
        personType: 'employee',
        isActive: true
      });
      const withPhotos = await Student.countDocuments({
        schoolId: org._id,
        companyId,
        has_photo: true,
        isActive: true
      });
      const cardsGenerated = await Student.countDocuments({
        schoolId: org._id,
        companyId,
        card_generated: true,
        isActive: true
      });

      return {
        organization: {
          _id: org._id,
          name: org.name,
          type: org.type,
          logo: org.logo?.url
        },
        stats: {
          totalStudents: org.type === 'corporate' ? employeeCount : studentCount,
          totalEmployees: employeeCount,
          withPhotos,
          cardsGenerated,
          pendingCards: (org.type === 'corporate' ? employeeCount : studentCount) - cardsGenerated
        }
      };
    }));

    // Summary stats
    const totalStudents = await Student.countDocuments({ companyId, personType: 'student', isActive: true });
    const totalEmployees = await Student.countDocuments({ companyId, personType: 'employee', isActive: true });
    const totalOrganizations = organizations.length;
    const schoolOrgs = organizations.filter(o => o.type !== 'corporate').length;
    const corporateOrgs = organizations.filter(o => o.type === 'corporate').length;

    res.json({
      success: true,
      summary: {
        totalOrganizations,
        schools: schoolOrgs,
        companies: corporateOrgs,
        totalStudents,
        totalEmployees,
        totalPeople: totalStudents + totalEmployees
      },
      organizations: grouped
    });

  } catch (error) {
    console.error('Grouped students error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET students for a specific organization (with search & filters)
router.get('/organization/:orgId', authMiddleware, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { search, personType, class: className, level, gender, hasPhoto, cardGenerated, page = 1, limit = 20 } = req.query;

    // Verify this org belongs to user's company
    const org = await School.findOne({ _id: orgId, companyId: req.user.companyId });
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Check co-worker permission for this org
    if (req.user.role === 'co_worker') {
      const orgPerm = req.user.permissions.find(
        p => p.organizationId.toString() === orgId
      );
      if (!orgPerm || !orgPerm.canManageStudents) {
        return res.status(403).json({ success: false, error: 'Access denied to this organization' });
      }
    }

    // Build query
    const query = {
      schoolId: orgId,
      companyId: req.user.companyId,
      isActive: true
    };

    if (personType) query.personType = personType;
    if (className) query['studentDetails.class'] = className;
    if (level) query['studentDetails.level'] = level;
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
      Student.find(query)
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
    console.error('Get org students error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET filter options for an organization (for dropdown filters)
router.get('/organization/:orgId/filter-options', authMiddleware, async (req, res) => {
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

// --------------------------------------------------
// 5. BULK DELETE student photos (admin cleanup)
// --------------------------------------------------
router.post('/cleanup-photos', async (req, res) => {
  try {
    console.log('🧹 Cleaning up unused student photos...');

    // Get all students with photos
    const students = await Student.find({ photo_public_id: { $exists: true, $ne: null } });
    const activePublicIds = students.map(s => s.photo_public_id);

    // List all resources in the card-agent/people/photos folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'card-agent/people/photos/',
      max_results: 500
    });

    const cloudinaryResources = result.resources || [];
    let deletedCount = 0;

    // Delete orphaned photos
    for (const resource of cloudinaryResources) {
      if (!activePublicIds.includes(resource.public_id)) {
        try {
          await cloudinary.uploader.destroy(resource.public_id);
          deletedCount++;
          console.log('🗑️ Deleted orphaned photo:', resource.public_id);
        } catch (deleteError) {
          console.warn('⚠️ Could not delete:', resource.public_id, deleteError.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Cloudinary photo cleanup completed`,
      deletedCount: deletedCount,
      totalResources: cloudinaryResources.length
    });

  } catch (error) {
    console.error('❌ Photo cleanup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --------------------------------------------------
// 6. DELETE ALL STUDENTS (DANGEROUS - Admin only)
// --------------------------------------------------
router.delete('/delete-all',
  authMiddleware,
  async (req, res) => {
    try {
      console.log('⚠️ WARNING: Attempting to delete ALL students for school');

      // Build query based on user role
      const query = {};

      // For non-super_admin, only delete their school's students
      if (req.user.role !== 'super_admin') {
        query.schoolId = req.user.schoolId;
      } else if (req.user.role === 'super_admin' && req.query.schoolId) {
        query.schoolId = req.query.schoolId;
      }

      const totalStudents = await Student.countDocuments(query);

      if (totalStudents === 0) {
        return res.json({
          success: true,
          message: 'No students to delete for this school',
          deletedCount: 0
        });
      }

      // Fetch students to get their photo public_ids
      const allStudents = await Student.find(query);

      // Delete photos from Cloudinary
      let deletedPhotos = 0;
      const deletePhotoPromises = allStudents.map(async (student) => {
        if (student.photo_public_id) {
          try {
            await cloudinary.uploader.destroy(student.photo_public_id);
            deletedPhotos++;
          } catch (photoError) {
            console.warn(`⚠️ Could not delete photo:`, photoError.message);
          }
        }
      });

      await Promise.allSettled(deletePhotoPromises);

      // Delete students from database
      const result = await Student.deleteMany(query);

      console.log(`🗑️ Deleted ${result.deletedCount} students for school ${req.user.schoolId}`);

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} students from your school`,
        deletedCount: result.deletedCount,
        deletedPhotos: deletedPhotos
      });

    } catch (error) {
      console.error('❌ Error deleting all students:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// --------------------------------------------------
// 7. GET STUDENT STATISTICS
// --------------------------------------------------
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const query = {};

    if (req.user.role !== 'super_admin') {
      query.schoolId = req.user.schoolId;
    }

    if (req.user.role === 'super_admin' && req.query.schoolId) {
      query.schoolId = req.query.schoolId;
    }

    const totalStudents = await Student.countDocuments(query);
    const studentsWithPhotos = await Student.countDocuments({ ...query, has_photo: true });

    res.json({
      success: true,
      stats: {
        totalStudents,
        studentsWithPhotos,
        studentsWithoutPhotos: totalStudents - studentsWithPhotos
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// --------------------------------------------------
// 8. DELETE a student (with Cloudinary cleanup)
// --------------------------------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Check if admin has access to this student
    if (req.user.role !== 'super_admin' && student.schoolId?._id.toString() !== req.schoolId?.toString()) {
      console.log('Student school ID:', student.schoolId?._id.toString());
      console.log('User school ID:', req.schoolId?.toString());
      return res.status(403).json({ success: false, error: 'Access denied' });

    }

    console.log('🗑️ Deleting student:', student.name);

    // Delete photo from Cloudinary if exists
    let deletedPhoto = false;
    if (student.photo_public_id) {
      try {
        await cloudinary.uploader.destroy(student.photo_public_id);
        deletedPhoto = true;
        console.log('✅ Deleted student photo from Cloudinary:', student.photo_public_id);
      } catch (photoError) {
        console.warn('⚠️ Could not delete student photo from Cloudinary:', photoError.message);
      }
    }

    // Delete from database
    await Student.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Student deleted successfully`,
      deletedPhoto: deletedPhoto,
      studentName: student.name
    });

  } catch (error) {
    console.error('❌ Student deletion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// --------------------------------------------------
// 9. BULK IMPORT STUDENTS FROM CSV
// --------------------------------------------------
router.post('/bulk-import', authMiddleware, uploadCSV.single('csv'), async (req, res) => {
  try {
    console.log('📦 Starting bulk student import from CSV...');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    console.log(`📁 CSV file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Parse CSV
    const students = await parseCSVFromBuffer(req.file.buffer);

    // Add schoolId to each student
    const studentsWithSchool = students.map(student => ({
      ...student,
      schoolId: req.user.schoolId // Add schoolId from auth
    }));

    console.log(`✅ Parsed ${students.length} students from CSV`);

    console.log(`✅ Parsed ${studentsWithSchool.length} students from CSV`);

    const results = {
      total: studentsWithSchool.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Process each student
    for (const studentData of studentsWithSchool) {
      try {
        // Check if student already exists
        const existingStudent = await Student.findOne({
          student_id: studentData.student_id
        });

        if (existingStudent) {
          // Update existing student
          Object.assign(existingStudent, studentData);
          await existingStudent.save();
          results.updated++;
          console.log(`✅ Updated: ${studentData.name} (${studentData.student_id})`);
        } else {
          // Create new student
          const student = new Student({
            ...studentData,
            has_photo: false, // No photo in CSV import
            created_from_csv: true,
            csv_import_date: new Date()
          });

          await student.save();
          results.created++;
          console.log(`✅ Created: ${studentData.name} (${studentData.student_id})`);
        }

      } catch (error) {
        results.skipped++;
        results.errors.push({
          student_id: studentData.student_id,
          name: studentData.name,
          error: error.message
        });
        console.error(`❌ Failed for ${studentData.student_id}:`, error.message);
      }
    }

    console.log('📊 Import results:', results);

    res.json({
      success: true,
      message: `Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results,
      summary: `Processed ${results.total} students from CSV`
    });

  } catch (error) {
    console.error('❌ Bulk import error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// --------------------------------------------------
// 10. BULK IMPORT WITH PHOTOS (CSV + ZIP)
// --------------------------------------------------
router.post('/bulk-import-with-photos', uploadMixed.fields([
  { name: 'csv', maxCount: 1 },
  { name: 'photoZip', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📦 Starting bulk import with photos...');

    // Validate files
    if (!req.files || !req.files.csv) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    const csvFile = req.files.csv[0];
    const photoZipFile = req.files.photoZip ? req.files.photoZip[0] : null;

    console.log('📁 Files received:', {
      csv: `${csvFile.originalname} (${csvFile.size} bytes)`,
      hasPhotoZip: !!photoZipFile
    });

    // Parse CSV
    const students = await parseCSVFromBuffer(csvFile.buffer);

    // Add schoolId to each student
    const studentsWithSchool = students.map(student => ({
      ...student,
      schoolId: req.user.schoolId // Add schoolId from auth
    }));
    console.log(`✅ Parsed ${studentsWithSchool.length} students from CSV`);

    // Extract and upload photos if ZIP provided
    let photoCloudinaryMap = {};
    if (photoZipFile) {
      console.log('📦 Extracting and uploading photos from ZIP...');
      photoCloudinaryMap = await extractAndUploadPhotosToCloudinary(photoZipFile.buffer);
      console.log(`✅ Uploaded ${Object.keys(photoCloudinaryMap).length} photos to Cloudinary`);
    }

    const results = {
      total: studentsWithSchool.length,
      created: 0,
      updated: 0,
      skipped: 0,
      withPhotos: 0,
      errors: []
    };

    // Process each student
    for (const studentData of studentsWithSchool) {
      try {
        const cloudinaryPhoto = photoCloudinaryMap[studentData.student_id];

        // Check if student exists
        const existingStudent = await Student.findOne({
          student_id: studentData.student_id
        });

        const studentUpdate = {
          ...studentData,
          created_from_csv: true,
          csv_import_date: new Date()
        };

        // Add Cloudinary photo data if available
        if (cloudinaryPhoto) {
          studentUpdate.photo_url = cloudinaryPhoto.secure_url;
          studentUpdate.photo_public_id = cloudinaryPhoto.public_id;
          studentUpdate.photo_metadata = {
            width: cloudinaryPhoto.width,
            height: cloudinaryPhoto.height,
            format: cloudinaryPhoto.format,
            bytes: cloudinaryPhoto.bytes
          };
          studentUpdate.has_photo = true;
          studentUpdate.photo_uploaded_at = new Date();
          results.withPhotos++;
        }

        if (existingStudent) {
          // Update existing
          Object.assign(existingStudent, studentUpdate);
          await existingStudent.save();
          results.updated++;
          console.log(`✅ Updated: ${studentData.name} ${cloudinaryPhoto ? '(+photo)' : ''}`);
        } else {
          // Create new
          const student = new Student(studentUpdate);
          await student.save();
          results.created++;
          console.log(`✅ Created: ${studentData.name} ${cloudinaryPhoto ? '(+photo)' : ''}`);
        }

      } catch (error) {
        results.skipped++;
        results.errors.push({
          student_id: studentData.student_id,
          name: studentData.name,
          error: error.message
        });
        console.error(`❌ Failed for ${studentData.student_id}:`, error.message);
      }
    }

    console.log('📊 Import with photos results:', results);

    res.json({
      success: true,
      message: `Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.withPhotos} with photos`,
      results,
      summary: `Processed ${results.total} students`
    });

  } catch (error) {
    console.error('❌ Bulk import with photos error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



// --------------------------------------------------
// 11. Health check endpoint
// --------------------------------------------------
router.get('/health/check', async (req, res) => {
  try {
    const count = await Student.countDocuments();
    res.json({
      success: true,
      status: 'ok',
      studentCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, status: 'error', error: error.message });
  }
});




module.exports = router;