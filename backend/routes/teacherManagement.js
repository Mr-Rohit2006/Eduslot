const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const { sendAccountCredentials } = require("../utils/emailService");
// GET teachers (department-wise, scoped to University Administrator's university)
router.get("/", authMiddleware, authorizeRoles("university_head", "admin"), async (req, res) => {
  try {
    let universityId = req.query.universityId;

    if (req.user.role === "university_head") {
      universityId = req.user.universityId;
    }

    const query = { role: "teacher" };
    if (universityId) {
      query.universityId = universityId;
    }

    if (req.query.department) {
      query.department = req.query.department;
    }

    const teachers = await User.find(query)
      .select("-password")
      .populate("universityId", "name code")
      .sort({ createdAt: -1 });

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching teachers", error: error.message });
  }
});

// POST add new teacher (University Administrator ONLY)
router.post("/", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const { name, email, password, department, employeeId, designation } = req.body;
    const targetUnivId = req.user.universityId;

    if (!email || !password || !department) {
      return res.status(400).json({ message: "Email, password, and department are required" });
    }

    if (!targetUnivId) {
      return res.status(400).json({ message: "Your account is not assigned to any university." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "A user with this email address already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = new User({
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "teacher",
      universityId: targetUnivId,
      department: department,
      employeeId: employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      designation: designation || "Assistant Professor",
      status: "active"
    });

    await teacher.save();
    const populatedTeacher = await User.findById(teacher._id).select("-password").populate("universityId");

    const university = await require("../models/University").findById(targetUnivId);

    // Send credentials via email to the teacher
    await sendAccountCredentials({
      email: teacher.email,
      tempPassword: password, // Send the original password passed in req.body
      name: teacher.name,
      role: "teacher",
      universityName: university?.name || "EduSlot Smart Class"
    });

    res.status(201).json({ message: "Teacher created and credentials sent to email successfully!", teacher: populatedTeacher });
  } catch (error) {
    res.status(500).json({ message: "Error adding teacher", error: error.message });
  }
});

// PUT edit teacher (University Administrator)
router.put("/:id", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const { name, email, department, employeeId, designation, status, password } = req.body;
    const teacher = await User.findById(req.params.id);

    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ message: "Teacher record not found" });
    }

    if (teacher.universityId?.toString() !== req.user.universityId?.toString()) {
      return res.status(403).json({ message: "Forbidden. You can only manage teachers in your assigned university." });
    }

    if (name) teacher.name = name;
    if (email) teacher.email = email.toLowerCase();
    if (department) teacher.department = department;
    if (employeeId) teacher.employeeId = employeeId;
    if (designation) teacher.designation = designation;
    if (status) teacher.status = status;
    if (password) {
      teacher.password = await bcrypt.hash(password, 10);
    }

    await teacher.save();
    const updatedTeacher = await User.findById(teacher._id).select("-password").populate("universityId");

    res.json({ message: "Teacher updated successfully", teacher: updatedTeacher });
  } catch (error) {
    res.status(500).json({ message: "Error updating teacher", error: error.message });
  }
});

// PATCH deactivate / activate teacher
router.patch("/:id/status", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const { status } = req.body;
    const teacher = await User.findById(req.params.id);

    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ message: "Teacher record not found" });
    }

    if (teacher.universityId?.toString() !== req.user.universityId?.toString()) {
      return res.status(403).json({ message: "Forbidden. You can only manage teachers in your assigned university." });
    }

    teacher.status = status || (teacher.status === "active" ? "inactive" : "active");
    await teacher.save();

    res.json({ message: `Teacher status set to ${teacher.status}`, teacher });
  } catch (error) {
    res.status(500).json({ message: "Error updating teacher status", error: error.message });
  }
});

// DELETE teacher
router.delete("/:id", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);

    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ message: "Teacher record not found" });
    }

    if (teacher.universityId?.toString() !== req.user.universityId?.toString()) {
      return res.status(403).json({ message: "Forbidden. You can only delete teachers in your assigned university." });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Teacher record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting teacher", error: error.message });
  }
});

module.exports = router;
