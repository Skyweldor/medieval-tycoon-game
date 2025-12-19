/**
 * ProcessorService
 * Handles cycle-based production for processor buildings (Mill, Bread Oven, etc.)
 * Unlike continuous production, processors work in discrete cycles with progress bars
 */

import { Events } from '../core/EventBus.js';
import { getBuildingDef } from '../config/index.js';

/**
 * Processor state for tracking cycle progress
 * @typedef {Object} ProcessorState
 * @property {number} progress - Progress through current cycle (0-1)
 * @property {'idle'|'running'|'stalled'} state - Current processor state
 * @property {string|null} stallReason - Reason for stall (if stalled)
 * @property {boolean} inputsConsumed - Whether inputs have been consumed for current cycle
 */

export class ProcessorService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, resourceService, eventBus) {
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    /**
     * Track processor state per building index
     * @type {Map<number, ProcessorState>}
     */
    this._processorStates = new Map();

    // Subscribe to tick for processing
    this._eventBus.subscribe(Events.TICK, (data) => this.tick(data));

    // Clean up state when buildings are removed
    this._eventBus.subscribe(Events.BUILDING_REMOVED, (data) => {
      this._onBuildingRemoved(data);
    });
  }

  // ==========================================
  // TICK PROCESSING
  // ==========================================

  /**
   * Process one tick for all processor buildings
   * @param {Object} data - Tick event data
   */
  tick(data = {}) {
    const buildings = this._gameState.getBuildings();
    // Default to 1 second tick, but use speed multiplier if available
    const deltaTime = 1000 * (data.speedMult || 1);

    buildings.forEach((building, index) => {
      const def = getBuildingDef(building.type);
      if (!def || !def.isProcessor || !def.recipe) return;

      const state = this._getOrCreateState(index);
      this._processBuilding(building, def, state, deltaTime, index);
    });
  }

  /**
   * Process a single processor building
   * @private
   */
  _processBuilding(building, def, state, deltaTime, index) {
    const recipe = def.recipe;
    const mult = this._getProductionMultiplier(building, def);
    const effectiveCycleTime = recipe.cycleTime / mult;

    // Check if we can start/continue production
    const canConsume = this._resourceService.canAfford(recipe.inputs);
    const hasOutputSpace = this._checkOutputSpace(recipe.outputs);

    // Handle different states
    if (state.state === 'running' && state.inputsConsumed) {
      // Already running with inputs consumed - continue the cycle
      this._advanceCycle(state, deltaTime, effectiveCycleTime, recipe, index, building);
    } else if (!canConsume) {
      // Cannot start - missing inputs
      state.state = 'stalled';
      state.stallReason = this._getMissingInputReason(recipe.inputs);
      state.progress = 0;
      state.inputsConsumed = false;
    } else if (!hasOutputSpace) {
      // Cannot start - output storage full
      state.state = 'stalled';
      state.stallReason = this._getStorageFullReason(recipe.outputs);
      state.progress = 0;
      state.inputsConsumed = false;
    } else {
      // Can start a new cycle - consume inputs
      this._resourceService.applyConsumption(recipe.inputs);
      state.state = 'running';
      state.stallReason = null;
      state.inputsConsumed = true;

      // Advance the cycle (will start from progress 0 or continue)
      this._advanceCycle(state, deltaTime, effectiveCycleTime, recipe, index, building);
    }
  }

  /**
   * Advance the production cycle
   * @private
   */
  _advanceCycle(state, deltaTime, effectiveCycleTime, recipe, index, building) {
    // Advance progress
    state.progress += deltaTime / effectiveCycleTime;

    // Check for cycle completion
    if (state.progress >= 1) {
      // Produce outputs
      this._resourceService.applyProduction(recipe.outputs);

      // Emit cycle complete event
      this._eventBus.publish('processor:cycleComplete', {
        buildingIndex: index,
        buildingType: building.type,
        outputs: recipe.outputs
      });

      // Reset for next cycle
      state.progress = 0;
      state.state = 'idle';
      state.inputsConsumed = false;
    }
  }

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  /**
   * Get or create processor state for a building
   * @param {number} index - Building index
   * @returns {ProcessorState}
   * @private
   */
  _getOrCreateState(index) {
    if (!this._processorStates.has(index)) {
      this._processorStates.set(index, {
        progress: 0,
        state: 'idle',
        stallReason: null,
        inputsConsumed: false
      });
    }
    return this._processorStates.get(index);
  }

  /**
   * Get processor state for UI display
   * @param {number} buildingIndex - Building index
   * @returns {ProcessorState}
   */
  getProcessorState(buildingIndex) {
    return this._processorStates.get(buildingIndex) || {
      progress: 0,
      state: 'idle',
      stallReason: null,
      inputsConsumed: false
    };
  }

  /**
   * Handle building removal - clean up state
   * @param {Object} data - Event data with buildingIndex
   * @private
   */
  _onBuildingRemoved(data) {
    const { buildingIndex } = data;
    if (buildingIndex !== undefined) {
      this._processorStates.delete(buildingIndex);
      // Rebuild index map since indices shift after removal
      this._rebuildStateIndices();
    }
  }

  /**
   * Rebuild state indices after a building removal
   * @private
   */
  _rebuildStateIndices() {
    // When a building is removed, all indices after it shift down
    // For now, clear all states - they'll be recreated on next tick
    // A more sophisticated approach would track by building ID instead of index
    this._processorStates.clear();
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Get production multiplier from building upgrades
   * @private
   */
  _getProductionMultiplier(building, def) {
    if (building.level > 0 && def.upgrades && def.upgrades[building.level - 1]) {
      return def.upgrades[building.level - 1].mult;
    }
    return 1;
  }

  /**
   * Get reason string for missing inputs
   * @private
   */
  _getMissingInputReason(inputs) {
    const missing = this._resourceService.getMissingResources(inputs);
    const resourceNames = Object.keys(missing).map(r =>
      r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')
    );
    return `Need ${resourceNames.join(', ')}`;
  }

  /**
   * Generate stall reason for storage full
   * @param {Object} outputs - Required outputs
   * @returns {string}
   * @private
   */
  _getStorageFullReason(outputs) {
    const fullResources = Object.entries(outputs)
      .filter(([resource, amount]) => {
        const remaining = this._resourceService.getRemainingSpace(resource);
        return remaining < amount;
      })
      .map(([resource]) => resource.charAt(0).toUpperCase() + resource.slice(1).replace('_', ' '));

    if (fullResources.length > 0) {
      return `Storage Full: ${fullResources.join(', ')}`;
    }
    return 'Storage Full';
  }

  /**
   * Check if there's enough storage space for outputs
   * @private
   */
  _checkOutputSpace(outputs) {
    return Object.entries(outputs).every(([resource, amount]) => {
      const remaining = this._resourceService.getRemainingSpace(resource);
      return remaining >= amount;
    });
  }

  // ==========================================
  // PRODUCTION QUERIES (for UI)
  // ==========================================

  /**
   * Check if a building is a processor
   * @param {Object} building - Building object
   * @returns {boolean}
   */
  isProcessor(building) {
    const def = getBuildingDef(building.type);
    return def && def.isProcessor === true;
  }

  /**
   * Get all processor buildings
   * @returns {Array<{building: Object, index: number, state: ProcessorState}>}
   */
  getProcessorBuildings() {
    const buildings = this._gameState.getBuildings();
    const processors = [];

    buildings.forEach((building, index) => {
      if (this.isProcessor(building)) {
        processors.push({
          building,
          index,
          state: this.getProcessorState(index)
        });
      }
    });

    return processors;
  }

  /**
   * Get stalled processors (for notifications)
   * @returns {Array}
   */
  getStalledProcessors() {
    return this.getProcessorBuildings().filter(p => p.state.state === 'stalled');
  }

  /**
   * Get running processors
   * @returns {Array}
   */
  getRunningProcessors() {
    return this.getProcessorBuildings().filter(p => p.state.state === 'running');
  }

  /**
   * Calculate effective production rates for processor outputs
   * Returns approximate per-second rates based on cycle time
   * @returns {Object} Resource rates
   */
  calculateProcessorRates() {
    const rates = {};
    const buildings = this._gameState.getBuildings();

    buildings.forEach((building, index) => {
      const def = getBuildingDef(building.type);
      if (!def || !def.isProcessor || !def.recipe) return;

      const state = this.getProcessorState(index);
      // Only count running processors
      if (state.state !== 'running' && state.state !== 'idle') return;

      const mult = this._getProductionMultiplier(building, def);
      const cycleTimeSeconds = def.recipe.cycleTime / 1000 / mult;

      // Add output rates
      Object.entries(def.recipe.outputs).forEach(([resource, amount]) => {
        rates[resource] = (rates[resource] || 0) + (amount / cycleTimeSeconds);
      });

      // Subtract input rates (consumption)
      Object.entries(def.recipe.inputs).forEach(([resource, amount]) => {
        rates[resource] = (rates[resource] || 0) - (amount / cycleTimeSeconds);
      });
    });

    return rates;
  }

  /**
   * Serialize processor states for save/load
   * @returns {Object}
   */
  exportState() {
    const states = {};
    this._processorStates.forEach((state, index) => {
      states[index] = { ...state };
    });
    return states;
  }

  /**
   * Restore processor states from save data
   * @param {Object} savedStates
   */
  importState(savedStates) {
    this._processorStates.clear();
    if (savedStates) {
      Object.entries(savedStates).forEach(([index, state]) => {
        this._processorStates.set(parseInt(index), { ...state });
      });
    }
  }
}
