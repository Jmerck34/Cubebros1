import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { checkAABBCollision, resolveCollisionY, resolveCollisionX } from '../utils/collision.js';

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
                bodyColor = 0x8f563b;  // Warm dirt
                topColor = 0x2fa65c;   // Lush grass
                sideColor = 0x6d3f2a;  // Dark dirt
                break;
            case 'stone':
                bodyColor = 0x808080;  // Gray stone
                topColor = 0x696969;   // Darker gray
                sideColor = 0x505050;  // Very dark gray
                break;
            case 'grass':
            default:
                bodyColor = 0x7e4b32;  // Brown
                topColor = 0x3bbb6b;   // Bright grass
                sideColor = 0x5f3a28;  // Dark brown
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
                    color: 0x2f8f4e,
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
                    color: 0x6f3b29,
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
                    color: 0x505050,
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
            type: type
        };

        this.platforms.push(platform);
        return platform;
    }

    /**
     * Check and resolve collisions with platforms
     * @param {Player} player - Player instance
     */
    checkCollisions(player) {
        const playerBounds = player.getBounds();
        const playerVelocity = player.velocity;
        let onLadder = false;
        let onWall = false;

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
                    resolveCollisionY(player.position, platform.bounds, playerVelocity);
                    player.velocity.y = 0;
                    player.isGrounded = true;
                    player.mesh.position.y = player.position.y;
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

                    // Ladder physics: allow climbing up/down with W/S keys
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

                        // Climb down with S
                        if (player.input.isKeyDown('KeyS') || player.input.isKeyDown('ArrowDown')) {
                            player.velocity.y = -3; // Climb down speed
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
                    resolveCollisionY(player.position, platform.bounds, playerVelocity);
                    player.velocity.y = 0;
                    player.isGrounded = true;
                    player.mesh.position.y = player.position.y;
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
     * Add a decorative wall with ladder
     * @param {number} x - Center X position
     * @param {number} baseY - Base Y position (ground level)
     * @param {number} wallHeight - Total height of the wall
     */
    addWallWithLadder(x, baseY, wallHeight) {
        const wallGroup = new THREE.Group();
        const wallWidth = 1.5;

        // Main wall body (stone blocks)
        const numBlocks = Math.floor(wallHeight / 0.8);
        for (let i = 0; i < numBlocks; i++) {
            const blockHeight = 0.8;
            const blockY = i * blockHeight;

            // Stone block
            const blockGeometry = new THREE.BoxGeometry(wallWidth, blockHeight, 0.8);
            const blockMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
            const block = new THREE.Mesh(blockGeometry, blockMaterial);
            block.position.y = blockY;
            wallGroup.add(block);

            // Block mortar lines (darker)
            const mortarGeometry = new THREE.BoxGeometry(wallWidth + 0.05, 0.05, 0.82);
            const mortarMaterial = new THREE.MeshBasicMaterial({ color: 0x404040 });
            const mortar = new THREE.Mesh(mortarGeometry, mortarMaterial);
            mortar.position.y = blockY + blockHeight/2;
            wallGroup.add(mortar);

            // Stone texture detail (lighter spots)
            if (Math.random() > 0.5) {
                const spotGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.81);
                const spotMaterial = new THREE.MeshBasicMaterial({
                    color: 0x909090,
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
        const ladderX = wallWidth/2 + 0.3; // Position ladder on right side of wall
        const ladderWidth = 0.5;
        const ladderDepth = 0.15;
        const ladderHeight = wallHeight - 0.5; // Ladder stops 0.5 units below wall top

        // Left rail - positioned in front of wall (Z > 0.4)
        const leftRailGeometry = new THREE.BoxGeometry(0.08, ladderHeight, ladderDepth);
        const railMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown wood
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
            const rungMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Darker brown
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

        // Decorative vines growing on the wall
        const numVines = 3;
        for (let i = 0; i < numVines; i++) {
            const vineX = (Math.random() - 0.5) * wallWidth * 0.8;
            const vineSegments = Math.floor(Math.random() * 5) + 3;

            for (let j = 0; j < vineSegments; j++) {
                const vineY = (j / vineSegments) * wallHeight + Math.random() * 0.3;
                const vineGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.05);
                const vineMaterial = new THREE.MeshBasicMaterial({
                    color: 0x2F4F2F,
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
                        color: 0x228B22,
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
                left: x + wallWidth/2 + 0.05, // Right side of wall
                right: x + wallWidth/2 + 0.85, // Width of ladder
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
     * Create a test level with floating platforms
     */
    createTestLevel() {
        // Main ground platform (ground type with grass)
        const groundSurfaceY = -2.5;
        const groundBottomY = -10;
        const groundHeight = groundSurfaceY - groundBottomY;
        const groundCenterY = groundSurfaceY - groundHeight / 2;
        this.addPlatform(0, groundCenterY, 100, groundHeight, 'ground');

        // Floating grass platforms (thin)
        this.addPlatform(5, 0, 3, 0.5, 'grass');
        this.addPlatform(10, 2, 3, 0.5, 'grass');
        this.addPlatform(-5, 1, 4, 0.5, 'grass');

        // Stone platforms (taller, for walls/obstacles)
        this.addPlatform(15, -1, 2, 3, 'stone');    // Tall stone wall on right
        this.addPlatform(20, -2, 1.5, 2, 'stone');  // Medium stone platform

        // DECORATIVE WALL WITH LADDER (left side) - raised by half a brick
        this.addWallWithLadder(-12, -2.6, 7);       // 7 units tall, base raised 0.4 units (half brick)
                                                     // Ladder stops 0.5 units below top for easier climbing

        // More variety
        this.addPlatform(-17, 2, 5, 0.5, 'grass');   // Far left floating (moved left to avoid wall)
        this.addPlatform(25, 1, 3, 0.5, 'stone');    // Far right stone
        this.addPlatform(0, 4, 4, 0.5, 'grass');     // High center platform
    }
}
