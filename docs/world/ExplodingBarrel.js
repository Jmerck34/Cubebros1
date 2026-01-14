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
        detonateDelay = 1,
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
        const damage = Math.max(0, amount);
        if (damage <= 0) return;
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        if (!this.isIgnited) {
            this.isIgnited = true;
            this.detonationTimer = 0;
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

        if (this.isIgnited) {
            if (this.damageOverTime > 0) {
                this.currentHealth = Math.max(0, this.currentHealth - this.damageOverTime * deltaTime);
            }
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
