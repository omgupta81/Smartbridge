const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Initial session name, not used for file listing
  name: { type: String, default: "Untitled Session" },

  // -------------------------
  // Multi-file support
  // -------------------------
  files: [
    {
      name: { type: String, required: true },
      language: { type: String, default: "javascript" },
      content: { type: String, default: "" }
    }
  ],

  // OLD single-code field (kept for backward compatibility)
  code: { type: String, default: "// Start coding\n" },

  // -------------------------
  // Optional: Chat history
  // -------------------------
  chatHistory: [
    {
      from: String,
      text: String,
      time: Number,
      cid: String
    }
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto update timestamp on modify
SessionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Session", SessionSchema);
