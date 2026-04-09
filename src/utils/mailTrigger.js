import api from '../api';

/**
 * Triggers an institutional email confirmation via Node.js Backend.
 * @param {string} to - Recipient email.
 * @param {Object} templateData - Information for the email template.
 */
export const triggerSubmissionEmail = async (to, templateData) => {
    try {
        await api.post('/mail', {
            to: [to],
            subject: `Mediclaim Enrollment Confirmation - FY ${templateData.fyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #4f46e5;">Enrollment Finalized</h2>
                    <p>Dear ${templateData.userName},</p>
                    <p>Your mediclaim enrollment for the financial cycle <b>${templateData.fyName}</b> has been successfully recorded.</p>
                    <ul>
                        <li><b>Coverage Tier:</b> ${templateData.coverage}</li>
                        <li><b>Total Premium:</b> INR ${templateData.premium?.toLocaleString()}</li>
                        <li><b>Dependents Insured:</b> ${templateData.dependentsCount}</li>
                    </ul>
                    <p>You can login to the portal anytime to download your formal receipt.</p>
                    <hr />
                    <p style="font-size: 0.8rem; color: #777;">This is an automated institutional notification.</p>
                </div>
            `
        });
    } catch (err) {
        console.error("Failed to trigger email:", err);
    }
};