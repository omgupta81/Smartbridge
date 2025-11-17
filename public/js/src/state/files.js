// state/files.js
export function makeFileState() {
  const files = new Map();
  let activeFile = null;

  function addFile(f) { files.set(f.name, f); }
  function getFile(name) { return files.get(name); }
  function hasFile(name) { return files.has(name); }
  function deleteFile(name) { files.delete(name); if (activeFile === name) activeFile = null; }
  function listFiles() { return Array.from(files.values()); }
  function setActive(name) { activeFile = name; }
  function getActive() { return activeFile; }

  return { files, addFile, getFile, hasFile, deleteFile, listFiles, setActive, getActive };
}
