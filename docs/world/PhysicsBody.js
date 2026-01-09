import { DestructibleBody } from './DestructibleBody.js';
import { GRAVITY } from '../core/constants.js';

/**
 * PhysicsBody - Destructible body affected by gravity and player pushes.
 */
export class PhysicsBody extends DestructibleBody {
    constructor({
        collisionShape = null,
        movable = true,
        mapKey = null,
        maxHealth = 100,
        respawnDelay = 3,
        scene = null,
        position = { x: 0, y: 0 },
        gravity = GRAVITY,
        respawnDistance = 20,
        indestructible = false
    } = {}) {
        super({ collisionShape, movable, mapKey, maxHealth, respawnDelay, scene, position });
        this.velocity = { x: 0, y: 0 };
        this.gravity = gravity;
        this.respawnDistance = Math.max(0, respawnDistance);
        this.indestructible = Boolean(indestructible);
    }

    takeDamage(amount = 1) {
        if (this.indestructible) return;
        super.takeDamage(amount);
    }

    applyImpulse(x = 0, y = 0) {
        this.velocity.x += x;
        this.velocity.y += y;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.isDestroyed) return;

        this.velocity.y += this.gravity * deltaTime;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        const dx = this.position.x - this.spawnPoint.x;
        const dy = this.position.y - this.spawnPoint.y;
        const dist = Math.hypot(dx, dy);
        if (this.respawnDistance > 0 && dist > this.respawnDistance) {
            this.respawn();
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
    }
}
