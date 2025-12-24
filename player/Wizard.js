import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Wizard Hero - Ranged caster with elemental magic
 * @class Wizard
 */
export class Wizard extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Change body color to blue (wizard theme)
        this.mesh.material.color.set(0x0000ff);

        // Add magic book
        this.createEquipment(scene);

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Kame Hame Ha charging state
        this.isChargingBeam = false;
        this.beamChargeTime = 0;

        // Bubble shield state
        this.bubbleShield = null;

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;

        // Set wizard abilities
        this.initializeAbilities();
    }

    /**
     * Create magic book visual
     * @param {THREE.Scene} scene - The scene
     */
    createEquipment(scene) {
        // Create BOOK
        this.bookGroup = new THREE.Group();

        // Book cover
        const bookGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.1);
        const bookMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const book = new THREE.Mesh(bookGeometry, bookMaterial);
        this.bookGroup.add(book);

        // Book pages (white)
        const pagesGeometry = new THREE.BoxGeometry(0.28, 0.38, 0.08);
        const pagesMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
        const pages = new THREE.Mesh(pagesGeometry, pagesMaterial);
        pages.position.set(0.01, 0, 0);
        this.bookGroup.add(pages);

        // Position book floating in front
        this.bookGroup.position.set(0.5, 0.2, 0.1);
        this.bookGroup.rotation.y = 0.3;
        this.mesh.add(this.bookGroup);
        this.book = this.bookGroup;
    }

    /**
     * Initialize wizard abilities
     */
    initializeAbilities() {
        // Q - Fireball
        const fireball = new Ability('Fireball', 2);
        fireball.use = (hero) => {
            if (!Ability.prototype.use.call(fireball, hero)) return false;
            hero.castFireball();
            return true;
        };

        // W - Wind Push
        const windPush = new Ability('Wind Push', 4);
        windPush.use = (hero) => {
            if (!Ability.prototype.use.call(windPush, hero)) return false;
            hero.castWindPush();
            return true;
        };

        // E - Bubble Shield
        const bubbleShield = new Ability('Bubble Shield', 6);
        bubbleShield.use = (hero) => {
            if (!Ability.prototype.use.call(bubbleShield, hero)) return false;
            hero.castBubbleShield();
            return true;
        };

        // R - Kame Hame Ha
        const kameHameHa = new Ability('Kame Hame Ha', 0, true);
        kameHameHa.use = (hero) => {
            hero.castKameHameHa();
            return true;
        };

        this.setAbilities(fireball, windPush, bubbleShield, kameHameHa);
    }

    /**
     * Update - Override to handle beam charging and facing direction
     */
    update(deltaTime, input) {
        // Update facing direction based on input
        if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        super.update(deltaTime, input);

        // Update beam charging
        if (this.isChargingBeam) {
            this.beamChargeTime += deltaTime;
        }
    }

    /**
     * Set facing direction and flip character
     */
    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction; // Flip entire mesh with book
        }
    }

    /**
     * Cast Fireball - Q Ability
     */
    castFireball() {
        console.log('🔥 FIREBALL!');

        // Animate book
        this.book.rotation.y = -0.3;
        setTimeout(() => { this.book.rotation.y = 0.3; }, 200);

        // Create fireball
        const fireballGeometry = new THREE.SphereGeometry(0.25);
        const fireballMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        const fireball = new THREE.Mesh(fireballGeometry, fireballMaterial);

        fireball.position.set(this.position.x + (0.5 * this.facingDirection), this.position.y, 0.2);
        this.mesh.parent.add(fireball);

        // Fire direction based on facing
        const direction = this.facingDirection;
        let fireballX = this.position.x;

        // Animate fireball
        const fireballInterval = setInterval(() => {
            fireballX += direction * 12 * 0.016;
            fireball.position.x = fireballX;

            // Check collision with enemies
            const fireballBounds = {
                left: fireballX - 0.25,
                right: fireballX + 0.25,
                top: this.position.y + 0.25,
                bottom: this.position.y - 0.25
            };

            let hit = false;
            for (const enemy of this.enemies) {
                if (!enemy.isAlive) continue;

                const enemyBounds = enemy.getBounds();
                if (checkAABBCollision(fireballBounds, enemyBounds)) {
                    enemy.takeDamage();
                    enemy.takeDamage(); // Strong damage
                    this.addUltimateCharge(this.ultimateChargePerKill);
                    console.log('🔥 Fireball hit!');
                    hit = true;
                    break;
                }
            }

            // Remove if hit or off screen
            if (hit || Math.abs(fireballX - this.position.x) > 15) {
                clearInterval(fireballInterval);
                this.mesh.parent.remove(fireball);

                if (hit) {
                    this.createExplosion(fireballX, this.position.y, 0xff4500);
                }
            }
        }, 16);
    }

    /**
     * Cast Wind Push - W Ability
     */
    castWindPush() {
        console.log('💨 WIND PUSH!');

        // Animate book
        this.book.scale.set(1.3, 1.3, 1.3);
        setTimeout(() => { this.book.scale.set(1, 1, 1); }, 300);

        // Create wind effect based on facing direction
        const direction = this.facingDirection;
        const windGeometry = new THREE.ConeGeometry(1, 2, 8);
        const windMaterial = new THREE.MeshBasicMaterial({
            color: 0xccffff,
            transparent: true,
            opacity: 0.6
        });
        const wind = new THREE.Mesh(windGeometry, windMaterial);
        wind.position.set(this.position.x + direction * 1.5, this.position.y, 0.2);
        wind.rotation.z = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.mesh.parent.add(wind);

        // Damage and knockback enemies
        const windBounds = {
            left: this.position.x + (direction > 0 ? 0 : -3),
            right: this.position.x + (direction > 0 ? 3 : 0),
            top: this.position.y + 1.5,
            bottom: this.position.y - 1.5
        };

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(windBounds, enemyBounds)) {
                enemy.takeDamage();
                // Knockback
                enemy.position.x += direction * 3;
                this.addUltimateCharge(this.ultimateChargePerKill);
                console.log('💨 Wind pushed enemy!');
            }
        }

        // Fade out wind
        setTimeout(() => {
            this.mesh.parent.remove(wind);
        }, 300);
    }

    /**
     * Cast Bubble Shield - E Ability
     */
    castBubbleShield() {
        console.log('🛡️ BUBBLE SHIELD!');

        // Create bubble shield
        const bubbleGeometry = new THREE.SphereGeometry(2, 16, 16);
        const bubbleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        this.bubbleShield = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        this.bubbleShield.position.set(this.position.x, this.position.y, 0);
        this.mesh.parent.add(this.bubbleShield);

        // Shield lasts 4 seconds
        setTimeout(() => {
            if (this.bubbleShield) {
                this.mesh.parent.remove(this.bubbleShield);
                this.bubbleShield = null;
            }
        }, 4000);
    }

    /**
     * Check if player is protected by shield
     */
    die() {
        if (this.bubbleShield) {
            console.log('Protected by bubble shield!');
            return; // Immune
        }
        super.die();
    }

    /**
     * Cast Kame Hame Ha - R Ability (Ultimate)
     */
    castKameHameHa() {
        if (this.ultimateCharge < this.ultimateChargeMax) {
            console.log('Ultimate not ready!');
            return;
        }

        console.log('⚡ KAME HAME HA!!! ⚡');

        // Start charging
        this.isChargingBeam = true;
        this.beamChargeTime = 0;

        // Charge for 2 seconds then fire
        setTimeout(() => {
            this.fireKameHameHa();
        }, 2000);

        // Charging visual
        const chargeGeometry = new THREE.SphereGeometry(0.5);
        const chargeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        const chargeOrb = new THREE.Mesh(chargeGeometry, chargeMaterial);
        chargeOrb.position.set(this.position.x + 0.5, this.position.y, 0.2);
        this.mesh.parent.add(chargeOrb);

        // Pulse charging orb
        let pulseSize = 0.5;
        let growing = true;
        const pulseInterval = setInterval(() => {
            if (growing) {
                pulseSize += 0.05;
                if (pulseSize >= 0.8) growing = false;
            } else {
                pulseSize -= 0.05;
                if (pulseSize <= 0.5) growing = true;
            }
            chargeOrb.scale.set(pulseSize / 0.5, pulseSize / 0.5, pulseSize / 0.5);
        }, 50);

        setTimeout(() => {
            clearInterval(pulseInterval);
            this.mesh.parent.remove(chargeOrb);
        }, 2000);
    }

    /**
     * Fire the charged beam
     */
    fireKameHameHa() {
        this.isChargingBeam = false;

        const direction = this.facingDirection;
        const damage = Math.floor(this.beamChargeTime * 2); // More charge = more damage

        // Create beam
        const beamGeometry = new THREE.BoxGeometry(10, 1, 0.2);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(this.position.x + direction * 5, this.position.y, 0.2);
        this.mesh.parent.add(beam);

        // Beam damage area
        const beamBounds = {
            left: this.position.x + (direction > 0 ? 0 : -10),
            right: this.position.x + (direction > 0 ? 10 : 0),
            top: this.position.y + 0.5,
            bottom: this.position.y - 0.5
        };

        // Damage all enemies in beam
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(beamBounds, enemyBounds)) {
                // Massive damage based on charge time
                for (let i = 0; i < damage; i++) {
                    enemy.takeDamage();
                }
                this.addUltimateCharge(this.ultimateChargePerKill);
                console.log(`⚡ KAME HAME HA hit for ${damage} damage!`);
            }
        }

        // Remove beam after 1 second
        setTimeout(() => {
            this.mesh.parent.remove(beam);
        }, 1000);

        // Consume ultimate charge
        this.ultimateCharge = 0;
    }

    /**
     * Create explosion effect
     */
    createExplosion(x, y, color) {
        const explosionGeometry = new THREE.CircleGeometry(0.5, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.set(x, y, 0.3);
        this.mesh.parent.add(explosion);

        let scale = 1;
        let opacity = 0.8;
        const explodeInterval = setInterval(() => {
            scale += 0.3;
            opacity -= 0.1;
            explosion.scale.set(scale, scale, 1);
            explosion.material.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(explodeInterval);
                this.mesh.parent.remove(explosion);
            }
        }, 30);
    }
}
