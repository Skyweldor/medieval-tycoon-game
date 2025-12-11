/**
 * DebugRenderer
 * Renders debug visualization (grid lines, coordinate labels)
 */

import { TILE_CONFIG } from '../config/index.js';

export class DebugRenderer {
  /**
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   */
  constructor(coordinateService) {
    this._coordinateService = coordinateService;
  }

  // ==========================================
  // GRID LINE RENDERING
  // ==========================================

  /**
   * Render grid lines going in one diagonal direction
   * @param {HTMLElement} container - Debug grid container
   * @param {number} angle - Rotation angle in degrees
   * @param {number} lineLength - Length of lines
   * @param {Function} getStartPos - Function to get start position for line index
   * @param {number} extendedRange - Range of lines to draw
   * @private
   */
  _renderGridLines(container, angle, lineLength, getStartPos, extendedRange) {
    for (let i = -extendedRange; i <= extendedRange; i++) {
      const startPos = getStartPos(i);

      const line = document.createElement('div');
      line.className = 'debug-line';
      line.style.width = `${lineLength}px`;
      line.style.left = `${startPos.x - lineLength / 2}px`;
      line.style.top = `${startPos.y}px`;
      line.style.transform = `rotate(${angle}deg)`;
      line.style.transformOrigin = 'center center';

      container.appendChild(line);
    }
  }

  /**
   * Render coordinate labels at tile centers
   * @param {HTMLElement} container - Debug grid container
   * @private
   */
  _renderCoordinateLabels(container) {
    const { rows, cols } = TILE_CONFIG;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const pos = this._coordinateService.gridToScreen(col, row);

        const label = document.createElement('div');
        label.className = 'debug-label';
        label.textContent = `${row},${col}`;
        label.style.left = `${pos.x}px`;
        label.style.top = `${pos.y + 10}px`; // Offset slightly below grid intersection

        container.appendChild(label);
      }
    }
  }

  // ==========================================
  // MAIN RENDERING
  // ==========================================

  /**
   * Render the complete debug grid
   * @param {HTMLElement} [gameWorld] - Optional game world element (defaults to #game-world)
   */
  render(gameWorld) {
    const world = gameWorld || document.getElementById('game-world');
    if (!world) {
      console.warn('[DebugRenderer] Game world element not found');
      return;
    }

    const debugGrid = world.querySelector('.debug-grid');
    if (!debugGrid) {
      console.warn('[DebugRenderer] Debug grid element not found');
      return;
    }

    // Clear existing debug elements
    debugGrid.innerHTML = '';

    const { gridWidth, gridHeight, rows, cols } = TILE_CONFIG;

    // Calculate isometric angle from grid dimensions
    // For 2:1 isometric: angle = atan(gridHeight/2 / gridWidth/2) = atan(0.5)
    const angle = Math.atan(gridHeight / gridWidth) * (180 / Math.PI);

    // Calculate line length based on game world size
    const lineLength = 1500;

    // Extended range to ensure full coverage
    const extendedRange = Math.max(rows, cols) * 2;

    // Draw lines going down-right (positive slope in screen coords)
    // These lines run from top-left to bottom-right direction
    this._renderGridLines(
      debugGrid,
      angle,
      lineLength,
      (i) => this._coordinateService.gridToScreen(0, i),
      extendedRange
    );

    // Draw lines going down-left (negative slope in screen coords)
    // These lines run from top-right to bottom-left direction
    this._renderGridLines(
      debugGrid,
      -angle,
      lineLength,
      (i) => this._coordinateService.gridToScreen(i, 0),
      extendedRange
    );

    // Optionally render coordinate labels
    // this._renderCoordinateLabels(debugGrid);
  }

  /**
   * Render with coordinate labels
   * @param {HTMLElement} [gameWorld] - Optional game world element
   */
  renderWithLabels(gameWorld) {
    this.render(gameWorld);

    const world = gameWorld || document.getElementById('game-world');
    if (!world) return;

    const debugGrid = world.querySelector('.debug-grid');
    if (!debugGrid) return;

    this._renderCoordinateLabels(debugGrid);
  }

  /**
   * Clear the debug grid
   * @param {HTMLElement} [gameWorld] - Optional game world element
   */
  clear(gameWorld) {
    const world = gameWorld || document.getElementById('game-world');
    if (!world) return;

    const debugGrid = world.querySelector('.debug-grid');
    if (debugGrid) {
      debugGrid.innerHTML = '';
    }
  }

  /**
   * Toggle debug grid visibility
   * @param {HTMLElement} [gameWorld] - Optional game world element
   * @returns {boolean} New visibility state
   */
  toggle(gameWorld) {
    const world = gameWorld || document.getElementById('game-world');
    if (!world) return false;

    const debugGrid = world.querySelector('.debug-grid');
    if (!debugGrid) return false;

    const isVisible = debugGrid.style.display !== 'none';
    debugGrid.style.display = isVisible ? 'none' : 'block';

    return !isVisible;
  }

  /**
   * Set debug grid visibility
   * @param {boolean} visible - Whether grid should be visible
   * @param {HTMLElement} [gameWorld] - Optional game world element
   */
  setVisible(visible, gameWorld) {
    const world = gameWorld || document.getElementById('game-world');
    if (!world) return;

    const debugGrid = world.querySelector('.debug-grid');
    if (debugGrid) {
      debugGrid.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Check if debug grid is visible
   * @param {HTMLElement} [gameWorld] - Optional game world element
   * @returns {boolean}
   */
  isVisible(gameWorld) {
    const world = gameWorld || document.getElementById('game-world');
    if (!world) return false;

    const debugGrid = world.querySelector('.debug-grid');
    return debugGrid ? debugGrid.style.display !== 'none' : false;
  }
}
