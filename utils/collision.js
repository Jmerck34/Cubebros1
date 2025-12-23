/**
 * Check if two axis-aligned bounding boxes collide
 * @param {Object} box1 - {left, right, top, bottom}
 * @param {Object} box2 - {left, right, top, bottom}
 * @returns {boolean}
 */
export function checkAABBCollision(box1, box2) {
    return (
        box1.left < box2.right &&
        box1.right > box2.left &&
        box1.top > box2.bottom &&
        box1.bottom < box2.top
    );
}

/**
 * Resolve Y-axis collision (vertical)
 * @param {Object} moving - Position object with x, y
 * @param {Object} staticBounds - Bounding box of static object
 * @param {Object} velocity - Velocity object with x, y
 * @returns {string|null} - 'top' or 'bottom' or null
 */
export function resolveCollisionY(moving, staticBounds, velocity) {
    if (velocity.y > 0) {
        // Moving up, hit bottom of platform
        moving.y = staticBounds.bottom - 0.5;
        return 'bottom';
    } else if (velocity.y < 0) {
        // Moving down, hit top of platform
        moving.y = staticBounds.top + 0.5;
        return 'top';
    }
    return null;
}

/**
 * Resolve X-axis collision (horizontal)
 * @param {Object} moving - Position object with x, y
 * @param {Object} staticBounds - Bounding box of static object
 * @param {Object} velocity - Velocity object with x, y
 */
export function resolveCollisionX(moving, staticBounds, velocity) {
    if (velocity.x > 0) {
        // Moving right, colliding with left side
        moving.x = staticBounds.left - 0.5; // Half width
    } else if (velocity.x < 0) {
        // Moving left, colliding with right side
        moving.x = staticBounds.right + 0.5;
    }
}
