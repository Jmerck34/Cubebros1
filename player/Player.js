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

        // Create player mesh (neutral base cube)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x4a4f57 }); // Neutral slate
        this.mesh = new THREE.Mesh(geometry, material);

        // Add to scene
        scene.add(this.mesh);

        // Add stylized cube details (armor plates, vents, outline)
        this.createCubeDetails();

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

        // Simple visual animation state for cube heroes
        this.animTime = 0;
        this.visualBob = 0;
        this.visualScaleY = 1;
        this.visualScaleZ = 1;
        this.visualTiltZ = 0;
        this.moveSpeedMultiplier = 1;
        this.hitboxScale = { x: 1, y: 1 };
        this.debugHitboxVisible = false;
        this.debugHitbox = null;

        // Sync mesh position
        this.syncMeshPosition();
    }

    /**
     * Add extra geometry to make the cube hero feel more crafted
     */
    createCubeDetails() {
        const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const panelMaterial = new THREE.MeshBasicMaterial({ color: 0x0d0d0d });
        const accentMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
        const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x66ffff });

        // Edge outline
        const edges = new THREE.EdgesGeometry(this.mesh.geometry);
        const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x111111 }));
        this.mesh.add(edgeLines);

        // Front face panel
        const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.82, 0.06), panelMaterial);
        frontPanel.position.set(0, 0, 0.53);
        this.mesh.add(frontPanel);
        this.frontPanel = frontPanel;

        // Side vents
        const ventGeometry = new THREE.BoxGeometry(0.06, 0.4, 0.6);
        const leftVent = new THREE.Mesh(ventGeometry, frameMaterial);
        leftVent.position.set(-0.53, -0.05, 0);
        this.mesh.add(leftVent);
        const rightVent = new THREE.Mesh(ventGeometry, frameMaterial);
        rightVent.position.set(0.53, -0.05, 0);
        this.mesh.add(rightVent);

        // Top plate
        const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), accentMaterial);
        topPlate.position.set(0, 0.52, 0);
        this.mesh.add(topPlate);

        // Belt band
        const belt = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 1.02), frameMaterial);
        belt.position.set(0, -0.05, 0);
        this.mesh.add(belt);

        // Core gem
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), coreMaterial);
        core.position.set(0, 0.05, 0.54);
        this.mesh.add(core);

        // Slight tint on the front panel to match hero color
        this.bodyCore = core;
    }

    /**
     * Set body color and synced accent elements
     * @param {number} hexColor - Hex color for the body
     */
    setBodyColor(hexColor) {
        this.mesh.material.color.set(hexColor);
        if (this.frontPanel) {
            this.frontPanel.material.color.set(hexColor);
        }
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
        const wasGrounded = this.isGrounded;

        // Horizontal movement
        this.velocity.x = 0; // Reset horizontal velocity

        // Apply debug speed multiplier if available
        const debugMultiplier = this.debugPhysics ? this.debugPhysics.moveSpeedMultiplier : 1.0;
        const speedMultiplier = debugMultiplier * (this.moveSpeedMultiplier || 1);

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

        // Update simple cube animation (bob + air stretch)
        this.updateCubeAnimation(deltaTime, wasGrounded);

        // Update health bar
        this.healthBar.update(deltaTime);

        // Sync mesh with internal position
        this.syncMeshPosition();

        // Update debug hitbox
        if (this.debugHitboxVisible) {
            this.updateDebugHitbox();
        }
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
        this.mesh.position.y = this.position.y + this.visualBob;
        this.mesh.position.z = this.position.z;

        // Preserve facing on X, animate Y/Z only
        const facing = this.mesh.scale.x >= 0 ? 1 : -1;
        this.mesh.scale.x = Math.abs(this.mesh.scale.x) * facing;
        this.mesh.scale.y = this.visualScaleY;
        this.mesh.scale.z = this.visualScaleZ;
        this.mesh.rotation.z = this.visualTiltZ;
    }

    /**
     * Subtle animation to make cube heroes feel alive
     * @param {number} deltaTime - Time since last frame
     * @param {boolean} wasGrounded - Grounded state from previous frame
     */
    updateCubeAnimation(deltaTime, wasGrounded) {
        this.animTime += deltaTime;

        const moveAmount = Math.min(Math.abs(this.velocity.x) / PLAYER_SPEED, 1);
        const isGroundMove = wasGrounded && moveAmount > 0.05;

        if (isGroundMove) {
            const stride = this.animTime * 12;
            const hop = Math.abs(Math.sin(stride));
            const stretch = Math.sin(stride) * 0.08 * moveAmount;
            this.visualBob = hop * 0.08 * moveAmount;
            this.visualScaleY = 1 + stretch;
            this.visualScaleZ = 1 - stretch * 0.6;
            this.visualTiltZ = -0.12 * Math.sign(this.velocity.x || 1) * moveAmount;
        } else if (!wasGrounded) {
            const fallStretch = Math.min(Math.abs(this.velocity.y) * 0.02, 0.12);
            this.visualScaleY = 1 + fallStretch;
            this.visualScaleZ = 1 - fallStretch * 0.5;
            this.visualBob = 0;
            this.visualTiltZ = -0.06 * Math.sign(this.velocity.x || 1) * moveAmount;
        } else {
            // Gentle idle squash to avoid dead-still pose
            const breathe = Math.sin(this.animTime * 2) * 0.02;
            this.visualScaleY = 1 + breathe;
            this.visualScaleZ = 1 - breathe * 0.5;
            this.visualBob = 0;
            this.visualTiltZ = 0;
        }
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
        const halfW = 0.5 * (this.hitboxScale?.x || 1);
        const halfH = 0.5 * (this.hitboxScale?.y || 1);
        return {
            left: this.position.x - halfW,
            right: this.position.x + halfW,
            top: this.position.y + halfH,
            bottom: this.position.y - halfH
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

    /**
     * Clean up player visuals/UI
     */
    destroy() {
        if (this.healthBar) {
            this.healthBar.destroy();
        }
        this.setDebugHitboxVisible(false);
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }

    /**
     * Toggle debug hitbox visibility
     * @param {boolean} visible
     */
    setDebugHitboxVisible(visible) {
        this.debugHitboxVisible = visible;
        if (!this.scene) return;

        if (visible && !this.debugHitbox) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
            this.debugHitbox = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), material);
            this.scene.add(this.debugHitbox);
        } else if (!visible && this.debugHitbox) {
            this.scene.remove(this.debugHitbox);
            this.debugHitbox = null;
        }
    }

    /**
     * Update debug hitbox size/position
     */
    updateDebugHitbox() {
        if (!this.debugHitbox) return;
        const width = this.getBounds().right - this.getBounds().left;
        const height = this.getBounds().top - this.getBounds().bottom;
        this.debugHitbox.position.set(this.position.x, this.position.y, this.position.z + 0.3);
        this.debugHitbox.scale.set(width, height, 1);
    }
}
