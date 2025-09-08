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
        
        this.initEventListeners();
        this.initKeyboardListeners();
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
        // Hide previous unit's buttons
        if (this.selectedUnit) {
            const prevElement = this.armyBuilder.unitElements.get(this.selectedUnit);
            if (prevElement) {
                prevElement.classList.remove('selected');
                const buttons = prevElement.querySelector('.unit-icon-buttons');
                if (buttons) {
                    buttons.style.display = 'none';
                }
            }
        }
        
        // Select new unit and show buttons
        this.selectedUnit = unitId;
        if (unitId) {
            const element = this.armyBuilder.unitElements.get(unitId);
            if (element) {
                element.classList.add('selected');
                const buttons = element.querySelector('.unit-icon-buttons');
                if (buttons) {
                    buttons.style.display = 'flex';
                }
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
        buttonContainer.style.display = 'none';
        
        // Copy shape button
        const copyShapeBtn = document.createElement('button');
        copyShapeBtn.className = 'unit-icon-btn copy-shape';
        copyShapeBtn.innerHTML = '⬚';
        copyShapeBtn.title = 'Copy shape to all units of this type';
        copyShapeBtn.onclick = (e) => {
            e.stopPropagation();
            this.copyShapeToAllOfType(unit.id);
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
        
        buttonContainer.appendChild(copyShapeBtn);
        buttonContainer.appendChild(alignBtn);
        buttonContainer.appendChild(setDefaultBtn);
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
        document.addEventListener('keydown', (e) => {
            // Delete key - remove selected unit
            if (e.key === 'Delete' && this.selectedUnit && !this.dragState && !this.resizeState) {
                const result = this.armyBuilder.removeUnit(this.selectedUnit);
                if (result.success) {
                    this.selectedUnit = null;
                }
            }
            
            // Escape key - deselect unit
            if (e.key === 'Escape') {
                this.selectUnit(null);
            }
        });
    }
}

export default UnitCanvas;