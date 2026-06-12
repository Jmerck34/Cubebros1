import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class StartAnimation {
    constructor(parentScene, camera, onFinish = null) {
        this.scene = parentScene;
        this.camera = camera;
        this.onFinish = onFinish;
        this.duration = 4200;
        this.logoOpacity = 0;
        this.heroSlideProgress = 0;
        this.previewIndex = 0;
        this.previewStartTime = 0;
        this.previewMesh = null;
        this.previewContainer = null;
        this.isRunning = false;

        this.logoGroup = new THREE.Group();
        this.logoGroup.name = 'Cubebros1 Start Animation Logo';
        this.scene.add(this.logoGroup);

        this.heroGroup = new THREE.Group();
        this.heroGroup.name = 'Cubebros1 Start Animation Heroes';
        this.scene.add(this.heroGroup);

        this.previewGroup = new THREE.Group();
        this.previewGroup.name = 'Cubebros1 Start Animation Ability Preview';
        this.scene.add(this.previewGroup);

        this.createLogo();
        this.createHeroSilhouettes();
    }

    createLogo() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#00e5ff');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#ff2bd6');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '900 116px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 12;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.strokeText('CUBEBROS1', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = gradient;
        ctx.fillText('CUBEBROS1', canvas.width / 2, canvas.height / 2);

        ctx.font = '700 34px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.fillText('THREEJS MOBA PLATFORMER', canvas.width / 2, canvas.height / 2 + 64);

        this.logoTexture = new THREE.CanvasTexture(canvas);
        this.logoTexture.colorSpace = THREE.SRGBColorSpace;

        const geometry = new THREE.PlaneGeometry(9.5, 2.35);
        const material = new THREE.MeshBasicMaterial({
            map: this.logoTexture,
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false
        });

        this.logoMesh = new THREE.Mesh(geometry, material);
        this.logoMesh.position.z = 5;
        this.logoGroup.add(this.logoMesh);

        const glowGeometry = new THREE.PlaneGeometry(10.2, 3.05);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.position.z = 4.9;
        this.logoGroup.add(this.glowMesh);
    }

    createHeroSilhouettes() {
        const heroData = [
            { name: 'SAMURAI', color: 0x7b1b1b, x: -4.2 },
            { name: 'ASSASSIN', color: 0x9400d3, x: -1.4 },
            { name: 'CYBORG', color: 0x9932cc, x: 1.4 },
            { name: 'WARLOCK', color: 0x111111, x: 4.2 }
        ];

        this.heroes = heroData.map((data, index) => {
            const group = new THREE.Group();
            group.name = data.name;
            group.position.set(data.x, -1.8, 0);
            group.userData.startX = data.x;
            group.userData.targetX = data.x;
            group.userData.targetY = -1.8;
            group.userData.color = data.color;
            group.userData.index = index;

            const bodyGeometry = new THREE.BoxGeometry(0.72, 1.55, 0.18);
            const bodyMaterial = new THREE.MeshBasicMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.88,
                depthTest: false,
                depthWrite: false
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 0.75;
            group.add(body);

            const headGeometry = new THREE.BoxGeometry(0.54, 0.54, 0.18);
            const head = new THREE.Mesh(headGeometry, bodyMaterial);
            head.position.y = 1.82;
            group.add(head);

            const weaponGeometry = new THREE.BoxGeometry(0.18, 1.1, 0.12);
            const weaponMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                depthTest: false,
                depthWrite: false
            });
            const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
            weapon.position.set(index % 2 === 0 ? 0.48 : -0.48, 0.85, 0.12);
            weapon.rotation.z = index % 2 === 0 ? -0.45 : 0.45;
            group.add(weapon);

            this.heroGroup.add(group);
            return group;
        });
    }

    play() {
        this.isRunning = true;
        this.startTime = performance.now();
        this.logoOpacity = 0;
        this.heroSlideProgress = 0;
        this.previewIndex = 0;
        this.previewStartTime = 0;
        this.previewMesh = null;
        this.previewContainer = null;

        this.logoGroup.visible = true;
        this.heroGroup.visible = true;
        this.previewGroup.visible = true;
        this.logoMesh.material.opacity = 0;
        this.glowMesh.material.opacity = 0;
        this.heroes.forEach((hero) => {
            hero.visible = false;
            hero.scale.set(0.75, 0.75, 1);
            hero.position.x = hero.userData.startX;
            hero.position.y = -1.8;
        });
        this.clearPreview();
        this.tick = this.tick.bind(this);
        requestAnimationFrame(this.tick);
    }

    tick(now) {
        if (!this.isRunning) return;

        const elapsed = now - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);

        if (progress < 0.18) {
            this.logoOpacity = this.easeOutCubic(progress / 0.18);
            this.logoMesh.material.opacity = this.logoOpacity;
            this.glowMesh.material.opacity = this.logoOpacity * 0.35 * (0.8 + 0.2 * Math.sin(progress * Math.PI * 8));
            this.logoMesh.scale.setScalar(1 + 0.08 * Math.sin(progress * Math.PI * 4));
        } else if (progress < 0.55) {
            this.logoMesh.material.opacity = 1;
            this.glowMesh.material.opacity = 0.35 * (0.8 + 0.2 * Math.sin(progress * Math.PI * 8));
            const slideProgress = this.easeOutBack((progress - 0.18) / 0.37);
            this.heroes.forEach((hero, index) => {
                hero.visible = true;
                hero.position.x = THREE.MathUtils.lerp(hero.userData.startX, hero.userData.targetX, slideProgress);
                hero.position.y = THREE.MathUtils.lerp(-2.3, hero.userData.targetY, slideProgress);
                hero.scale.setScalar(THREE.MathUtils.lerp(0.75, 1, slideProgress));
                hero.rotation.z = Math.sin(slideProgress * Math.PI * 2 + index) * 0.04;
            });
        } else if (progress < 0.9) {
            this.logoMesh.material.opacity = 1;
            this.glowMesh.material.opacity = 0.35;
            this.heroes.forEach((hero) => {
                hero.position.y = hero.userData.targetY + Math.sin(now * 0.004 + hero.userData.index) * 0.035;
            });
            this.updateAbilityPreview(progress);
        } else {
            const fadeProgress = this.easeInCubic((progress - 0.9) / 0.1);
            this.logoMesh.material.opacity = 1 - fadeProgress;
            this.glowMesh.material.opacity = (1 - fadeProgress) * 0.35;
            this.heroes.forEach((hero) => {
                hero.material && (hero.material.opacity = 1 - fadeProgress);
                hero.children.forEach((child) => {
                    if (child.material) {
                        child.material.opacity = Math.max(0, child.material.opacity - fadeProgress * 0.88);
                    }
                });
            });
            if (fadeProgress >= 1) {
                this.finish();
                return;
            }
        }

        requestAnimationFrame(this.tick);
    }

    updateAbilityPreview(progress) {
        const previewProgress = (progress - 0.55) / 0.35;
        const index = Math.min(this.heroes.length - 1, Math.floor(previewProgress * this.heroes.length));

        if (index !== this.previewIndex) {
            this.previewIndex = index;
            this.previewStartTime = performance.now();
            this.createAbilityPreview(index);
        }

        const localProgress = (performance.now() - this.previewStartTime) / 650;
        if (this.previewMesh) {
            this.previewMesh.scale.setScalar(0.6 + localProgress * 0.4);
            this.previewMesh.rotation.z += 0.08;
            if (this.previewMesh.material) {
                this.previewMesh.material.opacity = Math.max(0, 1 - Math.max(localProgress - 0.65, 0) * 2);
            }
        }
    }

    createAbilityPreview(index) {
        this.clearPreview();

        const hero = this.heroes[index];
        const color = hero.userData.color;
        const preview = new THREE.Group();
        preview.name = `Ability Preview ${index}`;
        this.previewGroup.add(preview);

        if (index === 0) {
            this.createSamuraiPreview(preview, color);
        } else if (index === 1) {
            this.createAssassinPreview(preview, color);
        } else if (index === 2) {
            this.createCyborgPreview(preview, color);
        } else {
            this.createWarlockPreview(preview, color);
        }

        this.previewContainer = preview;
        this.previewMesh = preview.children[0] || null;
    }

    createSamuraiPreview(preview, color) {
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false
        });
        const points = [];
        for (let i = 0; i < 24; i++) {
            const angle = (i / 23) * Math.PI * 1.35 - Math.PI * 0.65;
            points.push(new THREE.Vector3(Math.cos(angle) * 1.25, Math.sin(angle) * 1.25, 0));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.position.set(0.65, 0.85, 0.2);
        preview.add(line);
    }

    createAssassinPreview(preview, color) {
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false
        });
        const points = [];
        for (let i = 0; i < 32; i++) {
            const angle = (i / 31) * Math.PI * 2;
            if ((angle > Math.PI / 4 && angle < (3 * Math.PI) / 4) ||
                (angle > (5 * Math.PI) / 4 && angle < (7 * Math.PI) / 4)) continue;
            points.push(new THREE.Vector3(Math.cos(angle) * 1.1, Math.sin(angle) * 1.1, 0));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.position.set(-0.65, 0.85, 0.2);
        preview.add(line);
    }

    createCyborgPreview(preview, color) {
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false
        });
        const geometry = new THREE.SphereGeometry(0.28, 16, 16);
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(0, 0.85, 0.2);
        preview.add(sphere);
    }

    createWarlockPreview(preview, color) {
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false
        });
        const points = [
            new THREE.Vector3(-0.55, 1.25, 0),
            new THREE.Vector3(-0.25, 0.95, 0),
            new THREE.Vector3(0, 1.18, 0),
            new THREE.Vector3(0.25, 0.78, 0),
            new THREE.Vector3(0.55, 1.05, 0)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.position.set(0, 0.85, 0.2);
        preview.add(line);
    }

    clearPreview() {
        while (this.previewGroup.children.length > 0) {
            const child = this.previewGroup.children.pop();
            child.traverse((node) => {
                if (node.geometry) node.geometry.dispose();
                if (node.material) node.material.dispose();
            });
        }
        this.previewMesh = null;
        this.previewContainer = null;
    }

    finish() {
        this.isRunning = false;
        this.logoGroup.visible = false;
        this.heroGroup.visible = false;
        this.previewGroup.visible = false;
        this.clearPreview();
        if (typeof this.onFinish === 'function') {
            this.onFinish();
        }
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInCubic(t) {
        return t * t * t;
    }

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
}
