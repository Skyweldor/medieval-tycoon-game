/**
 * MarketService
 * Handles the permanent market trading system
 */

import { Events } from '../core/EventBus.js';
import { MARKET_CONFIG } from '../config/index.js';

export class MarketService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./BuildingService.js').BuildingService} buildingService
   * @param {import('./ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, buildingService, resourceService, eventBus) {
    this._gameState = gameState;
    this._buildingService = buildingService;
    this._resourceService = resourceService;
    this._eventBus = eventBus;
  }

  // ==========================================
  // MARKET STATE
  // ==========================================

  /**
   * Check if player has a market
   * @returns {boolean}
   */
  hasMarket() {
    return this._buildingService.hasMarket();
  }

  /**
   * Get market level (0 if no market)
   * @returns {number}
   */
  getLevel() {
    return this._buildingService.getMarketLevel();
  }

  /**
   * Check if market is available for trading
   * @returns {boolean}
   */
  isAvailable() {
    return this.hasMarket();
  }

  // ==========================================
  // PRICING
  // ==========================================

  /**
   * Get level bonus multiplier
   * @returns {number}
   */
  getLevelBonus() {
    const level = this.getLevel();
    if (level <= 0) return 1;
    // +10% per level above 1
    return 1 + (level - 1) * (MARKET_CONFIG.levelBonusPercent / 100);
  }

  /**
   * Get base price for a resource
   * @param {string} resource - Resource type
   * @returns {number}
   */
  getBasePrice(resource) {
    return MARKET_CONFIG.prices[resource] || 0;
  }

  /**
   * Get final price for a resource (with level bonus)
   * @param {string} resource - Resource type
   * @returns {number}
   */
  getPrice(resource) {
    const basePrice = this.getBasePrice(resource);
    const levelBonus = this.getLevelBonus();
    return Math.floor(basePrice * levelBonus);
  }

  /**
   * Get prices for all resources
   * @returns {{wheat: number, stone: number, wood: number}}
   */
  getAllPrices() {
    return {
      wheat: this.getPrice('wheat'),
      stone: this.getPrice('stone'),
      wood: this.getPrice('wood')
    };
  }

  // ==========================================
  // TRADING
  // ==========================================

  /**
   * Get max sellable amount for a resource
   * @param {string} resource - Resource type
   * @returns {number}
   */
  getMaxSellable(resource) {
    return this._resourceService.getResource(resource);
  }

  /**
   * Sell resources at the market
   * @param {string} resource - Resource type
   * @param {number} [amount=1] - Amount to sell
   * @returns {{success: boolean, amount: number, gold: number, error: string|null}}
   */
  sell(resource, amount = 1) {
    if (!this.hasMarket()) {
      return { success: false, amount: 0, gold: 0, error: 'No market available!' };
    }

    const have = this._resourceService.getResource(resource);
    const actualAmount = Math.min(amount, have);

    if (actualAmount <= 0) {
      return { success: false, amount: 0, gold: 0, error: `No ${resource} to sell!` };
    }

    const finalPrice = this.getPrice(resource);
    const goldEarned = actualAmount * finalPrice;

    // Update resources directly for performance
    const resources = this._gameState.getResourcesRef();
    resources[resource] -= actualAmount;
    resources.gold += goldEarned;

    // Publish event
    this._eventBus.publish(Events.MARKET_SALE, {
      resource,
      amount: actualAmount,
      pricePerUnit: finalPrice,
      goldEarned,
      marketLevel: this.getLevel()
    });

    return { success: true, amount: actualAmount, gold: goldEarned, error: null };
  }

  /**
   * Sell all of a resource type
   * @param {string} resource - Resource type
   * @returns {{success: boolean, amount: number, gold: number, error: string|null}}
   */
  sellAll(resource) {
    const amount = this._resourceService.getResource(resource);
    return this.sell(resource, amount);
  }

  // ==========================================
  // UI DATA HELPERS
  // ==========================================

  /**
   * Get trade row data for UI rendering
   * @returns {Array<{resource: string, have: number, price: number}>}
   */
  getTradeData() {
    const resources = ['wheat', 'stone', 'wood'];

    return resources.map(resource => ({
      resource,
      have: this._resourceService.getResource(resource),
      price: this.getPrice(resource)
    }));
  }

  /**
   * Get display data for the market panel
   * @returns {{available: boolean, level: number, levelBonus: number, prices: Object}}
   */
  getPanelData() {
    return {
      available: this.hasMarket(),
      level: this.getLevel(),
      levelBonus: this.getLevelBonus(),
      prices: this.getAllPrices()
    };
  }

  /**
   * Generate HTML for market trades
   * @returns {string}
   */
  generateTradesHTML() {
    const EMOJIS = { wheat: '🌾', stone: '⛏️', wood: '🌲' };
    const tradeData = this.getTradeData();

    return tradeData.map(({ resource, have, price }) => `
      <div class="market-row">
        <span class="market-res">${EMOJIS[resource]} ${have}</span>
        <span class="market-price">${price}💰</span>
        <div class="market-btns">
          <button onclick="sellAtMarket('${resource}', 1)" ${have < 1 ? 'disabled' : ''}>1</button>
          <button onclick="sellAtMarket('${resource}', 10)" ${have < 10 ? 'disabled' : ''}>10</button>
          <button onclick="sellAtMarket('${resource}', ${have})" ${have === 0 ? 'disabled' : ''}>All</button>
        </div>
      </div>
    `).join('');
  }
}
