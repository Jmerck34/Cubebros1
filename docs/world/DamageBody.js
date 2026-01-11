import { Body } from './Body.js';

/**
 * DamageBody - Body that applies damage on contact.
 */
export class DamageBody extends Body {
    constructor({
        collisionShape = null,
        movable = false,
        mapKey = null,
        visibilityLayer = 0,
        damage = 1,
        damageCooldown = 0.2
    } = {}) {
        super({ collisionShape, movable: Boolean(movable), mapKey, visibilityLayer });
        this.isDamageBody = true;
        this.damage = Number.isFinite(damage) ? damage : 1;
        this.damageCooldown = Math.max(0, damageCooldown);
        this.lastDamageTime = 0;
    }

    canDamage(now = performance.now()) {
        return now - this.lastDamageTime >= this.damageCooldown * 1000;
    }

    applyDamage(player, now = performance.now()) {
        if (!player || typeof player.takeDamage !== 'function') {
            return false;
        }
        if (!this.canDamage(now)) {
            return false;
        }
        this.lastDamageTime = now;
        player.takeDamage(this.damage);
        return true;
    }
}
