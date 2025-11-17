// utils/fileTemplates.js
export const STARTER_TEMPLATES = {
  ".js": `// \${FILENAME}\nconsole.log("Hello from JavaScript");\n`,
  ".py": `# \${FILENAME}\nprint("Hello from Python")\n`,
  ".java": `// \${FILENAME}\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Java");\n  }\n}\n`,
  ".cpp": `// \${FILENAME}\n#include <iostream>\nint main(){ std::cout << "Hello C++\\n"; return 0; }\n`,
  ".html": `<!-- \${FILENAME} -->\n<!doctype html>\n<html>\n  <head><meta charset="utf-8"><title>\${FILENAME}</title></head>\n  <body>\n    <h1>Hello HTML</h1>\n  </body>\n</html>\n`,
  ".css": `/* \${FILENAME} */\nbody { font-family: Inter, system-ui, sans-serif; }\n`,
  ".ts": `// \${FILENAME}\nconsole.log("Hello TypeScript");\n`
};

export function extToLang(ext) {
  switch ((ext || "").toLowerCase()) {
    case ".js": return "javascript";
    case ".ts": return "typescript";
    case ".py": return "python";
    case ".java": return "java";
    case ".cpp": case ".cc": case ".cxx": return "cpp";
    case ".html": return "html";
    case ".css": return "css";
    default: return "javascript";
  }
}
