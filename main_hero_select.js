// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Import game systems
import { GameLoop } from './core/gameLoop.js';
import { InputManager } from './utils/input.js';
import { UIManager } from './utils/ui.js';
import { Warrior } from './player/Warrior.js';
import { Assassin } from './player/Assassin.js';
import { Cyborg } from './player/Cyborg.js';
import { Warlock } from './player/Warlock.js';
import { Archer } from './player/Archer.js';
import { Level } from './world/Level.js';
import { Environment } from './world/Environment.js';
import { ParallaxManager } from './world/ParallaxManager.js';
import { CameraFollow } from './camera/CameraFollow.js';
import { Goomba } from './entities/Goomba.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { DebugMenu } from './ui/DebugMenu.js';

// Game state
let gameStarted = false;
let scene, camera, renderer, input, input2, level, environment, player, player2, uiManager, uiManager2, cameraFollow, parallaxManager, gameLoop, pauseMenu, debugMenu;
const VIEW_SIZE = 10;

// Hero selection
let localMultiplayerEnabled = false;
let selectedHeroClassP1 = null;
let heroMenuTitle, heroMenuSubtitle, heroMenuControls, coopToggle, coopHint;
let heroMenuTitleDefault = '';
let heroMenuSubtitleDefault = '';
let heroMenuControlsDefault = '';

const HERO_NAMES = {
    [Warrior.name]: '⚔️ WARRIOR',
    [Assassin.name]: '🗡️ ASSASSIN',
    [Cyborg.name]: '🤖 CYBORG',
    [Archer.name]: '🏹 ARCHER',
    [Warlock.name]: '💀 WARLOCK'
};

const PLAYER_ONE_COOP_BINDINGS = {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['Space', 'KeyW'],
    ability1: ['Mouse0', 'KeyQ'],
    ability2: ['Mouse2'],
    ability3: ['KeyE'],
    ultimate: ['KeyR']
};

const PLAYER_TWO_BINDINGS = {
    left: ['ArrowLeft', 'KeyJ'],
    right: ['ArrowRight', 'KeyL'],
    jump: ['ArrowUp', 'KeyI'],
    ability1: ['KeyU'],
    ability2: ['KeyO'],
    ability3: ['KeyK'],
    ultimate: ['KeyP']
};

// Initialize scene (before game starts)
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x5c94fc);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
        -VIEW_SIZE * aspect,
        VIEW_SIZE * aspect,
        VIEW_SIZE,
        -VIEW_SIZE,
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
        camera.left = -VIEW_SIZE * aspect;
        camera.right = VIEW_SIZE * aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Start game with selected hero
function startGame(HeroClass, HeroClassP2 = null) {

    // Hide menu
    document.getElementById('hero-menu').style.display = 'none';
    document.getElementById('ability-ui').style.display = 'flex';
    const abilityUiP2 = document.getElementById('ability-ui-p2');
    if (abilityUiP2) {
        abilityUiP2.style.display = HeroClassP2 ? 'flex' : 'none';
    }

    // Initialize input managers
    const playerOneBindings = localMultiplayerEnabled ? PLAYER_ONE_COOP_BINDINGS : null;
    input = new InputManager(playerOneBindings ? { bindings: playerOneBindings, gamepadEnabled: false } : {});
    input2 = HeroClassP2 ? new InputManager({ bindings: PLAYER_TWO_BINDINGS, gamepadIndex: 0 }) : null;

    // Create environment (background, clouds, particles)
    environment = new Environment(scene);
    environment.createBackground();

    // Create level with platforms
    level = new Level(scene);
    level.createTestLevel();

    // Setup parallax manager (foreground/midground/background)
    parallaxManager = new ParallaxManager(camera);
    environment.getParallaxLayers().forEach(layer => parallaxManager.addLayer(layer));
    parallaxManager.addLayer({ root: level.group, speedMultiplier: 1 });

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

    player2 = null;
    if (HeroClassP2) {
        player2 = new HeroClassP2(scene, 2, 0);
        player2.enemies = level.enemies;
        player2.level = level;
    }

    // Setup UI manager
    uiManager = new UIManager(player);
    uiManager2 = player2 ? new UIManager(player2, { suffix: 'p2' }) : null;

    // Setup camera follow
    cameraFollow = new CameraFollow(camera, player2 ? [player, player2] : player);
    cameraFollow.setSmoothing(0.1);

    // Create pause menu
    pauseMenu = new PauseMenu(
        () => {
            // Back to Menu callback
            resetGame();
        },
        () => {
            // Resume callback (optional - menu handles resume itself)
        },
        input
    );

    // Create debug menu (or update player if it exists)
    if (!debugMenu) {
        debugMenu = new DebugMenu(player);
    } else {
        debugMenu.setPlayer(player);
    }

    // Apply debug menu physics multipliers to player
    player.debugPhysics = debugMenu.getPhysicsMultipliers();
    if (player2) {
        player2.debugPhysics = debugMenu.getPhysicsMultipliers();
    }

    // Game Loop
    gameLoop = new GameLoop(
        (deltaTime) => {
            // Skip game updates if paused or debug menu is open
            if ((pauseMenu && pauseMenu.isPaused()) || (debugMenu && debugMenu.isPaused())) {
                return;
            }

            input.update();
            if (input2) {
                input2.update();
            }

            player.update(deltaTime, input);
            if (player2 && input2) {
                player2.update(deltaTime, input2);
            }
            level.updateEnemies(deltaTime);
            level.checkCollisions(player);
            if (player2) {
                level.checkCollisions(player2);
            }
            player.checkEnemyCollisions(level.enemies);
            if (player2) {
                player2.checkEnemyCollisions(level.enemies);
            }
            cameraFollow.update();
            parallaxManager.update();
            uiManager.update();
            if (uiManager2) {
                uiManager2.update();
            }

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
    console.log(`${HERO_NAMES[HeroClass.name]} SELECTED!`);
    if (HeroClassP2) {
        console.log(`${HERO_NAMES[HeroClassP2.name]} SELECTED FOR PLAYER 2!`);
    }
    if (HeroClassP2) {
        console.log('Player 1: A/D = Move | W/Space = Jump | Q/Left Click = A1 | Right Click = A2 | E = A3 | R = Ultimate');
        console.log('Player 2: Controller 1 (preferred) | Arrows/J-L = Move | Up/I = Jump | U/O/K/P = Abilities');
    } else {
        console.log('Move: Arrow Keys/A/D | Jump: W/Space (double jump!)');
        console.log('Abilities: Q/Left Click = A1 | Right Click = A2 | E = A3 | R = Ultimate');
    }
    console.log('Gamepad: Left Stick/D-Pad move | A = Jump | X/B/Y = Abilities | RB/RT = Ultimate');
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
    if (scene) {
        if (player && typeof player.destroy === 'function') {
            player.destroy();
        }
        if (player2 && typeof player2.destroy === 'function') {
            player2.destroy();
        }
        scene.clear();
    }
    parallaxManager = null;
    player2 = null;
    input2 = null;
    uiManager2 = null;

    // Show menu again
    document.getElementById('hero-menu').style.display = 'flex';
    document.getElementById('ability-ui').style.display = 'none';
    const abilityUiP2 = document.getElementById('ability-ui-p2');
    if (abilityUiP2) {
        abilityUiP2.style.display = 'none';
    }

    gameStarted = false;
    selectedHeroClassP1 = null;
    setCoopEnabled(localMultiplayerEnabled);
}

function setCoopEnabled(enabled) {
    localMultiplayerEnabled = enabled;
    selectedHeroClassP1 = null;

    if (coopToggle) {
        coopToggle.textContent = enabled ? 'Local Co-op: On' : 'Local Co-op: Off';
        if (enabled) {
            coopToggle.classList.add('active');
        } else {
            coopToggle.classList.remove('active');
        }
    }

    if (coopHint) {
        coopHint.style.display = enabled ? 'block' : 'none';
    }

    if (heroMenuTitle) {
        heroMenuTitle.textContent = heroMenuTitleDefault;
    }
    if (heroMenuSubtitle) {
        heroMenuSubtitle.textContent = heroMenuSubtitleDefault;
    }
    if (heroMenuControls) {
        heroMenuControls.textContent = enabled
            ? 'P1: A/D = Move | W/Space = Jump | Left Click/Q, Right Click, E, R = Abilities'
            : heroMenuControlsDefault;
    }
}

function handleHeroSelect(HeroClass) {
    if (!localMultiplayerEnabled) {
        startGame(HeroClass);
        return;
    }

    if (!selectedHeroClassP1) {
        selectedHeroClassP1 = HeroClass;
        if (heroMenuTitle) {
            heroMenuTitle.textContent = 'PLAYER 2: SELECT YOUR HERO';
        }
        if (heroMenuSubtitle) {
            heroMenuSubtitle.textContent = `Player 1 locked in: ${HERO_NAMES[HeroClass.name]}`;
        }
        if (heroMenuControls) {
            heroMenuControls.textContent = 'Player 2 controls: Controller 1 preferred | Arrows/J-L = Move | Up/I = Jump | U/O/K/P = Abilities';
        }
        return;
    }

    startGame(selectedHeroClassP1, HeroClass);
    selectedHeroClassP1 = null;
}

// Initialize scene on load
window.addEventListener('load', () => {
    initScene();

    heroMenuTitle = document.getElementById('hero-menu-title');
    heroMenuSubtitle = document.getElementById('hero-menu-subtitle');
    heroMenuControls = document.getElementById('hero-menu-controls');
    coopToggle = document.getElementById('coop-toggle');
    coopHint = document.getElementById('coop-hint');

    if (heroMenuTitle) {
        heroMenuTitleDefault = heroMenuTitle.textContent;
    }
    if (heroMenuSubtitle) {
        heroMenuSubtitleDefault = heroMenuSubtitle.textContent;
    }
    if (heroMenuControls) {
        heroMenuControlsDefault = heroMenuControls.textContent;
    }

    if (coopToggle) {
        coopToggle.addEventListener('click', () => {
            setCoopEnabled(!localMultiplayerEnabled);
        });
    }

    setCoopEnabled(localMultiplayerEnabled);

    // Setup hero selection buttons
    document.getElementById('select-warrior').addEventListener('click', () => {
        handleHeroSelect(Warrior);
    });

    document.getElementById('select-assassin').addEventListener('click', () => {
        handleHeroSelect(Assassin);
    });

    document.getElementById('select-cyborg').addEventListener('click', () => {
        handleHeroSelect(Cyborg);
    });

    document.getElementById('select-warlock').addEventListener('click', () => {
        handleHeroSelect(Warlock);
    });

    document.getElementById('select-archer').addEventListener('click', () => {
        handleHeroSelect(Archer);
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
