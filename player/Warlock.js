import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Warlock Hero - Dark magic wielder with staff
 * @class Warlock
 */
export class Warlock extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Change body color to dark purple/black (warlock theme)
        this.mesh.material.color.set(0x2d0052);

        // Add staff
        this.createEquipment(scene);

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Hover state
        this.isHovering = false;
        this.hoverCloud = null;

        // Converted enemies (mind control)
        this.convertedEnemies = [];

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;

        // Set warlock abilities
        this.initializeAbilities();
    }

    /**
     * Create staff visual
     * @param {THREE.Scene} scene - The scene
     */
    createEquipment(scene) {
        // Create STAFF
        this.staffGroup = new THREE.Group();

        // Staff shaft (long dark wood)
        const shaftGeometry = new THREE.BoxGeometry(0.1, 2, 0.1);
        const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0x2d1b00 });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.position.set(0, 0.5, 0);
        this.staffGroup.add(shaft);

        // Staff orb (glowing purple crystal)
        const orbGeometry = new THREE.SphereGeometry(0.2);
        const orbMaterial = new THREE.MeshBasicMaterial({ color: 0x9400d3 });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.position.set(0, 1.5, 0);
        this.staffGroup.add(orb);

        // Orb glow effect
        const glowGeometry = new THREE.SphereGeometry(0.25);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x9400d3,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 1.5, 0);
        this.staffGroup.add(glow);

        // Position staff
        this.staffGroup.position.set(0.5, -0.5, 0.1);
        this.staffGroup.rotation.z = 0.2;
        this.mesh.add(this.staffGroup);
        this.staff = this.staffGroup;
    }

    /**
     * Initialize warlock abilities
     */
    initializeAbilities() {
        // Q - Lightning Strike
        const lightningStrike = new Ability('Lightning Strike', 3);
        lightningStrike.use = (hero) => {
            if (!Ability.prototype.use.call(lightningStrike, hero)) return false;
            hero.castLightningStrike();
            return true;
        };

        // W - Fear
        const fear = new Ability('Fear', 5);
        fear.use = (hero) => {
            if (!Ability.prototype.use.call(fear, hero)) return false;
            hero.castFear();
            return true;
        };

        // E - Hover
        const hover = new Ability('Hover', 6);
        hover.use = (hero) => {
            if (!Ability.prototype.use.call(hover, hero)) return false;
            hero.activateHover();
            return true;
        };

        // R - Mind Control
        const mindControl = new Ability('Mind Control', 0, true);
        mindControl.use = (hero) => {
            hero.castMindControl();
            return true;
        };

        this.setAbilities(lightningStrike, fear, hover, mindControl);
    }

    /**
     * Update - Override to handle hover and facing direction
     */
    update(deltaTime, input) {
        // Update facing direction based on input
        if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        // If hovering, ignore gravity
        if (this.isHovering) {
            // Custom update without gravity
            this.velocity.x = 0;

            if (input.isLeftPressed()) {
                this.velocity.x = -5; // Slower while hovering
            }
            if (input.isRightPressed()) {
                this.velocity.x = 5;
            }

            this.position.x += this.velocity.x * deltaTime;

            // Update hover cloud position
            if (this.hoverCloud) {
                this.hoverCloud.position.x = this.position.x;
                this.hoverCloud.position.y = this.position.y - 0.8;
            }

            this.syncMeshPosition();
        } else {
            super.update(deltaTime, input);
        }
    }

    /**
     * Set facing direction and flip character
     */
    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction; // Flip entire mesh with staff
        }
    }

    /**
     * Cast Lightning Strike - Q Ability
     */
    castLightningStrike() {
        console.log('⚡ LIGHTNING STRIKE!');

        // Animate staff
        this.staff.rotation.z = -0.3;
        setTimeout(() => { this.staff.rotation.z = 0.2; }, 200);

        // Find target direction based on facing
        const direction = this.facingDirection;
        const strikeX = this.position.x + direction * 3;

        // Create lightning bolt
        const boltGeometry = new THREE.BoxGeometry(0.2, 4, 0.1);
        const boltMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
        bolt.position.set(strikeX, this.position.y + 2, 0.2);
        this.mesh.parent.add(bolt);

        // Lightning damage area
        const lightningBounds = {
            left: strikeX - 0.5,
            right: strikeX + 0.5,
            top: this.position.y + 4,
            bottom: this.position.y - 2
        };

        // Damage enemies
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(lightningBounds, enemyBounds)) {
                enemy.takeDamage();
                this.addUltimateCharge(this.ultimateChargePerKill);
                console.log('⚡ Lightning struck enemy!');
            }
        }

        // Flash effect
        setTimeout(() => {
            bolt.material.opacity = 0.4;
        }, 50);

        setTimeout(() => {
            this.mesh.parent.remove(bolt);
        }, 150);
    }

    /**
     * Cast Fear - W Ability
     */
    castFear() {
        console.log('😱 FEAR!');

        // Create fear wave
        const waveGeometry = new THREE.CircleGeometry(3, 16);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x4b0082,
            transparent: true,
            opacity: 0.5
        });
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.set(this.position.x, this.position.y, 0.1);
        this.mesh.parent.add(wave);

        // Fear radius
        const fearBounds = {
            left: this.position.x - 3,
            right: this.position.x + 3,
            top: this.position.y + 3,
            bottom: this.position.y - 3
        };

        // Turn enemies around (reverse direction)
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(fearBounds, enemyBounds)) {
                // Reverse enemy direction
                if (enemy.direction) {
                    enemy.direction *= -1;
                }
                // Flash enemy red
                const originalColor = enemy.mesh.material.color.getHex();
                enemy.mesh.material.color.set(0xff0000);
                setTimeout(() => {
                    enemy.mesh.material.color.set(originalColor);
                }, 500);

                console.log('😱 Enemy feared!');
            }
        }

        // Fade out wave
        let opacity = 0.5;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;
            wave.material.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(wave);
            }
        }, 30);
    }

    /**
     * Activate Hover - E Ability
     */
    activateHover() {
        console.log('☁️ HOVER!');

        this.isHovering = true;

        // Create dark cloud
        const cloudGeometry = new THREE.CircleGeometry(0.6, 16);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.7
        });
        this.hoverCloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.hoverCloud.position.set(this.position.x, this.position.y - 0.8, 0.05);
        this.mesh.parent.add(this.hoverCloud);

        // Lift player slightly
        this.position.y += 0.5;

        // Hover for 5 seconds
        setTimeout(() => {
            this.deactivateHover();
        }, 5000);
    }

    /**
     * Deactivate Hover
     */
    deactivateHover() {
        this.isHovering = false;

        if (this.hoverCloud) {
            this.mesh.parent.remove(this.hoverCloud);
            this.hoverCloud = null;
        }
    }

    /**
     * Cast Mind Control - R Ability (Ultimate)
     */
    castMindControl() {
        if (this.ultimateCharge < this.ultimateChargeMax) {
            console.log('Ultimate not ready!');
            return;
        }

        console.log('🧠 MIND CONTROL!');

        // Create mind control wave
        const waveGeometry = new THREE.CircleGeometry(4, 16);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x9400d3,
            transparent: true,
            opacity: 0.6
        });
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.set(this.position.x, this.position.y, 0.1);
        this.mesh.parent.add(wave);

        // Mind control radius
        const controlBounds = {
            left: this.position.x - 4,
            right: this.position.x + 4,
            top: this.position.y + 4,
            bottom: this.position.y - 4
        };

        // Convert nearby enemies
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(controlBounds, enemyBounds)) {
                this.convertEnemy(enemy);
            }
        }

        // Fade out wave
        let opacity = 0.6;
        let scale = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;
            scale += 0.1;
            wave.material.opacity = opacity;
            wave.scale.set(scale, scale, 1);

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(wave);
            }
        }, 30);

        // Consume ultimate charge
        this.ultimateCharge = 0;
    }

    /**
     * Convert enemy to player's side
     */
    convertEnemy(enemy) {
        console.log('🧠 Enemy converted!');

        // Change enemy color to purple (warlock-controlled)
        enemy.mesh.material.color.set(0x9400d3);

        // Reverse direction
        if (enemy.direction) {
            enemy.direction *= -1;
        }

        // Add to converted list
        this.convertedEnemies.push(enemy);

        // Revert after 10 seconds
        setTimeout(() => {
            if (enemy.isAlive) {
                enemy.mesh.material.color.set(0x8B4513); // Back to brown
                const index = this.convertedEnemies.indexOf(enemy);
                if (index > -1) {
                    this.convertedEnemies.splice(index, 1);
                }
                console.log('🧠 Enemy control wore off');
            }
        }, 10000);
    }
}
