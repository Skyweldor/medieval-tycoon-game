/**
 * MerchantService
 * Handles the traveling merchant system
 */

import { Events } from '../core/EventBus.js';
import { MERCHANT_CONFIG, getTradeableResources
 } from '../config/index.js';

export class MerchantService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, resourceService, eventBus) {
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    // Timeout references (managed internally)
    this._visitTimeout = null;
    this._nextVisitTimeout = null;
    this._countdownInterval = null;

    // Subscribe to building placed event to check for market
    this._eventBus.subscribe(Events.BUILDING_PLACED, (data) => {
      if (data.isMarket) {
        this.disable();
      }
    });
  }

  // ==========================================
  // MERCHANT STATE
  // ==========================================

  /**
   * Check if merchant is currently visiting
   * @returns {boolean}
   */
  isActive() {
    return this._gameState.getMerchant().active;
  }

  /**
   * Check if merchant is disabled (market built)
   * @returns {boolean}
   */
  isDisabled() {
    return this._gameState.isMerchantDisabled();
  }

  /**
   * Get full merchant state
   * @returns {Object}
   */
  getState() {
    return this._gameState.getMerchant();
  }

  /**
   * Get sold amounts for current visit
   * @returns {{wheat: number, stone: number, wood: number}}
   */
  getSoldThisVisit() {
    return { ...this._gameState.getMerchant().soldThisVisit };
  }

  // ==========================================
  // MERCHANT SCHEDULING
  // ==========================================

  /**
   * Schedule the next merchant visit
   * @param {boolean} [isFirst=false] - Is this the first visit after game start?
   */
  scheduleVisit(isFirst = false) {
    if (this.isDisabled()) return;

    // Clear any existing timeout
    if (this._nextVisitTimeout) {
      clearTimeout(this._nextVisitTimeout);
    }

    const delay = isFirst
      ? MERCHANT_CONFIG.firstAppearDelay
      : this._randomBetween(MERCHANT_CONFIG.minInterval, MERCHANT_CONFIG.maxInterval);

    this._gameState.updateMerchant({
      nextVisitTime: Date.now() + delay
    });

    this._nextVisitTimeout = setTimeout(() => {
      if (!this.isDisabled()) {
        this.arrive();
      }
    }, delay);
  }

  /**
   * Merchant arrives for a visit
   */
  arrive() {
    // Initialize soldThisVisit from registry
    const soldThisVisit = {};
    getTradeableResources().forEach(r => {
      soldThisVisit[r.id] = 0;
    });

    this._gameState.updateMerchant({
      active: true,
      visitStartTime: Date.now(),
      soldThisVisit,
      totalVisits: this._gameState.getMerchant().totalVisits + 1
    });

    // Publish event
    this._eventBus.publish(Events.MERCHANT_ARRIVED, {
      visitNumber: this._gameState.getMerchant().totalVisits,
      duration: MERCHANT_CONFIG.visitDuration
    });

    // Schedule departure
    this._visitTimeout = setTimeout(() => {
      this.depart();
    }, MERCHANT_CONFIG.visitDuration);
  }

  /**
   * Merchant departs
   */
  depart() {
    if (!this.isActive()) return;

    const soldThisVisit = this.getSoldThisVisit();

    this._gameState.updateMerchant({
      active: false
    });

    // Clear visit timeout
    if (this._visitTimeout) {
      clearTimeout(this._visitTimeout);
      this._visitTimeout = null;
    }

    // Publish event
    this._eventBus.publish(Events.MERCHANT_DEPARTED, {
      soldThisVisit
    });

    // Schedule next visit
    this.scheduleVisit();
  }

  /**
   * Disable the merchant permanently (when market is built)
   */
  disable() {
    this._gameState.updateMerchant({
      disabled: true,
      active: false
    });

    // Clear all timeouts
    if (this._visitTimeout) {
      clearTimeout(this._visitTimeout);
      this._visitTimeout = null;
    }
    if (this._nextVisitTimeout) {
      clearTimeout(this._nextVisitTimeout);
      this._nextVisitTimeout = null;
    }
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }

    // Publish event
    this._eventBus.publish(Events.MERCHANT_DISABLED, {});
  }

  // ==========================================
  // TRADING
  // ==========================================

  /**
   * Get remaining purchase limit for a resource
   * @param {string} resource - Resource type
   * @returns {number}
   */
  getRemainingLimit(resource) {
    const sold = this._gameState.getMerchant().soldThisVisit[resource] || 0;
    const max = MERCHANT_CONFIG.maxPerVisit[resource] || 0;
    return Math.max(0, max - sold);
  }

  /**
   * Get price for a resource
   * @param {string} resource - Resource type
   * @returns {number}
   */
  getPrice(resource) {
    return MERCHANT_CONFIG.prices[resource] || 0;
  }

  /**
   * Get max sellable amount for a resource (considers limits and inventory)
   * @param {string} resource - Resource type
   * @returns {number}
   */
  getMaxSellable(resource) {
    const have = this._resourceService.getResource(resource);
    const remaining = this.getRemainingLimit(resource);
    return Math.min(have, remaining);
  }

  /**
   * Sell resources to the merchant
   * @param {string} resource - Resource type
   * @param {number} [amount=1] - Amount to sell
   * @returns {{success: boolean, amount: number, gold: number, error: string|null}}
   */
  sell(resource, amount = 1) {
    if (!this.isActive()) {
      return { success: false, amount: 0, gold: 0, error: 'Merchant is not here!' };
    }

    const maxCanSell = this.getRemainingLimit(resource);
    const have = this._resourceService.getResource(resource);
    const actualAmount = Math.min(amount, maxCanSell, have);

    if (actualAmount <= 0) {
      if (have <= 0) {
        return { success: false, amount: 0, gold: 0, error: `No ${resource} to sell!` };
      } else {
        return { success: false, amount: 0, gold: 0, error: `Merchant won't buy more ${resource} this visit!` };
      }
    }

    const pricePerUnit = this.getPrice(resource);

    // Use ResourceService mutation API for the trade
    const result = this._resourceService.sellResource(resource, actualAmount, pricePerUnit);

    if (!result.success) {
      return { success: false, amount: 0, gold: 0, error: `Failed to sell ${resource}!` };
    }

    // Update sold this visit
    const merchant = this._gameState.getMerchant();
    this._gameState.updateMerchant({
      soldThisVisit: {
        ...merchant.soldThisVisit,
        [resource]: (merchant.soldThisVisit[resource] || 0) + actualAmount
      }
    });

    // Publish event
    this._eventBus.publish(Events.MERCHANT_SALE, {
      resource,
      amount: actualAmount,
      goldEarned: result.goldReceived,
      remainingLimit: this.getRemainingLimit(resource)
    });

    return { success: true, amount: actualAmount, gold: result.goldReceived, error: null };
  }

  // ==========================================
  // COUNTDOWN HELPERS
  // ==========================================

  /**
   * Get remaining visit time in seconds
   * @returns {number}
   */
  getRemainingTime() {
    if (!this.isActive()) return 0;

    const state = this._gameState.getMerchant();
    const elapsed = Date.now() - state.visitStartTime;
    return Math.max(0, Math.ceil((MERCHANT_CONFIG.visitDuration - elapsed) / 1000));
  }

  /**
   * Check if visit is urgent (less than 10 seconds remaining)
   * @returns {boolean}
   */
  isUrgent() {
    return this.getRemainingTime() <= 10;
  }

  // ==========================================
  // UI DATA HELPERS
  // ==========================================

  /**
   * Get trade row data for UI rendering
   * @returns {Array<{resource: string, have: number, sold: number, maxPerVisit: number, remaining: number, price: number, canSell: number}>}
   */
  getTradeData() {
    return getTradeableResources().map(r => {
      const resource = r.id;
      const have = this._resourceService.getResource(resource);
      const sold = this._gameState.getMerchant().soldThisVisit[resource] || 0;
      const maxPerVisit = MERCHANT_CONFIG.maxPerVisit[resource] || 0;
      const remaining = Math.max(0, maxPerVisit - sold);
      const price = MERCHANT_CONFIG.prices[resource] || 0;
      const canSell = Math.min(have, remaining);

      return {
        resource,
        have,
        sold,
        maxPerVisit,
        remaining,
        price,
        canSell
      };
    });
  }

  /**
   * Capitalize a string (utility for UI)
   * @param {string} str
   * @returns {string}
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  /**
   * Generate random number between min and max
   * @private
   */
  _randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
