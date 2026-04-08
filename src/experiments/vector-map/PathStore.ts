export interface PathPoint {
  x: number; // UV coords 0..1
  y: number;
  dx: number; // direction
  dy: number;
  t: number; // cumulative distance parameter 0..1
}

export class PathStore {
  points: PathPoint[] = [];
  private totalLength = 0;
  private minSpacing = 0.005; // minimum distance between stored samples

  clear() {
    this.points = [];
    this.totalLength = 0;
  }

  addPoint(x: number, y: number) {
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.minSpacing) return; // skip if too close

      this.totalLength += dist;
      const len = Math.max(dist, 0.0001);

      this.points.push({
        x,
        y,
        dx: dx / len,
        dy: dy / len,
        t: this.totalLength,
      });

      // Also update the first point's direction if it had none
      if (this.points.length === 2) {
        this.points[0].dx = dx / len;
        this.points[0].dy = dy / len;
      }
    } else {
      this.points.push({ x, y, dx: 1, dy: 0, t: 0 });
    }
  }

  /** Normalize all t values to 0..1 range */
  finalize() {
    if (this.totalLength <= 0 || this.points.length < 2) return;
    for (const p of this.points) {
      p.t /= this.totalLength;
    }
  }

  /** Bake a path map texture: for each texel, find nearest path point.
   *  Returns RGBA Uint8Array:
   *    R = path parameter t (high 8 bits)  \
   *    G = path parameter t (low 8 bits)   / together = 16-bit precision
   *    B = direction angle (0..255 → 0..2π)
   *    A = proximity (255 = on path, 0 = far away)
   */
  bakePathMap(width: number, height: number, radius: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const u = (px + 0.5) / width;
        const v = (py + 0.5) / height;

        let minDist = Infinity;
        let nearestIdx = 0;

        // Find closest path point
        for (let i = 0; i < this.points.length; i++) {
          const p = this.points[i];
          const dx = u - p.x;
          const dy = v - p.y;
          const d = dx * dx + dy * dy;
          if (d < minDist) {
            minDist = d;
            nearestIdx = i;
          }
        }

        minDist = Math.sqrt(minDist);
        const nearest = this.points[nearestIdx];
        const idx = (py * width + px) * 4;

        if (minDist < radius && nearest) {
          // Sharp falloff: strong near path, drops quickly at edges
          const linear = Math.max(0, 1 - minDist / radius);
          const proximity = linear * linear;

          // 16-bit path parameter: high byte in R, low byte in G
          const t16 = Math.floor(nearest.t * 65535);
          data[idx] = (t16 >> 8) & 0xff; // R: t high
          data[idx + 1] = t16 & 0xff; // G: t low

          // Direction as angle 0..2π mapped to 0..255
          const angle = Math.atan2(nearest.dy, nearest.dx);
          data[idx + 2] = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 255); // B: angle

          data[idx + 3] = Math.floor(proximity * 255); // A: proximity
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }

    return data;
  }

  get length() {
    return this.points.length;
  }
}
