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
  spawnRate: number;
  emitterLife: number;
  spread: number;
  particleLife: number;
  growthRate: number;
  maxRadius: number;
  brushRadius: number;
  physicsMode: number;
  gravity: number;
  viscosity: number;
  thickness: number;
  densityScale: number;
  softness: number;
  absorption: number;
  colorHue: number;
  colorSat: number;
  colorVal: number;
  useBaseColor: number;
  opacity: number;
  depthScale: number;
  shininess: number;
  specStrength: number;
  fresnelF0: number;
  envBright: number;
  lightAngleX: number;
  lightAngleY: number;
}

export class BubbleSimulation {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private ext: ANGLE_instanced_arrays;

  settings: BubbleSettings = {
    spawnRate: 8,
    emitterLife: 5,
    spread: 2.0,
    particleLife: 4.0,
    growthRate: 3.0,
    maxRadius: 5.0,
    brushRadius: 4,
    physicsMode: 0,
    gravity: 15,
    viscosity: 0.3,
    thickness: 0.03,
    densityScale: 0.05,
    softness: 0.85,
    absorption: 4.0,
    colorHue: 0.55,
    colorSat: 0.7,
    colorVal: 0.9,
    useBaseColor: 0,
    opacity: 1.0,
    depthScale: 8.0,
    shininess: 200,
    specStrength: 1.5,
    fresnelF0: 0.04,
    envBright: 0.6,
    lightAngleX: 0.5,
    lightAngleY: 0.8,
  };

  private densityProgram!: ShaderProgram;
  private gooProgram!: ShaderProgram;
  private quadVBO!: WebGLBuffer;
  private instanceVBO!: WebGLBuffer;
  private densityFBO!: FBOHandle;

  private grid = new BubbleGrid();
  private fieldSize = 256;
  private cellSize = 1;
  private width = 1;
  private height = 1;

  private prevGridCol = -1;
  private prevGridRow = -1;
  private prevDirX = 0;
  private prevDirY = 0;
  private strokeHasDirection = false;
  private audioLevel = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = getWebGLContext(canvas, { premultipliedAlpha: false, alpha: true });
    this.ext = getExtension<ANGLE_instanced_arrays>(this.gl, "ANGLE_instanced_arrays");
    this.initGL();
  }

  private initGL() {
    const gl = this.gl;

    this.densityProgram = createProgram(gl, bubbleDensityVert, bubbleDensityFrag, {
      uniforms: ["u_densityScale", "u_softness"],
      attributes: ["a_position", "a_instance"],
    });

    this.gooProgram = createProgram(gl, gooRenderVert, gooRenderFrag, {
      uniforms: [
        "u_density", "u_resolution", "u_threshold", "u_shininess",
        "u_lightDir", "u_specStrength",
        "u_opacity", "u_baseHue", "u_baseSat", "u_baseVal", "u_useBaseColor",
        "u_depthScale", "u_absorption", "u_fresnelF0", "u_envBright",
      ],
      attributes: ["a_position"],
    });

    this.quadVBO = createQuadVBO(gl);
    this.instanceVBO = gl.createBuffer()!;
    this.densityFBO = createFBO(gl, this.canvas.width || 512, this.canvas.height || 512);
  }

  resize(width: number, height: number) {
    const gl = this.gl;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.cellSize = Math.max(width, height) / this.fieldSize;

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
    this.grid.rotateHue(0.15);
  }

  onMouseMove(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
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
      this.prevDirX = dx / dist;
      this.prevDirY = dy / dist;
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

    this.grid.tick(
      dt, s.growthRate, s.maxRadius, this.audioLevel,
      s.physicsMode, s.gravity, s.viscosity, this.fieldSize,
      s.spawnRate, s.emitterLife, s.spread, s.particleLife,
    );

    if (this.grid.cellCount === 0) {
      gl.viewport(0, 0, this.width, this.height);
      gl.clearColor(0.02, 0.02, 0.05, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    const instanceData = this.grid.packInstances(this.width, this.height, this.cellSize);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

    // === Pass 1: Density FBO ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFBO.fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.densityProgram.program);

    gl.uniform1f(this.densityProgram.uniforms["u_densityScale"]!, s.densityScale);
    gl.uniform1f(this.densityProgram.uniforms["u_softness"]!, s.softness);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    const aPos = this.densityProgram.attributes["a_position"];
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    this.ext.vertexAttribDivisorANGLE(aPos, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO);
    const aInst = this.densityProgram.attributes["a_instance"];
    gl.enableVertexAttribArray(aInst);
    gl.vertexAttribPointer(aInst, 4, gl.FLOAT, false, 0, 0);
    this.ext.vertexAttribDivisorANGLE(aInst, 1);

    const bubbleCount = instanceData.length / 4;
    this.ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, bubbleCount);

    this.ext.vertexAttribDivisorANGLE(aPos, 0);
    this.ext.vertexAttribDivisorANGLE(aInst, 0);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // === Pass 2: Goo render ===
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0.02, 0.02, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.gooProgram.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densityFBO.texture);
    gl.uniform1i(this.gooProgram.uniforms["u_density"]!, 0);

    const u = this.gooProgram.uniforms;
    gl.uniform2f(u["u_resolution"]!, this.width, this.height);
    gl.uniform1f(u["u_threshold"]!, s.thickness);
    gl.uniform1f(u["u_shininess"]!, s.shininess);
    gl.uniform1f(u["u_specStrength"]!, s.specStrength);
    gl.uniform1f(u["u_opacity"]!, s.opacity);
    gl.uniform1f(u["u_baseHue"]!, s.colorHue);
    gl.uniform1f(u["u_baseSat"]!, s.colorSat);
    gl.uniform1f(u["u_baseVal"]!, s.colorVal);
    gl.uniform1f(u["u_useBaseColor"]!, s.useBaseColor);
    gl.uniform1f(u["u_depthScale"]!, s.depthScale);
    gl.uniform1f(u["u_absorption"]!, s.absorption);
    gl.uniform1f(u["u_fresnelF0"]!, s.fresnelF0);
    gl.uniform1f(u["u_envBright"]!, s.envBright);

    const lx = Math.sin(s.lightAngleX) * Math.cos(s.lightAngleY);
    const ly = Math.sin(s.lightAngleY);
    const lz = Math.cos(s.lightAngleX) * Math.cos(s.lightAngleY);
    const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
    gl.uniform3f(u["u_lightDir"]!, lx / len, ly / len, lz / len);

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
