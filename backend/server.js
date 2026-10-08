const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");

const User = require("./models/User");
const University = require("./models/University");
require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/university", require("./routes/university"));
app.use("/api/teachers", require("./routes/teacherManagement"));
app.use("/api/students", require("./routes/studentManagement"));
app.use("/api/classes", require("./routes/classRoutes"));
app.use("/api/seat", require("./routes/seat"));

app.get("/", (req, res) => {
  res.send("EduSlot Smart Class API Running");
});

// Seed default data if database is empty
const seedInitialData = async () => {
  try {
    // 1. Create default University if not present
    let defaultUniv = await University.findOne({ code: "STANFORD" });
    if (!defaultUniv) {
      defaultUniv = await University.create({
        name: "Stanford Academic University",
        code: "STANFORD",
        location: "Palo Alto, CA",
        departments: ["Computer Science", "Electrical Engineering", "Business Administration", "Mechanical Engineering"]
      });
      console.log("Seed: Created default Stanford University");
    }

    // 2. Create default Super Admin
    const adminExists = await User.findOne({ email: "admin@eduslot.com" });
    if (!adminExists) {
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "System Administrator",
        email: "admin@eduslot.com",
        password: hashedAdminPassword,
        role: "admin",
        universityId: defaultUniv._id,
        department: "Administration"
      });
      console.log("Seed: Created Super Admin (admin@eduslot.com / admin123)");
    }

    // 3. Create default University Administrator
    const headExists = await User.findOne({ email: "head@stanford.edu" });
    if (!headExists) {
      const hashedHeadPassword = await bcrypt.hash("head123", 10);
      const univHead = await User.create({
        name: "Dr. Robert Vance (Univ Administrator)",
        email: "head@stanford.edu",
        password: hashedHeadPassword,
        role: "university_head",
        universityId: defaultUniv._id,
        department: "Administration"
      });
      defaultUniv.adminHeadId = univHead._id;
      await defaultUniv.save();
      console.log("Seed: Created University Administrator (head@stanford.edu / head123)");
    }

    // 4. Create default Teacher
    const teacherExists = await User.findOne({ email: "teacher@stanford.edu" });
    if (!teacherExists) {
      const hashedTeacherPassword = await bcrypt.hash("teacher123", 10);
      await User.create({
        name: "Prof. Alan Turing",
        email: "teacher@stanford.edu",
        password: hashedTeacherPassword,
        role: "teacher",
        universityId: defaultUniv._id,
        department: "Computer Science",
        employeeId: "EMP-1001",
        designation: "Associate Professor"
      });
      console.log("Seed: Created Teacher (teacher@stanford.edu / teacher123)");
    }
  } catch (err) {
    console.error("Seeding error:", err.message);
  }
};

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduslot";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected to:", MONGODB_URI);
    seedInitialData();
  })
  .catch((err) => console.error("MongoDB Connection Error:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});