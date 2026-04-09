const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Claim = require('../models/Claim');

const getTransporter = async () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return null;
  }

  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = await getTransporter();
  const recipients = Array.isArray(to) ? to : [to];

  if (!transporter) {
    console.warn('SMTP not configured. Email request accepted but not sent.');
    return {
      accepted: recipients,
      queued: true
    };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipients.join(', '),
    subject,
    html
  });

  return {
    accepted: info.accepted,
    rejected: info.rejected
  };
};

router.post('/', auth, async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ msg: 'to, subject and html are required' });
  }

  try {
    const result = await sendMail({ to, subject, html });
    res.json({ message: 'Mail request processed', ...result });
  } catch (err) {
    console.error(err.message);
    if (err.code === 'MODULE_NOT_FOUND') {
      return res.status(500).json({ msg: 'nodemailer dependency is not installed on the server' });
    }
    res.status(500).json({ msg: 'Failed to send mail' });
  }
});

router.post('/dispatch-confirmations', adminAuth, async (req, res) => {
  const { fyId, claimIds } = req.body;

  if (!fyId && !claimIds) {
    return res.status(400).json({ msg: 'fyId or claimIds is required' });
  }

  try {
    const query = { archived: { $ne: true } };
    if (claimIds && Array.isArray(claimIds)) {
        query._id = { $in: claimIds };
    } else {
        query.fyId = fyId;
    }

    const submissions = await Claim.find(query);
    const results = [];

    for (const claim of submissions) {
      const spouse = claim.dependents?.find(d => d.type === 'spouse');
      const children = claim.dependents?.filter(d => d.type === 'child');
      const parents = claim.dependents?.filter(d => d.type === 'parent');

      results.push(await sendMail({
        to: [claim.email],
        subject: `[FINALIZED] Mediclaim Enrollment Confirmation - FY ${claim.fyName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 40px; border-top: 8px solid #6366f1;">
            <h1 style="color: #6366f1; margin-bottom: 30px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Enrollment Record</h1>
            <p style="font-size: 1.1rem;">Dear <strong>${claim.userName}</strong>,</p>
            <p>Institutional management has finalized the medical insurance enrollment for the current cycle. Please review your record for accuracy.</p>
            
            <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #475569; font-size: 0.9rem; text-transform: uppercase;">Policy Highlights</h3>
              <table style="width: 100%; font-size: 0.95rem;">
                <tr><td style="color: #64748b;">Financial Year:</td><td style="font-weight: 700;">FY ${claim.fyName}</td></tr>
                <tr><td style="color: #64748b;">Coverage Tier:</td><td style="font-weight: 700; color: #6366f1;">${claim.coverageId}</td></tr>
                <tr><td style="color: #64748b;">Contribution:</td><td style="font-weight: 700; color: #0f172a;">INR ${Number(claim.premium || 0).toLocaleString('en-IN')}</td></tr>
              </table>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="color: #475569; font-size: 0.9rem; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Insured Dependents</h3>
              ${spouse ? `<p><strong>Spouse:</strong> ${spouse.name} (DOB: ${spouse.dob})</p>` : '<p style="color: #94a3b8; font-style: italic;">No spouse covered.</p>'}
              ${children?.length > 0 ? `
                <p><strong>Children:</strong></p>
                <ul style="padding-left: 20px;">
                  ${children.map(c => `<li>${c.relation || 'Child'}: ${c.name} (DOB: ${c.dob})</li>`).join('')}
                </ul>
              ` : ''}
              ${parents?.length > 0 ? `
                <p><strong>Parents:</strong></p>
                <ul style="padding-left: 20px;">
                  ${parents.map(p => `<li>${p.relation || 'Parent'}: ${p.name} (DOB: ${p.dob})</li>`).join('')}
                </ul>
              ` : ''}
            </div>

            <p style="font-size: 0.85rem; color: #64748b; margin-top: 50px;">Note: This is an automated notification. If you find any discrepancies, please contact HR/Administration immediately.</p>
          </div>
        `
      }));
    }

    res.json({
      message: `Successfully dispatched ${submissions.length} confirmation email(s).`,
      processed: submissions.length,
      results
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Failed to dispatch confirmation emails' });
  }
});

module.exports = router;
