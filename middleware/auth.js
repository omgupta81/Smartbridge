const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_in_production";

// Extract token from cookie OR Authorization Bearer header
function getToken(req) {
  if (req.cookies?.token) return req.cookies.token;

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.split(" ")[1];

  return null;
}

// Normalize token payload into req.user & req.userId
function assignUser(req, decoded) {
  req.userId = decoded.id;
  req.user = {
    id: decoded.id,
    username: decoded.username || null,
    email: decoded.email || null,
    role: decoded.role || "user"
  };
}

/* ==========================================
   REQUIRED AUTH — protected endpoints
========================================== */
exports.requireAuth = (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized"
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    assignUser(req, decoded);
    next();
  } catch {
    return res.status(401).json({
      ok: false,
      error: "Invalid or expired token"
    });
  }
};

/* ==========================================
   OPTIONAL AUTH — allow guests
========================================== */
exports.optionalAuth = (req, res, next) => {
  const token = getToken(req);

  if (!token) return next(); // logged out user → continue as guest

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    assignUser(req, decoded);
  } catch {
    // ignore bad tokens
  }

  next();
};
