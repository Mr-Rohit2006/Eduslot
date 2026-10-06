const express = require("express");
const router = express.Router();
const University = require("../models/University");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const { sendAccountCredentials } = require("../utils/emailService");
// GET all universities (Admin, University Administrator, Teacher, Student)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "university_head") {
      query._id = req.user.universityId;
    }

    const universities = await University.find(query).populate("adminHeadId", "name email status").sort({ createdAt: -1 });
    res.json(universities);
  } catch (error) {
    res.status(500).json({ message: "Error fetching universities", error: error.message });
  }
});

// GET single university details
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const university = await University.findById(req.params.id).populate("adminHeadId", "name email status");
    if (!university) {
      return res.status(404).json({ message: "University not found" });
    }
    res.json(university);
  } catch (error) {
    res.status(500).json({ message: "Error fetching university", error: error.message });
  }
});

// POST Create University + University Administrator (Admin ONLY)
router.post("/", authMiddleware, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, code, location, departments, headName, headEmail, headPassword } = req.body;

    if (!name || !code || !headEmail || !headPassword) {
      return res.status(400).json({
        message: "University Name, Code, Administrator Email, and Password are required."
      });
    }

    const existingUniv = await University.findOne({ code: code.toUpperCase() });
    if (existingUniv) {
      return res.status(400).json({ message: "A university with this code already exists." });
    }

    const existingUser = await User.findOne({ email: headEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "An account with the Administrator email already exists." });
    }

    // 1. Create University object
    const university = new University({
      name,
      code: code.toUpperCase(),
      location: location || "Main Campus",
      departments: departments && departments.length > 0 ? departments : [
        "Computer Science",
        "Electrical Engineering",
        "Business Administration",
        "Mechanical Engineering"
      ]
    });
    await university.save();

    // 2. Create University Administrator user bound to this university
    const hashedPassword = await bcrypt.hash(headPassword, 10);
    const univHead = new User({
      name: headName || "University Administrator",
      email: headEmail.toLowerCase(),
      password: hashedPassword,
      role: "university_head",
      universityId: university._id,
      department: "Administration",
      status: "active"
    });
    await univHead.save();

    // 3. Update University with adminHeadId reference
    university.adminHeadId = univHead._id;
    await university.save();


    // Send credentials via email to the University Administrator
    await sendAccountCredentials({
      email: univHead.email,
      tempPassword: headPassword,
      name: univHead.name,
      role: "university_head",
      universityName: university.name
    });
    res.status(201).json({
      message: "University and University Administrator created successfully!",
      university,
      administrator: {
        id: univHead._id,
        name: univHead.name,
        email: univHead.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating university", error: error.message });
  }
});

// POST add department (University Administrator / Admin)
router.post("/:id/departments", authMiddleware, authorizeRoles("admin", "university_head"), async (req, res) => {
  try {
    const { departmentName } = req.body;
    if (!departmentName) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const university = await University.findById(req.params.id);
    if (!university) {
      return res.status(404).json({ message: "University not found" });
    }

    if (req.user.role === "university_head" && req.user.universityId?.toString() !== req.params.id) {
      return res.status(403).json({ message: "Forbidden. You can only manage departments in your assigned university." });
    }

    if (!university.departments.includes(departmentName)) {
      university.departments.push(departmentName);
      await university.save();
    }

    res.json({ message: "Department added successfully", university });
  } catch (error) {
    res.status(500).json({ message: "Error adding department", error: error.message });
  }
});

// DELETE University (Admin ONLY)
router.delete("/:id", authMiddleware, authorizeRoles("admin"), async (req, res) => {
  try {
    const university = await University.findById(req.params.id);
    if (!university) {
      return res.status(404).json({ message: "University not found" });
    }

    // Delete all users, classes, seats, and notifications associated with this university
    await User.deleteMany({ universityId: university._id });
    const ClassSession = require("../models/ClassSession");
    const Seat = require("../models/Seat");
    const Notification = require("../models/Notification");
    await ClassSession.deleteMany({ universityId: university._id });
    await Seat.deleteMany({ universityId: university._id });
    await Notification.deleteMany({ universityId: university._id });
    
    // Now delete the university
    await University.findByIdAndDelete(req.params.id);

    res.json({ message: "University and all associated users deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting university", error: error.message });
  }
});

module.exports = router;
