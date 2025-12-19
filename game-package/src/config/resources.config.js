/**
 * Resource Configuration
 * Defines all resource types, categories, and properties
 * Adding a new resource here automatically integrates it across the game
 */

export const RESOURCES = {
  // Raw Resources (hasSprite: true = has dedicated icon in sprite sheet)
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    icon: 'icon-wheat',
    emoji: '🌾',
    hasSprite: true,
    category: 'raw',
    sellValue: 2,
    baseStorage: 100,
    order: 10,
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    icon: 'icon-stone',
    emoji: '🪨',
    hasSprite: true,
    category: 'raw',
    sellValue: 3,
    baseStorage: 100,
    order: 11,
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    icon: 'icon-wood',
    emoji: '🪵',
    hasSprite: true,
    category: 'raw',
    sellValue: 3,
    baseStorage: 100,
    order: 12,
  },

  // Intermediate Resources
  flour: {
    id: 'flour',
    name: 'Flour',
    icon: 'icon-flour',
    emoji: '🫓',
    hasSprite: true,
    category: 'intermediate',
    sellValue: 5,
    baseStorage: 100,
    order: 20,
  },
  planks: {
    id: 'planks',
    name: 'Planks',
    icon: 'icon-wood',
    emoji: '🪓',
    hasSprite: false, // NEEDS SPRITE: processed wood planks
    category: 'intermediate',
    sellValue: 6,
    baseStorage: 100,
    order: 21,
  },
  cut_stone: {
    id: 'cut_stone',
    name: 'Cut Stone',
    icon: 'icon-stone',
    emoji: '🧱',
    hasSprite: false, // NEEDS SPRITE: refined/cut stone blocks
    category: 'intermediate',
    sellValue: 6,
    baseStorage: 100,
    order: 22,
  },

  // Products
  bread: {
    id: 'bread',
    name: 'Bread',
    icon: 'icon-bread',
    emoji: '🍞',
    hasSprite: true,
    category: 'product',
    sellValue: 10,
    baseStorage: 100,
    order: 30,
  },
  furniture: {
    id: 'furniture',
    name: 'Furniture',
    icon: 'icon-wood',
    emoji: '🪑',
    hasSprite: false, // NEEDS SPRITE: chair/table/furniture
    category: 'product',
    sellValue: 12,
    baseStorage: 50,
    order: 31,
  },
  stone_blocks: {
    id: 'stone_blocks',
    name: 'Stone Blocks',
    icon: 'icon-stone',
    emoji: '🏛️',
    hasSprite: false, // NEEDS SPRITE: finished stone building blocks
    category: 'product',
    sellValue: 12,
    baseStorage: 50,
    order: 32,
  },
  tools: {
    id: 'tools',
    name: 'Tools',
    icon: 'icon-iron',
    emoji: '🔧',
    hasSprite: false, // NEEDS SPRITE: hammer/tools
    category: 'product',
    sellValue: 18,
    baseStorage: 30,
    order: 33,
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    icon: 'icon-stone',
    emoji: 'CC',
    hasSprite: false, // NEEDS SPRITE: dark charcoal/fuel
    category: 'intermediate',
    sellValue: 8,
    baseStorage: 50,
    order: 23,
  },

  // Currency
  gold: {
    id: 'gold',
    name: 'Gold',
    icon: 'icon-gold',
    emoji: '💰',
    hasSprite: true,
    category: 'currency',
    sellValue: null, // Cannot sell gold
    baseStorage: Infinity,
    order: 100,
  },
};

// Category display order
export const CATEGORY_ORDER = ['raw', 'intermediate', 'product', 'currency'];

/**
 * Get resource definition by ID
 * @param {string} id - Resource ID
 * @returns {Object|null}
 */
export function getResourceDef(id) {
  return RESOURCES[id] || null;
}

/**
 * Get all resource IDs
 * @returns {string[]}
 */
export function getResourceIds() {
  return Object.keys(RESOURCES);
}

/**
 * Get resources sorted by order (for HUD display)
 * @returns {Object[]}
 */
export function getSortedResources() {
  return Object.values(RESOURCES).sort((a, b) => a.order - b.order);
}

/**
 * Get resources filtered by category
 * @param {string} category - Category name
 * @returns {Object[]}
 */
export function getResourcesByCategory(category) {
  return Object.values(RESOURCES).filter(r => r.category === category);
}

/**
 * Get tradeable resources (those with sellValue)
 * @returns {Object[]}
 */
export function getTradeableResources() {
  return Object.values(RESOURCES).filter(r => r.sellValue !== null);
}

/**
 * Get storable resources (non-currency with finite storage)
 * @returns {string[]}
 */
export function getStorableResourceIds() {
  return Object.values(RESOURCES)
    .filter(r => r.category !== 'currency' && r.baseStorage !== Infinity)
    .map(r => r.id);
}

/**
 * Initialize default resource amounts
 * @returns {Object}
 */
export function getDefaultResources() {
  const resources = {};
  Object.keys(RESOURCES).forEach(id => {
    resources[id] = id === 'gold' ? 50 : 0;
  });
  return resources;
}
