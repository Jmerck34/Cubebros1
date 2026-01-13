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

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;

        // Charge shot state
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 1.5;

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

        // Position bow on right side, clearly in front
        this.bowGroup.position.set(0.55, 0.1, 0.5);
        this.bowGroup.rotation.z = 0.2;
        this.mesh.add(this.bowGroup);
    }

    /**
     * Initialize archer abilities
     */
    initializeAbilities() {
        // Q - Shoot Arrow (charge)
        const shootArrow = new Ability('Shoot Arrow', 1.2);

        // W - Healing potion
        const healingPotion = new Ability('Healing Potion', 8);
        healingPotion.use = (hero) => {
            if (!Ability.prototype.use.call(healingPotion, hero)) return false;
            hero.activateHealingPotion();
            return true;
        };

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

        this.setAbilities(shootArrow, healingPotion, teleportArrow, arrowStorm);
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

        // Handle charge shot input (A1)
        this.handleChargeShot(deltaTime, input);

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
        if (input.isAbility2Pressed() && this.abilities.w) {
            this.useAbility('w');
        }
        if (input.isAbility3Pressed() && this.abilities.e) {
            if (this.isCarryingFlag && this.flagCarryBlocksAbility3) {
                return;
            }
            this.useAbility('e');
        }
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
            } else {
                const chargeRatio = this.chargeTime / this.maxChargeTime;
                this.bowString.position.x = 0.05;
                this.bowGroup.rotation.z = 0.2;

                if (ability && ability.isReady) {
                    ability.use(this);
                this.fireArrow(chargeRatio, false, false, ability);
                }

                this.isCharging = false;
                this.chargeTime = 0;
            }
        }
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
                    if (typeof owner.applyAbilityDamage === 'function') {
                        owner.applyAbilityDamage(ability, enemy, damageHits);
                    } else if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(damageHits, owner);
                    }
                    if (enemy.type !== 'player' && typeof owner.addUltimateCharge === 'function') {
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
    activateArrowStorm() {
        if (this.arrowStormActive) {
            return false;
        }
        this.arrowStormActive = true;
        const stormDurationMs = 3000;
        this.fireUltimateArrow((impactPoint) => {
            this.startArrowStorm(impactPoint, stormDurationMs);
        }, stormDurationMs);
        return true;
    }

    fireUltimateArrow(onImpact, stormDurationMs = 3000) {
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

        const speed = 18;
        const maxRange = 18;
        let traveled = 0;

        const level = this.level || { platforms: [] };
        const arrowInterval = setInterval(() => {
            const step = speed * 0.016;
            arrowGroup.position.x += dirX * step;
            arrowGroup.position.y += dirY * step;
            traveled += step;

            const arrowBounds = {
                left: arrowGroup.position.x - 0.28,
                right: arrowGroup.position.x + 0.28,
                top: arrowGroup.position.y + 0.12,
                bottom: arrowGroup.position.y - 0.12
            };

            if (this.isPositionBlockedByProtectionDome &&
                this.isPositionBlockedByProtectionDome(arrowGroup.position)) {
                clearInterval(arrowInterval);
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
                this.mesh.parent.remove(arrowGroup);
                if (typeof onImpact === 'function') {
                    onImpact({ x: arrowGroup.position.x, y: arrowGroup.position.y });
                }
            }
        }, 16);
    }

    startArrowStorm(impactPoint, durationMs = 3000) {
        const center = impactPoint || { x: this.position.x, y: this.position.y };
        const radius = 5;
        const spawnIntervalMs = 120;
        const arrowsPerBurst = 2;
        const spawnTopY = this.getArrowStormTopY(center);
        const targetY = center.y;
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

        const fallSpeed = 22;
        const arrowInterval = setInterval(() => {
            arrowGroup.position.y -= fallSpeed * 0.016;

            const arrowBounds = {
                left: arrowGroup.position.x - 0.25,
                right: arrowGroup.position.x + 0.25,
                top: arrowGroup.position.y + 0.2,
                bottom: arrowGroup.position.y - 0.4
            };

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
        const damage = 30;
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
