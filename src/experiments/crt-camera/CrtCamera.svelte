<script lang="ts">
  import { onMount } from "svelte";
  import { CanvasContainer, createAnimationLoop } from "../../lib/canvas";
  import { CameraCapture } from "../../lib/media";
  import { createProgram, createQuadVBO, drawQuad } from "../../lib/gl";
  import { ControlBar } from "../../lib/ui";
  import { crtFrag, fullscreenVert } from "./shaders";
  import type { ShaderProgram } from "../../lib/gl";

  let camera: CameraCapture;
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext;
  let cameraTexture: WebGLTexture | null = null;
  let crtProgram: ShaderProgram;
  let quadVBO: WebGLBuffer;
  let elapsedTime = 0;

  function initCameraTexture(): WebGLTexture {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  function uploadCameraFrame() {
    if (!camera.ready || !camera.videoElement || !cameraTexture) return;
    gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, camera.videoElement);
  }

  function render() {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(crtProgram.program);

    // Bind webcam texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
    gl.uniform1i(crtProgram.uniforms["u_texture"], 0);

    // Set uniforms
    gl.uniform2f(crtProgram.uniforms["u_resolution"],
      gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(crtProgram.uniforms["u_scale"], 0.33333);
    gl.uniform1f(crtProgram.uniforms["u_warp"], 1.0);
    gl.uniform1f(crtProgram.uniforms["u_minVin"], 0.5);
    gl.uniform1f(crtProgram.uniforms["u_thin"], 0.75);
    gl.uniform1f(crtProgram.uniforms["u_blur"], -2.75);
    gl.uniform1f(crtProgram.uniforms["u_mask"], 0.65);
    gl.uniform1f(crtProgram.uniforms["u_maskType"], 0.0);
    gl.uniform1f(crtProgram.uniforms["u_time"], elapsedTime);

    drawQuad(gl, crtProgram, quadVBO);
  }

  const loop = createAnimationLoop((dt) => {
    if (!gl) return;
    elapsedTime += dt;
    if (camera.ready) uploadCameraFrame();
    render();
  });

  function handleCanvas(c: HTMLCanvasElement) {
    canvas = c;
    const ctx = c.getContext("webgl", { alpha: false });
    if (!ctx) throw new Error("WebGL not supported");
    gl = ctx;

    crtProgram = createProgram(gl, fullscreenVert, crtFrag, {
      uniforms: [
        "u_texture", "u_resolution", "u_scale", "u_warp",
        "u_minVin", "u_thin", "u_blur", "u_mask", "u_maskType", "u_time",
      ],
      attributes: ["a_position"],
    });
    quadVBO = createQuadVBO(gl);
    cameraTexture = initCameraTexture();
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
      if (cameraTexture && gl) gl.deleteTexture(cameraTexture);
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
