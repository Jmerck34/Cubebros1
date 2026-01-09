import { SolidBody } from './SolidBody.js';

/**
 * SolidPlatform - Simple rectangular platform that blocks movement.
 */
export class SolidPlatform extends SolidBody {
    constructor({ collisionShape = null, bounds = null, mapKey = null } = {}) {
        const shape = collisionShape || (bounds ? { type: 'aabb', bounds } : null);
        super({ collisionShape: shape, movable: false, mapKey });
        this.isPlatform = true;
    }
}
