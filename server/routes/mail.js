const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Claim = require('../models/Claim');
const User = require('../models/User');
const FinancialYear = require('../models/FinancialYear');
const EmailTemplate = require('../models/EmailTemplate');

const getTransporter = async () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM
  } = process.env;

  console.log('--- MAIL SYSTEM DIAGNOSTICS ---');
  console.log('SMTP_HOST:', SMTP_HOST || 'MISSING');
  console.log('SMTP_PORT:', SMTP_PORT || 'MISSING');
  console.log('SMTP_USER:', SMTP_USER || 'MISSING');
  console.log('SMTP_FROM:', SMTP_FROM || 'MISSING');
  console.log('SMTP_PASS:', SMTP_PASS ? 'PRESENT (HIDDEN)' : 'MISSING');
  console.log('-------------------------------');

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.error('CRITICAL: Mail system failed to initialize due to missing variables.');
    return null;
  }

  const nodemailer = require('nodemailer');
  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: port,
    secure: port === 465,          // true for 465 (SSL), false for 587 (STARTTLS)
    requireTLS: port === 587,      // enforce STARTTLS upgrade on port 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false    // prevents self-signed cert issues on some hosts
    }
  });

  // Verify SMTP connection before returning — error will surface in logs
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully.');
  } catch (verifyErr) {
    console.error('SMTP VERIFY FAILED:', verifyErr.code, verifyErr.message);
    throw verifyErr;
  }

  return transporter;
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = await getTransporter();
  const recipients = Array.isArray(to) ? to : [to];

  if (!transporter) {
    const error = new Error('SMTP_NOT_CONFIGURED: Missing email environment variables on the server.');
    console.error(error.message);
    throw error;
  }

  try {
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
  } catch (err) {
    console.error('Nodemailer sendMail Error:');
    console.error('  code   :', err.code);
    console.error('  message:', err.message);
    console.error('  response:', err.response);
    throw err;
  }
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

router.post('/announce-cycle', adminAuth, async (req, res) => {
    const { fyId } = req.body;
    if (!fyId) return res.status(400).json({ msg: 'fyId is required' });

    try {
        const fy = await FinancialYear.findById(fyId);
        if (!fy) return res.status(404).json({ msg: 'Financial cycle not found' });

        const users = await User.find({ role: { $in: ['faculty', 'hod'] }, status: 'active' });
        const emails = users.map(u => u.email).filter(e => e);

        if (emails.length === 0) return res.json({ message: 'No recipients found.' });

        await sendMail({
            to: emails,
            subject: `[ACTION REQUIRED] Mediclaim Enrollment Open: FY ${fy.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 40px; border-top: 8px solid #22c55e;">
                    <h1 style="color: #22c55e; margin-bottom: 20px; font-weight: 900; text-transform: uppercase;">New Enrollment Cycle</h1>
                    <p style="font-size: 1.1rem;">Greetings,</p>
                    <p>The institutional administration has opened a new Mediclaim insurance enrollment cycle for <strong>Financial Year ${fy.name}</strong>.</p>
                    
                    <div style="background: #f0fdf4; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #bbf7d0; text-align: center;">
                        <h2 style="margin: 0; color: #166534; font-size: 1.4rem;">FY ${fy.name} Is Now Live</h2>
                        <p style="margin: 10px 0 0; color: #15803d; font-weight: 700;">Deadline: ${fy.lastSubmissionDate ? new Date(fy.lastSubmissionDate).toLocaleDateString() : 'NO LIMIT'}</p>
                    </div>

                    <p>Please log in to the portal to manage your policy selection and add your eligible dependents. Failure to submit before the deadline may result in a disruption of coverage.</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${process.env.CLIENT_ORIGIN || '#'}" style="background: #22c55e; color: white; padding: 15px 35px; text-decoration: none; border-radius: 5px; font-weight: 900; text-transform: uppercase; display: inline-block;">Log In To Dashboard</a>
                    </div>

                    <p style="font-size: 0.85rem; color: #64748b; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 20px;">This is an automated institutional notification. No reply is required.</p>
                </div>
            `
        });

        res.json({ message: `Announcement dispatched to ${emails.length} members.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to broadcast announcement' });
    }
});

router.post('/dispatch-reminder', adminAuth, async (req, res) => {
    const { userId, fyId } = req.body;
    if (!userId || !fyId) return res.status(400).json({ msg: 'userId and fyId are required' });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        const fy = await FinancialYear.findById(fyId);
        if (!fy) return res.status(404).json({ msg: 'Financial cycle not found' });

        await sendMail({
            to: [user.email],
            subject: `[REMINDER] Mediclaim Enrollment Pending: FY ${fy.name}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 40px; border-top: 8px solid #f59e0b;">
                    <h1 style="color: #f59e0b; margin-bottom: 20px; font-weight: 900; text-transform: uppercase;">Enrollment Reminder</h1>
                    <p style="font-size: 1.1rem;">Dear <strong>${user.name}</strong>,</p>
                    <p>This is a reminder that you have not yet completed your Mediclaim insurance enrollment for <strong>Financial Year ${fy.name}</strong>.</p>
                    
                    <div style="background: #fffbeb; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #fef3c7; text-align: center;">
                        <p style="margin: 0; color: #92400e; font-weight: 700;">Deadline: ${fy.lastSubmissionDate ? new Date(fy.lastSubmissionDate).toLocaleDateString() : 'NO LIMIT'}</p>
                    </div>

                    <p>Please log in to the portal at your earliest convenience to select your coverage plan and add your dependents. Failure to enroll before the deadline will result in a loss of coverage for this cycle.</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${process.env.CLIENT_ORIGIN || '#'}" style="background: #f59e0b; color: white; padding: 15px 35px; text-decoration: none; border-radius: 5px; font-weight: 900; text-transform: uppercase; display: inline-block;">Complete Enrollment Now</a>
                    </div>

                    <p style="font-size: 0.85rem; color: #64748b; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 20px;">Note: This is an automated reminder. If you have already submitted your form, please ignore this message.</p>
                </div>
            `
        });

        res.json({ message: 'Reminder sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to send reminder email' });
    }
});



// Seed default "Early Bird" template if none exist
const seedDefaultTemplate = async () => {
    try {
        const count = await EmailTemplate.countDocuments();
        if (count === 0) {
            await EmailTemplate.create({
                name: 'Early Enrollment Push',
                subject: 'ACTION REQUIRED: FY {{fyName}} Mediclaim Registration Open',
                html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Mediclaim Portal Open</h2>
                        <p>Dear {{userName}},</p>
                        <p>This is a gentle reminder that the medical premium coverage portal for <b>FY {{fyName}}</b> is now active.</p>
                        <p>Ensure you log in to select your coverage (Current: {{coverageId}}) before the rush. Adding dependents early gives HR enough time to verify their documents smoothly without delaying your final ID card processing.</p>
                        <p>Regards,<br>Institutional Administration</p>
                      </div>`
            });
            console.log('Default Early Enrollment template injected.');
        }
    } catch (e) {
        console.error('Failed to seed default email template:', e);
    }
};

setTimeout(seedDefaultTemplate, 5000); // Wait for DB connection

// Manage Custom Templates
router.get('/templates', adminAuth, async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to fetch templates' });
  }
});

router.post('/templates', adminAuth, async (req, res) => {
  const { name, subject, html } = req.body;
  try {
    const newTemplate = new EmailTemplate({ name, subject, html });
    await newTemplate.save();
    res.status(201).json(newTemplate);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ msg: 'Template name already exists' });
    res.status(500).json({ msg: 'Failed to save template' });
  }
});

router.delete('/templates/:id', adminAuth, async (req, res) => {
  try {
    await EmailTemplate.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to delete template' });
  }
});

// Dispatch Custom Template
router.post('/dispatch-custom', adminAuth, async (req, res) => {
  const { fyId, templateId, userIds, subject: subjectOverride, html: htmlOverride } = req.body;
  if (!templateId && !htmlOverride) return res.status(400).json({ msg: 'templateId or html required' });

  try {
    let template = null;
    if (templateId && templateId !== 'blank') {
      template = await EmailTemplate.findById(templateId);
      if (!template && !htmlOverride) return res.status(404).json({ msg: 'Template not found' });
    }

    let recipients = [];
    if (userIds && Array.isArray(userIds)) {
        recipients = await User.find({ _id: { $in: userIds } });
    } else if (fyId) {
        // Legacy/Batch by FY
        const submissions = await Claim.find({ fyId, archived: { $ne: true } });
        const submissionEmails = submissions.map(s => s.email);
        recipients = await User.find({ email: { $in: submissionEmails } });
    }

    if (!recipients.length) return res.json({ message: 'No recipients found' });

    let fy = null;
    if (fyId) fy = await FinancialYear.findById(fyId);

    let sentCount = 0;
    let failedCount = 0;
    for (const user of recipients) {
      try {
        // Try to find a claim for variables, else use User defaults
        const claim = fyId ? await Claim.findOne({ email: user.email, fyId, archived: { $ne: true } }) : null;
        
        const sourceHtml = htmlOverride || template?.html || '';
        const sourceSubject = subjectOverride || template?.subject || '';

        let finalHtml = sourceHtml
          .replace(/{{userName}}/g, user.name || 'Staff Member')
          .replace(/{{fyName}}/g, fy?.name || 'Current')
          .replace(/{{email}}/g, user.email)
          .replace(/{{coverageId}}/g, claim?.coverageId || 'N/A');
          
        let finalSubject = sourceSubject
          .replace(/{{userName}}/g, user.name || 'Staff Member')
          .replace(/{{fyName}}/g, fy?.name || 'Current');

        await sendMail({
          to: [user.email],
          subject: finalSubject,
          html: finalHtml
        });
        sentCount++;
      } catch (e) {
        console.error(`Failed to send email to ${user.email}:`, e);
        failedCount++;
      }
    }

    res.json({ message: `Dispatch Complete: ${sentCount} sent, ${failedCount} failed.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to send custom emails' });
  }
});

// CRON JOB logic - Deadline checker & 48 Hour Warnings
const checkDeadlinesAndSendMail = async () => {
    try {
        const today = new Date();
        const activeFYs = await FinancialYear.find({ enabled: true });
        
        for (const fy of activeFYs) {
            if (fy.lastSubmissionDate) {
                const deadline = new Date(fy.lastSubmissionDate);
                const hrs48 = 48 * 60 * 60 * 1000;
                
                // --- 48 HOUR WARNING LOGIC ---
                if (!fy.warning48hEmailSent && (deadline - today <= hrs48) && (deadline - today > 0)) {
                    const allFaculty = await User.find({ role: { $in: ['faculty', 'hod'] }, status: 'active' });
                    const submissions = await Claim.find({ fyId: fy._id, archived: { $ne: true } });
                    const enrolledEmails = submissions.map(s => s.email);
                    
                    for (const faculty of allFaculty) {
                        if (!faculty.email) continue;
                        const hasEnrolled = enrolledEmails.includes(faculty.email);
                        try {
                            if (hasEnrolled) {
                                await sendMail({
                                    to: faculty.email,
                                    subject: `[FINAL CHECK] 48 Hours Left: FY ${fy.name}`,
                                    html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                                           <h2 style="color: #f59e0b;">Final Review Window</h2>
                                           <p>Dear ${faculty.name},</p>
                                           <p>Only 48 hours remain for the FY ${fy.name} cycle. Since you have successfully enrolled, we kindly request you log in one last time to double-check your provided dependent data.</p>
                                           <p>Ensure names and DOBs exactly match official documents to prevent claim rejection.</p>
                                           </div>`
                                });
                            } else {
                                await sendMail({
                                    to: faculty.email,
                                    subject: `[URGENT] 48 Hours Left to Enroll: FY ${fy.name}`,
                                    html: `<div style="font-family: Arial, sans-serif; padding: 20px; border-left: 4px solid #ef4444;">
                                           <h2 style="color: #ef4444;">Missing Enrollment</h2>
                                           <p>Dear ${faculty.name},</p>
                                           <p>Only 48 hours remain for the FY ${fy.name} cycle and our records show you have <b>NOT YET ENROLLED</b>.</p>
                                           <p>Failure to enroll before the deadline will result in complete loss of institutional medical coverage for this year.</p>
                                           </div>`
                                });
                            }
                        } catch(e) { console.error('48H Warn Mail Error', e); }
                    }
                    fy.warning48hEmailSent = true;
                    await fy.save();
                    console.log(`Automated 48H warning emails sent for FY ${fy.name}`);
                }

                // --- DEADLINE REACHED LOGIC ---
                if (today > deadline && !fy.deadlineEmailSent) {
                    const submissions = await Claim.find({ fyId: fy._id, archived: { $ne: true } });
                    for(const claim of submissions) {
                        try {
                            await sendMail({
                                to: claim.email,
                                subject: `[DEADLINE REACHED] Mediclaim FY ${fy.name} Closed`,
                                html: `
                                    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; border: 1px solid #e0e0e0; border-top: 5px solid #ef4444; max-width: 600px;">
                                        <h2 style="color: #ef4444;">Enrollment Deadline Reached</h2>
                                        <p>Dear ${claim.userName},</p>
                                        <p>The enrollment deadline for FY ${fy.name} has officially passed. Your currently submitted coverage plan (<b>${claim.coverageId}</b>) is now locked and will be processed.</p>
                                        <p>Please contact HR if you require emergency modifications.</p>
                                    </div>
                                `
                            });
                        } catch(e) { console.error('Automated deadline mail error', e); }
                    }
                    fy.deadlineEmailSent = true;
                    await fy.save();
                    console.log(`Automated deadline emails sent for FY ${fy.name}`);
                }
            }
        }
    } catch (err) {
        console.error('Error in checkDeadlinesAndSendMail:', err);
    }
};

// Start checking every 12 hours
setInterval(checkDeadlinesAndSendMail, 12 * 60 * 60 * 1000);
setTimeout(checkDeadlinesAndSendMail, 10000); // Check soon after boot

module.exports = { router, sendMail };
