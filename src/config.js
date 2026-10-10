// API Configuration for EduSlot Smart Class System

export const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000" 
    : "https://eduslot-1-h33h.onrender.com");

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
};
