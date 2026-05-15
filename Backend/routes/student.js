// routes/student.js - FULLY FIXED FOR Student MODEL
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

//Global Use authMiddleware
router.use(authMiddleware)

// ============================================
// GET all students - FIXED permission check
// ============================================
router.get('/', async (req, res) => {
  try {
    const query = {};

    // Super admin can see all
    if (req.user.role === 'super_admin') {
      if (req.query.schoolId) {
        query.schoolId = req.query.schoolId;
      }
    }
    // Admin and co_worker must be filtered by company
    else {
      query.companyId = req.user.companyId;  // ✅ Add company filter

      // Co-worker additional filter
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
// 2. CREATE a new student/employee - CORRECTED
// ============================================
router.post('/', uploadPhoto.single('photo'), async (req, res) => {
  try {
    const data = req.body;
    const companyId = req.user.companyId;

    // ✅ CORRECT LOGIC:
    let organizationId;

    if (req.user.role === 'super_admin') {
      // Super admin: MUST provide organizationId
      organizationId = data.organizationId || data.schoolId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required for super_admin' });
      }
    }
    else if (req.user.role === 'admin') {
      // Admin: MUST provide organizationId (they can access any org in their company)
      organizationId = data.organizationId || data.schoolId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }
    }
    else if (req.user.role === 'co_worker') {
      // Co-worker: MUST provide organizationId AND have permission
      organizationId = data.organizationId || data.schoolId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }

      // Check if co-worker has permission for this organization
      const hasPermission = req.user.permissions?.some(
        p => p.organizationId.toString() === organizationId && p.canManageStudents
      );
      if (!hasPermission) {
        return res.status(403).json({ error: 'You do not have permission to manage students in this organization' });
      }
    }

    // Verify organization exists and belongs to the user's company
    // For super_admin: no company restriction (they can access any company's org)
    let query = { _id: organizationId };
    if (req.user.role !== 'super_admin') {
      query.companyId = companyId;  // Admin and co-worker: must belong to their company
    }

    const organization = await School.findOne(query);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // For admin: verify org belongs to their company (already in query)
    // For co-worker: already verified permission above
    // For super_admin: no company restriction

    // Handle photo upload
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

    // Determine personType
    const personType = data.personType || 'student';

    // Build base student data
    let studentData = {
      name: data.name,
      personType: personType,
      gender: data.gender || 'N/A',
      residence: data.residence || 'N/A',
      phone: data.phone || '',
      email: data.email || '',
      schoolId: organizationId,
      companyId: organization.companyId,  // Use org's companyId, not req.user's (for super_admin)
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

    // Handle Student-specific fields
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

    // Handle Employee-specific fields
    if (personType === 'employee') {
      studentData.employeeDetails = {
        department: data.department || '',
        position: data.position || '',
        employeeId: data.employeeId || '',
        workPhone: data.workPhone || ''
      };

      // Auto-generate employee ID if not provided
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
// UPDATE a student - FIXED permission check
// ============================================
router.put('/:id', uploadPhoto.single('photo'), async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // ✅ CORRECT: Check companyId instead of schoolId
    if (req.user.role !== 'super_admin' && student.companyId?.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({ error: 'Access denied - Student belongs to different company' });
    }

    // Rest of update logic...
    const update = {
      name: data.name || student.name,
      gender: data.gender || student.gender,
      residence: data.residence || student.residence,
      phone: data.phone || student.phone,
      email: data.email || student.email
    };

    // Handle Student fields (nested)
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

    // Handle Employee fields (nested)
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

    // Handle photo replacement
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
// 4. GET student photo URL
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
// 5. GET students grouped by organization
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
    const schoolOrgs = organizations.filter(o => o.type !== 'corporate').length;
    const corporateOrgs = organizations.filter(o => o.type === 'corporate').length;

    res.json({
      success: true,
      summary: { totalOrganizations, schools: schoolOrgs, companies: corporateOrgs, totalStudents, totalEmployees, totalPeople: totalStudents + totalEmployees },
      organizations: grouped
    });
  } catch (error) {
    console.error('Grouped students error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 6. GET students for specific organization
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
// 7. GET filter options for organization
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
// DELETE a student - CORRECTED
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Permission checks based on role
    if (req.user.role === 'super_admin') {
      // Super admin can delete any student
      // No additional check needed
    }
    else if (req.user.role === 'admin') {
      // Admin can delete students only from their company
      if (student.companyId?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied - Student belongs to different company' });
      }
    }
    else if (req.user.role === 'co_worker') {
      // Co-worker can delete students only from organizations they have permission for
      const hasPermission = req.user.permissions?.some(
        p => p.organizationId.toString() === student.schoolId?.toString() && p.canManageStudents
      );
      if (!hasPermission) {
        return res.status(403).json({ success: false, error: 'Access denied - No permission for this organization' });
      }
    }
    else {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Delete photo from Cloudinary if exists
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
// 9. BULK IMPORT STUDENTS FROM CSV
// ============================================
router.post('/bulk-import', uploadCSV.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }

    const students = await parseCSVFromBuffer(req.file.buffer);
    const studentsWithSchool = students.map(student => ({ ...student, schoolId: req.user.schoolId }));

    const results = { total: studentsWithSchool.length, created: 0, updated: 0, skipped: 0, errors: [] };

    for (const studentData of studentsWithSchool) {
      try {
        const existingStudent = await Student.findOne({ student_id: studentData.student_id });
        if (existingStudent) {
          Object.assign(existingStudent, studentData);
          await existingStudent.save();
          results.updated++;
        } else {
          const student = new Student({ ...studentData, has_photo: false, created_from_csv: true, csv_import_date: new Date() });
          await student.save();
          results.created++;
        }
      } catch (error) {
        results.skipped++;
        results.errors.push({ student_id: studentData.student_id, name: studentData.name, error: error.message });
      }
    }

    res.json({ success: true, message: `Bulk import completed`, results });
  } catch (error) {
    console.error('❌ Bulk import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 10. BULK IMPORT WITH PHOTOS (CSV + ZIP)
// ============================================
router.post('/bulk-import-with-photos', uploadMixed.fields([{ name: 'csv', maxCount: 1 }, { name: 'photoZip', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files.csv) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }

    const csvFile = req.files.csv[0];
    const photoZipFile = req.files.photoZip ? req.files.photoZip[0] : null;
    const students = await parseCSVFromBuffer(csvFile.buffer);
    const studentsWithSchool = students.map(student => ({ ...student, schoolId: req.user.schoolId }));

    let photoCloudinaryMap = {};
    if (photoZipFile) {
      photoCloudinaryMap = await extractAndUploadPhotosToCloudinary(photoZipFile.buffer);
    }

    const results = { total: studentsWithSchool.length, created: 0, updated: 0, skipped: 0, withPhotos: 0, errors: [] };

    for (const studentData of studentsWithSchool) {
      try {
        const cloudinaryPhoto = photoCloudinaryMap[studentData.student_id];
        const studentUpdate = { ...studentData, created_from_csv: true, csv_import_date: new Date() };

        if (cloudinaryPhoto) {
          studentUpdate.photo_url = cloudinaryPhoto.secure_url;
          studentUpdate.photo_public_id = cloudinaryPhoto.public_id;
          studentUpdate.photo_metadata = { width: cloudinaryPhoto.width, height: cloudinaryPhoto.height, format: cloudinaryPhoto.format, bytes: cloudinaryPhoto.bytes };
          studentUpdate.has_photo = true;
          studentUpdate.photo_uploaded_at = new Date();
          results.withPhotos++;
        }

        const existingStudent = await Student.findOne({ student_id: studentData.student_id });
        if (existingStudent) {
          Object.assign(existingStudent, studentUpdate);
          await existingStudent.save();
          results.updated++;
        } else {
          const student = new Student(studentUpdate);
          await student.save();
          results.created++;
        }
      } catch (error) {
        results.skipped++;
        results.errors.push({ student_id: studentData.student_id, name: studentData.name, error: error.message });
      }
    }

    res.json({ success: true, message: `Bulk import completed`, results });
  } catch (error) {
    console.error('❌ Bulk import with photos error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 11. Health check
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