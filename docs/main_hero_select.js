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
import { Level } from './world/Level.js?v=20260109';
import { Environment } from './world/Environment.js';
import { ParallaxManager } from './world/ParallaxManager.js';
import { CameraFollow } from './camera/CameraFollow.js';
import { FreeCameraController } from './camera/FreeCameraController.js';
import { checkAABBCollision } from './utils/collision.js';
import { Goomba } from './entities/Goomba.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { DebugMenu } from './ui/DebugMenu.js';
import { PlayerStateOverlay } from './ui/PlayerStateOverlay.js';
import { updateDamageNumbers, clearDamageNumbers } from './utils/damageNumbers.js';
import { CaptureTheFlagMode } from './gameModes/CaptureTheFlagMode.js';
import { ArenaMode } from './gameModes/ArenaMode.js';
import { KingOfTheHillMode } from './gameModes/KingOfTheHillMode.js';
import { GameTestMode } from './gameModes/GameTestMode.js';
import { hilltowerMaskConfig } from './world/maps/hilltowerMap.js';
import { bowlMaskConfig } from './world/maps/bowlMap.js';
import { ctfBtbMaskConfig } from './world/maps/ctfBtbMap.js';

// Game state
let gameStarted = false;
let scene, camera, camera2, renderer, input, input2, level, environment, player, player2, uiManager, uiManager2, cameraFollow, cameraFollow2, parallaxManager, gameLoop, pauseMenus, debugMenu;
let players = [];
let inputs = [];
let uiManagers = [];
let cameras = [];
let cameraFollows = [];
let teamScoreboard, scoreBlueEl, scoreRedEl;
let teamScores = { blue: 0, red: 0 };
let gameMode = null;
let playerStateOverlay = null;
let freeCameraControllers = [];
let selectedGameMode = null;
let modeMenu = null;
let modeButtons = [];
let modeFocusIndex = 0;
let modeSelectLocked = false;
let modeBackLocked = false;
let testMapMenu = null;
let testMapButtons = [];
let testMapFocusIndex = 0;
let testMapSelectLocked = false;
let testMapBackLocked = false;
let selectedTestMapKey = '3p';
let ctfMapMenu = null;
let ctfMapButtons = [];
let ctfMapFocusIndex = 0;
let ctfMapSelectLocked = false;
let ctfMapBackLocked = false;
let selectedCtfMapKey = 'ogmap';
const VIEW_SIZE = 10;
let healthPotions = [];
let menuRenderActive = false;
let menuRenderHandle = null;
let ladderHint = null;
let kothMeter = null;
let kothMeterLabelBlue = null;
let kothMeterLabelRed = null;
let kothMeterFillBlue = null;
let kothMeterFillRed = null;

// Hero selection
const MAX_PLAYERS = 4;
let localMultiplayerEnabled = false;
let localPlayerCount = 1;
let pendingHeroClasses = Array(MAX_PLAYERS).fill(null);
let heroLocked = Array(MAX_PLAYERS).fill(false);
let selectedTeams = Array(MAX_PLAYERS).fill(null);
let heroMenu, heroMenuTitle, heroMenuSubtitle, heroMenuControls, twoPlayerToggle, threePlayerToggle, fourPlayerToggle, coopHint;
let heroGridSingle;
let heroFocusLayer = null;
let heroFocusTags = [];
let heroFocusEnterOrder = Array(MAX_PLAYERS).fill(0);
let heroFocusOrderCounter = 0;
let p1GamepadSelect, p2GamepadSelect, p3GamepadSelect, p4GamepadSelect;
let p2GamepadRow, p3GamepadRow, p4GamepadRow;
let controllerToggleButton, gamepadAssign;
let controllerMenuVisible = true;
let controllerIndicatorsActive = false;
let teamMenu;
let teamMenuPanels = [];
let teamMenuTitles = [];
let teamMenuSubtitles = [];
let teamButtonBlue = [];
let teamButtonRed = [];
let heroMenuTitleDefault = '';
let heroMenuSubtitleDefault = '';
let heroMenuControlsDefault = '';
let menuItems = [];
let heroCardItems = [];
let menuFocusIndex = 0;
let menuLastNavTime = 0;
let menuSelectLocked = false;
let menuBackLocked = false;
let heroMenuCardStartIndex = 0;
let menuFocusIndices = Array(MAX_PLAYERS).fill(0);
let menuLastNavTimes = Array(MAX_PLAYERS).fill(0);
let menuSelectLockedByPlayer = Array(MAX_PLAYERS).fill(false);
let menuBackLockedByPlayer = Array(MAX_PLAYERS).fill(false);
let readyMenu = null;
let readyConfirmButton = null;
let readyMenuActive = false;
let readyConfirmLocked = false;
let readyCancelLocked = false;
let mouseHeroSelectIndex = 0;
let teamMenuItems = [];
let teamFocusIndices = Array(MAX_PLAYERS).fill(-1);
let teamLastNavTimes = Array(MAX_PLAYERS).fill(0);
let teamSelectLocked = Array(MAX_PLAYERS).fill(false);

const MENU_AXIS_DEADZONE = 0.5;
const MENU_NAV_COOLDOWN_MS = 180;
const GAMEPAD_REFRESH_INTERVAL_MS = 800;

let p1GamepadPreference = 'auto';
let p2GamepadPreference = 'auto';
let p3GamepadPreference = 'auto';
let p4GamepadPreference = 'auto';
let lastGamepadSignature = '';
let lastGamepadRefresh = 0;
let lastPauseStartPressed = Array(MAX_PLAYERS).fill(false);

const HERO_NAMES = {
    [Warrior.name]: '⚔️ WARRIOR',
    [Assassin.name]: '🗡️ ASSASSIN',
    [Cyborg.name]: '🤖 CYBORG',
    [Archer.name]: '🏹 ARCHER',
    [Warlock.name]: '💀 WARLOCK',
    [Paladin.name]: '🛡️ PALADIN'
};

const HERO_CLASS_MAP = {
    warrior: Warrior,
    assassin: Assassin,
    cyborg: Cyborg,
    archer: Archer,
    warlock: Warlock,
    paladin: Paladin
};

const HERO_KEY_BY_CLASS = new Map(Object.entries(HERO_CLASS_MAP).map(([key, value]) => [value, key]));

const PLAYER_ONE_COOP_BINDINGS = {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['Space', 'KeyW'],
    ability1: ['Mouse0', 'KeyQ'],
    ability2: ['Mouse2'],
    ability3: ['KeyE'],
    ultimate: ['KeyR'],
    flagDrop: ['KeyF']
};

const PLAYER_TWO_BINDINGS = {
    left: ['ArrowLeft', 'KeyJ'],
    right: ['ArrowRight', 'KeyL'],
    jump: ['ArrowUp', 'KeyI'],
    ability1: ['KeyU'],
    ability2: ['KeyO'],
    ability3: ['KeyK'],
    ultimate: ['KeyP'],
    flagDrop: ['KeyP']
};

const PLAYER_THREE_BINDINGS = {
    left: ['KeyZ'],
    right: ['KeyC'],
    jump: ['KeyX'],
    ability1: ['KeyV'],
    ability2: ['KeyB'],
    ability3: ['KeyN'],
    ultimate: ['KeyM'],
    flagDrop: ['KeyM']
};

const PLAYER_FOUR_BINDINGS = {
    left: ['Numpad4'],
    right: ['Numpad6'],
    jump: ['Numpad8'],
    ability1: ['Numpad7'],
    ability2: ['Numpad9'],
    ability3: ['Numpad5'],
    ultimate: ['Numpad0'],
    flagDrop: ['Numpad0']
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
        updateAllCameraFrustums(window.innerWidth, window.innerHeight);
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

function applyMapCameraConfig(targetCamera, follow, config) {
    if (!targetCamera || !follow) return;
    const cfg = config || {};
    const smoothing = Number.isFinite(cfg.smoothing) ? cfg.smoothing : 0.1;
    follow.setSmoothing(smoothing);
    if ('followVertical' in cfg) {
        follow.setFollowVertical(cfg.followVertical);
    }
    const verticalStart = Number.isFinite(cfg.verticalFollowStart) ? cfg.verticalFollowStart : 2.5;
    const verticalMax = Number.isFinite(cfg.verticalFollowMaxOffset) ? cfg.verticalFollowMaxOffset : 22;
    follow.setVerticalFollow(verticalStart, verticalMax);
    if (cfg.offset) {
        follow.setOffset(cfg.offset);
    }
    if (cfg.bounds) {
        follow.setBounds(cfg.bounds);
    }
    if (Number.isFinite(cfg.zoom)) {
        targetCamera.zoom = cfg.zoom;
        targetCamera.updateProjectionMatrix();
    }
}

function getViewportForIndex(index, playerCount, fullWidth, fullHeight) {
    if (playerCount <= 1) {
        return { x: 0, y: 0, width: fullWidth, height: fullHeight };
    }
    if (playerCount === 2) {
        const halfWidth = Math.floor(fullWidth / 2);
        return {
            x: index === 0 ? 0 : halfWidth,
            y: 0,
            width: index === 0 ? halfWidth : fullWidth - halfWidth,
            height: fullHeight
        };
    }
    const halfWidth = Math.floor(fullWidth / 2);
    const halfHeight = Math.floor(fullHeight / 2);
    const col = index % 2;
    const row = index < 2 ? 1 : 0;
    return {
        x: col === 0 ? 0 : halfWidth,
        y: row === 1 ? halfHeight : 0,
        width: col === 0 ? halfWidth : fullWidth - halfWidth,
        height: row === 1 ? halfHeight : fullHeight - halfHeight
    };
}

function updateAllCameraFrustums(fullWidth, fullHeight) {
    if (!cameras.length) {
        updateCameraFrustum(camera, fullWidth, fullHeight);
        return;
    }
    for (let i = 0; i < cameras.length; i += 1) {
        const viewport = getViewportForIndex(i, localPlayerCount, fullWidth, fullHeight);
        updateCameraFrustum(cameras[i], viewport.width, viewport.height);
    }
}

function initScoreboard() {
    teamScoreboard = document.getElementById('team-scoreboard');
    scoreBlueEl = document.getElementById('score-blue');
    scoreRedEl = document.getElementById('score-red');
    setScoreboardVisible(false);
}

function setScoreboardVisible(visible) {
    if (teamScoreboard) {
        teamScoreboard.style.display = visible ? 'flex' : 'none';
    }
}

function updateScoreboard(scores = teamScores) {
    if (!scores) return;
    if (scoreBlueEl) {
        scoreBlueEl.textContent = `${scores.blue ?? 0}`;
    }
    if (scoreRedEl) {
        scoreRedEl.textContent = `${scores.red ?? 0}`;
    }
}

function setKothMeterVisible(visible) {
    if (kothMeter) {
        kothMeter.style.display = visible ? 'flex' : 'none';
    }
}

function updateKothMeter({ team, score, max }) {
    if (!kothMeter || !kothMeterLabelBlue || !kothMeterLabelRed || !kothMeterFillBlue || !kothMeterFillRed) return;
    const safeMax = Number.isFinite(max) ? max : 50;
    const blueScore = Number.isFinite(score?.blue) ? Math.max(0, Math.min(safeMax, score.blue)) : 0;
    const redScore = Number.isFinite(score?.red) ? Math.max(0, Math.min(safeMax, score.red)) : 0;
    kothMeterLabelBlue.textContent = `BLUE ${blueScore}/${safeMax}`;
    kothMeterLabelRed.textContent = `RED ${redScore}/${safeMax}`;
    kothMeterFillBlue.style.width = `${safeMax > 0 ? (blueScore / safeMax) * 100 : 0}%`;
    kothMeterFillRed.style.width = `${safeMax > 0 ? (redScore / safeMax) * 100 : 0}%`;
}


function getConnectedGamepadInfo() {
    if (!navigator.getGamepads) return [];
    const pads = navigator.getGamepads();
    const connected = [];
    for (const pad of pads) {
        if (pad && pad.connected) {
            connected.push({ index: pad.index, id: pad.id || '' });
        }
    }
    connected.sort((a, b) => a.index - b.index);
    return connected;
}

function buildGamepadSelectOptions(selectEl, selectedValue, pads, autoLabel) {
    if (!selectEl) return selectedValue || 'auto';
    const options = [
        { value: 'auto', label: autoLabel || 'Auto (first available)' },
        { value: 'none', label: 'None (keyboard only)' }
    ];

    pads.forEach((pad) => {
        const name = pad.id ? pad.id.trim() : `Gamepad ${pad.index + 1}`;
        options.push({ value: String(pad.index), label: `Pad ${pad.index + 1}: ${name}` });
    });

    selectEl.textContent = '';
    options.forEach((option) => {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        selectEl.appendChild(element);
    });

    let resolvedValue = selectedValue || 'auto';
    if (!options.some((option) => option.value === resolvedValue)) {
        resolvedValue = 'auto';
    }
    selectEl.value = resolvedValue;
    return resolvedValue;
}

function refreshGamepadSelects(force = false) {
    if (!p1GamepadSelect || !navigator.getGamepads) return;
    const pads = getConnectedGamepadInfo();
    const signature = pads.map((pad) => `${pad.index}:${pad.id}`).join('|');
    if (!force && signature === lastGamepadSignature) return;
    lastGamepadSignature = signature;

    const p1Value = p1GamepadSelect.value || p1GamepadPreference;
    p1GamepadPreference = buildGamepadSelectOptions(p1GamepadSelect, p1Value, pads, 'Auto (first controller)');

    if (p2GamepadSelect) {
        const p2Value = p2GamepadSelect.value || p2GamepadPreference;
        p2GamepadPreference = buildGamepadSelectOptions(p2GamepadSelect, p2Value, pads, 'Auto (second controller)');
    }

    if (p3GamepadSelect) {
        const p3Value = p3GamepadSelect.value || p3GamepadPreference;
        p3GamepadPreference = buildGamepadSelectOptions(p3GamepadSelect, p3Value, pads, 'Auto (third controller)');
    }

    if (p4GamepadSelect) {
        const p4Value = p4GamepadSelect.value || p4GamepadPreference;
        p4GamepadPreference = buildGamepadSelectOptions(p4GamepadSelect, p4Value, pads, 'Auto (fourth controller)');
    }
    updateControllerIndicatorVisibility();
}

function updateGamepadSelectVisibility() {
    if (p2GamepadRow) {
        p2GamepadRow.style.display = localPlayerCount >= 2 ? 'flex' : 'none';
    }
    if (p3GamepadRow) {
        p3GamepadRow.style.display = localPlayerCount >= 3 ? 'flex' : 'none';
    }
    if (p4GamepadRow) {
        p4GamepadRow.style.display = localPlayerCount >= 4 ? 'flex' : 'none';
    }
    if (p2GamepadSelect) {
        p2GamepadSelect.disabled = localPlayerCount < 2;
    }
    if (p3GamepadSelect) {
        p3GamepadSelect.disabled = localPlayerCount < 3;
    }
    if (p4GamepadSelect) {
        p4GamepadSelect.disabled = localPlayerCount < 4;
    }
}

function setControllerMenuVisible(visible) {
    controllerMenuVisible = visible;
    if (gamepadAssign) {
        gamepadAssign.style.display = visible ? 'flex' : 'none';
    }
    if (controllerToggleButton) {
        controllerToggleButton.textContent = visible ? 'Controllers: On' : 'Controllers: Off';
        controllerToggleButton.setAttribute('aria-pressed', String(visible));
    }
}

function shouldShowControllerIndicators() {
    const pads = getConnectedGamepadInfo();
    if (pads.length > 0) {
        return true;
    }
    const preferences = [p1GamepadPreference, p2GamepadPreference, p3GamepadPreference, p4GamepadPreference]
        .slice(0, localPlayerCount);
    return preferences.some((pref) => pref && pref !== 'none' && pref !== 'auto');
}

function updateControllerIndicatorVisibility() {
    controllerIndicatorsActive = shouldShowControllerIndicators();
    document.body.classList.toggle('controller-indicators-active', controllerIndicatorsActive);
    if (heroFocusLayer) {
        heroFocusLayer.style.display = controllerIndicatorsActive ? 'block' : 'none';
    }
    if (!controllerIndicatorsActive) {
        heroFocusTags.forEach((tag) => {
            if (tag) {
                tag.style.opacity = '0';
            }
        });
        heroCardItems.forEach((item) => {
            item.classList.remove('menu-focus-p1', 'menu-focus-p2', 'menu-focus-p3', 'menu-focus-p4');
        });
    }
}

function resolveGamepadAssignments() {
    const pads = getConnectedGamepadInfo();
    const connectedIndices = pads.map((pad) => pad.index);
    const used = new Set();
    const preferences = [p1GamepadPreference, p2GamepadPreference, p3GamepadPreference, p4GamepadPreference];
    const useOrdinalAuto = preferences.slice(0, localPlayerCount).every((pref) => pref === 'auto');

    const resolvePreference = (preference, allowAutoFallback, autoOrdinal = null) => {
        const normalized = preference || 'auto';
        if (normalized === 'none') {
            return { enabled: false, index: null };
        }
        if (normalized === 'auto') {
            if (autoOrdinal !== null) {
                const ordinalIndex = connectedIndices[autoOrdinal];
                if (ordinalIndex !== undefined) {
                    used.add(ordinalIndex);
                    return { enabled: true, index: ordinalIndex };
                }
                return { enabled: allowAutoFallback, index: null };
            }
            const available = connectedIndices.find((index) => !used.has(index));
            if (available !== undefined) {
                used.add(available);
                return { enabled: true, index: available };
            }
            return { enabled: allowAutoFallback, index: null };
        }
        const parsed = parseInt(normalized, 10);
        if (!Number.isInteger(parsed)) {
            return { enabled: false, index: null };
        }
        used.add(parsed);
        return { enabled: true, index: parsed };
    };

    const assignments = [];
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
        if (i >= localPlayerCount) {
            assignments.push({ enabled: false, index: null });
            continue;
        }
        assignments.push(resolvePreference(preferences[i], i === 0, useOrdinalAuto ? i : null));
    }
    return assignments;
}

// Start game with selected hero
async function startGame(heroClasses, teamSelectionsOrP1 = 'blue', teamP2 = 'red') {

    // Hide menu
    if (heroMenu) {
        heroMenu.style.display = 'none';
    } else {
        document.getElementById('hero-menu').style.display = 'none';
    }
    if (teamMenu) {
        teamMenu.style.display = 'none';
    }
    hideModeMenu();
    hideReadyMenu();
    hideModeMenu();
    updateMenuSplitState();
    document.getElementById('ability-ui').style.display = 'flex';
    const abilityUiP2 = document.getElementById('ability-ui-p2');
    const abilityUiP3 = document.getElementById('ability-ui-p3');
    const abilityUiP4 = document.getElementById('ability-ui-p4');
    if (abilityUiP2) {
        abilityUiP2.style.display = localPlayerCount >= 2 ? 'flex' : 'none';
    }
    if (abilityUiP3) {
        abilityUiP3.style.display = localPlayerCount >= 3 ? 'flex' : 'none';
    }
    if (abilityUiP4) {
        abilityUiP4.style.display = localPlayerCount >= 4 ? 'flex' : 'none';
    }
    document.body.classList.toggle('split-screen-active', localPlayerCount === 2);
    document.body.classList.toggle('split-screen-quad', localPlayerCount >= 3);

    // Initialize input managers
    const playerOneBindings = localMultiplayerEnabled ? PLAYER_ONE_COOP_BINDINGS : null;
    const playerBindings = [playerOneBindings, PLAYER_TWO_BINDINGS, PLAYER_THREE_BINDINGS, PLAYER_FOUR_BINDINGS];
    const gamepadAssignments = resolveGamepadAssignments();
    inputs = [];
    for (let i = 0; i < localPlayerCount; i += 1) {
        const inputOptions = {};
        const bindings = playerBindings[i];
        if (bindings) {
            inputOptions.bindings = bindings;
        }
        const assignment = gamepadAssignments[i] || { enabled: true, index: null };
        if (!assignment.enabled) {
            inputOptions.gamepadEnabled = false;
        }
        if (assignment.index !== null) {
            inputOptions.gamepadIndex = assignment.index;
        }
        inputs[i] = new InputManager(inputOptions);
    }
    input = inputs[0] || null;
    input2 = inputs[1] || null;

    // Create environment (background, clouds, particles)
    if (selectedGameMode === 'game-test') {
        scene.background = null;
        environment = null;
    } else {
        scene.background = new THREE.Color(0x5c94fc);
        environment = new Environment(scene);
        environment.createBackground();
    }

    // Create level with platforms
    level = new Level(scene);
    if (selectedGameMode === 'game-test') {
        if (selectedTestMapKey === 'hilltower' && typeof level.createGameTestMaskLevel === 'function') {
            await level.createGameTestMaskLevel(hilltowerMaskConfig);
        } else if (selectedTestMapKey === 'bowl' && typeof level.createGameTestMaskLevel === 'function') {
            await level.createGameTestMaskLevel(bowlMaskConfig);
        } else if (typeof level.createGameTestLevel === 'function') {
            level.createGameTestLevel();
        }
    } else if (selectedGameMode === 'ctf') {
        if (selectedCtfMapKey === 'btb' && typeof level.createCtfMaskLevel === 'function') {
            await level.createCtfMaskLevel(ctfBtbMaskConfig);
        } else {
            level.createTestLevel({ includeInteractiveFlags: false, mapKey: 'ogmap' });
        }
    } else if (selectedGameMode === 'koth' && typeof level.createKothLevel === 'function') {
        level.createKothLevel({ includeInteractiveFlags: false, mapKey: 'koth' });
    } else if (selectedGameMode === 'arena' && typeof level.createArenaLevel === 'function') {
        await level.createArenaLevel({ includeInteractiveFlags: false, mapKey: 'arena' });
    } else {
        level.createTestLevel({ includeInteractiveFlags: false, mapKey: selectedGameMode || 'playtest' });
    }
    healthPotions = createHealthPotions(level);

    // Setup parallax manager (foreground/midground/background)
    parallaxManager = new ParallaxManager(camera);
    if (environment) {
        environment.getParallaxLayers().forEach(layer => parallaxManager.addLayer(layer));
    }
    parallaxManager.addLayer({ root: level.group, speedMultiplier: 1 });

    if (selectedGameMode !== 'game-test') {
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
    }

    const resolvedHeroes = [];
    for (let i = 0; i < localPlayerCount; i += 1) {
        resolvedHeroes[i] = heroClasses[i] || heroClasses[0] || Warrior;
    }
    let teamAssignments = null;
    if (Array.isArray(teamSelectionsOrP1)) {
        teamAssignments = teamSelectionsOrP1;
    } else {
        const primaryTeam = teamSelectionsOrP1 || 'blue';
        const secondaryTeam = teamP2 || (primaryTeam === 'blue' ? 'red' : 'blue');
        teamAssignments = [
            primaryTeam,
            secondaryTeam,
            primaryTeam,
            secondaryTeam
        ];
    }
    const fallbackTeam = teamAssignments[0] || 'blue';

    players = [];
    for (let i = 0; i < localPlayerCount; i += 1) {
        const HeroClass = resolvedHeroes[i];
        const team = teamAssignments[i] || fallbackTeam;
        const spawn = getTeamSpawn(level, team);
        const hero = new HeroClass(scene, spawn.x, spawn.y);
        hero.team = team;
        hero.spawnPoint = { x: spawn.x, y: spawn.y };
        hero.enemies = level.enemies;
        hero.level = level;
        hero.opponents = [];
        players.push(hero);
    }

    players.forEach((hero, index) => {
        hero.opponents = players.filter((other, otherIndex) => otherIndex !== index && other.team !== hero.team);
    });

    player = players[0] || null;
    player2 = players[1] || null;

    // Setup UI manager
    uiManagers = players.map((hero, index) => {
        if (index === 0) {
            return new UIManager(hero);
        }
        return new UIManager(hero, { suffix: `p${index + 1}` });
    });
    uiManager = uiManagers[0] || null;
    uiManager2 = uiManagers[1] || null;

    // Setup camera follow
    cameras = [];
    cameraFollows = [];
    freeCameraControllers = [];
    cameras[0] = camera;
    cameraFollow = new CameraFollow(camera, player);
    applyMapCameraConfig(camera, cameraFollow, level.cameraConfig);
    cameraFollows[0] = cameraFollow;
    freeCameraControllers[0] = new FreeCameraController(camera);

    for (let i = 1; i < localPlayerCount; i += 1) {
        const cam = new THREE.OrthographicCamera(-VIEW_SIZE, VIEW_SIZE, VIEW_SIZE, -VIEW_SIZE, 0.1, 1000);
        cam.position.set(0, 0, 10);
        cam.lookAt(0, 0, 0);
        cameras[i] = cam;
        const follow = new CameraFollow(cam, players[i]);
        applyMapCameraConfig(cam, follow, level.cameraConfig);
        cameraFollows[i] = follow;
        freeCameraControllers[i] = new FreeCameraController(cam);
    }
    camera2 = cameras[1] || null;
    cameraFollow2 = cameraFollows[1] || null;
    updateAllCameraFrustums(window.innerWidth, window.innerHeight);

    // Create pause menus (per player)
    pauseMenus = [];
    for (let i = 0; i < localPlayerCount; i += 1) {
        pauseMenus[i] = new PauseMenu(
            () => {
                resetGame();
            },
            () => {},
            inputs[i],
            {
                playerIndex: i,
                showMenuButton: i === 0,
                getViewport: () => {
                    const size = renderer.getSize(new THREE.Vector2());
                    return getViewportForIndex(i, localPlayerCount, size.x, size.y);
                }
            }
        );
    }

    // Create debug menu (or update player if it exists)
    if (!debugMenu) {
        debugMenu = new DebugMenu(player);
    } else {
        debugMenu.setPlayer(player);
    }
    if (!playerStateOverlay) {
        playerStateOverlay = new PlayerStateOverlay(() => players[0] || player || null);
    }

    // Apply debug menu physics multipliers to all players
    const physicsMultipliers = debugMenu.getPhysicsMultipliers();
    players.forEach((activePlayer) => {
        if (activePlayer) {
            activePlayer.debugPhysics = physicsMultipliers;
        }
    });

    if (selectedGameMode === 'game-test' && typeof debugMenu.spawnTrainingDummy === 'function') {
        debugMenu.spawnTrainingDummy();
    } else if (debugMenu && typeof debugMenu.removeTrainingDummy === 'function') {
        debugMenu.removeTrainingDummy();
    }

    if (gameMode) {
        gameMode.destroy();
    }
    if (selectedGameMode === 'ctf') {
        gameMode = new CaptureTheFlagMode({
            scene,
            level,
            onScoreboardVisible: setScoreboardVisible,
            onScoreChange: (scores) => {
                teamScores = { ...scores };
                updateScoreboard(teamScores);
            }
        });
    } else if (selectedGameMode === 'game-test') {
        gameMode = new GameTestMode({
            onScoreboardVisible: setScoreboardVisible,
            onScoreChange: (scores) => {
                teamScores = { ...scores };
                updateScoreboard(teamScores);
            }
        });
    } else if (selectedGameMode === 'koth') {
        gameMode = new KingOfTheHillMode({
            scene,
            level,
            onScoreboardVisible: setScoreboardVisible,
            onScoreChange: (scores) => {
                teamScores = { ...scores };
                updateScoreboard(teamScores);
            },
            onMeterUpdate: updateKothMeter
        });
    } else {
        gameMode = new ArenaMode({
            onScoreboardVisible: setScoreboardVisible,
            onScoreChange: (scores) => {
                teamScores = { ...scores };
                updateScoreboard(teamScores);
            }
        });
    }
    gameMode.init();
    setKothMeterVisible(selectedGameMode === 'koth');

    // Game Loop
    gameLoop = new GameLoop(
        (deltaTime) => {
            inputs.forEach((activeInput) => {
                if (activeInput) {
                    activeInput.update();
                }
            });

            handlePauseGamepadToggle();
            pauseMenus?.forEach((menu) => {
                if (menu) {
                    menu.handleGamepad();
                }
            });

            // Skip game updates if debug menu is open
            if (debugMenu && debugMenu.isPaused()) {
                return;
            }

            const size = renderer.getSize(new THREE.Vector2());
            const fullWidth = size.x;
            const fullHeight = size.y;

            players.forEach((activePlayer, index) => {
                const activeCamera = cameras[index] || camera;
                const viewport = getViewportForIndex(index, localPlayerCount, fullWidth, fullHeight);
                const aim = getAimDirection({
                    input: inputs[index],
                    camera: activeCamera,
                    renderer,
                    viewport,
                    origin: activePlayer.position,
                    useMouse: index === 0
                });
                if (typeof activePlayer.setAimDirection === 'function') {
                    activePlayer.setAimDirection(aim);
                }
            });

            players.forEach((activePlayer, index) => {
                const activeInput = inputs[index];
                const menuPaused = pauseMenus?.[index]?.isPaused();
                if (menuPaused) {
                    activePlayer.forceControlsLocked = true;
                    activePlayer.velocity.x = 0;
                    activePlayer.velocity.y = 0;
                    return;
                }
                activePlayer.forceControlsLocked = false;
                if (activeInput) {
                    activePlayer.update(deltaTime, activeInput);
                }
                if (level && typeof level.applyWind === 'function') {
                    level.applyWind(activePlayer, deltaTime);
                }
            });

            level.update(deltaTime);
            players.forEach((activePlayer) => {
                level.checkCollisions(activePlayer);
                activePlayer.checkEnemyCollisions(level.enemies);
                level.checkFlagPickup(activePlayer);
            });

            for (let i = 0; i < players.length; i += 1) {
                for (let j = i + 1; j < players.length; j += 1) {
                    const a = players[i];
                    const b = players[j];
                    if (!a.isAlive || !b.isAlive) continue;
                    const aBounds = a.getBounds();
                    const bBounds = b.getBounds();
                    if (!checkAABBCollision(aBounds, bBounds)) {
                        continue;
                    }
                    const overlapX = Math.min(aBounds.right, bBounds.right) - Math.max(aBounds.left, bBounds.left);
                    if (overlapX <= 0) continue;
                    const direction = a.position.x <= b.position.x ? -1 : 1;
                    const push = overlapX / 2 + 0.01;
                    a.position.x += direction * push;
                    b.position.x -= direction * push;
                    a.velocity.x = 0;
                    b.velocity.x = 0;
                    a.mesh.position.x = a.position.x;
                    b.mesh.position.x = b.position.x;
                }
            }

            const freeCamEnabled = debugMenu && debugMenu.isFreeCameraEnabled && debugMenu.isFreeCameraEnabled();
            if (freeCamEnabled) {
                freeCameraControllers.forEach((controller) => {
                    if (controller) {
                        controller.setEnabled(true);
                        controller.update(deltaTime);
                    }
                });
            } else {
                freeCameraControllers.forEach((controller) => {
                    if (controller) {
                        controller.setEnabled(false);
                    }
                });
                cameraFollows.forEach((follow) => {
                    if (follow) {
                        follow.update();
                    }
                });
            }

            parallaxManager.update();
            uiManagers.forEach((manager) => {
                if (manager) {
                    manager.update();
                }
            });

            updateDamageNumbers(deltaTime);
            if (gameMode) {
                gameMode.update(deltaTime, players, inputs);
            }
            updateHealthPotions(deltaTime, players);
            updateLadderHint(players);
            if (playerStateOverlay) {
                playerStateOverlay.update();
            }

            // Update environment animations
            if (environment) {
                environment.update(deltaTime);
            }
        },
        () => {
            const size = renderer.getSize(new THREE.Vector2());
            const fullWidth = size.x;
            const fullHeight = size.y;

            if (localPlayerCount > 1) {
                renderer.autoClear = false;
                renderer.setScissorTest(true);
                renderer.clear();

                for (let i = 0; i < localPlayerCount; i += 1) {
                    const viewport = getViewportForIndex(i, localPlayerCount, fullWidth, fullHeight);
                    const activeCamera = cameras[i] || camera;
                    updateCameraFrustum(activeCamera, viewport.width, viewport.height);
                    renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
                    renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
                    renderer.render(scene, activeCamera);
                }

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

    stopMenuRender();
    gameLoop.start();
    gameStarted = true;

    // Log hero info
    resolvedHeroes.forEach((HeroClass, index) => {
        const heroLabel = HERO_NAMES[HeroClass.name] || HeroClass.name;
        console.log(`P${index + 1}: ${heroLabel} SELECTED!`);
    });
    if (localMultiplayerEnabled) {
        console.log('P1: A/D = Move | W/Space = Jump | Q/Left Click = A1 | Right Click = A2 | E = A3 | R = Ultimate');
        console.log('P2: Arrows/J-L = Move | Up/I = Jump | U/O/K/P = Abilities');
        if (localPlayerCount >= 3) {
            console.log('P3: Z/C = Move | X = Jump | V/B/N/M = Abilities');
        }
        if (localPlayerCount >= 4) {
            console.log('P4: Numpad4/6 = Move | Numpad8 = Jump | Numpad7/9/5/0 = Abilities');
        }
    } else {
        console.log('Move: Arrow Keys/A/D | Jump: W/Space (double jump!)');
        console.log('Abilities: Q/Left Click = A1 | Right Click = A2 | E = A3 | R = Ultimate');
    }
    console.log('Gamepad: Left Stick/D-Pad move | Right Stick = Aim | A = Jump | RT = A1 | LT = A2 | RB = A3 | LB = Ultimate');
}

function getTeamSpawn(levelInstance, team) {
    const spawns = levelInstance.playerSpawns || levelInstance.flagSpawns || {};
    const fallback = { x: 0, y: 0 };
    if (team === 'red') {
        return spawns.red || fallback;
    }
    return spawns.blue || fallback;
}

function showTeamMenu() {
    hideReadyMenu();
    if (teamMenu) {
        teamMenu.style.display = 'flex';
        teamMenu.classList.toggle('split', localMultiplayerEnabled);
    }
    if (heroMenu) {
        heroMenu.style.display = 'none';
    }
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
        if (teamMenuPanels[i]) {
            teamMenuPanels[i].style.display = i < localPlayerCount ? 'flex' : 'none';
        }
        teamSelectLocked[i] = false;
        teamLastNavTimes[i] = 0;
        if (teamMenuTitles[i]) {
            teamMenuTitles[i].textContent = localMultiplayerEnabled
                ? `PLAYER ${i + 1}: PICK YOUR TEAM`
                : 'PICK YOUR TEAM';
        }
        if (teamMenuSubtitles[i]) {
            teamMenuSubtitles[i].textContent = 'Choose your flag to spawn at.';
        }
        if (selectedTeams[i]) {
            teamFocusIndices[i] = selectedTeams[i] === 'blue' ? 0 : 1;
        }
        updateTeamMenuFocus(i + 1);
    }
    updateTeamSelectionUI();
    updateMenuSplitState();
}

function hideTeamMenu() {
    if (teamMenu) {
        teamMenu.style.display = 'none';
    }
    updateMenuSplitState();
}

function showModeMenu() {
    hideReadyMenu();
    if (modeMenu) {
        modeMenu.style.display = 'flex';
    }
    if (testMapMenu) {
        testMapMenu.style.display = 'none';
    }
    if (ctfMapMenu) {
        ctfMapMenu.style.display = 'none';
    }
    if (heroMenu) {
        heroMenu.style.display = 'none';
    }
    if (teamMenu) {
        teamMenu.style.display = 'none';
    }
    modeFocusIndex = -1;
    updateModeMenuFocus();
    updateMenuSplitState();
}

function hideModeMenu() {
    if (modeMenu) {
        modeMenu.style.display = 'none';
    }
    updateMenuSplitState();
}

function updateModeMenuFocus() {
    if (!modeButtons.length) return;
    modeButtons.forEach((button, index) => {
        button.classList.toggle('menu-focus', index === modeFocusIndex);
    });
}

function moveModeMenuFocus(delta) {
    if (!modeButtons.length) return;
    if (modeFocusIndex < 0) {
        modeFocusIndex = 0;
    } else {
        modeFocusIndex = (modeFocusIndex + delta + modeButtons.length) % modeButtons.length;
    }
    updateModeMenuFocus();
}

function showTestMapMenu() {
    hideReadyMenu();
    if (testMapMenu) {
        testMapMenu.style.display = 'flex';
    }
    if (ctfMapMenu) {
        ctfMapMenu.style.display = 'none';
    }
    if (heroMenu) {
        heroMenu.style.display = 'none';
    }
    if (teamMenu) {
        teamMenu.style.display = 'none';
    }
    if (selectedTestMapKey && testMapButtons.length) {
        const matchIndex = testMapButtons.findIndex((button) => button?.id === `map-${selectedTestMapKey}`);
        testMapFocusIndex = matchIndex >= 0 ? matchIndex : -1;
    } else {
        testMapFocusIndex = -1;
    }
    updateTestMapMenuFocus();
    updateMenuSplitState();
}

function hideTestMapMenu() {
    if (testMapMenu) {
        testMapMenu.style.display = 'none';
    }
    updateMenuSplitState();
}

function showCtfMapMenu() {
    hideReadyMenu();
    if (ctfMapMenu) {
        ctfMapMenu.style.display = 'flex';
    }
    if (testMapMenu) {
        testMapMenu.style.display = 'none';
    }
    if (heroMenu) {
        heroMenu.style.display = 'none';
    }
    if (teamMenu) {
        teamMenu.style.display = 'none';
    }
    if (selectedCtfMapKey && ctfMapButtons.length) {
        const matchIndex = ctfMapButtons.findIndex((button) => button?.id === `ctf-map-${selectedCtfMapKey}`);
        ctfMapFocusIndex = matchIndex >= 0 ? matchIndex : -1;
    } else {
        ctfMapFocusIndex = -1;
    }
    updateCtfMapMenuFocus();
    updateMenuSplitState();
}

function hideCtfMapMenu() {
    if (ctfMapMenu) {
        ctfMapMenu.style.display = 'none';
    }
    updateMenuSplitState();
}

function updateCtfMapMenuFocus() {
    if (!ctfMapButtons.length) return;
    ctfMapButtons.forEach((button, index) => {
        button.classList.toggle('menu-focus', index === ctfMapFocusIndex);
    });
}

function moveCtfMapMenuFocus(delta) {
    if (!ctfMapButtons.length) return;
    if (ctfMapFocusIndex < 0) {
        ctfMapFocusIndex = 0;
    } else {
        ctfMapFocusIndex = (ctfMapFocusIndex + delta + ctfMapButtons.length) % ctfMapButtons.length;
    }
    updateCtfMapMenuFocus();
}

function selectCtfMap(mapKey) {
    selectedCtfMapKey = mapKey;
    hideCtfMapMenu();
    showTeamMenu();
}

function updateTestMapMenuFocus() {
    if (!testMapButtons.length) return;
    testMapButtons.forEach((button, index) => {
        button.classList.toggle('menu-focus', index === testMapFocusIndex);
    });
}

function moveTestMapMenuFocus(delta) {
    if (!testMapButtons.length) return;
    if (testMapFocusIndex < 0) {
        testMapFocusIndex = 0;
    } else {
        testMapFocusIndex = (testMapFocusIndex + delta + testMapButtons.length) % testMapButtons.length;
    }
    updateTestMapMenuFocus();
}

function selectTestMap(mapKey) {
    selectedTestMapKey = mapKey;
    hideTestMapMenu();
    showTeamMenu();
}

function selectGameMode(modeKey) {
    selectedGameMode = modeKey;
    hideModeMenu();
    if (modeKey === 'game-test') {
        showTestMapMenu();
    } else if (modeKey === 'ctf') {
        showCtfMapMenu();
    } else {
        showTeamMenu();
    }
}

function handleTeamSelect(team, playerIndex = 1) {
    if (!localMultiplayerEnabled) {
        selectedTeams[0] = team;
        hideTeamMenu();
        startGame(pendingHeroClasses, [team]);
        return;
    }

    const index = playerIndex - 1;
    selectedTeams[index] = team;
    updateTeamSelectionUI();

    const ready = selectedTeams.slice(0, localPlayerCount).every(Boolean);
    if (ready) {
        hideTeamMenu();
        startGame(pendingHeroClasses, selectedTeams.slice(0, localPlayerCount));
    }
}

// Reset game (return to menu)
function resetGame() {
    if (gameLoop) {
        gameLoop.stop();
    }

    // Destroy pause menu
    if (pauseMenus && pauseMenus.length) {
        pauseMenus.forEach((menu) => {
            if (menu) {
                menu.destroy();
            }
        });
        pauseMenus = [];
    }

    // Clear scene
    if (scene) {
        players.forEach((activePlayer) => {
            if (activePlayer && typeof activePlayer.destroy === 'function') {
                activePlayer.destroy();
            }
        });
        scene.clear();
    }
    if (gameMode) {
        gameMode.destroy();
        gameMode = null;
    }
    setKothMeterVisible(false);
    clearDamageNumbers();
    removeHealthPotions();
    parallaxManager = null;
    players = [];
    inputs = [];
    uiManagers = [];
    cameras = [];
    cameraFollows = [];
    player = null;
    player2 = null;
    input = null;
    input2 = null;
    uiManager = null;
    uiManager2 = null;
    camera2 = null;
    cameraFollow2 = null;
    pendingHeroClasses.fill(null);
    selectedTeams.fill(null);
    heroLocked.fill(false);
    hideReadyMenu();

    // Show menu again
    if (heroMenu) {
        heroMenu.style.display = 'flex';
    } else {
        document.getElementById('hero-menu').style.display = 'flex';
    }
    document.getElementById('ability-ui').style.display = 'none';
    const abilityUiP2 = document.getElementById('ability-ui-p2');
    const abilityUiP3 = document.getElementById('ability-ui-p3');
    const abilityUiP4 = document.getElementById('ability-ui-p4');
    [abilityUiP2, abilityUiP3, abilityUiP4].forEach((element) => {
        if (element) {
            element.style.display = 'none';
        }
    });
    hideTeamMenu();

    gameStarted = false;
    document.body.classList.remove('split-screen-active', 'split-screen-quad', 'menu-split-active');
    buildTeamMenuItems();
    setPlayerCount(1);
    startMenuRender();
}

function setPlayerCount(count) {
    localPlayerCount = Math.max(1, Math.min(MAX_PLAYERS, count));
    localMultiplayerEnabled = localPlayerCount > 1;
    pendingHeroClasses.fill(null);
    heroLocked.fill(false);
    selectedTeams.fill(null);
    selectedGameMode = null;
    mouseHeroSelectIndex = 0;
    hideReadyMenu();

    if (twoPlayerToggle) {
        twoPlayerToggle.classList.toggle('active', localPlayerCount === 2);
    }
    if (threePlayerToggle) {
        threePlayerToggle.classList.toggle('active', localPlayerCount === 3);
    }
    if (fourPlayerToggle) {
        fourPlayerToggle.classList.toggle('active', localPlayerCount === 4);
    }

    if (coopHint) {
        coopHint.style.display = localMultiplayerEnabled ? 'block' : 'none';
        if (localPlayerCount >= 4) {
            coopHint.textContent = 'P2: Arrows/J-L move, Up/I jump, U/O/K/P abilities | P3: Z/C move, X jump, V/B/N/M abilities | P4: Numpad4/6 move, Numpad8 jump, Numpad7/9/5/0 abilities';
        } else if (localPlayerCount === 3) {
            coopHint.textContent = 'P2: Arrows/J-L move, Up/I jump, U/O/K/P abilities | P3: Z/C move, X jump, V/B/N/M abilities';
        } else if (localPlayerCount === 2) {
            coopHint.textContent = 'P2: Use controller selection below or arrows/J-L move, Up/I jump, U/O/K/P abilities';
        }
    }

    updateGamepadSelectVisibility();

    if (heroMenuTitle) {
        heroMenuTitle.textContent = localMultiplayerEnabled
            ? `🎮 PLAYER 1-${localPlayerCount}: SELECT YOUR HEROES 🎮`
            : heroMenuTitleDefault;
    }
    if (heroMenuSubtitle) {
        heroMenuSubtitle.textContent = localMultiplayerEnabled ? 'Choose heroes at the same time.' : heroMenuSubtitleDefault;
    }
    if (heroMenuControls) {
        heroMenuControls.textContent = localMultiplayerEnabled
            ? `P1-P${localPlayerCount}: Use D-pad/Stick + A to select | P1 confirms when all selected`
            : heroMenuControlsDefault;
    }
    if (heroMenu) {
        heroMenu.classList.toggle('coop', localMultiplayerEnabled);
    }
    refreshGamepadSelects(true);
    buildMenuItems();
    if (localMultiplayerEnabled) {
        initCoopHeroMenu();
        for (let i = localPlayerCount; i < MAX_PLAYERS; i += 1) {
            heroCardItems.forEach((item) => {
                item.classList.remove(`menu-focus-p${i + 1}`);
            });
        }
    } else {
        updateAllHeroFocusTags();
        heroCardItems.forEach((item) => {
            item.classList.remove(
                'menu-focus-p1',
                'menu-focus-p2',
                'menu-focus-p3',
                'menu-focus-p4',
                'selected-p1',
                'selected-p2',
                'selected-p3',
                'selected-p4',
                'locked-p1',
                'locked-p2',
                'locked-p3',
                'locked-p4',
                'hero-select-pop'
            );
        });
    }
    updateMenuSplitState();
}

function togglePlayerCount(count) {
    if (localPlayerCount === count) {
        setPlayerCount(1);
    } else {
        setPlayerCount(count);
    }
}

function selectHeroForPlayer(HeroClass, playerIndex = 1) {
    if (!localMultiplayerEnabled) {
        pendingHeroClasses[0] = HeroClass;
        showModeMenu();
        return;
    }

    const index = playerIndex - 1;
    const previousHero = pendingHeroClasses[index];
    pendingHeroClasses[index] = HeroClass;
    heroLocked[index] = false;

    if (previousHero !== HeroClass) {
        const heroKey = HERO_KEY_BY_CLASS.get(HeroClass);
        triggerHeroSelectPop(heroKey);
    }

    updateCoopHeroSelectionUI();
    updateReadyMenuState();
}

function handleHeroSelect(HeroClass) {
    if (!localMultiplayerEnabled) {
        selectHeroForPlayer(HeroClass, 1);
        return;
    }
    const total = Math.max(1, localPlayerCount);
    let targetIndex = -1;
    for (let i = 0; i < total; i += 1) {
        if (!pendingHeroClasses[i]) {
            targetIndex = i;
            break;
        }
    }
    if (targetIndex === -1) {
        targetIndex = mouseHeroSelectIndex % total;
    }
    selectHeroForPlayer(HeroClass, targetIndex + 1);
    mouseHeroSelectIndex = (targetIndex + 1) % total;
}

function buildMenuItems() {
    const items = [];
    if (twoPlayerToggle) {
        items.push(twoPlayerToggle);
    }
    if (threePlayerToggle) {
        items.push(threePlayerToggle);
    }
    if (fourPlayerToggle) {
        items.push(fourPlayerToggle);
    }
    const cards = heroGridSingle ? Array.from(heroGridSingle.querySelectorAll('.hero-card')) : [];
    heroCardItems = cards;
    ensureHeroIndicators();
    heroMenuCardStartIndex = items.length;
    items.push(...cards);
    menuItems = items;
    if (menuFocusIndex >= menuItems.length) {
        menuFocusIndex = Math.max(0, menuItems.length - 1);
    }
    if (!localMultiplayerEnabled) {
        updateMenuFocus();
    }
}

function ensureHeroIndicators() {
    if (!heroGridSingle) return;
    if (!heroFocusLayer) {
        heroFocusLayer = document.createElement('div');
        heroFocusLayer.className = 'hero-focus-layer';
        heroGridSingle.appendChild(heroFocusLayer);
    }
    if (!heroFocusTags.length) {
        for (let i = 0; i < MAX_PLAYERS; i += 1) {
            const tag = document.createElement('div');
            tag.className = `hero-focus-tag p${i + 1}`;
            tag.textContent = `P${i + 1}`;
            heroFocusLayer.appendChild(tag);
            heroFocusTags.push(tag);
        }
    }

    heroCardItems.forEach((card) => {
        if (!card) return;
        const existingBookmarks = card.querySelector('.hero-bookmarks');
        if (existingBookmarks) {
            existingBookmarks.remove();
        }
        const existingSelectedTags = card.querySelector('.hero-selected-tags');
        if (existingSelectedTags) {
            existingSelectedTags.remove();
        }
        if (!card.querySelector('.hero-select-shades')) {
            const shades = document.createElement('div');
            shades.className = 'hero-select-shades';
            for (let i = 0; i < MAX_PLAYERS; i += 1) {
                const shade = document.createElement('div');
                shade.className = `hero-select-shade p${i + 1}`;
                shades.appendChild(shade);
            }
            card.appendChild(shades);
        }
    });
    updateAllHeroFocusTags();
    updateControllerIndicatorVisibility();
}

function updateHeroFocusTag(playerIndex, stackIndex = 0, stackCount = 1) {
    const tag = heroFocusTags[playerIndex - 1];
    if (!tag || !heroGridSingle) return;
    if (!shouldShowControllerIndicators()) {
        tag.style.opacity = '0';
        return;
    }
    if (!localMultiplayerEnabled || playerIndex > localPlayerCount || !heroCardItems.length || !heroMenu || heroMenu.style.display === 'none') {
        tag.style.opacity = '0';
        return;
    }
    const assignments = resolveGamepadAssignments();
    const assignment = assignments[playerIndex - 1];
    if (assignment && !assignment.enabled) {
        tag.style.opacity = '0';
        return;
    }

    const focusIndex = menuFocusIndices[playerIndex - 1] || 0;
    const card = heroCardItems[focusIndex];
    if (!card) {
        tag.style.opacity = '0';
        return;
    }
    const gridRect = heroGridSingle.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const baseX = cardRect.left - gridRect.left + cardRect.width - 52;
    const baseY = cardRect.top - gridRect.top + 10;
    const verticalSpacing = 36;
    const perPlayerOffset = (playerIndex - 1) * 16;
    const offsetY = stackCount > 1 ? stackIndex * verticalSpacing : 0;
    tag.style.transform = `translate(${baseX}px, ${baseY + offsetY + perPlayerOffset}px)`;
    tag.style.opacity = '1';
}

function updateAllHeroFocusTags() {
    if (!heroFocusTags.length) return;
    const focusGroups = new Map();
    for (let i = 0; i < localPlayerCount; i += 1) {
        const focusIndex = menuFocusIndices[i] || 0;
        if (!focusGroups.has(focusIndex)) {
            focusGroups.set(focusIndex, []);
        }
        focusGroups.get(focusIndex).push(i + 1);
    }
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
        if (i >= localPlayerCount) {
            updateHeroFocusTag(i + 1, 0, 1);
            continue;
        }
        const focusIndex = menuFocusIndices[i] || 0;
        const group = (focusGroups.get(focusIndex) || [i + 1]).slice().sort((a, b) => {
            const orderA = heroFocusEnterOrder[a - 1] || 0;
            const orderB = heroFocusEnterOrder[b - 1] || 0;
            if (orderA === orderB) return a - b;
            return orderA - orderB;
        });
        const stackIndex = group.indexOf(i + 1);
        updateHeroFocusTag(i + 1, stackIndex === -1 ? 0 : stackIndex, group.length);
    }
}

function updateLadderHint(activePlayers) {
    if (!ladderHint || !level || !Array.isArray(level.platforms)) {
        return;
    }
    let show = false;
    const padding = 0.6;
    const ladders = level.platforms.filter((platform) => platform && (platform.type === 'ladder' || platform.isLadder));
    if (ladders.length) {
        (activePlayers || []).some((activePlayer) => {
            if (!activePlayer || !activePlayer.isAlive) return false;
            if (activePlayer.onLadder) {
                show = true;
                return true;
            }
            const playerBounds = activePlayer.getBounds();
            return ladders.some((platform) => {
                const bounds = platform.bounds;
                if (!bounds) return false;
                const expanded = {
                    left: bounds.left - padding,
                    right: bounds.right + padding,
                    top: bounds.top + padding,
                    bottom: bounds.bottom - padding
                };
                if (checkAABBCollision(playerBounds, expanded)) {
                    show = true;
                    return true;
                }
                return false;
            });
        });
    }
    ladderHint.style.display = show && gameStarted ? 'block' : 'none';
}

function initCoopHeroMenu() {
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
        // Require button release before selections after switching modes.
        menuSelectLockedByPlayer[i] = true;
        menuBackLockedByPlayer[i] = false;
        menuLastNavTimes[i] = 0;
        menuFocusIndices[i] = heroCardItems.length ? (i % heroCardItems.length) : 0;
        heroFocusEnterOrder[i] = 0;
    }
    heroFocusOrderCounter = 0;
    mouseHeroSelectIndex = 0;
    heroCardItems.forEach((item) => {
        item.classList.remove('menu-focus');
    });
    for (let i = 0; i < localPlayerCount; i += 1) {
        updateCoopHeroFocus(i + 1);
    }
    updateCoopHeroSelectionUI();
    updateAllHeroFocusTags();
}

function updateCoopHeroFocus(playerIndex) {
    const focusIndex = menuFocusIndices[playerIndex - 1] || 0;
    if (localMultiplayerEnabled && playerIndex <= localPlayerCount) {
        heroFocusOrderCounter += 1;
        heroFocusEnterOrder[playerIndex - 1] = heroFocusOrderCounter;
    }
    const className = `menu-focus-p${playerIndex}`;
    heroCardItems.forEach((item, index) => {
        if (shouldShowControllerIndicators()) {
            item.classList.toggle(className, index === focusIndex);
        } else {
            item.classList.remove(className);
        }
    });
    const focused = heroCardItems[focusIndex];
    if (focused && typeof focused.scrollIntoView === 'function') {
        focused.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    updateHeroFocusTag(playerIndex);
}

function moveCoopHeroFocus(playerIndex, delta) {
    if (!heroCardItems.length) return;
    const index = playerIndex - 1;
    menuFocusIndices[index] = (menuFocusIndices[index] + delta + heroCardItems.length) % heroCardItems.length;
    updateCoopHeroFocus(playerIndex);
}

function moveCoopHeroFocusGrid(playerIndex, dx, dy) {
    if (!heroCardItems.length) return;
    const index = playerIndex - 1;
    const columns = getHeroGridColumnCount();
    const nextIndex = getGridIndexByDirection(menuFocusIndices[index] || 0, dx, dy, heroCardItems.length, columns);
    if (nextIndex !== menuFocusIndices[index]) {
        menuFocusIndices[index] = nextIndex;
        updateCoopHeroFocus(playerIndex);
    }
}

function updateCoopHeroSelectionUI() {
    const selectedKeys = pendingHeroClasses.map((hero) => (hero ? HERO_KEY_BY_CLASS.get(hero) : null));
    heroCardItems.forEach((item) => {
        for (let i = 0; i < MAX_PLAYERS; i += 1) {
            const playerNum = i + 1;
            const selectedKey = selectedKeys[i];
            item.classList.toggle(`selected-p${playerNum}`, Boolean(selectedKey && item.dataset.hero === selectedKey));
        }
    });

    if (heroMenuSubtitle && localMultiplayerEnabled) {
        const parts = [];
        for (let i = 0; i < localPlayerCount; i += 1) {
            const hero = pendingHeroClasses[i];
            const label = hero ? HERO_NAMES[hero.name] : '...';
            const status = hero ? ' (Selected)' : '';
            parts.push(`P${i + 1}: ${label}${status}`);
        }
        heroMenuSubtitle.textContent = parts.join(' | ');
    }
}

function triggerHeroSelectPop(heroKey) {
    if (!heroKey) return;
    const card = heroCardItems.find((item) => item.dataset.hero === heroKey);
    if (!card) return;
    card.classList.remove('hero-select-pop');
    void card.offsetWidth;
    card.classList.add('hero-select-pop');
    window.setTimeout(() => {
        card.classList.remove('hero-select-pop');
    }, 220);
}

function buildTeamMenuItems() {
    teamMenuItems = [];
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
        teamMenuItems[i] = [teamButtonBlue[i], teamButtonRed[i]].filter(Boolean);
        teamFocusIndices[i] = -1;
        updateTeamMenuFocus(i + 1);
    }
}

function updateTeamMenuFocus(playerIndex) {
    const index = playerIndex - 1;
    const items = teamMenuItems[index] || [];
    const focusIndex = teamFocusIndices[index];
    const className = `menu-focus-p${playerIndex}`;
    items.forEach((item, index) => {
        item.classList.toggle(className, index === focusIndex);
    });
}

function moveTeamMenuFocus(playerIndex, delta) {
    const index = playerIndex - 1;
    const items = teamMenuItems[index] || [];
    if (!items.length) return;
    let current = teamFocusIndices[index];
    if (!Number.isFinite(current)) {
        current = 0;
    }
    const next = current + delta;
    teamFocusIndices[index] = Math.max(0, Math.min(items.length - 1, next));
    updateTeamMenuFocus(playerIndex);
}

function updateTeamSelectionUI() {
    for (let i = 0; i < MAX_PLAYERS; i += 1) {
        const blueButton = teamButtonBlue[i];
        const redButton = teamButtonRed[i];
        const team = selectedTeams[i];
        if (blueButton && redButton) {
            blueButton.classList.toggle(`selected-p${i + 1}`, team === 'blue');
            redButton.classList.toggle(`selected-p${i + 1}`, team === 'red');
        }
    }
}

function findMidfieldPlatform(levelInstance) {
    if (!levelInstance || !Array.isArray(levelInstance.platforms)) return null;
    const candidates = levelInstance.platforms.filter((platform) => {
        if (!platform || !platform.bounds) return false;
        if (platform.type === 'wall' || platform.type === 'ladder' || platform.isLadder) return false;
        return platform.bounds.left <= 0 && platform.bounds.right >= 0;
    });
    if (!candidates.length) return null;
    return candidates.reduce((best, platform) => {
        if (!best) return platform;
        return platform.bounds.top > best.bounds.top ? platform : best;
    }, null);
}

function createHealthPotion(levelInstance) {
    if (!scene) return null;
    const platform = findMidfieldPlatform(levelInstance);
    const baseX = platform ? (platform.bounds.left + platform.bounds.right) / 2 : 0;
    const baseY = platform ? platform.bounds.top + 0.45 : 0.5;

    const group = new THREE.Group();
    const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.5, 12),
        new THREE.MeshBasicMaterial({ color: 0x46d16b })
    );
    bottle.position.set(0, 0.2, 0.2);
    group.add(bottle);

    const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.12, 10),
        new THREE.MeshBasicMaterial({ color: 0x2d2d2d })
    );
    cap.position.set(0, 0.48, 0.22);
    group.add(cap);

    const glow = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.48, 24),
        new THREE.MeshBasicMaterial({ color: 0x8cffb1, transparent: true, opacity: 0.45 })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, -0.05, 0.1);
    group.add(glow);

    group.position.set(baseX, baseY, 0.2);
    scene.add(group);

    return {
        mesh: group,
        base: { x: baseX, y: baseY },
        bounds: {
            left: baseX - 0.4,
            right: baseX + 0.4,
            top: baseY + 0.6,
            bottom: baseY - 0.2
        },
        active: true,
        respawnTimer: 0,
        respawnDelay: 30,
        bobTime: 0
    };
}

function findGroundPlatform(levelInstance) {
    if (!levelInstance || !Array.isArray(levelInstance.platforms)) return null;
    const candidates = levelInstance.platforms.filter((platform) => {
        if (!platform || !platform.bounds) return false;
        return platform.type === 'ground';
    });
    if (!candidates.length) return null;
    return candidates.reduce((best, platform) => {
        if (!best) return platform;
        const bestWidth = best.bounds.right - best.bounds.left;
        const width = platform.bounds.right - platform.bounds.left;
        if (width !== bestWidth) return width > bestWidth ? platform : best;
        return platform.bounds.top < best.bounds.top ? platform : best;
    }, null);
}

function createGroundHealthPotion(levelInstance) {
    if (!scene) return null;
    const platform = findGroundPlatform(levelInstance);
    if (!platform) return null;
    const baseX = (platform.bounds.left + platform.bounds.right) / 2;
    const baseY = platform.bounds.top + 0.45;
    const potion = createHealthPotion({
        platforms: [{ bounds: { left: baseX - 0.5, right: baseX + 0.5, top: baseY - 0.45, bottom: baseY - 1.2 } }]
    });
    if (potion) {
        potion.base = { x: baseX, y: baseY };
        potion.mesh.position.set(baseX, baseY, 0.2);
        potion.bounds.left = baseX - 0.4;
        potion.bounds.right = baseX + 0.4;
        potion.bounds.top = baseY + 0.6;
        potion.bounds.bottom = baseY - 0.2;
    }
    return potion;
}

function createHealthPotions(levelInstance) {
    const potions = [];
    const midfield = createHealthPotion(levelInstance);
    if (midfield) potions.push(midfield);
    const ground = createGroundHealthPotion(levelInstance);
    if (ground) potions.push(ground);
    return potions;
}

function removeHealthPotions() {
    healthPotions.forEach((potion) => {
        if (potion && potion.mesh && potion.mesh.parent) {
            potion.mesh.parent.remove(potion.mesh);
        }
    });
    healthPotions = [];
}

function updateHealthPotions(deltaTime, activePlayers) {
    if (!healthPotions.length) return;
    for (const potion of healthPotions) {
        if (!potion || !potion.mesh) continue;
        if (!potion.active) {
            potion.respawnTimer = Math.max(0, potion.respawnTimer - deltaTime);
            if (potion.respawnTimer === 0) {
                potion.active = true;
                potion.mesh.visible = true;
            }
            continue;
        }

        potion.bobTime += deltaTime;
        const bobOffset = Math.sin(potion.bobTime * 2.5) * 0.06;
        potion.mesh.position.y = potion.base.y + bobOffset;
        const { x, y } = potion.mesh.position;
        potion.bounds.left = x - 0.4;
        potion.bounds.right = x + 0.4;
        potion.bounds.top = y + 0.6;
        potion.bounds.bottom = y - 0.2;

        for (const activePlayer of activePlayers) {
            if (!activePlayer || !activePlayer.isAlive) continue;
            if (!checkAABBCollision(activePlayer.getBounds(), potion.bounds)) continue;
            activePlayer.heal(30);
            potion.active = false;
            potion.respawnTimer = potion.respawnDelay;
            potion.mesh.visible = false;
            break;
        }
    }
}

function handlePauseGamepadToggle() {
    if (!pauseMenus || !pauseMenus.length) return;
    for (let i = 0; i < localPlayerCount; i += 1) {
        const activeInput = inputs[i];
        if (!activeInput || typeof activeInput.isGamepadPressed !== 'function') {
            lastPauseStartPressed[i] = false;
            continue;
        }
        const pressed = activeInput.isGamepadPressed('Button9');
        if (pressed && !lastPauseStartPressed[i]) {
            const menu = pauseMenus[i];
            if (menu) {
                menu.toggle();
            }
        }
        lastPauseStartPressed[i] = pressed;
    }
}

function startMenuRender() {
    if (menuRenderActive) return;
    menuRenderActive = true;
    const loop = () => {
        if (!menuRenderActive) return;
        if (!gameStarted && renderer && camera) {
            const now = performance.now();
            if (now - lastGamepadRefresh > GAMEPAD_REFRESH_INTERVAL_MS) {
                refreshGamepadSelects();
                lastGamepadRefresh = now;
            }
            pollMenuGamepad();
            renderer.render(scene, camera);
        }
        menuRenderHandle = requestAnimationFrame(loop);
    };
    menuRenderHandle = requestAnimationFrame(loop);
}

function stopMenuRender() {
    menuRenderActive = false;
    if (menuRenderHandle) {
        cancelAnimationFrame(menuRenderHandle);
        menuRenderHandle = null;
    }
}

function updateMenuSplitState() {
    if (!heroMenu || !teamMenu) return;
    const heroVisible = window.getComputedStyle(heroMenu).display !== 'none';
    const teamVisible = window.getComputedStyle(teamMenu).display !== 'none';
    const modeVisible = modeMenu ? window.getComputedStyle(modeMenu).display !== 'none' : false;
    const testMapVisible = testMapMenu ? window.getComputedStyle(testMapMenu).display !== 'none' : false;
    const ctfMapVisible = ctfMapMenu ? window.getComputedStyle(ctfMapMenu).display !== 'none' : false;
    const shouldShow = localPlayerCount === 2 && !gameStarted && teamVisible;
    document.body.classList.toggle('menu-split-active', shouldShow);
    if (!gameStarted && (heroVisible || teamVisible || modeVisible || testMapVisible || ctfMapVisible)) {
        document.body.classList.remove('split-screen-active', 'split-screen-quad');
    }
}

function showReadyMenu() {
    if (!readyMenu) return;
    readyMenu.classList.add('active');
    readyMenuActive = true;
    readyConfirmLocked = false;
    readyCancelLocked = false;
}

function hideReadyMenu() {
    if (!readyMenu) return;
    readyMenu.classList.remove('active');
    readyMenuActive = false;
}

function activateReadyMenuSelection() {
    confirmReadyStart();
}

function confirmReadyStart() {
    for (let i = 0; i < localPlayerCount; i += 1) {
        if (!pendingHeroClasses[i]) {
            return;
        }
    }
    hideReadyMenu();
    showModeMenu();
}

function updateReadyMenuState() {
    if (!localMultiplayerEnabled) {
        hideReadyMenu();
        return;
    }
    let ready = true;
    for (let i = 0; i < localPlayerCount; i += 1) {
        if (!pendingHeroClasses[i]) {
            ready = false;
            break;
        }
    }
    const shouldShow = ready;
    if (shouldShow) {
        showReadyMenu();
    } else {
        hideReadyMenu();
    }
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

function getHeroGridColumnCount() {
    if (!heroGridSingle) return 1;
    const style = window.getComputedStyle(heroGridSingle);
    const columns = (style.gridTemplateColumns || '')
        .split(' ')
        .filter(Boolean)
        .length;
    return Math.max(1, columns);
}

function getGridIndexByDirection(currentIndex, dx, dy, total, columns) {
    if (!Number.isFinite(total) || total <= 0) return 0;
    const safeColumns = Math.max(1, columns);
    const maxIndex = total - 1;
    const row = Math.floor(currentIndex / safeColumns);
    const col = currentIndex % safeColumns;
    const rows = Math.ceil(total / safeColumns);
    const nextRow = Math.max(0, Math.min(rows - 1, row + dy));
    const nextCol = Math.max(0, Math.min(safeColumns - 1, col + dx));
    let nextIndex = nextRow * safeColumns + nextCol;
    if (nextIndex > maxIndex) {
        nextIndex = Math.min(maxIndex, nextRow * safeColumns + (maxIndex % safeColumns));
    }
    return Math.max(0, Math.min(maxIndex, nextIndex));
}

function moveMenuFocusGrid(dx, dy) {
    if (!menuItems.length) return;

    if (menuFocusIndex < heroMenuCardStartIndex) {
        if (dy > 0 && heroCardItems.length) {
            menuFocusIndex = heroMenuCardStartIndex;
            updateMenuFocus();
            return;
        }
        if (dy < 0) {
            return;
        }
        if (dx !== 0) {
            const nextIndex = menuFocusIndex + dx;
            if (nextIndex >= 0 && nextIndex < heroMenuCardStartIndex) {
                menuFocusIndex = nextIndex;
                updateMenuFocus();
            }
        }
        return;
    }

    const cardIndex = menuFocusIndex - heroMenuCardStartIndex;
    const columns = getHeroGridColumnCount();
    const row = Math.floor(cardIndex / columns);
    if (dy < 0 && row === 0) {
        menuFocusIndex = Math.max(0, heroMenuCardStartIndex - 1);
        updateMenuFocus();
        return;
    }
    const nextCardIndex = getGridIndexByDirection(cardIndex, dx, dy, heroCardItems.length, columns);
    menuFocusIndex = heroMenuCardStartIndex + nextCardIndex;
    updateMenuFocus();
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
    if (!localMultiplayerEnabled) {
        return false;
    }
    const hasSelection = pendingHeroClasses.slice(0, localPlayerCount).some(Boolean);
    if (!hasSelection) {
        return false;
    }
    pendingHeroClasses.fill(null);
    heroLocked.fill(false);
    hideReadyMenu();
    updateCoopHeroSelectionUI();
    return true;
}

function shouldReturnToPlayerCount() {
    if (!localMultiplayerEnabled) return false;
    if (readyMenuActive) return false;
    if (modeMenu && modeMenu.style.display === 'flex') return false;
    if (testMapMenu && testMapMenu.style.display === 'flex') return false;
    if (ctfMapMenu && ctfMapMenu.style.display === 'flex') return false;
    if (teamMenu && teamMenu.style.display === 'flex') return false;
    const hasSelection = pendingHeroClasses.slice(0, localPlayerCount).some(Boolean);
    if (hasSelection) return false;
    if (!heroMenu) return true;
    return heroMenu.style.display !== 'none';
}

function getFirstConnectedPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const candidate of pads) {
        if (candidate && candidate.connected) {
            return candidate;
        }
    }
    return null;
}

function getAssignedPadForPlayer(playerIndex) {
    const assignments = resolveGamepadAssignments();
    const entry = assignments[playerIndex - 1];
    if (!entry.enabled || entry.index === null || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    return pads[entry.index] || null;
}

function pollSingleMenuGamepad() {
    const pad = getAssignedPadForPlayer(1);
    if (!pad) return;

    const now = performance.now();
    const axisX = pad.axes[0] || 0;
    const axisY = pad.axes[1] || 0;

    const up = (pad.buttons[12] && pad.buttons[12].pressed) || axisY < -MENU_AXIS_DEADZONE;
    const down = (pad.buttons[13] && pad.buttons[13].pressed) || axisY > MENU_AXIS_DEADZONE;
    const left = (pad.buttons[14] && pad.buttons[14].pressed) || axisX < -MENU_AXIS_DEADZONE;
    const right = (pad.buttons[15] && pad.buttons[15].pressed) || axisX > MENU_AXIS_DEADZONE;

    if ((up || down || left || right) && now - menuLastNavTime > MENU_NAV_COOLDOWN_MS) {
        let dx = 0;
        let dy = 0;
        if (up || down) {
            dy = up ? -1 : 1;
        }
        if (!dy && (left || right)) {
            dx = left ? -1 : 1;
        } else if (left || right) {
            const axisPreferX = Math.abs(axisX) > Math.abs(axisY);
            if (axisPreferX) {
                dy = 0;
                dx = left ? -1 : 1;
            }
        }
        moveMenuFocusGrid(dx, dy);
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

function pollHeroMenuGamepadForPlayer(pad, playerIndex) {
    if (!pad) return;
    const now = performance.now();
    const axisX = pad.axes[0] || 0;
    const axisY = pad.axes[1] || 0;

    const up = (pad.buttons[12] && pad.buttons[12].pressed) || axisY < -MENU_AXIS_DEADZONE;
    const down = (pad.buttons[13] && pad.buttons[13].pressed) || axisY > MENU_AXIS_DEADZONE;
    const left = (pad.buttons[14] && pad.buttons[14].pressed) || axisX < -MENU_AXIS_DEADZONE;
    const right = (pad.buttons[15] && pad.buttons[15].pressed) || axisX > MENU_AXIS_DEADZONE;

    if ((up || down || left || right)) {
        const index = playerIndex - 1;
        const lastNav = menuLastNavTimes[index] || 0;
        if (now - lastNav > MENU_NAV_COOLDOWN_MS) {
            let dx = 0;
            let dy = 0;
            if (up || down) {
                dy = up ? -1 : 1;
            }
            if (!dy && (left || right)) {
                dx = left ? -1 : 1;
            } else if (left || right) {
                const axisPreferX = Math.abs(axisX) > Math.abs(axisY);
                if (axisPreferX) {
                    dy = 0;
                    dx = left ? -1 : 1;
                }
            }
            moveCoopHeroFocusGrid(playerIndex, dx, dy);
            menuLastNavTimes[index] = now;
        }
    }

    const selectPressed = pad.buttons[0] && pad.buttons[0].pressed;
    const selectIndex = playerIndex - 1;
    if (selectPressed && !menuSelectLockedByPlayer[selectIndex]) {
        const heroKey = heroCardItems[menuFocusIndices[selectIndex]]?.dataset.hero;
        const heroClass = HERO_CLASS_MAP[heroKey];
        if (heroClass) {
            selectHeroForPlayer(heroClass, playerIndex);
        }
        menuSelectLockedByPlayer[selectIndex] = true;
    } else if (!selectPressed) {
        menuSelectLockedByPlayer[selectIndex] = false;
    }

    const backPressed = pad.buttons[1] && pad.buttons[1].pressed;
    if (backPressed && !menuBackLockedByPlayer[selectIndex]) {
        const hasSelection = pendingHeroClasses.slice(0, localPlayerCount).some(Boolean);
        if (playerIndex === 1 && localMultiplayerEnabled && !hasSelection && heroMenu && heroMenu.style.display === 'flex') {
            setPlayerCount(1);
            menuBackLockedByPlayer[selectIndex] = true;
            return;
        }
        pendingHeroClasses[selectIndex] = null;
        heroLocked[selectIndex] = false;
        updateCoopHeroSelectionUI();
        updateReadyMenuState();
        menuBackLockedByPlayer[selectIndex] = true;
    } else if (!backPressed) {
        menuBackLockedByPlayer[selectIndex] = false;
    }
}

function pollCoopHeroMenuGamepads() {
    for (let i = 0; i < localPlayerCount; i += 1) {
        const playerIndex = i + 1;
        const pad = getAssignedPadForPlayer(playerIndex);
        pollHeroMenuGamepadForPlayer(pad, playerIndex);
    }
}

function pollTeamMenuGamepadForPlayer(pad, playerIndex) {
    if (!pad) return;
    const now = performance.now();
    const axisX = pad.axes[0] || 0;
    const axisY = pad.axes[1] || 0;

    const left = (pad.buttons[14] && pad.buttons[14].pressed) || axisX < -MENU_AXIS_DEADZONE;
    const right = (pad.buttons[15] && pad.buttons[15].pressed) || axisX > MENU_AXIS_DEADZONE;
    const up = (pad.buttons[12] && pad.buttons[12].pressed) || axisY < -MENU_AXIS_DEADZONE;
    const down = (pad.buttons[13] && pad.buttons[13].pressed) || axisY > MENU_AXIS_DEADZONE;

    const index = playerIndex - 1;
    if (left || right || up || down) {
        const lastNav = teamLastNavTimes[index] || 0;
        if (now - lastNav > MENU_NAV_COOLDOWN_MS) {
            if (teamFocusIndices[index] < 0) {
                teamFocusIndices[index] = 0;
                updateTeamMenuFocus(playerIndex);
                teamLastNavTimes[index] = now;
                return;
            }
            const delta = (right || down) ? 1 : -1;
            moveTeamMenuFocus(playerIndex, delta);
            teamLastNavTimes[index] = now;
        }
    }

    const selectPressed = pad.buttons[0] && pad.buttons[0].pressed;
    if (selectPressed && !teamSelectLocked[index]) {
        if (teamFocusIndices[index] < 0) {
            teamFocusIndices[index] = 0;
            updateTeamMenuFocus(playerIndex);
            teamSelectLocked[index] = true;
            return;
        }
        const team = teamFocusIndices[index] === 0 ? 'blue' : 'red';
        handleTeamSelect(team, playerIndex);
        teamSelectLocked[index] = true;
    } else if (!selectPressed) {
        teamSelectLocked[index] = false;
    }
}

function pollSingleTeamMenuGamepad() {
    pollTeamMenuGamepadForPlayer(getAssignedPadForPlayer(1), 1);
}

function pollModeMenuGamepad() {
    const pad = getAssignedPadForPlayer(1);
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
        moveModeMenuFocus(delta);
        menuLastNavTime = now;
    }

    const selectPressed = pad.buttons[0] && pad.buttons[0].pressed;
    if (selectPressed && !modeSelectLocked) {
        if (modeFocusIndex < 0) {
            modeFocusIndex = 0;
            updateModeMenuFocus();
            modeSelectLocked = true;
            return;
        }
        const selected = modeButtons[modeFocusIndex];
        if (selected && typeof selected.click === 'function') {
            selected.click();
        }
        modeSelectLocked = true;
    } else if (!selectPressed) {
        modeSelectLocked = false;
    }

    const backPressed = pad.buttons[1] && pad.buttons[1].pressed;
    if (backPressed && !modeBackLocked) {
        hideModeMenu();
        if (heroMenu) {
            heroMenu.style.display = 'flex';
        }
        updateCoopHeroSelectionUI();
        updateMenuSplitState();
        modeBackLocked = true;
    } else if (!backPressed) {
        modeBackLocked = false;
    }
}

function pollTestMapMenuGamepad() {
    const pad = getAssignedPadForPlayer(1);
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
        moveTestMapMenuFocus(delta);
        menuLastNavTime = now;
    }

    const selectPressed = pad.buttons[0] && pad.buttons[0].pressed;
    if (selectPressed && !testMapSelectLocked) {
        if (testMapFocusIndex < 0) {
            testMapFocusIndex = 0;
            updateTestMapMenuFocus();
            testMapSelectLocked = true;
            return;
        }
        const selected = testMapButtons[testMapFocusIndex];
        if (selected && typeof selected.click === 'function') {
            selected.click();
        }
        testMapSelectLocked = true;
    } else if (!selectPressed) {
        testMapSelectLocked = false;
    }

    const backPressed = pad.buttons[1] && pad.buttons[1].pressed;
    if (backPressed && !testMapBackLocked) {
        hideTestMapMenu();
        showModeMenu();
        testMapBackLocked = true;
    } else if (!backPressed) {
        testMapBackLocked = false;
    }
}

function pollCtfMapMenuGamepad() {
    const pad = getAssignedPadForPlayer(1);
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
        moveCtfMapMenuFocus(delta);
        menuLastNavTime = now;
    }

    const selectPressed = pad.buttons[0] && pad.buttons[0].pressed;
    if (selectPressed && !ctfMapSelectLocked) {
        if (ctfMapFocusIndex < 0) {
            ctfMapFocusIndex = 0;
            updateCtfMapMenuFocus();
            ctfMapSelectLocked = true;
            return;
        }
        const selected = ctfMapButtons[ctfMapFocusIndex];
        if (selected && typeof selected.click === 'function') {
            selected.click();
        }
        ctfMapSelectLocked = true;
    } else if (!selectPressed) {
        ctfMapSelectLocked = false;
    }

    const backPressed = pad.buttons[1] && pad.buttons[1].pressed;
    if (backPressed && !ctfMapBackLocked) {
        hideCtfMapMenu();
        showModeMenu();
        ctfMapBackLocked = true;
    } else if (!backPressed) {
        ctfMapBackLocked = false;
    }
}

function pollCoopTeamMenuGamepads() {
    for (let i = 0; i < localPlayerCount; i += 1) {
        const playerIndex = i + 1;
        pollTeamMenuGamepadForPlayer(getAssignedPadForPlayer(playerIndex), playerIndex);
    }
}

function pollMenuGamepad() {
    if (gameStarted || !navigator.getGamepads) return;
    if (readyMenuActive) {
        pollReadyMenuGamepad();
        return;
    }
    if (modeMenu && modeMenu.style.display === 'flex') {
        pollModeMenuGamepad();
        return;
    }
    if (testMapMenu && testMapMenu.style.display === 'flex') {
        pollTestMapMenuGamepad();
        return;
    }
    if (ctfMapMenu && ctfMapMenu.style.display === 'flex') {
        pollCtfMapMenuGamepad();
        return;
    }
    if (teamMenu && teamMenu.style.display === 'flex') {
        if (localMultiplayerEnabled) {
            pollCoopTeamMenuGamepads();
        } else {
            pollSingleTeamMenuGamepad();
        }
        return;
    }

    if (localMultiplayerEnabled) {
        if (shouldReturnToPlayerCount()) {
            const pad = getAssignedPadForPlayer(1) || getFirstConnectedPad();
            if (pad) {
                const backPressed = pad.buttons[1] && pad.buttons[1].pressed;
                if (backPressed && !menuBackLockedByPlayer[0]) {
                    setPlayerCount(1);
                    menuBackLockedByPlayer[0] = true;
                    return;
                }
                if (!backPressed) {
                    menuBackLockedByPlayer[0] = false;
                }
            }
        }
        pollCoopHeroMenuGamepads();
        return;
    }

    pollSingleMenuGamepad();
}

function pollReadyMenuGamepad() {
    const pad = getAssignedPadForPlayer(1);
    if (!pad) return;

    const confirmPressed = pad.buttons[0] && pad.buttons[0].pressed;
    if (confirmPressed && !readyConfirmLocked) {
        activateReadyMenuSelection();
        readyConfirmLocked = true;
    } else if (!confirmPressed) {
        readyConfirmLocked = false;
    }

    const backPressed = pad.buttons[1] && pad.buttons[1].pressed;
    if (backPressed && !readyCancelLocked) {
        hideReadyMenu();
        readyCancelLocked = true;
    } else if (!backPressed) {
        readyCancelLocked = false;
    }
}

// Initialize scene on load
window.addEventListener('load', () => {
    initScene();
    initScoreboard();

    heroMenu = document.getElementById('hero-menu');
    heroMenuTitle = document.getElementById('hero-menu-title');
    heroMenuSubtitle = document.getElementById('hero-menu-subtitle');
    heroMenuControls = document.getElementById('hero-menu-controls');
    twoPlayerToggle = document.getElementById('two-player-toggle');
    threePlayerToggle = document.getElementById('three-player-toggle');
    fourPlayerToggle = document.getElementById('four-player-toggle');
    coopHint = document.getElementById('coop-hint');
    heroGridSingle = document.getElementById('hero-grid-single');
    if (heroMenu) {
        heroMenu.addEventListener('scroll', () => updateAllHeroFocusTags());
    }
    controllerToggleButton = document.getElementById('controller-toggle');
    gamepadAssign = document.getElementById('gamepad-assign');
    readyMenu = document.getElementById('ready-menu');
    readyConfirmButton = document.getElementById('ready-confirm');
    ladderHint = document.getElementById('ladder-hint');
    kothMeter = document.getElementById('koth-meter');
    kothMeterLabelBlue = document.getElementById('koth-meter-label-blue');
    kothMeterLabelRed = document.getElementById('koth-meter-label-red');
    kothMeterFillBlue = document.getElementById('koth-meter-fill-blue');
    kothMeterFillRed = document.getElementById('koth-meter-fill-red');
    modeMenu = document.getElementById('mode-menu');
    const modeCtfButton = document.getElementById('mode-ctf');
    const modeArenaButton = document.getElementById('mode-arena');
    const modeKothButton = document.getElementById('mode-koth');
    const modeTestButton = document.getElementById('mode-test');
    modeButtons = [modeCtfButton, modeArenaButton, modeKothButton, modeTestButton].filter(Boolean);
    if (modeCtfButton) {
        modeCtfButton.addEventListener('click', () => selectGameMode('ctf'));
    }
    if (modeArenaButton) {
        modeArenaButton.addEventListener('click', () => selectGameMode('arena'));
    }
    if (modeKothButton) {
        modeKothButton.addEventListener('click', () => selectGameMode('koth'));
    }
    if (modeTestButton) {
        modeTestButton.addEventListener('click', () => selectGameMode('game-test'));
    }
    testMapMenu = document.getElementById('test-map-menu');
    const map3pButton = document.getElementById('map-3p');
    const mapHilltowerButton = document.getElementById('map-hilltower');
    const mapBowlButton = document.getElementById('map-bowl');
    testMapButtons = [map3pButton, mapHilltowerButton, mapBowlButton].filter(Boolean);
    if (map3pButton) {
        map3pButton.addEventListener('click', () => selectTestMap('3p'));
    }
    if (mapHilltowerButton) {
        mapHilltowerButton.addEventListener('click', () => selectTestMap('hilltower'));
    }
    if (mapBowlButton) {
        mapBowlButton.addEventListener('click', () => selectTestMap('bowl'));
    }
    ctfMapMenu = document.getElementById('ctf-map-menu');
    const ctfMapOgButton = document.getElementById('ctf-map-og');
    const ctfMapBtbButton = document.getElementById('ctf-map-btb');
    ctfMapButtons = [ctfMapOgButton, ctfMapBtbButton].filter(Boolean);
    if (ctfMapOgButton) {
        ctfMapOgButton.addEventListener('click', () => selectCtfMap('ogmap'));
    }
    if (ctfMapBtbButton) {
        ctfMapBtbButton.addEventListener('click', () => selectCtfMap('btb'));
    }
    p1GamepadSelect = document.getElementById('p1-gamepad-select');
    p2GamepadSelect = document.getElementById('p2-gamepad-select');
    p3GamepadSelect = document.getElementById('p3-gamepad-select');
    p4GamepadSelect = document.getElementById('p4-gamepad-select');
    p2GamepadRow = document.getElementById('p2-gamepad-row');
    p3GamepadRow = document.getElementById('p3-gamepad-row');
    p4GamepadRow = document.getElementById('p4-gamepad-row');
    teamMenu = document.getElementById('team-menu');
    teamMenuPanels = [
        document.getElementById('team-menu-p1'),
        document.getElementById('team-menu-p2'),
        document.getElementById('team-menu-p3'),
        document.getElementById('team-menu-p4')
    ];
    teamMenuTitles = [
        document.getElementById('team-menu-title-p1'),
        document.getElementById('team-menu-title-p2'),
        document.getElementById('team-menu-title-p3'),
        document.getElementById('team-menu-title-p4')
    ];
    teamMenuSubtitles = [
        document.getElementById('team-menu-subtitle-p1'),
        document.getElementById('team-menu-subtitle-p2'),
        document.getElementById('team-menu-subtitle-p3'),
        document.getElementById('team-menu-subtitle-p4')
    ];
    teamButtonBlue = [
        document.getElementById('team-blue-p1'),
        document.getElementById('team-blue-p2'),
        document.getElementById('team-blue-p3'),
        document.getElementById('team-blue-p4')
    ];
    teamButtonRed = [
        document.getElementById('team-red-p1'),
        document.getElementById('team-red-p2'),
        document.getElementById('team-red-p3'),
        document.getElementById('team-red-p4')
    ];

    if (heroMenuTitle) {
        heroMenuTitleDefault = heroMenuTitle.textContent;
    }
    if (heroMenuSubtitle) {
        heroMenuSubtitleDefault = heroMenuSubtitle.textContent;
    }
    if (heroMenuControls) {
        heroMenuControlsDefault = heroMenuControls.textContent;
    }

    if (twoPlayerToggle) {
        twoPlayerToggle.addEventListener('click', () => {
            togglePlayerCount(2);
        });
    }
    if (threePlayerToggle) {
        threePlayerToggle.addEventListener('click', () => {
            togglePlayerCount(3);
        });
    }
    if (fourPlayerToggle) {
        fourPlayerToggle.addEventListener('click', () => {
            togglePlayerCount(4);
        });
    }
    if (controllerToggleButton) {
        controllerToggleButton.addEventListener('click', () => {
            setControllerMenuVisible(!controllerMenuVisible);
        });
    }
    if (p1GamepadSelect) {
        p1GamepadSelect.addEventListener('change', () => {
            p1GamepadPreference = p1GamepadSelect.value;
            updateControllerIndicatorVisibility();
            updateAllHeroFocusTags();
        });
    }
    if (p2GamepadSelect) {
        p2GamepadSelect.addEventListener('change', () => {
            p2GamepadPreference = p2GamepadSelect.value;
            updateControllerIndicatorVisibility();
            updateAllHeroFocusTags();
        });
    }
    if (p3GamepadSelect) {
        p3GamepadSelect.addEventListener('change', () => {
            p3GamepadPreference = p3GamepadSelect.value;
            updateControllerIndicatorVisibility();
            updateAllHeroFocusTags();
        });
    }
    if (p4GamepadSelect) {
        p4GamepadSelect.addEventListener('change', () => {
            p4GamepadPreference = p4GamepadSelect.value;
            updateControllerIndicatorVisibility();
            updateAllHeroFocusTags();
        });
    }
    if (readyConfirmButton) {
        readyConfirmButton.addEventListener('click', () => {
            confirmReadyStart();
        });
    }

    for (let i = 0; i < MAX_PLAYERS; i += 1) {
        const playerIndex = i + 1;
        if (teamButtonBlue[i]) {
            teamButtonBlue[i].addEventListener('click', () => handleTeamSelect('blue', playerIndex));
        }
        if (teamButtonRed[i]) {
            teamButtonRed[i].addEventListener('click', () => handleTeamSelect('red', playerIndex));
        }
    }

    document.addEventListener('keydown', (event) => {
        if (readyMenuActive) {
            if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
                moveReadyMenuFocus(-1);
            } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
                moveReadyMenuFocus(1);
            } else if (event.code === 'Enter' || event.code === 'Space') {
                activateReadyMenuSelection();
            } else if (event.code === 'Escape' || event.code === 'Backspace') {
                hideReadyMenu();
            }
            return;
        }
        if (event.code === 'Escape' || event.code === 'Backspace') {
            if (modeMenu && modeMenu.style.display === 'flex') {
                hideModeMenu();
                if (heroMenu) {
                    heroMenu.style.display = 'flex';
                }
                updateCoopHeroSelectionUI();
                updateMenuSplitState();
                return;
            }
            if (testMapMenu && testMapMenu.style.display === 'flex') {
                hideTestMapMenu();
                showModeMenu();
                return;
            }
            if (teamMenu && teamMenu.style.display === 'flex') {
                hideTeamMenu();
                showModeMenu();
                return;
            }
            if (shouldReturnToPlayerCount()) {
                setPlayerCount(1);
                return;
            }
        }
        if (!teamMenu || teamMenu.style.display !== 'flex') return;
        if (!localMultiplayerEnabled) {
            if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
                handleTeamSelect('blue', 1);
            } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
                handleTeamSelect('red', 1);
            }
            return;
        }
        const keyMap = [
            { left: 'KeyA', right: 'KeyD' },
            { left: 'ArrowLeft', right: 'ArrowRight' },
            { left: 'KeyZ', right: 'KeyC' },
            { left: 'Numpad4', right: 'Numpad6' }
        ];
        for (let i = 0; i < localPlayerCount; i += 1) {
            const map = keyMap[i];
            if (!map) continue;
            if (event.code === map.left) {
                handleTeamSelect('blue', i + 1);
                return;
            }
            if (event.code === map.right) {
                handleTeamSelect('red', i + 1);
                return;
            }
        }
    });

    window.addEventListener('gamepadconnected', () => refreshGamepadSelects(true));
    window.addEventListener('gamepaddisconnected', () => refreshGamepadSelects(true));
    window.addEventListener('resize', () => updateAllHeroFocusTags());

    refreshGamepadSelects(true);
    setPlayerCount(localPlayerCount);
    setControllerMenuVisible(controllerMenuVisible);
    buildTeamMenuItems();

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

    document.getElementById('select-paladin').addEventListener('click', () => {
        handleHeroSelect(Paladin);
    });

    startMenuRender();
});
