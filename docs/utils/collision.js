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

function getAABBCorners(bounds) {
    return [
        { x: bounds.left, y: bounds.bottom },
        { x: bounds.right, y: bounds.bottom },
        { x: bounds.right, y: bounds.top },
        { x: bounds.left, y: bounds.top }
    ];
}

function getTriangleBounds(points) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
        left: Math.min(...xs),
        right: Math.max(...xs),
        bottom: Math.min(...ys),
        top: Math.max(...ys)
    };
}

function getPolygonAxes(points) {
    const axes = [];
    for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const edgeX = b.x - a.x;
        const edgeY = b.y - a.y;
        const length = Math.hypot(edgeX, edgeY) || 1;
        axes.push({ x: -edgeY / length, y: edgeX / length });
    }
    return axes;
}

function projectPoints(points, axis) {
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
        const proj = p.x * axis.x + p.y * axis.y;
        if (proj < min) min = proj;
        if (proj > max) max = proj;
    }
    return { min, max };
}

function getOverlap(a, b) {
    if (a.max < b.min || b.max < a.min) return null;
    return Math.min(a.max - b.min, b.max - a.min);
}

function satPolygonAABB(polyPoints, aabb) {
    const boxPoints = getAABBCorners(aabb);
    const axes = [
        ...getPolygonAxes(polyPoints),
        { x: 1, y: 0 },
        { x: 0, y: 1 }
    ];
    let smallestOverlap = Infinity;
    let smallestAxis = null;
    for (const axis of axes) {
        const projA = projectPoints(polyPoints, axis);
        const projB = projectPoints(boxPoints, axis);
        const overlap = getOverlap(projA, projB);
        if (overlap === null) return null;
        if (overlap < smallestOverlap) {
            smallestOverlap = overlap;
            smallestAxis = axis;
        }
    }
    if (!smallestAxis) return null;
    const polyCenter = polyPoints.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    polyCenter.x /= polyPoints.length;
    polyCenter.y /= polyPoints.length;
    const boxCenter = {
        x: (aabb.left + aabb.right) / 2,
        y: (aabb.bottom + aabb.top) / 2
    };
    const dirX = boxCenter.x - polyCenter.x;
    const dirY = boxCenter.y - polyCenter.y;
    const dot = dirX * smallestAxis.x + dirY * smallestAxis.y;
    const sign = dot < 0 ? -1 : 1;
    return {
        mtv: {
            x: smallestAxis.x * smallestOverlap * sign,
            y: smallestAxis.y * smallestOverlap * sign
        }
    };
}

export function preparePolygonCollisionShape(shape, options = {}) {
    if (!shape || shape.type !== 'polygon' || !Array.isArray(shape.triangles)) {
        return shape;
    }
    const cellSize = Number.isFinite(options.cellSize) ? options.cellSize : 2;
    shape.triangles = shape.triangles.map((tri) => {
        if (tri && tri.points) {
            if (!tri.bounds) {
                tri.bounds = getTriangleBounds(tri.points);
            }
            return tri;
        }
        const points = Array.isArray(tri) ? tri : [];
        return {
            points,
            bounds: getTriangleBounds(points)
        };
    });
    if (!shape.triangleIndex) {
        const cells = new Map();
        shape.triangles.forEach((tri, index) => {
            const bounds = tri.bounds;
            if (!bounds) return;
            const minX = Math.floor(bounds.left / cellSize);
            const maxX = Math.floor(bounds.right / cellSize);
            const minY = Math.floor(bounds.bottom / cellSize);
            const maxY = Math.floor(bounds.top / cellSize);
            for (let gx = minX; gx <= maxX; gx += 1) {
                for (let gy = minY; gy <= maxY; gy += 1) {
                    const key = `${gx},${gy}`;
                    if (!cells.has(key)) cells.set(key, []);
                    cells.get(key).push(index);
                }
            }
        });
        shape.triangleIndex = { cellSize, cells };
    }
    return shape;
}

function getCandidateTriangles(shape, bounds) {
    if (!shape || !shape.triangleIndex || !shape.triangleIndex.cells) {
        return shape.triangles || [];
    }
    const { cellSize, cells } = shape.triangleIndex;
    const minX = Math.floor(bounds.left / cellSize);
    const maxX = Math.floor(bounds.right / cellSize);
    const minY = Math.floor(bounds.bottom / cellSize);
    const maxY = Math.floor(bounds.top / cellSize);
    const indices = new Set();
    for (let gx = minX; gx <= maxX; gx += 1) {
        for (let gy = minY; gy <= maxY; gy += 1) {
            const key = `${gx},${gy}`;
            const list = cells.get(key);
            if (!list) continue;
            list.forEach((idx) => indices.add(idx));
        }
    }
    return Array.from(indices).map((idx) => shape.triangles[idx]).filter(Boolean);
}

export function resolvePolygonCollision(player, platform, velocity) {
    const shape = platform?.body?.collisionShape;
    if (!shape || shape.type !== 'polygon' || !Array.isArray(shape.triangles)) {
        return { collided: false };
    }
    const playerBounds = player.getBounds();
    const halfW = (playerBounds.right - playerBounds.left) / 2;
    const halfH = (playerBounds.top - playerBounds.bottom) / 2;
    let sweepBounds = playerBounds;
    let prevBounds = null;
    if (player.prevPosition && Number.isFinite(player.prevPosition.x) && Number.isFinite(player.prevPosition.y)) {
        prevBounds = {
            left: player.prevPosition.x - halfW,
            right: player.prevPosition.x + halfW,
            bottom: player.prevPosition.y - halfH,
            top: player.prevPosition.y + halfH
        };
        sweepBounds = {
            left: Math.min(prevBounds.left, playerBounds.left),
            right: Math.max(prevBounds.right, playerBounds.right),
            bottom: Math.min(prevBounds.bottom, playerBounds.bottom),
            top: Math.max(prevBounds.top, playerBounds.top)
        };
    }
    if (!checkAABBCollision(sweepBounds, platform.bounds)) {
        return { collided: false };
    }
    let smallest = null;
    const candidates = getCandidateTriangles(shape, sweepBounds);
    for (const tri of candidates) {
        const points = tri.points || tri;
        const triBounds = tri.bounds || getTriangleBounds(points);
        if (!checkAABBCollision(sweepBounds, triBounds)) {
            continue;
        }
        const result = satPolygonAABB(points, playerBounds);
        if (!result) continue;
        const depth = Math.hypot(result.mtv.x, result.mtv.y);
        if (!smallest || depth < smallest.depth) {
            smallest = { mtv: result.mtv, depth };
        }
    }
    if (!smallest) {
        if (velocity.y < 0 && prevBounds) {
            let bestTop = null;
            for (const tri of candidates) {
                const triBounds = tri.bounds || getTriangleBounds(tri.points || tri);
                if (playerBounds.right < triBounds.left || playerBounds.left > triBounds.right) continue;
                if (prevBounds.bottom >= triBounds.top && playerBounds.bottom <= triBounds.top) {
                    bestTop = bestTop === null ? triBounds.top : Math.max(bestTop, triBounds.top);
                }
            }
            if (bestTop !== null) {
                player.position.y = bestTop + halfH;
                player.mesh.position.y = player.position.y;
                velocity.y = 0;
                player.isGrounded = true;
                return { collided: true, grounded: true };
            }
        }
        if (velocity.x > 0 && prevBounds) {
            let bestLeft = null;
            for (const tri of candidates) {
                const triBounds = tri.bounds || getTriangleBounds(tri.points || tri);
                if (playerBounds.top < triBounds.bottom || playerBounds.bottom > triBounds.top) continue;
                if (prevBounds.right <= triBounds.left && playerBounds.right >= triBounds.left) {
                    bestLeft = bestLeft === null ? triBounds.left : Math.min(bestLeft, triBounds.left);
                }
            }
            if (bestLeft !== null) {
                player.position.x = bestLeft - halfW;
                player.mesh.position.x = player.position.x;
                velocity.x = 0;
                return { collided: true };
            }
        }
        if (velocity.x < 0 && prevBounds) {
            let bestRight = null;
            for (const tri of candidates) {
                const triBounds = tri.bounds || getTriangleBounds(tri.points || tri);
                if (playerBounds.top < triBounds.bottom || playerBounds.bottom > triBounds.top) continue;
                if (prevBounds.left >= triBounds.right && playerBounds.left <= triBounds.right) {
                    bestRight = bestRight === null ? triBounds.right : Math.max(bestRight, triBounds.right);
                }
            }
            if (bestRight !== null) {
                player.position.x = bestRight + halfW;
                player.mesh.position.x = player.position.x;
                velocity.x = 0;
                return { collided: true };
            }
        }
        return { collided: false };
    }

    player.position.x += smallest.mtv.x;
    player.position.y += smallest.mtv.y;
    player.mesh.position.x = player.position.x;
    player.mesh.position.y = player.position.y;

    const absX = Math.abs(smallest.mtv.x);
    const absY = Math.abs(smallest.mtv.y);
    let grounded = false;
    if (absY >= absX && smallest.mtv.y > 0 && velocity.y <= 0) {
        velocity.y = 0;
        player.isGrounded = true;
        grounded = true;
    } else if (absY >= absX && smallest.mtv.y < 0 && velocity.y > 0) {
        velocity.y = 0;
    } else if (absX > absY) {
        velocity.x = 0;
    }
    return { collided: true, grounded };
}
