import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Ground - Creates a visible ground platform
 * @class Ground
 */
export class Ground {
    constructor(scene, width = 50, y = -3) {
        this.y = y;

        // Create ground geometry (using BoxGeometry for a solid platform)
        const geometry = new THREE.BoxGeometry(width, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
        this.mesh = new THREE.Mesh(geometry, material);

        // Position ground
        this.mesh.position.set(0, y, -0.1); // Slightly behind player (z = -0.1)

        // Add to scene
        scene.add(this.mesh);
    }

    /**
     * Get the Y position of the ground surface
     * @returns {number}
     */
    getY() {
        return this.y + 0.5; // Top of the ground (y + half height)
    }
}
