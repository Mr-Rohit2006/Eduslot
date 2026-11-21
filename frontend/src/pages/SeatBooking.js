import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./seat.css";

import { API_BASE_URL, getAuthHeaders } from "../config";
import "./seat.css";

export default function SeatBooking() {
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [mySeat, setMySeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  const navigate = useNavigate();

  const userEmail = localStorage.getItem("userEmail");
  const token = localStorage.getItem("token");

  const seats = useMemo(
    () => Array.from({ length: 25 }, (_, i) => i + 1),
    []
  );

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchSeats();
  }, []);

  useEffect(() => {
    const myBooked = bookedSeats.find(
      (s) => s.bookedBy === userEmail && s.isBooked
    );

    if (myBooked) {
      setMySeat(myBooked.seatNumber);
      setSelectedSeat(null);
    } else {
      setMySeat(null);

      const firstAvailable = seats.find(
        (seat) =>
          !bookedSeats.some(
            (s) => s.seatNumber === seat && s.isBooked
          )
      );

      if (firstAvailable) {
        setSelectedSeat(firstAvailable);
      }
    }
  }, [bookedSeats, seats, userEmail]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const fetchSeats = async () => {
    try {
      if (!token) {
        showToast("Please login again", "error");
        setLoading(false);
        return;
      }

      const res = await axios.get(
        `${API_BASE_URL}/api/seat`,
        getAuthHeaders()
      );

      setBookedSeats(res.data);
    } catch (err) {
      console.log(
        "Fetch seats error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        showToast("Session expired. Please login again", "error");
      } else {
        showToast("Unable to load seats", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSeat) {
      showToast("Please select a seat", "error");
      return;
    }

    if (!token) {
      showToast("Please login again", "error");
      return;
    }

    setBooking(true);

    try {
      await axios.post(
        `${API_BASE_URL}/api/seat/book`,
        {
          seatNumber: selectedSeat,
          userEmail: userEmail,
        },
        getAuthHeaders()
      );

      showToast(
        `Seat #${selectedSeat} booked successfully! 🎉`,
        "success"
      );

      await fetchSeats();

    } catch (err) {
      console.log(
        "Booking error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        showToast("Session expired. Please login again", "error");
      } else {
        showToast(
          err.response?.data?.message ||
            "Booking failed. Please try again.",
          "error"
        );
      }
    } finally {
      setBooking(false);
    }
  };

  const isBooked = (seatNumber) =>
    bookedSeats.some(
      (s) => s.seatNumber === seatNumber && s.isBooked
    );

  const bookedCount = bookedSeats.filter(
    (s) => s.isBooked
  ).length;

  const bookedBy = (seatNumber) =>
    bookedSeats.find(
      (s) => s.seatNumber === seatNumber && s.isBooked
    )?.bookedBy;

  return (
    <div className="seat-page">
      <div className="seat-bg-orb orb1" />
      <div className="seat-bg-orb orb2" />

      {toast && (
        <div className={`seat-toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <nav className={`seat-nav ${mounted ? "nav-in" : ""}`}>
        <div className="seat-logo">⬡ EduSlot</div>

        <div className="seat-nav-right">
          <span className="seat-user-email">
            {userEmail}
          </span>

          <button
            className="seat-back-btn"
            onClick={() => navigate("/student")}
          >
            ← Dashboard
          </button>
        </div>
      </nav>

      <main className={`seat-main ${mounted ? "main-in" : ""}`}>
        <div className="seat-header">
          <div>
            <div className="seat-badge">
              <span className="badge-dot-anim" />
              AI Suggestion Active
            </div>

            <h1 className="seat-title">
              Book Your Seat
            </h1>

            <p className="seat-sub">
              Choose a seat or use our AI recommendation
            </p>
          </div>

          <div className="seat-counter">
            <div className="counter-ring">
              <svg
                viewBox="0 0 64 64"
                className="ring-svg"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="ring-bg"
                />

                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="ring-fill"
                  strokeDasharray={`${
                    (1 - bookedCount / 25) * 175.9
                  } 175.9`}
                  strokeDashoffset="44"
                />
              </svg>

              <div className="ring-text">
                <span className="ring-num">
                  {25 - bookedCount}
                </span>

                <span className="ring-label">
                  free
                </span>
              </div>
            </div>
          </div>
        </div>

        {mySeat && (
          <div className="my-booking-banner">
            <span>🎉</span>

            <p>
              You have{" "}
              <strong>Seat #{mySeat}</strong>{" "}
              reserved. Enjoy your class!
            </p>
          </div>
        )}

        {!mySeat && selectedSeat && !loading && (
          <div className="ai-suggestion">
            <span className="ai-icon">🤖</span>

            <div>
              <p className="ai-title">
                AI Recommends Seat{" "}
                <strong>#{selectedSeat}</strong>
              </p>

              <p className="ai-sub">
                Best available seat based on
                proximity to board and ventilation
              </p>
            </div>
          </div>
        )}

        <div className="seat-section">
          <div className="seat-section-header">
            <p className="section-label-sm">
              CLASSROOM LAYOUT
            </p>

            <div className="legend">
              <span>
                <span className="leg-dot free" />
                Available
              </span>

              <span>
                <span className="leg-dot booked" />
                Booked
              </span>

              <span>
                <span className="leg-dot selected" />
                Selected
              </span>

              <span>
                <span className="leg-dot mine" />
                Mine
              </span>
            </div>
          </div>

          <div className="board-row">
            <div className="board">
              📋 BOARD / FRONT
            </div>
          </div>

          {loading ? (
            <div className="seat-loading">
              <div className="seat-spinner" />
            </div>
          ) : (
            <div className="seats-grid">
              {seats.map((seat, i) => {
                const booked = isBooked(seat);
                const selected = selectedSeat === seat;
                const ismine = mySeat === seat;

                let cls = "seat-cell";

                if (ismine) {
                  cls += " seat-mine";
                } else if (booked) {
                  cls += " seat-booked";
                } else if (selected) {
                  cls += " seat-selected";
                } else {
                  cls += " seat-free";
                }

                return (
                  <div
                    key={seat}
                    className={cls}
                    style={{
                      animationDelay: `${i * 0.03}s`,
                    }}
                    onClick={() => {
                      if (!booked && !mySeat) {
                        setSelectedSeat(seat);
                      }
                    }}
                    onMouseEnter={() =>
                      setHoveredSeat(seat)
                    }
                    onMouseLeave={() =>
                      setHoveredSeat(null)
                    }
                  >
                    <span className="seat-num">
                      {seat}
                    </span>

                    {hoveredSeat === seat &&
                      booked && (
                        <div className="seat-tooltip">
                          {bookedBy(seat)}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="book-action">
          {selectedSeat && !mySeat && (
            <div className="book-summary">
              Confirming:{" "}
              <strong>Seat #{selectedSeat}</strong>{" "}
              for{" "}
              <strong>{userEmail}</strong>
            </div>
          )}

          <button
            className={`confirm-btn ${
              !selectedSeat || mySeat
                ? "confirm-disabled"
                : ""
            } ${
              booking
                ? "confirm-loading"
                : ""
            }`}
            onClick={handleBook}
            disabled={
              !selectedSeat ||
              !!mySeat ||
              booking
            }
          >
            {booking ? (
              <span className="btn-spinner" />
            ) : mySeat ? (
              "✅ Already Booked"
            ) : (
              `Confirm Seat #${selectedSeat || "—"}`
            )}
          </button>
        </div>
      </main>
    </div>
  );
}