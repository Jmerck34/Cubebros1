import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { applyVisibilityLayer, VISIBILITY_LAYERS } from '../utils/visibility.js';

/**
 * Graphic2D - Base class for 2D visual elements or textures.
 */
export class Graphic2D {
    constructor(scene, options = {}) {
        this.scene = scene;
        const width = Number.isFinite(options.width) ? options.width : 1;
        const height = Number.isFinite(options.height) ? options.height : 1;
        const color = options.color != null ? options.color : 0xffffff;
        const texture = options.texture || null;
        const material = new THREE.MeshBasicMaterial({
            color,
            map: texture || null,
            transparent: true
        });
        const geometry = new THREE.PlaneGeometry(width, height);
        this.mesh = new THREE.Mesh(geometry, material);

        const visibilityLayer = options.visibilityLayer != null
            ? options.visibilityLayer
            : VISIBILITY_LAYERS.default;
        applyVisibilityLayer(this.mesh, visibilityLayer);

        if (scene) {
            scene.add(this.mesh);
        }
    }

    setPosition(x = 0, y = 0, z = undefined) {
        this.mesh.position.x = x;
        this.mesh.position.y = y;
        if (Number.isFinite(z)) {
            this.mesh.position.z = z;
        }
    }

    setVisible(visible) {
        this.mesh.visible = Boolean(visible);
    }

    destroy() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
