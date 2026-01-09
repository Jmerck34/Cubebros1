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
        controller = null
    } = {}) {
        const shape = collisionShape || (bounds ? { type: 'aabb', bounds } : null);
        super({ collisionShape: shape, movable: false, mapKey, scene, position, maxHealth, respawnDelay });
        this.isBridge = true;
        this.isOneWay = true;
        this.canDropThrough = true;
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
