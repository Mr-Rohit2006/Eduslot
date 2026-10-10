require('dotenv').config();
const { sendPasswordResetEmail } = require('./utils/emailService');

async function testEmail() {
  console.log("Starting email test...");
  
  // Checking if env vars are loaded
  console.log("SMTP_HOST:", process.env.SMTP_HOST || "Not Set");
  console.log("SMTP_USER:", process.env.SMTP_USER ? "Set (Hidden)" : "Not Set");
  console.log("SMTP_SERVICE:", process.env.SMTP_SERVICE || "Not Set");
  
  try {
    await sendPasswordResetEmail({
      email: 'test-recipient@example.com',
      resetToken: '123456'
    });
    console.log("Email test function executed successfully.");
  } catch (error) {
    console.error("Email test failed with error:", error);
  }
}

testEmail();
