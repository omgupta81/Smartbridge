// editor/monaco.js
import { flash } from "../utils/dom.js";
import { extToLang } from "../utils/fileTemplates.js";

export async function initMonaco(editorContainer, onReady) {
  try {
    require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.46.0/min/vs" } });
    require(["vs/editor/editor.main"], () => {
      monaco.editor.defineTheme("clean-light", {
        base: "vs", inherit: true,
        rules: [
          { token: "", foreground: "1a1a1a" },
          { token: "keyword", foreground: "0057b8", fontStyle: "bold" },
          { token: "string", foreground: "d6336c" },
          { token: "number", foreground: "2f86c9" },
          { token: "comment", foreground: "6e7b85", fontStyle: "italic" },
          { token: "type", foreground: "8b2bbd", fontStyle: "bold" }
        ],
        colors: {
          "editor.background": "#ffffff",
          "editor.foreground": "#1a1a1a",
          "editor.lineHighlightBackground": "#f4f7fb",
          "editorLineNumber.foreground": "#9ca3af",
          "editorCursor.foreground": "#000000",
          "editor.selectionBackground": "#c7d2fe70"
        }
      });

      const editor = monaco.editor.create(editorContainer, {
        value: "// Loading...\n",
        language: "javascript",
        theme: "clean-light",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14
      });

      onReady && onReady(editor, monaco);
    });
  } catch (err) {
    console.error("Monaco init error", err);
    flash("Editor failed to load", "error");
  }
}

export function createModelIfNeeded(monaco, f) {
  if (!monaco) return null;
  if (f.model && !f.model.isDisposed()) return f.model;
  const lang = f.language || extToLang((f.name.match(/\.\w+$/) || [""])[0]);
  try {
    f.model = monaco.editor.createModel(f.content || "", lang, monaco.Uri.parse("inmemory:///" + encodeURIComponent(f.name)));
  } catch {
    try { f.model = monaco.editor.createModel(f.content || "", lang); } catch { f.model = null; }
  }
  return f.model;
}
