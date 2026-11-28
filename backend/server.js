const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");

require("dotenv").config();

const User = require("./models/User");
const University = require("./models/University");

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://eduslot-eosin.vercel.app/",
    /\.vercel\.app$/
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/university", require("./routes/university"));
app.use("/api/teachers",   require("./routes/teacherManagement"));
app.use("/api/students",   require("./routes/studentManagement"));
app.use("/api/classes",    require("./routes/classRoutes"));
app.use("/api/seat",       require("./routes/seat"));

app.get("/", (req, res) => {
  res.send("EduSlot Smart Class API Running ✅");
});

// ─── Seed default data ────────────────────────────────────────────────────────
const seedInitialData = async () => {
  try {
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

// ─── MongoDB connection ───────────────────────────────────────────────────────
// Vercel serverless: mongoose caches the connection across warm invocations.
// A new connection is only opened when the function is cold-started.
// console.log(process.env.MONGODB_URI);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eduslot";

let isConnected = false;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });

    isConnected = true;
    console.log("MongoDB Connected Successfully");

    await seedInitialData();

  } catch (err) {
    isConnected = false;
    console.error("MongoDB connection failed:", err);
    throw err;
  }
};

// Connect before handling any request (works for both Render & Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    res.status(500).json({ message: "Database connection error" });
  }
});

// ─── Start server (only when running directly, not on Vercel) ─────────────────
// Vercel imports this file as a module — it must NOT call app.listen().
// Render / local dev runs `node server.js` directly, so listen is needed there.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  const startServer = async () => {
    try {
      console.log("Starting MongoDB connection...");

      await connectDB();

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });

    } catch (error) {
      console.error("Startup failed:", error.message);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = app;

// ─── Export for Vercel serverless ─────────────────────────────────────────────
