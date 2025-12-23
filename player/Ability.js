/**
 * Base Ability Class - Foundation for all hero abilities
 * @class Ability
 */
export class Ability {
    constructor(name, cooldown, isUltimate = false) {
        this.name = name;
        this.cooldown = cooldown; // Cooldown in seconds
        this.currentCooldown = 0;
        this.isUltimate = isUltimate;
        this.isReady = true;
    }

    /**
     * Update ability cooldown
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= deltaTime;
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
}
