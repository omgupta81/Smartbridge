// app/main.js
import { ensureUsernameModal, ensureFileModal } from "../ui/modals.js";
import { initMonaco, createModelIfNeeded } from "../editor/monaco.js";
import { makeFileState } from "../state/files.js";
import { buildFileExplorer } from "../ui/fileExplorer.js";
import { setupSocket } from "../socket/socket.js";
import { renderParticipants } from "../participants/participants.js";
import { appendMessage, makeChatSender } from "../chat/chat.js";
import { $, el, safeJSON, flash } from "../utils/dom.js";
import { STARTER_TEMPLATES, extToLang } from "../utils/fileTemplates.js";

window.roomIdGlobal = new URLSearchParams(window.location.search).get("room");
const roomId = window.roomIdGlobal;
if (!roomId) {
  alert("Room not specified");
  throw new Error("Missing roomId");
}

ensureUsernameModal();
ensureFileModal();

let displayName = localStorage.getItem("displayName") || "";
function askUsernameThen(cb) {
  if (displayName && displayName.trim()) return cb(displayName);
  const modal = $("usernameModal"),
    input = $("usernameInput"),
    submit = $("usernameSubmit");
  modal.style.display = "flex";
  input.value = "";
  input.focus();
  function done(name) {
    displayName = name;
    localStorage.setItem("displayName", name);
    modal.style.display = "none";
    submit.removeEventListener("click", onClick);
    cb(name);
  }
  function onClick() {
    const v = input.value.trim();
    if (!v) {
      input.focus();
      return;
    }
    done(v);
  }
  submit.addEventListener("click", onClick);
}

askUsernameThen((username) => startRoom(username));

async function startRoom(username) {
  // DOM refs
  const roomLabelEl = $("roomLabel");
  const usersListEl = $("usersList");
  const usersCountEl = $("usersCount");
  const chatBoxEl = $("chatMessages");
  const chatInputEl = $("chatInput");
  const sendChatBtn = $("sendChat");
  const editorContainer = $("editor");
  const editorWrap = $("editorWrap");
  const copyLinkBtn = $("copyLinkBtn");
  const downloadBtn = $("downloadBtn");
  const runBtn = $("runBtn");
  const saveBtn = $("saveBtn");
  const logoutBtn = $("logoutBtn");

  if (roomLabelEl) roomLabelEl.innerText = "Room: " + roomId;

  // state
  const state = makeFileState();
  let editor = null,
    monacoLib = null,
    suppressRemote = false;

  // listen for file creation event from modal
  document.addEventListener("create-file", (e) => {
    const { name, content } = e.detail;

    // local create
    createFileLocal(
      name,
      extToLang((name.match(/\.\w+$/) || [""])[0]),
      content
    );

    // broadcast
    if (realSocket && realSocket.emit) {
      realSocket.emit("file-create", {
        roomId,
        name,
        language: extToLang((name.match(/\.\w+$/) || [""])[0]),
        content,
      });
    }
  });

  // helper: deterministic user color
  function userColor(name) {
    const colors = [
      "#f43f5e",
      "#f97316",
      "#f59e0b",
      "#10b981",
      "#0ea5e9",
      "#6366f1",
      "#a855f7",
    ];
    let s = 0;
    for (let i = 0; i < (name || "").length; i++) s += name.charCodeAt(i);
    return colors[s % colors.length];
  }

  // --- socketProxy: let chatSender call registerSentCid even before socket exists
  const socketProxy = {
    registerSentCid: (cid) => {
      // noop until real socket attaches
    },
  };

  // Create chatSender BEFORE socket so isOwnMessage exists for handlers
  const chatSender = makeChatSender({
    chatInputEl,
    sendChatBtn,
    socket: socketProxy, // will be forwarded to real socket once available
    username,
    roomId,
    appendLocal: (msg) => appendMessage(chatBoxEl, msg, userColor),
  });

  // UI explorer
  const explorer = buildFileExplorer({
    state,
    onSwitch: (name) => {
      state.setActive(name);
      const f = state.getFile(name);
      if (!f) return;
      if (f.model && monacoLib) {
        editor.setModel(f.model);
        try {
          editor.setValue(f.model.getValue());
        } catch {}
      } else if (editor) {
        editor.setValue(f.content || "");
      }
      explorer.refreshUI();
      flash("Switched to " + name, "info", 850);
    },
    onCreate: () => {
      const modal = $("fileCreateModal");
      if (modal) {
        modal.style.display = "flex";

        // reset inputs
        const nameInput = $("fileNameInput");
        const templatePreview = $("fileTemplatePreview");
        const extSelect = $("fileExtSelect");

        if (nameInput) nameInput.value = "";
        if (extSelect) extSelect.value = ".js";
        if (templatePreview) {
          templatePreview.value = (STARTER_TEMPLATES[".js"] || "").replace(
            "${FILENAME}",
            "file"
          );
        }
        return;
      }

      // fallback if modal missing
      const raw = prompt("New file name (with extension):", "main.js");
      if (!raw) return;
      createFileFallback(raw);
    },

   onDelete: (name) => {
  if (!state.hasFile(name)) return;

  // Prevent deleting the last remaining file
  if (state.files.size === 1) {
    return flash("You must have at least one file.", "error");
  }

  // Optional: confirm dialog
  if (!confirm(`Delete "${name}" ?`)) return;

  // remove locally
  deleteFileLocal(name);

  // pick next active file automatically
  const next = state.files.keys().next().value;
  if (next) state.setActive(next);

  // refresh UI
  explorer.refreshUI();

  // Broadcast delete
  if (realSocket && realSocket.emit) {
    realSocket.emit("file-delete", { roomId, name });
  }

  flash(`Deleted ${name}`, "info", 900);
},

    onRename: (oldName) => {
      const newName = prompt(
        "Rename file (you may change extension):",
        oldName
      );
      if (!newName || newName.trim() === "" || newName.trim() === oldName)
        return;
      const trimmed = newName.trim();
      if (state.hasFile(trimmed))
        return alert("A file with that name already exists.");
      const f = state.getFile(oldName);
      if (!f) return;
      const content =
        f.model && !f.model.isDisposed() ? f.model.getValue() : f.content;
      if (f.model && !f.model.isDisposed())
        try {
          f.model.dispose();
        } catch {}
      state.deleteFile(oldName);
      const lang = extToLang((trimmed.match(/\.\w+$/) || [""])[0]);
      state.addFile({ name: trimmed, language: lang, content, model: null });
      explorer.refreshUI();
      if (state.getActive() === oldName) state.setActive(trimmed);
      if (realSocket && realSocket.emit)
        realSocket.emit("file-rename", { roomId, oldName, newName: trimmed });
    },
  });

  // Monaco init + load server files or fallback
  initMonaco(editorContainer, (ed, mon) => {
    editor = ed;
    monacoLib = mon;
    fitLayout();

    (async () => {
      try {
        const r = await fetch(
          `/api/sessions/${encodeURIComponent(roomId)}/files`,
          { credentials: "include" }
        );
        if (r.ok) {
          const data = await safeJSON(r);
          if (data && Array.isArray(data.files) && data.files.length) {
            data.files.forEach((f) =>
              state.addFile({
                name: f.name,
                language:
                  f.language || extToLang((f.name.match(/\.\w+$/) || [""])[0]),
                content: f.content || "",
                model: null,
              })
            );
            explorer.refreshUI();
            const first = state.files.keys().next();
            if (!first.done) state.setActive(first.value);
            return;
          }
        }
      } catch (_) {}

      try {
        const r2 = await fetch(`/api/sessions/${encodeURIComponent(roomId)}`, {
          credentials: "include",
        });
        if (r2.ok) {
          const d = await safeJSON(r2);
          if (d && d.session) {
            const ses = d.session;
            const filename =
              ses.name && ses.name.endsWith(".js") ? ses.name : "main.js";
            state.files.clear();
            state.addFile({
              name: filename,
              language: ses.language || "javascript",
              content: ses.code || "",
              model: null,
            });
            explorer.refreshUI();
            state.setActive(filename);
            return;
          }
        }
      } catch (_) {}

      createFileLocal(
        "main.js",
        "javascript",
        STARTER_TEMPLATES[".js"].replace("${FILENAME}", "main.js")
      );
    })();

    editor.onDidChangeModelContent(() => {
      const active = state.getActive();
      if (!active || suppressRemote) return;
      const f = state.getFile(active);
      if (!f) return;
      f.content = editor.getValue();
      if (realSocket && realSocket.emit)
        realSocket.emit("file-change", {
          roomId,
          name: active,
          content: f.content,
        });
      if (realSocket && realSocket.emit)
        realSocket.emit("code-change", { roomId, code: f.content });
    });

    // shortcuts
    window.addEventListener("keydown", (e) => {
      const isCmd = e.ctrlKey || e.metaKey;
      if (isCmd && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        saveAllFiles();
      } else if (isCmd && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        $("addFileBtn")?.click();
      }
    });
  });

  // layout helper
  function fitLayout() {
    const header = document.querySelector(".topbar");
    const footer = document.querySelector(".footer") || null;
    const topH = header ? header.getBoundingClientRect().height : 0;
    const footH = footer ? footer.getBoundingClientRect().height : 0;
    const avail = window.innerHeight - topH - footH - 64;
    if (editorWrap) {
      editorWrap.style.height = Math.max(320, avail - 60) + "px";
      try {
        if (editor) editor.layout();
      } catch (e) {}
    }
    const chatCard = $("chatBox") || null;
    if (chatCard) {
      chatCard.style.maxHeight = Math.max(160, Math.floor(avail / 2)) + "px";
      chatCard.style.overflowY = "auto";
    }
  }
  window.addEventListener("resize", () => {
    fitLayout();
    setTimeout(() => editor && editor.layout(), 120);
  });

  // realSocket reference to be set after setup
  let realSocket = null;

  // Now create the actual socket and attach handlers.
  // IMPORTANT: chatSender was created earlier and has access to socketProxy,
  // so chatSender can call socketProxy.registerSentCid(...) even before the real socket exists.
  realSocket = setupSocket(window.io, roomId, username, {
    onParticipants: (list) => renderParticipants(usersListEl, list),

    onChatMessage: (msg) => {
      // ignore own echoed message
      if (chatSender.isOwnMessage && chatSender.isOwnMessage(msg.cid)) return;
      appendMessage(chatBoxEl, msg, userColor);
    },

    onFileList: (payload) => {
      if (!payload || !Array.isArray(payload.files)) return;
      state.files.clear();
      payload.files.forEach((f) =>
        state.addFile({
          name: f.name,
          language:
            f.language || extToLang((f.name.match(/\.\w+$/) || [""])[0]),
          content: f.content || "",
          model: null,
        })
      );
      explorer.refreshUI();
      const first = state.files.keys().next();
      if (!first.done) state.setActive(first.value);
    },

    onFileCreate: ({ name, language, content }) => {
      if (state.hasFile(name)) return;
      state.addFile({
        name,
        language: language || extToLang((name.match(/\.\w+$/) || [""])[0]),
        content: content || "",
        model: null,
      });
      explorer.refreshUI();
    },

    onFileDelete: ({ name }) => {
      if (!state.hasFile(name)) return;
      deleteFileLocal(name);
      explorer.refreshUI();
      const first = state.files.keys().next();
      if (!first.done) state.setActive(first.value);
    },

    onFileRename: ({ oldName, newName }) => {
      if (!state.hasFile(oldName)) return;
      const f = state.getFile(oldName);
      state.deleteFile(oldName);
      f.name = newName;
      f.language = extToLang((newName.match(/\.\w+$/) || [""])[0]);
      f.model = null;
      state.addFile(f);
      explorer.refreshUI();
      if (state.getActive() === oldName) state.setActive(newName);
    },

    onFileChange: ({ name, content }) => {
      const f = state.getFile(name);
      if (!f) return;
      if (f.content === content) return;
      f.content = content;
      if (f.model && !f.model.isDisposed()) {
        suppressRemote = true;
        try {
          f.model.setValue(content);
        } catch {}
        setTimeout(() => (suppressRemote = false), 50);
      }
    },

    onLoadCode: ({ code, language }) => {
      const prefer = state.hasFile("main.js")
        ? "main.js"
        : state.files.keys().next().value || null;
      if (prefer) {
        const f = state.getFile(prefer);
        if (f) {
          f.content = code || f.content || "";
          if (f.model && !f.model.isDisposed()) {
            suppressRemote = true;
            try {
              f.model.setValue(f.content);
            } catch {}
            setTimeout(() => (suppressRemote = false), 60);
          }
          if (!state.getActive()) state.setActive(prefer);
          explorer.refreshUI();
        }
      } else {
        createFileLocal("main.js", language || "javascript", code || "");
      }
    },

    onCodeUpdate: ({ code }) => {
      const active = state.getActive();
      if (!active) return;
      const f = state.getFile(active);
      if (!f) return;
      if (f.content === code) return;
      f.content = code;
      if (f.model && !f.model.isDisposed()) {
        suppressRemote = true;
        try {
          f.model.setValue(code);
        } catch {}
        setTimeout(() => (suppressRemote = false), 50);
      }
    },

    onTyping: ({ from, typing }) => {
      const ti = document.getElementById("typingIndicator");
      if (ti) ti.innerText = typing ? `${from} is typing...` : "";
    },

    onMessage: ({ text, from }) => {
      if (!chatBoxEl) return;
      const sys = el("div");
      sys.className = "chat-system";
      sys.innerText = (from ? `${from}: ` : "") + text;
      chatBoxEl.appendChild(sys);
      chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
    },
  });

  // wire proxy to real socket's registerSentCid if available
  if (realSocket && typeof realSocket.registerSentCid === "function") {
    socketProxy.registerSentCid = (cid) => realSocket.registerSentCid(cid);
  } else {
    // if realSocket doesn't implement registerSentCid, create one that stores cids locally in client
    const localSet = new Set();
    socketProxy.registerSentCid = (cid) => {
      localSet.add(cid);
      setTimeout(() => localSet.delete(cid), 8000);
    };
    // and also expose it on realSocket so the server-side logic (if any) can be used
    if (realSocket) realSocket.registerSentCid = socketProxy.registerSentCid;
  }

  // attach real socket to chatSender in case caller wants access
  chatSender.socket = realSocket;

  /* ------------------ toolbar actions ------------------ */
  if (copyLinkBtn)
    copyLinkBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        flash("Link copied", "success");
      } catch {
        flash("Copy failed", "error");
      }
    };

  if (downloadBtn)
    downloadBtn.onclick = () => {
      const active = state.getActive();
      if (!active) return flash("No active file", "error");
      const f = state.getFile(active);
      const blob = new Blob([f.content || ""], { type: "text/plain" });
      const a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
  if (saveBtn) saveBtn.onclick = () => saveAllFiles();
  if (runBtn)
    runBtn.onclick = () => flash("Run requires server sandbox", "info");

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        const r = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
        const data = await safeJSON(r);
        if (data && data.ok) {
          flash("Logged out", "success");
          setTimeout(() => (location.href = "/login.html"), 700);
        } else flash("Logout failed", "error");
      } catch (_) {
        flash("Logout error", "error");
      }
    };
  }

  /* ------------------ helpers ------------------ */
  function createFileLocal(
    name = "main.js",
    language = "javascript",
    content = ""
  ) {
    const base = name;
    let cand = name,
      i = 1;
    while (state.hasFile(cand))
      cand =
        base.replace(/(\.\w+)?$/, "") +
        "_" +
        i++ +
        (base.match(/\.\w+$/) ? base.match(/\.\w+$/)[0] : "");
    state.addFile({
      name: cand,
      language: extToLang((cand.match(/\.\w+$/) || [""])[0]),
      content,
      model: null,
    });
    explorer.refreshUI();
    state.setActive(cand);
    if (monacoLib) {
      const f = state.getFile(cand);
      createModelIfNeeded(monacoLib, f);
      try {
        editor.setModel(f.model);
        editor.setValue(f.model.getValue());
      } catch {}
    }
  }

  function createFileFallback(raw) {
    let fname = raw.trim();
    if (!/\.\w+$/.test(fname)) fname += ".js";

    const ext = (fname.match(/\.\w+$/) || [""])[0];
    const template = (STARTER_TEMPLATES[ext] || "").replace(
      "${FILENAME}",
      fname
    );

    createFileLocal(fname, extToLang(ext), template);

    if (realSocket && realSocket.emit) {
      realSocket.emit("file-create", {
        roomId,
        name: fname,
        language: extToLang(ext),
        content: template,
      });
    }
  }

function deleteFileLocal(name) {
  const f = state.getFile(name);

  // dispose monaco model cleanly
  if (f && f.model && !f.model.isDisposed()) {
    try {
      f.model.dispose();
    } catch {}
  }

  // remove from state
  state.deleteFile(name);
}


  async function saveAllFiles() {
    const payloadFiles = Array.from(state.files.values()).map((f) => ({
      name: f.name,
      language: f.language,
      content: f.content,
    }));
    try {
      const r = await fetch(
        `/api/sessions/${encodeURIComponent(roomId)}/files`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ files: payloadFiles }),
        }
      );
      if (r.ok) {
        flash("Saved", "success", 900);
        return;
      }
    } catch (e) {}
    try {
      const active = state.getActive() || state.files.keys().next().value;
      const content =
        active && state.getFile(active) && state.getFile(active).content
          ? state.getFile(active).content
          : "";
      const r2 = await fetch(`/api/sessions/${encodeURIComponent(roomId)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: content }),
      });
      if (r2.ok) {
        flash("Saved (fallback)", "success", 900);
        return;
      }
      flash("Save failed", "error");
    } catch (e) {
      flash("Save failed", "error");
    }
  }

  // cleanup on leave
  window.addEventListener("beforeunload", () => {
    if (realSocket && realSocket.connected) {
      try {
        realSocket.emit("leave-room", { roomId });
      } catch {}
    }
  });

  // debugging
  window.__codecollab = {
    state,
    createFileLocal,
    deleteFileLocal,
    saveAllFiles,
    chatSender,
    socket: realSocket,
  };

  // final layout
  setTimeout(() => {
    fitLayout();
    try {
      if (editor) editor.layout();
    } catch {}
  }, 80);
}
