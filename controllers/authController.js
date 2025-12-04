// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_a_strong_secret";
const TOKEN_EXPIRES = "7d";

// Unified cookie settings
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // auto secure if deployed
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// ---------------------------------------
// REGISTER
// ---------------------------------------
exports.register = async (req, res) => {
  try {
    let { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // Normalize formatting to prevent duplicates
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ ok: false, error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ username, email, passwordHash });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.json({
      ok: true,
      user: { id: user._id, username: user.username }
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

// ---------------------------------------
// LOGIN
// ---------------------------------------
exports.login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    const identifier = usernameOrEmail.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(400).json({ ok: false, error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ ok: false, error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.json({
      ok: true,
      user: { id: user._id, username: user.username }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

// ---------------------------------------
// LOGOUT
// ---------------------------------------
exports.logout = (req, res) => {
  res.clearCookie("token");
  return res.json({ ok: true });
};

// ---------------------------------------
// CURRENT USER
// ---------------------------------------
exports.me = async (req, res) => {
  try {
    // Works for both old req.userId and new req.user
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.json({ ok: true, user: null });
    }

    const user = await User.findById(userId).select("-passwordHash");

    return res.json({
      ok: true,
      user: user || null
    });

  } catch (err) {
    console.error("ME ERROR:", err);
    return res.json({ ok: true, user: null });
  }
};
