// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function genToken(user){
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, bio, skills, companyName } = req.body;
    if(!email || !password) return res.status(400).json({ message: 'Email & password required' });
    const existing = await User.findOne({ email });
    if(existing) return res.status(400).json({ message: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash, role, bio, skills, companyName });
    await user.save();
    const token = genToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ message: 'Email & password required' });
    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await user.matchPassword(password);
    if(!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = genToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
