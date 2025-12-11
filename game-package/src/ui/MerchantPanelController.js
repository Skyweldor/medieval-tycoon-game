/**
 * MerchantPanelController
 * Handles the merchant trading panel overlay UI
 */

import { MERCHANT_CONFIG } from '../config/index.js';

export class MerchantPanelController {
  /**
   * @param {import('../services/MerchantService.js').MerchantService} merchantService
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   */
  constructor(merchantService, gameState) {
    this._merchantService = merchantService;
    this._gameState = gameState;

    // Timer interval reference
    this._countdownInterval = null;
  }

  // ==========================================
  // PANEL VISIBILITY
  // ==========================================

  /**
   * Check if panel is currently visible
   * @returns {boolean}
   */
  isVisible() {
    const overlay = document.getElementById('merchant-overlay');
    return overlay ? overlay.classList.contains('visible') : false;
  }

  /**
   * Open the merchant trading panel
   */
  open() {
    if (!this._merchantService.isActive()) return;

    this.renderTradeRows();
    const overlay = document.getElementById('merchant-overlay');
    if (overlay) {
      overlay.classList.add('visible');
    }
  }

  /**
   * Close the merchant trading panel
   */
  close() {
    const overlay = document.getElementById('merchant-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
    }
  }

  // ==========================================
  // BANNER
  // ==========================================

  /**
   * Show the merchant arrived banner
   */
  showBanner() {
    const banner = document.getElementById('merchant-banner');
    if (banner) {
      banner.classList.add('visible');
      banner.classList.remove('urgent');
    }
  }

  /**
   * Hide the merchant banner
   */
  hideBanner() {
    const banner = document.getElementById('merchant-banner');
    if (banner) {
      banner.classList.remove('visible');
      banner.classList.remove('urgent');
    }
  }

  /**
   * Set banner to urgent state (flashing/highlighted)
   */
  setBannerUrgent() {
    const banner = document.getElementById('merchant-banner');
    if (banner) {
      banner.classList.add('urgent');
    }
  }

  // ==========================================
  // COUNTDOWN
  // ==========================================

  /**
   * Start the merchant countdown timer
   */
  startCountdown() {
    this.stopCountdown();

    const updateCountdown = () => {
      if (!this._merchantService.isActive()) {
        this.stopCountdown();
        return;
      }

      const remaining = this._merchantService.getRemainingTime();

      const countdownEl = document.getElementById('merchant-countdown');
      const panelCountdownEl = document.getElementById('merchant-panel-countdown');

      if (countdownEl) countdownEl.textContent = remaining;
      if (panelCountdownEl) panelCountdownEl.textContent = remaining;

      if (remaining <= 10) {
        this.setBannerUrgent();
      }
    };

    updateCountdown();
    this._countdownInterval = setInterval(updateCountdown, 1000);
  }

  /**
   * Stop the merchant countdown timer
   */
  stopCountdown() {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
  }

  // ==========================================
  // TRADE ROW RENDERING
  // ==========================================

  /**
   * Capitalize first letter of string
   * @param {string} str
   * @returns {string}
   * @private
   */
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Render the trade rows in the merchant panel
   */
  renderTradeRows() {
    const container = document.getElementById('merchant-trade-rows');
    if (!container) return;

    const tradeData = this._merchantService.getTradeData();
    const resourceEmoji = { wheat: '🌾', stone: '⛏️', wood: '🌲' };

    container.innerHTML = tradeData.map(({ resource, have, sold, maxPerVisit, remaining, price, canSell }) => {
      return `
        <div class="trade-row ${canSell === 0 ? 'disabled' : ''}">
          <div class="trade-resource">
            <span class="trade-icon">${resourceEmoji[resource]}</span>
            <div class="trade-info">
              <span class="trade-name">${this._capitalize(resource)}</span>
              <span class="trade-have">You have: ${have}</span>
            </div>
          </div>

          <div class="trade-price">
            <span class="price-value">${price}</span>
            <span class="price-label">💰 each</span>
          </div>

          <div class="trade-limit">
            <span class="limit-value">${remaining}/${maxPerVisit}</span>
            <span class="limit-label">left</span>
          </div>

          <div class="trade-buttons">
            <button onclick="sellToMerchant('${resource}', 1)" ${canSell < 1 ? 'disabled' : ''}>Sell 1</button>
            <button onclick="sellToMerchant('${resource}', 5)" ${canSell < 5 ? 'disabled' : ''}>Sell 5</button>
            <button onclick="sellToMerchant('${resource}', ${canSell})" ${canSell === 0 ? 'disabled' : ''}>Sell All</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // MERCHANT LIFECYCLE HANDLERS
  // ==========================================

  /**
   * Handle merchant arrival - show banner, start countdown
   */
  onMerchantArrived() {
    this.showBanner();
    this.startCountdown();
  }

  /**
   * Handle merchant departure - hide banner, close panel, stop countdown
   */
  onMerchantDeparted() {
    this.hideBanner();
    this.close();
    this.stopCountdown();
  }

  /**
   * Handle merchant sale - re-render trade rows
   */
  onSale() {
    this.renderTradeRows();
  }

  /**
   * Handle merchant disabled (market built) - cleanup
   */
  onMerchantDisabled() {
    this.hideBanner();
    this.close();
    this.stopCountdown();
  }
}
