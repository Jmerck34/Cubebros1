import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PLAYER_SPEED, DEATH_Y, JUMP_VELOCITY } from '../core/constants.js';
import { applyGravity, handleJump } from './playerPhysics.js';
import { checkAABBCollision } from '../utils/collision.js';
import { HealthBar } from '../ui/HealthBar.js';

/**
 * Player Entity - Handles player movement, physics, and state
 * @class Player
 */
export class Player {
    constructor(scene, startX = 0, startY = 0) {
        // Store scene reference for health bar
        this.scene = scene;

        // Create player mesh (green cube)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green
        this.mesh = new THREE.Mesh(geometry, material);

        // Add to scene
        scene.add(this.mesh);

        // Add eyes to character
        this.createEyes();

        // Physics properties
        this.position = { x: startX, y: startY, z: 0 };
        this.velocity = { x: 0, y: 0 };
        this.spawnPoint = { x: startX, y: startY };

        // State
        this.isGrounded = false;
        this.isAlive = true;

        // Jump state for double jump
        this.jumpsRemaining = 2; // Allow 2 jumps (ground + air)
        this.jumpKeyWasPressed = false; // Track key state to prevent spam

        // Health system
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.healthBar = new HealthBar(scene, this, this.maxHealth);

        // Debug physics multipliers (set by DebugMenu)
        this.debugPhysics = null;

        // Sync mesh position
        this.syncMeshPosition();
    }

    /**
     * Create eyes for the character - cute cyclops eye
     */
    createEyes() {
        // Large single eye (white background) - bigger and cuter
        const eyeWhiteGeometry = new THREE.CircleGeometry(0.22, 32);
        const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        eyeWhite.position.set(0, 0.18, 0.51);
        this.mesh.add(eyeWhite);

        // Outer iris (colored ring for depth)
        const irisGeometry = new THREE.CircleGeometry(0.12, 32);
        const irisMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1 }); // Royal blue
        const iris = new THREE.Mesh(irisGeometry, irisMaterial);
        iris.position.set(0, 0.18, 0.52);
        this.mesh.add(iris);

        // Pupil (black center) - slightly offset for character
        const pupilGeometry = new THREE.CircleGeometry(0.07, 32);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.set(0, 0.18, 0.53);
        this.mesh.add(pupil);

        // Cute sparkle highlight (top-right of pupil)
        const sparkleGeometry = new THREE.CircleGeometry(0.04, 16);
        const sparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        sparkle.position.set(0.03, 0.22, 0.54);
        this.mesh.add(sparkle);

        // Smaller sparkle for extra cuteness
        const sparkle2Geometry = new THREE.CircleGeometry(0.02, 16);
        const sparkle2 = new THREE.Mesh(sparkle2Geometry, sparkleMaterial);
        sparkle2.position.set(-0.04, 0.24, 0.54);
        this.mesh.add(sparkle2);

        // Eyebrow - simple curved line above eye
        const eyebrowShape = new THREE.Shape();
        eyebrowShape.moveTo(-0.15, 0);
        eyebrowShape.quadraticCurveTo(0, 0.05, 0.15, 0);
        const eyebrowGeometry = new THREE.ShapeGeometry(eyebrowShape);
        const eyebrowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        eyebrow.position.set(0, 0.42, 0.51);
        this.mesh.add(eyebrow);

        // Mouth - cute small smile (semicircle)
        const mouthShape = new THREE.Shape();
        mouthShape.absarc(0, 0, 0.12, Math.PI, 0, true); // Bottom half of circle
        const mouthGeometry = new THREE.ShapeGeometry(mouthShape);
        const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.15, 0.51);
        mouth.scale.set(1, 0.5, 1); // Flatten for gentle smile
        this.mesh.add(mouth);

        // Store facial features for animations
        this.eyes = {
            white: eyeWhite,
            iris: iris,
            pupil: pupil,
            sparkle: sparkle,
            sparkle2: sparkle2
        };
        this.eyebrow = eyebrow;
        this.mouth = mouth;

        // Animation state
        this.faceAnimationTime = 0;
        this.blinkTimer = 0;
        this.blinkInterval = 3 + Math.random() * 2; // Blink every 3-5 seconds
        this.isBlinking = false;
    }

    /**
     * Update player position and physics
     * @param {number} deltaTime - Time since last frame
     * @param {InputManager} input - Input manager instance
     */
    update(deltaTime, input) {
        // Horizontal movement
        this.velocity.x = 0; // Reset horizontal velocity

        // Apply debug speed multiplier if available
        const speedMultiplier = this.debugPhysics ? this.debugPhysics.moveSpeedMultiplier : 1.0;

        if (input.isLeftPressed()) {
            this.velocity.x = -PLAYER_SPEED * speedMultiplier;
        }
        if (input.isRightPressed()) {
            this.velocity.x = PLAYER_SPEED * speedMultiplier;
        }

        // Apply horizontal velocity
        this.position.x += this.velocity.x * deltaTime;

        // Handle jump input
        handleJump(this, input);

        // Apply gravity (collision handled by Level)
        applyGravity(this, deltaTime);

        // Check death zone
        if (this.position.y < DEATH_Y) {
            this.die();
        }

        // Update facial animations
        this.updateFaceAnimations(deltaTime);

        // Update health bar
        this.healthBar.update(deltaTime);

        // Sync mesh with internal position
        this.syncMeshPosition();
    }

    /**
     * Update facial animations (blink, eyebrow movement, etc.)
     * @param {number} deltaTime - Time since last frame
     */
    updateFaceAnimations(deltaTime) {
        this.faceAnimationTime += deltaTime;

        // Blinking animation
        this.blinkTimer += deltaTime;

        if (!this.isBlinking && this.blinkTimer >= this.blinkInterval) {
            // Start blink
            this.isBlinking = true;
            this.blinkTimer = 0;
            this.blinkInterval = 3 + Math.random() * 2; // Next blink in 3-5 seconds
        }

        if (this.isBlinking) {
            // Blink duration: 0.15 seconds
            const blinkProgress = this.blinkTimer / 0.15;

            if (blinkProgress < 0.5) {
                // Closing eye (first half)
                const closeAmount = blinkProgress * 2; // 0 to 1
                this.eyes.white.scale.y = 1 - closeAmount * 0.9;
                this.eyes.iris.scale.y = 1 - closeAmount * 0.9;
                this.eyes.pupil.scale.y = 1 - closeAmount * 0.9;
            } else if (blinkProgress < 1) {
                // Opening eye (second half)
                const openAmount = (blinkProgress - 0.5) * 2; // 0 to 1
                this.eyes.white.scale.y = 0.1 + openAmount * 0.9;
                this.eyes.iris.scale.y = 0.1 + openAmount * 0.9;
                this.eyes.pupil.scale.y = 0.1 + openAmount * 0.9;
            } else {
                // Blink complete
                this.isBlinking = false;
                this.blinkTimer = 0;
                this.eyes.white.scale.y = 1;
                this.eyes.iris.scale.y = 1;
                this.eyes.pupil.scale.y = 1;
            }
        }

        // Eyebrow bounce when jumping
        if (!this.isGrounded && this.velocity.y > 0) {
            // Jumping up - raise eyebrow
            this.eyebrow.position.y = 0.42 + Math.sin(this.faceAnimationTime * 10) * 0.03;
        } else if (!this.isGrounded && this.velocity.y < -5) {
            // Falling fast - lower eyebrow (worried look)
            this.eyebrow.position.y = 0.40;
        } else {
            // Normal position
            this.eyebrow.position.y = 0.42;
        }

        // Mouth expression based on movement
        if (!this.isGrounded && this.velocity.y < -5) {
            // Falling - surprised mouth (O shape)
            this.mouth.scale.y = 0.8;
        } else if (Math.abs(this.velocity.x) > 0.1) {
            // Moving - happy bounce
            this.mouth.scale.y = 0.5 + Math.sin(this.faceAnimationTime * 8) * 0.1;
        } else {
            // Idle - normal smile
            this.mouth.scale.y = 0.5;
        }
    }

    /**
     * Sync Three.js mesh position with internal position
     */
    syncMeshPosition() {
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;
    }

    /**
     * Get player's current position
     * @returns {{x: number, y: number, z: number}}
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * Get player's axis-aligned bounding box
     * @returns {{left: number, right: number, top: number, bottom: number}}
     */
    getBounds() {
        return {
            left: this.position.x - 0.5,
            right: this.position.x + 0.5,
            top: this.position.y + 0.5,
            bottom: this.position.y - 0.5
        };
    }

    /**
     * Take damage
     * @param {number} amount - Amount of damage to take
     */
    takeDamage(amount) {
        this.currentHealth -= amount;
        this.healthBar.takeDamage(amount);

        if (this.currentHealth <= 0) {
            this.die();
        }
    }

    /**
     * Heal the player
     * @param {number} amount - Amount of healing
     */
    heal(amount) {
        this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
        this.healthBar.heal(amount);
    }

    /**
     * Handle player death - respawn at spawn point
     */
    die() {
        console.log('Player died - respawning');
        this.position.x = this.spawnPoint.x;
        this.position.y = this.spawnPoint.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.isGrounded = false;
        this.jumpsRemaining = 2;

        // Reset health on respawn
        this.currentHealth = this.maxHealth;
        this.healthBar.setHealth(this.maxHealth);
    }

    /**
     * Get the player's mesh
     * @returns {THREE.Mesh}
     */
    getMesh() {
        return this.mesh;
    }

    /**
     * Get current health
     * @returns {number}
     */
    getHealth() {
        return this.currentHealth;
    }

    /**
     * Get max health
     * @returns {number}
     */
    getMaxHealth() {
        return this.maxHealth;
    }

    /**
     * Check collisions with enemies
     * @param {Array} enemies - Array of enemy instances
     */
    checkEnemyCollisions(enemies) {
        const playerBounds = this.getBounds();

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();

            if (checkAABBCollision(playerBounds, enemyBounds)) {
                // Check if player is above enemy (stomping)
                const playerBottom = playerBounds.bottom;
                const enemyTop = enemyBounds.top;

                // Player is falling and above enemy = stomp
                if (this.velocity.y < 0 && playerBottom > enemyTop - 0.3) {
                    // Player stomped on enemy
                    enemy.takeDamage();
                    // Bounce player up slightly
                    this.velocity.y = JUMP_VELOCITY * 0.5;
                    console.log('Stomped enemy!');
                } else {
                    // Side collision - player takes damage (20 damage per hit)
                    this.takeDamage(20);
                    console.log('Hit by enemy! Health:', this.currentHealth);
                }
            }
        }
    }
}
