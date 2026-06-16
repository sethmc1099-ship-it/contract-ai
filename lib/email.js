const nodemailer = require('nodemailer')

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

async function sendResultsEmail(email, reviewId, documentName) {
  if (!email || !process.env.EMAIL_USER) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const resultsUrl = `${baseUrl}/results/${reviewId}`

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'ContractAI <noreply@contractai.com>',
      to: email,
      subject: `Your Contract Review is Ready — ${documentName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0f172a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #10b981; margin: 0; font-size: 24px;">ContractAI</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin-top: 0;">Your contract review is ready!</h2>
            <p style="color: #475569;">We've completed the analysis of <strong>${documentName}</strong>.</p>
            <p style="color: #475569;">Click the button below to view your full risk report, including:</p>
            <ul style="color: #475569;">
              <li>Overall risk score and assessment</li>
              <li>Key findings and hidden clauses</li>
              <li>Missing protections</li>
              <li>Negotiation recommendations</li>
              <li>Whether you should sign</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resultsUrl}" style="background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                View My Contract Review
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              This link is unique to your review. Bookmark it for future reference.
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}

module.exports = { sendResultsEmail }
