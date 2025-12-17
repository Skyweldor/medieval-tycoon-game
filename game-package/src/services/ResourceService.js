/**
 * ResourceService
 * Handles resource operations: checking affordability, spending, and granting rewards
 */

import { Events } from '../core/EventBus.js';
import { RESOURCES } from '../config/resources.config.js';

export class ResourceService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, eventBus) {
    this._gameState = gameState;
    this._eventBus = eventBus;
    this._storageService = null;  // Set via setStorageService() after initialization
  }

  /**
   * Set the storage service reference (called after service container setup)
   * @param {import('./StorageService.js').StorageService} storageService
   */
  setStorageService(storageService) {
    this._storageService = storageService;
  }

  // ==========================================
  // RESOURCE QUERIES
  // ==========================================

  /**
   * Get current resources
   * @returns {{gold: number, wheat: number, stone: number, wood: number}}
   */
  getResources() {
    return this._gameState.getResources();
  }

  /**
   * Get a specific resource amount
   * @param {string} type - Resource type (gold, wheat, stone, wood)
   * @returns {number}
   */
  getResource(type) {
    return this._gameState.getResource(type);
  }

  // ==========================================
  // AFFORDABILITY CHECKS
  // ==========================================

  /**
   * Check if player can afford a cost
   * @param {Object} cost - Cost object {gold: n, wheat: n, etc.}
   * @returns {boolean}
   */
  canAfford(cost) {
    if (!cost) return true;

    const resources = this._gameState.getResources();
    return Object.entries(cost).every(([res, amt]) => {
      return (resources[res] || 0) >= amt;
    });
  }

  /**
   * Check if a building/feature is unlocked based on requirements
   * @param {Object|null} req - Requirements object {gold: n, wheat: n, etc.}
   * @returns {boolean}
   */
  isUnlocked(req) {
    if (!req) return true;

    const resources = this._gameState.getResources();
    return Object.entries(req).every(([res, amt]) => {
      return (resources[res] || 0) >= amt;
    });
  }

  /**
   * Get missing resources for a cost
   * @param {Object} cost - Cost object
   * @returns {Object} Object with missing amounts (empty if affordable)
   */
  getMissingResources(cost) {
    if (!cost) return {};

    const resources = this._gameState.getResources();
    const missing = {};

    Object.entries(cost).forEach(([res, amt]) => {
      const have = resources[res] || 0;
      if (have < amt) {
        missing[res] = amt - have;
      }
    });

    return missing;
  }

  // ==========================================
  // RESOURCE MODIFICATIONS
  // ==========================================

  /**
   * Spend resources (deduct cost)
   * @param {Object} cost - Cost object {gold: n, wheat: n, etc.}
   * @returns {boolean} True if successful, false if insufficient resources
   */
  spendResources(cost) {
    if (!cost) return true;

    if (!this.canAfford(cost)) {
      return false;
    }

    return this._gameState.subtractResources(cost);
  }

  /**
   * Grant a reward (add resources)
   * @param {Object} reward - Reward object {gold: n, wheat: n, etc.}
   */
  grantReward(reward) {
    if (!reward) return;
    this._gameState.addResources(reward);
  }

  /**
   * Add a specific resource
   * @param {string} type - Resource type
   * @param {number} amount - Amount to add
   */
  addResource(type, amount) {
    this._gameState.addResources({ [type]: amount });
  }

  /**
   * Subtract a specific resource
   * @param {string} type - Resource type
   * @param {number} amount - Amount to subtract
   * @returns {boolean} True if successful
   */
  subtractResource(type, amount) {
    return this._gameState.subtractResources({ [type]: amount });
  }

  // ==========================================
  // PRODUCTION HELPERS
  // ==========================================

  /**
   * Apply production (add resources from buildings)
   * @param {Object} production - Production amounts {gold: n, wheat: n, etc.}
   */
  applyProduction(production) {
    if (!production || Object.keys(production).length === 0) return;
    this._gameState.addResources(production);
  }

  /**
   * Apply consumption (subtract resources used by buildings)
   * @param {Object} consumption - Consumption amounts
   * @returns {boolean} True if all consumption was satisfied
   */
  applyConsumption(consumption) {
    if (!consumption || Object.keys(consumption).length === 0) return true;

    // Check if we can afford all consumption
    if (!this.canAfford(consumption)) {
      return false;
    }

    return this._gameState.subtractResources(consumption);
  }

  /**
   * Process production with consumption
   * Only produces if consumption can be satisfied
   * @param {Object} production - What the building produces
   * @param {Object} consumption - What the building consumes
   * @returns {boolean} True if production occurred
   */
  processProductionWithConsumption(production, consumption) {
    // If there's consumption, check if we can afford it
    if (consumption && Object.keys(consumption).length > 0) {
      if (!this.canAfford(consumption)) {
        return false;
      }
      this._gameState.subtractResources(consumption);
    }

    // Apply production
    if (production && Object.keys(production).length > 0) {
      this._gameState.addResources(production);
    }

    return true;
  }

  // ==========================================
  // TRADING HELPERS
  // ==========================================

  /**
   * Sell resources for gold
   * @param {string} resourceType - Type of resource to sell
   * @param {number} quantity - Amount to sell
   * @param {number} pricePerUnit - Gold received per unit
   * @returns {{success: boolean, goldReceived: number}} Result
   */
  sellResource(resourceType, quantity, pricePerUnit) {
    const currentAmount = this.getResource(resourceType);

    if (currentAmount < quantity) {
      return { success: false, goldReceived: 0 };
    }

    const goldReceived = quantity * pricePerUnit;

    // Deduct resource and add gold
    this._gameState.subtractResources({ [resourceType]: quantity });
    this._gameState.addResources({ gold: goldReceived });

    return { success: true, goldReceived };
  }

  /**
   * Buy resources with gold
   * @param {string} resourceType - Type of resource to buy
   * @param {number} quantity - Amount to buy
   * @param {number} pricePerUnit - Gold cost per unit
   * @returns {{success: boolean, goldSpent: number}} Result
   */
  buyResource(resourceType, quantity, pricePerUnit) {
    const totalCost = quantity * pricePerUnit;

    if (!this.canAfford({ gold: totalCost })) {
      return { success: false, goldSpent: 0 };
    }

    // Deduct gold and add resource
    this._gameState.subtractResources({ gold: totalCost });
    this._gameState.addResources({ [resourceType]: quantity });

    return { success: true, goldSpent: totalCost };
  }

  // ==========================================
  // FORMATTING HELPERS
  // ==========================================

  /**
   * Format a number for display (K, M suffixes)
   * @param {number} num
   * @returns {string}
   */
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  }

  /**
   * Format a cost object for display
   * @param {Object} cost - Cost object
   * @returns {string}
   */
  formatCost(cost) {
    if (!cost) return '';

    return Object.entries(cost)
      .map(([res, amt]) => `${this.formatNumber(amt)} ${this.getResourceEmoji(res)}`)
      .join(' ');
  }

  /**
   * Get resource emoji
   * @param {string} type - Resource type
   * @returns {string}
   */
  getResourceEmoji(type) {
    const def = RESOURCES[type];
    return def?.emoji || type;
  }

  // ==========================================
  // STORAGE CAP QUERIES
  // ==========================================

  /**
   * Get storage cap for a resource
   * @param {string} type - Resource type
   * @returns {number} Cap (Infinity if uncapped or no storage service)
   */
  getCap(type) {
    if (!this._storageService) return Infinity;
    return this._storageService.getCap(type);
  }

  /**
   * Get all storage caps
   * @returns {{gold: number, wheat: number, stone: number, wood: number}}
   */
  getAllCaps() {
    if (!this._storageService) {
      return { gold: Infinity, wheat: Infinity, stone: Infinity, wood: Infinity };
    }
    return this._storageService.getAllCaps();
  }

  /**
   * Check if a resource is at its storage cap
   * @param {string} type - Resource type
   * @returns {boolean}
   */
  isAtCap(type) {
    if (!this._storageService) return false;
    return this._storageService.isAtCap(type);
  }

  /**
   * Get remaining storage space for a resource
   * @param {string} type - Resource type
   * @returns {number}
   */
  getRemainingSpace(type) {
    if (!this._storageService) return Infinity;
    return this._storageService.getRemainingSpace(type);
  }

  /**
   * Get storage utilization percentage (0-100)
   * @param {string} type - Resource type
   * @returns {number}
   */
  getUtilization(type) {
    if (!this._storageService) return 0;
    return this._storageService.getUtilization(type);
  }

  /**
   * Get full storage info for all resources
   * @returns {Object}
   */
  getStorageInfo() {
    if (!this._storageService) {
      const resources = this._gameState.getResources();
      const info = {};
      Object.keys(resources).forEach(type => {
        info[type] = {
          current: resources[type],
          cap: Infinity,
          isCapped: false,
          remaining: Infinity,
          utilization: 0,
          isAtCap: false,
          displayCap: null
        };
      });
      return info;
    }
    return this._storageService.getStorageInfo();
  }

  /**
   * Format a resource value with its cap for display
   * @param {string} type - Resource type
   * @returns {string} e.g., "80/200" or "500" if uncapped
   */
  formatWithCap(type) {
    const current = this.getResource(type);
    const cap = this.getCap(type);

    if (cap === Infinity) {
      return this.formatNumber(current);
    }
    return `${this.formatNumber(current)}/${this.formatNumber(cap)}`;
  }

  /**
   * Check if resource has a storage cap
   * @param {string} type - Resource type
   * @returns {boolean}
   */
  isCapped(type) {
    return this.getCap(type) !== Infinity;
  }

  /**
   * Get resources that are at or near cap (for warnings)
   * @param {number} [threshold=90] - Warning threshold percentage
   * @returns {string[]}
   */
  getResourcesNearCap(threshold = 90) {
    if (!this._storageService) return [];
    return this._storageService.getResourcesNearCap(threshold);
  }
}
