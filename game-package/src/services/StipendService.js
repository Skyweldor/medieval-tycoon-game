/**
 * StipendService
 * Handles the Royal Stipend system - passive gold income for new players
 */

import { Events } from '../core/EventBus.js';
import { GOLD_PRODUCERS } from '../config/index.js';

export class StipendService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, eventBus) {
    this._gameState = gameState;
    this._eventBus = eventBus;

    // Subscribe to events
    this._eventBus.subscribe(Events.STIPEND_TICK, () => this.tick());
    this._eventBus.subscribe(Events.BUILDING_PLACED, (data) => this._onBuildingPlaced(data));
  }

  // ==========================================
  // STIPEND STATE
  // ==========================================

  /**
   * Check if stipend is currently active
   * @returns {boolean}
   */
  isActive() {
    return this._gameState.isStipendActive();
  }

  /**
   * Get stipend state
   * @returns {{active: boolean, totalReceived: number, endReason: string|null}}
   */
  getState() {
    return this._gameState.getStipend();
  }

  /**
   * Get total gold received from stipend
   * @returns {number}
   */
  getTotalReceived() {
    return this._gameState.getStipend().totalReceived;
  }

  // ==========================================
  // STIPEND LOGIC
  // ==========================================

  /**
   * Check if player has any gold-producing buildings
   * @returns {boolean}
   */
  hasGoldProduction() {
    const buildings = this._gameState.getBuildings();
    return buildings.some(b => GOLD_PRODUCERS.includes(b.type));
  }

  /**
   * Check and update stipend status
   * Called when a building is placed to see if stipend should end
   */
  checkStatus() {
    if (!this.isActive()) return;

    if (this.hasGoldProduction()) {
      this._endStipend();
    }
  }

  /**
   * End the stipend
   * @private
   */
  _endStipend() {
    // Find which building ended it (for flavor text)
    const buildings = this._gameState.getBuildings();
    let endReason = null;

    for (const building of buildings) {
      if (GOLD_PRODUCERS.includes(building.type)) {
        endReason = building.type;
        break;
      }
    }

    this._gameState.endStipend(endReason);

    // Note: UI notification and indicator update should be handled by event listeners
    // The STIPEND_ENDED event is published by GameStateService.endStipend()
  }

  /**
   * Process one stipend tick (grant gold)
   * Called automatically via EventBus subscription to STIPEND_TICK event
   */
  tick() {
    if (!this.isActive()) return;

    const amount = 1;

    // Add gold through proper mutation API
    this._gameState.addResources({ gold: amount });

    // Record in stipend state
    this._gameState.recordStipend(amount);
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  /**
   * Handle building placed event
   * @param {Object} data - Event data
   * @private
   */
  _onBuildingPlaced(data) {
    // Check if the placed building is a gold producer
    if (data.isGoldProducer) {
      this.checkStatus();
    }
  }

  // ==========================================
  // UI HELPERS
  // ==========================================

  /**
   * Get stipend indicator state for UI
   * @returns {{active: boolean, className: string}}
   */
  getIndicatorState() {
    const active = this.isActive();
    return {
      active,
      className: active ? '' : 'inactive'
    };
  }

  /**
   * Get formatted stipend info for display
   * @returns {{active: boolean, rate: string, totalReceived: number, endReason: string|null}}
   */
  getDisplayInfo() {
    const state = this.getState();
    return {
      active: state.active,
      rate: state.active ? '+1 gold/2s' : 'Ended',
      totalReceived: state.totalReceived,
      endReason: state.endReason
    };
  }

  /**
   * Get the name of the building that ended the stipend
   * @returns {string|null}
   */
  getEndReasonName() {
    const state = this.getState();
    if (!state.endReason) return null;

    const names = {
      bakery: 'Bakery',
      blacksmith: 'Blacksmith',
      market: 'Market',
      townhall: 'Town Hall'
    };

    return names[state.endReason] || state.endReason;
  }
}
