import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Archer Hero - Bow specialist with charge shots and teleport
 * @class Archer
 */
export class Archer extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Archer theme color
        this.setBodyColor(0x2f7a4a);

        // Add bow
        this.createEquipment(scene);
        this.createAimPathDots(scene);

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;

        // Charge shot state
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 1.5;
        this.isUltimateCharging = false;
        this.ultimateChargeTime = 0;
        this.pendingUltimateChargeRatio = null;
        this.isVineCharging = false;
        this.vineChargeTime = 0;
        this.isTeleportCharging = false;
        this.teleportChargeTime = 0;
        this.persistAimDirectionOnNull = true;

        // Teleport arrow flag
        this.teleportArrowQueued = false;

        // Potion effect state
        this.healOverTimeRemaining = 0;
        this.speedBoostRemaining = 0;
        this.potionEffect = null;
        this.potionEffectTime = 0;

        // Arrow storm ultimate state
        this.arrowStormActive = false;
        this.arrowStormInterval = null;

        // Movement boost multiplier
        this.moveSpeedMultiplier = 1;

        // Set archer abilities
        this.initializeAbilities();
    }

    /**
     * Create bow visual
     * @param {THREE.Scene} scene - The scene
     */
    createEquipment(scene) {
        this.bowGroup = new THREE.Group();

        // Bow limbs
        const limbGeometry = new THREE.BoxGeometry(0.08, 0.9, 0.06);
        const limbMaterial = new THREE.MeshBasicMaterial({ color: 0x8b5a2b });
        const leftLimb = new THREE.Mesh(limbGeometry, limbMaterial);
        leftLimb.position.set(0, 0.1, 0);
        leftLimb.rotation.z = 0.15;
        this.bowGroup.add(leftLimb);

        const rightLimb = new THREE.Mesh(limbGeometry, limbMaterial);
        rightLimb.position.set(0, -0.1, 0);
        rightLimb.rotation.z = -0.15;
        this.bowGroup.add(rightLimb);

        // Bow grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x5b3a1d }));
        grip.position.set(0, 0, 0);
        this.bowGroup.add(grip);

        // Bow string
        const stringMaterial = new THREE.MeshBasicMaterial({ color: 0xe6e6e6 });
        this.bowString = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.95, 0.02), stringMaterial);
        this.bowString.position.set(0.05, 0, -0.02);
        this.bowGroup.add(this.bowString);

        const chargeArrowGroup = new THREE.Group();
        const chargeShaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.04, 0.04),
            new THREE.MeshBasicMaterial({ color: 0xfff2b3 })
        );
        chargeShaft.position.set(0.18, 0, 0);
        chargeArrowGroup.add(chargeShaft);

        const chargeTip = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, 0.12, 10),
            new THREE.MeshBasicMaterial({ color: 0x7a7a7a })
        );
        chargeTip.rotation.z = Math.PI / 2;
        chargeTip.position.set(0.32, 0, 0);
        chargeArrowGroup.add(chargeTip);

        const flareShape = new THREE.Shape();
        flareShape.moveTo(0, 0.2);
        flareShape.lineTo(0.08, 0.08);
        flareShape.lineTo(0.22, 0);
        flareShape.lineTo(0.08, -0.08);
        flareShape.lineTo(0, -0.2);
        flareShape.lineTo(-0.08, -0.08);
        flareShape.lineTo(-0.22, 0);
        flareShape.lineTo(-0.08, 0.08);
        flareShape.lineTo(0, 0.2);
        const chargeGlow = new THREE.Mesh(
            new THREE.ShapeGeometry(flareShape),
            new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
        );
        chargeGlow.position.set(0.32, 0, -0.02);
        chargeArrowGroup.add(chargeGlow);

        chargeArrowGroup.position.set(0.05, 0, 0.06);
        chargeArrowGroup.visible = false;
        this.bowGroup.add(chargeArrowGroup);
        this.chargeArrowGroup = chargeArrowGroup;
        this.chargeArrowGlow = chargeGlow;

        // Position bow on right side, clearly in front
        this.bowGroup.position.set(0.55, 0.1, 0.5);
        this.bowGroup.rotation.z = 0.2;
        this.mesh.add(this.bowGroup);
    }

    createAimPathDots(scene) {
        if (!scene) return;
        const dotGroup = new THREE.Group();
        const dashGeometry = new THREE.PlaneGeometry(0.18, 0.045);
        const dashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.55,
            depthTest: false
        });
        const dots = [];
        const dotCount = 12;
        for (let i = 0; i < dotCount; i += 1) {
            const dash = new THREE.Mesh(dashGeometry, dashMaterial.clone());
            dash.renderOrder = 14;
            dash.visible = false;
            dotGroup.add(dash);
            dots.push(dash);
        }

        const impactIndicator = new THREE.Mesh(
            new THREE.RingGeometry(0.12, 0.18, 16),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                depthTest: false
            })
        );
        impactIndicator.visible = false;
        impactIndicator.renderOrder = 14;
        dotGroup.add(impactIndicator);
        dotGroup.visible = false;
        scene.add(dotGroup);
        this.aimPathDots = dots;
        this.aimPathGroup = dotGroup;
        this.aimPathImpact = impactIndicator;
    }

    /**
     * Initialize archer abilities
     */
    initializeAbilities() {
        // Q - Shoot Arrow (charge)
        const shootArrow = new Ability('Shoot Arrow', 1.2);

        // W - Vine Shot (charge)
        const vineShot = new Ability('Vine Shot', 6);

        // E - Teleporting Arrow
        const teleportArrow = new Ability('Teleport Arrow', 6);
        teleportArrow.use = (hero) => {
            if (!Ability.prototype.use.call(teleportArrow, hero)) return false;
            hero.fireTeleportArrow();
            return true;
        };

        // R - Arrow Storm (ultimate)
        const arrowStorm = new Ability('Arrow Storm', 0, true);
        arrowStorm.use = (hero) => {
            return hero.activateArrowStorm();
        };

        this.setAbilities(shootArrow, vineShot, teleportArrow, arrowStorm);
    }

    /**
     * Update - handle charging and potion effects
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

        this.updateAimPathDots();

        // Handle charge shot input (A1)
        this.handleChargeShot(deltaTime, input);
        this.handleVineChargeShot(deltaTime, input);
        this.handleTeleportChargeShot(deltaTime, input);
        this.handleUltimateChargeShot(deltaTime, input);

        // Handle potion effects
        this.updatePotionEffects(deltaTime);

        super.update(deltaTime, input);
    }


    /**
     * Override ability input to reserve A1 for charge logic
     */
    handleAbilityInput(input) {
        if (this.controlsLocked) {
            return;
        }
        if (this.isCarryingFlag && input.isFlagDropPressed()) {
            return;
        }
        // Ability 3 handled by charge logic to enable hold + preview.
        // Ultimate handled by charge logic to match A1 behavior.
    }

    /**
     * Set facing direction and flip character
     */
    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction; // Flip entire mesh with bow
        }
    }

    /**
     * Charge shot handling
     */
    handleChargeShot(deltaTime, input) {
        const ability = this.abilities.q;
        const isPressed = input.isAbility1Pressed();

        if (isPressed && ability && ability.isReady && !this.isCharging) {
            this.isCharging = true;
            this.chargeTime = 0;
        }

        if (this.isCharging) {
            if (isPressed) {
                this.chargeTime = Math.min(this.chargeTime + deltaTime, this.maxChargeTime);
                const pull = 0.08 + (this.chargeTime / this.maxChargeTime) * 0.08;
                this.bowString.position.x = 0.05 - pull;
                this.bowGroup.rotation.z = 0.2 + (this.chargeTime / this.maxChargeTime) * 0.2;
                this.updateChargeArrowFx();
            } else {
                const chargeRatio = this.chargeTime / this.maxChargeTime;
                this.bowString.position.x = 0.05;
                this.bowGroup.rotation.z = 0.2;
                this.updateChargeArrowFx(true);

                if (ability && ability.isReady) {
                    ability.use(this);
                this.fireArrow(chargeRatio, false, false, ability);
                }

                this.isCharging = false;
                this.chargeTime = 0;
            }
        }
    }

    handleVineChargeShot(deltaTime, input) {
        const ability = this.abilities.w;
        const isPressed = input.isAbility2Pressed();

        if (isPressed && ability && ability.isReady && !this.isVineCharging && !this.isCharging && !this.isUltimateCharging) {
            this.isVineCharging = true;
            this.vineChargeTime = 0;
        }

        if (this.isVineCharging) {
            if (isPressed) {
                this.vineChargeTime = Math.min(this.vineChargeTime + deltaTime, this.maxChargeTime);
                const pull = 0.08 + (this.vineChargeTime / this.maxChargeTime) * 0.08;
                this.bowString.position.x = 0.05 - pull;
                this.bowGroup.rotation.z = 0.2 + (this.vineChargeTime / this.maxChargeTime) * 0.2;
                this.updateChargeArrowFx();
            } else {
                const chargeRatio = this.vineChargeTime / this.maxChargeTime;
                this.bowString.position.x = 0.05;
                this.bowGroup.rotation.z = 0.2;
                this.updateChargeArrowFx(true);

                if (ability && ability.isReady) {
                    ability.use(this);
                    this.fireVineArrow(chargeRatio, ability);
                }

                this.isVineCharging = false;
                this.vineChargeTime = 0;
            }
        }
    }

    /**
     * Ultimate charge handling (match A1 charge/release feel)
     */
    handleUltimateChargeShot(deltaTime, input) {
        const ability = this.abilities.r;
        const isPressed = input.isUltimatePressed();
        const ultimateReady = this.ultimateCharge >= this.ultimateChargeMax;

        if (isPressed && ability && ability.isReady && ultimateReady && !this.isUltimateCharging && !this.isCharging) {
            this.isUltimateCharging = true;
            this.ultimateChargeTime = 0;
        }

        if (this.isUltimateCharging) {
            if (isPressed) {
                this.ultimateChargeTime = Math.min(this.ultimateChargeTime + deltaTime, this.maxChargeTime);
                const pull = 0.08 + (this.ultimateChargeTime / this.maxChargeTime) * 0.08;
                this.bowString.position.x = 0.05 - pull;
                this.bowGroup.rotation.z = 0.2 + (this.ultimateChargeTime / this.maxChargeTime) * 0.2;
                this.updateChargeArrowFx();
            } else {
                const chargeRatio = this.ultimateChargeTime / this.maxChargeTime;
                this.bowString.position.x = 0.05;
                this.bowGroup.rotation.z = 0.2;
                this.updateChargeArrowFx(true);

                if (ability && ability.isReady && ultimateReady) {
                    this.pendingUltimateChargeRatio = chargeRatio;
                    this.useUltimate();
                    this.pendingUltimateChargeRatio = null;
                }

                this.isUltimateCharging = false;
                this.ultimateChargeTime = 0;
            }
        }
    }

    handleTeleportChargeShot(deltaTime, input) {
        const ability = this.abilities.e;
        const isPressed = input.isAbility3Pressed();

        if (this.isCarryingFlag && this.flagCarryBlocksAbility3) {
            return;
        }

        if (isPressed && ability && ability.isReady && !this.isTeleportCharging &&
            !this.isCharging && !this.isVineCharging && !this.isUltimateCharging) {
            this.isTeleportCharging = true;
            this.teleportChargeTime = 0;
        }

        if (this.isTeleportCharging) {
            if (isPressed) {
                this.teleportChargeTime = Math.min(this.teleportChargeTime + deltaTime, this.maxChargeTime);
                const pull = 0.08 + (this.teleportChargeTime / this.maxChargeTime) * 0.08;
                this.bowString.position.x = 0.05 - pull;
                this.bowGroup.rotation.z = 0.2 + (this.teleportChargeTime / this.maxChargeTime) * 0.2;
            } else {
                this.bowString.position.x = 0.05;
                this.bowGroup.rotation.z = 0.2;

                if (ability && ability.isReady) {
                    ability.use(this);
                    this.fireTeleportArrow();
                }

                this.isTeleportCharging = false;
                this.teleportChargeTime = 0;
            }
        }
    }

    updateChargeArrowFx(forceHide = false) {
        if (!this.chargeArrowGroup || !this.chargeArrowGlow) return;
        if (forceHide) {
            this.chargeArrowGroup.visible = false;
            return;
        }
        const ratio = Math.max(this.chargeTime, this.ultimateChargeTime, this.vineChargeTime) / this.maxChargeTime;
        const isCharging = (this.isCharging || this.isUltimateCharging || this.isVineCharging) && ratio > 0;
        const isFull = ratio >= 0.95;
        this.chargeArrowGroup.visible = isCharging;
        if (!isCharging) return;
        const offsetX = 0.05 - 0.12 * Math.min(1, ratio);
        this.chargeArrowGroup.position.x = offsetX;
        this.chargeArrowGlow.visible = isFull;
        if (!isFull) return;
        const pulse = 0.7 + Math.sin(performance.now() * 0.012) * 0.25;
        this.chargeArrowGlow.material.opacity = pulse;
        this.chargeArrowGlow.rotation.z += 0.03;
    }

    updateAimPathDots() {
        if (!this.aimPathGroup || !this.aimPathDots) return;
        if (Number.isFinite(this.reticleLayer) && !this.aimPathGroup.userData.layerSet) {
            this.aimPathGroup.traverse((child) => {
                if (child && child.layers) {
                    child.layers.set(this.reticleLayer);
                }
            });
            this.aimPathGroup.userData.layerSet = true;
        }

        const isCharging = (this.isCharging || this.isUltimateCharging || this.isVineCharging || this.isTeleportCharging) &&
            (this.chargeTime > 0 || this.ultimateChargeTime > 0 || this.vineChargeTime > 0 || this.teleportChargeTime > 0);
        this.aimPathGroup.visible = isCharging;
        if (!isCharging) {
            this.aimPathDots.forEach((dot) => {
                dot.visible = false;
            });
            return;
        }

        const chargeRatio = this.isTeleportCharging
            ? 0.6
            : Math.max(this.chargeTime, this.ultimateChargeTime, this.vineChargeTime) / this.maxChargeTime;
        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection || 1, y: 0 };
        const baseSpeed = 14;
        const speed = baseSpeed + chargeRatio * 10;
        const velocity = {
            x: direction.x * speed,
            y: useAim ? direction.y * speed : 3.5 + chargeRatio * 2.2
        };
        const gravity = -14;

        let posX = this.position.x + direction.x * 0.6;
        let posY = this.position.y + 0.1 + direction.y * 0.6;
        const step = 0.08;

        const level = this.level || { platforms: [] };
        const targets = this.getDamageTargets ? this.getDamageTargets() : [];
        let impactFound = false;
        let lastVisiblePos = null;

        this.aimPathDots.forEach((dot, index) => {
            if (impactFound) {
                dot.visible = false;
                return;
            }
            const t = (index + 1) * step;
            const dotX = posX + velocity.x * t;
            const dotY = posY + velocity.y * t + 0.5 * gravity * t * t;
            const velY = velocity.y + gravity * t;
            dot.position.set(dotX, dotY, 0.72);
            dot.rotation.z = Math.atan2(velY, velocity.x);
            dot.visible = true;
            lastVisiblePos = { x: dotX, y: dotY };

            const arrowBounds = {
                left: dotX - 0.12,
                right: dotX + 0.12,
                top: dotY + 0.06,
                bottom: dotY - 0.06
            };

            if (this.isPositionBlockedByProtectionDome && this.isPositionBlockedByProtectionDome({ x: dotX, y: dotY })) {
                impactFound = true;
                return;
            }

            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (checkAABBCollision(arrowBounds, platform.bounds)) {
                        impactFound = true;
                        return;
                    }
                }
            }

            if (!impactFound && targets.length) {
                for (const target of targets) {
                    if (!target || !target.isAlive) continue;
                    const targetBounds = target.getBounds ? target.getBounds() : null;
                    if (!targetBounds) continue;
                    if (checkAABBCollision(arrowBounds, targetBounds)) {
                        impactFound = true;
                        return;
                    }
                }
            }
        });

        if (this.aimPathImpact) {
            if (impactFound) {
                if (lastVisiblePos) {
                    this.aimPathImpact.position.set(lastVisiblePos.x, lastVisiblePos.y, 0.74);
                }
                this.aimPathImpact.visible = true;
            } else {
                this.aimPathImpact.visible = false;
            }
        }
    }

    fireVineArrow(chargeRatio, ability) {
        const arrowGroup = new THREE.Group();

        const shaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.06, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x6aa86e })
        );
        shaft.position.set(0.3, 0, 0);
        arrowGroup.add(shaft);

        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.07, 0.16, 8),
            new THREE.MeshBasicMaterial({ color: 0x3e5f3e })
        );
        tip.rotation.z = Math.PI / 2;
        tip.position.set(0.62, 0, 0);
        arrowGroup.add(tip);

        const fletch = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.12, 0.03),
            new THREE.MeshBasicMaterial({ color: 0x2c3f2d })
        );
        fletch.position.set(-0.08, 0, 0);
        arrowGroup.add(fletch);

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };
        arrowGroup.position.set(
            this.position.x + direction.x * 0.6,
            this.position.y + 0.1 + direction.y * 0.6,
            0.2
        );
        this.mesh.parent.add(arrowGroup);

        const speed = 14 + chargeRatio * 10;
        const velocity = {
            x: direction.x * speed,
            y: useAim ? direction.y * speed : 3.5 + chargeRatio * 2.2
        };
        const gravity = -14;
        const level = this.level || { platforms: [] };
        const hitTargets = new Set();
        const maxRange = 14 + chargeRatio * 8;
        let traveled = 0;

        const cleanup = () => {
            if (arrowGroup.parent) {
                arrowGroup.parent.remove(arrowGroup);
            }
        };

        const arrowInterval = setInterval(() => {
            const prevX = arrowGroup.position.x;
            const prevY = arrowGroup.position.y;
            arrowGroup.position.x += velocity.x * 0.016;
            velocity.y += gravity * 0.016;
            arrowGroup.position.y += velocity.y * 0.016;
            arrowGroup.rotation.z = Math.atan2(velocity.y, velocity.x);
            traveled += Math.hypot(arrowGroup.position.x - prevX, arrowGroup.position.y - prevY);

            const arrowBounds = {
                left: arrowGroup.position.x - 0.25,
                right: arrowGroup.position.x + 0.25,
                top: arrowGroup.position.y + 0.08,
                bottom: arrowGroup.position.y - 0.08
            };

            if (this.isPositionBlockedByProtectionDome &&
                this.isPositionBlockedByProtectionDome(arrowGroup.position)) {
                clearInterval(arrowInterval);
                cleanup();
                this.spawnVineField(arrowGroup.position, chargeRatio, ability);
                return;
            }

            for (const target of this.getDamageTargets()) {
                if (!target || !target.isAlive || hitTargets.has(target)) continue;
                if (!checkAABBCollision(arrowBounds, target.getBounds())) continue;
                hitTargets.add(target);
                clearInterval(arrowInterval);
                cleanup();
                this.spawnVineField(arrowGroup.position, chargeRatio, ability);
                return;
            }

            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(arrowBounds, platform.bounds)) {
                        clearInterval(arrowInterval);
                        cleanup();
                        this.spawnVineField(arrowGroup.position, chargeRatio, ability);
                        return;
                    }
                }
            }

            if (traveled >= maxRange) {
                clearInterval(arrowInterval);
                cleanup();
                this.spawnVineField(arrowGroup.position, chargeRatio, ability);
            }
        }, 16);
    }

    spawnVineField(position, chargeRatio, ability) {
        if (!this.mesh || !this.mesh.parent || !position) return;
        const duration = 3;
        const entangleDuration = 1.5;
        const radius = 2;

        const fieldGroup = new THREE.Group();
        const fieldFill = new THREE.Mesh(
            new THREE.CircleGeometry(radius, 24),
            new THREE.MeshBasicMaterial({ color: 0x4c8a53, transparent: true, opacity: 0.2 })
        );
        const fieldRing = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.92, radius, 24),
            new THREE.MeshBasicMaterial({ color: 0x8bdc7a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        const vineKnots = new THREE.Group();
        const knotCount = 14;
        for (let i = 0; i < knotCount; i += 1) {
            const knot = new THREE.Mesh(
                new THREE.TorusGeometry(0.16 + Math.random() * 0.05, 0.03 + Math.random() * 0.02, 6, 18),
                new THREE.MeshBasicMaterial({ color: 0x1f4a28, transparent: true, opacity: 0.6 })
            );
            const angle = (i / knotCount) * Math.PI * 2;
            knot.position.set(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9, -0.02);
            knot.rotation.x = Math.PI / 2;
            knot.rotation.z = angle;
            vineKnots.add(knot);
        }

        const vineWeave = new THREE.Group();
        const weavePairs = 12;
        for (let i = 0; i < weavePairs; i += 1) {
            const angle = (i / weavePairs) * Math.PI * 2;
            const weaveRadius = radius * 1.04;
            const weaveLength = 0.42;
            const weaveThickness = 0.06;
            const weaveMaterial = new THREE.MeshBasicMaterial({
                color: 0x16381f,
                transparent: true,
                opacity: 0.55,
                side: THREE.DoubleSide
            });
            const stripA = new THREE.Mesh(new THREE.PlaneGeometry(weaveLength, weaveThickness), weaveMaterial.clone());
            const stripB = new THREE.Mesh(new THREE.PlaneGeometry(weaveLength, weaveThickness), weaveMaterial.clone());
            stripA.position.set(Math.cos(angle) * weaveRadius, Math.sin(angle) * weaveRadius, -0.03);
            stripB.position.set(Math.cos(angle) * weaveRadius, Math.sin(angle) * weaveRadius, -0.035);
            stripA.rotation.z = angle + Math.PI / 3;
            stripB.rotation.z = angle - Math.PI / 3;
            vineWeave.add(stripA, stripB);
        }

        const vineCurls = new THREE.Group();
        const curlCount = 10;
        for (let i = 0; i < curlCount; i += 1) {
            const angle = (i / curlCount) * Math.PI * 2 + Math.PI / curlCount;
            const curlRadius = radius * (1.02 + Math.random() * 0.08);
            const curl = new THREE.Mesh(
                new THREE.TorusGeometry(0.12, 0.02, 6, 14),
                new THREE.MeshBasicMaterial({ color: 0x204826, transparent: true, opacity: 0.5 })
            );
            curl.position.set(Math.cos(angle) * curlRadius, Math.sin(angle) * curlRadius, -0.025);
            curl.rotation.x = Math.PI / 2;
            curl.rotation.z = angle + Math.random() * 0.6;
            vineCurls.add(curl);
        }
        fieldFill.position.z = 0.0;
        fieldRing.position.z = 0.02;
        fieldGroup.add(vineKnots, vineWeave, vineCurls, fieldFill, fieldRing);
        fieldGroup.position.set(position.x, position.y, 0.25);
        this.mesh.parent.add(fieldGroup);

        const enemiesEntangled = new Set();
        const players = this.getAllPlayers ? this.getAllPlayers() : [];
        const targets = this.getDamageTargets ? this.getDamageTargets() : [];
        const enemyTargets = targets.filter((target) => target && !this.isSameTeam?.(target));
        enemyTargets.forEach((target) => {
            if (!target || !target.isAlive) return;
            const dx = target.position.x - position.x;
            const dy = target.position.y - position.y;
            if (dx * dx + dy * dy <= radius * radius) {
                if (typeof target.setEntangled === 'function') {
                    target.setEntangled(entangleDuration);
                    enemiesEntangled.add(target);
                } else if (typeof target.setStunned === 'function') {
                    target.setStunned(entangleDuration);
                    enemiesEntangled.add(target);
                }
            }
        });

        const tickInterval = 0.1;
        const healTick = 0.5;
        const damageTick = 0.5;
        let elapsed = 0;
        let lastHealTick = 0;
        let lastDamageTick = 0;
        const interval = setInterval(() => {
            elapsed += tickInterval;
            const alliedPlayers = this.getAllPlayers ? this.getAllPlayers() : [];
            if (elapsed - lastHealTick >= healTick) {
                lastHealTick = elapsed;
                alliedPlayers.forEach((player) => {
                    if (!player || !player.isAlive) return;
                    if (this.isSameTeam && this.isSameTeam(player)) {
                        const dx = player.position.x - position.x;
                        const dy = player.position.y - position.y;
                        if (dx * dx + dy * dy > radius * radius) return;
                        if (typeof player.heal === 'function') {
                            player.heal(5);
                        }
                    }
                });
            }

            if (elapsed - lastDamageTick >= damageTick) {
                lastDamageTick = elapsed;
                enemyTargets.forEach((target) => {
                    if (!target || !target.isAlive) return;
                    const dx = target.position.x - position.x;
                    const dy = target.position.y - position.y;
                    if (dx * dx + dy * dy > radius * radius) return;
                    if (typeof target.takeDamage === 'function') {
                        target.takeDamage(5, this);
                    }
                    if (enemiesEntangled.has(target) && elapsed < entangleDuration) {
                        return;
                    }
                    if (typeof target.setSlowed === 'function') {
                        target.setSlowed(0.55, 0.6);
                    }
                });
            }

            if (elapsed >= duration) {
                clearInterval(interval);
                const fadeStart = performance.now();
                const fadeDurationMs = 500;
                const startFill = fieldFill.material.opacity;
                const startRing = fieldRing.material.opacity;
                const startKnot = 0.6;
                const startWeave = 0.55;
                const startCurl = 0.5;
                const fadeInterval = setInterval(() => {
                    const t = (performance.now() - fadeStart) / fadeDurationMs;
                    const fade = Math.max(0, 1 - t);
                    fieldFill.material.opacity = startFill * fade;
                    fieldRing.material.opacity = startRing * fade;
                    vineKnots.children.forEach((knot) => {
                        if (knot.material) {
                            knot.material.opacity = startKnot * fade;
                        }
                    });
                    vineWeave.children.forEach((strip) => {
                        if (strip.material) {
                            strip.material.opacity = startWeave * fade;
                        }
                    });
                    vineCurls.children.forEach((curl) => {
                        if (curl.material) {
                            curl.material.opacity = startCurl * fade;
                        }
                    });
                    if (fade <= 0.01) {
                        clearInterval(fadeInterval);
                        if (fieldGroup.parent) {
                            fieldGroup.parent.remove(fieldGroup);
                        }
                    }
                }, 16);
            }
        }, tickInterval * 1000);
    }

    /**
     * Fire an arrow
     */
    fireArrow(chargeRatio, teleportOnHit, piercing, ability, colorOverride = null) {
        const arrowGroup = new THREE.Group();

        const shaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.06, 0.06),
            new THREE.MeshBasicMaterial({ color: colorOverride || 0x8b5a2b })
        );
        shaft.position.set(0.3, 0, 0);
        arrowGroup.add(shaft);

        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.07, 0.16, 8),
            new THREE.MeshBasicMaterial({ color: colorOverride || 0xc0c0c0 })
        );
        tip.rotation.z = Math.PI / 2;
        tip.position.set(0.62, 0, 0);
        arrowGroup.add(tip);

        const fletch = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.12, 0.03),
            new THREE.MeshBasicMaterial({ color: colorOverride || 0x333333 })
        );
        fletch.position.set(-0.08, 0, 0);
        arrowGroup.add(fletch);

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };
        arrowGroup.scale.x = 1;
        arrowGroup.position.set(
            this.position.x + direction.x * 0.6,
            this.position.y + 0.1 + direction.y * 0.6,
            0.2
        );
        this.mesh.parent.add(arrowGroup);

        const baseSpeed = 14;
        const speed = baseSpeed + chargeRatio * 10;
        const startX = arrowGroup.position.x;
        const startY = arrowGroup.position.y;
        const hitEnemies = new Set();
        const level = this.level || { platforms: [] };

        const damageHits = 1 + Math.round(chargeRatio * 2);
        const chargeDamage = (() => {
            if (chargeRatio >= 0.95) return 50;
            if (chargeRatio >= 0.5) return 30;
            return 20;
        })();

        const velocity = {
            x: direction.x * speed,
            y: useAim ? direction.y * speed : 3.5 + chargeRatio * 2.2
        };
        const gravity = -14;
        let projectileOwner = this;
        let allowTeleport = teleportOnHit;
        let allowPiercing = piercing;
        const projectile = {
            type: 'arrow',
            mesh: arrowGroup,
            owner: projectileOwner,
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
                allowTeleport = false;
                allowPiercing = false;
            }
        };
        Hero.addProjectile(projectile);

        const cleanupProjectile = () => {
            Hero.removeProjectile(projectile);
        };

        const arrowInterval = setInterval(() => {
            arrowGroup.position.x += velocity.x * 0.016;
            velocity.y += gravity * 0.016;
            arrowGroup.position.y += velocity.y * 0.016;
            const targetRotation = Math.atan2(velocity.y, velocity.x);
            arrowGroup.rotation.z = targetRotation;

            const arrowBounds = {
                left: arrowGroup.position.x - 0.25,
                right: arrowGroup.position.x + 0.25,
                top: arrowGroup.position.y + 0.08,
                bottom: arrowGroup.position.y - 0.08
            };

            const owner = projectile.owner || projectileOwner;
            if (owner && typeof owner.isPositionBlockedByProtectionDome === 'function' &&
                owner.isPositionBlockedByProtectionDome(arrowGroup.position)) {
                clearInterval(arrowInterval);
                cleanupProjectile();
                this.mesh.parent.remove(arrowGroup);
                return;
            }

            for (const enemy of owner && typeof owner.getDamageTargets === 'function' ? owner.getDamageTargets() : []) {
                if (!enemy.isAlive) continue;
                if (hitEnemies.has(enemy)) continue;

                const enemyBounds = enemy.getBounds();
                if (checkAABBCollision(arrowBounds, enemyBounds)) {
                    if (ability === owner?.abilities?.q && typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(chargeDamage, owner);
                    } else if (typeof owner.applyAbilityDamage === 'function') {
                        owner.applyAbilityDamage(ability, enemy, damageHits);
                    } else if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(damageHits, owner);
                    }
                    if (enemy.type === 'player' && typeof owner.addUltimateCharge === 'function') {
                        owner.addUltimateCharge(owner.ultimateChargePerKill || 0);
                    }
                    hitEnemies.add(enemy);

                    if (!allowPiercing) {
                        if (allowTeleport && typeof owner.teleportToArrow === 'function') {
                            owner.teleportToArrow(arrowGroup.position.x, arrowGroup.position.y);
                        }
                        clearInterval(arrowInterval);
                        cleanupProjectile();
                        this.mesh.parent.remove(arrowGroup);
                        return;
                    }
                }
            }

            // Check collision with platforms
            let hitPlatform = false;
            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (checkAABBCollision(arrowBounds, platform.bounds)) {
                        hitPlatform = true;
                        break;
                    }
                }
            }

            if (hitPlatform) {
                if (allowTeleport && typeof owner.teleportToArrow === 'function') {
                    owner.teleportToArrow(arrowGroup.position.x, arrowGroup.position.y);
                }
                clearInterval(arrowInterval);
                cleanupProjectile();
                if (hitPlatform) {
                    // Stick arrow briefly into platform
                    const stickTime = 600;
                    const stuck = arrowGroup;
                    stuck.rotation.z = Math.atan2(velocity.y, velocity.x);
                    setTimeout(() => {
                        if (stuck.parent) {
                            stuck.parent.remove(stuck);
                        }
                    }, stickTime);
                }
            }
        }, 16);
    }

    /**
     * Fire a teleporting arrow immediately (E ability)
     */
    fireTeleportArrow() {
        const teleportColor = 0x111111;
        this.fireArrow(0.6, true, false, this.abilities.e, teleportColor);
    }

    /**
     * Teleport player to arrow impact location
     */
    teleportToArrow(x, y) {
        if (!this.isAlive) {
            return;
        }
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = 0;
        this.velocity.y = 0;
    }

    /**
     * Healing potion effect (HoT + slight speed boost)
     */
    activateHealingPotion() {
        this.healOverTimeRemaining = 3;
        this.speedBoostRemaining = 3;
        this.startPotionEffect();
    }

    /**
     * Update potion effects
     */
    updatePotionEffects(deltaTime) {
        if (this.healOverTimeRemaining > 0) {
            const healPerSecond = 8;
            this.heal(healPerSecond * deltaTime);
            this.healOverTimeRemaining -= deltaTime;
        }

        if (this.speedBoostRemaining > 0) {
            this.moveSpeedMultiplier = 1.2;
            this.speedBoostRemaining -= deltaTime;
        } else {
            this.moveSpeedMultiplier = 1;
        }

        if (this.potionEffect) {
            this.potionEffectTime += deltaTime;
            const pulse = 0.2 + Math.sin(this.potionEffectTime * 6) * 0.15;
            this.potionEffect.scale.set(1 + pulse, 1 + pulse, 1);
            this.potionEffect.material.opacity = 0.4 + pulse * 0.4;
            this.potionEffect.position.set(this.position.x, this.position.y - 0.1, 0.2);

            if (this.healOverTimeRemaining <= 0) {
                this.mesh.parent.remove(this.potionEffect);
                this.potionEffect = null;
            }
        }
    }

    /**
     * Create a healing potion visual effect
     */
    startPotionEffect() {
        if (this.potionEffect) {
            this.potionEffectTime = 0;
            return;
        }
        const ringGeometry = new THREE.RingGeometry(0.5, 0.65, 24);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x55ff88,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        this.potionEffect = new THREE.Mesh(ringGeometry, ringMaterial);
        this.potionEffect.position.set(this.position.x, this.position.y - 0.1, 0.2);
        this.potionEffectTime = 0;
        this.mesh.parent.add(this.potionEffect);
    }

    /**
     * Activate Arrow Storm ultimate
     */
    activateArrowStorm(chargeRatioOverride = null) {
        if (this.arrowStormActive) {
            return false;
        }
        this.arrowStormActive = true;
        const stormDurationMs = 3000;
        const chargeRatio = Number.isFinite(chargeRatioOverride)
            ? chargeRatioOverride
            : (Number.isFinite(this.pendingUltimateChargeRatio) ? this.pendingUltimateChargeRatio : 0);
        this.fireUltimateArrow((impactPoint) => {
            this.startArrowStorm(impactPoint, stormDurationMs);
        }, stormDurationMs, chargeRatio);
        return true;
    }

    fireUltimateArrow(onImpact, stormDurationMs = 3000, chargeRatio = 0) {
        const arrowGroup = new THREE.Group();

        const shaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xffd166 })
        );
        shaft.position.set(0.35, 0, 0);
        arrowGroup.add(shaft);

        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.22, 10),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        tip.rotation.z = Math.PI / 2;
        tip.position.set(0.7, 0, 0);
        arrowGroup.add(tip);

        const glow = new THREE.Mesh(
            new THREE.RingGeometry(0.12, 0.28, 20),
            new THREE.MeshBasicMaterial({
                color: 0xfff1b3,
                transparent: true,
                opacity: 0.65,
                side: THREE.DoubleSide
            })
        );
        glow.position.set(0.35, 0, 0.02);
        arrowGroup.add(glow);

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput && Math.hypot(aim.x, aim.y) > 0.1;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };
        const dirLength = Math.hypot(direction.x, direction.y) || 1;
        const dirX = direction.x / dirLength;
        const dirY = direction.y / dirLength;

        arrowGroup.position.set(
            this.position.x + dirX * 0.7,
            this.position.y + 0.15 + dirY * 0.6,
            0.3
        );
        arrowGroup.rotation.z = Math.atan2(dirY, dirX);
        this.mesh.parent.add(arrowGroup);

        const clampedCharge = Math.max(0, Math.min(1, chargeRatio));
        const speed = 14 + 1 * 10;
        const maxRange = 14 + clampedCharge * 8;
        let traveled = 0;

        const level = this.level || { platforms: [] };
        const projectile = {
            type: 'arrow',
            mesh: arrowGroup,
            owner: this,
            velocity: { x: dirX * speed, y: dirY * speed },
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
            }
        };
        Hero.addProjectile(projectile);
        const cleanupProjectile = () => {
            Hero.removeProjectile(projectile);
        };
        const arrowInterval = setInterval(() => {
            const prevX = arrowGroup.position.x;
            const prevY = arrowGroup.position.y;
            const velocity = projectile.velocity || {
                x: dirX * speed,
                y: useAim ? dirY * speed : 3.5 + 1 * 2.2
            };
            velocity.y += -14 * 0.016;
            arrowGroup.position.x += velocity.x * 0.016;
            arrowGroup.position.y += velocity.y * 0.016;
            projectile.velocity = velocity;
            arrowGroup.rotation.z = Math.atan2(velocity.y, velocity.x);
            traveled += Math.hypot(arrowGroup.position.x - prevX, arrowGroup.position.y - prevY);

            const arrowBounds = {
                left: arrowGroup.position.x - 0.28,
                right: arrowGroup.position.x + 0.28,
                top: arrowGroup.position.y + 0.12,
                bottom: arrowGroup.position.y - 0.12
            };

            if (this.isPositionBlockedByProtectionDome &&
                this.isPositionBlockedByProtectionDome(arrowGroup.position)) {
                clearInterval(arrowInterval);
                cleanupProjectile();
                this.mesh.parent.remove(arrowGroup);
                if (typeof onImpact === 'function') {
                    onImpact({ x: arrowGroup.position.x, y: arrowGroup.position.y });
                }
                return;
            }

            for (const target of this.getDamageTargets()) {
                if (!target || !target.isAlive) continue;
                if (!checkAABBCollision(arrowBounds, target.getBounds())) continue;
                this.applyArrowStormHit(target);
                clearInterval(arrowInterval);
                cleanupProjectile();
                this.mesh.parent.remove(arrowGroup);
                if (typeof onImpact === 'function') {
                    onImpact({ x: arrowGroup.position.x, y: arrowGroup.position.y });
                }
                return;
            }

            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(arrowBounds, platform.bounds)) {
                        clearInterval(arrowInterval);
                        cleanupProjectile();
                        this.fadeArrowAfterStorm(arrowGroup, stormDurationMs);
                        if (typeof onImpact === 'function') {
                            onImpact({ x: arrowGroup.position.x, y: arrowGroup.position.y });
                        }
                        return;
                    }
                }
            }

            if (traveled >= maxRange) {
                clearInterval(arrowInterval);
                cleanupProjectile();
                this.mesh.parent.remove(arrowGroup);
                if (typeof onImpact === 'function') {
                    onImpact({ x: arrowGroup.position.x, y: arrowGroup.position.y });
                }
            }
        }, 16);
    }

    startArrowStorm(impactPoint, durationMs = 3000) {
        const center = impactPoint || { x: this.position.x, y: this.position.y };
        const radius = 7;
        const spawnIntervalMs = 120;
        const arrowsPerBurst = 2;
        const spawnTopY = this.getArrowStormTopY(center);
        const targetY = center.y - 10;
        const startTime = performance.now();

        if (this.arrowStormInterval) {
            clearInterval(this.arrowStormInterval);
        }

        this.arrowStormInterval = setInterval(() => {
            if (performance.now() - startTime >= durationMs) {
                clearInterval(this.arrowStormInterval);
                this.arrowStormInterval = null;
                this.arrowStormActive = false;
                return;
            }

            for (let i = 0; i < arrowsPerBurst; i += 1) {
                const offset = (Math.random() * 2 - 1) * radius;
                const x = center.x + offset;
                this.spawnArrowStormArrow({ x, startY: spawnTopY, targetY });
            }
        }, spawnIntervalMs);
    }

    getArrowStormTopY(center) {
        const level = this.level;
        const boundsTop = level?.cameraConfig?.bounds?.top;
        if (Number.isFinite(boundsTop)) {
            return boundsTop + 6;
        }
        let maxTop = null;
        if (level && Array.isArray(level.platforms)) {
            level.platforms.forEach((platform) => {
                if (!platform || !platform.bounds) return;
                if (!Number.isFinite(platform.bounds.top)) return;
                maxTop = maxTop === null ? platform.bounds.top : Math.max(maxTop, platform.bounds.top);
            });
        }
        if (Number.isFinite(maxTop)) {
            return maxTop + 6;
        }
        return (center?.y ?? this.position.y) + 18;
    }

    spawnArrowStormArrow({ x, startY, targetY }) {
        const arrowGroup = new THREE.Group();

        const shaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.06, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xffe08a })
        );
        shaft.position.set(0, -0.2, 0);
        arrowGroup.add(shaft);

        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.07, 0.18, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        tip.rotation.z = -Math.PI / 2;
        tip.position.set(0, -0.42, 0);
        arrowGroup.add(tip);

        const glow = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 16),
            new THREE.MeshBasicMaterial({
                color: 0xfff1b3,
                transparent: true,
                opacity: 0.4
            })
        );
        glow.position.set(0, -0.1, -0.01);
        arrowGroup.add(glow);

        arrowGroup.position.set(x, startY, 0.25);
        arrowGroup.rotation.z = -Math.PI / 2;
        this.mesh.parent.add(arrowGroup);

        const fallSpeed = 30;
        const arrowInterval = setInterval(() => {
            arrowGroup.position.y -= fallSpeed * 0.016;

            const arrowBounds = {
                left: arrowGroup.position.x - 0.25,
                right: arrowGroup.position.x + 0.25,
                top: arrowGroup.position.y + 0.2,
                bottom: arrowGroup.position.y - 0.4
            };

            if (this.isPositionBlockedByProtectionDome &&
                this.isPositionBlockedByProtectionDome(arrowGroup.position)) {
                clearInterval(arrowInterval);
                this.mesh.parent.remove(arrowGroup);
                return;
            }

            for (const target of this.getDamageTargets()) {
                if (!target || !target.isAlive) continue;
                if (!checkAABBCollision(arrowBounds, target.getBounds())) continue;
                this.applyArrowStormHit(target);
                clearInterval(arrowInterval);
                this.mesh.parent.remove(arrowGroup);
                return;
            }

            if (arrowGroup.position.y <= targetY) {
                clearInterval(arrowInterval);
                this.mesh.parent.remove(arrowGroup);
            }
        }, 16);
    }

    applyArrowStormHit(target) {
        const damage = 25;
        if (typeof target.takeDamage === 'function') {
            target.takeDamage(damage, this);
        }
        if (typeof target.setSlowed === 'function') {
            target.setSlowed(1.5, 0.6);
        }
    }

    fadeArrowAfterStorm(arrowGroup, durationMs) {
        if (!arrowGroup) return;
        const fadeDurationMs = 350;
        const startDelay = Math.max(0, durationMs - fadeDurationMs);
        setTimeout(() => {
            const startTime = performance.now();
            arrowGroup.children.forEach((child) => {
                if (child.material) {
                    child.material.transparent = true;
                }
            });
            const fadeInterval = setInterval(() => {
                const t = (performance.now() - startTime) / fadeDurationMs;
                const alpha = Math.max(0, 1 - t);
                arrowGroup.children.forEach((child) => {
                    if (child.material) {
                        child.material.opacity = alpha;
                    }
                });
                if (t >= 1) {
                    clearInterval(fadeInterval);
                    if (arrowGroup.parent) {
                        arrowGroup.parent.remove(arrowGroup);
                    }
                }
            }, 16);
        }, startDelay);
    }
}
