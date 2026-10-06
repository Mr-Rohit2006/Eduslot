const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "university_head", "teacher", "student"],
    default: "student"
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
    default: null
  },
  department: {
    type: String,
    default: "General"
  },
  employeeId: {
    type: String,
    default: ""
  },
  designation: {
    type: String,
    default: "Assistant Professor"
  },
  rollNumber: {
    type: String,
    default: ""
  },
  course: {
    type: String,
    default: "B.Tech"
  },
  semester: {
    type: String,
    default: "Semester 1"
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", UserSchema);