/**
 * DropRenderer
 * Renders resource drops on the game world with click-to-collect behavior
 *
 * Drops appear with a pop animation when spawned, bob gently when idle,
 * and can be clicked to collect resources (added to inventory).
 */

import { RESOURCES } from '../config/resources.config.js';

export class DropRenderer {
  /**
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   * @param {import('../services/DropService.js').DropService} dropService
   * @param {import('../services/CameraService.js').CameraService} cameraService
   */
  constructor(coordinateService, dropService, cameraService) {
    this._coordinateService = coordinateService;
    this._dropService = dropService;
    this._cameraService = cameraService;

    /** @type {Map<string, HTMLElement>} Drop ID to DOM element */
    this._elements = new Map();

    /** @type {HTMLElement|null} */
    this._layer = null;

    /** @type {number|null} */
    this._animationFrame = null;

    /** @type {string|null} Currently hovered drop */
    this._hoveredDropId = null;

    // Bind methods for event listeners
    this._handleClick = this._handleClick.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseLeave = this._handleMouseLeave.bind(this);
  }

  /**
   * Initialize renderer and create drop layer
   */
  initialize() {
    const buildingLayer = document.getElementById('building-layer');
    if (!buildingLayer) {
      console.warn('[DropRenderer] Building layer not found, looking for game-world');
      const gameWorld = document.getElementById('game-world');
      if (!gameWorld) {
        console.error('[DropRenderer] Game world not found!');
        return;
      }
      // Create drop layer in game world
      this._layer = document.createElement('div');
      this._layer.id = 'drop-layer';
      this._layer.className = 'drop-layer';
      gameWorld.appendChild(this._layer);
    } else {
      // Create drop layer as sibling to building layer (they share camera transforms)
      this._layer = document.createElement('div');
      this._layer.id = 'drop-layer';
      this._layer.className = 'drop-layer';
      buildingLayer.parentNode.insertBefore(this._layer, buildingLayer);
    }

    // Setup click handler for collection
    this._layer.addEventListener('click', this._handleClick);
    this._layer.addEventListener('mousemove', this._handleMouseMove);
    this._layer.addEventListener('mouseleave', this._handleMouseLeave);

    // Start render loop
    this._startRenderLoop();

    console.log('[DropRenderer] Initialized');
  }

  /**
   * Start render loop
   */
  _startRenderLoop() {
    const render = () => {
      this._render();
      this._animationFrame = requestAnimationFrame(render);
    };
    this._animationFrame = requestAnimationFrame(render);
  }

  /**
   * Stop render loop
   */
  _stopRenderLoop() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Main render function
   */
  _render() {
    if (!this._layer) return;

    const drops = this._dropService.getDrops();
    const dropIds = new Set(drops.map(d => d.id));

    // Remove elements for collected drops
    for (const [id, element] of this._elements) {
      if (!dropIds.has(id)) {
        element.remove();
        this._elements.delete(id);
      }
    }

    // Create/update elements for active drops
    for (const drop of drops) {
      if (!this._elements.has(drop.id)) {
        this._createDropElement(drop);
      }
      this._updateDropElement(drop);
    }

    // NOTE: Camera transform is handled by CSS via --camera-x, --camera-y, --camera-zoom
    // variables on .drop-layer class. No manual transform needed here.
  }

  /**
   * Create DOM element for a drop
   */
  _createDropElement(drop) {
    const resourceDef = RESOURCES[drop.resourceId];

    const container = document.createElement('div');
    container.className = 'drop-container';
    container.dataset.dropId = drop.id;

    // Icon element using sprite icons
    const icon = document.createElement('div');
    icon.className = 'drop-icon';

    // Use the icon class from resource config, or fallback to emoji
    if (resourceDef?.icon) {
      icon.classList.add(resourceDef.iconBase || 'icon');
      icon.classList.add(resourceDef.icon);
    } else {
      // Fallback to emoji
      icon.textContent = resourceDef?.emoji || '?';
      icon.classList.add('drop-emoji');
    }
    container.appendChild(icon);

    // Amount badge (only show if amount > 1)
    if (drop.amount > 1) {
      const badge = document.createElement('div');
      badge.className = 'drop-amount';
      badge.textContent = drop.amount;
      container.appendChild(badge);
    }

    this._layer.appendChild(container);
    this._elements.set(drop.id, container);
  }

  /**
   * Update drop element position and animation
   */
  _updateDropElement(drop) {
    const element = this._elements.get(drop.id);
    if (!element) return;

    // Convert grid position to screen position
    const screenPos = this._coordinateService.gridToScreen(drop.gridX, drop.gridY);

    // Calculate z-index (between characters and buildings)
    // Characters use z = (col + row) * 10 + 50
    // Buildings use z = (col + row) * 10 + 100
    // Drops should be z = (col + row) * 10 + 75 (above characters, below buildings)
    const zIndex = Math.floor((drop.gridX + drop.gridY) * 10) + 75;

    // Position drop (centered on grid position)
    const dropSize = 32;
    element.style.left = `${screenPos.x - dropSize / 2}px`;
    element.style.top = `${screenPos.y - dropSize / 2}px`;
    element.style.zIndex = zIndex;

    // Update amount badge if it exists
    const badge = element.querySelector('.drop-amount');
    if (badge) {
      badge.textContent = drop.amount;
    } else if (drop.amount > 1) {
      // Add badge if amount increased
      const newBadge = document.createElement('div');
      newBadge.className = 'drop-amount';
      newBadge.textContent = drop.amount;
      element.appendChild(newBadge);
    }

    // Spawn animation (pop effect)
    const age = Date.now() - drop.spawnedAt;
    if (age < 300) {
      // Pop-in animation: start small and bounce up
      const progress = Math.min(1, age / 200);
      const scale = 0.3 + 0.7 * this._easeOutBack(progress);
      const offsetY = -30 * (1 - Math.min(1, age / 300));
      element.style.transform = `scale(${scale}) translateY(${offsetY}px)`;
      element.classList.add('spawning');
    } else {
      // Idle bobbing animation
      const bobSpeed = 600; // ms per cycle
      const bobAmount = 3; // pixels
      const bob = Math.sin((Date.now() + parseInt(drop.id.split('_')[1]) * 200) / bobSpeed) * bobAmount;
      element.style.transform = `translateY(${bob}px)`;
      element.classList.remove('spawning');
    }

    // Hover state
    element.classList.toggle('hovered', this._hoveredDropId === drop.id);
  }

  /**
   * Easing function for bounce effect
   */
  _easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  /**
   * Handle click on drop layer
   */
  _handleClick(e) {
    const dropElement = e.target.closest('.drop-container');
    if (!dropElement) return;

    const dropId = dropElement.dataset.dropId;
    if (dropId) {
      const result = this._dropService.collectDrop(dropId);
      if (result.success) {
        // Add collection animation class
        dropElement.classList.add('collecting');

        // If fully collected, it will be removed by render loop
        // If partial, update will happen in render loop
        if (!result.remainder) {
          // Small delay before removal to show animation
          setTimeout(() => {
            dropElement.remove();
            this._elements.delete(dropId);
          }, 200);
        }
      } else if (result.storageFull) {
        // Show storage full feedback
        dropElement.classList.add('rejected');
        setTimeout(() => dropElement.classList.remove('rejected'), 300);
      }
    }
  }

  /**
   * Handle mouse move for hover effects
   */
  _handleMouseMove(e) {
    const dropElement = document.elementFromPoint(e.clientX, e.clientY)?.closest('.drop-container');
    const newHoveredId = dropElement?.dataset.dropId || null;

    if (newHoveredId !== this._hoveredDropId) {
      this._hoveredDropId = newHoveredId;

      // Update cursor
      if (this._layer) {
        this._layer.style.cursor = newHoveredId ? 'pointer' : 'default';
      }
    }
  }

  /**
   * Handle mouse leaving layer
   */
  _handleMouseLeave() {
    this._hoveredDropId = null;
    if (this._layer) {
      this._layer.style.cursor = 'default';
    }
  }

  /**
   * Force re-render
   */
  render() {
    this._render();
  }

  /**
   * Clear all drop elements
   */
  clear() {
    this._elements.forEach(el => el.remove());
    this._elements.clear();
    this._hoveredDropId = null;
  }

  /**
   * Cleanup
   */
  destroy() {
    this._stopRenderLoop();

    if (this._layer) {
      this._layer.removeEventListener('click', this._handleClick);
      this._layer.removeEventListener('mousemove', this._handleMouseMove);
      this._layer.removeEventListener('mouseleave', this._handleMouseLeave);
    }

    this.clear();

    if (this._layer) {
      this._layer.remove();
      this._layer = null;
    }
  }
}
