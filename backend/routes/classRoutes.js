const express = require("express");
const router = express.Router();
const ClassSession = require("../models/ClassSession");
const User = require("../models/User");
const Seat = require("../models/Seat");
const Notification = require("../models/Notification");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// GET classes (scoped by role and university)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "teacher") {
      query.teacherId = req.user.id;
    } else if (req.user.role === "university_head") {
      query.universityId = req.user.universityId;
    } else if (req.user.role === "student" && req.user.universityId) {
      query.universityId = req.user.universityId;
    }

    if (req.query.department) {
      query.department = req.query.department;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const classes = await ClassSession.find(query)
      .populate("universityId", "name code")
      .populate("teacherId", "name email department employeeId designation")
      .sort({ createdAt: -1 });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching classes", error: error.message });
  }
});

// GET class history (completed & cancelled sessions)
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const query = {
      status: { $in: ["COMPLETED", "CANCELLED"] }
    };

    if (req.user.role === "teacher") {
      query.teacherId = req.user.id;
    } else if (req.user.role === "university_head") {
      query.universityId = req.user.universityId;
    } else if (req.user.role === "student" && req.user.universityId) {
      query.universityId = req.user.universityId;
    }

    const history = await ClassSession.find(query)
      .populate("universityId", "name code")
      .populate("teacherId", "name email department")
      .sort({ completedAt: -1, updatedAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching class history", error: error.message });
  }
});

// POST Create & Schedule Class Session (University Administrator ONLY)
router.post("/", authMiddleware, authorizeRoles("university_head"), async (req, res) => {
  try {
    const {
      title,
      subjectCode,
      course,
      department,
      teacherId,
      roomNumber,
      date,
      startTime,
      endTime,
      totalSeats
    } = req.body;

    const targetUnivId = req.user.universityId;

    if (!title || !department || !teacherId || !startTime || !endTime) {
      return res.status(400).json({
        message: "Title, Department, Assigned Teacher, Start Time, and End Time are required."
      });
    }

    // Verify teacher exists and belongs to the same university
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(400).json({ message: "Invalid teacher selected." });
    }

    if (teacher.universityId?.toString() !== targetUnivId?.toString()) {
      return res.status(403).json({ message: "Selected teacher does not belong to your university." });
    }

    const scheduleTimeStr = `${startTime} - ${endTime}${date ? ` (${date})` : ""}`;

    const classSession = new ClassSession({
      title,
      subjectCode: subjectCode || "CS101",
      course: course || "B.Tech",
      universityId: targetUnivId,
      department: department,
      teacherId: teacher._id,
      teacherEmail: teacher.email,
      teacherName: teacher.name || teacher.email,
      roomNumber: roomNumber || "Lab 101",
      date: date || new Date().toISOString().split("T")[0],
      startTime: startTime,
      endTime: endTime,
      scheduleTime: scheduleTimeStr,
      status: "SCHEDULED",
      totalSeats: totalSeats || 25,
      createdBy: req.user.id
    });

    await classSession.save();

    // Initialize seat grid records
    const seatsToCreate = [];
    for (let i = 1; i <= classSession.totalSeats; i++) {
      seatsToCreate.push({
        classId: classSession._id,
        universityId: targetUnivId,
        seatNumber: i,
        isBooked: false,
        bookedBy: null,
        bookedAt: null
      });
    }
    await Seat.insertMany(seatsToCreate);

    const populatedSession = await ClassSession.findById(classSession._id)
      .populate("teacherId", "name email department employeeId");

    res.status(201).json({
      message: "Class scheduled successfully by University Administrator!",
      classSession: populatedSession
    });
  } catch (error) {
    res.status(500).json({ message: "Error scheduling class", error: error.message });
  }
});

// PATCH Teacher status update (SCHEDULED -> ONGOING)
router.patch("/:id/status", authMiddleware, authorizeRoles("teacher", "university_head"), async (req, res) => {
  try {
    const { status } = req.body;
    const classSession = await ClassSession.findById(req.params.id);

    if (!classSession) {
      return res.status(404).json({ message: "Class session not found" });
    }

    // Teacher can ONLY update their own assigned class
    if (req.user.role === "teacher" && classSession.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden. You can only update your own assigned classes." });
    }

    classSession.status = status;
    if (status === "COMPLETED") {
      classSession.completedAt = new Date();
    }
    await classSession.save();

    res.json({ message: `Class status updated to ${status}`, classSession });
  } catch (error) {
    res.status(500).json({ message: "Error updating class status", error: error.message });
  }
});

// POST Cancel assigned class (Teacher ONLY for assigned class, or Univ Admin)
router.post("/:id/cancel", authMiddleware, authorizeRoles("teacher", "university_head"), async (req, res) => {
  try {
    const { reason } = req.body;
    const classSession = await ClassSession.findById(req.params.id);

    if (!classSession) {
      return res.status(404).json({ message: "Class session not found" });
    }

    // Strict validation: Teacher can ONLY cancel their own assigned class!
    if (req.user.role === "teacher" && classSession.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden. You can only cancel classes assigned to you." });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "Cancellation reason is required" });
    }

    classSession.status = "CANCELLED";
    classSession.cancellationReason = reason.trim();
    classSession.completedAt = new Date();
    await classSession.save();

    // Clear live seat bookings for this session while preserving class history
    await Seat.updateMany(
      { classId: classSession._id },
      { isBooked: false, bookedBy: null, bookedAt: null }
    );

    // Notify students
    await Notification.create({
      message: `CLASS CANCELLED: "${classSession.title}" has been cancelled. Reason: ${reason.trim()}`,
      universityId: classSession.universityId,
      classId: classSession._id,
      recipientRole: "student"
    });

    res.json({ message: "Class cancelled successfully", classSession });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling class", error: error.message });
  }
});

// POST Complete class & reset temporary live session data
router.post("/:id/complete", authMiddleware, authorizeRoles("teacher", "university_head"), async (req, res) => {
  try {
    const classSession = await ClassSession.findById(req.params.id);

    if (!classSession) {
      return res.status(404).json({ message: "Class session not found" });
    }

    if (req.user.role === "teacher" && classSession.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden. You can only complete your own assigned classes." });
    }

    classSession.status = "COMPLETED";
    classSession.completedAt = new Date();
    await classSession.save();

    // Clear live seat bookings
    await Seat.updateMany(
      { classId: classSession._id },
      { isBooked: false, bookedBy: null, bookedAt: null }
    );

    res.json({ message: "Class completed and active live seat state reset successfully.", classSession });
  } catch (error) {
    res.status(500).json({ message: "Error completing class session", error: error.message });
  }
});

module.exports = router;
