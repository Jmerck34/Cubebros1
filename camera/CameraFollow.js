/**
 * Camera Follow - Makes camera follow player horizontally
 * @class CameraFollow
 */
export class CameraFollow {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target;
        this.offset = { x: 0, y: 0, z: 10 };
        this.smoothing = 0; // 0 = instant follow, 0.1 = smooth
    }

    /**
     * Set camera smoothing factor
     * @param {number} value - Smoothing factor (0 = instant, 0.1 = smooth)
     */
    setSmoothing(value) {
        this.smoothing = value;
    }

    /**
     * Update camera position to follow target
     */
    update() {
        // Get target position
        const targetPos = this.target.getPosition();
        const targetX = targetPos.x + this.offset.x;

        if (this.smoothing > 0) {
            // Smooth follow (lerp)
            this.camera.position.x += (targetX - this.camera.position.x) * this.smoothing;
        } else {
            // Instant follow
            this.camera.position.x = targetX;
        }

        // Keep Y and Z fixed
        this.camera.position.y = this.offset.y;
        this.camera.position.z = this.offset.z;
    }
}
