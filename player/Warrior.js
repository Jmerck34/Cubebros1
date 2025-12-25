import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Hero } from './Hero.js';
import { Ability } from './Ability.js';
import { checkAABBCollision } from '../utils/collision.js';

/**
 * Warrior Hero - Melee fighter with sword and shield
 * @class Warrior
 */
export class Warrior extends Hero {
    constructor(scene, startX = 0, startY = 0) {
        super(scene, startX, startY);

        // Change body color to blue (warrior theme)
        this.setBodyColor(0x2f6cb0);

        // Add sword and shield
        this.createEquipment(scene);
        this.addWarriorCrest();

        // Enemy reference (set by main.js)
        this.enemies = [];

        // Facing direction (1 = right, -1 = left)
        this.facingDirection = 1;

        // Set warrior abilities
        this.initializeAbilities();
    }

    /**
     * Create sword and shield visuals
     * @param {THREE.Scene} scene - The scene
     */
    createEquipment(scene) {
        // Create SWORD - Composite blade + handle + crossguard
        this.swordGroup = new THREE.Group();

        // Handle (brown leather) - at origin, this is what the warrior grips
        const handleGeometry = new THREE.BoxGeometry(0.12, 0.4, 0.08);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, 0, 0);
        this.swordGroup.add(handle);

        // Pommel (gold) - below handle
        const pommelGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const pommelMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
        pommel.position.set(0, -0.25, 0);
        this.swordGroup.add(pommel);

        // Crossguard (gold) - above handle
        const crossguardGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.08);
        const crossguardMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const crossguard = new THREE.Mesh(crossguardGeometry, crossguardMaterial);
        crossguard.position.set(0, 0.25, 0);
        this.swordGroup.add(crossguard);

        // Blade (silver/steel color, long and thin) - extends upward from crossguard
        const bladeGeometry = new THREE.BoxGeometry(0.15, 1.2, 0.05);
        const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, 0.85, 0); // Blade extends upward
        this.swordGroup.add(blade);

        // Blade edge highlight (brighter for steel effect)
        const edgeGeometry = new THREE.BoxGeometry(0.08, 1.2, 0.06);
        const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.set(0, 0.85, 0);
        this.swordGroup.add(edge);

        // Position sword on right side at hip level, rotated clockwise
        this.swordGroup.position.set(0.5, -0.2, 0.1);
        this.swordGroup.rotation.z = -0.87; // ~50 degrees clockwise (blade points forward-down)
        this.mesh.add(this.swordGroup);
        this.sword = this.swordGroup; // Keep reference

        // Create SHIELD - Rounded medieval shield
        this.shieldGroup = new THREE.Group();

        // Main shield body (silver/steel with blue accent)
        const shieldGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.08);
        const shieldMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1 }); // Royal blue
        const shieldBody = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldGroup.add(shieldBody);

        // Shield border (silver)
        const borderGeometry = new THREE.BoxGeometry(0.55, 0.75, 0.06);
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xc0c0c0 });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = -0.01;
        this.shieldGroup.add(border);

        // Shield boss (center gold bump)
        const bossGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
        const bossMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const boss = new THREE.Mesh(bossGeometry, bossMaterial);
        boss.position.z = 0.05;
        this.shieldGroup.add(boss);

        // Position shield on left side
        this.shieldGroup.position.set(-0.6, 0, 0.1);
        this.mesh.add(this.shieldGroup);
        this.shield = this.shieldGroup; // Keep reference
    }

    /**
     * Add a shield crest to the chest
     */
    addWarriorCrest() {
        const crestGroup = new THREE.Group();

        const crestBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.34, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x1e2a44 })
        );
        crestBase.position.set(0, 0.05, 0.56);
        crestGroup.add(crestBase);

        const crossVertical = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.24, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        crossVertical.position.set(0, 0.05, 0.58);
        crestGroup.add(crossVertical);

        const crossHorizontal = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.06, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        crossHorizontal.position.set(0, 0.05, 0.58);
        crestGroup.add(crossHorizontal);

        this.mesh.add(crestGroup);
    }

    /**
     * Initialize warrior abilities
     */
    initializeAbilities() {
        // Q - Sword Slash (short cooldown)
        const swordSlash = new Ability('Sword Slash', 1);
        swordSlash.use = (hero) => {
            if (!Ability.prototype.use.call(swordSlash, hero)) return false;

            // Animate sword slash
            hero.swordSlashAttack();
            return true;
        };

        // W - Shield Bash (medium cooldown)
        const shieldBash = new Ability('Shield Bash', 4);
        shieldBash.use = (hero) => {
            if (!Ability.prototype.use.call(shieldBash, hero)) return false;

            // Shield bash effect
            hero.shieldBashAttack();
            return true;
        };

        // E - Dash (mobility)
        const dash = new Ability('Dash', 4);
        dash.use = (hero) => {
            if (!Ability.prototype.use.call(dash, hero)) return false;

            // Dash forward
            hero.dashForward();
            return true;
        };

        // R - Whirlwind Ultimate (no cooldown, only charge requirement)
        const whirlwind = new Ability('Whirlwind', 0, true);
        whirlwind.use = (hero) => {
            // Ultimates don't use cooldown, they use charge
            // So we skip the base class cooldown check
            hero.whirlwindUltimate();
            return true;
        };

        this.setAbilities(swordSlash, shieldBash, dash, whirlwind);
    }

    /**
     * Sword Slash Attack - Q Ability
     */
    swordSlashAttack() {
        console.log('⚔️ SWORD SLASH!');

        // Save original rotation
        const originalRot = -0.87; // ~50 degrees clockwise

        // Wind up - pull sword back (rotate counterclockwise)
        this.sword.rotation.z = -0.2; // Pull back slightly

        setTimeout(() => {
            // Slash forward in arc - swing all the way down (rotate clockwise)
            this.sword.rotation.z = -2.2; // Swing down almost to ground

            // Create crescent moon slash effect that damages
            this.createCrescentSlash(true);
        }, 100);

        setTimeout(() => {
            // Return to original position
            this.sword.rotation.z = originalRot;
        }, 250);
    }

    /**
     * Create crescent moon slash effect that traces the sword tip path
     * @param {boolean} dealDamage - Whether this slash should damage enemies
     */
    createCrescentSlash(dealDamage = false) {
        // Create crescent slash tracing the sword tip's arc
        const slashGroup = new THREE.Group();

        // Sword tip is approximately 1.45 units from the warrior's center (0.85 blade + 0.6 from shoulder)
        const swordLength = 1.45;
        const numSegments = 10;

        // The sword swings from about -0.87 radians (starting position) to -2.2 radians (end position)
        // This is approximately a 76-degree arc
        const startAngle = -0.87; // Starting rotation (sword at rest)
        const endAngle = -2.2;    // Ending rotation (sword fully swung)
        const angleRange = endAngle - startAngle;

        for (let i = 0; i < numSegments; i++) {
            const t = i / (numSegments - 1);
            const angle = startAngle + angleRange * t;

            // Calculate position of sword tip at this point in the arc
            // Offset from warrior center (sword is positioned at 0.5, -0.2 from center)
            const swordBaseX = 0.5;
            const swordBaseY = -0.2;

            const tipX = swordBaseX + Math.sin(-angle) * swordLength;
            const tipY = swordBaseY + Math.cos(-angle) * swordLength;

            const segmentGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.05);
            const segmentMaterial = new THREE.MeshBasicMaterial({
                color: 0xccddff,
                transparent: true,
                opacity: 0.5 // Reduced from 0.8 to make it dimmer
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            segment.position.set(tipX, tipY, 0);
            segment.rotation.z = angle; // Align with sword direction

            slashGroup.add(segment);
        }

        // Position at player location and flip for facing direction
        slashGroup.position.set(this.position.x, this.position.y, 0.2);
        slashGroup.scale.x = this.facingDirection;

        // Add to scene
        this.mesh.parent.add(slashGroup);

        // Deal damage if specified
        if (dealDamage) {
            const slashRange = 2.5; // Increased from 1.5 to extend further beyond the sword
            const slashHeight = 1.5; // Increased vertical range
            const slashBounds = {
                left: this.position.x + (this.facingDirection > 0 ? -0.3 : -slashRange),
                right: this.position.x + (this.facingDirection > 0 ? slashRange : 0.3),
                top: this.position.y + slashHeight,
                bottom: this.position.y - slashHeight
            };
            this.damageEnemiesInArea(slashBounds, this.abilities.q);
        }

        // Animate - fade out and scale up (faster fade)
        let opacity = 0.5;
        let scale = 1.0;
        const animInterval = setInterval(() => {
            opacity -= 0.2; // Increased from 0.12 for faster fade
            scale += 0.2;

            // Update all segments
            slashGroup.children.forEach(segment => {
                segment.material.opacity = opacity;
            });
            // Preserve the facing direction while scaling
            slashGroup.scale.set(scale * this.facingDirection, scale, 1);

            if (opacity <= 0) {
                clearInterval(animInterval);
                this.mesh.parent.remove(slashGroup);
            }
        }, 30); // Reduced from 40ms for faster animation
    }

    /**
     * Shield Bash Attack - W Ability
     */
    shieldBashAttack() {
        console.log('🛡️ SHIELD BASH!');

        // Save original position
        const originalX = -0.6;
        const originalY = 0;

        // Wind up (pull shield back and up)
        this.shield.position.x = -0.4;
        this.shield.position.y = 0.2;
        this.shield.rotation.z = -0.2;

        setTimeout(() => {
            // Bash forward with force
            this.shield.position.x = -1.0;
            this.shield.position.y = -0.1;
            this.shield.rotation.z = 0.3;
            this.shield.scale.set(1.2, 1.2, 1.2); // Grow slightly for impact

            // Small forward push to player
            this.velocity.x += (this.velocity.x >= 0 ? 3 : -3);

            // Damage and knockback enemies
            const bashRange = 1.2;
            const bashBounds = {
                left: this.position.x - bashRange,
                right: this.position.x + bashRange,
                top: this.position.y + 1,
                bottom: this.position.y - 1
            };
            this.damageEnemiesInArea(bashBounds, this.abilities.w);
        }, 100);

        setTimeout(() => {
            // Return to original position
            this.shield.position.x = originalX;
            this.shield.position.y = originalY;
            this.shield.rotation.z = 0;
            this.shield.scale.set(1, 1, 1);
        }, 350);
    }

    /**
     * Dash Forward - E Ability
     */
    dashForward() {
        console.log('💨 DASH!');

        // Dash in the direction the warrior is facing
        const dashSpeed = 15;

        // Apply dash velocity
        this.position.x += this.facingDirection * dashSpeed * 0.1;

        // Visual effect - scale horizontally (preserve facing direction)
        const currentFacing = this.facingDirection;
        this.mesh.scale.x = currentFacing * 1.5;
        setTimeout(() => {
            this.mesh.scale.x = currentFacing;
        }, 100);

        // Create dash trail effect
        this.createDashTrail();
    }

    /**
     * Create dash trail visual effect
     */
    createDashTrail() {
        const trailGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x0066ff,
            transparent: true,
            opacity: 0.5
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.set(this.position.x, this.position.y, -0.1);
        this.mesh.parent.add(trail);

        // Fade out trail
        let opacity = 0.5;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;
            trail.material.opacity = opacity;

            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.mesh.parent.remove(trail);
            }
        }, 30);
    }

    /**
     * Whirlwind Ultimate - R Ability
     */
    whirlwindUltimate() {
        console.log('🌪️ WHIRLWIND ULTIMATE!');

        // Create whirlwind visual effect to show hitbox
        const whirlwindRange = 2.5;
        this.createWhirlwindEffect(whirlwindRange);

        // Spin animation
        let spinCount = 0;
        const spinInterval = setInterval(() => {
            this.mesh.rotation.z += Math.PI / 4;
            spinCount++;

            // Damage enemies nearby during spin
            const whirlwindBounds = {
                left: this.position.x - whirlwindRange,
                right: this.position.x + whirlwindRange,
                top: this.position.y + whirlwindRange,
                bottom: this.position.y - whirlwindRange
            };
            this.damageEnemiesInArea(whirlwindBounds, this.abilities.r);

            if (spinCount >= 16) { // 2 full rotations
                clearInterval(spinInterval);
                this.mesh.rotation.z = 0; // Reset rotation
            }
        }, 50);
    }

    /**
     * Create whirlwind visual effect showing the attack range
     */
    createWhirlwindEffect(range) {
        const whirlwindGroup = new THREE.Group();

        // Create multiple swirling wind trails
        const numTrails = 12; // More trails for better swirl effect
        for (let i = 0; i < numTrails; i++) {
            const startAngle = (i / numTrails) * Math.PI * 2;

            // Create curved segments that spiral outward
            const numSegments = 8;

            for (let j = 0; j < numSegments; j++) {
                const t = j / numSegments;
                const radius = t * range; // Grow from center to edge
                const spiralAngle = startAngle + (t * Math.PI * 1.5); // More spiral (1.5 rotations)

                const x = Math.cos(spiralAngle) * radius;
                const y = Math.sin(spiralAngle) * radius;

                // Smaller segments at the center, larger at the edge
                const segmentSize = 0.15 + (t * 0.2);
                const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize * 0.6, 0.05);
                const segmentMaterial = new THREE.MeshBasicMaterial({
                    color: 0xccffff, // Light cyan wind color
                    transparent: true,
                    opacity: 0.4 * (1 - t * 0.3) // Fade slightly toward edges
                });
                const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

                segment.position.set(x, y, 0);
                segment.rotation.z = spiralAngle + Math.PI / 2; // Perpendicular to spiral

                whirlwindGroup.add(segment);
            }
        }

        // Attach to warrior mesh so it follows the character
        whirlwindGroup.position.set(0, 0, 0.15);
        this.mesh.add(whirlwindGroup);

        // Animate - spin and fade out
        let rotation = 0;
        let opacity = 0.4;
        let scale = 1.0;
        const animInterval = setInterval(() => {
            rotation += 0.4; // Faster spin
            opacity -= 0.05;
            scale += 0.08;

            whirlwindGroup.rotation.z = rotation;
            whirlwindGroup.scale.set(scale, scale, 1);

            // Update opacity for all segments
            whirlwindGroup.children.forEach(segment => {
                segment.material.opacity = opacity * (segment.material.opacity / 0.4);
            });

            if (opacity <= 0) {
                clearInterval(animInterval);
                this.mesh.remove(whirlwindGroup);
            }
        }, 50);
    }

    /**
     * Update warrior - handle facing direction
     */
    update(deltaTime, input) {
        // Update facing direction based on movement
        if (input.isLeftPressed()) {
            this.setFacingDirection(-1);
        } else if (input.isRightPressed()) {
            this.setFacingDirection(1);
        }

        // Call parent update
        super.update(deltaTime, input);
    }

    /**
     * Set the facing direction and flip character
     */
    setFacingDirection(direction) {
        if (this.facingDirection !== direction) {
            this.facingDirection = direction;
            // Flip the entire mesh by scaling on X axis
            this.mesh.scale.x = direction;
        }
    }

    /**
     * Override syncMeshPosition to prevent equipment from rotating issues
     */
    syncMeshPosition() {
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;

        // Keep sword and shield at correct relative positions
        // (They're attached to mesh, so they move automatically)
    }

    /**
     * Damage all enemies within a given area
     * @param {Object} bounds - AABB bounds to check {left, right, top, bottom}
     * @param {Ability} ability - Ability to scale damage with debug multipliers
     */
    damageEnemiesInArea(bounds, ability = null) {
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                this.applyAbilityDamage(ability, enemy, 1);
                this.addUltimateCharge(this.ultimateChargePerKill);
                console.log('💥 Ability hit enemy!');
            }
        }
    }
}
