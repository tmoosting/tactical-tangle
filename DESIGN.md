# Tactical Tangle - OnlyWorlds Showcase Tool (v3)

## Overview
A lightweight ancient Greek warfare simulation demonstrating OnlyWorlds character integration. Block-based armies where OnlyWorlds characters become generals and soldiers, making tactical decisions through LLM-driven personality systems based on modern scholarship of fluid, combined-arms Greek warfare.

## Purpose
1. **Showcase tool** for "My First Tool" documentation guide
2. **Demonstrate** OnlyWorlds character fields driving gameplay
3. **Lightweight example** of game-tool integration  
4. **Clean, educational codebase** for developers

## Technical Stack

### Current: Army Setup Phase
- **Vanilla JavaScript**: No framework dependencies
- **DOM-based Canvas**: HTML elements for drag and drop
- **CSS Styling**: Visual unit representation
- **LocalStorage**: State persistence between pages
- **Existing Template Code**: Auth, API, import-export

### Future: Battle Simulation
- **LittleJS**: Ultra-lightweight game engine (no dependencies, handles 100k+ sprites at 60fps)
- **Matter.js**: Physics engine (~87KB) providing:
  - Collision detection with categories/masks for unit types
  - Force-based directional movement for formations
  - Collision events for combat resolution
  - Fixed timestep for consistent simulation
- **Deployment**: Direct GitHub Pages hosting
- **Total size**: ~100KB framework code

### LLM Integration
- **OpenAI Responses API** (2025 replacement for deprecated Assistants API)
  - Model options: GPT-4o, GPT-4o-mini, GPT-5
  - Client-side API calls with user-provided keys
  - Thread-based persistence for character memory/dialogue
  - Production option: Shared API key with token rating limits
- **Thread Architecture**:
  - Individual character threads (memories, inner thoughts, dialogue)
  - Unit-level threads (what's happening in each block)
  - Battle-level thread (overall context all characters can access)
- **Instructions**: `.env` file for OpenAI API key storage
- **Config files**: `config/prompts/` directory for system prompts

## Architecture

### Current Implementation
```
tactical-tangle/
├── index.html              # Authentication & main menu
├── player-setup.html       # Battle configuration screen
├── army-setup.html         # Army builder interface
├── js/
│   ├── auth.js            # (From template) API authentication
│   ├── api.js             # (From template) OnlyWorlds API
│   ├── import-export.js   # (From template) JSON handling
│   ├── battle-config.js   # Battle state management
│   ├── army-builder.js    # Unit creation and management
│   ├── unit-canvas.js     # Drag/drop positioning
│   └── constants/
│       └── units.js       # Unit types, costs, limits
├── css/
│   └── styles.css         # (From template) Base styles
│   └── army-setup.css     # Army builder specific styles
└── assets/
    └── (empty for now)    # Future: icons, sounds

### Future Architecture
├── battle.html            # Battle simulation page
├── js/
│   ├── game.js           # Core game loop
│   ├── physics.js        # Matter.js integration
│   ├── ai/
│   │   ├── general.js    # Character AI
│   │   └── unit-ai.js    # Unit behavior
│   └── config/
│       └── prompts/      # LLM prompts
```

### Template Tool Integration
Reusing from the existing OnlyWorlds template tool:
- **API authentication**: `API-Key` and `API-Pin` headers via AuthManager
- **Data loading**: OnlyWorldsAPI class for element fetching
- **JSON handling**: ImportExportManager with import capability added
- **World ID**: Default to specific world (TBD) for showcase
- **UUIDv7 generation**: For any new elements created

### Data Flow
1. **Setup Phase**: Army composition (Current Focus)
   - Player configuration (names, point limits, circumstances)
   - Load OnlyWorlds characters via API or JSON import
   - Create units with point costs
   - Drag to position on battlefield canvas
   - Resize units to adjust soldier count
   - Assign characters as generals or soldiers
   - Export/import army configurations

2. **Battle Phase**: Physics simulation (Future)
   - Initialize Matter.js bodies for each unit
   - Run 60fps physics simulation
   - Process AI decisions (initially without LLM)
   - Display combat results

## Game Design

### Visual Style
- **Unit Blocks**: Colored shapes representing formations
  - **Hoplites**: Rectangles (bronze color)
  - **Light Infantry**: Hexagons (tan color)
  - **Cavalry**: Pentagons (dark brown color)
  - Size proportional to soldier count (20-800 per unit)
- **Characters**: Distinguished within blocks
  - Generals: Larger icon with name label
  - Officers: Medium icon with role indicator
  - Position tracking: 3x3 grid within each block
- **Battlefield**: Subtle grid, minimal terrain features
- **UI Elements**: 
  - Left panel: Army composition
  - Right panel: Battle log with dialogue
  - Top: Phase indicator and controls

### Unit Terminology
- **Unit**: A formation of soldiers (20-800 men)
- **Unit Type**: Light Infantry, Hoplite, or Cavalry
- **Army**: Collection of units (max 40 units, 1000 points default)
- **General**: Character commanding a unit (max 1 per unit)
- **Soldiers**: Mix of OnlyWorlds characters and anonymous fighters
- **Hierarchy**: Numeric rank (1-40) for general command priority

### Battle Mechanics
- **Movement**: Matter.js forces for directional movement
- **Formation cohesion**: Collision filters by block ID
- **Combat**: Proximity-triggered engagement
- **Othismos**: Both literal pushing (physics) and metaphorical pressure (morale)
- **Morale**: Affects block cohesion and rout threshold
- **Command radius**: General/officer influence range
- **Rigid collisions**: Blocks cannot overlap initially

### Classical Combat Model
Single mode based on modern scholarship:
- **Fluid warfare**: Dynamic movement, not rigid scrums
- **Combined arms**: All three unit types essential
- **Limited training**: Most armies poorly drilled
- **Maximum violence**: Intent to destroy enemy forces
- **Realistic othismos**: Both pushing match and general pressure

## LLM Architecture

### Thread Hierarchy
```javascript
// Character thread - individual memories and personality
const characterThread = {
  id: `char_${character.id}`,
  messages: [], // Character's experiences
  metadata: { character_id, name, personality }
}

// Unit thread - what's happening in this block
const unitThread = {
  id: `unit_${block.id}`,
  messages: [], // Block-level events
  metadata: { block_id, unit_type, characters: [...] }
}

// Battle thread - overall context
const battleThread = {
  id: `battle_${battle.id}`,
  messages: [], // Major battle events
  metadata: { phase, armies, terrain }
}
```

### Orchestrator Context
```javascript
{
  phase: "approach|engagement|rout",
  terrain: { type: "plain", features: [] },
  weather: "clear",
  armies: [
    { side: "red", blocks: 5, casualties: 0, morale: 100 }
  ],
  events: ["Cavalry flanking attempt", "Phalanx clash"],
  threads: {
    battle: battleThread.id,
    units: activeUnitThreads
  }
}
// Returns: phase changes, environmental effects, victory conditions
```

### Character Agent Context  
```javascript
{
  character: {
    name: "Alexios",
    // The 6 C personality fields from OnlyWorlds
    courage: "Brave but cautious",
    compassion: "Harsh to enemies",
    charisma: "Natural leader",
    creativity: "Orthodox tactician",
    curiosity: "Studies opponent",
    caution: "Protects flanks",
    // Additional OnlyWorlds data
    abilities: ["Rally", "Shield Wall"],
    traits: ["Veteran", "Disciplined"],
    relations: ["Rival: Nikias", "Friend: Lysander"],
    objects: ["Bronze Spear", "Crested Helm"]
  },
  position: {
    block_id: "block_1",
    location: "front-center", // 3x3 grid position
    role: "general|officer|soldier"
  },
  battlefield_context: {
    block_status: { morale: 85, cohesion: 0.9 },
    nearby_threats: [...],
    opportunities: [...]
  },
  threads: {
    character: characterThread.id,
    unit: unitThread.id,
    battle: battleThread.id
  }
}
// Returns: tactical decisions, battle cries, morale effects
```

### Unit Agent Context (Middle Layer)
```javascript
{
  block: {
    id: "block_1",
    type: "hoplite",
    size: 120,
    formation: "phalanx",
    characters: [
      { id, name, role, position }
    ]
  },
  status: {
    morale: 85,
    cohesion: 0.9,
    casualties: 5,
    engaged: true
  },
  surroundings: {
    adjacent_blocks: [...],
    enemy_contacts: [...],
    terrain: "level"
  },
  threads: {
    unit: unitThread.id,
    battle: battleThread.id
  }
}
// Returns: formation adjustments, collective actions
```

### Mass Behavior Context
```javascript
{
  block_id: "block_1",
  soldier_group: "rear-ranks",
  morale: 85,
  density: 0.8, // Formation tightness
  leadership: {
    general_present: false,
    officer_present: true,
    command_strength: 0.7
  },
  threats: [{ type: "cavalry", distance: 50, direction: "left" }]
}
// Returns: individual soldier behaviors, panic/rally responses
```

## OnlyWorlds Integration

### Character Schema (Full Load)
All character fields loaded, with emphasis on:
- **Core Fields**: id, name, description
- **Personality (6 Cs)**: courage, compassion, charisma, creativity, curiosity, caution
- **Combat Modifiers**: abilities, traits, objects
- **Relationships**: relations (affect pre-battle dialogue)
- **Extended Fields**: Any additional character fields

### Related Elements
- **Abilities**: Special actions characters can take
- **Traits**: Passive modifiers to behavior
- **Objects**: Equipment affecting combat
- **Locations**: Future - battlefield advantages

### Data Loading
```javascript
// Using template tool's API service
import OnlyWorldsAPI from './onlyworlds/api.js';
import AuthManager from './onlyworlds/auth.js';

const auth = new AuthManager();
await auth.authenticate(apiKey, apiPin);

const api = new OnlyWorldsAPI(auth);
const characters = await api.getElements('character');
const abilities = await api.getElements('ability');
const traits = await api.getElements('trait');
const objects = await api.getElements('object');

// JSON import as fallback
const importManager = new ImportExportManager(api);
const worldData = await importManager.importJSON(file);
```

## Development Phases (Updated)

### Phase 1: Army Setup UI (COMPLETED ✅)
Implementation broken into 4 milestones:

#### Milestone 1: Foundation (DONE)
1. ✅ Create player-setup.html with battle configuration
2. ✅ Create battle-config.js service for state management
3. ✅ Create army-setup.html skeleton with navigation
4. ✅ Wire up page flow with URL parameters
**Delivered**: Navigate between pages with state preserved

#### Milestone 2: Unit System (DONE)
1. ✅ Create unit constants (types, costs, limits)
2. ✅ Implement army-builder.js with unit logic
3. ✅ Create unit-canvas.js for drag/drop positioning
4. ✅ Style units with CSS (colored shapes)
5. ✅ Icon buttons for unit management
6. ✅ Keyboard shortcuts (Delete, ESC)
**Delivered**: Spawn, drag, resize units with smart controls

#### Milestone 3: Character Integration (Ready to Start)
1. ⏳ Load OnlyWorlds characters via API
2. ⏳ Create unit detail panel for configuration
3. ⏳ Implement character selector with search
4. ⏳ Update unit display with assignments
**Next Deliverable**: Assign characters to units

#### Milestone 4: Polish & Export (Partially Done)
1. ✅ Points tracking with flexible limits
2. ⏳ Army export/import as JSON
3. ✅ Visual polish (shapes, labels, colors)
4. ⏳ Battle handoff preparation
**Status**: Core polish done, export pending

### Phase 2: Battle Simulation (Future)
1. LittleJS + Matter.js physics setup
2. Unit movement and formations
3. Combat mechanics and collisions
4. Basic AI without LLM

### Phase 3: LLM Integration (Future)
1. OpenAI API integration
2. Character personality-driven decisions
3. Battle dialogue and events
4. Thread management system

### Phase 4: Polish & Documentation (Future)
1. Visual improvements
2. Sound effects
3. Tutorial mode
4. Complete "My First Tool" guide

## Historical Accuracy

### Knowledge Base System
- Parse and organize Greek warfare sources
- Create structured knowledge files in `config/knowledge/`
- Orchestrator references this for authentic battle flow
- Balance accuracy with gameplay clarity

### Modern Scholarship Integration
- **Fluid warfare**: Dynamic movement patterns
- **Combined arms**: All unit types interact meaningfully
- **Training levels**: Affects formation cohesion
- **Violence focus**: Combat aims to break enemy
- **Othismos interpretation**: Both physical and psychological

### Sources
- University essay on hoplite warfare debates
- Konijnendijk's work on Greek tactics
- Tactical Tagle Unity game patterns
- Ancient Sicily research documents

## Documentation Plan

### "My First Tool" Guide Sections
1. **Setup** (30 min)
   - Fork template repository
   - Configure GitHub Pages
   - Set OpenAI API key
   - Basic file structure

2. **Data Integration** (45 min)
   - Load OnlyWorlds world
   - Display character cards
   - Map character fields
   - Import/export JSON

3. **Game Mechanics** (60 min)
   - Add Matter.js physics
   - Implement unit blocks
   - Create battle rules
   - Position tracking

4. **AI Enhancement** (45 min)
   - Connect OpenAI API
   - Thread management
   - Decision prompts
   - Generate dialogue

5. **Deployment** (15 min)
   - Publish to GitHub Pages
   - Share and test
   - Token rating setup

## Production Features

### Token Rating Integration
From parse tool implementation:
- Users earn tokens for world contributions
- Limited LLM calls based on token balance
- Shared production API key for showcase
- Graceful degradation without tokens

### API Management
```javascript
// Queue system for batch processing
class LLMQueue {
  constructor(batchSize = 5, delayMs = 1000) {
    this.queue = [];
    this.batchSize = batchSize;
    this.delay = delayMs;
  }
  
  async processBatch() {
    const batch = this.queue.splice(0, this.batchSize);
    const promises = batch.map(item => 
      this.callOpenAI(item.context, item.thread)
    );
    await Promise.all(promises);
    if (this.queue.length > 0) {
      setTimeout(() => this.processBatch(), this.delay);
    }
  }
}
```

## Nice For Later (NFL) Features

1. **Multiplayer**: Shared screen, dual-world import
2. **Save Results**: Export battles as OnlyWorlds events/narratives  
3. **Mobile Responsive**: Touch controls and responsive layout
4. **Advanced Tactics**: Terrain effects, weather, supply lines
5. **Voice**: Character speech via TTS
6. **Replay System**: Record and replay battles
7. **Campaign Mode**: Sequential battles with persistence
8. **Soft Collisions**: Fluid combat interpenetration
9. **3D Visualization**: Three.js upgrade option

## Remaining Questions

1. **Default World Selection**: Which world ID for showcase? Consider creating custom ancient world?
// 0000000000 for default demo wold
2. **Token Rating Details**: Copy exact implementation from parse tool or simplified version?
// simplified is fine, will provide info later
3. **Greek Context Balance**: How much historical detail in prompts vs letting LLM improvise?
// will specify later 
4. **Performance Targets**: Maximum blocks/characters before switching to WebWorkers?
// will need to test and see
5. **Screenshot Workflow**: Automated capture or manual checkpoints?
// i do this manually, we write the doc as we go along
## Next Steps

1. Fork tool-template repository
2. Set up development environment
3. Create initial file structure
4. Begin Phase 1: Setup UI
5. Start documentation screenshots

---

*A showcase that teaches developers while demonstrating OnlyWorlds' power through the lens of dynamic ancient warfare.*