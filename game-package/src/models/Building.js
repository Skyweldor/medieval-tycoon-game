/**
 * Building Model
 * Represents a placed building in the game world
 */

import { BUILDING_FOOTPRINT } from '../config/index.js';
import { getBuildingDef } from '../config/index.js';

export class Building {
  /**
   * Create a new building instance
   * @param {Object} data - Building data
   * @param {string} data.type - Building type (e.g., 'wheat_farm', 'bakery')
   * @param {number} data.row - Grid row position
   * @param {number} data.col - Grid column position
   * @param {number} [data.level=1] - Building upgrade level
   */
  constructor({ type, row, col, level = 1 }) {
    this.type = type;
    this.row = row;
    this.col = col;
    this.level = level;
  }

  /**
   * Get the building definition from config
   * @returns {Object|null} Building definition or null if not found
   */
  getDefinition() {
    return getBuildingDef(this.type);
  }

  /**
   * Get the display name of this building
   * @returns {string}
   */
  getName() {
    const def = this.getDefinition();
    return def ? def.name : this.type;
  }

  /**
   * Get the footprint size (buildings occupy NxN tiles)
   * @returns {number}
   */
  getFootprint() {
    return BUILDING_FOOTPRINT;
  }

  /**
   * Get all tile positions occupied by this building
   * @returns {Array<{row: number, col: number}>}
   */
  getOccupiedTiles() {
    const tiles = [];
    for (let dr = 0; dr < BUILDING_FOOTPRINT; dr++) {
      for (let dc = 0; dc < BUILDING_FOOTPRINT; dc++) {
        tiles.push({ row: this.row + dr, col: this.col + dc });
      }
    }
    return tiles;
  }

  /**
   * Check if this building occupies a specific tile
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @returns {boolean}
   */
  occupiesTile(row, col) {
    return (
      row >= this.row &&
      row < this.row + BUILDING_FOOTPRINT &&
      col >= this.col &&
      col < this.col + BUILDING_FOOTPRINT
    );
  }

  /**
   * Get the center position of this building in grid coordinates
   * @returns {{row: number, col: number}}
   */
  getCenter() {
    const offset = (BUILDING_FOOTPRINT - 1) / 2;
    return {
      row: this.row + offset,
      col: this.col + offset
    };
  }

  /**
   * Get production output for this building at current level
   * @returns {Object} Resource amounts produced per tick
   */
  getProduction() {
    const def = this.getDefinition();
    if (!def || !def.production) return {};

    const multiplier = this.getProductionMultiplier();
    const production = {};

    Object.entries(def.production).forEach(([resource, amount]) => {
      production[resource] = amount * multiplier;
    });

    return production;
  }

  /**
   * Get resources consumed per tick
   * @returns {Object} Resource amounts consumed per tick
   */
  getConsumption() {
    const def = this.getDefinition();
    if (!def || !def.consumes) return {};

    const multiplier = this.getProductionMultiplier();
    const consumption = {};

    Object.entries(def.consumes).forEach(([resource, amount]) => {
      consumption[resource] = amount * multiplier;
    });

    return consumption;
  }

  /**
   * Get the production multiplier for current level
   * @returns {number}
   */
  getProductionMultiplier() {
    const def = this.getDefinition();
    if (!def || this.level <= 1) return 1;

    // Level 1 = base (mult 1)
    // Level 2 = first upgrade mult
    // etc.
    const upgradeIndex = this.level - 2;
    if (def.upgrades && def.upgrades[upgradeIndex]) {
      return def.upgrades[upgradeIndex].mult;
    }
    return 1;
  }

  /**
   * Get the cost to upgrade to the next level
   * @returns {Object|null} Cost object or null if max level
   */
  getUpgradeCost() {
    const def = this.getDefinition();
    if (!def || !def.upgrades) return null;

    const upgradeIndex = this.level - 1; // Current level - 1 = index of next upgrade
    if (upgradeIndex >= def.upgrades.length) return null;

    return def.upgrades[upgradeIndex].cost;
  }

  /**
   * Check if this building can be upgraded
   * @returns {boolean}
   */
  canUpgrade() {
    return this.getUpgradeCost() !== null;
  }

  /**
   * Get the maximum level for this building type
   * @returns {number}
   */
  getMaxLevel() {
    const def = this.getDefinition();
    if (!def || !def.upgrades) return 1;
    return def.upgrades.length + 1;
  }

  /**
   * Get storage bonus (for barns)
   * @returns {number}
   */
  getStorageBonus() {
    const def = this.getDefinition();
    if (!def || !def.storageBonus) return 0;
    return def.storageBonus * this.getProductionMultiplier();
  }

  /**
   * Check if this building produces gold
   * @returns {boolean}
   */
  producesGold() {
    const production = this.getProduction();
    return production.gold && production.gold > 0;
  }

  /**
   * Convert to plain object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      type: this.type,
      row: this.row,
      col: this.col,
      level: this.level
    };
  }

  /**
   * Create a Building instance from a plain object
   * @param {Object} data - Plain object with building data
   * @returns {Building}
   */
  static fromJSON(data) {
    return new Building(data);
  }
}
