const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  empId: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  designation: { type: String, default: '' },
  doj: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: 'Male' },
  role: { type: String, enum: ['faculty', 'hod', 'admin'], default: 'faculty' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
