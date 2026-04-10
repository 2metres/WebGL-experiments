export const PHYSICS_STATIC = 0;
export const PHYSICS_FLOAT = 1;
export const PHYSICS_DRIP = 2;

interface Emitter {
  x: number;       // grid-unit position
  y: number;
  dirX: number;    // stroke direction (initial emit direction)
  dirY: number;
  hue: number;
  spawnAccum: number; // fractional spawn accumulator
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  lifetime: number;
  hue: number;
}

const MAX_PARTICLES = 20000;

export class BubbleGrid {
  private emitters = new Map<number, Emitter>();
  private particles: Particle[] = [];
  private currentHue = 0;

  get cellCount(): number {
    return this.particles.length;
  }

  clear() {
    this.emitters.clear();
    this.particles.length = 0;
    this.currentHue = 0;
  }

  clearParticles() {
    this.particles.length = 0;
  }

  /** Arm a cell as an emitter */
  armCell(col: number, row: number, dirX: number, dirY: number): boolean {
    col = Math.max(0, Math.min(255, col | 0));
    row = Math.max(0, Math.min(255, row | 0));
    const key = row * 256 + col;
    if (this.emitters.has(key)) return false;
    const angle = Math.atan2(dirY, dirX);
    const hue = ((angle + Math.PI) / (2 * Math.PI) + this.currentHue) % 1;
    this.emitters.set(key, {
      x: col + 0.5, y: row + 0.5,
      dirX, dirY, hue,
      spawnAccum: 0,
    });
    return true;
  }

  private armDisc(cx: number, cy: number, r: number, dirX: number, dirY: number) {
    const ri = Math.ceil(r);
    const r2 = r * r;
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const c = cx + dx;
        const rw = cy + dy;
        if (c < 0 || c > 255 || rw < 0 || rw > 255) continue;
        this.armCell(c, rw, dirX, dirY);
      }
    }
  }

  armLine(
    fromCol: number, fromRow: number,
    toCol: number, toRow: number,
    dirX: number, dirY: number,
    brushRadius = 3,
  ) {
    let x0 = Math.max(0, Math.min(255, fromCol | 0));
    let y0 = Math.max(0, Math.min(255, fromRow | 0));
    const x1 = Math.max(0, Math.min(255, toCol | 0));
    const y1 = Math.max(0, Math.min(255, toRow | 0));

    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
      this.armDisc(x0, y0, brushRadius, dirX, dirY);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  rotateHue(amount: number) {
    this.currentHue = (this.currentHue + amount) % 1;
  }

  tick(
    dt: number,
    growthRate: number,
    maxRadius: number,
    audioLevel: number,
    physicsMode: number,
    gravity: number,
    viscosity: number,
    fieldSize: number,
    spawnRate: number,
    emitterLife: number,
    spread: number,
    particleLife: number,
  ): number {
    const boost = 1 + audioLevel * 3;
    const gravDir = physicsMode === PHYSICS_FLOAT ? -1 : 1;

    // --- Spawn particles from emitters ---
    const spawnPerEmitter = spawnRate * boost * dt;
    const deadEmitters: number[] = [];

    for (const [key, em] of this.emitters) {
      em.spawnAccum += spawnPerEmitter;

      // Emitter lifetime: reduce spawn rate over time, eventually remove
      // emitterLife=0 means infinite
      if (emitterLife > 0) {
        em.spawnAccum *= Math.max(0, 1 - dt / emitterLife);
        // Check if emitter is exhausted
        if (em.spawnAccum < 0.001 && spawnPerEmitter < 0.01) {
          deadEmitters.push(key);
          continue;
        }
      }

      while (em.spawnAccum >= 1 && this.particles.length < MAX_PARTICLES) {
        em.spawnAccum -= 1;

        // Random spread around emit direction
        const angle = Math.atan2(em.dirY, em.dirX) + (Math.random() - 0.5) * spread;
        const speed = 2 + Math.random() * 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Spawn slightly offset from emitter center
        const ox = (Math.random() - 0.5) * 1.5;
        const oy = (Math.random() - 0.5) * 1.5;

        this.particles.push({
          x: em.x + ox,
          y: em.y + oy,
          vx,
          vy,
          radius: 0.1 + Math.random() * 0.3,
          age: 0,
          lifetime: particleLife * (0.6 + Math.random() * 0.8),
          hue: em.hue + (Math.random() - 0.5) * 0.05,
        });
      }
    }

    for (const key of deadEmitters) this.emitters.delete(key);

    // --- Update particles ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;

      // Remove expired particles
      if (p.age > p.lifetime) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }

      // Growth: ramp up then plateau
      const lifeFrac = p.age / p.lifetime;
      const targetRadius = maxRadius * Math.min(1, lifeFrac * 4); // reach max at 25% life
      const growth = growthRate * dt * Math.max(0.05, targetRadius - p.radius);
      p.radius = Math.min(maxRadius, p.radius + growth);

      // Fade radius near end of life
      if (lifeFrac > 0.7) {
        p.radius *= 1 - (lifeFrac - 0.7) / 0.3 * dt * 2;
      }

      // Physics
      if (physicsMode !== PHYSICS_STATIC) {
        p.vy += gravity * gravDir * dt;
        const drag = Math.pow(1 - viscosity, dt * 60);
        p.vx *= drag;
        p.vy *= drag;
        // Random turbulence
        p.vx += (Math.random() - 0.5) * 1.5 * dt;
        p.vy += (Math.random() - 0.5) * 0.5 * dt;
      } else {
        // Even in static mode, apply some drift and slow down
        const drag = Math.pow(0.92, dt * 60);
        p.vx *= drag;
        p.vy *= drag;
        p.vx += (Math.random() - 0.5) * 0.8 * dt;
        p.vy += (Math.random() - 0.5) * 0.8 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Remove off-screen
      const margin = maxRadius * 2;
      if (p.y < -margin || p.y > fieldSize + margin ||
          p.x < -margin || p.x > fieldSize + margin) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    return this.particles.length;
  }

  packInstances(canvasWidth: number, canvasHeight: number, cellSize: number): Float32Array {
    const count = this.particles.length;
    const data = new Float32Array(count * 4);
    let i = 0;
    const invW = 2 / canvasWidth;
    const invH = 2 / canvasHeight;
    for (const p of this.particles) {
      const px = p.x * cellSize;
      const py = p.y * cellSize;
      data[i]     = px * invW - 1;
      data[i + 1] = 1 - py * invH;
      data[i + 2] = p.radius * cellSize * invW;
      data[i + 3] = p.hue;
      i += 4;
    }
    return data;
  }
}
