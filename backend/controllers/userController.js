// backend/controllers/userController.js
const User = require('../models/User');
const path = require('path');

exports.getProfile = async (req, res) => {
  try {
    const u = req.user;
    res.json({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      bio: u.bio,
      skills: u.skills,
      companyName: u.companyName,
      resumeUrl: u.resumeUrl || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, skills, companyName } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Not found' });

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (companyName !== undefined) user.companyName = companyName;
    if (skills !== undefined) {
      // accept comma-separated or array
      if (typeof skills === 'string') {
        user.skills = skills.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(skills)) {
        user.skills = skills.map(s => String(s).trim()).filter(Boolean);
      }
    }

    // handle uploaded resume file (multer)
    if (req.file) {
      // save public path relative to backend (we'll serve /uploads)
      const relPath = `/uploads/resumes/${req.file.filename}`;
      user.resumeUrl = relPath;
    }

    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      skills: user.skills,
      companyName: user.companyName,
      resumeUrl: user.resumeUrl || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
