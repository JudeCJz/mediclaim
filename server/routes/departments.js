const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { adminAuth } = require('../middleware/auth');

// @route   GET /api/departments
// @desc    Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/departments
// @desc    Add a new department
router.post('/', adminAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ msg: 'Name is required' });

  try {
    const normalizedName = name.trim();
    let department = await Department.findOne({ name: normalizedName });
    if (department) return res.status(400).json({ msg: 'Department already exists' });

    department = new Department({ name: normalizedName });
    await department.save();
    res.json(department);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/departments/:id
// @desc    Delete a department
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ msg: 'Department not found' });

    await department.deleteOne();
    res.json({ msg: 'Department removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
