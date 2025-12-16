/**
 * EventBus - Pub/sub event system for loose coupling between services
 *
 * Usage:
 *   const eventBus = new EventBus();
 *   const unsubscribe = eventBus.subscribe(EventBus.Events.BUILDING_PLACED, (data) => { ... });
 *   eventBus.publish(EventBus.Events.BUILDING_PLACED, { building, row, col });
 *   unsubscribe(); // Clean up when done
 */
export class EventBus {
  /**
   * Standard event constants for type safety and discoverability
   */
  static Events = {
    // Resource events
    RESOURCES_CHANGED: 'resources:changed',

    // Building events
    BUILDING_PLACED: 'building:placed',
    BUILDING_UPGRADED: 'building:upgraded',
    BUILDING_REMOVED: 'building:removed',

    // Milestone events
    MILESTONE_COMPLETED: 'milestone:completed',
    MILESTONES_CHECKED: 'milestones:checked',

    // Merchant events
    MERCHANT_ARRIVED: 'merchant:arrived',
    MERCHANT_DEPARTED: 'merchant:departed',
    MERCHANT_DISABLED: 'merchant:disabled',
    MERCHANT_SALE: 'merchant:sale',

    // Market events
    MARKET_SALE: 'market:sale',

    // Stipend events
    STIPEND_TICK: 'stipend:tick',
    STIPEND_ENDED: 'stipend:ended',

    // Research events
    RESEARCH_COMPLETED: 'research:completed',

    // Plot expansion events
    PLOT_EXPANSION_UNLOCKED: 'plot:expansionUnlocked',
    PLOT_EXPANDED: 'plot:expanded',

    // Camera events
    CAMERA_MOVED: 'camera:moved',
    CAMERA_ZOOMED: 'camera:zoomed',

    // Game loop events
    TICK: 'game:tick',

    // UI events
    PLACEMENT_MODE_CHANGED: 'placement:changed',
    TAB_SWITCHED: 'tab:switched',
    UI_UPDATE_REQUESTED: 'ui:updateRequested',
    NOTIFICATION: 'ui:notification',

    // State events
    GAME_RESET: 'game:reset',
    STATE_LOADED: 'state:loaded',
    STATE_SAVED: 'state:saved'
  };

  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (use EventBus.Events constants)
   * @param {Function} callback - Function to call when event is published
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('EventBus callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    this._listeners.get(event).add(callback);

    // Return unsubscribe function for cleanup
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Unsubscribe a specific callback from an event
   * @param {string} event - Event name
   * @param {Function} callback - The callback to remove
   */
  unsubscribe(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Remove all listeners for a specific event
   * @param {string} event - Event name
   */
  unsubscribeAll(event) {
    this._listeners.delete(event);
  }

  /**
   * Publish an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Data to pass to subscribers
   */
  publish(event, data = null) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event for one-time execution
   * @param {string} event - Event name
   * @param {Function} callback - Function to call once
   * @returns {Function} Unsubscribe function (in case you want to cancel before it fires)
   */
  once(event, callback) {
    const unsubscribe = this.subscribe(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Get the count of listeners for an event (useful for debugging)
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Check if there are any listeners for an event
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0;
  }

  /**
   * Clear all event listeners (useful for testing or reset)
   */
  clear() {
    this._listeners.clear();
  }
}

// Export singleton instance for convenience
export const eventBus = new EventBus();

// Export events for easy importing
export const Events = EventBus.Events;
