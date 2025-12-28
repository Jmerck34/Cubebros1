/**
 * Game Loop - Handles update and render cycles with delta time
 * @class GameLoop
 */
export class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.updateCallback = updateCallback;
        this.renderCallback = renderCallback;
        this.lastTime = 0;
        this.isRunning = false;
        this.loop = this.loop.bind(this);
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
        this.updateCallback(deltaTime);

        // Render frame
        this.renderCallback();

        // Store current time for next frame
        this.lastTime = currentTime;

        // Request next frame
        requestAnimationFrame(this.loop);
    }
}
