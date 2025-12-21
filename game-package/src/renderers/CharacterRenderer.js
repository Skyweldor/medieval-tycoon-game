/**
 * CharacterRenderer
 * Renders characters with proper z-ordering and x-ray outline when behind buildings
 *
 * Characters are rendered on a character layer that receives camera transforms.
 * Z-ordering is based on grid position to ensure correct depth sorting with buildings.
 * When a character is behind a building, an x-ray outline (green/blue) is shown.
 */

import { AnimatedSprite } from '../models/AnimatedSprite.js';
import { TILE_CONFIG } from '../config/index.js';

// Character sprite configuration
const CHARACTER_SPRITES = {
  peasant: {
    src: 'assets/characters/MiniPeasant.png',
    frameWidth: 32,
    frameHeight: 32,
    framesPerRow: 6,
    scale: 2 // Display scale multiplier
  }
};

export class CharacterRenderer {
  /**
   * @param {import('../services/CoordinateService.js').CoordinateService} coordinateService
   * @param {import('../services/CharacterService.js').CharacterService} characterService
   */
  constructor(coordinateService, characterService) {
    this._coordinateService = coordinateService;
    this._characterService = characterService;

    /**
     * Map of character ID to DOM elements and sprite controllers
     * @type {Map<string, {container: HTMLElement, sprite: HTMLElement, outline: HTMLElement, animator: AnimatedSprite}>}
     */
    this._elements = new Map();

    /**
     * Character layer element
     * @type {HTMLElement|null}
     */
    this._layer = null;

    /**
     * Animation frame ID for render loop
     * @type {number|null}
     */
    this._animationFrame = null;
  }

  /**
   * Initialize the renderer
   * @param {HTMLElement} [container] - Optional container (defaults to creating one)
   */
  initialize(container) {
    // Create or find character layer
    if (container) {
      this._layer = container;
    } else {
      this._layer = document.getElementById('character-layer');
      if (!this._layer) {
        // Create the layer
        const gameWorld = document.getElementById('game-world');
        if (gameWorld) {
          this._layer = document.createElement('div');
          this._layer.id = 'character-layer';
          this._layer.className = 'character-layer';
          gameWorld.appendChild(this._layer);
          console.log('[CharacterRenderer] Created character layer');
        } else {
          console.warn('[CharacterRenderer] Game world not found!');
        }
      }
    }

    // Start render loop
    this._startRenderLoop();
    console.log('[CharacterRenderer] Initialized, layer:', this._layer ? 'found' : 'missing');
  }

  /**
   * Start the render loop for smooth animation
   */
  _startRenderLoop() {
    const render = () => {
      this._render();
      this._animationFrame = requestAnimationFrame(render);
    };
    this._animationFrame = requestAnimationFrame(render);
  }

  /**
   * Stop the render loop
   */
  _stopRenderLoop() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Create DOM elements for a character
   * @param {Object} character - Character data from CharacterService
   */
  createCharacterElement(character) {
    if (this._elements.has(character.id)) {
      return; // Already exists
    }

    const config = CHARACTER_SPRITES[character.sprite] || CHARACTER_SPRITES.peasant;

    // Create container
    const container = document.createElement('div');
    container.className = 'character-container';
    container.dataset.characterId = character.id;

    // Create sprite element
    const sprite = document.createElement('div');
    sprite.className = 'character-sprite';
    sprite.style.backgroundImage = `url('${config.src}')`;
    sprite.style.width = `${config.frameWidth * config.scale}px`;
    sprite.style.height = `${config.frameHeight * config.scale}px`;
    sprite.style.backgroundSize = `${config.frameWidth * config.framesPerRow * config.scale}px ${config.frameHeight * 6 * config.scale}px`;

    // Create outline element (for x-ray effect)
    const outline = document.createElement('div');
    outline.className = 'character-outline';
    outline.style.backgroundImage = `url('${config.src}')`;
    outline.style.width = `${config.frameWidth * config.scale}px`;
    outline.style.height = `${config.frameHeight * config.scale}px`;
    outline.style.backgroundSize = `${config.frameWidth * config.framesPerRow * config.scale}px ${config.frameHeight * 6 * config.scale}px`;

    container.appendChild(outline);
    container.appendChild(sprite);

    // Create animator
    const animator = new AnimatedSprite(
      sprite,
      config.frameWidth * config.scale,
      config.frameHeight * config.scale,
      config.framesPerRow
    );

    // Also sync outline animation
    animator.onAnimationEnd = (state) => {
      if (state === 'attack' || state === 'hurt') {
        animator.setState('idle');
      }
    };

    animator.setState('idle');

    // Store references
    this._elements.set(character.id, {
      container,
      sprite,
      outline,
      animator,
      config
    });

    // Add to layer
    if (this._layer) {
      this._layer.appendChild(container);
      console.log('[CharacterRenderer] Created element for character:', character.id);
    } else {
      console.warn('[CharacterRenderer] No layer to add character element to!');
    }
  }

  /**
   * Remove a character's DOM elements
   * @param {string} characterId
   */
  removeCharacterElement(characterId) {
    const elements = this._elements.get(characterId);
    if (elements) {
      elements.animator.destroy();
      elements.container.remove();
      this._elements.delete(characterId);
    }
  }

  /**
   * Main render function - updates all character positions and states
   */
  _render() {
    const characters = this._characterService.getCharacters();

    // Create elements for new characters
    for (const char of characters) {
      if (!this._elements.has(char.id)) {
        this.createCharacterElement(char);
      }
    }

    // Remove elements for removed characters
    for (const [id] of this._elements) {
      if (!characters.find(c => c.id === id)) {
        this.removeCharacterElement(id);
      }
    }

    // Update each character
    for (const char of characters) {
      this._updateCharacter(char);
    }
  }

  /**
   * Update a single character's rendering
   * @param {Object} character
   */
  _updateCharacter(character) {
    const elements = this._elements.get(character.id);
    if (!elements) return;

    const { container, sprite, outline, animator, config } = elements;

    // Get interpolated position
    const pos = this._characterService.getInterpolatedPosition(character.id);
    if (!pos) return;

    // Convert grid position to screen position
    // Characters are at grid intersections, so we use gridToScreen directly
    const screenPos = this._coordinateService.gridToScreen(pos.col, pos.row);

    // Position the character (centered on the intersection point)
    const spriteWidth = config.frameWidth * config.scale;
    const spriteHeight = config.frameHeight * config.scale;

    // Offset to position character's feet at the grid intersection
    const offsetX = -spriteWidth / 2;
    const offsetY = -spriteHeight + 8; // Feet roughly 8px from bottom

    container.style.left = `${screenPos.x + offsetX}px`;
    container.style.top = `${screenPos.y + offsetY}px`;

    // Calculate z-index (same formula as buildings but +50 to be between tiles and buildings)
    const zIndex = Math.floor((pos.col + pos.row) * 10 + 50);
    container.style.zIndex = zIndex;

    // Update animation state
    if (character.state === 'walking') {
      if (animator.getState() !== 'walk') {
        animator.setState('walk');
      }
    } else {
      if (animator.getState() !== 'idle') {
        animator.setState('idle');
      }
    }

    // Update facing direction (flip sprite for west/south)
    // Right (north) & down (east) = not flipped
    // Left (south) & up (west) = flipped
    const flipX = character.facing === 'west' || character.facing === 'south';
    sprite.style.transform = flipX ? 'scaleX(-1)' : '';
    outline.style.transform = flipX ? 'scaleX(-1)' : '';

    // Sync outline animation with main sprite
    outline.style.backgroundPosition = sprite.style.backgroundPosition;

    // Check if character is behind a building
    const { isBehind } = this._characterService.isCharacterBehindBuilding(character.id);

    // Toggle x-ray outline
    if (isBehind) {
      container.classList.add('behind-building');
    } else {
      container.classList.remove('behind-building');
    }
  }

  /**
   * Force re-render all characters
   */
  render() {
    this._render();
  }

  /**
   * Clear all character elements
   */
  clear() {
    for (const [id] of this._elements) {
      this.removeCharacterElement(id);
    }
  }

  /**
   * Destroy the renderer
   */
  destroy() {
    this._stopRenderLoop();
    this.clear();
    this._layer = null;
  }
}
