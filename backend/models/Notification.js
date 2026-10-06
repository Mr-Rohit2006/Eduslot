const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
    default: null
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClassSession",
    default: null
  },
  recipientRole: {
    type: String,
    default: "all"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Notification", NotificationSchema);