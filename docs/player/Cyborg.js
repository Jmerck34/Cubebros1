import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Cyborg Hero - Tech caster with built-in emitters
 * @class Cyborg
 */
export class Cyborg extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Change body color to steel-blue (cyborg theme)
        this.setBodyColor(0x2b3f5a);

        // Add cyborg gear
        this.createCyborgGear(scene);
        this.addCyborgCore();

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Kame Hame Ha charging state
        this.isChargingBeam = false;
        this.beamChargeTime = 0;
        this.beamAimDirection = { x: 1, y: 0 };

        // Bubble shield state
        this.bubbleShield = null;

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;

        // Set cyborg abilities
        this.initializeAbilities();
    }

    /**
     * Create cyborg gear (arm cannon, backpack, visor, antenna)
     * @param {THREE.Scene} scene - The scene
     */
    createCyborgGear(scene) {
        this.cyborgRig = new THREE.Group();

        // Arm cannon (right side)
        const cannonBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.22, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x4c5f75 })
        );
        cannonBase.position.set(0.62, 0.05, 0);
        this.cyborgRig.add(cannonBase);

        const cannonCore = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12),
            new THREE.MeshBasicMaterial({ color: 0x66ffff })
        );
        cannonCore.rotation.x = Math.PI / 2;
        cannonCore.position.set(0.7, 0.05, 0);
        this.cyborgRig.add(cannonCore);

        // Backpack module
        const pack = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.5, 0.18),
            new THREE.MeshBasicMaterial({ color: 0x1b2736 })
        );
        pack.position.set(0, 0.05, -0.58);
        this.cyborgRig.add(pack);

        // Energy cell
        const cell = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.3, 0.12),
            new THREE.MeshBasicMaterial({ color: 0x00d2ff })
        );
        cell.position.set(0.18, 0.05, -0.65);
        this.cyborgRig.add(cell);

        // Visor band
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.12, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x0a0f18 })
        );
        visor.position.set(0, 0.18, 0.56);
        this.cyborgRig.add(visor);

        // Antenna
        const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8),
            new THREE.MeshBasicMaterial({ color: 0x9fb4c8 })
        );
        antenna.position.set(-0.25, 0.68, -0.05);
        this.cyborgRig.add(antenna);

        const antennaTip = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0x66ffff })
        );
        antennaTip.position.set(-0.25, 0.88, -0.05);
        this.cyborgRig.add(antennaTip);

        this.mesh.add(this.cyborgRig);
    }

    /**
     * Add a glowing core disc to the chest
     */
    addCyborgCore() {
        const core = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 20),
            new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.9 })
        );
        core.position.set(0, 0.05, 0.57);
        this.mesh.add(core);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.12, 16),
            new THREE.MeshBasicMaterial({ color: 0x1a2f5f })
        );
        ring.position.set(0, 0.05, 0.58);
        this.mesh.add(ring);
    }

    /**
     * Initialize cyborg abilities
     */
    initializeAbilities() {
        // Q - Fireball
        const fireball = new Ability('Fireball', 2);
        fireball.use = (hero) => {
            if (!Ability.prototype.use.call(fireball, hero)) return false;
            hero.castFireball();
            return true;
        };

        // W - Freeze Blast
        const freezeBlast = new Ability('Freeze Blast', 4);
        freezeBlast.use = (hero) => {
            if (!Ability.prototype.use.call(freezeBlast, hero)) return false;
            hero.castFreezeBlast();
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

        this.setAbilities(fireball, freezeBlast, bubbleShield, kameHameHa);
    }

    /**
     * Update - Override to handle beam charging and facing direction
     */
    update(deltaTime, input) {
        // Freeze movement during charging
        if (this.isChargingBeam) {
            this.updateStatusEffects(deltaTime);
            this.beamChargeTime += deltaTime;
            // Don't update position or process input while charging
            return;
        }

        // Update facing direction based on aim or movement input
        const aim = this.getAimDirection();
        if (this.hasAimInput && Math.abs(aim.x) > 0.15) {
            this.setFacingDirection(aim.x >= 0 ? 1 : -1);
        } else if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        super.update(deltaTime, input);
    }

    /**
     * Set facing direction and flip character
     */
    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction; // Flip entire mesh with gear
        }
    }

    /**
     * Cast Fireball - Q Ability (Fire Missile with trail)
     */
    castFireball() {
        console.log('ðŸ”¥ FIREBALL!');

        // Animate gear
        this.cyborgRig.rotation.y = -0.3;
        setTimeout(() => { this.cyborgRig.rotation.y = 0.3; }, 200);

        // Create fire missile group
        const fireballGroup = new THREE.Group();

        // Inner core (white-hot center)
        const coreGeometry = new THREE.SphereGeometry(0.15);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff99, // Yellow-white hot core
            transparent: true,
            opacity: 1
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        fireballGroup.add(core);

        // Middle layer (bright orange)
        const midGeometry = new THREE.SphereGeometry(0.22);
        const midMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600, // Bright orange
            transparent: true,
            opacity: 0.8
        });
        const midLayer = new THREE.Mesh(midGeometry, midMaterial);
        fireballGroup.add(midLayer);

        // Outer layer (red-orange glow)
        const outerGeometry = new THREE.SphereGeometry(0.28);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300, // Red-orange
            transparent: true,
            opacity: 0.5
        });
        const outerLayer = new THREE.Mesh(outerGeometry, outerMaterial);
        fireballGroup.add(outerLayer);

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };

        fireballGroup.position.set(
            this.position.x + (0.5 * direction.x),
            this.position.y + (0.5 * direction.y),
            0.2
        );
        this.mesh.parent.add(fireballGroup);

        // Trail particles array
        const trailParticles = [];

        // Fire direction based on aim
        const speed = 12;
        const fireballPos = { x: fireballGroup.position.x, y: fireballGroup.position.y };
        let rotationAngle = 0;
        const maxDistance = 12;

        // Animate fireball
        const fireballInterval = setInterval(() => {
            fireballPos.x += direction.x * speed * 0.016;
            fireballPos.y += direction.y * speed * 0.016;
            fireballGroup.position.set(fireballPos.x, fireballPos.y, 0.2);

            // Spin the fire missile
            rotationAngle += 0.2;
            fireballGroup.rotation.z = rotationAngle;

            // Create trailing particles at fireball position
            if (Math.random() > 0.3) {
                const trailSize = 0.1 + Math.random() * 0.15;
                const trailGeometry = new THREE.CircleGeometry(trailSize, 8);
                const trailColor = Math.random() > 0.5 ? 0xff6600 : 0xff3300; // Mix orange and red
                const trailMaterial = new THREE.MeshBasicMaterial({
                    color: trailColor,
                    transparent: true,
                    opacity: 0.8
                });
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);
                trail.position.set(
                    fireballGroup.position.x + (Math.random() - 0.5) * 0.2,
                    fireballGroup.position.y + (Math.random() - 0.5) * 0.3,
                    0.15
                );
                this.mesh.parent.add(trail);

                // Store particle with initial opacity
                const particle = { mesh: trail, opacity: 0.8, life: 0 };
                trailParticles.push(particle);

                // Quick fade out trail
                const fadeInterval = setInterval(() => {
                    particle.life += 0.016; // Track lifetime
                    particle.opacity -= 0.15; // Faster fade
                    particle.mesh.material.opacity = Math.max(0, particle.opacity);
                    particle.mesh.scale.set(
                        Math.max(0.1, 1 - particle.life * 2),
                        Math.max(0.1, 1 - particle.life * 2),
                        1
                    );

                    if (particle.opacity <= 0 || particle.life > 0.5) {
                        clearInterval(fadeInterval);
                        if (particle.mesh.parent) {
                            this.mesh.parent.remove(particle.mesh);
                        }
                        // Remove from array
                        const index = trailParticles.indexOf(particle);
                        if (index > -1) {
                            trailParticles.splice(index, 1);
                        }
                    }
                }, 16); // Run every frame
            }

            // Check collision with enemies (use fireball's actual position)
            const fireballBounds = {
                left: fireballGroup.position.x - 0.28,
                right: fireballGroup.position.x + 0.28,
                top: fireballGroup.position.y + 0.28,
                bottom: fireballGroup.position.y - 0.28
            };

            let hit = false;
            for (const enemy of this.getDamageTargets()) {
                if (!enemy.isAlive) continue;

                const enemyBounds = enemy.getBounds();
                if (checkAABBCollision(fireballBounds, enemyBounds)) {
                    this.applyAbilityDamage(this.abilities.q, enemy, 2);
                    if (enemy.type !== 'player') {
                        this.addUltimateCharge(this.ultimateChargePerKill);
                    }
                    console.log('ðŸ”¥ Fireball hit!');
                    hit = true;
                    break;
                }
            }

            const traveled = Math.hypot(fireballPos.x - this.position.x, fireballPos.y - this.position.y);
            // Remove if hit or out of range
            if (hit || traveled > maxDistance) {
                clearInterval(fireballInterval);
                this.mesh.parent.remove(fireballGroup);

                // Clean up any remaining trail particles
                trailParticles.forEach(particle => {
                    if (particle.mesh.parent) {
                        this.mesh.parent.remove(particle.mesh);
                    }
                });

                this.createExplosion(fireballGroup.position.x, fireballGroup.position.y, 0xff4500);
            }
        }, 16);
    }

    /**
     * Cast Freeze Blast - W Ability (ice wave)
     */
    castFreezeBlast() {
        console.log('ðŸ§Š FREEZE BLAST!');

        // Animate gear
        this.cyborgRig.scale.set(1.3, 1.3, 1.3);
        setTimeout(() => { this.cyborgRig.scale.set(1, 1, 1); }, 300);

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };
        const perpendicular = { x: -direction.y, y: direction.x };
        const windParticles = [];

        // Create icy shards
        for (let i = 0; i < 22; i++) {
            const particleSize = 0.08 + Math.random() * 0.14;
            const particleGeometry = new THREE.BoxGeometry(particleSize, particleSize * 1.6, 0.02);
            const particleColor = Math.random() > 0.5 ? 0xa6e3ff : 0x66ccff;
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Random starting position in wind wave
            const forwardOffset = 0.5 + Math.random() * 0.5;
            const lateralOffset = (Math.random() - 0.5) * 2;
            const startX = this.position.x + direction.x * forwardOffset + perpendicular.x * lateralOffset;
            const startY = this.position.y + direction.y * forwardOffset + perpendicular.y * lateralOffset;
            particle.position.set(startX, startY, 0.15);
            this.mesh.parent.add(particle);

            // Store particle with swirl data
            windParticles.push({
                mesh: particle,
                angle: Math.random() * Math.PI * 2,
                radius: 0.2 + Math.random() * 0.4,
                speed: 0.9 + Math.random() * 0.5,
                opacity: 0.7,
                life: 0,
                centerX: startX,
                centerY: startY
            });
        }

        // Animate swirling particles
        let waveTime = 0;
        const waveInterval = setInterval(() => {
            waveTime += 0.016;

            // Animate icy shards
            windParticles.forEach((particle) => {
                particle.life += 0.016;
                particle.angle += particle.speed * 0.1;

                // Swirl outward in spiral
                const currentRadius = particle.radius * (1 + particle.life * 1.6);
                const spiralX = Math.cos(particle.angle) * currentRadius;
                const spiralY = Math.sin(particle.angle) * currentRadius * 0.5;

                particle.centerX += direction.x * particle.speed * 0.1;
                particle.centerY += direction.y * particle.speed * 0.1;
                particle.mesh.position.x = particle.centerX + perpendicular.x * spiralY;
                particle.mesh.position.y = particle.centerY + perpendicular.y * spiralY;
                particle.mesh.rotation.z += 0.2;

                // Fade out
                particle.opacity -= 0.025;
                particle.mesh.material.opacity = Math.max(0, particle.opacity);
                particle.mesh.scale.set(1 - particle.life * 0.5, 1 - particle.life * 0.5, 1);
            });

            // Clean up after 500ms
            if (waveTime > 0.5) {
                clearInterval(waveInterval);
                windParticles.forEach(particle => {
                    if (particle.mesh.parent) {
                        this.mesh.parent.remove(particle.mesh);
                    }
                });
            }
        }, 16);

        // Freeze enemies in cone
        const startX = this.position.x;
        const startY = this.position.y;
        const endX = startX + direction.x * 3;
        const endY = startY + direction.y * 3;
        const thickness = 1.5;
        const windBounds = {
            left: Math.min(startX, endX) - thickness,
            right: Math.max(startX, endX) + thickness,
            top: Math.max(startY, endY) + thickness,
            bottom: Math.min(startY, endY) - thickness
        };

        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(windBounds, enemyBounds)) {
                this.applyAbilityDamage(this.abilities.w, enemy, 1);
                if (typeof enemy.setFrozen === 'function') {
                    enemy.setFrozen(1.5);
                } else if (typeof enemy.frozenTimer === 'number') {
                    enemy.frozenTimer = 1.5;
                }
                if (enemy.type !== 'player') {
                    this.addUltimateCharge(this.ultimateChargePerKill);
                }
                console.log('ðŸ§Š Enemy frozen!');
            }
        }
    }

    /**
     * Cast Bubble Shield - E Ability (Burst animation with protective bubble)
     */
    castBubbleShield() {
        console.log('ðŸ›¡ï¸ BUBBLE SHIELD BURST!');

        // Animate gear
        this.cyborgRig.scale.set(1.2, 1.2, 1.2);
        setTimeout(() => { this.cyborgRig.scale.set(1, 1, 1); }, 200);

        // Create burst particles
        const burstParticles = [];
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const particleGeometry = new THREE.CircleGeometry(0.15, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(this.position.x, this.position.y, 0.2);
            this.mesh.parent.add(particle);

            burstParticles.push({
                mesh: particle,
                angle: angle,
                speed: 9 + Math.random() * 3, // 3x speed (was 3-4, now 9-12)
                life: 0
            });
        }

        // Animate burst expansion
        const burstInterval = setInterval(() => {
            let allDead = true;
            burstParticles.forEach(particle => {
                particle.life += 0.016;
                const distance = particle.speed * particle.life;

                particle.mesh.position.x = this.position.x + Math.cos(particle.angle) * distance;
                particle.mesh.position.y = this.position.y + Math.sin(particle.angle) * distance;
                particle.mesh.material.opacity = Math.max(0, 0.8 - particle.life * 2);
                particle.mesh.scale.set(1 - particle.life, 1 - particle.life, 1);

                if (particle.life < 0.4) allDead = false;
            });

            if (allDead) {
                clearInterval(burstInterval);
                burstParticles.forEach(p => {
                    if (p.mesh.parent) this.mesh.parent.remove(p.mesh);
                });
            }
        }, 16);

        const shieldDuration = 2;
        const bonusPercent = 0.3;
        const allyRadius = 3.5;
        this.applyShieldBurstBonus(allyRadius, bonusPercent, shieldDuration);

        // Apply protective bubble to self
        this.applyProtectiveBubble();
    }

    applyShieldBurstBonus(radius, bonusPercent, durationSeconds) {
        const players = this.getAllPlayers ? this.getAllPlayers() : [];
        players.forEach((player) => {
            if (!player || !player.isAlive) return;
            if (player !== this && !this.isSameTeam(player)) return;
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distance = Math.hypot(dx, dy);
            if (player === this || distance <= radius) {
                if (typeof player.applyHealthBonus === 'function') {
                    player.applyHealthBonus(bonusPercent, durationSeconds);
                }
            }
        });
    }

    /**
     * Apply protective bubble visual and invincibility
     */
    applyProtectiveBubble() {
        // Create pulsing border around hero
        const borderGeometry = new THREE.RingGeometry(0.7, 0.85, 32);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        this.bubbleBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        this.bubbleBorder.position.set(0, 0, 0.3); // Position relative to hero
        this.mesh.add(this.bubbleBorder); // Attach to hero mesh

        // Set invincibility flag
        this.bubbleShield = true;
        this.bubbleShieldTime = 0;

        // Pulse animation
        let pulseScale = 1;
        let pulseDirection = 1;
        this.bubblePulseInterval = setInterval(() => {
            if (!this.bubbleBorder) {
                clearInterval(this.bubblePulseInterval);
                return;
            }

            pulseScale += pulseDirection * 0.05;
            if (pulseScale > 1.2) pulseDirection = -1;
            if (pulseScale < 0.9) pulseDirection = 1;

            this.bubbleBorder.scale.set(pulseScale, pulseScale, 1);

            // Flash opacity
            const opacity = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
            this.bubbleBorder.material.opacity = opacity;
        }, 50);

        // Remove after 2 seconds
        setTimeout(() => {
            this.removeProtectiveBubble();
        }, 2000);
    }

    /**
     * Remove protective bubble
     */
    removeProtectiveBubble() {
        if (this.bubbleBorder) {
            this.mesh.remove(this.bubbleBorder);
            this.bubbleBorder = null;
        }
        if (this.bubblePulseInterval) {
            clearInterval(this.bubblePulseInterval);
            this.bubblePulseInterval = null;
        }
        this.bubbleShield = false;
        console.log('Bubble shield expired');
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

        console.log('âš¡ KAME HAME HA!!! âš¡');

        const aim = this.getAimDirection();
        this.beamAimDirection = this.hasAimInput
            ? { x: aim.x, y: aim.y }
            : { x: this.facingDirection, y: 0 };

        // Start charging (freezes character)
        this.isChargingBeam = true;
        this.beamChargeTime = 0;

        // Charge for 0.8 seconds then fire
        setTimeout(() => {
            this.fireKameHameHa();
        }, 800);

        // Create energy ball group with multiple layers
        const energyBall = new THREE.Group();

        // Inner core (bright white)
        const coreGeometry = new THREE.SphereGeometry(0.08);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        energyBall.add(core);

        // Middle layer (bright cyan)
        const midGeometry = new THREE.SphereGeometry(0.15);
        const midMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const midLayer = new THREE.Mesh(midGeometry, midMaterial);
        energyBall.add(midLayer);

        // Outer layer (cyan glow)
        const outerGeometry = new THREE.SphereGeometry(0.22);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.5
        });
        const outerLayer = new THREE.Mesh(outerGeometry, outerMaterial);
        energyBall.add(outerLayer);

        // Outer glow (very light cyan)
        const glowGeometry = new THREE.SphereGeometry(0.3);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        energyBall.add(glow);

        // Position in front of cyborg (based on facing direction)
        energyBall.position.set(
            this.position.x + (0.7 * this.beamAimDirection.x),
            this.position.y + (0.7 * this.beamAimDirection.y),
            0.2
        );
        this.mesh.parent.add(energyBall);

        // Growing energy particles around the ball
        const chargeParticles = [];
        for (let i = 0; i < 15; i++) {
            const particleGeometry = new THREE.CircleGeometry(0.05, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x00ffff : 0xffffff,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            const angle = (i / 15) * Math.PI * 2;
            const radius = 0.6 + Math.random() * 0.2;
            particle.position.set(
                energyBall.position.x + Math.cos(angle) * radius,
                energyBall.position.y + Math.sin(angle) * radius,
                0.15
            );
            this.mesh.parent.add(particle);

            chargeParticles.push({
                mesh: particle,
                angle: angle,
                radius: radius,
                speed: 0.8 + Math.random() * 0.4
            });
        }

        // Animate growing energy ball
        let growthTime = 0;
        const growthInterval = setInterval(() => {
            growthTime += 0.016;

            // Grow from 0.2 to 1.0 scale over 0.8 seconds
            const growthScale = 0.2 + (growthTime / 0.8) * 0.8;
            energyBall.scale.set(growthScale, growthScale, growthScale);

            // Update energy ball position to follow cyborg
            energyBall.position.x = this.position.x + (0.7 * this.beamAimDirection.x);
            energyBall.position.y = this.position.y + (0.7 * this.beamAimDirection.y);

            // Animate particles spiraling inward
            chargeParticles.forEach(p => {
                p.angle += p.speed * 0.05;
                p.radius -= 0.008; // Spiral inward

                p.mesh.position.x = energyBall.position.x + Math.cos(p.angle) * p.radius;
                p.mesh.position.y = energyBall.position.y + Math.sin(p.angle) * p.radius;
            });

            if (growthTime >= 0.8) {
                clearInterval(growthInterval);
            }
        }, 16);

        // Clean up charging effects
        setTimeout(() => {
            clearInterval(growthInterval);
            this.mesh.parent.remove(energyBall);
            chargeParticles.forEach(p => {
                if (p.mesh.parent) this.mesh.parent.remove(p.mesh);
            });
        }, 800);
    }

    /**
     * Fire the charged beam
     */
    fireKameHameHa() {
        this.isChargingBeam = false;

        const direction = this.beamAimDirection || { x: this.facingDirection, y: 0 };
        const perpendicular = { x: -direction.y, y: direction.x };
        const angle = Math.atan2(direction.y, direction.x);
        const damage = Math.floor(this.beamChargeTime * 2); // More charge = more damage
        const beamLength = 10;
        const beamSpeed = 12;
        const maxTravel = 80;

        // Create beam group with multiple layers
        const beamGroup = new THREE.Group();

        // Inner core (bright white)
        const coreGeometry = new THREE.BoxGeometry(beamLength, 0.4, 0.2);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        beamGroup.add(core);

        // Middle layer (bright cyan)
        const midGeometry = new THREE.BoxGeometry(beamLength, 0.7, 0.2);
        const midMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const midLayer = new THREE.Mesh(midGeometry, midMaterial);
        beamGroup.add(midLayer);

        // Outer layer (cyan glow)
        const outerGeometry = new THREE.BoxGeometry(beamLength, 1.0, 0.2);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.5
        });
        const outerLayer = new THREE.Mesh(outerGeometry, outerMaterial);
        beamGroup.add(outerLayer);

        // Outer glow (very light cyan)
        const glowGeometry = new THREE.BoxGeometry(beamLength, 1.4, 0.2);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        beamGroup.add(glow);

        const beamPos = {
            x: this.position.x + direction.x * 5,
            y: this.position.y + direction.y * 5
        };
        beamGroup.position.set(beamPos.x, beamPos.y, 0.2);
        beamGroup.rotation.z = angle;
        this.mesh.parent.add(beamGroup);

        // Create energy particles flowing along the beam
        const beamParticles = [];
        for (let i = 0; i < 30; i++) {
            const particleGeometry = new THREE.CircleGeometry(0.08 + Math.random() * 0.1, 6);
            const particleColor = Math.random() > 0.5 ? 0x00ffff : 0xffffff;
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            const offsetX = (Math.random() - 0.5) * beamLength;
            const offsetY = (Math.random() - 0.5) * 1.2;
            particle.position.set(
                beamPos.x + direction.x * offsetX + perpendicular.x * offsetY,
                beamPos.y + direction.y * offsetX + perpendicular.y * offsetY,
                0.15
            );
            this.mesh.parent.add(particle);

            beamParticles.push({
                mesh: particle,
                offsetX: offsetX,
                offsetY: offsetY,
                speed: 8 + Math.random() * 4,
                life: 0
            });
        }

        const hitEnemies = new Set();
        let traveled = 0;

        // Animate flowing particles + move beam
        const particleInterval = setInterval(() => {
            const step = beamSpeed * 0.016;
            traveled += step;
            beamPos.x += direction.x * step;
            beamPos.y += direction.y * step;
            beamGroup.position.set(beamPos.x, beamPos.y, 0.2);

            beamParticles.forEach(p => {
                p.life += 0.016;
                p.offsetX += p.speed * 0.016;

                p.mesh.position.x = beamPos.x + direction.x * p.offsetX + perpendicular.x * p.offsetY;
                p.mesh.position.y = beamPos.y + direction.y * p.offsetX + perpendicular.y * p.offsetY;

                // Fade out particles as they travel
                p.mesh.material.opacity = Math.max(0, 0.7 - p.life);
            });

            // Beam damage area
            const halfLength = beamLength * 0.5;
            const startX = beamPos.x - direction.x * halfLength;
            const startY = beamPos.y - direction.y * halfLength;
            const endX = beamPos.x + direction.x * halfLength;
            const endY = beamPos.y + direction.y * halfLength;
            const thickness = 0.7;
            const beamBounds = {
                left: Math.min(startX, endX) - thickness,
                right: Math.max(startX, endX) + thickness,
                top: Math.max(startY, endY) + thickness,
                bottom: Math.min(startY, endY) - thickness
            };

            // Damage enemies in beam (once per enemy)
            for (const enemy of this.getDamageTargets()) {
                if (!enemy.isAlive || hitEnemies.has(enemy)) continue;
                const enemyBounds = enemy.getBounds();
                if (checkAABBCollision(beamBounds, enemyBounds)) {
                    this.applyAbilityDamage(this.abilities.r, enemy, damage);
                    hitEnemies.add(enemy);
                    if (enemy.type !== 'player') {
                        this.addUltimateCharge(this.ultimateChargePerKill);
                    }
                    console.log(`KAME HAME HA hit for ${damage} damage!`);
                }
            }

            if (traveled >= maxTravel) {
                clearInterval(particleInterval);
                this.mesh.parent.remove(beamGroup);
                beamParticles.forEach(p => {
                    if (p.mesh.parent) this.mesh.parent.remove(p.mesh);
                });
            }
        }, 16);
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
