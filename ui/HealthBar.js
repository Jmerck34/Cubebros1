import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * HealthBar - Visual health indicator that follows the player
 * @class HealthBar
 */
export class HealthBar {
    constructor(scene, player, maxHealth = 100) {
        this.scene = scene;
        this.player = player;
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;

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
        this.currentHealth = Math.max(0, Math.min(health, this.maxHealth));

        // Update health bar width
        const healthPercentage = this.currentHealth / this.maxHealth;
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

        // Trigger damage flash if health decreased
        if (health < previousHealth) {
            this.triggerDamageFlash();
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
}
