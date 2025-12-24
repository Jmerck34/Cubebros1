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
    }

    /**
     * Create layered background with parallax
     */
    createBackground() {
        // Sky gradient (multiple layers for depth)
        const skyLayers = [
            { color: 0x87ceeb, z: -50, opacity: 1 },    // Light blue - far
            { color: 0x5c94fc, z: -40, opacity: 0.8 },  // Medium blue
            { color: 0x4a7fc9, z: -30, opacity: 0.6 }   // Darker blue - near
        ];

        skyLayers.forEach(layer => {
            const skyGeometry = new THREE.PlaneGeometry(200, 100);
            const skyMaterial = new THREE.MeshBasicMaterial({
                color: layer.color,
                transparent: true,
                opacity: layer.opacity
            });
            const sky = new THREE.Mesh(skyGeometry, skyMaterial);
            sky.position.z = layer.z;
            this.scene.add(sky);
        });

        // Add sun/moon
        this.createSun();

        // Add mountains in background
        this.createMountains();

        // Add clouds
        this.createClouds();

        // Add floating particles
        this.createParticles();

        // Add stars (dim, background)
        this.createStars();
    }

    /**
     * Create sun in background
     */
    createSun() {
        const sunGeometry = new THREE.CircleGeometry(3, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(-20, 15, -45);
        this.scene.add(sun);

        // Sun glow
        const glowGeometry = new THREE.CircleGeometry(4, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(-20, 15, -45.5);
        this.scene.add(glow);
    }

    /**
     * Create mountain silhouettes
     */
    createMountains() {
        // Far mountains (dark silhouettes)
        for (let i = 0; i < 5; i++) {
            const points = [];
            const baseX = -60 + i * 30;
            const height = 15 + Math.random() * 10;

            // Create mountain shape
            points.push(new THREE.Vector2(baseX - 15, -10));
            points.push(new THREE.Vector2(baseX - 7, height));
            points.push(new THREE.Vector2(baseX, height - 5));
            points.push(new THREE.Vector2(baseX + 7, height));
            points.push(new THREE.Vector2(baseX + 15, -10));

            const mountainShape = new THREE.Shape(points);
            const mountainGeometry = new THREE.ShapeGeometry(mountainShape);
            const mountainMaterial = new THREE.MeshBasicMaterial({
                color: 0x2d3e50,
                transparent: true,
                opacity: 0.6
            });
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            mountain.position.z = -35 - i * 2;
            this.scene.add(mountain);
        }
    }

    /**
     * Create animated clouds
     */
    createClouds() {
        for (let i = 0; i < 8; i++) {
            const cloud = this.createCloud();
            cloud.position.set(
                -40 + Math.random() * 80,
                5 + Math.random() * 15,
                -20 - Math.random() * 15
            );
            cloud.userData.speed = 0.2 + Math.random() * 0.3;
            this.clouds.push(cloud);
            this.scene.add(cloud);
        }
    }

    /**
     * Create single cloud
     */
    createCloud() {
        const cloudGroup = new THREE.Group();

        // Cloud is made of multiple circles
        const puffs = [
            { x: 0, y: 0, size: 1 },
            { x: -0.8, y: 0.2, size: 0.8 },
            { x: 0.8, y: 0.2, size: 0.8 },
            { x: -0.3, y: 0.5, size: 0.6 },
            { x: 0.3, y: 0.5, size: 0.6 }
        ];

        puffs.forEach(puff => {
            const puffGeometry = new THREE.CircleGeometry(puff.size, 16);
            const puffMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            });
            const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
            puffMesh.position.set(puff.x, puff.y, 0);
            cloudGroup.add(puffMesh);
        });

        return cloudGroup;
    }

    /**
     * Create floating particles (fireflies, dust, etc.)
     */
    createParticles() {
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
                -5 + Math.random() * 20,
                -10 + Math.random() * 5
            );

            particle.userData.speed = {
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.3) * 0.1
            };
            particle.userData.initialY = particle.position.y;
            particle.userData.time = Math.random() * Math.PI * 2;

            this.particles.push(particle);
            this.scene.add(particle);
        }
    }

    /**
     * Create stars in background
     */
    createStars() {
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
                -5 + Math.random() * 30,
                -48
            );

            star.userData.twinkleSpeed = 0.5 + Math.random() * 1;
            star.userData.time = Math.random() * Math.PI * 2;

            this.stars.push(star);
            this.scene.add(star);
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
            if (cloud.position.x > 50) {
                cloud.position.x = -50;
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
