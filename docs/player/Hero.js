import { Player } from './Player.js';
import { checkAABBCollision } from '../utils/collision.js';
import { JUMP_VELOCITY } from '../core/constants.js';

/**
 * Hero - Player with MOBA-style abilities
 * @class Hero
 */
export class Hero extends Player {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Ability system (object for named access)
        this.abilities = {
            q: null, // Ability 1
            w: null, // Ability 2
            e: null, // Ability 3
            r: null  // Ultimate
        };

        // Ability array for debug menu iteration
        this.abilitiesList = [];

        // Ultimate charge system
        this.ultimateCharge = 0;
        this.ultimateChargeMax = 100;
        this.ultimateChargeRate = 5; // Per second
        this.ultimateChargePerKill = 25;
    }

    /**
     * Update hero - includes ability cooldowns and ultimate charge
     * @param {number} deltaTime - Time since last frame
     * @param {InputManager} input - Input manager
     */
    update(deltaTime, input) {
        // Store input reference for ladder climbing
        this.input = input;

        // Call parent update for movement and physics
        super.update(deltaTime, input);

        // Update ability cooldowns
        for (const key in this.abilities) {
            if (this.abilities[key]) {
                this.abilities[key].update(deltaTime);
            }
        }

        // Charge ultimate over time (only if not at max)
        if (this.ultimateCharge < this.ultimateChargeMax) {
            this.ultimateCharge += this.ultimateChargeRate * deltaTime;
            if (this.ultimateCharge > this.ultimateChargeMax) {
                this.ultimateCharge = this.ultimateChargeMax;
            }
        }

        // Handle ability inputs
        this.handleAbilityInput(input);
    }

    /**
     * Handle ability key presses
     * @param {InputManager} input - Input manager
     */
    handleAbilityInput(input) {
        if (input.isAbility1Pressed() && this.abilities.q) {
            this.useAbility('q');
        }
        if (input.isAbility2Pressed() && this.abilities.w) {
            this.useAbility('w');
        }
        if (input.isAbility3Pressed() && this.abilities.e) {
            this.useAbility('e');
        }
        if (input.isUltimatePressed() && this.abilities.r) {
            this.useUltimate();
        }
    }

    /**
     * Use an ability
     * @param {string} key - Ability key (q, w, e)
     */
    useAbility(key) {
        const ability = this.abilities[key];
        if (ability) {
            ability.use(this);
        }
    }

    /**
     * Use ultimate ability
     */
    useUltimate() {
        const ultimate = this.abilities.r;
        if (!ultimate) return;

        // Check if ultimate is charged
        if (this.ultimateCharge < this.ultimateChargeMax) {
            console.log(`Ultimate not ready! (${this.ultimateCharge.toFixed(0)}/${this.ultimateChargeMax})`);
            return;
        }

        // Use ultimate
        if (ultimate.use(this)) {
            this.ultimateCharge = 0; // Reset charge
        }
    }

    /**
     * Add ultimate charge (e.g., from killing enemies)
     * @param {number} amount - Amount to add
     */
    addUltimateCharge(amount) {
        this.ultimateCharge += amount;
        if (this.ultimateCharge > this.ultimateChargeMax) {
            this.ultimateCharge = this.ultimateChargeMax;
        }
        console.log(`Ultimate charge: ${this.ultimateCharge.toFixed(0)}/${this.ultimateChargeMax}`);
    }

    /**
     * Apply ability damage with debug multiplier support
     * @param {Ability} ability - Ability instance (optional)
     * @param {Enemy} enemy - Enemy to damage
     * @param {number} baseHits - Base hit count for this ability
     */
    applyAbilityDamage(ability, enemy, baseHits = 1) {
        if (ability && typeof ability.damageEnemy === 'function') {
            ability.damageEnemy(enemy, baseHits);
            return;
        }

        // Fallback: no ability reference, use base hit count
        const hits = Math.max(1, Math.round(baseHits));
        for (let i = 0; i < hits; i++) {
            enemy.takeDamage();
        }
    }

    /**
     * Override checkEnemyCollisions to add ultimate charge on kill
     * @param {Array} enemies - Array of enemy instances
     */
    checkEnemyCollisions(enemies) {
        const playerBounds = this.getBounds();

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();

            if (checkAABBCollision(playerBounds, enemyBounds)) {
                const playerBottom = playerBounds.bottom;
                const enemyTop = enemyBounds.top;

                if (this.velocity.y < 0 && playerBottom > enemyTop - 0.3) {
                    // Player stomped on enemy
                    enemy.takeDamage();
                    this.velocity.y = JUMP_VELOCITY * 0.5;

                    // Add ultimate charge
                    this.addUltimateCharge(this.ultimateChargePerKill);

                    console.log('Stomped enemy!');
                } else {
                    // Side collision - player takes contact damage + knockback
                    this.applyEnemyContact(enemy);
                }
            }
        }
    }

    /**
     * Set hero abilities
     * @param {Ability} q - Ability 1
     * @param {Ability} w - Ability 2
     * @param {Ability} e - Ability 3
     * @param {Ability} r - Ultimate
     */
    setAbilities(q, w, e, r) {
        this.abilities.q = q;
        this.abilities.w = w;
        this.abilities.e = e;
        this.abilities.r = r;

        // Also create an array for easy iteration (used by debug menu)
        this.abilitiesList = [q, w, e, r];
    }
}
