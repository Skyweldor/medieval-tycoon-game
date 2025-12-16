/**
 * TabController
 * Handles tab switching UI for left and right panels
 */

export class TabController {
  /**
   * @param {Function} onBuildTabActivated - Callback when build tab is activated
   */
  constructor(onBuildTabActivated) {
    this._onBuildTabActivated = onBuildTabActivated || (() => {});

    // Track active tabs
    this._activeRightTab = 'info';
    this._activeLeftTab = 'inspect';
  }

  // ==========================================
  // STATE
  // ==========================================

  /**
   * Get the active right panel tab
   * @returns {string}
   */
  getActiveRightTab() {
    return this._activeRightTab;
  }

  /**
   * Get the active left panel tab
   * @returns {string}
   */
  getActiveLeftTab() {
    return this._activeLeftTab;
  }

  // ==========================================
  // RIGHT PANEL TABS
  // ==========================================

  /**
   * Switch active tab in right panel
   * @param {string} tabName - Tab name (info, stats, milestones)
   */
  switchTab(tabName) {
    this._activeRightTab = tabName;

    // Update tab buttons (right panel only)
    document.querySelectorAll('.right-panel .tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent.toLowerCase().includes(tabName)) {
        btn.classList.add('active');
      }
    });

    // Update tab content (right panel only)
    document.querySelectorAll('.right-panel .tab-content').forEach(content => {
      content.classList.remove('active');
    });

    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) {
      tabContent.classList.add('active');
    }
  }

  // ==========================================
  // LEFT PANEL TABS
  // ==========================================

  /**
   * Switch active tab in left panel
   * @param {string} tabName - Tab name (inspect, build, research)
   */
  switchLeftTab(tabName) {
    this._activeLeftTab = tabName;

    // Update tab buttons (left panel only)
    document.querySelectorAll('.left-tabbed-panel .tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Find and activate the correct button by index
    const buttons = document.querySelectorAll('.left-tabbed-panel .tab-btn');
    const tabIndices = { inspect: 0, build: 1, research: 2 };
    const idx = tabIndices[tabName];
    if (idx !== undefined && buttons[idx]) {
      buttons[idx].classList.add('active');
    }

    // Update tab content (left panel only)
    document.querySelectorAll('.left-tabbed-panel .tab-content').forEach(content => {
      content.classList.remove('active');
    });

    const tabContent = document.getElementById(`left-tab-${tabName}`);
    if (tabContent) {
      tabContent.classList.add('active');
    }

    // If switching to build tab, trigger callback
    if (tabName === 'build') {
      this._onBuildTabActivated();
    }
  }

  // ==========================================
  // PROGRAMMATIC TAB SWITCHING
  // ==========================================

  /**
   * Open the info tab (right panel)
   */
  openInfoTab() {
    this.switchTab('info');
  }

  /**
   * Open the stats tab (right panel)
   */
  openStatsTab() {
    this.switchTab('stats');
  }

  /**
   * Open the milestones tab (right panel)
   */
  openMilestonesTab() {
    this.switchTab('milestones');
  }

  /**
   * Open the inspect tab (left panel)
   */
  openInspectTab() {
    this.switchLeftTab('inspect');
  }

  /**
   * Open the build tab (left panel)
   */
  openBuildTab() {
    this.switchLeftTab('build');
  }

  /**
   * Open the research tab (left panel)
   */
  openResearchTab() {
    this.switchLeftTab('research');
  }
}
