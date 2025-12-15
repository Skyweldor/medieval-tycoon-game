/**
 * BuildingInfoController
 * Updates the building info panel when hovering over buildings
 */

import { Events } from '../core/EventBus.js';
import { getBuildingDef, EMOJI_FALLBACKS } from '../config/index.js';

export class BuildingInfoController {
  /**
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   * @param {import('../services/ProductionService.js').ProductionService} productionService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, productionService, eventBus) {
    this._gameState = gameState;
    this._productionService = productionService;
    this._eventBus = eventBus;

    this._emptyId = 'building-info-empty';
    this._contentId = 'building-info-content';
    this._hoveredIndex = null;
    this._unsubscribers = [];
  }

  /**
   * Initialize the controller
   */
  initialize() {
    // Update when buildings are upgraded (might be hovering over that building)
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.BUILDING_UPGRADED, () => {
        if (this._hoveredIndex !== null) {
          this.show(this._hoveredIndex);
        }
      })
    );

    // Reset on game reset
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.GAME_RESET, () => this.hide())
    );
  }

  /**
   * Clean up event subscriptions
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  /**
   * Show building info for a placed building
   * @param {number} index - Building index in the buildings array
   */
  show(index) {
    this._hoveredIndex = index;

    const buildings = this._gameState.getBuildings();
    const building = buildings[index];
    if (!building) return;

    const def = getBuildingDef(building.type);
    if (!def) return;

    // Hide empty message, show content
    const emptyEl = document.getElementById(this._emptyId);
    const contentEl = document.getElementById(this._contentId);

    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    // Set basic info
    this._updateElement('info-icon', EMOJI_FALLBACKS[building.type] || '🏠');
    this._updateElement('info-name', def.name);

    const level = building.level + 1;
    const maxLevel = def.upgrades.length + 1;
    this._updateElement('info-level', `Level ${level} / ${maxLevel}`);
    this._updateElement('info-status', 'Built');
    this._setElementClass('info-status', 'info-stat-value positive');

    // Upgrade cost
    const upgradeRow = document.getElementById('info-upgrade-row');
    if (building.level < def.upgrades.length) {
      const upgradeCost = def.upgrades[building.level].cost;
      const costText = this._formatCost(upgradeCost);
      this._updateElement('info-upgrade-cost', costText);
      if (upgradeRow) upgradeRow.style.display = 'flex';
      const upgradeLabel = upgradeRow?.querySelector('.info-stat-label');
      if (upgradeLabel) upgradeLabel.textContent = 'Upgrade Cost';
    } else {
      if (upgradeRow) upgradeRow.style.display = 'none';
    }

    // Production info
    const mult = this._productionService.getProductionMultiplier(building);
    let prodHTML = '';

    // Production outputs
    if (def.production && Object.keys(def.production).length > 0) {
      Object.entries(def.production).forEach(([res, amt]) => {
        const icon = this._getResourceEmoji(res);
        const displayName = res.charAt(0).toUpperCase() + res.slice(1);
        prodHTML += `<div class="info-stat-row">
          <span class="info-stat-label">${icon} ${displayName}</span>
          <span class="info-stat-value positive">+${amt * mult}/s</span>
        </div>`;
      });
    }

    // Consumption
    if (def.consumes) {
      Object.entries(def.consumes).forEach(([res, amt]) => {
        const icon = this._getResourceEmoji(res);
        const displayName = res.charAt(0).toUpperCase() + res.slice(1);
        prodHTML += `<div class="info-stat-row">
          <span class="info-stat-label">${icon} ${displayName}</span>
          <span class="info-stat-value negative">-${amt}/s</span>
        </div>`;
      });
    }

    // Storage bonus
    if (def.storageBonus) {
      const bonus = def.storageBonus * mult;
      prodHTML += `<div class="info-stat-row">
        <span class="info-stat-label">📦 Storage</span>
        <span class="info-stat-value positive">+${bonus}</span>
      </div>`;
    }

    const productionList = document.getElementById('info-production-list');
    if (productionList) {
      productionList.innerHTML = prodHTML || '<div class="info-stat-row"><span class="info-stat-label">No production</span></div>';
    }
  }

  /**
   * Hide building info (show empty message)
   */
  hide() {
    this._hoveredIndex = null;

    const emptyEl = document.getElementById(this._emptyId);
    const contentEl = document.getElementById(this._contentId);

    if (emptyEl) emptyEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
  }

  /**
   * Get currently hovered building index
   * @returns {number|null}
   */
  getHoveredIndex() {
    return this._hoveredIndex;
  }

  /**
   * Update element text content
   * @param {string} id - Element ID
   * @param {string} text - Text content
   * @private
   */
  _updateElement(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /**
   * Set element class
   * @param {string} id - Element ID
   * @param {string} className - CSS class
   * @private
   */
  _setElementClass(id, className) {
    const el = document.getElementById(id);
    if (el) el.className = className;
  }

  /**
   * Get resource emoji
   * @param {string} type - Resource type
   * @returns {string}
   * @private
   */
  _getResourceEmoji(type) {
    const EMOJIS = { gold: '💰', wheat: '🌾', stone: '⛏️', wood: '🌲' };
    return EMOJIS[type] || type;
  }

  /**
   * Format cost object for display
   * @param {Object} cost - Cost object
   * @returns {string}
   * @private
   */
  _formatCost(cost) {
    return Object.entries(cost)
      .map(([r, a]) => `${a}${this._getResourceEmoji(r)}`)
      .join(' ');
  }
}
