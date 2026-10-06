const mongoose = require("mongoose");

const SeatSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClassSession",
    default: null
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
    default: null
  },
  seatNumber: {
    type: Number,
    required: true
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  bookedBy: {
    type: String,
    default: null
  },
  bookedAt: {
    type: Date,
    default: null
  }
});

// Compound index so seat numbers are unique within each class session
SeatSchema.index({ classId: 1, seatNumber: 1 });

module.exports = mongoose.model("Seat", SeatSchema);