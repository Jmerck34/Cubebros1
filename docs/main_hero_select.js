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
import { Level } from './world/Level.js';
import { Environment } from './world/Environment.js';
import { ParallaxManager } from './world/ParallaxManager.js';
import { CameraFollow } from './camera/CameraFollow.js';
import { checkAABBCollision } from './utils/collision.js';
import { Goomba } from './entities/Goomba.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { DebugMenu } from './ui/DebugMenu.js';

// Game state
let gameStarted = false;
let scene, camera, camera2, renderer, input, input2, level, environment, player, player2, uiManager, uiManager2, cameraFollow, cameraFollow2, parallaxManager, gameLoop, pauseMenu, debugMenu;
const VIEW_SIZE = 10;

// Hero selection
let localMultiplayerEnabled = false;
let selectedHeroClassP1 = null;
let pendingHeroClassP1 = null;
let pendingHeroClassP2 = null;
let selectedTeamP1 = null;
let selectedTeamP2 = null;
let teamSelectionIndex = 0;
let heroMenuTitle, heroMenuSubtitle, heroMenuControls, coopToggle, coopHint;
let teamMenu, teamMenuTitle, teamMenuSubtitle, teamButtonBlue, teamButtonRed;
let heroMenuTitleDefault = '';
let heroMenuSubtitleDefault = '';
let heroMenuControlsDefault = '';
let menuItems = [];
let menuFocusIndex = 0;
let menuLastNavTime = 0;
let menuSelectLocked = false;
let menuBackLocked = false;

const MENU_AXIS_DEADZONE = 0.5;
const MENU_NAV_COOLDOWN_MS = 180;

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

    camera = new THREE.OrthographicCamera(-VIEW_SIZE, VIEW_SIZE, VIEW_SIZE, -VIEW_SIZE, 0.1, 1000);
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
        renderer.setSize(window.innerWidth, window.innerHeight);
        updateCameraFrustum(camera, window.innerWidth, window.innerHeight);
        if (camera2) {
            updateCameraFrustum(camera2, window.innerWidth * 0.5, window.innerHeight);
        }
    });
}

function updateCameraFrustum(targetCamera, width, height) {
    if (!targetCamera) return;
    const aspect = width / height;
    targetCamera.left = -VIEW_SIZE * aspect;
    targetCamera.right = VIEW_SIZE * aspect;
    targetCamera.top = VIEW_SIZE;
    targetCamera.bottom = -VIEW_SIZE;
    targetCamera.updateProjectionMatrix();
}

// Start game with selected hero
function startGame(HeroClass, HeroClassP2 = null, teamP1 = 'blue', teamP2 = 'red') {

    // Hide menu
    document.getElementById('hero-menu').style.display = 'none';
    if (teamMenu) {
        teamMenu.style.display = 'none';
    }
    document.getElementById('ability-ui').style.display = 'flex';
    const abilityUiP2 = document.getElementById('ability-ui-p2');
    if (abilityUiP2) {
        abilityUiP2.style.display = HeroClassP2 ? 'flex' : 'none';
    }
    document.body.classList.toggle('split-screen-active', Boolean(HeroClassP2));

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

    const spawnP1 = getTeamSpawn(level, teamP1);
    player = new HeroClass(scene, spawnP1.x, spawnP1.y);
    player.team = teamP1;
    player.spawnPoint = { x: spawnP1.x, y: spawnP1.y };
    player.enemies = level.enemies;
    player.level = level; // Pass level reference for platform detection
    player.opponents = [];

    player2 = null;
    if (HeroClassP2) {
        const spawnP2 = getTeamSpawn(level, teamP2);
        player2 = new HeroClassP2(scene, spawnP2.x, spawnP2.y);
        player2.team = teamP2;
        player2.spawnPoint = { x: spawnP2.x, y: spawnP2.y };
        player2.enemies = level.enemies;
        player2.level = level;
        player2.opponents = [];
    }

    if (player2 && player.team !== player2.team) {
        player.opponents = [player2];
        player2.opponents = [player];
    }

    // Setup UI manager
    uiManager = new UIManager(player);
    uiManager2 = player2 ? new UIManager(player2, { suffix: 'p2' }) : null;

    // Setup camera follow
    cameraFollow = new CameraFollow(camera, player);
    cameraFollow.setSmoothing(0.1);
    camera2 = null;
    cameraFollow2 = null;
    if (player2) {
        camera2 = new THREE.OrthographicCamera(-VIEW_SIZE, VIEW_SIZE, VIEW_SIZE, -VIEW_SIZE, 0.1, 1000);
        camera2.position.set(0, 0, 10);
        camera2.lookAt(0, 0, 0);
        cameraFollow2 = new CameraFollow(camera2, player2);
        cameraFollow2.setSmoothing(0.1);
        updateCameraFrustum(camera2, window.innerWidth * 0.5, window.innerHeight);
    }
    updateCameraFrustum(camera, window.innerWidth, window.innerHeight);

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

            const size = renderer.getSize(new THREE.Vector2());
            const fullWidth = size.x;
            const fullHeight = size.y;
            const halfWidth = player2 ? Math.floor(fullWidth / 2) : fullWidth;
            const aimP1 = getAimDirection({
                input,
                camera,
                renderer,
                viewport: { x: 0, y: 0, width: halfWidth, height: fullHeight },
                origin: player.position,
                useMouse: true
            });
            if (typeof player.setAimDirection === 'function') {
                player.setAimDirection(aimP1);
            }

            if (player2 && camera2 && input2) {
                const aimP2 = getAimDirection({
                    input: input2,
                    camera: camera2,
                    renderer,
                    viewport: { x: halfWidth, y: 0, width: fullWidth - halfWidth, height: fullHeight },
                    origin: player2.position,
                    useMouse: false
                });
                if (typeof player2.setAimDirection === 'function') {
                    player2.setAimDirection(aimP2);
                }
            }

            player.update(deltaTime, input);
            if (player2 && input2) {
                player2.update(deltaTime, input2);
            }
            level.update(deltaTime);
            level.checkCollisions(player);
            if (player2) {
                level.checkCollisions(player2);
            }
            player.checkEnemyCollisions(level.enemies);
            if (player2) {
                player2.checkEnemyCollisions(level.enemies);
            }
            if (player2 && player.team !== player2.team) {
                const p1Bounds = player.getBounds();
                const p2Bounds = player2.getBounds();
                if (checkAABBCollision(p1Bounds, p2Bounds)) {
                    player.applyEnemyContact(player2);
                    player2.applyEnemyContact(player);
                }
            }
            cameraFollow.update();
            if (cameraFollow2) {
                cameraFollow2.update();
            }
            parallaxManager.update();
            uiManager.update();
            if (uiManager2) {
                uiManager2.update();
            }

            // Update environment animations
            environment.update(deltaTime);
        },
        () => {
            const size = renderer.getSize(new THREE.Vector2());
            const fullWidth = size.x;
            const fullHeight = size.y;

            if (player2 && camera2) {
                const halfWidth = Math.floor(fullWidth / 2);
                renderer.autoClear = false;
                renderer.setScissorTest(true);
                renderer.clear();

                updateCameraFrustum(camera, halfWidth, fullHeight);
                renderer.setViewport(0, 0, halfWidth, fullHeight);
                renderer.setScissor(0, 0, halfWidth, fullHeight);
                renderer.render(scene, camera);

                updateCameraFrustum(camera2, fullWidth - halfWidth, fullHeight);
                renderer.setViewport(halfWidth, 0, fullWidth - halfWidth, fullHeight);
                renderer.setScissor(halfWidth, 0, fullWidth - halfWidth, fullHeight);
                renderer.render(scene, camera2);

                renderer.setScissorTest(false);
            } else {
                renderer.autoClear = true;
                renderer.setScissorTest(false);
                updateCameraFrustum(camera, fullWidth, fullHeight);
                renderer.setViewport(0, 0, fullWidth, fullHeight);
                renderer.render(scene, camera);
            }
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

function getTeamSpawn(levelInstance, team) {
    const spawns = levelInstance.flagSpawns || {};
    const fallback = { x: 0, y: 0 };
    if (team === 'red') {
        return spawns.red || fallback;
    }
    return spawns.blue || fallback;
}

function showTeamMenu(playerIndex) {
    teamSelectionIndex = playerIndex;
    if (teamMenu) {
        teamMenu.style.display = 'flex';
    }
    const heroMenu = document.getElementById('hero-menu');
    if (heroMenu) {
        heroMenu.style.display = 'none';
    }
    updateTeamMenuCopy();
}

function hideTeamMenu() {
    if (teamMenu) {
        teamMenu.style.display = 'none';
    }
}

function updateTeamMenuCopy() {
    const label = teamSelectionIndex === 2 ? 'PLAYER 2' : 'PLAYER 1';
    if (teamMenuTitle) {
        teamMenuTitle.textContent = `${label}: PICK YOUR TEAM`;
    }
    if (teamMenuSubtitle) {
        teamMenuSubtitle.textContent = 'Choose your flag to spawn at.';
    }
}

function handleTeamSelect(team) {
    if (teamSelectionIndex === 1) {
        selectedTeamP1 = team;
        if (pendingHeroClassP2) {
            teamSelectionIndex = 2;
            updateTeamMenuCopy();
            return;
        }
        hideTeamMenu();
        startGame(pendingHeroClassP1, null, selectedTeamP1, null);
        return;
    }

    selectedTeamP2 = team;
    hideTeamMenu();
    startGame(pendingHeroClassP1, pendingHeroClassP2, selectedTeamP1, selectedTeamP2);
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
    camera2 = null;
    cameraFollow2 = null;
    pendingHeroClassP1 = null;
    pendingHeroClassP2 = null;
    selectedTeamP1 = null;
    selectedTeamP2 = null;
    input2 = null;
    uiManager2 = null;

    // Show menu again
    document.getElementById('hero-menu').style.display = 'flex';
    document.getElementById('ability-ui').style.display = 'none';
    const abilityUiP2 = document.getElementById('ability-ui-p2');
    if (abilityUiP2) {
        abilityUiP2.style.display = 'none';
    }
    hideTeamMenu();

    gameStarted = false;
    selectedHeroClassP1 = null;
    document.body.classList.remove('split-screen-active');
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
            ? 'P1: A/D = Move | W/Space = Jump | Left Click/Q, Right Click, E, R = Abilities | Controller: D-pad/Stick + A = Select'
            : heroMenuControlsDefault;
    }
}

function handleHeroSelect(HeroClass) {
    if (!localMultiplayerEnabled) {
        pendingHeroClassP1 = HeroClass;
        pendingHeroClassP2 = null;
        showTeamMenu(1);
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
            heroMenuControls.textContent = 'Player 2 controls: Controller 1 preferred | Arrows/J-L = Move | Up/I = Jump | U/O/K/P = Abilities | Controller: D-pad/Stick + A = Select | B = Back';
        }
        return;
    }

    pendingHeroClassP1 = selectedHeroClassP1;
    pendingHeroClassP2 = HeroClass;
    selectedHeroClassP1 = null;
    showTeamMenu(1);
}

function buildMenuItems() {
    const items = [];
    if (coopToggle) {
        items.push(coopToggle);
    }
    const cards = Array.from(document.querySelectorAll('.hero-card'));
    items.push(...cards);
    menuItems = items;
    if (menuFocusIndex >= menuItems.length) {
        menuFocusIndex = Math.max(0, menuItems.length - 1);
    }
    updateMenuFocus();
}

function updateMenuFocus() {
    menuItems.forEach((item, index) => {
        if (index === menuFocusIndex) {
            item.classList.add('menu-focus');
        } else {
            item.classList.remove('menu-focus');
        }
    });

    const focused = menuItems[menuFocusIndex];
    if (focused && typeof focused.scrollIntoView === 'function') {
        focused.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
}

function moveMenuFocus(delta) {
    if (!menuItems.length) return;
    const nextIndex = (menuFocusIndex + delta + menuItems.length) % menuItems.length;
    if (nextIndex !== menuFocusIndex) {
        menuFocusIndex = nextIndex;
        updateMenuFocus();
    }
}

function activateMenuItem() {
    const focused = menuItems[menuFocusIndex];
    if (focused && typeof focused.click === 'function') {
        focused.click();
    }
}

function handleMenuBack() {
    if (localMultiplayerEnabled && selectedHeroClassP1) {
        setCoopEnabled(localMultiplayerEnabled);
        return true;
    }
    return false;
}

function pollMenuGamepad() {
    if (gameStarted || !navigator.getGamepads) return;

    const pads = navigator.getGamepads();
    let pad = null;
    for (const candidate of pads) {
        if (candidate && candidate.connected) {
            pad = candidate;
            break;
        }
    }
    if (!pad) return;

    const now = performance.now();
    const axisX = pad.axes[0] || 0;
    const axisY = pad.axes[1] || 0;

    const up = (pad.buttons[12] && pad.buttons[12].pressed) || axisY < -MENU_AXIS_DEADZONE;
    const down = (pad.buttons[13] && pad.buttons[13].pressed) || axisY > MENU_AXIS_DEADZONE;
    const left = (pad.buttons[14] && pad.buttons[14].pressed) || axisX < -MENU_AXIS_DEADZONE;
    const right = (pad.buttons[15] && pad.buttons[15].pressed) || axisX > MENU_AXIS_DEADZONE;

    if ((up || down || left || right) && now - menuLastNavTime > MENU_NAV_COOLDOWN_MS) {
        const delta = (down || right) ? 1 : -1;
        moveMenuFocus(delta);
        menuLastNavTime = now;
    }

    const selectPressed = pad.buttons[0] && pad.buttons[0].pressed;
    if (selectPressed && !menuSelectLocked) {
        activateMenuItem();
        menuSelectLocked = true;
    } else if (!selectPressed) {
        menuSelectLocked = false;
    }

    const backPressed = pad.buttons[1] && pad.buttons[1].pressed;
    if (backPressed && !menuBackLocked) {
        handleMenuBack();
        menuBackLocked = true;
    } else if (!backPressed) {
        menuBackLocked = false;
    }
}

// Initialize scene on load
window.addEventListener('load', () => {
    initScene();

    heroMenuTitle = document.getElementById('hero-menu-title');
    heroMenuSubtitle = document.getElementById('hero-menu-subtitle');
    heroMenuControls = document.getElementById('hero-menu-controls');
    coopToggle = document.getElementById('coop-toggle');
    coopHint = document.getElementById('coop-hint');
    teamMenu = document.getElementById('team-menu');
    teamMenuTitle = document.getElementById('team-menu-title');
    teamMenuSubtitle = document.getElementById('team-menu-subtitle');
    teamButtonBlue = document.getElementById('team-blue');
    teamButtonRed = document.getElementById('team-red');

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

    if (teamButtonBlue) {
        teamButtonBlue.addEventListener('click', () => handleTeamSelect('blue'));
    }
    if (teamButtonRed) {
        teamButtonRed.addEventListener('click', () => handleTeamSelect('red'));
    }

    document.addEventListener('keydown', (event) => {
        if (!teamMenu || teamMenu.style.display !== 'flex') return;
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
            handleTeamSelect('blue');
        } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
            handleTeamSelect('red');
        }
    });

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

    buildMenuItems();

    // Render empty scene while in menu
    function menuRender() {
        if (!gameStarted) {
            pollMenuGamepad();
            renderer.render(scene, camera);
            requestAnimationFrame(menuRender);
        }
    }
    menuRender();
});
