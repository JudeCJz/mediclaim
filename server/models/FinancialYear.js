const mongoose = require('mongoose');

const financialYearSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  lastSubmissionDate: { type: Date },
  maxChildren: { type: Number, default: 2 },
  maxParents: { type: Number, default: 2 },
  spousePremium: { type: Number, default: 0 },
  childPremium: { type: Number, default: 0 },
  parentPremium: { type: Number, default: 0 },
  allowSpouse: { type: Boolean, default: true },
  allowChildren: { type: Boolean, default: true },
  allowParents: { type: Boolean, default: true },
  requireDocuments: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  deadlineEmailSent: { type: Boolean, default: false },
  warning48hEmailSent: { type: Boolean, default: false },
  policies: [{
    id: String,
    label: String,
    premium: Number,
    spousePremium: { type: Number, default: 0 },
    childPremium: { type: Number, default: 0 },
    parentPremium: { type: Number, default: 0 },
    maxChildren: { type: Number, default: 2 },
    maxParents: { type: Number, default: 2 },
    allowSpouse: { type: Boolean, default: true },
    allowChildren: { type: Boolean, default: true },
    allowParents: { type: Boolean, default: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FinancialYear', financialYearSchema);
