export interface TriggerCell {
  col: number;
  row: number;
  dirX: number;
  dirY: number;
  sequenceIndex: number;
}

export class TriggerGrid {
  private cells = new Map<number, TriggerCell>();
  private nextSequenceIndex = 0;

  get maxSequenceIndex(): number {
    return Math.max(1, this.nextSequenceIndex - 1);
  }

  get cellCount(): number {
    return this.cells.size;
  }

  clear() {
    this.cells.clear();
    this.nextSequenceIndex = 0;
  }

  armCell(col: number, row: number, dirX: number, dirY: number): boolean {
    col = Math.max(0, Math.min(255, col | 0));
    row = Math.max(0, Math.min(255, row | 0));
    const key = row * 256 + col;
    if (this.cells.has(key)) return false;
    this.cells.set(key, {
      col,
      row,
      dirX,
      dirY,
      sequenceIndex: this.nextSequenceIndex++,
    });
    return true;
  }

  /** Arm a disc of cells around a center point */
  private armDisc(
    cx: number,
    cy: number,
    radius: number,
    dirX: number,
    dirY: number,
  ) {
    const r = Math.ceil(radius);
    const r2 = radius * radius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const c = cx + dx;
        const rw = cy + dy;
        if (c < 0 || c > 255 || rw < 0 || rw > 255) continue;
        this.armCell(c, rw, dirX, dirY);
      }
    }
  }

  /** Bresenham line rasterizer with brush radius — arms a fat stroke */
  armLine(
    fromCol: number,
    fromRow: number,
    toCol: number,
    toRow: number,
    dirX: number,
    dirY: number,
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
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Bake RGBA texture: R=seq high, G=seq low, B=direction angle, A=armed */
  bakeTexture(width: number, height: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    for (const [key, cell] of this.cells) {
      const idx = key * 4; // key = row * 256 + col, texture is 256 wide
      if (idx + 3 >= data.length) continue;
      const seq = cell.sequenceIndex;
      data[idx] = (seq >> 8) & 0xff; // R: sequence high
      data[idx + 1] = seq & 0xff; // G: sequence low
      // Direction angle: atan2 -> 0..2pi -> 0..255
      const angle = Math.atan2(cell.dirY, cell.dirX);
      data[idx + 2] = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 255); // B: angle
      data[idx + 3] = 255; // A: armed
    }
    return data;
  }
}
