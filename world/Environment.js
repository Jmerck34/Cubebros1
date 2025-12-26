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
