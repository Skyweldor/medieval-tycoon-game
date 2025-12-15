/**
 * TileRenderer
 * Renders the isometric ground tile grid
 */

import { TILE_CONFIG, TILE_MAP, TILE } from '../config/index.js';

export class TileRenderer {
  /**
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   * @param {import('../services/BuildingService.js').BuildingService} buildingService
   */
  constructor(coordinateService, buildingService) {
    this._coordinateService = coordinateService;
    this._buildingService = buildingService;

    // Debug values - can be updated externally
    this._debugSizeMult = 2;
    this._debugOffsetX = 2;
    this._debugOffsetY = -8;
  }

  // ==========================================
  // DEBUG VALUES
  // ==========================================

  /**
   * Set debug values for rendering adjustments
   * @param {Object} values - Debug values object
   */
  setDebugValues(values) {
    if (values.sizeMult !== undefined) this._debugSizeMult = values.sizeMult;
    if (values.offsetX !== undefined) this._debugOffsetX = values.offsetX;
    if (values.offsetY !== undefined) this._debugOffsetY = values.offsetY;
  }

  /**
   * Get current debug values
   * @returns {Object}
   */
  getDebugValues() {
    return {
      sizeMult: this._debugSizeMult,
      offsetX: this._debugOffsetX,
      offsetY: this._debugOffsetY
    };
  }

  // ==========================================
  // TILE CLASS MAPPING
  // ==========================================

  /**
   * Get CSS class for a tile type
   * @param {number} tileType - Tile type from TILE_MAP
   * @returns {string} CSS class name
   * @private
   */
  _getTileClass(tileType) {
    const tileClasses = {
      [TILE.GRASS]: 'tile-grass',
      [TILE.COBBLE]: 'tile-cobble',
      [TILE.DIRT]: 'tile-dirt'
    };
    return tileClasses[tileType] || 'tile-grass';
  }

  // ==========================================
  // TILE ELEMENT CREATION
  // ==========================================

  /**
   * Create a tile DOM element
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @param {number} tileType - Tile type
   * @param {Object} pos - Position from gridToScreen {x, y, z}
   * @returns {HTMLElement}
   * @private
   */
  _createTileElement(row, col, tileType, pos) {
    const { tileWidth, tileHeight } = TILE_CONFIG;

    const tile = document.createElement('div');
    tile.className = `tile ${this._getTileClass(tileType)}`;
    tile.dataset.row = row;
    tile.dataset.col = col;

    // Position tile - center horizontally on grid point
    tile.style.left = `${pos.x - tileWidth / 2}px`;
    tile.style.top = `${pos.y}px`;
    tile.style.zIndex = Math.floor(pos.z);

    return tile;
  }

  // ==========================================
  // RENDERING
  // ==========================================

  /**
   * Render the complete tile grid
   * @param {HTMLElement} [gameWorld] - Optional game world element (defaults to #game-world)
   */
  render(gameWorld) {
    const world = gameWorld || document.getElementById('game-world');
    if (!world) {
      console.warn('[TileRenderer] Game world element not found');
      return;
    }

    const groundLayer = world.querySelector('.ground-layer');
    if (!groundLayer) {
      console.warn('[TileRenderer] Ground layer element not found');
      return;
    }

    const { rows, cols, tileWidth, tileHeight, gridWidth } = TILE_CONFIG;

    // Set CSS custom properties for tile styling
    world.style.setProperty('--tile-width', `${tileWidth}px`);
    world.style.setProperty('--tile-height', `${tileHeight}px`);
    world.style.setProperty('--building-size', `${gridWidth * this._debugSizeMult}px`);

    // Clear existing tiles
    groundLayer.innerHTML = '';

    // Collect tiles with their z-order for sorting
    // Note: Always render ALL tiles - buildings render on top of them
    const tilesToRender = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileType = TILE_MAP[row]?.[col] ?? TILE.GRASS;
        const pos = this._coordinateService.gridToScreen(col, row);

        tilesToRender.push({
          row,
          col,
          tileType,
          pos
        });
      }
    }

    // Sort tiles back-to-front (by z-order) for proper isometric rendering
    tilesToRender.sort((a, b) => a.pos.z - b.pos.z);

    // Create and append tile elements
    tilesToRender.forEach(({ row, col, tileType, pos }) => {
      const tile = this._createTileElement(row, col, tileType, pos);
      groundLayer.appendChild(tile);
    });
  }

  /**
   * Clear all tiles from the ground layer
   * @param {HTMLElement} [gameWorld] - Optional game world element
   */
  clear(gameWorld) {
    const world = gameWorld || document.getElementById('game-world');
    if (!world) return;

    const groundLayer = world.querySelector('.ground-layer');
    if (groundLayer) {
      groundLayer.innerHTML = '';
    }
  }

  /**
   * Update a single tile's appearance (for highlighting, etc.)
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @param {string} className - Class to add
   */
  highlightTile(row, col, className) {
    const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    if (tile) {
      tile.classList.add(className);
    }
  }

  /**
   * Remove highlight from a tile
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @param {string} className - Class to remove
   */
  unhighlightTile(row, col, className) {
    const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    if (tile) {
      tile.classList.remove(className);
    }
  }

  /**
   * Clear all tile highlights
   */
  clearHighlights() {
    document.querySelectorAll('.tile.highlighted-valid, .tile.highlighted-invalid').forEach(tile => {
      tile.classList.remove('highlighted-valid', 'highlighted-invalid');
    });
  }
}
