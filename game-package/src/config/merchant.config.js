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
    wheat: 2,
    stone: 3,
    wood: 3,
    flour: 5,    // More valuable than wheat (requires processing)
    bread: 10    // Most valuable (requires 2-step production)
  },

  maxPerVisit: {
    wheat: 20,
    stone: 15,
    wood: 15,
    flour: 10,   // Less abundant
    bread: 5     // Rarest
  }
};

export const MARKET_CONFIG = {
  prices: {
    wheat: 3,
    stone: 5,
    wood: 5,
    flour: 6,    // Higher value than raw wheat
    bread: 12    // Premium crafted good
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
