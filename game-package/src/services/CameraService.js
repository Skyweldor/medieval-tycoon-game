/**
 * CameraService
 * Handles camera pan/zoom for the game world
 */

import { Events } from '../core/EventBus.js';

/** Default camera settings */
const DEFAULT_CAMERA = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0
};

/** Zoom limits */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

/** Pan speed (pixels per key press) */
const PAN_SPEED = 50;

/**
 * Pan limits by plot size
 * At 10x10 (initial), no panning allowed
 * After expansions, allow panning with increasing limits
 */
const PAN_LIMITS = {
  10: { minX: 0, maxX: 0, minY: 0, maxY: 0 },           // No panning at 10x10
  12: { minX: -50, maxX: 50, minY: -50, maxY: 0 },      // First expansion
  14: { minX: -100, maxX: 100, minY: -100, maxY: 50 },  // Second expansion
  16: { minX: -150, maxX: 150, minY: -150, maxY: 100 }  // Third expansion
};

export class CameraService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, eventBus) {
    this._gameState = gameState;
    this._eventBus = eventBus;

    // Drag state
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragStartOffsetX = 0;
    this._dragStartOffsetY = 0;

    // Game world element reference
    this._gameWorldEl = null;

    // Debug display element
    this._debugEl = null;
    this._debugEnabled = false;

    // Bound handlers for event cleanup
    this._boundMouseDown = this._handleMouseDown.bind(this);
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundMouseUp = this._handleMouseUp.bind(this);
    this._boundWheel = this._handleWheel.bind(this);
    this._boundKeyDown = this._handleKeyDown.bind(this);
  }

  // ==========================================
  // CAMERA STATE
  // ==========================================

  /**
   * Get current camera state
   * @returns {{offsetX: number, offsetY: number, zoom: number}}
   */
  getCamera() {
    return this._gameState.getCamera();
  }

  /**
   * Get camera offset
   * @returns {{x: number, y: number}}
   */
  getOffset() {
    const cam = this.getCamera();
    return { x: cam.offsetX, y: cam.offsetY };
  }

  /**
   * Get zoom level
   * @returns {number}
   */
  getZoom() {
    return this.getCamera().zoom;
  }

  // ==========================================
  // CAMERA CONTROLS
  // ==========================================

  /**
   * Get pan limits based on current plot size
   * @returns {{minX: number, maxX: number, minY: number, maxY: number}}
   * @private
   */
  _getPanLimits() {
    const plotSize = this._gameState.getPlotSize();
    const size = Math.max(plotSize.rows, plotSize.cols);
    return PAN_LIMITS[size] || PAN_LIMITS[16]; // Default to max if larger
  }

  /**
   * Clamp offset values to current pan limits
   * @param {number} x
   * @param {number} y
   * @returns {{x: number, y: number}}
   * @private
   */
  _clampOffset(x, y) {
    const limits = this._getPanLimits();
    return {
      x: Math.max(limits.minX, Math.min(limits.maxX, x)),
      y: Math.max(limits.minY, Math.min(limits.maxY, y))
    };
  }

  /**
   * Check if panning is enabled at current plot size
   * @returns {boolean}
   */
  canPan() {
    const limits = this._getPanLimits();
    return limits.minX !== limits.maxX || limits.minY !== limits.maxY;
  }

  /**
   * Set camera offset (clamped to pan limits)
   * @param {number} x
   * @param {number} y
   */
  setOffset(x, y) {
    const clamped = this._clampOffset(x, y);
    this._gameState.updateCamera({ offsetX: clamped.x, offsetY: clamped.y });
    this._eventBus.publish(Events.CAMERA_MOVED, { offsetX: clamped.x, offsetY: clamped.y });
    this.applyTransform();
    this._updateDebugDisplay();
  }

  /**
   * Pan camera by delta
   * @param {number} dx
   * @param {number} dy
   */
  pan(dx, dy) {
    const cam = this.getCamera();
    this.setOffset(cam.offsetX + dx, cam.offsetY + dy);
  }

  /**
   * Set zoom level
   * @param {number} zoom
   */
  setZoom(zoom) {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    this._gameState.updateCamera({ zoom: clampedZoom });
    this._eventBus.publish(Events.CAMERA_ZOOMED, { zoom: clampedZoom });
    this.applyTransform();
    this._updateDebugDisplay();
  }

  /**
   * Zoom in
   */
  zoomIn() {
    this.setZoom(this.getZoom() + ZOOM_STEP);
  }

  /**
   * Zoom out
   */
  zoomOut() {
    this.setZoom(this.getZoom() - ZOOM_STEP);
  }

  /**
   * Reset camera to default position
   */
  reset() {
    this._gameState.updateCamera(DEFAULT_CAMERA);
    this._eventBus.publish(Events.CAMERA_MOVED, { offsetX: 0, offsetY: 0 });
    this._eventBus.publish(Events.CAMERA_ZOOMED, { zoom: 1.0 });
    this.applyTransform();
    this._updateDebugDisplay();
  }

  // ==========================================
  // DEBUG DISPLAY
  // ==========================================

  /**
   * Toggle camera debug display
   */
  toggleDebug() {
    this._debugEnabled = !this._debugEnabled;
    if (this._debugEnabled) {
      this._createDebugDisplay();
      this._updateDebugDisplay();
    } else {
      this._removeDebugDisplay();
    }
    return this._debugEnabled;
  }

  /**
   * Check if debug is enabled
   * @returns {boolean}
   */
  isDebugEnabled() {
    return this._debugEnabled;
  }

  /**
   * Create debug display element
   * @private
   */
  _createDebugDisplay() {
    if (this._debugEl) return;

    this._debugEl = document.createElement('div');
    this._debugEl.id = 'camera-debug';
    this._debugEl.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      min-width: 180px;
      border: 1px solid #0f0;
    `;
    document.body.appendChild(this._debugEl);
  }

  /**
   * Remove debug display element
   * @private
   */
  _removeDebugDisplay() {
    if (this._debugEl) {
      this._debugEl.remove();
      this._debugEl = null;
    }
  }

  /**
   * Update debug display with current camera values
   * @private
   */
  _updateDebugDisplay() {
    if (!this._debugEl || !this._debugEnabled) return;

    const cam = this.getCamera();
    const plotSize = this._gameState.getPlotSize();
    const limits = this._getPanLimits();
    const canPan = this.canPan();

    this._debugEl.innerHTML = `
      <div style="color: #fff; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #0f0; padding-bottom: 4px;">
        📷 Camera Debug
      </div>
      <div><span style="color: #888;">offsetX:</span> <span style="color: #0ff;">${cam.offsetX.toFixed(1)}</span></div>
      <div><span style="color: #888;">offsetY:</span> <span style="color: #0ff;">${cam.offsetY.toFixed(1)}</span></div>
      <div><span style="color: #888;">zoom:</span> <span style="color: #ff0;">${cam.zoom.toFixed(2)}</span></div>
      <div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 4px;">
        <span style="color: #888;">plot:</span> <span style="color: #f0f;">${plotSize.rows}x${plotSize.cols}</span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: #888;">pan:</span> <span style="color: ${canPan ? '#0f0' : '#f00'};">${canPan ? 'enabled' : 'disabled'}</span>
      </div>
      ${canPan ? `
      <div style="font-size: 10px; color: #888; margin-top: 4px;">
        X: [${limits.minX}, ${limits.maxX}]<br>
        Y: [${limits.minY}, ${limits.maxY}]
      </div>
      ` : ''}
      <div style="margin-top: 8px; font-size: 10px; color: #666;">
        Shift+drag or middle-click to pan<br>
        Arrow keys to pan<br>
        Ctrl+scroll to zoom
      </div>
    `;
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  /**
   * Handle mouse down for drag start
   * @param {MouseEvent} e
   * @private
   */
  _handleMouseDown(e) {
    // Only start drag with middle mouse button or shift+left click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      this._isDragging = true;
      this._dragStartX = e.clientX;
      this._dragStartY = e.clientY;
      const cam = this.getCamera();
      this._dragStartOffsetX = cam.offsetX;
      this._dragStartOffsetY = cam.offsetY;

      document.body.style.cursor = 'grabbing';
    }
  }

  /**
   * Handle mouse move for dragging
   * @param {MouseEvent} e
   * @private
   */
  _handleMouseMove(e) {
    if (!this._isDragging) return;

    const dx = e.clientX - this._dragStartX;
    const dy = e.clientY - this._dragStartY;

    this.setOffset(
      this._dragStartOffsetX + dx,
      this._dragStartOffsetY + dy
    );
  }

  /**
   * Handle mouse up to end drag
   * @param {MouseEvent} e
   * @private
   */
  _handleMouseUp(e) {
    if (this._isDragging) {
      this._isDragging = false;
      document.body.style.cursor = '';
    }
  }

  /**
   * Handle mouse wheel for zoom
   * @param {WheelEvent} e
   * @private
   */
  _handleWheel(e) {
    // Only zoom if ctrl is held
    if (!e.ctrlKey) return;

    e.preventDefault();

    if (e.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  /**
   * Handle keyboard for pan
   * @param {KeyboardEvent} e
   * @private
   */
  _handleKeyDown(e) {
    // Arrow keys for panning (when not in input field)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowUp':
        this.pan(0, PAN_SPEED);
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.pan(0, -PAN_SPEED);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        this.pan(PAN_SPEED, 0);
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.pan(-PAN_SPEED, 0);
        e.preventDefault();
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case '0':
        if (e.ctrlKey) {
          this.reset();
          e.preventDefault();
        }
        break;
    }
  }

  // ==========================================
  // SETUP
  // ==========================================

  /**
   * Setup camera event listeners on game world
   */
  setupListeners() {
    this._gameWorldEl = document.getElementById('game-world');
    if (!this._gameWorldEl) {
      console.warn('[CameraService] Game world element not found');
      return;
    }

    this._gameWorldEl.addEventListener('mousedown', this._boundMouseDown);
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);
    this._gameWorldEl.addEventListener('wheel', this._boundWheel, { passive: false });
    document.addEventListener('keydown', this._boundKeyDown);

    console.log('[CameraService] Pan with Shift+drag or middle-click. Zoom with Ctrl+scroll.');
  }

  /**
   * Remove camera event listeners
   */
  removeListeners() {
    if (this._gameWorldEl) {
      this._gameWorldEl.removeEventListener('mousedown', this._boundMouseDown);
      this._gameWorldEl.removeEventListener('wheel', this._boundWheel);
    }

    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);
    document.removeEventListener('keydown', this._boundKeyDown);

    this._gameWorldEl = null;
  }

  // ==========================================
  // TRANSFORM APPLICATION
  // ==========================================

  /**
   * Apply camera transform to the game world element
   */
  applyTransform() {
    if (!this._gameWorldEl) {
      this._gameWorldEl = document.getElementById('game-world');
    }
    if (!this._gameWorldEl) return;

    const cam = this.getCamera();

    // Apply transform via CSS custom properties
    this._gameWorldEl.style.setProperty('--camera-x', `${cam.offsetX}px`);
    this._gameWorldEl.style.setProperty('--camera-y', `${cam.offsetY}px`);
    this._gameWorldEl.style.setProperty('--camera-zoom', cam.zoom);
  }

  /**
   * Get CSS transform string for manual application
   * @returns {string}
   */
  getTransformString() {
    const cam = this.getCamera();
    return `translate(${cam.offsetX}px, ${cam.offsetY}px) scale(${cam.zoom})`;
  }

  /**
   * Initialize the camera (apply initial transform)
   */
  initialize() {
    this.setupListeners();
    this.applyTransform();
    console.log('[CameraService] Initialized');
  }

  /**
   * Cleanup
   */
  destroy() {
    this.removeListeners();
    this._removeDebugDisplay();
  }
}
