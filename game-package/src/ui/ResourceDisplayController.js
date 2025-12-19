/**
 * ResourceDisplayController
 * Updates resource display UI (bar and overlay) based on game state
 * Subscribes to TICK events to refresh resource values and production rates
 * Dynamically generates HUD from resource registry
 */

import { Events } from '../core/EventBus.js';
import { getSortedResources, RESOURCES } from '../config/resources.config.js';

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
    // Get resource types from registry, sorted by display order
    this._resourceTypes = getSortedResources().map(r => r.id);
  }

  /**
   * Initialize the controller and subscribe to events
   */
  initialize() {
    // Generate dynamic overlay HTML
    this._generateOverlayHTML();

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
   * Generate the in-canvas resource overlay HTML dynamically
   * Uses a horizontal layout with multiple rows
   * @private
   */
  _generateOverlayHTML() {
    const overlay = document.getElementById('resource-overlay');
    if (!overlay) return;

    // Row 1: Main resources (gold, wheat, stone, wood)
    const mainResources = this._resourceTypes.map(id => {
      const def = RESOURCES[id];
      // Use sprite icon if available, otherwise show emoji
      const iconHtml = def.hasSprite
        ? `<span class="icon icon-20 ${def.icon}"></span>`
        : `<span class="resource-emoji">${def.emoji}</span>`;
      return `
        <div class="resource-overlay-item" data-resource="${id}">
          ${iconHtml}
          <span class="resource-overlay-value" id="overlay-${id}-value">0</span>
          <span class="resource-overlay-rate neutral" id="overlay-${id}-rate">+0/s</span>
        </div>
      `;
    }).join('');

    // Row 2: Production resources (stone/wood production - placeholders for now)
    const productionRow = `
      <div class="resource-overlay-production">
        <div class="production-item">
          <span class="production-label">Stone Prod:</span>
          <span class="icon icon-16 icon-stone"></span>
          <span id="overlay-stone-production">0/s</span>
        </div>
        <div class="production-item">
          <span class="production-label">Wood Prod:</span>
          <span class="icon icon-16 icon-wood"></span>
          <span id="overlay-wood-production">0/s</span>
        </div>
      </div>
    `;

    overlay.innerHTML = `
      <div class="resource-overlay-row">
        ${mainResources}
      </div>
      ${productionRow}
    `;
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
      // Use 0 as default for resources without production rate
      this._updateResourceDisplay(res, resources[res] || 0, production[res] || 0);
    });

    // Update production row (stone/wood production placeholders)
    this._updateProductionRow(production);
  }

  /**
   * Update the production row display (stone/wood production)
   * @param {Object} production - Production rates object
   * @private
   */
  _updateProductionRow(production) {
    const stoneEl = document.getElementById('overlay-stone-production');
    const woodEl = document.getElementById('overlay-wood-production');

    if (stoneEl) {
      const stoneRate = production.stone || 0;
      stoneEl.textContent = `${stoneRate.toFixed(1)}/s`;
      stoneEl.style.color = stoneRate > 0 ? '#7CB342' : '#888';
    }

    if (woodEl) {
      const woodRate = production.wood || 0;
      woodEl.textContent = `${woodRate.toFixed(1)}/s`;
      woodEl.style.color = woodRate > 0 ? '#7CB342' : '#888';
    }
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
