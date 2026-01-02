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

        // Machine bow ultimate state
        this.machineBowActive = false;
        this.machineBowDuration = 0;
        this.machineBowShotTimer = 0;

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

        // R - Machine Bow (ultimate)
        const machineBow = new Ability('Machine Bow', 0, true);
        machineBow.use = (hero) => {
            hero.activateMachineBow();
            return true;
        };

        this.setAbilities(shootArrow, healingPotion, teleportArrow, machineBow);
    }

    /**
     * Update - handle charging, potion effects, and machine bow
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

        // Handle machine bow
        this.updateMachineBow(deltaTime);

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

        if (this.machineBowActive) {
            return;
        }

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

        let velocityY = useAim ? direction.y * speed : 3.5 + chargeRatio * 2.2;
        const gravity = -14;
        const velocityX = direction.x * speed;

        const arrowInterval = setInterval(() => {
            arrowGroup.position.x += velocityX * 0.016;
            velocityY += gravity * 0.016;
            arrowGroup.position.y += velocityY * 0.016;
            const targetRotation = Math.atan2(velocityY, velocityX);
            arrowGroup.rotation.z = targetRotation;

            const arrowBounds = {
                left: arrowGroup.position.x - 0.25,
                right: arrowGroup.position.x + 0.25,
                top: arrowGroup.position.y + 0.08,
                bottom: arrowGroup.position.y - 0.08
            };

            for (const enemy of this.getDamageTargets()) {
                if (!enemy.isAlive) continue;
                if (hitEnemies.has(enemy)) continue;

                const enemyBounds = enemy.getBounds();
                if (checkAABBCollision(arrowBounds, enemyBounds)) {
                    this.applyAbilityDamage(ability, enemy, damageHits);
                    if (enemy.type !== 'player') {
                        this.addUltimateCharge(this.ultimateChargePerKill);
                    }
                    hitEnemies.add(enemy);

                    if (!piercing) {
                        if (teleportOnHit) {
                            this.teleportToArrow(arrowGroup.position.x, arrowGroup.position.y);
                        }
                        clearInterval(arrowInterval);
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
                if (teleportOnHit) {
                    this.teleportToArrow(arrowGroup.position.x, arrowGroup.position.y);
                }
                clearInterval(arrowInterval);
                if (hitPlatform) {
                    // Stick arrow briefly into platform
                    const stickTime = 600;
                    const stuck = arrowGroup;
                    stuck.rotation.z = Math.atan2(velocityY, velocityX);
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
     * Activate machine bow ultimate
     */
    activateMachineBow() {
        this.machineBowActive = true;
        this.machineBowDuration = 2.0;
        this.machineBowShotTimer = 0;
    }

    /**
     * Update machine bow firing
     */
    updateMachineBow(deltaTime) {
        if (!this.machineBowActive) return;

        this.machineBowDuration -= deltaTime;
        this.machineBowShotTimer -= deltaTime;

        if (this.machineBowShotTimer <= 0) {
            this.machineBowShotTimer = 0.1;
            this.fireArrow(1, false, true, this.abilities.r);
        }

        if (this.machineBowDuration <= 0) {
            this.machineBowActive = false;
        }
    }
}
