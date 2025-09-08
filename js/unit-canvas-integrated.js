/**
 * Unit Canvas Module - Integrated Version
 * Handles unit visualization, drag/drop, resizing, undo/redo, and character assignment
 */

import { UNIT_TYPES, getUnitVisualSize } from './constants/units.js';
import UnitEnhancements from './unit-canvas-enhancements.js';

export class UnitCanvas {
    constructor(canvasElement, armyBuilder) {
        this.canvas = canvasElement;
        this.armyBuilder = armyBuilder;
        this.selectedUnit = null;
        this.dragState = null;
        this.resizeState = null;
        this.defaultSpawnSettings = {}; // Store default spawn settings per unit type
        
        // Initialize enhancements
        this.enhancements = new UnitEnhancements(this);
        
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
        
        // Add character indicators
        this.enhancements.updateUnitCharacterIndicators(unit.id);
        
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
     * Select a unit and optionally show character panel
     */
    selectUnit(unitId, showPanel = false) {
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
                
                // Show character panel if requested
                if (showPanel) {
                    this.enhancements.showCharacterPanel(unitId);
                }
            }
        } else {
            // Hide character panel when deselecting
            this.enhancements.hideCharacterPanel();
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
        
        // Duplicate button
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'unit-icon-btn duplicate';
        duplicateBtn.innerHTML = '➕';
        duplicateBtn.title = 'Duplicate unit (Ctrl+D)';
        duplicateBtn.onclick = (e) => {
            e.stopPropagation();
            this.enhancements.duplicateUnit(unit.id);
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
        
        // Assign characters button
        const assignBtn = document.createElement('button');
        assignBtn.className = 'unit-icon-btn assign-characters';
        assignBtn.innerHTML = '👥';
        assignBtn.title = 'Assign characters';
        assignBtn.onclick = (e) => {
            e.stopPropagation();
            this.enhancements.showCharacterPanel(unit.id);
        };
        
        buttonContainer.appendChild(copyShapeBtn);
        buttonContainer.appendChild(duplicateBtn);
        buttonContainer.appendChild(alignBtn);
        buttonContainer.appendChild(setDefaultBtn);
        buttonContainer.appendChild(assignBtn);
        element.appendChild(buttonContainer);
    }
    
    /**
     * Initialize keyboard event listeners
     */
    initKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Delete key - remove selected unit
            if (e.key === 'Delete' && this.selectedUnit && !this.dragState && !this.resizeState) {
                this.enhancements.saveHistory();
                const result = this.armyBuilder.removeUnit(this.selectedUnit);
                if (result.success) {
                    this.selectedUnit = null;
                }
            }
            
            // Escape key - deselect unit
            if (e.key === 'Escape') {
                this.selectUnit(null);
                this.enhancements.hideCharacterPanel();
            }
            
            // Ctrl+Z - Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.enhancements.undo();
            }
            
            // Ctrl+Y or Ctrl+Shift+Z - Redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                this.enhancements.redo();
            }
            
            // Ctrl+D - Duplicate selected unit
            if (e.ctrlKey && e.key === 'd' && this.selectedUnit) {
                e.preventDefault();
                this.enhancements.duplicateUnit(this.selectedUnit);
            }
        });
    }
    
    /**
     * Handle mouse down events on canvas
     */
    handleCanvasMouseDown(e) {
        // Save history before any drag/resize operation
        if (!this.dragState && !this.resizeState) {
            this.enhancements.saveHistory();
        }
        
        // Rest of existing handleCanvasMouseDown code...
        const target = e.target;
        const wrapperElement = target.closest('.unit-wrapper');
        
        if (wrapperElement) {
            // Check if clicking on resize handle
            if (target.classList.contains('resize-handle')) {
                this.startResize(e, wrapperElement, target);
            } else if (!target.closest('.unit-icon-buttons')) {
                // Start drag if not clicking on icon buttons
                this.startDrag(e, wrapperElement);
            }
        } else {
            // Deselect
            this.selectUnit(null);
        }
    }
    
    // ... Include all other existing methods from unit-canvas.js ...
    // (startDrag, handleDrag, endDrag, startResize, handleResize, endResize, etc.)
    
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
        
        // Update character indicators if any
        this.enhancements.updateUnitCharacterIndicators(unit.id);
    }
}

export default UnitCanvas;