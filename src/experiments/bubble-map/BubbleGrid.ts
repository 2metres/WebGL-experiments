export interface BubbleCell {
  col: number;
  row: number;
  radius: number;
  age: number;
  hue: number;
  dirX: number;
  dirY: number;
}

export class BubbleGrid {
  private cells = new Map<number, BubbleCell>();
  private currentHue = 0;

  get cellCount(): number {
    return this.cells.size;
  }

  clear() {
    this.cells.clear();
    this.currentHue = 0;
  }

  /** Arm a cell — creates a new bubble if not already present */
  armCell(col: number, row: number, dirX: number, dirY: number): boolean {
    col = Math.max(0, Math.min(255, col | 0));
    row = Math.max(0, Math.min(255, row | 0));
    const key = row * 256 + col;
    if (this.cells.has(key)) return false;
    // Hue from draw direction angle, rotated by currentHue offset
    const angle = Math.atan2(dirY, dirX);
    const hue = ((angle + Math.PI) / (2 * Math.PI) + this.currentHue) % 1;
    this.cells.set(key, { col, row, radius: 0.01, age: 0, hue, dirX, dirY });
    return true;
  }

  /** Arm a disc of cells around a center point */
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

  /** Bresenham line with brush radius */
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

  /** Shift the hue offset for new strokes */
  rotateHue(amount: number) {
    this.currentHue = (this.currentHue + amount) % 1;
  }

  /** Grow all bubbles; returns number of active bubbles */
  tick(dt: number, growthRate: number, maxRadius: number, audioLevel: number): number {
    const boost = 1 + audioLevel * 2;
    for (const cell of this.cells.values()) {
      cell.age += dt;
      // Grow toward maxRadius with easing — faster initially, slows near max
      const growth = growthRate * boost * dt * Math.max(0.1, maxRadius - cell.radius);
      cell.radius = Math.min(maxRadius, cell.radius + growth);
    }
    return this.cells.size;
  }

  /**
   * Pack active bubbles into a Float32Array for GPU upload.
   * Each bubble: [clipX, clipY, clipRadius, hue]
   * Coordinates are in clip space (-1..1).
   */
  packInstances(canvasWidth: number, canvasHeight: number, cellSize: number): Float32Array {
    const count = this.cells.size;
    const data = new Float32Array(count * 4);
    let i = 0;
    // Cell UV (0..1) from grid position, then to clip (-1..1)
    const invW = 2 / canvasWidth;
    const invH = 2 / canvasHeight;
    for (const cell of this.cells.values()) {
      // Cell center in pixels
      const px = (cell.col + 0.5) * cellSize;
      const py = (cell.row + 0.5) * cellSize;
      // To clip space
      data[i]     = px * invW - 1;
      data[i + 1] = 1 - py * invH; // flip Y
      // Radius in clip space (bubble radius in cells * cellSize → pixels → clip)
      data[i + 2] = cell.radius * cellSize * invW;
      data[i + 3] = cell.hue;
      i += 4;
    }
    return data;
  }
}
