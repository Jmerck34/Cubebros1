import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { checkAABBCollision, resolveCollisionY, resolveCollisionX } from '../utils/collision.js';

const FOREGROUND_PALETTE = {
    groundBody: 0x7a3d2d,
    groundTop: 0xa07745,
    groundSide: 0x5a2c20,
    grassBody: 0x6b3527,
    grassTop: 0x7f965d,
    grassSide: 0x4b241a,
    stoneBody: 0x5a5166,
    stoneTop: 0x4a4155,
    stoneSide: 0x332b3f,
    cloudBody: 0xf0e6db,
    cloudTop: 0xf9f2e7,
    cloudSide: 0xd2c2b3,
    launcherBody: 0x4a2c21,
    launcherTop: 0x9a5c3a,
    launcherSide: 0x2a1913,
    grassTuft: 0x5d7b4f,
    dirtSpeck: 0x5a2f22,
    stoneLine: 0x3b3346,
    wallBlock: 0x6f687a,
    wallMortar: 0x3a3342,
    wallSpot: 0x8a8296,
    ladderRail: 0x6f4a36,
    ladderRung: 0x543625,
    door: 0x4b2d22,
    doorFrame: 0x26170f,
    vine: 0x4b6a45,
    leaf: 0x6f8b4b,
    flagPole: 0x7a4d34
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
    addPlatform(x, y, width, height, type = 'grass') {
        const platformGroup = new THREE.Group();

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
            springDuration: type === 'launcher' ? 0.45 : 0.25
        };

        this.platforms.push(platform);
        return platform;
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

        this.movingPlatforms.push({
            platform,
            baseX: x,
            baseY: y,
            rangeX: motion.rangeX ?? 0,
            rangeY: motion.rangeY ?? 0,
            speed: motion.speed ?? 1.2,
            phase: motion.phase ?? Math.random() * Math.PI * 2,
            time: 0
        });

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
        let onLadder = false;
        let onLauncher = null;
        let onWall = false;
        const updateFallTracking = () => {
            if (!Number.isFinite(player.fallPeakY)) {
                player.fallPeakY = player.position.y;
            }
            if (!Number.isFinite(player.fallDistance)) {
                player.fallDistance = 0;
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
            tryPreLandingSound(platform);
            if (player.didLandThisFrame) {
                break;
            }
        }

        // First pass: Check wall collisions (higher priority)
        for (const platform of this.platforms) {
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
            if (checkAABBCollision(playerBounds, platform.bounds)) {
                // Special handling for ladders - only if not standing on wall
                if (platform.isLadder && !onWall) {
                    onLadder = true;
                    player.onLadder = true;

                    // Ladder physics: climb with jump
                    if (player.input) {
                        // Slow fall on ladder
                        if (player.velocity.y < 0) {
                            player.velocity.y *= 0.3; // Reduced fall speed
                        }

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
                    if (platform.type === 'launcher') {
                        onLauncher = platform;
                    }
                    if (platform.type === 'moving') {
                        const prevX = platform.prevX ?? platform.mesh.position.x;
                        const prevY = platform.prevY ?? platform.mesh.position.y;
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
                    resolveCollisionX(player.position, platform.bounds, playerVelocity);
                    player.velocity.x = 0;
                    player.mesh.position.x = player.position.x;
                }
            }
        }

        // Reset ladder flag if not on ladder
        if (!onLadder) {
            player.onLadder = false;
        }

        if (!onLauncher) {
            player.launcherChargeStart = null;
        } else {
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
            moving.time += deltaTime;
            const offsetX = Math.sin(moving.time * moving.speed + moving.phase) * moving.rangeX;
            const offsetY = Math.sin(moving.time * moving.speed + moving.phase) * moving.rangeY;

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

    /**
     * Update level systems
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        this.updateEnemies(deltaTime);
        this.updateMovingPlatforms(deltaTime);
        this.updateLaunchers(deltaTime);
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
        const wallWidth = options.wallWidth ?? 1.5;
        const ladderSide = options.ladderSide ?? 'right';
        const addDoor = options.addDoor ?? false;

        // Main wall body (stone blocks)
        const numBlocks = Math.floor(wallHeight / 0.8);
        for (let i = 0; i < numBlocks; i++) {
            const blockHeight = 0.8;
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
        wallGroup.position.set(x, baseY, 0);
        this.group.add(wallGroup);

        // Calculate actual visual top based on blocks (each 0.8 high, positioned at center)
        const actualVisualTop = baseY + (numBlocks * 0.8);

        // Add collision platform for the wall - matches actual visual top
        const platform = {
            mesh: wallGroup,
            bounds: {
                left: x - wallWidth / 2,
                right: x + wallWidth / 2,
                top: actualVisualTop, // Collision matches actual block positions
                bottom: baseY
            },
            type: 'wall'
        };

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
            isLadder: true // Special flag for climbing
        };

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
    addCastleFlag(x, baseY, wallHeight, color) {
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

        const flagBaseY = baseY + wallHeight - 0.2;
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
    addInteractiveFlag(x, baseY, wallHeight, color, team) {
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

        const flagBaseY = baseY + wallHeight - 0.2;
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
        this.addWallWithLadder(leftCastleX, groundSurfaceY, wallHeight, {
            wallWidth: castleWallWidth,
            ladderSide: 'right',
            addDoor: true
        });
        if (includeInteractiveFlags) {
            this.addInteractiveFlag(leftCastleX, groundSurfaceY, wallHeight, 0x2f6cb0, 'blue');
        }

        // Right castle
        const rightCastleX = 52;
        this.addWallWithLadder(rightCastleX, groundSurfaceY, wallHeight, {
            wallWidth: castleWallWidth,
            ladderSide: 'left',
            addDoor: true
        });
        if (includeInteractiveFlags) {
            this.addInteractiveFlag(rightCastleX, groundSurfaceY, wallHeight, 0xcc2f2f, 'red');
        }

        this.flagSpawns = {
            blue: { x: leftCastleX, y: groundSurfaceY + wallHeight + 0.6 },
            red: { x: rightCastleX, y: groundSurfaceY + wallHeight + 0.6 }
        };

        const boundaryWidth = 1.5;
        const boundaryTop = groundSurfaceY + wallHeight + 18;
        const boundaryBottom = groundBottomY;
        const leftBoundaryRight = leftCastleX - castleWallWidth / 2 - 4;
        const rightBoundaryLeft = rightCastleX + castleWallWidth / 2 + 4;

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

        // Large midfield cloud platform (stand-in)
        this.addPlatform(0, 18, 80, 1.2, 'cloud');

        // Catapult launchers on top of each castle (inside edge)
        const launcherHeight = groundSurfaceY + wallHeight + 0.6;
        const leftLauncherX = leftCastleX - castleWallWidth / 2 + 1.8;
        const rightLauncherX = rightCastleX + castleWallWidth / 2 - 1.8;
        const leftLauncher = this.addPlatform(leftLauncherX, launcherHeight, 4, 0.6, 'launcher');
        leftLauncher.launchVelocity = { x: 10, y: 23 };
        const rightLauncher = this.addPlatform(rightLauncherX, launcherHeight, 4, 0.6, 'launcher');
        rightLauncher.launchVelocity = { x: -10, y: 23 };
    }
}
