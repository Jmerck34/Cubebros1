import { normalizeVisibilityLayer } from '../utils/visibility.js';
import { preparePolygonCollisionShape } from '../utils/collision.js';

/**
 * Body - Base class for map objects with collision and movement metadata.
 */
export class Body {
    /**
     * @param {Object} options
     * @param {Object|null} options.collisionShape - Collision shape ({ type: 'aabb', bounds }).
     * @param {boolean} options.movable - Whether the body can move.
     * @param {string|null} options.mapKey - Optional map identifier.
     * @param {number} options.visibilityLayer - Visibility layer (-5 to 5).
     */
    constructor({ collisionShape = null, movable = false, mapKey = null, visibilityLayer = 0 } = {}) {
        this.collisionShape = null;
        this.setCollisionShape(collisionShape);
        this.movable = movable;
        this.mapKey = mapKey;
        this.visibilityLayer = normalizeVisibilityLayer(visibilityLayer);
    }

    setCollisionShape(collisionShape) {
        if (collisionShape && collisionShape.type === 'polygon') {
            this.collisionShape = preparePolygonCollisionShape(collisionShape);
            return;
        }
        this.collisionShape = collisionShape;
    }

    setMovable(movable) {
        this.movable = Boolean(movable);
    }

    setMapKey(mapKey) {
        this.mapKey = mapKey || null;
    }

    setVisibilityLayer(visibilityLayer) {
        this.visibilityLayer = normalizeVisibilityLayer(visibilityLayer, this.visibilityLayer);
    }

    getVisibilityLayer() {
        return this.visibilityLayer;
    }
}
