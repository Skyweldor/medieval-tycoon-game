/**
 * StatsDisplayController
 * Updates game statistics display (building count, total levels, net worth)
 * Subscribes to building and resource events to refresh stats
 */

import { Events } from '../core/EventBus.js';

export class StatsDisplayController {
  /**
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   * @param {import('../services/BuildingService.js').BuildingService} buildingService
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, buildingService, resourceService, eventBus) {
    this._gameState = gameState;
    this._buildingService = buildingService;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    this._unsubscribers = [];
  }

  /**
   * Initialize the controller and subscribe to events
   */
  initialize() {
    // Update when buildings change
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.BUILDING_PLACED, () => this.update())
    );

    this._unsubscribers.push(
      this._eventBus.subscribe(Events.BUILDING_UPGRADED, () => this.update())
    );

    // Update when resources change (affects net worth)
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.RESOURCES_CHANGED, () => this.update())
    );

    // Update on game tick for continuous net worth updates
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.TICK, () => this.update())
    );

    // Update on game reset
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.GAME_RESET, () => this.update())
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
   * Update all stats displays
   */
  update() {
    const stats = this.calculateStats();

    this._updateElement('stat-buildings', stats.buildingCount);
    this._updateElement('stat-levels', stats.totalLevels);
    this._updateElement('stat-worth', this._resourceService.formatNumber(stats.netWorth));
  }

  /**
   * Calculate current game statistics
   * @returns {{buildingCount: number, totalLevels: number, netWorth: number}}
   */
  calculateStats() {
    const buildings = this._gameState.getBuildings();
    const resources = this._gameState.getResources();

    const buildingCount = buildings.length;
    const totalLevels = buildings.reduce((sum, b) => sum + (b.level + 1), 0);
    const netWorth = Object.values(resources).reduce((a, b) => a + b, 0);

    return { buildingCount, totalLevels, netWorth };
  }

  /**
   * Update a single DOM element
   * @param {string} id - Element ID
   * @param {string|number} value - Value to display
   * @private
   */
  _updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  /**
   * Get building count
   * @returns {number}
   */
  getBuildingCount() {
    return this._gameState.getBuildings().length;
  }

  /**
   * Get total levels across all buildings
   * @returns {number}
   */
  getTotalLevels() {
    return this._buildingService.getTotalLevels();
  }

  /**
   * Get net worth (sum of all resources)
   * @returns {number}
   */
  getNetWorth() {
    const resources = this._gameState.getResources();
    return Object.values(resources).reduce((a, b) => a + b, 0);
  }
}
