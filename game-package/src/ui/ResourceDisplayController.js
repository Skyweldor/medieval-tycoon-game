/**
 * ResourceDisplayController
 * Updates resource display UI (bar and overlay) based on game state
 * Subscribes to TICK events to refresh resource values
 * Dynamically generates HUD from resource registry
 */

import { Events } from '../core/EventBus.js';
import { getSortedResources, RESOURCES } from '../config/resources.config.js';

export class ResourceDisplayController {
  /**
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, resourceService, eventBus) {
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    this._unsubscribers = [];
    // Get resource types from registry, sorted by display order
    this._resourceTypes = getSortedResources().map(r => r.id);
    // Collapse state for overlay
    this._collapsed = false;
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
   * Uses a grid layout with production chains as columns
   * Row 1 (raw) always visible, rows 2-3 collapsible
   * @private
   */
  _generateOverlayHTML() {
    const overlay = document.getElementById('resource-overlay');
    if (!overlay) return;

    // Define production chains as columns
    // Column order: Wheat chain, Stone chain, Wood chain, Gold/misc
    const columns = [
      { raw: 'wheat', intermediate: 'flour', product: 'bread' },
      { raw: 'stone', intermediate: 'cut_stone', product: 'mortar' },
      { raw: 'wood', intermediate: 'planks', product: 'furniture' },
      { raw: 'gold', intermediate: 'charcoal', product: 'tools' }
    ];

    // Helper to generate a resource cell
    const makeCell = (id) => {
      const def = RESOURCES[id];
      if (!def) return '<div class="resource-overlay-cell empty"></div>';
      const iconHtml = def.hasSprite
        ? `<span class="${def.iconBase} icon-32 ${def.icon}"></span>`
        : `<span class="resource-emoji">${def.emoji}</span>`;
      return `
        <div class="resource-overlay-cell" data-resource="${id}">
          ${iconHtml}
          <span class="resource-overlay-value" id="overlay-${id}-value">0</span>
        </div>
      `;
    };

    // Build rows
    const rawRow = columns.map(col => makeCell(col.raw)).join('');
    const intermediateRow = columns.map(col => makeCell(col.intermediate)).join('');
    const productRow = columns.map(col => makeCell(col.product)).join('');

    overlay.innerHTML = `
      <div class="resource-overlay-grid">
        <div class="resource-overlay-row row-raw" id="overlay-row-raw">
          ${rawRow}
        </div>
        <div class="resource-overlay-collapsible" id="overlay-collapsible">
          <div class="resource-overlay-row row-intermediate">
            ${intermediateRow}
          </div>
          <div class="resource-overlay-row row-product">
            ${productRow}
          </div>
        </div>
      </div>
      <button class="resource-overlay-toggle" id="overlay-toggle" title="Collapse">▲</button>
    `;

    // Attach toggle event
    const toggleBtn = document.getElementById('overlay-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this._toggleCollapse());
    }
  }

  /**
   * Toggle the collapsed state of the resource overlay
   * Only collapses intermediate/product rows, raw row stays visible
   * @private
   */
  _toggleCollapse() {
    this._collapsed = !this._collapsed;
    const collapsible = document.getElementById('overlay-collapsible');
    const toggle = document.getElementById('overlay-toggle');
    const overlay = document.getElementById('resource-overlay');

    if (collapsible && toggle && overlay) {
      if (this._collapsed) {
        collapsible.classList.add('collapsed');
        toggle.textContent = '▼';
        toggle.title = 'Expand resources';
        overlay.classList.add('collapsed');
      } else {
        collapsible.classList.remove('collapsed');
        toggle.textContent = '▲';
        toggle.title = 'Collapse resources';
        overlay.classList.remove('collapsed');
      }
    }
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

    this._resourceTypes.forEach(res => {
      this._updateResourceDisplay(res, resources[res] || 0);
    });
  }

  /**
   * Update display for a single resource
   * @param {string} type - Resource type (gold, wheat, stone, wood)
   * @param {number} value - Current resource value
   * @private
   */
  _updateResourceDisplay(type, value) {
    // Get storage info for cap display
    const cap = this._resourceService.getCap(type);
    const isCapped = cap !== Infinity;
    const isAtCap = isCapped && value >= cap;
    const isNearCap = isCapped && !isAtCap && (value / cap) >= 0.9;

    // Format value with cap if applicable
    const formattedValue = isCapped
      ? `${this._resourceService.formatNumber(value)}/${this._resourceService.formatNumber(cap)}`
      : this._resourceService.formatNumber(value);

    const valueClass = this._getValueClass(isAtCap, isNearCap);

    // Update main resource bar
    const valueEl = document.getElementById(`${type}-value`);
    if (valueEl) {
      valueEl.textContent = formattedValue;
      valueEl.className = `resource-value ${valueClass}`;
    }

    // Update in-canvas overlay
    const overlayValueEl = document.getElementById(`overlay-${type}-value`);
    if (overlayValueEl) {
      overlayValueEl.textContent = formattedValue;
      overlayValueEl.className = `resource-overlay-value ${valueClass}`;
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
   * Get current resource value
   * @param {string} type - Resource type
   * @returns {number}
   */
  getResourceValue(type) {
    return this._gameState.getResource(type);
  }
}

