const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { auth, adminAuth } = require('../middleware/auth');
const User = require('../models/User');

const sanitizeUser = (user) => {
  const data = user.toObject ? user.toObject() : user;
  delete data.password;
  return data;
};

const canManageDirectory = (req) => req.user.role === 'admin' || req.user.role === 'hod';

// @route   GET api/users
// @desc    Get all users
// @access  Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/faculty', auth, async (req, res) => {
  if (!canManageDirectory(req)) {
    return res.status(403).json({ msg: 'Access denied' });
  }

  try {
    const users = await User.find({ role: 'faculty' }).select('-password').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to fetch faculty list' });
  }
});

router.post('/bulk-register', adminAuth, async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip empty lines
    if (!row.trim()) {
      skipped += 1;
      continue;
    }

    const parts = row.split(',').map((item) => item.trim());
    if (parts.length < 2) {
      skipped += 1;
      continue;
    }

    let name, department, emailPart, empIdInput, designation = '', phone = '';
    
    if (parts.length === 2) {
      // Format: Name, Email
      [name, emailPart] = parts;
      department = '';
      empIdInput = '';
    } else {
      // Format: Name, Department, Email, [ID, Designation, Phone]
      [name, department, emailPart, empIdInput, designation = '', phone = ''] = parts;
    }

    const email = emailPart?.trim().toLowerCase();
    const empId = empIdInput ? empIdInput.trim() : `PENDING-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Skip the CSV header row (case-insensitive check)
    const isHeader = (name.toLowerCase() === 'name' && (email.toLowerCase() === 'email' || department.toLowerCase() === 'department'));
    if (isHeader) continue;

    if (!name || !email) {
      skipped += 1;
      continue;
    }
    
    // Basic email format check
    if (!email.includes('@')) {
      skipped += 1;
      continue;
    }

    try {
      // Check for existing user by email OR empId (only if empId is provided)
      const queryOr = [{ email }];
      if (empId) {
          queryOr.push({ empId });
      }
      const existing = await User.findOne({ $or: queryOr });
      if (existing) {
        existing.name = name;
        existing.department = department;
        existing.email = email;
        existing.empId = empId;
        if (designation) existing.designation = designation;
        if (phone) existing.phone = phone;
        const salt = await bcrypt.genSalt(10);
        existing.password = await bcrypt.hash(email, salt);
        if (existing.role !== 'admin' && existing.role !== 'hod') {
          existing.role = 'faculty';
        }
        await existing.save();
        updated += 1;
      } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(email, salt);
        await User.create({
          name,
          department,
          email,
          empId,
          designation: designation || '',
          phone: phone || '',
          role: 'faculty',
          password: hashedPassword
        });
        created += 1;
      }
    } catch (rowErr) {
      console.error(`Skipping row [${row}] due to error:`, rowErr.message);
      skipped += 1;
    }
  }

  try {
    req.app.get('io').emit('USER_UPDATED', { type: 'bulk-register' });
  } catch (_) {}

  res.json({ message: `Created ${created}, updated ${updated}, skipped ${skipped}. Default password for new users: their email address.` });
});

router.post('/bulk-delete', adminAuth, async (req, res) => {
  const emails = Array.isArray(req.body.emails) ? req.body.emails : [];

  try {
    const result = await User.deleteMany({ email: { $in: emails }, role: 'faculty' });
    req.app.get('io').emit('USER_UPDATED', { type: 'bulk-delete' });
    res.json({ msg: `Deleted ${result.deletedCount} user(s)` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Bulk delete failed' });
  }
});

router.post('/bulk-status', adminAuth, async (req, res) => {
  const emails = Array.isArray(req.body.emails) ? req.body.emails : [];
  const status = req.body.status;

  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status value' });
  }

  try {
    const result = await User.updateMany(
      { email: { $in: emails }, role: 'faculty' },
      { $set: { status } }
    );
    req.app.get('io').emit('USER_UPDATED', { type: 'bulk-status', status });
    res.json({ msg: `Updated ${result.modifiedCount} user(s)` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Bulk status update failed' });
  }
});

const updateUser = async (req, res) => {
  const { role, status, password, ...profileUpdates } = req.body;
  const isSelf = req.user.id === req.params.id;
  const isAdmin = req.user.role === 'admin';

  try {
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    if (role !== undefined || status !== undefined || password !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ msg: 'Only admins can change role, status or reset passwords' });
      }
      if (role) user.role = role;
      if (status) user.status = status;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }
    }

    const allowedFields = ['name', 'phone', 'doj', 'gender', 'empId', 'department', 'designation'];
    for (const key of allowedFields) {
      if (profileUpdates[key] !== undefined) {
        user[key] = profileUpdates[key];
      }
    }

    await user.save();
    
    const io = req.app.get('io');
    io.emit('USER_UPDATED', { id: user.id, role: user.role, status: user.status });

    res.json(sanitizeUser(user));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to update user' });
  }
};

router.put('/:id', auth, updateUser);
router.patch('/:id', auth, updateUser);

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    await user.deleteOne();
    
    const io = req.app.get('io');
    io.emit('USER_DELETED', req.params.id);

    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

