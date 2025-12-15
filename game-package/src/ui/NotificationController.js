/**
 * NotificationController
 * Handles displaying notification messages to the user
 * Subscribes to NOTIFICATION events from EventBus
 */

import { Events } from '../core/EventBus.js';

export class NotificationController {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._containerId = 'notifications';
    this._defaultDuration = 3000; // 3 seconds
    this._unsubscribe = null;
  }

  /**
   * Initialize the controller and subscribe to events
   */
  initialize() {
    this._unsubscribe = this._eventBus.subscribe(
      Events.NOTIFICATION,
      (data) => this.show(data.message, data.type)
    );
  }

  /**
   * Clean up event subscriptions
   */
  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {string} [type='success'] - Notification type (success, error, info, milestone, merchant)
   * @param {number} [duration] - Duration in ms before auto-dismiss (default: 3000)
   */
  show(message, type = 'success', duration = this._defaultDuration) {
    const container = document.getElementById(this._containerId);
    if (!container) {
      console.warn('[NotificationController] Notifications container not found');
      return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Auto-dismiss after duration
    setTimeout(() => {
      notification.remove();
    }, duration);
  }

  /**
   * Show a success notification
   * @param {string} message
   */
  success(message) {
    this.show(message, 'success');
  }

  /**
   * Show an error notification
   * @param {string} message
   */
  error(message) {
    this.show(message, 'error');
  }

  /**
   * Show an info notification
   * @param {string} message
   */
  info(message) {
    this.show(message, 'info');
  }

  /**
   * Show a milestone notification (longer duration)
   * @param {string} message
   */
  milestone(message) {
    this.show(message, 'milestone', 5000);
  }

  /**
   * Show a merchant notification
   * @param {string} message
   */
  merchant(message) {
    this.show(message, 'merchant');
  }

  /**
   * Clear all current notifications
   */
  clearAll() {
    const container = document.getElementById(this._containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}
