/**
 * Unit Canvas Enhancements
 * Adds undo/redo, duplicate, and character assignment features
 */

export class UnitEnhancements {
    constructor(unitCanvas) {
        this.canvas = unitCanvas;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.characterPanel = null;
        
        this.initCharacterPanel();
    }
    
    /**
     * Save current state to history for undo
     */
    saveHistory() {
        // Clone the current army state
        const state = {
            units: JSON.parse(JSON.stringify(this.canvas.armyBuilder.army.units)),
            totalPoints: this.canvas.armyBuilder.army.totalPoints
        };
        
        // Remove any history after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    /**
     * Redo previously undone action
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    /**
     * Restore army state from history
     */
    restoreState(state) {
        // Clear current units
        this.canvas.armyBuilder.army.units = [];
        this.canvas.armyBuilder.unitElements.clear();
        this.canvas.canvas.innerHTML = '';
        
        // Restore units
        state.units.forEach(unitData => {
            this.canvas.armyBuilder.army.units.push(unitData);
            this.canvas.renderUnit(unitData);
        });
        
        // Update points and UI
        this.canvas.armyBuilder.army.totalPoints = state.totalPoints;
        this.canvas.armyBuilder.updatePointsDisplay();
        this.canvas.armyBuilder.updateUnitList();
        
        // Deselect any selected unit
        this.canvas.selectUnit(null);
    }
    
    /**
     * Duplicate the selected unit
     */
    duplicateUnit(unitId) {
        const unit = this.canvas.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        this.saveHistory();
        
        // Import UNIT_TYPES for cost calculation
        const unitType = this.canvas.armyBuilder.unitTypes[unit.type];
        
        // Create a new unit with same properties but offset position
        const newUnit = {
            ...unit,
            id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            position: {
                x: Math.min(unit.position.x + 30, this.canvas.canvas.offsetWidth - unit.formation.width),
                y: Math.min(unit.position.y + 30, this.canvas.canvas.offsetHeight - unit.formation.height)
            },
            name: `${unit.name} (Copy)`,
            general: null, // Don't copy character assignments
            soldiers: []
        };
        
        // Add the new unit
        this.canvas.armyBuilder.army.units.push(newUnit);
        this.canvas.armyBuilder.army.totalPoints += unit.soldierCount * unitType.costPerSoldier;
        
        // Render and select the new unit
        this.canvas.renderUnit(newUnit);
        this.canvas.selectUnit(newUnit.id);
        
        // Update UI
        this.canvas.armyBuilder.updatePointsDisplay();
        this.canvas.armyBuilder.updateUnitList();
    }
    
    /**
     * Initialize character assignment panel
     */
    initCharacterPanel() {
        // Create the panel element
        const panel = document.createElement('div');
        panel.className = 'character-panel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="character-panel-header">
                <h3>Assign Characters</h3>
                <button class="character-panel-close">×</button>
            </div>
            <div class="character-panel-content">
                <div class="character-search">
                    <input type="text" placeholder="Search characters..." class="character-search-input" />
                </div>
                <div class="character-roles">
                    <div class="character-role-section">
                        <h4>General</h4>
                        <div class="general-slot">
                            <div class="empty-slot">No general assigned</div>
                        </div>
                    </div>
                    <div class="character-role-section">
                        <h4>Soldiers</h4>
                        <div class="soldiers-list">
                            <div class="empty-slot">No soldiers assigned</div>
                        </div>
                    </div>
                </div>
                <div class="available-characters">
                    <h4>Available Characters</h4>
                    <div class="character-list">
                        <div class="loading">Characters will load from OnlyWorlds API...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.characterPanel = panel;
        
        // Close button handler
        panel.querySelector('.character-panel-close').addEventListener('click', () => {
            this.hideCharacterPanel();
        });
        
        // Search input handler
        const searchInput = panel.querySelector('.character-search-input');
        searchInput.addEventListener('input', (e) => {
            this.filterCharacters(e.target.value);
        });
    }
    
    /**
     * Show character panel for a unit
     */
    showCharacterPanel(unitId) {
        const unit = this.canvas.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        const unitElement = this.canvas.armyBuilder.unitElements.get(unitId);
        if (!unitElement) return;
        
        // Position panel near the unit
        const rect = unitElement.getBoundingClientRect();
        const panel = this.characterPanel;
        
        panel.style.display = 'block';
        panel.style.position = 'fixed';
        
        // Calculate optimal position
        const panelWidth = 320;
        const panelHeight = 400;
        
        // Try to position to the right of the unit
        let left = rect.right + 10;
        let top = rect.top;
        
        // Adjust if it would go off screen
        if (left + panelWidth > window.innerWidth) {
            left = rect.left - panelWidth - 10; // Show on left instead
        }
        if (top + panelHeight > window.innerHeight) {
            top = window.innerHeight - panelHeight - 10;
        }
        if (top < 10) {
            top = 10;
        }
        
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        
        // Store current unit context
        panel.dataset.unitId = unitId;
        
        // Update panel content for this unit
        this.updateCharacterPanel(unit);
    }
    
    /**
     * Hide character panel
     */
    hideCharacterPanel() {
        if (this.characterPanel) {
            this.characterPanel.style.display = 'none';
        }
    }
    
    /**
     * Update character panel content for a unit
     */
    updateCharacterPanel(unit) {
        const generalSlot = this.characterPanel.querySelector('.general-slot');
        const soldiersList = this.characterPanel.querySelector('.soldiers-list');
        
        // Update general slot
        if (unit.general) {
            generalSlot.innerHTML = `
                <div class="assigned-character">
                    <span class="character-icon">👑</span>
                    <span class="character-name">${unit.general.name}</span>
                    <button class="remove-character" data-role="general">×</button>
                </div>
            `;
        } else {
            generalSlot.innerHTML = '<div class="empty-slot">No general assigned</div>';
        }
        
        // Update soldiers list
        if (unit.soldiers && unit.soldiers.length > 0) {
            soldiersList.innerHTML = unit.soldiers.map(soldier => `
                <div class="assigned-character">
                    <span class="character-icon">⚔️</span>
                    <span class="character-name">${soldier.name}</span>
                    <button class="remove-character" data-role="soldier" data-character-id="${soldier.id}">×</button>
                </div>
            `).join('');
        } else {
            soldiersList.innerHTML = '<div class="empty-slot">No soldiers assigned</div>';
        }
        
        // Add remove handlers
        this.characterPanel.querySelectorAll('.remove-character').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const role = e.target.dataset.role;
                const characterId = e.target.dataset.characterId;
                this.removeCharacterFromUnit(unit.id, role, characterId);
            });
        });
    }
    
    /**
     * Remove character from unit
     */
    removeCharacterFromUnit(unitId, role, characterId) {
        const unit = this.canvas.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        this.saveHistory();
        
        if (role === 'general') {
            unit.general = null;
        } else if (role === 'soldier') {
            unit.soldiers = unit.soldiers.filter(s => s.id !== characterId);
        }
        
        // Update the display
        this.updateCharacterPanel(unit);
        this.updateUnitCharacterIndicators(unitId);
    }
    
    /**
     * Update character indicators on unit
     */
    updateUnitCharacterIndicators(unitId) {
        const unit = this.canvas.armyBuilder.army.units.find(u => u.id === unitId);
        const unitElement = this.canvas.armyBuilder.unitElements.get(unitId);
        if (!unit || !unitElement) return;
        
        // Remove existing indicators
        unitElement.querySelectorAll('.character-indicator').forEach(el => el.remove());
        
        // Add general indicator
        if (unit.general) {
            const generalIndicator = document.createElement('div');
            generalIndicator.className = 'character-indicator general-indicator';
            generalIndicator.innerHTML = '👑';
            generalIndicator.title = `General: ${unit.general.name}`;
            unitElement.appendChild(generalIndicator);
        }
        
        // Add soldier count indicator
        if (unit.soldiers && unit.soldiers.length > 0) {
            const soldierIndicator = document.createElement('div');
            soldierIndicator.className = 'character-indicator soldier-indicator';
            soldierIndicator.innerHTML = `⚔️ ${unit.soldiers.length}`;
            soldierIndicator.title = `${unit.soldiers.length} character${unit.soldiers.length > 1 ? 's' : ''}`;
            unitElement.appendChild(soldierIndicator);
        }
    }
    
    /**
     * Filter characters in the panel by search term
     */
    filterCharacters(searchTerm) {
        const characterElements = this.characterPanel.querySelectorAll('.character-list-item');
        const term = searchTerm.toLowerCase();
        
        characterElements.forEach(el => {
            const name = el.dataset.characterName?.toLowerCase() || '';
            const visible = !term || name.includes(term);
            el.style.display = visible ? 'block' : 'none';
        });
    }
    
    /**
     * Add duplicate button to existing icon buttons
     */
    addDuplicateButton(buttonContainer, unitId) {
        // Add duplicate button after copy button
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'unit-icon-btn duplicate';
        duplicateBtn.innerHTML = '➕';
        duplicateBtn.title = 'Duplicate unit (Ctrl+D)';
        duplicateBtn.onclick = (e) => {
            e.stopPropagation();
            this.duplicateUnit(unitId);
        };
        
        // Insert after first button
        const firstBtn = buttonContainer.children[0];
        if (firstBtn) {
            buttonContainer.insertBefore(duplicateBtn, firstBtn.nextSibling);
        } else {
            buttonContainer.appendChild(duplicateBtn);
        }
    }
}

export default UnitEnhancements;