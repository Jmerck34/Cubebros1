/**
 * Camera Follow - Makes camera follow player horizontally
 * @class CameraFollow
 */
export class CameraFollow {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target;
        this.targets = Array.isArray(target) ? target : [target];
        this.offset = { x: 0, y: 0, z: 10 };
        this.smoothing = 0; // 0 = instant follow, 0.1 = smooth
        this.verticalFollowStart = 2.5;
        this.verticalFollowMaxOffset = 3;
    }

    /**
     * Set camera smoothing factor
     * @param {number} value - Smoothing factor (0 = instant, 0.1 = smooth)
     */
    setSmoothing(value) {
        this.smoothing = value;
    }

    /**
     * Configure vertical follow behavior
     * @param {number} startY - Y position where camera starts to follow upward
     * @param {number} maxOffset - Maximum upward camera offset
     */
    setVerticalFollow(startY, maxOffset) {
        this.verticalFollowStart = startY;
        this.verticalFollowMaxOffset = maxOffset;
    }

    /**
     * Update camera targets (single target or array)
     * @param {Object|Object[]} target
     */
    setTargets(target) {
        this.target = target;
        this.targets = Array.isArray(target) ? target : [target];
    }

    /**
     * Update camera position to follow target
     */
    update() {
        const activeTargets = this.targets || [];
        let minX = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let count = 0;

        for (const target of activeTargets) {
            if (!target || typeof target.getPosition !== 'function') continue;
            const targetPos = target.getPosition();
            minX = Math.min(minX, targetPos.x);
            maxX = Math.max(maxX, targetPos.x);
            maxY = Math.max(maxY, targetPos.y);
            count += 1;
        }

        if (count === 0) {
            return;
        }

        const targetX = ((minX + maxX) * 0.5) + this.offset.x;
        let targetY = this.offset.y;
        if (maxY > this.verticalFollowStart) {
            targetY += Math.min(this.verticalFollowMaxOffset, maxY - this.verticalFollowStart);
        }

        if (this.smoothing > 0) {
            // Smooth follow (lerp)
            this.camera.position.x += (targetX - this.camera.position.x) * this.smoothing;
            this.camera.position.y += (targetY - this.camera.position.y) * this.smoothing;
        } else {
            // Instant follow
            this.camera.position.x = targetX;
            this.camera.position.y = targetY;
        }

        // Keep Z fixed
        this.camera.position.z = this.offset.z;
    }
}
