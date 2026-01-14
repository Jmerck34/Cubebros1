import { DestructibleBody } from './DestructibleBody.js';

/**
 * Bridge - Destructible one-way platform, optionally controlled externally.
 */
export class Bridge extends DestructibleBody {
    constructor({
        collisionShape = null,
        bounds = null,
        mapKey = null,
        scene = null,
        position = { x: 0, y: 0 },
        maxHealth = 100,
        respawnDelay = 3,
        controller = null,
        solidFromAbove = true,
        allowDropThrough = true,
        dropThroughWindowMs = 200
    } = {}) {
        const shape = collisionShape || (bounds ? { type: 'aabb', bounds } : null);
        super({ collisionShape: shape, movable: false, mapKey, scene, position, maxHealth, respawnDelay });
        this.isBridge = true;
        this.isOneWay = true;
        this.solidFromAbove = Boolean(solidFromAbove);
        this.allowDropThrough = Boolean(allowDropThrough);
        this.dropThroughWindowMs = Math.max(0, dropThroughWindowMs);
        this.canDropThrough = this.allowDropThrough;
        this.controller = controller;
        this.isActive = true;
    }

    setController(controller) {
        this.controller = controller;
    }

    setActive(active) {
        this.isActive = Boolean(active);
    }
}
