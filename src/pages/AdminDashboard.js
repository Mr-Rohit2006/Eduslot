import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, getAuthHeaders } from "../config";
import "./admin.css";

export default function AdminDashboard() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  // Add University Modal state
  const [showUnivModal, setShowUnivModal] = useState(false);
  const [univName, setUnivName] = useState("");
  const [univCode, setUnivCode] = useState("");
  const [univLocation, setUnivLocation] = useState("");
  const [univDepts, setUnivDepts] = useState("Computer Science, Electrical Engineering, Business Administration");

  // University Administrator / Head details
  const [headName, setHeadName] = useState("");
  const [headEmail, setHeadEmail] = useState("");
  const [headPassword, setHeadPassword] = useState("");

  const navigate = useNavigate();
  const adminEmail = localStorage.getItem("userEmail") || "admin@eduslot.com";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
    fetchUniversities();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/university`, getAuthHeaders());
      setUniversities(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/login");
      } else {
        showToast(err.response?.data?.message || "Error fetching universities", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUniversity = async (e) => {
    e.preventDefault();
    if (!univName || !univCode || !headEmail || !headPassword) {
      return showToast("Please fill in University Name, Code, Administrator Email & Password", "error");
    }

    try {
      const deptsArray = univDepts.split(",").map((d) => d.trim()).filter(Boolean);
      await axios.post(
        `${API_BASE_URL}/api/university`,
        {
          name: univName,
          code: univCode,
          location: univLocation,
          departments: deptsArray,
          headName: headName || "University Administrator",
          headEmail,
          headPassword
        },
        getAuthHeaders()
      );

      showToast("University and Administrator created successfully!");
      setShowUnivModal(false);
      resetForm();
      fetchUniversities();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create university", "error");
    }
  };

  const resetForm = () => {
    setUnivName("");
    setUnivCode("");
    setUnivLocation("");
    setUnivDepts("Computer Science, Electrical Engineering, Business Administration");
    setHeadName("");
    setHeadEmail("");
    setHeadPassword("");
  };

  const handleDeleteUniversity = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will permanently remove all associated teachers, students, classes, and seats. This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(id)
      await axios.delete(`${API_BASE_URL}/api/university/${id}`, getAuthHeaders());
      showToast("University and all associated records deleted successfully.", "success");
      fetchUniversities();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete university", "error");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-orb orb-1" />
      <div className="admin-orb orb-2" />

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Add University Modal */}
      {showUnivModal && (
        <div className="modal-backdrop">
          <div className="admin-modal" style={{ width: "500px" }}>
            <h3>🏛️ Add New University / College</h3>
            <p className="sub-modal-text">Enter university information & assign University Administrator</p>
            <form onSubmit={handleCreateUniversity}>
              <div className="admin-field">
                <label>University / College Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={univName}
                  onChange={(e) => setUnivName(e.target.value)}
                  required
                />
              </div>

              <div className="admin-field">
                <label>University Code</label>
                <input
                  type="text"
                  placeholder="e.g. STANFORD"
                  value={univCode}
                  onChange={(e) => setUnivCode(e.target.value)}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Address / Campus Location</label>
                <input
                  type="text"
                  placeholder="e.g. Palo Alto, California"
                  value={univLocation}
                  onChange={(e) => setUnivLocation(e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label>Initial Departments (comma separated)</label>
                <input
                  type="text"
                  placeholder="Computer Science, Electrical Engineering, Business"
                  value={univDepts}
                  onChange={(e) => setUnivDepts(e.target.value)}
                />
              </div>

              <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)", margin: "16px 0" }} />

              <h4 style={{ color: "#60a5fa", fontSize: "14px", marginBottom: "12px" }}>
                👤 Assign University Administrator Details
              </h4>

              <div className="admin-field">
                <label>Administrator Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Robert Vance"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label>Administrator Email Address</label>
                <input
                  type="email"
                  placeholder="head@university.edu"
                  value={headEmail}
                  onChange={(e) => setHeadEmail(e.target.value)}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Administrator Initial Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={headPassword}
                  onChange={(e) => setHeadPassword(e.target.value)}
                  required
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowUnivModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save & Create University
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <nav className={`admin-nav ${mounted ? "nav-in" : ""}`}>
        <div className="admin-logo">
          <span>⚙️ EduSlot</span>
          <span className="portal-badge">Super Admin Portal</span>
        </div>

        <div className="admin-nav-right">
          <span className="admin-email">{adminEmail}</span>
          <button
            className="admin-logout"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className={`admin-main ${mounted ? "main-in" : ""}`}>
        <div className="admin-header">
          <div>
            <p className="admin-subtitle">SYSTEM MANAGEMENT</p>
            <h1 className="admin-title">Universities & Colleges Directory</h1>
          </div>

          <button className="create-univ-btn" onClick={() => setShowUnivModal(true)}>
            + Add New University
          </button>
        </div>

        {/* University List Grid */}
        <div className="section-block">
          {loading ? (
            <div className="loading-state">Loading registered universities...</div>
          ) : universities.length === 0 ? (
            <div className="empty-state-box">
              <p>No universities created yet.</p>
              <button onClick={() => setShowUnivModal(true)}>Add First University</button>
            </div>
          ) : (
            <div className="univ-grid">
              {universities.map((univ) => (
                <div key={univ._id} className="univ-card">
                  <div className="card-top">
                    <span className="univ-icon">🏛️</span>
                    <div>
                      <span className="univ-code">{univ.code}</span>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDeleteUniversity(univ._id, univ.name)}
                        style={{ marginLeft: '10px' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  <h4 className="univ-card-title">{univ.name}</h4>
                  <p className="univ-card-loc">📍 {univ.location || "Main Campus"}</p>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "8px", margin: "12px 0", fontSize: "12px" }}>
                    <p style={{ color: "#94a3b8", marginBottom: "4px" }}><strong>Assigned Administrator:</strong></p>
                    <p style={{ color: "#60a5fa" }}>
                      👤 {univ.adminHeadId?.name || "Administrator"} ({univ.adminHeadId?.email || "N/A"})
                    </p>
                  </div>

                  <div className="dept-tags">
                    {univ.departments?.slice(0, 3).map((d, i) => (
                      <span key={i} className="dept-chip">{d}</span>
                    ))}
                    {univ.departments?.length > 3 && (
                      <span className="dept-chip">+{univ.departments.length - 3} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
