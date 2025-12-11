/**
 * Config Barrel Export
 * Re-exports all configuration modules for convenient importing
 */

// Tile configuration
export {
  TILE_SCALE,
  TILE_CONFIG,
  TILE,
  TILE_MAP,
  BUILDING_FOOTPRINT
} from './tiles.config.js';

// Asset configuration
export {
  ASSETS,
  EMOJI_FALLBACKS,
  RESOURCE_EMOJIS
} from './assets.config.js';

// Building configuration
export {
  BUILDINGS,
  GOLD_PRODUCERS,
  getBuildingDef,
  getBuildingTypes
} from './buildings.config.js';

// Milestone configuration
export {
  MILESTONES,
  countBuildings,
  getMilestoneDef,
  getMilestoneIds,
  getMilestoneCount
} from './milestones.config.js';

// Merchant & Market configuration
export {
  MERCHANT_CONFIG,
  MARKET_CONFIG,
  getMarketPrice,
  getMerchantPrice,
  getMerchantMaxPerVisit
} from './merchant.config.js';
