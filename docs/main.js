// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Import game systems
import { GameLoop } from './core/gameLoop.js';
import { InputManager } from './utils/input.js';
import { UIManager } from './utils/ui.js';
import { getAimDirection, getAimWorldPosition, getMouseScreenPosition, screenToWorld, worldToScreen } from './utils/aim.js';
import { updateDamageNumbers } from './utils/damageNumbers.js';
import { PlayerStateOverlay } from './ui/PlayerStateOverlay.js';
import { Warrior } from './player/Warrior.js';
import { Level } from './world/Level.js?v=20260109';
import { CameraFollow } from './camera/CameraFollow.js';
import { Goomba } from './entities/Goomba.js';
import { MiniMap } from './ui/MiniMap.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5c94fc); // Mario sky blue

// Orthographic camera for clean 2D look
const aspect = window.innerWidth / window.innerHeight;
const viewSize = 10;
const camera = new THREE.OrthographicCamera(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    0.1,
    1000
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// WebGL Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Initialize input manager
const input = new InputManager();

// Create level with platforms
const level = new Level(scene);
level.createTestLevel({ mapKey: 'playtest' }); // Adds ground + floating platforms

const getLevelBoundsForMiniMap = (levelInstance) => {
    if (!levelInstance) return null;
    const cameraBounds = levelInstance.cameraConfig && levelInstance.cameraConfig.bounds;
    if (cameraBounds && Number.isFinite(cameraBounds.left) && Number.isFinite(cameraBounds.right)) {
        return cameraBounds;
    }
    const boundsList = [];
    if (Array.isArray(levelInstance.platforms)) {
        levelInstance.platforms.forEach((platform) => {
            if (platform && platform.bounds) {
                boundsList.push(platform.bounds);
            }
        });
    }
    if (Array.isArray(levelInstance.movingPlatforms)) {
        levelInstance.movingPlatforms.forEach((entry) => {
            const platform = entry && entry.platform;
            if (platform && platform.bounds) {
                boundsList.push(platform.bounds);
            }
        });
    }
    if (!boundsList.length) return null;
    return {
        left: Math.min(...boundsList.map((b) => b.left)),
        right: Math.max(...boundsList.map((b) => b.right)),
        bottom: Math.min(...boundsList.map((b) => b.bottom)),
        top: Math.max(...boundsList.map((b) => b.top))
    };
};

const miniMap = new MiniMap({ playerIndex: 0 });
miniMap.setBounds(getLevelBoundsForMiniMap(level));
miniMap.buildBase(level);
miniMap.setViewport({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }, window.innerHeight);

// Add enemies to level
const goomba1 = new Goomba(scene, 8, 0);
level.addEnemy(goomba1);

const goomba2 = new Goomba(scene, -7, 0);
level.addEnemy(goomba2);

const goomba3 = new Goomba(scene, 12, 3);
level.addEnemy(goomba3);

// Create warrior hero
const player = new Warrior(scene, 0, 0);
player.playerIndex = 0;
player.reticleLayer = 1;
const playerStateOverlay = new PlayerStateOverlay(() => player);

// Connect player to enemy list for ability damage detection
player.enemies = level.enemies;

// Setup UI manager
const uiManager = new UIManager(player);

// Setup camera follow
const cameraFollow = new CameraFollow(camera, player);
camera.layers.enable(player.reticleLayer);
if (level.cameraConfig) {
    const cfg = level.cameraConfig;
    cameraFollow.setSmoothing(Number.isFinite(cfg.smoothing) ? cfg.smoothing : 0.1);
    if ('followVertical' in cfg) {
        cameraFollow.setFollowVertical(cfg.followVertical);
    }
    const verticalStart = Number.isFinite(cfg.verticalFollowStart) ? cfg.verticalFollowStart : 2.5;
    const verticalMax = Number.isFinite(cfg.verticalFollowMaxOffset) ? cfg.verticalFollowMaxOffset : 22;
    cameraFollow.setVerticalFollow(verticalStart, verticalMax);
    if (cfg.offset) {
        cameraFollow.setOffset(cfg.offset);
    }
    if (cfg.bounds) {
        cameraFollow.setBounds(cfg.bounds);
    }
    if (Number.isFinite(cfg.zoom)) {
        camera.zoom = cfg.zoom;
        camera.updateProjectionMatrix();
    }
} else {
    cameraFollow.setSmoothing(0.1); // Smooth camera movement
}

// Handle window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    miniMap.setViewport({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }, window.innerHeight);
});

// Game Loop
const gameLoop = new GameLoop(
    // Update callback
    (deltaTime) => {
        input.update();
        const size = renderer.getSize(new THREE.Vector2());
        const viewport = { x: 0, y: 0, width: size.x, height: size.y };
        if (player.useCursorAim) {
            let cursor = player.aimScreenPosition;
            if (!cursor) {
                cursor = { x: viewport.width * 0.5, y: viewport.height * 0.5 };
            }
            const mousePos = getMouseScreenPosition({ input, renderer, viewport });
            if (mousePos) {
                cursor.x = mousePos.x;
                cursor.y = mousePos.y;
            } else if (typeof input.getAimStick === 'function') {
                const stick = input.getAimStick(player.allowLeftStickAimFallback !== false);
                if (stick) {
                    const speed = player.cursorSpeed || 800;
                    cursor.x += stick.x * speed * deltaTime;
                    cursor.y += stick.y * speed * deltaTime;
                }
            }
            cursor.x = Math.max(0, Math.min(viewport.width, cursor.x));
            cursor.y = Math.max(0, Math.min(viewport.height, cursor.y));
            player.aimScreenPosition = cursor;
            let aimWorld = screenToWorld({ camera, renderer, viewport, screenX: cursor.x, screenY: cursor.y });
            if (aimWorld) {
                const margin = 1;
                const worldLeft = camera.left + camera.position.x + margin;
                const worldRight = camera.right + camera.position.x - margin;
                const worldTop = camera.top + camera.position.y - margin;
                const worldBottom = camera.bottom + camera.position.y + margin;
                aimWorld.x = Math.max(worldLeft, Math.min(worldRight, aimWorld.x));
                aimWorld.y = Math.max(worldBottom, Math.min(worldTop, aimWorld.y));
                const clampedScreen = worldToScreen({
                    camera,
                    renderer,
                    viewport,
                    worldX: aimWorld.x,
                    worldY: aimWorld.y
                });
                if (clampedScreen) {
                    cursor.x = clampedScreen.x;
                    cursor.y = clampedScreen.y;
                }
            }
            if (typeof player.setAimWorldPosition === 'function') {
                player.setAimWorldPosition(aimWorld);
            }
            if (aimWorld && typeof player.setAimDirection === 'function') {
                const dx = aimWorld.x - player.position.x;
                const dy = aimWorld.y - player.position.y;
                const length = Math.hypot(dx, dy);
                player.setAimDirection(length > 0.001 ? { x: dx / length, y: dy / length } : null);
            }
        } else {
            const aim = getAimDirection({
                input,
                camera,
                renderer,
                viewport,
                origin: player.position,
                allowLeftStickFallback: player.allowLeftStickAimFallback !== false
            });
            if (typeof player.setAimDirection === 'function') {
                player.setAimDirection(aim);
            }
            const aimWorld = getAimWorldPosition({
                input,
                camera,
                renderer,
                viewport,
                allowLeftStickFallback: player.allowLeftStickAimFallback !== false
            });
            if (typeof player.setAimWorldPosition === 'function') {
                player.setAimWorldPosition(aimWorld);
            }
        }

        // Update player
        player.update(deltaTime, input);

        // Update enemies and moving platforms
        level.update(deltaTime);

        // Check platform collisions
        level.checkCollisions(player);

        // Check enemy collisions
        player.checkEnemyCollisions(level.enemies);
        level.checkFlagPickup(player);

        // Update camera to follow player
        cameraFollow.update();

        // Update UI
        uiManager.update();

        updateDamageNumbers(deltaTime);
        playerStateOverlay.update();
        miniMap.update({ players: [player], focusPlayer: player });
    },
    // Render callback
    () => {
        renderer.render(scene, camera);
    }
);

// Start the game loop
gameLoop.start();

console.log('⚔️ WARRIOR HERO READY! ⚔️');
console.log('Move: Arrow Keys/A/D | Jump: Space (double jump!)');
console.log('Abilities: Left Click/Q = Sword Slash | W = Shield Bash | E = Dash | R = Whirlwind Ultimate');
        console.log('Gamepad: Left Stick/D-Pad move | Right Stick = Aim | A = Jump | RT = A1 | LT = A2 | RB = A3 | LB = Ultimate');
console.log('Kill enemies to charge ultimate!');
