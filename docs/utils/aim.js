import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const tmpSize = new THREE.Vector2();
const tmpWorld = new THREE.Vector3();

export function getAimDirection({
    input,
    camera,
    renderer,
    viewport,
    origin,
    useMouse = true
}) {
    if (!input || !camera || !renderer || !viewport || !origin) {
        return null;
    }

    const stick = typeof input.getAimStick === 'function' ? input.getAimStick() : null;
    if (stick) {
        const x = stick.x;
        const y = -stick.y;
        const length = Math.hypot(x, y);
        if (length > 0.001) {
            return { x: x / length, y: y / length };
        }
    }

    if (!useMouse || typeof input.getMousePosition !== 'function') {
        return null;
    }

    const mouse = input.getMousePosition();
    if (!mouse) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const size = renderer.getSize(tmpSize);
    const canvasX = (mouse.x - rect.left) * (size.x / rect.width);
    const canvasY = (mouse.y - rect.top) * (size.y / rect.height);

    const localX = canvasX - viewport.x;
    const localY = canvasY - viewport.y;

    if (localX < 0 || localX > viewport.width || localY < 0 || localY > viewport.height) {
        return null;
    }

    const ndcX = (localX / viewport.width) * 2 - 1;
    const ndcY = -(localY / viewport.height) * 2 + 1;

    tmpWorld.set(ndcX, ndcY, 0);
    tmpWorld.unproject(camera);

    const dx = tmpWorld.x - origin.x;
    const dy = tmpWorld.y - origin.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return null;

    return { x: dx / length, y: dy / length };
}
