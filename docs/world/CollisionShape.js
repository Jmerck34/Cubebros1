/**
 * CollisionShape - Base collision shape descriptor.
 */
export class CollisionShape {
    /**
     * @param {string} type
     * @param {Object} data
     */
    constructor(type = 'aabb', data = {}) {
        this.type = type;
        this.data = data;
    }

    getBounds() {
        return this.data?.bounds || null;
    }

    setBounds(bounds) {
        if (!this.data) {
            this.data = {};
        }
        this.data.bounds = bounds;
    }
}
