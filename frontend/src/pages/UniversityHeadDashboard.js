import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, getAuthHeaders } from "../config";
import "./universityHead.css";

export default function UniversityHeadDashboard() {
  const [activeTab, setActiveTab] = useState("teachers"); // 'teachers' | 'students' | 'classes'
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [university, setUniversity] = useState(null);
  const [departments, setDepartments] = useState([
    "Computer Science",
    "Electrical Engineering",
    "Business Administration",
    "Mechanical Engineering"
  ]);
  // const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showScheduleClassModal, setShowScheduleClassModal] = useState(false);

  // Teacher Form State
  const [tName, setTName] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tPassword, setTPassword] = useState("");
  const [tEmpId, setTEmpId] = useState("");
  const [tDesignation, setTDesignation] = useState("Assistant Professor");
  const [tDepartment, setTDepartment] = useState("Computer Science");

  // Student Form State
  const [sName, setSName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sRollNo, setSRollNo] = useState("");
  const [sCourse, setSCourse] = useState("B.Tech");
  const [sSemester, setSSemester] = useState("Semester 1");
  const [sDepartment, setSDepartment] = useState("Computer Science");

  // Class Schedule Form State
  const [cTitle, setCTitle] = useState("");
  const [cSubject, setCSubject] = useState("CS101");
  const [cCourse] = useState("B.Tech");
  const [cDepartment, setCDepartment] = useState("Computer Science");
  const [cTeacherId, setCTeacherId] = useState("");
  const [cRoom, setCRoom] = useState("Lab 101");
  const [cDate, setCDate] = useState(new Date().toISOString().split("T")[0]);
  const [cStartTime, setCStartTime] = useState("10:00 AM");
  const [cEndTime, setCEndTime] = useState("11:30 AM");

  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail") || "head@stanford.edu";
  const storedUnivId = localStorage.getItem("universityId");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
    fetchData();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
   
    try {
      if (storedUnivId) {
        const univRes = await axios.get(`${API_BASE_URL}/api/university/${storedUnivId}`, getAuthHeaders());
        setUniversity(univRes.data);
        if (univRes.data.departments && univRes.data.departments.length > 0) {
          setDepartments(univRes.data.departments);
          setTDepartment(univRes.data.departments[0]);
          setSDepartment(univRes.data.departments[0]);
          setCDepartment(univRes.data.departments[0]);
        }
      }

      // Fetch Teachers
      const teachersRes = await axios.get(`${API_BASE_URL}/api/teachers`, getAuthHeaders());
      setTeachers(teachersRes.data);
      if (teachersRes.data.length > 0 && !cTeacherId) {
        setCTeacherId(teachersRes.data[0]._id);
      }

      // Fetch Students
      const studentsRes = await axios.get(`${API_BASE_URL}/api/students`, getAuthHeaders());
      setStudents(studentsRes.data);

      // Fetch Classes
      const classesRes = await axios.get(`${API_BASE_URL}/api/classes`, getAuthHeaders());
      setClasses(classesRes.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/login");
      } else {
        showToast(err.response?.data?.message || "Error loading university dashboard data", "error");
      }
    } finally {
     
    }
  };

  // Add Teacher
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!tEmail || !tPassword || !tDepartment) {
      return showToast("Email, Password, and Department are required", "error");
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/teachers`,
        {
          name: tName || tEmail.split("@")[0],
          email: tEmail,
          password: tPassword,
          department: tDepartment,
          employeeId: tEmpId,
          designation: tDesignation
        },
        getAuthHeaders()
      );

      showToast("Teacher added! Credentials have been sent to their email.");
      setShowAddTeacherModal(false);
      resetTeacherForm();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add teacher", "error");
    }
  };

  // Add Student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!sEmail || !sDepartment) {
      return showToast("Student Email and Department are required", "error");
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/students`,
        {
          name: sName || sEmail.split("@")[0],
          email: sEmail,
          rollNumber: sRollNo,
          department: sDepartment,
          course: sCourse,
          semester: sSemester
        },
        getAuthHeaders()
      );

      showToast(`Student created! Credentials sent to email. Temp Password: ${res.data.tempPassword}`);
      setShowAddStudentModal(false);
      resetStudentForm();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add student", "error");
    }
  };

  // Schedule Class
  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!cTitle || !cTeacherId || !cStartTime || !cEndTime) {
      return showToast("Class Title, Teacher, Start Time, and End Time are required", "error");
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/classes`,
        {
          title: cTitle,
          subjectCode: cSubject,
          course: cCourse,
          department: cDepartment,
          teacherId: cTeacherId,
          roomNumber: cRoom,
          date: cDate,
          startTime: cStartTime,
          endTime: cEndTime
        },
        getAuthHeaders()
      );

      showToast("Class scheduled and timetable created successfully!");
      setShowScheduleClassModal(false);
      resetClassForm();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to schedule class", "error");
    }
  };

  const toggleTeacherStatus = async (teacher) => {
    const newStatus = teacher.status === "active" ? "inactive" : "active";
    try {
      await axios.patch(`${API_BASE_URL}/api/teachers/${teacher._id}/status`, { status: newStatus }, getAuthHeaders());
      showToast(`Teacher status changed to ${newStatus}`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const toggleStudentStatus = async (student) => {
    const newStatus = student.status === "active" ? "inactive" : "active";
    try {
      await axios.patch(`${API_BASE_URL}/api/students/${student._id}/status`, { status: newStatus }, getAuthHeaders());
      showToast(`Student status changed to ${newStatus}`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const resetTeacherForm = () => {
    setTName(""); setTEmail(""); setTPassword(""); setTEmpId("");
  };
  const resetStudentForm = () => {
    setSName(""); setSEmail(""); setSRollNo("");
  };
  const resetClassForm = () => {
    setCTitle(""); setCSubject("CS101");
  };

  const filteredTeachers = teachers;
  const filteredStudents = students;

  return (
    <div className="head-page">
      <div className="head-orb orb-a" />
      <div className="head-orb orb-b" />

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div className="modal-backdrop">
          <div className="head-modal">
            <h3>📚 Add Faculty Teacher</h3>
            <form onSubmit={handleAddTeacher}>
              <div className="head-field">
                <label>Teacher Name</label>
                <input type="text" placeholder="e.g. Prof. Sarah Jenkins" value={tName} onChange={(e) => setTName(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Email Address</label>
                <input type="email" placeholder="teacher@university.edu" value={tEmail} onChange={(e) => setTEmail(e.target.value)} required />
              </div>
              <div className="head-field">
                <label>Initial Password</label>
                <input type="password" placeholder="••••••••" value={tPassword} onChange={(e) => setTPassword(e.target.value)} required />
              </div>
              <div className="head-field">
                <label>Employee ID</label>
                <input type="text" placeholder="EMP-1002" value={tEmpId} onChange={(e) => setTEmpId(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Designation</label>
                <input type="text" placeholder="Associate Professor" value={tDesignation} onChange={(e) => setTDesignation(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Department</label>
                <select value={tDepartment} onChange={(e) => setTDepartment(e.target.value)}>
                  {departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="head-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddTeacherModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Add Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="modal-backdrop">
          <div className="head-modal">
            <h3>🎓 Add Student & Dispatch Email</h3>
            <p className="sub-modal-text">Credentials will be generated and emailed automatically</p>
            <form onSubmit={handleAddStudent}>
              <div className="head-field">
                <label>Student Name</label>
                <input type="text" placeholder="e.g. John Smith" value={sName} onChange={(e) => setSName(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Email Address</label>
                <input type="email" placeholder="student@university.edu" value={sEmail} onChange={(e) => setSEmail(e.target.value)} required />
              </div>
              <div className="head-field">
                <label>Roll Number</label>
                <input type="text" placeholder="STU-2024" value={sRollNo} onChange={(e) => setSRollNo(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Course / Degree</label>
                <input type="text" placeholder="B.Tech CS" value={sCourse} onChange={(e) => setSCourse(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Semester / Class</label>
                <input type="text" placeholder="Semester 3" value={sSemester} onChange={(e) => setSSemester(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Department</label>
                <select value={sDepartment} onChange={(e) => setSDepartment(e.target.value)}>
                  {departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="head-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddStudentModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Add Student & Send Email</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Class Modal */}
      {showScheduleClassModal && (
        <div className="modal-backdrop">
          <div className="head-modal" style={{ width: "500px" }}>
            <h3>📅 Schedule Class & Set Timings</h3>
            <p className="sub-modal-text">University Administrator Class Timetable Creation</p>
            <form onSubmit={handleScheduleClass}>
              <div className="head-field">
                <label>Class Title / Subject</label>
                <input type="text" placeholder="e.g. Advanced Operating Systems" value={cTitle} onChange={(e) => setCTitle(e.target.value)} required />
              </div>
              <div className="head-field">
                <label>Subject Code</label>
                <input type="text" placeholder="CS301" value={cSubject} onChange={(e) => setCSubject(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Department</label>
                <select value={cDepartment} onChange={(e) => setCDepartment(e.target.value)}>
                  {departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="head-field">
                <label>Assign Faculty Teacher</label>
                <select value={cTeacherId} onChange={(e) => setCTeacherId(e.target.value)} required>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.department})
                    </option>
                  ))}
                </select>
              </div>
              <div className="head-field">
                <label>Room / Lab</label>
                <input type="text" placeholder="Lab 204" value={cRoom} onChange={(e) => setCRoom(e.target.value)} />
              </div>
              <div className="head-field">
                <label>Date</label>
                <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="head-field">
                  <label>Start Time</label>
                  <input type="text" placeholder="10:00 AM" value={cStartTime} onChange={(e) => setCStartTime(e.target.value)} required />
                </div>
                <div className="head-field">
                  <label>End Time</label>
                  <input type="text" placeholder="11:30 AM" value={cEndTime} onChange={(e) => setCEndTime(e.target.value)} required />
                </div>
              </div>
              <div className="head-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowScheduleClassModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Schedule Timetable</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`head-nav ${mounted ? "nav-in" : ""}`}>
        <div className="head-logo">
          <span>🏛️ EduSlot</span>
          <span className="univ-badge">{university ? university.name : "University Administrator"}</span>
        </div>

        <div className="head-nav-right">
          <span className="head-email">{userEmail}</span>
          <button className="head-logout" onClick={() => { localStorage.clear(); navigate("/login"); }}>Logout</button>
        </div>
      </nav>

      <main className={`head-main ${mounted ? "main-in" : ""}`}>
        <div className="head-header">
          <div>
            <p className="head-subtitle">UNIVERSITY MANAGEMENT PORTAL</p>
            <h1 className="head-title">University Administrator Dashboard</h1>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="add-teacher-btn" onClick={() => setShowAddTeacherModal(true)}>+ Add Teacher</button>
            <button className="add-teacher-btn" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }} onClick={() => setShowAddStudentModal(true)}>+ Add Student</button>
            <button className="add-teacher-btn" style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef)" }} onClick={() => setShowScheduleClassModal(true)}>📅 Schedule Class</button>
          </div>
        </div>

        {/* View Switch Tabs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button className={`dept-tab ${activeTab === "teachers" ? "tab-active" : ""}`} onClick={() => setActiveTab("teachers")}>
            Faculty Teachers ({teachers.length})
          </button>
          <button className={`dept-tab ${activeTab === "students" ? "tab-active" : ""}`} onClick={() => setActiveTab("students")}>
            Enrolled Students ({students.length})
          </button>
          <button className={`dept-tab ${activeTab === "classes" ? "tab-active" : ""}`} onClick={() => setActiveTab("classes")}>
            Class Timetables & Schedules ({classes.length})
          </button>
        </div>

        {/* TAB 1: TEACHERS */}
        {activeTab === "teachers" && (
          <div className="table-container">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Email</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t._id}>
                    <td><strong>{t.name}</strong></td>
                    <td>{t.email}</td>
                    <td>{t.employeeId || "N/A"}</td>
                    <td><span className="dept-badge">{t.department}</span></td>
                    <td>{t.designation || "Faculty"}</td>
                    <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                    <td>
                      <button className={`btn-toggle ${t.status === "inactive" ? "btn-activate" : ""}`} onClick={() => toggleTeacherStatus(t)}>
                        {t.status === "inactive" ? "Activate" : "Deactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: STUDENTS */}
        {activeTab === "students" && (
          <div className="table-container">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Roll Number</th>
                  <th>Course & Semester</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s._id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email}</td>
                    <td>{s.rollNumber || "N/A"}</td>
                    <td>{s.course} - {s.semester}</td>
                    <td><span className="dept-badge">{s.department}</span></td>
                    <td><span className={`status-badge status-${s.status}`}>{s.status}</span></td>
                    <td>
                      <button className={`btn-toggle ${s.status === "inactive" ? "btn-activate" : ""}`} onClick={() => toggleStudentStatus(s)}>
                        {s.status === "inactive" ? "Activate" : "Deactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CLASSES & TIMETABLE */}
        {activeTab === "classes" && (
          <div className="table-container">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Class Title</th>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Assigned Teacher</th>
                  <th>Timing</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.title}</strong></td>
                    <td>{c.subjectCode}</td>
                    <td><span className="dept-badge">{c.department}</span></td>
                    <td>{c.teacherName}</td>
                    <td>⏰ {c.scheduleTime}</td>
                    <td><span className={`status-badge status-${c.status?.toLowerCase()}`}>{c.status}</span></td>
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
