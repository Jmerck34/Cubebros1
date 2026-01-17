/**
 * UI Manager - Updates ability UI based on hero state
 * @class UIManager
 */
export class UIManager {
    constructor(hero, options = {}) {
        this.hero = hero;
        const suffix = options.suffix ? `-${options.suffix}` : '';
        const getId = (base) => `${base}${suffix}`;

        // Get DOM elements
        this.elements = {
            q: {
                slot: document.getElementById(getId('ability-q')),
                overlay: document.getElementById(getId('cooldown-q')),
                text: document.getElementById(getId('cooldown-text-q')),
                chargeWrap: document.getElementById(getId('charge-meter-q')),
                chargeFill: document.getElementById(getId('charge-meter-fill-q')),
                dots: document.getElementById(getId('ability-q-dots'))
            },
            w: {
                slot: document.getElementById(getId('ability-w')),
                overlay: document.getElementById(getId('cooldown-w')),
                text: document.getElementById(getId('cooldown-text-w'))
            },
            e: {
                slot: document.getElementById(getId('ability-e')),
                overlay: document.getElementById(getId('cooldown-e')),
                text: document.getElementById(getId('cooldown-text-e')),
                blockX: document.getElementById(getId('ability-block-e'))
            },
            r: {
                slot: document.getElementById(getId('ability-r')),
                overlay: document.getElementById(getId('cooldown-r')),
                text: document.getElementById(getId('cooldown-text-r'))
            }
        };

        this.ultimateBar = document.getElementById(getId('ultimate-charge-bar'));
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

        // Update charge shot meter (Archer)
        this.updateChargeMeter();
        this.updateSwingDots();
        this.updateFlagBlock();
    }

    /**
     * Update a single ability UI
     * @param {string} key - Ability key (q, w, e, r)
     */
    updateAbility(key) {
        const ability = this.hero.abilities[key];
        if (!ability) return;

        const elements = this.elements[key];
        if (!elements || !elements.slot || !elements.overlay || !elements.text) {
            return;
        }

        if (ability.isReady) {
            // Ability is ready
            elements.slot.classList.add('ready');
            elements.overlay.style.height = '0%';
            elements.text.textContent = '';
        } else {
            // Ability on cooldown
            elements.slot.classList.remove('ready');

            // Calculate cooldown percentage
            const cooldownPercent = Math.max(0, Math.min(1, ability.getCooldownPercent()));
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
        if (this.ultimateBar) {
            this.ultimateBar.style.width = `${chargePercent * 100}%`;
        }

        // Update ready state
        const ultimateSlot = this.elements.r ? this.elements.r.slot : null;
        if (ultimateSlot) {
            if (this.hero.ultimateCharge >= this.hero.ultimateChargeMax) {
                ultimateSlot.classList.add('ready');
            } else {
                ultimateSlot.classList.remove('ready');
            }
        }
    }

    /**
     * Update Archer charge shot meter
     */
    updateChargeMeter() {
        const chargeWrap = this.elements.q?.chargeWrap;
        const chargeFill = this.elements.q?.chargeFill;
        if (!chargeWrap || !chargeFill) {
            return;
        }

        const maxCharge = this.hero?.maxChargeTime;
        const currentCharge = this.hero?.chargeTime;
        const isCharging = Boolean(this.hero?.isCharging);

        if (!Number.isFinite(maxCharge) || maxCharge <= 0) {
            chargeWrap.style.opacity = '0';
            chargeFill.style.width = '0%';
            return;
        }

        const ratio = Number.isFinite(currentCharge) ? currentCharge / maxCharge : 0;
        const clamped = Math.max(0, Math.min(1, ratio));
        chargeFill.style.width = `${clamped * 100}%`;
        chargeWrap.style.opacity = clamped > 0 || isCharging ? '1' : '0';
    }

    updateSwingDots() {
        const dotsWrap = this.elements.q?.dots;
        if (!dotsWrap) return;
        if (!this.hero || this.hero.constructor?.name !== 'Paladin') {
            dotsWrap.style.opacity = '0';
            return;
        }

        const count = Number.isFinite(this.hero.maceBasicCounter) ? this.hero.maceBasicCounter : 0;
        const filled = count % 3;
        const dots = Array.from(dotsWrap.children || []);
        dotsWrap.style.opacity = '1';
        dots.forEach((dot, index) => {
            if (!dot || !dot.classList) return;
            dot.classList.toggle('active', index < filled);
        });
    }

    updateFlagBlock() {
        const blockX = this.elements.e?.blockX;
        const slot = this.elements.e?.slot;
        if (!blockX || !slot) return;
        const blocked = Boolean(this.hero?.isCarryingFlag && this.hero?.flagCarryBlocksAbility3);
        blockX.style.display = blocked ? 'flex' : 'none';
        slot.classList.toggle('flag-blocked', blocked);
    }
}
