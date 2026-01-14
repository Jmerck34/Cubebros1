import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { Player } from './Player.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Paladin Hero - Shield defender with control and protection
 * @class Paladin
 */
export class Paladin extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        this.setBodyColor(0x5b6a73);
        this.createEquipment(scene);

        this.enemies = [];
        this.facingDirection = 1;
        this.maceHitTracker = new Map();
        this.activeProtectionDome = null;

        this.initializeAbilities();
    }

    /**
     * Create shield + mace visuals
     */
    createEquipment(scene) {
        this.maceGroup = new THREE.Group();
        const handleHeight = 0.7;
        const handleGeometry = new THREE.BoxGeometry(0.12, handleHeight, 0.08);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x6b4a2b });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        const handleCenterY = -0.1;
        handle.position.set(0, handleCenterY, 0);
        this.maceGroup.add(handle);
        this.maceHandle = handle;

        const headHeight = 0.38;
        const headGeometry = new THREE.BoxGeometry(0.38, headHeight, 0.2);
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0xbfc7cf });
        this.maceHeadGeometry = headGeometry;
        this.maceHeadMaterial = headMaterial;
        const head = new THREE.Mesh(headGeometry, headMaterial);
        const handleTop = handleCenterY + handleHeight / 2;
        this.maceHandleTipLocal = new THREE.Vector3(0, handleTop, 0);
        head.position.set(0, handleTop + headHeight / 2 - 0.02, 0);
        this.maceGroup.add(head);
        this.maceHead = head;

        this.maceGroup.position.set(0.55, -0.1, 0.1);
        this.maceGroup.rotation.z = -0.85;
        this.mesh.add(this.maceGroup);
        this.mace = this.maceGroup;
        this.maceBase = { x: 0.55, y: -0.1, z: 0.1, rotZ: -0.85 };

        this.shieldGroup = new THREE.Group();
        const shieldGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.08);
        const shieldMaterial = new THREE.MeshBasicMaterial({ color: 0x3f5970 });
        const shieldBody = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldGroup.add(shieldBody);

        const borderGeometry = new THREE.BoxGeometry(0.66, 0.86, 0.06);
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xb0b7bf });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        this.shieldGroup.add(border);

        const bossGeometry = new THREE.BoxGeometry(0.16, 0.16, 0.12);
        const bossMaterial = new THREE.MeshBasicMaterial({ color: 0xd8c38a });
        const boss = new THREE.Mesh(bossGeometry, bossMaterial);
        boss.position.set(0, 0, 0.08);
        this.shieldGroup.add(boss);

        this.shieldGroup.position.set(-0.62, 0.02, 0.1);
        this.mesh.add(this.shieldGroup);
        this.shield = this.shieldGroup;
        this.shieldBase = { x: -0.62, y: 0.02, z: 0.1, rotZ: 0 };
    }

    getMaceHandleTipWorld() {
        if (!this.maceGroup || !this.maceHandleTipLocal) {
            return { x: this.position.x, y: this.position.y };
        }
        const tip = this.maceHandleTipLocal.clone();
        this.maceGroup.localToWorld(tip);
        return { x: tip.x, y: tip.y };
    }

    /**
     * Initialize Paladin abilities
     */
    initializeAbilities() {
        const crushingMace = new Ability('Crushing Mace', 1, false, 2);
        crushingMace.use = (hero) => {
            if (!Ability.prototype.use.call(crushingMace, hero)) return false;
            hero.crushingMaceAttack();
            return true;
        };

        const protectionSphere = new Ability('Sphere of Protection', 10);
        protectionSphere.use = (hero) => {
            if (!Ability.prototype.use.call(protectionSphere, hero)) return false;
            hero.activateProtectionSphere();
            return true;
        };

        const chainMace = new Ability('Chain Mace', 4, false, 2);
        chainMace.use = (hero) => {
            if (!Ability.prototype.use.call(chainMace, hero)) return false;
            hero.chainMaceAttack();
            return true;
        };

        const holyRadiance = new Ability('Holy Radiance', 0, true, 1);
        holyRadiance.use = (hero) => hero.castHolyRadiance();

        this.setAbilities(crushingMace, protectionSphere, chainMace, holyRadiance);
    }

    update(deltaTime, input) {
        if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }
        super.update(deltaTime, input);
        if (!this.isAlive && this.activeProtectionDome) {
            this.removeProtectionDome(this.activeProtectionDome);
        }
    }

    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction;
        }
    }

    /**
     * A1 - Crushing Mace
     */
    crushingMaceAttack() {
        const originalRot = this.maceBase.rotZ;
        this.mace.rotation.z = -1.2;
        setTimeout(() => {
            this.mace.rotation.z = 0.6;
            this.createMaceSmashEffect();
            this.applyMaceDamage();
        }, 140);
        setTimeout(() => {
            this.mace.rotation.z = originalRot;
        }, 320);
    }

    applyMaceDamage() {
        const range = 2.4;
        const height = 1.4;
        const bounds = {
            left: this.position.x + (this.facingDirection > 0 ? 0.1 : -range),
            right: this.position.x + (this.facingDirection > 0 ? range : -0.1),
            top: this.position.y + height * 0.6,
            bottom: this.position.y - height * 0.6
        };

        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;
            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                this.applyAbilityDamage(this.abilities.q, enemy, 2);
                if (typeof enemy.takeDamage === 'function') {
                    enemy.takeDamage(10, this);
                }
                if (enemy.type === 'player') {
                    this.addUltimateCharge(this.ultimateChargePerKill);
                }
                this.registerCrushingHit(enemy);
            }
        }
    }

    registerCrushingHit(enemy) {
        const now = performance.now();
        const existing = this.maceHitTracker.get(enemy) || { count: 0, last: 0 };
        if (now - existing.last > 2200) {
            existing.count = 0;
        }
        existing.count += 1;
        existing.last = now;
        if (existing.count >= 2 && typeof enemy.setCripple === 'function') {
            enemy.setCripple(1.8);
            existing.count = 0;
        }
        this.maceHitTracker.set(enemy, existing);
    }

    createMaceSmashEffect() {
        const impact = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.8, 16),
            new THREE.MeshBasicMaterial({ color: 0xe6f2ff, transparent: true, opacity: 0.6 })
        );
        impact.position.set(this.position.x + this.facingDirection * 1.1, this.position.y - 0.05, 0.2);
        this.mesh.parent.add(impact);

        let scale = 1;
        let opacity = 0.6;
        const interval = setInterval(() => {
            scale += 0.35;
            opacity -= 0.12;
            impact.scale.set(scale, scale, 1);
            impact.material.opacity = Math.max(0, opacity);
            if (opacity <= 0) {
                clearInterval(interval);
                this.mesh.parent.remove(impact);
            }
        }, 40);
    }

    /**
     * A2 - Sphere of Protection
     */
    activateProtectionSphere() {
        const radius = 4.6;
        const duration = 6.5;

        if (this.activeProtectionDome) {
            this.removeProtectionDome(this.activeProtectionDome);
        }

        const domeGroup = new THREE.Group();
        const domeFill = new THREE.Mesh(
            new THREE.CircleGeometry(radius, 32),
            new THREE.MeshBasicMaterial({
                color: 0x8ad1ff,
                transparent: true,
                opacity: 0.12
            })
        );
        const domeRing = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.92, radius, 32),
            new THREE.MeshBasicMaterial({
                color: 0xbbe8ff,
                transparent: true,
                opacity: 0.5
            })
        );
        domeGroup.add(domeFill, domeRing);
        domeGroup.position.set(0, 0.1, 0.12);
        this.mesh.add(domeGroup);

        const domeData = { owner: this, radius, mesh: domeGroup };
        Player.addProtectionDome(domeData);
        this.activeProtectionDome = domeData;

        let pulse = 0;
        const pulseInterval = setInterval(() => {
            if (!this.activeProtectionDome || !domeRing.material) {
                clearInterval(pulseInterval);
                return;
            }
            pulse += 0.08;
            const scale = 1 + Math.sin(pulse) * 0.04;
            domeRing.scale.set(scale, scale, 1);
        }, 60);

        setTimeout(() => {
            clearInterval(pulseInterval);
            this.removeProtectionDome(domeData);
        }, duration * 1000);
    }

    removeProtectionDome(domeData) {
        if (!domeData) return;
        if (domeData.mesh && domeData.mesh.parent) {
            domeData.mesh.parent.remove(domeData.mesh);
        }
        Player.removeProtectionDome(domeData);
        if (this.activeProtectionDome === domeData) {
            this.activeProtectionDome = null;
        }
    }

    /**
     * A3 - Chain Mace
     */
    chainMaceAttack() {
        const aim = this.getAimDirection();
        const useAim = this.hasAimInput;
        const direction = useAim ? { x: aim.x, y: aim.y } : { x: this.facingDirection, y: 0 };
        const castDirection = { x: direction.x, y: direction.y };
        const speed = 21;
        const maxRange = 10.8;
        const level = this.level || { platforms: [] };

        const headGeometry = this.maceHeadGeometry || new THREE.BoxGeometry(0.38, 0.38, 0.2);
        const headMaterial = this.maceHeadMaterial || new THREE.MeshBasicMaterial({ color: 0xb8c0c8 });
        const head = this.maceHead || new THREE.Mesh(headGeometry, headMaterial);
        if (head.userData?.chainMaceInUse) {
            return;
        }
        const originalParent = head.parent;
        const originalLocalPos = head.position.clone();
        const originalLocalQuat = head.quaternion.clone();
        const originalLocalScale = head.scale.clone();
        head.userData.chainMaceInUse = true;

        if (originalParent) {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();
            head.getWorldPosition(worldPos);
            head.getWorldQuaternion(worldQuat);
            head.getWorldScale(worldScale);
            originalParent.remove(head);
            this.mesh.parent.add(head);
            head.position.copy(worldPos);
            head.quaternion.copy(worldQuat);
            head.scale.copy(worldScale);
        } else if (!head.parent) {
            this.mesh.parent.add(head);
        }
        const handleTip = this.getMaceHandleTipWorld();
        let headX = handleTip.x + direction.x * 0.35;
        let headY = handleTip.y + direction.y * 0.2;
        head.position.set(headX, headY, 0.25);
        this.mesh.parent.add(head);

        const chainGroup = new THREE.Group();
        const chainLinks = [];
        const chainLinkCount = 5;
        const chainScale = 0.35;
        for (let i = 0; i < chainLinkCount; i++) {
            const link = new THREE.Mesh(headGeometry, headMaterial);
            link.scale.set(chainScale, chainScale, chainScale);
            chainGroup.add(link);
            chainLinks.push(link);
        }
        this.mesh.parent.add(chainGroup);

        const startX = headX;
        const startY = headY;
        let resolved = false;

        let returning = false;
        const returnTarget = { x: this.position.x, y: this.position.y };
        const interval = setInterval(() => {
            let moveDir = direction;
            if (returning) {
                const tipPos = this.getMaceHandleTipWorld();
                returnTarget.x = tipPos.x;
                returnTarget.y = tipPos.y;
                const toTargetX = returnTarget.x - headX;
                const toTargetY = returnTarget.y - headY;
                const dist = Math.hypot(toTargetX, toTargetY) || 0.0001;
                moveDir = { x: toTargetX / dist, y: toTargetY / dist };
            }

            headX += moveDir.x * speed * 0.016;
            headY += moveDir.y * speed * 0.016;
            head.position.set(headX, headY, 0.25);
            const tipPos = this.getMaceHandleTipWorld();
            const startX = tipPos.x;
            const startY = tipPos.y;
            chainLinks.forEach((link, index) => {
                const t = (index + 1) / (chainLinks.length + 1);
                link.position.set(
                    startX + (headX - startX) * t,
                    startY + (headY - startY) * t,
                    0.15
                );
            });

            if (this.isPositionBlockedByProtectionDome({ x: headX, y: headY })) {
                resolved = true;
            }

            const bounds = {
                left: headX - 0.3,
                right: headX + 0.3,
                top: headY + 0.3,
                bottom: headY - 0.3
            };

            if (!resolved) {
                for (const enemy of this.getDamageTargets()) {
                    if (!enemy.isAlive) continue;
                    if (checkAABBCollision(bounds, enemy.getBounds())) {
                        this.applyAbilityDamage(this.abilities.e, enemy, 2);
                        if (typeof enemy.takeDamage === 'function') {
                            enemy.takeDamage(5, this);
                        }
                        if (enemy.type === 'player') {
                            this.addUltimateCharge(this.ultimateChargePerKill);
                        }
                        if (typeof enemy.setCripple === 'function') {
                            enemy.setCripple(1.6);
                        }
                        this.pullTarget(enemy);
                        resolved = true;
                        break;
                    }
                }
            }

            if (!resolved && level.platforms) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds || platform.isLadder || platform.disabled) continue;
                    if (checkAABBCollision(bounds, platform.bounds)) {
                        this.pullSelfTo({ x: headX, y: headY });
                        this.jumpsRemaining = Math.min(this.maxJumps, this.jumpsRemaining + 1);
                        resolved = true;
                        break;
                    }
                }
            }

            const traveled = Math.hypot(headX - startX, headY - startY);
            if (!resolved && !returning && traveled >= maxRange) {
                returning = true;
            }

            if (returning) {
                const toTargetX = returnTarget.x - headX;
                const toTargetY = returnTarget.y - headY;
                const dist = Math.hypot(toTargetX, toTargetY);
                if (dist <= 0.5) {
                    resolved = true;
                }
            }

            if (resolved) {
                clearInterval(interval);
                if (head.parent) this.mesh.parent.remove(head);
                if (chainGroup.parent) this.mesh.parent.remove(chainGroup);
                if (originalParent) {
                    originalParent.add(head);
                    head.position.copy(originalLocalPos);
                    head.quaternion.copy(originalLocalQuat);
                    head.scale.copy(originalLocalScale);
                }
                head.userData.chainMaceInUse = false;
            }
        }, 16);
    }

    pullTarget(target) {
        if (target && target.isBridge) {
            return;
        }
        const startX = target.position.x;
        const startY = target.position.y;
        const endX = this.position.x + (startX >= this.position.x ? 1.1 : -1.1);
        const endY = this.position.y;
        const duration = 180;
        const startTime = performance.now();

        const pullInterval = setInterval(() => {
            const t = (performance.now() - startTime) / duration;
            if (t >= 1) {
                clearInterval(pullInterval);
                target.position.x = endX;
                target.position.y = endY;
                target.mesh.position.x = endX;
                target.mesh.position.y = endY;
                return;
            }
            const eased = t * (2 - t);
            const nextX = startX + (endX - startX) * eased;
            const nextY = startY + (endY - startY) * eased;
            target.position.x = nextX;
            target.position.y = nextY;
            target.mesh.position.x = nextX;
            target.mesh.position.y = nextY;
        }, 16);
    }

    pullSelfTo(point) {
        const startX = this.position.x;
        const startY = this.position.y;
        const endX = point.x - this.facingDirection * 0.6;
        const endY = point.y - 0.1;
        const duration = 160;
        const startTime = performance.now();

        if (typeof this.setFallDamageGrace === 'function') {
            this.setFallDamageGrace(0.45);
        }

        const pullInterval = setInterval(() => {
            const t = (performance.now() - startTime) / duration;
            if (t >= 1) {
                clearInterval(pullInterval);
                this.position.x = endX;
                this.position.y = endY;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.syncMeshPosition();
                return;
            }
            const eased = t * (2 - t);
            const nextX = startX + (endX - startX) * eased;
            const nextY = startY + (endY - startY) * eased;
            this.position.x = nextX;
            this.position.y = nextY;
            this.syncMeshPosition();
        }, 16);
    }

    /**
     * Ultimate - Holy Radiance
     */
    castHolyRadiance() {
        if (!this.abilities.r || this.ultimateCharge < this.ultimateChargeMax) {
            return false;
        }
        this.ultimateCharge = 0;

        const radius = 5.2;
        const duration = 5.5;
        const tickInterval = 0.5;
        const healPerTick = 8;

        const aura = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.4, radius, 28),
            new THREE.MeshBasicMaterial({ color: 0xfff1b3, transparent: true, opacity: 0.5 })
        );
        aura.position.set(0, 0, 0.15);
        this.mesh.add(aura);

        let elapsed = 0;
        const healTimer = setInterval(() => {
            elapsed += tickInterval;
            const allies = this.getAllPlayers().filter((player) => player.team === this.team);
            allies.forEach((ally) => {
                const dx = ally.position.x - this.position.x;
                const dy = ally.position.y - this.position.y;
                if ((dx * dx + dy * dy) <= radius * radius) {
                    ally.heal(healPerTick);
                }
            });
            if (elapsed >= duration) {
                clearInterval(healTimer);
                if (aura.parent) this.mesh.remove(aura);
            }
        }, tickInterval * 1000);

        let pulse = 0;
        const pulseInterval = setInterval(() => {
            pulse += 0.2;
            const scale = 1 + Math.sin(pulse) * 0.08;
            aura.scale.set(scale, scale, 1);
            if (elapsed >= duration) {
                clearInterval(pulseInterval);
            }
        }, 80);
        return true;
    }

    destroy() {
        if (this.activeProtectionDome) {
            this.removeProtectionDome(this.activeProtectionDome);
        }
        super.destroy();
    }
}
