const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

router.get('/', adminAuth, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(250);
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to fetch audit logs' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const log = await AuditLog.create(req.body);
    res.status(201).json(log);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to save audit log' });
  }
});

module.exports = router;
