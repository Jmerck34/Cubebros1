// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Import game systems
import { GameLoop } from './core/gameLoop.js';
import { InputManager } from './utils/input.js';
import { UIManager } from './utils/ui.js';
import { getAimDirection } from './utils/aim.js';
import { updateDamageNumbers } from './utils/damageNumbers.js';
import { Warrior } from './player/Warrior.js';
import { Level } from './world/Level.js';
import { CameraFollow } from './camera/CameraFollow.js';
import { Goomba } from './entities/Goomba.js';

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

// Add enemies to level
const goomba1 = new Goomba(scene, 8, 0);
level.addEnemy(goomba1);

const goomba2 = new Goomba(scene, -7, 0);
level.addEnemy(goomba2);

const goomba3 = new Goomba(scene, 12, 3);
level.addEnemy(goomba3);

// Create warrior hero
const player = new Warrior(scene, 0, 0);

// Connect player to enemy list for ability damage detection
player.enemies = level.enemies;

// Setup UI manager
const uiManager = new UIManager(player);

// Setup camera follow
const cameraFollow = new CameraFollow(camera, player);
cameraFollow.setSmoothing(0.1); // Smooth camera movement

// Handle window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game Loop
const gameLoop = new GameLoop(
    // Update callback
    (deltaTime) => {
        input.update();
        const size = renderer.getSize(new THREE.Vector2());
        const aim = getAimDirection({
            input,
            camera,
            renderer,
            viewport: { x: 0, y: 0, width: size.x, height: size.y },
            origin: player.position
        });
        if (typeof player.setAimDirection === 'function') {
            player.setAimDirection(aim);
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
console.log('Gamepad: Left Stick/D-Pad move | A = Jump | X/B/Y = Abilities | RB/RT = Ultimate');
console.log('Kill enemies to charge ultimate!');
