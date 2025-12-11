/**
 * UIIntegration
 * Wires up EventBus subscriptions to UI controllers
 * Acts as the bridge between service events and UI updates
 */

import { Events } from '../core/EventBus.js';

export class UIIntegration {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('./PlacementController.js').PlacementController} placementController
   * @param {import('./TabController.js').TabController} tabController
   * @param {import('./MerchantPanelController.js').MerchantPanelController} merchantPanelController
   * @param {import('./DebugController.js').DebugController} debugController
   */
  constructor(eventBus, placementController, tabController, merchantPanelController, debugController) {
    this._eventBus = eventBus;
    this._placementController = placementController;
    this._tabController = tabController;
    this._merchantPanelController = merchantPanelController;
    this._debugController = debugController;

    // Store unsubscribe functions for cleanup
    this._unsubscribers = [];
  }

  /**
   * Initialize all event subscriptions
   */
  initialize() {
    this._setupMerchantSubscriptions();
    this._setupBuildingSubscriptions();
    this._setupMilestoneSubscriptions();
    this._setupStipendSubscriptions();
    this._setupTickSubscriptions();

    console.log('[UIIntegration] Event subscriptions initialized');
  }

  /**
   * Clean up all event subscriptions
   */
  destroy() {
    this._unsubscribers.forEach(unsubscribe => unsubscribe());
    this._unsubscribers = [];
  }

  // ==========================================
  // MERCHANT EVENT SUBSCRIPTIONS
  // ==========================================

  /**
   * Set up merchant-related event subscriptions
   * @private
   */
  _setupMerchantSubscriptions() {
    // Merchant arrives - show banner and start countdown
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.MERCHANT_ARRIVED, () => {
        this._merchantPanelController.onMerchantArrived();
      })
    );

    // Merchant departs - hide banner and close panel
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.MERCHANT_DEPARTED, () => {
        this._merchantPanelController.onMerchantDeparted();
      })
    );

    // Merchant sale - re-render trade rows
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.MERCHANT_SALE, () => {
        this._merchantPanelController.onSale();
        // Also request UI update for resource display
        this._requestUIUpdate();
      })
    );

    // Merchant disabled (market built) - cleanup
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.MERCHANT_DISABLED, () => {
        this._merchantPanelController.onMerchantDisabled();
      })
    );
  }

  // ==========================================
  // BUILDING EVENT SUBSCRIPTIONS
  // ==========================================

  /**
   * Set up building-related event subscriptions
   * @private
   */
  _setupBuildingSubscriptions() {
    // Building placed - update UI
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.BUILDING_PLACED, () => {
        this._requestUIUpdate();
        // Re-render build list to update affordability
        this._placementController.renderBuildList();
      })
    );

    // Building upgraded - update UI
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.BUILDING_UPGRADED, () => {
        this._requestUIUpdate();
      })
    );
  }

  // ==========================================
  // MILESTONE EVENT SUBSCRIPTIONS
  // ==========================================

  /**
   * Set up milestone-related event subscriptions
   * @private
   */
  _setupMilestoneSubscriptions() {
    // Milestone completed - could trigger notification or panel update
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.MILESTONE_COMPLETED, (data) => {
        // Legacy code handles the popup via updateMilestonePanel
        // This subscription allows for additional handling if needed
        this._requestUIUpdate();
      })
    );
  }

  // ==========================================
  // STIPEND EVENT SUBSCRIPTIONS
  // ==========================================

  /**
   * Set up stipend-related event subscriptions
   * @private
   */
  _setupStipendSubscriptions() {
    // Stipend ended - update indicator
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.STIPEND_ENDED, () => {
        this._requestUIUpdate();
      })
    );
  }

  // ==========================================
  // TICK EVENT SUBSCRIPTIONS
  // ==========================================

  /**
   * Set up tick-related event subscriptions
   * @private
   */
  _setupTickSubscriptions() {
    // On each tick, refresh the build list to update affordability/unlock states
    this._unsubscribers.push(
      this._eventBus.subscribe(Events.TICK, () => {
        // Refresh build list so unlock conditions and affordability update
        this._placementController.renderBuildList();
      })
    );
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Request a UI update via EventBus
   * This allows the legacy updateUI() function to be triggered
   * @private
   */
  _requestUIUpdate() {
    this._eventBus.publish(Events.UI_UPDATE_REQUESTED);
  }

  /**
   * Initialize UI controllers (call their setup methods)
   * Should be called after DOM is ready
   */
  initializeControllers() {
    // Setup placement listeners
    this._placementController.setupListeners();

    // Setup debug sliders
    this._debugController.setupSliders();

    // Render initial build list
    this._placementController.renderBuildList();

    console.log('[UIIntegration] UI controllers initialized');
  }
}
