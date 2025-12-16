/**
 * ResearchPanelController
 * Handles the research panel UI for player-triggered research
 */

import { Events } from '../core/EventBus.js';
import { RESEARCH, getResearchDef, getResearchIds } from '../config/research.config.js';

// Resource sprite icon class mapping
const RESOURCE_ICON_CLASS = {
  gold: 'icon-gold',
  wheat: 'icon-wheat',
  stone: 'icon-stone',
  wood: 'icon-wood'
};

export class ResearchPanelController {
  /**
   * @param {import('../services/ResearchService.js').ResearchService} researchService
   * @param {import('../services/ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(researchService, resourceService, eventBus) {
    this._researchService = researchService;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    this._initialized = false;

    // Subscribe to relevant events
    this._setupEventListeners();
  }

  /**
   * Setup event listeners for UI updates
   * @private
   */
  _setupEventListeners() {
    // Refresh on research completed
    this._eventBus.subscribe(Events.RESEARCH_COMPLETED, () => {
      this.render();
      this._showResearchNotification();
    });

    // Refresh on resources changed (affordability may change)
    this._eventBus.subscribe(Events.RESOURCES_CHANGED, () => {
      if (this._initialized) {
        this._updateAffordability();
      }
    });

    // Refresh on game reset/load
    this._eventBus.subscribe(Events.GAME_RESET, () => this.render());
    this._eventBus.subscribe(Events.STATE_LOADED, () => this.render());

    // Update expand button when plot expansion unlocks
    this._eventBus.subscribe(Events.PLOT_EXPANSION_UNLOCKED, () => {
      this._updateExpandButton();
    });

    // Hide expand button after expansion
    this._eventBus.subscribe(Events.PLOT_EXPANDED, () => {
      this._updateExpandButton();
    });
  }

  /**
   * Show notification when research is completed
   * @private
   */
  _showResearchNotification() {
    // Notification is handled by the ResearchService publishing the event
    // The NotificationController will pick it up
  }

  // ==========================================
  // RENDERING
  // ==========================================

  /**
   * Initialize and render the research panel
   */
  init() {
    this._initialized = true;
    this.render();
  }

  /**
   * Format cost with sprite icons
   * @param {Object} cost - Cost object
   * @returns {string} HTML string
   * @private
   */
  _formatCost(cost) {
    if (!cost || Object.keys(cost).length === 0) return '';

    return Object.entries(cost)
      .map(([res, amt]) => `${amt}<span class="icon icon-16 ${RESOURCE_ICON_CLASS[res] || 'icon-gold'}"></span>`)
      .join(' ');
  }

  /**
   * Format prerequisites as text
   * @param {string[]} prereqs - Array of prereq research IDs
   * @returns {string} HTML string
   * @private
   */
  _formatPrereqs(prereqs) {
    if (!prereqs || prereqs.length === 0) return '';

    const names = prereqs.map(id => {
      const def = getResearchDef(id);
      return def?.name || id;
    });

    return names.join(', ');
  }

  /**
   * Format effects for display
   * @param {Object} effects - Research effects object
   * @returns {string} HTML string
   * @private
   */
  _formatEffects(effects) {
    const parts = [];

    if (effects.unlockBuildings?.length > 0) {
      parts.push(`<span class="effect-unlock">Unlocks: ${effects.unlockBuildings.join(', ')}</span>`);
    }

    if (effects.unlockUpgradeTiers?.length > 0) {
      const upgrades = effects.unlockUpgradeTiers.map(t =>
        `${t.buildingId} Tier ${t.maxTier}`
      );
      parts.push(`<span class="effect-upgrade">Upgrades: ${upgrades.join(', ')}</span>`);
    }

    if (effects.unlockPlotExpansion) {
      const { rows, cols } = effects.unlockPlotExpansion;
      parts.push(`<span class="effect-expansion">Expands to ${rows}x${cols}</span>`);
    }

    return parts.join('<br>');
  }

  /**
   * Get CSS class for research status
   * @param {string} status - 'completed', 'available', or 'locked'
   * @returns {string}
   * @private
   */
  _getStatusClass(status) {
    switch (status) {
      case 'completed': return 'research-completed';
      case 'available': return 'research-available';
      case 'locked': return 'research-locked';
      default: return '';
    }
  }

  /**
   * Render the full research panel
   */
  render() {
    const container = document.getElementById('research-list');
    if (!container) return;

    const researchIds = getResearchIds();
    const stats = this._researchService.getStats();

    // Update progress header
    const progressEl = document.getElementById('research-progress');
    if (progressEl) {
      progressEl.textContent = `${stats.completed}/${stats.total}`;
    }

    // Group research by tier for better organization
    const tiers = this._groupByTier(researchIds);

    container.innerHTML = tiers.map((tierResearch, tierIndex) => {
      if (tierResearch.length === 0) return '';

      return `
        <div class="research-tier">
          <div class="research-tier-header">Tier ${tierIndex}</div>
          ${tierResearch.map(id => this._renderResearchItem(id)).join('')}
        </div>
      `;
    }).join('');

    // Setup click handlers
    this._setupClickHandlers();

    // Update expand button visibility
    this._updateExpandButton();
  }

  /**
   * Update expand button visibility based on available expansions
   * @private
   */
  _updateExpandButton() {
    const expandSection = document.getElementById('expand-plot-section');
    if (!expandSection) return;

    // Use global function to check if expansion is available
    const canExpand = typeof window.canExpandPlot === 'function' && window.canExpandPlot();
    expandSection.style.display = canExpand ? 'block' : 'none';
  }

  /**
   * Group research by tier based on prerequisite depth
   * @param {string[]} researchIds
   * @returns {string[][]}
   * @private
   */
  _groupByTier(researchIds) {
    const tiers = [[], [], [], [], []]; // 5 tiers max
    const depths = {};

    // Calculate depth for each research
    const getDepth = (id, visited = new Set()) => {
      if (visited.has(id)) return 0;
      if (depths[id] !== undefined) return depths[id];

      visited.add(id);
      const research = getResearchDef(id);
      if (!research || research.prereqs.length === 0) {
        depths[id] = 0;
        return 0;
      }

      const maxPrereqDepth = Math.max(...research.prereqs.map(p => getDepth(p, visited)));
      depths[id] = maxPrereqDepth + 1;
      return depths[id];
    };

    researchIds.forEach(id => {
      const depth = getDepth(id);
      const tierIndex = Math.min(depth, tiers.length - 1);
      tiers[tierIndex].push(id);
    });

    return tiers;
  }

  /**
   * Render a single research item
   * @param {string} id - Research ID
   * @returns {string} HTML string
   * @private
   */
  _renderResearchItem(id) {
    const research = getResearchDef(id);
    if (!research) return '';

    const status = this._researchService.getResearchStatus(id);
    const statusClass = this._getStatusClass(status);
    const canResearch = this._researchService.canResearch(id);
    const affordable = this._resourceService.canAfford(research.cost);

    let statusIcon = '';
    let statusText = '';

    switch (status) {
      case 'completed':
        statusIcon = '&#10003;';
        statusText = 'Researched';
        break;
      case 'available':
        statusIcon = affordable ? '&#9733;' : '&#9734;';
        statusText = affordable ? 'Available' : 'Need Resources';
        break;
      case 'locked':
        statusIcon = '&#128274;';
        statusText = 'Locked';
        break;
    }

    const costHtml = this._formatCost(research.cost);
    const prereqsHtml = research.prereqs.length > 0
      ? `<div class="research-prereqs">Requires: ${this._formatPrereqs(research.prereqs)}</div>`
      : '';
    const effectsHtml = this._formatEffects(research.effects);

    return `
      <div class="research-item ${statusClass}" data-research-id="${id}">
        <div class="research-header">
          <span class="research-icon">${statusIcon}</span>
          <div class="research-title">
            <div class="research-name">${research.name}</div>
            <div class="research-desc">${research.desc}</div>
          </div>
        </div>
        <div class="research-cost ${affordable ? 'affordable' : 'unaffordable'}">${costHtml}</div>
        ${prereqsHtml}
        <div class="research-effects">${effectsHtml}</div>
        <div class="research-status">${statusText}</div>
      </div>
    `;
  }

  /**
   * Setup click handlers for research items
   * @private
   */
  _setupClickHandlers() {
    const container = document.getElementById('research-list');
    if (!container) return;

    container.querySelectorAll('.research-item.research-available').forEach(item => {
      item.onclick = () => {
        const id = item.dataset.researchId;
        this._attemptResearch(id);
      };
    });
  }

  /**
   * Attempt to complete a research
   * @param {string} id - Research ID
   * @private
   */
  _attemptResearch(id) {
    const result = this._researchService.completeResearch(id);

    if (result.success) {
      const research = getResearchDef(id);
      this._eventBus.publish(Events.NOTIFICATION, {
        message: `Research completed: ${research?.name || id}!`,
        type: 'success'
      });
      // render() is called by the event listener on RESEARCH_COMPLETED
    } else if (result.error) {
      this._eventBus.publish(Events.NOTIFICATION, {
        message: result.error,
        type: 'error'
      });
    }
  }

  /**
   * Update affordability display without full re-render
   * @private
   */
  _updateAffordability() {
    const container = document.getElementById('research-list');
    if (!container) return;

    container.querySelectorAll('.research-item').forEach(item => {
      const id = item.dataset.researchId;
      const research = getResearchDef(id);
      if (!research) return;

      const status = this._researchService.getResearchStatus(id);
      if (status !== 'available') return;

      const affordable = this._resourceService.canAfford(research.cost);
      const costEl = item.querySelector('.research-cost');
      if (costEl) {
        costEl.classList.toggle('affordable', affordable);
        costEl.classList.toggle('unaffordable', !affordable);
      }

      // Update status icon
      const iconEl = item.querySelector('.research-icon');
      if (iconEl) {
        iconEl.innerHTML = affordable ? '&#9733;' : '&#9734;';
      }

      // Update status text
      const statusEl = item.querySelector('.research-status');
      if (statusEl) {
        statusEl.textContent = affordable ? 'Available' : 'Need Resources';
      }
    });
  }
}
