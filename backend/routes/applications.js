// backend/routes/applications.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const applicationController = require('../controllers/applicationController');

router.get('/company', auth, applicationController.getForCompany);
router.get('/me', auth, applicationController.getForCandidate);
router.patch('/:id/decision', auth, applicationController.decision);

module.exports = router;
