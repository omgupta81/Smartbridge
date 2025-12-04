(function () {
  const authButtons = document.getElementById("authButtons");
  const created = document.getElementById("created");
  const createForm = document.getElementById("createForm");
  const createBtn = document.getElementById("createBtn");
  const joinBtn = document.getElementById("joinBtn");
  const roomIdInput = document.getElementById("roomIdInput");
  const nameInput = document.getElementById("name");
  const languageSelect = document.getElementById("language");

  /** Extract user safely from multiple API structures */
  function extractUser(data) {
    if (!data || typeof data !== "object") return null;
    return (
      data.user ||
      data.data?.user ||
      data.profile ||
      (data.username || data.name || data.email || data.id ? data : null)
    );
  }

  /** Ask guest for name once */
  async function ensureGuestName() {
    const stored = localStorage.getItem("guestName");
    if (stored) return stored;

    let name = "";
    while (!name || name.length < 2) {
      name = prompt("Enter a display name to join the room:");
      if (name === null) return null;
    }

    localStorage.setItem("guestName", name);
    return name;
  }

  /** Load authentication state */
  async function loadAuth() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });

      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}

      const user = extractUser(data);

      if (user) {
        const display =
          user.username ||
          user.name ||
          user.email ||
          `User-${String(user.id || "").slice(0, 6)}`;

        authButtons.innerHTML = `
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted small">Hi, ${display}</span>
            <button id="logoutBtn" class="btn btn-danger btn-sm">Logout</button>
          </div>
        `;

        document.getElementById("logoutBtn").onclick = async () => {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          localStorage.removeItem("guestName"); // cleanup guest name if any
          location.reload();
        };
      } else {
        authButtons.innerHTML = `
          <a href="/login.html" class="btn btn-outline-primary btn-sm me-2">Login</a>
          <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
        `;
      }

    } catch {
      authButtons.innerHTML = `
        <a href="/login.html" class="btn btn-outline-primary btn-sm me-2">Login</a>
        <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
      `;
    }
  }

  /** Create Room */
  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    createBtn.disabled = true;

    created.className = "alert d-none";

    const payload = {
      name: nameInput.value.trim(),
      language: languageSelect.value
    };

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.ok && data.session?.roomId) {
        created.className = "alert alert-success";
        created.innerHTML = `
          Room created successfully — 
          <a href="/room.html?room=${encodeURIComponent(data.session.roomId)}">Open Room</a>
        `;
      } else {
        created.className = "alert alert-danger";
        created.textContent = data.error || "Error creating room.";
      }

      created.classList.remove("d-none");
    } catch {
      created.className = "alert alert-danger";
      created.textContent = "Network error creating room.";
      created.classList.remove("d-none");
    }

    createBtn.disabled = false;
  });

  /** Join Room (with guest support) */
  joinBtn?.addEventListener("click", async () => {
    const id = roomIdInput.value.trim();
    if (!id) return alert("Enter a room ID");

    const guestName = await ensureGuestName();
    const params = new URLSearchParams({ room: id });
    if (guestName) params.append("guest", guestName);

    location.href = `/room.html?${params.toString()}`;
  });

  loadAuth();
})();
