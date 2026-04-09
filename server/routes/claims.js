const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const Claim = require('../models/Claim');
const FinancialYear = require('../models/FinancialYear');

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Only images and PDFs are allowed!');
    }
  },
});

const normalizeDependents = (dependents = []) => dependents.map((dependent) => {
  let relation = dependent.relation;
  if (!relation) {
    if (dependent.type === 'spouse') relation = 'Spouse';
    if (dependent.type === 'child') relation = 'Child';
    if (dependent.type === 'parent') relation = dependent.gender === 'Female' ? 'Mother' : 'Father';
  }

  return {
    ...dependent,
    relation
  };
});

const mapClaimPayload = async (body, userId) => {
  const financialYear = body.financialYear || body.fyName;
  let fyId = body.fyId;
  let fyName = body.fyName || financialYear;

  if (fyId && !fyName) {
    const financialYearDoc = await FinancialYear.findById(fyId).lean();
    if (financialYearDoc) {
      fyName = financialYearDoc.name;
    }
  }

  return {
    userId,
    userName: body.userName,
    email: body.email,
    patientName: body.patientName || body.userName || 'Self',
    relation: body.relation || 'Self',
    hospital: body.hospital || '',
    amount: Number(body.amount || body.premium || 0),
    financialYear: financialYear || fyName,
    fyId: fyId || String(body.financialYear || ''),
    fyName: fyName || String(body.financialYear || ''),
    empId: body.empId,
    phone: body.phone || '',
    department: body.department || '',
    designation: body.designation || '',
    doj: body.doj || '',
    gender: body.gender || 'Male',
    policy: body.policy || {},
    coverageId: body.coverageId || body.policy?.label || '',
    basePremium: Number(body.basePremium || 0),
    spousePremium: Number(body.spousePremium || 0),
    childrenPremium: Number(body.childrenPremium || 0),
    parentsPremium: Number(body.parentsPremium || 0),
    premium: Number(body.premium || body.amount || 0),
    dependents: normalizeDependents(body.dependents || []),
    idCard: body.idCard || '',
    photo: body.photo || '',
    archived: Boolean(body.archived),
    status: body.status || 'submitted',
    hodRemarks: body.hodRemarks || '',
    adminRemarks: body.adminRemarks || '',
    documents: body.documents || []
  };
};

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  res.status(201).json({
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype
  });
});

router.get('/my-claims', auth, async (req, res) => {
  try {
    const claims = await Claim.find({ userId: req.user.id }).sort({ submittedAt: -1 });
    res.json(claims);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to fetch your claims' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const claimData = await mapClaimPayload(req.body, req.user.id);
    const newClaim = new Claim(claimData);
    const claim = await newClaim.save();

    const io = req.app.get('io');
    io.emit('CLAIM_UPDATED', claim);

    res.status(201).json(claim);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to create claim' });
  }
});

// @route   GET api/claims
// @desc    Get all claims or filter by user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'faculty') {
      query.userId = req.user.id;
    }
    
    const claims = await Claim.find(query).populate('userId', 'name department empId').sort({ submittedAt: -1 });
    res.json(claims);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to fetch claims' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    let claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ msg: 'Claim not found' });

    const isOwner = claim.userId.toString() === req.user.id;
    const isApprover = req.user.role === 'admin' || req.user.role === 'hod';
    if (!isOwner && !isApprover) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    if (isOwner) {
      const updatedPayload = await mapClaimPayload(req.body, claim.userId.toString());
      Object.assign(claim, updatedPayload);
    } else {
      const { status, hodRemarks, adminRemarks, archived } = req.body;
      if (status !== undefined) claim.status = status;
      if (hodRemarks !== undefined) claim.hodRemarks = hodRemarks;
      if (adminRemarks !== undefined) claim.adminRemarks = adminRemarks;
      if (archived !== undefined) claim.archived = archived;
    }

    claim.updatedAt = Date.now();

    await claim.save();
    
    const io = req.app.get('io');
    io.emit('CLAIM_UPDATED', claim);

    res.json(claim);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to update claim' });
  }
});

module.exports = router;
