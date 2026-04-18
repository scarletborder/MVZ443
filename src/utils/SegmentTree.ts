/**
 * 线段树 - 用于维护区间内的植物数量
 * 支持单点更新和区间查询
 */
export class SegmentTree {
  private tree: number[];
  private size: number;

  constructor(capacity: number = 10000) {
    this.size = capacity;
    // 线段树数组大小为 4 * capacity
    this.tree = new Array(4 * capacity).fill(0);
  }

  /**
   * 更新指定位置的值（增加）
   * @param col 位置
   * @param delta 增加的值（可以是负数表示减少）
   */
  public update(col: number, delta: number = 1): void {
    this._update(col, delta, 0, 0, this.size - 1);
  }

  /**
   * 查询区间 [0, col] 内的植物总数
   * @param col 右端点（包括）
   * @returns 区间内的植物总数
   */
  public queryPrefix(col: number): number {
    if (col < 0) return 0;
    return this._query(0, Math.min(col, this.size - 1), 0, 0, this.size - 1);
  }

  /**
   * 查询区间 [left, right] 内的植物总数
   * @param left 左端点（包括）
   * @param right 右端点（包括）
   * @returns 区间内的植物总数
   */
  public query(left: number, right: number): number {
    if (left > right || right < 0 || left >= this.size) return 0;
    left = Math.max(0, left);
    right = Math.min(right, this.size - 1);
    return this._query(left, right, 0, 0, this.size - 1);
  }

  /**
   * 重置线段树
   */
  public reset(): void {
    this.tree.fill(0);
  }

  private _update(
    pos: number,
    delta: number,
    node: number,
    start: number,
    end: number
  ): void {
    if (pos < start || pos > end) return;

    if (start === end) {
      this.tree[node] += delta;
      return;
    }

    const mid = Math.floor((start + end) / 2);
    const leftChild = 2 * node + 1;
    const rightChild = 2 * node + 2;

    if (pos <= mid) {
      this._update(pos, delta, leftChild, start, mid);
    } else {
      this._update(pos, delta, rightChild, mid + 1, end);
    }

    this.tree[node] = this.tree[leftChild] + this.tree[rightChild];
  }

  private _query(
    left: number,
    right: number,
    node: number,
    start: number,
    end: number
  ): number {
    if (left > end || right < start) return 0;

    if (left <= start && end <= right) {
      return this.tree[node];
    }

    const mid = Math.floor((start + end) / 2);
    const leftChild = 2 * node + 1;
    const rightChild = 2 * node + 2;

    const leftSum = this._query(left, right, leftChild, start, mid);
    const rightSum = this._query(left, right, rightChild, mid + 1, end);

    return leftSum + rightSum;
  }
}
