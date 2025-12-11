/**
 * Medieval Tycoon - Main Entry Point
 *
 * Phase 0: Foundation setup
 * - Imports configuration modules
 * - Sets up global bridges for backwards compatibility
 * - Initializes core infrastructure (EventBus, ServiceContainer, GameLoop)
 *
 * In later phases, this will bootstrap all services and wire up the game.
 */

// Core infrastructure
import { EventBus, eventBus, Events } from './core/EventBus.js';
import { ServiceContainer, container } from './core/ServiceContainer.js';
import { GameLoop } from './core/GameLoop.js';

// Configuration imports
import {
  TILE_SCALE,
  TILE_CONFIG,
  TILE,
  TILE_MAP,
  BUILDING_FOOTPRINT,
  ASSETS,
  EMOJI_FALLBACKS,
  RESOURCE_EMOJIS,
  BUILDINGS,
  GOLD_PRODUCERS,
  getBuildingDef,
  getBuildingTypes,
  MILESTONES,
  countBuildings,
  getMilestoneDef,
  getMilestoneIds,
  getMilestoneCount,
  MERCHANT_CONFIG,
  MARKET_CONFIG,
  getMarketPrice,
  getMerchantPrice,
  getMerchantMaxPerVisit
} from './config/index.js';

// ==========================================
// GLOBAL BRIDGES (Backwards Compatibility)
// ==========================================
// These expose modules to the global scope so existing inline scripts continue to work.
// They will be removed in Phase 9 when we migrate to fully modular code.

window.TILE_SCALE = TILE_SCALE;
window.TILE_CONFIG = TILE_CONFIG;
window.TILE = TILE;
window.TILE_MAP = TILE_MAP;
window.BUILDING_FOOTPRINT = BUILDING_FOOTPRINT;
window.ASSETS = ASSETS;
window.EMOJI_FALLBACKS = EMOJI_FALLBACKS;
window.RESOURCE_EMOJIS = RESOURCE_EMOJIS;
window.BUILDINGS = BUILDINGS;
window.GOLD_PRODUCERS = GOLD_PRODUCERS;
window.MILESTONES = MILESTONES;
window.MERCHANT_CONFIG = MERCHANT_CONFIG;
window.MARKET_CONFIG = MARKET_CONFIG;

// Helper functions
window.countBuildings = countBuildings;
window.getBuildingDef = getBuildingDef;
window.getMilestoneDef = getMilestoneDef;
window.getMarketPrice = getMarketPrice;
window.getMerchantPrice = getMerchantPrice;

// Core infrastructure (for debugging/testing)
window._eventBus = eventBus;
window._Events = Events;
window._container = container;

// ==========================================
// SERVICE CONTAINER SETUP
// ==========================================
// Register core services (more will be added in later phases)

container.registerInstance('eventBus', eventBus);
container.register('gameLoop', (c) => new GameLoop(c.get('eventBus')));

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize the modular infrastructure
 * Called after DOM is ready
 */
export function initModules() {
  console.log('[Medieval Tycoon] Modular infrastructure loaded');
  console.log('[Medieval Tycoon] Services registered:', container.getNames().join(', '));

  // In later phases, we'll start the game loop here:
  // const gameLoop = container.get('gameLoop');
  // gameLoop.start();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModules);
} else {
  initModules();
}

// Export for testing
export {
  eventBus,
  Events,
  container,
  EventBus,
  ServiceContainer,
  GameLoop
};
