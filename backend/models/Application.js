// backend/models/Application.js
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: String, // candidate message
  companyMessage: String, // message from company (on decision)
  appliedAt: { type: Date, default: Date.now },
  decisionAt: Date,
  status: { type: String, enum: ['pending','reviewed','rejected','accepted'], default: 'pending' }
});

module.exports = mongoose.model('Application', applicationSchema);
