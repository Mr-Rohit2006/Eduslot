const nodemailer = require("nodemailer");

// Create nodemailer transporter with environment variables or console fallback
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  console.log(host);
  console.log(pass);
  console.log(user);

  if (host && user && pass) {
    return nodemailer.createTransport({
      host: host,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      family: 4
    });
  }

  return null;
};

// Send account credentials email upon account creation
const sendAccountCredentials = async ({ email, tempPassword, name, role, universityName }) => {
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

  const subject = `Welcome to ${universityName || "EduSlot Smart Class"} - ${roleDisplay} Credentials`;
  const text = `Hello ${name || roleDisplay},\n\nYour ${roleDisplay.toLowerCase()} account has been created by your ${senderDisplay}.\n\nLogin Details:\nEmail: ${email}\nInitial Password: ${tempPassword}\n\nPlease log in to the portal using these credentials.\n\nBest regards,\nEduSlot Smart Class Administration`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #3b82f6;">Welcome to ${universityName || "EduSlot Smart Class"}</h2>
      <p>Hello <strong>${name || roleDisplay}</strong>,</p>
      <p>Your ${roleDisplay.toLowerCase()} account has been created by your ${senderDisplay}.</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Portal Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Initial Password:</strong> <span style="font-family: monospace; color: #d97706; font-size: 16px;">${tempPassword}</span></p>
      </div>
      <p>Please log in to your portal using these credentials.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <small style="color: #888;">This is an automated notification from EduSlot Smart Class System.</small>
    </div>
  `;

  try {
    const transporter = createTransporter();
    console.log(transporter);

    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"EduSlot Admin" <no-reply@eduslot.com>',
        to: email,
        subject,
        text,
        html
      });
      console.log(`[EMAIL SENT SUCCESS] ${roleDisplay} credentials sent to ${email}`);
    } else {
      console.log(`[EMAIL SIMULATION] (SMTP env vars not set). Credentials for ${email}: Password -> ${tempPassword}`);
    }
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${email}:`, error.message);
  }
};

// Send password reset token email
const sendPasswordResetEmail = async ({ email, resetToken }) => {
  const subject = `EduSlot Smart Class - Password Reset Token`;
  const text = `Hello,\n\nYou requested a password reset. Your 6-digit password reset token is: ${resetToken}\n\nThis token will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #3b82f6;">Password Reset Request</h2>
      <p>Your 6-digit password reset token is:</p>
      <div style="background: #eff6ff; border: 1px dashed #3b82f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1d4ed8;">${resetToken}</span>
      </div>
      <p>This token will expire in 1 hour.</p>
    </div>
  `;

  try {
    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"EduSlot Security" <no-reply@eduslot.com>',
        to: email,
        subject,
        text,
        html
      });
      console.log(`[EMAIL SENT SUCCESS] Reset token sent to ${email}`);
    } else {
      console.log(`[EMAIL SIMULATION] (SMTP env vars not set). Reset token for ${email}: ${resetToken}`);
    }
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send reset email to ${email}:`, error.message);
  }
};
// Send class assignment notification
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
  endTime
}) => {

  const isTeacher = role === "teacher";

  const subject = isTeacher
    ? `New Class Assigned - ${classTitle}`
    : `New Class Scheduled - ${classTitle}`;

  const text = isTeacher
    ? `Hello ${name},

You have been assigned a new class.

Class Title: ${classTitle}
Subject: ${subjectName}
Department: ${departmentName}
Date: ${classDate}
Time: ${startTime} - ${endTime}
University: ${universityName}

Please check your EduSlot Teacher Portal for more details.

Best regards,
${universityName} Administration`
    : `Hello ${name},

A new class has been scheduled for your department.

Class Title: ${classTitle}
Subject: ${subjectName}
Teacher: ${teacherName}
Department: ${departmentName}
Date: ${classDate}
Time: ${startTime} - ${endTime}

Please check your EduSlot Student Portal for more details.

Best regards,
${universityName} Administration`;

  const html = `
    <div style="
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
      max-width: 600px;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
    ">

      <h2 style="color: #3b82f6;">
        ${isTeacher ? "New Class Assigned" : "New Class Scheduled"}
      </h2>

      <p>Hello <strong>${name}</strong>,</p>

      <p>
        ${
          isTeacher
            ? "You have been assigned a new class."
            : "A new class has been scheduled for your department."
        }
      </p>

      <div style="
        background: #f3f4f6;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
      ">

        <p><strong>Class Title:</strong> ${classTitle}</p>
        <p><strong>Subject:</strong> ${subjectName}</p>

        ${
          !isTeacher
            ? `<p><strong>Teacher:</strong> ${teacherName}</p>`
            : ""
        }

        <p><strong>Department:</strong> ${departmentName}</p>
        <p><strong>Date:</strong> ${classDate}</p>
        <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
        <p><strong>University:</strong> ${universityName}</p>

      </div>

      <p>
        Please check your EduSlot ${
          isTeacher ? "Teacher" : "Student"
        } Portal for more details.
      </p>

      <hr style="
        border: none;
        border-top: 1px solid #eee;
        margin: 20px 0;
      " />

      <small style="color: #888;">
        This is an automated notification from EduSlot Smart Class System.
      </small>

    </div>
  `;

  try {
    const transporter = createTransporter();

    if (transporter) {

      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          '"EduSlot Admin" <no-reply@eduslot.com>',

        to: email,
        subject,
        text,
        html
      });

      console.log(
        `[CLASS EMAIL SENT] ${isTeacher ? "Teacher" : "Student"} notification sent to ${email}`
      );

    } else {

      console.log(
        `[CLASS EMAIL SIMULATION] ${isTeacher ? "Teacher" : "Student"}: ${email}`
      );

    }

  } catch (error) {

    console.error(
      `[CLASS EMAIL ERROR] Failed to send email to ${email}:`,
      error.message
    );

  }
};
module.exports = {
  sendAccountCredentials,
  sendPasswordResetEmail,
  sendClassAssignmentEmail
};

