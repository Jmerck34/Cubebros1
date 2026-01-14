import { Body } from './Body.js';

/**
 * FlagPlate - Base capture plate for CTF flags.
 * Holds a team identifier used for spawn/capture logic.
 */
export class FlagPlate extends Body {
    constructor({
        team = 'neutral',
        bounds = null,
        mapKey = null,
        position = { x: 0, y: 0 }
    } = {}) {
        const collisionShape = bounds ? { type: 'aabb', bounds } : null;
        super({ collisionShape, movable: false, mapKey });
        this.team = team;
        this.position = { x: position.x || 0, y: position.y || 0 };
        this.isFlagPlate = true;
    }

    getBounds() {
        const bounds = this.collisionShape && this.collisionShape.bounds;
        if (!bounds) {
            return {
                left: this.position.x - 0.5,
                right: this.position.x + 0.5,
                top: this.position.y + 0.5,
                bottom: this.position.y - 0.5
            };
        }
        return bounds;
    }
}
