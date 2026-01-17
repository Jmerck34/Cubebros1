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
        this.maceBasicCounter = 0;

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
        const crushingMace = new Ability('Crushing Mace', 0.5, false, 2);
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
        this.maceBasicCounter += 1;
        const direction = this.getSmoothAimDirection();
        if (Math.abs(direction.x) > 0.1) {
            this.setFacingDirection(direction.x >= 0 ? 1 : -1);
        }
        if (this.maceBasicCounter % 3 === 0) {
            this.throwBoomerangMace(direction);
            return;
        }
        const originalRot = this.maceBase.rotZ;
        this.mace.rotation.z = -1.2;
        setTimeout(() => {
            this.mace.rotation.z = 0.6;
            this.createMaceSmashEffect(direction);
            this.applyMaceDamage(direction);
        }, 140);
        setTimeout(() => {
            this.mace.rotation.z = originalRot;
        }, 320);
    }

    throwBoomerangMace(direction) {
        if (!this.mesh || !this.mesh.parent) return;
        const aim = direction || this.getSmoothAimDirection();
        const dirX = Number.isFinite(aim.x) ? aim.x : (this.facingDirection || 1);
        const dirY = Number.isFinite(aim.y) ? aim.y : 0;
        const spinDir = Math.sign(dirX || this.facingDirection || 1) || 1;
        const projectile = new THREE.Group();

        const handleGeometry = new THREE.BoxGeometry(0.14, 0.9, 0.1);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x6b4a2b });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.05, 0);
        projectile.add(handle);

        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.26);
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0xbfc7cf });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.5, 0);
        projectile.add(head);

        projectile.scale.set(1.1, 1.1, 1.1);
        projectile.position.set(this.position.x + 0.6 * dirX, this.position.y + 0.6 * dirY + 0.15, 0.2);
        projectile.rotation.z = Math.PI / 2 * spinDir;
        this.mesh.parent.add(projectile);

        const speed = 10;
        const maxRange = 6;
        const hitTargets = new Map();
        const startPos = { x: projectile.position.x, y: projectile.position.y };
        let returning = false;
        let traveled = 0;

        const interval = setInterval(() => {
            const step = speed * 0.016;
            if (!returning) {
                projectile.position.x += step * dirX;
                projectile.position.y += step * dirY;
                traveled += step;
                if (traveled >= maxRange) {
                    returning = true;
                }
            } else {
                const toHeroX = this.position.x - projectile.position.x;
                const toHeroY = this.position.y + 0.2 - projectile.position.y;
                const dist = Math.hypot(toHeroX, toHeroY);
                if (dist <= 0.6) {
                    clearInterval(interval);
                    if (projectile.parent) {
                        projectile.parent.remove(projectile);
                    }
                    return;
                }
                const dirX = toHeroX / (dist || 1);
                const dirY = toHeroY / (dist || 1);
                projectile.position.x += dirX * step;
                projectile.position.y += dirY * step;
            }

            projectile.rotation.z += 0.35 * spinDir;

            const bounds = {
                left: projectile.position.x - 0.35,
                right: projectile.position.x + 0.35,
                top: projectile.position.y + 0.4,
                bottom: projectile.position.y - 0.4
            };

            for (const enemy of this.getDamageTargets()) {
                if (!enemy.isAlive) continue;
                const hitState = hitTargets.get(enemy) || { outbound: false, inbound: false };
                if (!returning && hitState.outbound) continue;
                if (returning && hitState.inbound) continue;
                const enemyBounds = enemy.getBounds();
                if (checkAABBCollision(bounds, enemyBounds)) {
                    if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(20, this);
                    }
                    if (enemy.type === 'player') {
                        this.addUltimateCharge(this.ultimateChargePerKill);
                    }
                    this.registerCrushingHit(enemy);
                    if (!returning) {
                        hitState.outbound = true;
                    } else {
                        hitState.inbound = true;
                    }
                    hitTargets.set(enemy, hitState);
                }
            }

            if (!returning && Math.hypot(projectile.position.x - startPos.x, projectile.position.y - startPos.y) > maxRange * 1.3) {
                returning = true;
            }
        }, 16);
    }

    applyMaceDamage(direction) {
        const aim = direction || this.getSmoothAimDirection();
        let dirX = Number.isFinite(aim.x) ? aim.x : (this.facingDirection || 1);
        let dirY = Number.isFinite(aim.y) ? aim.y : 0;
        const length = Math.hypot(dirX, dirY) || 1;
        dirX /= length;
        dirY /= length;
        const range = 2.4;
        const height = 1.4;
        const centerX = this.position.x + dirX * range * 0.7;
        const centerY = this.position.y + dirY * range * 0.5;
        const halfW = 1.1 + Math.abs(dirX) * 0.6;
        const halfH = 0.9 + Math.abs(dirY) * 0.6;
        const bounds = {
            left: centerX - halfW,
            right: centerX + halfW,
            top: centerY + halfH,
            bottom: centerY - halfH
        };

        for (const enemy of this.getDamageTargets()) {
            if (!enemy.isAlive) continue;
            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                if (typeof enemy.takeDamage === 'function') {
                    enemy.takeDamage(20, this);
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
            this.createSmiteLightning(enemy);
            existing.count = 0;
        }
        this.maceHitTracker.set(enemy, existing);
    }

    createSmiteLightning(enemy) {
        if (!this.mesh || !this.mesh.parent || !enemy) return;
        const originX = enemy.position?.x ?? this.position.x;
        const originY = enemy.position?.y ?? this.position.y;
        const height = 4.6;
        const topY = originY + height;
        const segments = 6;
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const jitter = (Math.random() - 0.5) * 0.35;
            points.push(new THREE.Vector3(originX + jitter, topY - height * t, 0.45));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const boltGeometry = new THREE.TubeGeometry(curve, 20, 0.065, 6, false);
        const boltMaterial = new THREE.MeshBasicMaterial({
            color: 0xfff6c4,
            transparent: true,
            opacity: 0.98
        });
        const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
        bolt.renderOrder = 12;

        const glowGeometry = new THREE.TubeGeometry(curve, 20, 0.12, 6, false);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffe39b,
            transparent: true,
            opacity: 0.55
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.renderOrder = 11;

        const taperGeometry = (geometry, centerX, centerZ) => {
            geometry.computeBoundingBox();
            const maxY = geometry.boundingBox.max.y;
            const minY = geometry.boundingBox.min.y;
            const range = Math.max(0.0001, maxY - minY);
            const pos = geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                const t = (maxY - y) / range;
                const scale = Math.max(0, Math.min(1, t));
                const nextX = centerX + (x - centerX) * scale;
                const nextZ = centerZ + (z - centerZ) * scale;
                pos.setX(i, nextX);
                pos.setZ(i, nextZ);
            }
            pos.needsUpdate = true;
        };

        taperGeometry(boltGeometry, originX, 0.45);
        taperGeometry(glowGeometry, originX, 0.45);

        const flash = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 18),
            new THREE.MeshBasicMaterial({ color: 0xfff2d6, transparent: true, opacity: 0.45 })
        );
        flash.position.set(originX, originY + 0.1, 0.46);
        flash.renderOrder = 13;

        const bottomConeGeometry = new THREE.ConeGeometry(0.32, 0.6, 14);
        const bottomConeMaterial = new THREE.MeshBasicMaterial({
            color: 0xfff0b8,
            transparent: true,
            opacity: 0.75
        });
        const bottomCone = new THREE.Mesh(bottomConeGeometry, bottomConeMaterial);
        bottomCone.rotation.x = Math.PI;
        bottomCone.position.set(originX, originY + 0.3, 0.45);
        bottomCone.renderOrder = 12;

        const halo = new THREE.Mesh(
            new THREE.RingGeometry(0.42, 0.68, 20),
            new THREE.MeshBasicMaterial({
                color: 0xffe6b3,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            })
        );
        halo.position.set(originX, originY + 0.12, 0.44);
        halo.renderOrder = 12;

        const group = new THREE.Group();
        group.add(glow, bolt, bottomCone, halo, flash);
        this.mesh.parent.add(group);

        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 0.016;
            const fade = Math.max(0, 1 - elapsed * 4.5);
            boltMaterial.opacity = 0.98 * fade;
            glowMaterial.opacity = 0.55 * fade;
            flash.material.opacity = 0.45 * fade;
            halo.material.opacity = 0.4 * fade;
            bottomConeMaterial.opacity = 0.75 * fade;
            if (fade <= 0.02) {
                clearInterval(interval);
                if (group.parent) {
                    group.parent.remove(group);
                }
            }
        }, 16);
    }

    createMaceSmashEffect(direction) {
        const aim = direction || this.getSmoothAimDirection();
        let dirX = Number.isFinite(aim.x) ? aim.x : (this.facingDirection || 1);
        let dirY = Number.isFinite(aim.y) ? aim.y : 0;
        const length = Math.hypot(dirX, dirY) || 1;
        dirX /= length;
        dirY /= length;
        const impact = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.8, 16),
            new THREE.MeshBasicMaterial({ color: 0xe6f2ff, transparent: true, opacity: 0.6 })
        );
        impact.position.set(this.position.x + dirX * 1.1, this.position.y + dirY * 0.7, 0.2);
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

    createSpinWindArc(startAngle, endAngle, radius = 1.2) {
        if (!this.mesh || !this.mesh.parent) return;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.78, radius, 32),
            new THREE.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.5 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(this.position.x, this.position.y + 0.2, 0.18);
        this.mesh.parent.add(ring);

        let opacity = 0.5;
        let spin = 0;
        const interval = setInterval(() => {
            spin += 0.35;
            ring.rotation.z += 0.12;
            ring.position.set(this.position.x, this.position.y + 0.2, 0.18);
            opacity -= 0.08;
            ring.material.opacity = Math.max(0, opacity);
            if (opacity <= 0) {
                clearInterval(interval);
                this.mesh.parent.remove(ring);
            }
        }, 40);
    }

    getSmoothAimDirection() {
        const aimDir = this.hasAimInput ? this.getAimDirection() : { x: this.facingDirection || 1, y: 0 };
        const aimLength = Math.hypot(aimDir.x, aimDir.y) || 1;
        return { x: aimDir.x / aimLength, y: aimDir.y / aimLength };
    }

    createSlamWind(x, y) {
        if (!this.mesh || !this.mesh.parent) return;
        const streak = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 1.2, 0.05),
            new THREE.MeshBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.55 })
        );
        streak.position.set(x, y + 0.6, 0.18);
        this.mesh.parent.add(streak);

        let opacity = 0.55;
        const interval = setInterval(() => {
            opacity -= 0.12;
            streak.material.opacity = Math.max(0, opacity);
            streak.position.y -= 0.08;
            if (opacity <= 0) {
                clearInterval(interval);
                this.mesh.parent.remove(streak);
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
            new THREE.CircleGeometry(radius, 32, -Math.PI / 2, Math.PI),
            new THREE.MeshBasicMaterial({
                color: 0x8ad1ff,
                transparent: true,
                opacity: 0.12,
                side: THREE.DoubleSide
            })
        );
        const domeRing = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.92, radius, 32, 1, -Math.PI / 2, Math.PI),
            new THREE.MeshBasicMaterial({
                color: 0xbbe8ff,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            })
        );
        domeGroup.add(domeFill, domeRing);
        domeGroup.position.set(0, 0.1, 0.12);
        this.mesh.add(domeGroup);

        const domeData = { owner: this, radius, mesh: domeGroup, halfCircle: true };
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
