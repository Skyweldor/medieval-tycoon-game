/**
 * MilestonePanelController
 * Updates milestone panel UI and shows completion popups
 * Subscribes to milestone events
 */

import { Events } from '../core/EventBus.js';

export class MilestonePanelController {
  /**
   * @param {import('../services/MilestoneService.js').MilestoneService} milestoneService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(milestoneService, eventBus) {
    this._milestoneService = milestoneService;
    this._eventBus = eventBus;

    this._listId = 'milestone-list';
    this._progressId = 'milestone-progress';
    this._collapsed = false;
    this._unsubscribers = [];
  }

  /**
   * Initialize the controller and subscribe to events
   */
  initialize() {
    // Update panel when milestone completed
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.MILESTONE_COMPLETED, (data) => {
        this._showPopup(data.milestone);
        this.updatePanel();
      })
    );

    // Update on game reset
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.GAME_RESET, () => this.updatePanel())
    );

    // Initial render
    this.updatePanel();
  }

  /**
   * Clean up event subscriptions
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  /**
   * Update the milestone panel
   */
  updatePanel() {
    const list = document.getElementById(this._listId);
    const progress = document.getElementById(this._progressId);

    if (list) {
      list.innerHTML = this._milestoneService.generatePanelHTML();
    }

    if (progress) {
      progress.textContent = this._milestoneService.getProgressText();
    }
  }

  /**
   * Show a milestone completion popup notification
   * @param {Object} milestone - The completed milestone
   * @private
   */
  _showPopup(milestone) {
    const popupData = this._milestoneService.getPopupData(milestone);
    const message = `${popupData.icon} ${popupData.name}! ${popupData.rewardText}`;

    // Publish notification event
    this._eventBus.publish(Events.NOTIFICATION, {
      message,
      type: 'milestone'
    });
  }

  /**
   * Toggle panel collapse state
   */
  toggle() {
    const list = document.getElementById(this._listId);
    if (!list) return;

    this._collapsed = !this._collapsed;

    if (this._collapsed) {
      list.classList.add('collapsed');
    } else {
      list.classList.remove('collapsed');
    }
  }

  /**
   * Check if panel is collapsed
   * @returns {boolean}
   */
  isCollapsed() {
    return this._collapsed;
  }

  /**
   * Get completion progress
   * @returns {{completed: number, total: number, percentage: number}}
   */
  getProgress() {
    return this._milestoneService.getProgress();
  }
}
