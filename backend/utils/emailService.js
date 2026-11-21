/**
 * emailService.js — EduSlot Smart Class
 * ─────────────────────────────────────────────────────────────────────────────
 * Works on BOTH Render (always-on) AND Vercel (serverless).
 *
 * Key design for serverless compatibility:
 *  • No singleton transporter — each call builds a fresh one (Vercel functions
 *    are stateless; persistent module-level state is unreliable).
 *  • No connection pooling — pools don't survive between serverless invocations.
 *  • No startup verify — Vercel has no "startup" hook; verification runs inline.
 *  • Graceful fallback — if SMTP vars are missing, emails are console-logged
 *    so the app never crashes in dev or when env vars aren't set yet.
 *
 * Required env vars (set in Vercel Dashboard → Project → Settings → Environment):
 *   SMTP_HOST  = smtp.gmail.com
 *   SMTP_PORT  = 465
 *   SMTP_USER  = your-gmail@gmail.com
 *   SMTP_PASS  = your16charapppassword   ← NO spaces
 *   SMTP_FROM  = EduSlot Admin <your-gmail@gmail.com>
 *
 * Gmail App Password:
 *   Google shows "xxxx xxxx xxxx xxxx" — paste WITHOUT spaces.
 *   Generate at: https://myaccount.google.com/apppasswords
 * ─────────────────────────────────────────────────────────────────────────────
 */

const nodemailer = require("nodemailer");

// ─── Build a fresh transporter on every call ─────────────────────────────────
// Vercel serverless functions are stateless — singletons can't be relied on.
// A new transporter per call is cheap for nodemailer and always works.
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  // Strip any accidental spaces from the App Password (safety net)
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) return null;

  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const secure = port === 465; // 465 → SSL true, 587 → STARTTLS false

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: true, // Gmail uses a trusted CA — keep true
      minVersion: "TLSv1.2",
    },
    // No pool:true — pooling is pointless in serverless (function dies after response)
    connectionTimeout: 10000, // 10 s
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });
};

// ─── FROM address ─────────────────────────────────────────────────────────────
const getFromAddress = () =>
  process.env.SMTP_FROM ||
  `EduSlot Admin <${process.env.SMTP_USER || "no-reply@eduslot.com"}>`;

// ─── Internal send helper ─────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, label }) => {
  const transporter = createTransporter();

  if (!transporter) {
    // Simulation mode — SMTP vars not configured yet
    console.log(`[EMAIL SIMULATION] [${label}] Would send to: ${to}`);
    console.log(`  Subject: ${subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] [${label}] → ${to} | id: ${info.messageId}`);
  } catch (err) {
    console.error(`[EMAIL ERROR] [${label}] Failed for ${to}:`, err.message);
    // Do NOT rethrow — email failures must never crash the API response
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Account credentials (sent when admin creates a student/teacher account)
// ─────────────────────────────────────────────────────────────────────────────
const sendAccountCredentials = async ({
  email,
  tempPassword,
  name,
  role,
  universityName,
}) => {
  let roleDisplay = "Account";
  let senderDisplay = "System Administrator";

  if (role === "student") {
    roleDisplay = "Student";
    senderDisplay = "University Administrator";
  } else if (role === "teacher") {
    roleDisplay = "Teacher";
    senderDisplay = "University Administrator";
  } else if (role === "university_head") {
    roleDisplay = "University Administrator";
    senderDisplay = "Super Admin";
  }

  const uniName = universityName || "EduSlot Smart Class";

  await sendMail({
    to: email,
    subject: `Welcome to ${uniName} — ${roleDisplay} Credentials`,
    label: "CREDENTIALS",
    html: `
      <div style="font-family:Arial,sans-serif;padding:28px;color:#333;max-width:600px;
                  border:1px solid #e0e0e0;border-radius:12px;margin:auto;">
        <h2 style="color:#3b82f6;margin-top:0;">Welcome to ${uniName}</h2>
        <p>Hello <strong>${name || roleDisplay}</strong>,</p>
        <p>Your ${roleDisplay.toLowerCase()} account has been created by your <strong>${senderDisplay}</strong>.</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:6px 0;"><strong>Portal Email:</strong> ${email}</p>
          <p style="margin:6px 0;"><strong>Initial Password:</strong>
            <span style="font-family:monospace;color:#d97706;font-size:16px;letter-spacing:2px;">
              ${tempPassword}
            </span>
          </p>
        </div>
        <p>Please log in and change your password at your earliest convenience.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <small style="color:#888;">This is an automated message from EduSlot Smart Class System.</small>
      </div>
    `,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Password reset token
// ─────────────────────────────────────────────────────────────────────────────
const sendPasswordResetEmail = async ({ email, resetToken }) => {
  await sendMail({
    to: email,
    subject: "EduSlot Smart Class — Password Reset Token",
    label: "RESET-TOKEN",
    html: `
      <div style="font-family:Arial,sans-serif;padding:28px;color:#333;max-width:600px;
                  border:1px solid #e0e0e0;border-radius:12px;margin:auto;">
        <h2 style="color:#3b82f6;margin-top:0;">Password Reset Request</h2>
        <p>We received a request to reset the password for your EduSlot account.</p>
        <p>Use the 6-digit token below on the Reset Password page:</p>
        <div style="background:#eff6ff;border:1px dashed #3b82f6;padding:20px;
                    border-radius:10px;text-align:center;margin:24px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;
                       color:#1d4ed8;font-family:monospace;">
            ${resetToken}
          </span>
        </div>
        <p>⏱ This token expires in <strong>1 hour</strong>.</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <small style="color:#888;">This is an automated message from EduSlot Smart Class System.</small>
      </div>
    `,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Class assignment / schedule notification
// ─────────────────────────────────────────────────────────────────────────────
const sendClassAssignmentEmail = async ({
  email,
  name,
  role,
  universityName,
  departmentName,
  classTitle,
  subjectName,
  teacherName,
  classDate,
  startTime,
  endTime,
}) => {
  const isTeacher = role === "teacher";

  await sendMail({
    to: email,
    subject: isTeacher
      ? `New Class Assigned — ${classTitle}`
      : `New Class Scheduled — ${classTitle}`,
    label: isTeacher ? "CLASS-TEACHER" : "CLASS-STUDENT",
    html: `
      <div style="font-family:Arial,sans-serif;padding:28px;color:#333;max-width:600px;
                  border:1px solid #e0e0e0;border-radius:12px;margin:auto;">
        <h2 style="color:#3b82f6;margin-top:0;">
          ${isTeacher ? "New Class Assigned" : "New Class Scheduled"}
        </h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>${
          isTeacher
            ? "You have been assigned a new class."
            : "A new class has been scheduled for your department."
        }</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:6px 0;"><strong>Class Title:</strong> ${classTitle}</p>
          <p style="margin:6px 0;"><strong>Subject:</strong> ${subjectName}</p>
          ${!isTeacher ? `<p style="margin:6px 0;"><strong>Teacher:</strong> ${teacherName}</p>` : ""}
          <p style="margin:6px 0;"><strong>Department:</strong> ${departmentName}</p>
          <p style="margin:6px 0;"><strong>Date:</strong> ${classDate}</p>
          <p style="margin:6px 0;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
          <p style="margin:6px 0;"><strong>University:</strong> ${universityName}</p>
        </div>
        <p>Please check your EduSlot ${isTeacher ? "Teacher" : "Student"} Portal for full details.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <small style="color:#888;">This is an automated message from EduSlot Smart Class System.</small>
      </div>
    `,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  sendAccountCredentials,
  sendPasswordResetEmail,
  sendClassAssignmentEmail,
};
