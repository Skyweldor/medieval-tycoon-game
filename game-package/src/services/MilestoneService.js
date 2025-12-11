/**
 * MilestoneService
 * Handles achievement/milestone tracking and rewards
 */

import { Events } from '../core/EventBus.js';
import { MILESTONES, getMilestoneIds, getMilestoneCount } from '../config/index.js';

export class MilestoneService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./ResourceService.js').ResourceService} resourceService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, resourceService, eventBus) {
    this._gameState = gameState;
    this._resourceService = resourceService;
    this._eventBus = eventBus;

    // Subscribe to events that may trigger milestone completion
    this._eventBus.subscribe(Events.BUILDING_PLACED, () => this.checkMilestones());
    this._eventBus.subscribe(Events.TICK, () => this._onTick());

    // Track last resource values to detect changes
    this._lastResources = null;
  }

  // ==========================================
  // MILESTONE QUERIES
  // ==========================================

  /**
   * Get all completed milestone IDs
   * @returns {string[]}
   */
  getCompletedMilestones() {
    return this._gameState.getCompletedMilestones();
  }

  /**
   * Check if a specific milestone is completed
   * @param {string} id - Milestone ID
   * @returns {boolean}
   */
  isCompleted(id) {
    return this._gameState.isMilestoneCompleted(id);
  }

  /**
   * Get completion count
   * @returns {number}
   */
  getCompletedCount() {
    return this._gameState.getCompletedMilestones().length;
  }

  /**
   * Get total milestone count
   * @returns {number}
   */
  getTotalCount() {
    return getMilestoneCount();
  }

  /**
   * Get completion progress
   * @returns {{completed: number, total: number, percentage: number}}
   */
  getProgress() {
    const completed = this.getCompletedCount();
    const total = this.getTotalCount();
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  // ==========================================
  // MILESTONE CHECKING
  // ==========================================

  /**
   * Check all milestones and complete any that match
   * @returns {Array<{id: string, milestone: Object}>} Newly completed milestones
   */
  checkMilestones() {
    const resources = this._gameState.getResources();
    const buildings = this._gameState.getBuildings();
    const newlyCompleted = [];

    Object.entries(MILESTONES).forEach(([id, milestone]) => {
      // Skip already completed
      if (this.isCompleted(id)) return;

      // Check condition
      if (milestone.condition(resources, buildings)) {
        // Mark as completed
        this._gameState.completeMilestone(id);

        // Grant reward
        this._resourceService.grantReward(milestone.reward);

        // Track for return value and events
        newlyCompleted.push({ id, milestone });

        // Publish event
        this._eventBus.publish(Events.MILESTONE_COMPLETED, {
          id,
          milestone,
          reward: milestone.reward
        });
      }
    });

    // Publish batch event if any completed
    if (newlyCompleted.length > 0) {
      this._eventBus.publish(Events.MILESTONES_CHECKED, {
        newlyCompleted,
        totalCompleted: this.getCompletedCount(),
        totalMilestones: this.getTotalCount()
      });
    }

    return newlyCompleted;
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  /**
   * Handle tick event - check for resource-based milestones
   * @private
   */
  _onTick() {
    // Only check milestones if resources have changed
    const currentResources = this._gameState.getResources();

    if (this._lastResources === null) {
      this._lastResources = { ...currentResources };
      return;
    }

    // Check if any resource changed
    const changed = Object.keys(currentResources).some(
      key => currentResources[key] !== this._lastResources[key]
    );

    if (changed) {
      this.checkMilestones();
      this._lastResources = { ...currentResources };
    }
  }

  // ==========================================
  // UI HELPERS
  // ==========================================

  /**
   * Get milestone data for UI panel
   * @returns {Array<{id: string, milestone: Object, completed: boolean}>}
   */
  getMilestoneList() {
    const completed = this.getCompletedMilestones();

    return Object.entries(MILESTONES).map(([id, milestone]) => ({
      id,
      milestone,
      completed: completed.includes(id)
    }));
  }

  /**
   * Format a reward object for display
   * @param {Object} reward - Reward object
   * @returns {string}
   */
  formatReward(reward) {
    const EMOJIS = { gold: '💰', wheat: '🌾', stone: '⛏️', wood: '🌲' };

    return Object.entries(reward)
      .map(([res, amt]) => `+${amt} ${EMOJIS[res] || res}`)
      .join(' ');
  }

  /**
   * Format reward for compact display (gold only shows emoji)
   * @param {Object} reward - Reward object
   * @returns {string}
   */
  formatRewardCompact(reward) {
    return Object.entries(reward)
      .map(([res, amt]) => `+${amt}${res === 'gold' ? '💰' : ''}`)
      .join(' ');
  }

  /**
   * Get popup data for a completed milestone
   * @param {Object} milestone - Milestone object
   * @returns {{icon: string, name: string, rewardText: string}}
   */
  getPopupData(milestone) {
    return {
      icon: milestone.icon,
      name: milestone.name,
      rewardText: this.formatReward(milestone.reward)
    };
  }

  /**
   * Generate HTML for milestone panel
   * @returns {string}
   */
  generatePanelHTML() {
    const milestones = this.getMilestoneList();

    return milestones.map(({ id, milestone, completed }) => {
      const rewardText = this.formatRewardCompact(milestone.reward);

      return `
        <div class="milestone-item ${completed ? 'completed' : ''}">
          <span class="milestone-icon">${completed ? '✅' : milestone.icon}</span>
          <div class="milestone-info">
            <div class="milestone-name">${milestone.name}</div>
            <div class="milestone-desc">${milestone.description}</div>
          </div>
          <div class="milestone-reward">${rewardText}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get progress text for display
   * @returns {string}
   */
  getProgressText() {
    const { completed, total } = this.getProgress();
    return `${completed}/${total}`;
  }
}
