# Implementation Plan: Milestone G - Collection System + Villagers

## Design Decisions (Confirmed)
- **Click building to spawn drops** - Player clicks "Ready!" building to spawn drop entities
- **Use existing peasants** - Extend current CharacterService for villager behavior
- **Processors only** - Only cycle-based buildings spawn drops, not continuous producers

---

## Phase 1: Drops (Manual Collection)

### G1.1 - Modify ProcessorService for Output Buffering

**File:** `src/services/ProcessorService.js`

**Changes:**
1. Add `bufferedOutputs` and `ready` fields to processor state
2. Modify `_advanceCycle()` to buffer outputs instead of calling `applyProduction()`
3. Add methods: `getBufferedOutputs()`, `isReady()`, `clearBuffer()`, `getReadyProcessors()`
4. Update `exportState()`/`importState()` to include buffer data

---

### G1.2 - Create DropService

**New File:** `src/services/DropService.js`

Drop entity structure:
```javascript
{
  id: string,               // "drop_1", "drop_2", etc.
  resourceId: string,       // "wheat", "flour", etc.
  amount: number,           // Resource amount
  gridX: number,            // Grid position X (scattered from building)
  gridY: number,            // Grid position Y
  sourceBuildingIndex: number,
  spawnedAt: timestamp,
  reservedBy: string|null   // Villager ID if reserved
}
```

Key methods:
- `spawnFromBuilding(buildingIndex)` - Clear buffer, create drop entities scattered around building
- `collectDrop(dropId)` - Add resources to inventory (partial if storage full)
- `getDrops()`, `getDrop()`, `findNearestDrop()`
- `reserveDrop()`, `releaseDrop()` - For villager coordination
- `exportState()`, `importState()` - Persistence

---

### G1.3 - Create DropRenderer

**New File:** `src/renderers/DropRenderer.js`

Features:
- Render drops as resource icons with amount badges
- Click-to-collect interaction
- Spawn pop animation (scale + bounce)
- Idle bobbing animation
- Hover highlight effect
- Collection animation (scale up + fade out)

---

### G1.4 - "Ready!" Badge on Buildings

**Modify:** `src/renderers/BuildingRenderer.js`
- Add `.ready-badge` element to building slots

**Modify:** Building click handler in `main.js`
- Check `processorService.isReady(index)` before other actions
- Call `dropService.spawnFromBuilding(index)` to spawn drops

---

## Phase 2: Villagers (Automation)

### G2.1 - Extend CharacterService with Villager States

**Modify:** `src/services/CharacterService.js`

New states:
```javascript
CharacterState = {
  IDLE, WALKING, BLOCKED,
  MOVING_TO_DROP,  // Heading to collect drop
  PICKING_UP,      // At drop, collecting
  DELIVERING,      // Carrying to storage
  DEPOSITING,      // At storage, depositing
  BLOCKED_FULL     // Storage full, waiting
}
```

Extended character data:
```javascript
{
  ...existing,
  isVillager: boolean,
  carryData: { resourceId, amount } | null,
  targetDropId: string | null,
  targetBuildingIndex: number | null
}
```

New methods:
- `assignToCollect(characterId, dropId)`
- `pickUpDrop(characterId)`
- `depositResources(characterId)`
- `_findStorageBuildings()` - Returns Town Hall and Barns

---

### G2.2 - Villager AI Loop

In `_onTick()`:
1. **IDLE** → Find nearest unreserved drop → `assignToCollect()`
2. **MOVING_TO_DROP** → When arrived → `pickUpDrop()`
3. **DELIVERING** → When arrived at storage → `depositResources()`
4. **BLOCKED_FULL** → Wait for storage space → retry delivery

---

### G2.3 - Storage Buildings as Deposit Targets

Storage nodes (valid deposit targets):
- Town Hall
- Barn

---

### G2.4 - House Building for Villager Count

**Modify:** `src/config/buildings.config.js`

```javascript
house: {
  name: 'House',
  baseCost: { gold: 50, wood: 20 },
  villagerCapacity: 1,
  upgrades: [
    { cost: { gold: 100, wood: 30 }, villagerCapacity: 2 },
    { cost: { gold: 250, wood: 50 }, villagerCapacity: 3 },
  ]
}
```

**New File:** `src/services/VillagerPopulationService.js`
- `getMaxVillagers()` - Base cap + house capacity
- `canSpawnVillager()`, `trySpawnVillager()`

---

## Phase 3: Polish

- **Drop spawn animation:** Pop out with scale + bounce
- **Carry icon:** Resource emoji above villager head when carrying
- **Deposit effect:** Particle/flash when depositing at storage

---

## Files Summary

### New Files
1. `src/services/DropService.js`
2. `src/renderers/DropRenderer.js`
3. `src/services/VillagerPopulationService.js` (Phase 2)

### Modified Files
1. `src/services/ProcessorService.js` - Buffer outputs
2. `src/services/CharacterService.js` - Villager states/AI
3. `src/renderers/BuildingRenderer.js` - Ready badge
4. `src/renderers/CharacterRenderer.js` - Carry icon
5. `src/main.js` - Register services, building click handler
6. `src/core/GameController.js` - Initialize drop system
7. `src/core/EventBus.js` - New event types
8. `src/services/SaveLoadService.js` - Drop persistence
9. `src/config/buildings.config.js` - House building
10. `styles/components.css` - Drop and badge styles

---

## Implementation Order

### Phase 1 (Foundation)
1. Modify ProcessorService for buffering
2. Create DropService
3. Create DropRenderer
4. Add Ready badge to buildings
5. Wire building click → spawn drops
6. Add CSS styles
7. Test manual collection loop

### Phase 2 (Automation)
8. Extend CharacterService with villager states
9. Implement villager AI loop
10. Add House building
11. Create VillagerPopulationService
12. Add carry icon to CharacterRenderer
13. Test autonomous collection

### Phase 3 (Polish)
14. Refine animations
15. Add sound effects (optional)
16. Balance tuning
