const express = require("express");
const router = express.Router();
const User = require("../models/User");
const University = require("../models/University");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const { sendAccountCredentials } = require("../utils/emailService");

// GET students (scoped to University Administrator's university)
router.get("/", authMiddleware, authorizeRoles("university_head", "admin"), async (req, res) => {
  try {
    let universityId = req.query.universityId;

    if (req.user.role === "university_head") {
      universityId = req.user.universityId;
    }

    const query = { role: "student" };
    if (universityId) {
      query.universityId = universityId;
    }

    if (req.query.department) {
      query.department = req.query.department;
    }

    const students = await User.find(query)
      .select("-password")
      .populate("universityId", "name code")
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Error fetching students", error: error.message });
  }
});

// POST add new student (University Administrator ONLY)
router.post("/", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const { name, email, rollNumber, department, course, semester } = req.body;
    const targetUnivId = req.user.universityId;

    if (!email || !department) {
      return res.status(400).json({ message: "Student Email and Department are required" });
    }

    if (!targetUnivId) {
      return res.status(400).json({ message: "Your account is not bound to a university." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "A student account with this email already exists" });
    }

    // Auto-generate 8-character temporary password
    const tempPassword = "Std" + crypto.randomBytes(3).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const university = await University.findById(targetUnivId);

    const student = new User({
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "student",
      universityId: targetUnivId,
      department: department,
      rollNumber: rollNumber || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      course: course || "B.Tech",
      semester: semester || "Semester 1",
      status: "active"
    });

    await student.save();

    // Send credentials via email to the student
    await sendAccountCredentials({
      email: student.email,
      tempPassword: tempPassword,
      name: student.name,
      role: "student",
      universityName: university?.name || "EduSlot Smart Class"
    });

    const populatedStudent = await User.findById(student._id).select("-password").populate("universityId");

    res.status(201).json({
      message: "Student account created successfully and credentials sent to email!",
      student: populatedStudent,
      tempPassword: tempPassword // Returned for UI verification
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding student", error: error.message });
  }
});

// PUT edit student (University Administrator)
router.put("/:id", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const { name, email, department, rollNumber, course, semester, status } = req.body;
    const student = await User.findById(req.params.id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student record not found" });
    }

    if (student.universityId?.toString() !== req.user.universityId?.toString()) {
      return res.status(403).json({ message: "Forbidden. You can only manage students in your university." });
    }

    if (name) student.name = name;
    if (email) student.email = email.toLowerCase();
    if (department) student.department = department;
    if (rollNumber) student.rollNumber = rollNumber;
    if (course) student.course = course;
    if (semester) student.semester = semester;
    if (status) student.status = status;

    await student.save();
    const updatedStudent = await User.findById(student._id).select("-password").populate("universityId");

    res.json({ message: "Student details updated successfully", student: updatedStudent });
  } catch (error) {
    res.status(500).json({ message: "Error updating student", error: error.message });
  }
});

// PATCH deactivate / activate student
router.patch("/:id/status", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const { status } = req.body;
    const student = await User.findById(req.params.id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student record not found" });
    }

    if (student.universityId?.toString() !== req.user.universityId?.toString()) {
      return res.status(403).json({ message: "Forbidden. You can only manage students in your university." });
    }

    student.status = status || (student.status === "active" ? "inactive" : "active");
    await student.save();

    res.json({ message: `Student account status updated to ${student.status}`, student });
  } catch (error) {
    res.status(500).json({ message: "Error updating student status", error: error.message });
  }
});

// DELETE student
router.delete("/:id", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student record not found" });
    }

    if (student.universityId?.toString() !== req.user.universityId?.toString()) {
      return res.status(403).json({ message: "Forbidden. You can only delete students in your university." });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Student record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting student", error: error.message });
  }
});

module.exports = router;
