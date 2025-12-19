/**
 * Merchant & Market Configuration
 * Settings for the traveling merchant and market trading
 */

export const MERCHANT_CONFIG = {
  firstAppearDelay: 60000,      // 60 sec before first visit
  minInterval: 45000,           // Min time between visits
  maxInterval: 90000,           // Max time between visits
  visitDuration: 30000,         // How long merchant stays

  // Sell prices (what merchant pays player)
  prices: {
    // Raw resources
    wheat: 2,
    stone: 3,
    wood: 3,
    // Intermediate resources
    flour: 5,
    planks: 6,
    cut_stone: 6,
    charcoal: 8,
    // Product resources (2-step production)
    bread: 10,
    furniture: 12,
    stone_blocks: 12,
    tools: 18    // Cross-chain product, highest value
  },

  maxPerVisit: {
    // Raw resources
    wheat: 20,
    stone: 15,
    wood: 15,
    // Intermediate resources
    flour: 10,
    planks: 8,
    cut_stone: 8,
    charcoal: 6,
    // Product resources (scarcer)
    bread: 5,
    furniture: 4,
    stone_blocks: 4,
    tools: 3
  }
};

export const MARKET_CONFIG = {
  prices: {
    // Raw resources (better than merchant)
    wheat: 3,
    stone: 5,
    wood: 5,
    // Intermediate resources
    flour: 7,
    planks: 8,
    cut_stone: 8,
    charcoal: 10,
    // Product resources (premium prices)
    bread: 14,
    furniture: 16,
    stone_blocks: 16,
    tools: 24    // Cross-chain product, highest value
  },
  // Market level boosts prices: +10% per upgrade level
  levelBonusPercent: 10
  // No quantity limits for market
};

// Helper to calculate market price with level bonus
export function getMarketPrice(resource, marketLevel) {
  const basePrice = MARKET_CONFIG.prices[resource] || 0;
  const levelBonus = 1 + (marketLevel - 1) * (MARKET_CONFIG.levelBonusPercent / 100);
  return Math.floor(basePrice * levelBonus);
}

// Helper to get merchant price
export function getMerchantPrice(resource) {
  return MERCHANT_CONFIG.prices[resource] || 0;
}

// Helper to get merchant max sellable per visit
export function getMerchantMaxPerVisit(resource) {
  return MERCHANT_CONFIG.maxPerVisit[resource] || 0;
}
