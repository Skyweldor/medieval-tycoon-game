/**
 * GameController
 * Main game orchestrator - initializes services, UI controllers, and game loops
 */

import { Events } from './EventBus.js';

export class GameController {
  /**
   * @param {import('./ServiceContainer.js').ServiceContainer} container
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(container, eventBus) {
    this._container = container;
    this._eventBus = eventBus;
    this._initialized = false;

    // UI Controllers (will be set during initialization)
    this._uiControllers = {};
  }

  /**
   * Initialize the game
   * - Loads saved state if available
   * - Sets up all UI controllers
   * - Renders initial state
   * - Starts game loops
   */
  initialize() {
    if (this._initialized) {
      console.warn('[GameController] Already initialized');
      return;
    }

    console.log('[GameController] Initializing...');

    // Initialize storage service (must happen before load to enable clamping)
    this._container.get('storageService');

    // Load saved state if available (do this BEFORE rendering)
    this._loadSavedState();

    // Initialize UI controllers
    this._initializeUIControllers();

    // Render initial game state
    this._renderInitialState();

    // Set up event subscriptions for UI updates
    this._setupEventSubscriptions();

    // Start game loops (uses GameLoop for speed control support)
    this._startGameLoops();

    // Schedule first merchant visit (only if not loaded from save)
    this._scheduleMerchantVisit();

    // Start autosave
    this._startAutosave();

    this._initialized = true;
    console.log('[GameController] Initialization complete');
  }

  /**
   * Load saved state if available
   * @private
   */
  _loadSavedState() {
    const saveLoadService = this._container.get('saveLoadService');
    if (saveLoadService.hasSave()) {
      const result = saveLoadService.load();
      if (result.success) {
        console.log('[GameController] Loaded saved game');
      }
    }
  }

  /**
   * Start autosave
   * @private
   */
  _startAutosave() {
    const saveLoadService = this._container.get('saveLoadService');
    saveLoadService.startAutosave();
  }

  /**
   * Initialize all UI controllers
   * @private
   */
  _initializeUIControllers() {
    // Get controllers from container
    const notificationController = this._container.get('notificationController');
    const resourceDisplayController = this._container.get('resourceDisplayController');
    const statsDisplayController = this._container.get('statsDisplayController');
    const stipendIndicatorController = this._container.get('stipendIndicatorController');
    const milestonePanelController = this._container.get('milestonePanelController');
    const marketPanelController = this._container.get('marketPanelController');
    const buildingInfoController = this._container.get('buildingInfoController');
    const placementController = this._container.get('placementController');
    const tabController = this._container.get('tabController');
    const merchantPanelController = this._container.get('merchantPanelController');
    const debugController = this._container.get('debugController');

    // Initialize each controller
    notificationController.initialize();
    resourceDisplayController.initialize();
    statsDisplayController.initialize();
    stipendIndicatorController.initialize();
    milestonePanelController.initialize();
    marketPanelController.initialize();
    buildingInfoController.initialize();

    // Existing controllers from Phase 8
    placementController.setupListeners();
    placementController.renderBuildList();
    debugController.setupSliders();

    // Dev panel controller (only initializes if ?dev=1)
    const devPanelController = this._container.get('devPanelController');
    devPanelController.initialize();

    // Store references
    this._uiControllers = {
      notification: notificationController,
      resourceDisplay: resourceDisplayController,
      statsDisplay: statsDisplayController,
      stipendIndicator: stipendIndicatorController,
      milestonePanel: milestonePanelController,
      marketPanel: marketPanelController,
      buildingInfo: buildingInfoController,
      placement: placementController,
      tab: tabController,
      merchantPanel: merchantPanelController,
      debug: debugController,
      devPanel: devPanelController
    };
  }

  /**
   * Render initial game state
   * @private
   */
  _renderInitialState() {
    const debugRenderer = this._container.get('debugRenderer');
    const tileRenderer = this._container.get('tileRenderer');
    const buildingRenderer = this._container.get('buildingRenderer');

    // Render in order
    debugRenderer.render();
    tileRenderer.render();
    buildingRenderer.render();
  }

  /**
   * Set up event subscriptions for game events
   * @private
   */
  _setupEventSubscriptions() {
    // Update build list when buildings change
    this._eventBus.subscribe(Events.BUILDING_PLACED, (data) => {
      this._uiControllers.placement.renderBuildList();

      // Invalidate storage cache (barns affect caps)
      const storageService = this._container.get('storageService');
      storageService.invalidateCache();

      // Render just the new building (avoids flash from clearing all buildings)
      const buildingRenderer = this._container.get('buildingRenderer');
      const buildings = this._container.get('gameState').getBuildings();
      const index = buildings.length - 1;
      buildingRenderer.renderSingle(data.building, index);
    });

    // Handle building upgrade - re-render building and invalidate storage cache
    this._eventBus.subscribe(Events.BUILDING_UPGRADED, (data) => {
      // Re-render the upgraded building to update sprite and level badge
      const buildingRenderer = this._container.get('buildingRenderer');
      buildingRenderer.updateBuilding(data.index);

      // Invalidate storage cache (barn upgrades affect caps)
      const storageService = this._container.get('storageService');
      storageService.invalidateCache();
    });

    // Handle building removal (demolish) - re-render tiles, buildings and update storage
    this._eventBus.subscribe(Events.BUILDING_REMOVED, () => {
      // Re-render tiles (tiles under demolished building need to reappear)
      const tileRenderer = this._container.get('tileRenderer');
      tileRenderer.render();

      // Re-render all buildings (indices may have changed after removal)
      const buildingRenderer = this._container.get('buildingRenderer');
      buildingRenderer.render();

      // Invalidate storage cache (barns affect caps)
      const storageService = this._container.get('storageService');
      storageService.invalidateCache();
    });

    // Update build list on every tick so affordability/unlock states refresh
    this._eventBus.subscribe(Events.TICK, () => {
      this._uiControllers.placement.renderBuildList();
    });

    // Handle stipend ended notification
    this._eventBus.subscribe(Events.STIPEND_ENDED, () => {
      this._eventBus.publish(Events.NOTIFICATION, {
        message: "The King's stipend has ended. You're self-sufficient now! 👑",
        type: 'success'
      });
    });

    // Handle merchant events
    this._eventBus.subscribe(Events.MERCHANT_ARRIVED, () => {
      this._uiControllers.merchantPanel.onMerchantArrived();
      this._eventBus.publish(Events.NOTIFICATION, {
        message: '🧳 A traveling merchant has arrived!',
        type: 'merchant'
      });
    });

    this._eventBus.subscribe(Events.MERCHANT_DEPARTED, () => {
      this._uiControllers.merchantPanel.onMerchantDeparted();
      this._eventBus.publish(Events.NOTIFICATION, {
        message: "👋 The merchant has left. They'll return soon...",
        type: 'info'
      });
    });

    this._eventBus.subscribe(Events.MERCHANT_DISABLED, () => {
      this._uiControllers.merchantPanel.onMerchantDisabled();
      this._eventBus.publish(Events.NOTIFICATION, {
        message: 'Market built! You now have permanent access to trading.',
        type: 'success'
      });
    });

    // Handle game reset
    this._eventBus.subscribe(Events.GAME_RESET, () => {
      this._onGameReset();
    });

    // Handle state loaded (from save)
    this._eventBus.subscribe(Events.STATE_LOADED, () => {
      this._onStateLoaded();
    });
  }

  /**
   * Handle state loaded from save
   * @private
   */
  _onStateLoaded() {
    // Re-render everything
    this._renderInitialState();
    console.log('[GameController] State loaded, re-rendered UI');
  }

  /**
   * Start game loops (uses GameLoop for speed control support)
   * @private
   */
  _startGameLoops() {
    const gameLoop = this._container.get('gameLoop');
    gameLoop.start();
  }

  /**
   * Stop game loops
   * @private
   */
  _stopGameLoops() {
    const gameLoop = this._container.get('gameLoop');
    gameLoop.stop();
  }

  /**
   * Schedule first merchant visit
   * @private
   */
  _scheduleMerchantVisit() {
    const merchantService = this._container.get('merchantService');
    merchantService.scheduleVisit(true);
  }

  /**
   * Handle game reset
   * @private
   */
  _onGameReset() {
    // Re-render everything
    this._renderInitialState();

    // Reschedule merchant
    this._scheduleMerchantVisit();

    this._eventBus.publish(Events.NOTIFICATION, {
      message: 'Game reset!',
      type: 'success'
    });
  }

  /**
   * Reset the game
   */
  resetGame() {
    const gameState = this._container.get('gameState');
    gameState.reset(); // This publishes GAME_RESET event
  }

  /**
   * Check if game is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Get a UI controller by name
   * @param {string} name - Controller name
   * @returns {Object|undefined}
   */
  getController(name) {
    return this._uiControllers[name];
  }

  /**
   * Destroy the game controller
   * Cleans up intervals and subscriptions
   */
  destroy() {
    this._stopGameLoops();

    // Destroy UI controllers
    Object.values(this._uiControllers).forEach(controller => {
      if (controller && typeof controller.destroy === 'function') {
        controller.destroy();
      }
    });

    this._initialized = false;
  }
}
