import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { checkAABBCollision, resolveCollisionY, resolveCollisionX, resolvePolygonCollision } from '../utils/collision.js';
import { SolidBody } from './SolidBody.js';
import { SolidPlatform } from './SolidPlatform.js';
import { OneWayPlatform } from './OneWayPlatform.js';
import { Ladder } from './Ladder.js';
import { MapBuilder } from './MapBuilder.js';
import { MaskMapBuilder } from './MaskMapBuilder.js';
import { gameTestMap } from './maps/gameTestMap.js';
import { hilltowerMaskConfig } from './maps/hilltowerMap.js';
import { arenaMaskConfig } from './maps/arenaMap.js';
import { ctfBtbMaskConfig } from './maps/ctfBtbMap.js';
import { applyVisibilityLayer, normalizeVisibilityLayer, VISIBILITY_LAYERS } from '../utils/visibility.js';

const FOREGROUND_PALETTE = {
    groundBody: 0x8f563b,
    groundTop: 0x2fa65c,
    groundSide: 0x6d3f2a,
    grassBody: 0x7e4b32,
    grassTop: 0x3bbb6b,
    grassSide: 0x5f3a28,
    stoneBody: 0x808080,
    stoneTop: 0x696969,
    stoneSide: 0x505050,
    cloudBody: 0xe8f6ff,
    cloudTop: 0xf6fbff,
    cloudSide: 0xcddfeb,
    ropeBody: 0x5b3d24,
    ropeTop: 0x7a5431,
    ropeSide: 0x3a2616,
    ropePlank: 0x6a4b2b,
    ropeLine: 0x2d1c12,
    launcherBody: 0x4a3a2a,
    launcherTop: 0x8c5a30,
    launcherSide: 0x2b1d12,
    grassTuft: 0x2f8f4e,
    dirtSpeck: 0x6f3b29,
    stoneLine: 0x505050,
    wallBlock: 0x808080,
    wallMortar: 0x404040,
    wallSpot: 0x909090,
    ladderRail: 0x8b4513,
    ladderRung: 0x654321,
    door: 0x5b3a29,
    doorFrame: 0x2f1b12,
    vine: 0x2f4f2f,
    leaf: 0x228b22,
    flagPole: 0x8b5a2b
};

/**
 * Level - Manages platforms and level geometry
 * @class Level
 */
export class Level {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.platforms = [];
        this.enemies = [];
        this.movingPlatforms = [];
        this.flags = [];
        this.windZones = [];
        this.windStreaks = [];
        this.bodies = [];
        this.travellers = [];
        this.mapKey = null;
        this.cameraConfig = null;
        this.deathY = null;
        this.defaultVisibilityLayer = VISIBILITY_LAYERS.foreground;
        this.verticalMovingSpeedScale = 0.7;
        this.verticalMovingSpeedCap = 0.45;
    }

    /**
     * Add a platform to the level
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Platform width
     * @param {number} height - Platform height
     * @param {string} type - Platform type ('ground', 'grass', 'stone')
     * @returns {Object} Platform object
     */
    addPlatform(x, y, width, height, type = 'grass', options = {}) {
        const platformGroup = new THREE.Group();
        const visibilityLayer = normalizeVisibilityLayer(
            options.visibilityLayer != null ? options.visibilityLayer : this.defaultVisibilityLayer
        );
        const collisionShape = options.collisionShape || null;

        // Main platform body
        const bodyGeometry = new THREE.BoxGeometry(width, height, 0.8);
        let bodyColor, topColor, sideColor;

        switch(type) {
            case 'ground':
                bodyColor = FOREGROUND_PALETTE.groundBody;
                topColor = FOREGROUND_PALETTE.groundTop;
                sideColor = FOREGROUND_PALETTE.groundSide;
                break;
            case 'stone':
                bodyColor = FOREGROUND_PALETTE.stoneBody;
                topColor = FOREGROUND_PALETTE.stoneTop;
                sideColor = FOREGROUND_PALETTE.stoneSide;
                break;
            case 'cloud':
                bodyColor = FOREGROUND_PALETTE.cloudBody;
                topColor = FOREGROUND_PALETTE.cloudTop;
                sideColor = FOREGROUND_PALETTE.cloudSide;
                break;
            case 'rope':
                bodyColor = FOREGROUND_PALETTE.ropeBody;
                topColor = FOREGROUND_PALETTE.ropeTop;
                sideColor = FOREGROUND_PALETTE.ropeSide;
                break;
            case 'launcher':
                bodyColor = FOREGROUND_PALETTE.launcherBody;
                topColor = FOREGROUND_PALETTE.launcherTop;
                sideColor = FOREGROUND_PALETTE.launcherSide;
                break;
            case 'grass':
            default:
                bodyColor = FOREGROUND_PALETTE.grassBody;
                topColor = FOREGROUND_PALETTE.grassTop;
                sideColor = FOREGROUND_PALETTE.grassSide;
        }

        const bodyMaterial = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        platformGroup.add(body);

        // Top layer (grass/stone surface)
        const topGeometry = new THREE.BoxGeometry(width, height * 0.18, 0.85);
        const topMaterial = new THREE.MeshBasicMaterial({ color: topColor });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = height * 0.425;
        platformGroup.add(top);

        // Side highlights for depth
        const sideGeometry = new THREE.BoxGeometry(width * 0.98, height * 0.12, 0.75);
        const sideMaterial = new THREE.MeshBasicMaterial({ color: sideColor });
        const side = new THREE.Mesh(sideGeometry, sideMaterial);
        side.position.y = -height * 0.4;
        platformGroup.add(side);

        if (type === 'cloud') {
            const puffCount = Math.max(4, Math.round(width / 2.2));
            const puffRadius = Math.max(0.25, height * 0.55);
            const puffGeometry = new THREE.CircleGeometry(puffRadius, 10);
            const puffMaterial = new THREE.MeshBasicMaterial({
                color: topColor,
                transparent: true,
                opacity: 0.9
            });
            for (let i = 0; i < puffCount; i++) {
                const t = puffCount === 1 ? 0.5 : i / (puffCount - 1);
                const puff = new THREE.Mesh(puffGeometry, puffMaterial);
                puff.position.set(
                    -width / 2 + t * width,
                    height * 0.2 + (i % 2 === 0 ? 0.05 : -0.05),
                    0.3
                );
                platformGroup.add(puff);
            }

            const edgePuffGeometry = new THREE.CircleGeometry(puffRadius * 1.15, 10);
            const edgePuffMaterial = new THREE.MeshBasicMaterial({
                color: sideColor,
                transparent: true,
                opacity: 0.7
            });
            const leftPuff = new THREE.Mesh(edgePuffGeometry, edgePuffMaterial);
            leftPuff.position.set(-width / 2 + puffRadius * 0.6, -height * 0.05, 0.2);
            platformGroup.add(leftPuff);
            const rightPuff = new THREE.Mesh(edgePuffGeometry, edgePuffMaterial);
            rightPuff.position.set(width / 2 - puffRadius * 0.6, -height * 0.05, 0.2);
            platformGroup.add(rightPuff);
        }

        if (type === 'rope') {
            const plankMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.ropePlank });
            const plankCount = Math.max(4, Math.round(width / 1.6));
            const plankSpacing = width / (plankCount + 1);
            const plankWidth = Math.min(1.2, plankSpacing * 0.8);
            const plankHeight = Math.max(0.12, height * 0.35);
            const plankDepth = 0.35;
            for (let i = 0; i < plankCount; i++) {
                const plank = new THREE.Mesh(new THREE.BoxGeometry(plankWidth, plankHeight, plankDepth), plankMaterial);
                plank.position.set(-width / 2 + plankSpacing * (i + 1), height / 2 + plankHeight * 0.25, 0.08);
                platformGroup.add(plank);
            }

            const ropeMaterial = new THREE.MeshBasicMaterial({
                color: FOREGROUND_PALETTE.ropeLine,
                transparent: true,
                opacity: 0.65
            });
            const ropeThickness = Math.max(0.05, height * 0.12);
            const rope = new THREE.Mesh(new THREE.BoxGeometry(width, ropeThickness, 0.1), ropeMaterial);
            rope.position.set(0, height / 2 + plankHeight * 0.8, 0.2);
            platformGroup.add(rope);
        }

        // Add detail patterns for grass platforms
        if (type === 'grass' || type === 'ground') {
            // Add grass tufts on top
            const numTufts = Math.floor(width * 2);
            for (let i = 0; i < numTufts; i++) {
                const tuftGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.05);
                const tuftMaterial = new THREE.MeshBasicMaterial({
                    color: FOREGROUND_PALETTE.grassTuft,
                    transparent: true,
                    opacity: 0.7
                });
                const tuft = new THREE.Mesh(tuftGeometry, tuftMaterial);
                tuft.position.set(
                    -width/2 + (i * width/numTufts) + Math.random() * 0.2,
                    height * 0.5 + 0.1,
                    Math.random() * 0.2 - 0.1
                );
                platformGroup.add(tuft);
            }

            // Add pixel-like dirt specks for texture
            const speckCount = Math.floor(width * 3);
            for (let i = 0; i < speckCount; i++) {
                const speckGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.02);
                const speckMaterial = new THREE.MeshBasicMaterial({
                    color: FOREGROUND_PALETTE.dirtSpeck,
                    transparent: true,
                    opacity: 0.6
                });
                const speck = new THREE.Mesh(speckGeometry, speckMaterial);
                speck.position.set(
                    -width/2 + Math.random() * width,
                    -height/2 + 0.1 + Math.random() * (height - 0.4),
                    0.41
                );
                platformGroup.add(speck);
            }
        }

        // Add texture detail lines for stone platforms
        if (type === 'stone') {
            const numLines = Math.floor(width);
            for (let i = 0; i < numLines; i++) {
            const lineGeometry = new THREE.BoxGeometry(width * 0.9, 0.03, 0.82);
            const lineMaterial = new THREE.MeshBasicMaterial({
                color: FOREGROUND_PALETTE.stoneLine,
                transparent: true,
                opacity: 0.3
            });
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.position.y = -height/2 + (i * height/numLines);
                platformGroup.add(line);
            }
        }

        platformGroup.position.set(x, y, 0);
        applyVisibilityLayer(platformGroup, visibilityLayer);
        this.group.add(platformGroup);

        const platform = {
            mesh: platformGroup,
            bounds: {
                left: x - width / 2,
                right: x + width / 2,
                top: y + height / 2,
                bottom: y - height / 2
            },
            type: type,
            baseY: y,
            baseScale: { x: 1, y: 1, z: 1 },
            springTimer: 0,
            springDuration: type === 'launcher' ? 0.45 : 0.25,
            visibilityLayer
        };
        if (collisionShape && collisionShape.bounds) {
            platform.bounds = { ...collisionShape.bounds };
        }

        platform.body = new SolidPlatform({
            bounds: platform.bounds,
            mapKey: this.mapKey
        });
        if (collisionShape) {
            platform.body.setCollisionShape(collisionShape);
        }
        platform.body.setVisibilityLayer(visibilityLayer);
        this.bodies.push(platform.body);
        this.platforms.push(platform);
        return platform;
    }

    addOneWayPlatform(x, y, width, height, type = 'grass', options = {}) {
        const platform = this.addPlatform(x, y, width, height, type, options);
        if (platform.body) {
            this.bodies = this.bodies.filter((body) => body !== platform.body);
        }
        platform.body = new OneWayPlatform({
            bounds: platform.bounds,
            mapKey: this.mapKey
        });
        platform.body.setVisibilityLayer(platform.visibilityLayer);
        this.bodies.push(platform.body);
        platform.isOneWay = true;
        return platform;
    }

    addLadderZone(x, y, width, height, options = {}) {
        const ladderGroup = new THREE.Group();
        const visibilityLayer = normalizeVisibilityLayer(
            options.visibilityLayer != null ? options.visibilityLayer : this.defaultVisibilityLayer
        );
        const railGeometry = new THREE.BoxGeometry(0.08, height, 0.12);
        const railMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.ladderRail });
        const leftRail = new THREE.Mesh(railGeometry, railMaterial);
        leftRail.position.set(-width / 2 + 0.08, 0, 0.2);
        ladderGroup.add(leftRail);
        const rightRail = new THREE.Mesh(railGeometry, railMaterial);
        rightRail.position.set(width / 2 - 0.08, 0, 0.2);
        ladderGroup.add(rightRail);

        const rungCount = Math.max(2, Math.floor(height / 0.6));
        const rungGeometry = new THREE.BoxGeometry(width * 0.9, 0.08, 0.1);
        const rungMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.ladderRung });
        for (let i = 0; i < rungCount; i++) {
            const rung = new THREE.Mesh(rungGeometry, rungMaterial);
            const t = rungCount === 1 ? 0.5 : i / (rungCount - 1);
            rung.position.set(0, -height / 2 + t * height, 0.2);
            ladderGroup.add(rung);
        }

        ladderGroup.position.set(x, y, 0);
        applyVisibilityLayer(ladderGroup, visibilityLayer);
        this.group.add(ladderGroup);

        const ladderPlatform = {
            mesh: ladderGroup,
            bounds: {
                left: x - width / 2,
                right: x + width / 2,
                top: y + height / 2,
                bottom: y - height / 2
            },
            type: 'ladder',
            visibilityLayer,
            isLadder: true
        };

        ladderPlatform.body = new Ladder({
            bounds: ladderPlatform.bounds,
            mapKey: this.mapKey
        });
        ladderPlatform.body.setVisibilityLayer(visibilityLayer);
        this.bodies.push(ladderPlatform.body);
        this.platforms.push(ladderPlatform);
        return ladderPlatform;
    }

    /**
     * Add a moving platform to the level
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Platform width
     * @param {number} height - Platform height
     * @param {string} type - Platform type ('grass', 'stone')
     * @param {Object} motion - Motion config
     */
    addMovingPlatform(x, y, width, height, type = 'stone', motion = {}) {
        const platform = this.addPlatform(x, y, width, height, type);
        platform.type = 'moving';
        platform.baseType = type;
        platform.isCloudPlatform = type === 'cloud';
        if (platform.body) {
            platform.body.setMovable(true);
        }

        this.movingPlatforms.push({
            platform,
            baseX: x,
            baseY: y,
            rangeX: motion.rangeX != null ? motion.rangeX : 0,
            rangeY: motion.rangeY != null ? motion.rangeY : 0,
            speed: motion.speed != null ? motion.speed : 1.2,
            phase: motion.phase != null ? motion.phase : Math.random() * Math.PI * 2,
            time: 0
        });

        return platform;
    }

    addBreakablePlatform(x, y, width, height, type = 'rope', options = {}) {
        const platform = this.addPlatform(x, y, width, height, type);
        platform.breakable = true;
        platform.breakState = 'idle';
        platform.breakDelay = options.breakDelay != null ? options.breakDelay : 0.25;
        platform.respawnDelay = options.respawnDelay != null ? options.respawnDelay : 5;
        platform.breakTimer = 0;
        platform.respawnTimer = 0;
        platform.disabled = false;
        platform.shakeTime = 0;
        return platform;
    }

    /**
     * Check and resolve collisions with platforms
     * @param {Player} player - Player instance
     */
    checkCollisions(player) {
        if (!player || !player.isAlive) {
            return;
        }

        const playerBounds = player.getBounds();
        const playerVelocity = player.velocity;
        const hitboxScaleY = player.hitboxScale && Number.isFinite(player.hitboxScale.y) ? player.hitboxScale.y : 1;
        const halfHeight = 0.5 * hitboxScaleY;
        const prevPositionY = player.prevPosition ? player.prevPosition.y : undefined;
        const prevY = Number.isFinite(prevPositionY) ? prevPositionY : player.position.y;
        const prevBottom = prevY - halfHeight;
        const now = performance.now();
        if (player.dropThroughUntil && now >= player.dropThroughUntil) {
            player.dropThroughUntil = 0;
        }
        const dropThroughActive = Boolean(player.dropThroughUntil && now < player.dropThroughUntil);
        let onLadder = false;
        let onLauncher = null;
        let onWall = false;
        let onOneWayPlatform = false;
        const oneWayDropHoldMs = 60;
        const updateFallTracking = () => {
            if (!Number.isFinite(player.fallPeakY)) {
                player.fallPeakY = player.position.y;
            }
            if (!Number.isFinite(player.fallDistance)) {
                player.fallDistance = 0;
            }
            if (player.fallDamageReset) {
                player.fallPeakY = player.position.y;
                player.fallDistance = 0;
                player.fallDamageReset = false;
                return;
            }
            if (player.wasGrounded) {
                player.fallPeakY = player.position.y;
                player.fallDistance = 0;
                return;
            }
            if (player.position.y > player.fallPeakY) {
                player.fallPeakY = player.position.y;
            }
            const drop = player.fallPeakY - player.position.y;
            if (drop > player.fallDistance) {
                player.fallDistance = drop;
            }
        };
        const triggerLandingSound = (impactSpeed) => {
            if (player.didLandThisFrame) return;
            if (player.landSoundCooldown > 0) return;
            if (player.landSoundReady === false) return;
            if (impactSpeed < 0.2) return;
            if (typeof player.playLandSound === 'function') {
                player.didLandThisFrame = true;
                player.landSoundReady = false;
                const fallDistance = Number.isFinite(player.fallDistance) ? player.fallDistance : 0;
                player.playLandSound(impactSpeed, fallDistance);
            }
        };
        const applyFallDamage = (impactSpeed = 0, platform = null) => {
            if (typeof player.takeDamage !== 'function') return;
            if (player.fallDamageGraceTimer > 0 || player.isHovering) {
                return;
            }
            if (platform && platform.type === 'launcher') {
                return;
            }
            const fallDistance = Number.isFinite(player.fallDistance) ? player.fallDistance : 0;
            const fallDamageThreshold = 17;
            const impactThreshold = 8;
            if (impactSpeed < impactThreshold) {
                return;
            }
            if (fallDistance >= fallDamageThreshold) {
                player.takeDamage(40);
            } else if (fallDistance >= fallDamageThreshold * (2 / 3)) {
                player.takeDamage(10);
            } else if (fallDistance >= fallDamageThreshold * 0.5) {
                player.takeDamage(5);
            }
        };
        const tryPreLandingSound = (platform) => {
            if (!player.landSoundReady || player.didLandThisFrame || player.landSoundCooldown > 0) return;
            if (playerVelocity.y >= -0.1) return;
            if (platform.isLadder) return;
            const horizontalOverlap = playerBounds.right > platform.bounds.left &&
                playerBounds.left < platform.bounds.right;
            if (!horizontalOverlap) return;
            const distanceToTop = playerBounds.bottom - platform.bounds.top;
            if (distanceToTop <= 0) return;
            const speed = Math.abs(playerVelocity.y);
            const timeToImpact = distanceToTop / Math.max(0.01, speed);
            if (timeToImpact <= 0.04) {
                triggerLandingSound(speed);
            }
        };

        updateFallTracking();

        for (const platform of this.platforms) {
            if (platform.disabled) {
                continue;
            }
            tryPreLandingSound(platform);
            if (player.didLandThisFrame) {
                break;
            }
        }

        // First pass: Check wall collisions (higher priority)
        for (const platform of this.platforms) {
            if (platform.disabled) {
                continue;
            }
            if (platform.type === 'wall' && checkAABBCollision(playerBounds, platform.bounds)) {
                onWall = true;
                // Handle wall collision normally
                const overlapLeft = playerBounds.right - platform.bounds.left;
                const overlapRight = platform.bounds.right - playerBounds.left;
                const overlapTop = playerBounds.top - platform.bounds.bottom;
                const overlapBottom = platform.bounds.top - playerBounds.bottom;

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapBottom && playerVelocity.y <= 0) {
                    const impactSpeed = Math.abs(playerVelocity.y);
                    resolveCollisionY(player.position, platform.bounds, playerVelocity);
                    player.velocity.y = 0;
                    player.isGrounded = true;
                    player.mesh.position.y = player.position.y;
                    triggerLandingSound(impactSpeed);
                    applyFallDamage(impactSpeed, platform);
                } else if (minOverlap === overlapTop && playerVelocity.y > 0) {
                    resolveCollisionY(player.position, platform.bounds, playerVelocity);
                    player.velocity.y = 0;
                    player.mesh.position.y = player.position.y;
                } else if ((minOverlap === overlapLeft && playerVelocity.x > 0) ||
                           (minOverlap === overlapRight && playerVelocity.x < 0)) {
                    // Only resolve horizontal collision if moving TOWARD the wall
                    resolveCollisionX(player.position, platform.bounds, playerVelocity);
                    player.velocity.x = 0;
                    player.mesh.position.x = player.position.x;
                }
            }
        }

        // Second pass: Check ladder and other platforms (only if not on wall top)
        for (const platform of this.platforms) {
            if (platform.disabled) {
                continue;
            }
            const overlaps = checkAABBCollision(playerBounds, platform.bounds);
            const horizontalOverlap = playerBounds.right > platform.bounds.left &&
                playerBounds.left < platform.bounds.right;
            const isOneWay = Boolean(platform.isOneWay);
            const oneWayCrossing = isOneWay &&
                playerVelocity.y < 0 &&
                !dropThroughActive &&
                horizontalOverlap &&
                prevBottom >= platform.bounds.top &&
                playerBounds.bottom <= platform.bounds.top;
            if (!overlaps && !oneWayCrossing) {
                continue;
            }
            if ((platform.type === 'cloud' || platform.isCloudPlatform) && playerVelocity.y > 0) {
                continue;
            }
            // Special handling for ladders - only if not standing on wall
            if (platform.isLadder && !onWall && overlaps) {
                onLadder = true;
                player.onLadder = true;

                // Ladder physics: climb with jump
                if (player.input) {
                    // Let players fall at full speed while on ladder

                    // Climb up with W/Space
                    if (player.input.isJumpPressed()) {
                        player.velocity.y = 5; // Climb up speed
                        player.isGrounded = false;
                    }
                }
                continue; // Don't apply normal collision for ladder
            }

            // Skip wall collision (already handled in first pass)
            if (platform.type === 'wall') {
                continue;
            }
            if (platform.isOneWay) {
                const oneWayBody = platform.body || null;
                const allowDrop = oneWayBody ? oneWayBody.allowDropThrough : true;
                const dropWindow = oneWayBody ? oneWayBody.dropThroughWindowMs : 200;
                const solidFromAbove = oneWayBody ? oneWayBody.solidFromAbove : true;
                if (dropThroughActive) {
                    continue;
                }
                const downTapped = Boolean(player.dropTapUntil && now <= player.dropTapUntil);
                const eligibleStanding = overlaps
                    && playerVelocity.y <= 0
                    && playerBounds.bottom >= platform.bounds.top - 0.2;
                const cameFromAbove = prevBottom >= platform.bounds.top - 0.25;
                if (eligibleStanding) {
                    onOneWayPlatform = true;
                    if (!Number.isFinite(player.oneWayGroundedAt) || player.oneWayGroundedAt <= 0) {
                        player.oneWayGroundedAt = now;
                    }
                }
                const downHeld = player.input
                    && player.input.isDownPressed
                    && player.input.isDownPressed();
                if (downHeld && !player._oneWayDebugLastLog) {
                    player._oneWayDebugLastLog = 0;
                }
                if (downHeld && now - player._oneWayDebugLastLog > 500) {
                    console.log('[one-way drop]', {
                        allowDrop,
                        eligibleStanding,
                        grounded: player.isGrounded,
                        onOneWayPlatform,
                        dropThroughActive,
                        bottom: playerBounds.bottom,
                        top: platform.bounds.top
                    });
                    player._oneWayDebugLastLog = now;
                }
                if (onOneWayPlatform) {
                    if (downHeld) {
                        if (!Number.isFinite(player.oneWayDropHoldStart) || player.oneWayDropHoldStart <= 0) {
                            player.oneWayDropHoldStart = now;
                        }
                    } else {
                        player.oneWayDropHoldStart = 0;
                    }
                }
                const standingOnOneWay = eligibleStanding && cameFromAbove;
                const holdReady = standingOnOneWay
                    && Number.isFinite(player.oneWayDropHoldStart)
                    && now - player.oneWayDropHoldStart >= oneWayDropHoldMs;
                if (allowDrop && downHeld && holdReady) {
                    player.dropThroughUntil = now + dropWindow;
                    player.oneWayGroundedAt = 0;
                    player.oneWayDropHoldStart = 0;
                    player.isGrounded = false;
                    player.position.y -= 0.06;
                    player.mesh.position.y = player.position.y;
                    continue;
                }
                if (!solidFromAbove || playerVelocity.y > 0) {
                    continue;
                }
                if (!oneWayCrossing && playerBounds.bottom < platform.bounds.top - 0.08) {
                    continue;
                }
                if (oneWayCrossing) {
                    const impactSpeed = Math.abs(playerVelocity.y);
                    resolveCollisionY(player.position, platform.bounds, playerVelocity);
                    player.velocity.y = 0;
                    player.isGrounded = true;
                    onOneWayPlatform = true;
                    if (!Number.isFinite(player.oneWayGroundedAt) || player.oneWayGroundedAt <= 0) {
                        player.oneWayGroundedAt = now;
                    }
                    player.mesh.position.y = player.position.y;
                    triggerLandingSound(impactSpeed);
                    applyFallDamage(impactSpeed, platform);
                    if (platform.type === 'moving') {
                        const prevX = platform.prevX != null ? platform.prevX : platform.mesh.position.x;
                        const prevY = platform.prevY != null ? platform.prevY : platform.mesh.position.y;
                        const deltaX = platform.mesh.position.x - prevX;
                        const deltaY = platform.mesh.position.y - prevY;
                        player.position.x += deltaX;
                        player.position.y += deltaY;
                        player.mesh.position.x = player.position.x;
                        player.mesh.position.y = player.position.y;
                    }
                    continue;
                }
            }

            if (platform.body && platform.body.collisionShape && platform.body.collisionShape.type === 'polygon') {
                const result = resolvePolygonCollision(player, platform, playerVelocity);
                if (result && result.collided) {
                    if (result.grounded) {
                        triggerLandingSound(Math.abs(playerVelocity.y));
                        applyFallDamage(Math.abs(playerVelocity.y), platform);
                    }
                    continue;
                }
            }

            // Normal platform collision
            // Determine collision direction based on velocity and overlap
            const overlapLeft = playerBounds.right - platform.bounds.left;
            const overlapRight = platform.bounds.right - playerBounds.left;
            const overlapTop = playerBounds.top - platform.bounds.bottom;
            const overlapBottom = platform.bounds.top - playerBounds.bottom;

            // Find smallest overlap to determine collision direction
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            // Resolve based on smallest overlap AND velocity direction (prevents edge glitching)
            if (minOverlap === overlapBottom && playerVelocity.y <= 0) {
                // Player landed on top of platform (coming from above)
                const impactSpeed = Math.abs(playerVelocity.y);
                resolveCollisionY(player.position, platform.bounds, playerVelocity);
                player.velocity.y = 0;
                player.isGrounded = true;
                player.mesh.position.y = player.position.y;
                triggerLandingSound(impactSpeed);
                applyFallDamage(impactSpeed, platform);
                if (platform.breakable && platform.breakState === 'idle') {
                    platform.breakState = 'shaking';
                    platform.breakTimer = platform.breakDelay;
                    platform.shakeTime = 0;
                }
                if (platform.type === 'launcher') {
                    onLauncher = platform;
                }
                if (platform.type === 'moving') {
                    const prevX = platform.prevX != null ? platform.prevX : platform.mesh.position.x;
                    const prevY = platform.prevY != null ? platform.prevY : platform.mesh.position.y;
                    const deltaX = platform.mesh.position.x - prevX;
                    const deltaY = platform.mesh.position.y - prevY;
                    player.position.x += deltaX;
                    player.position.y += deltaY;
                    player.mesh.position.x = player.position.x;
                    player.mesh.position.y = player.position.y;
                }
            } else if (minOverlap === overlapTop && playerVelocity.y > 0) {
                // Player hit bottom of platform (jumping into it)
                resolveCollisionY(player.position, platform.bounds, playerVelocity);
                player.velocity.y = 0;
                player.mesh.position.y = player.position.y;
            } else if ((minOverlap === overlapLeft && playerVelocity.x > 0) ||
                       (minOverlap === overlapRight && playerVelocity.x < 0)) {
                // Only resolve horizontal collision if moving TOWARD the wall
                // This prevents edge-glitching when walking off platforms
                if (platform.type === 'cloud' || platform.isCloudPlatform || platform.isOneWay) {
                    continue;
                }
                resolveCollisionX(player.position, platform.bounds, playerVelocity);
                player.velocity.x = 0;
                player.mesh.position.x = player.position.x;
            }
        }

        // Reset ladder flag if not on ladder
        player.onLadder = Boolean(onLadder);
        if (player.onLadder) {
            const maxJumps = Number.isFinite(player.maxJumps) ? player.maxJumps : 2;
            player.jumpsRemaining = maxJumps;
            player.jumpKeyWasPressed = false;
        }
        player.onOneWay = Boolean(onOneWayPlatform);
        if (!onOneWayPlatform) {
            player.oneWayGroundedAt = 0;
            player.oneWayDropHoldStart = 0;
        }

        if (onLauncher) {
            const now = performance.now();
            if (!player.launcherCooldownUntil || now >= player.launcherCooldownUntil) {
                const launch = onLauncher.launchVelocity || { x: 0, y: 16 };
                player.velocity.x = launch.x;
                player.velocity.y = launch.y;
                player.isGrounded = false;
                const maxJumps = Number.isFinite(player.maxJumps) ? player.maxJumps : 2;
                player.jumpsRemaining = maxJumps;
                player.jumpKeyWasPressed = false;
                onLauncher.springTimer = onLauncher.springDuration;
                player.launcherChargeStart = null;
                player.launcherCooldownUntil = now + 600;
            }
        } else {
            player.launcherChargeStart = null;
        }

        if (player.isGrounded) {
            player.hasEverGrounded = true;
            player.landSoundReady = false;
            player.fallPeakY = player.position.y;
            player.fallDistance = 0;
        } else if (player.wasGrounded) {
            player.landSoundReady = true;
        } else if (!player.hasEverGrounded) {
            player.landSoundReady = true;
        }
    }

    /**
     * Add an enemy to the level
     * @param {EnemyBase} enemy - Enemy instance
     */
    addEnemy(enemy) {
        this.enemies.push(enemy);
    }

    /**
     * Update all enemies
     * @param {number} deltaTime - Time since last frame
     */
    updateEnemies(deltaTime) {
        for (const enemy of this.enemies) {
            if (enemy.isAlive) {
                enemy.update(deltaTime, this);
            }
        }
    }

    /**
     * Update moving platforms
     * @param {number} deltaTime - Time since last frame
     */
    updateMovingPlatforms(deltaTime) {
        for (const moving of this.movingPlatforms) {
            const hasHorizontal = Math.abs(moving.rangeX) > 0.001;
            const hasVertical = Math.abs(moving.rangeY) > 0.001;
            const isVerticalOnly = hasVertical && !hasHorizontal;
            const speedScale = isVerticalOnly ? this.verticalMovingSpeedScale : 1;
            const speedCap = isVerticalOnly ? this.verticalMovingSpeedCap : Infinity;
            moving.time += deltaTime;
            const effectiveSpeed = Math.min(moving.speed * speedScale, speedCap);
            const time = moving.time * effectiveSpeed + moving.phase;
            const offsetX = Math.sin(time) * moving.rangeX;
            const offsetY = Math.sin(time) * moving.rangeY;

            const nextX = moving.baseX + offsetX;
            const nextY = moving.baseY + offsetY;
            const platform = moving.platform;

            platform.prevX = platform.mesh.position.x;
            platform.prevY = platform.mesh.position.y;
            platform.mesh.position.set(nextX, nextY, 0);
            const width = platform.bounds.right - platform.bounds.left;
            const height = platform.bounds.top - platform.bounds.bottom;
            platform.bounds.left = nextX - width / 2;
            platform.bounds.right = nextX + width / 2;
            platform.bounds.top = nextY + height / 2;
            platform.bounds.bottom = nextY - height / 2;
        }
    }

    updateLaunchers(deltaTime) {
        for (const platform of this.platforms) {
            if (!platform || platform.type !== 'launcher' || !platform.mesh) {
                continue;
            }
            if (platform.springTimer > 0) {
                platform.springTimer = Math.max(0, platform.springTimer - deltaTime);
                const t = 1 - (platform.springTimer / Math.max(0.001, platform.springDuration));
                const pulse = Math.sin(Math.min(1, t) * Math.PI);
                const scaleY = 1 + pulse * 0.9;
                const scaleX = 1 - pulse * 0.18;
                platform.mesh.scale.set(scaleX, scaleY, 1);
                platform.mesh.position.y = platform.baseY + (scaleY - 1) * 0.55;
            } else {
                platform.mesh.scale.set(1, 1, 1);
                platform.mesh.position.y = platform.baseY;
            }
        }
    }

    updateWindVisuals(deltaTime) {
        if (!this.windStreaks.length) return;
        this.windStreaks.forEach((streak) => {
            const { mesh, bounds, speed, dir } = streak;
            mesh.position.x += dir.x * speed * deltaTime;
            mesh.position.y += dir.y * speed * deltaTime;
            if (mesh.position.x < bounds.left) mesh.position.x = bounds.right;
            if (mesh.position.x > bounds.right) mesh.position.x = bounds.left;
            if (mesh.position.y < bounds.bottom) mesh.position.y = bounds.top;
            if (mesh.position.y > bounds.top) mesh.position.y = bounds.bottom;
        });
    }

    updateBreakablePlatforms(deltaTime) {
        for (const platform of this.platforms) {
            if (!platform || !platform.breakable || !platform.mesh) {
                continue;
            }
            if (platform.breakState === 'shaking') {
                platform.breakTimer = Math.max(0, platform.breakTimer - deltaTime);
                platform.shakeTime += deltaTime;
                platform.mesh.rotation.z = Math.sin(platform.shakeTime * 22) * 0.05;
                platform.mesh.position.y = platform.baseY + Math.sin(platform.shakeTime * 30) * 0.08;
                if (platform.breakTimer <= 0) {
                    platform.breakState = 'broken';
                    platform.respawnTimer = platform.respawnDelay;
                    platform.disabled = true;
                    platform.mesh.visible = false;
                    platform.mesh.rotation.z = 0;
                    platform.mesh.position.y = platform.baseY;
                }
            } else if (platform.breakState === 'broken') {
                platform.respawnTimer = Math.max(0, platform.respawnTimer - deltaTime);
                if (platform.respawnTimer <= 0) {
                    platform.breakState = 'idle';
                    platform.disabled = false;
                    platform.mesh.visible = true;
                    platform.mesh.rotation.z = 0;
                    platform.mesh.position.y = platform.baseY;
                }
            }
        }
    }

    /**
     * Update level systems
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        this.updateEnemies(deltaTime);
        this.updateMovingPlatforms(deltaTime);
        this.updateLaunchers(deltaTime);
        this.updateWindVisuals(deltaTime);
        this.updateBreakablePlatforms(deltaTime);
        this.updateFlags();
    }

    /**
     * Add a decorative wall with ladder
     * @param {number} x - Center X position
     * @param {number} baseY - Base Y position (ground level)
     * @param {number} wallHeight - Total height of the wall
     * @param {Object} options - Optional settings
     */
    addWallWithLadder(x, baseY, wallHeight, options = {}) {
        const wallGroup = new THREE.Group();
        const wallWidth = options.wallWidth != null ? options.wallWidth : 1.5;
        const visualOffset = options.visualOffset != null ? options.visualOffset : 0;
        const visualHeightOffset = options.visualHeightOffset != null ? options.visualHeightOffset : 0;
        const ladderSide = options.ladderSide != null ? options.ladderSide : 'right';
        const addDoor = options.addDoor !== undefined ? options.addDoor : false;
        const visibilityLayer = normalizeVisibilityLayer(
            options.visibilityLayer != null ? options.visibilityLayer : this.defaultVisibilityLayer
        );

        // Main wall body (stone blocks)
        const numBlocks = Math.floor(wallHeight / 0.8);
        const blockHeight = 0.8;
        const actualVisualTopLocal = numBlocks * blockHeight - blockHeight / 2;
        for (let i = 0; i < numBlocks; i++) {
            const blockY = i * blockHeight;

            // Stone block
            const blockGeometry = new THREE.BoxGeometry(wallWidth, blockHeight, 0.8);
            const blockMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.wallBlock });
            const block = new THREE.Mesh(blockGeometry, blockMaterial);
            block.position.y = blockY;
            wallGroup.add(block);

            // Block mortar lines (darker)
            const mortarGeometry = new THREE.BoxGeometry(wallWidth + 0.05, 0.05, 0.82);
            const mortarMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.wallMortar });
            const mortar = new THREE.Mesh(mortarGeometry, mortarMaterial);
            mortar.position.y = blockY + blockHeight/2;
            wallGroup.add(mortar);

            // Stone texture detail (lighter spots)
            if (Math.random() > 0.5) {
                const spotGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.81);
                const spotMaterial = new THREE.MeshBasicMaterial({
                    color: FOREGROUND_PALETTE.wallSpot,
                    transparent: true,
                    opacity: 0.6
                });
                const spot = new THREE.Mesh(spotGeometry, spotMaterial);
                spot.position.set(
                    (Math.random() - 0.5) * wallWidth * 0.6,
                    blockY + (Math.random() - 0.5) * blockHeight * 0.6,
                    0
                );
                wallGroup.add(spot);
            }
        }

        if (visualHeightOffset > 0) {
            const capGeometry = new THREE.BoxGeometry(wallWidth, visualHeightOffset, 0.8);
            const capMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.wallBlock });
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.position.set(0, actualVisualTopLocal + visualHeightOffset / 2, 0);
            wallGroup.add(cap);

            const capMortarGeometry = new THREE.BoxGeometry(wallWidth + 0.05, 0.05, 0.82);
            const capMortarMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.wallMortar });
            const capMortar = new THREE.Mesh(capMortarGeometry, capMortarMaterial);
            capMortar.position.set(0, actualVisualTopLocal + visualHeightOffset, 0);
            wallGroup.add(capMortar);
        }

        // LADDER on the side
        const ladderOffset = wallWidth / 2 + 0.3;
        const ladderX = ladderSide === 'left' ? -ladderOffset : ladderOffset;
        const ladderWidth = 1.0;
        const ladderDepth = 0.15;
        const ladderHeight = wallHeight - 0.5; // Ladder stops 0.5 units below wall top

        // Left rail - positioned in front of wall (Z > 0.4)
        const leftRailGeometry = new THREE.BoxGeometry(0.08, ladderHeight, ladderDepth);
        const railMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.ladderRail });
        const leftRail = new THREE.Mesh(leftRailGeometry, railMaterial);
        leftRail.position.set(ladderX - ladderWidth/2, ladderHeight/2, 0.6);
        wallGroup.add(leftRail);

        // Right rail
        const rightRail = new THREE.Mesh(leftRailGeometry, railMaterial);
        rightRail.position.set(ladderX + ladderWidth/2, ladderHeight/2, 0.6);
        wallGroup.add(rightRail);

        // Rungs (horizontal steps)
        const numRungs = Math.floor(ladderHeight / 0.6);
        for (let i = 0; i < numRungs; i++) {
            const rungY = (i + 0.5) * (ladderHeight / numRungs);
            const rungGeometry = new THREE.BoxGeometry(ladderWidth, 0.1, ladderDepth);
            const rungMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.ladderRung });
            const rung = new THREE.Mesh(rungGeometry, rungMaterial);
            rung.position.set(ladderX, rungY, 0.6);
            wallGroup.add(rung);

            // Add rung shadow/depth
            const shadowGeometry = new THREE.BoxGeometry(ladderWidth, 0.05, ladderDepth);
            const shadowMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.3
            });
            const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
            shadow.position.set(ladderX, rungY - 0.08, 0.58);
            wallGroup.add(shadow);
        }

        const doorWidth = Math.min(2.2, wallWidth * 0.5);
        const doorHeight = Math.min(3.2, wallHeight * 0.45);
        if (addDoor) {
            const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.2);
            const doorMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.door });
            const door = new THREE.Mesh(doorGeometry, doorMaterial);
            door.position.set(0, doorHeight / 2 + 0.1, 0.55);
            wallGroup.add(door);

            const doorFrameGeometry = new THREE.BoxGeometry(doorWidth + 0.2, doorHeight + 0.2, 0.1);
            const doorFrameMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.doorFrame });
            const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
            doorFrame.position.set(0, doorHeight / 2 + 0.1, 0.52);
            wallGroup.add(doorFrame);
        }

        // Decorative vines growing on the wall
        const numVines = 3;
        for (let i = 0; i < numVines; i++) {
            const vineX = (Math.random() - 0.5) * wallWidth * 0.8;
            const vineSegments = Math.floor(Math.random() * 5) + 3;

            for (let j = 0; j < vineSegments; j++) {
                const vineY = (j / vineSegments) * wallHeight + Math.random() * 0.3;
                const vineGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.05);
                const vineMaterial = new THREE.MeshBasicMaterial({
                    color: FOREGROUND_PALETTE.vine,
                    transparent: true,
                    opacity: 0.7
                });
                const vine = new THREE.Mesh(vineGeometry, vineMaterial);
                vine.position.set(
                    vineX + (Math.random() - 0.5) * 0.15,
                    vineY,
                    0.42
                );
                vine.rotation.z = (Math.random() - 0.5) * 0.3;
                wallGroup.add(vine);

                // Add small leaves
                if (Math.random() > 0.6) {
                    const leafGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.02);
                    const leafMaterial = new THREE.MeshBasicMaterial({
                        color: FOREGROUND_PALETTE.leaf,
                        transparent: true,
                        opacity: 0.8
                    });
                    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                    leaf.position.set(vineX + 0.1, vineY, 0.45);
                    wallGroup.add(leaf);
                }
            }
        }

        // Position the entire wall - blocks are built from 0 upward, so position at baseY
        wallGroup.position.set(x, baseY + visualOffset, 0);
        applyVisibilityLayer(wallGroup, visibilityLayer);
        this.group.add(wallGroup);

        // Calculate actual visual top based on blocks (each 0.8 high, positioned at center)
        const actualVisualTop = baseY + actualVisualTopLocal;
        const surfaceEpsilon = 0.05;

        // Add collision platform for the wall - matches actual visual top
        const platform = {
            mesh: wallGroup,
            bounds: {
                left: x - wallWidth / 2,
                right: x + wallWidth / 2,
                top: actualVisualTop + surfaceEpsilon, // Slight lift to avoid overlap
                bottom: baseY
            },
            type: 'wall',
            visibilityLayer
        };

        platform.body = new SolidBody({
            collisionShape: { type: 'aabb', bounds: platform.bounds },
            movable: false,
            mapKey: this.mapKey
        });
        platform.body.setVisibilityLayer(visibilityLayer);
        this.bodies.push(platform.body);
        this.platforms.push(platform);

        // Add ladder collision zone (allows climbing) - stops 0.5 units below wall top
        const ladderPlatform = {
            mesh: wallGroup, // Share same mesh
            bounds: {
                left: x + ladderX - ladderWidth/2 - 0.05,
                right: x + ladderX + ladderWidth/2 + 0.35,
                top: baseY + wallHeight - 0.5, // Ladder top stops before wall top
                bottom: baseY
            },
            type: 'ladder',
            visibilityLayer,
            isLadder: true // Special flag for climbing
        };

        ladderPlatform.body = new Ladder({
            bounds: ladderPlatform.bounds,
            mapKey: this.mapKey
        });
        ladderPlatform.body.setVisibilityLayer(visibilityLayer);
        this.bodies.push(ladderPlatform.body);
        this.platforms.push(ladderPlatform);
        return platform;
    }

    /**
     * Add a simple flag near a castle
     * @param {number} x - Center X position
     * @param {number} baseY - Base Y position (ground level)
     * @param {number} wallHeight - Height of the castle wall
     * @param {number} color - Flag color
     */
    addCastleFlag(x, baseY, wallHeight, color, wallTopOverride = null) {
        const flagGroup = new THREE.Group();
        const poleHeight = 1.1;
        const poleGeometry = new THREE.BoxGeometry(0.06, poleHeight, 0.06);
        const poleMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.flagPole });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(0, poleHeight / 2, 0.4);
        flagGroup.add(pole);

        const clothWidth = 0.55;
        const clothHeight = 0.35;
        const clothGeometry = new THREE.BoxGeometry(clothWidth, clothHeight, 0.05);
        const clothMaterial = new THREE.MeshBasicMaterial({ color });
        const cloth = new THREE.Mesh(clothGeometry, clothMaterial);
        cloth.position.set(0.32, 0.75, 0.45);
        flagGroup.add(cloth);

        const wallTop = Number.isFinite(wallTopOverride) ? wallTopOverride : baseY + wallHeight;
        const flagBaseY = wallTop + 0.05;
        flagGroup.position.set(x, flagBaseY, 0.9);
        this.group.add(flagGroup);
    }

    /**
     * Add an interactive capture-the-flag flag
     * @param {number} x - Center X position
     * @param {number} baseY - Base Y position (ground level)
     * @param {number} wallHeight - Height of the castle wall
     * @param {number} color - Flag color
     * @param {string} team - Team label
     */
    addInteractiveFlag(x, baseY, wallHeight, color, team, wallTopOverride = null) {
        const flagGroup = new THREE.Group();
        const poleHeight = 1.1;
        const poleGeometry = new THREE.BoxGeometry(0.06, poleHeight, 0.06);
        const poleMaterial = new THREE.MeshBasicMaterial({ color: FOREGROUND_PALETTE.flagPole });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(0, poleHeight / 2, 0.4);
        flagGroup.add(pole);

        const clothWidth = 0.55;
        const clothHeight = 0.35;
        const clothGeometry = new THREE.BoxGeometry(clothWidth, clothHeight, 0.05);
        const clothMaterial = new THREE.MeshBasicMaterial({ color });
        const cloth = new THREE.Mesh(clothGeometry, clothMaterial);
        cloth.position.set(0.32, 0.75, 0.45);
        flagGroup.add(cloth);

        const wallTop = Number.isFinite(wallTopOverride) ? wallTopOverride : baseY + wallHeight;
        const flagBaseY = wallTop + 0.05;
        flagGroup.position.set(x, flagBaseY, 0.9);
        this.group.add(flagGroup);

        const flag = {
            mesh: flagGroup,
            team,
            carrier: null,
            baseX: x,
            baseY: flagBaseY,
            boundsOffsets: {
                left: -0.4,
                right: 0.4,
                top: 0.9,
                bottom: -0.2
            },
            bounds: {
                left: x - 0.4,
                right: x + 0.4,
                top: flagBaseY + 0.9,
                bottom: flagBaseY - 0.2
            }
        };

        this.flags.push(flag);
        return flag;
    }

    /**
     * Update flag positions (carry or idle)
     */
    updateFlags() {
        for (const flag of this.flags) {
            if (flag.carrier && flag.carrier.currentHealth <= 0) {
                flag.carrier.carryingFlag = null;
                flag.carrier = null;
            }

            if (flag.carrier) {
                const carrierPos = flag.carrier.getPosition();
                const nextX = carrierPos.x;
                const nextY = carrierPos.y + 1.2;
                flag.mesh.position.set(nextX, nextY, 0.9);
                const offsets = flag.boundsOffsets || { left: -0.6, right: 0.8, bottom: 0, top: 2.2 };
                flag.bounds.left = nextX + offsets.left;
                flag.bounds.right = nextX + offsets.right;
                flag.bounds.bottom = nextY + offsets.bottom;
                flag.bounds.top = nextY + offsets.top;
            } else {
                flag.mesh.position.set(flag.baseX, flag.baseY, 0.9);
                const offsets = flag.boundsOffsets || { left: -0.6, right: 0.8, bottom: 0, top: 2.2 };
                flag.bounds.left = flag.baseX + offsets.left;
                flag.bounds.right = flag.baseX + offsets.right;
                flag.bounds.bottom = flag.baseY + offsets.bottom;
                flag.bounds.top = flag.baseY + offsets.top;
            }
        }
    }

    /**
     * Let a player pick up any nearby flag
     * @param {Player} player
     */
    checkFlagPickup(player) {
        if (!player || !player.getBounds) return;
        if (player.carryingFlag) return;
        const playerBounds = player.getBounds();
        for (const flag of this.flags) {
            if (flag.carrier) {
                continue;
            }
            if (checkAABBCollision(playerBounds, flag.bounds)) {
                flag.carrier = player;
                player.carryingFlag = flag;
            }
        }
    }

    /**
     * Create a test level with floating platforms
     */
    createTestLevel(options = {}) {
        this.mapKey = options.mapKey !== undefined ? options.mapKey : null;
        const includeInteractiveFlags = options.includeInteractiveFlags !== false;
        // Main ground platform (ground type with grass)
        const groundSurfaceY = -2.5;
        const groundBottomY = -14;
        const groundHeight = groundSurfaceY - groundBottomY;
        const groundCenterY = groundSurfaceY - groundHeight / 2;
        const groundLeft = -110;
        const groundRight = 110;
        const gapCenters = [-30, 0, 30];
        const gapWidths = [12, 6, 12];
        const gapEdges = gapCenters.map((center, index) => {
            const half = gapWidths[index] / 2;
            return { left: center - half, right: center + half };
        });

        // Ground segments with three symmetric gaps between castles
        this.addPlatform((groundLeft + gapEdges[0].left) / 2, groundCenterY, gapEdges[0].left - groundLeft, groundHeight, 'ground');
        this.addPlatform((gapEdges[0].right + gapEdges[1].left) / 2, groundCenterY, gapEdges[1].left - gapEdges[0].right, groundHeight, 'ground');
        this.addPlatform((gapEdges[1].right + gapEdges[2].left) / 2, groundCenterY, gapEdges[2].left - gapEdges[1].right, groundHeight, 'ground');
        this.addPlatform((gapEdges[2].right + groundRight) / 2, groundCenterY, groundRight - gapEdges[2].right, groundHeight, 'ground');

        const wallHeight = 10.5;
        const castleWallWidth = 12;

        // Left castle
        const leftCastleX = -52;
        const leftWallPlatform = this.addWallWithLadder(leftCastleX, groundSurfaceY, wallHeight, {
            wallWidth: castleWallWidth,
            ladderSide: 'right',
            addDoor: true,
            visualOffset: 0,
            visualHeightOffset: 0.25
        });
        if (includeInteractiveFlags) {
            const leftWallTop = leftWallPlatform && leftWallPlatform.bounds ? leftWallPlatform.bounds.top : undefined;
            this.addInteractiveFlag(leftCastleX, groundSurfaceY, wallHeight, 0x2f6cb0, 'blue', leftWallTop);
        }

        // Right castle
        const rightCastleX = 52;
        const rightWallPlatform = this.addWallWithLadder(rightCastleX, groundSurfaceY, wallHeight, {
            wallWidth: castleWallWidth,
            ladderSide: 'left',
            addDoor: true,
            visualOffset: 0,
            visualHeightOffset: 0.25
        });
        if (includeInteractiveFlags) {
            const rightWallTop = rightWallPlatform && rightWallPlatform.bounds ? rightWallPlatform.bounds.top : undefined;
            this.addInteractiveFlag(rightCastleX, groundSurfaceY, wallHeight, 0xcc2f2f, 'red', rightWallTop);
        }

        const leftWallTop = leftWallPlatform && leftWallPlatform.bounds ? leftWallPlatform.bounds.top : (groundSurfaceY + wallHeight);
        const rightWallTop = rightWallPlatform && rightWallPlatform.bounds ? rightWallPlatform.bounds.top : (groundSurfaceY + wallHeight);
        this.flagSpawns = {
            blue: { x: leftCastleX, y: leftWallTop + 0.05 },
            red: { x: rightCastleX, y: rightWallTop + 0.05 }
        };
        this.playerSpawns = {
            blue: { x: leftCastleX, y: leftWallTop + 0.5 },
            red: { x: rightCastleX, y: rightWallTop + 0.5 }
        };

        const boundaryWidth = 1.5;
        const boundaryTop = groundSurfaceY + wallHeight + 18;
        const boundaryBottom = groundBottomY;
        const leftBoundaryRight = leftCastleX - castleWallWidth / 2;
        const rightBoundaryLeft = rightCastleX + castleWallWidth / 2;

        this.platforms.push({
            mesh: null,
            bounds: {
                left: leftBoundaryRight - boundaryWidth,
                right: leftBoundaryRight,
                top: boundaryTop,
                bottom: boundaryBottom
            },
            type: 'wall'
        });

        this.platforms[this.platforms.length - 1].body = new SolidBody({
            collisionShape: { type: 'aabb', bounds: this.platforms[this.platforms.length - 1].bounds },
            movable: false,
            mapKey: this.mapKey
        });
        this.bodies.push(this.platforms[this.platforms.length - 1].body);

        this.platforms.push({
            mesh: null,
            bounds: {
                left: rightBoundaryLeft,
                right: rightBoundaryLeft + boundaryWidth,
                top: boundaryTop,
                bottom: boundaryBottom
            },
            type: 'wall'
        });

        this.platforms[this.platforms.length - 1].body = new SolidBody({
            collisionShape: { type: 'aabb', bounds: this.platforms[this.platforms.length - 1].bounds },
            movable: false,
            mapKey: this.mapKey
        });
        this.bodies.push(this.platforms[this.platforms.length - 1].body);

        // Moving platforms over the longer outer gaps
        const movingGapY = 1.4;
        this.addMovingPlatform(gapCenters[0], movingGapY, 3.5, 0.6, 'stone', { rangeX: 3.5, speed: 1.1 });
        this.addMovingPlatform(gapCenters[2], movingGapY, 3.5, 0.6, 'stone', { rangeX: 3.5, speed: 1.0, phase: Math.PI / 2 });

        // Midfield platforms for capture-the-flag lanes
        this.addPlatform(0, 1, 6, 0.6, 'grass');
        this.addPlatform(-12, -0.5, 4, 0.6, 'stone');
        this.addPlatform(12, -0.5, 4, 0.6, 'stone');
        this.addPlatform(-6, 2.5, 3, 0.6, 'grass');
        this.addPlatform(6, 2.5, 3, 0.6, 'grass');

        // Cloud platform split into 4 poofy sections (matching ground gaps)
        const cloudY = 18;
        const cloudHeight = 0.7;
        const cloudSegments = [
            { left: gapEdges[0].right, right: gapEdges[1].left },
            { left: gapEdges[1].right, right: gapEdges[2].left }
        ];
        const cloudOffsets = [-0.1, 0.15];
        const ropeHeight = 0.35;
        const ropeGapRatio = 0.65;
        cloudSegments.forEach((segment, index) => {
            const offset = cloudOffsets[index] || 0;
            const width = segment.right - segment.left;
            if (width < 8) {
                const center = (segment.left + segment.right) / 2;
                this.addPlatform(center, cloudY + offset, width, cloudHeight, 'cloud');
                return;
            }
            const splitGap = Math.max(4, width * ropeGapRatio);
            const pieceWidth = (width - splitGap) / 2;
            const leftCenter = segment.left + pieceWidth / 2;
            const rightCenter = segment.right - pieceWidth / 2;
            this.addPlatform(leftCenter, cloudY + offset, pieceWidth, cloudHeight, 'cloud');
            this.addPlatform(rightCenter, cloudY + offset, pieceWidth, cloudHeight, 'cloud');

            const ropeY = cloudY + offset + cloudHeight / 2 - ropeHeight / 2;
            const ropeX = (leftCenter + rightCenter) / 2;
            this.addBreakablePlatform(ropeX, ropeY, splitGap, ropeHeight, 'rope', {
                breakDelay: 0.6,
                respawnDelay: 5
            });
        });

        // Catapult launchers on top of each castle (inside edge)
        const leftLauncherX = leftCastleX - castleWallWidth / 2 + 1.8;
        const rightLauncherX = rightCastleX + castleWallWidth / 2 - 1.8;
        const leftLauncherHeight = leftWallTop + 0.3;
        const rightLauncherHeight = rightWallTop + 0.3;
        const leftLauncher = this.addPlatform(leftLauncherX, leftLauncherHeight, 4, 0.6, 'launcher');
        leftLauncher.launchVelocity = { x: 10, y: 23 };
        const rightLauncher = this.addPlatform(rightLauncherX, rightLauncherHeight, 4, 0.6, 'launcher');
        rightLauncher.launchVelocity = { x: -10, y: 23 };

        // Landing cloud pads aligned to the launch arc (no extra jump needed)
        const landingCloudY = 16.4;
        const landingCloudWidth = 7.5;
        const landingCloudHeight = 1.1;
        const landingOffset = 13.5;
        this.addPlatform(leftLauncherX + landingOffset, landingCloudY, landingCloudWidth, landingCloudHeight, 'cloud');
        this.addPlatform(rightLauncherX - landingOffset, landingCloudY, landingCloudWidth, landingCloudHeight, 'cloud');

        // Moving cloud bridges between landing pads and the main cloud platforms
        const landingRightEdge = leftLauncherX + landingOffset + landingCloudWidth / 2;
        const landingLeftEdge = rightLauncherX - landingOffset - landingCloudWidth / 2;
        const leftMainCloudEdge = gapEdges[0].right;
        const rightMainCloudEdge = gapEdges[2].left;
        const bridgeWidth = 3;
        const bridgeHeight = 0.5;
        const bridgeY = landingCloudY - 0.1;

        const leftGap = leftMainCloudEdge - landingRightEdge;
        if (leftGap > 1) {
            const bridgeBaseX = (landingRightEdge + leftMainCloudEdge) / 2;
            const rangeX = Math.max(0.6, leftGap / 2 - 0.8);
            this.addMovingPlatform(bridgeBaseX, bridgeY, bridgeWidth, bridgeHeight, 'cloud', {
                rangeX,
                speed: 1.0
            });
        }

        const rightGap = landingLeftEdge - rightMainCloudEdge;
        if (rightGap > 1) {
            const bridgeBaseX = (landingLeftEdge + rightMainCloudEdge) / 2;
            const rangeX = Math.max(0.6, rightGap / 2 - 0.8);
            this.addMovingPlatform(bridgeBaseX, bridgeY, bridgeWidth, bridgeHeight, 'cloud', {
                rangeX,
                speed: 1.0,
                phase: Math.PI / 2
            });
        }

        const cloudTargetY = 18;
        const windTop = cloudTargetY - 0.6;
        const windBottom = cloudTargetY - 3.2;
        this.addWindZone(
            {
                left: leftLauncherX - 5,
                right: 6,
                bottom: windBottom,
                top: windTop
            },
            { x: 12, y: 3.5 }
        );
        this.addWindZone(
            {
                left: -6,
                right: rightLauncherX + 5,
                bottom: windBottom,
                top: windTop
            },
            { x: -12, y: 3.5 }
        );
    }

    createGameTestLevel() {
        this.mapKey = 'game-test';
        MapBuilder.build(this, gameTestMap);
    }

    async createGameTestMaskLevel(config = hilltowerMaskConfig) {
        this.mapKey = config.key;
        const mapData = await MaskMapBuilder.build(config);
        if (!mapData) return;
        MapBuilder.build(this, mapData);
    }

    async createCtfMaskLevel(config = ctfBtbMaskConfig) {
        this.mapKey = config.key;
        const mapData = await MaskMapBuilder.build(config);
        if (!mapData) return;
        MapBuilder.build(this, mapData);
        if (config.flagSpawnsFromPlayerSpawns && this.playerSpawns && !this.flagSpawns) {
            const { blue, red, neutral } = this.playerSpawns;
            if (blue && red) {
                this.flagSpawns = { blue: { ...blue }, red: { ...red } };
            } else if (neutral) {
                this.flagSpawns = { blue: { ...neutral }, red: { ...neutral } };
            }
        }
    }

    async createArenaLevel(options = {}) {
        await this.createGameTestMaskLevel(arenaMaskConfig);
    }

    createKothLevel(options = {}) {
        this.createTestLevel({ ...options, mapKey: options.mapKey !== undefined ? options.mapKey : 'koth' });
    }

    addWindZone(bounds, force) {
        this.windZones.push({ bounds, force });
        const count = 10;
        const dirLength = Math.hypot(force.x, force.y) || 1;
        const dir = { x: force.x / dirLength, y: force.y / dirLength };
        const angle = Math.atan2(dir.y, dir.x);
        for (let i = 0; i < count; i++) {
            const streakGeometry = new THREE.PlaneGeometry(2.4, 0.2);
            const streakMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.25
            });
            const streak = new THREE.Mesh(streakGeometry, streakMaterial);
            streak.rotation.z = angle;
            streak.position.set(
                bounds.left + Math.random() * (bounds.right - bounds.left),
                bounds.bottom + Math.random() * (bounds.top - bounds.bottom),
                0.2
            );
            this.group.add(streak);
            this.windStreaks.push({
                mesh: streak,
                bounds,
                speed: 6 + Math.random() * 4,
                dir
            });
        }
    }

    applyWind(player, deltaTime) {
        if (!player || !player.isAlive || player.isGrounded) return;
        const pos = player.position;
        for (const zone of this.windZones) {
            if (pos.x >= zone.bounds.left &&
                pos.x <= zone.bounds.right &&
                pos.y >= zone.bounds.bottom &&
                pos.y <= zone.bounds.top) {
                player.velocity.x += zone.force.x * deltaTime;
                player.velocity.y += zone.force.y * deltaTime;
            }
        }
    }
}
