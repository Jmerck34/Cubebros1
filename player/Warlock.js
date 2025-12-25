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

            // Still check for ability inputs while hovering
            this.handleAbilityInput(input);
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
     * Cast Lightning Strike - Q Ability (Expanding branching lightning)
     */
    castLightningStrike() {
        console.log('⚡ LIGHTNING STRIKE!');

        // Cancel hover when using ability
        if (this.isHovering) {
            this.deactivateHover();
        }

        // Animate staff
        this.staff.rotation.z = -0.3;
        setTimeout(() => { this.staff.rotation.z = 0.2; }, 200);

        const direction = this.facingDirection;
        const lightningBolts = [];
        const startX = this.position.x;
        const startY = this.position.y;

        // Create main lightning branch from hero
        const createBolt = (x1, y1, x2, y2, width = 0.08, color = 0xffff00, opacity = 0.9) => {
            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = Math.atan2(y2 - y1, x2 - x1);

            const boltGeometry = new THREE.PlaneGeometry(length, width);
            const boltMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: opacity
            });
            const bolt = new THREE.Mesh(boltGeometry, boltMaterial);

            bolt.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0.2);
            bolt.rotation.z = angle;
            this.mesh.parent.add(bolt);

            return bolt;
        };

        // Lightning animation over time
        let lightningTime = 0;
        const maxDuration = 0.3; // seconds
        const maxDistance = 4;

        const lightningInterval = setInterval(() => {
            lightningTime += 0.05;

            // Clear previous bolts
            lightningBolts.forEach(bolt => {
                if (bolt.parent) this.mesh.parent.remove(bolt);
            });
            lightningBolts.length = 0;

            // Lightning starts from hero's current position (follows hero)
            const currentStartX = this.position.x;
            const currentStartY = this.position.y;

            // Create main lightning path (always at max distance)
            let currentX = currentStartX;
            let currentY = currentStartY;
            const segments = Math.floor(maxDistance * 3);

            // Pulsing intensity
            const pulseIntensity = 0.6 + Math.sin(lightningTime * 20) * 0.3 + Math.random() * 0.1;

            for (let i = 0; i < segments; i++) {
                const segmentDistance = maxDistance / segments;
                const nextX = currentX + direction * segmentDistance + (Math.random() - 0.5) * 0.3;
                // Flip Y offset vertically when going left
                const yOffset = (Math.random() - 0.5) * 0.4;
                const nextY = currentY + (direction > 0 ? yOffset : -yOffset);

                // Main bolt with pulsing opacity
                const bolt = createBolt(currentX, currentY, nextX, nextY, 0.1, 0xffff00, 0.9 * pulseIntensity);
                lightningBolts.push(bolt);

                // Inner glow with pulsing
                const glow = createBolt(currentX, currentY, nextX, nextY, 0.15, 0xffffff, 0.6 * pulseIntensity);
                lightningBolts.push(glow);

                // More frequent sporadic branches (flipped when going left)
                if (Math.random() > 0.5) {
                    const branchAngle = (Math.random() - 0.5) * Math.PI / 2;
                    const branchLength = 0.3 + Math.random() * 0.6;
                    // Flip both X and Y for branches when going left
                    const branchXOffset = Math.cos(branchAngle) * branchLength;
                    const branchYOffset = Math.sin(branchAngle) * branchLength;
                    const branchEndX = nextX + (direction > 0 ? branchXOffset : -branchXOffset);
                    const branchEndY = nextY + (direction > 0 ? branchYOffset : -branchYOffset);

                    const branch = createBolt(nextX, nextY, branchEndX, branchEndY, 0.06, 0xffff00, 0.7 * pulseIntensity);
                    lightningBolts.push(branch);
                }

                currentX = nextX;
                currentY = nextY;
            }

            // Intense random flash effect (more frequent)
            if (Math.random() > 0.3) {
                lightningBolts.forEach(bolt => {
                    bolt.material.opacity *= (Math.random() * 0.4 + 0.6);
                });
            }

            // Check for enemy hits (follows hero's current position)
            const lightningBounds = {
                left: currentStartX + (direction > 0 ? 0 : -maxDistance),
                right: currentStartX + (direction > 0 ? maxDistance : 0),
                top: currentStartY + 2,
                bottom: currentStartY - 2
            };

            for (const enemy of this.enemies) {
                if (!enemy.isAlive) continue;

                const enemyBounds = enemy.getBounds();
                if (checkAABBCollision(lightningBounds, enemyBounds)) {
                    enemy.takeDamage();
                    this.addUltimateCharge(this.ultimateChargePerKill);
                    console.log('⚡ Lightning struck enemy!');
                }
            }

            // Stop after max duration
            if (lightningTime >= maxDuration) {
                clearInterval(lightningInterval);

                // Fade out all bolts
                const fadeInterval = setInterval(() => {
                    let allGone = true;
                    lightningBolts.forEach(bolt => {
                        if (bolt.parent) {
                            bolt.material.opacity -= 0.1;
                            if (bolt.material.opacity > 0) {
                                allGone = false;
                            } else {
                                this.mesh.parent.remove(bolt);
                            }
                        }
                    });

                    if (allGone) {
                        clearInterval(fadeInterval);
                    }
                }, 50);
            }
        }, 50);
    }

    /**
     * Cast Fear - W Ability
     */
    castFear() {
        console.log('😱 FEAR!');

        // Cancel hover when using ability
        if (this.isHovering) {
            this.deactivateHover();
        }

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

        // Make enemies flee away from warlock
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(fearBounds, enemyBounds)) {
                // Calculate direction away from warlock
                const directionAway = enemy.position.x > this.position.x ? 1 : -1;

                // Set enemy direction to move away
                if (enemy.direction !== undefined) {
                    enemy.direction = directionAway;
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

        // Create dark cloud group (similar to background clouds but faded black)
        this.hoverCloud = new THREE.Group();

        // Main cloud body (3 overlapping circles for cloud shape - larger size)
        const cloudCircle1 = new THREE.CircleGeometry(0.6, 16);
        const cloudCircle2 = new THREE.CircleGeometry(0.5, 16);
        const cloudCircle3 = new THREE.CircleGeometry(0.4, 16);

        const cloudMaterial1 = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.4
        });
        const cloudMaterial2 = new THREE.MeshBasicMaterial({
            color: 0x0d0d0d,
            transparent: true,
            opacity: 0.5
        });
        const cloudMaterial3 = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35
        });

        const cloud1 = new THREE.Mesh(cloudCircle1, cloudMaterial1);
        cloud1.position.set(-0.3, 0, 0);
        this.hoverCloud.add(cloud1);

        const cloud2 = new THREE.Mesh(cloudCircle2, cloudMaterial2);
        cloud2.position.set(0.2, 0.08, 0.01);
        this.hoverCloud.add(cloud2);

        const cloud3 = new THREE.Mesh(cloudCircle3, cloudMaterial3);
        cloud3.position.set(0.4, -0.08, 0.02);
        this.hoverCloud.add(cloud3);

        this.hoverCloud.position.set(this.position.x, this.position.y - 0.8, 0.05);
        this.mesh.parent.add(this.hoverCloud);

        // Create trailing particles array
        this.hoverTrailParticles = [];

        // Lift player slightly
        this.position.y += 0.5;

        // Animate cloud trail
        this.hoverAnimationInterval = setInterval(() => {
            // Create new trail particle
            const trailGeometry = new THREE.CircleGeometry(0.2 + Math.random() * 0.15, 12);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x1a1a1a : 0x0d0d0d,
                transparent: true,
                opacity: 0.3
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);

            // Position slightly behind and scattered
            trail.position.set(
                this.hoverCloud.position.x + (Math.random() - 0.5) * 0.6,
                this.hoverCloud.position.y + (Math.random() - 0.5) * 0.3,
                0.04
            );
            this.mesh.parent.add(trail);

            this.hoverTrailParticles.push({
                mesh: trail,
                life: 0,
                maxLife: 0.5 + Math.random() * 0.3
            });

            // Fade and remove old trails
            this.hoverTrailParticles.forEach((particle, index) => {
                particle.life += 0.05;
                const fadeProgress = particle.life / particle.maxLife;
                particle.mesh.material.opacity = 0.3 * (1 - fadeProgress);

                if (particle.life >= particle.maxLife) {
                    if (particle.mesh.parent) {
                        this.mesh.parent.remove(particle.mesh);
                    }
                    this.hoverTrailParticles.splice(index, 1);
                }
            });
        }, 50);

        // Hover for 5 seconds
        this.hoverTimeout = setTimeout(() => {
            this.deactivateHover();
        }, 5000);
    }

    /**
     * Deactivate Hover
     */
    deactivateHover() {
        if (!this.isHovering) return; // Already deactivated

        this.isHovering = false;

        // Clear timeout if still active
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        // Clear animation interval
        if (this.hoverAnimationInterval) {
            clearInterval(this.hoverAnimationInterval);
            this.hoverAnimationInterval = null;
        }

        // Remove cloud
        if (this.hoverCloud) {
            this.mesh.parent.remove(this.hoverCloud);
            this.hoverCloud = null;
        }

        // Remove all trail particles
        if (this.hoverTrailParticles) {
            this.hoverTrailParticles.forEach(particle => {
                if (particle.mesh.parent) {
                    this.mesh.parent.remove(particle.mesh);
                }
            });
            this.hoverTrailParticles = [];
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

        // Cancel hover when using ability
        if (this.isHovering) {
            this.deactivateHover();
        }

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
