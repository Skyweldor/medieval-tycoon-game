/**
 * MarketPanelController
 * Updates market trading panel UI
 * Subscribes to building and market events
 */

import { Events } from '../core/EventBus.js';
import { RESOURCES } from '../config/index.js';

export class MarketPanelController {
  /**
   * @param {import('../services/MarketService.js').MarketService} marketService
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(marketService, resourceService, eventBus) {
    this._marketService = marketService;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    this._statusId = 'market-status';
    this._contentId = 'market-trading-content';
    this._levelId = 'market-level';
    this._tradesId = 'market-trades';
    this._unsubscribers = [];
  }

  /**
   * Initialize the controller and subscribe to events
   */
  initialize() {
    // Update when building placed (might be a market)
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.BUILDING_PLACED, () => this.update())
    );

    // Update when building upgraded (market level changes)
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.BUILDING_UPGRADED, () => this.update())
    );

    // Update when market sale occurs
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.MARKET_SALE, () => this.update())
    );

    // Update when resources change (affects available amounts)
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.RESOURCES_CHANGED, () => this.update())
    );

    // Update on game reset
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.GAME_RESET, () => this.update())
    );

    // Initial render
    this.update();

    // Wire up trade button clicks
    this._setupTradeListeners();
  }

  /**
   * Clean up event subscriptions
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  /**
   * Update the market panel
   */
  update() {
    const status = document.getElementById(this._statusId);
    const content = document.getElementById(this._contentId);

    if (!this._marketService.hasMarket()) {
      // Show locked message
      if (status) status.style.display = 'block';
      if (content) content.style.display = 'none';
      return;
    }

    // Show trading UI
    if (status) status.style.display = 'none';
    if (content) content.style.display = 'block';

    // Update level display
    const levelEl = document.getElementById(this._levelId);
    if (levelEl) {
      levelEl.textContent = this._marketService.getLevel();
    }

    // Update trade rows
    const tradesEl = document.getElementById(this._tradesId);
    if (tradesEl) {
      tradesEl.innerHTML = this._generateTradesHTML();
      this._setupTradeListeners();
    }
  }

  /**
   * Get icon HTML for a resource (sprite or emoji fallback)
   * @param {string} resourceId
   * @param {number} [size=16] - Icon size (16, 20, 32, 64)
   * @returns {string}
   * @private
   */
  _getResourceIcon(resourceId, size = 16) {
    const def = RESOURCES[resourceId];
    if (!def) return resourceId;

    if (def.hasSprite) {
      return `<span class="${def.iconBase} icon-${size} ${def.icon}"></span>`;
    }
    return `<span class="resource-emoji">${def.emoji}</span>`;
  }

  /**
   * Get display name for a resource
   * @param {string} resourceId
   * @returns {string}
   * @private
   */
  _getResourceName(resourceId) {
    const def = RESOURCES[resourceId];
    return def?.name || resourceId;
  }

  /**
   * Generate HTML for trade rows
   * Uses data attributes instead of onclick for proper event handling
   * @returns {string}
   * @private
   */
  _generateTradesHTML() {
    const tradeData = this._marketService.getTradeData();

    return tradeData.map(({ resource, have, price }) => {
      const icon = this._getResourceIcon(resource, 16);
      const goldIcon = this._getResourceIcon('gold', 16);
      const name = this._getResourceName(resource);
      return `
        <div class="market-row">
          <span class="market-res" title="${name}">${icon} ${have}</span>
          <span class="market-price">${price}${goldIcon}</span>
          <div class="market-btns">
            <button data-action="sell" data-resource="${resource}" data-amount="1" ${have < 1 ? 'disabled' : ''}>1</button>
            <button data-action="sell" data-resource="${resource}" data-amount="10" ${have < 10 ? 'disabled' : ''}>10</button>
            <button data-action="sell" data-resource="${resource}" data-amount="${have}" ${have === 0 ? 'disabled' : ''}>All</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Set up click listeners for trade buttons
   * @private
   */
  _setupTradeListeners() {
    const tradesEl = document.getElementById(this._tradesId);
    if (!tradesEl) return;

    // Use event delegation
    tradesEl.onclick = (e) => {
      const button = e.target.closest('button[data-action="sell"]');
      if (!button || button.disabled) return;

      const resource = button.dataset.resource;
      const amount = parseInt(button.dataset.amount, 10);

      this.sell(resource, amount);
    };
  }

  /**
   * Sell resources at the market
   * @param {string} resource - Resource type
   * @param {number} amount - Amount to sell
   */
  sell(resource, amount) {
    const result = this._marketService.sell(resource, amount);

    if (result.success) {
      this._eventBus.publish(Events.NOTIFICATION, {
        message: `Sold ${result.amount} ${resource} for ${result.gold} gold!`,
        type: 'success'
      });
    } else if (result.error) {
      this._eventBus.publish(Events.NOTIFICATION, {
        message: result.error,
        type: 'error'
      });
    }
  }

  /**
   * Check if market is available
   * @returns {boolean}
   */
  isAvailable() {
    return this._marketService.hasMarket();
  }

  /**
   * Get market level
   * @returns {number}
   */
  getLevel() {
    return this._marketService.getLevel();
  }
}
