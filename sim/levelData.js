export function buildTestLevelData() {
    const platforms = [];
    const movingPlatforms = [];

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

    addPlatform(platforms, (groundLeft + gapEdges[0].left) / 2, groundCenterY, gapEdges[0].left - groundLeft, groundHeight, 'ground');
    addPlatform(platforms, (gapEdges[0].right + gapEdges[1].left) / 2, groundCenterY, gapEdges[1].left - gapEdges[0].right, groundHeight, 'ground');
    addPlatform(platforms, (gapEdges[1].right + gapEdges[2].left) / 2, groundCenterY, gapEdges[2].left - gapEdges[1].right, groundHeight, 'ground');
    addPlatform(platforms, (gapEdges[2].right + groundRight) / 2, groundCenterY, groundRight - gapEdges[2].right, groundHeight, 'ground');

    const wallHeight = 10.5;
    const castleWallWidth = 7;
    const leftCastleX = -60;
    const rightCastleX = 60;

    addWallPlatform(platforms, leftCastleX, groundSurfaceY, wallHeight, castleWallWidth);
    addWallPlatform(platforms, rightCastleX, groundSurfaceY, wallHeight, castleWallWidth);

    const boundaryWidth = 1.5;
    const boundaryTop = groundSurfaceY + wallHeight + 6;
    const boundaryBottom = groundBottomY;
    const leftBoundaryRight = leftCastleX - castleWallWidth / 2;
    const rightBoundaryLeft = rightCastleX + castleWallWidth / 2;

    platforms.push({
        type: 'wall',
        bounds: {
            left: leftBoundaryRight - boundaryWidth,
            right: leftBoundaryRight,
            top: boundaryTop,
            bottom: boundaryBottom
        }
    });

    platforms.push({
        type: 'wall',
        bounds: {
            left: rightBoundaryLeft,
            right: rightBoundaryLeft + boundaryWidth,
            top: boundaryTop,
            bottom: boundaryBottom
        }
    });

    const movingGapY = 1.4;
    const movingPlatform1 = addMovingPlatform(platforms, gapCenters[0], movingGapY, 3.5, 0.6, {
        rangeX: 3.5,
        rangeY: 0,
        speed: 1.1,
        phase: 0
    });
    movingPlatform1.id = 'mp0';
    movingPlatforms.push(movingPlatform1);
    const movingPlatform2 = addMovingPlatform(platforms, gapCenters[2], movingGapY, 3.5, 0.6, {
        rangeX: 3.5,
        rangeY: 0,
        speed: 1.0,
        phase: Math.PI / 2
    });
    movingPlatform2.id = 'mp1';
    movingPlatforms.push(movingPlatform2);

    addPlatform(platforms, 0, 1, 6, 0.6, 'grass');
    addPlatform(platforms, -12, -0.5, 4, 0.6, 'stone');
    addPlatform(platforms, 12, -0.5, 4, 0.6, 'stone');
    addPlatform(platforms, -6, 2.5, 3, 0.6, 'grass');
    addPlatform(platforms, 6, 2.5, 3, 0.6, 'grass');

    const enemies = [
        { id: 'e1', type: 'goomba', x: 8, y: 0 },
        { id: 'e2', type: 'goomba', x: -7, y: 0 },
        { id: 'e3', type: 'goomba', x: 12, y: 3 },
        { id: 'e4', type: 'goomba', x: -17, y: 3 },
        { id: 'e5', type: 'goomba', x: 18, y: 0 }
    ];

    return {
        platforms,
        movingPlatforms,
        groundSurfaceY,
        enemies,
        flagSpawns: {
            blue: { x: leftCastleX, y: groundSurfaceY + wallHeight + 0.6 },
            red: { x: rightCastleX, y: groundSurfaceY + wallHeight + 0.6 }
        }
    };
}

function addPlatform(list, centerX, centerY, width, height, type) {
    if (!width || !height) return;
    list.push({
        type,
        bounds: {
            left: centerX - width / 2,
            right: centerX + width / 2,
            top: centerY + height / 2,
            bottom: centerY - height / 2
        }
    });
}

function addWallPlatform(list, x, baseY, wallHeight, wallWidth) {
    const numBlocks = Math.floor(wallHeight / 0.8);
    const actualVisualTop = baseY + (numBlocks * 0.8);
    list.push({
        type: 'wall',
        bounds: {
            left: x - wallWidth / 2,
            right: x + wallWidth / 2,
            top: actualVisualTop,
            bottom: baseY
        }
    });
}

function addMovingPlatform(list, centerX, centerY, width, height, motion) {
    const platform = {
        type: 'moving',
        bounds: {
            left: centerX - width / 2,
            right: centerX + width / 2,
            top: centerY + height / 2,
            bottom: centerY - height / 2
        },
        baseX: centerX,
        baseY: centerY,
        width,
        height,
        rangeX: motion.rangeX ?? 0,
        rangeY: motion.rangeY ?? 0,
        speed: motion.speed ?? 1.2,
        phase: motion.phase ?? 0,
        time: 0,
        prevX: centerX,
        prevY: centerY,
        deltaX: 0,
        deltaY: 0
    };
    list.push(platform);
    return platform;
}
