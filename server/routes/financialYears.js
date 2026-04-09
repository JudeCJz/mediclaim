const express = require('express');
const router = express.Router();
const FinancialYear = require('../models/FinancialYear');
const { auth, adminAuth } = require('../middleware/auth');

const serializeFY = (fy) => ({
  ...fy.toObject(),
  id: fy._id.toString(),
  deadline: fy.lastSubmissionDate
});

router.get('/', auth, async (req, res) => {
  try {
    const financialYears = await FinancialYear.find().sort({ createdAt: -1 });
    res.json(financialYears.map(serializeFY));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to fetch financial years' });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const created = await FinancialYear.create(req.body);
    req.app.get('io').emit('FY_UPDATED', { id: created._id.toString() });
    res.status(201).json(serializeFY(created));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to create financial year' });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const updated = await FinancialYear.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ msg: 'Financial year not found' });
    req.app.get('io').emit('FY_UPDATED', { id: updated._id.toString() });
    res.json(serializeFY(updated));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to update financial year' });
  }
});

router.patch('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const updated = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { enabled: Boolean(req.body.enabled) },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ msg: 'Financial year not found' });
    req.app.get('io').emit('FY_UPDATED', { id: updated._id.toString() });
    res.json(serializeFY(updated));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to toggle financial year' });
  }
});

router.post('/:id/archive', adminAuth, async (req, res) => {
  try {
    const updated = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, archivedAt: new Date(), enabled: false },
      { new: true }
    );
    if (!updated) return res.status(404).json({ msg: 'Financial year not found' });
    req.app.get('io').emit('FY_UPDATED', { id: updated._id.toString() });
    res.json(serializeFY(updated));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to archive financial year' });
  }
});

router.post('/:id/unarchive', adminAuth, async (req, res) => {
  try {
    const updated = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { isArchived: false, archivedAt: null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ msg: 'Financial year not found' });
    req.app.get('io').emit('FY_UPDATED', { id: updated._id.toString() });
    res.json(serializeFY(updated));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to restore financial year' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await FinancialYear.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: 'Financial year not found' });
    req.app.get('io').emit('FY_UPDATED', { id: req.params.id });
    res.json({ msg: 'Financial year deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to delete financial year' });
  }
});

module.exports = router;
