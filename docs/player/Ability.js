/**
 * Base Ability Class - Foundation for all hero abilities
 * @class Ability
 */
export class Ability {
    constructor(name, cooldown, isUltimate = false, baseDamage = 1) {
        this.name = name;
        this.cooldown = cooldown; // Cooldown in seconds
        this.currentCooldown = 0;
        this.isUltimate = isUltimate;
        this.isReady = true;
        this.baseDamage = baseDamage; // Base damage for this ability

        // Debug multipliers (set by DebugMenu)
        this.damageMultiplier = 1.0;
        this.cooldownMultiplier = 1.0;
    }

    /**
     * Update ability cooldown
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (this.currentCooldown > 0) {
            // Apply cooldown multiplier (higher = faster cooldown recovery)
            const cooldownSpeed = this.cooldownMultiplier || 1.0;
            this.currentCooldown -= deltaTime * cooldownSpeed;

            if (this.currentCooldown <= 0) {
                this.currentCooldown = 0;
                this.isReady = true;
            }
        }
    }

    /**
     * Use the ability (override in subclasses)
     * @param {Hero} hero - The hero using the ability
     * @returns {boolean} - True if ability was used
     */
    use(hero) {
        if (!this.isReady) {
            console.log(`${this.name} is on cooldown! (${this.currentCooldown.toFixed(1)}s)`);
            return false;
        }

        // Start cooldown
        this.currentCooldown = this.cooldown;
        this.isReady = false;

        console.log(`${this.name} activated!`);
        return true;
    }

    /**
     * Get cooldown percentage (0-1)
     * @returns {number}
     */
    getCooldownPercent() {
        return this.currentCooldown / this.cooldown;
    }

    /**
     * Apply damage multiplier to a base damage value
     * @param {number} baseDamage - The base damage amount (optional, uses this.baseDamage if not provided)
     * @returns {number} - The damage after applying multiplier
     */
    getAdjustedDamage(baseDamage = null) {
        const damage = baseDamage !== null ? baseDamage : this.baseDamage;
        const adjustedDamage = damage * (this.damageMultiplier || 1.0);

        // Log if multiplier is not 1.0
        if (this.damageMultiplier !== 1.0) {
            console.log(`${this.name} damage: ${damage} × ${this.damageMultiplier.toFixed(2)} = ${adjustedDamage.toFixed(1)}`);
        }

        return adjustedDamage;
    }

    /**
     * Helper to deal damage to an enemy with multiplier applied
     * @param {Enemy} enemy - The enemy to damage
     * @param {number} baseDamageHits - Number of base damage hits (default 1)
     */
    damageEnemy(enemy, baseDamageHits = 1) {
        const adjustedDamage = this.getAdjustedDamage(baseDamageHits);
        const hits = Math.max(1, Math.round(adjustedDamage));

        for (let i = 0; i < hits; i++) {
            enemy.takeDamage();
        }
    }
}
