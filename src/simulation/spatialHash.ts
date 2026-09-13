// Uniform grid spatial hash for O(1)-ish nearby-entity queries. Used for both
// organism-organism and organism-food neighbor lookups so vision/collision
// checks don't scale O(n^2).

export class SpatialHash<T> {
  private cellSize: number;
  private cols: number;
  private buckets: Map<number, T[]>;
  private getPos: (item: T) => { x: number; y: number };

  constructor(worldSize: number, cellSize: number, getPos: (item: T) => { x: number; y: number }) {
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(worldSize / cellSize));
    this.buckets = new Map();
    this.getPos = getPos;
  }

  private key(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  private cellOf(x: number, y: number): [number, number] {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
    const cy = Math.min(this.cols - 1, Math.max(0, Math.floor(y / this.cellSize)));
    return [cx, cy];
  }

  clear() {
    this.buckets.clear();
  }

  insertAll(items: Iterable<T>) {
    this.clear();
    for (const item of items) {
      const { x, y } = this.getPos(item);
      const [cx, cy] = this.cellOf(x, y);
      const k = this.key(cx, cy);
      let bucket = this.buckets.get(k);
      if (!bucket) {
        bucket = [];
        this.buckets.set(k, bucket);
      }
      bucket.push(item);
    }
  }

  /** Calls visitor for every item within `radius` (Euclidean) of (x,y). */
  queryRadius(x: number, y: number, radius: number, visitor: (item: T) => void) {
    const [cx0, cy0] = this.cellOf(x - radius, y - radius);
    const [cx1, cy1] = this.cellOf(x + radius, y + radius);
    const r2 = radius * radius;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const bucket = this.buckets.get(this.key(cx, cy));
        if (!bucket) continue;
        for (const item of bucket) {
          const p = this.getPos(item);
          const dx = p.x - x;
          const dy = p.y - y;
          if (dx * dx + dy * dy <= r2) visitor(item);
        }
      }
    }
  }
}
