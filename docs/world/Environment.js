import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Environment - Creates immersive background and atmosphere
 * @class Environment
 */
export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.stars = [];
        this.particles = [];
        this.backgroundYOffset = 2;
        this.parallaxLayers = [];
    }

    /**
     * Create layered background with parallax
     */
    createBackground() {
        this.parallaxLayers = [];
        this.clouds = [];
        this.particles = [];
        this.stars = [];

        // Tiled sky layers (slow parallax)
        const skyLayers = [
            { color: 0x87d9f7, z: -55, opacity: 1, speedMultiplier: 0.12 },
            { color: 0x6bc3ea, z: -45, opacity: 0.9, speedMultiplier: 0.2 },
            { color: 0x4aa7d5, z: -35, opacity: 0.8, speedMultiplier: 0.3 },
            { color: 0x3b8fbe, z: -28, opacity: 0.7, speedMultiplier: 0.4 }
        ];

        skyLayers.forEach(layer => {
            const sky = this.createTiledPlaneLayer(layer.color, layer.z, layer.opacity, 220, 120, 3);
            this.registerParallaxLayer({
                root: sky.group,
                speedMultiplier: layer.speedMultiplier,
                tileWidth: sky.tileWidth,
                tiles: sky.tiles
            });
        });

        // Atmospheric haze bands for depth
        const hazeGroup = new THREE.Group();
        this.scene.add(hazeGroup);
        this.createHazeBands(hazeGroup);
        this.registerParallaxLayer({ root: hazeGroup, speedMultiplier: 0.55 });

        // Sun and glow
        const sunGroup = new THREE.Group();
        this.scene.add(sunGroup);
        this.createSun(sunGroup);
        this.registerParallaxLayer({ root: sunGroup, speedMultiplier: 0.35 });

        // Stars (very slow)
        const starGroup = new THREE.Group();
        this.scene.add(starGroup);
        this.createStars(starGroup);
        this.registerParallaxLayer({ root: starGroup, speedMultiplier: 0.15 });

        // Mountains (layered depth)
        this.createMountains();

        // Hills (stacked depth layers)
        const hillConfigs = [
            { color: 0x6ea0ad, z: -42, baseY: -1.0, amplitude: 1.6, thickness: 5.5, opacity: 0.3, speedMultiplier: 0.45 },
            { color: 0x5a8b8a, z: -34, baseY: -2.4, amplitude: 1.9, thickness: 6, opacity: 0.45, speedMultiplier: 0.6 },
            { color: 0x3f6b55, z: -26, baseY: -3.2, amplitude: 2.2, thickness: 6.5, opacity: 0.6, speedMultiplier: 0.75 },
            { color: 0x2f5a43, z: -18, baseY: -4.4, amplitude: 1.8, thickness: 6.5, opacity: 0.75, speedMultiplier: 0.9 },
            { color: 0x254735, z: -12, baseY: -5.6, amplitude: 1.3, thickness: 5.5, opacity: 0.85, speedMultiplier: 1.0 },
            { color: 0x1b3a2b, z: -6, baseY: -6.6, amplitude: 1.0, thickness: 5, opacity: 0.95, speedMultiplier: 1.15 }
        ];

        hillConfigs.forEach(config => {
            const hillGroup = new THREE.Group();
            this.scene.add(hillGroup);
            this.createHills(
                config.color,
                config.z,
                config.baseY + this.backgroundYOffset,
                config.amplitude,
                config.thickness,
                config.opacity,
                hillGroup
            );
            this.registerParallaxLayer({ root: hillGroup, speedMultiplier: config.speedMultiplier });
        });

        // Clouds (multiple parallax layers)
        this.createClouds();

        // Floating particles (near-mid depth)
        const particleGroup = new THREE.Group();
        this.scene.add(particleGroup);
        this.createParticles(particleGroup);
        this.registerParallaxLayer({ root: particleGroup, speedMultiplier: 0.9 });

        // Stylized clown silhouette (background accent)
        const clownGroup = new THREE.Group();
        this.scene.add(clownGroup);
        this.createClownSilhouette(clownGroup);
        this.registerParallaxLayer({ root: clownGroup, speedMultiplier: 0.5 });
    }

    /**
     * Store parallax layer config for manager hookup.
     * @param {Object} config
     */
    registerParallaxLayer(config) {
        this.parallaxLayers.push(config);
    }

    /**
     * Expose parallax layers for external manager.
     * @returns {Array}
     */
    getParallaxLayers() {
        return this.parallaxLayers;
    }

    /**
     * Create a horizontally tiled plane layer.
     */
    createTiledPlaneLayer(color, z, opacity, width, height, tileCount = 3) {
        const group = new THREE.Group();
        const tiles = [];
        const startX = -Math.floor(tileCount / 2) * width;

        for (let i = 0; i < tileCount; i++) {
            const tileGeometry = new THREE.PlaneGeometry(width, height);
            const tileMaterial = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity
            });
            const tile = new THREE.Mesh(tileGeometry, tileMaterial);
            tile.position.set(startX + i * width, this.backgroundYOffset, z);
            group.add(tile);
            tiles.push(tile);
        }

        this.scene.add(group);
        return { group, tiles, tileWidth: width };
    }

    createCanyonSky() {
        const skyGroup = new THREE.Group();
        this.scene.add(skyGroup);

        const bands = [
            { color: BACKGROUND_PALETTE.blue, y: 24, height: 26 },
            { color: BACKGROUND_PALETTE.teal, y: 14, height: 22 },
            { color: BACKGROUND_PALETTE.mint, y: 4, height: 20 },
            { color: BACKGROUND_PALETTE.peach, y: -6, height: 20 },
            { color: BACKGROUND_PALETTE.mint, y: -16, height: 18 },
            { color: BACKGROUND_PALETTE.teal, y: -26, height: 16 }
        ];

        bands.forEach((band, index) => {
            const geometry = new THREE.PlaneGeometry(260, band.height);
            const material = new THREE.MeshBasicMaterial({ color: band.color });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, band.y + this.backgroundYOffset, -70 + index * 0.4);
            skyGroup.add(mesh);
        });

        this.registerParallaxLayer({ root: skyGroup, speedMultiplier: 0.08 });
    }

    createCanyonSun() {
        const sunGroup = new THREE.Group();
        this.scene.add(sunGroup);

        const sun = new THREE.Mesh(
            new THREE.CircleGeometry(4.2, 36),
            new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.peach })
        );
        sun.position.set(18, 6 + this.backgroundYOffset, -64);
        sunGroup.add(sun);

        const glow = new THREE.Mesh(
            new THREE.CircleGeometry(6.5, 36),
            new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.mint, transparent: true, opacity: 0.32 })
        );
        glow.position.set(18, 6 + this.backgroundYOffset, -64.2);
        sunGroup.add(glow);

        const glare = new THREE.Mesh(
            new THREE.PlaneGeometry(32, 2.4),
            new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.peach, transparent: true, opacity: 0.2 })
        );
        glare.position.set(18, 3.5 + this.backgroundYOffset, -64.3);
        sunGroup.add(glare);

        this.registerParallaxLayer({ root: sunGroup, speedMultiplier: 0.12 });
    }

    createSkyStreaks() {
        const streakGroup = new THREE.Group();
        this.scene.add(streakGroup);

        for (let i = 0; i < 7; i++) {
            const width = 30 + Math.random() * 30;
            const height = 1.6 + Math.random() * 1.4;
            const streak = new THREE.Mesh(
                new THREE.PlaneGeometry(width, height),
                new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.mint, transparent: true, opacity: 0.12 })
            );
            streak.rotation.z = (-0.12 + Math.random() * 0.24);
            streak.position.set(
                -50 + Math.random() * 100,
                8 + Math.random() * 16 + this.backgroundYOffset,
                -60 + Math.random() * 8
            );
            streakGroup.add(streak);
        }

        this.registerParallaxLayer({ root: streakGroup, speedMultiplier: 0.18 });
    }

    createMesaRanges() {
        const farGroup = new THREE.Group();
        this.scene.add(farGroup);
        this.createMesaLayer(farGroup, BACKGROUND_PALETTE.blue, -54, -6 + this.backgroundYOffset, 6, 12, 18);
        this.registerParallaxLayer({ root: farGroup, speedMultiplier: 0.2 });

        const midGroup = new THREE.Group();
        this.scene.add(midGroup);
        this.createMesaLayer(midGroup, BACKGROUND_PALETTE.teal, -40, -10 + this.backgroundYOffset, 7, 14, 20);
        this.registerParallaxLayer({ root: midGroup, speedMultiplier: 0.35 });

        const nearGroup = new THREE.Group();
        this.scene.add(nearGroup);
        this.createMesaLayer(nearGroup, BACKGROUND_PALETTE.green, -28, -14 + this.backgroundYOffset, 8, 16, 22);
        this.registerParallaxLayer({ root: nearGroup, speedMultiplier: 0.5 });
    }

    createMesaLayer(targetGroup, color, z, baseY, heightMin, heightMax, segments) {
        const points = [];
        const startX = -130;
        const endX = 130;
        const step = (endX - startX) / segments;
        const floorY = baseY - 26;

        points.push(new THREE.Vector2(startX, floorY));

        for (let i = 0; i < segments; i++) {
            const x0 = startX + i * step;
            const x1 = startX + (i + 1) * step;
            const plateau = baseY + heightMin + Math.random() * (heightMax - heightMin);
            points.push(new THREE.Vector2(x0, plateau));
            points.push(new THREE.Vector2(x1, plateau));
            if (Math.random() > 0.6) {
                points.push(new THREE.Vector2(x1, plateau - (1 + Math.random() * 2)));
            }
        }

        points.push(new THREE.Vector2(endX, floorY));

        const shape = new THREE.Shape(points);
        const mesh = new THREE.Mesh(
            new THREE.ShapeGeometry(shape),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
        );
        mesh.position.z = z;
        targetGroup.add(mesh);

        const highlight = new THREE.Mesh(
            new THREE.PlaneGeometry(260, 1.2),
            new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.peach, transparent: true, opacity: 0.1 })
        );
        highlight.position.set(0, baseY + heightMax - 1.2, z + 0.2);
        targetGroup.add(highlight);
    }

    createCanyonSpireField() {
        const spireGroup = new THREE.Group();
        this.scene.add(spireGroup);

        for (let i = 0; i < 18; i++) {
            const height = 6 + Math.random() * 9;
            const width = 1.4 + Math.random() * 2;
            const shape = new THREE.Shape();
            shape.moveTo(0, height);
            shape.lineTo(width / 2, 0);
            shape.lineTo(-width / 2, 0);
            shape.closePath();

            const spire = new THREE.Mesh(
                new THREE.ShapeGeometry(shape),
                new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.blue })
            );
            spire.position.set(-120 + i * 13 + Math.random() * 4, -6 + this.backgroundYOffset, -18);
            spireGroup.add(spire);
        }

        this.registerParallaxLayer({ root: spireGroup, speedMultiplier: 0.75 });
    }

    createDuneForeground() {
        const duneGroup = new THREE.Group();
        this.scene.add(duneGroup);

        const points = [];
        const startX = -130;
        const endX = 130;
        const step = 10;
        points.push(new THREE.Vector2(startX, -18));
        for (let x = startX; x <= endX; x += step) {
            const y = -16 + Math.sin((x + 20) * 0.04) * 3 + Math.random() * 1.2;
            points.push(new THREE.Vector2(x, y));
        }
        points.push(new THREE.Vector2(endX, -30));

        const shape = new THREE.Shape(points);
        const dune = new THREE.Mesh(
            new THREE.ShapeGeometry(shape),
            new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.green })
        );
        dune.position.set(0, this.backgroundYOffset, -6);
        duneGroup.add(dune);

        this.registerParallaxLayer({ root: duneGroup, speedMultiplier: 1.1 });
    }

    createDustParticles() {
        const dustGroup = new THREE.Group();
        this.scene.add(dustGroup);

        for (let i = 0; i < 36; i++) {
            const particleGeometry = new THREE.CircleGeometry(0.06 + Math.random() * 0.06, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: BACKGROUND_PALETTE.peach,
                transparent: true,
                opacity: 0.35 + Math.random() * 0.3
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            particle.position.set(
                -60 + Math.random() * 120,
                -8 + Math.random() * 18 + this.backgroundYOffset,
                -10 + Math.random() * 6
            );

            particle.userData.speed = {
                x: 0.02 + Math.random() * 0.06,
                y: 0.02 + Math.random() * 0.04
            };
            particle.userData.initialY = particle.position.y;
            particle.userData.time = Math.random() * Math.PI * 2;

            this.particles.push(particle);
            dustGroup.add(particle);
        }

        this.registerParallaxLayer({ root: dustGroup, speedMultiplier: 0.9 });
    }

    createSkyGliders() {
        const gliderGroup = new THREE.Group();
        this.scene.add(gliderGroup);
        this.registerParallaxLayer({ root: gliderGroup, speedMultiplier: 0.4 });

        for (let i = 0; i < 5; i++) {
            const body = new THREE.Mesh(
                new THREE.PlaneGeometry(2.4, 0.6),
                new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.peach })
            );
            const wing = new THREE.Mesh(
                new THREE.PlaneGeometry(3.6, 0.4),
                new THREE.MeshBasicMaterial({ color: BACKGROUND_PALETTE.blue })
            );
            wing.position.set(0, -0.3, 0.02);

            const glider = new THREE.Group();
            glider.add(body);
            glider.add(wing);

            glider.position.set(-50 + Math.random() * 100, 6 + Math.random() * 10 + this.backgroundYOffset, -32);
            glider.userData.speed = 0.05 + Math.random() * 0.08;
            glider.userData.wrapLimit = 70;
            this.clouds.push(glider);
            gliderGroup.add(glider);
        }
    }

    createPixelSky() {
        const skyGroup = new THREE.Group();
        this.scene.add(skyGroup);

        const bands = [
            { color: 0x3c79b9, y: 20, height: 28 },
            { color: 0x4d8bc6, y: 8, height: 26 },
            { color: 0x64a4d5, y: -4, height: 24 },
            { color: 0x7fb9e4, y: -14, height: 22 },
            { color: 0x97cfee, y: -24, height: 20 }
        ];

        bands.forEach((band, index) => {
            const geometry = new THREE.PlaneGeometry(260, band.height);
            const material = new THREE.MeshBasicMaterial({ color: band.color });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, band.y + this.backgroundYOffset, -60 + index * 0.4);
            skyGroup.add(mesh);
        });

        this.registerParallaxLayer({ root: skyGroup, speedMultiplier: 0.08 });
    }

    createPixelMountains() {
        const farGroup = new THREE.Group();
        this.scene.add(farGroup);
        this.createPixelMountainRange(farGroup, 0x9fc6e8, -48, -2 + this.backgroundYOffset, 6, 12, 10, 0.9);
        this.registerParallaxLayer({ root: farGroup, speedMultiplier: 0.2 });

        const midGroup = new THREE.Group();
        this.scene.add(midGroup);
        this.createPixelMountainRange(midGroup, 0x7aaad5, -36, -6 + this.backgroundYOffset, 7, 16, 8, 0.95);
        this.registerParallaxLayer({ root: midGroup, speedMultiplier: 0.35 });
    }

    createPixelMountainRange(targetGroup, color, z, baseY, heightMin, heightMax, step, opacity) {
        const points = [];
        const startX = -130;
        const endX = 130;
        const floorY = baseY - 26;

        points.push(new THREE.Vector2(startX, floorY));
        for (let x = startX; x <= endX; x += step) {
            const height = heightMin + Math.random() * (heightMax - heightMin);
            points.push(new THREE.Vector2(x, baseY + height));
        }
        points.push(new THREE.Vector2(endX, floorY));

        const shape = new THREE.Shape(points);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = z;
        targetGroup.add(mesh);

        const snowColor = new THREE.MeshBasicMaterial({
            color: 0xeaf6ff,
            transparent: true,
            opacity: 0.85
        });
        for (let x = startX + step * 0.5; x <= endX; x += step * 2.4) {
            const capWidth = 6 + Math.random() * 4;
            const capHeight = 3 + Math.random() * 2;
            const cap = new THREE.Mesh(new THREE.PlaneGeometry(capWidth, capHeight), snowColor);
            cap.position.set(x, baseY + heightMax - 1.5 + Math.random() * 1.5, z + 0.2);
            targetGroup.add(cap);
        }
    }

    createPixelClouds() {
        const layerConfigs = [
            { count: 4, z: -44, yMin: 10, yMax: 18, scaleMin: 1.0, scaleMax: 1.4, speedMin: 0.02, speedMax: 0.05, speed: 0.18 },
            { count: 6, z: -30, yMin: 8, yMax: 16, scaleMin: 0.8, scaleMax: 1.2, speedMin: 0.05, speedMax: 0.1, speed: 0.45 }
        ];

        layerConfigs.forEach(layer => {
            const cloudGroup = new THREE.Group();
            this.scene.add(cloudGroup);
            this.registerParallaxLayer({ root: cloudGroup, speedMultiplier: layer.speed });

            for (let i = 0; i < layer.count; i++) {
                const cloud = this.createPixelCloud(0xf3fbff, 0xd6e8f5);
                const scale = layer.scaleMin + Math.random() * (layer.scaleMax - layer.scaleMin);
                cloud.scale.set(scale, scale, 1);
                cloud.position.set(
                    -60 + Math.random() * 120,
                    layer.yMin + Math.random() * (layer.yMax - layer.yMin) + this.backgroundYOffset,
                    layer.z
                );
                cloud.userData.speed = layer.speedMin + Math.random() * (layer.speedMax - layer.speedMin);
                cloud.userData.wrapLimit = 80;
                this.clouds.push(cloud);
                cloudGroup.add(cloud);
            }
        });
    }

    createPixelCloud(baseColor, shadowColor) {
        const cloudGroup = new THREE.Group();
        const blocks = [
            { x: -2.4, y: 0.2, w: 2.6, h: 1.2 },
            { x: -0.6, y: 0.8, w: 3.4, h: 1.8 },
            { x: 1.8, y: 0.1, w: 2.8, h: 1.3 },
            { x: 0.2, y: -0.2, w: 4.6, h: 1.4 }
        ];

        blocks.forEach(block => {
            const shadow = new THREE.Mesh(
                new THREE.PlaneGeometry(block.w, block.h),
                new THREE.MeshBasicMaterial({ color: shadowColor, transparent: true, opacity: 0.45 })
            );
            shadow.position.set(block.x + 0.2, block.y - 0.25, -0.01);
            cloudGroup.add(shadow);
        });

        blocks.forEach(block => {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(block.w, block.h),
                new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.85 })
            );
            mesh.position.set(block.x, block.y, 0);
            cloudGroup.add(mesh);
        });

        return cloudGroup;
    }

    createPixelForest() {
        const farForest = new THREE.Group();
        this.scene.add(farForest);
        this.createForestLayer(farForest, 0x7fbf8a, 0x6da97a, -22, -8 + this.backgroundYOffset, 26, 2.8, 5.8);
        this.registerParallaxLayer({ root: farForest, speedMultiplier: 0.55 });

        const midForest = new THREE.Group();
        this.scene.add(midForest);
        this.createForestLayer(midForest, 0x4d8f5f, 0x3f7a51, -14, -10 + this.backgroundYOffset, 30, 3.2, 6.8);
        this.registerParallaxLayer({ root: midForest, speedMultiplier: 0.8 });

        const frontForest = new THREE.Group();
        this.scene.add(frontForest);
        this.createForestLayer(frontForest, 0x2f6b45, 0x255437, -6, -13 + this.backgroundYOffset, 34, 3.6, 7.6);
        this.registerParallaxLayer({ root: frontForest, speedMultiplier: 1.05 });
    }

    createForestLayer(targetGroup, treeColor, trunkColor, z, baseY, count, heightMin, heightMax) {
        const groundBand = new THREE.Mesh(
            new THREE.PlaneGeometry(260, 18),
            new THREE.MeshBasicMaterial({ color: treeColor })
        );
        groundBand.position.set(0, baseY - 8, z - 0.2);
        targetGroup.add(groundBand);

        for (let i = 0; i < count; i++) {
            const treeHeight = heightMin + Math.random() * (heightMax - heightMin);
            const treeWidth = treeHeight * (0.55 + Math.random() * 0.2);
            const x = -120 + (240 / count) * i + (Math.random() * 2 - 1);
            const tree = this.createPineTree(treeColor, trunkColor, treeWidth, treeHeight);
            tree.position.set(x, baseY + Math.random() * 2, z);
            targetGroup.add(tree);
        }
    }

    createPineTree(treeColor, trunkColor, width, height) {
        const treeGroup = new THREE.Group();
        const triangle = new THREE.Shape();
        triangle.moveTo(0, height);
        triangle.lineTo(width / 2, 0);
        triangle.lineTo(-width / 2, 0);
        triangle.closePath();

        const foliage = new THREE.Mesh(
            new THREE.ShapeGeometry(triangle),
            new THREE.MeshBasicMaterial({ color: treeColor })
        );
        foliage.position.set(0, height * 0.2, 0);
        treeGroup.add(foliage);

        const trunk = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 0.2, height * 0.35),
            new THREE.MeshBasicMaterial({ color: trunkColor })
        );
        trunk.position.set(0, -height * 0.05, 0.01);
        treeGroup.add(trunk);

        return treeGroup;
    }


    createSkyJet() {
        const jetGroup = new THREE.Group();
        this.scene.add(jetGroup);

        const body = new THREE.Mesh(
            new THREE.PlaneGeometry(4.6, 1.1),
            new THREE.MeshBasicMaterial({ color: 0xe8eef2 })
        );
        body.position.set(0, 0, 0);
        jetGroup.add(body);

        const nose = new THREE.Mesh(
            new THREE.PlaneGeometry(1.4, 0.8),
            new THREE.MeshBasicMaterial({ color: 0xf2a9a9 })
        );
        nose.position.set(2.6, 0, 0.01);
        jetGroup.add(nose);

        const wing = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x3b3f45 })
        );
        wing.position.set(-0.6, -0.2, 0.02);
        jetGroup.add(wing);

        const tail = new THREE.Mesh(
            new THREE.PlaneGeometry(1.1, 0.6),
            new THREE.MeshBasicMaterial({ color: 0x30343a })
        );
        tail.position.set(-2.2, 0.15, 0.02);
        jetGroup.add(tail);

        jetGroup.position.set(-10, 10 + this.backgroundYOffset, -40);
        jetGroup.scale.set(0.6, 0.6, 1);

        this.registerParallaxLayer({ root: jetGroup, speedMultiplier: 0.28 });
    }

    /**
     * Create sun in background
     */
    createSun(targetGroup = this.scene) {
        const sunGeometry = new THREE.CircleGeometry(2.6, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd48a,
            transparent: true,
            opacity: 0.8
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(-20, 15 + this.backgroundYOffset, -45);
        targetGroup.add(sun);

        // Sun glow
        const glowGeometry = new THREE.CircleGeometry(3.6, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd48a,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(-20, 15 + this.backgroundYOffset, -45.5);
        targetGroup.add(glow);
    }

    /**
     * Create mountain silhouettes
     */
    createMountains() {
        const farGroup = new THREE.Group();
        this.scene.add(farGroup);
        this.createMountainLayer(
            farGroup,
            0x7aa0b5,
            -48,
            -1.0 + this.backgroundYOffset,
            5,
            7,
            12,
            0.35,
            30
        );
        this.registerParallaxLayer({ root: farGroup, speedMultiplier: 0.35 });

        const midGroup = new THREE.Group();
        this.scene.add(midGroup);
        this.createMountainLayer(
            midGroup,
            0x4b6a77,
            -38,
            -3.0 + this.backgroundYOffset,
            5,
            9,
            16,
            0.55,
            30
        );
        this.registerParallaxLayer({ root: midGroup, speedMultiplier: 0.5 });
    }

    /**
     * Create a mountain layer with shared palette
     */
    createMountainLayer(targetGroup, color, z, baseY, count, heightMin, heightMax, opacity, spacing) {
        for (let i = 0; i < count; i++) {
            const points = [];
            const baseX = -70 + i * spacing;
            const height = heightMin + Math.random() * (heightMax - heightMin);
            const width = 16 + Math.random() * 8;
            const floorY = baseY - 8;

            points.push(new THREE.Vector2(baseX - width, floorY));
            points.push(new THREE.Vector2(baseX - width * 0.45, baseY + height * 0.55));
            points.push(new THREE.Vector2(baseX, baseY + height));
            points.push(new THREE.Vector2(baseX + width * 0.6, baseY + height * 0.6));
            points.push(new THREE.Vector2(baseX + width, floorY));

            const mountainShape = new THREE.Shape(points);
            const mountainGeometry = new THREE.ShapeGeometry(mountainShape);
            const mountainMaterial = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity
            });
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            mountain.position.z = z - i * 0.6;
            targetGroup.add(mountain);
        }
    }

    /**
     * Create rolling hills for depth layers
     */
    createHills(color, z, baseY, amplitude, thickness, opacity, targetGroup = this.scene) {
        const points = [];
        const startX = -70;
        const endX = 70;
        const segments = 18;
        const step = (endX - startX) / segments;

        points.push(new THREE.Vector2(startX, baseY - thickness));
        for (let i = 0; i <= segments; i++) {
            const x = startX + i * step;
            const wave = Math.sin(i * 0.7 + Math.random() * 0.3) * amplitude;
            points.push(new THREE.Vector2(x, baseY + wave));
        }
        points.push(new THREE.Vector2(endX, baseY - thickness));

        const hillShape = new THREE.Shape(points);
        const hillGeometry = new THREE.ShapeGeometry(hillShape);
        const hillMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity
        });
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.z = z;
        targetGroup.add(hill);
    }

    /**
     * Create soft haze bands to push distant layers back
     */
    createHazeBands(targetGroup = this.scene) {
        const bands = [
            { color: 0xbfe8fb, y: -1 + this.backgroundYOffset, height: 16, z: -32, opacity: 0.12 },
            { color: 0xb1def4, y: -3 + this.backgroundYOffset, height: 14, z: -24, opacity: 0.14 },
            { color: 0xa3d2ee, y: -5 + this.backgroundYOffset, height: 12, z: -16, opacity: 0.16 }
        ];

        bands.forEach(band => {
            const hazeGeometry = new THREE.PlaneGeometry(200, band.height);
            const hazeMaterial = new THREE.MeshBasicMaterial({
                color: band.color,
                transparent: true,
                opacity: band.opacity
            });
            const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
            haze.position.set(0, band.y, band.z);
            targetGroup.add(haze);
        });
    }

    /**
     * Create animated clouds
     */
    createClouds() {
        const layers = [
            {
                count: 6,
                zMin: -48,
                zMax: -40,
                yMin: 10,
                yMax: 18,
                scaleMin: 0.6,
                scaleMax: 0.9,
                speedMin: 0.04,
                speedMax: 0.09,
                parallaxSpeed: 0.25,
                baseColor: 0xe6f6ff,
                shadowColor: 0xbcd7e8,
                highlightColor: 0xffffff,
                opacity: 0.55
            },
            {
                count: 6,
                zMin: -34,
                zMax: -26,
                yMin: 8,
                yMax: 16,
                scaleMin: 0.9,
                scaleMax: 1.3,
                speedMin: 0.1,
                speedMax: 0.18,
                parallaxSpeed: 0.6,
                baseColor: 0xf2fbff,
                shadowColor: 0xc8e1ef,
                highlightColor: 0xffffff,
                opacity: 0.7
            },
            {
                count: 4,
                zMin: -22,
                zMax: -14,
                yMin: 6,
                yMax: 12,
                scaleMin: 1.2,
                scaleMax: 1.7,
                speedMin: 0.16,
                speedMax: 0.26,
                parallaxSpeed: 1.15,
                baseColor: 0xffffff,
                shadowColor: 0xd3e8f2,
                highlightColor: 0xffffff,
                opacity: 0.8
            }
        ];

        layers.forEach(layer => {
            const cloudGroup = new THREE.Group();
            this.scene.add(cloudGroup);
            this.registerParallaxLayer({ root: cloudGroup, speedMultiplier: layer.parallaxSpeed });

            for (let i = 0; i < layer.count; i++) {
                const cloud = this.createCloud(
                    layer.baseColor,
                    layer.shadowColor,
                    layer.highlightColor,
                    layer.opacity
                );
                const scale = layer.scaleMin + Math.random() * (layer.scaleMax - layer.scaleMin);
                cloud.scale.set(scale, scale, 1);
                cloud.position.set(
                    -50 + Math.random() * 100,
                    layer.yMin + Math.random() * (layer.yMax - layer.yMin) + this.backgroundYOffset,
                    layer.zMin + Math.random() * (layer.zMax - layer.zMin)
                );
                cloud.userData.speed = layer.speedMin + Math.random() * (layer.speedMax - layer.speedMin);
                cloud.userData.wrapLimit = 70;
                this.clouds.push(cloud);
                cloudGroup.add(cloud);
            }
        });
    }

    /**
     * Create a soft, layered cloud with shadow and highlight
     */
    createCloud(baseColor, shadowColor, highlightColor, baseOpacity) {
        const cloudGroup = new THREE.Group();
        const segments = 12;

        const puffs = [
            { x: -1.6, y: 0.2, r: 0.85 },
            { x: -0.7, y: 0.5, r: 1.05 },
            { x: 0.4, y: 0.55, r: 1.0 },
            { x: 1.4, y: 0.2, r: 0.8 },
            { x: 0.1, y: -0.1, r: 1.15 }
        ];

        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: shadowColor,
            transparent: true,
            opacity: baseOpacity * 0.6
        });
        const baseMaterial = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: baseOpacity
        });
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: highlightColor,
            transparent: true,
            opacity: baseOpacity * 0.85
        });

        puffs.forEach(puff => {
            const geometry = new THREE.CircleGeometry(puff.r, segments);
            const shadow = new THREE.Mesh(geometry, shadowMaterial);
            shadow.position.set(puff.x, puff.y - 0.22, -0.02);
            cloudGroup.add(shadow);
        });

        puffs.forEach(puff => {
            const geometry = new THREE.CircleGeometry(puff.r, segments);
            const mesh = new THREE.Mesh(geometry, baseMaterial);
            mesh.position.set(puff.x, puff.y, 0);
            cloudGroup.add(mesh);
        });

        const highlights = [
            { x: -0.5, y: 0.8, r: 0.55 },
            { x: 0.7, y: 0.75, r: 0.5 }
        ];
        highlights.forEach(puff => {
            const geometry = new THREE.CircleGeometry(puff.r, segments);
            const highlight = new THREE.Mesh(geometry, highlightMaterial);
            highlight.position.set(puff.x, puff.y, 0.01);
            cloudGroup.add(highlight);
        });

        return cloudGroup;
    }

    /**
     * Create floating particles (fireflies, dust, etc.)
     */
    createParticles(targetGroup = this.scene) {
        for (let i = 0; i < 30; i++) {
            const particleGeometry = new THREE.CircleGeometry(0.05, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff99,
                transparent: true,
                opacity: 0.6
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            particle.position.set(
                -30 + Math.random() * 60,
                -5 + Math.random() * 20 + this.backgroundYOffset,
                -10 + Math.random() * 5
            );

            particle.userData.speed = {
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.3) * 0.1
            };
            particle.userData.initialY = particle.position.y;
            particle.userData.time = Math.random() * Math.PI * 2;

            this.particles.push(particle);
            targetGroup.add(particle);
        }
    }

    /**
     * Create stars in background
     */
    createStars(targetGroup = this.scene) {
        for (let i = 0; i < 50; i++) {
            const starGeometry = new THREE.CircleGeometry(0.08, 4);
            const starMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3 + Math.random() * 0.3
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);

            star.position.set(
                -50 + Math.random() * 100,
                -5 + Math.random() * 30 + this.backgroundYOffset,
                -48
            );

            star.userData.twinkleSpeed = 0.5 + Math.random() * 1;
            star.userData.time = Math.random() * Math.PI * 2;

            this.stars.push(star);
            targetGroup.add(star);
        }
    }

    /**
     * Create a simple stylized clown silhouette for the background.
     */
    createClownSilhouette(targetGroup) {
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.35
        });

        const head = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), material);
        head.position.set(0, 2.4, -20);
        targetGroup.add(head);

        const hairLeft = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), material);
        hairLeft.position.set(-1.1, 2.3, -20);
        targetGroup.add(hairLeft);

        const hairRight = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), material);
        hairRight.position.set(1.1, 2.3, -20);
        targetGroup.add(hairRight);

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.1), material);
        body.position.set(0, 0.6, -20);
        targetGroup.add(body);

        const collar = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.1, 8), material);
        collar.position.set(0, 1.5, -20);
        collar.rotation.z = Math.PI / 8;
        targetGroup.add(collar);

        const eyeLeft = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), material.clone());
        eyeLeft.material.opacity = 0.6;
        eyeLeft.position.set(-0.35, 2.55, -19.9);
        targetGroup.add(eyeLeft);

        const eyeRight = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), material.clone());
        eyeRight.material.opacity = 0.6;
        eyeRight.position.set(0.35, 2.55, -19.9);
        targetGroup.add(eyeRight);

        const smile = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 18, Math.PI), material.clone());
        smile.material.opacity = 0.5;
        smile.position.set(0, 2.1, -19.9);
        smile.rotation.x = Math.PI;
        targetGroup.add(smile);

        targetGroup.position.set(36, 6 + this.backgroundYOffset, -20);
        targetGroup.scale.set(2.6, 2.6, 1);
    }

    /**
     * Update animated elements
     */
    update(deltaTime) {
        // Animate clouds
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * deltaTime;

            // Wrap around
            const wrapLimit = cloud.userData.wrapLimit || 50;
            if (cloud.position.x > wrapLimit) {
                cloud.position.x = -wrapLimit;
            }
        });

        // Animate particles (floating motion)
        this.particles.forEach(particle => {
            particle.userData.time += deltaTime;
            particle.position.x += particle.userData.speed.x;
            particle.position.y = particle.userData.initialY + Math.sin(particle.userData.time) * 0.5;

            // Wrap around
            if (particle.position.x > 30) particle.position.x = -30;
            if (particle.position.x < -30) particle.position.x = 30;

            // Pulse opacity
            particle.material.opacity = 0.4 + Math.sin(particle.userData.time * 2) * 0.2;
        });

        // Twinkle stars
        this.stars.forEach(star => {
            star.userData.time += deltaTime * star.userData.twinkleSpeed;
            star.material.opacity = 0.2 + Math.sin(star.userData.time) * 0.2;
        });
    }
}
