# Tactical Tangle

⚔️ **Ancient Greek Warfare with OnlyWorlds Characters**

A lightweight battle simulation game that brings your OnlyWorlds characters to life as generals and soldiers in ancient Greek warfare. Built as a showcase tool demonstrating OnlyWorlds integration.

## 🎮 Overview

Tactical Tangle lets you:
- Import characters from your OnlyWorlds world
- Build armies with three unit types (light infantry, hoplites, cavalry)
- Assign characters as generals or soldiers within units
- Position and configure armies on the battlefield
- Watch battles unfold with physics-based combat (coming soon)

## 🚀 Quick Start

### Play Online
Visit: [Coming Soon - GitHub Pages URL]

### Run Locally
```bash
python start.py
# or
python3 start.py
```
Then open http://localhost:8080

## 🎯 Features

### Core Features
- **OnlyWorlds Integration** - Load characters from your world via API or JSON import
- **Army Builder** - Design armies with point-based unit creation
- **Unit System** - Light infantry (1pt), Hoplites (2pt), Cavalry (4pt) per soldier
- **Drag & Drop** - Position units on battlefield with collision detection
- **Resize Units** - Drag corners to change unit size and soldier count
- **Character Assignment** - Assign OnlyWorlds characters as generals or soldiers
- **Export/Import** - Save and share army configurations as JSON

### Latest Enhancements (September 2025)
- **Unit Shapes** - Hexagon (light infantry), Pentagon (cavalry), Rectangle (hoplites)
- **Smart Controls** - Icon buttons on selected units:
  - Copy shape to all units of same type
  - Align units horizontally
  - Set as default spawn template
- **Keyboard Shortcuts**:
  - `Delete` - Remove selected unit
  - `ESC` - Deselect current unit
- **Flexible Points** - Can exceed point limits (visual warning)
- **Improved Labels** - Soldier count inside units, names below
- **Centered Spawning** - Units now spawn in battlefield center instead of corner
- **Character Tooltips** - Hover over badges to see general/soldier names
- **Inline Name Editing** - Click unit names to edit them directly
- **Player Intelligence** - Player 2 can see Player 1's army point total
- **Enhanced Character Management** - Improved assignment/unassignment flow
- **Authentication Persistence** - Credentials saved across page navigation

## 🛠️ Technology

- **Vanilla JavaScript** - No framework dependencies for the army builder
- **DOM-based Canvas** - Simple drag and drop with HTML elements
- **OnlyWorlds API** - Character and world data integration
- **Future**: LittleJS + Matter.js for battle simulation
- **Future**: OpenAI API for AI-driven character decisions

## 📖 Documentation

See [DESIGN.md](DESIGN.md) for complete architecture and development notes.

This tool is being built alongside the [My First Tool](https://onlyworlds.github.io/docs/developer-support/my-first-tool.html) guide.

## 🎮 How to Play

### Setup Phase
1. **Connect**: Enter your OnlyWorlds API credentials
2. **Configure Battle**: Set player names and army point limits (default 1000)
3. **Build Army**: 
   - Spawn units with point costs
   - Drag to position on battlefield
   - Resize to adjust soldier count
   - Click units to assign characters
4. **Switch Players**: Second player builds their army
5. **Start Battle**: Proceed to simulation (coming soon)

### Unit Types
- **Light Infantry**: 1 point per soldier (20-400 soldiers per unit)
- **Hoplites**: 2 points per soldier (40-800 soldiers per unit)  
- **Cavalry**: 4 points per soldier (20-200 soldiers per unit)

## 🔑 OnlyWorlds Setup

1. Get your API credentials from [onlyworlds.com](https://www.onlyworlds.com)
2. Enter your API Key (10 digits) and PIN (4 digits)
3. Your world and characters will load automatically
4. Characters can be assigned as generals (1 per unit) or soldiers (unlimited)

## 🏛️ Historical Context

Based on modern scholarship of Greek warfare, featuring:
- Fluid combat dynamics (not rigid phalanx-only)
- Combined arms tactics (hoplites, peltasts, cavalry)
- Realistic morale and routing
- Both physical and psychological pressure (othismos)

## 🤝 Contributing

This is a showcase/educational tool. Feel free to fork and create your own version!

## 📄 License

MIT License - Free to use and modify

## 🙏 Credits

- Built on the [OnlyWorlds Tool Template](https://github.com/OnlyWorlds/tool-template)
- Part of the [OnlyWorlds](https://www.onlyworlds.com) ecosystem
- Created for the OnlyWorlds developer community

---

*Currently in development - Follow progress in the [My First Tool guide](https://onlyworlds.github.io/docs/developer-support/my-first-tool.html)*