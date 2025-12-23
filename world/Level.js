import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { checkAABBCollision, resolveCollisionY, resolveCollisionX } from '../utils/collision.js';

/**
 * Level - Manages platforms and level geometry
 * @class Level
 */
export class Level {
    constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.enemies = [];
    }

    /**
     * Add a platform to the level
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Platform width
     * @param {number} height - Platform height
     * @returns {Object} Platform object
     */
    addPlatform(x, y, width, height) {
        const geometry = new THREE.BoxGeometry(width, height, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00AA00 }); // Green platforms
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(x, y, 0);
        this.scene.add(mesh);

        const platform = {
            mesh,
            bounds: {
                left: x - width / 2,
                right: x + width / 2,
                top: y + height / 2,
                bottom: y - height / 2
            }
        };

        this.platforms.push(platform);
        return platform;
    }

    /**
     * Check and resolve collisions with platforms
     * @param {Player} player - Player instance
     */
    checkCollisions(player) {
        const playerBounds = player.getBounds();
        const playerVelocity = player.velocity;

        for (const platform of this.platforms) {
            if (checkAABBCollision(playerBounds, platform.bounds)) {
                // Determine collision direction based on velocity and overlap
                const overlapLeft = playerBounds.right - platform.bounds.left;
                const overlapRight = platform.bounds.right - playerBounds.left;
                const overlapTop = playerBounds.top - platform.bounds.bottom;
                const overlapBottom = platform.bounds.top - playerBounds.bottom;

                // Find smallest overlap to determine collision direction
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                // Resolve based on smallest overlap (most likely collision side)
                if (minOverlap === overlapBottom && playerVelocity.y < 0) {
                    // Player landed on top of platform (coming from above)
                    resolveCollisionY(player.position, platform.bounds, playerVelocity);
                    player.velocity.y = 0;
                    player.isGrounded = true;
                    player.mesh.position.y = player.position.y;
                } else if (minOverlap === overlapTop && playerVelocity.y > 0) {
                    // Player hit bottom of platform (jumping into it)
                    resolveCollisionY(player.position, platform.bounds, playerVelocity);
                    player.velocity.y = 0;
                    player.mesh.position.y = player.position.y;
                } else if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    // Player hit side of platform
                    resolveCollisionX(player.position, platform.bounds, playerVelocity);
                    player.velocity.x = 0;
                    player.mesh.position.x = player.position.x;
                }
            }
        }
    }

    /**
     * Add an enemy to the level
     * @param {EnemyBase} enemy - Enemy instance
     */
    addEnemy(enemy) {
        this.enemies.push(enemy);
    }

    /**
     * Update all enemies
     * @param {number} deltaTime - Time since last frame
     */
    updateEnemies(deltaTime) {
        for (const enemy of this.enemies) {
            if (enemy.isAlive) {
                enemy.update(deltaTime, this);
            }
        }
    }

    /**
     * Create a test level with floating platforms
     */
    createTestLevel() {
        // Main ground platform
        this.addPlatform(0, -3, 100, 1);

        // Floating platforms (thin)
        this.addPlatform(5, 0, 3, 0.5);
        this.addPlatform(10, 2, 3, 0.5);
        this.addPlatform(-5, 1, 4, 0.5);

        // Taller platforms for testing side collisions
        this.addPlatform(15, -1, 2, 3);    // Tall platform on right
        this.addPlatform(-10, 0, 2, 4);    // Very tall platform on left
        this.addPlatform(20, -2, 1.5, 2);  // Medium platform far right
    }
}
