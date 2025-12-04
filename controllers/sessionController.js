const { v4: uuidv4 } = require("uuid");
const Session = require("../models/Session");

// -------------------------
// REST API CONTROLLERS
// -------------------------

exports.createSession = async (req, res) => {
  try {
    const { name, language } = req.body || {};
    const roomId = uuidv4();

    const session = new Session({
      roomId,
      owner: req.user?.id,
      name: name?.trim() || "Untitled",
      language: language || "javascript",
      code: "",
    });

    await session.save();
    return res.status(201).json({ ok: true, session });
  } catch (err) {
    console.error("createSession Error:", err);
    return res.status(500).json({ ok: false, error: "Could not create session" });
  }
};

exports.getSession = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: "Room ID required" });

    const session = await Session.findOne({ roomId });
    if (!session)
      return res.status(404).json({ ok: false, error: "Session not found" });

    return res.json({ ok: true, session });
  } catch (err) {
    console.error("getSession Error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

exports.saveSessionCode = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { code } = req.body;

    if (!roomId) return res.status(400).json({ ok: false, error: "Room ID required" });

    const session = await Session.findOneAndUpdate(
      { roomId },
      { code: code || "", updatedAt: Date.now() },
      { new: true }
    );

    if (!session)
      return res.status(404).json({ ok: false, error: "Session not found" });

    return res.json({ ok: true, session });
  } catch (err) {
    console.error("saveSessionCode Error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

exports.me = async (req, res) => {
  return res.json({ ok: true, user: req.user || null });
};

// -------------------------
// SOCKET.IO HANDLER
// -------------------------

exports.setupSocket = (io) => {
  const rooms = new Map();      // roomId → [{ id, name }]
  const roomUsers = {};         // 🔥 required for participants API

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // -------------------------
    // JOIN ROOM
    // -------------------------
    socket.on("join-room", async ({ roomId, username }) => {
      if (!roomId) return;

      socket.join(roomId);
      socket.roomId = roomId;
      socket.username = username?.trim() || "Anonymous";

      // --- USER LIST FOR UI ---
      const userList = rooms.get(roomId) || [];
      const withoutDup = userList.filter((u) => u.id !== socket.id);

      const userData = {
        id: socket.id,
        name: socket.username,
      };

      withoutDup.push(userData);
      rooms.set(roomId, withoutDup);

      io.to(roomId).emit("users", withoutDup);

      // --- PARTICIPANTS API (NEW) ---
      if (!roomUsers[roomId]) roomUsers[roomId] = [];
      roomUsers[roomId] = roomUsers[roomId].filter((u) => u.id !== socket.id);
      roomUsers[roomId].push({ id: socket.id, username: socket.username });

      io.to(roomId).emit("participants", roomUsers[roomId]); // 🔥 broadcast

      // Load saved session code
      try {
        const session = await Session.findOne({ roomId });
        if (session) {
          socket.emit("load-code", {
            code: session.code || "",
            language: session.language,
          });
        }
      } catch (err) {
        console.error("Error loading session:", err);
      }

      socket.to(roomId).emit("message", {
        from: "system",
        text: `${socket.username} joined the room.`,
      });
    });

    // -------------------------
    // REQUEST PARTICIPANTS (NEW)
    // -------------------------
    socket.on("request-participants", ({ roomId }) => {
      io.to(socket.id).emit(
        "participants",
        roomUsers[roomId] || []
      );
    });

    // -------------------------
    // LEAVE ROOM
    // -------------------------
    socket.on("leave-room", ({ roomId }) => {
      if (!roomId) return;

      socket.leave(roomId);

      const users = rooms.get(roomId) || [];
      const updated = users.filter((u) => u.id !== socket.id);
      rooms.set(roomId, updated);

      io.to(roomId).emit("users", updated);

      // remove from participants
      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(
          (u) => u.id !== socket.id
        );
        io.to(roomId).emit("participants", roomUsers[roomId]);
      }
    });

    // -------------------------
    // CODE CHANGE
    // -------------------------
    socket.on("code-change", async ({ roomId, code }) => {
      if (!roomId) return;

      socket.to(roomId).emit("code-update", { code });

      try {
        await Session.findOneAndUpdate(
          { roomId },
          { code: code || "", updatedAt: Date.now() }
        );
      } catch (err) {
        console.error("Error saving code:", err);
      }
    });

    // -------------------------
    // CHAT MESSAGE
    // -------------------------
    socket.on("chat-message", ({ roomId, from, text }) => {
      if (!roomId || !text) return;

      io.to(roomId).emit("chat-message", {
        from,
        text,
        time: Date.now(),
      });
    });

    // -------------------------
    // HANDLE DISCONNECTING
    // -------------------------
    socket.on("disconnecting", () => {
      const joined = [...socket.rooms].filter((r) => r !== socket.id);

      joined.forEach((roomId) => {
        const users = rooms.get(roomId) || [];
        const updated = users.filter((u) => u.id !== socket.id);
        rooms.set(roomId, updated);
        io.to(roomId).emit("users", updated);

        // participants list update
        if (roomUsers[roomId]) {
          roomUsers[roomId] = roomUsers[roomId].filter(
            (u) => u.id !== socket.id
          );
          io.to(roomId).emit("participants", roomUsers[roomId]);
        }

        io.to(roomId).emit("message", {
          from: "system",
          text: `${socket.username} left the room.`,
        });
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};
