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

// Services (Phase F - Crafting)
import { ProcessorService } from './services/ProcessorService.js';

// Services (Phase 5)
import { StipendService } from './services/StipendService.js';
import { MilestoneService } from './services/MilestoneService.js';

// Services (Phase 6)
import { MerchantService } from './services/MerchantService.js';
import { MarketService } from './services/MarketService.js';

// Services (Phase C - Storage)
import { StorageService } from './services/StorageService.js';

// Services (Phase B - Persistence)
import { SaveLoadService } from './services/SaveLoadService.js';

// Services (Phase E - Research)
import { ResearchService } from './services/ResearchService.js';

// Services (Phase E2 - Plot Expansion)
import { PlotService } from './services/PlotService.js';

// Services (Camera)
import { CameraService } from './services/CameraService.js';

// UI Controllers (Phase 8)
import { PlacementController } from './ui/PlacementController.js';
import { BuildingHoverController } from './ui/BuildingHoverController.js';
import { TabController } from './ui/TabController.js';
import { MerchantPanelController } from './ui/MerchantPanelController.js';
import { DebugController } from './ui/DebugController.js';

// UI Controllers (Phase B - Dev Panel)
import { DevPanelController } from './ui/DevPanelController.js';

// UI Controllers (Phase 10 - New controllers for full modular architecture)
import { NotificationController } from './ui/NotificationController.js';
import { ResourceDisplayController } from './ui/ResourceDisplayController.js';
import { StatsDisplayController } from './ui/StatsDisplayController.js';
import { StipendIndicatorController } from './ui/StipendIndicatorController.js';
import { MilestonePanelController } from './ui/MilestonePanelController.js';
import { MarketPanelController } from './ui/MarketPanelController.js';
import { BuildingInfoController } from './ui/BuildingInfoController.js';
import { ResearchPanelController } from './ui/ResearchPanelController.js';

// UI Integration (Phase 9)
import { UIIntegration } from './ui/UIIntegration.js';

// Game Controller (Phase 10)
import { GameController } from './core/GameController.js';

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
// GLOBAL BRIDGES (Required for HTML onclick handlers)
// ==========================================
// Minimal window.* bridges needed for HTML onclick attribute handlers.
// All other functionality is encapsulated in modules and EventBus subscriptions.

// Placement Controller - for build list onclick and cancel button
window.selectBuildingForPlacement = (type) => container.get('placementController').selectBuilding(type);
window.cancelPlacement = () => container.get('placementController').cancel();

// Demolish Mode - for demolish button onclick handlers
window.toggleDemolishMode = () => container.get('placementController').toggleDemolishMode();
window.cancelDemolish = () => container.get('placementController').cancelDemolish();

// Tab Controller - for tab button onclick handlers
window.switchTab = (tabName) => container.get('tabController').switchTab(tabName);
window.switchLeftTab = (tabName) => container.get('tabController').switchLeftTab(tabName);

// Merchant Panel Controller - for merchant banner and panel onclick handlers
window.openMerchantPanel = () => container.get('merchantPanelController').open();
window.closeMerchantPanel = () => container.get('merchantPanelController').close();
window.sellToMerchant = (resource, amount) => {
  const merchantService = container.get('merchantService');
  const result = merchantService.sell(resource, amount);
  if (result.success) {
    container.get('merchantPanelController').onSale();
  }
};

// Debug Controller - for debug button onclick handlers
window.toggleTiles = () => container.get('debugController').toggleTiles();
window.toggleDebugSliders = () => container.get('debugController').toggleSliders();
window.toggleDarkMode = () => container.get('debugController').toggleDarkMode();
window.copyDebugValues = () => container.get('debugController').copyValues();

// Dev Panel Controller - for dev panel onclick handlers
window.devSaveNow = () => container.get('devPanelController').saveNow();
window.devLoadSave = () => container.get('devPanelController').loadSave();
window.devClearSave = () => container.get('devPanelController').clearSave();
window.devExportSave = () => container.get('devPanelController').exportSave();
window.devImportSave = () => container.get('devPanelController').importSave();
window.devToggleAutosave = () => container.get('devPanelController').toggleAutosave();
window.devSetSpeed = (idx) => container.get('devPanelController').setSpeed(idx);
window.devSpawnResource = (type) => container.get('devPanelController').spawnResource(type);
window.devSpawnAll = () => container.get('devPanelController').spawnAll();

// Plot Service - for plot expansion
window.expandPlot = () => container.get('plotService').expand();
window.canExpandPlot = () => container.get('plotService').canExpand();

// Camera Service - for camera controls
window.resetCamera = () => container.get('cameraService').reset();
window.panCamera = (dx, dy) => container.get('cameraService').pan(dx, dy);
window.toggleCameraDebug = () => container.get('cameraService').toggleDebug();

// Game Controller - initialization and reset
window.initializeUI = () => {
  const gameController = container.get('gameController');
  gameController.initialize();
};

window.resetGame = () => {
  const gameController = container.get('gameController');
  gameController.resetGame();
};

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

// Phase F services (Crafting - Processor buildings)
container.register('processorService', (c) => new ProcessorService(
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

// Phase C services (Storage)
container.register('storageService', (c) => {
  const storageService = new StorageService(c.get('gameState'));
  // Wire up cross-references for clamping
  c.get('gameState').setStorageService(storageService);
  c.get('resourceService').setStorageService(storageService);
  return storageService;
});

// Phase B services (Persistence)
container.register('saveLoadService', (c) => new SaveLoadService(
  c.get('gameState'),
  c.get('eventBus')
));

// Phase E services (Research)
container.register('researchService', (c) => new ResearchService(
  c.get('gameState'),
  c.get('resourceService'),
  c.get('eventBus')
));

// Phase E2 services (Plot Expansion)
container.register('plotService', (c) => {
  const plotService = new PlotService(
    c.get('gameState'),
    c.get('researchService'),
    c.get('eventBus')
  );
  // Set callback for re-rendering after expansion
  plotService.setExpandCallback(() => {
    c.get('tileRenderer').render();
    c.get('buildingRenderer').render();
    c.get('debugRenderer').render();
  });
  return plotService;
});

// Camera service (edge-panning and pan/zoom)
container.register('cameraService', (c) => new CameraService(
  c.get('gameState'),
  c.get('eventBus')
));

// Phase 8 UI Controllers
// Note: These require DOM elements, so they're created but not initialized until DOM ready
container.register('placementController', (c) => new PlacementController(
  c.get('buildingService'),
  c.get('resourceService'),
  c.get('coordinateService'),
  c.get('eventBus'),
  () => c.get('buildingRenderer').render(), // Direct call to BuildingRenderer
  c.get('researchService'), // Research service for building unlock checks
  c.get('cameraService') // Camera service for pan offset correction
));

container.register('tabController', (c) => new TabController(
  () => c.get('placementController').renderBuildList()
));

container.register('merchantPanelController', (c) => new MerchantPanelController(
  c.get('merchantService'),
  c.get('gameState')
));

container.register('debugController', (c) => new DebugController(
  c.get('eventBus')
));

// Phase B Dev Panel Controller
container.register('devPanelController', (c) => new DevPanelController(
  c.get('saveLoadService'),
  c.get('gameState'),
  c.get('resourceService'),
  c.get('gameLoop'),
  c.get('eventBus')
));

// Phase 9 UI Integration
container.register('uiIntegration', (c) => new UIIntegration(
  c.get('eventBus'),
  c.get('placementController'),
  c.get('tabController'),
  c.get('merchantPanelController'),
  c.get('debugController')
));

// Phase 10 UI Controllers (New)
container.register('notificationController', (c) => new NotificationController(
  c.get('eventBus')
));

container.register('resourceDisplayController', (c) => new ResourceDisplayController(
  c.get('gameState'),
  c.get('productionService'),
  c.get('resourceService'),
  c.get('eventBus')
));

container.register('statsDisplayController', (c) => new StatsDisplayController(
  c.get('gameState'),
  c.get('buildingService'),
  c.get('resourceService'),
  c.get('eventBus')
));

container.register('stipendIndicatorController', (c) => new StipendIndicatorController(
  c.get('stipendService'),
  c.get('eventBus')
));

container.register('milestonePanelController', (c) => new MilestonePanelController(
  c.get('milestoneService'),
  c.get('eventBus')
));

container.register('marketPanelController', (c) => new MarketPanelController(
  c.get('marketService'),
  c.get('resourceService'),
  c.get('eventBus')
));

container.register('buildingInfoController', (c) => new BuildingInfoController(
  c.get('gameState'),
  c.get('productionService'),
  c.get('eventBus'),
  c.get('processorService')
));

container.register('researchPanelController', (c) => new ResearchPanelController(
  c.get('researchService'),
  c.get('resourceService'),
  c.get('eventBus')
));

// Phase 10 Game Controller
container.register('gameController', (c) => new GameController(
  c,  // Pass container for access to all services
  c.get('eventBus')
));

// Phase 7 Renderers
container.register('tileRenderer', (c) => new TileRenderer(
  c.get('coordinateService'),
  c.get('buildingService')
));

container.register('buildingRenderer', (c) => {
  // BuildingRenderer now only handles rendering, not hover/click events
  // BuildingHoverController handles tile-based hover detection
  return new BuildingRenderer(
    c.get('coordinateService'),
    c.get('gameState'),
    {} // No DOM-based event handlers - using tile-based detection instead
  );
});

container.register('buildingHoverController', (c) => {
  // Handle building clicks (upgrade or demolish)
  const handleBuildingClick = (index) => {
    const placementController = c.get('placementController');

    // Skip if placement mode is active
    if (placementController.isActive()) {
      return;
    }

    // Check if demolish mode is active
    if (placementController.isDemolishMode()) {
      const building = c.get('buildingService').getBuildingByIndex(index);
      if (building) {
        placementController.demolishBuilding(building);
      }
      return;
    }

    // Normal mode: Delegate to buildingService for upgrade
    const result = c.get('buildingService').upgradeBuilding(index);
    if (result.success) {
      const building = c.get('buildingService').getBuildingByIndex(index);
      const def = c.get('buildingService').getBuildingDef?.(building.type) ||
        { name: building.type };
      c.get('eventBus').publish(Events.NOTIFICATION, {
        message: `${def.name || building.type} upgraded to level ${building.level + 1}!`,
        type: 'success'
      });
    } else if (result.error) {
      c.get('eventBus').publish(Events.NOTIFICATION, {
        message: result.error,
        type: result.error.includes('max level') ? 'info' : 'error'
      });
    }
  };

  return new BuildingHoverController(
    c.get('buildingService'),
    c.get('coordinateService'),
    c.get('cameraService'),
    c.get('buildingInfoController'),
    handleBuildingClick
  );
});

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
}

// Note: initializeUI() is the entry point called from index.html bootstrap script
// It creates the GameController which initializes all UI controllers and game loops

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
  // Services (Phase F - Crafting)
  ProcessorService,
  // Services (Phase 5)
  StipendService,
  MilestoneService,
  // Services (Phase 6)
  MerchantService,
  MarketService,
  // Services (Phase C - Storage)
  StorageService,
  // Services (Phase B - Persistence)
  SaveLoadService,
  // Services (Phase E - Research)
  ResearchService,
  // Services (Phase E2 - Plot)
  PlotService,
  // Services (Camera)
  CameraService,
  // UI Controllers (Phase 8)
  PlacementController,
  TabController,
  MerchantPanelController,
  DebugController,
  // UI Controllers (Phase B - Dev Panel)
  DevPanelController,
  // UI Controllers (Phase 10)
  NotificationController,
  ResourceDisplayController,
  StatsDisplayController,
  StipendIndicatorController,
  MilestonePanelController,
  MarketPanelController,
  BuildingInfoController,
  ResearchPanelController,
  // UI Integration (Phase 9)
  UIIntegration,
  // Game Controller (Phase 10)
  GameController,
  // Renderers (Phase 7)
  TileRenderer,
  BuildingRenderer,
  DebugRenderer
};
