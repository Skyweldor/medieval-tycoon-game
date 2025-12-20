/**
 * Resource Configuration
 * Defines all resource types, categories, and properties
 * Adding a new resource here automatically integrates it across the game
 */

export const RESOURCES = {
  // Raw Resources - icons_basic.png (iconBase: 'icon')
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    iconBase: 'icon',
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
    iconBase: 'icon',
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
    iconBase: 'icon',
    icon: 'icon-wood',
    emoji: '🪵',
    hasSprite: true,
    category: 'raw',
    sellValue: 3,
    baseStorage: 100,
    order: 12,
  },

  // Intermediate Resources - icons-01_basic.png (iconBase: 'icon-01')
  flour: {
    id: 'flour',
    name: 'Flour',
    iconBase: 'icon-01',
    icon: 'icon-flour',
    emoji: '🌾',
    hasSprite: true,
    category: 'intermediate',
    sellValue: 5,
    baseStorage: 100,
    order: 20,
  },
  planks: {
    id: 'planks',
    name: 'Planks',
    iconBase: 'icon-01',
    icon: 'icon-planks',
    emoji: '🪵',
    hasSprite: true,
    category: 'intermediate',
    sellValue: 6,
    baseStorage: 100,
    order: 21,
  },
  cut_stone: {
    id: 'cut_stone',
    name: 'Cut Stone',
    iconBase: 'icon-02',
    icon: 'icon-stone_blocks',
    emoji: '🪨',
    hasSprite: true,
    category: 'intermediate',
    sellValue: 6,
    baseStorage: 100,
    order: 22,
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    iconBase: 'icon-01',
    icon: 'icon-charcoal',
    emoji: '🔥',
    hasSprite: true,
    category: 'intermediate',
    sellValue: 8,
    baseStorage: 50,
    order: 23,
  },

  // Products
  bread: {
    id: 'bread',
    name: 'Bread',
    iconBase: 'icon',
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
    iconBase: 'icon-01',
    icon: 'icon-furniture',
    emoji: '🪑',
    hasSprite: true,
    category: 'product',
    sellValue: 12,
    baseStorage: 50,
    order: 31,
  },
  mortar: {
    id: 'mortar',
    name: 'Mortar',
    iconBase: 'icon-01',
    icon: 'icon-mortar',
    emoji: '🪣',
    hasSprite: true,
    category: 'product',
    sellValue: 12,
    baseStorage: 50,
    order: 32,
  },
  tools: {
    id: 'tools',
    name: 'Tools',
    iconBase: 'icon-01',
    icon: 'icon-tools',
    emoji: '🔧',
    hasSprite: true,
    category: 'product',
    sellValue: 18,
    baseStorage: 30,
    order: 33,
  },

  // Currency - icons_basic.png (iconBase: 'icon')
  gold: {
    id: 'gold',
    name: 'Gold',
    iconBase: 'icon',
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
