/**
 * Asset Configuration
 * Paths to images and fallback emojis
 */

// Update these paths to point to your asset files
export const ASSETS = {
  // Ground tiles
  ground: 'assets/ground_basic.png',
  cobble: 'assets/cobble_basic.png',
  dirt: 'assets/dirt_basic.png',

  // Buildings - organized by type and level
  wheat_farm: {
    1: 'assets/wheat_basic_young.png',
    2: 'assets/wheat_basic_young.png', // Replace with lv2 when ready
    3: 'assets/wheat_basic_young.png', // Replace with lv3 when ready
    4: 'assets/wheat_basic_young.png', // Replace with lv4 when ready
  },
  quarry: {
    1: 'assets/quarry_basic.png',
    2: 'assets/quarry_basic.png',
    3: 'assets/quarry_basic.png',
    4: 'assets/quarry_basic.png',
  },
  lumber: {
    1: 'assets/lumber_basic.png',
    2: 'assets/lumber_basic.png',
    3: 'assets/lumber_basic.png',
    4: 'assets/lumber_basic.png',
  },
  bakery: {
    1: 'assets/bakery_basic.png',
    2: 'assets/bakery_basic.png',
    3: 'assets/bakery_basic.png',
    4: 'assets/bakery_basic.png',
  },
  blacksmith: {
    1: 'assets/blacksmith_basic.png',
    2: 'assets/blacksmith_basic.png',
    3: 'assets/blacksmith_basic.png',
    4: 'assets/blacksmith_basic.png',
  },
  market: {
    1: 'assets/market_basic.png',
    2: 'assets/market_basic.png',
    3: 'assets/market_basic.png',
    4: 'assets/market_basic.png',
  },
  townhall: {
    1: 'assets/town_hall_basic.png',
    2: 'assets/town_hall_basic.png',
    3: 'assets/town_hall_basic.png',
  },
  barn: {
    1: 'assets/barn_basic.png',
    2: 'assets/barn_basic.png',
    3: 'assets/barn_basic.png',
  },
  // Processor buildings (Milestone F)
  mill: {
    1: 'assets/mill_basic.png',
    2: 'assets/mill_basic.png',
    3: 'assets/mill_basic.png',
  },
  bread_oven: {
    1: 'assets/bread_oven_basic.png',
    2: 'assets/bread_oven_basic.png',
    3: 'assets/bread_oven_basic.png',
  },
};

// Fallback emojis when assets aren't available
export const EMOJI_FALLBACKS = {
  wheat_farm: '🌾',
  quarry: '⛏️',
  lumber: '🪓',
  bakery: '🥖',
  blacksmith: '⚒️',
  market: '🏪',
  townhall: '🏛️',
  barn: '🏚️',
  mill: '🏭',
  bread_oven: '🍞',
};

// Resource emojis
export const RESOURCE_EMOJIS = {
  gold: '💰',
  wheat: '🌾',
  stone: '⛏️',
  wood: '🌲',
};
