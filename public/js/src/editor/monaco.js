// editor/monaco.js
import { flash } from "../utils/dom.js";
import { extToLang } from "../utils/fileTemplates.js";

/** Prevent multiple Monaco loads */
let monacoLoaded = false;

/**
 * Initialize Monaco Editor
 * @param {HTMLElement} editorContainer
 * @param {Function} onReady callback (editor, monaco)
 */
export async function initMonaco(editorContainer, onReady) {
  if (!editorContainer) {
    console.error("❌ Monaco init failed: editorContainer missing");
    return;
  }

  try {
    // Ensure only one monaco instance loads
    if (!monacoLoaded) {
      require.config({
        paths: {
          vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.46.0/min/vs",
        },
      });
      monacoLoaded = true;
    }

    require(["vs/editor/editor.main"], () => {
      try {
        defineTheme();
      } catch (err) {
        console.warn("⚠ Theme load failed, using default.");
      }

      const editor = monaco.editor.create(editorContainer, {
        value: "// Loading...\n",
        language: "javascript",
        theme: "clean-light",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollbar: { horizontal: "auto", vertical: "auto" },
        smoothScrolling: true,
      });

      if (typeof onReady === "function") {
        onReady(editor, monaco);
      }
    });
  } catch (err) {
    console.error("❌ Monaco init error:", err);
    flash("Editor failed to load", "error");
  }
}

/* ---------------------------------------------------------
   Custom Theme
--------------------------------------------------------- */
function defineTheme() {
  monaco.editor.defineTheme("clean-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "", foreground: "1a1a1a" },
      { token: "keyword", foreground: "0057b8", fontStyle: "bold" },
      { token: "string", foreground: "d6336c" },
      { token: "number", foreground: "2f86c9" },
      { token: "comment", foreground: "6e7b85", fontStyle: "italic" },
      { token: "type", foreground: "8b2bbd", fontStyle: "bold" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1a1a1a",
      "editor.lineHighlightBackground": "#f4f7fb",
      "editorLineNumber.foreground": "#9ca3af",
      "editorCursor.foreground": "#000000",
      "editor.selectionBackground": "#c7d2fe70",
    },
  });
}

/* ---------------------------------------------------------
   Model Creator w/ Safe Fallback & Disposal Protection
--------------------------------------------------------- */
export function createModelIfNeeded(monaco, fileObj) {
  if (!monaco || !fileObj) return null;

  // Reuse existing if valid
  if (fileObj.model && !fileObj.model.isDisposed()) return fileObj.model;

  const language = fileObj.language || extToLang(fileObj.name.replace(/^.*(\.\w+)$/, "$1"));
  const uri = `inmemory:///${encodeURIComponent(fileObj.name)}`;

  try {
    fileObj.model = monaco.editor.createModel(fileObj.content || "", language, monaco.Uri.parse(uri));
  } catch (err) {
    console.warn("⚠ Failed to create model with URI, retrying fallback.", err);

    try {
      fileObj.model = monaco.editor.createModel(fileObj.content || "", language);
    } catch (e2) {
      console.error("❌ Failed to create Monaco model:", e2);
      fileObj.model = null;
    }
  }

  return fileObj.model;
}
