// participants/participants.js

/* ---------------------------------------------------------
   Deterministic Color Generator (Stable Per Username)
--------------------------------------------------------- */
export function userColorHashFn(str = "U") {
  const colors = [
    "#f43f5e", "#f97316", "#f59e0b",
    "#10b981", "#0ea5e9", "#6366f1", "#a855f7"
  ];

  if (!str || typeof str !== "string") return colors[0];

  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);

  return colors[sum % colors.length];
}

/* ---------------------------------------------------------
   Safe Participant Rendering
   - Prevents flicker
   - Gracefully handles offline, empty, or delayed states
--------------------------------------------------------- */
export function renderParticipants(usersListEl, list = []) {
  if (!usersListEl) return;

  // Clean container once
  usersListEl.innerHTML = "";

  // Handle "no participants" case
  if (!Array.isArray(list) || list.length === 0) {
    usersListEl.innerHTML = `
      <li class="text-muted small px-1 py-1">No participants yet</li>
    `;
    updateUserCount(0);
    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach(user => {
    const username = user?.username || user?.name || "Guest";
    const avatarLetter = username[0]?.toUpperCase() || "G";

    // list item
    const li = document.createElement("li");
    li.className = "d-flex align-items-center gap-2 mb-2 px-1";
    li.style.userSelect = "none";

    // avatar
    const avatar = document.createElement("div");
    avatar.textContent = avatarLetter;
    Object.assign(avatar.style, {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      background: userColorHashFn(username),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: "600",
      flexShrink: "0"
    });

    // username label
    const nameEl = document.createElement("span");
    nameEl.textContent = username;
    nameEl.style.fontSize = "14px";
    nameEl.style.fontWeight = "500";
    nameEl.style.color = "#111827";

    li.appendChild(avatar);
    li.appendChild(nameEl);
    frag.appendChild(li);
  });

  usersListEl.appendChild(frag);

  updateUserCount(list.length);
}

/* ---------------------------------------------------------
   UI Count Update Helper
--------------------------------------------------------- */
function updateUserCount(num) {
  const countEl = document.getElementById("usersCount");
  if (!countEl) return;
  countEl.textContent = `${num} user${num !== 1 ? "s" : ""}`;
}
