// participants/participants.js

/* ---------------------------------------------------------
   Stable deterministic color generator
--------------------------------------------------------- */
export function userColorHashFn(str = "U") {
  const colors = [
    "#f43f5e", "#f97316", "#f59e0b",
    "#10b981", "#0ea5e9", "#6366f1", "#a855f7"
  ];

  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);

  return colors[sum % colors.length];
}

/* ---------------------------------------------------------
   Smooth safer participant rendering
--------------------------------------------------------- */
export function renderParticipants(usersListEl, list = []) {
  if (!usersListEl) return;

  // Clear once, avoid flicker
  usersListEl.innerHTML = "";

  const frag = document.createDocumentFragment();

  list.forEach(u => {
    const username = u.username || u.name || "Unknown";
    const avatarLetter = username[0]?.toUpperCase() || "U";

    // li
    const li = document.createElement("li");
    li.className = "d-flex align-items-center gap-2 mb-2";
    li.style.userSelect = "none";

    // avatar
    const avatar = document.createElement("div");
    avatar.textContent = avatarLetter;
    Object.assign(avatar.style, {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      background: userColorHashFn(username),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: "700",
      flexShrink: "0",
      fontSize: "16px",
      letterSpacing: "0.5px"
    });

    // name text
    const text = document.createElement("span");
    text.textContent = username;
    text.style.fontSize = "14px";
    text.style.fontWeight = "500";
    text.style.color = "#111827";

    li.appendChild(avatar);
    li.appendChild(text);
    frag.appendChild(li);
  });

  usersListEl.appendChild(frag);

  // Update count
  const countEl = document.getElementById("usersCount");
  if (countEl) {
    countEl.textContent = `${list.length} user${list.length !== 1 ? "s" : ""}`;
  }
}

