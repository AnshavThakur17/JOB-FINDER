const Job = require('../models/Job');
const Application = require('../models/Application');

exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ message: 'Only companies can post jobs' });
    const { title, description, location, skills } = req.body;
    const job = new Job({ title, description, location, skills, company: req.user._id });
    await job.save();
    res.json(job);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getJobs = async (req, res) => {
  try {
    const { q, skill } = req.query;
    const filter = {};
    if (q) filter.title = new RegExp(q, 'i');
    if (skill) filter.skills = { $in: [skill] };
    const jobs = await Job.find(filter).populate('company','name companyName');
    res.json(jobs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('company','name companyName');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.applyJob = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') return res.status(403).json({ message: 'Only candidates can apply' });
    const jobId = req.params.id;
    const { message } = req.body;
    const existing = await Application.findOne({ job: jobId, candidate: req.user._id });
    if (existing) return res.status(400).json({ message: 'Already applied' });
    const app = new Application({ job: jobId, candidate: req.user._id, message });
    await app.save();
    res.json({ message: 'Applied', application: app });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getApplicationsForJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!job.company.equals(req.user._id)) return res.status(403).json({ message: 'Only owning company can view' });
    const apps = await Application.find({ job: jobId }).populate('candidate','name email skills');
    res.json(apps);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
