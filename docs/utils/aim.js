import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const tmpSize = new THREE.Vector2();
const tmpWorld = new THREE.Vector3();

export function getAimDirection({
    input,
    camera,
    renderer,
    viewport,
    origin,
    useMouse = true,
    allowLeftStickFallback = true
}) {
    if (!input || !camera || !renderer || !viewport || !origin) {
        return null;
    }

    const stick = typeof input.getAimStick === 'function' ? input.getAimStick(allowLeftStickFallback) : null;
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

export function getAimWorldPosition({
    input,
    camera,
    renderer,
    viewport,
    useMouse = true,
    clampToViewport = true,
    stickRadius = 0.92,
    allowLeftStickFallback = true
}) {
    if (!input || !camera || !renderer || !viewport) {
        return null;
    }

    const stick = typeof input.getAimStick === 'function' ? input.getAimStick(allowLeftStickFallback) : null;
    let localX = null;
    let localY = null;

    if (stick) {
        const x = stick.x;
        const y = -stick.y;
        const length = Math.hypot(x, y);
        if (length > 0.001) {
            const nx = Math.max(-1, Math.min(1, x));
            const ny = Math.max(-1, Math.min(1, y));
            localX = viewport.width * 0.5 + nx * viewport.width * 0.5 * stickRadius;
            localY = viewport.height * 0.5 + ny * viewport.height * 0.5 * stickRadius;
        }
    }

    if ((localX === null || localY === null) && useMouse && typeof input.getMousePosition === 'function') {
        const mouse = input.getMousePosition();
        if (!mouse) return null;

        const rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        const size = renderer.getSize(tmpSize);
        const canvasX = (mouse.x - rect.left) * (size.x / rect.width);
        const canvasY = (mouse.y - rect.top) * (size.y / rect.height);

        localX = canvasX - viewport.x;
        localY = canvasY - viewport.y;

        if (!clampToViewport) {
            if (localX < 0 || localX > viewport.width || localY < 0 || localY > viewport.height) {
                return null;
            }
        }
    }

    if (localX === null || localY === null) {
        return null;
    }

    if (clampToViewport) {
        localX = Math.max(0, Math.min(viewport.width, localX));
        localY = Math.max(0, Math.min(viewport.height, localY));
    }

    const ndcX = (localX / viewport.width) * 2 - 1;
    const ndcY = -(localY / viewport.height) * 2 + 1;

    tmpWorld.set(ndcX, ndcY, 0);
    tmpWorld.unproject(camera);

    return { x: tmpWorld.x, y: tmpWorld.y };
}

export function getMouseScreenPosition({
    input,
    renderer,
    viewport,
    clampToViewport = true
}) {
    if (!input || !renderer || !viewport || typeof input.getMousePosition !== 'function') {
        return null;
    }

    const mouse = input.getMousePosition();
    if (!mouse) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const size = renderer.getSize(tmpSize);
    const canvasX = (mouse.x - rect.left) * (size.x / rect.width);
    const canvasY = (mouse.y - rect.top) * (size.y / rect.height);

    let localX = canvasX - viewport.x;
    let localY = canvasY - viewport.y;

    if (!clampToViewport) {
        if (localX < 0 || localX > viewport.width || localY < 0 || localY > viewport.height) {
            return null;
        }
    }

    if (clampToViewport) {
        localX = Math.max(0, Math.min(viewport.width, localX));
        localY = Math.max(0, Math.min(viewport.height, localY));
    }

    return { x: localX, y: localY };
}

export function screenToWorld({
    camera,
    renderer,
    viewport,
    screenX,
    screenY
}) {
    if (!camera || !renderer || !viewport) return null;
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;

    const ndcX = (screenX / viewport.width) * 2 - 1;
    const ndcY = -(screenY / viewport.height) * 2 + 1;

    tmpWorld.set(ndcX, ndcY, 0);
    tmpWorld.unproject(camera);

    return { x: tmpWorld.x, y: tmpWorld.y };
}

export function worldToScreen({
    camera,
    renderer,
    viewport,
    worldX,
    worldY
}) {
    if (!camera || !renderer || !viewport) return null;
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return null;

    tmpWorld.set(worldX, worldY, 0);
    tmpWorld.project(camera);

    const screenX = ((tmpWorld.x + 1) / 2) * viewport.width;
    const screenY = ((-tmpWorld.y + 1) / 2) * viewport.height;
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
    return { x: screenX, y: screenY };
}
