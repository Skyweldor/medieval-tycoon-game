/**
 * Building Configuration
 * Defines all building types, costs, production, and upgrades
 */

export const BUILDINGS = {
  wheat_farm: {
    name: 'Wheat Farm',
    baseCost: { gold: 10 },
    production: { wheat: 1 },
    upgrades: [
      { cost: { gold: 50 }, mult: 2 },
      { cost: { gold: 200 }, mult: 3 },
      { cost: { gold: 800 }, mult: 5 },
    ],
    unlockReq: null,
  },
  quarry: {
    name: 'Stone Quarry',
    baseCost: { gold: 25 },
    production: { stone: 1 },
    upgrades: [
      { cost: { gold: 100 }, mult: 2 },
      { cost: { gold: 400 }, mult: 3 },
      { cost: { gold: 1500 }, mult: 5 },
    ],
    unlockReq: { wheat: 10 },
  },
  lumber: {
    name: 'Lumber Camp',
    baseCost: { gold: 40 },
    production: { wood: 1 },
    upgrades: [
      { cost: { gold: 150 }, mult: 2 },
      { cost: { gold: 500 }, mult: 3 },
      { cost: { gold: 2000 }, mult: 5 },
    ],
    unlockReq: { stone: 5 },
  },
  bakery: {
    name: 'Bakery',
    baseCost: { gold: 100, wheat: 20 },
    production: { gold: 3 },
    consumes: { wheat: 1 },
    upgrades: [
      { cost: { gold: 300 }, mult: 2 },
      { cost: { gold: 1000 }, mult: 3 },
      { cost: { gold: 4000 }, mult: 5 },
    ],
    unlockReq: { wheat: 30 },
  },
  blacksmith: {
    name: 'Blacksmith',
    baseCost: { gold: 200, stone: 30, wood: 20 },
    production: { gold: 8 },
    consumes: { stone: 1, wood: 1 },
    upgrades: [
      { cost: { gold: 600 }, mult: 2 },
      { cost: { gold: 2000 }, mult: 3 },
      { cost: { gold: 8000 }, mult: 5 },
    ],
    unlockReq: { stone: 50, wood: 30 },
  },
  market: {
    name: 'Market',
    baseCost: { gold: 500, wood: 50 },
    production: { gold: 15 },
    upgrades: [
      { cost: { gold: 1500 }, mult: 2 },
      { cost: { gold: 5000 }, mult: 3 },
      { cost: { gold: 20000 }, mult: 5 },
    ],
    unlockReq: { gold: 300 },
  },
  townhall: {
    name: 'Town Hall',
    baseCost: { gold: 2000, stone: 100, wood: 100 },
    production: { gold: 50 },
    upgrades: [
      { cost: { gold: 8000 }, mult: 2 },
      { cost: { gold: 30000 }, mult: 3 },
    ],
    unlockReq: { gold: 1000, stone: 80, wood: 80 },
  },
  barn: {
    name: 'Barn',
    baseCost: { gold: 75, wood: 15 },
    production: {},
    storageBonus: 100,
    upgrades: [
      { cost: { gold: 200 }, mult: 2 },
      { cost: { gold: 600 }, mult: 3 },
    ],
    unlockReq: { wood: 10 },
  },

  // Processor Buildings (cycle-based production)
  mill: {
    name: 'Mill',
    baseCost: { gold: 80, wood: 25 },
    production: {},
    recipe: {
      inputs: { wheat: 2 },
      outputs: { flour: 1 },
      cycleTime: 10000, // 10 seconds
    },
    upgrades: [
      { cost: { gold: 200, wood: 30 }, mult: 1.5 },
      { cost: { gold: 600, wood: 50 }, mult: 2 },
    ],
    unlockReq: { wheat: 20 },
    isProcessor: true,
  },
  bread_oven: {
    name: 'Bread Oven',
    baseCost: { gold: 150, wood: 15 },
    production: {},
    recipe: {
      inputs: { flour: 1 },
      outputs: { bread: 1 },
      cycleTime: 8000, // 8 seconds
    },
    upgrades: [
      { cost: { gold: 400, wood: 25 }, mult: 1.5 },
      { cost: { gold: 1200, wood: 40 }, mult: 2 },
    ],
    unlockReq: { flour: 5 },
    isProcessor: true,
  },

  // Wood Processing Chain
  sawmill: {
    name: 'Sawmill',
    baseCost: { gold: 120, wood: 30 },
    production: {},
    recipe: {
      inputs: { wood: 2 },
      outputs: { planks: 1 },
      cycleTime: 10000, // 10 seconds
    },
    upgrades: [
      { cost: { gold: 300, wood: 40 }, mult: 1.5 },
      { cost: { gold: 800, wood: 60 }, mult: 2 },
    ],
    unlockResearchId: 'wood_processing',
    isProcessor: true,
  },
  carpenter: {
    name: 'Carpenter',
    baseCost: { gold: 200, planks: 10 },
    production: {},
    recipe: {
      inputs: { planks: 1 },
      outputs: { furniture: 1 },
      cycleTime: 10000, // 10 seconds
    },
    upgrades: [
      { cost: { gold: 500, planks: 15 }, mult: 1.5 },
      { cost: { gold: 1500, planks: 25 }, mult: 2 },
    ],
    unlockResearchId: 'carpentry',
    isProcessor: true,
  },

  // Stone Processing Chain
  stonecutter: {
    name: 'Stonecutter',
    baseCost: { gold: 130, stone: 25 },
    production: {},
    recipe: {
      inputs: { stone: 2 },
      outputs: { cut_stone: 1 },
      cycleTime: 11000, // 11 seconds
    },
    upgrades: [
      { cost: { gold: 350, stone: 35 }, mult: 1.5 },
      { cost: { gold: 900, stone: 50 }, mult: 2 },
    ],
    unlockResearchId: 'stone_processing',
    isProcessor: true,
  },
  mason_yard: {
    name: 'Mason Yard',
    baseCost: { gold: 220, cut_stone: 10 },
    production: {},
    recipe: {
      inputs: { cut_stone: 1 },
      outputs: { stone_blocks: 1 },
      cycleTime: 10000, // 10 seconds
    },
    upgrades: [
      { cost: { gold: 550, cut_stone: 15 }, mult: 1.5 },
      { cost: { gold: 1600, cut_stone: 25 }, mult: 2 },
    ],
    unlockResearchId: 'block_masonry',
    isProcessor: true,
  },

  // Cross-Chain Products
  toolmaker: {
    name: 'Toolmaker Workshop',
    baseCost: { gold: 350, planks: 15, cut_stone: 15 },
    production: {},
    recipe: {
      inputs: { planks: 1, cut_stone: 1 },
      outputs: { tools: 1 },
      cycleTime: 14000, // 14 seconds
    },
    upgrades: [
      { cost: { gold: 800, planks: 20, cut_stone: 20 }, mult: 1.5 },
      { cost: { gold: 2000, planks: 30, cut_stone: 30 }, mult: 2 },
    ],
    unlockResearchId: 'toolmaking',
    isProcessor: true,
  },
  charcoal_kiln: {
    name: 'Charcoal Kiln',
    baseCost: { gold: 280, stone_blocks: 5 },
    production: {},
    recipe: {
      inputs: { planks: 2 },
      outputs: { charcoal: 1 },
      cycleTime: 12000, // 12 seconds
    },
    upgrades: [
      { cost: { gold: 600, stone_blocks: 8 }, mult: 1.5 },
      { cost: { gold: 1500, stone_blocks: 12 }, mult: 2 },
    ],
    unlockResearchId: 'charcoal_burning',
    isProcessor: true,
  },
};

// Building types that produce gold (used for stipend check)
export const GOLD_PRODUCERS = ['bakery', 'blacksmith', 'market', 'townhall'];

// Get building definition by type
export function getBuildingDef(type) {
  return BUILDINGS[type] || null;
}

// Get all building types
export function getBuildingTypes() {
  return Object.keys(BUILDINGS);
}
