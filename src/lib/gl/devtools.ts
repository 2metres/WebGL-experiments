// Load webgl-lint in dev mode — wraps all GL calls with error checking
export async function initWebGLDevtools() {
  if (import.meta.env.DEV) {
    // Use direct path since webgl-lint has no ES module entry
    await import("webgl-lint/webgl-lint.js");
    console.log("[webgl-lint] Active — GL errors will throw");
  }
}
