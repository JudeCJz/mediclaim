const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  actor: {
    uid: { type: String, default: '' },
    email: { type: String, default: '' },
    role: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  userAgent: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema, 'SYSTEM.AuditLogs');
