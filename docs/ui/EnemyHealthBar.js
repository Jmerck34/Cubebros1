import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * EnemyHealthBar - Small health bar for enemies
 * @class EnemyHealthBar
 */
export class EnemyHealthBar {
    constructor(scene, enemy, maxHealth = 3) {
        this.scene = scene;
        this.enemy = enemy;
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;

        this.group = new THREE.Group();

        const bgGeometry = new THREE.PlaneGeometry(0.8, 0.1);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x440000 });
        this.background = new THREE.Mesh(bgGeometry, bgMaterial);
        this.background.position.z = 0.6;
        this.group.add(this.background);

        const fgGeometry = new THREE.PlaneGeometry(0.8, 0.1);
        const fgMaterial = new THREE.MeshBasicMaterial({ color: 0x44cc44 });
        this.foreground = new THREE.Mesh(fgGeometry, fgMaterial);
        this.foreground.position.z = 0.61;
        this.group.add(this.foreground);

        this.updatePosition();
        this.scene.add(this.group);
    }

    updatePosition() {
        const pos = this.enemy.getPosition();
        this.group.position.set(pos.x, pos.y + 0.8, 0);
    }

    setHealth(health) {
        this.currentHealth = Math.max(0, Math.min(health, this.maxHealth));
        const percent = this.currentHealth / this.maxHealth;
        this.foreground.scale.x = percent;
        this.foreground.position.x = -(0.8 * (1 - percent)) / 2;
    }

    update() {
        this.updatePosition();
    }

    destroy() {
        this.scene.remove(this.group);
    }
}
