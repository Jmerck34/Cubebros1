import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * HealthBar - Visual health indicator that follows the player
 * @class HealthBar
 */
export class HealthBar {
    constructor(scene, player, maxHealth = 100) {
        this.scene = scene;
        this.player = player;
        this.baseMaxHealth = maxHealth;
        this.bonusHealth = 0;
        this.shieldAmount = 0;
        this.maxHealth = this.baseMaxHealth + this.bonusHealth;
        this.currentHealth = maxHealth;
        this.shieldGap = 0.08;

        // Create health bar container group
        this.healthBarGroup = new THREE.Group();

        // Background bar (red - shows damage)
        const bgGeometry = new THREE.PlaneGeometry(1, 0.15);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.background = new THREE.Mesh(bgGeometry, bgMaterial);
        this.background.position.z = 0.6;
        this.healthBarGroup.add(this.background);

        // Foreground bar (green - shows current health)
        const fgGeometry = new THREE.PlaneGeometry(1, 0.15);
        const fgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.foreground = new THREE.Mesh(fgGeometry, fgMaterial);
        this.foreground.position.z = 0.61;
        this.healthBarGroup.add(this.foreground);

        // Bonus bar (blue - shows temporary health bonus)
        const bonusGeometry = new THREE.PlaneGeometry(1, 0.15);
        const bonusMaterial = new THREE.MeshBasicMaterial({ color: 0x3aa9ff, transparent: true, opacity: 0.85 });
        this.bonusBar = new THREE.Mesh(bonusGeometry, bonusMaterial);
        this.bonusBar.position.z = 0.615;
        this.bonusBar.scale.x = 0;
        this.bonusBar.visible = false;
        this.healthBarGroup.add(this.bonusBar);

        // Shield bar (separate bar to the right when shields are active)
        const shieldBorderGeometry = new THREE.PlaneGeometry(1.06, 0.19);
        const shieldBorderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.shieldBorder = new THREE.Mesh(shieldBorderGeometry, shieldBorderMaterial);
        this.shieldBorder.position.z = 0.614;
        this.shieldBorder.scale.x = 0;
        this.shieldBorder.visible = false;
        this.healthBarGroup.add(this.shieldBorder);

        const shieldGeometry = new THREE.PlaneGeometry(1, 0.15);
        const shieldMaterial = new THREE.MeshBasicMaterial({ color: 0x4fe4ff });
        this.shieldBar = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldBar.position.z = 0.616;
        this.shieldBar.scale.x = 0;
        this.shieldBar.visible = false;
        this.healthBarGroup.add(this.shieldBar);

        const shieldGlowGeometry = new THREE.PlaneGeometry(1.08, 0.2);
        const shieldGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x6fd8ff,
            transparent: true,
            opacity: 0.35
        });
        this.shieldGlow = new THREE.Mesh(shieldGlowGeometry, shieldGlowMaterial);
        this.shieldGlow.position.z = 0.613;
        this.shieldGlow.scale.x = 0;
        this.shieldGlow.visible = false;
        this.healthBarGroup.add(this.shieldGlow);

        // Border (black outline)
        const borderShape = new THREE.Shape();
        borderShape.moveTo(-0.52, -0.09);
        borderShape.lineTo(0.52, -0.09);
        borderShape.lineTo(0.52, 0.09);
        borderShape.lineTo(-0.52, 0.09);
        borderShape.lineTo(-0.52, -0.09);

        const holePath = new THREE.Path();
        holePath.moveTo(-0.50, -0.075);
        holePath.lineTo(-0.50, 0.075);
        holePath.lineTo(0.50, 0.075);
        holePath.lineTo(0.50, -0.075);
        holePath.lineTo(-0.50, -0.075);
        borderShape.holes.push(holePath);

        const borderGeometry = new THREE.ShapeGeometry(borderShape);
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.border = new THREE.Mesh(borderGeometry, borderMaterial);
        this.border.position.z = 0.62;
        this.healthBarGroup.add(this.border);

        // Team indicator (colored rectangle)
        const teamIndicatorGeometry = new THREE.PlaneGeometry(0.16, 0.15);
        const teamIndicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.teamIndicator = new THREE.Mesh(teamIndicatorGeometry, teamIndicatorMaterial);
        this.teamIndicator.position.set(-0.62, 0, 0.617);
        this.teamIndicator.visible = false;
        this.healthBarGroup.add(this.teamIndicator);

        // Position health bar above player
        this.updatePosition();
        this.scene.add(this.healthBarGroup);

        // Animation state
        this.damageFlashTime = 0;
        this.isFlashing = false;
    }

    /**
     * Update health bar position to follow player
     */
    updatePosition() {
        const playerPos = this.player.getPosition();
        this.healthBarGroup.position.set(
            playerPos.x,
            playerPos.y + 0.8, // Above player's head
            0
        );
    }

    /**
     * Set current health and update visual
     * @param {number} health - New health value
     */
    setHealth(health) {
        const previousHealth = this.currentHealth;
        const maxHealth = this.baseMaxHealth + this.bonusHealth;
        this.maxHealth = maxHealth;
        this.currentHealth = Math.max(0, Math.min(health, maxHealth));

        // Update health bar width
        const baseMax = Math.max(1, this.baseMaxHealth);
        const shieldHealth = Math.max(0, this.bonusHealth);
        const baseHealth = Math.max(0, Math.min(this.currentHealth - shieldHealth, this.baseMaxHealth));
        const healthPercentage = baseHealth / baseMax;
        this.foreground.scale.x = healthPercentage;

        // Adjust position to keep bar left-aligned
        const offset = (1 - healthPercentage) / 2;
        this.foreground.position.x = -offset;

        // Update color based on health percentage
        if (healthPercentage > 0.6) {
            this.foreground.material.color.set(0x00ff00); // Green
        } else if (healthPercentage > 0.3) {
            this.foreground.material.color.set(0xffff00); // Yellow
        } else {
            this.foreground.material.color.set(0xff6600); // Orange-red
        }

        const bonusPercent = shieldHealth / baseMax;
        if (bonusPercent > 0) {
            const shieldWidth = Math.min(bonusPercent, 1);
            const baseEnd = -0.5 + healthPercentage;
            const maxStart = 0.5 - shieldWidth;
            const start = Math.min(baseEnd, maxStart);
            this.bonusBar.scale.x = shieldWidth;
            this.bonusBar.position.x = start + shieldWidth / 2;
            this.bonusBar.visible = true;
        } else {
            this.bonusBar.scale.x = 0;
            this.bonusBar.visible = false;
        }

        this.updateShieldBar();

        // Trigger damage flash if health decreased
        if (health < previousHealth) {
            this.triggerDamageFlash();
        }
    }

    /**
     * Set base max health (non-bonus).
     * @param {number} maxHealth
     */
    setBaseMaxHealth(maxHealth) {
        this.baseMaxHealth = Math.max(1, maxHealth);
        this.maxHealth = this.baseMaxHealth + this.bonusHealth;
        this.setHealth(this.currentHealth);
    }

    /**
     * Set bonus health amount.
     * @param {number} amount
     */
    setBonusHealth(amount) {
        this.bonusHealth = Math.max(0, amount);
        this.maxHealth = this.baseMaxHealth + this.bonusHealth;
        this.setHealth(this.currentHealth);
    }

    /**
     * Set current shield amount.
     * @param {number} amount
     */
    setShield(amount) {
        this.shieldAmount = Math.max(0, amount);
        this.updateShieldBar();
    }

    updateShieldBar() {
        if (!this.shieldBar || !this.shieldGlow || !this.shieldBorder) return;
        const baseMax = Math.max(1, this.baseMaxHealth);
        const shieldPercent = Math.min(1, this.shieldAmount / baseMax);
        if (shieldPercent > 0) {
            const shieldWidth = shieldPercent;
            this.shieldBorder.scale.x = shieldWidth;
            this.shieldBorder.position.x = 0.5 + this.shieldGap + shieldWidth / 2;
            this.shieldBorder.visible = true;
            this.shieldBar.scale.x = shieldWidth;
            this.shieldBar.position.x = 0.5 + this.shieldGap + shieldWidth / 2;
            this.shieldBar.visible = true;
            this.shieldGlow.scale.x = shieldWidth;
            this.shieldGlow.position.x = this.shieldBar.position.x;
            this.shieldGlow.visible = true;
        } else {
            this.shieldBorder.scale.x = 0;
            this.shieldBorder.visible = false;
            this.shieldBar.scale.x = 0;
            this.shieldBar.visible = false;
            this.shieldGlow.scale.x = 0;
            this.shieldGlow.visible = false;
        }
    }

    /**
     * Damage the player
     * @param {number} amount - Amount of damage
     */
    takeDamage(amount) {
        this.setHealth(this.currentHealth - amount);
    }

    /**
     * Heal the player
     * @param {number} amount - Amount of healing
     */
    heal(amount) {
        this.setHealth(this.currentHealth + amount);
    }

    /**
     * Trigger red flash animation on damage
     */
    triggerDamageFlash() {
        this.isFlashing = true;
        this.damageFlashTime = 0;
    }

    /**
     * Update health bar (call every frame)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Update position to follow player
        this.updatePosition();
        this.updateTeamIndicator();

        // Handle damage flash animation
        if (this.isFlashing) {
            this.damageFlashTime += deltaTime;

            // Flash duration: 0.3 seconds
            if (this.damageFlashTime < 0.3) {
                // Pulse border red
                const flashIntensity = Math.sin(this.damageFlashTime * 30) * 0.5 + 0.5;
                this.border.material.color.setRGB(
                    flashIntensity,
                    0,
                    0
                );
            } else {
                // Flash complete - reset to black
                this.isFlashing = false;
                this.border.material.color.set(0x000000);
            }
        }
    }

    /**
     * Get current health
     * @returns {number}
     */
    getHealth() {
        return this.currentHealth;
    }

    /**
     * Get max health
     * @returns {number}
     */
    getMaxHealth() {
        return this.maxHealth;
    }

    /**
     * Check if player is dead
     * @returns {boolean}
     */
    isDead() {
        return this.currentHealth <= 0;
    }

    /**
     * Remove health bar from scene
     */
    destroy() {
        this.scene.remove(this.healthBarGroup);
    }

    /**
     * Hide health bar
     */
    hide() {
        this.healthBarGroup.visible = false;
    }

    /**
     * Show health bar
     */
    show() {
        this.healthBarGroup.visible = true;
    }

    /**
     * Set overall health bar opacity.
     * @param {number} opacity
     */
    setOpacity(opacity) {
        const clamped = Math.max(0, Math.min(1, opacity));
        if (!this.healthBarGroup) return;
        this.healthBarGroup.traverse((child) => {
            if (child.material && typeof child.material.opacity === 'number') {
                child.material.transparent = true;
                child.material.opacity = clamped;
            }
        });
    }

    updateTeamIndicator() {
        if (!this.teamIndicator || !this.player) return;
        const team = this.player.team;
        if (!team) {
            this.teamIndicator.visible = false;
            return;
        }
        const color = this.getTeamColor(team);
        this.teamIndicator.material.color.set(color);
        this.teamIndicator.visible = true;
    }

    getTeamColor(team) {
        switch (team) {
            case 'blue':
                return 0x3b82f6;
            case 'red':
                return 0xef4444;
            case 'yellow':
                return 0xfacc15;
            case 'green':
                return 0x22c55e;
            default:
                return 0xffffff;
        }
    }
}
