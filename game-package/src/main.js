/**
 * Medieval Tycoon - Main Entry Point
 *
 * Phase 0: Foundation setup
 * - Imports configuration modules
 * - Sets up global bridges for backwards compatibility
 * - Initializes core infrastructure (EventBus, ServiceContainer, GameLoop)
 *
 * Phase 1: Models & Coordinate Service
 * - Building model class
 * - Position helper utilities
 * - CoordinateService for isometric math
 *
 * Phase 2: State & Resource Services
 * - GameStateService for centralized state
 * - ResourceService for resource operations
 *
 * Phase 3: Building Service
 * - BuildingService for building operations
 *
 * Phase 4: Production Service
 * - ProductionService for tick-based resource production
 *
 * Phase 5: Stipend & Milestone Services
 * - StipendService for royal stipend system
 * - MilestoneService for achievement tracking
 *
 * Phase 6: Merchant & Market Services
 * - MerchantService for traveling merchant
 * - MarketService for permanent market trading
 *
 * Phase 7: Renderers
 * - TileRenderer for isometric ground tiles
 * - BuildingRenderer for building sprites and badges
 * - DebugRenderer for debug grid visualization
 *
 * Phase 8: UI Controllers
 * - PlacementController for building placement mode
 * - TabController for panel tab switching
 * - MerchantPanelController for merchant trading panel
 * - DebugController for debug tools and sliders
 *
 * Phase 9: Integration & Cleanup
 * - UIIntegration for wiring EventBus to UI controllers
 * - initializeUI() function for controller setup
 * - Event subscriptions for UI updates
 *
 * The modular infrastructure is now fully wired up.
 */

// Core infrastructure
import { EventBus, eventBus, Events } from './core/EventBus.js';
import { ServiceContainer, container } from './core/ServiceContainer.js';
import { GameLoop } from './core/GameLoop.js';

// Models (Phase 1)
import { Building } from './models/Building.js';
import { Position, createPositionSet, hasPosition } from './models/Position.js';

// Services (Phase 1)
import { CoordinateService, coordinateService } from './services/CoordinateService.js';

// Services (Phase 2)
import { GameStateService } from './services/GameStateService.js';
import { ResourceService } from './services/ResourceService.js';

// Services (Phase 3)
import { BuildingService } from './services/BuildingService.js';

// Services (Phase 4)
import { ProductionService } from './services/ProductionService.js';

// Services (Phase 5)
import { StipendService } from './services/StipendService.js';
import { MilestoneService } from './services/MilestoneService.js';

// Services (Phase 6)
import { MerchantService } from './services/MerchantService.js';
import { MarketService } from './services/MarketService.js';

// UI Controllers (Phase 8)
import { PlacementController } from './ui/PlacementController.js';
import { TabController } from './ui/TabController.js';
import { MerchantPanelController } from './ui/MerchantPanelController.js';
import { DebugController } from './ui/DebugController.js';

// UI Integration (Phase 9)
import { UIIntegration } from './ui/UIIntegration.js';

// Renderers (Phase 7)
import { TileRenderer } from './renderers/TileRenderer.js';
import { BuildingRenderer } from './renderers/BuildingRenderer.js';
import { DebugRenderer } from './renderers/DebugRenderer.js';

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

// Models (Phase 1)
window.Building = Building;
window.Position = Position;
window.createPositionSet = createPositionSet;
window.hasPosition = hasPosition;

// Coordinate functions (Phase 1) - bridge to service methods
// These wrap the CoordinateService singleton for backwards compatibility
window.gridToScreen = (gridX, gridY) => coordinateService.gridToScreen(gridX, gridY);
window.screenToGrid = (screenX, screenY) => coordinateService.screenToGrid(screenX, screenY);
window.gridToPixel = (row, col, isBuilt) => coordinateService.gridToPixel(row, col, isBuilt);

// Core infrastructure (for debugging/testing)
window._eventBus = eventBus;
window._Events = Events;
window._container = container;
window._coordinateService = coordinateService;

// Phase 2 services - lazy getters (services created on first access)
// Resource functions bridge to ResourceService
Object.defineProperty(window, '_gameState', {
  get: () => container.get('gameState'),
  configurable: true
});
Object.defineProperty(window, '_resourceService', {
  get: () => container.get('resourceService'),
  configurable: true
});

// Resource function bridges (Phase 2)
// These wrap the ResourceService for backwards compatibility with inline code
window.canAfford = (cost) => container.get('resourceService').canAfford(cost);
window.isUnlocked = (req) => container.get('resourceService').isUnlocked(req);
window.spendResources = (cost) => container.get('resourceService').spendResources(cost);
window.grantReward = (reward) => container.get('resourceService').grantReward(reward);
window.formatNumber = (num) => container.get('resourceService').formatNumber(num);

// Phase 3 services - lazy getter
Object.defineProperty(window, '_buildingService', {
  get: () => container.get('buildingService'),
  configurable: true
});

// Building function bridges (Phase 3)
// These wrap the BuildingService for backwards compatibility with inline code
window.getOccupiedTiles = () => container.get('buildingService').getOccupiedTiles();
window.canPlaceAt = (row, col) => container.get('buildingService').canPlaceAt(row, col);
window.getBuildingAt = (row, col) => container.get('buildingService').getBuildingAt(row, col);
window.hasGoldProduction = () => container.get('buildingService').hasGoldProduction();
window.hasMarket = () => container.get('buildingService').hasMarket();
window.getMarketLevel = () => container.get('buildingService').getMarketLevel();

// Phase 4 services - lazy getter
Object.defineProperty(window, '_productionService', {
  get: () => container.get('productionService'),
  configurable: true
});

// Production function bridges (Phase 4)
// These wrap the ProductionService for backwards compatibility with inline code
window.calculateProduction = () => container.get('productionService').calculateProduction();

// Phase 5 services - lazy getters
Object.defineProperty(window, '_stipendService', {
  get: () => container.get('stipendService'),
  configurable: true
});
Object.defineProperty(window, '_milestoneService', {
  get: () => container.get('milestoneService'),
  configurable: true
});

// Stipend function bridges (Phase 5)
window.checkStipendStatus = () => container.get('stipendService').checkStatus();

// Milestone function bridges (Phase 5)
window.checkMilestones = () => container.get('milestoneService').checkMilestones();

// Phase 6 services - lazy getters
Object.defineProperty(window, '_merchantService', {
  get: () => container.get('merchantService'),
  configurable: true
});
Object.defineProperty(window, '_marketService', {
  get: () => container.get('marketService'),
  configurable: true
});

// Merchant function bridges (Phase 6)
window.scheduleMerchantVisit = (isFirst) => container.get('merchantService').scheduleVisit(isFirst);
window.merchantArrives = () => container.get('merchantService').arrive();
window.merchantDeparts = () => container.get('merchantService').depart();
window.disableMerchant = () => container.get('merchantService').disable();
window.sellToMerchant = (resource, amount) => {
  const result = container.get('merchantService').sell(resource, amount);
  if (!result.success && result.error) {
    // Legacy code expects notify() to be called - handled by caller
  }
  return result.success;
};

// Market function bridges (Phase 6)
window.sellAtMarket = (resource, amount) => {
  const result = container.get('marketService').sell(resource, amount);
  if (!result.success && result.error) {
    // Legacy code expects notify() to be called - handled by caller
  }
  return result.success;
};

// Phase 8 UI Controller - lazy getters
Object.defineProperty(window, '_placementController', {
  get: () => container.get('placementController'),
  configurable: true
});
Object.defineProperty(window, '_tabController', {
  get: () => container.get('tabController'),
  configurable: true
});
Object.defineProperty(window, '_merchantPanelController', {
  get: () => container.get('merchantPanelController'),
  configurable: true
});
Object.defineProperty(window, '_debugController', {
  get: () => container.get('debugController'),
  configurable: true
});

// Placement Controller function bridges (Phase 8)
window.selectBuildingForPlacement = (type) => container.get('placementController').selectBuilding(type);
window.cancelPlacement = () => container.get('placementController').cancel();

// Tab Controller function bridges (Phase 8)
window.switchTab = (tabName) => container.get('tabController').switchTab(tabName);
window.switchLeftTab = (tabName) => container.get('tabController').switchLeftTab(tabName);

// Merchant Panel Controller function bridges (Phase 8)
window.openMerchantPanel = () => container.get('merchantPanelController').open();
window.closeMerchantPanel = () => container.get('merchantPanelController').close();

// Debug Controller function bridges (Phase 8)
window.toggleTiles = () => container.get('debugController').toggleTiles();
window.toggleDebugSliders = () => container.get('debugController').toggleSliders();
window.toggleDarkMode = () => container.get('debugController').toggleDarkMode();
window.copyDebugValues = () => container.get('debugController').copyValues();

// Phase 9 UI Integration - lazy getter
Object.defineProperty(window, '_uiIntegration', {
  get: () => container.get('uiIntegration'),
  configurable: true
});

// Phase 9 initialization function bridge
// Call this after DOM is ready and legacy functions (notify, updateUI, renderBuildings) are defined
window.initializeUI = () => {
  const uiIntegration = container.get('uiIntegration');
  uiIntegration.initialize();
  uiIntegration.initializeControllers();
};

// Phase 7 Renderers - lazy getters
Object.defineProperty(window, '_tileRenderer', {
  get: () => container.get('tileRenderer'),
  configurable: true
});
Object.defineProperty(window, '_buildingRenderer', {
  get: () => container.get('buildingRenderer'),
  configurable: true
});
Object.defineProperty(window, '_debugRenderer', {
  get: () => container.get('debugRenderer'),
  configurable: true
});

// Renderer function bridges (Phase 7)
window.renderTileGrid = () => container.get('tileRenderer').render();
window.renderBuildings = () => container.get('buildingRenderer').render();
window.renderDebugGrid = () => container.get('debugRenderer').render();

// ==========================================
// SERVICE CONTAINER SETUP
// ==========================================
// Register core services (more will be added in later phases)

container.registerInstance('eventBus', eventBus);
container.register('gameLoop', (c) => new GameLoop(c.get('eventBus')));

// Phase 1 services
container.registerInstance('coordinateService', coordinateService);

// Phase 2 services
container.register('gameState', (c) => new GameStateService(c.get('eventBus')));
container.register('resourceService', (c) => new ResourceService(c.get('gameState'), c.get('eventBus')));

// Phase 3 services
container.register('buildingService', (c) => new BuildingService(
  c.get('gameState'),
  c.get('resourceService'),
  c.get('eventBus')
));

// Phase 4 services
container.register('productionService', (c) => new ProductionService(
  c.get('gameState'),
  c.get('resourceService'),
  c.get('eventBus')
));

// Phase 5 services
container.register('stipendService', (c) => new StipendService(
  c.get('gameState'),
  c.get('eventBus')
));
container.register('milestoneService', (c) => new MilestoneService(
  c.get('gameState'),
  c.get('resourceService'),
  c.get('eventBus')
));

// Phase 6 services
container.register('merchantService', (c) => new MerchantService(
  c.get('gameState'),
  c.get('resourceService'),
  c.get('eventBus')
));
container.register('marketService', (c) => new MarketService(
  c.get('gameState'),
  c.get('buildingService'),
  c.get('resourceService'),
  c.get('eventBus')
));

// Phase 8 UI Controllers
// Note: These require DOM elements, so they're created but not initialized until DOM ready
container.register('placementController', (c) => new PlacementController(
  c.get('buildingService'),
  c.get('resourceService'),
  c.get('coordinateService'),
  window.notify, // Will be defined in index.html
  window.renderBuildings // Will be defined in index.html
));

container.register('tabController', (c) => new TabController(
  () => c.get('placementController').renderBuildList()
));

container.register('merchantPanelController', (c) => new MerchantPanelController(
  c.get('merchantService'),
  c.get('gameState')
));

container.register('debugController', () => new DebugController(
  window.updateUI, // Will be defined in index.html
  window.notify // Will be defined in index.html
));

// Phase 9 UI Integration
container.register('uiIntegration', (c) => new UIIntegration(
  c.get('eventBus'),
  c.get('placementController'),
  c.get('tabController'),
  c.get('merchantPanelController'),
  c.get('debugController')
));

// Phase 7 Renderers
container.register('tileRenderer', (c) => new TileRenderer(
  c.get('coordinateService'),
  c.get('buildingService')
));

container.register('buildingRenderer', (c) => new BuildingRenderer(
  c.get('coordinateService'),
  c.get('gameState'),
  {
    onBuildingClick: window.upgradeBuilding,
    onBuildingHover: window.showBuildingInfoForPlaced,
    onBuildingLeave: window.hideBuildingInfo
  }
));

container.register('debugRenderer', (c) => new DebugRenderer(
  c.get('coordinateService')
));

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

  // Note: UI controllers need to be initialized after legacy functions are defined
  // Call window.initializeUI() from index.html after defining notify, updateUI, renderBuildings
}

// Note: initializeUI is set on window object above (line ~302)
// It's the entry point for index.html to initialize UI controllers

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModules);
} else {
  initModules();
}

// Export for testing and external use
export {
  // Core (Phase 0)
  eventBus,
  Events,
  container,
  EventBus,
  ServiceContainer,
  GameLoop,
  // Models (Phase 1)
  Building,
  Position,
  createPositionSet,
  hasPosition,
  // Services (Phase 1)
  CoordinateService,
  coordinateService,
  // Services (Phase 2)
  GameStateService,
  ResourceService,
  // Services (Phase 3)
  BuildingService,
  // Services (Phase 4)
  ProductionService,
  // Services (Phase 5)
  StipendService,
  MilestoneService,
  // Services (Phase 6)
  MerchantService,
  MarketService,
  // UI Controllers (Phase 8)
  PlacementController,
  TabController,
  MerchantPanelController,
  DebugController,
  // UI Integration (Phase 9)
  UIIntegration,
  // Renderers (Phase 7)
  TileRenderer,
  BuildingRenderer,
  DebugRenderer
};
