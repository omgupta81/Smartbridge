const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String },
  language: { type: String, default: "javascript" },
  code: { type: String, default: "// Start coding\n" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SessionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Session", SessionSchema);
