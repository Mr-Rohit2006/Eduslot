import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./home.css";

export default function Home() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setMounted(true);
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 4,
    }));
    setParticles(p);
  }, []);

  const features = [
    { icon: "🪑", title: "Smart Seat Booking", desc: "AI-powered seat suggestions for optimal classroom experience" },
    { icon: "📊", title: "Real-time Dashboard", desc: "Live updates on seat availability and bookings" },
    { icon: "🎓", title: "Role-based Access", desc: "Separate portals for students and teachers" },
    { icon: "⚡", title: "Instant Confirmation", desc: "Book your seat in seconds with one click" },
  ];

  return (
    <div className="home">
      <div className="bg-orb orb1" />
      <div className="bg-orb orb2" />
      <div className="bg-orb orb3" />
      <div className="particles">
        {particles.map((p) => (
          <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.size}px`, height: `${p.size}px`, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
        ))}
      </div>
      <div className="grid-overlay" />
      <nav className={`home-nav ${mounted ? "nav-visible" : ""}`}>
        <div className="nav-logo"><span className="logo-icon">⬡</span><span>EduSlot</span></div>
        <button className="nav-login-btn" onClick={() => navigate("/login")}>Sign In →</button>
      </nav>
      <div className={`hero ${mounted ? "hero-visible" : ""}`}>
        <div className="hero-badge"><span className="badge-dot" />Smart Classroom System</div>
        <h1 className="hero-title">
          <span className="title-line line1">Book Your</span>
          <span className="title-line line2"><span className="gradient-text">Perfect Seat</span></span>
          <span className="title-line line3">Instantly</span>
        </h1>
        <p className="hero-subtitle">AI-powered classroom booking — find the best seat, avoid the rush, and focus on what matters: <em>learning</em>.</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => navigate("/login")}><span>Get Started</span><span className="btn-arrow">→</span></button>
          <button className="btn-secondary" onClick={() => navigate("/login")}>Teacher Portal</button>
        </div>
        <div className="hero-stats">
          <div className="stat"><span className="stat-num">25</span><span className="stat-label">Seats</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-num">2</span><span className="stat-label">Portals</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-num">AI</span><span className="stat-label">Powered</span></div>
        </div>
      </div>
      <div className={`features-section ${mounted ? "features-visible" : ""}`}>
        <p className="features-label">WHY EDUSLOT</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={`seat-preview ${mounted ? "preview-visible" : ""}`}>
        <p className="preview-label">LIVE CLASSROOM VIEW</p>
        <div className="mini-grid">
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className={`mini-seat ${[2,5,9,14,17].includes(i) ? "mini-booked" : i === 7 ? "mini-selected" : "mini-free"}`} style={{ animationDelay: `${0.8 + i * 0.04}s` }} />
          ))}
        </div>
        <div className="seat-legend">
          <span><span className="legend-dot free" />Available</span>
          <span><span className="legend-dot booked" />Booked</span>
          <span><span className="legend-dot selected" />Your Seat</span>
        </div>
      </div>
      <footer className="home-footer"><p>© 2025 EduSlot · Smart Classroom Booking</p></footer>
    </div>
  );
}
