/**
 * ServiceContainer - Dependency injection container for managing services
 *
 * Usage:
 *   const container = new ServiceContainer();
 *   container.register('eventBus', () => new EventBus());
 *   container.register('resourceService', (c) => new ResourceService(c.get('eventBus')));
 *
 *   const resourceService = container.get('resourceService');
 */
export class ServiceContainer {
  constructor() {
    /** @type {Map<string, Function>} Service factory functions */
    this._factories = new Map();

    /** @type {Map<string, any>} Cached service instances (singletons) */
    this._instances = new Map();

    /** @type {Set<string>} Services currently being resolved (circular dependency detection) */
    this._resolving = new Set();
  }

  /**
   * Register a service factory
   * @param {string} name - Service identifier
   * @param {Function} factory - Factory function that receives the container and returns the service
   * @param {Object} options - Registration options
   * @param {boolean} options.singleton - Whether to cache the instance (default: true)
   * @returns {ServiceContainer} This container for chaining
   */
  register(name, factory, options = {}) {
    const { singleton = true } = options;

    if (typeof factory !== 'function') {
      throw new Error(`ServiceContainer: Factory for "${name}" must be a function`);
    }

    this._factories.set(name, { factory, singleton });

    // Clear cached instance if re-registering
    this._instances.delete(name);

    return this;
  }

  /**
   * Register a pre-existing instance directly
   * @param {string} name - Service identifier
   * @param {any} instance - The service instance
   * @returns {ServiceContainer} This container for chaining
   */
  registerInstance(name, instance) {
    this._instances.set(name, instance);
    this._factories.set(name, { factory: () => instance, singleton: true });
    return this;
  }

  /**
   * Get a service by name
   * @param {string} name - Service identifier
   * @returns {any} The service instance
   * @throws {Error} If service is not registered or circular dependency detected
   */
  get(name) {
    // Check for cached singleton
    if (this._instances.has(name)) {
      return this._instances.get(name);
    }

    // Check if factory exists
    const registration = this._factories.get(name);
    if (!registration) {
      throw new Error(`ServiceContainer: Service "${name}" is not registered`);
    }

    // Circular dependency detection
    if (this._resolving.has(name)) {
      throw new Error(`ServiceContainer: Circular dependency detected for "${name}"`);
    }

    // Mark as resolving
    this._resolving.add(name);

    try {
      // Create instance
      const instance = registration.factory(this);

      // Cache if singleton
      if (registration.singleton) {
        this._instances.set(name, instance);
      }

      return instance;
    } finally {
      // Remove from resolving set
      this._resolving.delete(name);
    }
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service identifier
   * @returns {boolean}
   */
  has(name) {
    return this._factories.has(name);
  }

  /**
   * Get all registered service names
   * @returns {string[]}
   */
  getNames() {
    return Array.from(this._factories.keys());
  }

  /**
   * Clear all services (useful for testing)
   */
  clear() {
    this._factories.clear();
    this._instances.clear();
    this._resolving.clear();
  }

  /**
   * Clear only cached instances (re-creates on next get)
   */
  clearInstances() {
    this._instances.clear();
  }
}

// Export singleton instance for app-wide use
export const container = new ServiceContainer();
