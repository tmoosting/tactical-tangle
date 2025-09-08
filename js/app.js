/**
 * Tactical Tangle - Main Application
 * Simplified version focused on game functionality
 */

import { ONLYWORLDS } from './constants.js';

// Global app state
export const app = {
    world: null,
    elements: {}
};

// Initialize on page load if this script is loaded directly
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Tactical Tangle ready');
    });
}

// Export for use in other modules
export default app;