import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { PLAYER_SPEED } from '../core/constants.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Warlock Hero - Dark magic wielder with staff
 * @class Warlock
 */
export class Warlock extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Change body color to dark purple/black (warlock theme)
        this.setBodyColor(0x35113d);

        // Add staff
        this.createEquipment(scene);
        this.addWarlockHorns();

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Hover state
        this.isHovering = false;
        this.hoverCloud = null;
        this.hoverTrailParticles = [];
        this.hoverTimeout = null;
        this.hoverAnimationInterval = null;
        this.hoverToggleCooldownUntil = 0;
        this.hoverToggleHeld = false;

        // Chaos storm state (ultimate)
        this.isChaosStormActive = false;
        this.chaosStormInterval = null;
        this.chaosStormVisualInterval = null;
        this.chaosStormGroup = null;

        // Converted enemies (legacy mind control)
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
     * Add dark horns to the top corners
     */
    addWarlockHorns() {
        const hornMaterial = new THREE.MeshBasicMaterial({ color: 0x120914 });

        const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), hornMaterial);
        leftHorn.position.set(-0.25, 0.65, 0);
        leftHorn.rotation.z = -0.3;
        this.mesh.add(leftHorn);

        const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), hornMaterial);
        rightHorn.position.set(0.25, 0.65, 0);
        rightHorn.rotation.z = 0.3;
        this.mesh.add(rightHorn);
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
            const now = performance.now();
            if (hero.isHovering) {
                if (now < hero.hoverToggleCooldownUntil) {
                    return false;
                }
                hero.deactivateHover();
                return true;
            }
            if (!Ability.prototype.use.call(hover, hero)) return false;
            hero.activateHover();
            return true;
        };

        // R - Chaos Storm
        const chaosStorm = new Ability('Chaos Storm', 0, true);
        chaosStorm.use = (hero) => {
            return hero.castChaosStorm();
        };

        this.setAbilities(lightningStrike, fear, hover, chaosStorm);
    }

    /**
     * Update - Override to handle hover and facing direction
     */
    update(deltaTime, input) {
        // Update facing direction based on aim or movement input
        const aim = this.getAimDirection();
        if (this.hasAimInput && Math.abs(aim.x) > 0.15) {
            this.setFacingDirection(aim.x >= 0 ? 1 : -1);
        } else if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        // If hovering, ignore gravity
        if (this.isHovering) {
            this.updateStatusEffects(deltaTime);
            if (this.controlsLocked) {
                this.deactivateHover();
                return;
            }
            // Custom update without gravity
            this.velocity.x = 0;
            this.velocity.y = 0;
            const hoverSpeed = PLAYER_SPEED * 1.1;
            let leftPressed = input.isLeftPressed();
            let rightPressed = input.isRightPressed();
            let upPressed = input.isJumpPressed() || input.isUpPressed();
            let downPressed = input.isDownPressed();
            if (this.controlsInverted) {
                const swap = leftPressed;
                leftPressed = rightPressed;
                rightPressed = swap;
                const swapY = upPressed;
                upPressed = downPressed;
                downPressed = swapY;
            }
            if (this.fearTimer > 0 && this.fearDirection) {
                this.velocity.x = hoverSpeed * this.fearDirection;
            } else {
                if (leftPressed) {
                    this.velocity.x = -hoverSpeed;
                }
                if (rightPressed) {
                    this.velocity.x = hoverSpeed;
                }
            }
            if (upPressed) {
                this.velocity.y = hoverSpeed;
            }
            if (downPressed) {
                this.velocity.y = -hoverSpeed;
            }

            if (this.velocity.x !== 0 && this.velocity.y !== 0) {
                this.velocity.x *= 0.707;
                this.velocity.y *= 0.707;
            }

            this.position.x += this.velocity.x * deltaTime;
            this.position.y += this.velocity.y * deltaTime;

            // Update hover cloud position
            if (this.hoverCloud) {
                this.hoverCloud.position.x = this.position.x;
                this.hoverCloud.position.y = this.position.y - 0.8;
            }

            this.syncMeshPosition();

            // Keep UI synced while hovering
            if (this.healthBar) {
                this.healthBar.update(deltaTime);
            }

            // Still check for ability inputs while hovering
            this.handleAbilityInput(input);
        } else {
            super.update(deltaTime, input);
        }
    }

    /**
     * Handle ability input with hover toggle requiring a full release between presses.
     * @param {InputManager} input
     */
    handleAbilityInput(input) {
        const hoverPressed = input.isAbility3Pressed();
        if (this.controlsLocked) {
            this.hoverToggleHeld = hoverPressed;
            return;
        }
        if (this.isCarryingFlag && input.isFlagDropPressed()) {
            this.hoverToggleHeld = hoverPressed;
            return;
        }
        if (input.isAbility1Pressed() && this.abilities.q) {
            this.useAbility('q');
        }
        if (input.isAbility2Pressed() && this.abilities.w) {
            this.useAbility('w');
        }
        if (hoverPressed && !this.hoverToggleHeld && this.abilities.e) {
            if (!this.isCarryingFlag || !this.flagCarryBlocksAbility3) {
                this.useAbility('e');
            }
        }
        this.hoverToggleHeld = hoverPressed;
        if (input.isUltimatePressed() && this.abilities.r) {
            this.useUltimate();
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

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };
        const perpendicular = { x: -direction.y, y: direction.x };
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
                const lateralOffset = (Math.random() - 0.5) * 0.4;
                const nextX = currentX + direction.x * segmentDistance + perpendicular.x * lateralOffset;
                const nextY = currentY + direction.y * segmentDistance + perpendicular.y * lateralOffset;

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
                    const branchDirX = direction.x * Math.cos(branchAngle) + perpendicular.x * Math.sin(branchAngle);
                    const branchDirY = direction.y * Math.cos(branchAngle) + perpendicular.y * Math.sin(branchAngle);
                    const branchEndX = nextX + branchDirX * branchLength;
                    const branchEndY = nextY + branchDirY * branchLength;

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
            const endX = currentStartX + direction.x * maxDistance;
            const endY = currentStartY + direction.y * maxDistance;
            const thickness = 2;
            const lightningBounds = {
                left: Math.min(currentStartX, endX) - thickness,
                right: Math.max(currentStartX, endX) + thickness,
                top: Math.max(currentStartY, endY) + thickness,
                bottom: Math.min(currentStartY, endY) - thickness
            };

            for (const enemy of this.getDamageTargets()) {
                if (!enemy.isAlive) continue;

                const enemyBounds = enemy.getBounds();
                if (this.isPositionBlockedByProtectionDome(enemy.position)) {
                    continue;
                }
                if (checkAABBCollision(lightningBounds, enemyBounds)) {
                    this.applyAbilityDamage(this.abilities.q, enemy, 1);
                    if (enemy.type === 'player') {
                        this.addUltimateCharge(this.ultimateChargePerKill);
                    }
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
        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(fearBounds, enemyBounds)) {
                if (enemy.type === 'player' && typeof enemy.applyFear === 'function') {
                    enemy.applyFear(this.position.x, 0.7);
                } else {
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
                }

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
        if (typeof this.setFallDamageGrace === 'function') {
            this.setFallDamageGrace(0.6);
        }
        this.hoverToggleCooldownUntil = performance.now() + 200;

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

        // Hover for 3 seconds
        this.hoverTimeout = setTimeout(() => {
            this.deactivateHover();
        }, 3000);
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
     * Cast Chaos Storm - R Ability (Ultimate)
     */
    castChaosStorm() {
        if (this.ultimateCharge < this.ultimateChargeMax) {
            console.log('Ultimate not ready!');
            return false;
        }
        if (this.isChaosStormActive) {
            return false;
        }

        console.log('🌑 CHAOS STORM!');

        // Cancel hover when using ability
        if (this.isHovering) {
            this.deactivateHover();
        }

        const durationMs = 3000;
        const tickIntervalMs = 500;
        const radius = 3.5;
        const baseHits = 2;
        const lifeStealRatio = 0.35;

        this.isChaosStormActive = true;
        this.clearChaosStormVisuals();
        this.chaosStormGroup = this.createChaosStormEffect(radius);

        const ability = this.abilities.r;
        let elapsed = 0;

        const applyTick = () => {
            if (!this.isAlive) {
                this.stopChaosStorm();
                return;
            }

            const stormBounds = {
                left: this.position.x - radius,
                right: this.position.x + radius,
                top: this.position.y + radius,
                bottom: this.position.y - radius
            };

            for (const enemy of this.getDamageTargets()) {
                if (!enemy.isAlive) continue;
                const enemyBounds = enemy.getBounds();
                if (!checkAABBCollision(stormBounds, enemyBounds)) continue;

                this.applyAbilityDamage(ability, enemy, baseHits);

                const adjustedHits = ability && typeof ability.getAdjustedDamage === 'function'
                    ? ability.getAdjustedDamage(baseHits)
                    : baseHits;
                const hits = Math.max(1, Math.round(adjustedHits));
                let estimatedDamage = hits;
                if (enemy.type === 'player') {
                    const targetMaxHealth = Number.isFinite(enemy.maxHealth) ? enemy.maxHealth : 100;
                    const damagePerHit = Math.max(1, Math.round(targetMaxHealth * 0.1));
                    estimatedDamage = hits * damagePerHit;
                }

                const healAmount = estimatedDamage * lifeStealRatio;
                if (healAmount > 0) {
                    this.heal(healAmount);
                }
            }
        };

        applyTick();
        this.chaosStormInterval = setInterval(() => {
            elapsed += tickIntervalMs;
            applyTick();
            if (elapsed >= durationMs) {
                this.stopChaosStorm();
            }
        }, tickIntervalMs);

        this.chaosStormVisualInterval = setInterval(() => {
            this.updateChaosStormVisuals();
        }, 40);

        return true;
    }

    /**
     * Create chaos storm visuals around the warlock.
     * @param {number} radius
     * @returns {THREE.Group}
     */
    createChaosStormEffect(radius) {
        const stormGroup = new THREE.Group();

        const ringGeometry = new THREE.RingGeometry(radius * 0.6, radius, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x1b001f,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.z = 0.08;
        stormGroup.add(ring);

        const coreGeometry = new THREE.CircleGeometry(radius * 0.45, 24);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0x120015,
            transparent: true,
            opacity: 0.35
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.z = 0.06;
        stormGroup.add(core);

        const wisps = [];
        const wispCount = 8;
        for (let i = 0; i < wispCount; i++) {
            const wispGeometry = new THREE.SphereGeometry(0.12, 8, 8);
            const wispMaterial = new THREE.MeshBasicMaterial({
                color: 0x5a00a8,
                transparent: true,
                opacity: 0.7
            });
            const wisp = new THREE.Mesh(wispGeometry, wispMaterial);
            wisp.userData.angle = (i / wispCount) * Math.PI * 2;
            wisp.userData.radius = radius * (0.55 + Math.random() * 0.35);
            wisp.userData.speed = 0.06 + Math.random() * 0.05;
            wisp.userData.phase = Math.random() * Math.PI * 2;
            stormGroup.add(wisp);
            wisps.push(wisp);
        }

        stormGroup.userData = {
            ring,
            core,
            wisps
        };

        stormGroup.position.set(0, 0, 0.12);
        this.mesh.add(stormGroup);
        return stormGroup;
    }

    /**
     * Update chaos storm visuals (pulse + swirl).
     */
    updateChaosStormVisuals() {
        if (!this.chaosStormGroup) return;
        const { ring, core, wisps } = this.chaosStormGroup.userData || {};
        const time = performance.now() * 0.002;

        if (ring) {
            const pulse = 0.92 + Math.sin(time * 3) * 0.08;
            ring.scale.set(pulse, pulse, 1);
            ring.material.opacity = 0.35 + Math.sin(time * 2) * 0.1;
        }

        if (core) {
            const corePulse = 0.85 + Math.sin(time * 4) * 0.1;
            core.scale.set(corePulse, corePulse, 1);
            core.material.opacity = 0.25 + Math.sin(time * 2.5 + 1.2) * 0.08;
        }

        if (Array.isArray(wisps)) {
            for (const wisp of wisps) {
                wisp.userData.angle += wisp.userData.speed;
                const angle = wisp.userData.angle;
                const radius = wisp.userData.radius;
                wisp.position.x = Math.cos(angle) * radius;
                wisp.position.y = Math.sin(angle) * radius;
                wisp.position.z = 0.08 + Math.sin(time * 3 + wisp.userData.phase) * 0.05;
                wisp.material.opacity = 0.5 + Math.sin(time * 5 + wisp.userData.phase) * 0.2;
            }
        }
    }

    /**
     * Clear chaos storm visuals immediately.
     */
    clearChaosStormVisuals() {
        if (this.chaosStormGroup && this.chaosStormGroup.parent) {
            this.chaosStormGroup.parent.remove(this.chaosStormGroup);
        }
        this.chaosStormGroup = null;
    }

    /**
     * Stop chaos storm effects and cleanup.
     */
    stopChaosStorm() {
        if (this.chaosStormInterval) {
            clearInterval(this.chaosStormInterval);
            this.chaosStormInterval = null;
        }
        if (this.chaosStormVisualInterval) {
            clearInterval(this.chaosStormVisualInterval);
            this.chaosStormVisualInterval = null;
        }
        this.isChaosStormActive = false;
        this.clearChaosStormVisuals();
    }

    /**
     * Convert enemy to player's side
     */
    convertEnemy(enemy) {
        if (enemy.type === 'player') {
            return;
        }
        console.log('Enemy converted!');

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
