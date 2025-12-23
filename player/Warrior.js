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
        this.mesh.material.color.set(0x0066ff);

        // Add sword and shield
        this.createEquipment(scene);

        // Enemy reference (set by main.js)
        this.enemies = [];

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

        // Blade (silver/steel color, long and thin)
        const bladeGeometry = new THREE.BoxGeometry(0.15, 1.2, 0.05);
        const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, 0.3, 0); // Blade extends upward
        this.swordGroup.add(blade);

        // Blade edge highlight (brighter for steel effect)
        const edgeGeometry = new THREE.BoxGeometry(0.08, 1.2, 0.06);
        const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.set(0, 0.3, 0);
        this.swordGroup.add(edge);

        // Crossguard (gold)
        const crossguardGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.08);
        const crossguardMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const crossguard = new THREE.Mesh(crossguardGeometry, crossguardMaterial);
        crossguard.position.set(0, -0.35, 0);
        this.swordGroup.add(crossguard);

        // Handle (brown leather)
        const handleGeometry = new THREE.BoxGeometry(0.12, 0.4, 0.08);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.55, 0);
        this.swordGroup.add(handle);

        // Pommel (gold)
        const pommelGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const pommelMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
        pommel.position.set(0, -0.8, 0);
        this.swordGroup.add(pommel);

        // Position sword on right side, angled
        this.swordGroup.position.set(0.6, 0.1, 0.1);
        this.swordGroup.rotation.z = -Math.PI / 6; // Slight angle
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
     * Initialize warrior abilities
     */
    initializeAbilities() {
        // Q - Sword Slash (short cooldown)
        const swordSlash = new Ability('Sword Slash', 2);
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
        const dash = new Ability('Dash', 5);
        dash.use = (hero) => {
            if (!Ability.prototype.use.call(dash, hero)) return false;

            // Dash forward
            hero.dashForward();
            return true;
        };

        // R - Whirlwind Ultimate
        const whirlwind = new Ability('Whirlwind', 0, true);
        whirlwind.use = (hero) => {
            if (!Ability.prototype.use.call(whirlwind, hero)) return false;

            // Whirlwind attack
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

        // Save original position and rotation
        const originalX = 0.6;
        const originalY = 0.1;
        const originalRot = -Math.PI / 6;

        // Wind up (pull back)
        this.sword.position.x = 0.4;
        this.sword.position.y = 0.3;
        this.sword.rotation.z = -Math.PI / 3;

        setTimeout(() => {
            // Slash forward in arc
            this.sword.position.x = 1.0;
            this.sword.position.y = -0.2;
            this.sword.rotation.z = Math.PI / 4;

            // Damage enemies during slash
            const slashRange = 1.5;
            const slashBounds = {
                left: this.position.x,
                right: this.position.x + slashRange,
                top: this.position.y + 1,
                bottom: this.position.y - 1
            };
            this.damageEnemiesInArea(slashBounds);
        }, 100);

        setTimeout(() => {
            // Return to original position
            this.sword.position.x = originalX;
            this.sword.position.y = originalY;
            this.sword.rotation.z = originalRot;
        }, 250);
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
            this.damageEnemiesInArea(bashBounds);
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

        // Determine dash direction based on last movement or facing
        const dashDirection = this.velocity.x >= 0 ? 1 : -1;
        const dashSpeed = 15;

        // Apply dash velocity
        this.position.x += dashDirection * dashSpeed * 0.1;

        // Visual effect - scale horizontally
        this.mesh.scale.x = 1.5;
        setTimeout(() => {
            this.mesh.scale.x = 1;
        }, 100);
    }

    /**
     * Whirlwind Ultimate - R Ability
     */
    whirlwindUltimate() {
        console.log('🌪️ WHIRLWIND ULTIMATE!');

        // Spin animation
        let spinCount = 0;
        const spinInterval = setInterval(() => {
            this.mesh.rotation.z += Math.PI / 4;
            spinCount++;

            // Damage enemies nearby during spin
            const whirlwindRange = 2.5;
            const whirlwindBounds = {
                left: this.position.x - whirlwindRange,
                right: this.position.x + whirlwindRange,
                top: this.position.y + whirlwindRange,
                bottom: this.position.y - whirlwindRange
            };
            this.damageEnemiesInArea(whirlwindBounds);

            if (spinCount >= 16) { // 2 full rotations
                clearInterval(spinInterval);
                this.mesh.rotation.z = 0; // Reset rotation
            }
        }, 50);
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
     */
    damageEnemiesInArea(bounds) {
        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const enemyBounds = enemy.getBounds();
            if (checkAABBCollision(bounds, enemyBounds)) {
                enemy.takeDamage();
                this.addUltimateCharge(this.ultimateChargePerKill);
                console.log('💥 Ability hit enemy!');
            }
        }
    }
}
