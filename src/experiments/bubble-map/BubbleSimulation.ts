import {
  bubbleDensityVert,
  bubbleDensityFrag,
  gooRenderVert,
  gooRenderFrag,
} from "./shaders";
import { BubbleGrid } from "./BubbleGrid";
import {
  createProgram,
  createFBO,
  createQuadVBO,
  drawQuad,
  getWebGLContext,
  getExtension,
} from "../../lib/gl";
import type { FBOHandle, ShaderProgram } from "../../lib/gl";

export interface BubbleSettings {
  growthRate: number;
  maxRadius: number;
  threshold: number;
  shininess: number;
  ambient: number;
  specStrength: number;
  rimPower: number;
  rimStrength: number;
  brushRadius: number;
  lightAngleX: number;
  lightAngleY: number;
}

export class BubbleSimulation {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private ext: ANGLE_instanced_arrays;

  settings: BubbleSettings = {
    growthRate: 2.0,
    maxRadius: 3.0,
    threshold: 0.12,
    shininess: 32,
    ambient: 0.25,
    specStrength: 0.6,
    rimPower: 3.0,
    rimStrength: 0.4,
    brushRadius: 3,
    lightAngleX: 0.4,
    lightAngleY: 0.6,
  };

  // Programs
  private densityProgram!: ShaderProgram;
  private gooProgram!: ShaderProgram;

  // Buffers
  private quadVBO!: WebGLBuffer;
  private instanceVBO!: WebGLBuffer;

  // FBO
  private densityFBO!: FBOHandle;

  // Grid
  private grid = new BubbleGrid();
  private fieldSize = 256;
  private cellSize = 1; // pixels per grid cell, computed on resize

  // Canvas dimensions
  private width = 1;
  private height = 1;

  // Mouse state
  private prevGridCol = -1;
  private prevGridRow = -1;
  private prevDirX = 0;
  private prevDirY = 0;
  private strokeHasDirection = false;

  // Audio
  private audioLevel = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = getWebGLContext(canvas, { premultipliedAlpha: false, alpha: true });
    this.ext = getExtension<ANGLE_instanced_arrays>(this.gl, "ANGLE_instanced_arrays");
    this.initGL();
  }

  private initGL() {
    const gl = this.gl;

    // Density pass: instanced bubbles → additive blend into FBO
    this.densityProgram = createProgram(gl, bubbleDensityVert, bubbleDensityFrag, {
      uniforms: [],
      attributes: ["a_position", "a_instance"],
    });

    // Goo render: fullscreen quad reads density texture
    this.gooProgram = createProgram(gl, gooRenderVert, gooRenderFrag, {
      uniforms: [
        "u_density", "u_resolution", "u_threshold", "u_shininess",
        "u_lightDir", "u_ambient", "u_specStrength",
        "u_rimPower", "u_rimStrength",
      ],
      attributes: ["a_position"],
    });

    // Quad VBO (unit quad for fullscreen pass)
    this.quadVBO = createQuadVBO(gl);

    // Instance VBO (dynamic, updated each frame)
    this.instanceVBO = gl.createBuffer()!;

    // Density FBO
    this.densityFBO = createFBO(gl, this.canvas.width || 512, this.canvas.height || 512);
  }

  resize(width: number, height: number) {
    const gl = this.gl;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    // Compute cell size: map 256 grid cells across the larger dimension
    this.cellSize = Math.max(width, height) / this.fieldSize;

    // Recreate density FBO at canvas resolution
    if (this.densityFBO) {
      gl.deleteFramebuffer(this.densityFBO.fbo);
      gl.deleteTexture(this.densityFBO.texture);
    }
    this.densityFBO = createFBO(gl, width, height);
  }

  setAudioLevel(level: number) {
    this.audioLevel = level;
  }

  startNewStroke() {
    this.prevGridCol = -1;
    this.prevGridRow = -1;
    this.strokeHasDirection = false;
    this.grid.rotateHue(0.15); // shift hue per stroke
  }

  onMouseMove(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    // Convert to grid coords
    const col = px / this.cellSize;
    const row = py / this.cellSize;

    if (this.prevGridCol < 0) {
      this.prevGridCol = col;
      this.prevGridRow = row;
      return;
    }

    const dx = col - this.prevGridCol;
    const dy = row - this.prevGridRow;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.5) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      this.prevDirX = dirX;
      this.prevDirY = dirY;
      this.strokeHasDirection = true;
    }

    if (this.strokeHasDirection) {
      this.grid.armLine(
        this.prevGridCol, this.prevGridRow,
        col, row,
        this.prevDirX, this.prevDirY,
        this.settings.brushRadius,
      );
    }

    this.prevGridCol = col;
    this.prevGridRow = row;
  }

  onMouseLeave() {
    this.prevGridCol = -1;
    this.prevGridRow = -1;
  }

  update(dt: number) {
    const gl = this.gl;
    const s = this.settings;

    // Grow bubbles
    this.grid.tick(dt, s.growthRate, s.maxRadius, this.audioLevel);

    if (this.grid.cellCount === 0) {
      // Nothing to draw — clear screen
      gl.viewport(0, 0, this.width, this.height);
      gl.clearColor(0.02, 0.02, 0.05, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    // Pack instance data
    const instanceData = this.grid.packInstances(this.width, this.height, this.cellSize);

    // Upload instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

    // === Pass 1: Render bubble density to FBO ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFBO.fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Additive blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.densityProgram.program);

    // Quad vertices (unit quad, reused per instance)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    const aPos = this.densityProgram.attributes["a_position"];
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    this.ext.vertexAttribDivisorANGLE(aPos, 0);

    // Instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);
    const aInst = this.densityProgram.attributes["a_instance"];
    gl.enableVertexAttribArray(aInst);
    gl.vertexAttribPointer(aInst, 4, gl.FLOAT, false, 0, 0);
    this.ext.vertexAttribDivisorANGLE(aInst, 1);

    // Draw instanced quads (6 verts per quad)
    const bubbleCount = instanceData.length / 4;
    this.ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, bubbleCount);

    // Reset divisors
    this.ext.vertexAttribDivisorANGLE(aPos, 0);
    this.ext.vertexAttribDivisorANGLE(aInst, 0);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // === Pass 2: Render goo with 3D lighting ===
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0.02, 0.02, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.gooProgram.program);

    // Bind density texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densityFBO.texture);
    gl.uniform1i(this.gooProgram.uniforms["u_density"]!, 0);

    // Uniforms
    gl.uniform2f(this.gooProgram.uniforms["u_resolution"]!, this.width, this.height);
    gl.uniform1f(this.gooProgram.uniforms["u_threshold"]!, s.threshold);
    gl.uniform1f(this.gooProgram.uniforms["u_shininess"]!, s.shininess);
    gl.uniform1f(this.gooProgram.uniforms["u_ambient"]!, s.ambient);
    gl.uniform1f(this.gooProgram.uniforms["u_specStrength"]!, s.specStrength);
    gl.uniform1f(this.gooProgram.uniforms["u_rimPower"]!, s.rimPower);
    gl.uniform1f(this.gooProgram.uniforms["u_rimStrength"]!, s.rimStrength);

    // Light direction from angles
    const lx = Math.sin(s.lightAngleX) * Math.cos(s.lightAngleY);
    const ly = Math.sin(s.lightAngleY);
    const lz = Math.cos(s.lightAngleX) * Math.cos(s.lightAngleY);
    const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
    gl.uniform3f(this.gooProgram.uniforms["u_lightDir"]!, lx / len, ly / len, lz / len);

    drawQuad(gl, this.gooProgram, this.quadVBO);

    gl.disable(gl.BLEND);
  }

  clearBubbles() {
    this.grid.clear();
  }

  destroy() {
    const gl = this.gl;
    gl.deleteBuffer(this.quadVBO);
    gl.deleteBuffer(this.instanceVBO);
    gl.deleteFramebuffer(this.densityFBO.fbo);
    gl.deleteTexture(this.densityFBO.texture);
    gl.deleteProgram(this.densityProgram.program);
    gl.deleteProgram(this.gooProgram.program);
  }
}
