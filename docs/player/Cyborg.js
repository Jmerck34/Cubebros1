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
        this.chargeEnergyBall = null;
        this.chargeParticles = [];
        this.chargeInterval = null;
        this.fullChargeReached = false;
        this.fullChargeHoldTime = 0;
        this.isBeamActive = false;
        this.aimIndicator = null;
        this.aimIndicatorLine = null;
        this.aimIndicatorTip = null;
        this.reticlePosition = null;

        // Bubble shield state
        this.bubbleShield = null;

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;
        this.allowLeftStickAimFallback = false;
        this.useCursorAim = true;
        this.cursorSpeed = 820;
        this.reticleLayer = 1;

        // Set cyborg abilities
        this.initializeAbilities();
        this.createAimIndicator();
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
        this.updateReticlePosition();
        // Freeze movement during charging
        if (this.isChargingBeam) {
            this.updateStatusEffects(deltaTime);
            this.updateBonusHealth(deltaTime);
            this.updateShield(deltaTime);
            this.beamChargeTime += deltaTime;
            this.updateBeamAim(input);
            this.updateAimIndicator(this.reticlePosition, this.beamAimDirection, true);
            if (!input.isUltimatePressed()) {
                this.releaseKameHameHa();
            }
            this.checkShieldDepleted();
            // Don't update position or process input while charging
            return;
        }

        if (this.isBeamActive) {
            this.updateStatusEffects(deltaTime);
            this.updateBonusHealth(deltaTime);
            this.updateShield(deltaTime);
            this.updateBeamAim(input);
            this.updateAimIndicator(this.reticlePosition, this.beamAimDirection, true);
            this.checkShieldDepleted();
        }

        // Update facing direction based on aim or movement input
        const reticleDir = this.getReticleDirection();
        if (reticleDir && Math.abs(reticleDir.x) > 0.15) {
            this.setFacingDirection(reticleDir.x >= 0 ? 1 : -1);
        } else if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        super.update(deltaTime, input);
        const idleAim = this.getReticleDirection();
        this.updateAimIndicator(this.reticlePosition, idleAim, false);
        this.checkShieldDepleted();
    }

    handleAbilityInput(input) {
        if (this.controlsLocked) {
            return;
        }
        if (this.isCarryingFlag && input.isFlagDropPressed()) {
            return;
        }
        if (input.isAbility1Pressed() && this.abilities.q) {
            this.useAbility('q');
        }
        if (input.isAbility2Pressed() && this.abilities.w) {
            this.useAbility('w');
        }
        if (input.isAbility3Pressed() && this.abilities.e) {
            if (this.isCarryingFlag && this.flagCarryBlocksAbility3) {
                return;
            }
            this.useAbility('e');
        }
        if (input.isUltimatePressed() && !this.isChargingBeam) {
            this.castKameHameHa();
        }
    }

    createAimIndicator() {
        if (!this.scene) return;
        const group = new THREE.Group();

        const glowColor = 0xff2a2a;
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthTest: false
        });

        const ringSegments = 4;
        const ringRadiusInner = 0.55;
        const ringRadiusOuter = 0.64;
        const ringGap = (Math.PI * 2) / ringSegments;
        for (let i = 0; i < ringSegments; i += 1) {
            const start = i * ringGap + 0.15;
            const end = start + ringGap - 0.3;
            const arc = new THREE.RingGeometry(ringRadiusInner, ringRadiusOuter, 24, 1, start, end - start);
            const arcMesh = new THREE.Mesh(arc, glowMaterial.clone());
            arcMesh.material.opacity = 0.65;
            arcMesh.material.depthTest = false;
            group.add(arcMesh);
        }

        const triangleSize = 0.28;
        const triangleGeometry = new THREE.ShapeGeometry(
            new THREE.Shape([
                new THREE.Vector2(0, triangleSize),
                new THREE.Vector2(triangleSize * 0.75, -triangleSize * 0.6),
                new THREE.Vector2(-triangleSize * 0.75, -triangleSize * 0.6)
            ])
        );
        const triPositions = [
            { x: 0, y: ringRadiusOuter + 0.18, rot: 0 },
            { x: ringRadiusOuter + 0.18, y: 0, rot: Math.PI / 2 },
            { x: 0, y: -(ringRadiusOuter + 0.18), rot: Math.PI },
            { x: -(ringRadiusOuter + 0.18), y: 0, rot: -Math.PI / 2 }
        ];
        triPositions.forEach((pos) => {
            const tri = new THREE.Mesh(triangleGeometry, glowMaterial.clone());
            tri.position.set(pos.x, pos.y, 0);
            tri.rotation.z = pos.rot;
            tri.material.opacity = 0.9;
            tri.material.depthTest = false;
            group.add(tri);
        });

        const crossMaterial = glowMaterial.clone();
        crossMaterial.opacity = 0.85;
        const cross = new THREE.Group();
        crossMaterial.depthTest = false;
        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.02), crossMaterial);
        const crossBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.02), crossMaterial);
        cross.add(crossBar, crossBar2);
        group.add(cross);

        group.visible = true;
        group.renderOrder = 20;
        const reticleLayer = this.reticleLayer || 1;
        group.traverse((child) => {
            if (child && child.layers) {
                child.layers.set(reticleLayer);
            }
        });
        this.scene.add(group);
        this.aimIndicator = group;
        this.aimIndicatorLine = null;
        this.aimIndicatorTip = null;
    }

    updateAimIndicator(targetPosition, direction, forceVisible) {
        if (!this.aimIndicator) return;
        if (!targetPosition || !direction) {
            this.aimIndicator.visible = false;
            return;
        }

        if (!forceVisible && !this.isAlive) {
            this.aimIndicator.visible = false;
            return;
        }

        const length = Math.hypot(direction.x, direction.y);
        if (!Number.isFinite(length) || length < 0.001) {
            this.aimIndicator.visible = false;
            return;
        }

        const angle = Math.atan2(direction.y, direction.x);
        const floatOffset = Math.sin(performance.now() * 0.004) * 0.08;

        this.aimIndicator.visible = true;
        this.aimIndicator.position.set(
            targetPosition.x,
            targetPosition.y + floatOffset,
            2
        );
        this.aimIndicator.rotation.z = angle;
        this.aimIndicator.scale.set(0.32, 0.32, 1);
    }

    updateBeamAim(input) {
        const reticleDir = this.getReticleDirection();
        if (reticleDir) {
            this.beamAimDirection = { x: reticleDir.x, y: reticleDir.y };
            if (Math.abs(reticleDir.x) > 0.15) {
                this.setFacingDirection(reticleDir.x >= 0 ? 1 : -1);
            }
            return;
        }

        if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }
        this.beamAimDirection = { x: this.facingDirection, y: 0 };
    }

    updateReticlePosition() {
        if (this.fearTimer > 0 && this.fearDirection) {
            if (!this.reticlePosition) {
                this.reticlePosition = { x: this.position.x, y: this.position.y };
            }
            this.reticlePosition.x = this.position.x + this.fearDirection * 2;
            this.reticlePosition.y = this.position.y;
            return;
        }
        if (this.hasAimWorldPosition) {
            const aimWorld = this.getAimWorldPosition();
            if (!aimWorld) return;
            if (!this.reticlePosition) {
                this.reticlePosition = { x: aimWorld.x, y: aimWorld.y };
            } else {
                this.reticlePosition.x = aimWorld.x;
                this.reticlePosition.y = aimWorld.y;
            }
            return;
        }

        if (!this.reticlePosition) {
            this.reticlePosition = {
                x: this.position.x + this.facingDirection * 2,
                y: this.position.y
            };
        }
    }

    getReticleDirection() {
        if (this.fearTimer > 0 && this.fearDirection) {
            return { x: this.fearDirection, y: 0 };
        }
        if (this.reticlePosition) {
            const dx = this.reticlePosition.x - this.position.x;
            const dy = this.reticlePosition.y - this.position.y;
            const length = Math.hypot(dx, dy);
            if (length > 0.001) {
                return { x: dx / length, y: dy / length };
            }
        }
        if (this.hasAimInput) {
            return this.getAimDirection();
        }
        return { x: this.facingDirection, y: 0 };
    }

    getReticlePosition() {
        return this.reticlePosition;
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

        if (!this.activeFireballs) {
            this.activeFireballs = new Set();
        }
        if (this.activeFireballs.size >= 3) {
            return;
        }

        // Create fire missile group
        const fireballGroup = new THREE.Group();
        fireballGroup.renderOrder = 12;
        const updateFireballLayering = (mesh) => {
            if (mesh && mesh.material) {
                mesh.material.depthTest = false;
            }
        };

        // Inner core (blue-hot center)
        const coreGeometry = new THREE.SphereGeometry(0.15);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xd9f6ff,
            transparent: true,
            opacity: 1
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        updateFireballLayering(core);
        fireballGroup.add(core);

        const outlineGeometry = new THREE.SphereGeometry(0.31);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        updateFireballLayering(outline);
        fireballGroup.add(outline);

        // Middle layer (bright blue)
        const midGeometry = new THREE.SphereGeometry(0.22);
        const midMaterial = new THREE.MeshBasicMaterial({
            color: 0x39a9ff,
            transparent: true,
            opacity: 0.8
        });
        const midLayer = new THREE.Mesh(midGeometry, midMaterial);
        updateFireballLayering(midLayer);
        fireballGroup.add(midLayer);

        // Outer layer (deep blue glow)
        const outerGeometry = new THREE.SphereGeometry(0.28);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: 0x0a6cff,
            transparent: true,
            opacity: 0.5
        });
        const outerLayer = new THREE.Mesh(outerGeometry, outerMaterial);
        updateFireballLayering(outerLayer);
        fireballGroup.add(outerLayer);

        const ownerLayer = Number.isFinite(this.reticleLayer) ? this.reticleLayer : 1;
        const lightOutline = new THREE.Mesh(outlineGeometry, new THREE.MeshBasicMaterial({
            color: 0xf5fdff,
            transparent: true,
            opacity: 0.75
        }));
        updateFireballLayering(lightOutline);
        const lightCore = new THREE.Mesh(coreGeometry, new THREE.MeshBasicMaterial({
            color: 0xe8fbff,
            transparent: true,
            opacity: 0.9
        }));
        updateFireballLayering(lightCore);
        const lightMid = new THREE.Mesh(midGeometry, new THREE.MeshBasicMaterial({
            color: 0x7fd5ff,
            transparent: true,
            opacity: 0.7
        }));
        updateFireballLayering(lightMid);
        const lightOuter = new THREE.Mesh(outerGeometry, new THREE.MeshBasicMaterial({
            color: 0x5ab8ff,
            transparent: true,
            opacity: 0.45
        }));
        updateFireballLayering(lightOuter);
        [lightOutline, lightCore, lightMid, lightOuter].forEach((mesh) => {
            if (mesh.layers) {
                mesh.layers.set(ownerLayer);
            }
            fireballGroup.add(mesh);
        });

        const direction = this.getReticleDirection();

        fireballGroup.position.set(
            this.position.x + (0.5 * direction.x),
            this.position.y + (0.5 * direction.y),
            0.6
        );
        this.mesh.parent.add(fireballGroup);

        // Trail particles array
        const trailParticles = [];

        // Fire direction based on aim
        const followSpeed = 17;
        const maxSpeed = 12;
        const fireballPos = { x: fireballGroup.position.x, y: fireballGroup.position.y };
        let origin = { x: fireballPos.x, y: fireballPos.y };
        const velocity = { x: direction.x * followSpeed, y: direction.y * followSpeed };
        const projectile = {
            type: 'fireball',
            mesh: fireballGroup,
            owner: this,
            velocity,
            lastDeflectTime: 0,
            deflect: (newOwner) => {
                const now = performance.now();
                if (now - projectile.lastDeflectTime < 200) {
                    return;
                }
                projectile.lastDeflectTime = now;
                projectile.owner = newOwner;
                projectile.velocity.x *= -1;
                projectile.velocity.y *= -1;
                origin = { x: fireballPos.x, y: fireballPos.y };
            }
        };
        Hero.addProjectile(projectile);
        this.activeFireballs.add(projectile);
        const cleanupProjectile = () => {
            Hero.removeProjectile(projectile);
            this.activeFireballs.delete(projectile);
        };
        let rotationAngle = 0;
        const level = this.level || { platforms: [] };
        const maxDistance = Infinity;
        let orbiting = false;
        let orbitBlend = 0;
        let orbitAngle = 0;
        const orbitRadius = 1;
        const orbitEnter = orbitRadius;
        const orbitExit = orbitRadius * 1.4;
        const getHomingTarget = () => {
            const owner = projectile.owner || this;
            if (owner && typeof owner.getReticlePosition === 'function') {
                const target = owner.getReticlePosition();
                if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
                    return target;
                }
            }
            if (owner && typeof owner.getAimWorldPosition === 'function' && owner.hasAimWorldPosition) {
                const target = owner.getAimWorldPosition();
                if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
                    return target;
                }
            }
            return null;
        };

        // Animate fireball
        const fireballInterval = setInterval(() => {
            const target = getHomingTarget();
            if (target) {
                const dx = target.x - fireballPos.x;
                const dy = target.y - fireballPos.y;
                const dist = Math.hypot(dx, dy);
                if (orbiting) {
                    if (dist >= orbitExit) {
                        orbiting = false;
                    }
                } else if (dist <= orbitEnter) {
                    orbiting = true;
                    orbitAngle = Math.atan2(dy, dx);
                    origin = { x: fireballPos.x, y: fireballPos.y };
                }

                orbitBlend += (orbiting ? 1 : -1) * 0.08;
                orbitBlend = Math.max(0, Math.min(1, orbitBlend));

                if (orbitBlend > 0) {
                    const orbitStep = orbitRadius > 0 ? (10.5 * 0.016) / orbitRadius * 0.35 : 0;
                    orbitAngle += orbitStep;
                    const orbitX = target.x + Math.cos(orbitAngle) * orbitRadius;
                    const orbitY = target.y + Math.sin(orbitAngle) * orbitRadius;
                    const toOrbitX = orbitX - fireballPos.x;
                    const toOrbitY = orbitY - fireballPos.y;
                    const correction = 0.12 * orbitBlend;
                    velocity.x += toOrbitX * correction;
                    velocity.y += toOrbitY * correction;

                    const orbitSpeed = orbitStep > 0 ? (orbitStep / 0.016) * orbitRadius : 0;
                    const tangentX = -Math.sin(orbitAngle);
                    const tangentY = Math.cos(orbitAngle);
                    const desiredOrbitVX = tangentX * orbitSpeed;
                    const desiredOrbitVY = tangentY * orbitSpeed;
                    velocity.x += (desiredOrbitVX - velocity.x) * (0.15 * orbitBlend);
                    velocity.y += (desiredOrbitVY - velocity.y) * (0.15 * orbitBlend);
                }
                if (orbitBlend < 1 && dist > 0.001) {
                    const desiredVX = (dx / dist) * followSpeed;
                    const desiredVY = (dy / dist) * followSpeed;
                    velocity.x += (desiredVX - velocity.x) * (0.25 * (1 - orbitBlend));
                    velocity.y += (desiredVY - velocity.y) * (0.25 * (1 - orbitBlend));
                }

                const velMag = Math.hypot(velocity.x, velocity.y);
                if (velMag > maxSpeed) {
                    const scale = maxSpeed / velMag;
                    velocity.x *= scale;
                    velocity.y *= scale;
                }
                fireballPos.x += velocity.x * 0.016;
                fireballPos.y += velocity.y * 0.016;
            } else {
                orbiting = false;
                orbitBlend = Math.max(0, orbitBlend - 0.08);
                fireballPos.x += velocity.x * 0.016;
                fireballPos.y += velocity.y * 0.016;
            }
            fireballGroup.position.set(fireballPos.x, fireballPos.y, 0.2);

            // Spin the fire missile
            rotationAngle += 0.2;
            fireballGroup.rotation.z = rotationAngle;

            // Create trailing particles at fireball position
            if (Math.random() > 0.3) {
                const trailSize = 0.1 + Math.random() * 0.15;
                const trailGeometry = new THREE.CircleGeometry(trailSize, 8);
                const trailColor = Math.random() > 0.5 ? 0x3aa9ff : 0x0a6cff; // Mix light and deep blue
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
            const owner = projectile.owner || this;
            if (owner && typeof owner.isPositionBlockedByProtectionDome === 'function' &&
                owner.isPositionBlockedByProtectionDome(fireballGroup.position)) {
                hit = true;
            }
            if (!hit) {
                for (const enemy of owner && typeof owner.getDamageTargets === 'function' ? owner.getDamageTargets() : []) {
                    if (!enemy.isAlive) continue;

                    const enemyBounds = enemy.getBounds();
                    if (checkAABBCollision(fireballBounds, enemyBounds)) {
                        if (typeof owner.applyAbilityDamage === 'function') {
                            owner.applyAbilityDamage(this.abilities.q, enemy, 2);
                        } else if (typeof enemy.takeDamage === 'function') {
                            enemy.takeDamage(2, owner);
                        }
                        if (enemy.type === 'player' && typeof owner.addUltimateCharge === 'function') {
                            owner.addUltimateCharge(owner.ultimateChargePerKill || 0);
                        }
                        console.log('ðŸ”¥ Fireball hit!');
                        hit = true;
                        break;
                    }
                }
            }

            if (!hit && level.platforms) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds || platform.isLadder || platform.disabled) continue;
                    const isSolid = (platform.body && platform.body.isSolid) || platform.type === 'wall';
                    if (!isSolid) continue;
                    if (checkAABBCollision(fireballBounds, platform.bounds)) {
                        hit = true;
                        break;
                    }
                }
            }

            const traveled = Math.hypot(fireballPos.x - origin.x, fireballPos.y - origin.y);
            // Remove if hit or out of range
            if (hit || traveled > maxDistance) {
                clearInterval(fireballInterval);
                cleanupProjectile();
                this.mesh.parent.remove(fireballGroup);

                // Clean up any remaining trail particles
                trailParticles.forEach(particle => {
                    if (particle.mesh.parent) {
                        this.mesh.parent.remove(particle.mesh);
                    }
                });

                this.createExplosion(
                    fireballGroup.position.x,
                    fireballGroup.position.y,
                    0x2fa8ff,
                    0.75,
                    1.5,
                    projectile.owner || this,
                    10
                );
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

        const direction = this.getReticleDirection();
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
                if (enemy.type === 'player') {
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

        const shieldDuration = 10;
        const shieldAmount = 40;
        const allyRadius = 3.5;
        this.applyShieldBurstBonus(allyRadius, shieldAmount, shieldDuration);

        // Apply protective bubble to self
        this.applyProtectiveBubble();
    }

    applyShieldBurstBonus(radius, shieldAmount, durationSeconds) {
        const players = this.getAllPlayers ? this.getAllPlayers() : [];
        players.forEach((player) => {
            if (!player || !player.isAlive) return;
            if (player !== this && !this.isSameTeam(player)) return;
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distance = Math.hypot(dx, dy);
            if (player === this || distance <= radius) {
                if (typeof player.addShield === 'function') {
                    player.addShield(shieldAmount, durationSeconds);
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
        }, 10000);
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

    hasActiveShield() {
        return Boolean(this.bubbleShield || (this.shieldStatus && this.shieldStatus.isActive));
    }

    checkShieldDepleted() {
        if (!this.bubbleShield) return;
        if (!this.shieldStatus || this.shieldStatus.amount <= 0) {
            this.removeProtectiveBubble();
            if (this.currentHealth <= 0 && this.isAlive) {
                super.die();
            }
        }
    }

    setFrozen(durationSeconds = 1.2) {
        if (this.hasActiveShield()) return;
        super.setFrozen(durationSeconds);
    }

    setStunned(durationSeconds = 0.6) {
        if (this.hasActiveShield()) return;
        super.setStunned(durationSeconds);
    }

    setSlowed(durationSeconds = 1.2, multiplier = 0.7) {
        if (this.hasActiveShield()) return;
        super.setSlowed(durationSeconds, multiplier);
    }

    applyFear(sourceX, durationSeconds = 0.7) {
        if (this.hasActiveShield()) return;
        super.applyFear(sourceX, durationSeconds);
    }

    setCripple(durationSeconds = 1.5) {
        if (this.hasActiveShield()) return;
        super.setCripple(durationSeconds);
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

        if (this.isChargingBeam) return;

        console.log('âš¡ KAME HAME HA!!! âš¡');

        const reticleDir = this.getReticleDirection();
        this.beamAimDirection = { x: reticleDir.x, y: reticleDir.y };

        // Start charging (freezes character)
        this.isChargingBeam = true;
        this.beamChargeTime = 0;
        this.startChargeEffects();
    }

    startChargeEffects() {
        if (!this.mesh || !this.mesh.parent) return;
        if (this.chargeEnergyBall && this.chargeEnergyBall.parent) {
            this.chargeEnergyBall.parent.remove(this.chargeEnergyBall);
        }
        this.chargeParticles.forEach((particle) => {
            if (particle.mesh && particle.mesh.parent) {
                particle.mesh.parent.remove(particle.mesh);
            }
        });
        this.chargeParticles = [];

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
        this.chargeEnergyBall = energyBall;

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
        if (this.chargeInterval) {
            clearInterval(this.chargeInterval);
        }
        const growthInterval = setInterval(() => {
            growthTime += 0.016;

            // Grow from 0.2 to 1.0 scale over 0.8 seconds
            const growthScale = 0.2 + Math.min(growthTime / 0.8, 1) * 0.8;
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
                growthTime = 0.8;
            }
        }, 16);

        this.chargeInterval = growthInterval;
        this.chargeParticles = chargeParticles;
    }

    releaseKameHameHa() {
        if (!this.isChargingBeam) return;
        const chargeTime = this.beamChargeTime;
        let beamWidth = 0.5;
        let beamDamage = 30;
        if (chargeTime >= 1.25) {
            beamWidth = 2;
            beamDamage = 80;
        } else if (chargeTime >= 0.5) {
            beamWidth = 1;
            beamDamage = 50;
        }

        this.isChargingBeam = false;
        this.fullChargeReached = false;
        this.fullChargeHoldTime = 0;
        this.fireKameHameHa(beamWidth, beamDamage);
        this.cleanupChargeEffects();
        this.ultimateCharge = 0;
    }

    cleanupChargeEffects() {
        if (this.chargeInterval) {
            clearInterval(this.chargeInterval);
            this.chargeInterval = null;
        }
        if (this.chargeEnergyBall && this.chargeEnergyBall.parent) {
            this.chargeEnergyBall.parent.remove(this.chargeEnergyBall);
        }
        this.chargeEnergyBall = null;
        this.chargeParticles.forEach((particle) => {
            if (particle.mesh && particle.mesh.parent) {
                particle.mesh.parent.remove(particle.mesh);
            }
        });
        this.chargeParticles = [];
    }

    /**
     * Fire the charged beam
     */
    fireKameHameHa(beamWidth = 1, beamDamage = 30) {
        this.isChargingBeam = false;

        const direction = this.beamAimDirection || { x: this.facingDirection, y: 0 };
        const dir = { x: direction.x, y: direction.y };
        let perpendicular = { x: -dir.y, y: dir.x };
        let angle = Math.atan2(dir.y, dir.x);
        const beamLength = 20;
        const beamDuration = 0.8;
        const damage = beamDamage;

        // Create beam group with multiple layers
        const beamGroup = new THREE.Group();

        // Inner core (bright white)
        const coreGeometry = new THREE.BoxGeometry(beamLength, beamWidth * 0.4, 0.2);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        beamGroup.add(core);

        // Middle layer (bright cyan)
        const midGeometry = new THREE.BoxGeometry(beamLength, beamWidth * 0.7, 0.2);
        const midMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const midLayer = new THREE.Mesh(midGeometry, midMaterial);
        beamGroup.add(midLayer);

        // Outer layer (cyan glow)
        const outerGeometry = new THREE.BoxGeometry(beamLength, beamWidth * 1.0, 0.2);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.5
        });
        const outerLayer = new THREE.Mesh(outerGeometry, outerMaterial);
        beamGroup.add(outerLayer);

        // Outer glow (very light cyan)
        const glowGeometry = new THREE.BoxGeometry(beamLength, beamWidth * 1.4, 0.2);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        beamGroup.add(glow);

        const coneLength = Math.max(0.9, beamWidth * 1.4);
        const coneRadius = beamWidth * 0.8;
        const coneGeometry = new THREE.ConeGeometry(coneRadius, coneLength, 28);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: 0x8fe8ff,
            transparent: true,
            opacity: 0.4
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.rotation.z = Math.PI / 2;
        beamGroup.add(cone);

        const haloGeometry = new THREE.ConeGeometry(coneRadius * 1.15, coneLength * 0.95, 28);
        const haloMaterial = new THREE.MeshBasicMaterial({
            color: 0x4fb3ff,
            transparent: true,
            opacity: 0.22
        });
        const haloCone = new THREE.Mesh(haloGeometry, haloMaterial);
        haloCone.rotation.z = Math.PI / 2;
        beamGroup.add(haloCone);

        const ringGeometry = new THREE.RingGeometry(coneRadius * 0.45, coneRadius * 0.7, 26);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xd7fbff,
            transparent: true,
            opacity: 0.6
        });
        const muzzleRing = new THREE.Mesh(ringGeometry, ringMaterial);
        muzzleRing.rotation.z = Math.PI / 2;
        beamGroup.add(muzzleRing);

        const halfLength = beamLength * 0.5;
        const muzzleOffset = 0.7;
        const beamPos = {
            x: this.position.x + dir.x * (muzzleOffset + beamLength),
            y: this.position.y + dir.y * (muzzleOffset + beamLength)
        };
        beamGroup.position.set(beamPos.x, beamPos.y, 0.2);
        beamGroup.rotation.z = angle;
        beamGroup.children.forEach((child) => {
            child.position.x -= halfLength;
        });
        const coneCenter = -beamLength + coneLength * 0.5;
        cone.position.x = coneCenter;
        haloCone.position.x = coneCenter + coneLength * 0.03;
        muzzleRing.position.x = -beamLength + 0.02;
        beamGroup.userData = {
            cone,
            haloCone,
            muzzleRing,
            coneBaseScale: cone.scale.clone(),
            haloBaseScale: haloCone.scale.clone(),
            ringBaseScale: muzzleRing.scale.clone()
        };
        this.mesh.parent.add(beamGroup);
        this.isBeamActive = true;

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
            const offsetY = (Math.random() - 0.5) * beamWidth * 1.2;
            particle.position.set(
                beamPos.x + dir.x * (offsetX - halfLength) + perpendicular.x * offsetY,
                beamPos.y + dir.y * (offsetX - halfLength) + perpendicular.y * offsetY,
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

        let elapsed = 0;
        let hitEnemies = new Set();
        const projectile = {
            type: 'beam',
            mesh: beamGroup,
            length: beamLength,
            direction: dir,
            owner: this,
            lastDeflectTime: 0,
            deflect: (newOwner) => {
                const now = performance.now();
                if (now - projectile.lastDeflectTime < 200) {
                    return;
                }
                projectile.lastDeflectTime = now;
                projectile.owner = newOwner;
                dir.x *= -1;
                dir.y *= -1;
                perpendicular = { x: -dir.y, y: dir.x };
                angle = Math.atan2(dir.y, dir.x);
                beamGroup.rotation.z = angle;
                hitEnemies = new Set();
            }
        };
        Hero.addProjectile(projectile);
        const cleanupProjectile = () => {
            Hero.removeProjectile(projectile);
        };

        const beamMatrix = new THREE.Matrix4();
        const enemyPos = new THREE.Vector3();

        const cleanupBeam = () => {
            clearInterval(particleInterval);
            cleanupProjectile();
            this.mesh.parent.remove(beamGroup);
            this.isBeamActive = false;
            beamParticles.forEach(p => {
                if (p.mesh.parent) this.mesh.parent.remove(p.mesh);
            });
        };

        // Animate flowing particles (beam follows the cyborg during the active duration)
        let lastTime = performance.now();
        const particleInterval = setInterval(() => {
            const now = performance.now();
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            elapsed += dt;
            // Track elapsed time for cleanup

            const owner = projectile.owner || this;
            if (!owner || !owner.isAlive) {
                cleanupBeam();
                return;
            }

            beamGroup.rotation.z = angle;
            beamGroup.position.set(beamPos.x, beamPos.y, 0.2);

            beamParticles.forEach(p => {
                p.life += dt;
                p.offsetX += p.speed * dt;

                p.mesh.position.x = beamPos.x + dir.x * (p.offsetX - halfLength) + perpendicular.x * p.offsetY;
                p.mesh.position.y = beamPos.y + dir.y * (p.offsetX - halfLength) + perpendicular.y * p.offsetY;

                // Fade out particles as they travel
                p.mesh.material.opacity = Math.max(0, 0.7 - p.life);
            });

            if (beamGroup.userData) {
                const pulse = 1 + Math.sin(elapsed * 8) * 0.07;
                const ringPulse = 1 + Math.sin(elapsed * 10 + 1.2) * 0.1;
                beamGroup.userData.cone.scale.set(
                    beamGroup.userData.coneBaseScale.x * pulse,
                    beamGroup.userData.coneBaseScale.y * pulse,
                    1
                );
                beamGroup.userData.haloCone.scale.set(
                    beamGroup.userData.haloBaseScale.x * (pulse * 0.95),
                    beamGroup.userData.haloBaseScale.y * (pulse * 0.95),
                    1
                );
                beamGroup.userData.muzzleRing.scale.set(
                    beamGroup.userData.ringBaseScale.x * ringPulse,
                    beamGroup.userData.ringBaseScale.y * ringPulse,
                    1
                );
            }

            if (owner && typeof owner.isPositionBlockedByProtectionDome === 'function' &&
                owner.isPositionBlockedByProtectionDome(beamPos)) {
                cleanupBeam();
                return;
            }

            beamGroup.updateMatrixWorld(true);
            beamMatrix.copy(beamGroup.matrixWorld).invert();
            const localXMin = -beamLength;
            const localXMax = 0;
            const localYLimit = beamWidth * 0.7;

            // Damage enemies in beam (once per enemy)
            let targets = owner && typeof owner.getDamageTargets === 'function'
                ? owner.getDamageTargets()
                : [];
            if (!targets || targets.length === 0) {
                targets = owner && Array.isArray(owner.opponents) ? owner.opponents : [];
            }
            if ((!targets || targets.length === 0) && owner && typeof owner.getAllPlayers === 'function') {
                targets = owner.getAllPlayers().filter((player) => {
                    if (!player || player === owner || !player.isAlive) return false;
                    if (typeof owner.isSameTeam === 'function' && owner.isSameTeam(player)) return false;
                    return true;
                });
            }
            for (const enemy of targets) {
                if (!enemy || !enemy.isAlive || hitEnemies.has(enemy)) continue;
                if (typeof enemy.getBounds !== 'function') continue;
                const enemyBounds = enemy.getBounds();
                const centerX = (enemyBounds.left + enemyBounds.right) * 0.5;
                const centerY = (enemyBounds.top + enemyBounds.bottom) * 0.5;
                const halfW = Math.max(0.1, (enemyBounds.right - enemyBounds.left) * 0.5);
                const halfH = Math.max(0.1, (enemyBounds.top - enemyBounds.bottom) * 0.5);
                const radius = Math.max(halfW, halfH);
                enemyPos.set(centerX, centerY, 0).applyMatrix4(beamMatrix);
                if (enemyPos.x >= localXMin - radius &&
                    enemyPos.x <= localXMax + radius &&
                    Math.abs(enemyPos.y) <= localYLimit + radius) {
                    enemy.takeDamage(Math.max(1, Math.round(damage)), owner);
                    hitEnemies.add(enemy);
                    if (enemy.type === 'player' && typeof owner.addUltimateCharge === 'function') {
                        owner.addUltimateCharge(owner.ultimateChargePerKill || 0);
                    }
                }
            }

            if (elapsed >= beamDuration) {
                cleanupBeam();
            }
        }, 16);

        setTimeout(() => {
            if (this.isBeamActive) {
                cleanupBeam();
            }
        }, beamDuration * 1000 + 50);
    }

    /**
     * Create explosion effect
     */
    createExplosion(x, y, color, visualRadius = 0.5, damageRadius = visualRadius, owner = null, damage = 0) {
        const explosionGeometry = new THREE.CircleGeometry(visualRadius, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.set(x, y, 0.3);
        this.mesh.parent.add(explosion);

        if (owner && damage > 0 && typeof owner.getDamageTargets === 'function') {
            for (const enemy of owner.getDamageTargets()) {
                if (!enemy || !enemy.isAlive) continue;
                let hit = false;
                if (typeof enemy.getBounds === 'function') {
                    const bounds = enemy.getBounds();
                    if (bounds) {
                        const closestX = Math.max(bounds.left, Math.min(x, bounds.right));
                        const closestY = Math.max(bounds.bottom, Math.min(y, bounds.top));
                        const dx = x - closestX;
                        const dy = y - closestY;
                        hit = (dx * dx + dy * dy) <= (damageRadius * damageRadius);
                    }
                } else if (enemy.position) {
                    const dx = enemy.position.x - x;
                    const dy = enemy.position.y - y;
                    hit = (dx * dx + dy * dy) <= (damageRadius * damageRadius);
                }
                if (hit) {
                    if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(damage, owner);
                    }
                }
            }
        }

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

    destroy() {
        if (this.aimIndicator && this.aimIndicator.parent) {
            this.aimIndicator.parent.remove(this.aimIndicator);
        }
        this.aimIndicator = null;
        this.aimIndicatorLine = null;
        this.aimIndicatorTip = null;
        super.destroy();
    }
}
