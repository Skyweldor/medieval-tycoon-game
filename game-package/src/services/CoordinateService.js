/**
 * CoordinateService
 * Handles isometric coordinate transformations between grid and screen space
 */

import { TILE_CONFIG, BUILDING_FOOTPRINT } from '../config/index.js';

export class CoordinateService {
  constructor() {
    // Cursor detection offsets (to align cursor with visual tile positions)
    this._cursorOffsetX = -1;
    this._cursorOffsetY = -1;

    // Debug offsets for building positioning (adjustable via UI sliders)
    this._debugOffsetX = 2;
    this._debugOffsetY = -8;
    this._debugSizeMult = 2;

    // Cache for game world element
    this._gameWorldElement = null;
  }

  /**
   * Get the game world DOM element (cached)
   * @returns {HTMLElement|null}
   */
  getGameWorld() {
    if (!this._gameWorldElement) {
      this._gameWorldElement = document.getElementById('game-world');
    }
    return this._gameWorldElement;
  }

  /**
   * Clear the cached game world element (call if DOM changes)
   */
  clearCache() {
    this._gameWorldElement = null;
  }

  /**
   * Set cursor offsets for mouse detection calibration
   * @param {number} x - X offset
   * @param {number} y - Y offset
   */
  setCursorOffset(x, y) {
    this._cursorOffsetX = x;
    this._cursorOffsetY = y;
  }

  /**
   * Get current cursor offsets
   * @returns {{x: number, y: number}}
   */
  getCursorOffset() {
    return {
      x: this._cursorOffsetX,
      y: this._cursorOffsetY
    };
  }

  /**
   * Set debug offsets for building positioning
   * @param {number} x - X offset
   * @param {number} y - Y offset
   */
  setDebugOffset(x, y) {
    this._debugOffsetX = x;
    this._debugOffsetY = y;
  }

  /**
   * Set debug size multiplier for buildings
   * @param {number} mult - Size multiplier
   */
  setDebugSizeMult(mult) {
    this._debugSizeMult = mult;
  }

  /**
   * Get current debug settings
   * @returns {{offsetX: number, offsetY: number, sizeMult: number}}
   */
  getDebugSettings() {
    return {
      offsetX: this._debugOffsetX,
      offsetY: this._debugOffsetY,
      sizeMult: this._debugSizeMult
    };
  }

  /**
   * Convert grid coordinates to screen position (isometric projection)
   * @param {number} gridX - Grid X coordinate (column)
   * @param {number} gridY - Grid Y coordinate (row)
   * @returns {{x: number, y: number, z: number}} Screen position with z-index
   */
  gridToScreen(gridX, gridY) {
    const { gridWidth, gridHeight, cols, rows } = TILE_CONFIG;

    // Get actual game world dimensions
    const world = this.getGameWorld();
    if (!world) {
      console.warn('CoordinateService: game-world element not found');
      return { x: 0, y: 0, z: 0 };
    }

    const worldCenterX = world.offsetWidth / 2;
    const worldCenterY = world.offsetHeight / 2;

    // Calculate center of grid (middle tile)
    const centerGridX = (cols - 1) / 2;
    const centerGridY = (rows - 1) / 2;

    // Offset so center of grid is at center of world
    const offsetX = worldCenterX - (centerGridX - centerGridY) * (gridWidth / 2);
    const offsetY = worldCenterY - (centerGridX + centerGridY) * (gridHeight / 2);

    return {
      x: offsetX + (gridX - gridY) * (gridWidth / 2),
      y: offsetY + (gridX + gridY) * (gridHeight / 2),
      z: (gridX + gridY) * 10
    };
  }

  /**
   * Convert screen (pixel) coordinates to grid coordinates
   * Returns fractional values - use Math.floor for tile index
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{col: number, row: number}} Grid position (may be fractional)
   */
  screenToGrid(screenX, screenY) {
    const { gridWidth, gridHeight, cols, rows } = TILE_CONFIG;

    // Apply cursor offset to compensate for visual tile displacement
    screenX += this._cursorOffsetX;
    screenY += this._cursorOffsetY;

    // Get actual game world dimensions
    const world = this.getGameWorld();
    if (!world) {
      console.warn('CoordinateService: game-world element not found');
      return { col: 0, row: 0 };
    }

    const worldCenterX = world.offsetWidth / 2;
    const worldCenterY = world.offsetHeight / 2;

    // Calculate center of grid (middle tile)
    const centerGridX = (cols - 1) / 2;
    const centerGridY = (rows - 1) / 2;

    // Same offsets as gridToScreen
    const offsetX = worldCenterX - (centerGridX - centerGridY) * (gridWidth / 2);
    const offsetY = worldCenterY - (centerGridX + centerGridY) * (gridHeight / 2);

    // Reverse the isometric transformation
    // x = offsetX + (gridX - gridY) * (gridWidth / 2)
    // y = offsetY + (gridX + gridY) * (gridHeight / 2)
    // Solving for gridX and gridY:
    const A = (screenX - offsetX) / (gridWidth / 2);  // = gridX - gridY
    const B = (screenY - offsetY) / (gridHeight / 2); // = gridX + gridY

    const gridX = (A + B) / 2;  // col
    const gridY = (B - A) / 2;  // row

    return { col: gridX, row: gridY };
  }

  /**
   * Convert grid position to integer tile coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{col: number, row: number}} Integer grid position
   */
  screenToTile(screenX, screenY) {
    const { col, row } = this.screenToGrid(screenX, screenY);
    return {
      col: Math.floor(col),
      row: Math.floor(row)
    };
  }

  /**
   * Convert grid (row, col) to pixel position for buildings
   * Buildings occupy a 2x2 area, so we center on the middle of the 4 tiles
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @param {boolean} [isBuilt=false] - true for constructed buildings (use debug offsets)
   * @returns {{x: number, y: number, z: number}} Pixel position with z-index
   */
  gridToPixel(row, col, isBuilt = false) {
    const { tileHeight, gridWidth } = TILE_CONFIG;

    // For 2x2 footprint, center is at (col + 0.5, row + 0.5) in grid coords
    const centerCol = col + (BUILDING_FOOTPRINT - 1) / 2;
    const centerRow = row + (BUILDING_FOOTPRINT - 1) / 2;

    // Get screen position of the center point
    const pos = this.gridToScreen(centerCol, centerRow);

    if (isBuilt) {
      // Built buildings use debug offsets for fine-tuning
      const buildingSize = gridWidth * this._debugSizeMult;
      const x = pos.x - buildingSize / 2 + this._debugOffsetX;
      const y = pos.y + (tileHeight / 2) - buildingSize / 2 + this._debugOffsetY;
      // Higher z-index for built buildings to appear above tiles
      const frontZ = (col + BUILDING_FOOTPRINT + row + BUILDING_FOOTPRINT) * 10 + 100;
      return { x, y, z: frontZ };
    } else {
      // Placeholders use compact positioning (original behavior)
      const placeholderSize = 42;
      const x = pos.x - placeholderSize / 2;
      const y = pos.y + (tileHeight / 2) - placeholderSize / 2;
      const frontZ = (col + BUILDING_FOOTPRINT + row + BUILDING_FOOTPRINT) * 10;
      return { x, y, z: frontZ };
    }
  }

  /**
   * Check if a grid position is within bounds
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @returns {boolean}
   */
  isInBounds(row, col) {
    const { rows, cols } = TILE_CONFIG;
    return row >= 0 && row < rows && col >= 0 && col < cols;
  }

  /**
   * Check if a building footprint fits within bounds
   * @param {number} row - Starting row
   * @param {number} col - Starting column
   * @param {number} [footprint=BUILDING_FOOTPRINT] - Size of footprint
   * @returns {boolean}
   */
  footprintInBounds(row, col, footprint = BUILDING_FOOTPRINT) {
    const { rows, cols } = TILE_CONFIG;
    return (
      row >= 0 &&
      col >= 0 &&
      row + footprint <= rows &&
      col + footprint <= cols
    );
  }

  /**
   * Calculate z-index for proper depth sorting
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @param {boolean} [isBuilding=false] - If true, adds building offset
   * @returns {number}
   */
  calculateZIndex(row, col, isBuilding = false) {
    const baseZ = (col + row) * 10;
    return isBuilding ? baseZ + 100 : baseZ;
  }
}

// Export singleton instance for convenience
export const coordinateService = new CoordinateService();
