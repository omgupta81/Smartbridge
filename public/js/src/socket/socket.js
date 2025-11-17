// socket/socket.js
export function setupSocket(ioGlobal, roomId, username, handlers = {}) {
  const socket =
    typeof ioGlobal !== "undefined"
      ? ioGlobal()
      : typeof io !== "undefined"
      ? io()
      : null;

  if (!socket) {
    console.warn("socket.io not available on page.");
    return null;
  }

  /* ----------------------------------------------------
     Track own sent message CIDs (to avoid duplicate echo)
  ---------------------------------------------------- */
  const sentCids = new Set();

  // main.js calls this before sending chat-message
  socket.registerSentCid = (cid) => {
    if (!cid) return;
    sentCids.add(cid);
    // cleanup after 8 seconds
    setTimeout(() => sentCids.delete(cid), 8000);
  };

  /* ----------------------------------------------------
     Connection logic
  ---------------------------------------------------- */
  socket.on("connect", () => {
    socket.emit("join-room", { roomId, username });
    socket.emit("request-participants", { roomId });
    socket.emit("request-file-list", { roomId });
  });

  /* ----------------------------------------------------
     Participants
  ---------------------------------------------------- */
  socket.on("participants", (list) => {
    handlers.onParticipants?.(list);
  });

  /* ----------------------------------------------------
     CHAT — dedupe based on CID
  ---------------------------------------------------- */
  socket.off("chat-message");
  socket.on("chat-message", (msg) => {
    // Ignore duplicate echo (own message)
    if (msg?.cid && sentCids.has(msg.cid)) {
      return;
    }

    handlers.onChatMessage?.(msg);
  });

  /* ----------------------------------------------------
     Files
  ---------------------------------------------------- */
  socket.on("file-list", (payload) => handlers.onFileList?.(payload));
  socket.on("file-create", (payload) => handlers.onFileCreate?.(payload));
  socket.on("file-delete", (payload) => handlers.onFileDelete?.(payload));
  socket.on("file-rename", (payload) => handlers.onFileRename?.(payload));
  socket.on("file-change", (payload) => handlers.onFileChange?.(payload));
  socket.on("load-code", (payload) => handlers.onLoadCode?.(payload));
  socket.on("code-update", (payload) => handlers.onCodeUpdate?.(payload));

  /* ----------------------------------------------------
     Typing indicator
  ---------------------------------------------------- */
  socket.on("typing", (payload) => handlers.onTyping?.(payload));

  /* ----------------------------------------------------
     System messages
  ---------------------------------------------------- */
  socket.on("message", (payload) => handlers.onMessage?.(payload));

  /* ----------------------------------------------------
     Connection errors
  ---------------------------------------------------- */
  socket.on("connect_error", (err) => {
    console.warn("Socket connect_error:", err);
    handlers.onConnectError?.(err);
  });

  return socket;
}
