import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { checkAABBCollision } from '../utils/collision.js';
import { DEATH_Y } from '../core/constants.js';

const FLAG_DROP_Y_OFFSET = 0.6;
const FLAG_GROUND_SNAP_MAX = 2.0;
const FLAG_LEDGE_SNAP_MAX = 6.0;

export class CaptureTheFlagMode {
    constructor({ scene, level, onScoreboardVisible, onScoreChange } = {}) {
        this.scene = scene;
        this.level = level;
        this.onScoreboardVisible = onScoreboardVisible || (() => {});
        this.onScoreChange = onScoreChange || (() => {});
        this.scores = { blue: 0, red: 0 };
        this.state = null;
    }

    init() {
        const defaultSpawns = this.level?.flagSpawns || {
            blue: { x: -60, y: 3 },
            red: { x: 60, y: 3 }
        };
        const plateSpawns = this.getFlagPlateSpawns();
        const spawns = {
            blue: plateSpawns.blue || defaultSpawns.blue,
            red: plateSpawns.red || defaultSpawns.red
        };
        this.scores = { blue: 0, red: 0 };
        this.onScoreChange(this.scores);
        this.onScoreboardVisible(true);

        this.state = {
            returnDelay: 10,
            returnRadius: 1.3,
            baseRadius: 1.8,
            bases: {
                blue: { x: spawns.blue.x, y: spawns.blue.y },
                red: { x: spawns.red.x, y: spawns.red.y }
            },
            flags: {
                blue: this.createFlag('blue', spawns.blue, 0x2f6cb0),
                red: this.createFlag('red', spawns.red, 0xcc2f2f)
            }
        };
    }

    destroy() {
        if (this.state && this.state.flags) {
            Object.values(this.state.flags).forEach((flag) => {
                if (flag.mesh && flag.mesh.parent) {
                    flag.mesh.parent.remove(flag.mesh);
                }
                if (flag.ring && flag.ring.parent) {
                    flag.ring.parent.remove(flag.ring);
                }
                if (flag.chargeGroup && flag.chargeGroup.parent) {
                    flag.chargeGroup.parent.remove(flag.chargeGroup);
                }
            });
        }
        this.state = null;
        this.onScoreboardVisible(false);
    }

    getFlagPlateSpawns() {
        const plates = Array.isArray(this.level?.flagPlates) ? this.level.flagPlates : [];
        const spawns = {};
        plates.forEach((plate) => {
            if (!plate || !plate.team) return;
            const team = plate.team;
            if (team !== 'blue' && team !== 'red') return;
            if (spawns[team]) return;
            const bounds = plate.bounds || (plate.body && plate.body.getBounds ? plate.body.getBounds() : null);
            const centerX = bounds
                ? (bounds.left + bounds.right) / 2
                : (plate.body?.position?.x ?? plate.mesh?.position?.x ?? 0);
            const baseY = bounds
                ? bounds.top + 0.02
                : (plate.body?.position?.y ?? plate.mesh?.position?.y ?? 0.02);
            spawns[team] = { x: centerX, y: baseY };
        });
        return spawns;
    }

    update(deltaTime, activePlayers, activeInputs) {
        if (!this.state) return;
        const players = (activePlayers || []).map((activePlayer, index) => ({
            player: activePlayer,
            input: activeInputs ? activeInputs[index] : null
        })).filter((entry) => entry.player);

        const playerInputs = players.map(({ player: activePlayer, input: activeInput }) => {
            const dropPressed = activeInput?.isFlagDropPressed?.() || false;
            const dropJustPressed = dropPressed && !activePlayer.flagDropWasPressed;
            return { player: activePlayer, input: activeInput, dropPressed, dropJustPressed };
        });

        playerInputs.forEach(({ player: activePlayer, dropPressed, dropJustPressed }) => {
            activePlayer.flagCarryBlocksAbility3 = Boolean(activePlayer.isCarryingFlag);
            if (activePlayer.isCarryingFlag && dropJustPressed) {
                const carriedFlag = this.state.flags[activePlayer.flagCarryTeam];
                if (carriedFlag && carriedFlag.carrier === activePlayer) {
                    carriedFlag.lastCarrierPosition = { x: activePlayer.position.x, y: activePlayer.position.y };
                    this.startFlagLob(carriedFlag, activePlayer);
                }
            }
        });

        Object.values(this.state.flags).forEach((flag) => {
            if (flag.carrier) {
                if (flag.carrier.isAlive) {
                    flag.lastCarrierPosition = { x: flag.carrier.position.x, y: flag.carrier.position.y };
                    flag.mesh.position.set(flag.carrier.position.x, flag.carrier.position.y + 1.0, 0.45);
                } else {
                    if (flag.carrier.lastDeathWasPit) {
                        const fallbackPos = flag.lastCarrierPosition || flag.base;
                        const ledgePos = this.getNearestLedgePosition(fallbackPos);
                        flag.returnProgress = 0;
                        this.dropFlagAt(flag, ledgePos);
                    } else {
                        flag.returnProgress = 0;
                        this.dropFlag(flag);
                    }
                }
            } else if (flag.lob) {
                flag.lob.vy -= 20 * deltaTime;
                flag.lob.x += flag.lob.vx * deltaTime;
                flag.lob.y += flag.lob.vy * deltaTime;
                flag.mesh.position.set(flag.lob.x, flag.lob.y, 0.45);

                if (this.isFlagOutsideCastle(flag, flag.lob)) {
                    this.resetFlag(flag);
                    return;
                }

                const landingPos = this.getFlagLandingPosition({ x: flag.lob.x, y: flag.lob.y }, flag.lob.vy);
                if (landingPos) {
                    this.dropFlagAt(flag, landingPos, { snapToGround: false, allowLedgeSnap: false });
                    return;
                }

                if (flag.lob.y < DEATH_Y) {
                    this.dropFlagAt(flag, { x: flag.lob.x, y: flag.lob.y }, {
                        snapToGround: true,
                        allowLedgeSnap: true,
                        forceSnap: true
                    });
                    return;
                }
            } else if (flag.dropped) {
                if (flag.ring) {
                    flag.ring.position.set(flag.mesh.position.x, flag.mesh.position.y, 0.05);
                }
                if (flag.chargeGroup) {
                    flag.chargeGroup.position.set(flag.mesh.position.x, flag.mesh.position.y + 1.5, 0.5);
                }
                if (flag.pickupCooldown > 0) {
                    flag.pickupCooldown -= deltaTime;
                }
            }
        });

        playerInputs.forEach(({ player: activePlayer, dropPressed }) => {
            if (!activePlayer.isAlive) return;
            Object.values(this.state.flags).forEach((flag) => {
                if (flag.carrier) return;
                const flagBounds = this.getFlagBounds(flag);
                if (!checkAABBCollision(activePlayer.getBounds(), flagBounds)) return;

                if (flag.team === activePlayer.team) {
                    return;
                }
                if (!activePlayer.isCarryingFlag) {
                    if (flag.dropped && !dropPressed) {
                        return;
                    }
                    if (flag.pickupCooldown > 0) {
                        return;
                    }
                    this.setFlagCarrier(flag, activePlayer);
                }
            });
        });

        Object.values(this.state.flags).forEach((flag) => {
            if (!flag.dropped || flag.carrier || flag.lob) {
                if (flag.chargeGroup) {
                    flag.chargeGroup.visible = false;
                }
                return;
            }
            const radius = this.state.returnRadius;
            const ringBounds = {
                left: flag.mesh.position.x - radius,
                right: flag.mesh.position.x + radius,
                top: flag.mesh.position.y + radius,
                bottom: flag.mesh.position.y - radius
            };

            let friendlyInRing = false;
            let enemyInRing = false;

            players.forEach(({ player: activePlayer }) => {
                if (!activePlayer.isAlive) return;
                if (!checkAABBCollision(activePlayer.getBounds(), ringBounds)) return;
                if (activePlayer.team === flag.team) {
                    friendlyInRing = true;
                } else {
                    enemyInRing = true;
                }
            });

            const rate = 1 / this.state.returnDelay;
            if (friendlyInRing && !enemyInRing) {
                flag.returnProgress = Math.min(1, (flag.returnProgress || 0) + deltaTime * rate);
            } else if (!friendlyInRing && !enemyInRing) {
                const decay = rate * 0.6;
                flag.returnProgress = Math.max(0, (flag.returnProgress || 0) - deltaTime * decay);
            }

            if (flag.chargeGroup && flag.chargeFill) {
                const progress = Math.max(0, Math.min(1, flag.returnProgress || 0));
                flag.chargeGroup.visible = true;
                flag.chargeFill.visible = progress > 0.01;
                flag.chargeFill.scale.x = progress;
                flag.chargeFill.position.x = (-flag.chargeWidth / 2) + (flag.chargeWidth * progress) / 2;
            }

            if (flag.returnProgress >= 1) {
                this.resetFlag(flag);
            }
        });

        playerInputs.forEach(({ player: activePlayer }) => {
            if (!activePlayer.isCarryingFlag || !activePlayer.isAlive) return;
            const enemyTeam = activePlayer.flagCarryTeam;
            if (!enemyTeam || enemyTeam === activePlayer.team) return;
            const ownFlag = this.state.flags[activePlayer.team];
            if (!ownFlag || !ownFlag.isAtBase) return;
            if (!this.isPlayerInBase(activePlayer, activePlayer.team)) return;

            this.scores[activePlayer.team] += 1;
            this.onScoreChange(this.scores);
            this.resetFlag(this.state.flags[enemyTeam]);
            activePlayer.isCarryingFlag = false;
            activePlayer.flagCarryTeam = null;
        });

        playerInputs.forEach(({ player: activePlayer, dropPressed }) => {
            activePlayer.flagDropWasPressed = dropPressed;
        });
    }

    createFlag(team, base, color) {
        const flagGroup = new THREE.Group();
        const pole = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 1.1, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x4a3a2a })
        );
        pole.position.y = 0.55;
        flagGroup.add(pole);

        const cloth = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.35, 0.05),
            new THREE.MeshBasicMaterial({ color })
        );
        cloth.position.set(0.32, 0.75, 0);
        flagGroup.add(cloth);

        flagGroup.position.set(base.x, base.y, 0.45);
        this.scene.add(flagGroup);

        const ringGeometry = new THREE.RingGeometry(0.9, 1.35, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(base.x, base.y, 0.05);
        ring.visible = false;
        this.scene.add(ring);

        const chargeGroup = new THREE.Group();
        const chargeWidth = 1.4;
        const chargeHeight = 0.16;
        const chargeBack = new THREE.Mesh(
            new THREE.PlaneGeometry(chargeWidth, chargeHeight),
            new THREE.MeshBasicMaterial({ color: 0x0c0c0c, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        const chargeFill = new THREE.Mesh(
            new THREE.PlaneGeometry(chargeWidth, chargeHeight),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
        );
        chargeGroup.add(chargeBack);
        chargeGroup.add(chargeFill);
        chargeGroup.position.set(base.x, base.y + 1.5, 0.5);
        chargeGroup.visible = false;
        chargeFill.scale.x = 0;
        chargeFill.visible = false;
        this.scene.add(chargeGroup);

        return {
            team,
            base,
            mesh: flagGroup,
            ring,
            chargeGroup,
            chargeFill,
            chargeWidth,
            carrier: null,
            isAtBase: true,
            dropped: false,
            lob: null,
            returnProgress: 0,
            returnTimer: 0,
            pickupCooldown: 0,
            lastCarrierPosition: { x: base.x, y: base.y }
        };
    }

    getFlagBounds(flag) {
        const x = flag.mesh.position.x;
        const y = flag.mesh.position.y;
        return {
            left: x - 0.4,
            right: x + 0.4,
            top: y + 0.9,
            bottom: y - 0.2
        };
    }

    setFlagCarrier(flag, carrier) {
        flag.carrier = carrier;
        flag.isAtBase = false;
        flag.dropped = false;
        flag.lob = null;
        flag.returnProgress = 0;
        flag.returnTimer = 0;
        flag.pickupCooldown = 0;
        if (flag.ring) {
            flag.ring.visible = false;
        }
        if (flag.chargeGroup) {
            flag.chargeGroup.visible = false;
        }
        flag.lastCarrierPosition = { x: carrier.position.x, y: carrier.position.y };
        carrier.isCarryingFlag = true;
        carrier.flagCarryTeam = flag.team;
    }

    clearFlagCarrier(flag, carrier) {
        if (carrier) {
            carrier.isCarryingFlag = false;
            carrier.flagCarryTeam = null;
        }
        flag.carrier = null;
    }

    resetFlag(flag) {
        this.clearFlagCarrier(flag, flag.carrier);
        flag.isAtBase = true;
        flag.dropped = false;
        flag.lob = null;
        flag.returnProgress = 0;
        flag.returnTimer = 0;
        flag.pickupCooldown = 0;
        flag.mesh.position.set(flag.base.x, flag.base.y, 0.45);
        if (flag.ring) {
            flag.ring.visible = false;
            flag.ring.position.set(flag.base.x, flag.base.y, 0.05);
        }
        if (flag.chargeGroup) {
            flag.chargeGroup.visible = false;
            flag.chargeGroup.position.set(flag.base.x, flag.base.y + 1.5, 0.5);
        }
        flag.lastCarrierPosition = { x: flag.base.x, y: flag.base.y };
    }

    getNearestLedgePosition(position, { maxDistance = FLAG_LEDGE_SNAP_MAX } = {}) {
        if (!this.level || !this.level.platforms || !this.level.platforms.length || !position) {
            return position;
        }

        let best = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        this.level.platforms.forEach((platform) => {
            if (!platform || !platform.bounds || platform.isLadder || !platform.mesh) {
                return;
            }
            const bounds = platform.bounds;
            const width = bounds.right - bounds.left;
            if (!Number.isFinite(width) || width <= 0) {
                return;
            }
            const inset = Math.min(0.4, width * 0.25);
            const clampedX = Math.min(bounds.right - inset, Math.max(bounds.left + inset, position.x));
            const candidate = {
                x: clampedX,
                y: bounds.top + FLAG_DROP_Y_OFFSET
            };
            const dx = candidate.x - position.x;
            const dy = candidate.y - position.y;
            const dist = dx * dx + dy * dy;
            if (Number.isFinite(maxDistance) && dist > maxDistance * maxDistance) {
                return;
            }
            if (dist < bestDistance) {
                bestDistance = dist;
                best = candidate;
            }
        });

        return best || position;
    }

    getCastleWallBounds(baseX) {
        if (!this.level || !this.level.platforms || !this.level.platforms.length || !Number.isFinite(baseX)) {
            return null;
        }
        let closest = null;
        let closestDist = Number.POSITIVE_INFINITY;
        this.level.platforms.forEach((platform) => {
            if (!platform || platform.type !== 'wall' || !platform.bounds || !platform.mesh) {
                return;
            }
            const centerX = (platform.bounds.left + platform.bounds.right) / 2;
            const dist = Math.abs(centerX - baseX);
            if (dist < closestDist) {
                closestDist = dist;
                closest = platform.bounds;
            }
        });
        return closest;
    }

    clampFlagOutsideCastle(flag, position) {
        if (!flag || !position) return position;
        const baseX = flag.base?.x;
        if (!Number.isFinite(baseX)) return position;
        const bounds = this.getCastleWallBounds(baseX);
        if (!bounds) return position;
        const isLeftCastle = baseX < 0;
        const outside = isLeftCastle ? position.x < bounds.left : position.x > bounds.right;
        if (!outside) return position;
        const inset = 0.6;
        const innerEdgeX = isLeftCastle ? bounds.right - inset : bounds.left + inset;
        return {
            x: innerEdgeX,
            y: bounds.top + FLAG_DROP_Y_OFFSET
        };
    }

    isFlagOutsideCastle(flag, position) {
        if (!flag || !position) return false;
        const baseX = flag.base?.x;
        if (!Number.isFinite(baseX)) return false;
        const bounds = this.getCastleWallBounds(baseX);
        if (!bounds) return false;
        const isLeftCastle = baseX < 0;
        return isLeftCastle ? position.x < bounds.left : position.x > bounds.right;
    }

    getGroundDropPosition(position, { maxDrop = FLAG_GROUND_SNAP_MAX } = {}) {
        if (!this.level || !this.level.platforms || !this.level.platforms.length || !position) {
            return null;
        }

        const threshold = position.y + 0.5;
        const minTop = Number.isFinite(maxDrop) ? position.y - maxDrop : -Infinity;
        let best = null;
        let bestTop = -Infinity;

        this.level.platforms.forEach((platform) => {
            if (!platform || !platform.bounds || platform.isLadder || !platform.mesh) {
                return;
            }
            const bounds = platform.bounds;
            if (bounds.top > threshold) {
                return;
            }
            if (bounds.top < minTop) {
                return;
            }
            const width = bounds.right - bounds.left;
            if (!Number.isFinite(width) || width <= 0) {
                return;
            }
            const inset = Math.min(0.4, width * 0.25);
            if (position.x < bounds.left + inset || position.x > bounds.right - inset) {
                return;
            }
            if (bounds.top > bestTop) {
                bestTop = bounds.top;
                best = {
                    x: position.x,
                    y: bounds.top + FLAG_DROP_Y_OFFSET
                };
            }
        });

        return best;
    }

    getFlagLandingPosition(position, velocityY) {
        if (!this.level || !this.level.platforms || !this.level.platforms.length || !position) {
            return null;
        }

        if (velocityY > 0.1) {
            return null;
        }

        const flagBounds = {
            left: position.x - 0.3,
            right: position.x + 0.3,
            top: position.y + 0.45,
            bottom: position.y - 0.35
        };

        let landingPlatform = null;
        let bestTop = -Infinity;
        this.level.platforms.forEach((platform) => {
            if (!platform || !platform.bounds || platform.isLadder || !platform.mesh) {
                return;
            }
            if (checkAABBCollision(flagBounds, platform.bounds)) {
                if (platform.bounds.top > bestTop) {
                    bestTop = platform.bounds.top;
                    landingPlatform = platform;
                }
            }
        });

        if (!landingPlatform) {
            return null;
        }

        const bounds = landingPlatform.bounds;
        const width = bounds.right - bounds.left;
        const inset = Math.min(0.4, width * 0.25);
        const clampedX = Math.min(bounds.right - inset, Math.max(bounds.left + inset, position.x));
        return {
            x: clampedX,
            y: bounds.top + FLAG_DROP_Y_OFFSET
        };
    }

    dropFlagAt(flag, dropPos, options = {}) {
        const resolvedPos = dropPos || flag.lastCarrierPosition || flag.base;
        const hasDropPos = dropPos !== undefined && dropPos !== null;
        const forceSnap = options.forceSnap === true;
        const snapToGround = options.snapToGround !== false && (!hasDropPos || forceSnap);
        const allowLedgeSnap = options.allowLedgeSnap !== false && (!hasDropPos || forceSnap);
        const groundedPos = snapToGround
            ? this.getGroundDropPosition(resolvedPos, { maxDrop: options.maxDrop ?? FLAG_GROUND_SNAP_MAX })
            : null;
        const ledgePos = allowLedgeSnap
            ? this.getNearestLedgePosition(resolvedPos, { maxDistance: options.maxLedgeSnap ?? FLAG_LEDGE_SNAP_MAX })
            : null;
        const initialPos = groundedPos || ledgePos || resolvedPos;
        const finalPos = this.clampFlagOutsideCastle(flag, initialPos);
        flag.lob = null;
        this.clearFlagCarrier(flag, flag.carrier);
        flag.isAtBase = false;
        flag.dropped = true;
        flag.returnTimer = this.state.returnDelay;
        flag.pickupCooldown = 0.25;
        flag.mesh.position.set(finalPos.x, finalPos.y, 0.45);
        if (flag.ring) {
            flag.ring.visible = true;
            flag.ring.position.set(finalPos.x, finalPos.y, 0.05);
        }
        if (flag.chargeGroup) {
            flag.chargeGroup.visible = true;
            flag.chargeGroup.position.set(finalPos.x, finalPos.y + 1.5, 0.5);
        }
        flag.lastCarrierPosition = { x: finalPos.x, y: finalPos.y };
    }

    dropFlag(flag) {
        this.dropFlagAt(flag, flag.lastCarrierPosition || flag.base);
    }

    startFlagLob(flag, carrier) {
        if (!flag || !carrier) return;
        const aim = typeof carrier.getAimDirection === 'function' ? carrier.getAimDirection() : null;
        const useAim = carrier.hasAimInput && aim;
        const direction = useAim ? aim : { x: carrier.facingDirection || 1, y: 0 };
        const length = Math.hypot(direction.x, direction.y);
        const dir = length > 0.001 ? { x: direction.x / length, y: direction.y / length } : { x: 1, y: 0 };
        const origin = {
            x: carrier.position.x + dir.x * 0.6,
            y: carrier.position.y + 0.8
        };

        const speed = 7.5;
        let velocityY = useAim ? dir.y * speed : 5.4;
        if (!Number.isFinite(velocityY) || velocityY < 2.5) {
            velocityY = 4.8;
        }

        flag.lob = {
            x: origin.x,
            y: origin.y,
            vx: dir.x * speed,
            vy: velocityY
        };
        flag.returnProgress = 0;

        this.clearFlagCarrier(flag, carrier);
        flag.isAtBase = false;
        flag.dropped = true;
        flag.returnTimer = this.state.returnDelay;
        flag.pickupCooldown = 0.25;
        flag.lastCarrierPosition = { x: origin.x, y: origin.y };
        flag.mesh.position.set(origin.x, origin.y, 0.45);
        if (flag.ring) {
            flag.ring.visible = false;
        }
        if (flag.chargeGroup) {
            flag.chargeGroup.visible = false;
        }
    }

    isPlayerInBase(player, team) {
        if (!this.state) return false;
        const base = this.state.bases[team];
        if (!base) return false;
        const radius = this.state.baseRadius;
        const baseBounds = {
            left: base.x - radius,
            right: base.x + radius,
            top: base.y + radius,
            bottom: base.y - radius
        };
        return checkAABBCollision(player.getBounds(), baseBounds);
    }
}
