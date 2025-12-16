/**
 * ResearchService
 * Manages research state, unlock checks, and research completion
 */

import { Events } from '../core/EventBus.js';
import {
  RESEARCH,
  getResearchDef,
  getResearchIds,
  getResearchForBuilding,
  getMaxTierForBuilding,
  getPlotExpansion,
  DEFAULT_UNLOCKED_BUILDINGS,
  DEFAULT_MAX_TIER
} from '../config/research.config.js';

export class ResearchService {
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
  // RESEARCH STATE QUERIES
  // ==========================================

  /**
   * Get all completed research IDs
   * @returns {string[]}
   */
  getCompletedResearch() {
    return this._gameState.getCompletedResearch();
  }

  /**
   * Get completed research as a Set (for efficient lookups)
   * @returns {Set<string>}
   */
  getCompletedResearchSet() {
    return new Set(this._gameState.getCompletedResearch());
  }

  /**
   * Check if a specific research is completed
   * @param {string} id - Research ID
   * @returns {boolean}
   */
  isCompleted(id) {
    return this._gameState.isResearchCompleted(id);
  }

  /**
   * Get count of completed research
   * @returns {number}
   */
  getCompletedCount() {
    return this._gameState.getCompletedResearch().length;
  }

  /**
   * Get total research count
   * @returns {number}
   */
  getTotalCount() {
    return getResearchIds().length;
  }

  // ==========================================
  // RESEARCH AVAILABILITY
  // ==========================================

  /**
   * Check if all prerequisites for a research are met
   * @param {string} id - Research ID
   * @returns {boolean}
   */
  arePrereqsMet(id) {
    const research = getResearchDef(id);
    if (!research) return false;

    return research.prereqs.every(prereqId => this.isCompleted(prereqId));
  }

  /**
   * Check if a research can be started (prereqs met + affordable)
   * @param {string} id - Research ID
   * @returns {{canResearch: boolean, reason: string|null}}
   */
  canResearch(id) {
    const research = getResearchDef(id);
    if (!research) {
      return { canResearch: false, reason: 'Unknown research' };
    }

    if (this.isCompleted(id)) {
      return { canResearch: false, reason: 'Already researched' };
    }

    if (!this.arePrereqsMet(id)) {
      const missing = research.prereqs.filter(p => !this.isCompleted(p));
      const missingNames = missing.map(p => getResearchDef(p)?.name || p).join(', ');
      return { canResearch: false, reason: `Requires: ${missingNames}` };
    }

    if (!this._resourceService.canAfford(research.cost)) {
      return { canResearch: false, reason: 'Not enough resources' };
    }

    return { canResearch: true, reason: null };
  }

  /**
   * Get all research that is currently available to start
   * (prereqs met, not already completed)
   * @returns {string[]}
   */
  getAvailableResearch() {
    return getResearchIds().filter(id =>
      !this.isCompleted(id) && this.arePrereqsMet(id)
    );
  }

  /**
   * Get research status for UI display
   * @param {string} id - Research ID
   * @returns {'completed'|'available'|'locked'}
   */
  getResearchStatus(id) {
    if (this.isCompleted(id)) return 'completed';
    if (this.arePrereqsMet(id)) return 'available';
    return 'locked';
  }

  // ==========================================
  // RESEARCH COMPLETION
  // ==========================================

  /**
   * Complete a research (deduct cost and unlock effects)
   * @param {string} id - Research ID
   * @returns {{success: boolean, error: string|null}}
   */
  completeResearch(id) {
    const check = this.canResearch(id);
    if (!check.canResearch) {
      return { success: false, error: check.reason };
    }

    const research = getResearchDef(id);

    // Deduct cost
    this._resourceService.spendResources(research.cost);

    // Mark as completed
    this._gameState.completeResearch(id);

    // Publish event for UI updates
    this._eventBus.publish(Events.RESEARCH_COMPLETED, {
      id,
      research,
      effects: research.effects
    });

    // Check if this unlocks plot expansion
    if (research.effects.unlockPlotExpansion) {
      this._eventBus.publish(Events.PLOT_EXPANSION_UNLOCKED, {
        researchId: id,
        expansion: research.effects.unlockPlotExpansion
      });
    }

    return { success: true, error: null };
  }

  // ==========================================
  // BUILDING UNLOCK CHECKS
  // ==========================================

  /**
   * Check if a building is unlocked (via research or default)
   * @param {string} buildingId - Building type ID
   * @returns {boolean}
   */
  isBuildingUnlocked(buildingId) {
    // Some buildings are unlocked by default
    if (DEFAULT_UNLOCKED_BUILDINGS.includes(buildingId)) {
      return true;
    }

    // Check if any completed research unlocks this building
    const researchId = getResearchForBuilding(buildingId);
    if (!researchId) {
      // No research required (it's a default building or not in research system)
      return true;
    }

    return this.isCompleted(researchId);
  }

  /**
   * Get the research required to unlock a building
   * @param {string} buildingId - Building type ID
   * @returns {string|null} Research ID or null if no research required
   */
  getBuildingUnlockResearch(buildingId) {
    if (DEFAULT_UNLOCKED_BUILDINGS.includes(buildingId)) {
      return null;
    }
    return getResearchForBuilding(buildingId);
  }

  // ==========================================
  // UPGRADE TIER CAPS
  // ==========================================

  /**
   * Get the maximum upgrade tier for a building based on completed research
   * @param {string} buildingId - Building type ID
   * @returns {number} Max tier (1 = base level only, 2 = one upgrade, etc.)
   */
  getMaxTierForBuilding(buildingId) {
    const completedSet = this.getCompletedResearchSet();
    const researchTier = getMaxTierForBuilding(buildingId, completedSet);

    // If no research affects this building, use default
    return researchTier !== null ? researchTier : DEFAULT_MAX_TIER;
  }

  /**
   * Check if a building can be upgraded to the next tier
   * @param {string} buildingId - Building type ID
   * @param {number} currentTier - Current building tier (0-indexed internal level)
   * @returns {boolean}
   */
  canUpgradeToNextTier(buildingId, currentTier) {
    const maxTier = this.getMaxTierForBuilding(buildingId);
    // currentTier is 0-indexed, maxTier is 1-indexed (tier 1 = level 1 = index 0)
    // So if maxTier is 2, we can upgrade from tier 0 to tier 1 (levels 1 to 2)
    return (currentTier + 1) < maxTier;
  }

  /**
   * Get the research needed to unlock the next upgrade tier
   * @param {string} buildingId - Building type ID
   * @param {number} currentTier - Current tier
   * @returns {string|null} Research ID or null if already at max possible
   */
  getNextTierResearch(buildingId, currentTier) {
    const targetTier = currentTier + 2; // Next tier in 1-indexed terms

    for (const [researchId, research] of Object.entries(RESEARCH)) {
      if (this.isCompleted(researchId)) continue;

      const tierUnlock = research.effects.unlockUpgradeTiers?.find(
        t => t.buildingId === buildingId && t.maxTier >= targetTier
      );

      if (tierUnlock) {
        return researchId;
      }
    }

    return null;
  }

  // ==========================================
  // PLOT EXPANSION
  // ==========================================

  /**
   * Get the current maximum plot size based on completed research
   * @returns {{rows: number, cols: number}}
   */
  getCurrentPlotSize() {
    const completedSet = this.getCompletedResearchSet();
    const expansion = getPlotExpansion(completedSet);

    // Default 10x10 grid
    return expansion || { rows: 10, cols: 10 };
  }

  /**
   * Check if a plot expansion is available (unlocked but not yet applied)
   * @returns {{rows: number, cols: number}|null}
   */
  getAvailablePlotExpansion() {
    const currentSize = this._gameState.getPlotSize();
    const researchSize = this.getCurrentPlotSize();

    if (researchSize.rows > currentSize.rows || researchSize.cols > currentSize.cols) {
      return researchSize;
    }

    return null;
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Get research statistics
   * @returns {Object}
   */
  getStats() {
    const completed = this.getCompletedCount();
    const total = this.getTotalCount();
    const available = this.getAvailableResearch().length;

    return {
      completed,
      total,
      available,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }
}
