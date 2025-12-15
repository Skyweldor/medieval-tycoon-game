/**
 * DebugController
 * Handles debug UI controls (sliders, toggles, dark mode)
 */

import { Events } from '../core/EventBus.js';

export class DebugController {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;

    // Debug offset values
    this._offsetX = 2;
    this._offsetY = -8;
    this._sizeMult = 2.0;
    this._cursorOffsetX = -1;
    this._cursorOffsetY = -1;

    // Toggle states
    this._tilesVisible = true;
    this._slidersVisible = false;
    this._darkModeEnabled = false;
  }

  /**
   * Request a UI update via EventBus
   * @private
   */
  _updateUI() {
    this._eventBus.publish(Events.UI_UPDATE_REQUESTED);
  }

  /**
   * Show a notification to the user via EventBus
   * @param {string} message - Message to display
   * @param {string} [type='info'] - Notification type (info, success, error)
   * @private
   */
  _notify(message, type = 'info') {
    this._eventBus.publish(Events.NOTIFICATION, { message, type });
  }

  // ==========================================
  // DEBUG VALUES
  // ==========================================

  /**
   * Get current offset X value
   * @returns {number}
   */
  getOffsetX() {
    return this._offsetX;
  }

  /**
   * Get current offset Y value
   * @returns {number}
   */
  getOffsetY() {
    return this._offsetY;
  }

  /**
   * Get current size multiplier
   * @returns {number}
   */
  getSizeMult() {
    return this._sizeMult;
  }

  /**
   * Get cursor offset X value
   * @returns {number}
   */
  getCursorOffsetX() {
    return this._cursorOffsetX;
  }

  /**
   * Get cursor offset Y value
   * @returns {number}
   */
  getCursorOffsetY() {
    return this._cursorOffsetY;
  }

  /**
   * Get all debug values as an object
   * @returns {Object}
   */
  getValues() {
    return {
      offsetX: this._offsetX,
      offsetY: this._offsetY,
      sizeMult: this._sizeMult,
      cursorOffsetX: this._cursorOffsetX,
      cursorOffsetY: this._cursorOffsetY
    };
  }

  // ==========================================
  // TOGGLE CONTROLS
  // ==========================================

  /**
   * Toggle tile grid visibility
   */
  toggleTiles() {
    const groundLayer = document.querySelector('.ground-layer');
    const btn = document.getElementById('toggle-tiles-btn');

    if (!groundLayer || !btn) return;

    this._tilesVisible = !this._tilesVisible;
    groundLayer.style.display = this._tilesVisible ? 'block' : 'none';
    btn.textContent = this._tilesVisible ? '🙈 Tiles' : '👁️ Tiles';
  }

  /**
   * Toggle debug sliders visibility
   */
  toggleSliders() {
    const sliders = document.getElementById('debug-sliders');
    const btn = document.getElementById('toggle-sliders-btn');

    if (!sliders || !btn) return;

    this._slidersVisible = !this._slidersVisible;
    sliders.style.display = this._slidersVisible ? 'block' : 'none';
    btn.textContent = this._slidersVisible ? '🔧 Hide' : '🔧 Offsets';
  }

  /**
   * Toggle dark mode for game world background
   */
  toggleDarkMode() {
    const world = document.getElementById('game-world');
    const btn = document.getElementById('toggle-dark-btn');

    if (!world || !btn) return;

    this._darkModeEnabled = !this._darkModeEnabled;
    if (this._darkModeEnabled) {
      world.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)';
    } else {
      world.style.background = 'linear-gradient(135deg, #7CB342 0%, #558B2F 50%, #33691E 100%)';
    }
    btn.textContent = this._darkModeEnabled ? '☀️ Light' : '🌙 Dark';
  }

  /**
   * Check if tiles are visible
   * @returns {boolean}
   */
  areTilesVisible() {
    return this._tilesVisible;
  }

  /**
   * Check if sliders are visible
   * @returns {boolean}
   */
  areSlidersVisible() {
    return this._slidersVisible;
  }

  /**
   * Check if dark mode is enabled
   * @returns {boolean}
   */
  isDarkModeEnabled() {
    return this._darkModeEnabled;
  }

  // ==========================================
  // SLIDER SETUP
  // ==========================================

  /**
   * Setup debug slider event listeners
   */
  setupSliders() {
    const xSlider = document.getElementById('x-offset-slider');
    const ySlider = document.getElementById('y-offset-slider');
    const sizeSlider = document.getElementById('size-mult-slider');
    const cursorXSlider = document.getElementById('cursor-x-slider');
    const cursorYSlider = document.getElementById('cursor-y-slider');

    if (xSlider) {
      xSlider.addEventListener('input', (e) => {
        this._offsetX = parseFloat(e.target.value);
        const valueEl = document.getElementById('x-offset-value');
        if (valueEl) valueEl.textContent = this._offsetX;
        this._updateUI();
      });
    }

    if (ySlider) {
      ySlider.addEventListener('input', (e) => {
        this._offsetY = parseFloat(e.target.value);
        const valueEl = document.getElementById('y-offset-value');
        if (valueEl) valueEl.textContent = this._offsetY;
        this._updateUI();
      });
    }

    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        this._sizeMult = parseFloat(e.target.value);
        const valueEl = document.getElementById('size-mult-value');
        if (valueEl) valueEl.textContent = this._sizeMult.toFixed(1);
        this._updateUI();
      });
    }

    if (cursorXSlider) {
      cursorXSlider.addEventListener('input', (e) => {
        this._cursorOffsetX = parseFloat(e.target.value);
        const valueEl = document.getElementById('cursor-x-value');
        if (valueEl) valueEl.textContent = this._cursorOffsetX;
      });
    }

    if (cursorYSlider) {
      cursorYSlider.addEventListener('input', (e) => {
        this._cursorOffsetY = parseFloat(e.target.value);
        const valueEl = document.getElementById('cursor-y-value');
        if (valueEl) valueEl.textContent = this._cursorOffsetY;
      });
    }
  }

  // ==========================================
  // UTILITY
  // ==========================================

  /**
   * Copy current debug values to clipboard
   */
  copyValues() {
    const values = `debugOffsetX = ${this._offsetX};
debugOffsetY = ${this._offsetY};
debugSizeMult = ${this._sizeMult};
cursorOffsetX = ${this._cursorOffsetX};
cursorOffsetY = ${this._cursorOffsetY};`;

    navigator.clipboard.writeText(values).then(() => {
      this._notify('Debug values copied to clipboard!', 'success');
    }).catch(() => {
      console.log(values);
      this._notify('Values logged to console', 'info');
    });
  }

  /**
   * Set debug values programmatically
   * @param {Object} values - Object with offsetX, offsetY, sizeMult, cursorOffsetX, cursorOffsetY
   */
  setValues(values) {
    if (values.offsetX !== undefined) this._offsetX = values.offsetX;
    if (values.offsetY !== undefined) this._offsetY = values.offsetY;
    if (values.sizeMult !== undefined) this._sizeMult = values.sizeMult;
    if (values.cursorOffsetX !== undefined) this._cursorOffsetX = values.cursorOffsetX;
    if (values.cursorOffsetY !== undefined) this._cursorOffsetY = values.cursorOffsetY;

    // Update slider UI to match
    this._syncSlidersToValues();
  }

  /**
   * Sync slider UI elements to current values
   * @private
   */
  _syncSlidersToValues() {
    const xSlider = document.getElementById('x-offset-slider');
    const ySlider = document.getElementById('y-offset-slider');
    const sizeSlider = document.getElementById('size-mult-slider');
    const cursorXSlider = document.getElementById('cursor-x-slider');
    const cursorYSlider = document.getElementById('cursor-y-slider');

    if (xSlider) {
      xSlider.value = this._offsetX;
      const valueEl = document.getElementById('x-offset-value');
      if (valueEl) valueEl.textContent = this._offsetX;
    }

    if (ySlider) {
      ySlider.value = this._offsetY;
      const valueEl = document.getElementById('y-offset-value');
      if (valueEl) valueEl.textContent = this._offsetY;
    }

    if (sizeSlider) {
      sizeSlider.value = this._sizeMult;
      const valueEl = document.getElementById('size-mult-value');
      if (valueEl) valueEl.textContent = this._sizeMult.toFixed(1);
    }

    if (cursorXSlider) {
      cursorXSlider.value = this._cursorOffsetX;
      const valueEl = document.getElementById('cursor-x-value');
      if (valueEl) valueEl.textContent = this._cursorOffsetX;
    }

    if (cursorYSlider) {
      cursorYSlider.value = this._cursorOffsetY;
      const valueEl = document.getElementById('cursor-y-value');
      if (valueEl) valueEl.textContent = this._cursorOffsetY;
    }
  }
}
