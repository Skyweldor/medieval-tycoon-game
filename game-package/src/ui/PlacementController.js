/**
 * PlacementController
 * Handles building placement mode UI interactions
 */

import { BUILDINGS, ASSETS, TILE_CONFIG, BUILDING_FOOTPRINT, getResearchForBuilding } from '../config/index.js';
import { Events } from '../core/EventBus.js';

// Resource sprite icon class mapping
const RESOURCE_ICON_CLASS = {
  gold: 'icon-gold',
  wheat: 'icon-wheat',
  stone: 'icon-stone',
  wood: 'icon-wood',
  bread: 'icon-bread',
  iron: 'icon-iron'
};

/**
 * Get the asset path for a building type (level 1)
 * @param {string} type - Building type
 * @returns {string} - Asset path or empty string
 */
function getBuildingAsset(type) {
  const asset = ASSETS[type];
  if (asset && asset[1]) {
    return asset[1];
  }
  return '';
}

export class PlacementController {
  /**
   * @param {import('../services/BuildingService.js').BuildingService} buildingService
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {Function} renderBuildingsFn - Function to re-render buildings after placement
   * @param {import('../services/ResearchService.js').ResearchService} [researchService] - Research service for unlock checks
   * @param {import('../services/CameraService.js').CameraService} [cameraService] - Camera service for pan offset
   */
  constructor(buildingService, resourceService, coordinateService, eventBus, renderBuildingsFn, researchService, cameraService) {
    this._buildingService = buildingService;
    this._resourceService = resourceService;
    this._coordinateService = coordinateService;
    this._eventBus = eventBus;
    this._renderBuildings = renderBuildingsFn || (() => {});
    this._researchService = researchService;
    this._cameraService = cameraService;

    // Placement mode state
    this._active = false;
    this._buildingType = null;
    this._hoverRow = null;
    this._hoverCol = null;

    // Demolish mode state
    this._demolishMode = false;

    // Bound event handlers (for removal)
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundClick = this._handleClick.bind(this);
    this._boundMouseLeave = this._handleMouseLeave.bind(this);
  }

  /**
   * Show a notification to the user via EventBus
   * @param {string} message - Message to display
   * @param {string} [type='info'] - Notification type (info, success, error)
   * @private
   */
  _notify(message, type = 'info') {
    this._eventBus.publish(Events.NOTIFICATION, { message, type });
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

  /**
   * Check if demolish mode is active
   * @returns {boolean}
   */
  isDemolishMode() {
    return this._demolishMode;
  }

  // ==========================================
  // PLACEMENT MODE CONTROL
  // ==========================================

  /**
   * Start placement mode for a building type
   * @param {string} type - Building type to place
   */
  selectBuilding(type) {
    // Cancel demolish mode if active
    if (this._demolishMode) {
      this.cancelDemolish();
    }

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
  // DEMOLISH MODE CONTROL
  // ==========================================

  /**
   * Toggle demolish mode on/off
   */
  toggleDemolishMode() {
    if (this._demolishMode) {
      this.cancelDemolish();
    } else {
      this.enterDemolishMode();
    }
  }

  /**
   * Enter demolish mode
   */
  enterDemolishMode() {
    // Cancel placement mode if active
    if (this._active) {
      this.cancel();
    }

    this._demolishMode = true;
    this._enableDemolishHighlights();
    this.renderBuildList();
    this._notify('Click on a building to demolish it (50% refund)', 'info');
  }

  /**
   * Cancel demolish mode
   */
  cancelDemolish() {
    this._demolishMode = false;
    this._clearDemolishHighlights();
    this.renderBuildList();
  }

  /**
   * Add demolish highlight styling to all building slots
   * @private
   */
  _enableDemolishHighlights() {
    document.querySelectorAll('.building-slot').forEach(slot => {
      slot.classList.add('demolish-mode');
    });
  }

  /**
   * Remove demolish highlight styling from all building slots
   * @private
   */
  _clearDemolishHighlights() {
    document.querySelectorAll('.building-slot').forEach(slot => {
      slot.classList.remove('demolish-mode');
    });
  }

  /**
   * Handle demolishing a building
   * @param {Object} building - Building to demolish
   */
  demolishBuilding(building) {
    if (!this._demolishMode) return;

    const def = BUILDINGS[building.type];
    const buildingName = def?.name || building.type;

    // Calculate refund for notification
    const refund = this._buildingService.calculateRefund(building);
    const refundText = Object.entries(refund)
      .map(([r, a]) => `${a} ${r}`)
      .join(', ');

    const result = this._buildingService.removeBuildingByRef(building);

    if (result.success) {
      this._notify(`${buildingName} demolished! Refund: ${refundText}`, 'success');
      // Note: BUILDING_REMOVED event will trigger UI updates
      this.cancelDemolish();
    } else if (result.error) {
      this._notify(result.error, 'error');
    }
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
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    // Account for camera pan offset - subtract the offset to get position in world space
    if (this._cameraService) {
      const camOffset = this._cameraService.getOffset();
      mouseX -= camOffset.x;
      mouseY -= camOffset.y;
    }

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
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    // Account for camera pan offset - subtract the offset to get position in world space
    if (this._cameraService) {
      const camOffset = this._cameraService.getOffset();
      mouseX -= camOffset.x;
      mouseY -= camOffset.y;
    }

    // Convert to grid coordinates
    const gridPos = this._coordinateService.screenToGrid(mouseX, mouseY);
    // Same offset as mouse move - cursor at bottom-left tile of 2x2
    const col = Math.floor(gridPos.col) - 1;
    const row = Math.floor(gridPos.row) - 1;

    // Place building through BuildingService (handles resources, state, and events)
    // BuildingService publishes BUILDING_PLACED event which triggers UI updates via EventBus
    const result = this._buildingService.placeBuilding(this._buildingType, row, col);

    if (result.success) {
      const buildingName = BUILDINGS[this._buildingType]?.name || this._buildingType;
      this._notify(`${buildingName} placed!`, 'success');
      // Note: Don't call _renderBuildings() here - BUILDING_PLACED event handles UI updates
      this.cancel();
    } else if (result.error) {
      this._notify(result.error, 'error');
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
   * Format unlock requirements as readable text with sprite icons
   * @param {Object} unlockReq - Unlock requirements object (e.g., {wheat: 10})
   * @returns {string} Formatted requirement text with sprite icons
   * @private
   */
  _formatUnlockReq(unlockReq) {
    if (!unlockReq) return '';

    return Object.entries(unlockReq)
      .map(([res, amt]) => `${amt}<span class="icon icon-16 ${RESOURCE_ICON_CLASS[res] || 'icon-gold'}"></span>`)
      .join(' ');
  }

  /**
   * Initialize the build list UI (call once on startup)
   * Creates the static HTML structure
   */
  initBuildList() {
    const container = document.getElementById('build-list');
    if (!container) return;

    const buildingTypes = Object.keys(BUILDINGS);

    container.innerHTML = buildingTypes.map(type => {
      const def = BUILDINGS[type];
      const assetPath = getBuildingAsset(type);

      // Cost text with sprite icons (static)
      const costText = Object.entries(def.baseCost)
        .map(([r, a]) => `${a}<span class="icon icon-20 ${RESOURCE_ICON_CLASS[r] || 'icon-gold'}"></span>`)
        .join(' ');

      // Unlock container (always present, content updated dynamically in renderBuildList)
      const unlockHtml = `<div class="build-item-unlock" style="display: none;"></div>`;

      // Building icon - use sprite if available
      const buildingIcon = assetPath
        ? `<img class="build-item-sprite" src="${assetPath}" alt="${def.name}">`
        : `<span class="build-item-emoji">🏠</span>`;

      return `
        <div class="build-item" data-building-type="${type}">
          <span class="build-item-icon">${buildingIcon}</span>
          <div class="build-item-info">
            <div class="build-item-name">${def.name}</div>
            <div class="build-item-cost">${costText}</div>
            ${unlockHtml}
          </div>
        </div>
      `;
    }).join('');

    // Initial state update
    this.renderBuildList();
  }

  /**
   * Update the build list UI (call on tick)
   * Only updates classes and states, not the entire HTML
   */
  renderBuildList() {
    const container = document.getElementById('build-list');
    if (!container) return;

    // If not initialized yet, do full init
    if (!container.querySelector('.build-item')) {
      this.initBuildList();
      return;
    }

    const buildingTypes = Object.keys(BUILDINGS);

    buildingTypes.forEach(type => {
      const def = BUILDINGS[type];
      const item = container.querySelector(`[data-building-type="${type}"]`);
      if (!item) return;

      // Check research unlock first (if research service available), then resource unlock
      const researchUnlocked = this._researchService
        ? this._researchService.isBuildingUnlocked(type)
        : true; // If no research service, default to unlocked
      const resourceUnlocked = this._resourceService.isUnlocked(def.unlockReq);
      const unlocked = researchUnlocked && resourceUnlocked;
      const affordable = this._resourceService.canAfford(def.baseCost);
      const isSelected = this._active && this._buildingType === type;
      const isLocked = !unlocked;
      const isResearchLocked = !researchUnlocked;

      // Update classes
      item.classList.toggle('locked', isLocked);
      item.classList.toggle('selected', isSelected);

      // Update onclick
      item.onclick = isLocked ? null : () => window.selectBuildingForPlacement(type);

      // Update cost affordability class
      const costEl = item.querySelector('.build-item-cost');
      if (costEl) {
        costEl.classList.toggle('affordable', affordable && !isLocked);
        costEl.classList.toggle('unaffordable', !affordable || isLocked);
      }

      // Show/hide unlock text and update for research locks
      const unlockEl = item.querySelector('.build-item-unlock');
      if (unlockEl) {
        if (isResearchLocked) {
          // Show research lock message
          unlockEl.innerHTML = `<span class="research-lock">📚 Research required</span>`;
          unlockEl.style.display = '';
        } else if (!resourceUnlocked) {
          // Show resource unlock requirements
          const reqText = this._formatUnlockReq(def.unlockReq);
          unlockEl.innerHTML = `🔒 Need: ${reqText}`;
          unlockEl.style.display = '';
        } else {
          unlockEl.style.display = 'none';
        }
      }
    });

    // Show/hide cancel button (for placement mode)
    const cancelBtn = document.getElementById('build-cancel');
    if (cancelBtn) {
      cancelBtn.style.display = this._active ? 'block' : 'none';
    }

    // Update demolish button state
    const demolishBtn = document.getElementById('demolish-btn');
    if (demolishBtn) {
      demolishBtn.classList.toggle('selected', this._demolishMode);
      // Disable if no buildings to demolish
      const hasBuildings = this._buildingService.getBuildingCount() > 0;
      demolishBtn.classList.toggle('disabled', !hasBuildings);
      demolishBtn.disabled = !hasBuildings;
    }

    // Show/hide demolish cancel button
    const demolishCancelBtn = document.getElementById('demolish-cancel');
    if (demolishCancelBtn) {
      demolishCancelBtn.style.display = this._demolishMode ? 'block' : 'none';
    }
  }
}
