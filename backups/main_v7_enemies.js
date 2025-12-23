// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Import game systems
import { GameLoop } from './core/gameLoop.js';
import { InputManager } from './utils/input.js';
import { Player } from './player/Player.js';
import { Level } from './world/Level.js';
import { CameraFollow } from './camera/CameraFollow.js';
import { Goomba } from './entities/Goomba.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5c94fc); // Mario sky blue

// Orthographic camera for 2D platformer feel
const aspect = window.innerWidth / window.innerHeight;
const viewSize = 10;
const camera = new THREE.OrthographicCamera(
    -viewSize * aspect, // left
    viewSize * aspect,  // right
    viewSize,           // top
    -viewSize,          // bottom
    0.1,                // near
    1000                // far
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
level.createTestLevel(); // Adds ground + floating platforms

// Add enemies to level
const goomba1 = new Goomba(scene, 8, 0);
level.addEnemy(goomba1);

const goomba2 = new Goomba(scene, -7, 0);
level.addEnemy(goomba2);

const goomba3 = new Goomba(scene, 12, 3);
level.addEnemy(goomba3);

// Create player
const player = new Player(scene, 0, 0);

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
        // Update player
        player.update(deltaTime, input);

        // Update enemies
        level.updateEnemies(deltaTime);

        // Check platform collisions
        level.checkCollisions(player);

        // Check enemy collisions
        player.checkEnemyCollisions(level.enemies);

        // Update camera to follow player
        cameraFollow.update();
    },
    // Render callback
    () => {
        renderer.render(scene, camera);
    }
);

// Start the game loop
gameLoop.start();

console.log('Platformer ready! Arrow Keys/WASD to move. Space to jump. Stomp the brown Goombas!');
