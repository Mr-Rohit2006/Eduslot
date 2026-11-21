/**
 * emailService.js — EduSlot Smart Class
 * ─────────────────────────────────────────────────────────────────────────────
 * Render-ready SMTP email service using nodemailer + Gmail App Password.
 *
 * Required environment variables (set in Render Dashboard → Environment):
 *   SMTP_HOST   = smtp.gmail.com
 *   SMTP_PORT   = 465
 *   SMTP_USER   = your-gmail@gmail.com
 *   SMTP_PASS   = your16charapppassword   ← NO SPACES (see note below)
 *   SMTP_FROM   = EduSlot Admin <your-gmail@gmail.com>
 *
 * Gmail App Password note:
 *   Google shows it as "xxxx xxxx xxxx xxxx" — remove all spaces before saving.
 *   Enable 2-Step Verification first, then generate at:
 *   https://myaccount.google.com/apppasswords
 * ─────────────────────────────────────────────────────────────────────────────
 */

const nodemailer = require("nodemailer");

// ─── Singleton transporter ────────────────────────────────────────────────────
// Built once at startup; reused for every email (efficient + Render-friendly).
let _transporter = null;

const getTransporter = () => {
  // Return cached instance if already built
  if (_transporter) return _transporter;

  const user = process.env.SMTP_USER;
  // Strip any accidental spaces from the App Password
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn(
      "[EMAIL] SMTP_USER or SMTP_PASS not set — running in simulation mode (emails will only be logged)."
    );
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  // port 465 → SSL (secure:true), port 587 → STARTTLS (secure:false)
  const secure = port === 465;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: { user, pass },
    // ── TLS options ──────────────────────────────────────────────────────────
    // Render runs in a containerised environment; these settings prevent
    // "self-signed certificate" / "socket hang up" errors on some hosts.
    tls: {
      rejectUnauthorized: true, // keep true for Gmail (trusted CA)
      minVersion: "TLSv1.2",
    },
    // ── Connection pool ───────────────────────────────────────────────────────
    pool: true,          // reuse connections instead of opening a new one per email
    maxConnections: 3,
    maxMessages: 50,
    // ── Timeouts (ms) ─────────────────────────────────────────────────────────
    connectionTimeout: 10000, // 10 s — Render cold-start can be slow
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return _transporter;
};

// ─── FROM address ─────────────────────────────────────────────────────────────
const getFromAddress = () =>
  process.env.SMTP_FROM ||
  `EduSlot Admin <${process.env.SMTP_USER || "no-reply@eduslot.com"}>`;

// ─── SMTP verify (call once at server startup) ────────────────────────────────
/**
 * Call this from server.js after connecting to MongoDB.
 * Logs success/failure without crashing the server.
 */
const verifyEmailService = async () => {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[EMAIL] Skipping SMTP verification — simulation mode active.");
    return;
  }
  try {
    await transporter.verify();
    console.log("[EMAIL] ✅ SMTP connection verified — ready to send emails.");
  } catch (err) {
    console.error(
      "[EMAIL] ❌ SMTP verification failed:",
      err.message,
      "\n       → Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your Render environment."
    );
    // Reset so next email attempt tries to reconnect
    _transporter = null;
  }
};

// ─── Internal helper ──────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, label }) => {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev / simulation fallback — just log
    console.log(`[EMAIL SIMULATION] [${label}] Would send to: ${to}`);
    console.log(`  Subject : ${subject}`);
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
    // If the connection dropped, clear the singleton so it rebuilds next time
    if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
      _transporter = null;
    }
    // Do NOT rethrow — email failures should never crash the main request
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Account credentials (sent when admin/uni-head creates an account)
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
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;
                       font-family:monospace;">
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
  verifyEmailService,       // call once from server.js at startup
  sendAccountCredentials,
  sendPasswordResetEmail,
  sendClassAssignmentEmail,
};
