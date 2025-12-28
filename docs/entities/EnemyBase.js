import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GRAVITY } from '../core/constants.js';
import { EnemyHealthBar } from '../ui/EnemyHealthBar.js';

/**
 * Enemy Base Class - Foundation for all enemies
 * @class EnemyBase
 */
export class EnemyBase {
    constructor(scene, x, y, color = 0x5b8a4a) {
        this.scene = scene;
        // Create enemy mesh (zombie cube by default)
        const geometry = new THREE.BoxGeometry(1, 1, 0.2);
        const material = new THREE.MeshBasicMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);

        // Add to scene
        scene.add(this.mesh);

        // Physics properties
        this.position = { x, y, z: 0 };
        this.velocity = { x: 0, y: 0 };
        this.direction = -1; // -1 = left, 1 = right

        // Enemy properties
        this.speed = 2;
        this.isAlive = true;
        this.type = 'enemy';
        this.maxHealth = 3;
        this.currentHealth = this.maxHealth;
        this.frozenTimer = 0;
        this.isFrozen = false;
        this.freezeOriginalColor = null;
        this.stunTimer = 0;
        this.isStunned = false;
        this.stunOriginalColor = null;
        this.stunEffect = null;
        this.poisonTimer = 0;
        this.bleedTimer = 0;
        this.poisonEffect = null;
        this.bleedEffect = null;
        this.baseColor = color;
        this.hitboxScale = { x: 1, y: 1 };
        this.debugHitboxVisible = false;
        this.debugHitbox = null;

        // Add zombie features
        this.createZombieDetails();

        // Health bar
        this.healthBar = new EnemyHealthBar(scene, this, this.maxHealth);

        // Sync mesh position
        this.syncMeshPosition();
    }

    /**
     * Update enemy (override in subclasses)
     * @param {number} deltaTime - Time since last frame
     * @param {Level} level - Level instance for collision
     */
    update(deltaTime, level) {
        if (!this.isAlive) return;

        if (this.frozenTimer > 0) {
            this.frozenTimer -= deltaTime;
            if (!this.isFrozen) {
                this.freezeOriginalColor = this.mesh.material.color.getHex();
                this.mesh.material.color.set(0x88ddff);
                this.isFrozen = true;
            }
        } else if (this.isFrozen) {
            this.mesh.material.color.set(this.freezeOriginalColor || 0x5b8a4a);
            this.isFrozen = false;
        }

        if (this.stunTimer > 0) {
            this.stunTimer -= deltaTime;
            if (!this.isStunned) {
                this.stunOriginalColor = this.mesh.material.color.getHex();
                this.mesh.material.color.set(0xffdd55);
                this.isStunned = true;
            }
            if (!this.stunEffect) {
                this.createStunEffect();
            }
            this.updateStunEffect();
        } else if (this.isStunned) {
            if (this.frozenTimer > 0) {
                this.mesh.material.color.set(0x88ddff);
            } else {
                this.mesh.material.color.set(this.stunOriginalColor || this.baseColor);
            }
            this.isStunned = false;
        } else if (this.stunEffect) {
            if (this.stunEffect.parent) {
                this.stunEffect.parent.remove(this.stunEffect);
            }
            this.stunEffect = null;
        }

        if (this.poisonTimer > 0) {
            this.poisonTimer -= deltaTime;
            this.updatePoisonEffect();
        } else if (this.poisonEffect) {
            if (this.poisonEffect.parent) {
                this.poisonEffect.parent.remove(this.poisonEffect);
            }
            this.poisonEffect = null;
        }

        if (this.bleedTimer > 0) {
            this.bleedTimer -= deltaTime;
            this.updateBleedEffect();
        } else if (this.bleedEffect) {
            if (this.bleedEffect.parent) {
                this.bleedEffect.parent.remove(this.bleedEffect);
            }
            this.bleedEffect = null;
        }

        // Apply gravity
        this.velocity.y += GRAVITY * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Horizontal movement
        const moveSpeed = (this.frozenTimer > 0 || this.stunTimer > 0) ? 0 : this.speed;
        this.velocity.x = this.direction * moveSpeed;
        this.position.x += this.velocity.x * deltaTime;

        // Sync mesh
        this.syncMeshPosition();
    }

    /**
     * Sync Three.js mesh position with internal position
     */
    syncMeshPosition() {
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;
        if (this.healthBar) {
            this.healthBar.update();
        }
        if (this.debugHitboxVisible) {
            this.updateDebugHitbox();
        }
    }

    /**
     * Get enemy's axis-aligned bounding box
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
     * Change enemy direction
     */
    changeDirection() {
        this.direction *= -1;
    }

    /**
     * Enemy takes damage and dies
     */
    takeDamage() {
        this.currentHealth -= 1;
        if (this.healthBar) {
            this.healthBar.setHealth(this.currentHealth);
        }

        if (this.currentHealth <= 0) {
            this.isAlive = false;
            this.mesh.visible = false;
            if (this.healthBar) {
                this.healthBar.destroy();
            }
            this.setDebugHitboxVisible(false);
            if (this.poisonEffect) {
                if (this.poisonEffect.parent) {
                    this.poisonEffect.parent.remove(this.poisonEffect);
                }
                this.poisonEffect = null;
            }
            if (this.stunEffect) {
                if (this.stunEffect.parent) {
                    this.stunEffect.parent.remove(this.stunEffect);
                }
                this.stunEffect = null;
            }
            if (this.bleedEffect) {
                if (this.bleedEffect.parent) {
                    this.bleedEffect.parent.remove(this.bleedEffect);
                }
                this.bleedEffect = null;
            }
            console.log('Enemy defeated!');
        }
    }

    /**
     * Get enemy position
     * @returns {{x: number, y: number, z: number}}
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * Add zombie-style face and scars
     */
    createZombieDetails() {
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x99ff66 });
        const faceZ = 0.12;
        const glowZ = 0.13;

        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), eyeMaterial);
        leftEye.position.set(-0.18, 0.12, faceZ);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), eyeMaterial);
        rightEye.position.set(0.18, 0.12, faceZ);
        this.mesh.add(rightEye);

        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.02), glowMaterial);
        glow.position.set(0.18, 0.12, glowZ);
        this.mesh.add(glow);

        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.02), eyeMaterial);
        mouth.position.set(0, -0.2, faceZ);
        this.mesh.add(mouth);

        const scar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.02), eyeMaterial);
        scar.position.set(0.05, 0.32, faceZ);
        scar.rotation.z = -0.3;
        this.mesh.add(scar);
    }

    /**
     * Mark enemy as stunned (briefly stops movement)
     * @param {number} durationSeconds
     */
    setStunned(durationSeconds = 0.6) {
        if (!this.isAlive) return;
        this.stunTimer = Math.max(this.stunTimer, durationSeconds);
        if (!this.stunEffect) {
            this.createStunEffect();
        }
    }

    /**
     * Create a stun swirl effect
     */
    createStunEffect() {
        const swirlGroup = new THREE.Group();
        const stars = [];
        const starCount = 6;
        for (let i = 0; i < starCount; i++) {
            const star = new THREE.Group();
            const sparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
            const sparkleA = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), sparkleMaterial.clone());
            const sparkleB = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), sparkleMaterial.clone());
            const sparkleC = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), sparkleMaterial.clone());
            sparkleA.rotation.z = Math.PI / 8;
            sparkleB.rotation.z = -Math.PI / 8;
            sparkleC.rotation.z = Math.PI / 2;
            star.add(sparkleA, sparkleB);
            star.add(sparkleC);

            star.userData.phase = (i / starCount) * Math.PI * 2;
            star.userData.radius = 0.35 + (i % 3) * 0.06;
            swirlGroup.add(star);
            stars.push(star);
        }

        swirlGroup.userData.stars = stars;

        swirlGroup.position.set(this.position.x, this.position.y + 0.8, 0.2);
        this.scene.add(swirlGroup);
        this.stunEffect = swirlGroup;
    }

    /**
     * Update stun swirl animation
     */
    updateStunEffect() {
        if (!this.stunEffect) return;
        this.stunEffect.position.set(this.position.x, this.position.y + 0.8, 0.2);
        const stars = this.stunEffect.userData.stars || [];
        const time = performance.now() * 0.004;
        for (const star of stars) {
            const phase = star.userData.phase || 0;
            const radius = star.userData.radius || 0.3;
            const angle = time + phase;
            star.rotation.z += 0.16;
            star.position.x = Math.cos(angle) * radius;
            star.position.y = 0.35 + Math.sin(angle) * radius * 0.6;
        }
    }

    /**
     * Mark enemy as poisoned (visual only)
     * @param {number} durationSeconds
     */
    setPoisoned(durationSeconds = 0.6) {
        if (!this.isAlive) return;
        this.poisonTimer = Math.max(this.poisonTimer, durationSeconds);
        if (!this.poisonEffect) {
            const ringGeometry = new THREE.RingGeometry(0.55, 0.7, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x33ff77,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            this.poisonEffect = new THREE.Mesh(ringGeometry, ringMaterial);
            this.scene.add(this.poisonEffect);
        }
    }

    /**
     * Mark enemy as bleeding (visual only)
     * @param {number} durationSeconds
     */
    setBleeding(durationSeconds = 0.6) {
        this.bleedTimer = Math.max(this.bleedTimer, durationSeconds);
    }

    /**
     * Update poison ring animation
     */
    updatePoisonEffect() {
        if (!this.poisonEffect) return;
        const pulse = 0.1 + Math.sin(performance.now() * 0.01) * 0.08;
        this.poisonEffect.position.set(this.position.x, this.position.y - 0.1, 0.2);
        this.poisonEffect.scale.set(1 + pulse, 1 + pulse, 1);
        this.poisonEffect.material.opacity = 0.4 + pulse * 0.6;
    }

    /**
     * Update bleed drip animation
     */
    updateBleedEffect() {
        if (this.bleedTimer <= 0) return;
    }

    /**
     * Brief red flash on bleed tick
     */
    flashBleed() {
        const original = this.mesh.material.color.getHex();
        this.mesh.material.color.set(0xff6666);
        setTimeout(() => {
            // Preserve frozen tint if still frozen
            if (this.frozenTimer > 0) {
                this.mesh.material.color.set(0x88ddff);
            } else {
                this.mesh.material.color.set(original || this.baseColor);
            }
        }, 120);
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
            const material = new THREE.LineBasicMaterial({ color: 0xffaa00 });
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


