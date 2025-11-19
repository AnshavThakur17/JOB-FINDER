// backend/controllers/applicationController.js
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

// create transporter once (reuse)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// optional verify during startup (will log but not crash)
transporter.verify().then(() => {
  console.log('SMTP transporter ready');
}).catch(err => {
  console.warn('SMTP transporter verification failed:', err && err.message ? err.message : err);
});

exports.getForCompany = async (req, res) => {
  try {
    const apps = await Application.find()
      .populate('job')
      .populate('candidate', 'name email skills bio resumeUrl');
    const companyApps = apps.filter(a => a.job && String(a.job.company) === String(req.user._id));
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

async function sendDecisionEmail(toEmail, subject, htmlBody) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured — skipping sending email to', toEmail);
    return { ok: false, reason: 'smtp-not-configured' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    html: htmlBody
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Decision email sent:', info && info.messageId ? info.messageId : info);
    return { ok: true, info };
  } catch (err) {
    console.error('Error sending decision email to', toEmail, err);
    return { ok: false, error: err };
  }
}

exports.decision = async (req, res) => {
  try {
    const appId = req.params.id;
    const { status, message } = req.body;
    if (!['accepted', 'rejected', 'reviewed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const app = await Application.findById(appId).populate('job').populate('candidate','name email');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    // Ensure the logged-in user owns the job
    if (!app.job || String(app.job.company) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only owning company can change status' });
    }

    app.status = status;
    if (message) app.companyMessage = message;
    app.decisionAt = new Date();
    await app.save();

    // Send email to candidate (non-blocking errors are fine)
    try {
      const candidateEmail = app.candidate && app.candidate.email;
      if (candidateEmail) {
        const jobTitle = app.job?.title || 'your application';
        const compName = req.user.companyName || req.user.name || 'Company';
        const subject = status === 'accepted'
          ? `Congratulations — you were selected for ${jobTitle}`
          : `Update on your application for ${jobTitle}`;
        const html = `
          <p>Hi ${app.candidate.name || ''},</p>
          <p>Your application for <strong>${jobTitle}</strong> at <strong>${escapeHtml(compName)}</strong> has been <strong>${escapeHtml(status)}</strong>.</p>
          ${message ? `<p><strong>Message from company:</strong><br/>${escapeHtml(message)}</p>` : ''}
          <p>Application details:</p>
          <ul>
            <li>Job: ${escapeHtml(jobTitle)}</li>
            <li>Status: ${escapeHtml(status)}</li>
            <li>Date: ${new Date().toLocaleString()}</li>
          </ul>
          <p>Thanks — Job Finder</p>
        `;

        // attempt to send
        const sendRes = await sendDecisionEmail(candidateEmail, subject, html);
        if (!sendRes.ok) {
          // don't fail the whole request; just log
          console.warn('Failed to send decision email', sendRes.error || sendRes.reason);
        }
      } else {
        console.warn('No candidate email; skipping email send for application', appId);
      }
    } catch (err) {
      console.error('Unexpected error while sending decision email:', err);
    }

    res.json(app);
  } catch (err) {
    console.error('Error in applicationController.decision:', err);
    res.status(500).json({ message: err.message });
  }
};

// small helper safe-escape for email html
function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
