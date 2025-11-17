// middleware/requireAuth.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_a_strong_secret";

// Extract token from cookies or Authorization header
const getToken = (req) => {
  if (req.cookies?.token) return req.cookies.token;

  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.split(" ")[1];
  }

  return null;
};

module.exports = function requireAuth(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Normalize user object
    req.user = {
      id: payload.id,
      username: payload.username,
      ...payload,
    };

    return next();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("JWT Verify Error:", err.message);
    }

    return res.status(401).json({
      ok: false,
      error: "Invalid or expired token",
    });
  }
};
