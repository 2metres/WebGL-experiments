export async function initWebGLDevtools() {
  if (import.meta.env.DEV && import.meta.env.VITE_WEBGL_LINT) {
    await import('webgl-lint');
    console.log('[webgl-lint] Active — GL errors will throw');
  }
}
