/**
 * StipendIndicatorController
 * Updates the royal stipend indicator based on stipend state
 * Subscribes to stipend events to update visibility
 */

import { Events } from '../core/EventBus.js';

export class StipendIndicatorController {
  /**
   * @param {import('../services/StipendService.js').StipendService} stipendService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(stipendService, eventBus) {
    this._stipendService = stipendService;
    this._eventBus = eventBus;

    this._indicatorId = 'stipend-indicator';
    this._unsubscribers = [];
  }

  /**
   * Initialize the controller and subscribe to events
   */
  initialize() {
    // Update when stipend ends
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.STIPEND_ENDED, () => this.update())
    );

    // Update on game reset (stipend reactivates)
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
   * Update the stipend indicator display
   */
  update() {
    const indicator = document.getElementById(this._indicatorId);
    if (!indicator) return;

    const isActive = this._stipendService.isActive();

    if (isActive) {
      indicator.classList.remove('inactive');
    } else {
      indicator.classList.add('inactive');
    }
  }

  /**
   * Check if stipend is currently active
   * @returns {boolean}
   */
  isActive() {
    return this._stipendService.isActive();
  }

  /**
   * Get stipend display information
   * @returns {{active: boolean, totalReceived: number}}
   */
  getDisplayInfo() {
    return this._stipendService.getDisplayInfo();
  }
}
