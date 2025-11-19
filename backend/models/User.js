// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['candidate','company'], default: 'candidate' },
  bio: String,
  skills: [String],
  companyName: String,
  resumeUrl: String, // public path to uploaded resume (optional)
}, { timestamps: true });

userSchema.methods.matchPassword = async function(plain){
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
