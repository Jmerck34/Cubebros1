import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { DEATH_Y, PLAYER_SPEED } from '../core/constants.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Alchemist Hero - Dark hooded figure with purple robes, sword, and flask.
 * @class Alchemist
 */
export class Alchemist extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        this.setBodyColor(0x2b2b2f);
        this.createEquipment();

        this.enemies = [];
        this.facingDirection = 1;
        this.lastUpdateDelta = 0;

        this.enchantedComboStep = 0;
        this.enchantedComboResetMs = 850;
        this.enchantedComboResetTimer = null;
        this.enchantedNextSwingTime = 0;
        this.enchantedLastSwingTime = 0;
        this.enchantedAttackRate = 0.4;
        this.enchantedCooldown = 1.25;
        this.enchantedBaseAttackRate = this.enchantedAttackRate;
        this.enchantedBaseCooldown = this.enchantedCooldown;
        this.enchantedHoldThreshold = 0.25;
        this.enchantedHoldActive = false;
        this.enchantedHoldTime = 0;
        this.enchantedLastPressed = false;
        this.enchantedThrown = false;
        this.enchantedReturning = false;
        this.enchantedThrowSpeed = 24;
        this.enchantedReturnSpeed = 24;
        this.enchantedMaxThrowDistance = 12;
        this.enchantedStuck = false;
        this.alchemicalBombTypes = [
            'fire',
            'freeze',
            'oil',
            'holy',
            'fear',
            'disorient',
            'fragmentation',
            'lightning'
        ];
        this.alchemicalBombQueue = [];
        this.alchemicalBombRadius = 2;
        this.alchemicalBombSpeed = 12;
        this.alchemicalBombGravity = -12;
        this.alchemicalBombWasReady = false;
        this.alchemicalFireFields = [];
        this.alchemicalOilFields = [];
        this.alchemicalHolyFields = [];
        this.alchemicalLightningFields = [];
        this.enchantedProjectile = null;
        this.dragonUltimateActive = false;
        this.dragonUltimateTimer = 0;
        this.dragonUltimateDuration = 10;
        this.dragonFireTickTimer = 0;
        this.dragonFireTickInterval = 0.3;
        this.dragonFireDamageCooldown = this.dragonFireTickInterval;
        this.dragonFireDamage = 5;
        this.dragonFireSmallWidth = 0.5;
        this.dragonFireBigWidth = 2;
        this.dragonFireLength = 6;
        this.dragonVisualGroup = null;
        this.dragonLeftWing = null;
        this.dragonRightWing = null;
        this.dragonFireGroup = null;
        this.dragonFireFlames = [];
        this.dragonOriginalColor = null;
        this.dragonHiddenMeshes = [];
        this.dragonFireActive = false;
        this.dragonFireWasActive = false;
        this.dragonPrevScaleMultiplier = null;
        this.dragonPrevHitboxScale = null;
        this.dragonMouthForward = 1.2;
        this.dragonMouthUp = 0.18;
        this.alchemicalPotionTypes = [
            'shield',
            'haste',
            'healing',
            'jump',
            'levitation',
            'growth'
        ];
        this.alchemicalPotionQueue = [];
        this.alchemicalPotionWasReady = false;
        this.alchemicalPotionActive = false;
        this.alchemicalPotionType = null;
        this.alchemicalPotionTimer = 0;
        this.alchemicalPotionHealRate = 0;
        this.alchemicalPotionDamageMultiplier = 1;
        this.alchemicalPotionAreaMultiplier = 1;
        this.alchemicalPotionAbility = null;
        this.alchemicalPotionAwaitShield = false;
        this.alchemicalPotionShieldAmount = 0;
        this.alchemicalPotionCooldownStarted = false;
        this.alchemicalPotionRestore = null;
        this.isPotionHovering = false;
        this.hoverCloud = null;
        this.hoverTrailParticles = [];
        this.hoverTimeout = null;
        this.hoverAnimationInterval = null;

        this.initializeAbilities();
    }

    createEquipment() {
        this.addRobe();
        this.addHood();
        this.addSword();
        this.addFlask();
    }

    addRobe() {
        const robeMaterial = new THREE.MeshBasicMaterial({ color: 0x4a1f63 });
        const trimMaterial = new THREE.MeshBasicMaterial({ color: 0x361649 });

        const robeFront = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.62), robeMaterial);
        robeFront.position.set(0, -0.12, 0.06);
        this.mesh.add(robeFront);

        const robeBack = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.62), robeMaterial);
        robeBack.position.set(0, -0.12, -0.06);
        this.mesh.add(robeBack);

        const hem = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.1, 0.66), trimMaterial);
        hem.position.set(0, -0.48, 0);
        this.mesh.add(hem);
    }

    addHood() {
        const hoodMaterial = new THREE.MeshBasicMaterial({ color: 0x2b1339 });
        const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.38, 0.96), hoodMaterial);
        hoodTop.position.set(0, 0.42, 0);
        this.mesh.add(hoodTop);

        const hoodFront = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.28, 0.6), hoodMaterial);
        hoodFront.position.set(0, 0.18, 0.2);
        this.mesh.add(hoodFront);

        const hoodShadow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.62), new THREE.MeshBasicMaterial({ color: 0x1a0f22 }));
        hoodShadow.position.set(0, 0.1, 0.22);
        this.mesh.add(hoodShadow);
    }

    addSword() {
        const swordGroup = new THREE.Group();

        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.2, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x3b2a1a })
        );
        handle.position.set(0, -0.05, 0);
        swordGroup.add(handle);

        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.05, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x2e2e2e })
        );
        guard.position.set(0, 0.05, 0);
        swordGroup.add(guard);

        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.6, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xc9ced6 })
        );
        blade.position.set(0, 0.36, 0);
        swordGroup.add(blade);

        swordGroup.scale.set(1.5, 1.5, 1.1);
        swordGroup.position.set(0.55, -0.15, 0.16);
        swordGroup.rotation.z = -0.4;
        this.mesh.add(swordGroup);
        this.sword = swordGroup;
        this.swordBase = { x: 0.55, y: -0.15, z: 0.16, rotZ: -0.4 };
    }

    addFlask() {
        const flaskGroup = new THREE.Group();

        const bottle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.16, 0.32, 10),
            new THREE.MeshBasicMaterial({ color: 0x7d4fd6 })
        );
        bottle.position.set(0, -0.05, 0);
        flaskGroup.add(bottle);

        const liquid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.13, 0.2, 10),
            new THREE.MeshBasicMaterial({ color: 0x8f6df2 })
        );
        liquid.position.set(0, -0.09, 0.02);
        flaskGroup.add(liquid);

        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.08, 0.1, 10),
            new THREE.MeshBasicMaterial({ color: 0x3a2f4f })
        );
        neck.position.set(0, 0.14, 0);
        flaskGroup.add(neck);

        flaskGroup.position.set(-0.55, -0.15, 0.16);
        flaskGroup.rotation.z = 0.3;
        this.mesh.add(flaskGroup);
        this.flask = flaskGroup;
    }

    initializeAbilities() {
        const ability1 = new Ability('Enchanted Blade', this.enchantedCooldown);
        ability1.use = () => true;

        const ability2 = new Ability('Alchemical Bomb', 3);
        ability2.use = (hero) => {
            if (!Ability.prototype.use.call(ability2, hero)) return false;
            hero.throwAlchemicalBomb(ability2);
            return true;
        };

        const ability3 = new Ability('Alchemical Potion', 6);
        ability3.use = (hero) => hero.drinkAlchemicalPotion(ability3);

        const ultimate = new Ability('Ultimate', 0, true);
        ultimate.use = (hero) => hero.activateDragonUltimate();

        this.setAbilities(ability1, ability2, ability3, ultimate);
        this.enchantedBaseCooldown = ability1.cooldown;
    }

    update(deltaTime, input) {
        this.lastUpdateDelta = deltaTime;
        const aim = this.getSmoothAimDirection();
        if (aim && Math.abs(aim.x) > 0.15) {
            this.setFacingDirection(aim.x >= 0 ? 1 : -1);
        } else if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }
        if (this.dragonUltimateActive) {
            this.updateDragonFlight(deltaTime, input);
            return;
        }
        if (this.isPotionHovering) {
            this.updatePotionHover(deltaTime, input);
        } else {
            super.update(deltaTime, input);
        }
        this.updateDragonUltimate(deltaTime, input);
        this.updateAlchemicalPotion(deltaTime);
        this.updateAlchemicalPotionType();
        this.updateAlchemicalBombType();
        this.updateAlchemicalFields(deltaTime);
    }

    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction;
        }
    }

    handleAbilityInput(input) {
        if (this.controlsLocked) {
            return;
        }
        if (this.isCarryingFlag && input.isFlagDropPressed()) {
            return;
        }
        this.handleEnchantedBladeInput(input);
        if (input.isAbility2Pressed() && this.abilities.w) {
            this.useAbility('w');
        }
        if (input.isAbility3Pressed() && this.abilities.e) {
            this.useAbility('e');
        }
        if (input.isUltimatePressed() && this.abilities.r) {
            this.useUltimate();
        }
    }

    getSmoothAimDirection() {
        const aimDir = this.hasAimInput ? this.getAimDirection() : { x: this.facingDirection || 1, y: 0 };
        const length = Math.hypot(aimDir.x, aimDir.y) || 1;
        return { x: aimDir.x / length, y: aimDir.y / length };
    }

    updatePotionHover(deltaTime, input) {
        this.updateStatusEffects(deltaTime);
        this.updateBonusHealth(deltaTime);
        this.updateShield(deltaTime);

        if (!Number.isFinite(this.currentHealth)) {
            this.currentHealth = 0;
            if (this.healthBar) {
                this.healthBar.setHealth(0);
            }
        }

        if (this.currentHealth <= 0) {
            this.lastDeathWasPit = false;
            this.die();
            return;
        }

        if (this.controlsLocked) {
            this.deactivatePotionHover();
            return;
        }

        for (const key in this.abilities) {
            if (this.abilities[key]) {
                this.abilities[key].update(deltaTime);
            }
        }

        if (this.ultimateCharge < this.ultimateChargeMax) {
            this.ultimateCharge += this.ultimateChargeRate * deltaTime;
            if (this.ultimateCharge > this.ultimateChargeMax) {
                this.ultimateCharge = this.ultimateChargeMax;
            }
        }

        this.velocity.x = 0;
        this.velocity.y = 0;
        const hoverSpeed = PLAYER_SPEED * 1.1 * (this.moveSpeedMultiplier || 1) * (this.slowMultiplier || 1);
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

        const deathY = Number.isFinite(this.level?.deathY) ? this.level.deathY : DEATH_Y;
        if (this.position.y < deathY) {
            this.lastDeathWasPit = true;
            this.die();
            return;
        }

        if (this.hoverCloud) {
            this.hoverCloud.position.x = this.position.x;
            this.hoverCloud.position.y = this.position.y - 0.8;
        }

        this.syncMeshPosition();
        if (this.healthBar) {
            this.healthBar.update(deltaTime);
        }
        this.updateRespawnIndicator();
        if (this.debugHitboxVisible) {
            this.updateDebugHitbox();
        }

        this.handleAbilityInput(input);
    }

    updateDragonUltimate(deltaTime, input) {
        if (!this.dragonUltimateActive) return;
        if (!this.isAlive) {
            this.endDragonUltimate();
            return;
        }
        this.dragonUltimateTimer += deltaTime;
        this.dragonFireDamageCooldown += deltaTime;

        const fireActive = Boolean(input && typeof input.isAbility1Pressed === 'function' && input.isAbility1Pressed());
        const justActivated = fireActive && !this.dragonFireWasActive;
        this.dragonFireWasActive = fireActive;
        this.dragonFireActive = fireActive;
        if (this.dragonFireGroup) {
            this.dragonFireGroup.visible = fireActive;
        }
        if (fireActive) {
            if (justActivated) {
                this.dragonFireTickTimer = 0;
            } else {
                this.dragonFireTickTimer += deltaTime;
            }
        } else {
            this.dragonFireTickTimer = 0;
        }

        const aim = this.getSmoothAimDirection();
        const length = Math.hypot(aim.x, aim.y) || 1;
        const dirX = aim.x / length;
        const dirY = aim.y / length;
        const angle = Math.atan2(dirY, dirX);

        if (this.dragonLeftWing && this.dragonRightWing) {
            const flap = Math.sin(performance.now() * 0.01) * 0.5;
            this.dragonLeftWing.rotation.z = 0.45 + flap;
            this.dragonRightWing.rotation.z = -0.45 - flap;
        }

        if (this.dragonFireGroup) {
            this.dragonFireGroup.position.set(
                this.position.x + dirX * this.dragonMouthForward,
                this.position.y + dirY * this.dragonMouthUp,
                0.3
            );
            this.dragonFireGroup.rotation.z = angle;

            if (fireActive) {
                const time = performance.now() * 0.008;
                this.dragonFireFlames.forEach((flame, index) => {
                    const phase = time + index * 0.6;
                    const scale = 0.85 + 0.2 * Math.sin(phase);
                    flame.scale.set(0.8 + 0.1 * Math.sin(phase), scale, 1);
                    flame.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(phase * 1.2));
                });
            }
        }

        if (justActivated && this.dragonFireDamageCooldown >= this.dragonFireTickInterval) {
            this.applyDragonFireDamage(dirX, dirY);
            this.dragonFireTickTimer = 0;
            this.dragonFireDamageCooldown = 0;
        }

        if (fireActive && this.dragonFireTickTimer >= this.dragonFireTickInterval) {
            this.dragonFireTickTimer -= this.dragonFireTickInterval;
            this.applyDragonFireDamage(dirX, dirY);
            this.dragonFireDamageCooldown = 0;
        }

        if (this.dragonUltimateTimer >= this.dragonUltimateDuration) {
            this.endDragonUltimate();
        }
    }

    applyDragonFireDamage(dirX, dirY) {
        const originX = this.position.x + dirX * this.dragonMouthForward;
        const originY = this.position.y + dirY * this.dragonMouthUp;
        const rightX = -dirY;
        const rightY = dirX;
        const lengthRange = this.dragonFireLength;
        const targets = this.getDamageTargets();
        targets.forEach((target) => {
            if (!target || !target.isAlive) return;
            const relX = target.position.x - originX;
            const relY = target.position.y - originY;
            const forward = relX * dirX + relY * dirY;
            const side = relX * rightX + relY * rightY;
            if (forward < 0 || forward > lengthRange) return;
            const widthAt = this.dragonFireSmallWidth
                + (this.dragonFireBigWidth - this.dragonFireSmallWidth) * (forward / lengthRange);
            const halfWidth = widthAt * 0.5;
            if (Math.abs(side) > halfWidth) return;
            if (typeof target.takeDamage === 'function') {
                target.takeDamage(this.dragonFireDamage, this);
            }
        });
    }

    updateDragonFlight(deltaTime, input) {
        this.updateStatusEffects(deltaTime);
        this.updateBonusHealth(deltaTime);
        this.updateShield(deltaTime);

        if (!Number.isFinite(this.currentHealth)) {
            this.currentHealth = 0;
            if (this.healthBar) {
                this.healthBar.setHealth(0);
            }
        }

        if (this.currentHealth <= 0) {
            this.lastDeathWasPit = false;
            this.die();
            return;
        }

        for (const key in this.abilities) {
            if (this.abilities[key]) {
                this.abilities[key].update(deltaTime);
            }
        }

        const controlsLocked = this.controlsLocked || this.forceControlsLocked;
        this.velocity.x = 0;
        this.velocity.y = 0;
        const flySpeed = PLAYER_SPEED * 1.1 * (this.moveSpeedMultiplier || 1) * (this.slowMultiplier || 1);
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

        if (!controlsLocked) {
            if (this.fearTimer > 0 && this.fearDirection) {
                this.velocity.x = flySpeed * this.fearDirection;
            } else {
                if (leftPressed) {
                    this.velocity.x = -flySpeed;
                }
                if (rightPressed) {
                    this.velocity.x = flySpeed;
                }
            }
            if (upPressed) {
                this.velocity.y = flySpeed;
            }
            if (downPressed) {
                this.velocity.y = -flySpeed;
            }
        }

        if (this.velocity.x !== 0 && this.velocity.y !== 0) {
            this.velocity.x *= 0.707;
            this.velocity.y *= 0.707;
        }

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        const deathY = Number.isFinite(this.level?.deathY) ? this.level.deathY : DEATH_Y;
        if (this.position.y < deathY) {
            this.lastDeathWasPit = true;
            this.die();
            return;
        }

        this.syncMeshPosition();
        if (this.healthBar) {
            this.healthBar.update(deltaTime);
        }
        this.updateRespawnIndicator();
        if (this.debugHitboxVisible) {
            this.updateDebugHitbox();
        }

        if (!controlsLocked) {
            if (input.isAbility1Pressed() && this.abilities.q) {
                this.useAbility('q');
            }
            if (input.isAbility2Pressed() && this.abilities.w) {
                this.useAbility('w');
            }
            if (input.isAbility3Pressed() && this.abilities.e) {
                if (!this.isCarryingFlag || !this.flagCarryBlocksAbility3) {
                    this.useAbility('e');
                }
            }
        }

        this.updateDragonUltimate(deltaTime, input);
        this.updateAlchemicalPotion(deltaTime);
        this.updateAlchemicalPotionType();
        this.updateAlchemicalBombType();
        this.updateAlchemicalFields(deltaTime);
    }

    activateDragonUltimate() {
        if (this.dragonUltimateActive) return false;
        if (this.ultimateCharge < this.ultimateChargeMax) return false;
        this.dragonUltimateActive = true;
        this.dragonUltimateTimer = 0;
        this.dragonFireTickTimer = 0;
        this.dragonFireDamageCooldown = this.dragonFireTickInterval;
        this.dragonFireActive = false;
        this.dragonFireWasActive = false;
        this.createDragonVisuals();
        this.createDragonFire();
        return true;
    }

    endDragonUltimate() {
        if (!this.dragonUltimateActive) return;
        this.dragonUltimateActive = false;
        this.dragonUltimateTimer = 0;
        this.dragonFireTickTimer = 0;
        this.dragonFireDamageCooldown = 0;
        this.dragonFireActive = false;
        this.dragonFireWasActive = false;
        this.clearDragonVisuals();
        this.clearDragonFire();
    }

    createDragonVisuals() {
        if (!this.mesh || !this.mesh.parent) return;
        if (!this.dragonOriginalColor) {
            this.dragonOriginalColor = this.baseColor;
        }
        this.setBodyColor(0x101010);

        this.dragonPrevScaleMultiplier = Number.isFinite(this.scaleMultiplier) ? this.scaleMultiplier : 1;
        this.dragonPrevHitboxScale = {
            x: this.hitboxScale?.x || 1,
            y: this.hitboxScale?.y || 1
        };
        this.scaleMultiplier = 1.5;
        this.hitboxScale = {
            x: this.dragonPrevHitboxScale.x * 1.5,
            y: this.dragonPrevHitboxScale.y * 1.5
        };

        this.dragonHiddenMeshes = [];
        if (this.sword) {
            this.dragonHiddenMeshes.push(this.sword);
            this.sword.visible = false;
        }
        if (this.flask) {
            this.dragonHiddenMeshes.push(this.flask);
            this.flask.visible = false;
        }

        const group = new THREE.Group();
        const dragonMaterial = new THREE.MeshBasicMaterial({ color: 0x101010 });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), dragonMaterial);
        head.position.set(0.55, 0.18, 0);
        group.add(head);

        const snout = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.2, 0.35),
            new THREE.MeshBasicMaterial({ color: 0x1c1c1c })
        );
        snout.position.set(0.85, 0.12, 0);
        group.add(snout);

        const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0x563c23 }));
        hornLeft.position.set(0.45, 0.42, -0.12);
        hornLeft.rotation.x = Math.PI;
        group.add(hornLeft);
        const hornRight = hornLeft.clone();
        hornRight.position.z = 0.12;
        group.add(hornRight);

        const wingMaterial = new THREE.MeshBasicMaterial({
            color: 0x1c1c1c,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const wingFrameMaterial = new THREE.MeshBasicMaterial({
            color: 0x2a2a2a,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });

        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(1.6, 0.25);
        wingShape.lineTo(2.2, 0.05);
        wingShape.lineTo(1.8, -0.35);
        wingShape.lineTo(0.2, -0.4);
        wingShape.lineTo(0, 0);
        const wingGeometry = new THREE.ShapeGeometry(wingShape);

        const createWing = (zOffset, flip) => {
            const wingGroup = new THREE.Group();
            const membrane = new THREE.Mesh(wingGeometry, wingMaterial);
            membrane.scale.x = flip ? -1 : 1;
            wingGroup.add(membrane);

            const rib1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.02), wingFrameMaterial);
            rib1.position.set(flip ? -0.7 : 0.7, -0.05, 0.01);
            rib1.rotation.z = flip ? -0.08 : 0.08;
            wingGroup.add(rib1);

            const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.02), wingFrameMaterial);
            rib2.position.set(flip ? -1.2 : 1.2, 0.1, 0.01);
            rib2.rotation.z = flip ? -0.22 : 0.22;
            wingGroup.add(rib2);

            const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.02), wingFrameMaterial);
            wingTip.position.set(flip ? -2.0 : 2.0, -0.2, 0.02);
            wingTip.rotation.z = flip ? -0.35 : 0.35;
            wingGroup.add(wingTip);

            wingGroup.scale.set(0.5, 0.5, 1);
            wingGroup.position.set(-0.1, 0.12, zOffset);
            wingGroup.rotation.z = flip ? -0.55 : 0.55;
            return wingGroup;
        };

        const leftWing = createWing(-0.65, false);
        group.add(leftWing);
        const rightWing = createWing(0.65, true);
        group.add(rightWing);

        const tail = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.18, 0.18),
            new THREE.MeshBasicMaterial({ color: 0x181818 })
        );
        tail.position.set(-0.6, -0.05, 0);
        tail.rotation.z = -0.2;
        group.add(tail);

        group.position.set(0, 0.05, 0);
        this.mesh.add(group);
        this.dragonVisualGroup = group;
        this.dragonLeftWing = leftWing;
        this.dragonRightWing = rightWing;
    }

    clearDragonVisuals() {
        if (this.dragonVisualGroup && this.dragonVisualGroup.parent) {
            this.dragonVisualGroup.parent.remove(this.dragonVisualGroup);
        }
        this.dragonVisualGroup = null;
        this.dragonLeftWing = null;
        this.dragonRightWing = null;
        if (this.dragonOriginalColor) {
            this.setBodyColor(this.dragonOriginalColor);
        }
        this.dragonOriginalColor = null;
        if (Number.isFinite(this.dragonPrevScaleMultiplier)) {
            this.scaleMultiplier = this.dragonPrevScaleMultiplier;
        }
        if (this.dragonPrevHitboxScale) {
            this.hitboxScale = {
                x: this.dragonPrevHitboxScale.x,
                y: this.dragonPrevHitboxScale.y
            };
        }
        this.dragonPrevScaleMultiplier = null;
        this.dragonPrevHitboxScale = null;
        if (this.dragonHiddenMeshes && this.dragonHiddenMeshes.length) {
            this.dragonHiddenMeshes.forEach((mesh) => {
                if (mesh) mesh.visible = true;
            });
        }
        this.dragonHiddenMeshes = [];
    }

    createDragonFire() {
        if (!this.mesh || !this.mesh.parent) return;
        const group = new THREE.Group();
        const shape = new THREE.Shape();
        const small = this.dragonFireSmallWidth;
        const large = this.dragonFireBigWidth;
        const length = this.dragonFireLength;
        shape.moveTo(0, -small * 0.5);
        shape.lineTo(0, small * 0.5);
        shape.lineTo(length, large * 0.5);
        shape.lineTo(length, -large * 0.5);
        shape.closePath();
        const baseGeometry = new THREE.ShapeGeometry(shape);
        baseGeometry.computeBoundingBox();
        const minX = baseGeometry.boundingBox ? baseGeometry.boundingBox.min.x : 0;
        if (minX !== 0) {
            baseGeometry.translate(-minX, 0, 0);
        }
        const base = new THREE.Mesh(
            baseGeometry,
            new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.25, depthTest: false })
        );
        base.position.set(0, 0, 0);
        group.add(base);

        const flames = [];
        const flameCount = 6;
        for (let i = 0; i < flameCount; i += 1) {
            const flame = new THREE.Mesh(
                new THREE.ConeGeometry(0.18, 0.6, 8),
                new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.8, depthTest: false })
            );
            const t = (i + 1) / flameCount;
            const widthAt = small + (large - small) * t;
            const offsetY = (i % 2 === 0 ? 0.35 : -0.35) * (widthAt / large);
            flame.position.set(0.6 + i * (length / flameCount), offsetY, 0.02);
            group.add(flame);
            flames.push(flame);
        }
        group.renderOrder = 12;
        this.mesh.parent.add(group);
        this.dragonFireGroup = group;
        this.dragonFireFlames = flames;
        group.visible = false;
    }

    clearDragonFire() {
        if (this.dragonFireGroup && this.dragonFireGroup.parent) {
            this.dragonFireGroup.parent.remove(this.dragonFireGroup);
        }
        this.dragonFireGroup = null;
        this.dragonFireFlames = [];
    }

    rollAlchemicalPotionType() {
        const options = this.alchemicalPotionTypes || [];
        if (!options.length) return 'healing';
        const index = Math.floor(Math.random() * options.length);
        return options[index];
    }

    fillAlchemicalPotionQueue() {
        while (this.alchemicalPotionQueue.length < 1) {
            this.alchemicalPotionQueue.push(this.rollAlchemicalPotionType());
        }
    }

    updateAlchemicalPotionType() {
        const ability = this.abilities?.e;
        if (!ability) return;
        if (!Array.isArray(this.alchemicalPotionQueue)) {
            this.alchemicalPotionQueue = [];
        }
        if (ability.isReady && !this.alchemicalPotionWasReady) {
            this.fillAlchemicalPotionQueue();
        }
        this.alchemicalPotionWasReady = ability.isReady;
        if (!this.alchemicalPotionQueue.length) {
            this.fillAlchemicalPotionQueue();
        }
    }

    drinkAlchemicalPotion(ability) {
        if (!ability || !ability.isReady || this.alchemicalPotionActive) return false;
        this.alchemicalPotionActive = true;
        if (!Array.isArray(this.alchemicalPotionQueue)) {
            this.alchemicalPotionQueue = [];
        }
        this.alchemicalPotionType = this.alchemicalPotionQueue[0] || this.rollAlchemicalPotionType();
        if (this.alchemicalPotionQueue.length) {
            this.alchemicalPotionQueue.shift();
        }
        this.fillAlchemicalPotionQueue();
        this.alchemicalPotionAbility = ability;
        this.alchemicalPotionTimer = 0;
        this.alchemicalPotionHealRate = 0;
        this.alchemicalPotionDamageMultiplier = 1;
        this.alchemicalPotionAreaMultiplier = 1;
        this.alchemicalPotionAwaitShield = false;
        this.alchemicalPotionShieldAmount = 0;
        this.alchemicalPotionCooldownStarted = false;

        ability.isReady = false;
        ability.currentCooldown = 0;

        this.storePotionRestoreState();
        this.applyAlchemicalPotionEffect(this.alchemicalPotionType);
        return true;
    }

    storePotionRestoreState() {
        if (this.alchemicalPotionRestore) return;
        this.alchemicalPotionRestore = {
            moveSpeedMultiplier: this.moveSpeedMultiplier || 1,
            enchantedAttackRate: this.enchantedAttackRate,
            enchantedCooldown: this.enchantedCooldown,
            abilityQCooldown: this.abilities?.q?.cooldown ?? this.enchantedCooldown,
            maxJumps: this.maxJumps,
            jumpMultiplier: Number.isFinite(this.jumpMultiplier) ? this.jumpMultiplier : 1,
            scaleMultiplier: Number.isFinite(this.scaleMultiplier) ? this.scaleMultiplier : 1,
            hitboxScale: {
                x: this.hitboxScale?.x || 1,
                y: this.hitboxScale?.y || 1
            }
        };
    }

    applyAlchemicalPotionEffect(type) {
        const duration = 4;
        if (type === 'shield') {
            this.addShield(50);
            this.alchemicalPotionAwaitShield = true;
            this.alchemicalPotionShieldAmount = this.shieldStatus?.amount || 0;
            if (this.alchemicalPotionAbility) {
                this.alchemicalPotionAbility.currentCooldown = this.alchemicalPotionAbility.cooldown;
                this.alchemicalPotionAbility.isReady = false;
                this.alchemicalPotionCooldownStarted = true;
            }
            this.endAlchemicalPotionEffect();
            return;
        }

        if (type === 'haste') {
            this.alchemicalPotionTimer = duration;
            this.moveSpeedMultiplier = (this.alchemicalPotionRestore?.moveSpeedMultiplier || 1) * 1.4;
            this.enchantedAttackRate = 0.2;
            this.enchantedCooldown = 0.5;
            if (this.abilities?.q) {
                this.abilities.q.cooldown = this.enchantedCooldown;
            }
            return;
        }

        if (type === 'healing') {
            this.alchemicalPotionTimer = duration;
            this.alchemicalPotionHealRate = 10;
            return;
        }

        if (type === 'jump') {
            this.alchemicalPotionTimer = duration;
            this.maxJumps = 3;
            this.jumpsRemaining = Math.max(this.jumpsRemaining || 0, this.maxJumps);
            this.jumpMultiplier = (this.alchemicalPotionRestore?.jumpMultiplier || 1) * 1.4;
            return;
        }

        if (type === 'levitation') {
            this.alchemicalPotionTimer = duration;
            this.activatePotionHover();
            return;
        }

        if (type === 'growth') {
            this.alchemicalPotionTimer = duration;
            this.alchemicalPotionDamageMultiplier = 1.4;
            this.alchemicalPotionAreaMultiplier = 1.4;
            this.scaleMultiplier = 1.4;
            const baseHitbox = this.alchemicalPotionRestore?.hitboxScale || { x: 1, y: 1 };
            this.hitboxScale = { x: baseHitbox.x * 1.4, y: baseHitbox.y * 1.4 };
            this.jumpMultiplier = (this.alchemicalPotionRestore?.jumpMultiplier || 1) * 1.4;
            return;
        }
    }

    updateAlchemicalPotion(deltaTime) {
        if (!this.alchemicalPotionActive) return;

        if (this.alchemicalPotionHealRate > 0) {
            this.heal(this.alchemicalPotionHealRate * deltaTime);
        }

        if (this.alchemicalPotionAwaitShield) {
            const shieldAmount = this.shieldStatus?.amount || 0;
            if (shieldAmount <= 0 || shieldAmount > this.alchemicalPotionShieldAmount) {
                this.endAlchemicalPotionEffect();
            }
            return;
        }

        if (this.alchemicalPotionTimer > 0) {
            this.alchemicalPotionTimer -= deltaTime;
            if (this.alchemicalPotionTimer <= 0) {
                this.endAlchemicalPotionEffect();
            }
        }
    }

    endAlchemicalPotionEffect() {
        if (!this.alchemicalPotionActive) return;
        this.alchemicalPotionActive = false;
        this.alchemicalPotionType = null;
        this.alchemicalPotionTimer = 0;
        this.alchemicalPotionHealRate = 0;
        this.alchemicalPotionAwaitShield = false;
        this.alchemicalPotionShieldAmount = 0;
        this.alchemicalPotionDamageMultiplier = 1;
        this.alchemicalPotionAreaMultiplier = 1;
        const cooldownStarted = this.alchemicalPotionCooldownStarted;
        this.alchemicalPotionCooldownStarted = false;

        if (this.isPotionHovering) {
            this.deactivatePotionHover();
        }

        const restore = this.alchemicalPotionRestore;
        if (restore) {
            this.moveSpeedMultiplier = restore.moveSpeedMultiplier;
            this.enchantedAttackRate = restore.enchantedAttackRate;
            this.enchantedCooldown = restore.enchantedCooldown;
            if (this.abilities?.q) {
                this.abilities.q.cooldown = restore.abilityQCooldown;
            }
            this.maxJumps = restore.maxJumps;
            this.jumpMultiplier = restore.jumpMultiplier;
            this.scaleMultiplier = restore.scaleMultiplier;
            this.hitboxScale = { x: restore.hitboxScale.x, y: restore.hitboxScale.y };
            if (this.jumpsRemaining > this.maxJumps) {
                this.jumpsRemaining = this.maxJumps;
            }
        }
        this.alchemicalPotionRestore = null;

        const ability = this.alchemicalPotionAbility || this.abilities?.e;
        if (ability && !cooldownStarted) {
            ability.currentCooldown = ability.cooldown;
            ability.isReady = false;
        }
        this.alchemicalPotionAbility = null;
    }

    activatePotionHover() {
        if (this.isPotionHovering) return;
        this.isPotionHovering = true;
        if (typeof this.setFallDamageGrace === 'function') {
            this.setFallDamageGrace(0.6);
        }

        this.hoverCloud = new THREE.Group();
        const cloudCircle1 = new THREE.CircleGeometry(0.6, 16);
        const cloudCircle2 = new THREE.CircleGeometry(0.5, 16);
        const cloudCircle3 = new THREE.CircleGeometry(0.4, 16);

        const cloudMaterial1 = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.4 });
        const cloudMaterial2 = new THREE.MeshBasicMaterial({ color: 0x0d0d0d, transparent: true, opacity: 0.5 });
        const cloudMaterial3 = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });

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

        this.hoverTrailParticles = [];
        this.position.y += 0.5;

        this.hoverAnimationInterval = setInterval(() => {
            const trailGeometry = new THREE.CircleGeometry(0.2 + Math.random() * 0.15, 12);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x1a1a1a : 0x0d0d0d,
                transparent: true,
                opacity: 0.3
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
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
    }

    deactivatePotionHover() {
        if (!this.isPotionHovering) return;
        this.isPotionHovering = false;

        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        if (this.hoverAnimationInterval) {
            clearInterval(this.hoverAnimationInterval);
            this.hoverAnimationInterval = null;
        }

        if (this.hoverCloud) {
            this.mesh.parent.remove(this.hoverCloud);
            this.hoverCloud = null;
        }

        if (this.hoverTrailParticles) {
            this.hoverTrailParticles.forEach((particle) => {
                if (particle.mesh.parent) {
                    this.mesh.parent.remove(particle.mesh);
                }
            });
            this.hoverTrailParticles = [];
        }
    }

    getPotionDamageMultiplier() {
        return Number.isFinite(this.alchemicalPotionDamageMultiplier) ? this.alchemicalPotionDamageMultiplier : 1;
    }

    getPotionAreaMultiplier() {
        return Number.isFinite(this.alchemicalPotionAreaMultiplier) ? this.alchemicalPotionAreaMultiplier : 1;
    }

    getPotionDamageValue(baseDamage) {
        const multiplier = this.getPotionDamageMultiplier();
        return Math.round(baseDamage * multiplier);
    }

    handleEnchantedBladeInput(input) {
        const ability = this.abilities.q;
        if (!ability) return;
        const pressed = input.isAbility1Pressed();
        const now = performance.now();

        if (this.enchantedThrown && !this.enchantedReturning) {
            if (pressed && !this.enchantedLastPressed && ability.isReady && ability.currentCooldown <= 0) {
                this.recallEnchantedBlade(ability);
            }
            this.enchantedLastPressed = pressed;
            return;
        }

        if (!pressed && this.enchantedHoldActive) {
            const heldLong = this.enchantedHoldTime >= this.enchantedHoldThreshold;
            this.enchantedHoldActive = false;
            this.enchantedHoldTime = 0;
            if (ability.isReady && ability.currentCooldown <= 0) {
                if (heldLong) {
                    this.throwEnchantedBlade(ability);
                } else {
                    this.performEnchantedSwing(ability, now);
                }
            }
        } else if (pressed) {
            if (!this.enchantedHoldActive && !this.enchantedLastPressed) {
                this.enchantedHoldActive = true;
                this.enchantedHoldTime = 0;
            }
            if (this.enchantedHoldActive) {
                this.enchantedHoldTime += this.lastUpdateDelta || 0;
            }
        }

        this.enchantedLastPressed = pressed;
    }

    performEnchantedSwing(ability, now) {
        if (ability.currentCooldown > 0 || !ability.isReady) return;
        if (now < this.enchantedNextSwingTime) return;

        if (now - this.enchantedLastSwingTime > this.enchantedComboResetMs) {
            this.enchantedComboStep = 0;
        }
        this.enchantedComboStep = Math.min(5, this.enchantedComboStep + 1);
        this.enchantedLastSwingTime = now;
        this.enchantedNextSwingTime = now + this.enchantedAttackRate * 1000;

        const direction = this.getSmoothAimDirection();
        const aimAngle = Math.atan2(direction.y, direction.x);
        const arcSpan = Math.PI * 0.95;
        const swingStart = aimAngle - arcSpan * 0.5;
        const swingEnd = aimAngle + arcSpan * 0.5;
        const swingDuration = 160;

        if (this.sword) {
            const offsetX = this.swordBase.x + direction.x * 0.08;
            const offsetY = direction.y > 0.25 ? 0.4 : this.swordBase.y + 0.05;
            this.sword.position.x = offsetX;
            this.sword.position.y = offsetY;
            this.animateSwordSwing(offsetX, offsetY, swingStart, swingEnd, swingDuration);
        }

        const damage = this.enchantedComboStep <= 3 ? 5 : 10;
        const scaledDamage = this.getPotionDamageValue(damage);
        setTimeout(() => {
            this.createEnchantedSlashTrail(swingStart, swingEnd, direction);
        }, Math.max(40, swingDuration * 0.35));
        setTimeout(() => {
            this.applyEnchantedBladeDamage(direction, scaledDamage);
        }, Math.max(60, swingDuration * 0.6));

        if (this.enchantedComboResetTimer) {
            clearTimeout(this.enchantedComboResetTimer);
        }
        this.enchantedComboResetTimer = setTimeout(() => {
            this.enchantedComboStep = 0;
        }, this.enchantedComboResetMs + 200);

        if (this.enchantedComboStep >= 5) {
            this.startEnchantedCooldown(ability);
            this.enchantedComboStep = 0;
        }
    }

    animateSwordSwing(x, y, startAngle, endAngle, durationMs) {
        if (!this.sword) return;
        const startTime = performance.now();
        const originalRot = this.sword.rotation.z;
        const tick = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, elapsed / durationMs);
            const eased = Math.sin(t * Math.PI * 0.5);
            this.sword.rotation.z = startAngle + (endAngle - startAngle) * eased;
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                this.sword.rotation.z = originalRot;
                this.sword.position.x = x;
                this.sword.position.y = y;
            }
        };
        tick();
    }

    createEnchantedSlashTrail(startAngle, endAngle, direction) {
        if (!this.mesh || !this.mesh.parent) return;
        const slashGroup = new THREE.Group();
        const arcSpan = Math.max(0.2, endAngle - startAngle);
        const dirX = direction.x || 0;
        const dirY = direction.y || 0;
        const areaMultiplier = this.getPotionAreaMultiplier();
        const baseX = dirX * 0.25 * areaMultiplier;
        const baseY = (dirY * 0.18 + (dirY > 0.25 ? 0.2 : 0.06)) * areaMultiplier;
        const outerRadius = 1.1 * areaMultiplier;
        const innerRadius = 0.6 * areaMultiplier;
        const segments = Math.max(12, Math.round(arcSpan / (Math.PI / 16)));
        const tint = 0xd9d2ff;

        const arcGeometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            segments,
            1,
            startAngle,
            arcSpan
        );
        const arcMaterial = new THREE.MeshBasicMaterial({
            color: tint,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const arcMesh = new THREE.Mesh(arcGeometry, arcMaterial);
        arcMesh.position.set(baseX, baseY, 0);
        slashGroup.add(arcMesh);

        const glowGeometry = new THREE.RingGeometry(
            innerRadius * 0.7,
            innerRadius,
            segments,
            1,
            startAngle,
            arcSpan
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: tint,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.set(baseX, baseY, 0.01);
        slashGroup.add(glowMesh);

        const tipGeometry = new THREE.PlaneGeometry(0.36, 0.18);
        const tipMaterial = new THREE.MeshBasicMaterial({
            color: 0xf2ecff,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const tipMesh = new THREE.Mesh(tipGeometry, tipMaterial);
        const tipAngle = startAngle + arcSpan;
        const tipRadius = outerRadius * 0.9;
        tipMesh.position.set(
            baseX + Math.cos(tipAngle) * tipRadius,
            baseY + Math.sin(tipAngle) * tipRadius,
            0.02
        );
        tipMesh.rotation.z = tipAngle - Math.PI / 2;
        slashGroup.add(tipMesh);

        const followZ = 0.2;
        slashGroup.position.set(this.position.x, this.position.y, followZ);
        this.mesh.parent.add(slashGroup);

        const startTime = performance.now();
        const durationMs = 160;
        const animInterval = setInterval(() => {
            slashGroup.position.set(this.position.x, this.position.y, followZ);
            const t = (performance.now() - startTime) / durationMs;
            if (t >= 1) {
                clearInterval(animInterval);
                this.mesh.parent.remove(slashGroup);
                return;
            }
            const eased = 1 - Math.pow(1 - t, 2);
            const opacity = Math.max(0, 0.85 * (1 - eased));
            const scale = 0.95 + eased * 0.16;
            arcMaterial.opacity = opacity;
            glowMaterial.opacity = opacity * 0.7;
            tipMaterial.opacity = opacity * 0.85;
            slashGroup.scale.set(scale, scale, 1);
        }, 16);
    }

    applyEnchantedBladeDamage(direction, damage) {
        const dirX = Number.isFinite(direction.x) ? direction.x : (this.facingDirection || 1);
        const dirY = Number.isFinite(direction.y) ? direction.y : 0;
        const length = Math.hypot(dirX, dirY) || 1;
        const normX = dirX / length;
        const normY = dirY / length;
        const areaMultiplier = this.getPotionAreaMultiplier();
        const range = 2.1 * areaMultiplier;
        const centerX = this.position.x + normX * range * 0.6;
        const centerY = this.position.y + normY * range * 0.4;
        const halfW = (0.95 + Math.abs(normX) * 0.5) * areaMultiplier;
        const halfH = (0.7 + Math.abs(normY) * 0.4) * areaMultiplier;
        const bounds = {
            left: centerX - halfW,
            right: centerX + halfW,
            top: centerY + halfH,
            bottom: centerY - halfH
        };

        for (const enemy of this.getDamageTargets()) {
            if (!enemy || !enemy.isAlive) continue;
            const enemyBounds = enemy.getBounds();
            if (!enemyBounds) continue;
            if (checkAABBCollision(bounds, enemyBounds)) {
                if (typeof enemy.takeDamage === 'function') {
                    enemy.takeDamage(damage, this);
                }
                if (enemy.type === 'player') {
                    this.addUltimateCharge(this.ultimateChargePerKill);
                }
            }
        }
    }

    throwEnchantedBlade(ability) {
        if (this.enchantedThrown || ability.currentCooldown > 0 || !ability.isReady) return;
        const direction = this.getSmoothAimDirection();
        const len = Math.hypot(direction.x, direction.y) || 1;
        const dirX = direction.x / len;
        const dirY = direction.y / len;

        const bladeGroup = new THREE.Group();
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.2, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x3b2a1a })
        );
        handle.position.set(0, -0.05, 0);
        bladeGroup.add(handle);

        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.05, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x2e2e2e })
        );
        guard.position.set(0, 0.05, 0);
        bladeGroup.add(guard);

        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.6, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xc9ced6 })
        );
        blade.position.set(0, 0.36, 0);
        bladeGroup.add(blade);

        bladeGroup.scale.set(1.5, 1.5, 1.1);
        bladeGroup.position.set(this.position.x + dirX * 0.7, this.position.y + dirY * 0.6, 0.2);
        bladeGroup.rotation.z = Math.atan2(dirY, dirX) - Math.PI / 2;
        this.mesh.parent.add(bladeGroup);

        if (this.sword) {
            this.sword.visible = false;
        }
        this.enchantedThrown = true;
        this.enchantedReturning = false;
        this.enchantedStuck = false;
        const hitThrow = new Set();
        const hitReturn = new Set();
        const velocity = { x: dirX * this.enchantedThrowSpeed, y: dirY * this.enchantedThrowSpeed };
        const level = this.level || { platforms: [] };
        let traveled = 0;
        let lastX = bladeGroup.position.x;
        let lastY = bladeGroup.position.y;

        const interval = setInterval(() => {
            if (!bladeGroup.parent) {
                clearInterval(interval);
                return;
            }

            if (!this.enchantedReturning) {
                if (!this.enchantedStuck) {
                    bladeGroup.position.x += velocity.x * 0.016;
                    bladeGroup.position.y += velocity.y * 0.016;
                    const dx = bladeGroup.position.x - lastX;
                    const dy = bladeGroup.position.y - lastY;
                    traveled += Math.hypot(dx, dy);
                    lastX = bladeGroup.position.x;
                    lastY = bladeGroup.position.y;
                    if (traveled >= this.enchantedMaxThrowDistance) {
                        this.enchantedStuck = true;
                        velocity.x = 0;
                        velocity.y = 0;
                        bladeGroup.rotation.z = 0;
                        bladeGroup.userData.stuckMode = 'float';
                        bladeGroup.userData.floatPhase = 0;
                        bladeGroup.userData.floatBaseY = bladeGroup.position.y;
                    }
                } else {
                    if (bladeGroup.userData.stuckMode === 'float') {
                        const phase = (bladeGroup.userData.floatPhase || 0) + 0.12;
                        bladeGroup.userData.floatPhase = phase;
                        const baseY = bladeGroup.userData.floatBaseY ?? bladeGroup.position.y;
                        bladeGroup.position.y = baseY + Math.sin(phase) * 0.05;
                    }
                }
            } else {
                const toX = this.position.x - bladeGroup.position.x;
                const toY = this.position.y - bladeGroup.position.y;
                const dist = Math.hypot(toX, toY) || 1;
                const step = this.enchantedReturnSpeed * 0.016;
                if (dist <= step || dist < 0.4) {
                    clearInterval(interval);
                    if (bladeGroup.parent) bladeGroup.parent.remove(bladeGroup);
                    this.enchantedThrown = false;
                    this.enchantedReturning = false;
                    if (this.sword) {
                        this.sword.visible = true;
                    }
                    this.startEnchantedCooldown(ability);
                    return;
                }
                bladeGroup.position.x += (toX / dist) * step;
                bladeGroup.position.y += (toY / dist) * step;
                bladeGroup.rotation.z = Math.atan2(toY, toX) - Math.PI / 2;
            }

            const hitRadius = 0.18 * this.getPotionAreaMultiplier();
            const bounds = {
                left: bladeGroup.position.x - hitRadius,
                right: bladeGroup.position.x + hitRadius,
                top: bladeGroup.position.y + hitRadius,
                bottom: bladeGroup.position.y - hitRadius
            };

            const hits = this.enchantedReturning ? hitReturn : hitThrow;
            for (const enemy of this.getDamageTargets()) {
                if (!enemy || !enemy.isAlive) continue;
                if (hits.has(enemy)) continue;
                const enemyBounds = enemy.getBounds();
                if (!enemyBounds) continue;
                if (checkAABBCollision(bounds, enemyBounds)) {
                    if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(this.getPotionDamageValue(10), this);
                    }
                    if (enemy.type === 'player') {
                        this.addUltimateCharge(this.ultimateChargePerKill);
                    }
                    hits.add(enemy);
                }
            }

            if (!this.enchantedReturning && level.platforms && !this.enchantedStuck) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(bounds, platform.bounds)) {
                        this.enchantedStuck = true;
                        velocity.x = 0;
                        velocity.y = 0;
                        bladeGroup.userData.stuckMode = 'embed';
                        return;
                    }
                }
            }
        }, 16);

        this.enchantedProjectile = { mesh: bladeGroup, interval };
    }

    recallEnchantedBlade(ability) {
        if (!this.enchantedThrown || this.enchantedReturning) return;
        if (ability.currentCooldown > 0 || !ability.isReady) return;
        this.enchantedReturning = true;
        this.enchantedStuck = false;
        if (this.enchantedProjectile?.mesh?.userData) {
            this.enchantedProjectile.mesh.userData.stuckMode = null;
        }
    }

    startEnchantedCooldown(ability) {
        ability.currentCooldown = this.enchantedCooldown;
        ability.isReady = false;
        this.enchantedNextSwingTime = performance.now() + this.enchantedCooldown * 1000;
    }

    updateAlchemicalBombType() {
        const ability = this.abilities?.w;
        if (!ability) return;
        if (!Array.isArray(this.alchemicalBombQueue)) {
            this.alchemicalBombQueue = [];
        }
        if (ability.isReady && !this.alchemicalBombWasReady) {
            this.fillAlchemicalBombQueue();
        }
        this.alchemicalBombWasReady = ability.isReady;
        if (!this.alchemicalBombQueue.length) {
            this.fillAlchemicalBombQueue();
        }
    }

    rollAlchemicalBombType() {
        const options = this.alchemicalBombTypes || [];
        if (!options.length) {
            return 'fire';
        }
        const index = Math.floor(Math.random() * options.length);
        return options[index];
    }

    fillAlchemicalBombQueue() {
        while (this.alchemicalBombQueue.length < 3) {
            this.alchemicalBombQueue.push(this.rollAlchemicalBombType());
        }
    }

    throwAlchemicalBomb(ability) {
        if (!this.mesh || !this.mesh.parent) return;
        const type = this.alchemicalBombQueue[0] || this.rollAlchemicalBombType();
        if (this.alchemicalBombQueue.length) {
            this.alchemicalBombQueue.shift();
        }
        this.fillAlchemicalBombQueue();
        const aim = this.getSmoothAimDirection();
        const dirX = Number.isFinite(aim.x) ? aim.x : (this.facingDirection || 1);
        const dirY = Number.isFinite(aim.y) ? aim.y : 0;
        const length = Math.hypot(dirX, dirY) || 1;
        const vel = {
            x: (dirX / length) * this.alchemicalBombSpeed,
            y: (dirY / length) * this.alchemicalBombSpeed
        };
        const gravity = this.alchemicalBombGravity;
        const colorMap = {
            fire: 0xff5a2a,
            freeze: 0x8fd7ff,
            oil: 0x1b3f24,
            holy: 0xf2c34a,
            fear: 0x0a0a0a,
            disorient: 0x8b4bd8,
            fragmentation: 0x9a9a9a,
            lightning: 0x3b78ff
        };

        const bombGroup = new THREE.Group();
        const bottle = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x2f2f38 })
        );
        bottle.position.set(0, -0.05, 0);
        bombGroup.add(bottle);

        const liquid = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 16, 16),
            new THREE.MeshBasicMaterial({ color: colorMap[type] || 0xffffff })
        );
        liquid.position.set(0, -0.06, 0.02);
        bombGroup.add(liquid);

        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.1, 0.18, 12),
            new THREE.MeshBasicMaterial({ color: 0x3a3a44 })
        );
        neck.position.set(0, 0.18, 0);
        bombGroup.add(neck);

        const cork = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10),
            new THREE.MeshBasicMaterial({ color: 0x5a3a1f })
        );
        cork.position.set(0, 0.3, 0);
        bombGroup.add(cork);

        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 12, 12),
            new THREE.MeshBasicMaterial({ color: colorMap[type] || 0xffffff, transparent: true, opacity: 0.25 })
        );
        bombGroup.add(glow);
        bombGroup.position.set(
            this.position.x + (dirX / length) * 0.6,
            this.position.y + (dirY / length) * 0.6 + 0.2,
            0.25
        );
        this.mesh.parent.add(bombGroup);

        const level = this.level || { platforms: [] };
        const startTime = performance.now();
        const interval = setInterval(() => {
            if (!bombGroup.parent) {
                clearInterval(interval);
                return;
            }
            bombGroup.position.x += vel.x * 0.016;
            vel.y += gravity * 0.016;
            bombGroup.position.y += vel.y * 0.016;
            bombGroup.rotation.z += 0.35;

            const bounds = {
                left: bombGroup.position.x - 0.2,
                right: bombGroup.position.x + 0.2,
                top: bombGroup.position.y + 0.2,
                bottom: bombGroup.position.y - 0.2
            };

            for (const enemy of this.getDamageTargets()) {
                if (!enemy || !enemy.isAlive) continue;
                const enemyBounds = enemy.getBounds();
                if (enemyBounds && checkAABBCollision(bounds, enemyBounds)) {
                    clearInterval(interval);
                    if (bombGroup.parent) bombGroup.parent.remove(bombGroup);
                    this.explodeAlchemicalBomb({ x: bounds.left + 0.2, y: bounds.bottom + 0.2 }, type);
                    return;
                }
            }

            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(bounds, platform.bounds)) {
                        clearInterval(interval);
                        if (bombGroup.parent) bombGroup.parent.remove(bombGroup);
                        this.explodeAlchemicalBomb({ x: bounds.left + 0.2, y: bounds.bottom + 0.2 }, type);
                        return;
                    }
                }
            }

            if (performance.now() - startTime > 3000) {
                clearInterval(interval);
                if (bombGroup.parent) bombGroup.parent.remove(bombGroup);
                this.explodeAlchemicalBomb({ x: bombGroup.position.x, y: bombGroup.position.y }, type);
            }
        }, 16);
    }

    explodeAlchemicalBomb(position, type) {
        const radius = (this.alchemicalBombRadius || 2) * this.getPotionAreaMultiplier();
        this.spawnAlchemicalExplosionRing(position, radius, type);
        const targets = this.getDamageTargets();
        const players = this.getAllPlayers ? this.getAllPlayers() : [];

        const inRadius = (target) => {
            if (!target || !target.position) return false;
            const dx = target.position.x - position.x;
            const dy = target.position.y - position.y;
            return Math.hypot(dx, dy) <= radius;
        };

        if (type === 'fire') {
            targets.forEach((target) => {
                if (target.type !== 'player') return;
                if (this.isSameTeam && this.isSameTeam(target)) return;
                if (!inRadius(target)) return;
                if (typeof target.applyBurning === 'function') {
                    target.applyBurning(1, this.getPotionDamageValue(5), 0.5, this);
                }
            });
            const groundY = this.findGroundBelow(position.x, position.y);
            if (Number.isFinite(groundY)) {
                this.alchemicalFireFields.push(
                    this.createFireField({ x: position.x, y: groundY }, radius, this.getPotionDamageValue(10))
                );
            }
            return;
        }

        if (type === 'freeze') {
            this.spawnFreezeSnow(position, radius);
            targets.forEach((target) => {
                if (!inRadius(target)) return;
                if (target.type === 'player' && typeof target.setFrozen === 'function') {
                    target.setFrozen(0.5);
                }
                if (typeof target.takeDamage === 'function') {
                    target.takeDamage(this.getPotionDamageValue(10), this);
                }
            });
            return;
        }

        if (type === 'oil') {
            targets.forEach((target) => {
                if (target.type !== 'player') return;
                if (this.isSameTeam && this.isSameTeam(target)) return;
                if (!inRadius(target)) return;
                if (typeof target.setSlow === 'function') {
                    target.setSlow(1, 0.6);
                }
            });
            const groundY = this.findGroundBelow(position.x, position.y);
            if (Number.isFinite(groundY)) {
                this.alchemicalOilFields.push(this.createOilField({ x: position.x, y: groundY }, radius));
            }
            return;
        }

        if (type === 'holy') {
            const groundY = this.findGroundBelow(position.x, position.y);
            if (Number.isFinite(groundY)) {
                this.alchemicalHolyFields.push(this.createHolyField({ x: position.x, y: groundY }, radius, 5));
            }
            return;
        }

        if (type === 'fear') {
            this.spawnFearSpirits(position, radius);
            targets.forEach((target) => {
                if (target.type !== 'player') return;
                if (this.isSameTeam && this.isSameTeam(target)) return;
                if (!inRadius(target)) return;
                if (typeof target.applyFear === 'function') {
                    target.applyFear(this.position.x, 0.5);
                }
                if (typeof target.takeDamage === 'function') {
                    target.takeDamage(this.getPotionDamageValue(10), this);
                }
            });
            return;
        }

        if (type === 'disorient') {
            this.spawnDisorientSwirl(position, radius, 1.5);
            targets.forEach((target) => {
                if (target.type !== 'player') return;
                if (this.isSameTeam && this.isSameTeam(target)) return;
                if (!inRadius(target)) return;
                if (typeof target.applyDisorient === 'function') {
                    target.applyDisorient(1.5);
                }
            });
            return;
        }

        if (type === 'lightning') {
            this.alchemicalLightningFields.push(
                this.createLightningField(position, radius, this.getPotionDamageValue(10), 0.5, 1.5)
            );
            return;
        }

        if (type === 'fragmentation') {
            this.spawnFragmentationShards(position, radius);
            targets.forEach((target) => {
                if (!inRadius(target)) return;
                if (typeof target.takeDamage === 'function') {
                    target.takeDamage(this.getPotionDamageValue(30), this);
                }
            });
            return;
        }
    }

    findGroundBelow(x, y) {
        let groundLevel = Number.NEGATIVE_INFINITY;
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

        return foundGround ? groundLevel : null;
    }

    spawnAlchemicalExplosionRing(position, radius, type) {
        if (!this.mesh || !this.mesh.parent) return;
        const colorMap = {
            fire: 0xff5a2a,
            freeze: 0x8fd7ff,
            oil: 0x1b3f24,
            holy: 0xf2c34a,
            fear: 0x0a0a0a,
            disorient: 0x8b4bd8,
            fragmentation: 0x9a9a9a,
            lightning: 0x3b78ff
        };
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.55, radius * 0.95, 28),
            new THREE.MeshBasicMaterial({ color: colorMap[type] || 0xffffff, transparent: true, opacity: 0.65 })
        );
        ring.position.set(position.x, position.y, 0.2);
        this.mesh.parent.add(ring);
        let opacity = 0.65;
        const interval = setInterval(() => {
            opacity -= 0.08;
            ring.material.opacity = Math.max(0, opacity);
            ring.scale.multiplyScalar(1.05);
            if (opacity <= 0) {
                clearInterval(interval);
                if (ring.parent) ring.parent.remove(ring);
            }
        }, 40);
    }

    createFireField(position, radius, damagePerTick = 10) {
        if (!this.mesh || !this.mesh.parent) {
            return { x: position.x, y: position.y, radius, duration: 2, tickTimer: 0, mesh: null, damage: damagePerTick };
        }
        const width = radius * 2;
        const height = 0.5;
        const group = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.25 })
        );
        base.position.set(0, -height * 0.5, 0);
        group.add(base);

        const flames = [];
        const flameCount = Math.max(4, Math.round(width * 2.5));
        for (let i = 0; i < flameCount; i += 1) {
            const flame = new THREE.Mesh(
                new THREE.ConeGeometry(0.1, 0.45, 6),
                new THREE.MeshBasicMaterial({
                    color: i % 2 === 0 ? 0xff6a1a : 0xffc04d,
                    transparent: true,
                    opacity: 0.9,
                    depthTest: false
                })
            );
            const offsetX = -width * 0.45 + (i / Math.max(1, flameCount - 1)) * width * 0.9;
            const offsetY = 0.05 + Math.random() * 0.05;
            flame.position.set(offsetX, offsetY, 0.02);
            flame.userData = {
                phase: Math.random() * Math.PI * 2,
                baseX: offsetX,
                baseY: offsetY,
                scale: 0.8 + Math.random() * 0.35
            };
            group.add(flame);
            flames.push(flame);
        }

        group.position.set(position.x, position.y, 0.1);
        this.mesh.parent.add(group);
        return {
            x: position.x,
            y: position.y,
            radius,
            duration: 2,
            tickTimer: 0,
            mesh: group,
            base,
            flames,
            flameTime: 0,
            damage: damagePerTick
        };
    }

    createOilField(position, radius) {
        if (!this.mesh || !this.mesh.parent) {
            return { x: position.x, y: position.y, radius, duration: 2, mesh: null };
        }
        const width = radius * 2;
        const height = 0.5;
        const group = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.4, depthTest: false })
        );
        base.position.set(0, -height * 0.5, 0);
        group.add(base);

        const blobs = [];
        const blobCount = Math.max(4, Math.round(width * 2));
        for (let i = 0; i < blobCount; i += 1) {
            const blob = new THREE.Mesh(
                new THREE.CircleGeometry(0.08 + Math.random() * 0.12, 10),
                new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.5, depthTest: false })
            );
            const offsetX = -width * 0.45 + Math.random() * width * 0.9;
            const offsetY = -0.1 - Math.random() * 0.15;
            blob.position.set(offsetX, offsetY, 0.01);
            blob.userData = {
                baseX: offsetX,
                baseY: offsetY,
                phase: Math.random() * Math.PI * 2
            };
            group.add(blob);
            blobs.push(blob);
        }

        group.position.set(position.x, position.y, 0.2);
        group.renderOrder = 8;
        this.mesh.parent.add(group);
        return { x: position.x, y: position.y, radius, duration: 2, mesh: group, base, blobs, blobTime: 0 };
    }

    createHolyField(position, radius, healPerSecond = 5) {
        if (!this.mesh || !this.mesh.parent) {
            return { x: position.x, y: position.y, radius, duration: 4, tickTimer: 0, mesh: null, heal: healPerSecond };
        }
        const width = radius * 2;
        const height = 0.5;
        const group = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: 0xf2c34a, transparent: true, opacity: 0.28, depthTest: false })
        );
        base.position.set(0, -height * 0.5, 0);
        group.add(base);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.55, radius * 0.95, 36),
            new THREE.MeshBasicMaterial({ color: 0xf4d06b, transparent: true, opacity: 0.35, depthTest: false })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 0.02, 0.02);
        group.add(ring);

        const particles = [];
        const particleCount = Math.max(6, Math.round(width * 2));
        for (let i = 0; i < particleCount; i += 1) {
            const particle = new THREE.Mesh(
                new THREE.PlaneGeometry(0.04, 0.45),
                new THREE.MeshBasicMaterial({
                    color: 0xffd978,
                    transparent: true,
                    opacity: 0.45,
                    depthTest: false
                })
            );
            const offsetX = -width * 0.4 + Math.random() * width * 0.8;
            particle.position.set(offsetX, 0.9 + Math.random() * 0.6, 0.03);
            particle.userData = {
                baseX: offsetX,
                offsetY: particle.position.y,
                speed: 0.3 + Math.random() * 0.25,
                phase: Math.random() * Math.PI * 2
            };
            group.add(particle);
            particles.push(particle);
        }

        group.position.set(position.x, position.y, 0.1);
        this.mesh.parent.add(group);
        return {
            x: position.x,
            y: position.y,
            radius,
            duration: 4,
            tickTimer: 0,
            mesh: group,
            base,
            ring,
            particles,
            beamTime: 0,
            heal: healPerSecond
        };
    }

    createLightningField(position, radius, damagePerTick = 10, tickInterval = 0.5, durationSeconds = 1.5) {
        if (!this.mesh || !this.mesh.parent) {
            return {
                x: position.x,
                y: position.y,
                radius,
                duration: durationSeconds,
                tickTimer: 0,
                tickInterval,
                mesh: null,
                damage: damagePerTick
            };
        }
        const group = new THREE.Group();
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.9, radius, 32),
            new THREE.MeshBasicMaterial({
                color: 0x00d5ff,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                depthTest: false
            })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 0.02, 0.08);
        ring.renderOrder = 10;
        group.add(ring);
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 14, 14),
            new THREE.MeshBasicMaterial({ color: 0x3fb9ff, transparent: true, opacity: 0.9, depthTest: false })
        );
        group.add(core);

        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 14, 14),
            new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.35, depthTest: false })
        );
        group.add(glow);

        const arcs = [];
        const arcCount = 8;
        const arcMaterial = new THREE.MeshBasicMaterial({
            color: 0xc9f6ff,
            transparent: true,
            opacity: 0.8,
            depthTest: false
        });
        for (let i = 0; i < arcCount; i += 1) {
            const arcGroup = new THREE.Group();
            const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.02), arcMaterial.clone());
            const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.02), arcMaterial.clone());
            seg2.position.set(0.32, (i % 2 === 0 ? 0.08 : -0.08), 0);
            arcGroup.add(seg1, seg2);
            const angle = (i / arcCount) * Math.PI * 2;
            const radiusOffset = radius * 0.9;
            arcGroup.position.set(Math.cos(angle) * radiusOffset, Math.sin(angle) * radiusOffset, 0.02);
            arcGroup.rotation.z = angle + (Math.random() - 0.5) * 0.6;
            arcGroup.userData = {
                phase: Math.random() * Math.PI * 2,
                radius: radiusOffset,
                angle
            };
            group.add(arcGroup);
            arcs.push(arcGroup);
        }

        group.position.set(position.x, position.y + 0.25, 0.2);
        this.mesh.parent.add(group);
        return {
            x: position.x,
            y: position.y,
            radius,
            duration: durationSeconds,
            tickTimer: 0,
            tickInterval,
            mesh: group,
            ring,
            core,
            glow,
            arcs,
            arcTime: 0,
            damage: damagePerTick
        };
    }

    spawnFragmentationShards(position, radius) {
        if (!this.mesh || !this.mesh.parent) return;
        const shardCount = 12;
        const shards = [];
        for (let i = 0; i < shardCount; i += 1) {
            const shard = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.24, 0.04),
                new THREE.MeshBasicMaterial({ color: 0xb6b6b6, transparent: true, opacity: 0.85 })
            );
            const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const speed = 3 + Math.random() * 1.8;
            const offset = 0.1 + Math.random() * radius * 0.2;
            shard.position.set(
                position.x + Math.cos(angle) * offset,
                position.y + Math.sin(angle) * offset + 0.1,
                0.3
            );
            shard.rotation.z = angle;
            this.mesh.parent.add(shard);
            shards.push({
                mesh: shard,
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                life: 0,
                maxLife: 0.5 + Math.random() * 0.2
            });
        }

        const interval = setInterval(() => {
            for (let i = shards.length - 1; i >= 0; i -= 1) {
                const shard = shards[i];
                shard.life += 0.016;
                shard.mesh.position.x += shard.velocity.x * 0.016;
                shard.mesh.position.y += shard.velocity.y * 0.016;
                shard.mesh.rotation.z += 0.25;
                if (shard.mesh.material) {
                    shard.mesh.material.opacity = Math.max(0, 0.85 * (1 - shard.life / shard.maxLife));
                }
                if (shard.life >= shard.maxLife) {
                    if (shard.mesh.parent) shard.mesh.parent.remove(shard.mesh);
                    shards.splice(i, 1);
                }
            }
            if (!shards.length) {
                clearInterval(interval);
            }
        }, 16);
    }

    spawnFreezeSnow(position, radius) {
        if (!this.mesh || !this.mesh.parent) return;
        const flakeCount = 16;
        const flakes = [];
        for (let i = 0; i < flakeCount; i += 1) {
            const size = 0.035 + Math.random() * 0.045;
            const flake = new THREE.Mesh(
                new THREE.CircleGeometry(size, 6),
                new THREE.MeshBasicMaterial({ color: 0xe8f7ff, transparent: true, opacity: 0.9 })
            );
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.9;
            flake.position.set(
                position.x + Math.cos(angle) * dist,
                position.y + Math.sin(angle) * dist + 0.3,
                0.25
            );
            this.mesh.parent.add(flake);
            flakes.push({
                mesh: flake,
                velocity: {
                    x: (Math.random() - 0.5) * 1.0,
                    y: -0.6 - Math.random() * 0.6
                },
                sway: Math.random() * Math.PI * 2,
                life: 0,
                maxLife: 0.7 + Math.random() * 0.3
            });
        }

        const interval = setInterval(() => {
            for (let i = flakes.length - 1; i >= 0; i -= 1) {
                const flake = flakes[i];
                flake.life += 0.016;
                flake.sway += 0.2;
                flake.mesh.position.x += (flake.velocity.x + Math.sin(flake.sway) * 0.1) * 0.016;
                flake.mesh.position.y += flake.velocity.y * 0.016;
                if (flake.mesh.material) {
                    flake.mesh.material.opacity = Math.max(0, 0.9 * (1 - flake.life / flake.maxLife));
                }
                if (flake.life >= flake.maxLife) {
                    if (flake.mesh.parent) flake.mesh.parent.remove(flake.mesh);
                    flakes.splice(i, 1);
                }
            }
            if (!flakes.length) {
                clearInterval(interval);
            }
        }, 16);
    }

    spawnFearSpirits(position, radius) {
        if (!this.mesh || !this.mesh.parent) return;
        const spiritCount = 6;
        const spirits = [];
        for (let i = 0; i < spiritCount; i += 1) {
            const spirit = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.CircleGeometry(0.16, 14),
                new THREE.MeshBasicMaterial({ color: 0x120c18, transparent: true, opacity: 0.6 })
            );
            const tail = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.45, 10),
                new THREE.MeshBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0.5 })
            );
            tail.rotation.x = Math.PI;
            tail.position.set(0, -0.34, 0);
            const glow = new THREE.Mesh(
                new THREE.CircleGeometry(0.2, 14),
                new THREE.MeshBasicMaterial({ color: 0x6f2b8d, transparent: true, opacity: 0.2 })
            );
            glow.position.set(0, 0.02, -0.01);
            spirit.add(body, tail, glow);

            const angle = (i / spiritCount) * Math.PI * 2;
            const dist = 0.25 + Math.random() * radius * 0.6;
            spirit.position.set(
                position.x + Math.cos(angle) * dist,
                position.y + Math.sin(angle) * dist + 0.2,
                0.25
            );
            spirit.userData = {
                velocityY: 0.6 + Math.random() * 0.4,
                driftX: (Math.random() - 0.5) * 0.5,
                accelY: 0.12 + Math.random() * 0.08,
                phase: Math.random() * Math.PI * 2,
                life: 0,
                maxLife: 0.8 + Math.random() * 0.4,
                body,
                tail,
                glow
            };
            this.mesh.parent.add(spirit);
            spirits.push(spirit);
        }

        const interval = setInterval(() => {
            for (let i = spirits.length - 1; i >= 0; i -= 1) {
                const spirit = spirits[i];
                const data = spirit.userData || {};
                data.life += 0.016;
                data.phase += 0.2;
                data.velocityY += data.accelY * 0.016;
                spirit.position.y += data.velocityY * 0.016;
                spirit.position.x += Math.sin(data.phase) * data.driftX * 0.016;
                spirit.rotation.z = Math.sin(data.phase * 0.8) * 0.15;
                spirit.scale.set(0.95 + Math.sin(data.phase * 0.6) * 0.06, 1 + data.life * 0.35, 1);
                const fade = Math.max(0, 1 - data.life / data.maxLife);
                if (data.body?.material) {
                    data.body.material.opacity = 0.55 * fade;
                }
                if (data.tail?.material) {
                    data.tail.material.opacity = 0.4 * fade;
                }
                if (data.glow?.material) {
                    data.glow.material.opacity = 0.25 * fade;
                }
                if (data.life >= data.maxLife) {
                    if (spirit.parent) spirit.parent.remove(spirit);
                    spirits.splice(i, 1);
                }
            }
            if (!spirits.length) {
                clearInterval(interval);
            }
        }, 16);
    }

    spawnDisorientSwirl(position, radius, durationSeconds = 1.5) {
        if (!this.mesh || !this.mesh.parent) return;
        const maxRadius = Math.max(0.4, radius * 0.8);
        const segments = 64;
        const turns = 2.2;
        const points = [];
        for (let i = 0; i <= segments; i += 1) {
            const t = i / segments;
            const angle = t * Math.PI * 2 * turns;
            const r = t * maxRadius;
            points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x8b4bd8, transparent: true, opacity: 0.8 });
        const spiralA = new THREE.Line(geometry, material);
        const spiralB = new THREE.Line(geometry, material.clone());
        spiralB.rotation.z = Math.PI / turns;

        const group = new THREE.Group();
        group.add(spiralA, spiralB);
        group.position.set(position.x, position.y, 0.25);
        this.mesh.parent.add(group);

        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 0.016;
            const fade = Math.max(0, 1 - elapsed / durationSeconds);
            group.rotation.z += 0.12;
            spiralA.material.opacity = 0.8 * fade;
            spiralB.material.opacity = 0.6 * fade;
            if (elapsed >= durationSeconds) {
                clearInterval(interval);
                if (group.parent) group.parent.remove(group);
            }
        }, 16);
    }

    updateAlchemicalFields(deltaTime) {
        if (!this.alchemicalFireFields) {
            this.alchemicalFireFields = [];
        }
        if (!this.alchemicalOilFields) {
            this.alchemicalOilFields = [];
        }
        if (!this.alchemicalHolyFields) {
            this.alchemicalHolyFields = [];
        }
        if (!this.alchemicalLightningFields) {
            this.alchemicalLightningFields = [];
        }

        this.alchemicalFireFields = this.alchemicalFireFields.filter((field) => {
            field.duration -= deltaTime;
            field.tickTimer += deltaTime;
            if (field.tickTimer >= 1) {
                field.tickTimer -= 1;
                const damage = Number.isFinite(field.damage) ? field.damage : 10;
                const players = this.getAllPlayers ? this.getAllPlayers() : [];
                players.forEach((target) => {
                    if (!target || !target.isAlive) return;
                    if (this.isSameTeam && this.isSameTeam(target)) return;
                    const dx = target.position.x - field.x;
                    const dy = target.position.y - field.y;
                    if (Math.hypot(dx, dy) <= field.radius) {
                        if (typeof target.takeDamage === 'function') {
                            target.takeDamage(damage, this);
                        }
                    }
                });
            }
            if (field.mesh) {
                if (field.base?.material) {
                    field.base.material.opacity = Math.max(0, 0.25 * (field.duration / 2));
                }
                if (field.flames && field.flames.length) {
                    field.flameTime = (field.flameTime || 0) + deltaTime;
                    const time = field.flameTime * 8;
                    field.flames.forEach((flame, index) => {
                        const phase = time + (flame.userData?.phase || 0) + index * 0.35;
                        const scale = (flame.userData?.scale || 0.9) + 0.2 * Math.sin(phase * 1.3);
                        const sway = Math.sin(phase * 0.9) * 0.04;
                        flame.scale.set(0.9 + 0.15 * Math.sin(phase), scale, 1);
                        flame.position.x = (flame.userData?.baseX || 0) + sway;
                        flame.position.y = (flame.userData?.baseY || 0.05) + 0.05 * Math.sin(phase * 1.1);
                        flame.rotation.z = sway * 1.4;
                        if (flame.material) {
                            flame.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(phase));
                        }
                    });
                }
            }
            if (field.duration <= 0) {
                if (field.mesh && field.mesh.parent) field.mesh.parent.remove(field.mesh);
                return false;
            }
            return true;
        });

        this.alchemicalOilFields = this.alchemicalOilFields.filter((field) => {
            field.duration -= deltaTime;
            const targets = this.getDamageTargets();
            targets.forEach((target) => {
                if (target.type !== 'player') return;
                if (this.isSameTeam && this.isSameTeam(target)) return;
                const dx = target.position.x - field.x;
                const dy = target.position.y - field.y;
                if (Math.hypot(dx, dy) <= field.radius) {
                    if (typeof target.setSlow === 'function') {
                        target.setSlow(0.3, 0.6);
                    }
                }
            });
            if (field.mesh) {
                if (field.base?.material) {
                    field.base.material.opacity = Math.max(0, 0.4 * (field.duration / 2));
                }
                if (field.blobs && field.blobs.length) {
                    field.blobTime = (field.blobTime || 0) + deltaTime;
                    const time = field.blobTime * 6;
                    field.blobs.forEach((blob, index) => {
                        const phase = time + (blob.userData?.phase || 0) + index * 0.4;
                        blob.position.x = (blob.userData?.baseX || 0) + Math.sin(phase) * 0.03;
                        blob.scale.set(0.9 + 0.1 * Math.sin(phase * 1.2), 0.9 + 0.1 * Math.cos(phase * 1.1), 1);
                        if (blob.material) {
                            blob.material.opacity = 0.35 + 0.25 * Math.abs(Math.sin(phase));
                        }
                    });
                }
            }
            if (field.duration <= 0) {
                if (field.mesh && field.mesh.parent) field.mesh.parent.remove(field.mesh);
                return false;
            }
            return true;
        });

        this.alchemicalHolyFields = this.alchemicalHolyFields.filter((field) => {
            field.duration -= deltaTime;
            field.tickTimer += deltaTime;
            if (field.tickTimer >= 1) {
                field.tickTimer -= 1;
                const healAmount = Number.isFinite(field.heal) ? field.heal : 5;
                const players = this.getAllPlayers ? this.getAllPlayers() : [];
                players.forEach((target) => {
                    if (!target || !target.isAlive) return;
                    if (!this.isSameTeam || !this.isSameTeam(target)) return;
                    const dx = target.position.x - field.x;
                    const dy = target.position.y - field.y;
                    if (Math.hypot(dx, dy) <= field.radius) {
                        if (typeof target.heal === 'function') {
                            target.heal(healAmount);
                        }
                    }
                });
            }
            if (field.base?.material) {
                field.base.material.opacity = Math.max(0, 0.28 * (field.duration / 4));
            }
            if (field.ring?.material) {
                field.ring.material.opacity = Math.max(0, 0.35 * (field.duration / 4));
            }
            field.beamTime = (field.beamTime || 0) + deltaTime;
            if (field.particles && field.particles.length) {
                const height = 1.1;
                field.particles.forEach((particle) => {
                    const data = particle.userData || {};
                    const speed = data.speed || 0.4;
                    particle.position.y -= speed * deltaTime;
                    if (particle.position.y <= 0.1) {
                        particle.position.y = height + Math.random() * 0.5;
                        particle.position.x = (data.baseX || 0) + (Math.random() - 0.5) * 0.1;
                    }
                    particle.material.opacity = 0.35 + 0.25 * Math.abs(Math.sin((field.beamTime || 0) * 4 + data.phase));
                });
            }
            if (field.duration <= 0) {
                if (field.mesh && field.mesh.parent) field.mesh.parent.remove(field.mesh);
                return false;
            }
            return true;
        });

        this.alchemicalLightningFields = this.alchemicalLightningFields.filter((field) => {
            field.duration -= deltaTime;
            field.tickTimer += deltaTime;
            const tickInterval = Number.isFinite(field.tickInterval) ? field.tickInterval : 0.5;
            if (field.tickTimer >= tickInterval) {
                field.tickTimer -= tickInterval;
                const damage = Number.isFinite(field.damage) ? field.damage : 10;
                const targets = this.getDamageTargets();
                targets.forEach((target) => {
                    if (!target || !target.isAlive) return;
                    const dx = target.position.x - field.x;
                    const dy = target.position.y - field.y;
                    if (Math.hypot(dx, dy) <= field.radius) {
                        if (typeof target.takeDamage === 'function') {
                            target.takeDamage(damage, this);
                        }
                    }
                });
            }

            if (field.core?.material && field.glow?.material) {
                field.arcTime = (field.arcTime || 0) + deltaTime;
                const pulse = Math.sin(field.arcTime * 8) * 0.15;
                field.core.scale.set(1 + pulse * 0.2, 1 + pulse * 0.2, 1);
                field.glow.scale.set(1 + pulse * 0.6, 1 + pulse * 0.6, 1);
                field.glow.material.opacity = 0.25 + 0.15 * Math.abs(Math.sin(field.arcTime * 6));
            }

            if (field.ring?.material) {
                field.ring.material.opacity = 0.25;
            }

            if (field.arcs && field.arcs.length) {
                const time = (field.arcTime || 0) * 6;
                field.arcs.forEach((arc, index) => {
                    const phase = time + (arc.userData?.phase || 0) + index * 0.4;
                    const radius = arc.userData?.radius || field.radius || 0.3;
                    const angle = (arc.userData?.angle || 0) + Math.sin(phase * 0.7) * 0.2;
                    arc.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.02);
                    arc.rotation.z = angle + Math.sin(phase) * 0.4;
                    arc.scale.set(0.9 + 0.2 * Math.sin(phase * 1.3), 1, 1);
                    arc.children.forEach((seg) => {
                        if (seg.material) {
                            seg.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(phase + index));
                        }
                    });
                });
            }

            if (field.duration <= 0) {
                if (field.mesh && field.mesh.parent) field.mesh.parent.remove(field.mesh);
                return false;
            }
            return true;
        });
    }
}
