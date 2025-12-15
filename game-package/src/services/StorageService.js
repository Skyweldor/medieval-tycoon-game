/**
 * StorageService
 * Computes resource storage caps based on buildings (primarily Barns)
 */

import { getBuildingDef } from '../config/index.js';

/**
 * Default storage caps per resource type
 * Gold is uncapped (Infinity) while bulk resources have base caps
 */
const BASE_CAPS = {
  gold: Infinity,  // Gold is never capped
  wheat: 100,
  stone: 100,
  wood: 100
};

/**
 * Resources affected by barn storage bonus
 * Gold intentionally excluded - only bulk resources benefit from barns
 */
const STORABLE_RESOURCES = ['wheat', 'stone', 'wood'];

export class StorageService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   */
  constructor(gameState) {
    this._gameState = gameState;

    // Cache for computed caps (invalidated when buildings change)
    this._capsCache = null;
    this._lastBuildingCount = -1;
  }

  // ==========================================
  // CAP COMPUTATION
  // ==========================================

  /**
   * Get storage cap for a specific resource
   * @param {string} type - Resource type (gold, wheat, stone, wood)
   * @returns {number} Storage cap (Infinity for uncapped)
   */
  getCap(type) {
    const caps = this.getAllCaps();
    return caps[type] ?? Infinity;
  }

  /**
   * Get storage caps for all resources
   * @returns {{gold: number, wheat: number, stone: number, wood: number}}
   */
  getAllCaps() {
    // Check if cache is valid
    const buildings = this._gameState.getBuildings();
    const barnCount = buildings.filter(b => b.type === 'barn').length;

    if (this._capsCache && this._lastBuildingCount === barnCount) {
      return { ...this._capsCache };
    }

    // Recompute caps
    this._capsCache = this._computeCaps();
    this._lastBuildingCount = barnCount;

    return { ...this._capsCache };
  }

  /**
   * Compute storage caps based on current buildings
   * @returns {{gold: number, wheat: number, stone: number, wood: number}}
   * @private
   */
  _computeCaps() {
    const caps = { ...BASE_CAPS };
    const buildings = this._gameState.getBuildings();
    const barnDef = getBuildingDef('barn');
    const baseBonus = barnDef?.storageBonus || 100;

    // Sum up storage bonuses from all barns
    buildings.forEach(building => {
      if (building.type === 'barn') {
        // Get multiplier from upgrade level
        const mult = this._getBarnMultiplier(building);
        const bonus = baseBonus * mult;

        // Apply bonus to all storable resources
        STORABLE_RESOURCES.forEach(res => {
          caps[res] += bonus;
        });
      }
    });

    return caps;
  }

  /**
   * Get storage multiplier for a barn based on its level
   * @param {Object} barn - Barn building object
   * @returns {number}
   * @private
   */
  _getBarnMultiplier(barn) {
    const def = getBuildingDef('barn');
    if (!def) return 1;

    // level 0 = base (mult 1)
    // level 1+ = use upgrade multiplier
    if (barn.level > 0 && def.upgrades && def.upgrades[barn.level - 1]) {
      return def.upgrades[barn.level - 1].mult;
    }
    return 1;
  }

  // ==========================================
  // CAP QUERIES
  // ==========================================

  /**
   * Check if a resource is at its storage cap
   * @param {string} type - Resource type
   * @returns {boolean}
   */
  isAtCap(type) {
    const current = this._gameState.getResource(type);
    const cap = this.getCap(type);
    return current >= cap;
  }

  /**
   * Check if any storable resource is at cap
   * @returns {boolean}
   */
  isAnyAtCap() {
    return STORABLE_RESOURCES.some(res => this.isAtCap(res));
  }

  /**
   * Get remaining storage space for a resource
   * @param {string} type - Resource type
   * @returns {number} Remaining space (Infinity for uncapped)
   */
  getRemainingSpace(type) {
    const current = this._gameState.getResource(type);
    const cap = this.getCap(type);
    return Math.max(0, cap - current);
  }

  /**
   * Get storage utilization percentage (0-100)
   * @param {string} type - Resource type
   * @returns {number} Percentage (100 if at or over cap, 0 if uncapped)
   */
  getUtilization(type) {
    const cap = this.getCap(type);
    if (cap === Infinity) return 0;

    const current = this._gameState.getResource(type);
    return Math.min(100, Math.round((current / cap) * 100));
  }

  /**
   * Clamp an amount to available storage space
   * @param {string} type - Resource type
   * @param {number} amount - Amount to add
   * @returns {number} Clamped amount that can actually be stored
   */
  clampToAvailable(type, amount) {
    const remaining = this.getRemainingSpace(type);
    return Math.min(amount, remaining);
  }

  // ==========================================
  // STORAGE INFO FOR UI
  // ==========================================

  /**
   * Get storage info for all resources (for UI display)
   * @returns {Object} Object with current, cap, remaining, utilization per resource
   */
  getStorageInfo() {
    const resources = this._gameState.getResources();
    const caps = this.getAllCaps();
    const info = {};

    Object.keys(resources).forEach(type => {
      const current = resources[type];
      const cap = caps[type];
      const isCapped = cap !== Infinity;

      info[type] = {
        current,
        cap,
        isCapped,
        remaining: isCapped ? Math.max(0, cap - current) : Infinity,
        utilization: isCapped ? Math.min(100, Math.round((current / cap) * 100)) : 0,
        isAtCap: isCapped && current >= cap,
        displayCap: isCapped ? cap : null  // null for UI to show no cap
      };
    });

    return info;
  }

  /**
   * Format storage for display (e.g., "80/200" or "500")
   * @param {string} type - Resource type
   * @returns {string}
   */
  formatStorage(type) {
    const current = this._gameState.getResource(type);
    const cap = this.getCap(type);

    if (cap === Infinity) {
      return current.toString();
    }
    return `${current}/${cap}`;
  }

  /**
   * Get resources that are at or near cap (for warnings)
   * @param {number} [threshold=90] - Warning threshold percentage
   * @returns {string[]} Array of resource types at or near cap
   */
  getResourcesNearCap(threshold = 90) {
    return STORABLE_RESOURCES.filter(res => this.getUtilization(res) >= threshold);
  }

  // ==========================================
  // BARN-SPECIFIC INFO
  // ==========================================

  /**
   * Get total storage bonus from all barns
   * @returns {number}
   */
  getTotalBarnBonus() {
    const buildings = this._gameState.getBuildings();
    const barnDef = getBuildingDef('barn');
    const baseBonus = barnDef?.storageBonus || 100;
    let totalBonus = 0;

    buildings.forEach(building => {
      if (building.type === 'barn') {
        totalBonus += baseBonus * this._getBarnMultiplier(building);
      }
    });

    return totalBonus;
  }

  /**
   * Get number of barns
   * @returns {number}
   */
  getBarnCount() {
    return this._gameState.getBuildings().filter(b => b.type === 'barn').length;
  }

  /**
   * Check if a resource type has storage cap
   * @param {string} type - Resource type
   * @returns {boolean}
   */
  isCapped(type) {
    return this.getCap(type) !== Infinity;
  }

  /**
   * Invalidate the caps cache (call when buildings change)
   */
  invalidateCache() {
    this._capsCache = null;
    this._lastBuildingCount = -1;
  }
}
