import {
  arrowsFrag,
  arrowsVert,
  cameraSeqUpdateFrag,
  diffuseFrag,
  motionDetectFrag,
  velocityUpdateFrag,
  velocityUpdateVert,
} from "./shaders";
import { TriggerGrid } from "./TriggerGrid";
import {
  createProgram,
  createFBO,
  createQuadVBO,
  PingPongFBOs,
} from "../../lib/gl";
import type { FBOHandle, ShaderProgram } from "../../lib/gl";

export interface SimSettings {
  cameraStrength: number;
  audioBoostMin: number;
  audioBoostMax: number;
  velocityDecay: number;
  cameraVelocityDecay: number;
  triggerDecay: number;
  diffusion: number;
  motionThreshold: number;
}

export class WindSimulation {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;

  renderMode = 0; // 0=arrows, 1=digits

  settings: SimSettings = {
    cameraStrength: 25,
    audioBoostMin: 0.05,
    audioBoostMax: 8,
    velocityDecay: 0.99,
    cameraVelocityDecay: 0.9,
    triggerDecay: 0.999,
    diffusion: 0.15,
    motionThreshold: 2,
  };

  // Programs
  private arrowProgram!: ShaderProgram;
  private velocityProgram!: ShaderProgram;
  private diffuseProgram!: ShaderProgram;
  private motionDetectProgram!: ShaderProgram;
  private cameraSeqProgram!: ShaderProgram;

  // Velocity field ping-pong textures
  private velocityFBOs!: PingPongFBOs;

  // Grid
  private gridCols = 64;
  private gridRows = 48;
  private gridSpacing = 18;
  private fieldSize = 256;

  // Buffers
  private arrowVBO!: WebGLBuffer;
  private gridVBO!: WebGLBuffer;
  private quadVBO!: WebGLBuffer;
  private arrowVertexCount = 0;
  private digitVBO!: WebGLBuffer;
  private digitAtlasTexture!: WebGLTexture;
  private lineAtlasTexture!: WebGLTexture;
  private gridInstanceCount = 0;

  // Mouse state
  private mousePos = [0.5, 0.5];
  private mouseVel = [0, 0];
  private mouseActive = false;
  private lastMousePos = [0.5, 0.5];
  private lastMouseTime = 0;

  // Audio
  private audioHistoryTexture!: WebGLTexture;
  private audioActive = false;
  private currentAudioLevel = 0;

  // Trigger grid
  private triggerGrid = new TriggerGrid();
  private triggerMapTexture!: WebGLTexture;
  private hasTriggers = false;
  private prevGridCol = -1;
  private prevGridRow = -1;
  private prevDirX = 0;
  private prevDirY = 0;
  private strokeHasDirection = false;

  // Camera motion detection
  private cameraTextures: WebGLTexture[] = [];
  private currentCameraTexture = 0;
  private motionVectorFBO!: FBOHandle;
  private cameraSeqFBOs: FBOHandle[] = [];
  private currentCameraSeq = 0;
  private cameraSeqCounter = 0;
  private cameraActive = false;
  private cameraCanvas: HTMLCanvasElement;
  private cameraCtx: CanvasRenderingContext2D;

  // Time
  private time = 0;

  // Extension
  private instancedArraysExt: ANGLE_instanced_arrays | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    this.instancedArraysExt = gl.getExtension("ANGLE_instanced_arrays");
    if (!this.instancedArraysExt) {
      throw new Error("ANGLE_instanced_arrays not supported");
    }

    // Offscreen canvas for downscaling + mirroring camera frames to fieldSize
    this.cameraCanvas = document.createElement("canvas");
    this.cameraCanvas.width = this.fieldSize;
    this.cameraCanvas.height = this.fieldSize;
    this.cameraCtx = this.cameraCanvas.getContext("2d")!;

    this.init();
  }

  private init() {
    const gl = this.gl;

    this.arrowProgram = createProgram(gl, arrowsVert, arrowsFrag, {
      uniforms: [
        "u_resolution",
        "u_velocityField",
        "u_triggerMap",
        "u_cameraSeqMap",
        "u_audioHistory",
        "u_audioActive",
        "u_hasTriggers",
        "u_hasCameraSeq",
        "u_maxSequenceIndex",
        "u_maxCameraSeqIndex",
        "u_time",
        "u_arrowScale",
        "u_cellSize",
        "u_renderMode",
        "u_digitAtlas",
        "u_atlasCells",
      ],
      attributes: ["a_position", "a_vertex"],
    });

    this.velocityProgram = createProgram(gl, velocityUpdateVert, velocityUpdateFrag, {
      uniforms: [
        "u_prevVelocity",
        "u_mousePos",
        "u_mouseVel",
        "u_mouseActive",
        "u_decay",
        "u_radius",
        "u_dt",
        "u_cameraMotion",
        "u_cameraActive",
        "u_cameraStrength",
        "u_audioLevel",
        "u_audioBoostMin",
        "u_audioBoostMax",
      ],
      attributes: ["a_position"],
    });

    this.diffuseProgram = createProgram(gl, velocityUpdateVert, diffuseFrag, {
      uniforms: ["u_velocity", "u_texelSize", "u_diffusion"],
      attributes: ["a_position"],
    });

    this.motionDetectProgram = createProgram(gl, velocityUpdateVert, motionDetectFrag, {
      uniforms: ["u_currentFrame", "u_prevFrame"],
      attributes: ["a_position"],
    });

    this.cameraSeqProgram = createProgram(gl, velocityUpdateVert, cameraSeqUpdateFrag, {
      uniforms: [
        "u_prevSeq",
        "u_motionVec",
        "u_seqCounterHigh",
        "u_seqCounterLow",
        "u_triggerDecay",
        "u_motionThreshold",
      ],
      attributes: ["a_position"],
    });

    // Velocity FBOs (ping-pong)
    const initSize = this.fieldSize * this.fieldSize * 4;
    const initData = new Uint8Array(initSize);
    for (let i = 0; i < initSize; i += 4) {
      initData[i] = 128;
      initData[i + 1] = 128;
      initData[i + 2] = 0;
      initData[i + 3] = 255;
    }
    this.velocityFBOs = new PingPongFBOs(gl, this.fieldSize, this.fieldSize, initData);

    // Trigger map texture
    this.triggerMapTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.triggerMapTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.fieldSize,
      this.fieldSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Audio history texture (256x1, LUMINANCE)
    this.audioHistoryTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.audioHistoryTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      256,
      1,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Camera ping-pong textures (256x256 RGBA)
    for (let i = 0; i < 2; i++) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        this.fieldSize,
        this.fieldSize,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.cameraTextures.push(tex);
    }

    // Motion vector FBO (256x256 RGBA)
    this.motionVectorFBO = createFBO(gl, this.fieldSize, this.fieldSize);

    // Camera sequence ping-pong FBOs (256x256 RGBA)
    for (let i = 0; i < 2; i++) {
      this.cameraSeqFBOs.push(createFBO(gl, this.fieldSize, this.fieldSize));
    }

    this.createArrowGeometry();
    this.createDigitGeometry();
    this.createDigitAtlas();
    this.createLineAtlas();
    this.createGridPositions();

    this.quadVBO = createQuadVBO(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private createArrowGeometry() {
    const gl = this.gl;
    const vertices = new Float32Array([
      0.5, 0.0, -0.5, 0.22, -0.25, 0.0, 0.5, 0.0, -0.25, 0.0, -0.5, -0.22,
    ]);
    this.arrowVertexCount = 6;
    this.arrowVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.arrowVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  private createDigitGeometry() {
    // Quad from -0.5..0.5 (same scale as arrow), no rotation applied
    const gl = this.gl;
    const s = 0.5;
    const vertices = new Float32Array([
      -s,
      -s,
      s,
      -s,
      -s,
      s,
      -s,
      s,
      s,
      -s,
      s,
      s,
    ]);
    this.digitVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.digitVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  private createDigitAtlas() {
    const gl = this.gl;
    const cellSize = 64;
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = cellSize * 10;
    atlasCanvas.height = cellSize;
    const ctx = atlasCanvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${cellSize * 0.75}px monospace`;
    for (let i = 0; i < 10; i++) {
      ctx.fillText(String(i), cellSize * i + cellSize / 2, cellSize / 2);
    }
    this.digitAtlasTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.digitAtlasTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      atlasCanvas,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private createLineAtlas() {
    // 8 cells mapping to 4 unique box-drawing glyphs: ─ ╱ │ ╲ ─ ╱ │ ╲
    // Sectors from -π: left(─), down-left(╲), down(│), down-right(╱), right(─), up-right(╱... wait
    // Actually: sectors 0-7 map angles [-π..π] in order
    // We draw the line chars directly on canvas for crisp rendering
    const gl = this.gl;
    const cellSize = 64;
    const numCells = 8;
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = cellSize * numCells;
    atlasCanvas.height = cellSize;
    const ctx = atlasCanvas.getContext("2d")!;
    ctx.strokeStyle = "white";
    ctx.lineCap = "round";
    ctx.lineWidth = 5;

    // Glyphs: ─  ╲  │  ╱  ─  ╲  │  ╱
    // Angles from atan: sector 0 = left, 1 = down-left, 2 = down, 3 = down-right,
    //                    4 = right, 5 = up-right, 6 = up, 7 = up-left
    const glyphs = [
      [0, 0.5, 1, 0.5], // ─ horizontal (left)
      [0, 0, 1, 1], // ╲ diagonal (down-left)
      [0.5, 0, 0.5, 1], // │ vertical (down)
      [1, 0, 0, 1], // ╱ diagonal (down-right)
      [0, 0.5, 1, 0.5], // ─ horizontal (right)
      [1, 0, 0, 1], // ╱ diagonal (up-right)
      [0.5, 0, 0.5, 1], // │ vertical (up)
      [0, 0, 1, 1], // ╲ diagonal (up-left)
    ];
    const pad = 0.15;
    for (let i = 0; i < numCells; i++) {
      const ox = cellSize * i;
      const [x1, y1, x2, y2] = glyphs[i];
      ctx.beginPath();
      ctx.moveTo(
        ox + (pad + x1 * (1 - 2 * pad)) * cellSize,
        (pad + y1 * (1 - 2 * pad)) * cellSize,
      );
      ctx.lineTo(
        ox + (pad + x2 * (1 - 2 * pad)) * cellSize,
        (pad + y2 * (1 - 2 * pad)) * cellSize,
      );
      ctx.stroke();
    }

    this.lineAtlasTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.lineAtlasTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      atlasCanvas,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private createGridPositions() {
    const gl = this.gl;
    const positions: number[] = [];
    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const px = ((x + 0.5) / this.gridCols) * 2.0 - 1.0;
        const py = ((y + 0.5) / this.gridRows) * 2.0 - 1.0;
        positions.push(px, py);
      }
    }
    this.gridInstanceCount = this.gridCols * this.gridRows;
    this.gridVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  }

  // --- Public API ---

  onMouseMove(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const nx = (x - rect.left) / rect.width;
    const ny = 1.0 - (y - rect.top) / rect.height;

    const now = performance.now();
    const dt = Math.max(now - this.lastMouseTime, 1) / 1000;

    if (this.mouseActive) {
      this.mouseVel[0] = (nx - this.lastMousePos[0]) / dt;
      this.mouseVel[1] = (ny - this.lastMousePos[1]) / dt;
    }

    // Arm trigger grid cells along the stroke
    const col = Math.max(0, Math.min(255, Math.floor(nx * 256)));
    const row = Math.max(0, Math.min(255, Math.floor(ny * 256)));
    if (this.prevGridCol >= 0) {
      const dx = col - this.prevGridCol;
      const dy = row - this.prevGridRow;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0.5) {
        this.prevDirX = dx / len;
        this.prevDirY = dy / len;
        this.strokeHasDirection = true;
      }
      if (this.strokeHasDirection) {
        this.triggerGrid.armLine(
          this.prevGridCol,
          this.prevGridRow,
          col,
          row,
          this.prevDirX,
          this.prevDirY,
        );
        this.bakeTriggerMap();
        this.hasTriggers = true;
      }
    }
    this.prevGridCol = col;
    this.prevGridRow = row;

    this.mousePos[0] = nx;
    this.mousePos[1] = ny;
    this.lastMousePos[0] = nx;
    this.lastMousePos[1] = ny;
    this.lastMouseTime = now;
    this.mouseActive = true;
  }

  onMouseLeave() {
    this.mouseActive = false;
    this.mouseVel[0] = 0;
    this.mouseVel[1] = 0;
  }

  startNewStroke() {
    this.prevGridCol = -1;
    this.prevGridRow = -1;
    this.strokeHasDirection = false;
  }

  clearTriggers() {
    this.triggerGrid.clear();
    this.hasTriggers = false;
    const gl = this.gl;
    const emptyData = new Uint8Array(this.fieldSize * this.fieldSize * 4);
    gl.bindTexture(gl.TEXTURE_2D, this.triggerMapTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.fieldSize,
      this.fieldSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      emptyData,
    );
    this.prevGridCol = -1;
    this.prevGridRow = -1;
    this.strokeHasDirection = false;
  }

  private bakeTriggerMap() {
    const gl = this.gl;
    const data = this.triggerGrid.bakeTexture(this.fieldSize, this.fieldSize);
    gl.bindTexture(gl.TEXTURE_2D, this.triggerMapTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.fieldSize,
      this.fieldSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
  }

  setAudioHistory(data: Uint8Array) {
    const gl = this.gl;
    this.audioActive = true;
    this.currentAudioLevel = data[0] / 255;
    gl.bindTexture(gl.TEXTURE_2D, this.audioHistoryTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      256,
      1,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      data,
    );
  }

  setCameraFrame(video: HTMLVideoElement) {
    const gl = this.gl;
    const size = this.fieldSize;
    this.cameraActive = true;
    // Downscale + mirror horizontally (user-facing camera) to fieldSize x fieldSize
    const ctx = this.cameraCtx;
    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, size, size);
    ctx.restore();
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.cameraTextures[this.currentCameraTexture],
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.cameraCanvas,
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
    const cols = Math.max(4, Math.round(width / this.gridSpacing));
    const rows = Math.max(4, Math.round(height / this.gridSpacing));
    if (cols !== this.gridCols || rows !== this.gridRows) {
      this.gridCols = cols;
      this.gridRows = rows;
      this.createGridPositions();
    }
  }

  update(dt: number) {
    const gl = this.gl;
    const ext = this.instancedArraysExt!;

    this.time += dt;

    // --- Step 0: Motion detection (if camera active) ---
    if (this.cameraActive) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.motionVectorFBO.fbo);
      gl.viewport(0, 0, this.fieldSize, this.fieldSize);
      gl.disable(gl.BLEND);

      gl.useProgram(this.motionDetectProgram.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(
        gl.TEXTURE_2D,
        this.cameraTextures[this.currentCameraTexture],
      );
      gl.uniform1i(this.motionDetectProgram.uniforms.u_currentFrame, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(
        gl.TEXTURE_2D,
        this.cameraTextures[1 - this.currentCameraTexture],
      );
      gl.uniform1i(this.motionDetectProgram.uniforms.u_prevFrame, 1);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
      gl.enableVertexAttribArray(
        this.motionDetectProgram.attributes.a_position,
      );
      gl.vertexAttribPointer(
        this.motionDetectProgram.attributes.a_position,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // --- Step 0b: Update camera sequence map ---
      this.cameraSeqCounter++;
      const seqHigh = Math.floor(this.cameraSeqCounter / 256) & 0xff;
      const seqLow = this.cameraSeqCounter & 0xff;

      const writeSeq = this.cameraSeqFBOs[1 - this.currentCameraSeq];
      const readSeq = this.cameraSeqFBOs[this.currentCameraSeq];

      gl.bindFramebuffer(gl.FRAMEBUFFER, writeSeq.fbo);
      gl.useProgram(this.cameraSeqProgram.program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readSeq.texture);
      gl.uniform1i(this.cameraSeqProgram.uniforms.u_prevSeq, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.motionVectorFBO.texture);
      gl.uniform1i(this.cameraSeqProgram.uniforms.u_motionVec, 1);

      gl.uniform1f(
        this.cameraSeqProgram.uniforms.u_seqCounterHigh,
        seqHigh / 255,
      );
      gl.uniform1f(
        this.cameraSeqProgram.uniforms.u_seqCounterLow,
        seqLow / 255,
      );
      gl.uniform1f(
        this.cameraSeqProgram.uniforms.u_triggerDecay,
        this.settings.triggerDecay,
      );
      gl.uniform1f(
        this.cameraSeqProgram.uniforms.u_motionThreshold,
        this.settings.motionThreshold,
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
      gl.enableVertexAttribArray(this.cameraSeqProgram.attributes.a_position);
      gl.vertexAttribPointer(
        this.cameraSeqProgram.attributes.a_position,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      this.currentCameraSeq = 1 - this.currentCameraSeq;

      // Swap camera ping-pong
      this.currentCameraTexture = 1 - this.currentCameraTexture;
    }

    // --- Step 1: Update velocity field ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFBOs.write.fbo);
    gl.viewport(0, 0, this.fieldSize, this.fieldSize);
    gl.disable(gl.BLEND);

    gl.useProgram(this.velocityProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFBOs.read.texture);
    gl.uniform1i(this.velocityProgram.uniforms.u_prevVelocity, 0);

    // Camera motion texture on unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.motionVectorFBO.texture);
    gl.uniform1i(this.velocityProgram.uniforms.u_cameraMotion, 1);
    gl.uniform1f(
      this.velocityProgram.uniforms.u_cameraActive,
      this.cameraActive ? 1.0 : 0.0,
    );
    gl.uniform1f(
      this.velocityProgram.uniforms.u_cameraStrength,
      this.settings.cameraStrength,
    );
    gl.uniform1f(
      this.velocityProgram.uniforms.u_audioLevel,
      this.currentAudioLevel,
    );
    gl.uniform1f(
      this.velocityProgram.uniforms.u_audioBoostMin,
      this.settings.audioBoostMin,
    );
    gl.uniform1f(
      this.velocityProgram.uniforms.u_audioBoostMax,
      this.settings.audioBoostMax,
    );

    gl.uniform2f(
      this.velocityProgram.uniforms.u_mousePos,
      this.mousePos[0],
      this.mousePos[1],
    );
    gl.uniform2f(
      this.velocityProgram.uniforms.u_mouseVel,
      this.mouseVel[0],
      this.mouseVel[1],
    );
    gl.uniform1f(
      this.velocityProgram.uniforms.u_mouseActive,
      this.mouseActive ? 1.0 : 0.0,
    );
    const decay =
      this.cameraActive && this.audioActive
        ? this.settings.cameraVelocityDecay
        : this.settings.velocityDecay;
    gl.uniform1f(this.velocityProgram.uniforms.u_decay, decay);
    gl.uniform1f(this.velocityProgram.uniforms.u_radius, 0.04);
    gl.uniform1f(this.velocityProgram.uniforms.u_dt, Math.min(dt, 0.05));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.enableVertexAttribArray(this.velocityProgram.attributes.a_position);
    gl.vertexAttribPointer(
      this.velocityProgram.attributes.a_position,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.velocityFBOs.swap();

    // --- Step 2: Diffuse velocity ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFBOs.write.fbo);
    gl.useProgram(this.diffuseProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFBOs.read.texture);
    gl.uniform1i(this.diffuseProgram.uniforms.u_velocity, 0);
    gl.uniform2f(
      this.diffuseProgram.uniforms.u_texelSize,
      1.0 / this.fieldSize,
      1.0 / this.fieldSize,
    );
    gl.uniform1f(
      this.diffuseProgram.uniforms.u_diffusion,
      this.settings.diffusion,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.enableVertexAttribArray(this.diffuseProgram.attributes.a_position);
    gl.vertexAttribPointer(
      this.diffuseProgram.attributes.a_position,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.velocityFBOs.swap();

    // --- Step 3: Render arrows ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.02, 0.02, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);

    gl.useProgram(this.arrowProgram.program);

    // Texture unit 0: velocity field
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFBOs.read.texture);
    gl.uniform1i(this.arrowProgram.uniforms.u_velocityField, 0);

    // Texture unit 1: trigger map
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.triggerMapTexture);
    gl.uniform1i(this.arrowProgram.uniforms.u_triggerMap, 1);

    // Texture unit 2: audio history
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.audioHistoryTexture);
    gl.uniform1i(this.arrowProgram.uniforms.u_audioHistory, 2);

    // Texture unit 3: camera sequence map
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.cameraSeqFBOs[this.currentCameraSeq].texture,
    );
    gl.uniform1i(this.arrowProgram.uniforms.u_cameraSeqMap, 3);

    gl.uniform1f(
      this.arrowProgram.uniforms.u_audioActive,
      this.audioActive ? 1.0 : 0.0,
    );
    gl.uniform1f(
      this.arrowProgram.uniforms.u_hasTriggers,
      this.hasTriggers ? 1.0 : 0.0,
    );
    gl.uniform1f(
      this.arrowProgram.uniforms.u_hasCameraSeq,
      this.cameraActive && this.cameraSeqCounter > 0 ? 1.0 : 0.0,
    );
    gl.uniform1f(
      this.arrowProgram.uniforms.u_maxSequenceIndex,
      Math.max(1, this.triggerGrid.maxSequenceIndex),
    );
    gl.uniform1f(
      this.arrowProgram.uniforms.u_maxCameraSeqIndex,
      Math.max(1, this.cameraSeqCounter),
    );
    gl.uniform1f(this.arrowProgram.uniforms.u_time, this.time);
    gl.uniform2f(
      this.arrowProgram.uniforms.u_resolution,
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform1f(this.arrowProgram.uniforms.u_arrowScale, 1.2);
    gl.uniform2f(
      this.arrowProgram.uniforms.u_cellSize,
      2.0 / this.gridCols,
      2.0 / this.gridRows,
    );
    gl.uniform1f(this.arrowProgram.uniforms.u_renderMode, this.renderMode);

    // Texture unit 4: glyph atlas (digits or lines)
    gl.activeTexture(gl.TEXTURE4);
    if (this.renderMode === 2) {
      gl.bindTexture(gl.TEXTURE_2D, this.lineAtlasTexture);
      gl.uniform1f(this.arrowProgram.uniforms.u_atlasCells, 8.0);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.digitAtlasTexture);
      gl.uniform1f(this.arrowProgram.uniforms.u_atlasCells, 10.0);
    }
    gl.uniform1i(this.arrowProgram.uniforms.u_digitAtlas, 4);

    // Per-vertex geometry (arrow or glyph quad)
    const vertexBuf = this.renderMode >= 1 ? this.digitVBO : this.arrowVBO;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);
    gl.enableVertexAttribArray(this.arrowProgram.attributes.a_vertex);
    gl.vertexAttribPointer(
      this.arrowProgram.attributes.a_vertex,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    ext.vertexAttribDivisorANGLE(this.arrowProgram.attributes.a_vertex, 0);

    // Grid positions (per-instance)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVBO);
    gl.enableVertexAttribArray(this.arrowProgram.attributes.a_position);
    gl.vertexAttribPointer(
      this.arrowProgram.attributes.a_position,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    ext.vertexAttribDivisorANGLE(this.arrowProgram.attributes.a_position, 1);

    ext.drawArraysInstancedANGLE(
      gl.TRIANGLES,
      0,
      this.arrowVertexCount,
      this.gridInstanceCount,
    );
    ext.vertexAttribDivisorANGLE(this.arrowProgram.attributes.a_position, 0);

    // Deactivate mouse if it hasn't moved recently
    const timeSinceMove = (performance.now() - this.lastMouseTime) / 1000;
    if (timeSinceMove > 0.05) {
      this.mouseActive = false;
      this.mouseVel[0] = 0;
      this.mouseVel[1] = 0;
    }
  }

  destroy() {
    const gl = this.gl;
    this.velocityFBOs.destroy(gl);
    gl.deleteTexture(this.triggerMapTexture);
    gl.deleteTexture(this.audioHistoryTexture);
    for (const tex of this.cameraTextures) gl.deleteTexture(tex);
    gl.deleteFramebuffer(this.motionVectorFBO.fbo);
    gl.deleteTexture(this.motionVectorFBO.texture);
    for (const { fbo, texture } of this.cameraSeqFBOs) {
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(texture);
    }
    gl.deleteBuffer(this.arrowVBO);
    gl.deleteBuffer(this.digitVBO);
    gl.deleteTexture(this.digitAtlasTexture);
    gl.deleteTexture(this.lineAtlasTexture);
    gl.deleteBuffer(this.gridVBO);
    gl.deleteBuffer(this.quadVBO);
    gl.deleteProgram(this.arrowProgram.program);
    gl.deleteProgram(this.velocityProgram.program);
    gl.deleteProgram(this.diffuseProgram.program);
    gl.deleteProgram(this.motionDetectProgram.program);
    gl.deleteProgram(this.cameraSeqProgram.program);
  }
}
