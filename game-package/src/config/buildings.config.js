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
