/**
 * Game Loop - Handles update and render cycles with delta time
 * @class GameLoop
 */
export class GameLoop {
    constructor(updateCallback, renderCallback, options = {}) {
        this.updateCallback = updateCallback;
        this.renderCallback = renderCallback;
        this.lastTime = 0;
        this.isRunning = false;
        this.loop = this.loop.bind(this);

        // Fixed-step simulation support (optional)
        this.fixedDt = Number.isFinite(options.fixedDt) ? options.fixedDt : null;
        this.maxSubSteps = Number.isFinite(options.maxSubSteps) ? options.maxSubSteps : 5;
        this.accumulator = 0;
        this.onSubSteps = typeof options.onSubSteps === 'function' ? options.onSubSteps : null;
    }

    /**
     * Start the game loop
     */
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Main loop function called every frame
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time in seconds
        let deltaTime = (currentTime - this.lastTime) / 1000;

        // Clamp delta time to prevent large jumps (e.g., when tab is inactive)
        deltaTime = Math.min(deltaTime, 0.1);

        // Update game logic
        if (this.fixedDt) {
            this.accumulator += deltaTime;
            let steps = 0;
            while (this.accumulator >= this.fixedDt && steps < this.maxSubSteps) {
                this.updateCallback(this.fixedDt);
                this.accumulator -= this.fixedDt;
                steps++;
            }
            if (this.onSubSteps) {
                this.onSubSteps(steps);
            }
        } else {
            this.updateCallback(deltaTime);
        }

        // Render frame
        this.renderCallback();

        // Store current time for next frame
        this.lastTime = currentTime;

        // Request next frame
        requestAnimationFrame(this.loop);
    }
}
