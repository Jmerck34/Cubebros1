// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Import game systems
import { GameLoop } from './core/gameLoop.js';
import { InputManager } from './utils/input.js';
import { UIManager } from './utils/ui.js';
import { getAimDirection } from './utils/aim.js';
import { Warrior } from './player/Warrior.js';
import { Assassin } from './player/Assassin.js';
import { Cyborg } from './player/Cyborg.js';
import { Warlock } from './player/Warlock.js';
import { Archer } from './player/Archer.js';
import { Paladin } from './player/Paladin.js';
import { Level } from './world/Level.js';
import { Environment } from './world/Environment.js';
import { ParallaxManager } from './world/ParallaxManager.js';
import { CameraFollow } from './camera/CameraFollow.js';
import { Goomba } from './entities/Goomba.js';
import { updateDamageNumbers } from './utils/damageNumbers.js';

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

// Create environment (background, clouds, particles)
const environment = new Environment(scene);
environment.createBackground();

// Create level with platforms
const level = new Level(scene);
level.createTestLevel({ mapKey: 'playtest' }); // Adds ground + floating platforms

// Setup parallax manager (foreground/midground/background)
const parallaxManager = new ParallaxManager(camera);
environment.getParallaxLayers().forEach(layer => parallaxManager.addLayer(layer));
parallaxManager.addLayer({ root: level.group, speedMultiplier: 1 });

// Add enemies to level
const goomba1 = new Goomba(scene, 8, 0);
level.addEnemy(goomba1);

const goomba2 = new Goomba(scene, -7, 0);
level.addEnemy(goomba2);

const goomba3 = new Goomba(scene, 12, 3);
level.addEnemy(goomba3);

const goomba4 = new Goomba(scene, -12, 0);
level.addEnemy(goomba4);

const goomba5 = new Goomba(scene, 15, 0);
level.addEnemy(goomba5);

// CREATE YOUR HERO HERE - Choose one:
// Uncomment the hero you want to play:

// Option 1: Warrior (Sword & Shield)
const player = new Warrior(scene, 0, 0);

// Option 2: Assassin (Dual Daggers)
// const player = new Assassin(scene, 0, 0);

// Option 3: Cyborg (Tech Caster)
// const player = new Cyborg(scene, 0, 0);

// Option 4: Warlock (Dark Staff)
// const player = new Warlock(scene, 0, 0);

// Option 5: Archer (Bow & Arrow)
// const player = new Archer(scene, 0, 0);

// Option 6: Paladin (Shield & Mace)
// const player = new Paladin(scene, 0, 0);

// Connect player to enemy list for ability damage detection
player.enemies = level.enemies;

// Setup UI manager
const uiManager = new UIManager(player);

// Setup camera follow
const cameraFollow = new CameraFollow(camera, player);
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

        // Update parallax layers (based on camera movement)
        parallaxManager.update();

        // Update UI
        uiManager.update();

        updateDamageNumbers(deltaTime);

        // Update environment animations
        environment.update(deltaTime);
    },
    // Render callback
    () => {
        renderer.render(scene, camera);
    }
);

// Start the game loop
gameLoop.start();

console.log('🎮 HERO SELECTION READY! 🎮');
console.log('Move: Arrow Keys/A/D | Jump: Space (double jump!)');
console.log('Gamepad: Left Stick/D-Pad move | A = Jump | X/B/Y = Abilities | RB/RT = Ultimate');
console.log('');
console.log('📋 HERO ABILITIES:');
console.log('');
console.log('⚔️ WARRIOR:');
console.log('  Q/Click = Sword Slash | W = Shield Bash | E = Dash | R = Whirlwind');
console.log('');
console.log('🗡️ ASSASSIN:');
console.log('  Q/Click = Dagger Combo (bleed) | W = Throwing Stars (slow) | E = Shadow Walk | R = Assassinate');
console.log('');
console.log('🤖 CYBORG:');
console.log('  Q/Click = Fireball | W = Freeze Blast | E = Bubble Shield | R = Kame Hame Ha');
console.log('');
console.log('🏹 ARCHER:');
console.log('  Q/Click = Shoot Arrow | W = Healing Potion | E = Teleport Arrow | R = Machine Bow');
console.log('');
console.log('💀 WARLOCK:');
console.log('  Q/Click = Lightning Strike | W = Fear | E = Hover | R = Mind Control');
console.log('');
console.log('Kill enemies to charge ultimate!');
