import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PLAYER_SPEED, DEATH_Y, JUMP_VELOCITY } from '../core/constants.js';
import { applyGravity, handleJump } from './playerPhysics.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Player Entity - Handles player movement, physics, and state
 * @class Player
 */
export class Player {
    constructor(scene, startX = 0, startY = 0) {
        // Create player mesh (green cube)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green
        this.mesh = new THREE.Mesh(geometry, material);

        // Add to scene
        scene.add(this.mesh);

        // Physics properties
        this.position = { x: startX, y: startY, z: 0 };
        this.velocity = { x: 0, y: 0 };
        this.spawnPoint = { x: startX, y: startY };

        // State
        this.isGrounded = false;
        this.isAlive = true;

        // Jump state for double jump
        this.jumpsRemaining = 2; // Allow 2 jumps (ground + air)
        this.jumpKeyWasPressed = false; // Track key state to prevent spam

        // Sync mesh position
        this.syncMeshPosition();
    }

    /**
     * Update player position and physics
     * @param {number} deltaTime - Time since last frame
     * @param {InputManager} input - Input manager instance
     */
    update(deltaTime, input) {
        // Horizontal movement
        this.velocity.x = 0; // Reset horizontal velocity

        if (input.isLeftPressed()) {
            this.velocity.x = -PLAYER_SPEED;
        }
        if (input.isRightPressed()) {
            this.velocity.x = PLAYER_SPEED;
        }

        // Apply horizontal velocity
        this.position.x += this.velocity.x * deltaTime;

        // Handle jump input
        handleJump(this, input);

        // Apply gravity (collision handled by Level)
        applyGravity(this, deltaTime);

        // Check death zone
        if (this.position.y < DEATH_Y) {
            this.die();
        }

        // Sync mesh with internal position
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
     * Get player's current position
     * @returns {{x: number, y: number, z: number}}
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * Get player's axis-aligned bounding box
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
     * Handle player death - respawn at spawn point
     */
    die() {
        console.log('Player died - respawning');
        this.position.x = this.spawnPoint.x;
        this.position.y = this.spawnPoint.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.isGrounded = false;
        this.jumpsRemaining = 2;
    }

    /**
     * Get the player's mesh
     * @returns {THREE.Mesh}
     */
    getMesh() {
        return this.mesh;
    }

    /**
     * Check collisions with enemies
     * @param {Array} enemies - Array of enemy instances
     */
    checkEnemyCollisions(enemies) {
        const playerBounds = this.getBounds();

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();

            if (checkAABBCollision(playerBounds, enemyBounds)) {
                // Check if player is above enemy (stomping)
                const playerBottom = playerBounds.bottom;
                const enemyTop = enemyBounds.top;

                // Player is falling and above enemy = stomp
                if (this.velocity.y < 0 && playerBottom > enemyTop - 0.3) {
                    // Player stomped on enemy
                    enemy.takeDamage();
                    // Bounce player up slightly
                    this.velocity.y = JUMP_VELOCITY * 0.5;
                    console.log('Stomped enemy!');
                } else {
                    // Side collision - player takes damage
                    this.die();
                }
            }
        }
    }
}
