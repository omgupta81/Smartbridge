// ui/fileExplorer.js
import { el, $ } from "../utils/dom.js";

export function buildFileExplorer({ state, onSwitch, onCreate, onDelete, onRename }) {
  /* -------------------------------------------------------
     Tabs Bar
  ------------------------------------------------------- */
  let tabsBar = $("tabsBar");
  if (!tabsBar) {
    tabsBar = el("div");
    tabsBar.id = "tabsBar";
    Object.assign(tabsBar.style, {
      display: "flex",
      gap: "8px",
      padding: "8px",
      flexWrap: "wrap"
    });

    const editorWrap = $("editorWrap");
    if (editorWrap) editorWrap.parentElement.insertBefore(tabsBar, editorWrap);
    else document.body.prepend(tabsBar);
  }

  /* -------------------------------------------------------
     File List / Sidebar
  ------------------------------------------------------- */
  let fileListEl = $("fileList");
  if (!fileListEl) {
    const sidebarBlock = el("div");
    sidebarBlock.id = "fileSidebar";
    Object.assign(sidebarBlock.style, {
      marginBottom: "12px"
    });

    sidebarBlock.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>Files</strong>
        <div id="fileActions"></div>
      </div>
      <ul id="fileList" style="list-style:none;padding:0;margin:0"></ul>
    `;

    const rightCol = document.querySelector(".col-lg-3");
    if (rightCol) rightCol.prepend(sidebarBlock);
    else document.body.prepend(sidebarBlock);

    fileListEl = $("fileList");

    const fileActions = $("fileActions");
    if (!$("addFileBtn")) {
      const btn = el("button");
      btn.id = "addFileBtn";
      btn.className = "btn btn-sm btn-primary";
      btn.innerText = "+ New";
      fileActions.appendChild(btn);
    }
  }

  const addBtn =
    $("addFileBtn") ||
    ($("fileActions") && $("fileActions").querySelector("button"));

  /* -------------------------------------------------------
     Add Tab
  ------------------------------------------------------- */
  function addTab(name) {
    if (tabsBar.querySelector(`[data-file="${CSS.escape(name)}"]`)) return;

    const btn = el("button");
    btn.className = "btn btn-sm btn-outline-secondary";
    btn.dataset.file = name;
    btn.innerText = name;

    Object.assign(btn.style, {
      borderRadius: "8px",
      padding: "6px 10px",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px"
    });

    btn.onclick = () => onSwitch(name);
    btn.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      onRename(name);
    });

    const close = el("span");
    close.innerText = " ×";
    Object.assign(close.style, {
      marginLeft: "8px",
      cursor: "pointer"
    });

    close.onclick = (e) => {
      e.stopPropagation();
      if (!confirm("Delete " + name + "?")) return;
      onDelete(name);
    };

    btn.appendChild(close);
    tabsBar.appendChild(btn);
  }

  /* -------------------------------------------------------
     Refresh UI (tabs + list)
  ------------------------------------------------------- */
  function refreshUI() {
    // refresh sidebar list
    if (fileListEl) fileListEl.innerHTML = "";

    for (const f of state.listFiles()) {
      const li = el("li");
      Object.assign(li.style, {
        padding: "6px 8px",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      });

      li.dataset.file = f.name;

      const text = el("span");
      text.innerText = f.name;
      li.appendChild(text);

      li.onclick = () => onSwitch(f.name);

      li.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        onRename(f.name);
      });

      const del = el("button");
      del.className = "btn btn-sm btn-outline-secondary";
      del.innerText = "Delete";
      del.style.marginLeft = "8px";

      del.onclick = (e) => {
        e.stopPropagation();
        if (!confirm("Delete " + f.name + "?")) return;
        onDelete(f.name);
      };

      if (f.name === state.getActive()) {
        li.style.background = "#e6f0ff";
        text.style.fontWeight = "700";
      }

      li.appendChild(del);
      fileListEl.appendChild(li);
    }

    // refresh tabs
    Array.from(tabsBar.children).forEach((ch) => {
      const fname = ch.dataset && ch.dataset.file;
      if (!fname || !state.hasFile(fname)) ch.remove();
    });

    for (const name of state.files.keys()) addTab(name);
  }

  /* -------------------------------------------------------
     "New File" button handler → calls onCreate()
  ------------------------------------------------------- */
  if (addBtn) addBtn.onclick = () => onCreate();

  return { refreshUI, addTab };
}
