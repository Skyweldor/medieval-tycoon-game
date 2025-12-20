/**
 * BuildingInfoController
 * Updates the building info panel when hovering over buildings
 * Supports both continuous production buildings and processor buildings with cycles
 */

import { Events } from '../core/EventBus.js';
import { getBuildingDef, EMOJI_FALLBACKS, RESOURCES, ASSETS } from '../config/index.js';

export class BuildingInfoController {
  /**
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   * @param {import('../services/ProductionService.js').ProductionService} productionService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../services/ProcessorService.js').ProcessorService} [processorService] - Optional processor service
   */
  constructor(gameState, productionService, eventBus, processorService = null) {
    this._gameState = gameState;
    this._productionService = productionService;
    this._eventBus = eventBus;
    this._processorService = processorService;

    this._emptyId = 'building-info-empty';
    this._contentId = 'building-info-content';
    this._hoveredIndex = null;
    this._unsubscribers = [];
  }

  /**
   * Set processor service (for late binding)
   * @param {import('../services/ProcessorService.js').ProcessorService} processorService
   */
  setProcessorService(processorService) {
    this._processorService = processorService;
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

    // Update progress bar in real-time for processor buildings
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.TICK, () => {
        if (this._hoveredIndex !== null && this._processorService) {
          const buildings = this._gameState.getBuildings();
          const building = buildings[this._hoveredIndex];
          if (building) {
            const def = getBuildingDef(building.type);
            if (def?.isProcessor) {
              this._updateProcessorProgress(this._hoveredIndex);
            }
          }
        }
      })
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

    // Set basic info - use building sprite
    this._updateHTML('info-icon', this._getBuildingIcon(building.type, building.level));
    this._updateElement('info-name', def.name);

    const level = building.level + 1;
    const maxLevel = def.upgrades.length + 1;
    this._updateElement('info-level', `Level ${level} / ${maxLevel}`);

    // Upgrade cost
    const upgradeRow = document.getElementById('info-upgrade-row');
    if (building.level < def.upgrades.length) {
      const upgradeCost = def.upgrades[building.level].cost;
      const costHTML = this._formatCost(upgradeCost);
      this._updateHTML('info-upgrade-cost', costHTML);
      if (upgradeRow) upgradeRow.style.display = 'flex';
      const upgradeLabel = upgradeRow?.querySelector('.info-stat-label');
      if (upgradeLabel) upgradeLabel.textContent = 'Upgrade Cost';
    } else {
      if (upgradeRow) upgradeRow.style.display = 'none';
    }

    // Check if this is a processor building
    if (def.isProcessor && def.recipe && this._processorService) {
      this._renderProcessorInfo(building, def, index);
    } else {
      this._renderContinuousProductionInfo(building, def);
    }
  }

  /**
   * Render info for continuous production buildings
   * @private
   */
  _renderContinuousProductionInfo(building, def) {
    const mult = this._productionService.getProductionMultiplier(building);
    let prodHTML = '';

    // Status
    this._updateElement('info-status', 'Active');
    this._setElementClass('info-status', 'info-stat-value positive');

    // Production outputs
    if (def.production && Object.keys(def.production).length > 0) {
      Object.entries(def.production).forEach(([res, amt]) => {
        const icon = this._getResourceIcon(res, 16);
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
        const icon = this._getResourceIcon(res, 16);
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
   * Render info for processor buildings (cycle-based)
   * @private
   */
  _renderProcessorInfo(building, def, index) {
    const state = this._processorService.getProcessorState(index);
    const recipe = def.recipe;
    const mult = this._getProcessorMultiplier(building, def);
    const cycleTimeSeconds = recipe.cycleTime / 1000 / mult;

    let prodHTML = '';

    // Status with stall reason
    const statusText = state.state === 'stalled' ? state.stallReason :
                       state.state === 'running' ? 'Processing...' : 'Idle';
    const statusClass = state.state === 'stalled' ? 'info-stat-value negative' :
                        state.state === 'running' ? 'info-stat-value positive' : 'info-stat-value neutral';
    this._updateElement('info-status', statusText);
    this._setElementClass('info-status', statusClass);

    // Recipe inputs
    prodHTML += '<div class="info-section-title">Inputs (per cycle)</div>';
    Object.entries(recipe.inputs).forEach(([res, amt]) => {
      const icon = this._getResourceIcon(res, 16);
      const displayName = res.charAt(0).toUpperCase() + res.slice(1);
      prodHTML += `<div class="info-stat-row">
        <span class="info-stat-label">${icon} ${displayName}</span>
        <span class="info-stat-value negative">-${amt}</span>
      </div>`;
    });

    // Recipe outputs
    prodHTML += '<div class="info-section-title">Outputs (per cycle)</div>';
    Object.entries(recipe.outputs).forEach(([res, amt]) => {
      const icon = this._getResourceIcon(res, 16);
      const displayName = res.charAt(0).toUpperCase() + res.slice(1);
      prodHTML += `<div class="info-stat-row">
        <span class="info-stat-label">${icon} ${displayName}</span>
        <span class="info-stat-value positive">+${amt}</span>
      </div>`;
    });

    // Cycle time
    prodHTML += `<div class="info-stat-row">
      <span class="info-stat-label">⏱️ Cycle Time</span>
      <span class="info-stat-value">${cycleTimeSeconds.toFixed(1)}s</span>
    </div>`;

    // Progress bar
    const progress = Math.floor(state.progress * 100);
    prodHTML += `<div class="processor-progress">
      <div class="progress-bar">
        <div class="progress-fill" id="info-progress-fill" style="width: ${progress}%"></div>
      </div>
      <span class="progress-text" id="info-progress-text">${progress}%</span>
    </div>`;

    const productionList = document.getElementById('info-production-list');
    if (productionList) {
      productionList.innerHTML = prodHTML;
    }
  }

  /**
   * Update just the progress bar for processor buildings (called on TICK)
   * @private
   */
  _updateProcessorProgress(index) {
    const state = this._processorService.getProcessorState(index);
    const progress = Math.floor(state.progress * 100);

    const progressFill = document.getElementById('info-progress-fill');
    const progressText = document.getElementById('info-progress-text');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    if (progressText) {
      progressText.textContent = `${progress}%`;
    }

    // Also update status in case it changed
    const buildings = this._gameState.getBuildings();
    const building = buildings[index];
    if (building) {
      const statusText = state.state === 'stalled' ? state.stallReason :
                         state.state === 'running' ? 'Processing...' : 'Idle';
      const statusClass = state.state === 'stalled' ? 'info-stat-value negative' :
                          state.state === 'running' ? 'info-stat-value positive' : 'info-stat-value neutral';
      this._updateElement('info-status', statusText);
      this._setElementClass('info-status', statusClass);
    }
  }

  /**
   * Get processor multiplier from building upgrades
   * @private
   */
  _getProcessorMultiplier(building, def) {
    if (building.level > 0 && def.upgrades && def.upgrades[building.level - 1]) {
      return def.upgrades[building.level - 1].mult;
    }
    return 1;
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
   * Update element HTML content
   * @param {string} id - Element ID
   * @param {string} html - HTML content
   * @private
   */
  _updateHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /**
   * Get building icon HTML (sprite image or emoji fallback)
   * @param {string} buildingType - Building type ID
   * @param {number} level - Building level (0-indexed)
   * @returns {string} HTML for the building icon
   * @private
   */
  _getBuildingIcon(buildingType, level) {
    const assetDef = ASSETS[buildingType];
    const displayLevel = level + 1;

    if (assetDef && assetDef[displayLevel]) {
      return `<img src="${assetDef[displayLevel]}" alt="${buildingType}" class="building-info-sprite">`;
    }
    // Fallback to emoji
    return EMOJI_FALLBACKS[buildingType] || '🏠';
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
   * Format cost object for display
   * @param {Object} cost - Cost object
   * @returns {string}
   * @private
   */
  _formatCost(cost) {
    return Object.entries(cost)
      .map(([r, a]) => `${a}${this._getResourceIcon(r, 16)}`)
      .join(' ');
  }
}
