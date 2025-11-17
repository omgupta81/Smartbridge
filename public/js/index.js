(function () {
  const authButtons = document.getElementById("authButtons");
  const created = document.getElementById("created");
  const createForm = document.getElementById("createForm");
  const createBtn = document.getElementById("createBtn");
  const joinBtn = document.getElementById("joinBtn");
  const roomIdInput = document.getElementById("roomIdInput");
  const nameInput = document.getElementById("name");
  const languageSelect = document.getElementById("language");

  function extractUser(data) {
    if (!data || typeof data !== "object") return null;
    if (data.user) return data.user;
    if (data.data?.user) return data.data.user;
    if (data.profile) return data.profile;
    if (data.username || data.name || data.email || data.id) return data;
    return null;
  }

  async function loadAuth() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });

      let raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

      const user = extractUser(data);

      if (user) {
        const display =
          user.username ||
          user.name ||
          user.email ||
          ("User-" + String(user.id || '').slice(0, 6));

        authButtons.innerHTML = `
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted small">Hi, ${display}</span>
            <button id="logoutBtn" class="btn btn-danger btn-sm">Logout</button>
          </div>
        `;

        document.getElementById("logoutBtn").onclick = async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
          });
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

  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    createBtn.disabled = true;
    created.classList.add("d-none");

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
        created.classList.remove("d-none");
        created.classList.add("alert-success");
        created.innerHTML =
          `Room created successfully — <a href="/room.html?room=${encodeURIComponent(data.session.roomId)}">Open Room</a>`;
      } else {
        created.classList.remove("d-none");
        created.classList.add("alert-danger");
        created.innerText = data.error || "Error creating room.";
      }
    } catch {
      created.classList.remove("d-none");
      created.classList.add("alert-danger");
      created.innerText = "Network error creating room.";
    }

    createBtn.disabled = false;
  });

  joinBtn?.addEventListener("click", () => {
    const id = roomIdInput.value.trim();
    if (!id) return alert("Enter a room ID");
    location.href = "/room.html?room=" + encodeURIComponent(id);
  });

  loadAuth();
})();
