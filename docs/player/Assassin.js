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
        this.setBodyColor(0x3b0a5a);

        // Add dual daggers
        this.createEquipment(scene);
        this.addAssassinHood();

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Shadow walk state
        this.isShadowWalking = false;
        this.shadowWalkTimer = 0;
        this.activeBombs = [];

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;
        this.isTornadoSpinning = false;
        this.tornadoSpinRemaining = 0;
        this.tornadoSpinRateY = (Math.PI / 4) / 0.03;
        this.tornadoSpinRateX = (Math.PI / 10) / 0.03;
        this.flipOnceActive = false;
        this.flipOnceElapsed = 0;
        this.flipOnceDuration = 0;
        this.flipLoopRemaining = 0;
        this.daggerSlashHitsRemaining = 0;
        this.daggerSlashTimer = 0;
        this.daggerSlashInterval = 0.15;
        this.daggerSlashResetTimer = 0;
        this.daggerSlashResetDuration = 0.08;
        this.activeSlashEffects = [];
        this.activePoisonClouds = [];
        this.activeAssassinateEffects = [];
        this.activeTeleportTrails = [];
        this.activeBleeds = [];

        // Set assassin abilities
        this.initializeAbilities();

        // Dagger flip sound
        this.flipSoundVolume = 0.2;
        this.initFlipAudio();

        // Poison throw sound
        this.poisonThrowVolume = 0.2;
        this.initPoisonThrowAudio();

        // Poison impact sound
        this.poisonImpactVolume = 0.2;
        this.initPoisonImpactAudio();
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

        // Position left dagger on left side, tilted 45 degrees outward
        this.leftDaggerGroup.position.set(-0.6, 0.1, 0.1);
        this.leftDaggerGroup.rotation.z = Math.PI / 4; // 45 degree tilt
        this.mesh.add(this.leftDaggerGroup);
        this.leftDagger = this.leftDaggerGroup;

        // Create RIGHT DAGGER (pointing right horizontally)
        this.rightDaggerGroup = new THREE.Group();

        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        this.rightDaggerGroup.add(rightHandle);

        const rightBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        rightBlade.position.set(0, 0.375, 0); // Flip to match left dagger orientation
        this.rightDaggerGroup.add(rightBlade);

        // Position right dagger on right side, tilted 45 degrees outward
        this.rightDaggerGroup.position.set(0.6, 0.1, 0.1);
        this.rightDaggerGroup.rotation.z = -Math.PI / 4; // -45 degree tilt
        this.mesh.add(this.rightDaggerGroup);
        this.rightDagger = this.rightDaggerGroup;
    }

    /**
     * Add a stealth hood collar silhouette
     */
    addAssassinHood() {
        const hoodMaterial = new THREE.MeshBasicMaterial({ color: 0x1b0d2a });
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.18, 1.06), hoodMaterial);
        hood.position.set(0, 0.46, 0);
        this.mesh.add(hood);

        const mask = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.05), hoodMaterial);
        mask.position.set(0, 0.08, 0.57);
        this.mesh.add(mask);
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
            return hero.assassinateTarget();
        };

        this.setAbilities(daggerSlash, poisonBomb, shadowWalk, assassinate);
    }

    initFlipAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/assassin_q_loop.wav', import.meta.url);
            const audio = new Audio(audioUrl);
            audio.volume = this.flipSoundVolume;
            audio.preload = 'auto';
            audio.loop = true;
            audio.load();
            this.flipAudio = audio;
        } catch (error) {
            this.flipAudio = null;
        }
    }

    playFlipLoop(durationMs = 280) {
        if (!this.flipAudio) return;
        this.flipAudio.pause();
        this.flipAudio.currentTime = 0;
        this.flipAudio.volume = this.flipSoundVolume;
        this.flipAudio.loop = true;
        this.flipAudio.play().catch(() => {});
        this.flipLoopRemaining = Math.max(0, durationMs) / 1000;
    }

    stopFlipLoop() {
        if (!this.flipAudio) return;
        this.flipAudio.pause();
        this.flipAudio.currentTime = 0;
        this.flipLoopRemaining = 0;
    }

    initPoisonThrowAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/assassin_poison_throw.wav', import.meta.url);
            const audio = new Audio(audioUrl);
            audio.volume = this.poisonThrowVolume;
            audio.preload = 'auto';
            audio.load();
            this.poisonThrowAudio = audio;
        } catch (error) {
            this.poisonThrowAudio = null;
        }
    }

    playPoisonThrowSound() {
        if (!this.poisonThrowAudio) return;
        const sound = this.poisonThrowAudio.cloneNode();
        sound.volume = this.poisonThrowVolume;
        sound.play().catch(() => {});
    }

    initPoisonImpactAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/assassin_poison_impact.wav', import.meta.url);
            const audio = new Audio(audioUrl);
            audio.volume = this.poisonImpactVolume;
            audio.preload = 'auto';
            audio.load();
            this.poisonImpactAudio = audio;
        } catch (error) {
            this.poisonImpactAudio = null;
        }
    }

    playPoisonImpactSound() {
        if (!this.poisonImpactAudio) return;
        const sound = this.poisonImpactAudio.cloneNode();
        sound.volume = this.poisonImpactVolume;
        sound.play().catch(() => {});
    }

    /**
     * Update - Override to handle shadow walk timer and facing direction
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

        super.update(deltaTime, input);

        this.updateAssassinTimers(deltaTime);
        this.updatePoisonBombs(deltaTime);

        // Update shadow walk timer and shadow position
        if (this.isShadowWalking) {
            this.shadowWalkTimer -= deltaTime;
            if (this.shadowWalkTimer <= 0) {
                this.deactivateShadowWalk();
            }

            if (this.healthBar && typeof this.healthBar.setOpacity === 'function') {
                this.healthBar.setOpacity(0.05);
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
        console.log('ðŸ—¡ï¸ DUAL DAGGER SLASH!');

        // Cancel shadow walk if active
        if (this.isShadowWalking) {
            this.deactivateShadowWalk();
        }

        // Tornado spin during combo
        this.playFlipLoop(520);
        this.playTornadoSpin(500);
        this.playFlipOnce(280);

        // Create visual slash arc effect on BOTH sides
        this.createDualCrescentSlashEffect();

        // Quick slashes - 3 hits hitting both sides at once
        this.startDaggerSlashCombo();
    }

    /**
     * Spin the assassin like a tornado
     * @param {number} durationMs
     */
    playTornadoSpin(durationMs = 500) {
        this.isTornadoSpinning = true;
        this.tornadoSpinRemaining = Math.max(0, durationMs) / 1000;
    }

    /**
     * Single flip on basic combo start
     * @param {number} durationMs
     */
    playFlipOnce(durationMs = 280) {
        this.flipOnceDuration = Math.max(0, durationMs) / 1000;
        this.flipOnceElapsed = 0;
        this.flipOnceActive = true;
    }

    /**
     * Override syncMeshPosition to preserve tornado spin
     */
    syncMeshPosition() {
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y + (this.visualBob || 0);
        this.mesh.position.z = this.position.z;

        const facing = this.mesh.scale.x >= 0 ? 1 : -1;
        this.mesh.scale.x = Math.abs(this.mesh.scale.x) * facing;
        this.mesh.scale.y = this.visualScaleY || 1;
        this.mesh.scale.z = this.visualScaleZ || 1;

        if (this.isTornadoSpinning) {
            this.mesh.rotation.z = 0;
        } else {
            this.mesh.rotation.x = 0;
            this.mesh.rotation.y = 0;
            this.mesh.rotation.z = this.visualTiltZ || 0;
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
            // Full circle angle (0 to 2Ï€)
            const angle = (i / segments) * Math.PI * 2;

            // Skip top quarter (45Â° to 135Â°) and bottom quarter (225Â° to 315Â°)
            // Keep only left side (135Â° to 225Â°) and right side (315Â° to 45Â°)
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

        this.activeSlashEffects.push({
            group: slashGroup,
            opacity: 0.7,
            fadeRate: 0.1 / 0.05
        });
    }

    /**
     * Throw Poison Bomb - W Ability (Now detects platforms)
     */
    throwPoisonBomb() {
        console.log('ðŸ’£ POISON BOMB!');

        // Cancel shadow walk if active
        if (this.isShadowWalking) {
            this.deactivateShadowWalk();
        }
        this.playPoisonThrowSound();

        // Create poison bomb projectile (body + cap + fuse)
        const bombGroup = new THREE.Group();
        const bombGeometry = new THREE.SphereGeometry(0.16, 16, 16);
        const bombMaterial = new THREE.MeshBasicMaterial({ color: 0x2d2d2d });
        const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
        bombGroup.add(bomb);

        const capGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.06, 12);
        const capMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.set(0, 0.16, 0);
        bombGroup.add(cap);

        const fuseGeometry = new THREE.BoxGeometry(0.02, 0.08, 0.02);
        const fuseMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
        const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial);
        fuse.position.set(0.04, 0.22, 0);
        bombGroup.add(fuse);

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };

        // Starting position
        bombGroup.position.set(
            this.position.x + (0.5 * direction.x),
            this.position.y + (0.5 * direction.y),
            0.2
        );
        this.mesh.parent.add(bombGroup);

        // Throw direction based on facing or aim
        const throwDirection = direction;
        const velocityY = useAim ? throwDirection.y * 8 : 5;
        const velocityX = throwDirection.x * 8;

        // Get level reference (stored when enemy reference is set)
        const level = this.level || { platforms: [] };

        this.activeBombs.push({
            mesh: bombGroup,
            velocityX,
            velocityY,
            gravity: -20,
            level,
            owner: this
        });
    }

    /**
     * Update poison bombs (tick-driven).
     * @param {number} deltaTime
     */
    updatePoisonBombs(deltaTime) {
        if (!this.activeBombs.length) return;
        const remaining = [];
        for (const bomb of this.activeBombs) {
            if (!bomb || !bomb.mesh) continue;

            bomb.mesh.position.x += bomb.velocityX * deltaTime;
            bomb.velocityY += bomb.gravity * deltaTime;
            bomb.mesh.position.y += bomb.velocityY * deltaTime;
            bomb.mesh.rotation.z += 0.2;

            const bombX = bomb.mesh.position.x;
            const bombY = bomb.mesh.position.y;
            const bombBounds = {
                left: bombX - 0.15,
                right: bombX + 0.15,
                top: bombY + 0.15,
                bottom: bombY - 0.15
            };

            let hitPlatform = false;
            if (bomb.level.platforms) {
                for (const platform of bomb.level.platforms) {
                    if (checkAABBCollision(bombBounds, platform.bounds)) {
                        hitPlatform = true;
                        break;
                    }
                }
            }

            const hitGround = bombY < -2;
            const outOfRange = Math.abs(bombX - bomb.owner.position.x) > 10;

            if (hitPlatform || hitGround || outOfRange) {
                if (bomb.mesh.parent) {
                    bomb.mesh.parent.remove(bomb.mesh);
                }
                if (hitPlatform || hitGround) {
                    this.playPoisonImpactSound();
                }
                this.createPoisonCloud(bombX, bombY);
                continue;
            }

            remaining.push(bomb);
        }

        this.activeBombs = remaining;
    }

    /**
     * Create poison cloud effect
     */
    createPoisonCloud(x, y) {
        const cloudGroup = new THREE.Group();
        const puffCount = 8;
        for (let i = 0; i < puffCount; i++) {
            const puffSize = 0.6 + Math.random() * 0.7;
            const puffGeometry = new THREE.CircleGeometry(puffSize, 16);
            const puffMaterial = new THREE.MeshBasicMaterial({
                color: 0x00aa55,
                transparent: true,
                opacity: 0.45
            });
            const puff = new THREE.Mesh(puffGeometry, puffMaterial);
            puff.position.set(
                x + (Math.random() - 0.5) * 1.2,
                y + (Math.random() - 0.5) * 0.6,
                0.1
            );
            cloudGroup.add(puff);
        }
        this.mesh.parent.add(cloudGroup);

        this.activePoisonClouds.push({
            group: cloudGroup,
            x,
            y,
            duration: 3,
            damageTimer: 0,
            damageInterval: 0.5,
            opacity: 0.45,
            dissipating: false,
            fadeRate: 0.07 / 0.04,
            riseRate: 0.02 / 0.04
        });
    }

    /**
     * Activate Shadow Walk - E Ability (Shadow now touches ground)
     */
    activateShadowWalk() {
        console.log('ðŸ‘¤ SHADOW WALK!');

        this.isShadowWalking = true;
        this.shadowWalkTimer = 5; // 5 seconds

        // Hide the main character mesh
        this.mesh.visible = false;
        if (this.healthBar) {
            if (typeof this.healthBar.show === 'function') {
                this.healthBar.show();
            }
            if (typeof this.healthBar.setOpacity === 'function') {
                this.healthBar.setOpacity(0.05);
            }
        }

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
        if (this.healthBar) {
            if (typeof this.healthBar.setOpacity === 'function') {
                this.healthBar.setOpacity(1);
            }
            if (typeof this.healthBar.show === 'function') {
                this.healthBar.show();
            }
        }

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
        if (this.isShadowWalking && this.currentHealth > 0) return; // Immune during shadow walk
        super.die();
    }

    /**
     * Assassinate Target - R Ability (Ultimate)
     */
    assassinateTarget() {
        if (this.ultimateCharge < this.ultimateChargeMax) {
            console.log('Ultimate not ready!');
            return false;
        }

        // Cancel shadow walk if active
        if (this.isShadowWalking) {
            this.deactivateShadowWalk();
        }

        // Find closest enemy
        let closestEnemy = null;
        let closestDistance = Infinity;

        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;

            const distance = Math.abs(enemy.position.x - this.position.x);
            if (distance < closestDistance && distance < 15) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        if (!closestEnemy) {
            console.log('No assassinate target in range.');
            return false;
        }

        console.log('ASSASSINATE!');

        // Teleport next to enemy based on facing direction
        this.position.x = closestEnemy.position.x - (1 * this.facingDirection);
        this.position.y = closestEnemy.position.y;

        // Deal massive damage
        this.applyAbilityDamage(this.abilities.r, closestEnemy, 3);

        if (closestEnemy.type !== 'player') {
            this.addUltimateCharge(this.ultimateChargePerKill);
        }

        // Visual effect
        this.createAssassinateEffect(closestEnemy.position.x, closestEnemy.position.y);

        // Create teleport trail
        this.createTeleportTrail();

        // Consume ultimate charge
        this.ultimateCharge = 0;
        return true;
    }
    /**
     * Create assassinate visual effect
     */
    createAssassinateEffect(x, y) {
        const group = new THREE.Group();

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.3, 1.1, 24),
            new THREE.MeshBasicMaterial({
                color: 0xb000ff,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            })
        );
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        const crossGeometry = new THREE.PlaneGeometry(2.2, 0.12);
        const crossMaterial = new THREE.MeshBasicMaterial({
            color: 0xff66ff,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const slash1 = new THREE.Mesh(crossGeometry, crossMaterial);
        slash1.rotation.z = Math.PI / 4;
        group.add(slash1);
        const slash2 = new THREE.Mesh(crossGeometry, crossMaterial.clone());
        slash2.rotation.z = -Math.PI / 4;
        group.add(slash2);

        const core = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 16),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            })
        );
        core.position.z = 0.01;
        group.add(core);

        group.position.set(x, y, 0.3);
        this.mesh.parent.add(group);

        this.activeAssassinateEffects.push({
            group,
            ring,
            slash1,
            slash2,
            core,
            opacity: 0.9,
            scale: 1,
            fadeRate: 0.08 / 0.03,
            scaleRate: 0.25 / 0.03
        });
    }

    /**
     * Damage enemies in area with optional bleed effect
     */
    damageEnemiesInArea(bounds, ability = null, applyBleed = false, applyPoison = false) {
        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                this.applyAbilityDamage(ability, enemy, 1);
                if (enemy.type !== 'player') {
                    this.addUltimateCharge(this.ultimateChargePerKill);
                }
                console.log('ðŸ’¥ Assassin hit enemy!');

                if (!enemy.isAlive) {
                    continue;
                }

                // Apply bleed (additional damage over time)
                if (applyBleed && typeof enemy.flashBleed === 'function') {
                    this.applyBleed(enemy, ability);
                }

                if (applyPoison && typeof enemy.setPoisoned === 'function') {
                    enemy.setPoisoned(0.7);
                }
            }
        }
    }

    /**
     * Apply bleed damage over time
     */
    applyBleed(enemy, ability = null) {
        if (typeof enemy.setBleeding === 'function') {
            enemy.setBleeding(3);
        }
        this.activeBleeds.push({
            enemy,
            ability,
            ticksRemaining: 3,
            timer: 0,
            interval: 1
        });
    }

    /**
     * Create teleport trail effect
     */
    createTeleportTrail() {
        const group = new THREE.Group();
        const streakCount = 6;

        for (let i = 0; i < streakCount; i++) {
            const streak = new THREE.Mesh(
                new THREE.PlaneGeometry(0.9, 0.12),
                new THREE.MeshBasicMaterial({
                    color: 0x8b00ff,
                    transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide
                })
            );
            streak.position.set(
                this.position.x + (Math.random() - 0.5) * 0.6,
                this.position.y + (Math.random() - 0.5) * 0.6,
                -0.1
            );
            streak.rotation.z = Math.random() * Math.PI;
            group.add(streak);
        }

        this.mesh.parent.add(group);

        this.activeTeleportTrails.push({
            group,
            opacity: 0.7,
            scale: 1,
            fadeRate: 0.08 / 0.03,
            scaleRate: 0.18 / 0.03,
            driftRateX: 0.05 / 0.03,
            driftRateY: 0.03 / 0.03
        });
    }

    startDaggerSlashCombo() {
        this.daggerSlashHitsRemaining = 3;
        this.performDaggerSlashHit();
        this.daggerSlashHitsRemaining = 2;
        this.daggerSlashTimer = this.daggerSlashInterval;
    }

    performDaggerSlashHit() {
        if (this.leftDagger && this.rightDagger) {
            this.leftDagger.rotation.z = Math.PI / 4 - 1.0;
            this.rightDagger.rotation.z = -Math.PI / 4 + 1.0;
            this.daggerSlashResetTimer = this.daggerSlashResetDuration;
        }

        const leftSlashBounds = {
            left: this.position.x - 1.5,
            right: this.position.x - 0.2,
            top: this.position.y + 1.2,
            bottom: this.position.y - 1.2
        };
        this.damageEnemiesInArea(leftSlashBounds, this.abilities.q, true);

        const rightSlashBounds = {
            left: this.position.x + 0.2,
            right: this.position.x + 1.5,
            top: this.position.y + 1.2,
            bottom: this.position.y - 1.2
        };
        this.damageEnemiesInArea(rightSlashBounds, this.abilities.q, true);
    }

    updateAssassinTimers(deltaTime) {
        this.updateFlipLoop(deltaTime);
        this.updateDaggerSlashCombo(deltaTime);
        this.updateDaggerSlashReset(deltaTime);
        this.updateTornadoSpin(deltaTime);
        this.updateFlipOnce(deltaTime);
        this.updateSlashEffects(deltaTime);
        this.updatePoisonClouds(deltaTime);
        this.updateAssassinateEffects(deltaTime);
        this.updateTeleportTrails(deltaTime);
        this.updateBleeds(deltaTime);
    }

    updateFlipLoop(deltaTime) {
        if (this.flipLoopRemaining <= 0) return;
        this.flipLoopRemaining -= deltaTime;
        if (this.flipLoopRemaining <= 0) {
            this.stopFlipLoop();
        }
    }

    updateDaggerSlashCombo(deltaTime) {
        if (this.daggerSlashHitsRemaining <= 0) return;
        this.daggerSlashTimer -= deltaTime;
        while (this.daggerSlashHitsRemaining > 0 && this.daggerSlashTimer <= 0) {
            this.performDaggerSlashHit();
            this.daggerSlashHitsRemaining -= 1;
            this.daggerSlashTimer += this.daggerSlashInterval;
        }
    }

    updateDaggerSlashReset(deltaTime) {
        if (this.daggerSlashResetTimer <= 0) return;
        this.daggerSlashResetTimer -= deltaTime;
        if (this.daggerSlashResetTimer <= 0) {
            if (this.leftDagger && this.rightDagger) {
                this.leftDagger.rotation.z = Math.PI / 4;
                this.rightDagger.rotation.z = -Math.PI / 4;
            }
        }
    }

    updateTornadoSpin(deltaTime) {
        if (this.tornadoSpinRemaining <= 0) return;
        this.tornadoSpinRemaining -= deltaTime;
        this.mesh.rotation.y += this.tornadoSpinRateY * deltaTime;
        this.mesh.rotation.x += this.tornadoSpinRateX * deltaTime;
        if (this.tornadoSpinRemaining <= 0) {
            this.isTornadoSpinning = false;
            this.mesh.rotation.z = 0;
        }
    }

    updateFlipOnce(deltaTime) {
        if (!this.flipOnceActive || this.flipOnceDuration <= 0) return;
        this.flipOnceElapsed += deltaTime;
        const t = Math.min(1, this.flipOnceElapsed / this.flipOnceDuration);
        this.mesh.rotation.x = t * Math.PI;
        if (t >= 1) {
            this.flipOnceActive = false;
            if (!this.isTornadoSpinning) {
                this.mesh.rotation.x = 0;
            }
        }
    }

    updateSlashEffects(deltaTime) {
        if (!this.activeSlashEffects.length) return;
        for (let i = this.activeSlashEffects.length - 1; i >= 0; i--) {
            const effect = this.activeSlashEffects[i];
            effect.opacity -= effect.fadeRate * deltaTime;
            effect.group.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = effect.opacity;
                }
            });
            if (effect.opacity <= 0) {
                this.mesh.remove(effect.group);
                this.activeSlashEffects.splice(i, 1);
            }
        }
    }

    updatePoisonClouds(deltaTime) {
        if (!this.activePoisonClouds.length) return;
        for (let i = this.activePoisonClouds.length - 1; i >= 0; i--) {
            const cloud = this.activePoisonClouds[i];
            if (!cloud || !cloud.group) {
                this.activePoisonClouds.splice(i, 1);
                continue;
            }

            if (!cloud.dissipating) {
                cloud.duration -= deltaTime;
                cloud.damageTimer += deltaTime;
                while (cloud.damageTimer >= cloud.damageInterval) {
                    cloud.damageTimer -= cloud.damageInterval;
                    const cloudBounds = {
                        left: cloud.x - 1.6,
                        right: cloud.x + 1.6,
                        top: cloud.y + 1.2,
                        bottom: cloud.y - 1.2
                    };
                    this.damageEnemiesInArea(cloudBounds, this.abilities.w, false, true);
                }

                if (cloud.duration <= 0) {
                    cloud.dissipating = true;
                }
            } else {
                cloud.opacity -= cloud.fadeRate * deltaTime;
                cloud.group.children.forEach((puff) => {
                    if (puff.material) {
                        puff.material.opacity = Math.max(0, cloud.opacity);
                    }
                    const scale = 1 + (0.45 - cloud.opacity);
                    puff.scale.set(scale, scale, 1);
                    puff.position.y += cloud.riseRate * deltaTime;
                });
                if (cloud.opacity <= 0) {
                    if (cloud.group.parent) {
                        cloud.group.parent.remove(cloud.group);
                    }
                    this.activePoisonClouds.splice(i, 1);
                }
            }
        }
    }

    updateAssassinateEffects(deltaTime) {
        if (!this.activeAssassinateEffects.length) return;
        for (let i = this.activeAssassinateEffects.length - 1; i >= 0; i--) {
            const effect = this.activeAssassinateEffects[i];
            effect.opacity -= effect.fadeRate * deltaTime;
            effect.scale += effect.scaleRate * deltaTime;
            effect.group.scale.set(effect.scale, effect.scale, 1);
            effect.ring.material.opacity = effect.opacity * 0.6;
            effect.slash1.material.opacity = effect.opacity;
            effect.slash2.material.opacity = effect.opacity;
            effect.core.material.opacity = effect.opacity;

            if (effect.opacity <= 0) {
                if (effect.group.parent) {
                    effect.group.parent.remove(effect.group);
                }
                this.activeAssassinateEffects.splice(i, 1);
            }
        }
    }

    updateTeleportTrails(deltaTime) {
        if (!this.activeTeleportTrails.length) return;
        for (let i = this.activeTeleportTrails.length - 1; i >= 0; i--) {
            const trail = this.activeTeleportTrails[i];
            trail.opacity -= trail.fadeRate * deltaTime;
            trail.scale += trail.scaleRate * deltaTime;
            trail.group.scale.set(trail.scale, trail.scale, 1);
            trail.group.children.forEach((streak, idx) => {
                if (streak.material) {
                    streak.material.opacity = trail.opacity;
                }
                streak.position.x += (idx % 2 === 0 ? 1 : -1) * trail.driftRateX * deltaTime;
                streak.position.y += trail.driftRateY * deltaTime;
            });
            if (trail.opacity <= 0) {
                if (trail.group.parent) {
                    trail.group.parent.remove(trail.group);
                }
                this.activeTeleportTrails.splice(i, 1);
            }
        }
    }

    updateBleeds(deltaTime) {
        if (!this.activeBleeds.length) return;
        for (let i = this.activeBleeds.length - 1; i >= 0; i--) {
            const bleed = this.activeBleeds[i];
            if (!bleed.enemy || !bleed.enemy.isAlive || bleed.ticksRemaining <= 0) {
                this.activeBleeds.splice(i, 1);
                continue;
            }
            bleed.timer += deltaTime;
            while (bleed.timer >= bleed.interval && bleed.ticksRemaining > 0) {
                bleed.timer -= bleed.interval;
                this.applyAbilityDamage(bleed.ability, bleed.enemy, 1);
                if (typeof bleed.enemy.flashBleed === 'function') {
                    bleed.enemy.flashBleed();
                }
                console.log('ðŸ©¸ Bleed damage!');
                bleed.ticksRemaining -= 1;
            }
            if (bleed.ticksRemaining <= 0) {
                this.activeBleeds.splice(i, 1);
            }
        }
    }
}
