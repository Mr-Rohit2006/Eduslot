const mongoose = require("mongoose");

const ClassSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subjectCode: {
    type: String,
    default: "CS101"
  },
  course: {
    type: String,
    default: "B.Tech CS"
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
    required: true
  },
  department: {
    type: String,
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  teacherEmail: {
    type: String,
    required: true
  },
  teacherName: {
    type: String,
    default: "Faculty Instructor"
  },
  roomNumber: {
    type: String,
    default: "Lab 101"
  },
  date: {
    type: String,
    default: ""
  },
  startTime: {
    type: String,
    default: "10:00 AM"
  },
  endTime: {
    type: String,
    default: "11:30 AM"
  },
  scheduleTime: {
    type: String,
    default: "10:00 AM - 11:30 AM"
  },
  status: {
    type: String,
    enum: ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"],
    default: "SCHEDULED"
  },
  cancellationReason: {
    type: String,
    default: ""
  },
  totalSeats: {
    type: Number,
    default: 25
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ClassSession", ClassSessionSchema);
