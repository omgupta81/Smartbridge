// state/files.js

export function makeFileState() {
  const files = new Map();
  let activeFile = null;

  /* ---------------------------------------------------------
     Add file safely (auto-track active file if none exists)
  --------------------------------------------------------- */
  function addFile(file) {
    if (!file || !file.name) {
      console.warn("❌ Attempted to add invalid file:", file);
      return false;
    }

    const name = String(file.name).trim();
    if (!name) return false;

    if (files.has(name)) {
      console.warn(`⚠ File already exists: "${name}"`);
      return false;
    }

    files.set(name, file);

    // If no active file exists, make this one active
    if (!activeFile) activeFile = name;

    return true;
  }

  /* ---------------------------------------------------------
     Retrieval helpers
  --------------------------------------------------------- */
  const getFile = (name) => files.get(name) || null;
  const hasFile = (name) => files.has(name);
  const listFiles = () => Array.from(files.values());

  /* ---------------------------------------------------------
     Delete file safely and maintain valid active file
  --------------------------------------------------------- */
  function deleteFile(name) {
    if (!files.has(name)) return false;

    files.delete(name);

    // If deleting active file → fallback to first available file
    if (activeFile === name) {
      const next = files.keys().next();
      activeFile = !next.done ? next.value : null;
    }

    return true;
  }

  /* ---------------------------------------------------------
     Active file helpers with validation
  --------------------------------------------------------- */
  function setActive(name) {
    if (!files.has(name)) {
      console.warn(`⚠ Cannot activate missing file: "${name}"`);
      return false;
    }
    activeFile = name;
    return true;
  }

  const getActive = () => activeFile;

  /* ---------------------------------------------------------
     Public state API
  --------------------------------------------------------- */
  return {
    files,
    addFile,
    deleteFile,
    getFile,
    hasFile,
    listFiles,
    setActive,
    getActive
  };
}
