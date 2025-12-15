/**
 * BuildingService
 * Handles building placement, upgrades, and queries
 */

import { Events } from '../core/EventBus.js';
import { TILE_CONFIG, BUILDING_FOOTPRINT, getBuildingDef, GOLD_PRODUCERS } from '../config/index.js';

export class BuildingService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, resourceService, eventBus) {
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._eventBus = eventBus;
  }

  // ==========================================
  // BUILDING QUERIES
  // ==========================================

  /**
   * Get all placed buildings
   * @returns {Array<{type: string, row: number, col: number, level: number}>}
   */
  getBuildings() {
    return this._gameState.getBuildings();
  }

  /**
   * Get building count
   * @returns {number}
   */
  getBuildingCount() {
    return this._gameState.getBuildings().length;
  }

  /**
   * Count buildings of a specific type
   * @param {string} type - Building type
   * @returns {number}
   */
  countBuildings(type) {
    return this._gameState.countBuildings(type);
  }

  /**
   * Find building at a specific grid position
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @returns {Object|null} Building object or null
   */
  getBuildingAt(row, col) {
    return this._gameState.getBuildingAt(row, col, BUILDING_FOOTPRINT);
  }

  /**
   * Find building by index
   * @param {number} index - Building index in array
   * @returns {Object|null}
   */
  getBuildingByIndex(index) {
    const buildings = this._gameState.getBuildings();
    return buildings[index] || null;
  }

  /**
   * Get index of a building
   * @param {Object} building - Building to find
   * @returns {number} Index or -1 if not found
   */
  getBuildingIndex(building) {
    const buildings = this._gameState.getBuildings();
    return buildings.findIndex(b =>
      b.type === building.type &&
      b.row === building.row &&
      b.col === building.col
    );
  }

  // ==========================================
  // TILE OCCUPANCY
  // ==========================================

  /**
   * Get set of tile positions occupied by built buildings
   * @returns {Set<string>} Set of "row,col" strings
   */
  getOccupiedTiles() {
    const occupied = new Set();
    const buildings = this._gameState.getBuildings();

    buildings.forEach(building => {
      for (let dr = 0; dr < BUILDING_FOOTPRINT; dr++) {
        for (let dc = 0; dc < BUILDING_FOOTPRINT; dc++) {
          occupied.add(`${building.row + dr},${building.col + dc}`);
        }
      }
    });

    return occupied;
  }

  /**
   * Check if a specific tile is occupied
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  isTileOccupied(row, col) {
    return this.getOccupiedTiles().has(`${row},${col}`);
  }

  // ==========================================
  // PLACEMENT VALIDATION
  // ==========================================

  /**
   * Check if a building can be placed at the specified position
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @returns {boolean}
   */
  canPlaceAt(row, col) {
    const { rows, cols } = TILE_CONFIG;

    // Check bounds - building needs footprint space
    if (row < 0 || col < 0 ||
        row + BUILDING_FOOTPRINT > rows ||
        col + BUILDING_FOOTPRINT > cols) {
      return false;
    }

    // Check for collisions with existing buildings
    const occupied = this.getOccupiedTiles();
    for (let dr = 0; dr < BUILDING_FOOTPRINT; dr++) {
      for (let dc = 0; dc < BUILDING_FOOTPRINT; dc++) {
        if (occupied.has(`${row + dr},${col + dc}`)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a building type can be built (unlocked and affordable)
   * @param {string} type - Building type
   * @returns {{canBuild: boolean, reason: string|null}}
   */
  canBuild(type) {
    const def = getBuildingDef(type);
    if (!def) {
      return { canBuild: false, reason: 'Unknown building type' };
    }

    // Check unlock requirements
    if (!this._resourceService.isUnlocked(def.unlockReq)) {
      return { canBuild: false, reason: 'Requirements not met' };
    }

    // Check affordability
    if (!this._resourceService.canAfford(def.baseCost)) {
      return { canBuild: false, reason: 'Not enough resources' };
    }

    return { canBuild: true, reason: null };
  }

  // ==========================================
  // BUILDING PLACEMENT
  // ==========================================

  /**
   * Place a building at the specified grid position
   * @param {string} type - Building type
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @returns {{success: boolean, error: string|null}}
   */
  placeBuilding(type, row, col) {
    const def = getBuildingDef(type);
    if (!def) {
      return { success: false, error: 'Unknown building type' };
    }

    // Check if we can afford it
    if (!this._resourceService.canAfford(def.baseCost)) {
      return { success: false, error: `Not enough resources to build ${def.name}!` };
    }

    // Check if placement is valid
    if (!this.canPlaceAt(row, col)) {
      return { success: false, error: 'Cannot place building here!' };
    }

    // Deduct cost
    this._resourceService.spendResources(def.baseCost);

    // Create building data
    // Note: level 0 = display level 1 (first level)
    const building = {
      type: type,
      row: row,
      col: col,
      level: 0
    };

    // Add building to state
    this._gameState.addBuilding(building);

    // Publish building placed event
    this._eventBus.publish(Events.BUILDING_PLACED, {
      building: { ...building },
      type,
      row,
      col,
      isGoldProducer: GOLD_PRODUCERS.includes(type),
      isMarket: type === 'market'
    });

    return { success: true, error: null };
  }

  // ==========================================
  // BUILDING REMOVAL (DEMOLISH)
  // ==========================================

  /**
   * Calculate refund amount for removing a building (50% of costs)
   * @param {Object} building - Building object with type and level
   * @returns {Object} Refund amounts by resource type
   */
  calculateRefund(building) {
    const def = getBuildingDef(building.type);
    if (!def) return {};

    const refund = {};
    const REFUND_RATE = 0.5; // 50% refund

    // Add 50% of base cost
    Object.entries(def.baseCost).forEach(([resource, amount]) => {
      refund[resource] = (refund[resource] || 0) + Math.floor(amount * REFUND_RATE);
    });

    // Add 50% of upgrade costs (for all levels up to current)
    if (def.upgrades && building.level > 0) {
      for (let i = 0; i < building.level; i++) {
        const upgradeCost = def.upgrades[i]?.cost;
        if (upgradeCost) {
          Object.entries(upgradeCost).forEach(([resource, amount]) => {
            refund[resource] = (refund[resource] || 0) + Math.floor(amount * REFUND_RATE);
          });
        }
      }
    }

    return refund;
  }

  /**
   * Remove a building and refund resources
   * @param {number} index - Building index to remove
   * @returns {{success: boolean, error: string|null, refund: Object|null}}
   */
  removeBuilding(index) {
    const buildings = this._gameState.getBuildings();
    const building = buildings[index];

    if (!building) {
      return { success: false, error: 'Building not found', refund: null };
    }

    const def = getBuildingDef(building.type);
    if (!def) {
      return { success: false, error: 'Unknown building type', refund: null };
    }

    // Calculate refund before removal
    const refund = this.calculateRefund(building);

    // Remove the building from state
    const removed = this._gameState.removeBuilding(index);
    if (!removed) {
      return { success: false, error: 'Failed to remove building', refund: null };
    }

    // Grant refund
    if (Object.keys(refund).length > 0) {
      this._resourceService.grantReward(refund);
    }

    // Publish removal event
    this._eventBus.publish(Events.BUILDING_REMOVED, {
      building: removed,
      index,
      refund,
      type: removed.type,
      row: removed.row,
      col: removed.col
    });

    return { success: true, error: null, refund };
  }

  /**
   * Remove a building by reference
   * @param {Object} building - Building to remove
   * @returns {{success: boolean, error: string|null, refund: Object|null}}
   */
  removeBuildingByRef(building) {
    const index = this.getBuildingIndex(building);
    if (index === -1) {
      return { success: false, error: 'Building not found', refund: null };
    }
    return this.removeBuilding(index);
  }

  // ==========================================
  // BUILDING UPGRADES
  // ==========================================

  /**
   * Get upgrade cost for a building
   * @param {Object} building - Building object
   * @returns {Object|null} Cost object or null if max level
   */
  getUpgradeCost(building) {
    const def = getBuildingDef(building.type);
    if (!def || !def.upgrades) return null;

    // level is 0-indexed, upgrades array is 0-indexed
    // level 0 can upgrade with upgrades[0]
    // level 1 can upgrade with upgrades[1]
    if (building.level >= def.upgrades.length) {
      return null; // Max level
    }

    return def.upgrades[building.level].cost;
  }

  /**
   * Check if a building can be upgraded
   * @param {Object} building - Building object
   * @returns {{canUpgrade: boolean, reason: string|null, cost: Object|null}}
   */
  canUpgrade(building) {
    const def = getBuildingDef(building.type);
    if (!def) {
      return { canUpgrade: false, reason: 'Unknown building type', cost: null };
    }

    if (!def.upgrades || building.level >= def.upgrades.length) {
      return { canUpgrade: false, reason: 'Already at max level', cost: null };
    }

    const cost = def.upgrades[building.level].cost;

    if (!this._resourceService.canAfford(cost)) {
      return { canUpgrade: false, reason: 'Not enough resources', cost };
    }

    return { canUpgrade: true, reason: null, cost };
  }

  /**
   * Upgrade a building by index
   * @param {number} index - Building index
   * @returns {{success: boolean, error: string|null}}
   */
  upgradeBuilding(index) {
    const buildings = this._gameState.getBuildings();
    const building = buildings[index];

    if (!building) {
      return { success: false, error: 'Building not found' };
    }

    const def = getBuildingDef(building.type);
    if (!def) {
      return { success: false, error: 'Unknown building type' };
    }

    // Check if max level
    if (!def.upgrades || building.level >= def.upgrades.length) {
      return { success: false, error: `${def.name} is already at max level!` };
    }

    const upgradeCost = def.upgrades[building.level].cost;

    // Check if we can afford
    if (!this._resourceService.canAfford(upgradeCost)) {
      return { success: false, error: `Not enough resources to upgrade ${def.name}!` };
    }

    // Deduct cost
    this._resourceService.spendResources(upgradeCost);

    // Upgrade through proper mutation API
    const oldLevel = building.level;
    const newLevel = oldLevel + 1;
    this._gameState.updateBuilding(index, { level: newLevel });

    // Publish upgrade event
    this._eventBus.publish(Events.BUILDING_UPGRADED, {
      building: { ...building, level: newLevel },
      index,
      oldLevel,
      newLevel,
      displayLevel: newLevel + 1 // Human-readable level
    });

    return { success: true, error: null };
  }

  /**
   * Upgrade a building by reference
   * @param {Object} building - Building to upgrade
   * @returns {{success: boolean, error: string|null}}
   */
  upgradeBuildingByRef(building) {
    const index = this.getBuildingIndex(building);
    if (index === -1) {
      return { success: false, error: 'Building not found' };
    }
    return this.upgradeBuilding(index);
  }

  // ==========================================
  // BUILDING INFO HELPERS
  // ==========================================

  /**
   * Get the display level of a building (1-indexed for UI)
   * @param {Object} building
   * @returns {number}
   */
  getDisplayLevel(building) {
    return (building.level || 0) + 1;
  }

  /**
   * Get max level for a building type
   * @param {string} type
   * @returns {number}
   */
  getMaxLevel(type) {
    const def = getBuildingDef(type);
    if (!def || !def.upgrades) return 1;
    return def.upgrades.length + 1; // +1 because base level is 1
  }

  /**
   * Check if player has any gold-producing buildings
   * @returns {boolean}
   */
  hasGoldProduction() {
    const buildings = this._gameState.getBuildings();
    return buildings.some(b => GOLD_PRODUCERS.includes(b.type));
  }

  /**
   * Check if player has a market
   * @returns {boolean}
   */
  hasMarket() {
    return this.countBuildings('market') > 0;
  }

  /**
   * Get market level (0 if no market)
   * @returns {number}
   */
  getMarketLevel() {
    const buildings = this._gameState.getBuildings();
    const market = buildings.find(b => b.type === 'market');
    return market ? this.getDisplayLevel(market) : 0;
  }

  /**
   * Get total building levels (sum of all display levels)
   * @returns {number}
   */
  getTotalLevels() {
    const buildings = this._gameState.getBuildings();
    return buildings.reduce((sum, b) => sum + this.getDisplayLevel(b), 0);
  }

  /**
   * Get building statistics
   * @returns {{count: number, totalLevels: number, types: Object}}
   */
  getStats() {
    const buildings = this._gameState.getBuildings();
    const types = {};

    buildings.forEach(b => {
      types[b.type] = (types[b.type] || 0) + 1;
    });

    return {
      count: buildings.length,
      totalLevels: this.getTotalLevels(),
      types
    };
  }
}
