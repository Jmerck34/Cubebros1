import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Gunner Hero - Dual pistols with explosives and minigun
 * @class Gunner
 */
export class Gunner extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        this.setBodyColor(0x4a4f57);
        this.createEquipment(scene);

        this.enemies = [];
        this.facingDirection = 1;

        this.doubleShotAmmo = 8;
        this.doubleShotMaxAmmo = 8;
        this.reloadDuration = 2;
        this.reloadTimer = 0;
        this.isReloading = false;

        this.c4Instance = null;
        this.c4DetonateTimeout = null;
        this.c4Interval = null;

        this.isMinigunActive = false;
        this.minigunTimer = 0;
        this.minigunShotTimer = 0;
        this.minigunDuration = 3;
        this.minigunShotInterval = 0.1;
        this.isShotgunAnimating = false;

        this.initializeAbilities();
    }

    createEquipment(scene) {
        this.pistolGroup = new THREE.Group();
        this.pistolGroup.renderOrder = 12;

        const bodyGeometry = new THREE.BoxGeometry(0.44, 0.14, 0.1);
        const slideGeometry = new THREE.BoxGeometry(0.3, 0.06, 0.1);
        const barrelGeometry = new THREE.BoxGeometry(0.14, 0.05, 0.05);
        const gripGeometry = new THREE.BoxGeometry(0.12, 0.2, 0.1);

        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x0c0c0d });
        const slideMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1c });
        const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x222224 });
        const gripMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0a0b });

        const buildPistol = () => {
            const pistol = new THREE.Group();

            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.set(0.04, 0, 0);
            pistol.add(body);

            const slide = new THREE.Mesh(slideGeometry, slideMaterial);
            slide.position.set(0.02, 0.06, 0);
            pistol.add(slide);

            const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
            barrel.position.set(0.22, -0.01, 0);
            pistol.add(barrel);

            const grip = new THREE.Mesh(gripGeometry, gripMaterial);
            grip.position.set(-0.12, -0.14, 0);
            grip.rotation.z = -0.45;
            pistol.add(grip);

            const muzzleFlash = this.createMuzzleFlash();
            muzzleFlash.position.set(0.3, -0.01, 0.02);
            muzzleFlash.visible = false;
            pistol.userData.muzzleFlash = muzzleFlash;
            pistol.add(muzzleFlash);

            return pistol;
        };

        this.leftPistol = buildPistol();
        this.leftPistol.position.set(-0.18, -0.05, 0.6);
        this.pistolGroup.add(this.leftPistol);

        this.rightPistol = buildPistol();
        this.rightPistol.position.set(0.18, -0.05, 0.6);
        this.pistolGroup.add(this.rightPistol);

        this.pistolGroup.scale.set(1.35, 1.35, 1.35);
        this.pistolOffsets = {
            spacing: 0.26,
            y: -0.05,
            frontZ: 0.6,
            backZ: 0.35
        };
        this.pistolBasePositions = {
            left: this.leftPistol.position.clone(),
            right: this.rightPistol.position.clone()
        };

        this.shotgunGroup = this.createShotgun();
        this.shotgunGroup.visible = false;
        this.mesh.add(this.shotgunGroup);

        this.mesh.add(this.pistolGroup);
        this.updateGunDepthFlip();
    }

    createMuzzleFlash() {
        const flashGroup = new THREE.Group();
        const flashShape = new THREE.Shape();
        flashShape.moveTo(0, 0);
        flashShape.lineTo(0.18, 0.07);
        flashShape.lineTo(0.26, 0);
        flashShape.lineTo(0.18, -0.07);
        flashShape.lineTo(0, 0);

        const wedge = new THREE.Mesh(
            new THREE.ShapeGeometry(flashShape),
            new THREE.MeshBasicMaterial({
                color: 0xffd36a,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        flashGroup.add(wedge);

        const core = new THREE.Mesh(
            new THREE.CircleGeometry(0.06, 10),
            new THREE.MeshBasicMaterial({
                color: 0xfff1b5,
                transparent: true,
                opacity: 0.9,
                depthTest: false,
                depthWrite: false
            })
        );
        core.position.set(0.06, 0, 0.01);
        flashGroup.add(core);

        return flashGroup;
    }

    createShotgun() {
        const shotgun = new THREE.Group();
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.12, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x3a2b1e })
        );
        stock.position.set(-0.12, -0.02, 0);
        shotgun.add(stock);

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.12, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x151617 })
        );
        body.position.set(0.05, 0, 0);
        shotgun.add(body);

        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.06, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x1f2022 })
        );
        barrel.position.set(0.34, -0.02, 0);
        shotgun.add(barrel);

        const muzzleFlash = this.createMuzzleFlash();
        muzzleFlash.position.set(0.48, -0.01, 0.02);
        muzzleFlash.visible = false;
        shotgun.userData.muzzleFlash = muzzleFlash;
        shotgun.add(muzzleFlash);

        shotgun.position.set(0.12, -0.06, 0.5);
        return shotgun;
    }

    initializeAbilities() {
        const doubleShot = new Ability('Double Shot', 0.5);
        doubleShot.use = (hero) => hero.fireDoubleShot(doubleShot);

        const scatterShot = new Ability('Scattershot', 5);
        scatterShot.use = (hero) => {
            if (!Ability.prototype.use.call(scatterShot, hero)) return false;
            hero.fireScatterShot();
            return true;
        };

        const c4Blast = new Ability('C4 Blast', 5);
        c4Blast.use = (hero) => hero.handleC4Ability(c4Blast);

        const minigun = new Ability('Minigun', 0, true);
        minigun.use = (hero) => hero.activateMinigun();

        this.setAbilities(doubleShot, scatterShot, c4Blast, minigun);
    }

    update(deltaTime, input) {
        const aim = this.getAimDirection();
        if (this.hasAimInput && Math.abs(aim.x) > 0.15) {
            this.setFacingDirection(aim.x >= 0 ? 1 : -1);
        } else if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        if (this.leftPistol && this.rightPistol) {
            const aimAngle = Math.atan2(aim.y, aim.x);
            const rotation = this.hasAimInput ? aimAngle : 0;
            this.leftPistol.rotation.z = rotation;
            this.rightPistol.rotation.z = rotation;
        }
        if (this.shotgunGroup) {
            const aimAngle = Math.atan2(aim.y, aim.x);
            this.shotgunGroup.rotation.z = this.hasAimInput ? aimAngle : 0;
        }

        super.update(deltaTime, input);

        if (this.isReloading) {
            this.reloadTimer = Math.max(0, this.reloadTimer - deltaTime);
            if (this.reloadTimer === 0) {
                this.isReloading = false;
                this.doubleShotAmmo = this.doubleShotMaxAmmo;
                if (this.abilities && this.abilities.q) {
                    this.abilities.q.currentCooldown = 0;
                    this.abilities.q.isReady = true;
                }
            }
        }

        if (this.isMinigunActive) {
            this.minigunTimer = Math.max(0, this.minigunTimer - deltaTime);
            this.minigunShotTimer += deltaTime;
            while (this.minigunShotTimer >= this.minigunShotInterval) {
                this.fireMinigunBullet();
                this.minigunShotTimer -= this.minigunShotInterval;
            }
            if (this.minigunTimer === 0) {
                this.isMinigunActive = false;
            }
        }
    }

    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            this.mesh.scale.x = direction;
            this.updateGunDepthFlip();
        }
    }

    fireDoubleShot(ability) {
        if (!ability || !ability.isReady) return false;
        if (this.isReloading) return false;
        if (this.doubleShotAmmo <= 0) {
            this.startReload(ability);
            return false;
        }
        if (!Ability.prototype.use.call(ability, this)) return false;

        this.doubleShotAmmo = Math.max(0, this.doubleShotAmmo - 1);
        const aim = this.getAimDirection();
        const direction = this.hasAimInput ? aim : { x: this.facingDirection, y: 0 };
        this.playPistolFire('left');
        this.spawnPistolBullet(direction, 'left', 10, 15);
        setTimeout(() => {
            this.playPistolFire('right');
            this.spawnPistolBullet(direction, 'right', 10, 15);
            if (this.doubleShotAmmo <= 0) {
                this.startReload(ability);
            }
        }, 100);
        return true;
    }

    startReload(ability) {
        this.isReloading = true;
        this.reloadTimer = this.reloadDuration;
        if (ability) {
            ability.currentCooldown = Math.max(ability.currentCooldown, this.reloadDuration);
            ability.isReady = false;
        }
    }

    spawnPistolBullet(direction, side, damage, range) {
        const muzzlePos = this.getPistolMuzzleWorldPosition(side);
        const origin = muzzlePos || {
            x: this.position.x + (side === 'left' ? -0.45 : 0.45) * (this.facingDirection || 1),
            y: this.position.y - 0.05
        };
        this.spawnBullet({
            origin,
            direction,
            speed: 26,
            range,
            damage,
            color: 0x3b3b3b,
            size: { x: 0.34, y: 0.1, z: 0.1 },
            trail: true
        });
    }

    getPistolMuzzleWorldPosition(side) {
        const pistol = side === 'left' ? this.leftPistol : this.rightPistol;
        if (!pistol || !pistol.userData || !pistol.userData.muzzleFlash) {
            return null;
        }
        pistol.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        pistol.userData.muzzleFlash.getWorldPosition(worldPos);
        return { x: worldPos.x, y: worldPos.y };
    }

    playPistolFire(side) {
        const pistol = side === 'left' ? this.leftPistol : this.rightPistol;
        const base = this.pistolBasePositions ? this.pistolBasePositions[side] : null;
        if (!pistol || !base) return;

        const kickDistance = 0.06;
        const kickDir = base.x >= 0 ? -1 : 1;
        pistol.position.x = base.x + kickDir * kickDistance;

        const flash = pistol.userData ? pistol.userData.muzzleFlash : null;
        if (flash) {
            flash.visible = true;
            flash.scale.set(1.05, 1.05, 1);
        }

        setTimeout(() => {
            pistol.position.x = base.x;
            if (flash) {
                flash.visible = false;
                flash.scale.set(1, 1, 1);
            }
        }, 80);
    }

    playShotgunFire() {
        if (!this.shotgunGroup || !this.pistolGroup) return;
        this.pistolGroup.visible = false;
        this.shotgunGroup.visible = true;

        const muzzle = this.shotgunGroup.userData ? this.shotgunGroup.userData.muzzleFlash : null;
        if (muzzle) {
            muzzle.visible = true;
            muzzle.scale.set(1.2, 1.2, 1);
        }

        const kickStart = this.shotgunGroup.position.x;
        this.shotgunGroup.position.x = kickStart - 0.06;

        setTimeout(() => {
            this.shotgunGroup.position.x = kickStart;
            if (muzzle) {
                muzzle.visible = false;
                muzzle.scale.set(1, 1, 1);
            }
        }, 120);

        setTimeout(() => {
            this.shotgunGroup.visible = false;
            this.pistolGroup.visible = true;
        }, 260);
    }

    updateGunDepthFlip() {
        if (!this.leftPistol || !this.rightPistol || !this.pistolOffsets) return;
        const spacing = this.pistolOffsets.spacing;
        const facingRight = this.facingDirection >= 0;
        this.leftPistol.position.x = -spacing;
        this.rightPistol.position.x = spacing;
        this.leftPistol.position.y = this.pistolOffsets.y;
        this.rightPistol.position.y = this.pistolOffsets.y;

        const frontZ = this.pistolOffsets.frontZ;
        const backZ = this.pistolOffsets.backZ;
        this.leftPistol.position.z = frontZ;
        this.rightPistol.position.z = backZ;

        if (this.pistolBasePositions) {
            this.pistolBasePositions.left.copy(this.leftPistol.position);
            this.pistolBasePositions.right.copy(this.rightPistol.position);
        }
    }

    fireScatterShot() {
        this.playShotgunFire();
        const aim = this.getAimDirection();
        const direction = this.hasAimInput ? aim : { x: this.facingDirection, y: 0 };
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spread = Math.PI / 5;
        const pellets = 8;
        for (let i = 0; i < pellets; i += 1) {
            const offset = (Math.random() - 0.5) * spread;
            const angle = baseAngle + offset;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };
            this.spawnBullet({
                origin: {
                    x: this.position.x + dir.x * 0.6,
                    y: this.position.y + 0.1 + dir.y * 0.6
                },
                direction: dir,
                speed: 18,
                range: 5,
                damage: 5,
                color: 0x3b3b3b,
                size: { x: 0.38, y: 0.12, z: 0.12 },
                trail: true
            });
        }
    }

    handleC4Ability(ability) {
        if (this.c4Instance) {
            this.detonateC4(ability);
            return true;
        }
        if (!ability || !ability.isReady) {
            return false;
        }
        this.throwC4();
        return true;
    }

    throwC4() {
        if (!this.mesh || !this.mesh.parent) return;
        const c4Group = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.2, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x444a52 })
        );
        c4Group.add(body);
        const strap = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.05, 0.12),
            new THREE.MeshBasicMaterial({ color: 0xd86a3a })
        );
        strap.position.set(0, 0.08, 0.01);
        c4Group.add(strap);
        c4Group.position.set(this.position.x, this.position.y + 0.2, 0.3);
        this.mesh.parent.add(c4Group);

        const aim = this.getAimDirection();
        const direction = this.hasAimInput ? aim : { x: this.facingDirection, y: 0 };
        const speed = 6;
        const velocity = {
            x: direction.x * speed,
            y: direction.y * speed + 2.2
        };
        const gravity = -12;
        const level = this.level || { platforms: [] };

        this.c4Instance = { mesh: c4Group, velocity };
        if (this.c4Interval) {
            clearInterval(this.c4Interval);
        }
        this.c4Interval = setInterval(() => {
            if (!this.c4Instance) {
                clearInterval(this.c4Interval);
                this.c4Interval = null;
                return;
            }
            velocity.y += gravity * 0.016;
            c4Group.position.x += velocity.x * 0.016;
            c4Group.position.y += velocity.y * 0.016;

            const bounds = {
                left: c4Group.position.x - 0.2,
                right: c4Group.position.x + 0.2,
                top: c4Group.position.y + 0.15,
                bottom: c4Group.position.y - 0.15
            };
            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(bounds, platform.bounds)) {
                        c4Group.position.y = platform.bounds.top + 0.15;
                        velocity.x = 0;
                        velocity.y = 0;
                    }
                }
            }
        }, 16);

        if (this.c4DetonateTimeout) {
            clearTimeout(this.c4DetonateTimeout);
        }
        this.c4DetonateTimeout = setTimeout(() => {
            this.detonateC4(this.abilities?.e);
        }, 5000);
    }

    detonateC4(ability) {
        if (!this.c4Instance) return;
        const c4Pos = { x: this.c4Instance.mesh.position.x, y: this.c4Instance.mesh.position.y };
        if (this.c4Interval) {
            clearInterval(this.c4Interval);
            this.c4Interval = null;
        }
        if (this.c4DetonateTimeout) {
            clearTimeout(this.c4DetonateTimeout);
            this.c4DetonateTimeout = null;
        }
        if (this.c4Instance.mesh.parent) {
            this.c4Instance.mesh.parent.remove(this.c4Instance.mesh);
        }
        this.c4Instance = null;

        this.createC4BlastEffect(c4Pos);
        this.applyC4Blast(c4Pos);

        if (ability) {
            ability.currentCooldown = ability.cooldown;
            ability.isReady = false;
        }
    }

    applyC4Blast(position) {
        const radius = 3;
        const radiusSq = radius * radius;
        const knockback = 7;
        const selfKnockback = 11;
        for (const target of this.getDamageTargets()) {
            if (!target || !target.isAlive || target === this) continue;
            const dx = target.position.x - position.x;
            const dy = target.position.y - position.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > radiusSq) continue;
            if (typeof target.takeDamage === 'function') {
                target.takeDamage(30, this);
            }
            if (target.velocity) {
                const dist = Math.sqrt(distSq) || 1;
                target.velocity.x += (dx / dist) * knockback;
                target.velocity.y = Math.max(target.velocity.y, (dy / dist) * knockback);
                target.isGrounded = false;
            }
        }

        const selfDx = this.position.x - position.x;
        const selfDy = this.position.y - position.y;
        const selfDistSq = selfDx * selfDx + selfDy * selfDy;
        if (selfDistSq <= radiusSq) {
            const dist = Math.sqrt(selfDistSq) || 1;
            this.velocity.x += (selfDx / dist) * selfKnockback;
            this.velocity.y = Math.max(this.velocity.y, (selfDy / dist) * selfKnockback);
            this.isGrounded = false;
        }
    }

    createC4BlastEffect(position) {
        if (!this.mesh || !this.mesh.parent) return;
        const blastGroup = new THREE.Group();
        blastGroup.position.set(position.x, position.y, 0.35);
        this.mesh.parent.add(blastGroup);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.4, 3, 28),
            new THREE.MeshBasicMaterial({
                color: 0xffb76b,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        ring.scale.set(0, 0, 1);
        blastGroup.add(ring);

        const core = new THREE.Mesh(
            new THREE.CircleGeometry(1.8, 22),
            new THREE.MeshBasicMaterial({
                color: 0xff7a3d,
                transparent: true,
                opacity: 0.65,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        core.scale.set(0, 0, 1);
        blastGroup.add(core);

        let elapsed = 0;
        const duration = 0.4;
        const interval = setInterval(() => {
            elapsed += 0.04;
            const progress = Math.min(1, elapsed / duration);
            const scale = progress;
            ring.scale.set(scale, scale, 1);
            core.scale.set(scale, scale, 1);
            ring.material.opacity = 0.8 * (1 - progress);
            core.material.opacity = 0.65 * (1 - progress);
            if (progress >= 1) {
                clearInterval(interval);
                if (blastGroup.parent) {
                    blastGroup.parent.remove(blastGroup);
                }
            }
        }, 40);
    }

    activateMinigun() {
        if (this.ultimateCharge < this.ultimateChargeMax) {
            return false;
        }
        if (this.isMinigunActive) {
            return false;
        }
        this.ultimateCharge = 0;
        this.isMinigunActive = true;
        this.minigunTimer = this.minigunDuration;
        this.minigunShotTimer = 0;
        return true;
    }

    fireMinigunBullet() {
        const aim = this.getAimDirection();
        const direction = this.hasAimInput ? aim : { x: this.facingDirection, y: 0 };
        this.spawnBullet({
            origin: {
                x: this.position.x + direction.x * 0.6,
                y: this.position.y + 0.1 + direction.y * 0.6
            },
            direction,
            speed: 24,
            range: 15,
            damage: 5,
            color: 0x3b3b3b,
            size: { x: 0.28, y: 0.08, z: 0.08 },
            trail: true
        });
    }

    spawnBullet({ origin, direction, speed, range, damage, color, size, trail }) {
        if (!this.mesh || !this.mesh.parent) return;
        const length = Math.hypot(direction.x, direction.y) || 1;
        const dirX = direction.x / length;
        const dirY = direction.y / length;

        const bulletSize = size || { x: 0.2, y: 0.05, z: 0.05 };
        const bulletGeometry = new THREE.BoxGeometry(bulletSize.x, bulletSize.y, bulletSize.z);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color });
        const bulletGroup = new THREE.Group();
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bulletGroup.add(bullet);
        bulletGroup.position.set(origin.x, origin.y, 0.25);
        bulletGroup.rotation.z = Math.atan2(dirY, dirX);

        let trailSegments = null;
        if (trail) {
            const trailMaterialA = new THREE.MeshBasicMaterial({
                color: 0xff4b2b,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            });
            const trailMaterialB = trailMaterialA.clone();
            trailMaterialB.color.set(0xffa033);
            trailMaterialB.opacity = 0.25;

            const trailA = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.1), trailMaterialA);
            const trailB = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), trailMaterialB);
            bulletGroup.add(trailB);
            bulletGroup.add(trailA);
            trailSegments = [
                { mesh: trailA, offset: 0.25 },
                { mesh: trailB, offset: 0.45 }
            ];
        }

        this.mesh.parent.add(bulletGroup);

        const projectile = {
            type: 'bullet',
            mesh: bulletGroup,
            owner: this,
            velocity: { x: dirX * speed, y: dirY * speed },
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
            }
        };
        Hero.addProjectile(projectile);

        let traveled = 0;
        const level = this.level || { platforms: [] };
        const interval = setInterval(() => {
            const owner = projectile.owner || this;
            const prevX = bulletGroup.position.x;
            const prevY = bulletGroup.position.y;
            bulletGroup.position.x += projectile.velocity.x * 0.016;
            bulletGroup.position.y += projectile.velocity.y * 0.016;
            traveled += Math.hypot(bulletGroup.position.x - prevX, bulletGroup.position.y - prevY);

            if (trailSegments) {
                for (const segment of trailSegments) {
                    segment.mesh.position.x = -segment.offset - Math.random() * 0.03;
                    segment.mesh.position.y = (Math.random() - 0.5) * 0.01;
                }
            }

            const bounds = {
                left: bulletGroup.position.x - bulletSize.x * 0.6,
                right: bulletGroup.position.x + bulletSize.x * 0.6,
                top: bulletGroup.position.y + bulletSize.y * 0.6,
                bottom: bulletGroup.position.y - bulletSize.y * 0.6
            };

            if (owner && typeof owner.isPositionBlockedByProtectionDome === 'function' &&
                owner.isPositionBlockedByProtectionDome(bulletGroup.position)) {
                clearInterval(interval);
                Hero.removeProjectile(projectile);
                if (bulletGroup.parent) bulletGroup.parent.remove(bulletGroup);
                return;
            }

            for (const target of owner && typeof owner.getDamageTargets === 'function' ? owner.getDamageTargets() : []) {
                if (!target || !target.isAlive) continue;
                if (checkAABBCollision(bounds, target.getBounds())) {
                    if (typeof target.takeDamage === 'function') {
                        target.takeDamage(damage, owner);
                    }
                    if (target.type === 'player' && typeof owner.addUltimateCharge === 'function') {
                        owner.addUltimateCharge(owner.ultimateChargePerKill || 0);
                    }
                    clearInterval(interval);
                    Hero.removeProjectile(projectile);
                    if (bulletGroup.parent) bulletGroup.parent.remove(bulletGroup);
                    return;
                }
            }

            if (level.platforms) {
                for (const platform of level.platforms) {
                    if (!platform || !platform.bounds) continue;
                    if (checkAABBCollision(bounds, platform.bounds)) {
                        clearInterval(interval);
                        Hero.removeProjectile(projectile);
                        if (bulletGroup.parent) bulletGroup.parent.remove(bulletGroup);
                        return;
                    }
                }
            }

            if (traveled >= range) {
                clearInterval(interval);
                Hero.removeProjectile(projectile);
                if (bulletGroup.parent) bulletGroup.parent.remove(bulletGroup);
            }
        }, 16);
    }
}
