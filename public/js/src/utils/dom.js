// utils/dom.js
export const $ = id => document.getElementById(id);

export const el = (tag, props = {}, ...children) => {
  const d = document.createElement(tag);
  Object.assign(d, props);
  for (const c of children) {
    if (typeof c === "string") d.appendChild(document.createTextNode(c));
    else if (c) d.appendChild(c);
  }
  return d;
};

export async function safeJSON(resp) {
  try {
    const t = await resp.text();
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
}

export function flash(msg, type = "info", ms = 1400) {
  const div = el("div");
  div.className = type === "error" ? "alert alert-danger" : "alert alert-" + (type === "success" ? "success" : "info");
  Object.assign(div.style, { position: "fixed", right: "18px", top: "18px", zIndex: 99999, opacity: "1", transition: "opacity .28s" });
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => div.style.opacity = "0", ms);
  setTimeout(() => div.remove(), ms + 300);
}

export function formatTime(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
