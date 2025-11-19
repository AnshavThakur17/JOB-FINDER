// backend/routes/users.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// simple disk storage to backend/uploads/resumes
const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${req.user ? req.user._id : 'anon'}-${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if(allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF/DOC allowed'));
  }
});

router.get('/me', auth, userController.getProfile);
// Note: upload.single('resume') expects the field name 'resume' in the FormData
router.put('/me', auth, upload.single('resume'), userController.updateProfile);

module.exports = router;
