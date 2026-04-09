const mongoose = require('mongoose');

const dependentSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  type: { type: String, enum: ['spouse', 'child', 'parent'], required: true },
  relation: { type: String, default: '' },
  name: { type: String, required: true },
  dob: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: 'Male' }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  filename: String,
  url: String,
  type: String
}, { _id: false });

const claimSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  email: { type: String, required: true },
  patientName: { type: String, required: true, default: 'Self' },
  relation: { type: String, required: true, default: 'Self' },
  hospital: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  financialYear: { type: String, required: true },
  fyId: { type: String, required: true },
  fyName: { type: String, required: true },
  empId: { type: String, required: true },
  phone: { type: String, default: '' },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },
  doj: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: 'Male' },
  policy: {
    id: { type: String, default: '' },
    label: { type: String, default: '' },
    premium: { type: Number, default: 0 }
  },
  coverageId: { type: String, default: '' },
  basePremium: { type: Number, default: 0 },
  spousePremium: { type: Number, default: 0 },
  childrenPremium: { type: Number, default: 0 },
  parentsPremium: { type: Number, default: 0 },
  premium: { type: Number, default: 0 },
  dependents: [dependentSchema],
  idCard: { type: String, default: '' },
  photo: { type: String, default: '' },
  documents: [documentSchema],
  status: { type: String, enum: ['pending_hod', 'pending_admin', 'approved', 'rejected', 'revision_requested', 'submitted'], default: 'submitted' },
  hodRemarks: { type: String },
  adminRemarks: { type: String },
  archived: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Claim', claimSchema);
