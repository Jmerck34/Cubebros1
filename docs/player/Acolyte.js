import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Acolyte Hero - White robed mystic with a wooden staff.
 * @class Acolyte
 */
export class Acolyte extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        this.setBodyColor(0xf5f5f5);
        this.createEquipment();

        this.enemies = [];
        this.facingDirection = 1;
        this.aimIndicator = null;
        this.reticlePosition = null;
        this.reticleLayer = 1;
        this.allowLeftStickAimFallback = false;
        this.useCursorAim = true;
        this.cursorSpeed = 820;
        this.divineBeamChargeMax = 16;
        this.divineBeamCharge = 16;
        this.divineBeamIdleTimer = 0;
        this.divineBeamRechargeTimer = 0;
        this.divineBeamTickTimer = 0;
        this.divineBeamTickInterval = 0.25;
        this.divineBeamRechargeDelay = 3;
        this.divineBeamRechargeInterval = 0.5;
        this.divineBeamActive = false;
        this.divineBeamGroup = null;
        this.divineBeamPosition = null;
        this.divineBeamFollowSpeed = 6;
        this.divineBeamImpactTime = 0;
        this.divineBeamImpactGroup = null;
        this.divineBeamImpactCore = null;
        this.divineBeamImpactPlume = null;
        this.divineBeamImpactLeft = null;
        this.divineBeamImpactRight = null;
        this.divineBeamImpactWedgeLeft = null;
        this.divineBeamImpactWedgeRight = null;
        this.divineBeamCoreFade = null;
        this.divineBeamGlowFade = null;
        this.staffBaseRotation = -0.12;
        this.staffSwingTimer = 0;
        this.staffSwingDuration = 0.3;
        this.staffSwingFireDelay = 0.08;
        this.staffChargeRotation = -0.32;
        this.staffSwingStartRotation = this.staffBaseRotation;
        this.lightBoltChargeGroup = null;
        this.lightBoltChargeCore = null;
        this.lightBoltChargeGlow = null;
        this.lightBoltChargeSpin = 0;
        this.divineBeamParticles = [];
        this.divineBeamParticleTimer = 0;
        this.divineBeamParticleInterval = 0.06;
        this.divineBeamParticleLaneIndex = 0;
        this.divineBeamParticleLaneCount = 8;
        this.lightBoltAmmoMax = 5;
        this.lightBoltAmmo = 5;
        this.lightBoltMaxCharged = 3;
        this.lightBoltFireRate = 0.4;
        this.lightBoltChargeTimer = 0;
        this.lightBoltLoadedShots = 0;
        this.lightBoltCharging = false;
        this.lightBoltFireCooldown = 0;
        this.lightBoltRechargeDelay = 2;
        this.lightBoltRechargeTimer = 0;
        this.lightBoltSpeed = 10;
        this.lightBoltRange = 20;
        this.lightBoltHomingRange = 10;
        this.lightBoltHomingStrength = 0.08;
        this.divineBeamTickCounts = new Map();
        this.divineBeamWasOnCooldown = false;
        this.wallOfLightActive = null;
        this.wallOfLightHolding = false;
        this.wallOfLightOrientation = 'horizontal';
        this.wallOfLightToggleHeld = false;
        this.wallOfLightPreview = null;
        this.wallOfLightDuration = 5;
        this.wallOfLightCooldown = 1.5;
        this.wallOfLightLength = 6;
        this.wallOfLightThickness = 0.5;
        this.wallOfLightOutlineThickness = 0.12;
        this.lightNovaActive = false;
        this.lightNovaRiseTimer = 0;
        this.lightNovaStunTimer = 0;
        this.lightNovaTickTimer = 0;
        this.lightNovaRiseDuration = 1;
        this.lightNovaStunDuration = 1.2;
        this.lightNovaRiseSpeed = 5;
        this.lightNovaHoldDuration = 0.5;
        this.lightNovaHoldTimer = 0;
        this.lightNovaDescendSpeed = 3;
        this.lightNovaDescending = false;
        this.lightNovaReleaseTimer = 0;
        this.lightNovaReleaseDuration = 0.5;
        this.lightNovaElapsed = 0;
        this.featherActive = false;
        this.lightNovaStunRadius = 8;
        this.lightNovaBeamWidth = 5;
        this.lightNovaStunTriggered = false;
        this.lightNovaBeamPosition = null;

        this.initializeAbilities();
        this.createAimIndicator();
        this.createDivineBeamVisual();
        this.createLightBoltChargeVfx();
        this.createWallOfLightPreview();
    }

    createEquipment() {
        this.addRobe();
        this.addHood();
        this.addStaff();
    }

    addRobe() {
        const robeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const trimMaterial = new THREE.MeshBasicMaterial({ color: 0xe5e5e5 });

        const robeFront = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), robeMaterial);
        robeFront.position.set(0, -0.15, 0.05);
        this.mesh.add(robeFront);

        const robeBack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), robeMaterial);
        robeBack.position.set(0, -0.15, -0.05);
        this.mesh.add(robeBack);

        const hem = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.62), trimMaterial);
        hem.position.set(0, -0.5, 0);
        this.mesh.add(hem);
    }

    addHood() {
        const hoodMaterial = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
        const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0xd9d9d9 });

        const hoodShell = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.7), hoodMaterial);
        hoodShell.position.set(0, 0.42, 0);
        this.mesh.add(hoodShell);

        const hoodShadow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.58), shadowMaterial);
        hoodShadow.position.set(0, 0.32, 0.12);
        this.mesh.add(hoodShadow);
    }

    addStaff() {
        this.staffGroup = new THREE.Group();

        const shaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 1.6, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x6b4a2b })
        );
        shaft.position.set(0, 0.35, 0);
        this.staffGroup.add(shaft);

        const tip = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.18, 0.14),
            new THREE.MeshBasicMaterial({ color: 0x8a6a3d })
        );
        tip.position.set(0, 1.2, 0);
        this.staffTip = tip;
        this.staffGroup.add(tip);

        this.staffGroup.position.set(0.55, -0.4, 0.1);
        this.staffGroup.rotation.z = this.staffBaseRotation;
        this.mesh.add(this.staffGroup);
    }

    createLightBoltChargeVfx() {
        if (!this.staffGroup) return;
        const group = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 10, 10),
            new THREE.MeshBasicMaterial({
                color: 0xfff1c9,
                transparent: true,
                opacity: 0,
                depthTest: false,
                depthWrite: false
            })
        );
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 10, 10),
            new THREE.MeshBasicMaterial({
                color: 0xffd485,
                transparent: true,
                opacity: 0,
                depthTest: false,
                depthWrite: false
            })
        );
        group.add(glow);
        group.add(core);
        group.renderOrder = 12;
        group.visible = false;
        group.position.set(0, 1.2, 0.05);
        this.staffGroup.add(group);
        this.lightBoltChargeGroup = group;
        this.lightBoltChargeCore = core;
        this.lightBoltChargeGlow = glow;
    }

    createWallOfLightPreview() {
        const outline = this.buildWallOutline(0.85, false);
        outline.group.visible = false;
        outline.group.renderOrder = 12;
        this.scene.add(outline.group);
        this.wallOfLightPreview = outline;
    }

    buildWallOutline(opacity, depthTest) {
        const group = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({
            color: 0xffd98a,
            transparent: true,
            opacity,
            depthTest,
            depthWrite: false
        });
        const barGeometry = new THREE.BoxGeometry(1, 1, 0.1);
        const top = new THREE.Mesh(barGeometry, material.clone());
        const bottom = new THREE.Mesh(barGeometry, material.clone());
        const left = new THREE.Mesh(barGeometry, material.clone());
        const right = new THREE.Mesh(barGeometry, material.clone());
        group.add(top, bottom, left, right);
        return { group, segments: { top, bottom, left, right } };
    }

    updateWallOutline(segments, width, height, thickness) {
        if (!segments) return;
        const halfW = width / 2;
        const halfH = height / 2;
        const t = thickness;
        segments.top.scale.set(width, t, 1);
        segments.bottom.scale.set(width, t, 1);
        segments.left.scale.set(t, height, 1);
        segments.right.scale.set(t, height, 1);
        segments.top.position.set(0, halfH - t / 2, 0);
        segments.bottom.position.set(0, -halfH + t / 2, 0);
        segments.left.position.set(-halfW + t / 2, 0, 0);
        segments.right.position.set(halfW - t / 2, 0, 0);
    }

    initializeAbilities() {
        const ability1 = new Ability('Divine Beam', 6);
        ability1.use = (hero) => Ability.prototype.use.call(ability1, hero);

        const ability2 = new Ability('Light Bolt', 3, false, 10);
        ability2.use = (hero) => Ability.prototype.use.call(ability2, hero);

        const ability3 = new Ability('Wall of Light', 3);
        ability3.use = (hero) => Ability.prototype.use.call(ability3, hero);

        const ultimate = new Ability('Light Nova', 0, true);
        ultimate.use = (hero) => {
            if (hero.lightNovaActive) return false;
            hero.startLightNova();
            return true;
        };

        this.setAbilities(ability1, ability2, ability3, ultimate);
    }

    update(deltaTime, input) {
        this.updateReticlePosition();
        this.updateDivineBeamPosition(deltaTime);
        this.updateDivineBeam(deltaTime, input);

        const reticleDir = this.getReticleDirection();
        if (reticleDir && Math.abs(reticleDir.x) > 0.15) {
            this.setFacingDirection(reticleDir.x >= 0 ? 1 : -1);
        } else if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        this.updateStaffSwing(deltaTime);
        this.updateLightNova(deltaTime);
        super.update(deltaTime, input);
        this.updateLightBolt(deltaTime, input);
        this.updateWallOfLight(deltaTime, input);

        const idleAim = this.getReticleDirection();
        this.updateAimIndicator(this.reticlePosition, idleAim, false);
    }

    handleAbilityInput(input) {
        if (this.controlsLocked) {
            return;
        }
        if (this.isCarryingFlag && input.isFlagDropPressed()) {
            return;
        }
        if (input.isAbility1Pressed() && this.abilities.q) {
            this.startDivineBeam();
        } else if (this.divineBeamActive && !input.isAbility1Pressed()) {
            this.stopDivineBeam();
        }
        // Ability 2 handled by charge/hold logic.
        // Ability 3 handled by hold/preview logic.
        if (input.isUltimatePressed() && this.abilities.r) {
            this.useUltimate();
        }
    }

    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction;
        }
    }

    updateStaffSwing(deltaTime) {
        if (!this.staffGroup) return;
        if (this.staffSwingTimer > 0) {
            this.staffSwingTimer = Math.max(0, this.staffSwingTimer - deltaTime);
            const t = 1 - (this.staffSwingTimer / this.staffSwingDuration);
            const eased = Math.sin(Math.min(1, t) * Math.PI);
            const swingSign = this.facingDirection || 1;
            const swingStart = Number.isFinite(this.staffSwingStartRotation)
                ? this.staffSwingStartRotation
                : this.staffBaseRotation - 0.35 * swingSign;
            const swingEnd = this.staffBaseRotation + 0.35 * swingSign;
            this.staffGroup.rotation.z = swingStart + (swingEnd - swingStart) * eased;
        } else {
            this.staffGroup.rotation.z = this.staffBaseRotation;
        }
    }

    updateLightBolt(deltaTime, input) {
        const ability = this.abilities.w;
        if (!ability) return;

        if (ability.isReady && this.lightBoltAmmo === 0) {
            this.lightBoltAmmo = this.lightBoltAmmoMax;
        }

        this.lightBoltFireCooldown = Math.max(0, this.lightBoltFireCooldown - deltaTime);
        const pressed = input.isAbility2Pressed();

        if (!pressed && !this.lightBoltCharging && ability.isReady && this.lightBoltAmmo < this.lightBoltAmmoMax) {
            this.lightBoltRechargeTimer += deltaTime;
            if (this.lightBoltRechargeTimer >= this.lightBoltRechargeDelay) {
                this.lightBoltRechargeTimer = 0;
                this.lightBoltAmmo = Math.min(this.lightBoltAmmoMax, this.lightBoltAmmo + 1);
            }
        } else {
            this.lightBoltRechargeTimer = 0;
        }

        if (!ability.isReady || this.lightBoltAmmo <= 0) {
            this.lightBoltCharging = false;
            this.lightBoltLoadedShots = 0;
            this.lightBoltChargeTimer = 0;
            this.updateLightBoltChargeVfx(0, false);
            return;
        }

        if (pressed && !this.lightBoltCharging && this.lightBoltFireCooldown <= 0) {
            this.lightBoltCharging = true;
            this.lightBoltLoadedShots = 1;
            this.lightBoltChargeTimer = 0;
            this.staffSwingStartRotation = this.staffChargeRotation;
        }

        if (this.lightBoltCharging) {
            if (pressed) {
                this.lightBoltChargeTimer += deltaTime;
                const maxLoaded = Math.min(this.lightBoltAmmo, this.lightBoltMaxCharged);
                while (this.lightBoltChargeTimer >= this.lightBoltFireRate &&
                    this.lightBoltLoadedShots < maxLoaded) {
                    this.lightBoltChargeTimer -= this.lightBoltFireRate;
                    this.lightBoltLoadedShots += 1;
                }
                const ratio = maxLoaded > 0 ? this.lightBoltLoadedShots / maxLoaded : 0;
                this.updateLightBoltChargeVfx(ratio, true);
            } else {
                this.updateLightBoltChargeVfx(0, false);
                this.fireLightBoltBurst(ability);
                this.lightBoltCharging = false;
                this.lightBoltLoadedShots = 0;
                this.lightBoltChargeTimer = 0;
                this.lightBoltFireCooldown = this.lightBoltFireRate;
                this.staffSwingStartRotation = this.staffBaseRotation;
            }
        } else {
            this.updateLightBoltChargeVfx(0, false);
        }
    }

    updateWallOfLight(deltaTime, input) {
        const ability = this.abilities.e;
        if (!ability) return;

        const pressed = input.isAbility3Pressed();
        const togglePressed = input.isFlagDropPressed();
        const canPlace = ability.isReady && !this.wallOfLightActive;

        if (pressed && canPlace) {
            if (!this.wallOfLightHolding) {
                this.wallOfLightHolding = true;
            }
            if (togglePressed && !this.wallOfLightToggleHeld) {
                this.wallOfLightOrientation = this.wallOfLightOrientation === 'horizontal'
                    ? 'vertical'
                    : 'horizontal';
            }
            this.wallOfLightToggleHeld = togglePressed;
            this.updateWallOfLightPreview();
            return;
        }

        this.wallOfLightToggleHeld = togglePressed;

        if (!pressed && this.wallOfLightHolding) {
            this.wallOfLightHolding = false;
            this.hideWallOfLightPreview();
            if (canPlace) {
                this.placeWallOfLight();
            }
            return;
        }

        if (!pressed) {
            this.hideWallOfLightPreview();
        }
    }

    updateWallOfLightPreview() {
        if (!this.wallOfLightPreview || !this.reticlePosition) return;
        const { group, segments } = this.wallOfLightPreview;
        const horizontal = this.wallOfLightOrientation === 'horizontal';
        const width = horizontal ? this.wallOfLightLength : this.wallOfLightThickness;
        const height = horizontal ? this.wallOfLightThickness : this.wallOfLightLength;
        this.updateWallOutline(segments, width, height, this.wallOfLightOutlineThickness);
        group.position.set(this.reticlePosition.x, this.reticlePosition.y, 0.35);
        group.visible = true;
    }

    hideWallOfLightPreview() {
        if (this.wallOfLightPreview) {
            this.wallOfLightPreview.group.visible = false;
        }
    }

    placeWallOfLight() {
        if (!this.reticlePosition || !this.level) return;
        const horizontal = this.wallOfLightOrientation === 'horizontal';
        const width = horizontal ? this.wallOfLightLength : this.wallOfLightThickness;
        const height = horizontal ? this.wallOfLightThickness : this.wallOfLightLength;
        const centerX = this.reticlePosition.x;
        const centerY = this.reticlePosition.y;
        const bounds = {
            left: centerX - width / 2,
            right: centerX + width / 2,
            top: centerY + height / 2,
            bottom: centerY - height / 2
        };

        const outline = this.buildWallOutline(0.9, true);
        const wallGroup = outline.group;
        this.updateWallOutline(outline.segments, width, height, this.wallOfLightOutlineThickness);
        wallGroup.position.set(centerX, centerY, 0.25);
        wallGroup.renderOrder = 10;

        const parent = this.level.group || this.scene;
        if (parent) {
            parent.add(wallGroup);
        }

        const platform = {
            mesh: wallGroup,
            bounds: { ...bounds },
            type: 'wall',
            isWallOfLight: true
        };
        if (!Array.isArray(this.level.platforms)) {
            this.level.platforms = [];
        }
        this.level.platforms.push(platform);

        const ability = this.abilities.e;
        if (ability) {
            ability.isReady = false;
            ability.currentCooldown = 0;
        }

        const timeoutId = setTimeout(() => {
            this.removeWallOfLight(platform);
            if (ability) {
                ability.currentCooldown = this.wallOfLightCooldown;
                ability.isReady = false;
            }
        }, this.wallOfLightDuration * 1000);

        this.wallOfLightActive = { platform, mesh: wallGroup, timeoutId };
    }

    removeWallOfLight(platform) {
        if (!platform || !this.level) return;
        if (platform.mesh && platform.mesh.parent) {
            platform.mesh.parent.remove(platform.mesh);
        }
        if (Array.isArray(this.level.platforms)) {
            const index = this.level.platforms.indexOf(platform);
            if (index >= 0) {
                this.level.platforms.splice(index, 1);
            }
        }
        if (this.wallOfLightActive && this.wallOfLightActive.platform === platform) {
            if (this.wallOfLightActive.timeoutId) {
                clearTimeout(this.wallOfLightActive.timeoutId);
            }
            this.wallOfLightActive = null;
        }
    }

    updateLightBoltChargeVfx(ratio, isCharging) {
        if (!this.staffGroup) return;
        if (isCharging) {
            this.staffGroup.rotation.z = this.staffChargeRotation;
        }
        if (!this.lightBoltChargeGroup) return;
        if (!isCharging) {
            this.lightBoltChargeGroup.visible = false;
            if (this.lightBoltChargeCore) this.lightBoltChargeCore.material.opacity = 0;
            if (this.lightBoltChargeGlow) this.lightBoltChargeGlow.material.opacity = 0;
            return;
        }
        const clamped = Math.max(0, Math.min(1, ratio));
        this.lightBoltChargeGroup.visible = true;
        this.lightBoltChargeSpin += 0.08 + clamped * 0.04;
        this.lightBoltChargeGroup.rotation.z = this.lightBoltChargeSpin;
        if (this.lightBoltChargeCore) {
            this.lightBoltChargeCore.material.opacity = 0.25 + clamped * 0.5;
            const scale = 1 + clamped * 0.3;
            this.lightBoltChargeCore.scale.set(scale, scale, scale);
        }
        if (this.lightBoltChargeGlow) {
            this.lightBoltChargeGlow.material.opacity = 0.15 + clamped * 0.35;
            const scale = 1 + clamped * 0.5;
            this.lightBoltChargeGlow.scale.set(scale, scale, scale);
        }
    }

    fireLightBoltBurst(ability) {
        if (!ability || this.lightBoltLoadedShots <= 0 || this.lightBoltAmmo <= 0) return;

        const shots = Math.min(this.lightBoltLoadedShots, this.lightBoltAmmo);
        const direction = this.getReticleDirection() || { x: this.facingDirection, y: 0 };
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spread = (20 * Math.PI) / 180;
        const startAngle = shots > 1 ? baseAngle - spread : baseAngle;
        const step = shots > 1 ? (spread * 2) / (shots - 1) : 0;

        this.staffSwingTimer = this.staffSwingDuration;
        this.lightBoltRechargeTimer = 0;
        for (let i = 0; i < shots; i += 1) {
            const angle = startAngle + step * i;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };
            setTimeout(() => {
                this.spawnLightBoltProjectile(dir, ability);
            }, this.staffSwingFireDelay * 1000);
        }

        this.lightBoltAmmo -= shots;
        if (this.lightBoltAmmo <= 0) {
            ability.currentCooldown = ability.cooldown;
            ability.isReady = false;
        }
    }

    spawnLightBoltProjectile(direction, ability) {
        if (!this.mesh || !this.mesh.parent) return;
        const length = Math.hypot(direction.x, direction.y) || 1;
        const dirX = direction.x / length;
        const dirY = direction.y / length;

        const boltGroup = new THREE.Group();
        const visualGroup = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xfff1c9 })
        );
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 10, 10),
            new THREE.MeshBasicMaterial({
                color: 0xffd485,
                transparent: true,
                opacity: 0.5,
                depthTest: false,
                depthWrite: false
            })
        );
        const tailGroup = new THREE.Group();
        const tailSegments = [];
        const tailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffb85a,
            transparent: true,
            opacity: 0.55,
            depthTest: false,
            depthWrite: false
        });
        const segmentCount = 4;
        for (let i = 0; i < segmentCount; i += 1) {
            const width = 0.22 - i * 0.04;
            const length = 0.28 - i * 0.03;
            const segment = new THREE.Mesh(new THREE.PlaneGeometry(length, width), tailMaterial.clone());
            segment.position.set(-0.2 - i * 0.22, 0, 0);
            tailGroup.add(segment);
            tailSegments.push(segment);
        }
        visualGroup.add(tailGroup);
        visualGroup.add(glow);
        visualGroup.add(core);
        boltGroup.add(visualGroup);
        let originX = this.position.x + dirX * 0.7;
        let originY = this.position.y + dirY * 0.6;
        if (this.staffTip && this.staffTip.getWorldPosition) {
            const staffWorld = this.staffTip.getWorldPosition(new THREE.Vector3());
            originX = staffWorld.x;
            originY = staffWorld.y;
        }
        boltGroup.position.set(originX, originY, 0.25);
        boltGroup.rotation.z = Math.atan2(dirY, dirX);
        this.mesh.parent.add(boltGroup);

        const projectile = {
            type: 'lightBolt',
            mesh: boltGroup,
            owner: this,
            velocity: { x: dirX * this.lightBoltSpeed, y: dirY * this.lightBoltSpeed },
            lastDeflectTime: 0,
            wobblePhase: Math.random() * Math.PI * 2,
            wobbleSpeed: 4 + Math.random() * 2,
            wobbleAmplitude: 0.06 + Math.random() * 0.06,
            tailSegments,
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

        const boltSize = { x: 0.26, y: 0.12 };
        const level = this.level || { platforms: [] };
        let traveled = 0;
        const trailParticles = [];
        const interval = setInterval(() => {
            const owner = projectile.owner || this;
            const prevX = boltGroup.position.x;
            const prevY = boltGroup.position.y;

            const target = owner && typeof owner.getNearestLightBoltTarget === 'function'
                ? owner.getNearestLightBoltTarget(boltGroup.position)
                : null;
            if (target) {
                const dx = target.position.x - boltGroup.position.x;
                const dy = target.position.y - boltGroup.position.y;
                const dist = Math.hypot(dx, dy) || 1;
                const desiredX = dx / dist;
                const desiredY = dy / dist;
                const blend = this.lightBoltHomingStrength;
                const velX = projectile.velocity.x / this.lightBoltSpeed;
                const velY = projectile.velocity.y / this.lightBoltSpeed;
                const mixX = velX * (1 - blend) + desiredX * blend;
                const mixY = velY * (1 - blend) + desiredY * blend;
                const mixLen = Math.hypot(mixX, mixY) || 1;
                projectile.velocity.x = (mixX / mixLen) * this.lightBoltSpeed;
                projectile.velocity.y = (mixY / mixLen) * this.lightBoltSpeed;
            }

            boltGroup.position.x += projectile.velocity.x * 0.016;
            boltGroup.position.y += projectile.velocity.y * 0.016;
            boltGroup.rotation.z = Math.atan2(projectile.velocity.y, projectile.velocity.x);
            traveled += Math.hypot(boltGroup.position.x - prevX, boltGroup.position.y - prevY);

            const velLen = Math.hypot(projectile.velocity.x, projectile.velocity.y);
            if (velLen > 0.001) {
                const perpX = -projectile.velocity.y / velLen;
                const perpY = projectile.velocity.x / velLen;
                projectile.wobblePhase += projectile.wobbleSpeed * 0.016;
                const wobble = Math.sin(projectile.wobblePhase) * projectile.wobbleAmplitude;
                visualGroup.position.set(perpX * wobble, perpY * wobble, 0);
                if (projectile.tailSegments && projectile.tailSegments.length) {
                    const curl = -Math.sin(projectile.wobblePhase) * 0.18;
                    projectile.tailSegments.forEach((segment, index) => {
                        const factor = (index + 1) / projectile.tailSegments.length;
                        segment.rotation.z = curl * factor * 1.6;
                        segment.position.y = curl * factor * 0.18;
                    });
                }
            } else {
                visualGroup.position.set(0, 0, 0);
            }

            if (this.mesh && this.mesh.parent) {
                const particleGeometry = new THREE.CircleGeometry(0.06 + Math.random() * 0.06, 6);
                const particleMaterial = new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.5 ? 0xffd98a : 0xffb85a,
                    transparent: true,
                    opacity: 0.65,
                    depthTest: false,
                    depthWrite: false
                });
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                particle.position.set(
                    boltGroup.position.x + (Math.random() - 0.5) * 0.12,
                    boltGroup.position.y + (Math.random() - 0.5) * 0.12,
                    0.22
                );
                particle.renderOrder = 12;
                this.mesh.parent.add(particle);
                trailParticles.push({ mesh: particle, life: 0, opacity: particleMaterial.opacity });
            }

            for (let i = trailParticles.length - 1; i >= 0; i -= 1) {
                const particle = trailParticles[i];
                particle.life += 0.016;
                particle.opacity -= 0.12;
                particle.mesh.material.opacity = Math.max(0, particle.opacity);
                particle.mesh.scale.set(
                    Math.max(0.2, 1 - particle.life * 2),
                    Math.max(0.2, 1 - particle.life * 2),
                    1
                );
                if (particle.opacity <= 0 || particle.life > 0.4) {
                    if (particle.mesh.parent) {
                        particle.mesh.parent.remove(particle.mesh);
                    }
                    trailParticles.splice(i, 1);
                }
            }

            const bounds = {
                left: boltGroup.position.x - boltSize.x * 0.6,
                right: boltGroup.position.x + boltSize.x * 0.6,
                top: boltGroup.position.y + boltSize.y * 0.6,
                bottom: boltGroup.position.y - boltSize.y * 0.6
            };

            if (owner && typeof owner.isPositionBlockedByProtectionDome === 'function' &&
                owner.isPositionBlockedByProtectionDome(boltGroup.position)) {
                clearInterval(interval);
                Hero.removeProjectile(projectile);
                if (boltGroup.parent) boltGroup.parent.remove(boltGroup);
                trailParticles.forEach((particle) => {
                    if (particle.mesh.parent) {
                        particle.mesh.parent.remove(particle.mesh);
                    }
                });
                return;
            }

            for (const target of owner && typeof owner.getDamageTargets === 'function' ? owner.getDamageTargets() : []) {
                if (!target || !target.isAlive) continue;
                if (target.type === 'player' && owner.isSameTeam && owner.isSameTeam(target)) continue;
                if (checkAABBCollision(bounds, target.getBounds())) {
                    if (typeof target.takeDamage === 'function') {
                        const damage = ability ? ability.getAdjustedDamage() : 10;
                        target.takeDamage(damage, owner);
                    }
                    clearInterval(interval);
                    Hero.removeProjectile(projectile);
                    if (boltGroup.parent) boltGroup.parent.remove(boltGroup);
                    trailParticles.forEach((particle) => {
                        if (particle.mesh.parent) {
                            particle.mesh.parent.remove(particle.mesh);
                        }
                    });
                    return;
                }
            }

            if (level && Array.isArray(level.platforms)) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(bounds, platform.bounds)) {
                        clearInterval(interval);
                        Hero.removeProjectile(projectile);
                        if (boltGroup.parent) boltGroup.parent.remove(boltGroup);
                        trailParticles.forEach((particle) => {
                            if (particle.mesh.parent) {
                                particle.mesh.parent.remove(particle.mesh);
                            }
                        });
                        return;
                    }
                }
            }
            if (level && Array.isArray(level.movingPlatforms)) {
                for (const entry of level.movingPlatforms) {
                    const platform = entry && entry.platform;
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(bounds, platform.bounds)) {
                        clearInterval(interval);
                        Hero.removeProjectile(projectile);
                        if (boltGroup.parent) boltGroup.parent.remove(boltGroup);
                        trailParticles.forEach((particle) => {
                            if (particle.mesh.parent) {
                                particle.mesh.parent.remove(particle.mesh);
                            }
                        });
                        return;
                    }
                }
            }
            if (level && Array.isArray(level.bridges)) {
                for (const bridge of level.bridges) {
                    if (!bridge || !bridge.bounds) continue;
                    if (checkAABBCollision(bounds, bridge.bounds)) {
                        clearInterval(interval);
                        Hero.removeProjectile(projectile);
                        if (boltGroup.parent) boltGroup.parent.remove(boltGroup);
                        trailParticles.forEach((particle) => {
                            if (particle.mesh.parent) {
                                particle.mesh.parent.remove(particle.mesh);
                            }
                        });
                        return;
                    }
                }
            }

            if (traveled >= this.lightBoltRange) {
                clearInterval(interval);
                Hero.removeProjectile(projectile);
                if (boltGroup.parent) boltGroup.parent.remove(boltGroup);
                trailParticles.forEach((particle) => {
                    if (particle.mesh.parent) {
                        particle.mesh.parent.remove(particle.mesh);
                    }
                });
            }
        }, 16);
    }

    getNearestLightBoltTarget(position) {
        if (!position || typeof this.getDamageTargets !== 'function') return null;
        let closest = null;
        let closestDist = Infinity;
        const targets = this.getDamageTargets();
        for (const target of targets) {
            if (!target || !target.isAlive) continue;
            if (target.type === 'player' && this.isSameTeam && this.isSameTeam(target)) continue;
            const dx = target.position.x - position.x;
            const dy = target.position.y - position.y;
            const dist = Math.hypot(dx, dy);
            if (dist < this.lightBoltHomingRange && dist < closestDist) {
                closestDist = dist;
                closest = target;
            }
        }
        return closest;
    }

    updateLightNova(deltaTime) {
        if (!this.lightNovaActive && !this.lightNovaDescending && !this.featherActive) {
            this.forceControlsLocked = false;
            return;
        }

        if (!this.lightNovaActive) {
            this.forceControlsLocked = false;
        }

        if (this.lightNovaActive) {
            const riseEnd = this.lightNovaRiseDuration;
            const holdEnd = riseEnd + this.lightNovaHoldDuration;
            const releaseEnd = holdEnd + this.lightNovaReleaseDuration;

            this.lightNovaElapsed += deltaTime;

            if (this.lightNovaElapsed < riseEnd) {
                this.forceControlsLocked = true;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.isGrounded = false;
                this.ignoreGravityUntil = Date.now() + 200;
                this.position.y += this.lightNovaRiseSpeed * deltaTime;
            } else if (this.lightNovaElapsed < holdEnd) {
                this.forceControlsLocked = true;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.ignoreGravityUntil = Date.now() + 200;
            } else {
                if (!this.lightNovaDescending && !this.featherActive) {
                    this.lightNovaDescending = true;
                    this.featherActive = true;
                }
                this.forceControlsLocked = false;
            }

            if (!this.lightNovaStunTriggered && this.lightNovaElapsed >= riseEnd) {
                this.lightNovaStunTriggered = true;
                this.lightNovaStunTimer = 0;
                this.triggerLightNovaStun();
            }

            if (this.lightNovaElapsed >= releaseEnd) {
                this.lightNovaActive = false;
                this.lightNovaTickTimer = 0;
                this.lightNovaStunTriggered = false;
                this.lightNovaElapsed = 0;
                this.divineBeamTickCounts.clear();
                this.lightNovaBeamPosition = null;
                this.forceControlsLocked = false;
                if (this.divineBeamGroup) {
                    this.divineBeamGroup.visible = false;
                }
                if (this.divineBeamImpactGroup) {
                    this.divineBeamImpactGroup.visible = false;
                }
                this.clearDivineBeamParticles();
            }
        }

        if (this.lightNovaDescending || this.featherActive) {
            const groundY = this.getGroundAtX(this.position.x, this.position.y);
            if (this.isGrounded || this.position.y <= groundY + 0.001) {
                this.position.y = groundY;
                this.velocity.y = 0;
                this.lightNovaDescending = false;
                this.featherActive = false;
                return;
            }
            this.ignoreGravityUntil = Date.now() + 200;
            this.velocity.y = -this.lightNovaDescendSpeed;
            this.position.y += this.velocity.y * deltaTime;
        }
    }

    updateLightNovaBeam(deltaTime) {
        this.divineBeamTickTimer += deltaTime;
        this.divineBeamImpactTime += deltaTime;
        this.updateDivineBeamVisual(deltaTime);
        while (this.divineBeamTickTimer >= this.divineBeamTickInterval) {
            this.divineBeamTickTimer -= this.divineBeamTickInterval;
            this.applyDivineBeamTick();
        }
    }

    startLightNova() {
        if (this.lightNovaActive) return;
        this.lightNovaActive = true;
        this.lightNovaRiseTimer = 0;
        this.lightNovaStunTimer = 0;
        this.lightNovaHoldTimer = 0;
        this.lightNovaTickTimer = 0;
        this.lightNovaStunTriggered = false;
        this.lightNovaDescending = false;
        this.lightNovaReleaseTimer = 0;
        this.lightNovaElapsed = 0;
        this.featherActive = false;
        this.lightNovaBeamPosition = { x: this.position.x, y: this.position.y };
        this.divineBeamTickTimer = 0;
        this.divineBeamImpactTime = 0;
        this.divineBeamTickCounts.clear();
    }

    triggerLightNovaStun() {
        this.spawnLightNovaFlash(this);
        const players = this.getAllPlayers ? this.getAllPlayers() : [];
        for (const player of players) {
            if (!player || !player.isAlive || player === this) continue;
            if (this.isSameTeam && this.isSameTeam(player)) continue;
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const dist = Math.hypot(dx, dy);
            if (dist > this.lightNovaStunRadius) continue;
            if (typeof player.setCripple === 'function') {
                player.setCripple(this.lightNovaStunDuration);
            }
            this.createLightNovaLightning(player);
        }
    }

    spawnLightNovaFlash(target) {
        if (!target) return;
        const container = this.scene || this.mesh?.parent;
        if (!container) return;
        const group = new THREE.Group();

        const outerRadius = this.lightNovaStunRadius || 15;
        const circle = new THREE.Mesh(
            new THREE.CircleGeometry(outerRadius, 64),
            new THREE.MeshBasicMaterial({
                color: 0xfff0b8,
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            })
        );
        circle.renderOrder = 61;
        group.add(circle);

        group.position.set(target.position.x, target.position.y, 6);
        container.add(group);

        let opacity = 0.55;
        const interval = setInterval(() => {
            opacity -= 0.08;
            circle.material.opacity = Math.max(0, opacity * 0.5);
            const pulse = 1 + (1 - opacity) * 0.2;
            circle.scale.set(pulse, pulse, 1);
            if (opacity <= 0) {
                clearInterval(interval);
                if (group.parent) group.parent.remove(group);
            }
        }, 40);
    }

    createLightNovaLightning(enemy) {
        if (!this.scene || !enemy) return;
        const originX = enemy.position?.x ?? this.position.x;
        const originY = enemy.position?.y ?? this.position.y;
        const height = 4.6;
        const topY = originY + height;
        const segments = 6;
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const jitter = (Math.random() - 0.5) * 0.35;
            points.push(new THREE.Vector3(originX + jitter, topY - height * t, 0.45));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const boltGeometry = new THREE.TubeGeometry(curve, 20, 0.065, 6, false);
        const boltMaterial = new THREE.MeshBasicMaterial({
            color: 0xfff6c4,
            transparent: true,
            opacity: 0.98,
            depthTest: false,
            depthWrite: false
        });
        const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
        bolt.renderOrder = 80;

        const glowGeometry = new THREE.TubeGeometry(curve, 20, 0.12, 6, false);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffe39b,
            transparent: true,
            opacity: 0.55,
            depthTest: false,
            depthWrite: false
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.renderOrder = 79;

        const taperGeometry = (geometry, centerX, centerZ) => {
            geometry.computeBoundingBox();
            const maxY = geometry.boundingBox.max.y;
            const minY = geometry.boundingBox.min.y;
            const range = Math.max(0.0001, maxY - minY);
            const pos = geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                const t = (maxY - y) / range;
                const scale = Math.max(0, Math.min(1, t));
                const nextX = centerX + (x - centerX) * scale;
                const nextZ = centerZ + (z - centerZ) * scale;
                pos.setX(i, nextX);
                pos.setZ(i, nextZ);
            }
            pos.needsUpdate = true;
        };

        taperGeometry(boltGeometry, originX, 0.45);
        taperGeometry(glowGeometry, originX, 0.45);

        const flash = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 18),
            new THREE.MeshBasicMaterial({
                color: 0xfff2d6,
                transparent: true,
                opacity: 0.45,
                depthTest: false,
                depthWrite: false
            })
        );
        flash.position.set(originX, originY + 0.1, 6);
        flash.renderOrder = 82;

        const bottomConeGeometry = new THREE.ConeGeometry(0.32, 0.6, 14);
        const bottomConeMaterial = new THREE.MeshBasicMaterial({
            color: 0xfff0b8,
            transparent: true,
            opacity: 0.75,
            depthTest: false,
            depthWrite: false
        });
        const bottomCone = new THREE.Mesh(bottomConeGeometry, bottomConeMaterial);
        bottomCone.rotation.x = Math.PI;
        bottomCone.position.set(originX, originY + 0.3, 6);
        bottomCone.renderOrder = 81;

        const halo = new THREE.Mesh(
            new THREE.RingGeometry(0.42, 0.68, 20),
            new THREE.MeshBasicMaterial({
                color: 0xffe6b3,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        halo.position.set(originX, originY + 0.12, 6);
        halo.renderOrder = 81;

        const group = new THREE.Group();
        group.add(glow, bolt, bottomCone, halo, flash);
        group.position.set(0, 0, 0);
        this.scene.add(group);

        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 0.016;
            const fade = Math.max(0, 1 - elapsed * 4.5);
            boltMaterial.opacity = 0.98 * fade;
            glowMaterial.opacity = 0.55 * fade;
            flash.material.opacity = 0.45 * fade;
            halo.material.opacity = 0.4 * fade;
            bottomConeMaterial.opacity = 0.75 * fade;
            if (fade <= 0.02) {
                clearInterval(interval);
                if (group.parent) {
                    group.parent.remove(group);
                }
            }
        }, 16);
    }

    createAimIndicator() {
        const group = new THREE.Group();
        const flareMaterial = new THREE.MeshBasicMaterial({
            color: 0xfff0d6,
            transparent: true,
            opacity: 0.85,
            depthTest: false
        });

        const diamond = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.38), flareMaterial);
        diamond.rotation.z = Math.PI / 4;
        group.add(diamond);

        const streakH = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.06), flareMaterial);
        group.add(streakH);
        const streakV = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.7), flareMaterial);
        group.add(streakV);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.18, 0.22, 16),
            new THREE.MeshBasicMaterial({
                color: 0xfff0d6,
                transparent: true,
                opacity: 0.5,
                depthTest: false
            })
        );
        group.add(ring);

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
        this.aimIndicator.scale.set(0.64, 0.64, 1);
    }

    createDivineBeamVisual() {
        const group = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 1),
            new THREE.MeshBasicMaterial({
                color: 0xfff3d6,
                transparent: true,
                opacity: 0.6,
                depthTest: false,
                depthWrite: false
            })
        );
        group.add(core);

        const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 1),
            new THREE.MeshBasicMaterial({
                color: 0xffe7a8,
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false
            })
        );
        group.add(glow);

        const coreTop = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 1),
            new THREE.MeshBasicMaterial({
                color: 0xfff3d6,
                transparent: true,
                opacity: 0.1,
                depthTest: false,
                depthWrite: false
            })
        );
        group.add(coreTop);

        const coreFade = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 1),
            new THREE.MeshBasicMaterial({
                color: 0xfff3d6,
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false
            })
        );
        group.add(coreFade);

        const glowTop = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 1),
            new THREE.MeshBasicMaterial({
                color: 0xffe7a8,
                transparent: true,
                opacity: 0.1,
                depthTest: false,
                depthWrite: false
            })
        );
        group.add(glowTop);

        const glowFade = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 1),
            new THREE.MeshBasicMaterial({
                color: 0xffe7a8,
                transparent: true,
                opacity: 0.22,
                depthTest: false,
                depthWrite: false
            })
        );
        group.add(glowFade);

        group.visible = false;
        group.renderOrder = 18;
        this.scene.add(group);
        this.divineBeamGroup = group;
        this.divineBeamCore = core;
        this.divineBeamGlow = glow;
        this.divineBeamCoreFade = coreFade;
        this.divineBeamGlowFade = glowFade;
        this.divineBeamCoreTop = coreTop;
        this.divineBeamGlowTop = glowTop;

        const impactGroup = new THREE.Group();
        const impactCore = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 0.3),
            new THREE.MeshBasicMaterial({
                color: 0xffd98a,
                transparent: true,
                opacity: 0.7,
                depthTest: false,
                depthWrite: false
            })
        );
        impactCore.position.set(0, 0.05, 0);
        impactGroup.add(impactCore);

        const impactPlume = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 1.2),
            new THREE.MeshBasicMaterial({
                color: 0xfff1c4,
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false
            })
        );
        impactPlume.position.set(0, 0.45, 0);
        impactGroup.add(impactPlume);

        const wedgeShape = new THREE.Shape();
        wedgeShape.moveTo(0, 0);
        wedgeShape.lineTo(0.65, 0.08);
        wedgeShape.lineTo(0, 0.45);
        wedgeShape.closePath();
        const wedgeGeometry = new THREE.ShapeGeometry(wedgeShape);

        const impactWedgeLeft = new THREE.Mesh(
            wedgeGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xffc36a,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        impactWedgeLeft.position.set(-0.95, -0.02, 0);
        impactWedgeLeft.rotation.z = Math.PI / 10;
        impactGroup.add(impactWedgeLeft);

        const impactWedgeRight = new THREE.Mesh(
            wedgeGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xffc36a,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        impactWedgeRight.position.set(0.95, -0.02, 0);
        impactWedgeRight.rotation.z = -Math.PI / 10;
        impactGroup.add(impactWedgeRight);

        impactGroup.visible = false;
        impactGroup.renderOrder = 19;
        this.scene.add(impactGroup);
        this.divineBeamImpactGroup = impactGroup;
        this.divineBeamImpactCore = impactCore;
        this.divineBeamImpactPlume = impactPlume;
        this.divineBeamImpactWedgeLeft = impactWedgeLeft;
        this.divineBeamImpactWedgeRight = impactWedgeRight;
    }

    startDivineBeam() {
        if (this.lightNovaActive) {
            return false;
        }
        const ability = this.abilities && this.abilities.q ? this.abilities.q : null;
        if (!ability || !ability.isReady || ability.currentCooldown > 0) {
            return false;
        }
        if (this.divineBeamCharge <= 0) {
            if (ability.currentCooldown <= 0) {
                ability.currentCooldown = ability.cooldown;
                ability.isReady = false;
            }
            return false;
        }
        if (!this.divineBeamActive) {
            this.divineBeamActive = true;
            this.divineBeamTickTimer = 0;
            this.divineBeamCharge = Math.max(0, this.divineBeamCharge - 1);
            this.divineBeamImpactTime = 0;
            this.divineBeamParticleTimer = 0;
            this.divineBeamParticleLaneIndex = 0;
            if (this.reticlePosition) {
                this.divineBeamPosition = { x: this.reticlePosition.x, y: this.reticlePosition.y };
            }
        }
        return true;
    }

    stopDivineBeam() {
        this.divineBeamActive = false;
        if (this.divineBeamGroup) {
            this.divineBeamGroup.visible = false;
        }
        if (this.divineBeamImpactGroup) {
            this.divineBeamImpactGroup.visible = false;
        }
        this.clearDivineBeamParticles();
        this.divineBeamTickCounts.clear();
        this.divineBeamWasOnCooldown = false;
        this.lightNovaHoldTimer = 0;
        this.lightNovaDescending = false;
        this.lightNovaReleaseTimer = 0;
        this.lightNovaElapsed = 0;
        this.lightNovaBeamPosition = null;
        this.featherActive = false;
    }

    updateDivineBeam(deltaTime, input) {
        if (this.lightNovaActive) {
            this.updateLightNovaBeam(deltaTime);
            return;
        }
        if (this.divineBeamActive) {
            if (!input.isAbility1Pressed()) {
                this.stopDivineBeam();
                return;
            }
            if (this.divineBeamCharge <= 0) {
                const ability = this.abilities && this.abilities.q ? this.abilities.q : null;
                if (ability) {
                    ability.currentCooldown = ability.cooldown;
                    ability.isReady = false;
                }
                this.stopDivineBeam();
                return;
            }
            this.divineBeamIdleTimer = 0;
            this.divineBeamRechargeTimer = 0;
            this.divineBeamTickTimer += deltaTime;
            this.divineBeamImpactTime += deltaTime;
            this.updateDivineBeamVisual(deltaTime);
            while (this.divineBeamTickTimer >= this.divineBeamTickInterval) {
                this.divineBeamTickTimer -= this.divineBeamTickInterval;
                this.applyDivineBeamTick();
                this.divineBeamCharge = Math.max(0, this.divineBeamCharge - 1);
                if (this.divineBeamCharge <= 0) {
                    const ability = this.abilities && this.abilities.q ? this.abilities.q : null;
                    if (ability) {
                        ability.currentCooldown = ability.cooldown;
                        ability.isReady = false;
                    }
                    this.stopDivineBeam();
                    break;
                }
            }
        } else {
            this.divineBeamImpactTime = 0;
            this.divineBeamParticleTimer = 0;
            this.divineBeamParticleLaneIndex = 0;
            this.clearDivineBeamParticles();
            this.divineBeamIdleTimer += deltaTime;
            const ability = this.abilities && this.abilities.q ? this.abilities.q : null;
            if (ability && ability.currentCooldown > 0) {
                this.divineBeamCharge = 0;
                this.divineBeamWasOnCooldown = true;
                return;
            }
            if (ability && ability.isReady && this.divineBeamWasOnCooldown) {
                this.divineBeamCharge = this.divineBeamChargeMax;
                this.divineBeamWasOnCooldown = false;
                return;
            }
            if (this.divineBeamIdleTimer >= this.divineBeamRechargeDelay && this.divineBeamCharge < this.divineBeamChargeMax) {
                this.divineBeamRechargeTimer += deltaTime;
                while (this.divineBeamRechargeTimer >= this.divineBeamRechargeInterval) {
                    this.divineBeamRechargeTimer -= this.divineBeamRechargeInterval;
                    this.divineBeamCharge = Math.min(this.divineBeamChargeMax, this.divineBeamCharge + 1);
                }
            }
        }
    }

    applyDivineBeamTick() {
        const rect = this.getDivineBeamRect();
        if (!rect) return;

        const { left, right, top, bottom } = rect;
        const allies = this.getAllPlayers().filter((player) => player && player.isAlive && this.isSameTeam(player));
        for (const ally of allies) {
            if (ally.position.x < left || ally.position.x > right) continue;
            if (ally.position.y < bottom || ally.position.y > top) continue;
            if (typeof ally.heal === 'function') {
                ally.heal(5);
            }
        }

        const enemies = this.getDamageTargets().filter((target) => {
            if (!target || !target.isAlive) return false;
            return target.type === 'player' || target.type === 'enemy' || target.type === 'goomba';
        });
        const nextTickCounts = new Map();
        for (const enemy of enemies) {
            if (enemy.position.x < left || enemy.position.x > right) continue;
            if (enemy.position.y < bottom || enemy.position.y > top) continue;
            if (typeof enemy.takeDamage === 'function') {
                const prevCount = this.divineBeamTickCounts.get(enemy) || 0;
                const nextCount = prevCount + 1;
                const baseDamage = this.lightNovaActive ? 10 : 10;
                const rampStep = Math.floor((nextCount - 1) / 2);
                const damage = this.lightNovaActive ? baseDamage : baseDamage + 5 * rampStep;
                enemy.takeDamage(damage, this);
                nextTickCounts.set(enemy, nextCount);
            }
        }
        this.divineBeamTickCounts = nextTickCounts;
    }

    updateDivineBeamVisual(deltaTime) {
        if (!this.divineBeamGroup || !this.getDivineBeamPosition()) return;
        const rect = this.getDivineBeamRect();
        if (!rect) {
            this.divineBeamGroup.visible = false;
            if (this.divineBeamImpactGroup) {
                this.divineBeamImpactGroup.visible = false;
            }
            this.clearDivineBeamParticles();
            return;
        }

        const visual = this.getDivineBeamVisualBounds(rect.bottom);
        const height = Math.max(0.1, visual.top - visual.bottom);
        const centerY = visual.bottom + height / 2;
        this.divineBeamGroup.visible = true;
        const beamWidth = this.getDivineBeamWidth();
        const baseHeight = this.lightNovaActive ? height : Math.min(5, height);
        const fadeHeight = this.lightNovaActive ? 0 : Math.min(2, Math.max(0, height - 5));
        const topHeight = this.lightNovaActive ? 0 : Math.max(0, height - 5 - fadeHeight);
        const halfHeight = height / 2;
        const baseCenter = -halfHeight + baseHeight / 2;
        this.divineBeamGroup.position.set(rect.centerX, centerY, 1.6);
        const beamScaleX = beamWidth / 2;
        this.divineBeamCore.scale.set(beamScaleX, baseHeight, 1);
        this.divineBeamGlow.scale.set(beamScaleX, baseHeight, 1);
        this.divineBeamCore.position.y = baseCenter;
        this.divineBeamGlow.position.y = baseCenter;

        if (this.divineBeamCoreFade && this.divineBeamGlowFade) {
            this.divineBeamCoreFade.visible = fadeHeight > 0.01;
            this.divineBeamGlowFade.visible = fadeHeight > 0.01;
            if (fadeHeight > 0.01) {
                const fadeCenter = -halfHeight + baseHeight + fadeHeight / 2;
                this.divineBeamCoreFade.scale.set(beamScaleX, fadeHeight, 1);
                this.divineBeamGlowFade.scale.set(beamScaleX, fadeHeight, 1);
                this.divineBeamCoreFade.position.y = fadeCenter;
                this.divineBeamGlowFade.position.y = fadeCenter;
            }
        }

        if (this.divineBeamCoreTop && this.divineBeamGlowTop) {
            this.divineBeamCoreTop.visible = topHeight > 0.01;
            this.divineBeamGlowTop.visible = topHeight > 0.01;
            if (topHeight > 0.01) {
                const topCenter = -halfHeight + baseHeight + fadeHeight + topHeight / 2;
                this.divineBeamCoreTop.scale.set(beamScaleX, topHeight, 1);
                this.divineBeamGlowTop.scale.set(beamScaleX, topHeight, 1);
                this.divineBeamCoreTop.position.y = topCenter;
                this.divineBeamGlowTop.position.y = topCenter;
            }
        }

        if (this.divineBeamImpactGroup) {
            const pulse = 0.5 + 0.5 * Math.sin(this.divineBeamImpactTime * 10);
            const showImpact = this.lastDivineBeamGroundFound === true;
            this.divineBeamImpactGroup.visible = showImpact;
            if (showImpact) {
                this.divineBeamImpactGroup.position.set(rect.centerX, rect.bottom + 0.02, 1.7);
                this.divineBeamImpactCore.scale.set(1.0 + pulse * 0.85, 1.05, 1);
                this.divineBeamImpactPlume.scale.set(0.85 + pulse * 0.55, 0.95, 1);
                this.divineBeamImpactWedgeLeft.scale.set(-(1.0 + pulse * 0.7), 1.0, 1);
                this.divineBeamImpactWedgeRight.scale.set(1.0 + pulse * 0.7, 1.0, 1);
                this.divineBeamImpactWedgeLeft.position.x = -0.95 - pulse * 0.2;
                this.divineBeamImpactWedgeRight.position.x = 0.95 + pulse * 0.2;
                this.divineBeamImpactCore.material.opacity = 0.55 + pulse * 0.4;
                this.divineBeamImpactPlume.material.opacity = 0.18 + pulse * 0.25;
                this.divineBeamImpactWedgeLeft.material.opacity = 0.12 + pulse * 0.22;
                this.divineBeamImpactWedgeRight.material.opacity = 0.12 + pulse * 0.22;
            }
        }

        this.updateDivineBeamParticles(deltaTime, rect, visual);
    }

    updateDivineBeamParticles(deltaTime, rect, visual) {
        if (!deltaTime) return;
        this.divineBeamParticleTimer += deltaTime;
        while (this.divineBeamParticleTimer >= this.divineBeamParticleInterval) {
            this.divineBeamParticleTimer -= this.divineBeamParticleInterval;
            this.spawnDivineBeamParticle(rect, visual);
        }

        const maxY = visual.top;
        const minY = rect.bottom;
        for (let i = this.divineBeamParticles.length - 1; i >= 0; i -= 1) {
            const particle = this.divineBeamParticles[i];
            particle.life += deltaTime;
            particle.y -= particle.speed * deltaTime;
            particle.radius += particle.radialDrift * deltaTime;

            const x = rect.centerX + Math.cos(particle.angle) * particle.radius;
            particle.mesh.position.set(x, particle.y, 1.9);

            const lifeRatio = particle.life / particle.maxLife;
            const baseOpacity = particle.baseOpacity * (1 - lifeRatio);
            let heightFactor = 1;
            const above = particle.y - rect.bottom;
            if (above > 5) {
                if (above <= 7) {
                    const t = Math.min(1, Math.max(0, (above - 5) / 2));
                    heightFactor = 1 - t * 0.6;
                } else {
                    heightFactor = 0.4;
                }
            }
            particle.mesh.material.opacity = Math.max(0, baseOpacity * heightFactor);

            const bottomEdge = particle.y - particle.height / 2;
            if (bottomEdge <= minY || particle.y >= maxY || lifeRatio >= 1) {
                if (particle.mesh.parent) {
                    particle.mesh.parent.remove(particle.mesh);
                }
                this.divineBeamParticles.splice(i, 1);
            }
        }
    }

    spawnDivineBeamParticle(rect, visual) {
        if (!this.scene) return;
        const particleWidth = 0.04 + Math.random() * 0.06;
        const particleHeight = 2 + Math.random();
        const particleGeometry = new THREE.BoxGeometry(particleWidth, particleHeight, 0.02);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xfff1c4 : 0xffd58a,
            transparent: true,
            opacity: 0.7,
            depthTest: false,
            depthWrite: false
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.renderOrder = 20;
        const height = Math.max(0.1, visual.top - visual.bottom);
        const laneCount = Math.max(1, this.divineBeamParticleLaneCount);
        const laneIndex = this.divineBeamParticleLaneIndex % laneCount;
        this.divineBeamParticleLaneIndex += 1;
        const laneY = visual.bottom + ((laneIndex + 0.5) / laneCount) * height;
        const startY = laneY + (Math.random() - 0.5) * 0.1;
        const angle = Math.random() * Math.PI * 2;
        const baseRadius = 0.2 + Math.random() * 0.45;
        const outerBoost = Math.random() < 0.45 ? 0.5 + Math.random() * 0.6 : 0;
        const radius = baseRadius + outerBoost;
        particle.position.set(rect.centerX + Math.cos(angle) * radius, startY, 1.9);
        this.scene.add(particle);

        const speed = 1.6 + Math.random() * 1.2;
        const maxLife = Math.max(0.4, (startY - visual.bottom) / speed);
        this.divineBeamParticles.push({
            mesh: particle,
            angle,
            radius,
            y: startY,
            speed,
            rotationSpeed: 0,
            radialDrift: (Math.random() - 0.5) * 0.03,
            baseOpacity: 0.55 + Math.random() * 0.25,
            life: 0,
            height: particleHeight,
            maxLife
        });
    }

    clearDivineBeamParticles() {
        if (!this.divineBeamParticles.length) return;
        this.divineBeamParticles.forEach((particle) => {
            if (particle.mesh && particle.mesh.parent) {
                particle.mesh.parent.remove(particle.mesh);
            }
        });
        this.divineBeamParticles = [];
    }

    getDivineBeamRect() {
        const beamPos = this.getDivineBeamPosition();
        if (!beamPos) return null;
        const centerX = beamPos.x;
        const groundScanY = this.lightNovaActive
            ? beamPos.y
            : (this.reticlePosition ? this.reticlePosition.y : beamPos.y);
        const groundY = this.getGroundAtX(centerX, groundScanY);
        const bottom = groundY;
        const top = this.lightNovaActive ? this.getBeamScreenTopY() : groundY + 5;
        const halfWidth = this.getDivineBeamWidth() / 2;
        return {
            left: centerX - halfWidth,
            right: centerX + halfWidth,
            top,
            bottom,
            centerX
        };
    }

    findGroundBelow(x, y) {
        let groundLevel = Number.isFinite(this.level?.deathY) ? this.level.deathY : Number.NEGATIVE_INFINITY;
        let foundGround = false;
        const checkPlatform = (platform) => {
            if (!platform || !platform.bounds) return;
            if (x < platform.bounds.left || x > platform.bounds.right) return;
            if (platform.bounds.top <= y && platform.bounds.top > groundLevel) {
                groundLevel = platform.bounds.top;
                foundGround = true;
            }
        };

        if (this.level && Array.isArray(this.level.platforms)) {
            this.level.platforms.forEach(checkPlatform);
        }
        if (this.level && Array.isArray(this.level.movingPlatforms)) {
            this.level.movingPlatforms.forEach((entry) => checkPlatform(entry && entry.platform));
        }
        if (this.level && Array.isArray(this.level.bridges)) {
            this.level.bridges.forEach(checkPlatform);
        }

        this.lastDivineBeamGroundFound = foundGround;
        if (!Number.isFinite(groundLevel)) {
            const screenBottom = this.getBeamScreenBottomY ? this.getBeamScreenBottomY() : y - 50;
            return Number.isFinite(screenBottom) ? screenBottom - 2 : y - 50;
        }
        return groundLevel;
    }

    getBeamScreenTopY() {
        const camera = this.scene && this.scene.children
            ? this.scene.children.find((child) => child && child.isCamera)
            : null;
        if (!camera) {
            return this.reticlePosition ? this.reticlePosition.y + 10 : 10;
        }
        if (camera.isOrthographicCamera) {
            return camera.top + (camera.position?.y || 0);
        }
        return this.reticlePosition ? this.reticlePosition.y + 10 : 10;
    }

    getBeamScreenBottomY() {
        const camera = this.scene && this.scene.children
            ? this.scene.children.find((child) => child && child.isCamera)
            : null;
        if (!camera) {
            return this.reticlePosition ? this.reticlePosition.y - 10 : -10;
        }
        if (camera.isOrthographicCamera) {
            return camera.bottom + (camera.position?.y || 0);
        }
        return this.reticlePosition ? this.reticlePosition.y - 10 : -10;
    }

    getDivineBeamVisualBounds(groundY) {
        const padding = 6;
        const top = this.getBeamScreenTopY() + padding;
        const bottom = this.getBeamScreenBottomY() - padding;
        return {
            top,
            bottom: Math.max(bottom, groundY)
        };
    }

    updateDivineBeamPosition(deltaTime) {
        if (this.lightNovaActive) return;
        if (!this.reticlePosition) return;
        if (!this.divineBeamPosition) {
            const groundY = this.getGroundAtX(this.reticlePosition.x, this.reticlePosition.y);
            this.divineBeamPosition = { x: this.reticlePosition.x, y: groundY };
            return;
        }
        const targetX = this.reticlePosition.x;
        const targetY = this.getGroundAtX(this.reticlePosition.x, this.reticlePosition.y);
        const dx = targetX - this.divineBeamPosition.x;
        const distX = Math.abs(dx);
        if (distX < 0.001) {
            this.divineBeamPosition.x = targetX;
        } else {
            const maxStep = this.divineBeamFollowSpeed * deltaTime;
            if (distX <= maxStep) {
                this.divineBeamPosition.x = targetX;
            } else {
                this.divineBeamPosition.x += Math.sign(dx) * maxStep;
            }
        }
        this.divineBeamPosition.y = targetY;
    }

    getGroundAtX(x, y) {
        const scanY = Number.isFinite(y) ? y : this.getBeamScreenTopY() + 50;
        return this.findGroundBelow(x, scanY);
    }

    getDivineBeamPosition() {
        if (this.lightNovaActive) {
            return this.lightNovaBeamPosition || { x: this.position.x, y: this.position.y };
        }
        return this.divineBeamPosition || this.reticlePosition;
    }

    getDivineBeamWidth() {
        return this.lightNovaActive ? this.lightNovaBeamWidth : 2;
    }

    updateReticlePosition() {
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
}
