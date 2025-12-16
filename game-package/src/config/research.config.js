/**
 * Research Configuration
 * Defines all research nodes, costs, prerequisites, and effects
 *
 * Research Effects:
 * - unlockBuildings: [] - Enables building visibility in build list
 * - unlockUpgradeTiers: [{ buildingId, maxTier }] - Unlocks upgrade tiers for buildings
 * - unlockPlotExpansion: { rows, cols } - Enables plot expansion to new size
 * - unlockRecipes: [] - (Future) Unlocks crafting recipes
 * - unlockProcessors: [] - (Future) Unlocks processor buildings
 * - unlockSynergies: [] - (Future) Ties into soft specialization (Milestone F)
 */

export const RESEARCH = {
  // ==========================================
  // TIER 0 - Basic Research (No prereqs)
  // ==========================================

  basic_construction: {
    id: 'basic_construction',
    name: 'Basic Construction',
    desc: 'Learn fundamental building techniques',
    cost: { gold: 25 },
    prereqs: [],
    effects: {
      unlockBuildings: ['barn'],
      unlockUpgradeTiers: [
        { buildingId: 'wheat_farm', maxTier: 2 }
      ]
    }
  },

  stonework: {
    id: 'stonework',
    name: 'Stonework',
    desc: 'Master the art of working with stone',
    cost: { gold: 50, wheat: 20 },
    prereqs: [],
    effects: {
      unlockBuildings: ['quarry'],
      unlockUpgradeTiers: [
        { buildingId: 'quarry', maxTier: 2 }
      ]
    }
  },

  forestry: {
    id: 'forestry',
    name: 'Forestry',
    desc: 'Efficient wood harvesting techniques',
    cost: { gold: 50, wheat: 15 },
    prereqs: [],
    effects: {
      unlockBuildings: ['lumber'],
      unlockUpgradeTiers: [
        { buildingId: 'lumber', maxTier: 2 }
      ]
    }
  },

  // ==========================================
  // TIER 1 - Intermediate Research
  // ==========================================

  advanced_farming: {
    id: 'advanced_farming',
    name: 'Advanced Farming',
    desc: 'Improved agricultural methods increase yield',
    cost: { gold: 100, wheat: 50 },
    prereqs: ['basic_construction'],
    effects: {
      unlockUpgradeTiers: [
        { buildingId: 'wheat_farm', maxTier: 4 }
      ]
    }
  },

  baking: {
    id: 'baking',
    name: 'Baking',
    desc: 'Convert wheat into valuable baked goods',
    cost: { gold: 150, wheat: 40 },
    prereqs: ['basic_construction'],
    effects: {
      unlockBuildings: ['bakery'],
      unlockUpgradeTiers: [
        { buildingId: 'bakery', maxTier: 2 }
      ]
    }
  },

  masonry: {
    id: 'masonry',
    name: 'Masonry',
    desc: 'Advanced stone construction techniques',
    cost: { gold: 150, stone: 30 },
    prereqs: ['stonework'],
    effects: {
      unlockUpgradeTiers: [
        { buildingId: 'quarry', maxTier: 4 },
        { buildingId: 'barn', maxTier: 3 }
      ]
    }
  },

  woodworking: {
    id: 'woodworking',
    name: 'Woodworking',
    desc: 'Skilled carpentry and wood processing',
    cost: { gold: 150, wood: 30 },
    prereqs: ['forestry'],
    effects: {
      unlockUpgradeTiers: [
        { buildingId: 'lumber', maxTier: 4 }
      ]
    }
  },

  // ==========================================
  // TIER 2 - Advanced Research
  // ==========================================

  metallurgy: {
    id: 'metallurgy',
    name: 'Metallurgy',
    desc: 'Forge tools and equipment from metal',
    cost: { gold: 300, stone: 50, wood: 30 },
    prereqs: ['masonry', 'woodworking'],
    effects: {
      unlockBuildings: ['blacksmith'],
      unlockUpgradeTiers: [
        { buildingId: 'blacksmith', maxTier: 2 }
      ]
    }
  },

  commerce: {
    id: 'commerce',
    name: 'Commerce',
    desc: 'Establish trade networks and markets',
    cost: { gold: 400, wood: 40 },
    prereqs: ['baking'],
    effects: {
      unlockBuildings: ['market'],
      unlockUpgradeTiers: [
        { buildingId: 'market', maxTier: 2 },
        { buildingId: 'bakery', maxTier: 4 }
      ]
    }
  },

  expansion_1: {
    id: 'expansion_1',
    name: 'Border Expansion I',
    desc: 'Claim more land for your fiefdom (12x12 grid)',
    cost: { gold: 500, stone: 50, wood: 50 },
    prereqs: ['masonry'],
    effects: {
      unlockPlotExpansion: { rows: 12, cols: 12 }
    }
  },

  // ==========================================
  // TIER 3 - Expert Research
  // ==========================================

  advanced_metallurgy: {
    id: 'advanced_metallurgy',
    name: 'Advanced Metallurgy',
    desc: 'Master smithing techniques for greater output',
    cost: { gold: 600, stone: 80, wood: 50 },
    prereqs: ['metallurgy'],
    effects: {
      unlockUpgradeTiers: [
        { buildingId: 'blacksmith', maxTier: 4 }
      ]
    }
  },

  trade_routes: {
    id: 'trade_routes',
    name: 'Trade Routes',
    desc: 'Establish far-reaching trade connections',
    cost: { gold: 800, wood: 60 },
    prereqs: ['commerce'],
    effects: {
      unlockUpgradeTiers: [
        { buildingId: 'market', maxTier: 4 }
      ]
    }
  },

  governance: {
    id: 'governance',
    name: 'Governance',
    desc: 'Centralize administration with a town hall',
    cost: { gold: 1000, stone: 100, wood: 80 },
    prereqs: ['commerce', 'metallurgy'],
    effects: {
      unlockBuildings: ['townhall'],
      unlockUpgradeTiers: [
        { buildingId: 'townhall', maxTier: 2 }
      ]
    }
  },

  expansion_2: {
    id: 'expansion_2',
    name: 'Border Expansion II',
    desc: 'Expand your domain further (14x14 grid)',
    cost: { gold: 1500, stone: 100, wood: 100 },
    prereqs: ['expansion_1', 'governance'],
    effects: {
      unlockPlotExpansion: { rows: 14, cols: 14 }
    }
  },

  // ==========================================
  // TIER 4 - Master Research
  // ==========================================

  kingdom: {
    id: 'kingdom',
    name: 'Kingdom',
    desc: 'Your village grows into a true kingdom',
    cost: { gold: 3000, stone: 200, wood: 200 },
    prereqs: ['governance', 'trade_routes', 'advanced_metallurgy'],
    effects: {
      unlockUpgradeTiers: [
        { buildingId: 'townhall', maxTier: 3 }
      ]
    }
  },

  expansion_3: {
    id: 'expansion_3',
    name: 'Border Expansion III',
    desc: 'Claim a vast territory (16x16 grid)',
    cost: { gold: 3000, stone: 200, wood: 200 },
    prereqs: ['expansion_2', 'kingdom'],
    effects: {
      unlockPlotExpansion: { rows: 16, cols: 16 }
    }
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get research definition by ID
 * @param {string} id - Research ID
 * @returns {Object|null}
 */
export function getResearchDef(id) {
  return RESEARCH[id] || null;
}

/**
 * Get all research IDs
 * @returns {string[]}
 */
export function getResearchIds() {
  return Object.keys(RESEARCH);
}

/**
 * Get research count
 * @returns {number}
 */
export function getResearchCount() {
  return Object.keys(RESEARCH).length;
}

/**
 * Get all research that has no prerequisites (entry points)
 * @returns {string[]}
 */
export function getRootResearch() {
  return Object.keys(RESEARCH).filter(id =>
    RESEARCH[id].prereqs.length === 0
  );
}

/**
 * Get all research that unlocks a specific building
 * @param {string} buildingId - Building ID to search for
 * @returns {string|null} Research ID that unlocks this building, or null
 */
export function getResearchForBuilding(buildingId) {
  for (const [researchId, research] of Object.entries(RESEARCH)) {
    if (research.effects.unlockBuildings?.includes(buildingId)) {
      return researchId;
    }
  }
  return null;
}

/**
 * Get the max upgrade tier unlocked by research for a building
 * Note: Returns null if no research affects this building's tier
 * @param {string} buildingId - Building ID
 * @param {Set<string>} completedResearch - Set of completed research IDs
 * @returns {number|null}
 */
export function getMaxTierForBuilding(buildingId, completedResearch) {
  let maxTier = null;

  for (const researchId of completedResearch) {
    const research = RESEARCH[researchId];
    if (!research) continue;

    const tierUnlock = research.effects.unlockUpgradeTiers?.find(
      t => t.buildingId === buildingId
    );

    if (tierUnlock) {
      maxTier = maxTier === null
        ? tierUnlock.maxTier
        : Math.max(maxTier, tierUnlock.maxTier);
    }
  }

  return maxTier;
}

/**
 * Get the largest plot expansion available from completed research
 * @param {Set<string>} completedResearch - Set of completed research IDs
 * @returns {{rows: number, cols: number}|null}
 */
export function getPlotExpansion(completedResearch) {
  let maxExpansion = null;

  for (const researchId of completedResearch) {
    const research = RESEARCH[researchId];
    if (!research?.effects.unlockPlotExpansion) continue;

    const expansion = research.effects.unlockPlotExpansion;
    if (!maxExpansion || expansion.rows > maxExpansion.rows) {
      maxExpansion = expansion;
    }
  }

  return maxExpansion;
}

// ==========================================
// DEFAULT BUILDING STATES
// ==========================================

/**
 * Buildings that are available from the start (no research needed)
 * Other buildings require research to unlock
 */
export const DEFAULT_UNLOCKED_BUILDINGS = ['wheat_farm'];

/**
 * Default max upgrade tier if no research has been done
 * Buildings can still be upgraded to tier 1 (base) without research
 */
export const DEFAULT_MAX_TIER = 1;
