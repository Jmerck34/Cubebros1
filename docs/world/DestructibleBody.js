import { Body } from './Body.js';
import { HealthBar } from '../ui/HealthBar.js';

/**
 * DestructibleBody - Body with health, destruction, and respawn.
 */
export class DestructibleBody extends Body {
    constructor({
        collisionShape = null,
        movable = false,
        mapKey = null,
        maxHealth = 100,
        respawnDelay = 3,
        scene = null,
        position = { x: 0, y: 0 }
    } = {}) {
        super({ collisionShape, movable, mapKey });
        this.maxHealth = Math.max(1, Math.round(maxHealth));
        this.currentHealth = this.maxHealth;
        this.respawnDelay = Math.max(0, respawnDelay);
        this.respawnTimer = 0;
        this.isDestroyed = false;
        this.position = { x: position.x || 0, y: position.y || 0 };
        this.spawnPoint = { ...this.position };
        this.healthBar = scene ? new HealthBar(scene, this, this.maxHealth) : null;
    }

    getPosition() {
        return { x: this.position.x, y: this.position.y };
    }

    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        if (this.healthBar) {
            this.healthBar.update(0);
        }
    }

    takeDamage(amount = 1) {
        if (this.isDestroyed) return;
        const damage = Math.max(0, amount);
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        if (this.healthBar) {
            this.healthBar.setHealth(this.currentHealth);
        }
        if (this.currentHealth <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        this.respawnTimer = this.respawnDelay;
        this.currentHealth = 0;
        if (this.healthBar) {
            this.healthBar.setHealth(0);
        }
    }

    respawn() {
        this.isDestroyed = false;
        this.respawnTimer = 0;
        this.currentHealth = this.maxHealth;
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y);
        if (this.healthBar) {
            this.healthBar.setHealth(this.currentHealth);
        }
    }

    update(deltaTime) {
        if (this.isDestroyed && this.respawnDelay > 0) {
            this.respawnTimer = Math.max(0, this.respawnTimer - deltaTime);
            if (this.respawnTimer === 0) {
                this.respawn();
            }
        }
        if (this.healthBar) {
            this.healthBar.update(deltaTime);
        }
    }
}
