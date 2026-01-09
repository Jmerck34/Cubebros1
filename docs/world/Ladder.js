import { Body } from './Body.js';

/**
 * Ladder - Climbable volume that does not block movement.
 */
export class Ladder extends Body {
    constructor({ collisionShape = null, bounds = null, mapKey = null } = {}) {
        const shape = collisionShape || (bounds ? { type: 'aabb', bounds } : null);
        super({ collisionShape: shape, movable: false, mapKey });
        this.isLadder = true;
        this.blocksMovement = false;
    }
}
