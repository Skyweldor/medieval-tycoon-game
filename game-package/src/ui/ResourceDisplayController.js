/**
 * ResourceDisplayController
 * Updates resource display UI (bar and overlay) based on game state
 * Subscribes to TICK events to refresh resource values and production rates
 */

import { Events } from '../core/EventBus.js';

export class ResourceDisplayController {
  /**
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   * @param {import('../services/ProductionService.js').ProductionService} productionService
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, productionService, resourceService, eventBus) {
    this._gameState = gameState;
    this._productionService = productionService;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    this._unsubscribers = [];
    this._resourceTypes = ['gold', 'wheat', 'stone', 'wood'];
  }

  /**
   * Initialize the controller and subscribe to events
   */
  initialize() {
    // Update on every tick
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.TICK, () => this.update())
    );

    // Also update when resources change directly (e.g., from trades)
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.RESOURCES_CHANGED, () => this.update())
    );

    // Initial render
    this.update();
  }

  /**
   * Clean up event subscriptions
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  /**
   * Update all resource displays
   */
  update() {
    const resources = this._gameState.getResources();
    const production = this._productionService.calculateProduction();

    this._resourceTypes.forEach(res => {
      this._updateResourceDisplay(res, resources[res], production[res]);
    });
  }

  /**
   * Update display for a single resource
   * @param {string} type - Resource type (gold, wheat, stone, wood)
   * @param {number} value - Current resource value
   * @param {number} rate - Production rate per second
   * @private
   */
  _updateResourceDisplay(type, value, rate) {
    // Get storage info for cap display
    const cap = this._resourceService.getCap(type);
    const isCapped = cap !== Infinity;
    const isAtCap = isCapped && value >= cap;
    const isNearCap = isCapped && !isAtCap && (value / cap) >= 0.9;

    // Format value with cap if applicable
    const formattedValue = isCapped
      ? `${this._resourceService.formatNumber(value)}/${this._resourceService.formatNumber(cap)}`
      : this._resourceService.formatNumber(value);

    const rateText = this._formatRate(rate, isAtCap);
    const rateClass = this._getRateClass(rate, isAtCap);
    const overlayRateClass = this._getOverlayRateClass(rate, isAtCap);
    const valueClass = this._getValueClass(isAtCap, isNearCap);

    // Update main resource bar
    const valueEl = document.getElementById(`${type}-value`);
    const rateEl = document.getElementById(`${type}-rate`);

    if (valueEl) {
      valueEl.textContent = formattedValue;
      valueEl.className = `resource-value ${valueClass}`;
    }
    if (rateEl) {
      rateEl.textContent = rateText;
      rateEl.className = rateClass;
    }

    // Update in-canvas overlay
    const overlayValueEl = document.getElementById(`overlay-${type}-value`);
    const overlayRateEl = document.getElementById(`overlay-${type}-rate`);

    if (overlayValueEl) {
      overlayValueEl.textContent = formattedValue;
      overlayValueEl.className = `resource-overlay-value ${valueClass}`;
    }
    if (overlayRateEl) {
      overlayRateEl.textContent = rateText;
      overlayRateEl.className = overlayRateClass;
    }
  }

  /**
   * Get CSS class for resource value based on cap status
   * @param {boolean} isAtCap
   * @param {boolean} isNearCap
   * @returns {string}
   * @private
   */
  _getValueClass(isAtCap, isNearCap) {
    if (isAtCap) return 'at-cap';
    if (isNearCap) return 'near-cap';
    return '';
  }

  /**
   * Format production rate for display
   * @param {number} rate
   * @param {boolean} [isAtCap=false] - Whether resource is at storage cap
   * @returns {string}
   * @private
   */
  _formatRate(rate, isAtCap = false) {
    // Show "FULL" indicator when at cap with positive production
    if (isAtCap && rate > 0) {
      return 'FULL';
    }
    const prefix = rate >= 0 ? '+' : '';
    return `${prefix}${rate.toFixed(1)}/s`;
  }

  /**
   * Get CSS class for resource rate element
   * @param {number} rate
   * @param {boolean} [isAtCap=false] - Whether resource is at storage cap
   * @returns {string}
   * @private
   */
  _getRateClass(rate, isAtCap = false) {
    if (isAtCap && rate > 0) return 'resource-rate at-cap';
    if (rate > 0) return 'resource-rate positive';
    if (rate < 0) return 'resource-rate negative';
    return 'resource-rate neutral';
  }

  /**
   * Get CSS class for overlay rate element
   * @param {number} rate
   * @param {boolean} [isAtCap=false] - Whether resource is at storage cap
   * @returns {string}
   * @private
   */
  _getOverlayRateClass(rate, isAtCap = false) {
    if (isAtCap && rate > 0) return 'resource-overlay-rate at-cap';
    if (rate > 0) return 'resource-overlay-rate positive';
    if (rate < 0) return 'resource-overlay-rate negative';
    return 'resource-overlay-rate neutral';
  }

  /**
   * Get current resource value
   * @param {string} type - Resource type
   * @returns {number}
   */
  getResourceValue(type) {
    return this._gameState.getResource(type);
  }

  /**
   * Get current production rate
   * @param {string} type - Resource type
   * @returns {number}
   */
  getProductionRate(type) {
    const production = this._productionService.calculateProduction();
    return production[type] || 0;
  }
}
