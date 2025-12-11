/**
 * PlacementController
 * Handles building placement mode UI interactions
 */

import { BUILDINGS, EMOJI_FALLBACKS, TILE_CONFIG, BUILDING_FOOTPRINT } from '../config/index.js';

export class PlacementController {
  /**
   * @param {import('../services/BuildingService.js').BuildingService} buildingService
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   * @param {Function} notifyFn - Notification function for user feedback
   * @param {Function} renderBuildingsFn - Function to re-render buildings after placement
   */
  constructor(buildingService, resourceService, coordinateService, notifyFn, renderBuildingsFn) {
    this._buildingService = buildingService;
    this._resourceService = resourceService;
    this._coordinateService = coordinateService;
    this._notify = notifyFn || (() => {});
    this._renderBuildings = renderBuildingsFn || (() => {});

    // Placement mode state
    this._active = false;
    this._buildingType = null;
    this._hoverRow = null;
    this._hoverCol = null;

    // Bound event handlers (for removal)
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundClick = this._handleClick.bind(this);
    this._boundMouseLeave = this._handleMouseLeave.bind(this);
  }

  // ==========================================
  // STATE
  // ==========================================

  /**
   * Check if placement mode is active
   * @returns {boolean}
   */
  isActive() {
    return this._active;
  }

  /**
   * Get the building type being placed
   * @returns {string|null}
   */
  getBuildingType() {
    return this._buildingType;
  }

  /**
   * Get current hover position
   * @returns {{row: number|null, col: number|null}}
   */
  getHoverPosition() {
    return { row: this._hoverRow, col: this._hoverCol };
  }

  // ==========================================
  // PLACEMENT MODE CONTROL
  // ==========================================

  /**
   * Start placement mode for a building type
   * @param {string} type - Building type to place
   */
  selectBuilding(type) {
    // Clicking same building again cancels
    if (this._active && this._buildingType === type) {
      this.cancel();
      return;
    }

    this._active = true;
    this._buildingType = type;
    this._hoverRow = null;
    this._hoverCol = null;

    this._disableBuildingInteraction();  // Disable clicking on placed buildings during placement
    this.renderBuildList();
    this._notify(`Move cursor over the map to place ${BUILDINGS[type].name}`, 'info');
  }

  /**
   * Cancel placement mode
   */
  cancel() {
    this._active = false;
    this._buildingType = null;
    this._hoverRow = null;
    this._hoverCol = null;

    this._clearHighlights();
    this._enableBuildingInteraction();  // Re-enable clicking on placed buildings
    this.renderBuildList();
  }

  // ==========================================
  // HIGHLIGHTING
  // ==========================================

  /**
   * Clear all placement highlights from tiles
   * @private
   */
  _clearHighlights() {
    document.querySelectorAll('.tile.highlighted-valid, .tile.highlighted-invalid').forEach(tile => {
      tile.classList.remove('highlighted-valid', 'highlighted-invalid');
    });
  }

  /**
   * Show 2x2 placement highlight at the specified grid position
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   */
  showHighlightAt(row, col) {
    this._clearHighlights();

    if (!this._active) return;

    const { rows, cols } = TILE_CONFIG;
    const isValid = this._buildingService.canPlaceAt(row, col);
    const highlightClass = isValid ? 'highlighted-valid' : 'highlighted-invalid';

    // Highlight the 2x2 footprint by adding class to actual tile elements
    for (let dr = 0; dr < BUILDING_FOOTPRINT; dr++) {
      for (let dc = 0; dc < BUILDING_FOOTPRINT; dc++) {
        const tileRow = row + dr;
        const tileCol = col + dc;

        // Skip tiles outside the grid bounds
        if (tileRow < 0 || tileRow >= rows || tileCol < 0 || tileCol >= cols) {
          continue;
        }

        // Find the tile element by its data attributes
        const tile = document.querySelector(`.tile[data-row="${tileRow}"][data-col="${tileCol}"]`);
        if (tile) {
          tile.classList.add(highlightClass);
        }
      }
    }
  }

  // ==========================================
  // BUILDING INTERACTION CONTROL
  // ==========================================

  /**
   * Disable pointer events on placed buildings during placement mode
   * This prevents buildings from capturing clicks/hovers when trying to place behind them
   * @private
   */
  _disableBuildingInteraction() {
    document.querySelectorAll('.building-slot').forEach(slot => {
      slot.style.pointerEvents = 'none';
    });
  }

  /**
   * Re-enable pointer events on placed buildings after placement mode ends
   * @private
   */
  _enableBuildingInteraction() {
    document.querySelectorAll('.building-slot').forEach(slot => {
      slot.style.pointerEvents = '';  // Reset to default (CSS handles it)
    });
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  /**
   * Handle mouse movement over game world for placement preview
   * @param {MouseEvent} e
   * @private
   */
  _handleMouseMove(e) {
    if (!this._active) return;

    const world = document.getElementById('game-world');
    const rect = world.getBoundingClientRect();

    // Get mouse position relative to game world
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to grid coordinates
    const gridPos = this._coordinateService.screenToGrid(mouseX, mouseY);
    // Offset so cursor is at bottom-left tile of 2x2 diamond
    const col = Math.floor(gridPos.col) - 1;
    const row = Math.floor(gridPos.row) - 1;

    // Only update if position changed
    if (row !== this._hoverRow || col !== this._hoverCol) {
      this._hoverRow = row;
      this._hoverCol = col;
      this.showHighlightAt(row, col);
    }
  }

  /**
   * Handle click on game world for placement
   * @param {MouseEvent} e
   * @private
   */
  _handleClick(e) {
    if (!this._active) return;

    const world = document.getElementById('game-world');
    const rect = world.getBoundingClientRect();

    // Get mouse position relative to game world
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to grid coordinates
    const gridPos = this._coordinateService.screenToGrid(mouseX, mouseY);
    // Same offset as mouse move - cursor at bottom-left tile of 2x2
    const col = Math.floor(gridPos.col) - 1;
    const row = Math.floor(gridPos.row) - 1;

    // Attempt to place building using legacy function (uses local state)
    // window.placeBuilding handles resources, placedBuildings array, and updateUI
    if (window.placeBuilding) {
      const success = window.placeBuilding(this._buildingType, row, col);
      if (success) {
        // Successfully placed - exit placement mode
        this.cancel();
      }
      // Note: placeBuilding handles its own error notifications
    } else {
      // Fallback to service-based placement
      const result = this._buildingService.placeBuilding(this._buildingType, row, col);
      if (result.success) {
        this.cancel();
        this._renderBuildings();
      } else if (result.error) {
        this._notify(result.error, 'error');
      }
    }
  }

  /**
   * Handle mouse leaving game world
   * @private
   */
  _handleMouseLeave() {
    // Don't clear highlights - keep them visible until building is placed
    // The last valid position remains highlighted
  }

  // ==========================================
  // SETUP
  // ==========================================

  /**
   * Setup mouse event listeners on game world
   */
  setupListeners() {
    const world = document.getElementById('game-world');
    if (!world) {
      console.warn('[PlacementController] Game world element not found');
      return;
    }

    world.addEventListener('mousemove', this._boundMouseMove);
    world.addEventListener('click', this._boundClick);
    world.addEventListener('mouseleave', this._boundMouseLeave);
  }

  /**
   * Remove mouse event listeners from game world
   */
  removeListeners() {
    const world = document.getElementById('game-world');
    if (!world) return;

    world.removeEventListener('mousemove', this._boundMouseMove);
    world.removeEventListener('click', this._boundClick);
    world.removeEventListener('mouseleave', this._boundMouseLeave);
  }

  // ==========================================
  // BUILD LIST RENDERING
  // ==========================================

  /**
   * Format unlock requirements as readable text
   * @param {Object} unlockReq - Unlock requirements object (e.g., {wheat: 10})
   * @returns {string} Formatted requirement text
   * @private
   */
  _formatUnlockReq(unlockReq) {
    if (!unlockReq) return '';

    const RESOURCE_ICONS = {
      gold: '💰',
      wheat: '🌾',
      stone: '⛏️',
      wood: '🌲'
    };

    return Object.entries(unlockReq)
      .map(([res, amt]) => `${amt}${RESOURCE_ICONS[res] || res}`)
      .join(' ');
  }

  /**
   * Render the build list UI
   */
  renderBuildList() {
    const container = document.getElementById('build-list');
    if (!container) return;

    // Show all building types from BUILDINGS object
    const buildingTypes = Object.keys(BUILDINGS);

    container.innerHTML = buildingTypes.map(type => {
      const def = BUILDINGS[type];
      const icon = EMOJI_FALLBACKS[type];
      // Use window functions if available (allows legacy code to override)
      const unlocked = window.isUnlocked ? window.isUnlocked(def.unlockReq) : this._resourceService.isUnlocked(def.unlockReq);
      const affordable = window.canAfford ? window.canAfford(def.baseCost) : this._resourceService.canAfford(def.baseCost);

      // Cost text
      const costText = Object.entries(def.baseCost)
        .map(([r, a]) => `${a}${r === 'gold' ? '💰' : r === 'wheat' ? '🌾' : r === 'stone' ? '⛏️' : '🌲'}`)
        .join(' ');

      const isSelected = this._active && this._buildingType === type;
      const isLocked = !unlocked;

      // Unlock requirements text for locked buildings
      let unlockText = '';
      if (!unlocked && def.unlockReq) {
        const reqText = this._formatUnlockReq(def.unlockReq);
        unlockText = `🔒 Need: ${reqText}`;
      }

      return `
        <div class="build-item ${isLocked ? 'locked' : ''} ${isSelected ? 'selected' : ''}"
             onclick="${isLocked ? '' : `selectBuildingForPlacement('${type}')`}">
          <span class="build-item-icon">${icon}</span>
          <div class="build-item-info">
            <div class="build-item-name">${def.name}</div>
            <div class="build-item-cost ${affordable && !isLocked ? 'affordable' : 'unaffordable'}">${costText}</div>
            ${unlockText ? `<div class="build-item-unlock">${unlockText}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Show/hide cancel button
    const cancelBtn = document.getElementById('build-cancel');
    if (cancelBtn) {
      cancelBtn.style.display = this._active ? 'block' : 'none';
    }
  }
}
