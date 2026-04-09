<script lang="ts">
  import { onMount } from "svelte";
  import { CanvasContainer, createAnimationLoop } from "../../lib/canvas";
  import { CameraCapture } from "../../lib/media";
  import { ControlBar } from "../../lib/ui";

  let camera: CameraCapture;
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext;

  const loop = createAnimationLoop((_dt) => {
    if (!gl || !camera.ready) return;
    // TODO: render webcam through CRT shader
  });

  function handleCanvas(c: HTMLCanvasElement) {
    canvas = c;
    const ctx = c.getContext("webgl", { alpha: false });
    if (!ctx) throw new Error("WebGL not supported");
    gl = ctx;
    camera = new CameraCapture();
    loop.start();
    enableCamera();
  }

  function handleResize(_width: number, _height: number) {
    if (gl) gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  onMount(() => {
    return () => {
      loop.stop();
      camera?.destroy();
    };
  });

  async function enableCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      await camera.start(stream);
    } catch (e) {
      console.warn("Camera access denied:", e);
    }
  }
</script>

<CanvasContainer oncanvas={handleCanvas} onresize={handleResize} />

<ControlBar>
  <button disabled>Settings (coming soon)</button>
</ControlBar>
