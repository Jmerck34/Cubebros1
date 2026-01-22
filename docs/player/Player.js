import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PLAYER_SPEED, DEATH_Y, JUMP_VELOCITY } from '../core/constants.js';
import { applyGravity, handleJump } from './playerPhysics.js';
import { checkAABBCollision } from '../utils/collision.js';
import { HealthBar } from '../ui/HealthBar.js';
import { spawnDamageNumber } from '../utils/damageNumbers.js';
import { normalizeVisibilityLayer, visibilityLayerToZ, VISIBILITY_LAYERS } from '../utils/visibility.js';
import { Shield } from './Shield.js';

function createTextSprite(text, options = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const spriteMaterial = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.userData = {
        canvas,
        ctx,
        options
    };
    updateTextSprite(sprite, text);
    return sprite;
}

function updateTextSprite(sprite, text) {
    const { canvas, ctx, options } = sprite.userData || {};
    if (!canvas || !ctx) return;

    const fontSize = options?.fontSize ?? 32;
    const padding = options?.padding ?? 10;
    const font = `700 ${fontSize}px Arial`;
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.2);

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = canvas.width / 2;
    const y = canvas.height / 2;
    ctx.lineWidth = 6;
    ctx.strokeStyle = options?.stroke || 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = options?.color || '#ffffff';
    ctx.fillText(text, x, y);

    if (sprite.material?.map) {
        sprite.material.map.needsUpdate = true;
    }

    const scale = options?.scale ?? 0.01;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
}

/**
 * Player Entity - Handles player movement, physics, and state
 * @class Player
 */
export class Player {
    static getAllPlayers() {
        return Array.from(Player.instances || []);
    }

    static getProtectionDomes() {
        return Array.from(Player.protectionDomes || []);
    }

    static addProtectionDome(dome) {
        if (!Player.protectionDomes) {
            Player.protectionDomes = new Set();
        }
        Player.protectionDomes.add(dome);
    }

    static removeProtectionDome(dome) {
        if (!Player.protectionDomes) return;
        Player.protectionDomes.delete(dome);
    }

    constructor(scene, startX = 0, startY = 0) {
        // Store scene reference for health bar
        this.scene = scene;

        // Create player mesh (neutral base cube)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x4a4f57 }); // Neutral slate
        this.mesh = new THREE.Mesh(geometry, material);
        this.baseColor = material.color.getHex();

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
        this.visibilityLayer = normalizeVisibilityLayer(VISIBILITY_LAYERS.default);
        this.visibilityBaseZ = this.position.z;
        this.setVisibilityLayer(this.visibilityLayer);

        // State
        this.isGrounded = false;
        this.isAlive = true;
        this.team = null;
        this.type = 'player';
        this.respawnDelay = 3.0;
        this.respawnTimer = 0;
        this.isCarryingFlag = false;
        this.flagCarryTeam = null;
        this.flagCarryBlocksAbility3 = false;
        this.flagDropWasPressed = false;
        this.lastDeathWasPit = false;
        this.lastDamageSource = null;
        this.lastDamageTime = null;

        // Status effects (for hero-vs-hero interactions)
        this.frozenTimer = 0;
        this.isFrozen = false;
        this.stunTimer = 0;
        this.isStunned = false;
        this.stunEffect = null;
        this.poisonTimer = 0;
        this.poisonEffect = null;
        this.bleedTimer = 0;
        this.bleedFlashTimer = 0;
        this.bleedDrops = [];
        this.bleedDropTimer = 0;
        this.burningTimer = 0;
        this.burningTickTimer = 0;
        this.burningTickInterval = 0.5;
        this.burningDamage = 0;
        this.burningSource = null;
        this.burningEffect = null;
        this.burningFlames = [];
        this.entangleTimer = 0;
        this.entangleEffect = null;
        this.fearTimer = 0;
        this.fearDirection = 0;
        this.mindControlTimer = 0;
        this.disorientTimer = 0;
        this.disorientSpinSpeed = 4;
        this.slowTimer = 0;
        this.slowMultiplier = 1;
        this.crippleTimer = 0;
        this.jumpDisabled = false;
        this.controlsInverted = false;
        this.controlsLocked = false;
        this.forceControlsLocked = false;
        this.launcherChargeStart = null;
        this.launcherCooldownUntil = 0;

        // Jump state for double jump
        this.maxJumps = 2;
        this.jumpsRemaining = this.maxJumps; // Allow 2 jumps (ground + air)
        this.jumpKeyWasPressed = false; // Track key state to prevent spam

        // Health system
        this.baseMaxHealth = 100;
        this.bonusHealth = 0;
        this.bonusHealthTimer = 0;
        this.shieldStatus = new Shield();
        this.lastShieldAmount = 0;
        this.maxHealth = this.baseMaxHealth + this.bonusHealth;
        this.currentHealth = this.maxHealth;
        this.healthBar = new HealthBar(scene, this, this.baseMaxHealth);
        this.healthBar.setShield(0);

        if (!Player.instances) {
            Player.instances = new Set();
        }
        Player.instances.add(this);

        // Enemy contact settings (tuned via DebugMenu)
        this.enemyContactDamage = 8;
        this.enemyContactKnockbackX = 1.8;
        this.enemyContactKnockbackY = 2.2;
        this.enemyContactCooldownDuration = 0.6;
        this.enemyContactCooldown = 0;

        // Debug physics multipliers (set by DebugMenu)
        this.debugPhysics = null;

        // Simple visual animation state for cube heroes
        this.animTime = 0;
        this.visualBob = 0;
        this.visualScaleY = 1;
        this.visualScaleZ = 1;
        this.visualTiltZ = 0;
        this.moveSpeedMultiplier = 1;
        this.jumpMultiplier = 1;
        this.scaleMultiplier = 1;
        this.baseScale = { x: 1, y: 1, z: 1 };
        this.hitboxScale = { x: 1, y: 1 };
        this.debugHitboxVisible = false;
        this.debugHitbox = null;
        this.jumpSoundVolume = 0.05;
        this.landSoundVolume = 0.05;
        this.wasGrounded = false;
        this.didLandThisFrame = false;
        this.landSoundReady = false;
        this.landSoundCooldown = 0;
        this.hasEverGrounded = false;
        this.fallPeakY = this.position.y;
        this.fallDistance = 0;
        this.fallDamageGraceTimer = 0;
        this.fallDamageReset = false;
        this.initJumpAudio();
        this.initLandAudio();
        this.initRespawnIndicator();

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

    initJumpAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/jump.mp3', import.meta.url);
            const audioPool = [];
            for (let i = 0; i < 4; i++) {
                const audio = new Audio(audioUrl);
                audio.volume = this.jumpSoundVolume;
                audio.preload = 'auto';
                audio.load();
                audioPool.push(audio);
            }
            this.jumpAudio = audioPool;
        } catch (error) {
            this.jumpAudio = null;
        }
    }

    initLandAudio() {
        try {
            const landUrl = new URL('../assets/sfx/landing_thud.wav', import.meta.url);
            const audioPool = [];
            for (let i = 0; i < 4; i++) {
                const audio = new Audio(landUrl);
                audio.volume = this.landSoundVolume;
                audio.preload = 'auto';
                audio.load();
                audioPool.push(audio);
            }
            this.landAudio = audioPool;
        } catch (error) {
            this.landAudio = null;
        }
    }

    playJumpSound() {
        if (!this.jumpAudio || !this.jumpAudio.length) return;
        const sound = this.jumpAudio.find((node) => node.paused || node.ended) || this.jumpAudio[0];
        sound.currentTime = 0;
        sound.volume = this.jumpSoundVolume;
        sound.play().catch(() => {});
    }

    playLandSound(impactSpeed = 1, fallDistance = 0) {
        if (!this.landAudio || !this.landAudio.length) return;
        const sound = this.landAudio.find((node) => node.paused || node.ended) || this.landAudio[0];
        const speedFactor = Math.min(1, Math.max(0.3, impactSpeed / 10));
        const distanceFactor = Math.min(1, Math.max(0.2, fallDistance / 6));
        const intensity = Math.min(1, Math.max(0.2, distanceFactor * 0.75 + speedFactor * 0.25));
        sound.currentTime = 0;
        sound.volume = this.landSoundVolume * intensity;
        sound.play().catch(() => {});
        this.landSoundCooldown = 0.12;
    }

    /**
     * Set body color and synced accent elements
     * @param {number} hexColor - Hex color for the body
     */
    setBodyColor(hexColor) {
        this.baseColor = hexColor;
        this.mesh.material.color.set(hexColor);
        if (this.frontPanel) {
            this.frontPanel.material.color.set(hexColor);
        }
    }

    /**
     * Apply a temporary status tint to the core body panels.
     * @param {number} hexColor
     */
    setEffectColor(hexColor) {
        this.mesh.material.color.set(hexColor);
        if (this.frontPanel) {
            this.frontPanel.material.color.set(hexColor);
        }
    }

    /**
     * Update timers and visuals for status effects.
     * @param {number} deltaTime
     */
    updateStatusEffects(deltaTime) {
        if (this.frozenTimer > 0) {
            this.frozenTimer = Math.max(0, this.frozenTimer - deltaTime);
        }
        this.isFrozen = this.frozenTimer > 0;
        if (this.stunTimer > 0) {
            this.stunTimer = Math.max(0, this.stunTimer - deltaTime);
        }
        if (this.poisonTimer > 0) {
            this.poisonTimer = Math.max(0, this.poisonTimer - deltaTime);
        }
        if (this.slowTimer > 0) {
            this.slowTimer = Math.max(0, this.slowTimer - deltaTime);
            if (this.slowTimer === 0) {
                this.slowMultiplier = 1;
            }
        }
        if (this.bleedTimer > 0) {
            this.bleedTimer = Math.max(0, this.bleedTimer - deltaTime);
            this.updateBleedEffect(deltaTime, true);
        } else {
            this.updateBleedEffect(deltaTime, false);
        }
        if (this.burningTimer > 0) {
            this.burningTimer = Math.max(0, this.burningTimer - deltaTime);
            this.burningTickTimer += deltaTime;
            while (this.burningTickTimer >= this.burningTickInterval) {
                this.burningTickTimer -= this.burningTickInterval;
                if (this.burningDamage > 0) {
                    this.takeDamage(this.burningDamage, this.burningSource);
                }
            }
        } else {
            this.burningTickTimer = 0;
            this.burningSource = null;
        }
        if (this.entangleTimer > 0) {
            this.entangleTimer = Math.max(0, this.entangleTimer - deltaTime);
        }
        if (this.bleedFlashTimer > 0) {
            this.bleedFlashTimer = Math.max(0, this.bleedFlashTimer - deltaTime);
        }
        if (this.fearTimer > 0) {
            this.fearTimer = Math.max(0, this.fearTimer - deltaTime);
        }
        if (this.mindControlTimer > 0) {
            this.mindControlTimer = Math.max(0, this.mindControlTimer - deltaTime);
        }
        if (this.disorientTimer > 0) {
            this.disorientTimer = Math.max(0, this.disorientTimer - deltaTime);
        }
        if (this.crippleTimer > 0) {
            this.crippleTimer = Math.max(0, this.crippleTimer - deltaTime);
        }

        if (this.stunTimer > 0) {
            if (!this.isStunned) {
                this.isStunned = true;
                this.createStunEffect();
            }
            this.updateStunEffect();
        } else if (this.isStunned) {
            this.isStunned = false;
            if (this.stunEffect && this.stunEffect.parent) {
                this.stunEffect.parent.remove(this.stunEffect);
            }
            this.stunEffect = null;
        }

        if (this.poisonTimer > 0) {
            this.updatePoisonEffect();
        } else if (this.poisonEffect) {
            if (this.poisonEffect.parent) {
                this.poisonEffect.parent.remove(this.poisonEffect);
            }
            this.poisonEffect = null;
        }

        if (this.burningTimer > 0) {
            if (!this.burningEffect) {
                this.createBurningEffect();
            }
            this.updateBurningEffect(deltaTime);
        } else if (this.burningEffect) {
            this.clearBurningEffect();
        }

        if (this.entangleTimer > 0) {
            if (!this.entangleEffect) {
                this.createEntangleEffect();
            }
            this.updateEntangleEffect();
        } else if (this.entangleEffect) {
            if (this.entangleEffect.parent) {
                this.entangleEffect.parent.remove(this.entangleEffect);
            }
            this.entangleEffect = null;
        }

        this.controlsLocked = this.stunTimer > 0 || this.frozenTimer > 0 || this.entangleTimer > 0;
        this.controlsInverted = this.mindControlTimer > 0 || this.disorientTimer > 0;
        this.jumpDisabled = this.crippleTimer > 0;

        const tint = this.bleedFlashTimer > 0
            ? 0xff6666
            : (this.entangleTimer > 0
                ? 0x6fdc6a
                : (this.frozenTimer > 0
                    ? 0x88ddff
                    : (this.stunTimer > 0
                        ? 0xffdd55
                        : (this.crippleTimer > 0
                            ? 0x8a939a
                            : (this.fearTimer > 0
                                ? 0xff6666
                                : (this.mindControlTimer > 0 ? 0x9400d3 : this.baseColor))))));
        this.setEffectColor(tint);
    }

    /**
     * Apply freeze to player.
     * @param {number} durationSeconds
     */
    setFrozen(durationSeconds = 1.2) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.frozenTimer = Math.max(this.frozenTimer, durationSeconds);
    }

    /**
     * Apply stun to player.
     * @param {number} durationSeconds
     */
    setStunned(durationSeconds = 0.6) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.stunTimer = Math.max(this.stunTimer, durationSeconds);
        if (!this.stunEffect) {
            this.createStunEffect();
        }
    }

    /**
     * Create stun swirl effect.
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
     * Update stun swirl animation.
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
     * Apply poison effect (visual).
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
     * Apply slow effect.
     * @param {number} durationSeconds
     * @param {number} multiplier
     */
    setSlowed(durationSeconds = 1.2, multiplier = 0.7) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.slowTimer = Math.max(this.slowTimer, durationSeconds);
        this.slowMultiplier = Math.min(this.slowMultiplier, multiplier);
    }

    /**
     * Update poison ring animation.
     */
    updatePoisonEffect() {
        if (!this.poisonEffect) return;
        const pulse = 0.1 + Math.sin(performance.now() * 0.01) * 0.08;
        this.poisonEffect.position.set(this.position.x, this.position.y - 0.1, 0.2);
        this.poisonEffect.scale.set(1 + pulse, 1 + pulse, 1);
        this.poisonEffect.material.opacity = 0.4 + pulse * 0.6;
    }

    /**
     * Apply bleed status duration (visual timing).
     * @param {number} durationSeconds
     */
    setBleeding(durationSeconds = 1.0) {
        this.bleedTimer = Math.max(this.bleedTimer, durationSeconds);
    }

    /**
     * Flash red briefly on bleed tick.
     */
    flashBleed() {
        this.bleedFlashTimer = Math.max(this.bleedFlashTimer, 0.15);
    }

    /**
     * Update bleed drip animation.
     * @param {number} deltaTime
     * @param {boolean} isBleeding
     */
    updateBleedEffect(deltaTime, isBleeding) {
        if (!this.bleedDrops) {
            this.bleedDrops = [];
        }
        if (isBleeding) {
            this.bleedDropTimer = Math.max(0, this.bleedDropTimer - deltaTime);
            if (this.bleedDropTimer === 0) {
                this.spawnBleedDrop();
                this.bleedDropTimer = 0.12 + Math.random() * 0.1;
            }
        }

        for (let i = this.bleedDrops.length - 1; i >= 0; i--) {
            const drop = this.bleedDrops[i];
            drop.life += deltaTime;
            drop.velocityY += drop.gravity * deltaTime;
            drop.mesh.position.x += drop.velocityX * deltaTime;
            drop.mesh.position.y += drop.velocityY * deltaTime;
            drop.opacity -= deltaTime * 1.6;
            drop.mesh.material.opacity = Math.max(0, drop.opacity);

            if (drop.opacity <= 0 || drop.life > 0.9) {
                if (drop.mesh.parent) {
                    drop.mesh.parent.remove(drop.mesh);
                }
                this.bleedDrops.splice(i, 1);
            }
        }
    }

    spawnBleedDrop() {
        if (!this.scene) return;
        const geometry = new THREE.SphereGeometry(0.06, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xb0001e,
            transparent: true,
            opacity: 0.7
        });
        const drop = new THREE.Mesh(geometry, material);
        drop.scale.set(0.8, 1.4, 1);
        const offsetX = (Math.random() - 0.5) * 0.35;
        const offsetY = 0.35 + Math.random() * 0.2;
        drop.position.set(this.position.x + offsetX, this.position.y + offsetY, 0.6);
        this.scene.add(drop);

        this.bleedDrops.push({
            mesh: drop,
            velocityX: (Math.random() - 0.5) * 0.2,
            velocityY: -0.2 - Math.random() * 0.2,
            gravity: -6,
            opacity: 0.7,
            life: 0
        });
    }

    clearBleedDrops() {
        if (!this.bleedDrops) return;
        this.bleedDrops.forEach((drop) => {
            if (drop.mesh && drop.mesh.parent) {
                drop.mesh.parent.remove(drop.mesh);
            }
        });
        this.bleedDrops = [];
        this.bleedDropTimer = 0;
    }

    /**
     * Apply fear (forced movement away).
     * @param {number} sourceX
     * @param {number} durationSeconds
     */
    applyFear(sourceX, durationSeconds = 0.7) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.fearTimer = Math.max(this.fearTimer, durationSeconds);
        this.fearDirection = this.position.x >= sourceX ? 1 : -1;
    }

    /**
     * Apply mind control (invert controls).
     * @param {number} durationSeconds
     */
    applyMindControl(durationSeconds = 2.5) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.mindControlTimer = Math.max(this.mindControlTimer, durationSeconds);
    }

    /**
     * Apply burning damage over time.
     * @param {number} durationSeconds
     * @param {number} damagePerTick
     * @param {number} tickIntervalSeconds
     * @param {Object|null} source
     */
    applyBurning(durationSeconds = 1, damagePerTick = 5, tickIntervalSeconds = 0.5, source = null) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.burningTimer = Math.max(this.burningTimer, durationSeconds);
        this.burningDamage = damagePerTick;
        this.burningTickInterval = tickIntervalSeconds;
        this.burningSource = source;
    }

    createBurningEffect() {
        if (!this.scene) return;
        const group = new THREE.Group();
        const flames = [];
        const glow = new THREE.Mesh(
            new THREE.CircleGeometry(0.5, 20),
            new THREE.MeshBasicMaterial({
                color: 0xff7a1a,
                transparent: true,
                opacity: 0.25,
                depthTest: false
            })
        );
        glow.position.set(0, 0.05, 0.52);
        group.add(glow);

        const flameCount = 5;
        for (let i = 0; i < flameCount; i += 1) {
            const flameGroup = new THREE.Group();
            const outerFlame = new THREE.Mesh(
                new THREE.ConeGeometry(0.14, 0.42, 6),
                new THREE.MeshBasicMaterial({
                    color: 0xff6a1a,
                    transparent: true,
                    opacity: 0.75,
                    depthTest: false
                })
            );
            const innerFlame = new THREE.Mesh(
                new THREE.ConeGeometry(0.09, 0.3, 6),
                new THREE.MeshBasicMaterial({
                    color: 0xffe08a,
                    transparent: true,
                    opacity: 0.85,
                    depthTest: false
                })
            );
            outerFlame.position.y = 0.1;
            innerFlame.position.y = 0.12;
            flameGroup.add(outerFlame, innerFlame);

            const baseX = (i - (flameCount - 1) / 2) * 0.16;
            const baseY = 0.08 + (i % 2) * 0.06;
            flameGroup.position.set(baseX, baseY, 0.55);
            flameGroup.userData = {
                phase: Math.random() * Math.PI * 2,
                scale: 0.75 + Math.random() * 0.25,
                baseX,
                baseY,
                outerFlame,
                innerFlame
            };
            group.add(flameGroup);
            flames.push(flameGroup);
        }
        group.position.set(this.position.x, this.position.y - 0.1, 0.55);
        this.scene.add(group);
        this.burningEffect = group;
        this.burningFlames = flames;
    }

    updateBurningEffect(deltaTime) {
        if (!this.burningEffect) return;
        this.burningEffect.position.set(this.position.x, this.position.y - 0.1, 0.55);
        const time = performance.now() * 0.006;
        const flames = this.burningFlames || [];
        flames.forEach((flameGroup, index) => {
            const phase = time + (flameGroup.userData?.phase || 0) + index * 0.6;
            const baseX = flameGroup.userData?.baseX || 0;
            const baseY = flameGroup.userData?.baseY || 0;
            flameGroup.position.x = baseX + Math.sin(phase) * 0.05;
            flameGroup.position.y = baseY + Math.cos(phase * 0.9) * 0.02;
            flameGroup.rotation.z = Math.sin(phase * 0.7) * 0.08;
            const scaleY = (flameGroup.userData?.scale || 0.8) + 0.25 * Math.sin(phase * 1.4);
            const scaleX = 0.7 + 0.2 * Math.sin(phase * 1.1);
            flameGroup.scale.set(scaleX, scaleY, 1);

            const outerFlame = flameGroup.userData?.outerFlame;
            const innerFlame = flameGroup.userData?.innerFlame;
            if (outerFlame?.material) {
                outerFlame.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(phase * 1.2));
            }
            if (innerFlame?.material) {
                innerFlame.material.opacity = 0.55 + 0.3 * Math.abs(Math.cos(phase * 1.1));
            }
        });
    }

    clearBurningEffect() {
        if (this.burningEffect && this.burningEffect.parent) {
            this.burningEffect.parent.remove(this.burningEffect);
        }
        this.burningEffect = null;
        this.burningFlames = [];
    }

    /**
     * Apply disorient (invert controls + aim).
     * @param {number} durationSeconds
     */
    applyDisorient(durationSeconds = 1.5) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.disorientTimer = Math.max(this.disorientTimer, durationSeconds);
    }

    /**
     * Apply cripple (disable jumping).
     * @param {number} durationSeconds
     */
    setCripple(durationSeconds = 1.5) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.crippleTimer = Math.max(this.crippleTimer, durationSeconds);
    }

    /**
     * Apply entangle (root) effect.
     * @param {number} durationSeconds
     */
    setEntangled(durationSeconds = 1.0) {
        if (!this.isAlive) return;
        if (this.hasActiveShield()) return;
        this.entangleTimer = Math.max(this.entangleTimer, durationSeconds);
    }

    /**
     * Clear all status effects.
     */
    clearStatusEffects() {
        this.frozenTimer = 0;
        this.stunTimer = 0;
        this.poisonTimer = 0;
        this.bleedTimer = 0;
        this.bleedFlashTimer = 0;
        this.burningTimer = 0;
        this.burningTickTimer = 0;
        this.burningSource = null;
        this.clearBurningEffect();
        this.fearTimer = 0;
        this.mindControlTimer = 0;
        this.disorientTimer = 0;
        this.slowTimer = 0;
        this.slowMultiplier = 1;
        this.crippleTimer = 0;
        this.entangleTimer = 0;
        this.jumpDisabled = false;
        this.controlsLocked = false;
        this.controlsInverted = false;
        this.fearDirection = 0;
        this.isFrozen = false;
        this.isStunned = false;
        this.clearBleedDrops();

        if (this.stunEffect && this.stunEffect.parent) {
            this.stunEffect.parent.remove(this.stunEffect);
        }
        this.stunEffect = null;

        if (this.poisonEffect && this.poisonEffect.parent) {
            this.poisonEffect.parent.remove(this.poisonEffect);
        }
        this.poisonEffect = null;

        if (this.entangleEffect && this.entangleEffect.parent) {
            this.entangleEffect.parent.remove(this.entangleEffect);
        }
        this.entangleEffect = null;

        this.setEffectColor(this.baseColor);
    }

    /**
     * Clear crowd control effects only (freeze/stun/slow/fear/mind control/cripple).
     */
    clearCrowdControl() {
        this.frozenTimer = 0;
        this.stunTimer = 0;
        this.fearTimer = 0;
        this.mindControlTimer = 0;
        this.disorientTimer = 0;
        this.slowTimer = 0;
        this.slowMultiplier = 1;
        this.crippleTimer = 0;
        this.entangleTimer = 0;
        this.jumpDisabled = false;
        this.controlsLocked = false;
        this.controlsInverted = false;
        this.fearDirection = 0;
        this.isFrozen = false;
        this.isStunned = false;

        if (this.stunEffect && this.stunEffect.parent) {
            this.stunEffect.parent.remove(this.stunEffect);
        }
        this.stunEffect = null;

        if (this.entangleEffect && this.entangleEffect.parent) {
            this.entangleEffect.parent.remove(this.entangleEffect);
        }
        this.entangleEffect = null;
    }

    createEntangleEffect() {
        const group = new THREE.Group();
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.45, 0.6, 20),
            new THREE.MeshBasicMaterial({
                color: 0x0f2f18,
                transparent: true,
                opacity: 0.12,
                side: THREE.DoubleSide
            })
        );
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        const vineCount = 8;
        for (let i = 0; i < vineCount; i += 1) {
            const vine = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.4, 0.02),
                new THREE.MeshBasicMaterial({ color: 0x24532a, transparent: true, opacity: 0.7 })
            );
            const angle = (i / vineCount) * Math.PI * 2;
            vine.position.set(Math.cos(angle) * 0.35, 0.15, Math.sin(angle) * 0.35);
            vine.rotation.y = angle;
            group.add(vine);
        }

        group.position.set(this.position.x, this.position.y - 0.45, 0.2);
        this.scene.add(group);
        this.entangleEffect = group;
    }

    updateEntangleEffect() {
        if (!this.entangleEffect) return;
        this.entangleEffect.position.set(this.position.x, this.position.y - 0.45, 0.2);
        this.entangleEffect.rotation.y += 0.05;
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
        this.prevPosition = { ...this.position };
        this.wasGrounded = this.isGrounded;
        this.didLandThisFrame = false;

        if (this.enemyContactCooldown > 0) {
            this.enemyContactCooldown = Math.max(0, this.enemyContactCooldown - deltaTime);
        }
        if (this.landSoundCooldown > 0) {
            this.landSoundCooldown = Math.max(0, this.landSoundCooldown - deltaTime);
        }
        if (this.fallDamageGraceTimer > 0) {
            this.fallDamageGraceTimer = Math.max(0, this.fallDamageGraceTimer - deltaTime);
        }

        if (!this.isAlive) {
            this.respawnTimer = Math.max(0, this.respawnTimer - deltaTime);
            this.updateRespawnIndicator();
            if (this.respawnTimer === 0) {
                this.respawn();
            }
            return;
        }

        this.updateStatusEffects(deltaTime);
        this.updateBonusHealth(deltaTime);
        this.updateShield(deltaTime);

        if (!Number.isFinite(this.currentHealth)) {
            this.currentHealth = 0;
            this.healthBar.setHealth(0);
        }

        if (this.currentHealth <= 0) {
            this.lastDeathWasPit = false;
            this.die();
            return;
        }

        const controlsLocked = this.controlsLocked || this.forceControlsLocked;

        // Horizontal movement
        this.velocity.x = 0; // Reset horizontal velocity

        // Apply debug speed multiplier if available
        const debugMultiplier = this.debugPhysics ? this.debugPhysics.moveSpeedMultiplier : 1.0;
        const speedMultiplier = debugMultiplier * (this.moveSpeedMultiplier || 1) * (this.slowMultiplier || 1);
        let leftPressed = input.isLeftPressed();
        let rightPressed = input.isRightPressed();
        if (this.controlsInverted) {
            const swap = leftPressed;
            leftPressed = rightPressed;
            rightPressed = swap;
        }

        if (!controlsLocked) {
            if (this.fearTimer > 0 && this.fearDirection) {
                this.velocity.x = PLAYER_SPEED * speedMultiplier * this.fearDirection;
            } else {
                if (leftPressed) {
                    this.velocity.x = -PLAYER_SPEED * speedMultiplier;
                }
                if (rightPressed) {
                    this.velocity.x = PLAYER_SPEED * speedMultiplier;
                }
            }
        }

        // Apply horizontal velocity
        this.position.x += this.velocity.x * deltaTime;

        // Handle jump input
        if (!controlsLocked) {
            handleJump(this, input);
        } else {
            this.jumpKeyWasPressed = false;
        }

        // Apply gravity (collision handled by Level)
        applyGravity(this, deltaTime);

        // Check death zone
        const deathY = Number.isFinite(this.level?.deathY) ? this.level.deathY : DEATH_Y;
        if (this.position.y < deathY) {
            this.lastDeathWasPit = true;
            this.die();
        }

        // Update facial animations
        this.updateFaceAnimations(deltaTime);

        // Update simple cube animation (bob + air stretch)
        this.updateCubeAnimation(deltaTime, wasGrounded);

        // Update health bar
        this.healthBar.update(deltaTime);
        this.updateRespawnIndicator();

        // Sync mesh with internal position
        this.syncMeshPosition();

        // Update debug hitbox
        if (this.debugHitboxVisible) {
            this.updateDebugHitbox();
        }
    }

    /**
     * Apply enemy contact damage + slight knockback with cooldown.
     * @param {Object} enemy - Enemy instance
     */
    applyEnemyContact(enemy) {
        if (!this.isAlive) {
            return;
        }

        if (this.enemyContactCooldown > 0) {
            return;
        }

        const damage = this.enemyContactDamage || 0;
        if (damage > 0) {
            this.takeDamage(damage);
        }

        const knockDir = this.position.x < enemy.position.x ? -1 : 1;
        const knockX = (this.enemyContactKnockbackX || 0) * knockDir;
        const knockY = this.enemyContactKnockbackY || 0;

        this.velocity.x = knockX;
        this.velocity.y = Math.max(this.velocity.y, knockY);
        this.isGrounded = false;
        this.enemyContactCooldown = this.enemyContactCooldownDuration || 0;
    }


    /**
     * Check if another entity is on the same team
     * @param {Object} other
     * @returns {boolean}
     */
    isSameTeam(other) {
        return Boolean(this.team && other && other.team && this.team === other.team);
    }

    /**
     * Get all player instances.
     * @returns {Array<Player>}
     */
    getAllPlayers() {
        return Player.getAllPlayers();
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
        const scaleMultiplier = Number.isFinite(this.scaleMultiplier) ? this.scaleMultiplier : 1;
        const baseScale = this.baseScale || { x: 1, y: 1, z: 1 };
        const facing = this.mesh.scale.x >= 0 ? 1 : -1;
        this.mesh.scale.x = (baseScale.x || 1) * scaleMultiplier * facing;
        this.mesh.scale.y = this.visualScaleY * (baseScale.y || 1) * scaleMultiplier;
        this.mesh.scale.z = this.visualScaleZ * (baseScale.z || 1) * scaleMultiplier;
        this.mesh.rotation.z = this.visualTiltZ;
    }

    setVisibilityLayer(visibilityLayer) {
        this.visibilityLayer = normalizeVisibilityLayer(visibilityLayer, this.visibilityLayer);
        this.position.z = visibilityLayerToZ(this.visibilityLayer, this.visibilityBaseZ);
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
        if (this.forceVisualTiltZ) {
            this.visualBob = 0;
        }

        if (isGroundMove) {
            const stride = this.animTime * 12;
            const hop = Math.abs(Math.sin(stride));
            const stretch = Math.sin(stride) * 0.08 * moveAmount;
            this.visualBob = hop * 0.08 * moveAmount;
            this.visualScaleY = 1 + stretch;
            this.visualScaleZ = 1 - stretch * 0.6;
            if (!this.forceVisualTiltZ) {
                this.visualTiltZ = -0.12 * Math.sign(this.velocity.x || 1) * moveAmount;
            }
        } else if (!wasGrounded) {
            const fallStretch = Math.min(Math.abs(this.velocity.y) * 0.02, 0.12);
            this.visualScaleY = 1 + fallStretch;
            this.visualScaleZ = 1 - fallStretch * 0.5;
            this.visualBob = 0;
            if (!this.forceVisualTiltZ) {
                this.visualTiltZ = -0.06 * Math.sign(this.velocity.x || 1) * moveAmount;
            }
        } else {
            // Gentle idle squash to avoid dead-still pose
            const breathe = Math.sin(this.animTime * 2) * 0.02;
            this.visualScaleY = 1 + breathe;
            this.visualScaleZ = 1 - breathe * 0.5;
            this.visualBob = 0;
            if (!this.forceVisualTiltZ) {
                this.visualTiltZ = 0;
            }
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
    takeDamage(amount, source = null) {
        if (!this.isAlive) {
            return;
        }

        const damage = Number.isFinite(amount) ? amount : 1;
        if (damage <= 0) {
            return;
        }

        if (source && source !== this) {
            this.lastDamageSource = source;
            this.lastDamageTime = performance.now();
        }

        spawnDamageNumber(this.scene, this.position, damage, {
            color: '#ff7a7a',
            stroke: 'rgba(20, 0, 0, 0.9)'
        });

        if (!Number.isFinite(this.currentHealth)) {
            this.currentHealth = this.maxHealth;
        }

        let remainingDamage = damage;
        if (this.shieldStatus && this.shieldStatus.isActive) {
            const beforeShield = this.shieldStatus.amount;
            remainingDamage = this.shieldStatus.absorb(remainingDamage);
            if (this.healthBar && beforeShield !== this.shieldStatus.amount) {
                this.healthBar.setShield(this.shieldStatus.amount);
            }
            if (beforeShield > 0 && this.shieldStatus.amount === 0) {
                this.spawnShieldBreakEffect();
            }
        }

        if (this.bonusHealth > 0) {
            const shieldDamage = Math.min(this.bonusHealth, remainingDamage);
            this.bonusHealth = Math.max(0, this.bonusHealth - shieldDamage);
            remainingDamage -= shieldDamage;
            const baseHealth = Math.min(this.currentHealth, this.baseMaxHealth);
            this.currentHealth = Math.min(baseHealth + this.bonusHealth, this.baseMaxHealth + this.bonusHealth);
            if (this.healthBar) {
                this.healthBar.setBonusHealth(this.bonusHealth);
            }
        }

        if (remainingDamage > 0) {
            this.currentHealth = Math.max(0, this.currentHealth - remainingDamage);
        }
        if (this.healthBar) {
            this.healthBar.setHealth(this.currentHealth);
        }

        if (this.currentHealth <= 0) {
            this.lastDeathWasPit = false;
            this.die();
        }
    }

    /**
     * Prevent fall damage briefly (used for last-second jumps/dashes/hover).
     * @param {number} seconds
     */
    setFallDamageGrace(seconds = 0.3) {
        const value = Number.isFinite(seconds) ? seconds : 0.3;
        this.fallDamageGraceTimer = Math.max(this.fallDamageGraceTimer || 0, value);
        this.fallDamageReset = true;
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
     * Apply a shield amount that absorbs damage before health.
     * @param {number} amount
     * @param {number} durationSeconds
     */
    addShield(amount, durationSeconds = 0) {
        if (!this.shieldStatus) return;
        const nextAmount = Math.max(0, Math.round(amount));
        if (nextAmount <= 0) return;
        const applied = Math.max(this.shieldStatus.amount, nextAmount);
        this.shieldStatus.set(applied, durationSeconds);
        this.clearCrowdControl();
        if (this.healthBar) {
            this.healthBar.setShield(this.shieldStatus.amount);
        }
    }

    /**
     * Update shield timer.
     * @param {number} deltaTime
     */
    updateShield(deltaTime) {
        if (!this.shieldStatus) return;
        const before = this.shieldStatus.amount;
        this.shieldStatus.update(deltaTime);
        if (before !== this.shieldStatus.amount && this.healthBar) {
            this.healthBar.setShield(this.shieldStatus.amount);
        }
        if (before > 0 && this.shieldStatus.amount === 0) {
            this.spawnShieldBreakEffect();
        }
    }

    /**
     * Apply a temporary bonus health amount.
     * @param {number} percent
     * @param {number} durationSeconds
     */
    applyHealthBonus(percent = 0.3, durationSeconds = 2) {
        const bonusAmount = Math.round(this.baseMaxHealth * percent);
        if (!Number.isFinite(bonusAmount) || bonusAmount <= 0) {
            return;
        }

        this.bonusHealth = bonusAmount;
        this.bonusHealthTimer = durationSeconds;
        this.maxHealth = this.baseMaxHealth + this.bonusHealth;
        const baseHealth = Math.min(this.currentHealth, this.baseMaxHealth);
        this.currentHealth = Math.min(baseHealth + this.bonusHealth, this.maxHealth);

        if (this.healthBar) {
            this.healthBar.setBonusHealth(this.bonusHealth);
            this.healthBar.setHealth(this.currentHealth);
        }
    }

    /**
     * Update bonus health timer.
     * @param {number} deltaTime
     */
    updateBonusHealth(deltaTime) {
        if (this.bonusHealthTimer > 0) {
            this.bonusHealthTimer = Math.max(0, this.bonusHealthTimer - deltaTime);
            if (this.bonusHealthTimer === 0) {
                this.clearHealthBonus();
            }
        }
    }

    /**
     * Clear any active bonus health.
     */
    clearHealthBonus() {
        if (this.bonusHealth <= 0) {
            return;
        }
        this.bonusHealth = 0;
        this.bonusHealthTimer = 0;
        this.maxHealth = this.baseMaxHealth;
        if (this.currentHealth > this.maxHealth) {
            this.currentHealth = this.maxHealth;
        }
        if (this.healthBar) {
            this.healthBar.setBonusHealth(0);
            this.healthBar.setHealth(this.currentHealth);
        }
    }

    /**
     * Set base max health (non-bonus).
     * @param {number} maxHealth
     */
    setBaseMaxHealth(maxHealth) {
        const nextMax = Math.max(1, Math.round(maxHealth));
        this.baseMaxHealth = nextMax;
        this.maxHealth = this.baseMaxHealth + this.bonusHealth;
        if (this.currentHealth > this.maxHealth) {
            this.currentHealth = this.maxHealth;
        }
        if (this.healthBar) {
            this.healthBar.setBaseMaxHealth(this.baseMaxHealth);
            this.healthBar.setBonusHealth(this.bonusHealth);
            this.healthBar.setHealth(this.currentHealth);
        }
    }

    /**
     * Handle player death - respawn at spawn point
     */
    die() {
        if (!this.isAlive) {
            return;
        }

        console.log('Player died - respawning');
        this.isAlive = false;
        this.respawnTimer = this.respawnDelay;
        this.clearHealthBonus();
        if (this.shieldStatus) {
            this.shieldStatus.set(0, 0);
        }
        this.clearStatusEffects();
        this.currentHealth = 0;
        this.healthBar.setHealth(0);
        this.healthBar.setShield(0);
        this.healthBar.hide();
        this.mesh.visible = false;
        this.position.x = this.spawnPoint.x;
        this.position.y = this.spawnPoint.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.isGrounded = false;
        this.jumpsRemaining = this.maxJumps;
        this.enemyContactCooldown = 0;
        this.updateRespawnIndicator();
    }

    /**
     * Respawn after death delay.
     */
    respawn() {
        this.isAlive = true;
        this.clearHealthBonus();
        if (this.shieldStatus) {
            this.shieldStatus.set(0, 0);
        }
        this.currentHealth = this.maxHealth;
        this.healthBar.setHealth(this.maxHealth);
        this.healthBar.setShield(0);
        this.healthBar.show();
        this.mesh.visible = true;
        this.landSoundReady = false;
        this.landSoundCooldown = 0;
        this.hasEverGrounded = false;
        this.didLandThisFrame = false;
        this.wasGrounded = false;
        this.fallPeakY = this.position.y;
        this.fallDistance = 0;
        this.lastDeathWasPit = false;
        this.lastDamageSource = null;
        this.lastDamageTime = null;
        this.visualBob = 0;
        this.visualScaleY = 1;
        this.visualScaleZ = 1;
        this.visualTiltZ = 0;
        this.syncMeshPosition();
        this.healthBar.update(0);
        this.updateRespawnIndicator();
    }

    /**
     * Create respawn timer indicator (bar + text)
     */
    initRespawnIndicator() {
        const group = new THREE.Group();
        const width = 1.3;
        const height = 0.16;
        const back = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: 0x0c0c0c, transparent: true, opacity: 0.75 })
        );
        back.position.z = 0.6;
        group.add(back);

        const fill = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: 0x7ad1ff, transparent: true, opacity: 0.9 })
        );
        fill.position.z = 0.61;
        fill.scale.x = 0;
        fill.visible = false;
        group.add(fill);

        const textSprite = createTextSprite('3', {
            fontSize: 36,
            color: '#ffffff',
            stroke: 'rgba(0, 0, 0, 0.85)',
            scale: 0.01
        });
        textSprite.position.set(0, 0.28, 0.62);
        group.add(textSprite);

        group.visible = false;
        this.scene.add(group);

        this.respawnIndicator = {
            group,
            fill,
            width,
            textSprite,
            lastSeconds: null
        };
    }

    /**
     * Update respawn timer indicator state.
     */
    updateRespawnIndicator() {
        if (!this.respawnIndicator) return;
        const { group, fill, width, textSprite } = this.respawnIndicator;
        group.visible = !this.isAlive;
        if (!group.visible) {
            return;
        }

        const progress = this.respawnDelay > 0 ? 1 - (this.respawnTimer / this.respawnDelay) : 1;
        const clamped = Math.max(0, Math.min(1, progress));
        fill.visible = clamped > 0.01;
        fill.scale.x = clamped;
        fill.position.x = -width / 2 + (width * clamped) / 2;

        const playerPos = this.getPosition();
        group.position.set(playerPos.x, playerPos.y + 1.2, 0);

        const secondsLeft = Math.max(0, Math.ceil(this.respawnTimer));
        if (secondsLeft !== this.respawnIndicator.lastSeconds) {
            updateTextSprite(textSprite, `Respawn ${secondsLeft}`);
            this.respawnIndicator.lastSeconds = secondsLeft;
        }
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
     * Check if the player has any active shields.
     * @returns {boolean}
     */
    hasActiveShield() {
        return Boolean(this.shieldStatus && this.shieldStatus.isActive);
    }

    spawnShieldBreakEffect() {
        if (!this.scene) return;
        const group = new THREE.Group();
        group.position.set(this.position.x, this.position.y, 0.55);
        this.scene.add(group);

        const ringGeometry = new THREE.RingGeometry(0.55, 0.72, 24);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x6fd8ff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.renderOrder = 15;
        group.add(ring);

        const shards = [];
        const shardCount = 10;
        for (let i = 0; i < shardCount; i++) {
            const shardGeometry = new THREE.PlaneGeometry(0.08, 0.02);
            const shardMaterial = new THREE.MeshBasicMaterial({
                color: 0x8fe6ff,
                transparent: true,
                opacity: 0.9,
                depthTest: false
            });
            const shard = new THREE.Mesh(shardGeometry, shardMaterial);
            const angle = (i / shardCount) * Math.PI * 2 + Math.random() * 0.4;
            shard.position.set(Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0.02);
            shard.rotation.z = angle;
            shard.renderOrder = 16;
            group.add(shard);
            shards.push({
                mesh: shard,
                velocity: {
                    x: Math.cos(angle) * (1.2 + Math.random() * 0.6),
                    y: Math.sin(angle) * (1.2 + Math.random() * 0.6)
                }
            });
        }

        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 0.016;
            const scale = 1 + elapsed * 2.2;
            ring.scale.set(scale, scale, 1);
            ring.material.opacity = Math.max(0, 0.9 - elapsed * 2.2);

            shards.forEach((shard) => {
                shard.mesh.position.x += shard.velocity.x * 0.016;
                shard.mesh.position.y += shard.velocity.y * 0.016;
                shard.mesh.rotation.z += 0.2;
                shard.mesh.material.opacity = Math.max(0, 0.9 - elapsed * 2.4);
            });

            if (elapsed >= 0.45) {
                clearInterval(interval);
                if (group.parent) {
                    group.parent.remove(group);
                }
            }
        }, 16);
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
        if (!this.isAlive) {
            return;
        }

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
                    // Side collision - player takes contact damage + knockback
                    this.applyEnemyContact(enemy);
                    console.log('Hit by enemy! Health:', this.currentHealth);
                }
            }
        }
    }

    /**
     * Clean up player visuals/UI
     */
    destroy() {
        this.clearStatusEffects();
        this.clearHealthBonus();
        this.clearBleedDrops();
        if (this.healthBar) {
            this.healthBar.destroy();
        }
        this.setDebugHitboxVisible(false);
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (Player.instances) {
            Player.instances.delete(this);
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
