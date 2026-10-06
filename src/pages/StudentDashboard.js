import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL, getAuthHeaders } from "../config";
import "./dashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  const [seats, setSeats] = useState([]);
  const [classes, setClasses] = useState([]);
  const [notification, setNotification] = useState(null);
  const [time, setTime] = useState(new Date());
  const [toast, setToast] = useState(null);

  const email = localStorage.getItem("userEmail") || "student@example.com";
  const userName = localStorage.getItem("userName") || email.split("@")[0];
  const dept = localStorage.getItem("department") || "Computer Science";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
    const interval = setInterval(() => setTime(new Date()), 1000);
    fetchSeats();
    fetchClasses();
    fetchNotification();
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSeats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const res = await axios.get(`${API_BASE_URL}/api/seat`, getAuthHeaders());
      setSeats(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/login");
      }
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, getAuthHeaders());
      setClasses(res.data);
    } catch (err) {
      console.error("Fetch classes error:", err);
    }
  };

  const fetchNotification = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/seat/notification`, getAuthHeaders());
      if (res.data) {
        setNotification(res.data);
      }
    } catch (err) {
      console.error("Notification error:", err);
    }
  };

  const refreshData = () => {
    fetchSeats();
    fetchClasses();
    fetchNotification();
    showToast("Data refreshed!", "success");
  };

  const booked = seats.filter((s) => s.isBooked === true).length;
  const available = 25 - booked;
  const mySeat = seats.find((s) => s.bookedBy === email && s.isBooked === true);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayClasses = classes.filter((c) => c.date === todayStr || c.status === "ONGOING");
  const upcomingClasses = classes.filter((c) => c.status === "SCHEDULED" && c.date !== todayStr);
  const completedClasses = classes.filter((c) => c.status === "COMPLETED" || c.status === "CANCELLED");

  return (
    <div className="dash-page">
      <div className="dash-bg-orb orb1" />
      <div className="dash-bg-orb orb2" />

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Navbar */}
      <nav className={`dash-nav ${mounted ? "nav-in" : ""}`}>
        <div className="dash-logo">⬡ EduSlot Smart Class</div>
        <div className="dash-nav-right">
          <span className="dash-email">{email} ({dept})</span>
          <span className="dash-role-badge">Student</span>
          <button className="dash-logout" onClick={() => { localStorage.clear(); navigate("/login"); }}>
            Logout
          </button>
        </div>
      </nav>

      <main className={`dash-main ${mounted ? "main-in" : ""}`} style={{ maxWidth: "1100px" }}>
        {/* Header */}
        <div className="dash-header">
          <div>
            <p className="dash-greeting">
              Good {time.getHours() < 12 ? "morning" : time.getHours() < 17 ? "afternoon" : "evening"}, {userName} 👋
            </p>
            <h1 className="dash-title">Student Dashboard</h1>
          </div>
          <div className="dash-clock">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        {/* Cancellation / Teacher Notification */}
        {notification && (
          <div className="my-seat-banner" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <span className="msb-icon">📢</span>
            <div>
              <p className="msb-title" style={{ color: "#fca5a5" }}>Faculty Notice</p>
              <p className="msb-sub" style={{ color: "#fecaca" }}>{notification.message}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stat-cards">
          <div className="stat-card card-blue">
            <span className="stat-icon">🪑</span>
            <span className="stat-val">{available}</span>
            <span className="stat-name">Available Seats</span>
          </div>
          <div className="stat-card card-red">
            <span className="stat-icon">🔴</span>
            <span className="stat-val">{booked}</span>
            <span className="stat-name">Booked</span>
          </div>
          <div className="stat-card card-green">
            <span className="stat-icon">✅</span>
            <span className="stat-val">{mySeat ? mySeat.seatNumber : "—"}</span>
            <span className="stat-name">My Seat</span>
          </div>
          <div className="stat-card card-purple">
            <span className="stat-icon">📅</span>
            <span className="stat-val">{classes.length}</span>
            <span className="stat-name">Total Classes</span>
          </div>
        </div>

        {/* My Seat Status */}
        {mySeat ? (
          <div className="my-seat-banner">
            <span className="msb-icon">🎉</span>
            <div>
              <p className="msb-title">You're all set!</p>
              <p className="msb-sub">Seat <strong>#{mySeat.seatNumber}</strong> is reserved for your active session.</p>
            </div>
          </div>
        ) : (
          <div className="book-cta">
            <div>
              <p className="cta-title">No seat booked yet</p>
              <p className="cta-sub">Book your seat — {available} seats available!</p>
            </div>
            <button className="cta-btn" onClick={() => navigate("/booking")}>🪑 Book a Seat →</button>
          </div>
        )}

        {/* Today's Classes */}
        {todayClasses.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p className="section-label">TODAY'S CLASSES</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px", marginTop: "12px" }}>
              {todayClasses.map((cls) => (
                <div key={cls._id} style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span className="dept-badge">{cls.subjectCode}</span>
                    <span className={`status-badge status-${cls.status?.toLowerCase()}`}>{cls.status}</span>
                  </div>
                  <h4 style={{ color: "white", marginBottom: "4px" }}>{cls.title}</h4>
                  <p style={{ color: "#94a3b8", fontSize: "12px" }}>📍 {cls.roomNumber} &bull; ⏰ {cls.scheduleTime}</p>
                  <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>👨‍🏫 {cls.teacherName}</p>
                  {cls.status === "ONGOING" && (
                    <button className="cta-btn" style={{ marginTop: "12px", width: "100%", padding: "8px", fontSize: "13px" }}
                      onClick={() => navigate("/booking")}>
                      Book Live Seat →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Classes */}
        {upcomingClasses.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p className="section-label">UPCOMING CLASSES ({upcomingClasses.length})</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px", marginTop: "12px" }}>
              {upcomingClasses.map((cls) => (
                <div key={cls._id} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span className="dept-badge">{cls.subjectCode}</span>
                    <span className={`status-badge status-${cls.status?.toLowerCase()}`}>{cls.status}</span>
                  </div>
                  <h4 style={{ color: "white", marginBottom: "4px" }}>{cls.title}</h4>
                  <p style={{ color: "#94a3b8", fontSize: "12px" }}>📅 {cls.date} &bull; ⏰ {cls.scheduleTime}</p>
                  <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>👨‍🏫 {cls.teacherName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed / Cancelled History */}
        {completedClasses.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p className="section-label">CLASS HISTORY</p>
            <div className="table-container" style={{ marginTop: "12px" }}>
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>Class Title</th>
                    <th>Teacher</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {completedClasses.map((cls) => (
                    <tr key={cls._id}>
                      <td><strong>{cls.title}</strong></td>
                      <td>{cls.teacherName}</td>
                      <td><span className={`status-badge status-${cls.status?.toLowerCase()}`}>{cls.status}</span></td>
                      <td>{cls.status === "CANCELLED" ? <span style={{ color: "#fca5a5" }}>Reason: {cls.cancellationReason}</span> : <span style={{ color: "#86efac" }}>Completed</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <p className="section-label">QUICK ACTIONS</p>
          <div className="action-grid">
            <button className="action-card" onClick={() => navigate("/booking")}>
              <span className="action-icon">🪑</span>
              <span className="action-title">Book Seat</span>
              <span className="action-sub">Choose your spot</span>
            </button>
            <button className="action-card" onClick={refreshData}>
              <span className="action-icon">🔄</span>
              <span className="action-title">Refresh</span>
              <span className="action-sub">Update data</span>
            </button>
            <button className="action-card" onClick={() => navigate("/")}>
              <span className="action-icon">🏠</span>
              <span className="action-title">Home</span>
              <span className="action-sub">Back to landing</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}