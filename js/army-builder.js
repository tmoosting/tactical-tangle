/**
 * Army Builder Module
 * Handles unit creation, management, and army logic
 */

import battleConfig from './battle-config.js';
import { 
    UNIT_TYPES, 
    ARMY_LIMITS,
    calculateUnitCost,
    calculateFormationFromSoldiers,
    validateUnitSize,
    getUnitVisualSize 
} from './constants/units.js';

export class ArmyBuilder {
    constructor(playerId) {
        this.playerId = playerId;
        this.army = battleConfig.getArmy(playerId);
        this.selectedUnit = null;
        this.unitElements = new Map(); // Map unit IDs to DOM elements
        this.unitCanvas = null; // Will be set after canvas is created
    }
    
    /**
     * Create a new unit with default settings
     */
    createUnit(type) {
        const unitType = UNIT_TYPES[type];
        if (!unitType) {
            throw new Error(`Unknown unit type: ${type}`);
        }
        
        // Check unit limit
        if (this.army.units.length >= ARMY_LIMITS.maxUnits) {
            return { 
                success: false, 
                error: `Cannot exceed ${ARMY_LIMITS.maxUnits} units per army` 
            };
        }
        
        // Use custom default settings if available, otherwise use type defaults
        let soldierCount = unitType.defaultSize;
        let formation = unitType.defaultFormation;
        
        if (this.unitCanvas && this.unitCanvas.defaultSpawnSettings[type]) {
            const customDefaults = this.unitCanvas.defaultSpawnSettings[type];
            soldierCount = customDefaults.soldierCount;
            formation = customDefaults.formation;
        }
        
        const cost = calculateUnitCost(type, soldierCount);
        
        // No longer blocking based on points - allow overages
        
        // Create the unit
        const unit = {
            id: battleConfig.generateId(),
            type: type,
            name: `${unitType.name} ${this.army.units.length + 1}`,
            soldierCount: soldierCount,
            formation: formation,
            position: this.getDefaultPosition(),
            cost: cost,
            general: null,
            soldiers: [],
            hierarchy: this.army.units.length + 1
        };
        
        // Add to army
        battleConfig.addUnit(this.playerId, unit);
        
        return { 
            success: true, 
            unit: unit 
        };
    }
    
    /**
     * Update unit properties
     */
    updateUnit(unitId, updates) {
        const unit = this.army.units.find(u => u.id === unitId);
        if (!unit) {
            return { success: false, error: 'Unit not found' };
        }
        
        // If soldier count changed, recalculate cost
        if (updates.soldierCount !== undefined) {
            const validation = validateUnitSize(unit.type, updates.soldierCount);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
            
            updates.cost = calculateUnitCost(unit.type, updates.soldierCount);
            
            // No longer blocking based on points - allow overages
            
            // Update formation if needed
            if (!updates.formation) {
                updates.formation = calculateFormationFromSoldiers(updates.soldierCount, unit.type);
            }
        }
        
        // Update the unit
        battleConfig.updateUnit(this.playerId, unitId, updates);
        
        return { success: true, unit: { ...unit, ...updates } };
    }
    
    /**
     * Remove a unit from the army
     */
    removeUnit(unitId) {
        try {
            battleConfig.removeUnit(this.playerId, unitId);
            if (this.unitElements.has(unitId)) {
                const element = this.unitElements.get(unitId);
                element.remove();
                this.unitElements.delete(unitId);
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Resize unit based on visual drag
     */
    resizeUnit(unitId, newWidth, newHeight) {
        const unit = this.army.units.find(u => u.id === unitId);
        if (!unit) {
            return { success: false, error: 'Unit not found' };
        }
        
        const unitType = UNIT_TYPES[unit.type];
        
        // Calculate new formation from visual size
        const newFormationWidth = Math.max(1, Math.round(newWidth / 10));
        const newFormationDepth = Math.max(1, Math.round(newHeight / 10));
        const newSoldierCount = newFormationWidth * newFormationDepth;
        
        // Validate new size
        const validation = validateUnitSize(unit.type, newSoldierCount);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        // Update unit
        return this.updateUnit(unitId, {
            soldierCount: newSoldierCount,
            formation: { width: newFormationWidth, depth: newFormationDepth }
        });
    }
    
    /**
     * Get default position for new unit
     */
    getDefaultPosition() {
        // Place units in a grid pattern
        const unitCount = this.army.units.length;
        const col = unitCount % 5;
        const row = Math.floor(unitCount / 5);
        
        return {
            x: 50 + (col * 150),
            y: 50 + (row * 150)
        };
    }
    
    /**
     * Check if units overlap
     */
    checkCollision(unit1, unit2) {
        const size1 = getUnitVisualSize(unit1.formation);
        const size2 = getUnitVisualSize(unit2.formation);
        
        return !(
            unit1.position.x + size1.width < unit2.position.x ||
            unit2.position.x + size2.width < unit1.position.x ||
            unit1.position.y + size1.height < unit2.position.y ||
            unit2.position.y + size2.height < unit1.position.y
        );
    }
    
    /**
     * Validate unit placement
     */
    validatePlacement(unitId, newPosition) {
        const unit = this.army.units.find(u => u.id === unitId);
        if (!unit) {
            return { valid: false, error: 'Unit not found' };
        }
        
        // Check collision with other units
        for (const otherUnit of this.army.units) {
            if (otherUnit.id === unitId) continue;
            
            const testUnit = { ...unit, position: newPosition };
            if (this.checkCollision(testUnit, otherUnit)) {
                return { valid: false, error: 'Units cannot overlap' };
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Export army as JSON
     */
    exportArmy() {
        const exportData = {
            playerName: this.army.playerName,
            maxPoints: this.army.maxPoints,
            usedPoints: this.army.usedPoints,
            units: this.army.units,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `army-${this.army.playerName.replace(/\s+/g, '-')}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import army from JSON
     */
    async importArmy(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate import data
                    if (!data.units || !Array.isArray(data.units)) {
                        throw new Error('Invalid army format');
                    }
                    
                    // Clear current units
                    this.army.units = [];
                    
                    // Import units (validate each one)
                    for (const unit of data.units) {
                        if (UNIT_TYPES[unit.type]) {
                            this.army.units.push({
                                ...unit,
                                id: battleConfig.generateId() // Generate new IDs
                            });
                        }
                    }
                    
                    // Update points
                    battleConfig.updateArmyPoints(this.playerId);
                    battleConfig.save();
                    
                    resolve({ 
                        success: true, 
                        unitsImported: this.army.units.length 
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Get army statistics
     */
    getArmyStats() {
        const stats = {
            totalUnits: this.army.units.length,
            totalSoldiers: 0,
            unitsByType: { light: 0, hoplite: 0, cavalry: 0 },
            generalsAssigned: 0,
            charactersTotal: 0
        };
        
        for (const unit of this.army.units) {
            stats.totalSoldiers += unit.soldierCount;
            stats.unitsByType[unit.type]++;
            if (unit.general) stats.generalsAssigned++;
            stats.charactersTotal += unit.soldiers.length;
            if (unit.general) stats.charactersTotal++;
        }
        
        return stats;
    }
}

export default ArmyBuilder;