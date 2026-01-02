import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const damageNumbers = [];

function createDamageTexture(text, color, stroke) {
    const fontSize = 64;
    const padding = 18;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    ctx.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.1);

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    ctx.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = canvas.width / 2;
    const y = canvas.height / 2;

    ctx.lineWidth = 10;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { texture, width: canvas.width, height: canvas.height };
}

export function spawnDamageNumber(scene, position, amount, options = {}) {
    if (!scene || !position || !Number.isFinite(amount)) return;

    const displayValue = Math.max(1, Math.round(amount));
    const color = options.color || '#ffd166';
    const stroke = options.stroke || 'rgba(0, 0, 0, 0.85)';

    const { texture, width, height } = createDamageTexture(String(displayValue), color, stroke);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });
    const sprite = new THREE.Sprite(material);

    const scaleFactor = options.scale || 0.01;
    const baseScale = new THREE.Vector3(width * scaleFactor, height * scaleFactor, 1);
    sprite.scale.copy(baseScale);
    sprite.position.set(position.x, position.y + (options.offsetY ?? 0.9), position.z ?? 0.2);
    scene.add(sprite);

    damageNumbers.push({
        sprite,
        material,
        texture,
        baseScale,
        age: 0,
        life: options.life || 1.05,
        velocity: {
            x: options.driftX ?? (Math.random() - 0.5) * 0.6,
            y: options.velocityY ?? 3.1
        },
        gravity: options.gravity ?? -8.5,
        popDuration: 0.12
    });
}

export function updateDamageNumbers(deltaTime) {
    if (!damageNumbers.length) return;
    const dt = Math.max(0, deltaTime || 0);

    for (let i = damageNumbers.length - 1; i >= 0; i -= 1) {
        const entry = damageNumbers[i];
        const sprite = entry.sprite;
        if (!sprite || !sprite.parent) {
            damageNumbers.splice(i, 1);
            continue;
        }

        entry.age += dt;
        entry.velocity.y += entry.gravity * dt;
        sprite.position.x += entry.velocity.x * dt;
        sprite.position.y += entry.velocity.y * dt;

        const t = Math.min(1, entry.age / entry.life);
        const pop = Math.min(1, entry.age / entry.popDuration);
        const popScale = 0.65 + 0.4 * Math.sin(pop * Math.PI * 0.5);
        sprite.scale.set(
            entry.baseScale.x * popScale,
            entry.baseScale.y * popScale,
            1
        );

        const alpha = Math.max(0, 1 - t * t);
        entry.material.opacity = alpha;

        if (entry.age >= entry.life || alpha <= 0.02) {
            if (sprite.parent) {
                sprite.parent.remove(sprite);
            }
            if (entry.texture) {
                entry.texture.dispose();
            }
            if (entry.material) {
                entry.material.dispose();
            }
            damageNumbers.splice(i, 1);
        }
    }
}

export function clearDamageNumbers() {
    while (damageNumbers.length) {
        const entry = damageNumbers.pop();
        if (entry.sprite && entry.sprite.parent) {
            entry.sprite.parent.remove(entry.sprite);
        }
        if (entry.texture) {
            entry.texture.dispose();
        }
        if (entry.material) {
            entry.material.dispose();
        }
    }
}
