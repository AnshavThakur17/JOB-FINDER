const router = require('express').Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');

router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJob);
router.post('/', auth, jobController.createJob);
router.post('/:id/apply', auth, jobController.applyJob);
router.get('/:id/applications', auth, jobController.getApplicationsForJob);

module.exports = router;
