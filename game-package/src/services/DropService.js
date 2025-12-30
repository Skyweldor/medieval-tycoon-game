/**
 * DropService
 * Manages drop entities - resources spawned from buildings that must be collected
 * Drops are spawned when processor buildings complete cycles and player clicks them
 */

import { Events } from '../core/EventBus.js';
import { BUILDING_FOOTPRINT } from '../config/tiles.config.js';

let dropIdCounter = 0;

/**
 * Drop entity structure
 * @typedef {Object} Drop
 * @property {string} id - Unique drop identifier
 * @property {string} resourceId - Resource type (wheat, flour, etc.)
 * @property {number} amount - Resource amount
 * @property {number} gridX - Grid X position
 * @property {number} gridY - Grid Y position
 * @property {number} sourceBuildingIndex - Building that spawned this drop
 * @property {number} spawnedAt - Timestamp when spawned
 * @property {string|null} reservedBy - Character ID if reserved for pickup
 * @property {boolean} collected - Whether drop has been collected
 */

export class DropService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./ResourceService.js').ResourceService} resourceService
   * @param {import('./ProcessorService.js').ProcessorService} processorService
   * @param {import('./CoordinateService.js').CoordinateService} coordinateService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, resourceService, processorService, coordinateService, eventBus) {
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._processorService = processorService;
    this._coordinateService = coordinateService;
    this._eventBus = eventBus;

    /** @type {Map<string, Drop>} Active drops keyed by ID */
    this._drops = new Map();
  }

  /**
   * Spawn drops from a building's buffered outputs
   * Called when player clicks a "Ready!" building
   * @param {number} buildingIndex - Building to spawn drops from
   * @returns {string[]} Array of drop IDs created
   */
  spawnFromBuilding(buildingIndex) {
    const building = this._gameState.getBuildings()[buildingIndex];
    if (!building) {
      console.warn('[DropService] Building not found:', buildingIndex);
      return [];
    }

    const outputs = this._processorService.clearBuffer(buildingIndex);
    if (!outputs || Object.keys(outputs).length === 0) {
      console.log('[DropService] No buffered outputs for building:', buildingIndex);
      return [];
    }

    const dropIds = [];
    const buildingCenter = this._getBuildingCenter(building);
    const outputEntries = Object.entries(outputs);

    // Spawn one drop per resource type
    outputEntries.forEach(([resourceId, amount], index) => {
      const drop = this._createDrop({
        resourceId,
        amount,
        sourceBuildingIndex: buildingIndex,
        centerX: buildingCenter.x,
        centerY: buildingCenter.y,
        spawnIndex: index,
        totalDrops: outputEntries.length
      });

      this._drops.set(drop.id, drop);
      dropIds.push(drop.id);
    });

    // Emit drops spawned event
    this._eventBus.publish('drops:spawned', {
      buildingIndex,
      dropIds,
      totalResources: outputs
    });

    console.log('[DropService] Spawned drops:', dropIds, 'from building', buildingIndex);
    return dropIds;
  }

  /**
   * Create a drop entity
   * @private
   */
  _createDrop({ resourceId, amount, sourceBuildingIndex, centerX, centerY, spawnIndex, totalDrops }) {
    // Scatter drops in a small arc below the building
    let offsetX = 0;
    let offsetY = 0.8; // Default: drop below building

    if (totalDrops > 1) {
      // Spread multiple drops in an arc
      const angle = ((spawnIndex / (totalDrops - 1)) - 0.5) * Math.PI * 0.6;
      const radius = 0.6 + Math.random() * 0.3;
      offsetX = Math.sin(angle) * radius;
      offsetY = 0.6 + Math.cos(angle) * 0.4;
    }

    // Add slight randomness
    offsetX += (Math.random() - 0.5) * 0.2;
    offsetY += (Math.random() - 0.5) * 0.1;

    return {
      id: `drop_${++dropIdCounter}`,
      resourceId,
      amount,
      sourceBuildingIndex,
      gridX: centerX + offsetX,
      gridY: centerY + offsetY,
      spawnedAt: Date.now(),
      reservedBy: null,
      collected: false
    };
  }

  /**
   * Get building center in grid coordinates
   * @private
   */
  _getBuildingCenter(building) {
    return {
      x: building.col + BUILDING_FOOTPRINT / 2,
      y: building.row + BUILDING_FOOTPRINT / 2
    };
  }

  /**
   * Collect a drop (add resources to storage)
   * Handles partial collection if storage is full
   * @param {string} dropId
   * @returns {{success: boolean, collected: Object, remainder: Object|null, storageFull: boolean}}
   */
  collectDrop(dropId) {
    const drop = this._drops.get(dropId);
    if (!drop || drop.collected) {
      return { success: false, collected: {}, remainder: null, storageFull: false };
    }

    const resourceId = drop.resourceId;
    const remainingSpace = this._resourceService.getRemainingSpace(resourceId);

    if (remainingSpace <= 0) {
      // Storage completely full - cannot collect
      this._eventBus.publish(Events.NOTIFICATION, {
        message: `Storage full! Build more Barns to collect ${resourceId}.`,
        type: 'warning'
      });
      return { success: false, collected: {}, remainder: { [resourceId]: drop.amount }, storageFull: true };
    }

    const collectAmount = Math.min(drop.amount, remainingSpace);
    const remainder = drop.amount - collectAmount;

    // Add collected amount to resources
    this._resourceService.addResource(resourceId, collectAmount);

    if (remainder > 0) {
      // Partial collection - update drop amount
      drop.amount = remainder;

      this._eventBus.publish(Events.NOTIFICATION, {
        message: `Partial collection - ${remainder} ${resourceId} left (storage full).`,
        type: 'info'
      });

      this._eventBus.publish('drop:partialCollect', {
        dropId,
        resourceId,
        collected: collectAmount,
        remaining: remainder
      });

      return {
        success: true,
        collected: { [resourceId]: collectAmount },
        remainder: { [resourceId]: remainder },
        storageFull: true
      };
    } else {
      // Full collection - remove drop
      drop.collected = true;
      this._drops.delete(dropId);

      this._eventBus.publish('drop:collected', {
        dropId,
        resourceId,
        amount: collectAmount
      });

      return { success: true, collected: { [resourceId]: collectAmount }, remainder: null, storageFull: false };
    }
  }

  /**
   * Get all active drops
   * @returns {Array<Drop>}
   */
  getDrops() {
    return Array.from(this._drops.values()).filter(d => !d.collected);
  }

  /**
   * Get drop by ID
   * @param {string} dropId
   * @returns {Drop|null}
   */
  getDrop(dropId) {
    return this._drops.get(dropId) || null;
  }

  /**
   * Get drops near a grid position (for villager pickup)
   * @param {number} gridX
   * @param {number} gridY
   * @param {number} radius
   * @returns {Array<Drop>}
   */
  getDropsNear(gridX, gridY, radius = 1) {
    return this.getDrops().filter(drop => {
      const dx = drop.gridX - gridX;
      const dy = drop.gridY - gridY;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  /**
   * Find nearest unreserved drop from a position
   * @param {number} gridX
   * @param {number} gridY
   * @returns {Drop|null}
   */
  findNearestDrop(gridX, gridY) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const drop of this.getDrops()) {
      if (drop.reservedBy) continue; // Skip reserved drops

      const dx = drop.gridX - gridX;
      const dy = drop.gridY - gridY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = drop;
      }
    }

    return nearest;
  }

  /**
   * Reserve a drop for a villager (prevents multiple villagers targeting same drop)
   * @param {string} dropId
   * @param {string} villagerId
   * @returns {boolean}
   */
  reserveDrop(dropId, villagerId) {
    const drop = this._drops.get(dropId);
    if (!drop || drop.reservedBy || drop.collected) return false;
    drop.reservedBy = villagerId;
    return true;
  }

  /**
   * Release a drop reservation
   * @param {string} dropId
   */
  releaseDrop(dropId) {
    const drop = this._drops.get(dropId);
    if (drop) drop.reservedBy = null;
  }

  /**
   * Get count of active drops
   * @returns {number}
   */
  getDropCount() {
    return this.getDrops().length;
  }

  /**
   * Check if there are any drops on the field
   * @returns {boolean}
   */
  hasDrops() {
    return this.getDropCount() > 0;
  }

  /**
   * Export state for save/load
   * @returns {Object}
   */
  exportState() {
    return {
      drops: Array.from(this._drops.values()).filter(d => !d.collected),
      nextId: dropIdCounter
    };
  }

  /**
   * Import state from save
   * @param {Object} savedState
   */
  importState(savedState) {
    this._drops.clear();
    if (savedState?.drops) {
      savedState.drops.forEach(drop => {
        this._drops.set(drop.id, { ...drop });
      });
    }
    if (typeof savedState?.nextId === 'number') {
      dropIdCounter = savedState.nextId;
    }
  }

  /**
   * Clear all drops (for testing/reset)
   */
  clear() {
    this._drops.clear();
  }
}
