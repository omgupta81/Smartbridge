// ui/modals.js (fixed with create-file event)
import { el } from "../utils/dom.js";
import { STARTER_TEMPLATES } from "../utils/fileTemplates.js";

export function ensureUsernameModal() {
  if (document.getElementById("usernameModal")) return;
  const modal = el("div"); modal.id = "usernameModal";
  Object.assign(modal.style, { position: "fixed", inset: 0, display: "none", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.28)", zIndex: 9998 });
  const box = el("div"); Object.assign(box.style, { width: "380px", padding: "18px", borderRadius: "10px", background: "#fff", boxShadow: "0 8px 30px rgba(2,6,23,0.12)" });
  box.innerHTML = `<h4 style="margin:0 0 8px 0">What's your display name?</h4><p style="margin:0 0 12px;color:#6b7280;font-size:13px">This will appear in chat & presence.</p>`;
  const input = el("input"); input.id = "usernameInput"; input.placeholder = "e.g. Alice";
  Object.assign(input.style, { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e6e9ef", marginBottom: "10px" });
  const row = el("div"); Object.assign(row.style, { display: "flex", justifyContent: "flex-end", gap: "8px" });
  const submit = el("button"); submit.id = "usernameSubmit"; submit.className = "btn btn-primary"; submit.innerText = "Join";
  row.appendChild(submit); box.appendChild(input); box.appendChild(row); modal.appendChild(box); document.body.appendChild(modal);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit.click(); });
}

export function ensureFileModal() {
  if (document.getElementById("fileCreateModal")) return;
  const modal = el("div"); modal.id = "fileCreateModal";
  Object.assign(modal.style, { position: "fixed", inset: 0, display: "none", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.28)", zIndex: 9998 });

  const box = el("div"); Object.assign(box.style, { width: "420px", padding: "18px", borderRadius: "10px", background: "#fff", boxShadow: "0 8px 30px rgba(2,6,23,0.12)" });
  box.innerHTML = `<h4 style="margin:0 0 8px 0">Create new file</h4><p style="margin:0 0 10px;color:#6b7280;font-size:13px">Enter file name (without extension) and choose extension/template.</p>`;

  const nameInput = el("input"); nameInput.id = "fileNameInput"; nameInput.placeholder = "filename (e.g. utils)";
  Object.assign(nameInput.style, { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e6e9ef", marginBottom: "8px" });

  const extRow = el("div"); Object.assign(extRow.style, { display: "flex", gap: "8px", marginBottom: "12px" });
  const extSelect = el("select"); extSelect.id = "fileExtSelect";
  Object.keys(STARTER_TEMPLATES).forEach(ext => extSelect.appendChild(new Option(ext, ext)));
  Object.assign(extSelect.style, { padding: "10px", borderRadius: "8px", border: "1px solid #e6e9ef", width: "100%" });
  extRow.appendChild(extSelect);

  const templatePreview = el("textarea"); templatePreview.id = "fileTemplatePreview";
  Object.assign(templatePreview.style, { width: "100%", height: "96px", marginBottom: "8px", padding: "8px", borderRadius: "6px", border: "1px solid #e6e9ef", resize: "vertical", fontFamily: "monospace", fontSize: "12px" });

  const row = el("div"); Object.assign(row.style, { display: "flex", justifyContent: "flex-end", gap: "8px" });
  const cancel = el("button"); cancel.id = "fileCreateCancel"; cancel.className = "btn btn-outline-secondary"; cancel.innerText = "Cancel";
  const create = el("button"); create.id = "fileCreateSubmit"; create.className = "btn btn-primary"; create.innerText = "Create";
  row.appendChild(cancel); row.appendChild(create);

  box.appendChild(nameInput);
  box.appendChild(extRow);
  box.appendChild(templatePreview);
  box.appendChild(row);
  modal.appendChild(box);
  document.body.appendChild(modal);

  extSelect.addEventListener("change", () => {
    const ext = extSelect.value || ".js";
    templatePreview.value = (STARTER_TEMPLATES[ext] || "").replace(/\$\{\$?\{?FILENAME\}?\}?/g, nameInput.value || "file");
  });
  nameInput.addEventListener("input", () => {
    const ext = extSelect.value || ".js";
    templatePreview.value = (STARTER_TEMPLATES[ext] || "").replace(/\$\{\$?\{?FILENAME\}?\}?/g, nameInput.value || "file");
  });
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") create.click(); });

  cancel.addEventListener("click", () => modal.style.display = "none");

  // ---------------------------------------------
  // FIX: Actually create the file
  // ---------------------------------------------
  create.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) return;

    const ext = extSelect.value || ".js";
    const fullName = name + ext;
    const template = templatePreview.value || "";

    // Dispatch event to main.js
    document.dispatchEvent(new CustomEvent("create-file", {
      detail: { name: fullName, content: template }
    }));

    modal.style.display = "none";
    nameInput.value = "";
  });
}