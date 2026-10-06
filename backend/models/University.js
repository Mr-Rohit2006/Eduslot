const mongoose = require("mongoose");

const UniversitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  location: {
    type: String,
    default: "Main Campus"
  },
  adminHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  departments: {
    type: [String],
    default: ["Computer Science", "Electrical Engineering", "Business Administration", "Mechanical Engineering"]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("University", UniversitySchema);
