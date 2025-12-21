/**
 * CharacterService
 * Manages character state, pathfinding, and movement
 *
 * Characters walk along tile edges (grid lines) only - no diagonal movement.
 * They cannot walk through buildings but can walk between them.
 *
 * Grid coordinates for characters are at tile intersections (corners),
 * not tile centers. So a character at (col, row) is at the corner where
 * tiles (col-1,row-1), (col-1,row), (col,row-1), (col,row) meet.
 */

import { Events } from '../core/EventBus.js';
import { TILE_CONFIG, BUILDING_FOOTPRINT } from '../config/index.js';

// Character states
export const CharacterState = {
  IDLE: 'idle',
  WALKING: 'walking',
  BLOCKED: 'blocked'
};

// Movement directions (in isometric grid terms)
// These are the 4 cardinal directions along tile edges
export const Direction = {
  // Increase col (move "right" in grid space, southeast in screen)
  EAST: { dcol: 1, drow: 0 },
  // Decrease col (move "left" in grid space, northwest in screen)
  WEST: { dcol: -1, drow: 0 },
  // Increase row (move "down" in grid space, southwest in screen)
  SOUTH: { dcol: 0, drow: 1 },
  // Decrease row (move "up" in grid space, northeast in screen)
  NORTH: { dcol: 0, drow: -1 }
};

export class CharacterService {
  /**
   * @param {import('./GameStateService.js').GameStateService} gameState
   * @param {import('./BuildingService.js').BuildingService} buildingService
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, buildingService, eventBus) {
    this._gameState = gameState;
    this._buildingService = buildingService;
    this._eventBus = eventBus;

    /**
     * Characters array
     * @type {Array<{
     *   id: string,
     *   col: number,
     *   row: number,
     *   targetCol: number,
     *   targetRow: number,
     *   path: Array<{col: number, row: number}>,
     *   state: string,
     *   progress: number,
     *   speed: number,
     *   facing: string,
     *   sprite: string
     * }>}
     */
    this._characters = [];
    this._nextId = 1;

    // Movement speed (grid units per second)
    this._defaultSpeed = 1.5;

    // Update interval for smooth movement (60 fps target)
    this._updateInterval = null;
    this._lastUpdateTime = 0;
  }

  /**
   * Initialize the service and start the update loop
   */
  initialize() {
    // Start update loop
    this._lastUpdateTime = performance.now();
    this._updateInterval = setInterval(() => this._update(), 1000 / 60);

    // Listen for game tick events for AI decision making
    this._eventBus.subscribe(Events.TICK, () => this._onTick());

    console.log('[CharacterService] Initialized');
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
    this._characters = [];
  }

  /**
   * Spawn a new character
   * @param {number} col - Starting column (grid intersection)
   * @param {number} row - Starting row (grid intersection)
   * @param {string} [sprite='peasant'] - Sprite type
   * @returns {string} Character ID
   */
  spawnCharacter(col, row, sprite = 'peasant') {
    const id = `char_${this._nextId++}`;
    const character = {
      id,
      col,
      row,
      targetCol: col,
      targetRow: row,
      path: [],
      state: CharacterState.IDLE,
      progress: 0,
      speed: this._defaultSpeed,
      facing: 'east', // Default facing direction
      sprite
    };

    this._characters.push(character);

    this._eventBus.publish('character:spawned', { character: { ...character } });

    console.log('[CharacterService] Spawned character:', id, 'at', col, row);

    return id;
  }

  /**
   * Remove a character
   * @param {string} id - Character ID
   */
  removeCharacter(id) {
    const index = this._characters.findIndex(c => c.id === id);
    if (index !== -1) {
      const character = this._characters.splice(index, 1)[0];
      this._eventBus.publish('character:removed', { id: character.id });
    }
  }

  /**
   * Get all characters
   * @returns {Array}
   */
  getCharacters() {
    return this._characters.map(c => ({ ...c }));
  }

  /**
   * Get a character by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getCharacter(id) {
    const char = this._characters.find(c => c.id === id);
    return char ? { ...char } : null;
  }

  /**
   * Command a character to move to a target position
   * @param {string} id - Character ID
   * @param {number} targetCol - Target column
   * @param {number} targetRow - Target row
   * @returns {boolean} True if path found
   */
  moveTo(id, targetCol, targetRow) {
    const character = this._characters.find(c => c.id === id);
    if (!character) return false;

    // Find path using A* along tile edges
    const path = this._findPath(
      character.col, character.row,
      targetCol, targetRow
    );

    if (path.length === 0) {
      // No valid path found
      character.state = CharacterState.BLOCKED;
      return false;
    }

    character.path = path;
    character.targetCol = targetCol;
    character.targetRow = targetRow;
    character.state = CharacterState.WALKING;
    character.progress = 0;

    return true;
  }

  /**
   * Set a random wander target for a character
   * @param {string} id - Character ID
   */
  wander(id) {
    const character = this._characters.find(c => c.id === id);
    if (!character) return;

    // Validate character position
    if (!Number.isFinite(character.col) || !Number.isFinite(character.row)) {
      console.warn('[CharacterService] Character has invalid position:', character);
      return;
    }

    const { cols, rows } = TILE_CONFIG;

    // Validate grid config
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) {
      console.warn('[CharacterService] Invalid TILE_CONFIG:', { cols, rows });
      return;
    }

    // Try a few random positions
    for (let i = 0; i < 10; i++) {
      const targetCol = Math.floor(Math.random() * (cols + 1));
      const targetRow = Math.floor(Math.random() * (rows + 1));

      // Don't pick current position
      if (targetCol === character.col && targetRow === character.row) continue;

      // Check if we can reach it
      if (this.moveTo(id, targetCol, targetRow)) {
        console.log('[CharacterService] Found path to', targetCol, targetRow);
        return;
      }
    }

    console.log('[CharacterService] No valid path found after 10 attempts');
    // Couldn't find a valid target, stay idle
    character.state = CharacterState.IDLE;
  }

  /**
   * Check if a grid edge can be traversed (not blocked by buildings)
   * @param {number} fromCol
   * @param {number} fromRow
   * @param {number} toCol
   * @param {number} toRow
   * @returns {boolean}
   */
  canTraverse(fromCol, fromRow, toCol, toRow) {
    // Check bounds - characters can walk on edges up to grid size
    const { cols, rows } = TILE_CONFIG;
    if (toCol < 0 || toCol > cols || toRow < 0 || toRow > rows) {
      // Only log once per pathfind attempt to avoid spam
      if (!this._loggedBoundsIssue) {
        console.log('[CharacterService] Out of bounds:', { fromCol, fromRow, toCol, toRow, cols, rows });
        this._loggedBoundsIssue = true;
      }
      return false;
    }
    this._loggedBoundsIssue = false;

    // Get the tiles adjacent to this edge
    // An edge between (col, row) and (col+1, row) borders tiles:
    // - (col, row-1) above the edge
    // - (col, row) below the edge (if row > 0)
    // Similar logic for vertical edges

    const buildings = this._gameState.getBuildings();

    // For horizontal movement (col changes, row stays same):
    // The edge runs along row, we need to check if buildings block it
    if (toCol !== fromCol) {
      // Moving east or west
      const minCol = Math.min(fromCol, toCol);
      // Check tiles above (row-1) and below (row) the edge
      for (const b of buildings) {
        // Building occupies from (b.col, b.row) to (b.col+1, b.row+1)
        // for a 2x2 footprint: (b.col to b.col+2, b.row to b.row+2)
        const bEndCol = b.col + BUILDING_FOOTPRINT;
        const bEndRow = b.row + BUILDING_FOOTPRINT;

        // The edge is at column=minCol to minCol+1, at row=fromRow
        // It's blocked if a building occupies both tiles on either side
        // More specifically, if the edge passes through a building's footprint

        // Check if the edge segment is within the building's column range
        if (minCol >= b.col && minCol < bEndCol) {
          // Check if the edge's row is within the building's interior
          // (not at its boundaries where we can walk around)
          if (fromRow > b.row && fromRow < bEndRow) {
            return false;
          }
        }
      }
    }

    // For vertical movement (row changes, col stays same):
    if (toRow !== fromRow) {
      const minRow = Math.min(fromRow, toRow);
      for (const b of buildings) {
        const bEndCol = b.col + BUILDING_FOOTPRINT;
        const bEndRow = b.row + BUILDING_FOOTPRINT;

        // Check if the edge segment is within the building's row range
        if (minRow >= b.row && minRow < bEndRow) {
          // Check if the edge's col is within the building's interior
          if (fromCol > b.col && fromCol < bEndCol) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Find a path using A* algorithm along tile edges
   * @param {number} startCol
   * @param {number} startRow
   * @param {number} endCol
   * @param {number} endRow
   * @returns {Array<{col: number, row: number}>} Path (empty if no path found)
   */
  _findPath(startCol, startRow, endCol, endRow) {
    // Validate inputs - return empty path if any are invalid
    if (!Number.isFinite(startCol) || !Number.isFinite(startRow) ||
        !Number.isFinite(endCol) || !Number.isFinite(endRow)) {
      console.warn('[CharacterService] Invalid path coordinates:', { startCol, startRow, endCol, endRow });
      return [];
    }

    // A* pathfinding on grid intersections
    const key = (col, row) => `${col},${row}`;

    const openSet = new Map();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = key(startCol, startRow);
    const endKey = key(endCol, endRow);

    gScore.set(startKey, 0);
    fScore.set(startKey, this._heuristic(startCol, startRow, endCol, endRow));
    openSet.set(startKey, { col: startCol, row: startRow });

    const directions = [
      { dcol: 1, drow: 0 },
      { dcol: -1, drow: 0 },
      { dcol: 0, drow: 1 },
      { dcol: 0, drow: -1 }
    ];

    while (openSet.size > 0) {
      // Get node with lowest fScore
      let currentKey = null;
      let currentF = Infinity;
      for (const [k, node] of openSet) {
        const f = fScore.get(k);
        if (typeof f === 'number' && !isNaN(f) && f < currentF) {
          currentF = f;
          currentKey = k;
        }
      }

      // No valid node found
      if (currentKey === null) {
        return [];
      }

      if (currentKey === endKey) {
        // Reconstruct path
        const path = [];
        let curr = currentKey;
        while (curr && curr !== startKey) {
          const [col, row] = curr.split(',').map(Number);
          path.unshift({ col, row });
          curr = cameFrom.get(curr);
        }
        return path;
      }

      const current = openSet.get(currentKey);
      openSet.delete(currentKey);
      closedSet.add(currentKey);

      // Check each neighbor
      for (const dir of directions) {
        const neighborCol = current.col + dir.dcol;
        const neighborRow = current.row + dir.drow;
        const neighborKey = key(neighborCol, neighborRow);

        if (closedSet.has(neighborKey)) continue;

        // Check if we can traverse this edge
        if (!this.canTraverse(current.col, current.row, neighborCol, neighborRow)) {
          continue;
        }

        const currentG = gScore.get(currentKey);
        const tentativeG = (currentG !== undefined ? currentG : Infinity) + 1;

        if (!openSet.has(neighborKey)) {
          openSet.set(neighborKey, { col: neighborCol, row: neighborRow });
        } else {
          const neighborG = gScore.get(neighborKey);
          if (tentativeG >= (neighborG !== undefined ? neighborG : Infinity)) {
            continue;
          }
        }

        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + this._heuristic(neighborCol, neighborRow, endCol, endRow));
      }
    }

    // No path found
    return [];
  }

  /**
   * Heuristic for A* (Manhattan distance)
   */
  _heuristic(col1, row1, col2, row2) {
    return Math.abs(col2 - col1) + Math.abs(row2 - row1);
  }

  /**
   * Main update loop for smooth movement
   */
  _update() {
    const now = performance.now();
    const dt = (now - this._lastUpdateTime) / 1000; // Delta time in seconds
    this._lastUpdateTime = now;

    let anyMoved = false;

    for (const character of this._characters) {
      if (character.state !== CharacterState.WALKING || character.path.length === 0) {
        continue;
      }

      // Move towards next waypoint
      const target = character.path[0];

      // Calculate direction
      const dcol = target.col - character.col;
      const drow = target.row - character.row;

      // Update facing direction
      if (dcol > 0) character.facing = 'east';
      else if (dcol < 0) character.facing = 'west';
      else if (drow > 0) character.facing = 'south';
      else if (drow < 0) character.facing = 'north';

      // Update progress
      character.progress += character.speed * dt;

      if (character.progress >= 1) {
        // Reached waypoint
        character.col = target.col;
        character.row = target.row;
        character.progress = 0;
        character.path.shift();

        if (character.path.length === 0) {
          // Reached final destination
          character.state = CharacterState.IDLE;
          this._eventBus.publish('character:arrived', {
            id: character.id,
            col: character.col,
            row: character.row
          });
        }
      }

      anyMoved = true;
    }

    if (anyMoved) {
      this._eventBus.publish('character:moved', {
        characters: this.getCharacters()
      });
    }
  }

  /**
   * Called on game tick for AI decisions
   */
  _onTick() {
    for (const character of this._characters) {
      // If idle, randomly decide to wander
      if (character.state === CharacterState.IDLE) {
        // 30% chance to start wandering each tick
        if (Math.random() < 0.3) {
          console.log('[CharacterService] Attempting to wander:', character.id);
          this.wander(character.id);
        }
      }
    }
  }

  /**
   * Get character's current interpolated position (for rendering)
   * @param {string} id - Character ID
   * @returns {{col: number, row: number}|null} Interpolated position
   */
  getInterpolatedPosition(id) {
    const character = this._characters.find(c => c.id === id);
    if (!character) return null;

    if (character.state !== CharacterState.WALKING || character.path.length === 0) {
      return { col: character.col, row: character.row };
    }

    const target = character.path[0];
    const progress = character.progress;

    return {
      col: character.col + (target.col - character.col) * progress,
      row: character.row + (target.row - character.row) * progress
    };
  }

  /**
   * Check if a character is behind any building
   * @param {string} id - Character ID
   * @returns {{isBehind: boolean, buildingIndex: number}} Behind status
   */
  isCharacterBehindBuilding(id) {
    const pos = this.getInterpolatedPosition(id);
    if (!pos) return { isBehind: false, buildingIndex: -1 };

    const character = this._characters.find(c => c.id === id);
    if (!character) return { isBehind: false, buildingIndex: -1 };

    const buildings = this._gameState.getBuildings();

    // Character z-index based on position (same formula as tiles/buildings)
    // Characters are rendered at their feet position
    const charZ = (pos.col + pos.row) * 10 + 50;

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      // Building z-index uses front corner
      const buildingZ = (b.col + BUILDING_FOOTPRINT + b.row + BUILDING_FOOTPRINT) * 10 + 100;

      // Character is behind if:
      // 1. Building has higher z-index (rendered later/in front)
      // 2. Character is within the building's screen area (roughly)
      if (buildingZ > charZ) {
        // Check if character is visually behind this building
        // Simple check: is character within the building's grid footprint extended area
        if (pos.col >= b.col - 0.5 && pos.col <= b.col + BUILDING_FOOTPRINT + 0.5 &&
            pos.row >= b.row - 0.5 && pos.row <= b.row + BUILDING_FOOTPRINT + 0.5) {
          return { isBehind: true, buildingIndex: i };
        }
      }
    }

    return { isBehind: false, buildingIndex: -1 };
  }
}
