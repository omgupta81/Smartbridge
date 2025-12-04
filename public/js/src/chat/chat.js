// chat/chat.js
import { el } from "../utils/dom.js";
import { formatTime } from "../utils/dom.js";

/* -----------------------------------------------------
   Append message to chat box
----------------------------------------------------- */
export function appendMessage(chatBoxEl, { from, text, time = Date.now(), self = false }, userColor) {
  if (!chatBoxEl) return;

  const row = el("div");
  row.className = "msg-row " + (self ? "msg-right" : "msg-left");
  Object.assign(row.style, {
    display: "flex",
    marginBottom: "6px",
    justifyContent: self ? "flex-end" : "flex-start"
  });

  const bubble = el("div");
  bubble.className = "msg-bubble";
  Object.assign(bubble.style, {
    padding: "8px 12px",
    borderRadius: "12px",
    maxWidth: "78%",
    background: self ? "#3b82f6" : "#f3f4f6",
    color: self ? "#fff" : "#111827"
  });

  if (!self) {
    const label = el("div");
    label.className = "msg-user";
    label.innerText = from;
    Object.assign(label.style, {
      fontWeight: "700",
      marginBottom: "6px",
      color: userColor(from)
    });
    bubble.appendChild(label);
  }

  const body = el("div");
  body.innerText = text;

  const meta = el("div");
  meta.innerText = formatTime(time);
  Object.assign(meta.style, {
    fontSize: "11px",
    opacity: "0.7",
    marginTop: "6px",
    textAlign: "right"
  });

  bubble.appendChild(body);
  bubble.appendChild(meta);
  row.appendChild(bubble);
  chatBoxEl.appendChild(row);

  chatBoxEl.scrollTo({ top: chatBoxEl.scrollHeight, behavior: "smooth" });
}

/* -----------------------------------------------------
   Chat sender (prevents duplicates)
----------------------------------------------------- */
export function makeChatSender({ chatInputEl, sendChatBtn, socket, username, roomId, appendLocal }) {
  let lastTxAt = 0;
  let lastSentText = "";

  // store cids of messages sent by this client
  const sentCids = new Set();

  function sendChatPerfect() {
    if (!chatInputEl) return;

    const text = chatInputEl.value.trim();
    if (!text) return;

    const now = Date.now();
    if (now - lastTxAt < 250) return;
    if (text === lastSentText) return;

    lastSentText = text;
    lastTxAt = now;

    const cid = Math.random().toString(36).slice(2);

    // Track own outgoing CID
    sentCids.add(cid);
    setTimeout(() => sentCids.delete(cid), 8000);

    const payload = { roomId, from: username, text, time: now, cid };

    // Local echo (only once)
    appendLocal?.({ from: username, text, time: now, self: true });

    chatInputEl.value = "";

    // 🔥 IMPORTANT — Tell socket.js we sent this CID
    if (socket && typeof socket.registerSentCid === "function") {
      socket.registerSentCid(cid);
    }

    if (socket) socket.emit("chat-message", payload);
  }

  // Public API for dedupe in main.js
  function isOwnMessage(cid) {
    return sentCids.has(cid);
  }

  sendChatBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    sendChatPerfect();
  });

  chatInputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatPerfect();
    }
  });

  return { sendChatPerfect, isOwnMessage };
}
