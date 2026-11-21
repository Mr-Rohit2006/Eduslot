import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UniversityHeadDashboard from "./pages/UniversityHeadDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import SeatBooking from "./pages/SeatBooking";

// Strict role-based protected route wrapper
// If user is not logged in -> redirect to /login
// If user's role doesn't match allowedRoles -> redirect to their own dashboard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to user's correct home rather than 403 page
    if (userRole === "admin") return <Navigate to="/admin" replace />;
    if (userRole === "university_head") return <Navigate to="/university-head" replace />;
    if (userRole === "teacher") return <Navigate to="/teacher" replace />;
    if (userRole === "student") return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* ADMIN Portal — admin ONLY */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* UNIVERSITY ADMINISTRATOR Portal — university_head ONLY */}
        <Route
          path="/university-head"
          element={
            <ProtectedRoute allowedRoles={["university_head"]}>
              <UniversityHeadDashboard />
            </ProtectedRoute>
          }
        />

        {/* TEACHER Portal — teacher ONLY */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* STUDENT Portal — student ONLY */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* SEAT BOOKING — student ONLY */}
        <Route
          path="/booking"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <SeatBooking />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
