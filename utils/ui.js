/**
 * UI Manager - Updates ability UI based on hero state
 * @class UIManager
 */
export class UIManager {
    constructor(hero) {
        this.hero = hero;

        // Get DOM elements
        this.elements = {
            q: {
                slot: document.getElementById('ability-q'),
                overlay: document.getElementById('cooldown-q'),
                text: document.getElementById('cooldown-text-q')
            },
            w: {
                slot: document.getElementById('ability-w'),
                overlay: document.getElementById('cooldown-w'),
                text: document.getElementById('cooldown-text-w')
            },
            e: {
                slot: document.getElementById('ability-e'),
                overlay: document.getElementById('cooldown-e'),
                text: document.getElementById('cooldown-text-e')
            },
            r: {
                slot: document.getElementById('ability-r'),
                overlay: document.getElementById('cooldown-r'),
                text: document.getElementById('cooldown-text-r')
            }
        };

        this.ultimateBar = document.getElementById('ultimate-charge-bar');
    }

    /**
     * Update UI every frame
     */
    update() {
        // Update each ability
        this.updateAbility('q');
        this.updateAbility('w');
        this.updateAbility('e');
        this.updateAbility('r');

        // Update ultimate charge bar
        this.updateUltimateCharge();
    }

    /**
     * Update a single ability UI
     * @param {string} key - Ability key (q, w, e, r)
     */
    updateAbility(key) {
        const ability = this.hero.abilities[key];
        if (!ability) return;

        const elements = this.elements[key];

        if (ability.isReady) {
            // Ability is ready
            elements.slot.classList.add('ready');
            elements.overlay.style.height = '0%';
            elements.text.textContent = '';
        } else {
            // Ability on cooldown
            elements.slot.classList.remove('ready');

            // Calculate cooldown percentage
            const cooldownPercent = ability.getCooldownPercent();
            elements.overlay.style.height = `${cooldownPercent * 100}%`;

            // Show cooldown time
            const timeLeft = Math.ceil(ability.currentCooldown);
            elements.text.textContent = timeLeft > 0 ? timeLeft : '';
        }
    }

    /**
     * Update ultimate charge bar
     */
    updateUltimateCharge() {
        const chargePercent = this.hero.ultimateCharge / this.hero.ultimateChargeMax;
        this.ultimateBar.style.width = `${chargePercent * 100}%`;

        // Update ready state
        if (this.hero.ultimateCharge >= this.hero.ultimateChargeMax) {
            this.elements.r.slot.classList.add('ready');
        } else {
            this.elements.r.slot.classList.remove('ready');
        }
    }
}
