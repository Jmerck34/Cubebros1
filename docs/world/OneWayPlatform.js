import { Body } from './Body.js';

/**
 * OneWayPlatform - Pass-through from below, solid from above.
 */
export class OneWayPlatform extends Body {
    constructor({ collisionShape = null, bounds = null, mapKey = null } = {}) {
        const shape = collisionShape || (bounds ? { type: 'aabb', bounds } : null);
        super({ collisionShape: shape, movable: false, mapKey });
        this.isOneWay = true;
        this.canDropThrough = true;
    }
}
