import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GRAVITY } from '../core/constants.js';

/**
 * Enemy Base Class - Foundation for all enemies
 * @class EnemyBase
 */
export class EnemyBase {
    constructor(scene, x, y, color = 0xff0000) {
        // Create enemy mesh (red cube by default)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);

        // Add to scene
        scene.add(this.mesh);

        // Physics properties
        this.position = { x, y, z: 0 };
        this.velocity = { x: 0, y: 0 };
        this.direction = -1; // -1 = left, 1 = right

        // Enemy properties
        this.speed = 2;
        this.isAlive = true;
        this.type = 'enemy';

        // Sync mesh position
        this.syncMeshPosition();
    }

    /**
     * Update enemy (override in subclasses)
     * @param {number} deltaTime - Time since last frame
     * @param {Level} level - Level instance for collision
     */
    update(deltaTime, level) {
        if (!this.isAlive) return;

        // Apply gravity
        this.velocity.y += GRAVITY * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Horizontal movement
        this.velocity.x = this.direction * this.speed;
        this.position.x += this.velocity.x * deltaTime;

        // Sync mesh
        this.syncMeshPosition();
    }

    /**
     * Sync Three.js mesh position with internal position
     */
    syncMeshPosition() {
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;
    }

    /**
     * Get enemy's axis-aligned bounding box
     * @returns {{left: number, right: number, top: number, bottom: number}}
     */
    getBounds() {
        return {
            left: this.position.x - 0.5,
            right: this.position.x + 0.5,
            top: this.position.y + 0.5,
            bottom: this.position.y - 0.5
        };
    }

    /**
     * Change enemy direction
     */
    changeDirection() {
        this.direction *= -1;
    }

    /**
     * Enemy takes damage and dies
     */
    takeDamage() {
        this.isAlive = false;
        this.mesh.visible = false;
        console.log('Enemy defeated!');
    }

    /**
     * Get enemy position
     * @returns {{x: number, y: number, z: number}}
     */
    getPosition() {
        return { ...this.position };
    }
}
