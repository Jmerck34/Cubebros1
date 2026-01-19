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
        this.c4CanDetonate = false;
        this.c4AwaitRelease = false;

        this.isMinigunActive = false;
        this.minigunTimer = 0;
        this.minigunShotTimer = 0;
        this.minigunDuration = 3;
        this.minigunShotInterval = 0.1;
        this.isShotgunAnimating = false;
        this.c4BlinkInterval = null;

        this.initializeAbilities();
    }

    createEquipment(scene) {
        this.addGunnerArmor();
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

        this.gatlingGroup = this.createGatlingGun();
        this.gatlingGroup.visible = false;
        this.gatlingGroup.scale.set(1.4, 1.4, 1.4);
        this.mesh.add(this.gatlingGroup);

        this.shotgunGroup = this.createShotgun();
        this.shotgunGroup.visible = false;
        this.shotgunGroup.scale.set(1.6, 1.6, 1.6);
        this.mesh.add(this.shotgunGroup);

        this.mesh.add(this.pistolGroup);
        this.updateGunDepthFlip();
    }

    addGunnerArmor() {
        if (!this.mesh) return;

        const bandana = new THREE.Group();
        const band = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.12, 0.68),
            new THREE.MeshBasicMaterial({ color: 0xb32020 })
        );
        band.renderOrder = 12;
        band.material.depthTest = false;
        band.material.depthWrite = false;
        band.position.set(0, 0.44, 0);
        bandana.add(band);
        const knot = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x8f1b1b })
        );
        knot.renderOrder = 12;
        knot.material.depthTest = false;
        knot.material.depthWrite = false;
        knot.position.set(0.32, 0.44, -0.2);
        bandana.add(knot);
        const tailA = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.16, 0.04),
            new THREE.MeshBasicMaterial({ color: 0x9e2020 })
        );
        tailA.renderOrder = 12;
        tailA.material.depthTest = false;
        tailA.material.depthWrite = false;
        tailA.position.set(0.36, 0.35, -0.26);
        tailA.rotation.z = -0.4;
        bandana.add(tailA);
        const tailB = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.14, 0.04),
            new THREE.MeshBasicMaterial({ color: 0x9e2020 })
        );
        tailB.renderOrder = 12;
        tailB.material.depthTest = false;
        tailB.material.depthWrite = false;
        tailB.position.set(0.28, 0.32, -0.3);
        tailB.rotation.z = 0.35;
        bandana.add(tailB);
        bandana.position.set(0, 0, 0.4);
        this.mesh.add(bandana);

        const ammoBelt = new THREE.Group();
        const linkMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
        const roundMaterial = new THREE.MeshBasicMaterial({ color: 0xd4a54a });
        for (let i = 0; i < 7; i += 1) {
            const link = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.08), linkMaterial);
            const round = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), roundMaterial);
            const offset = i * 0.12;
            link.position.set(-0.34 + offset, 0.27 - offset * 0.4, 0.45 - offset * 0.2);
            round.position.set(-0.34 + offset, 0.27 - offset * 0.4, 0.5 - offset * 0.2);
            link.renderOrder = 12;
            round.renderOrder = 12;
            link.material.depthTest = false;
            link.material.depthWrite = false;
            round.material.depthTest = false;
            round.material.depthWrite = false;
            ammoBelt.add(link);
            ammoBelt.add(round);
        }
        ammoBelt.position.set(0, 0, 0.5);
        this.mesh.add(ammoBelt);

        const grenadeBelt = new THREE.Group();
        const grenadeMaterial = new THREE.MeshBasicMaterial({ color: 0x3a4a2a });
        const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xd4d4d4 });
        for (let i = 0; i < 3; i += 1) {
            const grenade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), grenadeMaterial);
            grenade.position.set(-0.18 + i * 0.18, -0.32, 0.2);
            grenadeBelt.add(grenade);
            const pin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), pinMaterial);
            pin.position.set(-0.18 + i * 0.18, -0.24, 0.22);
            grenade.renderOrder = 12;
            pin.renderOrder = 12;
            grenade.material.depthTest = false;
            grenade.material.depthWrite = false;
            pin.material.depthTest = false;
            pin.material.depthWrite = false;
            grenadeBelt.add(pin);
        }
        grenadeBelt.position.set(0, 0, 0.35);
        this.mesh.add(grenadeBelt);
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

    createGatlingGun() {
        const gatling = new THREE.Group();
        gatling.renderOrder = 12;

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.14, 0.12),
            new THREE.MeshBasicMaterial({ color: 0x1b1c1f })
        );
        base.position.set(-0.02, -0.02, 0);
        gatling.add(base);

        const drum = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.12, 14),
            new THREE.MeshBasicMaterial({ color: 0x2a2b2f })
        );
        drum.rotation.z = Math.PI / 2;
        drum.position.set(-0.18, 0.02, 0);
        gatling.add(drum);

        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.05, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x0d0d0e })
        );
        handle.position.set(0.14, 0.12, 0);
        gatling.add(handle);

        const barrelCluster = new THREE.Group();
        const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2b2e });
        const barrelGeometry = new THREE.BoxGeometry(0.46, 0.04, 0.04);
        const barrelCount = 6;
        const radius = 0.05;
        for (let i = 0; i < barrelCount; i += 1) {
            const angle = (Math.PI * 2 * i) / barrelCount;
            const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
            barrel.position.set(0.29, Math.cos(angle) * radius, Math.sin(angle) * radius);
            barrelCluster.add(barrel);
        }
        barrelCluster.position.set(0.2, 0.02, 0);
        gatling.add(barrelCluster);
        gatling.userData.barrelCluster = barrelCluster;
        gatling.userData.spinPhase = 0;

        const muzzle = this.createMuzzleFlash();
        muzzle.position.set(0.66, 0.02, 0.02);
        muzzle.visible = false;
        gatling.userData.muzzleFlash = muzzle;
        gatling.add(muzzle);

        const heatGlow = new THREE.Mesh(
            new THREE.RingGeometry(0.02, 0.05, 18, 1, 0, Math.PI),
            new THREE.MeshBasicMaterial({
                color: 0xff4d1f,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            })
        );
        heatGlow.rotation.z = Math.PI / 2;
        heatGlow.position.set(0.66, 0.02, 0.01);
        heatGlow.visible = true;
        gatling.userData.heatGlow = heatGlow;
        gatling.add(heatGlow);

        gatling.position.set(0.2, -0.06, 1.05);
        return gatling;
    }

    createShotgun() {
        const shotgun = new THREE.Group();
        shotgun.renderOrder = 12;
        const gripBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.08, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x3a2b1e })
        );
        gripBack.position.set(-0.18, 0.02, 0);
        gripBack.rotation.z = -0.3;
        shotgun.add(gripBack);

        const gripSlope = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.06, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x3a2b1e })
        );
        gripSlope.position.set(-0.26, 0.05, 0);
        gripSlope.rotation.z = -0.55;
        shotgun.add(gripSlope);

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.12, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x151617 })
        );
        body.renderOrder = 12;
        body.position.set(0.12, 0, 0);
        shotgun.add(body);

        const barrelGeometry = new THREE.BoxGeometry(0.34, 0.05, 0.05);
        const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x1f2022 });
        const topBarrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        topBarrel.renderOrder = 12;
        topBarrel.position.set(0.4, 0.0, 0);
        shotgun.add(topBarrel);

        const bottomBarrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        bottomBarrel.renderOrder = 12;
        bottomBarrel.position.set(0.4, -0.06, 0);
        shotgun.add(bottomBarrel);

        const pump = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.08, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x3a2b1e })
        );
        pump.position.set(0.26, -0.04, 0);
        shotgun.add(pump);

        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.24, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x2a1f16 })
        );
        grip.position.set(-0.16, -0.14, 0);
        grip.rotation.z = -0.55;
        shotgun.add(grip);

        const triggerGuard = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.06, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x141416 })
        );
        triggerGuard.position.set(-0.06, -0.1, 0);
        shotgun.add(triggerGuard);

        const muzzleFlash = this.createMuzzleFlash();
        muzzleFlash.position.set(0.54, -0.03, 0.02);
        muzzleFlash.visible = false;
        shotgun.userData.muzzleFlash = muzzleFlash;
        shotgun.add(muzzleFlash);

        shotgun.position.set(0.28, -0.06, 0.75);
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
            const facingRight = this.facingDirection >= 0;
            const rotation = this.hasAimInput
                ? (facingRight ? aimAngle : Math.atan2(aim.y, -aim.x))
                : 0;
            this.leftPistol.rotation.z = rotation;
            this.rightPistol.rotation.z = rotation;
        }
        if (this.gatlingGroup) {
            const aimAngle = Math.atan2(aim.y, aim.x);
            const facingRight = this.facingDirection >= 0;
            this.gatlingGroup.rotation.z = this.hasAimInput
                ? (facingRight ? aimAngle : Math.atan2(aim.y, -aim.x))
                : 0;
        }
        if (this.shotgunGroup) {
            const aimAngle = Math.atan2(aim.y, aim.x);
            const facingRight = this.facingDirection >= 0;
            this.shotgunGroup.rotation.z = this.hasAimInput
                ? (facingRight ? aimAngle : Math.atan2(aim.y, -aim.x))
                : 0;
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
            if (this.gatlingGroup) {
                this.gatlingGroup.visible = true;
                if (this.pistolGroup) {
                    this.pistolGroup.visible = false;
                }
                if (this.gatlingGroup.userData && this.gatlingGroup.userData.barrelCluster) {
                    const cluster = this.gatlingGroup.userData.barrelCluster;
                    cluster.rotation.y = 0;
                    cluster.rotation.z = 0;
                    cluster.rotation.x += deltaTime * 12;
                }
                if (this.gatlingGroup.userData && this.gatlingGroup.userData.heatGlow) {
                    const glow = this.gatlingGroup.userData.heatGlow;
                    const heat = 1 - (this.minigunTimer / this.minigunDuration);
                    glow.material.opacity = 0.2 + heat * 0.5;
                    glow.scale.set(1 + heat * 0.6, 1 + heat * 0.6, 1);
                }
            }
            this.minigunTimer = Math.max(0, this.minigunTimer - deltaTime);
            this.minigunShotTimer += deltaTime;
            while (this.minigunShotTimer >= this.minigunShotInterval) {
                this.fireMinigunBullet();
                this.minigunShotTimer -= this.minigunShotInterval;
            }
            if (this.minigunTimer === 0) {
                this.isMinigunActive = false;
                if (this.gatlingGroup) {
                    this.gatlingGroup.visible = false;
                    if (this.gatlingGroup.userData && this.gatlingGroup.userData.heatGlow) {
                        const glow = this.gatlingGroup.userData.heatGlow;
                        glow.material.opacity = 0.2;
                        glow.scale.set(1, 1, 1);
                    }
                }
                if (this.pistolGroup) {
                    this.pistolGroup.visible = true;
                }
            }
        }

        if (this.c4Instance && this.c4AwaitRelease && !input.isAbility3Pressed()) {
            this.c4AwaitRelease = false;
            this.c4CanDetonate = true;
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
        if (this.isShotgunAnimating) return false;
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
        if (this.isShotgunAnimating) return;
        this.isShotgunAnimating = true;
        this.pistolGroup.visible = false;
        this.shotgunGroup.visible = true;

        const muzzle = this.shotgunGroup.userData ? this.shotgunGroup.userData.muzzleFlash : null;
        const firingPos = this.shotgunGroup.position.clone();
        const windupPos = firingPos.clone().add(new THREE.Vector3(-0.08, -0.12, 0));
        const firingRot = this.shotgunGroup.rotation.z;
        const windupRot = firingRot - 1.1;
        this.shotgunGroup.position.copy(windupPos);
        this.shotgunGroup.rotation.z = windupRot;

        const duration = 500;
        const startTime = performance.now();
        const interval = setInterval(() => {
            const now = performance.now();
            const t = Math.min(1, (now - startTime) / duration);
            const eased = t * t * (3 - 2 * t);
            this.shotgunGroup.position.lerpVectors(windupPos, firingPos, eased);
            this.shotgunGroup.rotation.z = windupRot + (firingRot - windupRot) * eased;
            if (t >= 1) {
                clearInterval(interval);
                if (muzzle) {
                    muzzle.visible = true;
                    muzzle.scale.set(1.25, 1.25, 1);
                }
                this.shotgunGroup.position.x = firingPos.x - 0.16;
                this.fireScatterShotProjectile();
                setTimeout(() => {
                    this.shotgunGroup.position.copy(firingPos);
                    if (muzzle) {
                        muzzle.visible = false;
                        muzzle.scale.set(1, 1, 1);
                    }
                    this.shotgunGroup.visible = false;
                    this.pistolGroup.visible = true;
                    this.isShotgunAnimating = false;
                }, 120);
            }
        }, 16);
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
    }

    fireScatterShotProjectile() {
        const aim = this.getAimDirection();
        const direction = this.hasAimInput ? aim : { x: this.facingDirection, y: 0 };
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spread = Math.PI / 3;
        const pellets = 10;
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

        if (this.velocity) {
            const mag = Math.hypot(direction.x, direction.y) || 1;
            const recoilDir = {
                x: direction.x / mag,
                y: direction.y / mag
            };
            const recoilDistance = 1.2;
            this.position.x -= recoilDir.x * recoilDistance;
            this.position.y -= recoilDir.y * (recoilDistance * 0.4);
            this.velocity.x -= recoilDir.x * 6;
            this.velocity.y -= recoilDir.y * 2;
            this.isGrounded = false;
        }
    }

    handleC4Ability(ability) {
        if (this.c4Instance) {
            if (!this.c4CanDetonate) {
                return false;
            }
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
        c4Group.renderOrder = 12;
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.2, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x2c2f35 })
        );
        body.renderOrder = 12;
        c4Group.add(body);
        const strap = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.05, 0.12),
            new THREE.MeshBasicMaterial({ color: 0xd86a3a })
        );
        strap.renderOrder = 12;
        strap.position.set(0, 0.08, 0.01);
        c4Group.add(strap);
        const screen = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.06, 0.02),
            new THREE.MeshBasicMaterial({ color: 0x1fe1ff })
        );
        screen.renderOrder = 12;
        screen.position.set(0.08, 0.02, 0.06);
        c4Group.add(screen);
        const blinkLightMaterial = new THREE.MeshBasicMaterial({
            color: 0xff2b2b,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            depthWrite: false
        });
        const blinkLight = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), blinkLightMaterial);
        blinkLight.position.set(0.16, 0.06, 0.08);
        blinkLight.renderOrder = 12;
        c4Group.add(blinkLight);
        const payload = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.16, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xf4c842 })
        );
        payload.renderOrder = 12;
        payload.position.set(-0.04, -0.02, -0.02);
        c4Group.add(payload);
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
        const wireA = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), wireMaterial);
        wireA.renderOrder = 12;
        wireA.position.set(0.12, -0.02, 0.03);
        c4Group.add(wireA);
        const wireB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), wireMaterial);
        wireB.renderOrder = 12;
        wireB.position.set(0.06, -0.08, 0.03);
        c4Group.add(wireB);
        const wireC = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), wireMaterial);
        wireC.renderOrder = 12;
        wireC.position.set(-0.02, -0.02, 0.03);
        c4Group.add(wireC);
        const wireMaterialBlue = new THREE.MeshBasicMaterial({ color: 0x3b7bff });
        const wireD = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), wireMaterialBlue);
        wireD.renderOrder = 12;
        wireD.position.set(-0.02, 0.06, 0.03);
        c4Group.add(wireD);
        const chip = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.07, 0.02),
            new THREE.MeshBasicMaterial({ color: 0x1a1a1b })
        );
        chip.renderOrder = 12;
        chip.position.set(0.02, 0.06, 0.06);
        c4Group.add(chip);
        const chipPin = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.02, 0.01),
            new THREE.MeshBasicMaterial({ color: 0x777777 })
        );
        chipPin.renderOrder = 12;
        chipPin.position.set(0.02, 0.02, 0.065);
        c4Group.add(chipPin);
        c4Group.scale.set(1.4, 1.4, 1.4);
        const forward = this.facingDirection || 1;
        c4Group.position.set(this.position.x + forward * 0.8, this.position.y + 0.35, 0.6);
        this.mesh.parent.add(c4Group);

        const aim = this.getAimDirection();
        const direction = this.hasAimInput ? aim : { x: this.facingDirection, y: 0 };
        const speed = 4;
        const velocity = {
            x: direction.x * speed,
            y: direction.y * speed + 1.2
        };
        const gravity = -12;
        const level = this.level || { platforms: [] };

        this.c4Instance = { mesh: c4Group, velocity, blinkLight };
        this.c4CanDetonate = false;
        this.c4AwaitRelease = true;
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

        if (this.c4BlinkInterval) {
            clearInterval(this.c4BlinkInterval);
        }
        this.c4BlinkInterval = setInterval(() => {
            if (!this.c4Instance || !this.c4Instance.blinkLight) {
                clearInterval(this.c4BlinkInterval);
                this.c4BlinkInterval = null;
                return;
            }
            const light = this.c4Instance.blinkLight;
            light.visible = !light.visible;
        }, 300);

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
        if (this.c4BlinkInterval) {
            clearInterval(this.c4BlinkInterval);
            this.c4BlinkInterval = null;
        }
        if (this.c4DetonateTimeout) {
            clearTimeout(this.c4DetonateTimeout);
            this.c4DetonateTimeout = null;
        }
        if (this.c4Instance.mesh.parent) {
            this.c4Instance.mesh.parent.remove(this.c4Instance.mesh);
        }
        this.c4Instance = null;
        this.c4CanDetonate = false;
        this.c4AwaitRelease = false;

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
        const knockback = 12;
        const selfKnockback = 15;
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
                const pushX = (dx / dist) * knockback;
                const pushY = (dy / dist) * knockback;
                target.velocity.y += pushY;
                target.velocity.x += pushX;
                target.ignoreGravityUntil = Date.now() + 200;
                target.isGrounded = false;
            }
        }

        const selfDx = this.position.x - position.x;
        const selfDy = this.position.y - position.y;
        const selfDistSq = selfDx * selfDx + selfDy * selfDy;
        if (selfDistSq <= radiusSq) {
            const dist = Math.sqrt(selfDistSq) || 1;
            const pushX = (selfDx / dist) * selfKnockback;
            const pushY = (selfDy / dist) * selfKnockback;
            this.velocity.y += pushY;
            this.velocity.x += pushX;
            this.ignoreGravityUntil = Date.now() + 200;
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
        const baseAngle = Math.atan2(direction.y, direction.x);
        const variation = (Math.random() * 10 - 5) * (Math.PI / 180);
        const variedDir = {
            x: Math.cos(baseAngle + variation),
            y: Math.sin(baseAngle + variation)
        };
        const muzzlePos = this.getGatlingMuzzleWorldPosition();
        const perp = Math.hypot(variedDir.x, variedDir.y) > 0
            ? { x: -variedDir.y, y: variedDir.x }
            : { x: 0, y: 1 };
        const spreadOffset = (Math.random() - 0.5) * 0.08;
        this.spawnBullet({
            origin: {
                x: (muzzlePos ? muzzlePos.x : this.position.x + direction.x * 0.6) + perp.x * spreadOffset,
                y: (muzzlePos ? muzzlePos.y : this.position.y + 0.1 + direction.y * 0.6) + perp.y * spreadOffset
            },
            direction: variedDir,
            speed: 24,
            range: 18,
            damage: 5,
            color: 0x3b3b3b,
            size: { x: 0.28, y: 0.08, z: 0.08 },
            trail: true
        });
        this.playGatlingMuzzleFlash();
        this.spawnShellCasing();
    }

    playGatlingMuzzleFlash() {
        if (!this.gatlingGroup || !this.gatlingGroup.userData || !this.gatlingGroup.userData.muzzleFlash) {
            return;
        }
        const muzzle = this.gatlingGroup.userData.muzzleFlash;
        muzzle.visible = true;
        muzzle.scale.set(1.15, 1.15, 1);
        setTimeout(() => {
            muzzle.visible = false;
            muzzle.scale.set(1, 1, 1);
        }, 60);
    }

    getGatlingMuzzleWorldPosition() {
        if (!this.gatlingGroup || !this.gatlingGroup.userData || !this.gatlingGroup.userData.muzzleFlash) {
            return null;
        }
        this.gatlingGroup.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        this.gatlingGroup.userData.muzzleFlash.getWorldPosition(worldPos);
        return { x: worldPos.x, y: worldPos.y };
    }

    spawnShellCasing() {
        if (!this.gatlingGroup || !this.mesh || !this.mesh.parent) return;
        const casing = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xf1c25f })
        );
        casing.position.set(this.position.x - 0.08, this.position.y + 0.14, 0.6);
        casing.rotation.z = Math.random() * Math.PI;
        this.mesh.parent.add(casing);
        const velocity = {
            x: (Math.random() - 0.5) * 1.6 - (this.facingDirection || 1) * 0.3,
            y: 1.8 + Math.random() * 0.8
        };
        const interval = setInterval(() => {
            velocity.y -= 6 * 0.016;
            casing.position.x += velocity.x * 0.016;
            casing.position.y += velocity.y * 0.016;
            casing.rotation.z += 0.3;
        }, 16);
        setTimeout(() => {
            clearInterval(interval);
            if (casing.parent) casing.parent.remove(casing);
        }, 600);
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
