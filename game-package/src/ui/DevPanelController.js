/**
 * DevPanelController
 * Handles the developer/playtest panel with save/load controls,
 * speed controls, and resource spawning
 */

import { Events } from '../core/EventBus.js';

/** Speed presets with labels */
const SPEED_PRESETS = [
  { label: '0.5x', tickMs: 2000, stipendMs: 4000 },
  { label: '1x', tickMs: 1000, stipendMs: 2000 },
  { label: '2x', tickMs: 500, stipendMs: 1000 },
  { label: '5x', tickMs: 200, stipendMs: 400 },
  { label: '10x', tickMs: 100, stipendMs: 200 }
];

/** Resource spawn amounts */
const SPAWN_AMOUNTS = {
  gold: 100,
  wheat: 50,
  stone: 50,
  wood: 50
};

export class DevPanelController {
  /**
   * @param {import('../services/SaveLoadService.js').SaveLoadService} saveLoadService
   * @param {import('../services/GameStateService.js').GameStateService} gameState
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../core/GameLoop.js').GameLoop} gameLoop
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(saveLoadService, gameState, resourceService, gameLoop, eventBus) {
    this._saveLoadService = saveLoadService;
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._gameLoop = gameLoop;
    this._eventBus = eventBus;

    /** @type {boolean} Whether the panel is visible */
    this._visible = false;

    /** @type {number} Current speed index */
    this._currentSpeedIndex = 1; // Default to 1x

    // Check URL params for dev mode
    this._devModeEnabled = this._checkDevMode();
  }

  /**
   * Check if dev mode is enabled via URL param
   * @private
   */
  _checkDevMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('dev') === '1' || params.get('dev') === 'true';
  }

  /**
   * Check if dev mode is enabled
   * @returns {boolean}
   */
  isDevModeEnabled() {
    return this._devModeEnabled;
  }

  /**
   * Initialize the dev panel (call after DOM ready)
   */
  initialize() {
    if (!this._devModeEnabled) {
      console.log('[DevPanel] Dev mode not enabled. Add ?dev=1 to URL to enable.');
      return;
    }

    // Show the dev panel container
    const panel = document.getElementById('dev-panel');
    if (panel) {
      panel.style.display = 'block';
      this._visible = true;
    }

    // Setup speed buttons
    this._renderSpeedButtons();

    // Update save status
    this._updateSaveStatus();

    // Subscribe to save events to update status
    this._eventBus.subscribe(Events.STATE_SAVED, () => this._updateSaveStatus());

    console.log('[DevPanel] Initialized in dev mode');
  }

  // ==========================================
  // SAVE/LOAD CONTROLS
  // ==========================================

  /**
   * Save game immediately
   */
  saveNow() {
    const result = this._saveLoadService.save();
    if (result.success) {
      this._notify('Game saved!', 'success');
    } else {
      this._notify('Save failed: ' + result.error, 'error');
    }
    this._updateSaveStatus();
  }

  /**
   * Load saved game
   */
  loadSave() {
    const result = this._saveLoadService.load();
    if (result.success) {
      this._notify('Game loaded!', 'success');
      // Trigger UI refresh
      this._eventBus.publish(Events.UI_UPDATE_REQUESTED);
    } else {
      this._notify('Load failed: ' + result.error, 'error');
    }
  }

  /**
   * Clear saved game
   */
  clearSave() {
    if (confirm('Are you sure you want to clear your saved game?')) {
      this._saveLoadService.clearSave();
      this._notify('Save cleared!', 'info');
      this._updateSaveStatus();
    }
  }

  /**
   * Export save to clipboard
   */
  async exportSave() {
    const json = this._saveLoadService.exportSaveJSON();
    try {
      await navigator.clipboard.writeText(json);
      this._notify('Save copied to clipboard!', 'success');
    } catch (e) {
      // Fallback: show in textarea
      const textarea = document.getElementById('dev-import-textarea');
      if (textarea) {
        textarea.value = json;
        textarea.select();
        this._notify('Save shown in textarea - copy manually', 'info');
      }
    }
  }

  /**
   * Import save from textarea
   */
  importSave() {
    const textarea = document.getElementById('dev-import-textarea');
    if (!textarea || !textarea.value.trim()) {
      this._notify('Paste save JSON into textarea first', 'error');
      return;
    }

    const result = this._saveLoadService.importSaveJSON(textarea.value.trim());
    if (result.success) {
      this._notify('Save imported!', 'success');
      textarea.value = '';
      // Trigger UI refresh
      this._eventBus.publish(Events.UI_UPDATE_REQUESTED);
    } else {
      this._notify('Import failed: ' + result.error, 'error');
    }
  }

  /**
   * Update save status display
   * @private
   */
  _updateSaveStatus() {
    const statusEl = document.getElementById('dev-save-status');
    if (!statusEl) return;

    const info = this._saveLoadService.getSaveInfo();
    if (info.exists) {
      const time = new Date(info.timestamp).toLocaleTimeString();
      statusEl.textContent = `Last save: ${time}`;
      statusEl.className = 'dev-status has-save';
    } else {
      statusEl.textContent = 'No save data';
      statusEl.className = 'dev-status no-save';
    }
  }

  // ==========================================
  // SPEED CONTROLS
  // ==========================================

  /**
   * Set game speed
   * @param {number} index - Speed preset index
   */
  setSpeed(index) {
    if (index < 0 || index >= SPEED_PRESETS.length) return;

    const preset = SPEED_PRESETS[index];
    this._currentSpeedIndex = index;

    this._gameLoop.setTickInterval(preset.tickMs);
    this._gameLoop.setStipendInterval(preset.stipendMs);

    this._renderSpeedButtons();
    this._notify(`Speed: ${preset.label}`, 'info');
  }

  /**
   * Get current speed label
   * @returns {string}
   */
  getCurrentSpeedLabel() {
    return SPEED_PRESETS[this._currentSpeedIndex].label;
  }

  /**
   * Render speed buttons with active state
   * @private
   */
  _renderSpeedButtons() {
    const container = document.getElementById('dev-speed-buttons');
    if (!container) return;

    container.innerHTML = SPEED_PRESETS.map((preset, idx) => {
      const active = idx === this._currentSpeedIndex ? 'active' : '';
      return `<button class="dev-speed-btn ${active}" onclick="window.devSetSpeed(${idx})">${preset.label}</button>`;
    }).join('');
  }

  // ==========================================
  // RESOURCE SPAWNING
  // ==========================================

  /**
   * Spawn test resources
   * @param {string} type - Resource type (gold, wheat, stone, wood)
   */
  spawnResource(type) {
    const amount = SPAWN_AMOUNTS[type] || 100;
    this._resourceService.addResources({ [type]: amount });
    this._notify(`+${amount} ${type}`, 'success');
  }

  /**
   * Spawn all resources
   */
  spawnAll() {
    this._resourceService.addResources(SPAWN_AMOUNTS);
    this._notify('Spawned all resources!', 'success');
  }

  // ==========================================
  // UTILITY
  // ==========================================

  /**
   * Toggle autosave
   */
  toggleAutosave() {
    const enabled = !this._saveLoadService.isAutosaveEnabled();
    this._saveLoadService.setAutosaveEnabled(enabled);

    const btn = document.getElementById('dev-autosave-btn');
    if (btn) {
      btn.textContent = enabled ? 'Autosave: ON' : 'Autosave: OFF';
      btn.className = enabled ? 'dev-btn active' : 'dev-btn';
    }

    this._notify(`Autosave ${enabled ? 'enabled' : 'disabled'}`, 'info');
  }

  /**
   * Show a notification
   * @private
   */
  _notify(message, type = 'info') {
    this._eventBus.publish(Events.NOTIFICATION, { message, type });
  }

  /**
   * Check if panel is visible
   * @returns {boolean}
   */
  isVisible() {
    return this._visible;
  }
}
