/**
 * PlotService
 * Manages plot/grid expansion based on research unlocks
 */

import { Events } from '../core/EventBus.js';
import { TILE_CONFIG, setGridSize, updateTileMap } from '../config/index.js';

export class PlotService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./ResearchService.js').ResearchService} researchService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, researchService, eventBus) {
    this._gameState = gameState;
    this._researchService = researchService;
    this._eventBus = eventBus;

    // Callback for re-rendering after expansion
    this._onExpandCallback = null;

    // Subscribe to plot expansion events
    this._setupEventListeners();
  }

  /**
   * Set callback for plot expansion (used to trigger re-render)
   * @param {Function} callback
   */
  setExpandCallback(callback) {
    this._onExpandCallback = callback;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for plot expansion unlocks from research
    this._eventBus.subscribe(Events.PLOT_EXPANSION_UNLOCKED, (data) => {
      // Check if this expansion is bigger than current
      const current = this.getPlotSize();
      if (data.expansion.rows > current.rows || data.expansion.cols > current.cols) {
        this._notifyExpansionAvailable(data.expansion);
      }
    });
  }

  /**
   * Notify user that expansion is available
   * @param {{rows: number, cols: number}} expansion
   * @private
   */
  _notifyExpansionAvailable(expansion) {
    this._eventBus.publish(Events.NOTIFICATION, {
      message: `Plot expansion unlocked! You can now expand to ${expansion.rows}x${expansion.cols}`,
      type: 'success'
    });
  }

  // ==========================================
  // PLOT SIZE
  // ==========================================

  /**
   * Get current plot size
   * @returns {{rows: number, cols: number}}
   */
  getPlotSize() {
    return this._gameState.getPlotSize();
  }

  /**
   * Get the maximum plot size available from research
   * @returns {{rows: number, cols: number}}
   */
  getMaxPlotSize() {
    return this._researchService.getCurrentPlotSize();
  }

  /**
   * Check if plot expansion is available
   * @returns {boolean}
   */
  canExpand() {
    const current = this.getPlotSize();
    const max = this.getMaxPlotSize();
    return max.rows > current.rows || max.cols > current.cols;
  }

  /**
   * Get available expansion
   * @returns {{rows: number, cols: number}|null}
   */
  getAvailableExpansion() {
    if (!this.canExpand()) return null;
    return this.getMaxPlotSize();
  }

  // ==========================================
  // EXPANSION
  // ==========================================

  /**
   * Expand the plot to the maximum available size
   * @returns {{success: boolean, error: string|null}}
   */
  expand() {
    if (!this.canExpand()) {
      return { success: false, error: 'No expansion available' };
    }

    const newSize = this.getMaxPlotSize();
    return this.expandTo(newSize.rows, newSize.cols);
  }

  /**
   * Expand the plot to a specific size
   * @param {number} rows
   * @param {number} cols
   * @returns {{success: boolean, error: string|null}}
   */
  expandTo(rows, cols) {
    const current = this.getPlotSize();
    const max = this.getMaxPlotSize();

    // Validate size
    if (rows > max.rows || cols > max.cols) {
      return { success: false, error: 'Research required for larger expansion' };
    }

    if (rows <= current.rows && cols <= current.cols) {
      return { success: false, error: 'Already at this size or larger' };
    }

    // Update game state
    this._gameState.setPlotSize({ rows, cols });

    // Update tile config
    setGridSize(rows, cols);

    // Update tile map for new size
    updateTileMap(rows, cols);

    // Trigger re-render
    if (this._onExpandCallback) {
      this._onExpandCallback();
    }

    // Notify
    this._eventBus.publish(Events.NOTIFICATION, {
      message: `Plot expanded to ${rows}x${cols}!`,
      type: 'success'
    });

    // Publish expansion event
    this._eventBus.publish(Events.PLOT_EXPANDED, { rows, cols });

    return { success: true, error: null };
  }

  /**
   * Initialize plot size from saved state
   * Called on game load to sync TILE_CONFIG with saved state
   */
  syncFromState() {
    const size = this.getPlotSize();
    setGridSize(size.rows, size.cols);
    updateTileMap(size.rows, size.cols);
  }
}
