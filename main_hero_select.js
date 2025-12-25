// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Import game systems
import { GameLoop } from './core/gameLoop.js';
import { InputManager } from './utils/input.js';
import { UIManager } from './utils/ui.js';
import { Warrior } from './player/Warrior.js';
import { Assassin } from './player/Assassin.js';
import { Wizard } from './player/Wizard.js';
import { Warlock } from './player/Warlock.js';
import { Level } from './world/Level.js';
import { Environment } from './world/Environment.js';
import { CameraFollow } from './camera/CameraFollow.js';
import { Goomba } from './entities/Goomba.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { DebugMenu } from './ui/DebugMenu.js';

// Game state
let gameStarted = false;
let scene, camera, renderer, input, level, environment, player, uiManager, cameraFollow, gameLoop, pauseMenu, debugMenu;

// Hero selection
let selectedHeroClass = null;

// Initialize scene (before game starts)
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x5c94fc);

    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 10;
    camera = new THREE.OrthographicCamera(
        -viewSize * aspect,
        viewSize * aspect,
        viewSize,
        -viewSize,
        0.1,
        1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Handle window resize
    window.addEventListener('resize', () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = -viewSize * aspect;
        camera.right = viewSize * aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Start game with selected hero
function startGame(HeroClass) {
    selectedHeroClass = HeroClass;

    // Hide menu
    document.getElementById('hero-menu').style.display = 'none';
    document.getElementById('ability-ui').style.display = 'flex';

    // Initialize input manager
    input = new InputManager();

    // Create environment (background, clouds, particles)
    environment = new Environment(scene);
    environment.createBackground();

    // Create level with platforms
    level = new Level(scene);
    level.createTestLevel();

    // Add enemies to level (positioned to avoid platforms)
    const goomba1 = new Goomba(scene, 8, 0);    // Right side near grass platform
    level.addEnemy(goomba1);

    const goomba2 = new Goomba(scene, -7, 0);   // Left side, clear area
    level.addEnemy(goomba2);

    const goomba3 = new Goomba(scene, 12, 3);   // On floating platform
    level.addEnemy(goomba3);

    // REMOVED: goomba4 was at -12 (conflicts with wall with ladder)

    const goomba5 = new Goomba(scene, -17, 3);  // Far left on grass platform
    level.addEnemy(goomba5);

    const goomba6 = new Goomba(scene, 18, 0);   // Far right ground
    level.addEnemy(goomba6);

    // Create selected hero
    player = new HeroClass(scene, 0, 0);
    player.enemies = level.enemies;
    player.level = level; // Pass level reference for platform detection

    // Setup UI manager
    uiManager = new UIManager(player);

    // Setup camera follow
    cameraFollow = new CameraFollow(camera, player);
    cameraFollow.setSmoothing(0.1);

    // Create pause menu
    pauseMenu = new PauseMenu(
        () => {
            // Back to Menu callback
            resetGame();
        },
        () => {
            // Resume callback (optional - menu handles resume itself)
        }
    );

    // Create debug menu (or update player if it exists)
    if (!debugMenu) {
        debugMenu = new DebugMenu(player);
    } else {
        debugMenu.setPlayer(player);
    }

    // Apply debug menu physics multipliers to player
    player.debugPhysics = debugMenu.getPhysicsMultipliers();

    // Game Loop
    gameLoop = new GameLoop(
        (deltaTime) => {
            // Skip game updates if paused or debug menu is open
            if ((pauseMenu && pauseMenu.isPaused()) || (debugMenu && debugMenu.isPaused())) {
                return;
            }

            player.update(deltaTime, input);
            level.updateEnemies(deltaTime);
            level.checkCollisions(player);
            player.checkEnemyCollisions(level.enemies);
            cameraFollow.update();
            uiManager.update();

            // Update environment animations
            environment.update(deltaTime);
        },
        () => {
            renderer.render(scene, camera);
        }
    );

    gameLoop.start();
    gameStarted = true;

    // Log hero info
    const heroNames = {
        [Warrior.name]: '⚔️ WARRIOR',
        [Assassin.name]: '🗡️ ASSASSIN',
        [Wizard.name]: '🔮 WIZARD',
        [Warlock.name]: '💀 WARLOCK'
    };

    console.log(`${heroNames[HeroClass.name]} SELECTED!`);
    console.log('Move: Arrow Keys/A/D | Jump: W/Space (double jump!)');
    console.log('Abilities: Q/Left Click = A1 | Right Click = A2 | E = A3 | R = Ultimate');
}

// Reset game (return to menu)
function resetGame() {
    if (gameLoop) {
        gameLoop.stop();
    }

    // Destroy pause menu
    if (pauseMenu) {
        pauseMenu.destroy();
        pauseMenu = null;
    }

    // Clear scene
    if (scene && player) {
        scene.remove(player.mesh);
        level.platforms.forEach(p => scene.remove(p.mesh));
        level.enemies.forEach(e => scene.remove(e.mesh));
    }

    // Show menu again
    document.getElementById('hero-menu').style.display = 'flex';
    document.getElementById('ability-ui').style.display = 'none';

    gameStarted = false;
}

// Initialize scene on load
window.addEventListener('load', () => {
    initScene();

    // Setup hero selection buttons
    document.getElementById('select-warrior').addEventListener('click', () => {
        startGame(Warrior);
    });

    document.getElementById('select-assassin').addEventListener('click', () => {
        startGame(Assassin);
    });

    document.getElementById('select-wizard').addEventListener('click', () => {
        startGame(Wizard);
    });

    document.getElementById('select-warlock').addEventListener('click', () => {
        startGame(Warlock);
    });

    // Render empty scene while in menu
    function menuRender() {
        if (!gameStarted) {
            renderer.render(scene, camera);
            requestAnimationFrame(menuRender);
        }
    }
    menuRender();
});
