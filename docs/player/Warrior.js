import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';
import { JUMP_VELOCITY } from '../core/constants.js';

/**
 * Samurai Hero - Melee fighter with katana
 * @class Warrior
 */
export class Warrior extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Darker red base for samurai style
        this.setBodyColor(0x7b1b1b);

        // Add sword and shield
        this.createEquipment(scene);
        this.addWarriorCrest();
        this.createSamuraiHelmet();

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;
        this.dashResetCount = 0;
        this.shieldBashInvuln = 0;
        this.deflectTimer = 0;
        this.deflectDuration = 0.5;
        this.deflectRadius = 2.4;
        this.deflectIndicator = null;
        this.deflectSwingCooldownUntil = 0;
        this.isSpinningUltimate = false;
        this.swordComboStep = 0;
        this.swordComboTimers = [];
        this.swordComboWindowMs = 900;
        this.swordComboResetAfterFinisherMs = 1000;
        this.swordComboResetTimer = null;
        this.swordFinisherSpinDuration = 0.25;
        this.swordFinisherSpinElapsed = 0;

        // Set warrior abilities
        this.initializeAbilities();

        // Sword swing sound
        this.swordSwingVolume = 0.2;
        this.initSwordSwingAudio();

        // Shield bash sound
        this.shieldBashVolume = 0.2;
        this.initShieldBashAudio();

        // Whirlwind ultimate sound
        this.whirlwindVolume = 0.2;
        this.initWhirlwindAudio();

        // Dash sound
        this.dashVolume = 0.08;
        this.initDashAudio();
    }

    /**
     * Create sword and shield visuals
     * @param {THREE.Scene} scene - The scene
     */
    createEquipment(scene) {
        // Create KATANA - Slim blade + wrapped handle + small guard
        this.swordGroup = new THREE.Group();

        // Handle (dark wrap)
        const handleGeometry = new THREE.BoxGeometry(0.1, 0.55, 0.08);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x2a1a10 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.05, 0);
        this.swordGroup.add(handle);

        // Pommel (dark metal)
        const pommelGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.1);
        const pommelMaterial = new THREE.MeshBasicMaterial({ color: 0x3c2b22 });
        const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
        pommel.position.set(0, -0.38, 0);
        this.swordGroup.add(pommel);

        // Guard (tsuba)
        const guardGeometry = new THREE.BoxGeometry(0.32, 0.08, 0.08);
        const guardMaterial = new THREE.MeshBasicMaterial({ color: 0x3b2a1f });
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.position.set(0, 0.28, 0);
        this.swordGroup.add(guard);

        // Blade (slim katana, slight curve)
        const bladeGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.05);
        const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0xe2e2e2 });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, 0.95, 0);
        blade.rotation.z = 0.04;
        this.swordGroup.add(blade);

        // Blade edge highlight
        const edgeGeometry = new THREE.BoxGeometry(0.05, 1.5, 0.06);
        const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.set(0.04, 0.95, 0);
        edge.rotation.z = 0.04;
        this.swordGroup.add(edge);

        // Position katana on right side, angled downward
        this.swordGroup.position.set(0.55, -0.25, 0.1);
        this.swordGroup.rotation.z = -1.05;
        this.mesh.add(this.swordGroup);
        this.sword = this.swordGroup; // Keep reference
        this.swordBase = { x: 0.55, y: -0.25, z: 0.1, rotZ: -1.05 };

        // Create SHIELD placeholder (samurai drops the shield)
        this.shieldGroup = new THREE.Group();
        this.shieldGroup.visible = false;
        this.shieldGroup.position.set(-0.6, 0, 0.1);
        this.mesh.add(this.shieldGroup);
        this.shield = this.shieldGroup; // Keep reference for animations
        this.shieldBase = { x: -0.6, y: 0, z: 0.1, rotZ: 0 };
    }

    /**
     * Add a shield crest to the chest
     */
    addWarriorCrest() {
        const crestGroup = new THREE.Group();

        const crestBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.34, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x1e2a44 })
        );
        crestBase.position.set(0, 0.05, 0.56);
        crestGroup.add(crestBase);

        const crossVertical = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.24, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        crossVertical.position.set(0, 0.05, 0.58);
        crestGroup.add(crossVertical);

        const crossHorizontal = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.06, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        crossHorizontal.position.set(0, 0.05, 0.58);
        crestGroup.add(crossHorizontal);

        this.mesh.add(crestGroup);
    }

    /**
     * Add a simple samurai-style helmet.
     */
    createSamuraiHelmet() {
        const helmetGroup = new THREE.Group();

        const helmetBase = new THREE.Mesh(
            new THREE.ConeGeometry(0.6, 0.36, 4),
            new THREE.MeshBasicMaterial({ color: 0x2a1a15 })
        );
        helmetBase.rotation.y = Math.PI / 4;
        helmetBase.position.set(0, 0.64, 0);
        helmetGroup.add(helmetBase);

        const brim = new THREE.Mesh(
            new THREE.BoxGeometry(1.05, 0.08, 0.7),
            new THREE.MeshBasicMaterial({ color: 0x1d120f })
        );
        brim.position.set(0, 0.45, 0);
        helmetGroup.add(brim);

        const frontCrest = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.26, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xd6b56a })
        );
        frontCrest.position.set(0, 0.65, 0.33);
        helmetGroup.add(frontCrest);

        const sideFlapLeft = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.26, 0.04),
            new THREE.MeshBasicMaterial({ color: 0x2b1b16 })
        );
        sideFlapLeft.position.set(-0.48, 0.5, 0.12);
        helmetGroup.add(sideFlapLeft);

        const sideFlapRight = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.26, 0.04),
            new THREE.MeshBasicMaterial({ color: 0x2b1b16 })
        );
        sideFlapRight.position.set(0.48, 0.5, 0.12);
        helmetGroup.add(sideFlapRight);

        this.mesh.add(helmetGroup);
        this.helmet = helmetGroup;
    }

    /**
     * Initialize warrior abilities
     */
    initializeAbilities() {
        // Q - Sword Slash (short cooldown)
        const swordSlash = new Ability('Sword Slash', 0.2);
        swordSlash.use = (hero) => {
            if (!Ability.prototype.use.call(swordSlash, hero)) return false;

            // Animate sword slash
            hero.swordSlashAttack();
            return true;
        };

        // W - Deflect (reflect incoming projectiles)
        const deflect = new Ability('Deflect', 4);
        deflect.use = (hero) => {
            if (!Ability.prototype.use.call(deflect, hero)) return false;
            hero.activateDeflect();
            return true;
        };

        // E - Dash (mobility)
        const dash = new Ability('Dash', 4);
        dash.use = (hero) => {
            if (!Ability.prototype.use.call(dash, hero)) return false;

            // Dash forward
            if (typeof hero.playDashSound === 'function') {
                hero.playDashSound();
            }
            hero.dashForward();
            hero.dashResetCount = 0;
            return true;
        };

        // R - Whirlwind Ultimate (no cooldown, only charge requirement)
        const whirlwind = new Ability('Whirlwind', 0, true, 1);
        whirlwind.use = (hero) => {
            // Ultimates don't use cooldown, they use charge
            // So we skip the base class cooldown check
            hero.whirlwindUltimate();
            return true;
        };

        this.setAbilities(swordSlash, deflect, dash, whirlwind);
    }

    initSwordSwingAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/warrior_swing.wav', import.meta.url);
            this.swordSwingAudio = new Audio(audioUrl);
            this.swordSwingAudio.volume = this.swordSwingVolume;
        } catch (error) {
            this.swordSwingAudio = null;
        }
    }

    playSwordSwingSound() {
        if (!this.swordSwingAudio) return;
        const sound = this.swordSwingAudio.cloneNode();
        sound.volume = this.swordSwingVolume;
        sound.play().catch(() => {});
    }

    initShieldBashAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/warrior_shield_bash.mp3', import.meta.url);
            const audioPool = [];
            for (let i = 0; i < 3; i++) {
                const audio = new Audio(audioUrl);
                audio.volume = this.shieldBashVolume;
                audio.preload = 'auto';
                audioPool.push(audio);
            }
            this.shieldBashAudio = audioPool;
        } catch (error) {
            this.shieldBashAudio = null;
        }
    }

    playShieldBashSound() {
        if (!this.shieldBashAudio || !this.shieldBashAudio.length) return;
        const sound = this.shieldBashAudio.find((node) => node.paused || node.ended) || this.shieldBashAudio[0];
        sound.currentTime = 0;
        sound.volume = this.shieldBashVolume;
        sound.play().catch(() => {});
    }

    initDashAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/warrior_dash.wav', import.meta.url);
            const audioPool = [];
            for (let i = 0; i < 3; i++) {
                const audio = new Audio(audioUrl);
                audio.volume = this.dashVolume;
                audio.preload = 'auto';
                audio.load();
                audioPool.push(audio);
            }
            this.dashAudio = audioPool;
        } catch (error) {
            this.dashAudio = null;
        }
    }

    playDashSound() {
        if (!this.dashAudio || !this.dashAudio.length) return;
        const sound = this.dashAudio.find((node) => node.paused || node.ended) || this.dashAudio[0];
        sound.currentTime = 0;
        sound.volume = this.dashVolume;
        sound.play().catch(() => {});
    }

    initWhirlwindAudio() {
        try {
            const audioUrl = new URL('../assets/sfx/warrior_ult_spin.wav', import.meta.url);
            const audio = new Audio(audioUrl);
            audio.volume = this.whirlwindVolume;
            audio.preload = 'auto';
            audio.load();
            this.whirlwindAudio = audio;
        } catch (error) {
            this.whirlwindAudio = null;
        }
    }

    playWhirlwindSound() {
        if (!this.whirlwindAudio) return;
        const sound = this.whirlwindAudio.cloneNode();
        sound.volume = this.whirlwindVolume;
        sound.play().catch(() => {});
    }

    /**
     * Sword Slash Attack - Q Ability
     */
    swordSlashAttack() {
        console.log('⚔️ SWORD SLASH COMBO!');

        const originalRot = -0.87; // ~50 degrees clockwise

        this.swordComboTimers.forEach((timer) => clearTimeout(timer));
        this.swordComboTimers = [];

        if (this.swordComboResetTimer) {
            clearTimeout(this.swordComboResetTimer);
        }

        const nextStep = (this.swordComboStep % 3) + 1;
        this.swordComboStep = nextStep;

        const aimDir = this.getQuantizedAimDirection();
        const dirX = aimDir.x;
        const dirY = aimDir.y;
        if (Math.abs(dirX) > 0.05) {
            this.setFacingDirection(dirX >= 0 ? 1 : -1);
        }
        const aimAngle = aimDir.angle;
        const arcSpan = nextStep === 1 ? Math.PI * 0.95 : nextStep === 2 ? Math.PI * 1.15 : Math.PI * 1.35;
        const swingStart = aimAngle - arcSpan * 0.5;
        const swingEnd = aimAngle + arcSpan * 0.5;
        const swingDuration = nextStep === 3 ? 180 : nextStep === 2 ? 160 : 140;
        const swingX = this.swordBase.x + dirX * 0.08;
        const swingY = dirY > 0.25 ? 0.55 : this.swordBase.y + 0.05;
        this.sword.position.x = swingX;
        this.sword.position.y = swingY;
        this.sword.rotation.z = swingStart;

        this.animateSwordTo(swingX, swingY, swingEnd, 1, swingDuration);

        const trailTimer = setTimeout(() => {
            const tint = nextStep === 3 ? 0xffd6a6 : nextStep === 2 ? 0xaad7ff : 0xbfe3ff;
            this.createSlashTrail(swingStart, swingEnd, { x: dirX, y: dirY }, tint);
        }, Math.max(30, swingDuration * 0.35));

        const hitTimer = setTimeout(() => {
            this.playSwordSwingSound();
            this.applySlashDamage({ x: dirX, y: dirY }, nextStep);
            if (nextStep === 3) {
                this.swordFinisherSpinElapsed = this.swordFinisherSpinDuration;
                if (this.abilities && this.abilities.q) {
                    this.abilities.q.currentCooldown = 2;
                    this.abilities.q.isReady = false;
                }
            }
        }, Math.max(70, swingDuration * 0.6));

        const resetRotTimer = setTimeout(() => {
            this.sword.rotation.z = originalRot;
            this.sword.position.x = this.swordBase.x;
            this.sword.position.y = this.swordBase.y;
        }, swingDuration + 220);
        this.swordComboTimers.push(trailTimer, hitTimer, resetRotTimer);

        const resetDelay = nextStep === 3 ? this.swordComboResetAfterFinisherMs : this.swordComboWindowMs;
        this.swordComboResetTimer = setTimeout(() => {
            this.swordComboStep = 0;
        }, resetDelay);
    }

    /**
     * Create a clean slash trail for Q.
     */
    createSlashTrail(startAngle, endAngle, direction, tint = 0xbfe3ff) {
        const slashGroup = new THREE.Group();

        const arcSpan = Math.max(0.2, endAngle - startAngle);
        const dirX = direction.x || 0;
        const dirY = direction.y || 0;
        const baseX = dirX * 0.35;
        const baseY = dirY * 0.2 + (dirY > 0.25 ? 0.25 : 0.08);
        const outerRadius = 1.65;
        const innerRadius = 0.95;
        const segments = Math.max(14, Math.round(arcSpan / (Math.PI / 14)));

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
            side: THREE.DoubleSide
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
            side: THREE.DoubleSide
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.set(baseX, baseY, 0.01);
        slashGroup.add(glowMesh);

        const tipColor = new THREE.Color(tint).lerp(new THREE.Color(0xffffff), 0.35);
        const tipGeometry = new THREE.PlaneGeometry(0.55, 0.24);
        const tipMaterial = new THREE.MeshBasicMaterial({
            color: tipColor,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const tipMesh = new THREE.Mesh(tipGeometry, tipMaterial);
        const tipAngle = startAngle + arcSpan;
        const tipRadius = outerRadius * 0.92;
        tipMesh.position.set(
            baseX + Math.cos(tipAngle) * tipRadius,
            baseY + Math.sin(tipAngle) * tipRadius,
            0.02
        );
        tipMesh.rotation.z = tipAngle - Math.PI / 2;
        slashGroup.add(tipMesh);

        const followZ = 0.2;
        slashGroup.position.set(this.position.x, this.position.y, followZ);

        // Add to scene
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
            const scale = 0.95 + eased * 0.18;
            arcMaterial.opacity = opacity;
            glowMaterial.opacity = opacity * 0.7;
            tipMaterial.opacity = opacity * 0.9;
            slashGroup.scale.set(scale, scale, 1);
        }, 16);
    }

    applySlashDamage(direction, comboStep = 1) {
        const dirX = direction.x;
        const dirY = direction.y;
        const reach = 1.9;
        const centerX = this.position.x + dirX * reach;
        const centerY = this.position.y + dirY * reach * 0.7;
        const halfW = 1.1 + Math.abs(dirX) * 0.6;
        const halfH = 0.9 + Math.abs(dirY) * 0.6;
        const slashBounds = {
            left: centerX - halfW,
            right: centerX + halfW,
            top: centerY + halfH,
            bottom: centerY - halfH
        };
        const hits = comboStep === 3 ? 2 : 1;
        this.damageEnemiesInArea(slashBounds, this.abilities.q, hits);
    }

    getQuantizedAimDirection() {
        const aimDir = this.hasAimInput ? this.getAimDirection() : { x: this.facingDirection || 1, y: 0 };
        const aimLength = Math.hypot(aimDir.x, aimDir.y) || 1;
        const rawX = aimDir.x / aimLength;
        const rawY = aimDir.y / aimLength;
        const angle = Math.atan2(rawY, rawX);
        const step = Math.PI / 4;
        const snapped = Math.round(angle / step) * step;
        return { x: Math.cos(snapped), y: Math.sin(snapped), angle: snapped };
    }


    /**
     * Shield Bash Attack - W Ability
     */
    shieldBashAttack() {
        console.log('🛡️ SHIELD BASH!');

        // Save original position
        const originalX = this.shieldBase.x;
        const originalY = this.shieldBase.y;
        const originalRot = this.shieldBase.rotZ;
        const swordOriginalX = this.swordBase.x;
        const swordOriginalY = this.swordBase.y;
        const swordOriginalRot = this.swordBase.rotZ;

        // Wind up (pull shield back and up)
        this.shield.position.x = -0.4;
        this.shield.position.y = 0.2;
        this.shield.rotation.z = -0.2;
        this.sword.position.x = 0.4;
        this.sword.position.y = 0.2;
        this.sword.rotation.z = 0.2;

        setTimeout(() => {
            // Bash forward with force
            this.animateShieldTo(-1.0, -0.1, 0.3, 1.2, 120);
            this.animateSwordTo(1.0, -0.1, -0.3, 1.2, 120);
            this.shieldBashInvuln = 0.5;
            this.clearStatusEffects();
            this.createShieldBashWind(-this.facingDirection);
            this.createShieldBashWind(this.facingDirection);
            this.playShieldBashSound();

            // Small forward push to player
            this.velocity.x += (this.velocity.x >= 0 ? 3 : -3);

            // Damage and knockback enemies
            const bashRange = 2.3;
            const bashBounds = {
                left: this.position.x - bashRange,
                right: this.position.x + bashRange,
                top: this.position.y + 1,
                bottom: this.position.y - 1
            };
            this.shieldBashKnockback(bashBounds);
        }, 100);

        setTimeout(() => {
            // Return to original position
            this.animateShieldTo(originalX, originalY, originalRot, 1, 140);
            this.animateSwordTo(swordOriginalX, swordOriginalY, swordOriginalRot, 1, 140);
        }, 350);
    }

    /**
     * Deflect projectiles - W Ability
     */
    activateDeflect() {
        this.deflectTimer = this.deflectDuration;
        this.setEffectColor(0xe6f2ff);
        this.playShieldBashSound();
        this.showDeflectIndicator();

        const originalX = this.shieldBase.x;
        const originalY = this.shieldBase.y;
        const originalRot = this.shieldBase.rotZ;
        this.animateShieldTo(-0.8, 0.05, 0.25, 1.05, 90);

        setTimeout(() => {
            this.animateShieldTo(originalX, originalY, originalRot, 1, 120);
        }, Math.max(120, this.deflectDuration * 1000));
    }

    deflectProjectiles() {
        const projectiles = Hero.getProjectiles();
        if (!projectiles.length) return;
        for (const projectile of projectiles) {
            if (!projectile || !projectile.mesh || typeof projectile.deflect !== 'function') {
                continue;
            }
            const owner = projectile.owner;
            if (owner && owner.team && this.team && owner.team === this.team) {
                continue;
            }
            if (projectile.type === 'beam' && projectile.length && projectile.direction) {
                const dir = projectile.direction;
                const dirLength = Math.hypot(dir.x, dir.y) || 1;
                const dirX = dir.x / dirLength;
                const dirY = dir.y / dirLength;
                const halfLength = projectile.length * 0.5;
                const startX = projectile.mesh.position.x - dirX * halfLength;
                const startY = projectile.mesh.position.y - dirY * halfLength;
                const px = this.position.x - startX;
                const py = this.position.y - startY;
                const proj = Math.max(0, Math.min(projectile.length, px * dirX + py * dirY));
                const closestX = startX + dirX * proj;
                const closestY = startY + dirY * proj;
                const dx = this.position.x - closestX;
                const dy = this.position.y - closestY;
                const dist = Math.hypot(dx, dy);
                if (dist <= this.deflectRadius) {
                    projectile.deflect(this);
                    this.playDeflectSwordSwing();
                }
            } else {
                const dx = projectile.mesh.position.x - this.position.x;
                const dy = projectile.mesh.position.y - this.position.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= this.deflectRadius) {
                    projectile.deflect(this);
                    this.playDeflectSwordSwing();
                }
            }
        }
    }

    playDeflectSwordSwing() {
        const now = performance.now();
        if (now < this.deflectSwingCooldownUntil) return;
        this.deflectSwingCooldownUntil = now + 160;
        const originalX = this.swordBase.x;
        const originalY = this.swordBase.y;
        const originalRot = this.swordBase.rotZ;
        const dir = this.facingDirection || 1;
        const swingX = originalX + 0.12 * dir;
        const swingY = originalY + 0.12;
        const swingRot = originalRot + 0.9 * dir;
        this.animateSwordTo(swingX, swingY, swingRot, 1.05, 90);
        setTimeout(() => {
            this.animateSwordTo(originalX, originalY, originalRot, 1, 120);
        }, 120);
        this.playSwordSwingSound();
    }

    /**
     * Dash Forward - E Ability
     */
    dashForward() {
        console.log('DASH!');

        // Dash in aim direction when available, otherwise facing direction
        const dashDistance = 3.2;
        if (typeof this.setFallDamageGrace === 'function') {
            this.setFallDamageGrace(0.45);
        }
        const startX = this.position.x;
        const startY = this.position.y;
        const aim = this.hasAimInput ? this.getAimDirection() : { x: this.facingDirection || 1, y: 0 };
        const aimLength = Math.hypot(aim.x, aim.y) || 1;
        const dirX = aim.x / aimLength;
        const dirY = aim.y / aimLength;
        if (Math.abs(dirX) > 0.05) {
            this.facingDirection = dirX >= 0 ? 1 : -1;
        }
        this.playDashSwordSwing();
        const endX = startX + dirX * dashDistance;
        const endY = startY + dirY * dashDistance;

        // Apply dash movement
        this.position.x = endX;
        this.position.y = endY;

        // Damage + stun enemies along dash path
        const dashBounds = {
            left: Math.min(startX, endX) - 0.6,
            right: Math.max(startX, endX) + 0.6,
            top: Math.max(startY, endY) + 0.9,
            bottom: Math.min(startY, endY) - 0.9
        };
        const frontCenterX = endX + dirX * 0.9;
        const frontCenterY = endY + dirY * 0.9;
        const frontBounds = {
            left: frontCenterX - 0.7,
            right: frontCenterX + 0.7,
            top: frontCenterY + 0.7,
            bottom: frontCenterY - 0.7
        };
        const hitTargets = new Set();

        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;
            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(dashBounds, enemyBounds)) {
                this.applyAbilityDamage(this.abilities.e, enemy, 1);
                if (typeof enemy.setStunned === 'function') {
                    enemy.setStunned(0.6);
                }
                hitTargets.add(enemy);
            }
        }
        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive || hitTargets.has(enemy)) continue;
            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(frontBounds, enemyBounds)) {
                this.applyAbilityDamage(this.abilities.e, enemy, 1);
                if (typeof enemy.setStunned === 'function') {
                    enemy.setStunned(0.6);
                }
                hitTargets.add(enemy);
            }
        }

        this.createDashWind({ x: dirX, y: dirY }, frontCenterX, frontCenterY);

        // Visual effect - scale horizontally (preserve facing direction)
        const currentFacing = this.facingDirection;
        this.mesh.scale.x = currentFacing * 1.5;
        setTimeout(() => {
            this.mesh.scale.x = currentFacing;
        }, 100);

        // Create dash trail effect
        this.createDashTrail();
    }

    playDashSwordSwing() {
        const originalX = this.swordBase.x;
        const originalY = this.swordBase.y;
        const originalRot = this.swordBase.rotZ;
        const dir = this.facingDirection || 1;
        const swingX = originalX + 0.2 * dir;
        const swingY = originalY + 0.18;
        const swingRot = originalRot + 1.2 * dir;
        this.animateSwordTo(swingX, swingY, swingRot, 1.08, 100);
        setTimeout(() => {
            this.animateSwordTo(originalX, originalY, originalRot, 1, 140);
        }, 140);
        this.playSwordSwingSound();
    }

    /**
     * Create dash trail visual effect
     */
    createDashTrail() {
        const trailGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x0066ff,
            transparent: true,
            opacity: 0.5
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.set(this.position.x, this.position.y, -0.1);
        this.mesh.parent.add(trail);

        // Fade out trail
        let opacity = 0.5;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;
            trail.material.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(trail);
            }
        }, 30);
    }

    /**
     * Wind effect to show dash hitbox in front.
     * @param {{x:number,y:number}} direction
     * @param {number} centerX
     * @param {number} centerY
     */
    createDashWind(direction, centerX, centerY) {
        if (!this.mesh || !this.mesh.parent) return;
        const windGroup = new THREE.Group();
        const angle = Math.atan2(direction.y, direction.x);
        const arcCount = 10;
        const radius = 0.7;

        for (let i = 0; i < arcCount; i++) {
            const t = i / (arcCount - 1);
            const spread = -0.7 + t * 1.4;
            const length = 0.35 + (1 - Math.abs(t - 0.5) * 1.6) * 0.25;
            const thickness = 0.08 + (1 - Math.abs(t - 0.5) * 1.4) * 0.06;
            const segmentGeometry = new THREE.PlaneGeometry(length, thickness);
            const segmentMaterial = new THREE.MeshBasicMaterial({
                color: 0xcfefff,
                transparent: true,
                opacity: 0.75,
                side: THREE.DoubleSide
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            const localAngle = angle + spread;
            segment.position.set(
                centerX + Math.cos(localAngle) * radius,
                centerY + Math.sin(localAngle) * radius,
                0.2
            );
            segment.rotation.z = localAngle - Math.PI / 2;
            windGroup.add(segment);
        }

        this.mesh.parent.add(windGroup);

        let opacity = 0.75;
        let drift = 0;
        const driftX = direction.x * 0.2;
        const driftY = direction.y * 0.2;
        const windInterval = setInterval(() => {
            opacity -= 0.09;
            drift += 0.12;
            windGroup.children.forEach((seg, index) => {
                seg.material.opacity = opacity;
                seg.position.x += driftX + index * 0.005 * direction.x;
                seg.position.y += driftY + index * 0.005 * direction.y;
                seg.scale.x = 1 + drift * 0.04;
            });

            if (opacity <= 0) {
                clearInterval(windInterval);
                this.mesh.parent.remove(windGroup);
            }
        }, 30);
    }

    /**
     * Whirlwind Ultimate - R Ability
     */
    whirlwindUltimate() {
        console.log('🌪️ WHIRLWIND ULTIMATE!');
        this.playWhirlwindSound();

        // Create whirlwind visual effect to show hitbox
        const baseWhirlwindRange = 2.5;
        const whirlwindRange = baseWhirlwindRange * 1.35;
        const whirlDurationMs = 650;
        this.createWhirlwindEffect(whirlwindRange, whirlDurationMs);

        // Spin animation
        let spinCount = 0;
        this.isSpinningUltimate = true;
        const spinInterval = setInterval(() => {
            this.mesh.rotation.z += Math.PI / 4;
            spinCount++;

            // Damage enemies nearby during spin
            const whirlwindBounds = {
                left: this.position.x - whirlwindRange,
                right: this.position.x + whirlwindRange,
                top: this.position.y + whirlwindRange,
                bottom: this.position.y - whirlwindRange
            };
            this.damageEnemiesInArea(whirlwindBounds, this.abilities.r, 0.8);

            if (spinCount >= 10) { // shorter burst
                clearInterval(spinInterval);
                this.mesh.rotation.z = 0; // Reset rotation
                this.isSpinningUltimate = false;
            }
        }, 50);
    }

    /**
     * Create whirlwind visual effect showing the attack range
     */
    createWhirlwindEffect(range, durationMs = 800) {
        const whirlwindGroup = new THREE.Group();

        // Create multiple swirling wind trails
        const numTrails = 12; // More trails for better swirl effect
        for (let i = 0; i < numTrails; i++) {
            const startAngle = (i / numTrails) * Math.PI * 2;

            // Create curved segments that spiral outward
            const numSegments = 8;

            for (let j = 0; j < numSegments; j++) {
                const t = j / numSegments;
                const radius = t * range; // Grow from center to edge
                const spiralAngle = startAngle + (t * Math.PI * 1.5); // More spiral (1.5 rotations)

                const x = Math.cos(spiralAngle) * radius;
                const y = Math.sin(spiralAngle) * radius;

                // Smaller segments at the center, larger at the edge
                const segmentSize = 0.15 + (t * 0.2);
                const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize * 0.6, 0.05);
                const segmentMaterial = new THREE.MeshBasicMaterial({
                    color: 0xccffff, // Light cyan wind color
                    transparent: true,
                    opacity: 0.4 * (1 - t * 0.3) // Fade slightly toward edges
                });
                const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

                segment.position.set(x, y, 0);
                segment.rotation.z = spiralAngle + Math.PI / 2; // Perpendicular to spiral

                whirlwindGroup.add(segment);
            }
        }

        // Attach to warrior mesh so it follows the character
        whirlwindGroup.position.set(0, 0, 0.15);
        this.mesh.add(whirlwindGroup);

        // Animate - spin and fade out over duration
        let rotation = 0;
        const baseOpacity = 0.4;
        let scale = 1.0;
        const startTime = performance.now();
        const animInterval = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, elapsed / Math.max(1, durationMs));
            rotation += 0.4; // Faster spin
            const opacity = baseOpacity * (1 - t);
            scale = 1.0 + t * 0.8;

            whirlwindGroup.rotation.z = rotation;
            whirlwindGroup.scale.set(scale, scale, 1);

            // Update opacity for all segments
            whirlwindGroup.children.forEach(segment => {
                segment.material.opacity = opacity * (segment.material.opacity / baseOpacity);
            });

            if (t >= 1) {
                clearInterval(animInterval);
                this.mesh.remove(whirlwindGroup);
            }
        }, 50);
    }

    /**
     * Update warrior - handle facing direction
     */
    update(deltaTime, input) {
        this.forceVisualTiltZ = this.swordFinisherSpinElapsed > 0;
        // Update facing direction based on movement
        if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        // Call parent update
        super.update(deltaTime, input);
        if (this.swordFinisherSpinElapsed > 0) {
            this.swordFinisherSpinElapsed = Math.max(0, this.swordFinisherSpinElapsed - deltaTime);
            const progress = 1 - (this.swordFinisherSpinElapsed / this.swordFinisherSpinDuration);
            this.visualTiltZ = -progress * Math.PI * 2 * this.facingDirection;
            if (this.swordFinisherSpinElapsed === 0) {
                this.visualTiltZ = 0;
            }
            this.syncMeshPosition();
        }
        if (this.shieldBashInvuln > 0) {
            this.shieldBashInvuln -= deltaTime;
            this.setEffectColor(0xffe066);
            if (this.shieldBashInvuln <= 0) {
                this.setEffectColor(this.baseColor);
            }
        }
        if (this.deflectTimer > 0) {
            this.deflectTimer = Math.max(0, this.deflectTimer - deltaTime);
            this.deflectProjectiles();
            if (this.deflectTimer === 0) {
                this.setEffectColor(this.baseColor);
                this.hideDeflectIndicator();
            }
        }

    }

    showDeflectIndicator() {
        if (this.deflectIndicator) {
            this.deflectIndicator.visible = true;
            return;
        }
        const geometry = new THREE.RingGeometry(this.deflectRadius - 0.18, this.deflectRadius, 48);
        const material = new THREE.MeshBasicMaterial({
            color: 0x9aa0a6,
            transparent: true,
            opacity: 0.25
        });
        const indicator = new THREE.Mesh(geometry, material);
        indicator.position.set(0, 0, -0.1);
        this.mesh.add(indicator);
        this.deflectIndicator = indicator;
    }

    hideDeflectIndicator() {
        if (this.deflectIndicator) {
            this.deflectIndicator.visible = false;
        }
    }

    destroy() {
        this.swordComboTimers.forEach((timer) => clearTimeout(timer));
        this.swordComboTimers = [];
        if (this.swordComboResetTimer) {
            clearTimeout(this.swordComboResetTimer);
            this.swordComboResetTimer = null;
        }
        super.destroy();
    }

    /**
     * Set the facing direction and flip character
     */
    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            // Flip the entire mesh by scaling on X axis
            this.mesh.scale.x = direction;
        }
    }

    /**
     * Override collision handling to favor shield bash timing
     * @param {Array} enemies - Array of enemy instances
     */
    checkEnemyCollisions(enemies) {
        const playerBounds = this.getBounds();

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();

            if (checkAABBCollision(playerBounds, enemyBounds)) {
                const playerBottom = playerBounds.bottom;
                const enemyTop = enemyBounds.top;

                if (this.velocity.y < 0 && playerBottom > enemyTop - 0.3) {
                    enemy.takeDamage();
                    this.velocity.y = JUMP_VELOCITY * 0.5;
                    console.log('Stomped enemy!');
                } else if (this.shieldBashInvuln <= 0) {
                    this.applyEnemyContact(enemy);
                    console.log('Hit by enemy! Health:', this.currentHealth);
                }
            }
        }
    }

    /**
     * Override syncMeshPosition to prevent equipment from rotating issues
     */
    syncMeshPosition() {
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y + (this.visualBob || 0);
        this.mesh.position.z = this.position.z;

        // Preserve facing on X, animate Y/Z and tilt
        const facing = this.mesh.scale.x >= 0 ? 1 : -1;
        this.mesh.scale.x = Math.abs(this.mesh.scale.x) * facing;
        this.mesh.scale.y = this.visualScaleY || 1;
        this.mesh.scale.z = this.visualScaleZ || 1;
        if (!this.isSpinningUltimate) {
            this.mesh.rotation.z = this.visualTiltZ || 0;
        }
    }

    /**
     * Damage all enemies within a given area
     * @param {Object} bounds - AABB bounds to check {left, right, top, bottom}
     * @param {Ability} ability - Ability to scale damage with debug multipliers
     */
    damageEnemiesInArea(bounds, ability = null, baseHits = 1) {
        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                this.applyAbilityDamage(ability, enemy, baseHits);
                if (enemy.type === 'player') {
                    this.addUltimateCharge(this.ultimateChargePerKill);
                }
                if (this.abilities && this.abilities.e && this.dashResetCount < 2) {
                    this.abilities.e.currentCooldown = 0;
                    this.abilities.e.isReady = true;
                    this.dashResetCount += 1;
                }
                console.log('💥 Ability hit enemy!');
            }
        }
    }

    /**
     * Damage all enemies within a circular radius around the warrior.
     * @param {number} radius - Radius in world units
     * @param {Ability} ability - Ability to scale damage with debug multipliers
     * @param {number} baseHits - Hit count for multi-hit abilities
     */
    damageEnemiesInRadius(radius, ability = null, baseHits = 1) {
        const radiusSq = radius * radius;
        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;
            const enemyBounds = enemy.getBounds();
            const closestX = Math.max(enemyBounds.left, Math.min(this.position.x, enemyBounds.right));
            const closestY = Math.max(enemyBounds.bottom, Math.min(this.position.y, enemyBounds.top));
            const dx = closestX - this.position.x;
            const dy = closestY - this.position.y;
            if ((dx * dx + dy * dy) <= radiusSq) {
                this.applyAbilityDamage(ability, enemy, baseHits);
                if (enemy.type === 'player') {
                    this.addUltimateCharge(this.ultimateChargePerKill);
                }
                if (this.abilities && this.abilities.e && this.dashResetCount < 2) {
                    this.abilities.e.currentCooldown = 0;
                    this.abilities.e.isReady = true;
                    this.dashResetCount += 1;
                }
                console.log('💥 Ability hit enemy!');
            }
        }
    }

    /**
     * Mini whirlwind-style hit for the finisher.
     * @param {number} radius - Radius in world units
     * @param {Ability} ability - Ability to scale damage
     * @param {number} baseHits - Hit count for multi-hit abilities
     */
    miniWhirlwindHit(radius, ability = null, baseHits = 1) {
        const pulseCount = 3;
        const pulseInterval = 60;
        this.createWhirlwindEffect(radius * 0.55, pulseCount * pulseInterval + 80);
        let pulses = 0;
        const hitInterval = setInterval(() => {
            pulses += 1;
            this.damageEnemiesInRadius(radius, ability, baseHits);
            if (pulses >= pulseCount) {
                clearInterval(hitInterval);
            }
        }, pulseInterval);
    }

    /**
     * Shield bash damage with knockback and collision damage
     * @param {Object} bounds - AABB bounds for the bash
     */
    shieldBashKnockback(bounds) {
        const hitEnemies = [];

        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;
            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                this.applyAbilityDamage(this.abilities.w, enemy, 1);
                if (enemy.type === 'player') {
                    this.addUltimateCharge(this.ultimateChargePerKill);
                }
                if (this.abilities && this.abilities.e && this.dashResetCount < 2) {
                    this.abilities.e.currentCooldown = 0;
                    this.abilities.e.isReady = true;
                    this.dashResetCount += 1;
                }

                if (enemy.isBridge) {
                    continue;
                }

                // Knockback away from the warrior
                const knockDir = enemy.position.x >= this.position.x ? 1 : -1;
                const startX = enemy.position.x;
                const targetX = enemy.position.x + knockDir * 2.2;
                const pushDuration = 120;
                const startTime = performance.now();

                const pushInterval = setInterval(() => {
                    const t = (performance.now() - startTime) / pushDuration;
                    if (t >= 1) {
                        clearInterval(pushInterval);
                        enemy.position.x = targetX;
                        enemy.mesh.position.x = targetX;
                        enemy.direction = knockDir;
                        return;
                    }
                    const eased = t * (2 - t);
                    const nextX = startX + (targetX - startX) * eased;
                    enemy.position.x = nextX;
                    enemy.mesh.position.x = nextX;
                }, 16);
                hitEnemies.push(enemy);
            }
        }

        // Collision damage if knocked into another enemy
        hitEnemies.forEach((knocked) => {
            const knockedBounds = knocked.getBounds();
            for (const other of this.getDamageTargets()) {
                if (!other.isAlive || other === knocked) continue;
                const otherBounds = other.getBounds();
                if (checkAABBCollision(knockedBounds, otherBounds)) {
                    this.applyAbilityDamage(this.abilities.w, other, 1);
                }
            }
        });
    }

    /**
     * Create shockwave visual on dive bash
     */
    createShockwaveEffect() {
        const waveGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.05);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x99ddff,
            transparent: true,
            opacity: 0.6
        });

        const leftWave = new THREE.Mesh(waveGeometry, waveMaterial.clone());
        const rightWave = new THREE.Mesh(waveGeometry, waveMaterial.clone());
        leftWave.position.set(this.position.x - 0.4, this.position.y - 0.2, 0.1);
        rightWave.position.set(this.position.x + 0.4, this.position.y - 0.2, 0.1);
        this.mesh.parent.add(leftWave);
        this.mesh.parent.add(rightWave);

        let opacity = 0.6;
        let scale = 1;
        const waveInterval = setInterval(() => {
            opacity -= 0.08;
            scale += 0.25;
            leftWave.material.opacity = opacity;
            rightWave.material.opacity = opacity;
            leftWave.scale.set(scale, 1, 1);
            rightWave.scale.set(scale, 1, 1);
            leftWave.position.x -= 0.4;
            rightWave.position.x += 0.4;

            if (opacity <= 0) {
                clearInterval(waveInterval);
                this.mesh.parent.remove(leftWave);
                this.mesh.parent.remove(rightWave);
            }
        }, 30);
    }

    /**
     * Pixel wind effect for shield bash
     */
    createShieldBashWind(directionOverride = null) {
        const windGroup = new THREE.Group();
        const direction = directionOverride !== null ? directionOverride : -this.facingDirection;
        const arcCount = 12;
        const radius = 0.9;
        const centerX = this.position.x + direction * 0.55;
        const centerY = this.position.y + 0.1;

        for (let i = 0; i < arcCount; i++) {
            const t = i / (arcCount - 1);
            const angle = (-0.8 + t * 1.2) * direction;
            const falloff = 1 - Math.abs(t - 0.5) * 1.6;
            const length = 0.42 * falloff + 0.14;
            const thickness = 0.12 * falloff + 0.03;
            const segmentGeometry = new THREE.PlaneGeometry(length, thickness);
            const segmentMaterial = new THREE.MeshBasicMaterial({
                color: 0xbfe3ff,
                transparent: true,
                opacity: 0.75,
                side: THREE.DoubleSide
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            const x = centerX + Math.cos(angle) * radius * direction;
            const y = centerY + Math.sin(angle) * radius * 0.6;
            segment.position.set(x, y, 0.2);
            segment.rotation.z = angle - Math.PI / 2;
            windGroup.add(segment);
        }

        this.mesh.parent.add(windGroup);

        let opacity = 0.75;
        let drift = 0;
        const windInterval = setInterval(() => {
            opacity -= 0.08;
            drift += 0.18;
            windGroup.children.forEach((seg, index) => {
                seg.material.opacity = opacity;
                seg.position.x += direction * (0.18 + index * 0.01);
                seg.position.y += 0.01 * Math.sin(index);
                seg.scale.x = 1 + drift * 0.03;
            });

            if (opacity <= 0) {
                clearInterval(windInterval);
                this.mesh.parent.remove(windGroup);
            }
        }, 30);
    }

    /**
     * Smooth shield animation helper
     */
    animateShieldTo(x, y, rotZ, scale, durationMs) {
        const startX = this.shield.position.x;
        const startY = this.shield.position.y;
        const startRot = this.shield.rotation.z;
        const startScale = this.shield.scale.x;
        const startTime = performance.now();

        const animInterval = setInterval(() => {
            const t = (performance.now() - startTime) / durationMs;
            if (t >= 1) {
                clearInterval(animInterval);
                this.shield.position.x = x;
                this.shield.position.y = y;
                this.shield.rotation.z = rotZ;
                this.shield.scale.set(scale, scale, scale);
                return;
            }

            const eased = t * (2 - t);
            this.shield.position.x = startX + (x - startX) * eased;
            this.shield.position.y = startY + (y - startY) * eased;
            this.shield.rotation.z = startRot + (rotZ - startRot) * eased;
            const nextScale = startScale + (scale - startScale) * eased;
            this.shield.scale.set(nextScale, nextScale, nextScale);
        }, 16);
    }

    /**
     * Smooth sword animation helper (mirrors shield bash).
     */
    animateSwordTo(x, y, rotZ, scale, durationMs) {
        if (!this.sword) {
            return;
        }
        const startX = this.sword.position.x;
        const startY = this.sword.position.y;
        const startRot = this.sword.rotation.z;
        const startScale = this.sword.scale.x;
        const startTime = performance.now();

        const animInterval = setInterval(() => {
            const t = (performance.now() - startTime) / durationMs;
            if (t >= 1) {
                clearInterval(animInterval);
                this.sword.position.x = x;
                this.sword.position.y = y;
                this.sword.rotation.z = rotZ;
                this.sword.scale.set(scale, scale, scale);
                return;
            }

            const eased = t * (2 - t);
            this.sword.position.x = startX + (x - startX) * eased;
            this.sword.position.y = startY + (y - startY) * eased;
            this.sword.rotation.z = startRot + (rotZ - startRot) * eased;
            const nextScale = startScale + (scale - startScale) * eased;
            this.sword.scale.set(nextScale, nextScale, nextScale);
        }, 16);
    }
}
