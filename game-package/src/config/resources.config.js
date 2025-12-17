/**
 * Resource Configuration
 * Defines all resource types, categories, and properties
 * Adding a new resource here automatically integrates it across the game
 */

export const RESOURCES = {
  // Raw Resources
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    icon: 'icon-wheat',
    emoji: '🌾',
    category: 'raw',
    sellValue: 2,
    baseStorage: 100,
    order: 10,
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    icon: 'icon-stone',
    emoji: '⛏️',
    category: 'raw',
    sellValue: 3,
    baseStorage: 100,
    order: 11,
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    icon: 'icon-wood',
    emoji: '🌲',
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
    emoji: '🌾',
    category: 'intermediate',
    sellValue: 5,
    baseStorage: 100,
    order: 20,
  },

  // Products
  bread: {
    id: 'bread',
    name: 'Bread',
    icon: 'icon-bread',
    emoji: '🍞',
    category: 'product',
    sellValue: 10,
    baseStorage: 100,
    order: 30,
  },

  // Currency
  gold: {
    id: 'gold',
    name: 'Gold',
    icon: 'icon-gold',
    emoji: '💰',
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
