/**
 * BuildingRenderer
 * Renders placed buildings with sprites/emojis and level badges
 */

import { BUILDINGS, ASSETS, EMOJI_FALLBACKS, TILE_CONFIG, BUILDING_FOOTPRINT } from '../config/index.js';

export class BuildingRenderer {
  /**
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   * @param {Object} [callbacks] - Event callbacks
   * @param {Function} [callbacks.onBuildingClick] - Called when building is clicked (index)
   * @param {Function} [callbacks.onBuildingHover] - Called when building is hovered (index)
   * @param {Function} [callbacks.onBuildingLeave] - Called when mouse leaves building
   */
  constructor(coordinateService, gameState, callbacks = {}) {
    this._coordinateService = coordinateService;
    this._gameState = gameState;

    // Event callbacks
    this._onBuildingClick = callbacks.onBuildingClick || (() => {});
    this._onBuildingHover = callbacks.onBuildingHover || (() => {});
    this._onBuildingLeave = callbacks.onBuildingLeave || (() => {});

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

  /**
   * Update event callbacks
   * @param {Object} callbacks - New callbacks
   */
  setCallbacks(callbacks) {
    if (callbacks.onBuildingClick) this._onBuildingClick = callbacks.onBuildingClick;
    if (callbacks.onBuildingHover) this._onBuildingHover = callbacks.onBuildingHover;
    if (callbacks.onBuildingLeave) this._onBuildingLeave = callbacks.onBuildingLeave;
  }

  // ==========================================
  // ELEMENT CREATION
  // ==========================================

  /**
   * Create level badge element
   * @param {number} level - Display level (1-indexed)
   * @returns {HTMLElement}
   * @private
   */
  _createLevelBadge(level) {
    const badge = document.createElement('div');
    badge.className = 'level-badge';
    badge.textContent = level;
    return badge;
  }

  /**
   * Create "Ready!" badge element for processors with buffered outputs
   * @returns {HTMLElement}
   * @private
   */
  _createReadyBadge() {
    const badge = document.createElement('div');
    badge.className = 'ready-badge hidden';
    badge.textContent = 'Ready!';
    return badge;
  }

  /**
   * Create building slot element with all children
   * @param {Object} building - Building data {type, row, col, level}
   * @param {number} index - Building index in array
   * @returns {HTMLElement}
   * @private
   */
  _createBuildingElement(building, index) {
    const def = BUILDINGS[building.type];
    const level = building.level + 1; // Convert 0-indexed to display
    const assetPath = ASSETS[building.type]?.[level];

    // Get position using gridToPixel
    const pos = this._coordinateService.gridToPixel(building.row, building.col, true);

    // Create container
    const slot = document.createElement('div');
    slot.className = 'building-slot built';
    slot.dataset.buildingIndex = index;  // Track index for reliable lookups
    slot.style.left = `${pos.x}px`;
    slot.style.top = `${pos.y}px`;
    slot.style.zIndex = Math.floor(pos.z);

    // Try to load image asset, fallback to emoji
    if (assetPath) {
      const img = document.createElement('img');
      img.src = assetPath;
      img.alt = def.name;
      img.draggable = false;
      img.className = 'building-image';  // Required for CSS sizing

      // Fallback to emoji if image fails to load
      img.onerror = () => {
        img.remove();
        const fallback = this._createPlaceholder(building.type);
        slot.insertBefore(fallback, slot.firstChild);
      };

      slot.appendChild(img);
    } else {
      // No asset path - use emoji directly
      const placeholder = this._createPlaceholder(building.type);
      slot.appendChild(placeholder);
    }

    // Add level badge
    slot.appendChild(this._createLevelBadge(level));

    // Add ready badge (hidden by default, shown for processors with buffered outputs)
    if (def.isProcessor) {
      slot.appendChild(this._createReadyBadge());
    }

    // Attach event handlers
    slot.addEventListener('click', () => this._onBuildingClick(index));
    slot.addEventListener('mouseenter', () => this._onBuildingHover(index));
    slot.addEventListener('mouseleave', () => this._onBuildingLeave());

    return slot;
  }

  /**
   * Create emoji placeholder element
   * @param {string} type - Building type
   * @returns {HTMLElement}
   * @private
   */
  _createPlaceholder(type) {
    const placeholder = document.createElement('div');
    placeholder.className = 'slot-placeholder';
    placeholder.textContent = EMOJI_FALLBACKS[type] || '🏠';
    return placeholder;
  }

  // ==========================================
  // RENDERING
  // ==========================================

  /**
   * Render all buildings
   * @param {HTMLElement} [container] - Optional container element (defaults to #building-layer)
   */
  render(container) {
    const layer = container || document.getElementById('building-layer') || document.getElementById('game-world');
    if (!layer) {
      console.warn('[BuildingRenderer] Building layer element not found');
      return;
    }

    // Remove existing building elements
    layer.querySelectorAll('.building-slot').forEach(el => el.remove());

    // Get buildings from game state
    const buildings = this._gameState.getBuildings();

    // Render each building
    buildings.forEach((building, index) => {
      const element = this._createBuildingElement(building, index);
      layer.appendChild(element);
    });
  }

  /**
   * Render a single building (for adding new buildings without full re-render)
   * @param {Object} building - Building data
   * @param {number} index - Building index
   * @param {HTMLElement} [container] - Optional container element
   */
  renderSingle(building, index, container) {
    const layer = container || document.getElementById('building-layer') || document.getElementById('game-world');
    if (!layer) return;

    const element = this._createBuildingElement(building, index);
    layer.appendChild(element);
  }

  /**
   * Clear all building elements
   * @param {HTMLElement} [container] - Optional container element
   */
  clear(container) {
    const layer = container || document.getElementById('building-layer') || document.getElementById('game-world');
    if (!layer) return;

    layer.querySelectorAll('.building-slot').forEach(el => el.remove());
  }

  /**
   * Update a single building's appearance (e.g., after upgrade)
   * @param {number} index - Building index
   * @param {HTMLElement} [container] - Optional container element
   */
  updateBuilding(index, container) {
    const layer = container || document.getElementById('building-layer') || document.getElementById('game-world');
    if (!layer) return;

    const buildings = this._gameState.getBuildings();
    const building = buildings[index];
    if (!building) return;

    // Remove old element by data attribute (not DOM order)
    const oldSlot = layer.querySelector(`.building-slot[data-building-index="${index}"]`);
    if (oldSlot) {
      oldSlot.remove();
    }

    const element = this._createBuildingElement(building, index);
    layer.appendChild(element);
  }

  /**
   * Get the building element at a specific index
   * @param {number} index - Building index
   * @param {HTMLElement} [container] - Optional container element
   * @returns {HTMLElement|null}
   */
  getBuildingElement(index, container) {
    const layer = container || document.getElementById('building-layer') || document.getElementById('game-world');
    if (!layer) return null;

    return layer.querySelector(`.building-slot[data-building-index="${index}"]`);
  }

  /**
   * Update ready badges on all buildings based on processor states
   * @param {Array<{buildingIndex: number}>} readyProcessors - Array of ready processor info
   * @param {HTMLElement} [container] - Optional container element
   */
  updateReadyBadges(readyProcessors, container) {
    const layer = container || document.getElementById('building-layer') || document.getElementById('game-world');
    if (!layer) return;

    // Create a set of ready building indices for fast lookup
    const readyIndices = new Set(readyProcessors.map(p => p.buildingIndex));

    // Update all building slots
    layer.querySelectorAll('.building-slot').forEach(slot => {
      const index = parseInt(slot.dataset.buildingIndex);
      const badge = slot.querySelector('.ready-badge');
      if (badge) {
        const isReady = readyIndices.has(index);
        badge.classList.toggle('hidden', !isReady);
      }
    });
  }

  /**
   * Set ready state for a single building
   * @param {number} index - Building index
   * @param {boolean} isReady - Whether the building is ready
   * @param {HTMLElement} [container] - Optional container element
   */
  setReadyState(index, isReady, container) {
    const element = this.getBuildingElement(index, container);
    if (!element) return;

    const badge = element.querySelector('.ready-badge');
    if (badge) {
      badge.classList.toggle('hidden', !isReady);
    }
  }
}
