/**
 * BuildingHoverController
 * Handles tile-based building hover detection for inspect/upgrade
 * Uses grid position rather than DOM events to determine hovered building
 */

export class BuildingHoverController {
  /**
   * @param {import('../services/BuildingService.js').BuildingService} buildingService
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   * @param {import('../services/CameraService.js').CameraService} cameraService
   * @param {import('./BuildingInfoController.js').BuildingInfoController} buildingInfoController
   * @param {Function} onBuildingClick - Callback when building is clicked
   */
  constructor(buildingService, coordinateService, cameraService, buildingInfoController, onBuildingClick) {
    this._buildingService = buildingService;
    this._coordinateService = coordinateService;
    this._cameraService = cameraService;
    this._buildingInfoController = buildingInfoController;
    this._onBuildingClick = onBuildingClick || (() => {});

    // Current hover state
    this._hoveredIndex = -1;
    this._hoveredRow = null;
    this._hoveredCol = null;

    // Bound event handlers
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundClick = this._handleClick.bind(this);
    this._boundMouseLeave = this._handleMouseLeave.bind(this);
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  /**
   * Handle mouse movement for hover detection
   * @param {MouseEvent} e
   * @private
   */
  _handleMouseMove(e) {
    const world = document.getElementById('game-world');
    if (!world) return;

    const rect = world.getBoundingClientRect();

    // Get mouse position relative to game world
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    // Account for camera pan offset
    if (this._cameraService) {
      const camOffset = this._cameraService.getOffset();
      mouseX -= camOffset.x;
      mouseY -= camOffset.y;
    }

    // Convert to grid coordinates
    const gridPos = this._coordinateService.screenToGrid(mouseX, mouseY);
    const col = Math.floor(gridPos.col);
    const row = Math.floor(gridPos.row);

    // Only update if position changed
    if (row === this._hoveredRow && col === this._hoveredCol) {
      return;
    }

    this._hoveredRow = row;
    this._hoveredCol = col;

    // Find building at this tile
    const buildingIndex = this._buildingService.getBuildingIndexAt(row, col);

    // Update hover state
    if (buildingIndex !== this._hoveredIndex) {
      // Remove highlight from previous building
      if (this._hoveredIndex >= 0) {
        this._setHighlight(this._hoveredIndex, false);
      }

      this._hoveredIndex = buildingIndex;

      if (buildingIndex >= 0) {
        // Show building info and highlight
        this._buildingInfoController.show(buildingIndex);
        this._setHighlight(buildingIndex, true);
      } else {
        // No building - hide info
        this._buildingInfoController.hide();
      }
    }
  }

  /**
   * Handle click for building interaction
   * @param {MouseEvent} e
   * @private
   */
  _handleClick(e) {
    // Ignore if clicking on UI elements within game-world (like resource overlay)
    if (e.target.closest('.resource-overlay')) return;

    const world = document.getElementById('game-world');
    if (!world) return;

    const rect = world.getBoundingClientRect();

    // Get mouse position relative to game world
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    // Account for camera pan offset
    if (this._cameraService) {
      const camOffset = this._cameraService.getOffset();
      mouseX -= camOffset.x;
      mouseY -= camOffset.y;
    }

    // Convert to grid coordinates
    const gridPos = this._coordinateService.screenToGrid(mouseX, mouseY);
    const col = Math.floor(gridPos.col);
    const row = Math.floor(gridPos.row);

    // Find building at this tile
    const buildingIndex = this._buildingService.getBuildingIndexAt(row, col);

    if (buildingIndex >= 0) {
      this._onBuildingClick(buildingIndex);
    }
  }

  /**
   * Handle mouse leaving game world
   * @private
   */
  _handleMouseLeave() {
    if (this._hoveredIndex >= 0) {
      this._setHighlight(this._hoveredIndex, false);
      this._buildingInfoController.hide();
    }
    this._hoveredIndex = -1;
    this._hoveredRow = null;
    this._hoveredCol = null;
  }

  // ==========================================
  // HIGHLIGHTING
  // ==========================================

  /**
   * Set highlight state on a building element
   * @param {number} index - Building index
   * @param {boolean} highlighted - Whether to highlight
   * @private
   */
  _setHighlight(index, highlighted) {
    const layer = document.getElementById('building-layer');
    if (!layer) return;

    const slot = layer.querySelector(`.building-slot[data-building-index="${index}"]`);
    if (slot) {
      slot.classList.toggle('hovered', highlighted);
    }
  }

  // ==========================================
  // SETUP
  // ==========================================

  /**
   * Setup event listeners
   */
  setupListeners() {
    const world = document.getElementById('game-world');
    if (!world) {
      console.warn('[BuildingHoverController] Game world element not found');
      return;
    }

    world.addEventListener('mousemove', this._boundMouseMove);
    world.addEventListener('click', this._boundClick);
    world.addEventListener('mouseleave', this._boundMouseLeave);
  }

  /**
   * Remove event listeners
   */
  removeListeners() {
    const world = document.getElementById('game-world');
    if (!world) return;

    world.removeEventListener('mousemove', this._boundMouseMove);
    world.removeEventListener('click', this._boundClick);
    world.removeEventListener('mouseleave', this._boundMouseLeave);
  }

  /**
   * Get currently hovered building index
   * @returns {number} Building index or -1 if none
   */
  getHoveredIndex() {
    return this._hoveredIndex;
  }

  /**
   * Check if a building is currently hovered
   * @returns {boolean}
   */
  isHovering() {
    return this._hoveredIndex >= 0;
  }

  /**
   * Destroy the controller (cleanup)
   */
  destroy() {
    this.removeListeners();
  }
}
