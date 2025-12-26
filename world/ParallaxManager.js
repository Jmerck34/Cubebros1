import { ParallaxLayer } from './ParallaxLayer.js';

/**
 * ParallaxManager - Updates all parallax layers based on camera movement.
 */
export class ParallaxManager {
    constructor(camera, intensity = 0.6) {
        this.camera = camera;
        this.layers = [];
        this.intensity = intensity;
    }

    /**
     * Register a new parallax layer.
     * @param {Object} config
     * @returns {ParallaxLayer}
     */
    addLayer(config) {
        const layer = new ParallaxLayer(config);
        this.layers.push(layer);
        return layer;
    }

    /**
     * Update all layers using current camera position.
     */
    update() {
        const cameraX = this.camera.position.x;
        this.layers.forEach(layer => layer.update(cameraX, this.intensity));
    }
}
