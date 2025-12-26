/**
 * ParallaxLayer - Moves a layer based on camera movement and speed multiplier.
 * Supports optional horizontal tiling for infinite scrolling.
 */
export class ParallaxLayer {
    constructor({
        root,
        speedMultiplier = 1,
        tileWidth = 0,
        tiles = [],
        wrapPadding = 0
    }) {
        this.root = root;
        this.speedMultiplier = speedMultiplier;
        this.tileWidth = tileWidth;
        this.tiles = tiles;
        this.wrapPadding = wrapPadding || (tileWidth ? tileWidth * 0.5 : 0);
        this.baseX = root.position.x;
    }

    /**
     * Update layer position and wrap tiles if configured.
     * @param {number} cameraX
     */
    update(cameraX, intensity = 1) {
        const offsetX = cameraX * (1 - this.speedMultiplier) * intensity;
        this.root.position.x = this.baseX + offsetX;

        if (!this.tileWidth || this.tiles.length === 0) return;

        const span = this.tileWidth * this.tiles.length;
        const leftLimit = cameraX - this.tileWidth - this.wrapPadding;
        const rightLimit = cameraX + this.tileWidth + this.wrapPadding;

        this.tiles.forEach(tile => {
            const worldX = this.root.position.x + tile.position.x;
            if (worldX < leftLimit) {
                tile.position.x += span;
            } else if (worldX > rightLimit) {
                tile.position.x -= span;
            }
        });
    }
}
