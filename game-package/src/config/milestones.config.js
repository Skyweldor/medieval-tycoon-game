/**
 * Milestone Configuration
 * Defines achievements and their rewards
 */

/**
 * Helper function to count buildings of a specific type
 * @param {Array} buildings - Array of building objects
 * @param {string} type - Building type to count
 * @returns {number} Count of buildings
 */
export function countBuildings(buildings, type) {
  return buildings.filter(b => b.type === type).length;
}

export const MILESTONES = {
  first_farm: {
    name: "First Harvest",
    description: "Build your first Wheat Farm",
    condition: (res, bldgs) => countBuildings(bldgs, 'wheat_farm') >= 1,
    reward: { gold: 15 },
    icon: '🌱'
  },
  second_farm: {
    name: "Expanding Fields",
    description: "Build a second Wheat Farm",
    condition: (res, bldgs) => countBuildings(bldgs, 'wheat_farm') >= 2,
    reward: { gold: 10 },
    icon: '🌾'
  },
  wheat_10: {
    name: "First Stockpile",
    description: "Accumulate 10 wheat",
    condition: (res, bldgs) => res.wheat >= 10,
    reward: { gold: 20 },
    icon: '📦'
  },
  first_quarry: {
    name: "Breaking Ground",
    description: "Build a Stone Quarry",
    condition: (res, bldgs) => countBuildings(bldgs, 'quarry') >= 1,
    reward: { gold: 25 },
    icon: '⛏️'
  },
  stone_5: {
    name: "Solid Foundation",
    description: "Accumulate 5 stone",
    condition: (res, bldgs) => res.stone >= 5,
    reward: { gold: 15 },
    icon: '🪨'
  },
  first_lumber: {
    name: "Into the Woods",
    description: "Build a Lumber Camp",
    condition: (res, bldgs) => countBuildings(bldgs, 'lumber') >= 1,
    reward: { gold: 30 },
    icon: '🪓'
  },
  wheat_30: {
    name: "Bread Basket",
    description: "Accumulate 30 wheat",
    condition: (res, bldgs) => res.wheat >= 30,
    reward: { gold: 50 },
    icon: '🧺'
  },
  first_bakery: {
    name: "Self-Sufficient!",
    description: "Build a Bakery and start producing gold",
    condition: (res, bldgs) => countBuildings(bldgs, 'bakery') >= 1,
    reward: { gold: 100 },
    icon: '🥖'
  }
};

// Get milestone definition by ID
export function getMilestoneDef(id) {
  return MILESTONES[id] || null;
}

// Get all milestone IDs
export function getMilestoneIds() {
  return Object.keys(MILESTONES);
}

// Get total milestone count
export function getMilestoneCount() {
  return Object.keys(MILESTONES).length;
}
