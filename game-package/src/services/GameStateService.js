/**
 * GameStateService
 * Central state container for all game data
 * Single source of truth for game state
 */

import { Events } from '../core/EventBus.js';

/**
 * Default initial state for a new game
 */
const DEFAULT_STATE = {
  resources: {
    gold: 50,
    wheat: 0,
    stone: 0,
    wood: 0
  },
  buildings: [],
  stipend: {
    active: true,
    totalReceived: 0,
    endReason: null
  },
  merchant: {
    active: false,
    visitStartTime: null,
    soldThisVisit: { wheat: 0, stone: 0, wood: 0 },
    nextVisitTime: null,
    totalVisits: 0,
    disabled: false
  },
  completedMilestones: [],
  ui: {
    placementMode: null,
    activeTab: 'build',
    activeLeftTab: 'build',
    debugOffsets: { x: 2, y: -8, sizeMult: 2 },
    cursorOffsets: { x: -1, y: -1 }
  }
};

export class GameStateService {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._state = this._createInitialState();
    this._storageService = null;  // Set via setStorageService() after initialization
  }

  /**
   * Set the storage service reference (called after service container setup)
   * This enables resource clamping based on storage caps
   * @param {import('./StorageService.js').StorageService} storageService
   */
  setStorageService(storageService) {
    this._storageService = storageService;
  }

  /**
   * Create a deep copy of the default state
   * @returns {Object}
   */
  _createInitialState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  // ==========================================
  // RESOURCES
  // ==========================================

  /**
   * Get current resources
   * @returns {{gold: number, wheat: number, stone: number, wood: number}}
   */
  getResources() {
    return { ...this._state.resources };
  }

  /**
   * Get a specific resource amount
   * @param {string} type - Resource type (gold, wheat, stone, wood)
   * @returns {number}
   */
  getResource(type) {
    return this._state.resources[type] || 0;
  }

  /**
   * Set resources directly (use sparingly - prefer add/subtract)
   * Applies storage caps if StorageService is available
   * @param {Object} resources - Resource amounts
   */
  setResources(resources) {
    const oldResources = { ...this._state.resources };
    const newResources = { ...this._state.resources, ...resources };

    // Apply storage caps if available
    if (this._storageService) {
      Object.keys(newResources).forEach(type => {
        const cap = this._storageService.getCap(type);
        if (newResources[type] > cap) {
          newResources[type] = cap;
        }
      });
    }

    this._state.resources = newResources;
    this._eventBus.publish(Events.RESOURCES_CHANGED, {
      oldResources,
      newResources: this.getResources(),
      delta: this._calculateDelta(oldResources, this._state.resources)
    });
  }

  /**
   * Add to resources (with storage cap enforcement)
   * @param {Object} amounts - Resource amounts to add
   * @returns {{added: Object, capped: Object}} Actual amounts added and any that were capped
   */
  addResources(amounts) {
    const oldResources = { ...this._state.resources };
    const actualDelta = {};
    const capped = {};

    Object.entries(amounts).forEach(([type, amount]) => {
      const current = this._state.resources[type] || 0;
      let newValue = current + amount;

      // Apply storage cap if StorageService is available
      if (this._storageService) {
        const cap = this._storageService.getCap(type);
        if (newValue > cap) {
          capped[type] = newValue - cap;  // Track overflow
          newValue = cap;
        }
      }

      this._state.resources[type] = newValue;
      actualDelta[type] = newValue - current;
    });

    this._eventBus.publish(Events.RESOURCES_CHANGED, {
      oldResources,
      newResources: this.getResources(),
      delta: actualDelta,
      capped: Object.keys(capped).length > 0 ? capped : null
    });

    return { added: actualDelta, capped };
  }

  /**
   * Subtract from resources
   * @param {Object} amounts - Resource amounts to subtract
   * @returns {boolean} True if successful, false if insufficient resources
   */
  subtractResources(amounts) {
    // Check if we have enough
    for (const [type, amount] of Object.entries(amounts)) {
      if ((this._state.resources[type] || 0) < amount) {
        return false;
      }
    }

    const oldResources = { ...this._state.resources };
    Object.entries(amounts).forEach(([type, amount]) => {
      this._state.resources[type] -= amount;
    });

    const delta = {};
    Object.entries(amounts).forEach(([type, amount]) => {
      delta[type] = -amount;
    });

    this._eventBus.publish(Events.RESOURCES_CHANGED, {
      oldResources,
      newResources: this.getResources(),
      delta
    });

    return true;
  }

  /**
   * Calculate delta between old and new resource states
   * @private
   */
  _calculateDelta(oldRes, newRes) {
    const delta = {};
    Object.keys(newRes).forEach(key => {
      delta[key] = (newRes[key] || 0) - (oldRes[key] || 0);
    });
    return delta;
  }

  // ==========================================
  // BUILDINGS
  // ==========================================

  /**
   * Get all placed buildings
   * @returns {Array}
   */
  getBuildings() {
    return [...this._state.buildings];
  }

  /**
   * Add a building to state
   * @param {Object} building - Building data {type, row, col, level}
   */
  addBuilding(building) {
    this._state.buildings.push({ ...building });
  }

  /**
   * Update a building in state
   * @param {number} index - Building index
   * @param {Object} updates - Properties to update
   */
  updateBuilding(index, updates) {
    if (index >= 0 && index < this._state.buildings.length) {
      Object.assign(this._state.buildings[index], updates);
    }
  }

  /**
   * Find building at position
   * @param {number} row
   * @param {number} col
   * @param {number} [footprint=2] - Building footprint size
   * @returns {Object|null}
   */
  getBuildingAt(row, col, footprint = 2) {
    return this._state.buildings.find(b =>
      row >= b.row && row < b.row + footprint &&
      col >= b.col && col < b.col + footprint
    ) || null;
  }

  /**
   * Count buildings of a specific type
   * @param {string} type
   * @returns {number}
   */
  countBuildings(type) {
    return this._state.buildings.filter(b => b.type === type).length;
  }

  /**
   * Remove a building by index
   * @param {number} index - Building index to remove
   * @returns {Object|null} The removed building or null if index invalid
   */
  removeBuilding(index) {
    if (index < 0 || index >= this._state.buildings.length) {
      return null;
    }
    const removed = this._state.buildings.splice(index, 1)[0];
    return removed;
  }

  // ==========================================
  // STIPEND
  // ==========================================

  /**
   * Get stipend state
   * @returns {Object}
   */
  getStipend() {
    return { ...this._state.stipend };
  }

  /**
   * Check if stipend is active
   * @returns {boolean}
   */
  isStipendActive() {
    return this._state.stipend.active;
  }

  /**
   * End the stipend
   * @param {string} reason - Building type that ended the stipend
   */
  endStipend(reason) {
    this._state.stipend.active = false;
    this._state.stipend.endReason = reason;
    this._eventBus.publish(Events.STIPEND_ENDED, {
      totalReceived: this._state.stipend.totalReceived,
      reason
    });
  }

  /**
   * Record stipend received
   * @param {number} amount
   */
  recordStipend(amount) {
    this._state.stipend.totalReceived += amount;
  }

  // ==========================================
  // MERCHANT
  // ==========================================

  /**
   * Get merchant state
   * @returns {Object}
   */
  getMerchant() {
    return { ...this._state.merchant };
  }

  /**
   * Update merchant state
   * @param {Object} updates
   */
  updateMerchant(updates) {
    Object.assign(this._state.merchant, updates);
  }

  /**
   * Check if merchant is disabled
   * @returns {boolean}
   */
  isMerchantDisabled() {
    return this._state.merchant.disabled;
  }

  // ==========================================
  // MILESTONES
  // ==========================================

  /**
   * Get completed milestones
   * @returns {string[]}
   */
  getCompletedMilestones() {
    return [...this._state.completedMilestones];
  }

  /**
   * Check if a milestone is completed
   * @param {string} id
   * @returns {boolean}
   */
  isMilestoneCompleted(id) {
    return this._state.completedMilestones.includes(id);
  }

  /**
   * Mark a milestone as completed
   * @param {string} id
   */
  completeMilestone(id) {
    if (!this._state.completedMilestones.includes(id)) {
      this._state.completedMilestones.push(id);
    }
  }

  // ==========================================
  // UI STATE
  // ==========================================

  /**
   * Get UI state
   * @returns {Object}
   */
  getUIState() {
    return { ...this._state.ui };
  }

  /**
   * Update UI state
   * @param {Object} updates
   */
  updateUIState(updates) {
    Object.assign(this._state.ui, updates);
  }

  /**
   * Get placement mode
   * @returns {string|null}
   */
  getPlacementMode() {
    return this._state.ui.placementMode;
  }

  /**
   * Set placement mode
   * @param {string|null} mode
   */
  setPlacementMode(mode) {
    this._state.ui.placementMode = mode;
    this._eventBus.publish(Events.PLACEMENT_MODE_CHANGED, { mode });
  }

  // ==========================================
  // SERIALIZATION
  // ==========================================

  /**
   * Export full state for saving
   * @returns {Object}
   */
  exportState() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * Import state from save data
   * @param {Object} savedState
   */
  importState(savedState) {
    this._state = JSON.parse(JSON.stringify(savedState));
    this._eventBus.publish(Events.STATE_LOADED, { state: this.exportState() });
  }

  /**
   * Reset to initial state
   */
  reset() {
    this._state = this._createInitialState();
    this._eventBus.publish(Events.GAME_RESET, {});
  }

  // ==========================================
  // BACKWARDS COMPATIBILITY BRIDGE (DEPRECATED)
  // ==========================================

  /**
   * Get direct reference to completed milestones (for legacy code)
   * Returns a Set for compatibility with original code
   * @returns {Set}
   */
  getCompletedMilestonesSet() {
    // Return a proxy Set that syncs with our array
    const arr = this._state.completedMilestones;
    return {
      has: (id) => arr.includes(id),
      add: (id) => {
        if (!arr.includes(id)) arr.push(id);
      },
      delete: (id) => {
        const idx = arr.indexOf(id);
        if (idx > -1) arr.splice(idx, 1);
      },
      get size() { return arr.length; },
      [Symbol.iterator]: function* () { yield* arr; }
    };
  }
}
