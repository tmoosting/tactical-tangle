/**
 * Battle Configuration Service
 * Manages battle state across pages and provides persistence
 */

class BattleConfigService {
    constructor() {
        this.config = null;
        this.storageKey = 'battleConfig';
        this.load();
    }
    
    /**
     * Generate a unique ID for entities
     * Simplified version of OnlyWorlds API generateId
     */
    generateId() {
        const timestamp = Date.now().toString(16);
        const random = Math.random().toString(16).substring(2, 10);
        return `${timestamp}-${random}`;
    }
    
    /**
     * Create a new battle configuration
     */
    createNew() {
        return {
            id: this.generateId(),
            name: 'Unnamed Battle',
            circumstances: '',
            players: [
                { name: 'Player 1', maxPoints: 1000 },
                { name: 'Player 2', maxPoints: 1000 }
            ],
            armies: [
                {
                    playerId: 0,
                    playerName: 'Player 1',
                    maxPoints: 1000,
                    usedPoints: 0,
                    units: []
                },
                {
                    playerId: 1,
                    playerName: 'Player 2',
                    maxPoints: 1000,
                    usedPoints: 0,
                    units: []
                }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    
    /**
     * Load battle configuration from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.config = JSON.parse(saved);
                return true;
            }
        } catch (error) {
            console.error('Failed to load battle config:', error);
        }
        
        // Create new if none exists
        this.config = this.createNew();
        return false;
    }
    
    /**
     * Save current configuration to localStorage
     */
    save() {
        try {
            this.config.updated_at = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('Failed to save battle config:', error);
            return false;
        }
    }
    
    /**
     * Clear the current configuration
     */
    clear() {
        localStorage.removeItem(this.storageKey);
        this.config = this.createNew();
    }
    
    /**
     * Get the current battle configuration
     */
    getConfig() {
        return this.config;
    }
    
    /**
     * Update battle metadata
     */
    updateBattleInfo(name, circumstances) {
        this.config.name = name || 'Unnamed Battle';
        this.config.circumstances = circumstances || '';
        this.save();
    }
    
    /**
     * Update player information
     */
    updatePlayers(player1, player2) {
        this.config.players = [player1, player2];
        
        // Update army configs to match
        this.config.armies[0].playerName = player1.name;
        this.config.armies[0].maxPoints = player1.maxPoints;
        
        this.config.armies[1].playerName = player2.name;
        this.config.armies[1].maxPoints = player2.maxPoints;
        
        this.save();
    }
    
    /**
     * Get army for specific player (0 or 1)
     */
    getArmy(playerId) {
        if (playerId < 0 || playerId > 1) {
            throw new Error('Invalid player ID. Must be 0 or 1');
        }
        return this.config.armies[playerId];
    }
    
    /**
     * Get army based on URL parameter
     */
    getCurrentArmy() {
        const params = new URLSearchParams(window.location.search);
        const player = parseInt(params.get('player')) || 1;
        return this.getArmy(player - 1); // Convert to 0-indexed
    }
    
    /**
     * Add a unit to an army
     */
    addUnit(playerId, unit) {
        const army = this.getArmy(playerId);
        
        // Ensure unit has required fields
        const fullUnit = {
            id: unit.id || this.generateId(),
            type: unit.type,
            name: unit.name || `${unit.type} Unit`,
            soldierCount: unit.soldierCount,
            formation: unit.formation,
            position: unit.position,
            cost: unit.cost,
            general: unit.general || null,
            soldiers: unit.soldiers || [],
            hierarchy: unit.hierarchy || 999
        };
        
        army.units.push(fullUnit);
        this.updateArmyPoints(playerId);
        this.save();
        
        return fullUnit;
    }
    
    /**
     * Update a unit in an army
     */
    updateUnit(playerId, unitId, updates) {
        const army = this.getArmy(playerId);
        const unitIndex = army.units.findIndex(u => u.id === unitId);
        
        if (unitIndex === -1) {
            throw new Error('Unit not found');
        }
        
        army.units[unitIndex] = { ...army.units[unitIndex], ...updates };
        this.updateArmyPoints(playerId);
        this.save();
        
        return army.units[unitIndex];
    }
    
    /**
     * Remove a unit from an army
     */
    removeUnit(playerId, unitId) {
        const army = this.getArmy(playerId);
        const unitIndex = army.units.findIndex(u => u.id === unitId);
        
        if (unitIndex === -1) {
            throw new Error('Unit not found');
        }
        
        army.units.splice(unitIndex, 1);
        this.updateArmyPoints(playerId);
        this.save();
        
        return true;
    }
    
    /**
     * Update army's used points based on units
     */
    updateArmyPoints(playerId) {
        const army = this.getArmy(playerId);
        army.usedPoints = army.units.reduce((total, unit) => total + unit.cost, 0);
    }
    
    /**
     * Validate army configuration
     */
    validateArmy(playerId) {
        const army = this.getArmy(playerId);
        const errors = [];
        
        // Check point limit
        if (army.usedPoints > army.maxPoints) {
            errors.push(`Army exceeds point limit (${army.usedPoints}/${army.maxPoints})`);
        }
        
        // Check unit count
        if (army.units.length > 40) {
            errors.push(`Too many units (${army.units.length}/40 max)`);
        }
        
        // Check for at least one general
        const hasGeneral = army.units.some(unit => unit.general !== null);
        if (!hasGeneral && army.units.length > 0) {
            errors.push('Warning: No general assigned to any unit');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Export configuration as JSON
     */
    exportJSON() {
        const dataStr = JSON.stringify(this.config, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `battle-${this.config.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import configuration from JSON
     */
    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const config = JSON.parse(e.target.result);
                    
                    // Basic validation
                    if (!config.armies || !config.players) {
                        throw new Error('Invalid battle configuration format');
                    }
                    
                    this.config = config;
                    this.save();
                    resolve(config);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Check if battle is ready to start
     */
    isBattleReady() {
        const army1Valid = this.validateArmy(0);
        const army2Valid = this.validateArmy(1);
        
        // Both armies must have at least one unit
        const army1HasUnits = this.config.armies[0].units.length > 0;
        const army2HasUnits = this.config.armies[1].units.length > 0;
        
        return {
            ready: army1Valid.valid && army2Valid.valid && army1HasUnits && army2HasUnits,
            army1: army1Valid,
            army2: army2Valid,
            army1HasUnits,
            army2HasUnits
        };
    }
}

// Export as singleton
const battleConfig = new BattleConfigService();
export default battleConfig;