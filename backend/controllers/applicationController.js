const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { sendMail } = require('../mailer');

exports.getForCompany = async (req, res) => {
  try {
    const apps = await Application.find()
      .populate('job')
      .populate('candidate', 'name email skills bio resumeUrl');

    const companyApps = apps.filter(
      a => a.job && String(a.job.company) === String(req.user._id)
    );

    res.json(companyApps);
  } catch (err) {
    console.error('getForCompany error', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getForCandidate = async (req, res) => {
  try {
    const apps = await Application.find({ candidate: req.user._id })
      .populate('job')
      .populate('candidate', 'name email skills bio resumeUrl');

    res.json(apps);
  } catch (err) {
    console.error('getForCandidate error', err);
    res.status(500).json({ message: err.message });
  }
};

exports.decision = async (req, res) => {
  try {
    const appId = req.params.id;
    const { status, message } = req.body;

    if (!['accepted', 'rejected', 'reviewed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const app = await Application.findById(appId)
      .populate('job')
      .populate('candidate', 'name email');

    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // ensure only owning company can decide
    if (!app.job || String(app.job.company) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only owning company can change status' });
    }

    app.status = status;
    if (message) app.companyMessage = message;
    app.decisionAt = new Date();
    await app.save();

    // ✅ SEND EMAIL ONLY TO CANDIDATE
    const candidateEmail = app.candidate?.email;

    if (candidateEmail) {
      const jobTitle = app.job?.title || 'your application';
      const compName = req.user.companyName || req.user.name || 'Company';

      const subject =
        status === 'accepted'
          ? `Congratulations — you were selected for ${jobTitle}`
          : `Update on your application for ${jobTitle}`;

      const html = `
        <p>Hi ${escapeHtml(app.candidate.name || '')},</p>
        <p>
          Your application for <strong>${escapeHtml(jobTitle)}</strong> at
          <strong>${escapeHtml(compName)}</strong> has been
          <strong>${escapeHtml(status)}</strong>.
        </p>
        ${
          message
            ? `<p><strong>Message from company:</strong><br/>${escapeHtml(message)}</p>`
            : ''
        }
        <p>Date: ${new Date().toLocaleString()}</p>
        <p>Thanks,<br/>Job Finder</p>
      `;

      try {
        await sendMail({
          to: candidateEmail,
          subject,
          html
        });
      } catch (mailErr) {
        console.warn('Email sending failed:', mailErr.message);
      }
    }

    res.json(app);
  } catch (err) {
    console.error('Error in applicationController.decision:', err);
    res.status(500).json({ message: err.message });
  }
};

// helper to prevent HTML injection in emails
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}
