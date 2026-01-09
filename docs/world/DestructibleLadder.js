import { DestructibleBody } from './DestructibleBody.js';

/**
 * DestructibleLadder - Climbable volume that can be destroyed temporarily.
 */
export class DestructibleLadder extends DestructibleBody {
    constructor({ collisionShape = null, bounds = null, mapKey = null, scene = null, position = { x: 0, y: 0 } } = {}) {
        const shape = collisionShape || (bounds ? { type: 'aabb', bounds } : null);
        super({ collisionShape: shape, movable: false, mapKey, scene, position });
        this.isLadder = true;
        this.blocksMovement = false;
    }
}
