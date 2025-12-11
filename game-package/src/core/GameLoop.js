/**
 * GameLoop - Manages game tick intervals
 *
 * Usage:
 *   const gameLoop = new GameLoop(eventBus);
 *   gameLoop.start();
 *   // Event listeners will receive TICK events every second
 *   gameLoop.stop();
 */
import { Events } from './EventBus.js';

export class GameLoop {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus - EventBus instance for publishing tick events
   */
  constructor(eventBus) {
    this._eventBus = eventBus;

    /** @type {number|null} Main tick interval ID */
    this._tickIntervalId = null;

    /** @type {number|null} Stipend tick interval ID */
    this._stipendIntervalId = null;

    /** @type {boolean} Whether the game loop is running */
    this._isRunning = false;

    /** @type {number} Tick count since start */
    this._tickCount = 0;

    // Configuration
    this._tickInterval = 1000;      // 1 second for main tick
    this._stipendInterval = 2000;   // 2 seconds for stipend tick
  }

  /**
   * Start the game loop
   */
  start() {
    if (this._isRunning) {
      console.warn('GameLoop: Already running');
      return;
    }

    this._isRunning = true;
    this._tickCount = 0;

    // Main game tick (production, etc.)
    this._tickIntervalId = setInterval(() => {
      this._tickCount++;
      this._eventBus.publish(Events.TICK, {
        tickCount: this._tickCount,
        timestamp: Date.now()
      });
    }, this._tickInterval);

    // Stipend tick (every 2 seconds)
    this._stipendIntervalId = setInterval(() => {
      this._eventBus.publish(Events.STIPEND_TICK, {
        timestamp: Date.now()
      });
    }, this._stipendInterval);
  }

  /**
   * Stop the game loop
   */
  stop() {
    if (!this._isRunning) {
      return;
    }

    if (this._tickIntervalId !== null) {
      clearInterval(this._tickIntervalId);
      this._tickIntervalId = null;
    }

    if (this._stipendIntervalId !== null) {
      clearInterval(this._stipendIntervalId);
      this._stipendIntervalId = null;
    }

    this._isRunning = false;
  }

  /**
   * Restart the game loop
   */
  restart() {
    this.stop();
    this.start();
  }

  /**
   * Check if the game loop is running
   * @returns {boolean}
   */
  isRunning() {
    return this._isRunning;
  }

  /**
   * Get the current tick count
   * @returns {number}
   */
  getTickCount() {
    return this._tickCount;
  }

  /**
   * Set the main tick interval (requires restart to take effect)
   * @param {number} ms - Interval in milliseconds
   */
  setTickInterval(ms) {
    this._tickInterval = ms;
    if (this._isRunning) {
      this.restart();
    }
  }

  /**
   * Set the stipend tick interval (requires restart to take effect)
   * @param {number} ms - Interval in milliseconds
   */
  setStipendInterval(ms) {
    this._stipendInterval = ms;
    if (this._isRunning) {
      this.restart();
    }
  }

  /**
   * Manually trigger a single tick (useful for testing)
   */
  manualTick() {
    this._tickCount++;
    this._eventBus.publish(Events.TICK, {
      tickCount: this._tickCount,
      timestamp: Date.now(),
      manual: true
    });
  }

  /**
   * Manually trigger a stipend tick (useful for testing)
   */
  manualStipendTick() {
    this._eventBus.publish(Events.STIPEND_TICK, {
      timestamp: Date.now(),
      manual: true
    });
  }
}
