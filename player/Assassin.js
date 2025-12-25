import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Assassin Hero - Stealth fighter with dual daggers
 * @class Assassin
 */
export class Assassin extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Change body color to dark purple (assassin theme)
        this.mesh.material.color.set(0x4B0082);

        // Add dual daggers
        this.createEquipment(scene);

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Shadow walk state
        this.isShadowWalking = false;
        this.shadowWalkTimer = 0;

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;

        // Set assassin abilities
        this.initializeAbilities();
    }

    /**
     * Create dual daggers visuals (pointing outward from sides)
     * @param {THREE.Scene} scene - The scene
     */
    createEquipment(scene) {
        // Create LEFT DAGGER (pointing left horizontally)
        this.leftDaggerGroup = new THREE.Group();

        // Handle
        const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.06);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
        const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        this.leftDaggerGroup.add(leftHandle);

        // Blade (pointing horizontally outward to the left)
        const bladeGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.04);
        const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0xc0c0c0 });
        const leftBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        leftBlade.position.set(0, 0.375, 0); // Flip to point outward
        this.leftDaggerGroup.add(leftBlade);

        // Position left dagger on left side, rotated to point left
        this.leftDaggerGroup.position.set(-0.6, 0.1, 0.1);
        this.leftDaggerGroup.rotation.z = Math.PI / 2; // Rotate 90 degrees to point horizontally
        this.mesh.add(this.leftDaggerGroup);
        this.leftDagger = this.leftDaggerGroup;

        // Create RIGHT DAGGER (pointing right horizontally)
        this.rightDaggerGroup = new THREE.Group();

        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        this.rightDaggerGroup.add(rightHandle);

        const rightBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        rightBlade.position.set(0, 0.375, 0); // Flip to match left dagger orientation
        this.rightDaggerGroup.add(rightBlade);

        // Position right dagger on right side, rotated to point right
        this.rightDaggerGroup.position.set(0.6, 0.1, 0.1);
        this.rightDaggerGroup.rotation.z = -Math.PI / 2; // Rotate -90 degrees to point horizontally right
        this.mesh.add(this.rightDaggerGroup);
        this.rightDagger = this.rightDaggerGroup;
    }

    /**
     * Initialize assassin abilities
     */
    initializeAbilities() {
        // Q - Dagger Slash Combo
        const daggerSlash = new Ability('Dagger Slash', 3);
        daggerSlash.use = (hero) => {
            if (!Ability.prototype.use.call(daggerSlash, hero)) return false;
            hero.daggerSlashCombo();
            return true;
        };

        // W - Poison Bomb
        const poisonBomb = new Ability('Poison Bomb', 5);
        poisonBomb.use = (hero) => {
            if (!Ability.prototype.use.call(poisonBomb, hero)) return false;
            hero.throwPoisonBomb();
            return true;
        };

        // E - Shadow Walk
        const shadowWalk = new Ability('Shadow Walk', 8);
        shadowWalk.use = (hero) => {
            if (!Ability.prototype.use.call(shadowWalk, hero)) return false;
            hero.activateShadowWalk();
            return true;
        };

        // R - Assassinate
        const assassinate = new Ability('Assassinate', 0, true);
        assassinate.use = (hero) => {
            hero.assassinateTarget();
            return true;
        };

        this.setAbilities(daggerSlash, poisonBomb, shadowWalk, assassinate);
    }

    /**
     * Update - Override to handle shadow walk timer and facing direction
     */
    update(deltaTime, input) {
        // Update facing direction based on input
        if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        super.update(deltaTime, input);

        // Update shadow walk timer and shadow position
        if (this.isShadowWalking) {
            this.shadowWalkTimer -= deltaTime;
            if (this.shadowWalkTimer <= 0) {
                this.deactivateShadowWalk();
            }

            // Update shadow line position to follow player
            if (this.shadowLine) {
                // Find current ground level beneath the player
                let groundLevel = -3;
                if (this.level && this.level.platforms) {
                    for (const platform of this.level.platforms) {
                        if (this.position.x >= platform.bounds.left &&
                            this.position.x <= platform.bounds.right &&
                            platform.bounds.top <= this.position.y &&
                            platform.bounds.top > groundLevel) {
                            groundLevel = platform.bounds.top;
                        }
                    }
                }

                this.shadowLine.position.x = this.position.x;
                this.shadowLine.position.y = groundLevel + 0.025;
            }
        }
    }

    /**
     * Set facing direction and flip character
     */
    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction; // Flip entire mesh with daggers
        }
    }

    /**
     * Dagger Slash Combo - Q Ability (Dual crescent moons on both sides)
     */
    daggerSlashCombo() {
        console.log('🗡️ DUAL DAGGER SLASH!');

        // Cancel shadow walk if active
        if (this.isShadowWalking) {
            this.deactivateShadowWalk();
        }

        // Create visual slash arc effect on BOTH sides
        this.createDualCrescentSlashEffect();

        // Quick slashes - 3 hits hitting both sides at once
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                // Both daggers slash simultaneously
                this.leftDagger.rotation.z = Math.PI / 2 - 1.0; // Slash animation left
                this.rightDagger.rotation.z = -Math.PI / 2 + 1.0; // Slash animation right

                setTimeout(() => {
                    this.leftDagger.rotation.z = Math.PI / 2; // Reset left
                    this.rightDagger.rotation.z = -Math.PI / 2; // Reset right
                }, 80);

                // Deal damage on LEFT side
                const leftSlashBounds = {
                    left: this.position.x - 1.5,
                    right: this.position.x - 0.2,
                    top: this.position.y + 1.2,
                    bottom: this.position.y - 1.2
                };
                this.damageEnemiesInArea(leftSlashBounds, this.abilities.q, true);

                // Deal damage on RIGHT side
                const rightSlashBounds = {
                    left: this.position.x + 0.2,
                    right: this.position.x + 1.5,
                    top: this.position.y + 1.2,
                    bottom: this.position.y - 1.2
                };
                this.damageEnemiesInArea(rightSlashBounds, this.abilities.q, true);
            }, i * 150);
        }
    }

    /**
     * Create dual crescent moon slash visual effects on both sides
     * Traces a circle around the character, removing top and bottom quarters
     */
    createDualCrescentSlashEffect() {
        const slashGroup = new THREE.Group();

        // Circle parameters
        const segments = 16; // More segments for smoother circle
        const radius = 1.2;

        // Create circle segments, excluding top and bottom quarters
        for (let i = 0; i < segments; i++) {
            // Full circle angle (0 to 2π)
            const angle = (i / segments) * Math.PI * 2;

            // Skip top quarter (45° to 135°) and bottom quarter (225° to 315°)
            // Keep only left side (135° to 225°) and right side (315° to 45°)
            const degrees = (angle * 180) / Math.PI;
            if ((degrees > 45 && degrees < 135) || (degrees > 225 && degrees < 315)) {
                continue; // Skip top and bottom quarters
            }

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const segmentGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.1);
            const segmentMaterial = new THREE.MeshBasicMaterial({
                color: 0x9400d3, // Purple
                transparent: true,
                opacity: 0.7
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            segment.position.set(x, y, 0);
            segment.rotation.z = angle - Math.PI / 2; // Point tangent to circle

            slashGroup.add(segment);
        }

        // Attach to hero mesh so it moves with the character
        slashGroup.position.set(0, 0, 0.1); // Relative to hero position
        this.mesh.add(slashGroup);

        // Fade out effect
        let opacity = 0.7;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;

            slashGroup.children.forEach(child => {
                child.material.opacity = opacity;
            });

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.remove(slashGroup);
            }
        }, 50);
    }

    /**
     * Throw Poison Bomb - W Ability (Now detects platforms)
     */
    throwPoisonBomb() {
        console.log('💣 POISON BOMB!');

        // Cancel shadow walk if active
        if (this.isShadowWalking) {
            this.deactivateShadowWalk();
        }

        // Create poison bomb projectile
        const bombGeometry = new THREE.SphereGeometry(0.15);
        const bombMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const bomb = new THREE.Mesh(bombGeometry, bombMaterial);

        // Starting position
        bomb.position.set(this.position.x + (0.5 * this.facingDirection), this.position.y, 0.2);
        this.mesh.parent.add(bomb);

        // Throw direction based on facing
        const throwDirection = this.facingDirection;
        let bombX = this.position.x;
        let bombY = this.position.y;
        let velocityY = 5;

        // Get level reference (stored when enemy reference is set)
        const level = this.level || { platforms: [] };

        // Animate bomb trajectory
        const bombInterval = setInterval(() => {
            bombX += throwDirection * 8 * 0.016;
            velocityY -= 20 * 0.016; // Gravity
            bombY += velocityY * 0.016;

            bomb.position.x = bombX;
            bomb.position.y = bombY;

            // Create bomb bounds for collision detection
            const bombBounds = {
                left: bombX - 0.15,
                right: bombX + 0.15,
                top: bombY + 0.15,
                bottom: bombY - 0.15
            };

            // Check collision with platforms
            let hitPlatform = false;
            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (checkAABBCollision(bombBounds, platform.bounds)) {
                        hitPlatform = true;
                        break;
                    }
                }
            }

            // Check if hit ground, platform, or went off screen
            if (hitPlatform || bombY < -2 || Math.abs(bombX - this.position.x) > 10) {
                clearInterval(bombInterval);
                this.mesh.parent.remove(bomb);

                // Create poison cloud at impact location
                this.createPoisonCloud(bombX, bombY);
            }
        }, 16);
    }

    /**
     * Create poison cloud effect
     */
    createPoisonCloud(x, y) {
        const cloudGeometry = new THREE.CircleGeometry(1.5, 16);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        });
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloud.position.set(x, y, 0.1);
        this.mesh.parent.add(cloud);

        // Damage enemies in cloud over time
        let cloudDuration = 3; // 3 seconds
        const damageInterval = setInterval(() => {
            cloudDuration -= 0.5;

            const cloudBounds = {
                left: x - 1.5,
                right: x + 1.5,
                top: y + 1.5,
                bottom: y - 1.5
            };
            this.damageEnemiesInArea(cloudBounds, this.abilities.w);

            if (cloudDuration <= 0) {
                clearInterval(damageInterval);
                this.mesh.parent.remove(cloud);
            }
        }, 500);
    }

    /**
     * Activate Shadow Walk - E Ability (Shadow now touches ground)
     */
    activateShadowWalk() {
        console.log('👤 SHADOW WALK!');

        this.isShadowWalking = true;
        this.shadowWalkTimer = 5; // 5 seconds

        // Hide the main character mesh
        this.mesh.visible = false;

        // Find the ground level beneath the player
        let groundLevel = -3; // Default ground level

        if (this.level && this.level.platforms) {
            // Check each platform to find the one directly below
            for (const platform of this.level.platforms) {
                const playerX = this.position.x;
                const playerY = this.position.y;

                // Check if player is horizontally above this platform
                if (playerX >= platform.bounds.left && playerX <= platform.bounds.right) {
                    // Check if platform is below player
                    if (platform.bounds.top <= playerY) {
                        // Use the highest platform that's below the player
                        if (platform.bounds.top > groundLevel) {
                            groundLevel = platform.bounds.top;
                        }
                    }
                }
            }
        }

        // Create thin black line shadow on the ground
        const shadowGeometry = new THREE.PlaneGeometry(1, 0.05); // 1 unit wide, 0.05 units tall (couple pixels)
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7
        });
        this.shadowLine = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.shadowLine.position.set(this.position.x, groundLevel + 0.025, 0.1);
        this.mesh.parent.add(this.shadowLine);
    }

    /**
     * Deactivate Shadow Walk
     */
    deactivateShadowWalk() {
        this.isShadowWalking = false;

        // Show the main character mesh again
        this.mesh.visible = true;

        // Remove the shadow line
        if (this.shadowLine) {
            this.mesh.parent.remove(this.shadowLine);
            this.shadowLine = null;
        }
    }

    /**
     * Check if player is immune to damage
     */
    die() {
        if (this.isShadowWalking) return; // Immune during shadow walk
        super.die();
    }

    /**
     * Assassinate Target - R Ability (Ultimate)
     */
    assassinateTarget() {
        if (this.ultimateCharge < this.ultimateChargeMax) {
            console.log('Ultimate not ready!');
            return;
        }

        console.log('💀 ASSASSINATE!');

        // Cancel shadow walk if active
        if (this.isShadowWalking) {
            this.deactivateShadowWalk();
        }

        // Find closest enemy
        let closestEnemy = null;
        let closestDistance = Infinity;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const distance = Math.abs(enemy.position.x - this.position.x);
            if (distance < closestDistance && distance < 15) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        if (closestEnemy) {
            // Teleport next to enemy based on facing direction
            this.position.x = closestEnemy.position.x - (1 * this.facingDirection);
            this.position.y = closestEnemy.position.y;

            // Deal massive damage
            this.applyAbilityDamage(this.abilities.r, closestEnemy, 3);

            this.addUltimateCharge(this.ultimateChargePerKill);

            // Visual effect
            this.createAssassinateEffect(closestEnemy.position.x, closestEnemy.position.y);

            // Create teleport trail
            this.createTeleportTrail();
        }

        // Consume ultimate charge
        this.ultimateCharge = 0;
    }

    /**
     * Create assassinate visual effect
     */
    createAssassinateEffect(x, y) {
        const slashGeometry = new THREE.BoxGeometry(2, 2, 0.1);
        const slashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        const slash = new THREE.Mesh(slashGeometry, slashMaterial);
        slash.position.set(x, y, 0.3);
        this.mesh.parent.add(slash);

        // Fade out
        let opacity = 0.8;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;
            slash.material.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(slash);
            }
        }, 30);
    }

    /**
     * Damage enemies in area with optional bleed effect
     */
    damageEnemiesInArea(bounds, ability = null, applyBleed = false) {
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                this.applyAbilityDamage(ability, enemy, 1);
                this.addUltimateCharge(this.ultimateChargePerKill);
                console.log('💥 Assassin hit enemy!');

                // Apply bleed (additional damage over time)
                if (applyBleed) {
                    this.applyBleed(enemy, ability);
                }
            }
        }
    }

    /**
     * Apply bleed damage over time
     */
    applyBleed(enemy, ability = null) {
        let bleedTicks = 3;
        const bleedInterval = setInterval(() => {
            if (enemy.isAlive && bleedTicks > 0) {
                this.applyAbilityDamage(ability, enemy, 1);
                console.log('🩸 Bleed damage!');
                bleedTicks--;
            } else {
                clearInterval(bleedInterval);
            }
        }, 1000);
    }

    /**
     * Create teleport trail effect
     */
    createTeleportTrail() {
        const trailGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x4B0082, // Purple assassin color
            transparent: true,
            opacity: 0.7
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.set(this.position.x, this.position.y, -0.1);
        this.mesh.parent.add(trail);

        // Fade animation
        let opacity = 0.7;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;
            trail.material.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(trail);
            }
        }, 30);
    }
}
