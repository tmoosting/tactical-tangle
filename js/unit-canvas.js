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
        
        this.initEventListeners();
    }
    
    /**
     * Create DOM element for a unit
     */
    createUnitElement(unit) {
        const unitType = UNIT_TYPES[unit.type];
        const size = getUnitVisualSize(unit.formation);
        
        const element = document.createElement('div');
        element.className = `unit unit-${unit.type}`;
        element.dataset.unitId = unit.id;
        
        // Set position and size
        element.style.left = unit.position.x + 'px';
        element.style.top = unit.position.y + 'px';
        element.style.width = size.width + 'px';
        element.style.height = size.height + 'px';
        element.style.background = unitType.color;
        
        // Add unit info
        const info = document.createElement('div');
        info.className = 'unit-info';
        info.innerHTML = `
            <div class="unit-name">${unit.name}</div>
            <div class="unit-soldiers">${unit.soldierCount} soldiers</div>
            <div class="unit-cost">${unit.cost} pts</div>
        `;
        element.appendChild(info);
        
        // Add resize handles
        this.addResizeHandles(element);
        
        // Store reference
        this.armyBuilder.unitElements.set(unit.id, element);
        
        return element;
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
        
        // Create and add new element
        const element = this.createUnitElement(unit);
        this.canvas.appendChild(element);
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
        
        const element = this.armyBuilder.unitElements.get(unitId);
        if (!element) return;
        
        const size = getUnitVisualSize(unit.formation);
        
        // Update position and size
        element.style.left = unit.position.x + 'px';
        element.style.top = unit.position.y + 'px';
        element.style.width = size.width + 'px';
        element.style.height = size.height + 'px';
        
        // Update info
        const info = element.querySelector('.unit-info');
        if (info) {
            info.innerHTML = `
                <div class="unit-name">${unit.name}</div>
                <div class="unit-soldiers">${unit.soldierCount} soldiers</div>
                <div class="unit-cost">${unit.cost} pts</div>
            `;
        }
    }
    
    /**
     * Select a unit
     */
    selectUnit(unitId) {
        // Deselect previous
        if (this.selectedUnit) {
            const prevElement = this.armyBuilder.unitElements.get(this.selectedUnit);
            if (prevElement) {
                prevElement.classList.remove('selected');
            }
        }
        
        // Select new
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
            const unitElement = e.target.closest('.unit');
            const resizeHandle = e.target.closest('.resize-handle');
            
            if (resizeHandle && unitElement) {
                // Start resize
                this.startResize(e, unitElement, resizeHandle);
            } else if (unitElement) {
                // Start drag
                this.startDrag(e, unitElement);
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
    startDrag(e, unitElement) {
        const unitId = unitElement.dataset.unitId;
        this.selectUnit(unitId);
        
        const rect = unitElement.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.dragState = {
            unitId: unitId,
            element: unitElement,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            canvasLeft: canvasRect.left,
            canvasTop: canvasRect.top,
            originalPosition: {
                x: parseInt(unitElement.style.left),
                y: parseInt(unitElement.style.top)
            }
        };
        
        unitElement.style.cursor = 'grabbing';
        unitElement.style.zIndex = '1000';
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
            
            const info = this.resizeState.element.querySelector('.unit-soldiers');
            if (info) {
                info.textContent = `${newSoldierCount} soldiers`;
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
}

export default UnitCanvas;