const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middleware/authMiddleware");
const { sendPasswordResetEmail } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "eduslot_secret_key";

// Public Signup - DISABLED for Teacher and Student roles
router.post("/signup", async (req, res) => {
  try {
    const { role } = req.body;

    if (role === "teacher" || role === "student") {
      return res.status(403).json({
        message: "Public registration is disabled for Teachers and Students. Your account must be created by your University Administrator."
      });
    }

    return res.status(403).json({
      message: "Public registration is disabled. Please contact your system administrator."
    });
  } catch (error) {
    res.status(500).json({ message: "Signup disabled", error: error.message });
  }
});

// Login - Works for all 4 roles (admin, university_head, teacher, student)
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const query = { email: email.toLowerCase() };
    if (role) {
      query.role = role;
    }
    console.log(query);
    const user = await User.findOne(query).populate("universityId");
    console.log(user);
    if (!user) {
      return res.status(400).json({ message: "Invalid email or role selection" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ message: "Your account is deactivated. Please contact your University Administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        universityId: user.universityId?._id || user.universityId,
        department: user.department
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        universityId: user.universityId?._id || user.universityId,
        universityName: user.universityId?.name || "N/A",
        department: user.department,
        employeeId: user.employeeId,
        rollNumber: user.rollNumber,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// Forgot Password - Generates reset token & dispatches email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Registered email address is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No account found registered with this email address" });
    }

    // Generate 6-digit numeric reset token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = tokenExpiry;
    await user.save();

    // Dispatch email
    await sendPasswordResetEmail({
      email: user.email,
      resetToken
    });

    res.json({
      message: "Password reset token generated and sent to your email address.",
      resetToken: resetToken // Included for testing convenience
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Forgot password request failed", error: error.message });
  }
});

// Reset Password - Validates token & sets new password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Email, reset token, and new password are required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password updated successfully! Please log in with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Password reset failed", error: error.message });
  }
});

// Get current profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").populate("universityId");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
  }
});

module.exports = router;