/**
 * Unit Type Definitions and Constants
 * Defines the three unit types and army limits
 */

export const UNIT_TYPES = {
    light: {
        name: 'Light Infantry',
        cost: 1,  // Per soldier
        minSize: 20,
        maxSize: 400,
        defaultSize: 80,
        defaultFormation: { width: 16, depth: 5 },  // Wider formation for light infantry
        color: '#8B7355',  // Tan
        icon: 'L',
        description: 'Fast, flexible skirmishers'
    },
    hoplite: {
        name: 'Hoplite',
        cost: 2,  // Per soldier
        minSize: 40,
        maxSize: 800,
        defaultSize: 120,
        defaultFormation: { width: 10, depth: 12 },  // Less wide phalanx
        color: '#CD7F32',  // Bronze
        icon: 'H',
        description: 'Heavy infantry phalanx'
    },
    cavalry: {
        name: 'Cavalry',
        cost: 4,  // Per soldier
        minSize: 20,
        maxSize: 200,
        defaultSize: 60,
        defaultFormation: { width: 10, depth: 6 },  // Less wide formation
        color: '#654321',  // Dark brown
        icon: 'C',
        description: 'Mobile shock troops'
    }
};

export const ARMY_LIMITS = {
    maxUnits: 40,
    defaultMaxPoints: 1000,
    minPoints: 200,
    maxPoints: 5000
};

// Visual scaling for battlefield display
export const VISUAL_SCALE = {
    soldierToPixels: 10,  // Each soldier width/depth = 10 pixels
    minUnitWidth: 40,     // Minimum visual size
    minUnitHeight: 40,
    maxUnitWidth: 300,    // Maximum visual size
    maxUnitHeight: 300
};

// Helper functions
export function calculateUnitCost(type, soldierCount) {
    const unitType = UNIT_TYPES[type];
    if (!unitType) {
        throw new Error(`Unknown unit type: ${type}`);
    }
    return unitType.cost * soldierCount;
}

export function calculateFormationFromSoldiers(soldierCount, type) {
    const unitType = UNIT_TYPES[type];
    if (!unitType) {
        throw new Error(`Unknown unit type: ${type}`);
    }
    
    // Calculate reasonable formation based on soldier count
    const aspectRatio = unitType.defaultFormation.width / unitType.defaultFormation.depth;
    const depth = Math.ceil(Math.sqrt(soldierCount / aspectRatio));
    const width = Math.ceil(soldierCount / depth);
    
    return { width, depth };
}

export function calculateSoldiersFromFormation(width, depth) {
    return width * depth;
}

export function getUnitVisualSize(formation) {
    const width = Math.max(
        VISUAL_SCALE.minUnitWidth,
        Math.min(VISUAL_SCALE.maxUnitWidth, formation.width * VISUAL_SCALE.soldierToPixels)
    );
    
    const height = Math.max(
        VISUAL_SCALE.minUnitHeight,
        Math.min(VISUAL_SCALE.maxUnitHeight, formation.depth * VISUAL_SCALE.soldierToPixels)
    );
    
    return { width, height };
}

export function validateUnitSize(type, soldierCount) {
    const unitType = UNIT_TYPES[type];
    if (!unitType) {
        return { valid: false, error: `Unknown unit type: ${type}` };
    }
    
    if (soldierCount < unitType.minSize) {
        return { 
            valid: false, 
            error: `${unitType.name} must have at least ${unitType.minSize} soldiers` 
        };
    }
    
    if (soldierCount > unitType.maxSize) {
        return { 
            valid: false, 
            error: `${unitType.name} cannot exceed ${unitType.maxSize} soldiers` 
        };
    }
    
    return { valid: true };
}