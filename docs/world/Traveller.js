/**
 * Traveller - Moves a body along a straight line segment.
 */
export class Traveller {
    /**
     * @param {Object} options
     * @param {{x:number,y:number}} options.start
     * @param {{x:number,y:number}} options.end
     * @param {number} options.speed
     * @param {boolean} options.loop
     */
    constructor({ start = { x: 0, y: 0 }, end = { x: 0, y: 0 }, speed = 1, loop = true } = {}) {
        this.start = { ...start };
        this.end = { ...end };
        this.speed = speed;
        this.loop = loop;
        this.progress = 0;
        this.direction = 1;
    }

    update(deltaTime) {
        const distance = Math.hypot(this.end.x - this.start.x, this.end.y - this.start.y) || 1;
        const delta = (this.speed * deltaTime) / distance;
        this.progress += delta * this.direction;

        if (this.progress >= 1 || this.progress <= 0) {
            if (this.loop) {
                this.progress = this.progress >= 1 ? 0 : 1;
            } else {
                this.progress = Math.max(0, Math.min(1, this.progress));
                this.direction *= -1;
            }
        }
        return this.getPosition();
    }

    getPosition() {
        const t = Math.max(0, Math.min(1, this.progress));
        return {
            x: this.start.x + (this.end.x - this.start.x) * t,
            y: this.start.y + (this.end.y - this.start.y) * t
        };
    }
}
