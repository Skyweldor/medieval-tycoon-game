/**
 * Position Helper
 * Utilities for working with grid coordinates
 */

/**
 * Represents a position on the isometric grid
 */
export class Position {
  /**
   * Create a new position
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   */
  constructor(row, col) {
    this.row = row;
    this.col = col;
  }

  /**
   * Create a position from an object
   * @param {{row: number, col: number}} obj
   * @returns {Position}
   */
  static from(obj) {
    return new Position(obj.row, obj.col);
  }

  /**
   * Create a position from a "row,col" string key
   * @param {string} key - Position key in "row,col" format
   * @returns {Position}
   */
  static fromKey(key) {
    const [row, col] = key.split(',').map(Number);
    return new Position(row, col);
  }

  /**
   * Convert to a string key for use in Sets/Maps
   * @returns {string}
   */
  toKey() {
    return `${this.row},${this.col}`;
  }

  /**
   * Check if this position equals another
   * @param {Position|{row: number, col: number}} other
   * @returns {boolean}
   */
  equals(other) {
    return this.row === other.row && this.col === other.col;
  }

  /**
   * Get a new position offset from this one
   * @param {number} dRow - Row offset
   * @param {number} dCol - Column offset
   * @returns {Position}
   */
  offset(dRow, dCol) {
    return new Position(this.row + dRow, this.col + dCol);
  }

  /**
   * Check if this position is within grid bounds
   * @param {number} rows - Total rows in grid
   * @param {number} cols - Total columns in grid
   * @returns {boolean}
   */
  isInBounds(rows, cols) {
    return this.row >= 0 && this.row < rows && this.col >= 0 && this.col < cols;
  }

  /**
   * Get Manhattan distance to another position
   * @param {Position|{row: number, col: number}} other
   * @returns {number}
   */
  distanceTo(other) {
    return Math.abs(this.row - other.row) + Math.abs(this.col - other.col);
  }

  /**
   * Clone this position
   * @returns {Position}
   */
  clone() {
    return new Position(this.row, this.col);
  }

  /**
   * Convert to plain object
   * @returns {{row: number, col: number}}
   */
  toJSON() {
    return { row: this.row, col: this.col };
  }

  /**
   * Get all positions in a rectangular area
   * @param {number} startRow - Starting row
   * @param {number} startCol - Starting column
   * @param {number} width - Width in tiles
   * @param {number} height - Height in tiles
   * @returns {Position[]}
   */
  static getArea(startRow, startCol, width, height) {
    const positions = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        positions.push(new Position(startRow + r, startCol + c));
      }
    }
    return positions;
  }

  /**
   * Get the 4 cardinal neighbor positions
   * @returns {Position[]}
   */
  getNeighbors() {
    return [
      this.offset(-1, 0), // North
      this.offset(1, 0),  // South
      this.offset(0, -1), // West
      this.offset(0, 1)   // East
    ];
  }

  /**
   * Get all 8 surrounding positions (including diagonals)
   * @returns {Position[]}
   */
  getSurrounding() {
    const positions = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) {
          positions.push(this.offset(dr, dc));
        }
      }
    }
    return positions;
  }
}

/**
 * Create a Set of position keys from an array of positions
 * @param {Array<Position|{row: number, col: number}>} positions
 * @returns {Set<string>}
 */
export function createPositionSet(positions) {
  const set = new Set();
  positions.forEach(pos => {
    const key = pos instanceof Position ? pos.toKey() : `${pos.row},${pos.col}`;
    set.add(key);
  });
  return set;
}

/**
 * Check if a position key exists in a set
 * @param {Set<string>} set - Set of position keys
 * @param {number} row - Row to check
 * @param {number} col - Column to check
 * @returns {boolean}
 */
export function hasPosition(set, row, col) {
  return set.has(`${row},${col}`);
}
