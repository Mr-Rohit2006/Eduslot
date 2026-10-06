const express = require("express");
const router = express.Router();
const Seat = require("../models/Seat");
const Notification = require("../models/Notification");
const ClassSession = require("../models/ClassSession");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// Get seats for class session
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.query;
    let query = {};

    if (classId) {
      query.classId = classId;
    }

    let seats = await Seat.find(query).sort({ seatNumber: 1 });

    // If no seats exist yet for specified class or overall, seed default 25 seats
    if (seats.length === 0) {
      const defaultSeats = [];
      for (let i = 1; i <= 25; i++) {
        defaultSeats.push({
          classId: classId || null,
          seatNumber: i,
          isBooked: false,
          bookedBy: null,
          bookedAt: null
        });
      }
      seats = await Seat.insertMany(defaultSeats);
    }

    res.json(seats);
  } catch (err) {
    console.error("Fetch seats error:", err);
    res.status(500).json({ message: "Error fetching seats", error: err.message });
  }
});

// Book seat
router.post("/book", authMiddleware, async (req, res) => {
  try {
    const { seatNumber, classId } = req.body;
    const userEmail = req.user.email;

    if (!seatNumber) {
      return res.status(400).json({ message: "Seat number is required" });
    }

    const queryClassId = classId || null;

    // Check if user already booked a seat in this class
    const alreadyBooked = await Seat.findOne({
      classId: queryClassId,
      bookedBy: userEmail,
      isBooked: true
    });

    if (alreadyBooked) {
      return res.status(400).json({ message: "You have already booked a seat in this session" });
    }

    // Check selected seat status
    const seat = await Seat.findOne({
      classId: queryClassId,
      seatNumber: Number(seatNumber)
    });

    if (seat && seat.isBooked) {
      return res.status(400).json({ message: "Seat is already booked by another student" });
    }

    // Book the seat
    const bookedSeat = await Seat.findOneAndUpdate(
      { classId: queryClassId, seatNumber: Number(seatNumber) },
      {
        classId: queryClassId,
        seatNumber: Number(seatNumber),
        isBooked: true,
        bookedBy: userEmail,
        bookedAt: new Date()
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "Seat booked successfully",
      seat: bookedSeat
    });
  } catch (err) {
    console.error("BOOKING ERROR:", err);
    res.status(500).json({ message: "Booking failed", error: err.message });
  }
});

// Reset seats for a session (Teacher / Admin)
router.delete("/reset", authMiddleware, authorizeRoles("teacher", "admin", "university_head"), async (req, res) => {
  try {
    const { classId } = req.query;
    const query = classId ? { classId } : {};

    await Seat.updateMany(
      query,
      {
        isBooked: false,
        bookedBy: null,
        bookedAt: null
      }
    );

    await Notification.create({
      message: "Teacher has reset all seats. Previous seat bookings for this session have been cleared.",
      classId: classId || null
    });

    res.json({ message: "All seats reset successfully" });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ message: "Reset failed", error: err.message });
  }
});

// Get latest notifications
router.get("/notification", authMiddleware, async (req, res) => {
  try {
    const query = {};
    if (req.user.universityId) {
      query.$or = [{ universityId: req.user.universityId }, { universityId: null }];
    }

    const notification = await Notification.findOne(query).sort({ createdAt: -1 });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch notification", error: err.message });
  }
});

module.exports = router;