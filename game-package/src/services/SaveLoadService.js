/**
 * SaveLoadService
 * Handles game persistence with autosave, manual save/load, and schema versioning
 */

import { Events } from '../core/EventBus.js';

/** Current save schema version - increment when save format changes */
const SCHEMA_VERSION = 1;

/** LocalStorage key for save data */
const STORAGE_KEY = 'medieval_tycoon_save';

/** Autosave interval in milliseconds (30 seconds) */
const AUTOSAVE_INTERVAL = 30000;

/** Debounce delay for event-triggered saves (500ms - responsive but still batches rapid actions) */
const DEBOUNCE_DELAY = 500;

export class SaveLoadService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, eventBus) {
    this._gameState = gameState;
    this._eventBus = eventBus;

    /** @type {number|null} Autosave interval ID */
    this._autosaveIntervalId = null;

    /** @type {number|null} Debounce timeout ID */
    this._debounceTimeoutId = null;

    /** @type {boolean} Whether autosave is enabled */
    this._autosaveEnabled = true;

    /** @type {number} Last save timestamp */
    this._lastSaveTime = 0;

    // Subscribe to key events that should trigger autosave
    this._setupEventListeners();
  }

  /**
   * Setup event listeners for autosave triggers
   * @private
   */
  _setupEventListeners() {
    // Building placed/upgraded/removed - important save trigger
    this._eventBus.subscribe(Events.BUILDING_PLACED, () => this._debouncedSave());
    this._eventBus.subscribe(Events.BUILDING_UPGRADED, () => this._debouncedSave());
    this._eventBus.subscribe(Events.BUILDING_REMOVED, () => this._debouncedSave());

    // Milestone completed - save achievement progress
    this._eventBus.subscribe(Events.MILESTONE_COMPLETED, () => this._debouncedSave());

    // Merchant sale - save after trading
    this._eventBus.subscribe(Events.MERCHANT_SALE, () => this._debouncedSave());
    this._eventBus.subscribe(Events.MARKET_SALE, () => this._debouncedSave());

    // Save immediately when user leaves/refreshes the page
    window.addEventListener('beforeunload', () => {
      if (this._debounceTimeoutId !== null) {
        // There's a pending save - do it now!
        clearTimeout(this._debounceTimeoutId);
        this._debounceTimeoutId = null;
        this.save();
      }
    });
  }

  /**
   * Debounced save - waits for activity to settle before saving
   * @private
   */
  _debouncedSave() {
    if (!this._autosaveEnabled) return;

    if (this._debounceTimeoutId !== null) {
      clearTimeout(this._debounceTimeoutId);
    }

    this._debounceTimeoutId = setTimeout(() => {
      this.save();
      this._debounceTimeoutId = null;
    }, DEBOUNCE_DELAY);
  }

  /**
   * Start autosave interval
   */
  startAutosave() {
    if (this._autosaveIntervalId !== null) return;

    this._autosaveIntervalId = setInterval(() => {
      if (this._autosaveEnabled) {
        this.save();
      }
    }, AUTOSAVE_INTERVAL);

    console.log('[SaveLoadService] Autosave started (every 30s)');
  }

  /**
   * Stop autosave interval
   */
  stopAutosave() {
    if (this._autosaveIntervalId !== null) {
      clearInterval(this._autosaveIntervalId);
      this._autosaveIntervalId = null;
    }

    if (this._debounceTimeoutId !== null) {
      clearTimeout(this._debounceTimeoutId);
      this._debounceTimeoutId = null;
    }

    console.log('[SaveLoadService] Autosave stopped');
  }

  /**
   * Enable or disable autosave
   * @param {boolean} enabled
   */
  setAutosaveEnabled(enabled) {
    this._autosaveEnabled = enabled;
    console.log(`[SaveLoadService] Autosave ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if autosave is enabled
   * @returns {boolean}
   */
  isAutosaveEnabled() {
    return this._autosaveEnabled;
  }

  // ==========================================
  // SAVE OPERATIONS
  // ==========================================

  /**
   * Save game state to localStorage
   * @returns {{success: boolean, error?: string}}
   */
  save() {
    try {
      const saveData = {
        schemaVersion: SCHEMA_VERSION,
        timestamp: Date.now(),
        state: this._gameState.exportState()
      };

      const json = JSON.stringify(saveData);
      localStorage.setItem(STORAGE_KEY, json);

      this._lastSaveTime = saveData.timestamp;
      this._eventBus.publish(Events.STATE_SAVED, { timestamp: saveData.timestamp });

      console.log('[SaveLoadService] Game saved at', new Date(saveData.timestamp).toLocaleTimeString());
      return { success: true };
    } catch (error) {
      console.error('[SaveLoadService] Save failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export save data as JSON string (for clipboard)
   * @returns {string}
   */
  exportSaveJSON() {
    const saveData = {
      schemaVersion: SCHEMA_VERSION,
      timestamp: Date.now(),
      state: this._gameState.exportState()
    };
    return JSON.stringify(saveData, null, 2);
  }

  // ==========================================
  // LOAD OPERATIONS
  // ==========================================

  /**
   * Load game state from localStorage
   * @returns {{success: boolean, error?: string}}
   */
  load() {
    try {
      const json = localStorage.getItem(STORAGE_KEY);

      if (!json) {
        console.log('[SaveLoadService] No save data found');
        return { success: false, error: 'No save data found' };
      }

      const saveData = JSON.parse(json);
      return this._importSaveData(saveData);
    } catch (error) {
      console.error('[SaveLoadService] Load failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import save data from JSON string (from clipboard)
   * @param {string} json
   * @returns {{success: boolean, error?: string}}
   */
  importSaveJSON(json) {
    try {
      const saveData = JSON.parse(json);
      return this._importSaveData(saveData);
    } catch (error) {
      console.error('[SaveLoadService] Import failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import save data object
   * @param {Object} saveData
   * @returns {{success: boolean, error?: string}}
   * @private
   */
  _importSaveData(saveData) {
    // Validate save data structure
    if (!saveData || typeof saveData !== 'object') {
      return { success: false, error: 'Invalid save data format' };
    }

    if (!saveData.state) {
      return { success: false, error: 'Save data missing state' };
    }

    // Check schema version and migrate if needed
    const migratedState = this._migrateSchema(saveData);
    if (migratedState.error) {
      return { success: false, error: migratedState.error };
    }

    // Import the state
    this._gameState.importState(migratedState.state);

    console.log('[SaveLoadService] Game loaded from',
      saveData.timestamp ? new Date(saveData.timestamp).toLocaleTimeString() : 'unknown time');

    return { success: true };
  }

  /**
   * Migrate save data from older schema versions
   * @param {Object} saveData
   * @returns {{state: Object, error?: string}}
   * @private
   */
  _migrateSchema(saveData) {
    const version = saveData.schemaVersion || 0;
    let state = saveData.state;

    // Handle missing schema version (pre-versioning saves)
    if (version === 0) {
      console.log('[SaveLoadService] Migrating from pre-versioned save');
      // No migration needed for v0 -> v1, structure is compatible
    }

    // Future migrations would go here:
    // if (version < 2) { state = migrateV1toV2(state); }
    // if (version < 3) { state = migrateV2toV3(state); }

    if (version > SCHEMA_VERSION) {
      return {
        state: null,
        error: `Save from newer version (v${version}). Please update the game.`
      };
    }

    return { state };
  }

  // ==========================================
  // CLEAR OPERATIONS
  // ==========================================

  /**
   * Clear saved game from localStorage
   * @returns {{success: boolean}}
   */
  clearSave() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[SaveLoadService] Save data cleared');
      return { success: true };
    } catch (error) {
      console.error('[SaveLoadService] Clear failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // QUERY METHODS
  // ==========================================

  /**
   * Check if a save exists
   * @returns {boolean}
   */
  hasSave() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Get last save timestamp
   * @returns {number|null}
   */
  getLastSaveTime() {
    if (this._lastSaveTime) return this._lastSaveTime;

    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (json) {
        const saveData = JSON.parse(json);
        return saveData.timestamp || null;
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  }

  /**
   * Get save data info without fully loading
   * @returns {{exists: boolean, timestamp?: number, schemaVersion?: number}}
   */
  getSaveInfo() {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return { exists: false };

      const saveData = JSON.parse(json);
      return {
        exists: true,
        timestamp: saveData.timestamp,
        schemaVersion: saveData.schemaVersion
      };
    } catch (e) {
      return { exists: false };
    }
  }
}
