/**
 * ProductionService
 * Handles tick-based resource production from buildings
 */

import { Events } from '../core/EventBus.js';
import { getBuildingDef } from '../config/index.js';

export class ProductionService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, resourceService, eventBus) {
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    // Subscribe to game tick events
    this._eventBus.subscribe(Events.TICK, () => this.tick());
  }

  // ==========================================
  // PRODUCTION CALCULATION
  // ==========================================

  /**
   * Get production multiplier for a building based on its level
   * @param {Object} building - Building object
   * @returns {number}
   */
  getProductionMultiplier(building) {
    const def = getBuildingDef(building.type);
    if (!def) return 1;

    // level 0 = base production (mult 1)
    // level 1+ = use upgrade multiplier
    if (building.level > 0 && def.upgrades && def.upgrades[building.level - 1]) {
      return def.upgrades[building.level - 1].mult;
    }
    return 1;
  }

  /**
   * Check if a building can produce (has resources to consume)
   * @param {Object} building - Building object
   * @returns {boolean}
   */
  canProduce(building) {
    const def = getBuildingDef(building.type);
    if (!def) return false;

    // If no consumption required, can always produce
    if (!def.consumes) return true;

    // Check if we have enough resources to consume
    const resources = this._gameState.getResources();
    return Object.entries(def.consumes).every(
      ([res, amt]) => (resources[res] || 0) >= amt
    );
  }

  /**
   * Calculate net production rates for all continuous buildings
   * Processor buildings (isProcessor: true) are handled by ProcessorService
   * @returns {Object} Production rates per resource
   */
  calculateProduction() {
    const production = {};
    const buildings = this._gameState.getBuildings();
    const resources = this._gameState.getResources();

    buildings.forEach(building => {
      const def = getBuildingDef(building.type);
      if (!def) return;

      // Skip processor buildings - handled by ProcessorService
      if (def.isProcessor) return;

      const mult = this.getProductionMultiplier(building);

      // Check if we can produce (have resources to consume)
      let canProduce = true;
      if (def.consumes) {
        canProduce = Object.entries(def.consumes).every(
          ([res, amt]) => (resources[res] || 0) >= amt
        );
      }

      if (canProduce) {
        // Add production
        Object.entries(def.production || {}).forEach(([res, amt]) => {
          production[res] = (production[res] || 0) + amt * mult;
        });

        // Subtract consumption
        if (def.consumes) {
          Object.entries(def.consumes).forEach(([res, amt]) => {
            production[res] = (production[res] || 0) - amt;
          });
        }
      }
    });

    return production;
  }

  /**
   * Calculate production for a specific building
   * @param {Object} building - Building object
   * @returns {{production: Object, consumption: Object, net: Object, canProduce: boolean}}
   */
  calculateBuildingProduction(building) {
    const def = getBuildingDef(building.type);
    if (!def) {
      return { production: {}, consumption: {}, net: {}, canProduce: false };
    }

    const mult = this.getProductionMultiplier(building);
    const canProduce = this.canProduce(building);

    const production = {};
    const consumption = {};
    const net = {};

    // Calculate production
    Object.entries(def.production || {}).forEach(([res, amt]) => {
      production[res] = amt * mult;
      net[res] = (net[res] || 0) + amt * mult;
    });

    // Calculate consumption
    if (def.consumes) {
      Object.entries(def.consumes).forEach(([res, amt]) => {
        consumption[res] = amt;
        net[res] = (net[res] || 0) - amt;
      });
    }

    return { production, consumption, net, canProduce };
  }

  // ==========================================
  // TICK PROCESSING
  // ==========================================

  /**
   * Process one production tick for continuous buildings
   * Processor buildings are handled by ProcessorService
   * Called automatically via EventBus subscription to TICK event
   */
  tick() {
    const buildings = this._gameState.getBuildings();

    // Accumulate all production and consumption for batch processing
    const totalProduction = {};
    const totalConsumption = {};

    buildings.forEach(building => {
      const def = getBuildingDef(building.type);
      if (!def) return;

      // Skip processor buildings - handled by ProcessorService
      if (def.isProcessor) return;

      const mult = this.getProductionMultiplier(building);

      // Check if we can produce (have resources to consume)
      // Use resourceService for current state check
      let canProduce = true;
      if (def.consumes) {
        canProduce = this._resourceService.canAfford(def.consumes);

        // Accumulate consumption if we can produce
        if (canProduce) {
          Object.entries(def.consumes).forEach(([res, amt]) => {
            totalConsumption[res] = (totalConsumption[res] || 0) + amt;
          });
        }
      }

      // Accumulate production if consumption was satisfied
      if (canProduce) {
        Object.entries(def.production || {}).forEach(([res, amt]) => {
          const produced = amt * mult;
          totalProduction[res] = (totalProduction[res] || 0) + produced;
        });
      }
    });

    // Apply consumption first, then production through proper APIs
    // Filter out zero values
    const consumptionToApply = Object.fromEntries(
      Object.entries(totalConsumption).filter(([, amt]) => amt > 0)
    );
    const productionToApply = Object.fromEntries(
      Object.entries(totalProduction).filter(([, amt]) => amt > 0)
    );

    if (Object.keys(consumptionToApply).length > 0) {
      this._resourceService.applyConsumption(consumptionToApply);
    }
    if (Object.keys(productionToApply).length > 0) {
      this._resourceService.applyProduction(productionToApply);
    }
  }

  // ==========================================
  // PRODUCTION QUERIES
  // ==========================================

  /**
   * Get total production rate per second
   * @returns {{gold: number, wheat: number, stone: number, wood: number}}
   */
  getProductionRates() {
    return this.calculateProduction();
  }

  /**
   * Get production rate for a specific resource
   * @param {string} resource - Resource type
   * @returns {number}
   */
  getProductionRate(resource) {
    const production = this.calculateProduction();
    return production[resource] || 0;
  }

  /**
   * Check if any production is happening
   * @returns {boolean}
   */
  isProducing() {
    const production = this.calculateProduction();
    return Object.values(production).some(rate => rate !== 0);
  }

  /**
   * Get buildings that are currently producing
   * @returns {Array}
   */
  getProducingBuildings() {
    const buildings = this._gameState.getBuildings();
    return buildings.filter(b => this.canProduce(b));
  }

  /**
   * Get buildings that are blocked (can't produce due to missing resources)
   * @returns {Array}
   */
  getBlockedBuildings() {
    const buildings = this._gameState.getBuildings();
    return buildings.filter(b => {
      const def = getBuildingDef(b.type);
      // Only count as blocked if it has consumption requirements and can't meet them
      return def && def.consumes && !this.canProduce(b);
    });
  }

  /**
   * Format production rate for display
   * @param {number} rate - Production rate
   * @returns {string}
   */
  formatRate(rate) {
    const prefix = rate >= 0 ? '+' : '';
    return `${prefix}${rate.toFixed(1)}/s`;
  }

  /**
   * Get formatted production rates for all resources
   * @returns {Object} Object with formatted rate strings
   */
  getFormattedRates() {
    const production = this.calculateProduction();
    const formatted = {};

    Object.entries(production).forEach(([res, rate]) => {
      formatted[res] = {
        rate,
        formatted: this.formatRate(rate),
        isPositive: rate > 0,
        isNegative: rate < 0,
        isNeutral: rate === 0
      };
    });

    return formatted;
  }
}
