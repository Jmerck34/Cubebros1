import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * SlimeBase - Animated slime character with shader effects
 * Base class for all slime heroes
 * @class SlimeBase
 */
export class SlimeBase {
    constructor(scene, color = 0x00ff00, position = { x: 0, y: 0 }) {
        this.scene = scene;
        this.color = color;
        this.position = position;

        // Animation state
        this.time = 0;
        this.bouncePhase = 0;
        this.isMoving = false;
        this.facingDirection = 1; // 1 = right, -1 = left
        this.wasInAir = false;
        this.landingSquashTime = 0;
        this.blinkTimer = 0;
        this.blinkInterval = 3 + Math.random() * 2;
        this.isBlinking = false;

        // Create slime group
        this.slimeGroup = new THREE.Group();

        // Create slime body with shader
        this.createSlimeBody();

        // Create facial features
        this.createFace();

        // Position the group
        this.slimeGroup.position.set(position.x, position.y, 0);
        scene.add(this.slimeGroup);
    }

    /**
     * Create the main slime body with animated shader (gloopy anime style!)
     */
    createSlimeBody() {
        const shared = SlimeBase.getSharedResources();

        // Main slime body (sphere) - higher poly for smooth wobbles
        const bodyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                slimeColor: { value: new THREE.Color(this.color) },
                time: { value: 0 },
                bounce: { value: 1.0 },
                gloopiness: { value: 1.2 },
                opacity: { value: 0.88 }
            },
            vertexShader: shared.shaders.vertex,
            fragmentShader: shared.shaders.fragment,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.slimeBody = new THREE.Mesh(shared.geometries.body, bodyMaterial);
        this.slimeUniforms = bodyMaterial.uniforms;
        this.slimeBody.position.y = 0;
        this.slimeGroup.add(this.slimeBody);

        // Add glossy highlight sphere
        this.highlight = new THREE.Mesh(shared.geometries.highlight, shared.materials.highlight);
        this.highlight.position.set(-0.15, 0.25, 0.4);
        this.slimeBody.add(this.highlight);

        // Add secondary smaller highlight
        const highlight2 = new THREE.Mesh(shared.geometries.highlightSmall, shared.materials.highlightSecondary);
        highlight2.position.set(0.1, 0.3, 0.38);
        this.slimeBody.add(highlight2);
    }

    /**
     * Create cute face on the slime
     */
    createFace() {
        const shared = SlimeBase.getSharedResources();

        // Left eye
        this.leftEye = new THREE.Mesh(shared.geometries.eye, shared.materials.eye);
        this.leftEye.position.set(-0.15, 0.1, 0.45);
        this.slimeBody.add(this.leftEye);

        // Right eye
        this.rightEye = new THREE.Mesh(shared.geometries.eye, shared.materials.eye);
        this.rightEye.position.set(0.15, 0.1, 0.45);
        this.slimeBody.add(this.rightEye);

        // Pupils
        this.leftPupil = new THREE.Mesh(shared.geometries.pupil, shared.materials.pupil);
        this.leftPupil.position.set(0, 0, 0.08);
        this.leftEye.add(this.leftPupil);

        this.rightPupil = new THREE.Mesh(shared.geometries.pupil, shared.materials.pupil);
        this.rightPupil.position.set(0, 0, 0.08);
        this.rightEye.add(this.rightPupil);

        // Eye sparkles
        const leftSparkle = new THREE.Mesh(shared.geometries.sparkle, shared.materials.sparkle);
        leftSparkle.position.set(0.03, 0.03, 0.09);
        this.leftEye.add(leftSparkle);

        const rightSparkle = new THREE.Mesh(shared.geometries.sparkle, shared.materials.sparkle);
        rightSparkle.position.set(0.03, 0.03, 0.09);
        this.rightEye.add(rightSparkle);

        // Cute smile (arc shape)
        this.smile = new THREE.Mesh(shared.geometries.smile, shared.materials.smile);
        this.smile.position.set(0, -0.1, 0.48);
        this.smile.scale.set(1, 0.5, 1);
        this.slimeBody.add(this.smile);

        // Store for animations
        this.faceElements = {
            leftEye: this.leftEye,
            rightEye: this.rightEye,
            leftPupil: this.leftPupil,
            rightPupil: this.rightPupil,
            smile: this.smile
        };
    }

    /**
     * Update slime animations - GLOOPY ANIME STYLE!
     */
    updateAnimation(deltaTime, velocity = { x: 0, y: 0 }, isGrounded = true) {
        this.time += deltaTime;
        const velX = velocity?.x ?? 0;
        const velY = velocity?.y ?? 0;
        const uniforms = this.slimeUniforms;

        // Update shader time
        if (uniforms) {
            uniforms.time.value = this.time;
        }

        // Determine if moving
        this.isMoving = Math.abs(velX) > 0.1;

        // Update facing direction
        if (velX < -0.1) {
            this.facingDirection = -1;
        } else if (velX > 0.1) {
            this.facingDirection = 1;
        }

        // Flip slime to face direction
        this.slimeGroup.scale.x = this.facingDirection;

        // Check for landing (before movement animations)
        if (isGrounded && this.wasInAir) {
            this.playLandingSquash();
        }
        this.wasInAir = !isGrounded;

        // LANDING SQUASH ANIMATION (overrides other animations!)
        if (this.landingSquashTime > 0) {
            this.landingSquashTime -= deltaTime;

            // Extreme squash effect (big SPLAT!)
            const squashProgress = 1.0 - (this.landingSquashTime / 0.2);
            const squashAmount = Math.sin(squashProgress * Math.PI); // Smooth in/out

            this.slimeBody.scale.y = 0.4 + squashAmount * 0.6; // Pancake flat!
            this.slimeBody.scale.x = 1.6 - squashAmount * 0.6; // Spread out wide
            this.slimeBody.scale.z = 1.6 - squashAmount * 0.6;
            this.slimeBody.position.y = -0.05; // Sink into ground slightly

            // Eyes go wide from impact
            if (this.leftEye && this.rightEye) {
                this.leftEye.scale.x = 1.2;
                this.rightEye.scale.x = 1.2;
                this.leftEye.scale.y = 0.6;
                this.rightEye.scale.y = 0.6;
            }

            // Smile squishes
            if (this.smile) {
                this.smile.scale.y = 0.3;
            }

            // Extra gloopy shader effect on impact
            if (uniforms) {
                uniforms.bounce.value = 2.0;
                uniforms.gloopiness.value = 2.5;
            }

            return; // Skip other animations during landing squash
        }

        // HOPPING ANIMATION when grounded and moving (like Dragon Quest slimes!)
        if (isGrounded && this.isMoving) {
            this.bouncePhase += deltaTime * 10; // Faster bouncing
            const hopCycle = Math.sin(this.bouncePhase);
            const hop = Math.max(0, hopCycle); // Only positive values (upward hop)

            // Extreme squash and stretch (very gloopy!)
            this.slimeBody.scale.y = 0.7 + hop * 0.6; // Squash down, stretch up
            this.slimeBody.scale.x = 1.3 - hop * 0.4; // Compensate width
            this.slimeBody.scale.z = 1.3 - hop * 0.4;

            // Big hop movement (slimes hop when they move!)
            this.slimeBody.position.y = hop * 0.2;

            // Rotate slightly forward/back during hop (like momentum)
            this.slimeBody.rotation.x = Math.sin(this.bouncePhase) * 0.1;

            // Update shader bounce intensity
            if (uniforms) {
                uniforms.bounce.value = 1.0 + hop;
                uniforms.gloopiness.value = 1.5; // Extra gloopy when moving
            }

            // Jiggle the eyes with movement
            if (this.leftEye && this.rightEye) {
                const jiggle = Math.sin(this.time * 12) * 0.02;
                this.leftEye.position.y = 0.1 + jiggle;
                this.rightEye.position.y = 0.1 + jiggle;
            }
        } else if (!isGrounded) {
            // IN AIR - Teardrop shape (falling slime!)
            const fallSpeed = Math.max(-velY, 0);
            const stretchAmount = Math.min(fallSpeed * 0.15, 0.5);

            this.slimeBody.scale.y = 1.2 + stretchAmount; // Stretch vertically
            this.slimeBody.scale.x = 0.85 - stretchAmount * 0.3;
            this.slimeBody.scale.z = 0.85 - stretchAmount * 0.3;
            this.slimeBody.position.y = 0;

            // Slight rotation based on velocity
            this.slimeBody.rotation.x = velY * 0.1;

            if (uniforms) {
                uniforms.bounce.value = 0.3;
                uniforms.gloopiness.value = 0.8; // Less wobble in air
            }

            // Eyes look worried when falling fast
            if (this.leftEye && this.rightEye && velY < -5) {
                this.leftEye.scale.y = 1.2;
                this.rightEye.scale.y = 1.2;
            }
        } else {
            // IDLE - Gentle pulsing breathing (like a living blob)
            const breathe = Math.sin(this.time * 2.5) * 0.08;
            const pulse = Math.sin(this.time * 1.5) * 0.03;

            this.slimeBody.scale.y = 1.0 + breathe;
            this.slimeBody.scale.x = 1.0 - breathe * 0.5 + pulse;
            this.slimeBody.scale.z = 1.0 - breathe * 0.5 - pulse;
            this.slimeBody.position.y = Math.abs(breathe) * 0.03;

            // Very subtle rotation (slime settling)
            this.slimeBody.rotation.x = Math.sin(this.time * 0.5) * 0.02;

            if (uniforms) {
                uniforms.bounce.value = Math.abs(breathe) + 0.5;
                uniforms.gloopiness.value = 1.0;
            }

            // Eyes back to normal
            if (this.leftEye && this.rightEye) {
                this.leftEye.scale.y = 1.0;
                this.rightEye.scale.y = 1.0;
            }
        }

        // Eye blink animation
        this.updateBlink(deltaTime);

        // Pupil tracking (follow movement direction) - anime eye movement!
        const pupilOffset = this.isMoving ? 0.03 : 0;
        const pupilY = velY > 5 ? 0.02 : (velY < -5 ? -0.02 : 0); // Look up when jumping, down when falling

        this.leftPupil.position.x = pupilOffset * this.facingDirection;
        this.rightPupil.position.x = pupilOffset * this.facingDirection;
        this.leftPupil.position.y = pupilY;
        this.rightPupil.position.y = pupilY;

        // Smile animation - expressive!
        if (this.isMoving) {
            // Happy excited bounce when moving (like happy slime!)
            this.smile.scale.y = 0.6 + Math.sin(this.time * 10) * 0.15;
            this.smile.position.y = -0.1 + Math.abs(Math.sin(this.time * 5)) * 0.02;
        } else if (!isGrounded && velY < -5) {
            // Worried "O" mouth when falling fast
            this.smile.scale.y = 0.8;
            this.smile.scale.x = 0.8;
        } else {
            // Normal cute smile
            this.smile.scale.y = 0.5;
            this.smile.scale.x = 1.0;
            this.smile.position.y = -0.1;
        }
    }

    /**
     * Play a gloopy landing squash animation (like hitting jello!)
     */
    playLandingSquash() {
        // Create a brief extreme squash effect
        this.landingSquashTime = 0.2;
    }

    /**
     * Blink animation
     */
    updateBlink(deltaTime) {
        this.blinkTimer += deltaTime;

        if (!this.isBlinking && this.blinkTimer >= this.blinkInterval) {
            this.isBlinking = true;
            this.blinkTimer = 0;
            this.blinkInterval = 3 + Math.random() * 2;
        }

        if (this.isBlinking) {
            const blinkProgress = this.blinkTimer / 0.15;

            if (blinkProgress < 0.5) {
                // Closing
                const closeAmount = blinkProgress * 2;
                this.leftEye.scale.y = 1 - closeAmount * 0.9;
                this.rightEye.scale.y = 1 - closeAmount * 0.9;
            } else if (blinkProgress < 1) {
                // Opening
                const openAmount = (blinkProgress - 0.5) * 2;
                this.leftEye.scale.y = 0.1 + openAmount * 0.9;
                this.rightEye.scale.y = 0.1 + openAmount * 0.9;
            } else {
                // Complete
                this.isBlinking = false;
                this.blinkTimer = 0;
                this.leftEye.scale.y = 1;
                this.rightEye.scale.y = 1;
            }
        }
    }

    /**
     * Get the slime group (replaces mesh in Player class)
     */
    getSlimeGroup() {
        return this.slimeGroup;
    }

    /**
     * Update position
     */
    setPosition(x, y, z = 0) {
        this.slimeGroup.position.set(x, y, z);
    }

    /**
     * Destroy slime
     */
    destroy() {
        this.scene.remove(this.slimeGroup);
    }

    /**
     * Shared geometries/materials/shaders for all slimes
     */
    static getSharedResources() {
        if (SlimeBase.sharedResources) {
            return SlimeBase.sharedResources;
        }

        const shaders = {
            vertex: `
                uniform float time;
                uniform float bounce;
                uniform float gloopiness;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vUv = uv;
                    vNormal = normal;
                    vPosition = position;

                    vec3 pos = position;

                    // Multi-layered wobble (Dragon Quest style!)
                    float wobble1 = sin(time * 3.0 + position.y * 5.0) * 0.08;
                    float wobble2 = cos(time * 4.5 + position.x * 4.0) * 0.06;
                    float wobble3 = sin(time * 2.0 + position.z * 6.0) * 0.04;

                    pos.x += (wobble1 + wobble2) * bounce * gloopiness;
                    pos.z += wobble3 * bounce * gloopiness;

                    // Vertical jiggle (like jello!)
                    pos.y *= 1.0 + sin(time * 6.0 + position.x * 3.0) * 0.12 * bounce;

                    // Ripple effect from bottom (gloopy dripping)
                    float ripple = sin(time * 5.0 - position.y * 8.0) * 0.03;
                    pos.x += ripple * (1.0 - vUv.y) * gloopiness;
                    pos.z += ripple * (1.0 - vUv.y) * 0.5 * gloopiness;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragment: `
                uniform vec3 slimeColor;
                uniform float time;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    // Base color with gradient (Rimuru style!)
                    vec3 color = slimeColor;

                    // Glossy top shine (anime highlight)
                    float shine = smoothstep(0.2, 0.9, vUv.y);
                    color = mix(color, color * 1.8, shine * 0.4);

                    // Animated gel bubbles moving through the slime
                    float bubble1 = sin(vUv.x * 15.0 + time * 3.0) * sin(vUv.y * 15.0 - time * 2.0);
                    float bubble2 = cos(vUv.x * 20.0 - time * 4.0) * cos(vUv.y * 10.0 + time * 3.0);
                    float bubbles = (bubble1 + bubble2) * 0.15;
                    color += bubbles;

                    // Flowing liquid effect
                    float flow = sin(vUv.y * 8.0 - time * 2.5) * 0.1;
                    color += flow;

                    // Subsurface scattering effect (light passing through)
                    float sss = pow(1.0 - vUv.y, 2.0) * 0.3;
                    color += vec3(sss * 0.5, sss * 0.3, sss * 0.5);

                    // Strong rim lighting (cartoon outline effect)
                    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                    rim = pow(rim, 2.5);
                    color += rim * 0.5;

                    // Sparkle effect (magical slime!)
                    float sparkle = sin(vUv.x * 50.0 + time * 10.0) * sin(vUv.y * 50.0 - time * 8.0);
                    sparkle = step(0.98, sparkle) * 0.5;
                    color += vec3(sparkle);

                    gl_FragColor = vec4(color, opacity);
                }
            `
        };

        const geometries = {
            body: new THREE.SphereGeometry(0.5, 48, 48),
            highlight: new THREE.SphereGeometry(0.15, 16, 16),
            highlightSmall: new THREE.SphereGeometry(0.08, 16, 16),
            eye: new THREE.SphereGeometry(0.12, 16, 16),
            pupil: new THREE.SphereGeometry(0.06, 16, 16),
            sparkle: new THREE.SphereGeometry(0.03, 8, 8),
            smile: (() => {
                const smileShape = new THREE.Shape();
                smileShape.absarc(0, 0, 0.15, Math.PI, 0, true);
                return new THREE.ShapeGeometry(smileShape);
            })()
        };

        const materials = {
            highlight: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
            highlightSecondary: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }),
            eye: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            pupil: new THREE.MeshBasicMaterial({ color: 0x000000 }),
            sparkle: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            smile: new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
        };

        SlimeBase.sharedResources = { shaders, geometries, materials };
        return SlimeBase.sharedResources;
    }
}
