<script lang="ts">
  import { onMount } from "svelte";
  import { CanvasContainer, createAnimationLoop } from "../../lib/canvas";
  import { AudioCapture, CameraCapture } from "../../lib/media";
  import { createProgram, createQuadVBO, drawQuad } from "../../lib/gl";
  import { ControlBar } from "../../lib/ui";
  import { crtFrag, fullscreenVert } from "./shaders";
  import type { ShaderProgram } from "../../lib/gl";
  import { settingsStore } from "./settingsStore";
  import CrtCameraSettings from "./CrtCameraSettings.svelte";

  let panelOpen = $state(false);
  let camera: CameraCapture;
  let audio: AudioCapture;
  let currentAudioLevel = 0.0;
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
    const s = settingsStore.getState();
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(crtProgram.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
    gl.uniform1i(crtProgram.uniforms["u_texture"], 0);

    gl.uniform2f(crtProgram.uniforms["u_resolution"],
      gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(crtProgram.uniforms["u_scale"], s.scale);
    gl.uniform1f(crtProgram.uniforms["u_warp"], s.warp);
    gl.uniform1f(crtProgram.uniforms["u_minVin"], s.minVin);
    gl.uniform1f(crtProgram.uniforms["u_thin"], s.thin);
    gl.uniform1f(crtProgram.uniforms["u_blur"], s.blur);
    gl.uniform1f(crtProgram.uniforms["u_mask"], s.mask);
    gl.uniform1f(crtProgram.uniforms["u_maskType"], s.maskType);
    gl.uniform1f(crtProgram.uniforms["u_time"], elapsedTime);
    gl.uniform1f(crtProgram.uniforms["u_chromatic"], s.chromatic);
    gl.uniform1f(crtProgram.uniforms["u_noise"], s.noise);
    gl.uniform1f(crtProgram.uniforms["u_noiseShape"], s.noiseShape);
    gl.uniform1f(crtProgram.uniforms["u_trackingScale"], s.trackingScale);
    gl.uniform1f(crtProgram.uniforms["u_trackingGlitch"], s.trackingGlitch);
    gl.uniform1f(crtProgram.uniforms["u_trackingGlitchScale"], s.trackingGlitchScale);
    gl.uniform1f(crtProgram.uniforms["u_trackingSpeed"], s.trackingSpeed);
    const audioBoost = (s.audioReactive && audio?.isActive) ? currentAudioLevel : 0.0;
    gl.uniform1f(crtProgram.uniforms["u_trackingIntensity"], s.trackingIntensity + audioBoost);
    gl.uniform1f(crtProgram.uniforms["u_trackingBlend"], s.trackingBlend);

    const video = camera.videoElement;
    const vw = video ? video.videoWidth || 640 : 640;
    const vh = video ? video.videoHeight || 480 : 480;
    gl.uniform2f(crtProgram.uniforms["u_videoSize"], vw, vh);

    drawQuad(gl, crtProgram, quadVBO);
  }

  const loop = createAnimationLoop((dt) => {
    if (!gl) return;
    elapsedTime += dt;
    if (camera.ready) uploadCameraFrame();
    if (audio?.isActive) {
      audio.updateHistory();
      currentAudioLevel = audio.level;
    }
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
        "u_chromatic", "u_noise", "u_noiseShape", "u_trackingScale", "u_trackingGlitch", "u_trackingGlitchScale", "u_trackingSpeed", "u_trackingIntensity", "u_trackingBlend", "u_videoSize",
      ],
      attributes: ["a_position"],
    });
    quadVBO = createQuadVBO(gl);
    cameraTexture = initCameraTexture();
    camera = new CameraCapture();
    loop.start();
    enableCamera();
  }

  function handleResize(width: number, height: number) {
    if (!gl) return;
    const dpr = window.devicePixelRatio || 1;
    // Fit 4:3 box inside available space
    const targetAspect = 4 / 3;
    let w = width;
    let h = width / targetAspect;
    if (h > height) {
      h = height;
      w = height * targetAspect;
    }
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${Math.round(w)}px`;
    canvas.style.height = `${Math.round(h)}px`;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  onMount(() => {
    return () => {
      loop.stop();
      audio?.destroy();
      camera?.destroy();
      if (cameraTexture && gl) gl.deleteTexture(cameraTexture);
    };
  });

  async function enableCamera() {
    try {
      // Try with audio+video first; fall back to video-only if mic denied
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", width: 640, height: 480 },
        });
        audio = new AudioCapture();
        await audio.start(stream);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        console.warn("Mic access denied — audio-reactive tracking unavailable");
      }
      await camera.start(stream);
    } catch (e) {
      console.warn("Camera access denied:", e);
    }
  }
</script>

<div class="crt-viewport">
  <CanvasContainer oncanvas={handleCanvas} onresize={handleResize} />
</div>

<ControlBar>
  <button onclick={() => (panelOpen = !panelOpen)}>
    {panelOpen ? "Close" : "Settings"}
  </button>
</ControlBar>

{#if panelOpen}
  <CrtCameraSettings />
{/if}

<style>
  .crt-viewport {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
  }
</style>
