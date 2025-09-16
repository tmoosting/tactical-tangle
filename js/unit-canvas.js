/**
 * Unit Canvas Module
 * Handles unit visualization, drag/drop, and resizing on the battlefield
 */

import { UNIT_TYPES, getUnitVisualSize } from './constants/units.js';

export class UnitCanvas {
    constructor(canvasElement, armyBuilder) {
        this.canvas = canvasElement;
        this.armyBuilder = armyBuilder;
        this.selectedUnit = null;
        this.dragState = null;
        this.resizeState = null;
        this.defaultSpawnSettings = {}; // Store default spawn settings per unit type
        
        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Character panel
        this.characterPanel = null;
        this.availableCharacters = []; // Store loaded characters
        
        this.initEventListeners();
        this.initKeyboardListeners();
        this.initCharacterPanel();
        this.loadCharacters(); // Load characters on initialization
    }
    
    /**
     * Create DOM element for a unit
     */
    createUnitElement(unit) {
        const unitType = UNIT_TYPES[unit.type];
        const size = getUnitVisualSize(unit.formation);
        
        // Create wrapper element that won't be clipped
        const wrapper = document.createElement('div');
        wrapper.className = 'unit-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.left = unit.position.x + 'px';
        wrapper.style.top = unit.position.y + 'px';
        wrapper.style.width = size.width + 'px';
        wrapper.style.height = size.height + 'px';
        wrapper.dataset.unitId = unit.id;
        
        // Create the actual unit element with shape
        const element = document.createElement('div');
        element.className = `unit unit-${unit.type}`;
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.position = 'relative';
        
        // Set background and shape
        this.applyUnitShape(element, unit.type);
        
        // Add soldier count inside the unit
        const soldierCount = document.createElement('div');
        soldierCount.className = 'unit-soldier-count';
        soldierCount.textContent = unit.soldierCount;
        element.appendChild(soldierCount);
        
        // Add unit name below the wrapper (outside clip-path)
        const nameLabel = document.createElement('div');
        nameLabel.className = 'unit-name-label';
        nameLabel.textContent = unit.name;
        nameLabel.title = 'Click to edit unit name';
        nameLabel.style.cursor = 'pointer';
        
        // Add click handler for name editing
        nameLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editUnitName(unit.id, nameLabel);
        });
        
        // Add resize handles to wrapper
        this.addResizeHandles(wrapper);
        
        // Add icon buttons to wrapper
        this.addIconButtons(wrapper, unit);
        
        // Assemble the structure
        wrapper.appendChild(element);
        wrapper.appendChild(nameLabel);
        
        // Store reference to wrapper
        this.armyBuilder.unitElements.set(unit.id, wrapper);
        
        return wrapper;
    }
    
    /**
     * Add resize handles to unit element
     */
    addResizeHandles(element) {
        const corners = ['nw', 'ne', 'sw', 'se'];
        corners.forEach(corner => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-${corner}`;
            handle.dataset.corner = corner;
            element.appendChild(handle);
        });
    }
    
    /**
     * Render a unit on the canvas
     */
    renderUnit(unit) {
        // Remove existing element if present
        if (this.armyBuilder.unitElements.has(unit.id)) {
            const oldElement = this.armyBuilder.unitElements.get(unit.id);
            oldElement.remove();
        }
        
        // Create and add new wrapper element
        const wrapper = this.createUnitElement(unit);
        this.canvas.appendChild(wrapper);
    }
    
    /**
     * Render all units
     */
    renderAllUnits() {
        // Clear canvas
        this.canvas.innerHTML = '';
        this.armyBuilder.unitElements.clear();
        
        // Render each unit
        for (const unit of this.armyBuilder.army.units) {
            this.renderUnit(unit);
        }
    }
    
    /**
     * Update unit element after changes
     */
    updateUnitElement(unitId) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        const wrapper = this.armyBuilder.unitElements.get(unitId);
        if (!wrapper) return;
        
        const size = getUnitVisualSize(unit.formation);
        
        // Update wrapper position and size
        wrapper.style.left = unit.position.x + 'px';
        wrapper.style.top = unit.position.y + 'px';
        wrapper.style.width = size.width + 'px';
        wrapper.style.height = size.height + 'px';
        
        // Reapply shape to inner unit element
        const unitElement = wrapper.querySelector('.unit');
        if (unitElement) {
            this.applyUnitShape(unitElement, unit.type);
        }
        
        // Update soldier count
        const soldierCount = wrapper.querySelector('.unit-soldier-count');
        if (soldierCount) {
            soldierCount.textContent = unit.soldierCount;
        }
        
        // Update name label
        const nameLabel = wrapper.querySelector('.unit-name-label');
        if (nameLabel) {
            nameLabel.textContent = unit.name;
        }
    }
    
    /**
     * Select a unit
     */
    selectUnit(unitId) {
        // Hide previous unit's selection
        if (this.selectedUnit) {
            const prevElement = this.armyBuilder.unitElements.get(this.selectedUnit);
            if (prevElement) {
                prevElement.classList.remove('selected');
            }
        }
        
        // Select new unit
        this.selectedUnit = unitId;
        if (unitId) {
            const element = this.armyBuilder.unitElements.get(unitId);
            if (element) {
                element.classList.add('selected');
            }
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Unit selection and drag start
        this.canvas.addEventListener('mousedown', (e) => {
            const unitWrapper = e.target.closest('.unit-wrapper');
            const resizeHandle = e.target.closest('.resize-handle');
            
            if (resizeHandle && unitWrapper) {
                // Start resize
                this.startResize(e, unitWrapper, resizeHandle);
            } else if (unitWrapper) {
                // Start drag
                this.startDrag(e, unitWrapper);
            } else {
                // Deselect
                this.selectUnit(null);
            }
        });
        
        // Drag/resize movement
        document.addEventListener('mousemove', (e) => {
            if (this.dragState) {
                this.handleDrag(e);
            } else if (this.resizeState) {
                this.handleResize(e);
            }
        });
        
        // Drag/resize end
        document.addEventListener('mouseup', (e) => {
            if (this.dragState) {
                this.endDrag(e);
            } else if (this.resizeState) {
                this.endResize(e);
            }
        });
        
        // Prevent text selection during drag
        this.canvas.addEventListener('selectstart', (e) => {
            if (this.dragState || this.resizeState) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Start dragging a unit
     */
    startDrag(e, wrapperElement) {
        // Save history before drag
        if (!this.dragState) {
            this.saveHistory();
        }
        
        const unitId = wrapperElement.dataset.unitId;
        this.selectUnit(unitId);
        
        const rect = wrapperElement.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.dragState = {
            unitId: unitId,
            element: wrapperElement,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            canvasLeft: canvasRect.left,
            canvasTop: canvasRect.top,
            originalPosition: {
                x: parseInt(wrapperElement.style.left),
                y: parseInt(wrapperElement.style.top)
            }
        };
        
        wrapperElement.style.cursor = 'grabbing';
        wrapperElement.style.zIndex = '1000';
    }
    
    /**
     * Handle drag movement
     */
    handleDrag(e) {
        if (!this.dragState) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        let newX = e.clientX - canvasRect.left - this.dragState.offsetX;
        let newY = e.clientY - canvasRect.top - this.dragState.offsetY;
        
        // Constrain to canvas bounds
        const elementWidth = this.dragState.element.offsetWidth;
        const elementHeight = this.dragState.element.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, canvasRect.width - elementWidth));
        newY = Math.max(0, Math.min(newY, canvasRect.height - elementHeight));
        
        // Check collision
        const validation = this.armyBuilder.validatePlacement(
            this.dragState.unitId,
            { x: newX, y: newY }
        );
        
        // Update visual position (show collision with red outline)
        this.dragState.element.style.left = newX + 'px';
        this.dragState.element.style.top = newY + 'px';
        
        if (!validation.valid) {
            this.dragState.element.style.outline = '2px solid red';
        } else {
            this.dragState.element.style.outline = '';
        }
    }
    
    /**
     * End drag operation
     */
    endDrag(e) {
        if (!this.dragState) return;
        
        const finalX = parseInt(this.dragState.element.style.left);
        const finalY = parseInt(this.dragState.element.style.top);
        
        // Validate final position
        const validation = this.armyBuilder.validatePlacement(
            this.dragState.unitId,
            { x: finalX, y: finalY }
        );
        
        if (validation.valid) {
            // Save new position
            this.armyBuilder.updateUnit(this.dragState.unitId, {
                position: { x: finalX, y: finalY }
            });
        } else {
            // Revert to original position
            this.dragState.element.style.left = this.dragState.originalPosition.x + 'px';
            this.dragState.element.style.top = this.dragState.originalPosition.y + 'px';
        }
        
        // Clean up
        this.dragState.element.style.cursor = '';
        this.dragState.element.style.zIndex = '';
        this.dragState.element.style.outline = '';
        this.dragState = null;
    }
    
    /**
     * Start resizing a unit
     */
    startResize(e, unitElement, resizeHandle) {
        // Save history before resize
        if (!this.resizeState) {
            this.saveHistory();
        }
        
        const unitId = unitElement.dataset.unitId;
        this.selectUnit(unitId);
        
        const rect = unitElement.getBoundingClientRect();
        const corner = resizeHandle.dataset.corner;
        
        this.resizeState = {
            unitId: unitId,
            element: unitElement,
            corner: corner,
            startX: e.clientX,
            startY: e.clientY,
            originalWidth: rect.width,
            originalHeight: rect.height,
            originalLeft: parseInt(unitElement.style.left),
            originalTop: parseInt(unitElement.style.top)
        };
        
        e.stopPropagation();
    }
    
    /**
     * Handle resize movement
     */
    handleResize(e) {
        if (!this.resizeState) return;
        
        const deltaX = e.clientX - this.resizeState.startX;
        const deltaY = e.clientY - this.resizeState.startY;
        
        let newWidth = this.resizeState.originalWidth;
        let newHeight = this.resizeState.originalHeight;
        let newLeft = this.resizeState.originalLeft;
        let newTop = this.resizeState.originalTop;
        
        // Adjust based on corner
        switch (this.resizeState.corner) {
            case 'se': // Southeast - resize right and down
                newWidth += deltaX;
                newHeight += deltaY;
                break;
            case 'sw': // Southwest - resize left and down
                newWidth -= deltaX;
                newHeight += deltaY;
                newLeft += deltaX;
                break;
            case 'ne': // Northeast - resize right and up
                newWidth += deltaX;
                newHeight -= deltaY;
                newTop += deltaY;
                break;
            case 'nw': // Northwest - resize left and up
                newWidth -= deltaX;
                newHeight -= deltaY;
                newLeft += deltaX;
                newTop += deltaY;
                break;
        }
        
        // Constrain minimum size
        newWidth = Math.max(40, newWidth);
        newHeight = Math.max(40, newHeight);
        
        // Apply visual changes
        this.resizeState.element.style.width = newWidth + 'px';
        this.resizeState.element.style.height = newHeight + 'px';
        this.resizeState.element.style.left = newLeft + 'px';
        this.resizeState.element.style.top = newTop + 'px';
        
        // Show soldier count preview
        const unit = this.armyBuilder.army.units.find(u => u.id === this.resizeState.unitId);
        if (unit) {
            const newFormationWidth = Math.max(1, Math.round(newWidth / 10));
            const newFormationDepth = Math.max(1, Math.round(newHeight / 10));
            const newSoldierCount = newFormationWidth * newFormationDepth;
            
            const soldierCount = this.resizeState.element.querySelector('.unit-soldier-count');
            if (soldierCount) {
                soldierCount.textContent = newSoldierCount;
            }
        }
    }
    
    /**
     * End resize operation
     */
    endResize(e) {
        if (!this.resizeState) return;
        
        const newWidth = parseInt(this.resizeState.element.style.width);
        const newHeight = parseInt(this.resizeState.element.style.height);
        const newLeft = parseInt(this.resizeState.element.style.left);
        const newTop = parseInt(this.resizeState.element.style.top);
        
        // Update unit with new size
        const result = this.armyBuilder.resizeUnit(this.resizeState.unitId, newWidth, newHeight);
        
        if (result.success) {
            // Update position if it changed
            this.armyBuilder.updateUnit(this.resizeState.unitId, {
                position: { x: newLeft, y: newTop }
            });
            
            // Refresh display
            this.updateUnitElement(this.resizeState.unitId);
        } else {
            // Revert changes
            this.resizeState.element.style.width = this.resizeState.originalWidth + 'px';
            this.resizeState.element.style.height = this.resizeState.originalHeight + 'px';
            this.resizeState.element.style.left = this.resizeState.originalLeft + 'px';
            this.resizeState.element.style.top = this.resizeState.originalTop + 'px';
            
            // Refresh display
            this.updateUnitElement(this.resizeState.unitId);
            
            if (result.error) {
                alert(result.error);
            }
        }
        
        this.resizeState = null;
    }
    
    /**
     * Apply unit shape (pentagon for cavalry, hexagon for light infantry)
     */
    applyUnitShape(element, type) {
        const unitType = UNIT_TYPES[type];
        
        // Set background color
        element.style.background = unitType.color;
        
        // Apply clip-path for non-rectangular shapes
        if (type === 'cavalry') {
            // Pentagon shape
            element.style.clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
        } else if (type === 'light') {
            // Hexagon shape  
            element.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
        } else {
            // Rectangle for hoplites - no clip-path
            element.style.clipPath = '';
        }
    }
    
    /**
     * Add icon buttons to selected unit
     */
    addIconButtons(element, unit) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'unit-icon-buttons';
        
        // Copy shape button
        const copyShapeBtn = document.createElement('button');
        copyShapeBtn.className = 'unit-icon-btn copy-shape';
        copyShapeBtn.innerHTML = '⬚';
        copyShapeBtn.title = 'Copy shape to all units of this type';
        copyShapeBtn.onclick = (e) => {
            e.stopPropagation();
            this.copyShapeToAllOfType(unit.id);
        };
        
        // Duplicate button
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'unit-icon-btn duplicate';
        duplicateBtn.innerHTML = '➕';
        duplicateBtn.title = 'Duplicate unit (Ctrl+D)';
        duplicateBtn.onclick = (e) => {
            e.stopPropagation();
            this.duplicateUnit(unit.id);
        };
        
        // Align button
        const alignBtn = document.createElement('button');
        alignBtn.className = 'unit-icon-btn align-right';
        alignBtn.innerHTML = '⇥';
        alignBtn.title = 'Align all units of this type to the right';
        alignBtn.onclick = (e) => {
            e.stopPropagation();
            this.alignUnitsToRight(unit.id);
        };
        
        // Set default button
        const setDefaultBtn = document.createElement('button');
        setDefaultBtn.className = 'unit-icon-btn set-default';
        setDefaultBtn.innerHTML = '★';
        setDefaultBtn.title = 'Set as default spawn shape';
        setDefaultBtn.onclick = (e) => {
            e.stopPropagation();
            this.setDefaultSpawnShape(unit.id, e.target);
        };
        
        // Character assignment button
        const assignBtn = document.createElement('button');
        assignBtn.className = 'unit-icon-btn assign-characters';
        assignBtn.innerHTML = '👥';
        assignBtn.title = 'Assign characters';
        assignBtn.onclick = (e) => {
            e.stopPropagation();
            this.showCharacterPanel(unit.id);
        };
        
        buttonContainer.appendChild(setDefaultBtn);
        buttonContainer.appendChild(copyShapeBtn);
        buttonContainer.appendChild(alignBtn);
        buttonContainer.appendChild(duplicateBtn);
        buttonContainer.appendChild(assignBtn);
        element.appendChild(buttonContainer);
    }
    
    /**
     * Copy shape to all units of the same type
     */
    copyShapeToAllOfType(unitId) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        const targetFormation = { ...unit.formation };
        const targetSoldierCount = unit.soldierCount;
        
        for (const otherUnit of this.armyBuilder.army.units) {
            if (otherUnit.type === unit.type && otherUnit.id !== unit.id) {
                const result = this.armyBuilder.updateUnit(otherUnit.id, {
                    soldierCount: targetSoldierCount,
                    formation: { ...targetFormation }
                });
                
                if (result.success) {
                    this.updateUnitElement(otherUnit.id);
                }
            }
        }
    }
    
    /**
     * Align all units of the same type to the right of the selected unit
     */
    alignUnitsToRight(unitId) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        const unitSize = getUnitVisualSize(unit.formation);
        let currentX = unit.position.x + unitSize.width + 20; // 20px spacing
        const y = unit.position.y;
        
        for (const otherUnit of this.armyBuilder.army.units) {
            if (otherUnit.type === unit.type && otherUnit.id !== unit.id) {
                const validation = this.armyBuilder.validatePlacement(otherUnit.id, { x: currentX, y: y });
                
                if (validation.valid) {
                    this.armyBuilder.updateUnit(otherUnit.id, {
                        position: { x: currentX, y: y }
                    });
                    this.updateUnitElement(otherUnit.id);
                    
                    const otherSize = getUnitVisualSize(otherUnit.formation);
                    currentX += otherSize.width + 20;
                }
            }
        }
    }
    
    /**
     * Set this unit's shape as the default for spawning
     */
    setDefaultSpawnShape(unitId, btn) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        this.defaultSpawnSettings[unit.type] = {
            formation: { ...unit.formation },
            soldierCount: unit.soldierCount
        };
        
        // Visual feedback
        btn.style.color = 'gold';
        setTimeout(() => {
            btn.style.color = '';
        }, 1000);
    }
    
    /**
     * Initialize keyboard event listeners
     */
    initKeyboardListeners() {
        // Use capture phase to intercept before browser
        document.addEventListener('keydown', (e) => {
            // Skip if in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Delete key - remove selected unit
            if (e.key === 'Delete' && this.selectedUnit && !this.dragState && !this.resizeState) {
                this.saveHistory();
                const result = this.armyBuilder.removeUnit(this.selectedUnit);
                if (result.success) {
                    this.selectedUnit = null;
                }
            }
            
            // Escape key - deselect unit and hide panel
            if (e.key === 'Escape') {
                this.selectUnit(null);
                if (this.characterPanel) {
                    this.characterPanel.style.display = 'none';
                }
            }
            
            // Ctrl/Cmd + Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                this.undo();
                return false;
            }
            
            // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z - Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                e.stopPropagation();
                this.redo();
                return false;
            }
            
            // Ctrl/Cmd + D - Duplicate selected unit
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && this.selectedUnit) {
                e.preventDefault();
                e.stopPropagation();
                this.duplicateUnit(this.selectedUnit);
                return false;
            }
        }, true); // Capture phase
    }
    
    /**
     * Save current state to history for undo
     */
    saveHistory() {
        // Clone the current army state
        const state = {
            units: JSON.parse(JSON.stringify(this.armyBuilder.army.units)),
            totalPoints: this.armyBuilder.army.totalPoints || this.armyBuilder.army.usedPoints
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
        this.armyBuilder.army.units = [];
        this.armyBuilder.unitElements.clear();
        this.canvas.innerHTML = '';
        
        // Restore units
        state.units.forEach(unitData => {
            this.armyBuilder.army.units.push(unitData);
            this.renderUnit(unitData);
        });
        
        // Update points and UI
        if (this.armyBuilder.army.totalPoints !== undefined) {
            this.armyBuilder.army.totalPoints = state.totalPoints;
        } else {
            this.armyBuilder.army.usedPoints = state.totalPoints;
        }
        
        if (this.armyBuilder.updatePointsDisplay) {
            this.armyBuilder.updatePointsDisplay();
        }
        if (this.armyBuilder.updateUnitList) {
            this.armyBuilder.updateUnitList();
        }
        
        // Deselect any selected unit
        this.selectUnit(null);
    }
    
    /**
     * Duplicate the selected unit
     */
    duplicateUnit(unitId) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        this.saveHistory();
        
        // Get the visual size of the unit
        const unitSize = getUnitVisualSize(unit.formation);
        
        // Calculate position - spawn to the right with 10px gap, exactly aligned
        const gap = 10;
        let newX = unit.position.x + unitSize.width + gap;
        let newY = unit.position.y; // Same Y position for perfect alignment
        
        // If it would go off screen to the right, try left side
        if (newX + unitSize.width > this.canvas.offsetWidth) {
            newX = unit.position.x - unitSize.width - gap;
            
            // If left side is also off screen, place below instead
            if (newX < 0) {
                newX = unit.position.x; // Same X position
                newY = unit.position.y + unitSize.height + gap;
                
                // If below is off screen, just offset diagonally
                if (newY + unitSize.height > this.canvas.offsetHeight) {
                    newX = Math.min(unit.position.x + 30, this.canvas.offsetWidth - unitSize.width);
                    newY = Math.min(unit.position.y + 30, this.canvas.offsetHeight - unitSize.height);
                }
            }
        }
        
        // Create a new unit with same properties but aligned position
        const newUnit = {
            ...unit,
            id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            position: {
                x: newX,
                y: newY
            },
            name: `${unit.name} (Copy)`,
            general: null, // Don't copy character assignments
            soldiers: []
        };
        
        // Calculate cost
        const unitType = UNIT_TYPES[unit.type];
        const cost = unit.soldierCount * unitType.costPerSoldier;
        
        // Add the new unit
        this.armyBuilder.army.units.push(newUnit);
        if (this.armyBuilder.army.totalPoints !== undefined) {
            this.armyBuilder.army.totalPoints += cost;
        } else {
            this.armyBuilder.army.usedPoints += cost;
        }
        newUnit.cost = cost;
        
        // Render and select the new unit
        this.renderUnit(newUnit);
        this.selectUnit(newUnit.id);
        
        // Update UI
        if (this.armyBuilder.updatePointsDisplay) {
            this.armyBuilder.updatePointsDisplay();
        }
        if (this.armyBuilder.updateUnitList) {
            this.armyBuilder.updateUnitList();
        }
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
            panel.style.display = 'none';
        });
        
        // Click outside to close handler
        document.addEventListener('click', (e) => {
            if (panel.style.display === 'block' && !panel.contains(e.target)) {
                // Don't close if clicking on the character assignment button that opens the panel
                if (!e.target.closest('.assign-characters')) {
                    panel.style.display = 'none';
                }
            }
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
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        const unitElement = this.armyBuilder.unitElements.get(unitId);
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
        
        // Display available characters
        this.displayAvailableCharacters();
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
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        this.saveHistory();
        
        if (role === 'general') {
            // Use army builder's updateUnit method to persist changes
            this.armyBuilder.updateUnit(unitId, {
                general: null
            });
        } else if (role === 'soldier') {
            unit.soldiers = unit.soldiers.filter(s => s.id !== characterId);
            
            // Use army builder's updateUnit method to persist changes
            this.armyBuilder.updateUnit(unitId, {
                soldiers: [...unit.soldiers]
            });
        }
        
        // Update the display
        this.updateCharacterPanel(unit);
        this.updateUnitCharacterIndicators(unitId);
        
        // Refresh the available characters list to show unassigned characters
        this.displayAvailableCharacters();
    }
    
    /**
     * Update character indicators on unit
     */
    updateUnitCharacterIndicators(unitId) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        const unitElement = this.armyBuilder.unitElements.get(unitId);
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
            
            // Create tooltip with all soldier names
            const soldierNames = unit.soldiers.map(s => s.name).join(', ');
            soldierIndicator.title = `Soldiers: ${soldierNames}`;
            
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
            const description = el.dataset.characterDescription?.toLowerCase() || '';
            const visible = !term || name.includes(term) || description.includes(term);
            el.style.display = visible ? 'block' : 'none';
        });
    }
    
    /**
     * Load characters from localStorage or API
     */
    async loadCharacters() {
        try {
            console.log('🔍 Loading characters...');
            console.log('Current availableCharacters count:', this.availableCharacters.length);
            
            // First try to get from localStorage (from JSON import)
            const storedData = localStorage.getItem('onlyworlds_import_data');
            console.log('📦 Stored data found:', !!storedData);
            if (storedData) {
                const data = JSON.parse(storedData);
                console.log('🔎 Parsed data structure:', Object.keys(data));
                console.log('🔎 Elements in data:', data.elements ? Object.keys(data.elements) : 'No elements key');
                
                // Look for Character elements
                if (data.elements && data.elements.Character) {
                    this.availableCharacters = data.elements.Character;
                    console.log(`✅ Loaded ${this.availableCharacters.length} characters from import`);
                    console.log('👥 First character sample:', this.availableCharacters[0] ? {
                        id: this.availableCharacters[0].id,
                        name: this.availableCharacters[0].name
                    } : 'No characters');
                    return;
                } else {
                    console.log('❌ No Character elements found in import data');
                }
            } else {
                console.log('ℹ️ No stored data found in localStorage');
            }
            
            // If no localStorage data, try API (if auth exists)
            console.log('🔐 Checking API authentication...');
            const authManager = window.authManager || this.armyBuilder.authManager;
            console.log('Auth manager exists:', !!authManager);
            console.log('Is authenticated:', authManager ? authManager.checkAuth() : 'N/A');
            
            if (authManager && authManager.checkAuth()) {
                const api = window.apiService || this.armyBuilder.apiService;
                console.log('API service exists:', !!api);
                if (api) {
                    console.log('🌐 Fetching characters from API...');
                    const characters = await api.getElements('character');
                    console.log('API response:', characters);
                    console.log('API characters count:', characters ? characters.length : 'null/undefined');
                    
                    if (characters && characters.length > 0) {
                        this.availableCharacters = characters;
                        console.log(`✅ Loaded ${this.availableCharacters.length} characters from API`);
                        console.log('👥 First character sample:', {
                            id: characters[0].id,
                            name: characters[0].name
                        });
                    } else {
                        console.log('❌ No characters returned from API');
                    }
                } else {
                    console.log('❌ No API service available');
                }
            } else {
                console.log('❌ Not authenticated for API access');
            }
            
            console.log('🏁 Final character count:', this.availableCharacters.length);
        } catch (error) {
            console.error('❌ Failed to load characters:', error);
        }
    }
    
    /**
     * Display available characters in the panel
     */
    displayAvailableCharacters() {
        const characterList = this.characterPanel.querySelector('.character-list');
        if (!characterList) return;
        
        // We'll update the header after counting available characters
        
        // Get current unit to check already assigned characters
        const unitId = this.characterPanel.dataset.unitId;
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        // Create a set of already assigned character IDs (current unit + other armies)
        const assignedIds = new Set();
        
        // Add characters from current unit
        if (unit.general) assignedIds.add(unit.general.id);
        if (unit.soldiers) {
            unit.soldiers.forEach(s => assignedIds.add(s.id));
        }
        
        // Add characters from other units in current army
        this.armyBuilder.army.units.forEach(u => {
            if (u.id !== unitId) {
                if (u.general) assignedIds.add(u.general.id);
                if (u.soldiers) {
                    u.soldiers.forEach(s => assignedIds.add(s.id));
                }
            }
        });
        
        // Add characters from other player's army
        let currentPlayer, otherPlayer, currentPlayerIndex, otherPlayerIndex;
        if (typeof window !== 'undefined' && window.battleConfig) {
            const params = new URLSearchParams(window.location.search);
            currentPlayer = parseInt(params.get('player')) || 1;
            currentPlayerIndex = currentPlayer - 1; // Convert to 0-indexed
            otherPlayerIndex = currentPlayerIndex === 0 ? 1 : 0; // Other army index
            otherPlayer = otherPlayerIndex + 1; // Convert back to 1-indexed for display
            
            try {
                const otherArmy = window.battleConfig.getArmy(otherPlayerIndex);
                
                otherArmy.units.forEach(u => {
                    if (u.general) assignedIds.add(u.general.id);
                    if (u.soldiers) {
                        u.soldiers.forEach(s => assignedIds.add(s.id));
                    }
                });
            } catch (error) {
                console.log('Could not load other army for character exclusion:', error);
            }
        }
        
        
        if (this.availableCharacters.length === 0) {
            characterList.innerHTML = '';
            return;
        }
        
        // Build character list HTML
        let html = '';
        let availableCount = 0;
        this.availableCharacters.forEach(character => {
            // Skip if already assigned
            if (assignedIds.has(character.id)) {
                return;
            }
            
            availableCount++;
            const name = character.name || 'Unnamed Character';
            const description = character.description ? 
                (character.description.substring(0, 50) + (character.description.length > 50 ? '...' : '')) : 
                'No description';
            
            html += `
                <div class="character-list-item" 
                     data-character-id="${character.id}" 
                     data-character-name="${name}"
                     data-character-description="${description || ''}">
                    <div class="character-info">
                        <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 2px;">${name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${description}</div>
                    </div>
                    <div class="character-assignment-buttons">
                        ${!unit.general ? `<button class="assign-btn assign-general" data-character-id="${character.id}" data-role="general" title="Assign as General">👑</button>` : ''}
                        <button class="assign-btn assign-soldier" data-character-id="${character.id}" data-role="soldier" title="Assign as Soldier">⚔️</button>
                    </div>
                </div>
            `;
        });
        
        
        // Update header with correct count
        const header = this.characterPanel.querySelector('.available-characters h4');
        if (header) {
            header.textContent = `Available Characters (${availableCount}/${this.availableCharacters.length})`;
        }
        
        if (html === '') {
            characterList.innerHTML = '';
        } else {
            characterList.innerHTML = html;
            
            // Add click handlers to assign characters with specific roles
            characterList.querySelectorAll('.assign-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const characterId = btn.dataset.characterId;
                    const role = btn.dataset.role;
                    this.assignCharacterToUnit(unitId, characterId, role);
                });
            });
        }
    }
    
    /**
     * Edit unit name inline
     */
    editUnitName(unitId, nameLabel) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        if (!unit) return;
        
        const currentName = unit.name;
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'unit-name-input';
        input.style.cssText = `
            background: white;
            border: 2px solid var(--brand-primary);
            border-radius: 3px;
            padding: 2px 4px;
            font-size: 11px;
            font-weight: 600;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
        `;
        
        // Replace label with input
        nameLabel.style.display = 'none';
        nameLabel.parentNode.insertBefore(input, nameLabel);
        
        // Focus and select all text
        input.focus();
        input.select();
        
        // Save function
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                // Save history for undo
                this.saveHistory();
                
                // Update unit name
                this.armyBuilder.updateUnit(unitId, { name: newName });
                nameLabel.textContent = newName;
            }
            
            // Remove input and show label
            input.remove();
            nameLabel.style.display = 'block';
        };
        
        // Cancel function
        const cancelEdit = () => {
            input.remove();
            nameLabel.style.display = 'block';
        };
        
        // Event handlers
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }
    
    /**
     * Assign character to unit with specific role
     */
    assignCharacterToUnit(unitId, characterId, role) {
        const unit = this.armyBuilder.army.units.find(u => u.id === unitId);
        const character = this.availableCharacters.find(c => c.id === characterId);
        if (!unit || !character) return;
        
        // Save history before assignment
        this.saveHistory();
        
        if (role === 'general') {
            // Check if unit already has a general
            if (unit.general) {
                if (!confirm(`This unit already has a general (${unit.general.name}). Replace with ${character.name}?`)) {
                    return;
                }
            }
            
            // Use army builder's updateUnit method to persist changes
            this.armyBuilder.updateUnit(unitId, {
                general: {
                    id: character.id,
                    name: character.name || 'Unnamed'
                }
            });
        } else if (role === 'soldier') {
            // Assign as soldier
            if (!unit.soldiers) unit.soldiers = [];
            unit.soldiers.push({
                id: character.id,
                name: character.name || 'Unnamed'
            });
            
            // Use army builder's updateUnit method to persist changes
            this.armyBuilder.updateUnit(unitId, {
                soldiers: [...unit.soldiers]
            });
        }
        
        // Refresh unit data after update
        const updatedUnit = this.armyBuilder.army.units.find(u => u.id === unitId);
        
        // Update displays
        this.updateCharacterPanel(updatedUnit);
        this.updateUnitCharacterIndicators(unitId);
        this.displayAvailableCharacters();
    }
}

export default UnitCanvas;