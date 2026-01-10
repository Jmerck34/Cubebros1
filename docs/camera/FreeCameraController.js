/**
 * FreeCameraController - Manual camera movement with keyboard.
 */
export class FreeCameraController {
    constructor(camera) {
        this.camera = camera;
        this.enabled = false;
        this.speed = 10;
        this.fastMultiplier = 2.2;
        this.keys = {};

        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            if (this.enabled && this.isMoveKey(event.code)) {
                event.preventDefault();
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }

    isMoveKey(code) {
        return code === 'KeyW'
            || code === 'KeyA'
            || code === 'KeyS'
            || code === 'KeyD'
            || code === 'ArrowUp'
            || code === 'ArrowLeft'
            || code === 'ArrowDown'
            || code === 'ArrowRight'
            || code === 'ShiftLeft'
            || code === 'ShiftRight';
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    update(deltaTime) {
        if (!this.enabled || !this.camera) return;
        const left = this.keys.KeyA || this.keys.ArrowLeft;
        const right = this.keys.KeyD || this.keys.ArrowRight;
        const up = this.keys.KeyW || this.keys.ArrowUp;
        const down = this.keys.KeyS || this.keys.ArrowDown;
        const shift = this.keys.ShiftLeft || this.keys.ShiftRight;
        const speed = this.speed * (shift ? this.fastMultiplier : 1);

        let dx = 0;
        let dy = 0;
        if (left) dx -= 1;
        if (right) dx += 1;
        if (up) dy += 1;
        if (down) dy -= 1;

        if (dx === 0 && dy === 0) return;
        const length = Math.hypot(dx, dy) || 1;
        dx /= length;
        dy /= length;

        this.camera.position.x += dx * speed * deltaTime;
        this.camera.position.y += dy * speed * deltaTime;
    }
}
