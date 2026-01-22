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
                text: document.getElementById(getId('cooldown-text-w')),
                dots: document.getElementById(getId('ability-w-dots')),
                preview: document.getElementById(getId('ability-w-preview'))
            },
            e: {
                slot: document.getElementById(getId('ability-e')),
                overlay: document.getElementById(getId('cooldown-e')),
                text: document.getElementById(getId('cooldown-text-e')),
                blockX: document.getElementById(getId('ability-block-e')),
                preview: document.getElementById(getId('ability-e-preview'))
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
        this.updateLightBoltDots();
        this.updateAlchemicalBombPreview();
        this.updateAlchemicalPotionPreview();
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

        if (this.hero && this.hero.constructor?.name === 'Acolyte') {
            const maxCharge = this.hero.divineBeamChargeMax;
            const currentCharge = this.hero.divineBeamCharge;
            if (!Number.isFinite(maxCharge) || maxCharge <= 0) {
                chargeWrap.style.opacity = '0';
                chargeFill.style.width = '0%';
                return;
            }
            const ratio = Number.isFinite(currentCharge) ? currentCharge / maxCharge : 0;
            const clamped = Math.max(0, Math.min(1, ratio));
            chargeFill.style.width = `${clamped * 100}%`;
            chargeFill.style.background = 'linear-gradient(90deg, #ffd37d, #fff0b8)';
            chargeWrap.style.opacity = '1';
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

    updateLightBoltDots() {
        const dotsWrap = this.elements.w?.dots;
        if (!dotsWrap) return;
        if (!this.hero || this.hero.constructor?.name !== 'Acolyte') {
            dotsWrap.style.opacity = '0';
            return;
        }

        const maxShots = Number.isFinite(this.hero.lightBoltAmmoMax) ? this.hero.lightBoltAmmoMax : 0;
        const shots = Number.isFinite(this.hero.lightBoltAmmo) ? this.hero.lightBoltAmmo : 0;
        const dots = Array.from(dotsWrap.children || []);
        dotsWrap.style.opacity = maxShots > 0 ? '1' : '0';
        dots.forEach((dot, index) => {
            if (!dot || !dot.classList) return;
            dot.classList.toggle('active', index < shots);
        });
    }

    updateAlchemicalBombPreview() {
        const preview = this.elements.w?.preview;
        if (!preview) return;
        if (!this.hero || this.hero.constructor?.name !== 'Alchemist') {
            preview.style.opacity = '0';
            return;
        }
        const queue = Array.isArray(this.hero.alchemicalBombQueue) ? this.hero.alchemicalBombQueue : [];
        const bars = Array.from(preview.children || []);
        const colors = {
            fire: '#ff5a2a',
            freeze: '#8fd7ff',
            oil: '#1b3f24',
            holy: '#f2c34a',
            fear: '#0a0a0a',
            disorient: '#8b4bd8',
            fragmentation: '#9a9a9a',
            lightning: '#3b78ff'
        };
        preview.style.opacity = '1';
        bars.forEach((bar, index) => {
            const type = queue[index];
            const liquid = bar.querySelector('.ability-bomb-liquid');
            if (liquid) {
                liquid.style.background = colors[type] || 'rgba(255, 255, 255, 0.25)';
            }
        });
    }

    updateAlchemicalPotionPreview() {
        const preview = this.elements.e?.preview;
        if (!preview) return;
        if (!this.hero || this.hero.constructor?.name !== 'Alchemist') {
            preview.style.opacity = '0';
            return;
        }
        const queue = Array.isArray(this.hero.alchemicalPotionQueue) ? this.hero.alchemicalPotionQueue : [];
        const colors = {
            shield: '#36b5ff',
            haste: '#ff8a2a',
            healing: '#ff3b3b',
            jump: '#cfe8ff',
            levitation: '#0a0a0a',
            growth: '#4dff4f'
        };
        const liquid = preview.querySelector('.ability-potion-liquid');
        if (liquid) {
            liquid.style.background = colors[queue[0]] || 'rgba(255, 255, 255, 0.3)';
        }
        preview.style.opacity = '1';
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
