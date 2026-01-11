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
        this.shadowWalkOpacity = 0.35;
        this.shadowWalkTint = 0x000000;
        this.shadowWalkMaterials = null;
        this.shadowPoofParticles = [];
        this.shadowWalkMaxJumpsBase = null;
        this.shadowWalkSpeedMultiplier = 1.35;
        this.shadowWalkMoveSpeedBase = null;

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;
        this.isTornadoSpinning = false;

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

        // W - Throwing Stars
        const throwingStars = new Ability('Throwing Stars', 2.5, false, 30);
        throwingStars.use = (hero) => {
            if (!Ability.prototype.use.call(throwingStars, hero)) return false;
            hero.throwThrowingStars();
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

        this.setAbilities(daggerSlash, throwingStars, shadowWalk, assassinate);
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
        if (this.flipAudioTimer) {
            clearTimeout(this.flipAudioTimer);
            this.flipAudioTimer = null;
        }
        this.flipAudio.pause();
        this.flipAudio.currentTime = 0;
        this.flipAudio.volume = this.flipSoundVolume;
        this.flipAudio.loop = true;
        this.flipAudio.play().catch(() => {});
        this.flipAudioTimer = setTimeout(() => {
            this.stopFlipLoop();
        }, durationMs);
    }

    stopFlipLoop() {
        if (!this.flipAudio) return;
        this.flipAudio.pause();
        this.flipAudio.currentTime = 0;
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

        // Update shadow walk timer and shadow position
        if (this.isShadowWalking) {
            this.shadowWalkTimer -= deltaTime;
            if (this.shadowWalkTimer <= 0) {
                this.deactivateShadowWalk();
            }

            this.applyShadowWalkVisual();
            if (this.healthBar && typeof this.healthBar.setOpacity === 'function') {
                this.healthBar.setOpacity(0.05);
            }

            // Shadow line removed (no ground stripe during shadow walk).
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
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                // Both daggers slash simultaneously
                this.leftDagger.rotation.z = Math.PI / 4 - 1.0; // Slash animation left
                this.rightDagger.rotation.z = -Math.PI / 4 + 1.0; // Slash animation right

                setTimeout(() => {
                    this.leftDagger.rotation.z = Math.PI / 4; // Reset left
                    this.rightDagger.rotation.z = -Math.PI / 4; // Reset right
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
     * Spin the assassin like a tornado
     * @param {number} durationMs
     */
    playTornadoSpin(durationMs = 500) {
        this.isTornadoSpinning = true;
        const startTime = performance.now();
        const spinInterval = setInterval(() => {
            const elapsed = performance.now() - startTime;
            if (elapsed >= durationMs) {
                clearInterval(spinInterval);
                this.mesh.rotation.z = 0;
                this.isTornadoSpinning = false;
                return;
            }
            this.mesh.rotation.y += Math.PI / 4;
            this.mesh.rotation.x += Math.PI / 10;
        }, 30);
    }

    /**
     * Single flip on basic combo start
     * @param {number} durationMs
     */
    playFlipOnce(durationMs = 280) {
        const startTime = performance.now();
        const flipInterval = setInterval(() => {
            const t = (performance.now() - startTime) / durationMs;
            if (t >= 1) {
                clearInterval(flipInterval);
                if (!this.isTornadoSpinning) {
                    this.mesh.rotation.x = 0;
                }
                return;
            }
            this.mesh.rotation.x = t * Math.PI;
        }, 16);
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
     * Throwing Stars - W Ability (slows targets)
     */
    throwThrowingStars() {
        console.log('ðŸŒŸ THROWING STARS!');

        // Cancel shadow walk if active
        if (this.isShadowWalking) {
            this.deactivateShadowWalk();
        }
        this.playPoisonThrowSound();

        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? aim : { x: this.facingDirection, y: 0 };
        const baseAngle = Math.atan2(direction.y, direction.x);
        const starCount = 1;
        const spread = 0;
        const speed = 12;
        const maxRange = 12;
        const slowDuration = 1.2;
        const slowMultiplier = 0.6;
        const level = this.level || { platforms: [] };

        const createStarMesh = () => {
            const starGroup = new THREE.Group();
            const points = [
                new THREE.Vector2(0, 0.62),
                new THREE.Vector2(0.22, 0.22),
                new THREE.Vector2(0.62, 0),
                new THREE.Vector2(0.22, -0.22),
                new THREE.Vector2(0, -0.62),
                new THREE.Vector2(-0.22, -0.22),
                new THREE.Vector2(-0.62, 0),
                new THREE.Vector2(-0.22, 0.22)
            ];
            const shape = new THREE.Shape(points);
            const hole = new THREE.Path();
            const holeRadius = 0.12;
            hole.absellipse(0, 0, holeRadius, holeRadius, 0, Math.PI * 2, false, 0);
            shape.holes.push(hole);

            const starGeometry = new THREE.ShapeGeometry(shape);
            const starMaterial = new THREE.MeshBasicMaterial({
                color: 0x111111,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            const starMesh = new THREE.Mesh(starGeometry, starMaterial);
            starMesh.scale.set(1.6, 1.6, 1);
            starGroup.add(starMesh);
            return starGroup;
        };

        for (let i = 0; i < starCount; i += 1) {
            const offset = i - (starCount - 1) / 2;
            const angle = baseAngle + offset * spread;
            const star = createStarMesh();
            const startX = this.position.x + (0.6 * direction.x);
            const startY = this.position.y + (0.4 * direction.y);
            let starX = startX;
            let starY = startY;
            star.position.set(starX, starY, 0.3);
            this.mesh.parent.add(star);
            let origin = { x: starX, y: starY };
            const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
            const projectile = {
                type: 'throwing-star',
                mesh: star,
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
                    origin = { x: starX, y: starY };
                }
            };
            Hero.addProjectile(projectile);
            const cleanupProjectile = () => {
                Hero.removeProjectile(projectile);
            };

            const starInterval = setInterval(() => {
                starX += velocity.x * 0.016;
                starY += velocity.y * 0.016;
                star.position.set(starX, starY, 0.3);
                star.rotation.z += 0.3;

                const bounds = {
                    left: starX - 0.45,
                    right: starX + 0.45,
                    top: starY + 0.45,
                    bottom: starY - 0.45
                };

                const owner = projectile.owner || this;
                if (owner && typeof owner.isPositionBlockedByProtectionDome === 'function' &&
                    owner.isPositionBlockedByProtectionDome({ x: starX, y: starY })) {
                    clearInterval(starInterval);
                    cleanupProjectile();
                    this.mesh.parent.remove(star);
                    return;
                }

                let hitPlatform = false;
                if (level.platforms) {
                    for (const platform of level.platforms) {
                        if (checkAABBCollision(bounds, platform.bounds)) {
                            hitPlatform = true;
                            break;
                        }
                    }
                }

                const traveled = Math.hypot(starX - origin.x, starY - origin.y);
                if (hitPlatform || traveled > maxRange) {
                    clearInterval(starInterval);
                    cleanupProjectile();
                    this.mesh.parent.remove(star);
                    if (hitPlatform) {
                        this.playPoisonImpactSound();
                    }
                    return;
                }

                for (const target of owner && typeof owner.getDamageTargets === 'function' ? owner.getDamageTargets() : []) {
                    if (!target.isAlive) continue;
                    const targetBounds = target.getBounds();
                    if (!checkAABBCollision(bounds, targetBounds)) continue;
                    const baseDamage = 20;
                    const adjustedDamage = this.abilities.w && typeof this.abilities.w.getAdjustedDamage === 'function'
                        ? this.abilities.w.getAdjustedDamage(baseDamage)
                        : baseDamage;
                    target.takeDamage(Math.max(1, Math.round(adjustedDamage)), owner);
                    if (target.type !== 'player' && typeof owner.addUltimateCharge === 'function') {
                        owner.addUltimateCharge(owner.ultimateChargePerKill || 0);
                    }
                    if (typeof target.setSlowed === 'function') {
                        target.setSlowed(slowDuration, slowMultiplier);
                    }
                    this.playPoisonImpactSound();
                    clearInterval(starInterval);
                    cleanupProjectile();
                    this.mesh.parent.remove(star);
                    break;
                }
            }, 16);
        }
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

        // Damage enemies in cloud over time
        let cloudDuration = 3; // 3 seconds
        const damageInterval = setInterval(() => {
            cloudDuration -= 0.5;

            const cloudBounds = {
                left: x - 1.6,
                right: x + 1.6,
                top: y + 1.2,
                bottom: y - 1.2
            };
            this.damageEnemiesInArea(cloudBounds, this.abilities.w, false, true);

            if (cloudDuration <= 0) {
                clearInterval(damageInterval);
                // Dissipate
                let fade = 0.45;
                const dissipate = setInterval(() => {
                    fade -= 0.07;
                    cloudGroup.children.forEach((puff) => {
                        puff.material.opacity = Math.max(0, fade);
                        puff.scale.set(1 + (0.45 - fade), 1 + (0.45 - fade), 1);
                        puff.position.y += 0.02;
                    });
                    if (fade <= 0) {
                        clearInterval(dissipate);
                        this.mesh.parent.remove(cloudGroup);
                    }
                }, 40);
            }
        }, 500);
    }

    /**
     * Activate Shadow Walk - E Ability (Shadow now touches ground)
     */
    activateShadowWalk() {
        console.log('ðŸ‘¤ SHADOW WALK!');

        this.isShadowWalking = true;
        this.shadowWalkTimer = 5; // 5 seconds
        this.spawnShadowPoof();
        if (this.shadowWalkMoveSpeedBase === null) {
            this.shadowWalkMoveSpeedBase = this.moveSpeedMultiplier || 1;
        }
        this.moveSpeedMultiplier = this.shadowWalkMoveSpeedBase * this.shadowWalkSpeedMultiplier;
        if (this.shadowWalkMaxJumpsBase === null) {
            this.shadowWalkMaxJumpsBase = Number.isFinite(this.maxJumps) ? this.maxJumps : 2;
        }
        this.maxJumps = 3;
        this.jumpsRemaining = Math.min(Math.max(this.jumpsRemaining + 1, 1), this.maxJumps);

        this.applyShadowWalkVisual();
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

        // Shadow line removed (no ground stripe during shadow walk).
    }

    /**
     * Deactivate Shadow Walk
     */
    deactivateShadowWalk() {
        this.isShadowWalking = false;
        this.spawnShadowPoof();
        if (this.shadowWalkMoveSpeedBase !== null) {
            this.moveSpeedMultiplier = this.shadowWalkMoveSpeedBase;
            this.shadowWalkMoveSpeedBase = null;
        }
        if (this.shadowWalkMaxJumpsBase !== null) {
            this.maxJumps = this.shadowWalkMaxJumpsBase;
            this.shadowWalkMaxJumpsBase = null;
            if (this.jumpsRemaining > this.maxJumps) {
                this.jumpsRemaining = this.maxJumps;
            }
        }

        // Show the main character mesh again
        this.clearShadowWalkVisual();
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

    applyShadowWalkVisual() {
        this.mesh.visible = true;
        if (!this.shadowWalkMaterials) {
            this.shadowWalkMaterials = [];
            this.mesh.traverse((child) => {
                if (!child.isMesh || !child.material) return;
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material) => {
                    this.shadowWalkMaterials.push({
                        material,
                        color: material.color ? material.color.clone() : null,
                        opacity: material.opacity,
                        transparent: material.transparent,
                        depthWrite: material.depthWrite
                    });
                });
            });
        }

        this.shadowWalkMaterials.forEach((entry) => {
            const material = entry.material;
            if (material.color && this.shadowWalkTint !== null) {
                material.color.set(this.shadowWalkTint);
            }
            material.transparent = true;
            material.opacity = this.shadowWalkOpacity;
            material.depthWrite = false;
        });
    }

    clearShadowWalkVisual() {
        if (!this.shadowWalkMaterials) return;
        this.shadowWalkMaterials.forEach((entry) => {
            const material = entry.material;
            if (entry.color && material.color) {
                material.color.copy(entry.color);
            }
            material.opacity = entry.opacity;
            material.transparent = entry.transparent;
            material.depthWrite = entry.depthWrite;
        });
        this.shadowWalkMaterials = null;
    }

    spawnShadowPoof() {
        if (!this.scene) return;
        const poofGroup = new THREE.Group();
        const puffCount = 8;
        for (let i = 0; i < puffCount; i += 1) {
            const size = 0.18 + Math.random() * 0.22;
            const puff = new THREE.Mesh(
                new THREE.CircleGeometry(size, 12),
                new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.7
                })
            );
            const offsetX = (Math.random() - 0.5) * 0.9;
            const offsetY = (Math.random() - 0.2) * 0.8;
            puff.position.set(offsetX, offsetY, 0.35);
            poofGroup.add(puff);
        }
        poofGroup.position.set(this.position.x, this.position.y + 0.2, 0.2);
        this.mesh.parent.add(poofGroup);

        let opacity = 0.7;
        let scale = 1;
        const poofInterval = setInterval(() => {
            opacity -= 0.08;
            scale += 0.15;
            poofGroup.scale.set(scale, scale, 1);
            poofGroup.children.forEach((puff) => {
                puff.material.opacity = Math.max(0, opacity);
            });
            if (opacity <= 0) {
                clearInterval(poofInterval);
                if (poofGroup.parent) {
                    poofGroup.parent.remove(poofGroup);
                }
            }
        }, 40);
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

        let opacity = 0.9;
        let scale = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.08;
            scale += 0.25;
            group.scale.set(scale, scale, 1);
            ring.material.opacity = opacity * 0.6;
            slash1.material.opacity = opacity;
            slash2.material.opacity = opacity;
            core.material.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(group);
            }
        }, 30);
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
        let bleedTicks = 3;
        if (typeof enemy.setBleeding === 'function') {
            enemy.setBleeding(bleedTicks);
        }
        const bleedInterval = setInterval(() => {
            if (enemy.isAlive && bleedTicks > 0) {
                this.applyAbilityDamage(ability, enemy, 1);
                if (typeof enemy.flashBleed === 'function') {
                    enemy.flashBleed();
                }
                console.log('ðŸ©¸ Bleed damage!');
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

        let opacity = 0.7;
        let scale = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.08;
            scale += 0.18;
            group.scale.set(scale, scale, 1);
            group.children.forEach((streak, idx) => {
                streak.material.opacity = opacity;
                streak.position.x += (idx % 2 === 0 ? 1 : -1) * 0.05;
                streak.position.y += 0.03;
            });
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(group);
            }
        }, 30);
    }
}
