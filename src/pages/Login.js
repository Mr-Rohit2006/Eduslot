import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import axios from "axios";
import { API_BASE_URL } from "../config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' | 'forgot' | 'reset'
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  // Forgot / Reset Password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [generatedToken, setGeneratedToken] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return showToast("Please enter your registered email and password");
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });

      const { user, token } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.name || user.email);
      localStorage.setItem("universityId", user.universityId || "");
      localStorage.setItem("department", user.department || "General");

      showToast(`Welcome back, ${user.name || user.email}! Redirecting...`, "success");

      setTimeout(() => {
        if (user.role === "admin") {
          navigate("/admin");
        } else if (user.role === "university_head") {
          navigate("/university-head");
        } else if (user.role === "teacher") {
          navigate("/teacher");
        } else {
          navigate("/student");
        }
      }, 800);
    } catch (err) {
      showToast(err.response?.data?.message || "Invalid credentials. Please check your email and role.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      return showToast("Please enter your registered email address.");
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        email: resetEmail
      });

      setGeneratedToken(res.data.resetToken);
      setResetToken(res.data.resetToken || "");
      showToast("Reset token sent to email successfully!", "success");
      setMode("reset");
    } catch (err) {
      showToast(err.response?.data?.message || "Forgot password request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetToken || !newPassword) {
      return showToast("Please enter email, reset token, and new password.");
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
        email: resetEmail,
        resetToken: resetToken,
        newPassword: newPassword
      });

      showToast(res.data.message || "Password updated successfully! Please log in.", "success");
      setEmail(resetEmail);
      setPassword(newPassword);
      setMode("login");
      setGeneratedToken(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Password reset failed. Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb orb-a" />
      <div className="login-bg-orb orb-b" />

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <button className="back-btn" onClick={() => navigate("/")}>
        ← Back to Home
      </button>

      <div className={`login-card ${mounted ? "card-visible" : ""}`}>
        <div className="login-logo">
          <span className="login-logo-icon">⬡</span>
          <span>EduSlot Portal</span>
        </div>

        {/* Mode headers */}
        <h2 className="login-title">
          {mode === "login" && "Sign In to Account"}
          {mode === "forgot" && "Forgot Password"}
          {mode === "reset" && "Reset Password"}
        </h2>

        <p className="login-sub">
          {mode === "login" && "Select your assigned role to access your dashboard"}
          {mode === "forgot" && "Enter email to receive password reset instructions"}
          {mode === "reset" && "Enter your 6-digit reset token and set new password"}
        </p>

        {/* Login Form Fields */}
        {mode === "login" && (
          <>
            <div className="field-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
              />
            </div>

            <div className="field-group">
              <div className="field-header">
                <label>Password</label>
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={() => {
                    setResetEmail(email);
                    setMode("forgot");
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <button
              className={`login-btn ${loading ? "btn-loading" : ""}`}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                "Sign In"
              )}
            </button>
          </>
        )}

        {/* Forgot Password Form */}
        {mode === "forgot" && (
          <>
            <div className="field-group">
              <label>Registered Email Address</label>
              <input
                type="email"
                placeholder="your.email@university.edu"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="login-input"
              />
            </div>

            <button
              className={`login-btn ${loading ? "btn-loading" : ""}`}
              onClick={handleForgotPassword}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Send Reset Token"}
            </button>

            <button
              className="back-to-login-btn"
              onClick={() => setMode("login")}
            >
              ← Back to Sign In
            </button>
          </>
        )}

        {/* Reset Password Form */}
        {mode === "reset" && (
          <>
            {generatedToken && (
              <div className="token-display-box">
                <p><strong>Reset Token:</strong> <span className="token-code">{generatedToken}</span></p>
                <small>(Sent to email address)</small>
              </div>
            )}

            <div className="field-group">
              <label>Email Address</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="login-input"
              />
            </div>

            <div className="field-group">
              <label>6-Digit Reset Token</label>
              <input
                type="text"
                placeholder="e.g. 123456"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="login-input"
              />
            </div>

            <div className="field-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="login-input"
              />
            </div>

            <button
              className={`login-btn ${loading ? "btn-loading" : ""}`}
              onClick={handleResetPassword}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Reset & Set New Password"}
            </button>

            <button
              className="back-to-login-btn"
              onClick={() => setMode("login")}
            >
              ← Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}