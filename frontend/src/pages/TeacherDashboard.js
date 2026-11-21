import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, getAuthHeaders } from "../config";
import "./dashboard.css";

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("classes"); // 'classes' | 'live_seats' | 'history'
  const [classes, setClasses] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const [toast, setToast] = useState(null);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingClass, setCancellingClass] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const navigate = useNavigate();
  const teacherEmail = localStorage.getItem("userEmail") || "teacher@stanford.edu";
  const teacherName = localStorage.getItem("userName") || teacherEmail.split("@")[0];
  const teacherDept = localStorage.getItem("department") || "Computer Science";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(() => setMounted(true), 50);

    fetchClasses();
    fetchHistory();

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch assigned classes (scheduled by University Administrator)
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, getAuthHeaders());
      setClasses(res.data);
      if (res.data.length > 0 && !selectedClass) {
        setSelectedClass(res.data[0]);
        fetchSeatsForClass(res.data[0]._id);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/login");
      } else {
        showToast(err.response?.data?.message || "Error fetching assigned classes", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes/history`, getAuthHeaders());
      setHistory(res.data);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const fetchSeatsForClass = async (classId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/seat?classId=${classId}`, getAuthHeaders());
      setSeats(res.data);
    } catch (err) {
      console.error("Seats error:", err);
    }
  };

  // Start Class Session
  const handleStartClass = async (cls) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/classes/${cls._id}/status`, { status: "ONGOING" }, getAuthHeaders());
      showToast(`Class "${cls.title}" is now ONGOING!`);
      fetchClasses();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to start class", "error");
    }
  };

  // Complete Class Session & Reset active session seats
  const handleCompleteClass = async (cls) => {
    if (!window.confirm(`Complete session for "${cls.title}"? Active live seats will be reset.`)) return;

    try {
      await axios.post(`${API_BASE_URL}/api/classes/${cls._id}/complete`, {}, getAuthHeaders());
      showToast(`Class "${cls.title}" COMPLETED. Live seats reset!`);
      fetchClasses();
      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to complete class", "error");
    }
  };

  // Cancel Assigned Class
  const openCancelModal = (cls) => {
    setCancellingClass(cls);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleConfirmCancelClass = async (e) => {
    e.preventDefault();
    if (!cancellationReason.trim()) {
      return showToast("Cancellation reason is required!", "error");
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/classes/${cancellingClass._id}/cancel`,
        { reason: cancellationReason },
        getAuthHeaders()
      );

      showToast(`Class "${cancellingClass.title}" CANCELLED.`);
      setShowCancelModal(false);
      setCancellingClass(null);
      setCancellationReason("");
      fetchClasses();
      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel class", "error");
    }
  };


  return (
    <div className="dash-page">
      <div className="dash-bg-orb orb1" style={{ background: "#7c3aed" }} />
      <div className="dash-bg-orb orb2" />

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Cancel Class Modal */}
      {showCancelModal && cancellingClass && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 style={{ color: "#ef4444" }}>⚠️ Cancel Assigned Class?</h3>
            <p>
              Cancelling <strong>"{cancellingClass.title}"</strong>. Please enter the cancellation reason for students.
            </p>
            <form onSubmit={handleConfirmCancelClass}>
              <div className="field-group" style={{ margin: "16px 0" }}>
                <label style={{ color: "#94a3b8" }}>Reason for Cancellation (Required)</label>
                <textarea
                  className="login-input"
                  style={{ minHeight: "80px", resize: "vertical" }}
                  placeholder="e.g. Faculty ill health / Unexpected weather..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setShowCancelModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-confirm" style={{ background: "#ef4444" }}>
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`dash-nav ${mounted ? "nav-in" : ""}`}>
        <div className="dash-logo">⬡ EduSlot Smart Class</div>

        <div className="dash-nav-right">
          <span className="dash-email">{teacherEmail} ({teacherDept})</span>
          <span className="dash-role-badge teacher-badge">Faculty Teacher</span>
          <button className="dash-logout" onClick={() => { localStorage.clear(); navigate("/login"); }}>
            Logout
          </button>
        </div>
      </nav>

      <main className={`dash-main ${mounted ? "main-in" : ""}`}>
        <div className="dash-header">
          <div>
            <p className="dash-greeting">Welcome, {teacherName} 👋</p>
            <h1 className="dash-title">Assigned Class Timetable</h1>
          </div>

          <div className="dash-clock">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        {/* View Tabs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button className={`dept-tab ${activeTab === "classes" ? "tab-active" : ""}`} onClick={() => setActiveTab("classes")}>
            Assigned Classes ({classes.length})
          </button>
          <button className={`dept-tab ${activeTab === "live_seats" ? "tab-active" : ""}`} onClick={() => setActiveTab("live_seats")}>
            Live Classroom Seat Map
          </button>
          <button className={`dept-tab ${activeTab === "history" ? "tab-active" : ""}`} onClick={() => setActiveTab("history")}>
            Class History Log ({history.length})
          </button>
        </div>

        {/* TAB 1: ASSIGNED CLASSES */}
        {activeTab === "classes" && (
          <div className="classes-section">
            {loading ? (
              <p style={{ color: "#94a3b8" }}>Loading assigned class timetable...</p>
            ) : classes.length === 0 ? (
              <div className="empty-state">
                <p>No classes scheduled for you by the University Administrator yet.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                {classes.map((cls) => (
                  <div
                    key={cls._id}
                    className="stat-card"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span className="dept-badge">{cls.subjectCode}</span>
                      <span className={`status-badge status-${cls.status?.toLowerCase()}`}>{cls.status}</span>
                    </div>

                    <h3 style={{ color: "white", fontSize: "18px", margin: "10px 0 4px 0" }}>{cls.title}</h3>
                    <p style={{ color: "#94a3b8", fontSize: "13px" }}>
                      📍 {cls.roomNumber} • ⏰ {cls.scheduleTime}
                    </p>

                    {cls.status === "CANCELLED" && (
                      <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "8px 12px", borderRadius: "8px", width: "100%", margin: "8px 0", fontSize: "12px", color: "#fca5a5" }}>
                        <strong>Reason:</strong> {cls.cancellationReason}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", marginTop: "16px", width: "100%" }}>
                      {cls.status === "SCHEDULED" && (
                        <button className="btn-action-primary" style={{ flex: 1, padding: "8px", fontSize: "12px" }} onClick={() => handleStartClass(cls)}>
                          ▶ Start Class
                        </button>
                      )}

                      {cls.status === "ONGOING" && (
                        <button className="btn-action-primary" style={{ flex: 1, padding: "8px", fontSize: "12px", background: "#10b981" }} onClick={() => handleCompleteClass(cls)}>
                          ✅ Complete Class
                        </button>
                      )}

                      {(cls.status === "SCHEDULED" || cls.status === "ONGOING") && (
                        <button className="btn-delete" style={{ flex: 1, padding: "8px", fontSize: "12px" }} onClick={() => openCancelModal(cls)}>
                          🚫 Cancel Class
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE SEAT MAP */}
        {activeTab === "live_seats" && (
          <div className="teacher-seat-grid-section">
            <p className="section-label">SEAT MAP - {selectedClass ? selectedClass.title : "Live Session"}</p>
            <div className="teacher-seat-grid">
              {Array.from({ length: 25 }, (_, i) => {
                const seat = seats.find((s) => Number(s.seatNumber) === i + 1);
                return (
                  <div key={i} className={`t-seat ${seat?.isBooked ? "t-booked" : "t-free"}`}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY LOG */}
        {activeTab === "history" && (
          <div className="table-container" style={{ padding: "20px" }}>
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Class Title</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Archived Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h._id}>
                    <td><strong>{h.title}</strong></td>
                    <td>{h.subjectCode}</td>
                    <td><span className={`status-badge status-${h.status?.toLowerCase()}`}>{h.status}</span></td>
                    <td>{h.status === "CANCELLED" ? `Reason: ${h.cancellationReason}` : "Completed"}</td>
                    <td>{h.completedAt ? new Date(h.completedAt).toLocaleString() : "Archived"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}