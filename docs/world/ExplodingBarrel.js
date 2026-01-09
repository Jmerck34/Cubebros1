import { PhysicsBody } from './PhysicsBody.js';

/**
 * ExplodingBarrel - Physics body that burns down to an explosion when damaged.
 */
export class ExplodingBarrel extends PhysicsBody {
    constructor({
        collisionShape = null,
        mapKey = null,
        scene = null,
        position = { x: 0, y: 0 },
        maxHealth = 60,
        respawnDelay = 6,
        damageOverTime = 20,
        detonateDelay = 0.5,
        onExplode = null
    } = {}) {
        super({ collisionShape, movable: true, mapKey, maxHealth, respawnDelay, scene, position });
        this.isExplodingBarrel = true;
        this.damageOverTime = Math.max(0, damageOverTime);
        this.detonateDelay = Math.max(0, detonateDelay);
        this.onExplode = onExplode;
        this.isIgnited = false;
        this.detonationTimer = 0;
    }

    takeDamage(amount = 1) {
        if (this.isDestroyed) return;
        super.takeDamage(amount);
        if (!this.isIgnited && !this.isDestroyed) {
            this.isIgnited = true;
        }
    }

    explode() {
        if (typeof this.onExplode === 'function') {
            this.onExplode(this);
        }
        this.destroy();
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.isDestroyed) return;

        if (this.isIgnited && this.damageOverTime > 0) {
            this.takeDamage(this.damageOverTime * deltaTime);
        }

        if (this.currentHealth <= 0 && !this.isDestroyed) {
            if (this.detonateDelay > 0) {
                this.detonationTimer += deltaTime;
                if (this.detonationTimer >= this.detonateDelay) {
                    this.explode();
                }
            } else {
                this.explode();
            }
        }
    }

    respawn() {
        super.respawn();
        this.isIgnited = false;
        this.detonationTimer = 0;
    }
}
