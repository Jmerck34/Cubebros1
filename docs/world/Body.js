/**
 * Body - Base class for map objects with collision and movement metadata.
 */
export class Body {
    /**
     * @param {Object} options
     * @param {Object|null} options.collisionShape - Collision shape ({ type: 'aabb', bounds }).
     * @param {boolean} options.movable - Whether the body can move.
     * @param {string|null} options.mapKey - Optional map identifier.
     */
    constructor({ collisionShape = null, movable = false, mapKey = null } = {}) {
        this.collisionShape = collisionShape;
        this.movable = movable;
        this.mapKey = mapKey;
    }

    setCollisionShape(collisionShape) {
        this.collisionShape = collisionShape;
    }

    setMovable(movable) {
        this.movable = Boolean(movable);
    }

    setMapKey(mapKey) {
        this.mapKey = mapKey || null;
    }
}
