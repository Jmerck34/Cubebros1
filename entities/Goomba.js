import { EnemyBase } from './EnemyBase.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Goomba - Walking enemy that turns at edges
 * @class Goomba
 */
export class Goomba extends EnemyBase {
    constructor(scene, x, y) {
        super(scene, x, y, 0x5b8a4a); // Zombie green
        this.speed = 2;
        this.type = 'goomba';
    }

    /**
     * Update goomba with edge detection
     * @param {number} deltaTime - Time since last frame
     * @param {Level} level - Level instance
     */
    update(deltaTime, level) {
        if (!this.isAlive) return;

        // Call parent update for basic movement and gravity
        super.update(deltaTime, level);

        // Check if there's ground ahead (turn around at edges)
        this.checkEdges(level);

        // Check platform collisions for grounding
        this.checkPlatformCollisions(level);
    }

    /**
     * Check if there's ground ahead, turn around if not
     * @param {Level} level - Level instance
     */
    checkEdges(level) {
        // Look ahead in movement direction
        const aheadDistance = 1.0;
        const aheadX = this.position.x + (this.direction * aheadDistance);
        const aheadY = this.position.y - 1;

        // Check if there's a platform ahead
        let groundAhead = false;

        for (const platform of level.platforms) {
            const testBounds = {
                left: aheadX - 0.1,
                right: aheadX + 0.1,
                top: aheadY + 0.1,
                bottom: aheadY - 0.1
            };

            if (checkAABBCollision(testBounds, platform.bounds)) {
                groundAhead = true;
                break;
            }
        }

        // Turn around if no ground ahead (edge of platform)
        if (!groundAhead) {
            this.changeDirection();
        }
    }

    /**
     * Check collisions with platforms for grounding
     * @param {Level} level - Level instance
     */
    checkPlatformCollisions(level) {
        const goombaBounds = this.getBounds();

        for (const platform of level.platforms) {
            if (checkAABBCollision(goombaBounds, platform.bounds)) {
                // Simple ground collision
                if (this.velocity.y < 0) { // Falling
                    this.position.y = platform.bounds.top + 0.5;
                    this.velocity.y = 0;
                    this.mesh.position.y = this.position.y;
                }
            }
        }
    }
}
