import nodemailer from 'nodemailer';

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

const from = () => {
  const user = process.env.SMTP_USER;
  return user ? `OSCALink <${user}>` : 'OSCALink <noreply@oscalink.org>';
};

async function sendEmail(
  to: string,
  subject: string,
  html: string,
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP_USER/SMTP_PASS not set — skipping email');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from: from(),
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Failed:', err);
    return { success: false, error: err };
  }
}

export async function sendAssistanceUpdateEmail(
  email: string,
  name: string,
  title: string,
  status: string
) {
  return sendEmail(
    email,
    `OSCALink: Assistance Request Update - ${status}`,
    `
      <div style="font-family: sans-serif; color: #334155;">
        <h2>Hello, ${name}</h2>
        <p>This is an automated update regarding your assistance request: <strong>${title}</strong>.</p>
        <div style="padding: 20px; background-color: #f1f5f9; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Current Status</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">${status}</p>
        </div>
        <p>Your aid package is now being processed according to this status. Please coordinate with your local barangay official for next steps.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">You are receiving this because you are registered in the Cotabato City Office for Senior Citizen Affairs (OSCA) digital portal.</p>
      </div>
    `,
  );
}

export async function sendComplaintUpdateEmail(
  email: string,
  name: string,
  complaintId: string,
  status: string,
  resolutionNotes?: string
) {
  const notesHtml = resolutionNotes ? `
    <div style="padding: 20px; background-color: #ecfdf5; border-left: 4px solid #10b981; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #065f46;">Resolution Notes</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #064e3b;">${resolutionNotes}</p>
    </div>
  ` : '';

  return sendEmail(
    email,
    `OSCALink: Complaint Status Update - ${complaintId}`,
    `
      <div style="font-family: sans-serif; color: #334155;">
        <h2>Hello, ${name}</h2>
        <p>This is an automated update regarding your complaint filed with OSCA Cotabato City.</p>
        <div style="padding: 20px; background-color: #f1f5f9; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Complaint Reference</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #1e3a8a;">${complaintId}</p>
        </div>
        <div style="padding: 20px; background-color: #f1f5f9; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Current Status</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">${status}</p>
        </div>
        ${notesHtml}
        <p>For any concerns, please contact the OSCA Office directly.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">You are receiving this because you filed a complaint in the Cotabato City Office for Senior Citizen Affairs (OSCA) digital portal.</p>
      </div>
    `,
  );
}

export async function sendQuarterlyReminderEmail(
  email: string,
  name: string,
  quarter: string,
  year: string
) {
  const quarterMonths: Record<string, string> = {
    'Q1': 'January - March',
    'Q2': 'April - June',
    'Q3': 'July - September',
    'Q4': 'October - December',
  };

  return sendEmail(
    email,
    `OSCALink: Quarterly Report Reminder - ${quarter} ${year}`,
    `
      <div style="font-family: sans-serif; color: #334155;">
        <h2>Dear ${name},</h2>
        <p>This is a reminder that the <strong>${quarter} ${year}</strong> quarterly senior citizen report is due.</p>
        <div style="padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">Reporting Period</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #78350f;">${quarterMonths[quarter] || quarter} ${year}</p>
        </div>
        <p>Please ensure all senior citizen records are updated and verified before the deadline.</p>
        <p>Access the OSCALink dashboard to generate and verify the quarterly report.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">This is an automated reminder from the OSCALink System. Office for Senior Citizen Affairs, Cotabato City.</p>
      </div>
    `,
  );
}

interface BedriddenNotificationParams {
  to: string;
  officialName: string;
  seniorName: string;
  seniorAddress: string;
  barangay: string;
  verificationId: string;
}

export async function sendBedriddenNotification({
  to,
  officialName,
  seniorName,
  seniorAddress,
  barangay,
  verificationId
}: BedriddenNotificationParams) {
  return sendEmail(
    to,
    `OSCALink: Bedridden Senior Verification Required - ${barangay}`,
    `
      <div style="font-family: sans-serif; color: #334155;">
        <h2>Dear ${officialName},</h2>
        <p>A bedridden senior citizen in your assigned sector requires <strong>field verification</strong>.</p>

        <div style="padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">Senior Citizen Details</p>
          <p style="margin: 10px 0 0 0; font-size: 16px; font-weight: bold; color: #78350f;">${seniorName}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #78350f;">Address: ${seniorAddress}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #78350f;">Barangay: ${barangay}</p>
        </div>

        <h3 style="color: #1e3a8a;">Required Actions:</h3>
        <ol style="color: #334155;">
          <li>Visit the senior at their residence</li>
          <li>Take a "Proof of Life" photograph</li>
          <li>Obtain/Upload Barangay Certification</li>
          <li>Upload all documents through OSCALink</li>
        </ol>

        <p style="margin-top: 20px;">Reference ID: <strong>${verificationId}</strong></p>
        <p>Please complete this verification within 7 days of receiving this notification.</p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">This is an automated notification from OSCALink. Office for Senior Citizen Affairs, Cotabato City.</p>
      </div>
    `,
  );
}
