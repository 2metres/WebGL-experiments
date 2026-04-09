import { mount } from "svelte";

import "virtual:uno.css";
import "./app.css";
import Shell from "./Shell.svelte";
import { initWebGLDevtools } from "./lib/gl/devtools";

await initWebGLDevtools();

const app = mount(Shell, {
  target: document.getElementById("app")!,
});

export default app;
