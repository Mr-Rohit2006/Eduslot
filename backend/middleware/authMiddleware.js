const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "eduslot_secret_key";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. Token missing." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// Middleware to restrict route access by role
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. Role '${req.user?.role || "guest"}' is not authorized to perform this action.`
      });
    }
    next();
  };
};

// Middleware to enforce university-level data isolation
const verifyUniversityAccess = (req, res, next) => {
  if (req.user.role === "admin") {
    return next(); // Super Admin can access all universities
  }

  const targetUnivId = req.params.universityId || req.query.universityId || req.body.universityId;

  if (targetUnivId && req.user.universityId && targetUnivId.toString() !== req.user.universityId.toString()) {
    return res.status(403).json({
      message: "Forbidden. Access denied to resources outside your assigned university."
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  authorizeRoles,
  verifyUniversityAccess
};