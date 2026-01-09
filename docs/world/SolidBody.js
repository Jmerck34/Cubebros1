import { Body } from './Body.js';

/**
 * SolidBody - Immovable by player interaction; blocks passage.
 */
export class SolidBody extends Body {
    constructor({ collisionShape = null, movable = false, mapKey = null } = {}) {
        super({ collisionShape, movable: Boolean(movable), mapKey });
        this.isSolid = true;
    }
}
