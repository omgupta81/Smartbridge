// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_a_strong_secret";
const TOKEN_EXPIRES = "7d";

// ---------------------------------------
// REGISTER
// ---------------------------------------
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ ok: false, error: "Missing fields" });

    const safeUsername = String(username).trim();
    const safeEmail = String(email).trim();

    const existing = await User.findOne({
      $or: [{ email: safeEmail }, { username: safeUsername }]
    });

    if (existing)
      return res.status(400).json({ ok: false, error: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      username: safeUsername,
      email: safeEmail,
      passwordHash
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ ok: true, user: { id: user._id, username: user.username } });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
};

// ---------------------------------------
// LOGIN
// ---------------------------------------
exports.login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password)
      return res.status(400).json({ ok: false, error: "Missing fields" });

    const identifier = String(usernameOrEmail).trim();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user)
      return res.status(400).json({ ok: false, error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(400).json({ ok: false, error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ ok: true, user: { id: user._id, username: user.username } });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
};

// ---------------------------------------
// LOGOUT
// ---------------------------------------
exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
};

// ---------------------------------------
// CURRENT USER
// ---------------------------------------
exports.me = async (req, res) => {
  try {
    if (!req.userId) {
      return res.json({ user: null });
    }

    const user = await User.findById(req.userId).select("-passwordHash");

    return res.json({ user: user || null });

  } catch (err) {
    return res.json({ user: null });
  }
};
