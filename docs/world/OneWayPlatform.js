import { Body } from './Body.js';

/**
 * OneWayPlatform - Pass-through from below, solid from above.
 */
export class OneWayPlatform extends Body {
    constructor({
        collisionShape = null,
        bounds = null,
        mapKey = null,
        solidFromAbove = true,
        allowDropThrough = true,
        dropThroughWindowMs = 200
    } = {}) {
        const shape = collisionShape || (bounds ? { type: 'aabb', bounds } : null);
        super({ collisionShape: shape, movable: false, mapKey });
        this.isOneWay = true;
        this.solidFromAbove = Boolean(solidFromAbove);
        this.allowDropThrough = Boolean(allowDropThrough);
        this.dropThroughWindowMs = Math.max(0, dropThroughWindowMs);
    }
}
