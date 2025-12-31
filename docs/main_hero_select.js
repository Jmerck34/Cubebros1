// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Import game systems
import { GameLoop } from './core/gameLoop.js';
import { InputManager } from './utils/input.js';
import { UIManager } from './utils/ui.js';
import { getAimDirection } from './utils/aim.js';
import { NetClient } from './net/NetClient.js';
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
let flagState = null;
let teamScoreboard, scoreBlueEl, scoreRedEl;
let teamScores = { blue: 0, red: 0 };
const VIEW_SIZE = 10;
const FIXED_DT = 1 / 60;
const MAX_SUBSTEPS = 5;
const INPUT_HISTORY_SIZE = 600;
const STATE_HISTORY_SIZE = 600;
const SERVER_SIM_LATENCY_TICKS = 6;
const RECONCILE_POSITION_THRESHOLD = 0.12;
const REMOTE_INTERP_DELAY_TICKS = 2;
let reconciliationEnabled = true;
let driftEnabled = false;
const DRIFT_INJECT_INTERVAL = 120;
const DRIFT_AMOUNT = 0.18;
const NETWORK_URL = 'ws://localhost:8080';
const SNAPSHOT_SEND_INTERVAL_TICKS = 3;

let clientTick = 0;
const inputHistoryP1 = createInputHistory(INPUT_HISTORY_SIZE);
const inputHistoryP2 = createInputHistory(INPUT_HISTORY_SIZE);
const stateHistory = createStateHistory(STATE_HISTORY_SIZE);
const serverSnapshotQueue = [];
let lastInputCmdP1 = null;
let lastInputCmdP2 = null;
let cmdSequenceP1 = 0;
let cmdSequenceP2 = 0;
let netClient = null;
let useLocalServerSim = true;
let pendingPlayerInfo = null;
let localPlayerId = 'p1';
let serverTickOffset = null;
let serverMode = null;
let authoritativeActive = false;
const remotePlayers = new Map();
const remoteStateHistory = new Map();
const enemyStateHistory = new Map();
const movingPlatformHistory = new Map();
const projectileStateHistory = new Map();
const aoeStateHistory = new Map();
const serverProjectiles = new Map();
const serverAoeZones = new Map();
const projectileTemplateCache = new Map();
const aoeTemplateCache = new Map();
const HISTORY_LIMIT = 8;
const debugStats = {
    clientTick: 0,
    lastServerTick: 0,
    pendingInputs: 0,
    rewinds: 0,
    lastCorrectionDist: 0,
    simStepsPerFrame: 0,
    stateHash: '',
    driftEnabled: false,
    reconciliationEnabled: false,
    netStatus: 'offline',
    rttMs: 0,
    lastAckCmd: 0,
    playerId: ''
};
let debugOverlay = null;
let debugOverlayVisible = false;

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

const HERO_CLASS_LOOKUP = {
    warrior: Warrior,
    assassin: Assassin,
    cyborg: Cyborg,
    archer: Archer,
    warlock: Warlock
};

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

function createInputHistory(size) {
    return {
        size,
        buffer: new Array(size).fill(null)
    };
}

function createStateHistory(size) {
    return {
        size,
        buffer: new Array(size).fill(null)
    };
}

function resetInputHistory() {
    clientTick = 0;
    inputHistoryP1.buffer = new Array(inputHistoryP1.size).fill(null);
    inputHistoryP2.buffer = new Array(inputHistoryP2.size).fill(null);
    stateHistory.buffer = new Array(stateHistory.size).fill(null);
    serverSnapshotQueue.length = 0;
    lastInputCmdP1 = null;
    lastInputCmdP2 = null;
    cmdSequenceP1 = 0;
    cmdSequenceP2 = 0;
    localPlayerId = 'p1';
    pendingPlayerInfo = null;
    serverTickOffset = null;
    serverMode = null;
    authoritativeActive = false;
    clearRemotePlayers();
    clearEnemyStateHistory();
    clearMovingPlatformHistory();
    clearServerProjectiles();
    clearServerAoeZones();
    debugStats.clientTick = 0;
    debugStats.lastServerTick = 0;
    debugStats.pendingInputs = 0;
    debugStats.rewinds = 0;
    debugStats.lastCorrectionDist = 0;
    debugStats.stateHash = '';
    debugStats.driftEnabled = driftEnabled;
    debugStats.reconciliationEnabled = reconciliationEnabled;
    debugStats.netStatus = 'offline';
    debugStats.rttMs = 0;
    debugStats.lastAckCmd = 0;
    debugStats.playerId = '';
}

function recordInput(history, cmd) {
    if (!history || !cmd) return;
    history.buffer[cmd.tick % history.size] = cmd;
}

function recordSnapshot(history, snapshot) {
    if (!history || !snapshot) return;
    history.buffer[snapshot.tick % history.size] = snapshot;
}

function cloneSnapshot(snapshot) {
    if (!snapshot) return null;
    return {
        tick: snapshot.tick,
        players: snapshot.players.map((player) => ({ ...player })),
        enemies: snapshot.enemies ? snapshot.enemies.map((enemy) => ({ ...enemy })) : [],
        flags: snapshot.flags ? JSON.parse(JSON.stringify(snapshot.flags)) : null,
        scores: { blue: snapshot.scores.blue, red: snapshot.scores.red },
        hash: snapshot.hash
    };
}

function enqueueServerSnapshot(snapshot) {
    const cloned = cloneSnapshot(snapshot);
    if (!cloned) return;
    serverSnapshotQueue.push({
        deliverTick: cloned.tick + SERVER_SIM_LATENCY_TICKS,
        snapshot: cloned
    });
}

function processServerSnapshots(currentTick) {
    while (serverSnapshotQueue.length && serverSnapshotQueue[0].deliverTick <= currentTick) {
        const packet = serverSnapshotQueue.shift();
        handleServerSnapshot(packet.snapshot);
    }
}

function handleServerSnapshot(snapshot) {
    if (!snapshot) return;
    const serverTick = snapshot.tick;
    applySnapshotToRemotePlayers(snapshot);
    if (authoritativeActive) {
        applyEnemiesSnapshot(snapshot, { storeHistory: true, skipPosition: true });
        storeMovingPlatformState(snapshot);
        syncServerProjectiles(snapshot);
        syncServerAoeZones(snapshot);
    }
    applyFlagsSnapshot(snapshot);
    if (snapshot.scores) {
        teamScores.blue = snapshot.scores.blue;
        teamScores.red = snapshot.scores.red;
        updateScoreboard();
    }
    const localTarget = getLocalPlayerById(localPlayerId);
    const serverLocal = getSnapshotPlayer(snapshot, localPlayerId);
    if (localTarget && serverLocal) {
        applyAuthoritativeLocalState(localTarget, serverLocal);
    }
    debugStats.lastServerTick = serverTick;
    const desiredOffset = clientTick - serverTick - SERVER_SIM_LATENCY_TICKS;
    if (serverTickOffset === null) {
        serverTickOffset = desiredOffset;
    } else {
        const delta = desiredOffset - serverTickOffset;
        if (Math.abs(delta) > 12) {
            serverTickOffset = desiredOffset;
        } else {
            serverTickOffset = Math.round(serverTickOffset + delta * 0.1);
        }
    }
    const localTick = serverTick + serverTickOffset;
    if (localTick < 0) {
        return;
    }
    const predicted = stateHistory.buffer[localTick % stateHistory.size];
    if (!predicted || predicted.tick !== localTick) {
        return;
    }

    const predictedLocal = getSnapshotPlayer(predicted, localPlayerId);
    const error = computePositionError(predictedLocal, serverLocal);
    debugStats.lastCorrectionDist = error;
    debugStats.pendingInputs = Math.max(0, clientTick - localTick - 1);

    if (reconciliationEnabled && error > RECONCILE_POSITION_THRESHOLD) {
        debugStats.rewinds += 1;
        rewindAndReplay({ ...snapshot, tick: localTick });
    }
}

function updateRemoteInterpolation() {
    if (!remotePlayers.size) return;
    const renderServerTick = getRenderServerTick();

    remotePlayers.forEach((remote, id) => {
        const history = remoteStateHistory.get(id);
        const state = getInterpolatedState(history, renderServerTick);
        if (!state) return;
        remote.position.x = state.x;
        remote.position.y = state.y;
        remote.velocity.x = state.vx;
        remote.velocity.y = state.vy;
        remote.syncMeshPosition();
        if (remote.healthBar && typeof remote.healthBar.update === 'function') {
            remote.healthBar.update(0);
        }
    });
}

function updateEnemyInterpolation() {
    if (!authoritativeActive) return;
    if (!level || !level.enemies || !level.enemies.length) return;
    const renderServerTick = getRenderServerTick();
    level.enemies.forEach((enemy, index) => {
        const id = enemy.netId || `${enemy.type || 'enemy'}-${index}`;
        const history = enemyStateHistory.get(id);
        const state = getInterpolatedState(history, renderServerTick);
        if (!state) return;
        enemy.position.x = state.x;
        enemy.position.y = state.y;
        enemy.velocity.x = state.vx;
        enemy.velocity.y = state.vy;
        enemy.syncMeshPosition();
    });
}

function storeMovingPlatformState(snapshot) {
    if (!snapshot || !snapshot.movingPlatforms || !level || !level.movingPlatforms) return;
    snapshot.movingPlatforms.forEach((state, index) => {
        const id = state.id || `mp${state.index ?? index}`;
        pushHistory(movingPlatformHistory, id, {
            tick: snapshot.tick,
            x: state.x,
            y: state.y
        });
    });
}

function updateMovingPlatformInterpolation(localTick = clientTick) {
    if (!authoritativeActive) return;
    if (!level || !level.movingPlatforms || !level.movingPlatforms.length) return;
    const renderServerTick = getRenderServerTick(localTick);
    level.movingPlatforms.forEach((moving, index) => {
        const id = `mp${index}`;
        const history = movingPlatformHistory.get(id);
        const state = getInterpolatedState(history, renderServerTick);
        if (!state) return;
        const platform = moving.platform;
        if (!platform || !platform.bounds) return;
        const prevX = platform.mesh?.position.x ?? (platform.bounds.left + platform.bounds.right) / 2;
        const prevY = platform.mesh?.position.y ?? (platform.bounds.top + platform.bounds.bottom) / 2;
        const width = platform.bounds.right - platform.bounds.left;
        const height = platform.bounds.top - platform.bounds.bottom;
        const nextX = state.x;
        const nextY = state.y;

        platform.prevX = prevX;
        platform.prevY = prevY;
        if (platform.mesh) {
            platform.mesh.position.set(nextX, nextY, platform.mesh.position.z);
        }
        platform.bounds.left = nextX - width / 2;
        platform.bounds.right = nextX + width / 2;
        platform.bounds.top = nextY + height / 2;
        platform.bounds.bottom = nextY - height / 2;
    });
}

function getProjectileTemplate(type) {
    if (projectileTemplateCache.has(type)) {
        return projectileTemplateCache.get(type);
    }
    let geometry = null;
    let material = null;
    switch (type) {
        case 'arrow':
            geometry = new THREE.BoxGeometry(0.6, 0.12, 0.1);
            material = new THREE.MeshBasicMaterial({ color: 0xd2b48c });
            break;
        case 'fireball':
            geometry = new THREE.SphereGeometry(0.25, 12, 12);
            material = new THREE.MeshBasicMaterial({ color: 0xff6a00 });
            break;
        case 'poisonBomb':
            geometry = new THREE.SphereGeometry(0.18, 12, 12);
            material = new THREE.MeshBasicMaterial({ color: 0x5ac86a });
            break;
        case 'beam':
            geometry = new THREE.BoxGeometry(1, 0.2, 0.1);
            material = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.85 });
            break;
        default:
            geometry = new THREE.SphereGeometry(0.2, 12, 12);
            material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    }
    const template = { geometry, material };
    projectileTemplateCache.set(type, template);
    return template;
}

function getAoeTemplate(type) {
    if (aoeTemplateCache.has(type)) {
        return aoeTemplateCache.get(type);
    }
    let geometry = null;
    let material = null;
    switch (type) {
        case 'poison':
            geometry = new THREE.RingGeometry(0.6, 0.9, 24);
            material = new THREE.MeshBasicMaterial({ color: 0x5ac86a, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
            break;
        default:
            geometry = new THREE.RingGeometry(0.6, 0.9, 24);
            material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    }
    const template = { geometry, material };
    aoeTemplateCache.set(type, template);
    return template;
}

function createServerProjectileMesh(state) {
    const type = state.type || '';
    const template = getProjectileTemplate(type);
    const mesh = new THREE.Mesh(template.geometry, template.material);
    mesh.position.set(state.x || 0, state.y || 0, 0.2);
    return mesh;
}

function createServerAoeMesh(state) {
    const type = state.type || '';
    const template = getAoeTemplate(type);
    const mesh = new THREE.Mesh(template.geometry, template.material);
    mesh.position.set(state.x || 0, state.y || 0, 0.05);
    return mesh;
}

function syncServerProjectiles(snapshot) {
    if (!snapshot || !snapshot.projectiles || !scene) return;
    const keep = new Set();
    snapshot.projectiles.forEach((state) => {
        if (!state || !state.id) return;
        if (isLocalPlayerId(state.ownerId)) {
            return;
        }
        const id = String(state.id);
        keep.add(id);
        let entry = serverProjectiles.get(id);
        if (!entry) {
            const mesh = createServerProjectileMesh(state);
            scene.add(mesh);
            entry = { mesh, type: state.type || '' };
            serverProjectiles.set(id, entry);
        }
        pushHistory(projectileStateHistory, id, {
            tick: snapshot.tick,
            x: state.x,
            y: state.y,
            vx: state.vx || 0,
            vy: state.vy || 0,
            extra: {
                type: state.type || '',
                dirX: state.dirX || 0,
                dirY: state.dirY || 0,
                length: state.length || 0,
                thickness: state.thickness || 0
            }
        });
    });

    serverProjectiles.forEach((entry, id) => {
        if (keep.has(id)) return;
        if (entry.mesh && entry.mesh.parent) {
            entry.mesh.parent.remove(entry.mesh);
        }
        serverProjectiles.delete(id);
        projectileStateHistory.delete(id);
    });
}

function syncServerAoeZones(snapshot) {
    if (!snapshot || !snapshot.aoeZones || !scene) return;
    const keep = new Set();
    snapshot.aoeZones.forEach((state) => {
        if (!state || state.id === undefined || state.id === null) return;
        if (isLocalPlayerId(state.ownerId)) {
            return;
        }
        const id = String(state.id);
        keep.add(id);
        let entry = serverAoeZones.get(id);
        if (!entry) {
            const mesh = createServerAoeMesh(state);
            scene.add(mesh);
            entry = { mesh, type: state.type || '' };
            serverAoeZones.set(id, entry);
        }
        pushHistory(aoeStateHistory, id, {
            tick: snapshot.tick,
            x: state.x,
            y: state.y,
            vx: 0,
            vy: 0,
            extra: {
                type: state.type || '',
                radiusX: state.radiusX || 0,
                radiusY: state.radiusY || 0
            }
        });
    });

    serverAoeZones.forEach((entry, id) => {
        if (keep.has(id)) return;
        if (entry.mesh && entry.mesh.parent) {
            entry.mesh.parent.remove(entry.mesh);
        }
        serverAoeZones.delete(id);
        aoeStateHistory.delete(id);
    });
}

function updateProjectileInterpolation() {
    if (!authoritativeActive) return;
    if (!serverProjectiles.size) return;
    const renderServerTick = getRenderServerTick();
    serverProjectiles.forEach((entry, id) => {
        const history = projectileStateHistory.get(id);
        const state = getInterpolatedState(history, renderServerTick);
        if (!state) return;
        const mesh = entry.mesh;
        mesh.position.set(state.x, state.y, mesh.position.z);
        const extra = state.extra || {};
        if (entry.type === 'beam') {
            const dirX = extra.dirX || 1;
            const dirY = extra.dirY || 0;
            const length = extra.length || 1;
            const thickness = extra.thickness || 0.2;
            mesh.scale.set(length, thickness, 1);
            mesh.rotation.z = Math.atan2(dirY, dirX);
        } else {
            const angle = Math.atan2(state.vy, state.vx);
            if (Number.isFinite(angle)) {
                mesh.rotation.z = angle;
            }
        }
    });
}

function updateAoeInterpolation() {
    if (!authoritativeActive) return;
    if (!serverAoeZones.size) return;
    const renderServerTick = getRenderServerTick();
    serverAoeZones.forEach((entry, id) => {
        const history = aoeStateHistory.get(id);
        const state = getInterpolatedState(history, renderServerTick);
        if (!state) return;
        const mesh = entry.mesh;
        mesh.position.set(state.x, state.y, mesh.position.z);
        const extra = state.extra || {};
        if (Number.isFinite(extra.radiusX) && Number.isFinite(extra.radiusY)) {
            mesh.scale.set(extra.radiusX, extra.radiusY, 1);
        }
    });
}

function sendLocalPlayerInfo() {
    if (!player) return;
    const info = {
        heroType: player.heroType || player.constructor?.name || '',
        team: player.team || '',
        playerId: player.netId || ''
    };
    if (netClient && netClient.isConnected()) {
        netClient.sendPlayerInfo(info);
        pendingPlayerInfo = null;
    } else {
        pendingPlayerInfo = info;
    }
}

function resolveHeroClass(heroType) {
    if (!heroType) return Warrior;
    const key = String(heroType).toLowerCase();
    return HERO_CLASS_LOOKUP[key] || Warrior;
}

function isLocalPlayerId(id) {
    if (!id) return false;
    if (player && player.netId === id) return true;
    if (player2 && player2.netId === id) return true;
    return false;
}

function getLocalPlayerById(id) {
    if (player && player.netId === id) return player;
    if (player2 && player2.netId === id) return player2;
    return null;
}

function getPlayerByNetId(id) {
    return getLocalPlayerById(id) || remotePlayers.get(id) || null;
}

function addOpponent(target, opponent) {
    if (!target || !opponent) return;
    if (!target.opponents) {
        target.opponents = [];
    }
    if (!target.opponents.includes(opponent)) {
        target.opponents.push(opponent);
    }
}

function syncOpponentLinks() {
    remotePlayers.forEach((remote) => {
        if (player) {
            addOpponent(player, remote);
            addOpponent(remote, player);
        }
        if (player2) {
            addOpponent(player2, remote);
            addOpponent(remote, player2);
        }
    });
}

function pushHistory(historyMap, id, entry) {
    if (!historyMap || !id || !entry || !Number.isFinite(entry.tick)) return;
    const history = historyMap.get(id) || [];
    history.push(entry);
    history.sort((a, b) => a.tick - b.tick);
    if (history.length > HISTORY_LIMIT) {
        history.splice(0, history.length - HISTORY_LIMIT);
    }
    historyMap.set(id, history);
}

function getInterpolatedState(history, renderServerTick) {
    if (!history || history.length === 0) return null;
    let older = history[0];
    let newer = history[history.length - 1];
    for (let i = 0; i < history.length; i += 1) {
        const state = history[i];
        if (state.tick <= renderServerTick) {
            older = state;
        }
        if (state.tick >= renderServerTick) {
            newer = state;
            break;
        }
    }
    let t = 0;
    if (newer.tick !== older.tick) {
        t = (renderServerTick - older.tick) / (newer.tick - older.tick);
    }
    t = Math.max(0, Math.min(1, t));
    return {
        x: older.x + (newer.x - older.x) * t,
        y: older.y + (newer.y - older.y) * t,
        vx: (older.vx ?? 0) + ((newer.vx ?? 0) - (older.vx ?? 0)) * t,
        vy: (older.vy ?? 0) + ((newer.vy ?? 0) - (older.vy ?? 0)) * t,
        extra: newer.extra || older.extra || null
    };
}

function getRenderServerTick(localTick = clientTick) {
    const hasOffset = Number.isFinite(serverTickOffset);
    const baseServerTick = hasOffset
        ? localTick - serverTickOffset
        : debugStats.lastServerTick || 0;
    return baseServerTick - REMOTE_INTERP_DELAY_TICKS;
}

function updateAuthoritativeState() {
    const wasActive = authoritativeActive;
    authoritativeActive = Boolean(netClient && netClient.isConnected() && serverMode === 'authoritative');
    if (level) {
        level.useAuthoritativeEnemies = authoritativeActive;
        level.useAuthoritativeMovingPlatforms = authoritativeActive;
    }
    if (wasActive && !authoritativeActive) {
        clearEnemyStateHistory();
        clearMovingPlatformHistory();
        clearServerProjectiles();
        clearServerAoeZones();
    }
}

function storeRemoteState(state, tick) {
    if (!state || !state.id || !Number.isFinite(tick)) return;
    pushHistory(remoteStateHistory, state.id, {
        tick,
        x: state.x,
        y: state.y,
        vx: state.vx,
        vy: state.vy
    });
}

function clearRemotePlayers() {
    remotePlayers.forEach((remote) => {
        if (remote.mesh && remote.mesh.parent) {
            remote.mesh.parent.remove(remote.mesh);
        }
        if (remote.healthBar && typeof remote.healthBar.destroy === 'function') {
            remote.healthBar.destroy();
        }
    });
    remotePlayers.clear();
    remoteStateHistory.clear();
}

function clearEnemyStateHistory() {
    enemyStateHistory.clear();
}

function clearMovingPlatformHistory() {
    movingPlatformHistory.clear();
}

function clearServerProjectiles() {
    serverProjectiles.forEach((entry) => {
        if (entry.mesh && entry.mesh.parent) {
            entry.mesh.parent.remove(entry.mesh);
        }
    });
    serverProjectiles.clear();
    projectileStateHistory.clear();
}

function clearServerAoeZones() {
    serverAoeZones.forEach((entry) => {
        if (entry.mesh && entry.mesh.parent) {
            entry.mesh.parent.remove(entry.mesh);
        }
    });
    serverAoeZones.clear();
    aoeStateHistory.clear();
}

function createRemotePlayerFromState(state) {
    if (!scene || !state) return null;
    const HeroClass = resolveHeroClass(state.heroType);
    const remote = new HeroClass(scene, state.x || 0, state.y || 0);
    remote.netId = state.id;
    remote.team = state.team || (state.id === 'p1' ? 'blue' : 'red');
    remote.heroType = state.heroType || HeroClass.name;
    remote.spawnPoint = { x: state.x || 0, y: state.y || 0 };
    remote.enemies = level?.enemies || [];
    remote.level = level || null;
    remote.opponents = [];
    if (player && player.netId !== remote.netId) {
        remote.opponents.push(player);
    }
    if (player2 && player2.netId !== remote.netId) {
        remote.opponents.push(player2);
    }
    remotePlayers.set(state.id, remote);
    syncOpponentLinks();
    return remote;
}

function applySnapshotToPlayers(snapshot, { includeLocal = true, includeRemote = true, storeRemoteHistory = true } = {}) {
    if (!snapshot || !snapshot.players) return;
    const snapshotTick = snapshot.tick;
    snapshot.players.forEach((playerState) => {
        const isLocal = isLocalPlayerId(playerState.id);
        if (isLocal && !includeLocal) return;
        if (!isLocal && !includeRemote) return;
        let target = null;
        if (isLocal) {
            target = getLocalPlayerById(playerState.id);
        } else {
            target = remotePlayers.get(playerState.id) || createRemotePlayerFromState(playerState);
        }
        if (!target) return;
        if (isLocal) {
            applyPlayerState(target, playerState);
        } else {
            applyPlayerState(target, playerState, { skipPosition: true });
            if (storeRemoteHistory) {
                storeRemoteState(playerState, snapshotTick);
            }
        }
    });
}

function applySnapshotToRemotePlayers(snapshot) {
    applySnapshotToPlayers(snapshot, { includeLocal: false, includeRemote: true });
    pruneRemotePlayers(snapshot);
}

function pruneRemotePlayers(snapshot) {
    if (!snapshot || !snapshot.players) return;
    const keep = new Set();
    snapshot.players.forEach((playerState) => {
        if (playerState && !isLocalPlayerId(playerState.id)) {
            keep.add(playerState.id);
        }
    });
    remotePlayers.forEach((remote, id) => {
        if (keep.has(id)) return;
        if (remote.mesh && remote.mesh.parent) {
            remote.mesh.parent.remove(remote.mesh);
        }
        if (remote.healthBar && typeof remote.healthBar.destroy === 'function') {
            remote.healthBar.destroy();
        }
        remotePlayers.delete(id);
        remoteStateHistory.delete(id);
    });
}

function getSnapshotPlayer(snapshot, id) {
    if (!snapshot || !snapshot.players) return null;
    return snapshot.players.find((player) => player && player.id === id) || null;
}

function computePositionError(predicted, authoritative) {
    if (!predicted || !authoritative) return 0;
    const dx = predicted.x - authoritative.x;
    const dy = predicted.y - authoritative.y;
    return Math.hypot(dx, dy);
}

function applyPlayerState(target, state, options = {}) {
    if (!target || !state) return;
    const skipPosition = options.skipPosition === true;
    if (state.team) {
        target.team = state.team;
        if (level) {
            const spawn = getTeamSpawn(level, state.team);
            target.spawnPoint = { x: spawn.x, y: spawn.y };
        }
    }
    if (state.heroType) {
        target.heroType = state.heroType;
    }
    if (!skipPosition) {
        target.position.x = state.x;
        target.position.y = state.y;
        target.velocity.x = state.vx;
        target.velocity.y = state.vy;
    }
    target.isGrounded = Boolean(state.grounded);
    target.jumpsRemaining = state.jumps || 0;
    target.jumpKeyWasPressed = Boolean(state.jumpHeld);
    target.respawnTimer = state.respawnTimer || 0;
    target.frozenTimer = state.frozenTimer || 0;
    target.stunTimer = state.stunTimer || 0;
    target.poisonTimer = state.poisonTimer || 0;
    target.bleedTimer = state.bleedTimer || 0;
    target.fearTimer = state.fearTimer || 0;
    target.fearDirection = state.fearDirection || 0;
    target.mindControlTimer = state.mindControlTimer || 0;
    target.controlsInverted = Boolean(state.controlsInverted);
    target.controlsLocked = Boolean(state.controlsLocked);
    if (typeof state.ultimate === 'number') {
        target.ultimateCharge = state.ultimate;
    }
    if (state.abilities && target.abilities) {
        ['q', 'w', 'e', 'r'].forEach((key) => {
            const abilityState = state.abilities[key];
            const ability = target.abilities[key];
            if (!ability || !abilityState) return;
            ability.currentCooldown = abilityState.cooldown || 0;
            ability.isReady = Boolean(abilityState.ready);
        });
    }

    target.isCarryingFlag = false;
    target.flagCarryTeam = null;

    if (state.alive) {
        target.isAlive = true;
        target.mesh.visible = true;
        if (target.healthBar) {
            target.healthBar.show();
        }
    } else {
        target.isAlive = false;
        target.mesh.visible = false;
        if (target.healthBar) {
            target.healthBar.hide();
        }
    }

    if (typeof state.maxHp === 'number' && Number.isFinite(state.maxHp)) {
        const bonusHp = typeof state.bonusHp === 'number' && Number.isFinite(state.bonusHp) ? state.bonusHp : 0;
        const baseHp = Math.max(1, state.maxHp - bonusHp);
        target.baseMaxHealth = baseHp;
        target.bonusHealth = bonusHp;
        target.maxHealth = state.maxHp;
        if (target.healthBar) {
            target.healthBar.setBaseMaxHealth(baseHp);
            target.healthBar.setBonusHealth(bonusHp);
        }
    }

    target.currentHealth = state.hp;
    if (target.healthBar) {
        target.healthBar.setHealth(state.hp);
    }
    if (!skipPosition) {
        target.syncMeshPosition();
    }
    if (target.healthBar && typeof target.healthBar.update === 'function') {
        target.healthBar.update(0);
    }
}

function applyAuthoritativeLocalState(target, state) {
    if (!target || !state) return;
    if (state.team) {
        target.team = state.team;
        if (level) {
            const spawn = getTeamSpawn(level, state.team);
            target.spawnPoint = { x: spawn.x, y: spawn.y };
        }
    }
    target.respawnTimer = state.respawnTimer || 0;
    target.frozenTimer = state.frozenTimer || 0;
    target.stunTimer = state.stunTimer || 0;
    target.poisonTimer = state.poisonTimer || 0;
    target.bleedTimer = state.bleedTimer || 0;
    target.fearTimer = state.fearTimer || 0;
    target.fearDirection = state.fearDirection || 0;
    target.mindControlTimer = state.mindControlTimer || 0;
    target.controlsInverted = Boolean(state.controlsInverted);
    target.controlsLocked = Boolean(state.controlsLocked);
    target.isCarryingFlag = Boolean(state.carryingFlag);
    target.flagCarryTeam = state.flagTeam || null;

    if (typeof state.ultimate === 'number') {
        target.ultimateCharge = state.ultimate;
    }
    if (state.abilities && target.abilities) {
        ['q', 'w', 'e', 'r'].forEach((key) => {
            const abilityState = state.abilities[key];
            const ability = target.abilities[key];
            if (!ability || !abilityState) return;
            ability.currentCooldown = abilityState.cooldown || 0;
            ability.isReady = Boolean(abilityState.ready);
        });
    }

    if (typeof state.maxHp === 'number' && Number.isFinite(state.maxHp)) {
        const bonusHp = typeof state.bonusHp === 'number' && Number.isFinite(state.bonusHp) ? state.bonusHp : 0;
        const baseHp = Math.max(1, state.maxHp - bonusHp);
        target.baseMaxHealth = baseHp;
        target.bonusHealth = bonusHp;
        target.maxHealth = state.maxHp;
        if (target.healthBar) {
            target.healthBar.setBaseMaxHealth(baseHp);
            target.healthBar.setBonusHealth(bonusHp);
        }
    }

    if (typeof state.hp === 'number' && Number.isFinite(state.hp)) {
        target.currentHealth = state.hp;
        if (target.healthBar) {
            target.healthBar.setHealth(state.hp);
        }
    }

    if (state.alive) {
        target.isAlive = true;
        target.mesh.visible = true;
        if (target.healthBar) {
            target.healthBar.show();
        }
    } else {
        target.isAlive = false;
        target.mesh.visible = false;
        if (target.healthBar) {
            target.healthBar.hide();
        }
    }

    if (target.healthBar && typeof target.healthBar.update === 'function') {
        target.healthBar.update(0);
    }
}

function applyEnemyState(enemy, state, { skipPosition = false } = {}) {
    if (!enemy || !state) return;
    if (!skipPosition) {
        enemy.position.x = state.x;
        enemy.position.y = state.y;
        enemy.velocity.x = state.vx;
        enemy.velocity.y = state.vy;
    }
    enemy.direction = state.dir || enemy.direction;
    enemy.currentHealth = state.hp;
    if (typeof state.maxHp === 'number') {
        enemy.maxHealth = state.maxHp;
        if (enemy.healthBar && typeof enemy.healthBar.setMaxHealth === 'function') {
            enemy.healthBar.setMaxHealth(state.maxHp);
        }
    }
    enemy.isAlive = Boolean(state.alive);
    enemy.frozenTimer = state.frozenTimer || 0;
    enemy.stunTimer = state.stunTimer || 0;
    enemy.poisonTimer = state.poisonTimer || 0;
    enemy.bleedTimer = state.bleedTimer || 0;
    enemy.mesh.visible = enemy.isAlive;
    if (enemy.healthBar) {
        enemy.healthBar.setHealth(enemy.currentHealth);
    }
    if (!skipPosition) {
        enemy.syncMeshPosition();
    }
}

function storeEnemyState(state, tick) {
    if (!state || !state.id || !Number.isFinite(tick)) return;
    pushHistory(enemyStateHistory, state.id, {
        tick,
        x: state.x,
        y: state.y,
        vx: state.vx,
        vy: state.vy
    });
}

function applyEnemiesSnapshot(snapshot, options = {}) {
    if (!snapshot || !snapshot.enemies || !level || !level.enemies) return;
    const storeHistory = options.storeHistory === true;
    const skipPosition = options.skipPosition === true;
    const enemyMap = new Map();
    level.enemies.forEach((enemy, index) => {
        const id = enemy.netId || `${enemy.type || 'enemy'}-${index}`;
        enemyMap.set(id, enemy);
    });

    snapshot.enemies.forEach((state) => {
        const enemy = enemyMap.get(state.id);
        if (!enemy) return;
        applyEnemyState(enemy, state, { skipPosition });
        if (storeHistory) {
            storeEnemyState(state, snapshot.tick);
        }
    });
}

function applyFlagsSnapshot(snapshot) {
    if (!snapshot || !snapshot.flags || !flagState) return;
    const flags = flagState.flags || {};

    Object.values(flags).forEach((flag) => {
        clearFlagCarrier(flag, flag.carrier);
        flag.carrier = null;
    });

    ['blue', 'red'].forEach((team) => {
        const state = snapshot.flags[team];
        const flag = flags[team];
        if (!state || !flag) return;

        flag.isAtBase = Boolean(state.isAtBase);
        flag.dropped = Boolean(state.dropped);
        flag.returnTimer = state.returnTimer || 0;
        flag.pickupCooldown = state.pickupCooldown || 0;
        flag.mesh.position.set(state.x, state.y, 0.45);

        if (flag.ring) {
            flag.ring.visible = flag.dropped;
            if (flag.dropped) {
                flag.ring.position.set(state.x, state.y, 0.05);
            } else {
                flag.ring.position.set(flag.base.x, flag.base.y, 0.05);
            }
        }

        if (state.carrierId) {
            const carrier = getPlayerByNetId(state.carrierId);
            if (carrier) {
                setFlagCarrier(flag, carrier);
            }
        }

        flag.lastCarrierPosition = { x: state.lastX, y: state.lastY };
    });
}

function applySnapshotToWorld(snapshot) {
    if (!snapshot) return;
    applySnapshotToPlayers(snapshot, { storeRemoteHistory: false });
    applyEnemiesSnapshot(snapshot);
    applyFlagsSnapshot(snapshot);
    if (snapshot.scores) {
        teamScores.blue = snapshot.scores.blue;
        teamScores.red = snapshot.scores.red;
        updateScoreboard();
    }
}

function createInputAdapter(cmd) {
    const safe = cmd || {};
    return {
        isLeftPressed: () => !!safe.left,
        isRightPressed: () => !!safe.right,
        isJumpPressed: () => !!safe.jump,
        isAbility1Pressed: () => !!safe.ability1,
        isAbility2Pressed: () => !!safe.ability2,
        isAbility3Pressed: () => !!safe.ability3,
        isUltimatePressed: () => !!safe.ultimate,
        isFlagDropPressed: () => !!safe.flagDrop
    };
}

function simulateTick(cmdP1, cmdP2, deltaTime) {
    if (!player || !level) return;
    const inputP1 = createInputAdapter(cmdP1);
    const inputP2 = player2 ? createInputAdapter(cmdP2) : null;

    if (cmdP1 && typeof player.setAimDirection === 'function') {
        player.setAimDirection(cmdP1.aim);
    }
    if (player2 && cmdP2 && typeof player2.setAimDirection === 'function') {
        player2.setAimDirection(cmdP2.aim);
    }

    player.update(deltaTime, inputP1);
    if (player2 && inputP2) {
        player2.update(deltaTime, inputP2);
    }
    if (authoritativeActive) {
        const simTick = cmdP1?.tick ?? cmdP2?.tick ?? clientTick;
        updateMovingPlatformInterpolation(simTick);
    }
    level.update(deltaTime);
    level.checkCollisions(player);
    if (player2) {
        level.checkCollisions(player2);
    }
    const useLocalWorld = !authoritativeActive;
    if (useLocalWorld) {
        player.checkEnemyCollisions(level.enemies);
        if (player2) {
            player2.checkEnemyCollisions(level.enemies);
        }
        level.checkFlagPickup(player);
        if (player2) {
            level.checkFlagPickup(player2);
        }
    }
    if (player2 && player.team !== player2.team) {
        const p1Bounds = player.getBounds();
        const p2Bounds = player2.getBounds();
        if (checkAABBCollision(p1Bounds, p2Bounds)) {
            player.applyEnemyContact(player2);
            player2.applyEnemyContact(player);
        }
    }
    if (!authoritativeActive) {
        updateCTF(deltaTime, inputP1, inputP2);
    }
}

function replayFromTick(startTick, endTick) {
    if (startTick > endTick) return;
    for (let tick = startTick; tick <= endTick; tick++) {
        const cmdP1 = inputHistoryP1.buffer[tick % inputHistoryP1.size];
        const cmdP2 = inputHistoryP2.buffer[tick % inputHistoryP2.size];
        simulateTick(cmdP1, cmdP2, FIXED_DT);
        const snapshot = captureSimSnapshot(tick, player, player2);
        recordSnapshot(stateHistory, snapshot);
    }
}

function rewindAndReplay(snapshot) {
    if (!snapshot) return;
    let baseSnapshot = snapshot;
    if (!snapshot.enemies || snapshot.enemies.length === 0) {
        const predicted = stateHistory.buffer[snapshot.tick % stateHistory.size];
        if (predicted && predicted.tick === snapshot.tick && predicted.enemies && predicted.enemies.length) {
            baseSnapshot = { ...snapshot, enemies: predicted.enemies };
        }
    }
    applySnapshotToWorld(baseSnapshot);
    const startTick = baseSnapshot.tick + 1;
    const endTick = clientTick - 1;
    replayFromTick(startTick, endTick);
}

function injectDrift() {
    if (!driftEnabled || !player) return;
    if (clientTick % DRIFT_INJECT_INTERVAL !== 0 || clientTick === 0) return;
    player.position.x += DRIFT_AMOUNT;
    if (player.mesh) {
        player.syncMeshPosition();
    }
}

function quantize(value, scale = 1000) {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * scale) / scale;
}

function capturePlayerState(player) {
    if (!player) return null;
    const abilityState = {};
    if (player.abilities) {
        ['q', 'w', 'e', 'r'].forEach((key) => {
            const ability = player.abilities[key];
            if (!ability) return;
            abilityState[key] = {
                cooldown: quantize(ability.currentCooldown, 1000),
                ready: ability.isReady ? 1 : 0
            };
        });
    }
    return {
        id: player.netId || 'player',
        heroType: player.heroType || player.constructor?.name || '',
        team: player.team || '',
        x: quantize(player.position.x),
        y: quantize(player.position.y),
        vx: quantize(player.velocity.x),
        vy: quantize(player.velocity.y),
        hp: quantize(player.currentHealth, 100),
        maxHp: quantize(player.maxHealth || 0, 100),
        bonusHp: quantize(player.bonusHealth || 0, 100),
        alive: player.isAlive ? 1 : 0,
        grounded: player.isGrounded ? 1 : 0,
        jumps: player.jumpsRemaining || 0,
        jumpHeld: player.jumpKeyWasPressed ? 1 : 0,
        respawnTimer: quantize(player.respawnTimer || 0, 1000),
        ultimate: quantize(player.ultimateCharge || 0, 1000),
        frozenTimer: quantize(player.frozenTimer || 0, 1000),
        stunTimer: quantize(player.stunTimer || 0, 1000),
        poisonTimer: quantize(player.poisonTimer || 0, 1000),
        bleedTimer: quantize(player.bleedTimer || 0, 1000),
        fearTimer: quantize(player.fearTimer || 0, 1000),
        fearDirection: quantize(player.fearDirection || 0, 1000),
        mindControlTimer: quantize(player.mindControlTimer || 0, 1000),
        controlsInverted: player.controlsInverted ? 1 : 0,
        controlsLocked: player.controlsLocked ? 1 : 0,
        carryingFlag: player.isCarryingFlag ? 1 : 0,
        flagTeam: player.flagCarryTeam || '',
        abilities: abilityState
    };
}

function hashSnapshot(snapshot) {
    if (!snapshot) return '';
    let data = `${snapshot.tick}|`;
    const players = [...snapshot.players].sort((a, b) => a.id.localeCompare(b.id));
    players.forEach((player) => {
        data += `${player.id},${player.x},${player.y},${player.vx},${player.vy},${player.hp},${player.alive},${player.grounded},${player.jumps},${player.jumpHeld},${player.respawnTimer},${player.ultimate},${player.frozenTimer},${player.stunTimer},${player.poisonTimer},${player.bleedTimer},${player.fearTimer},${player.fearDirection},${player.mindControlTimer},${player.controlsInverted},${player.controlsLocked},${player.carryingFlag},${player.flagTeam}|`;
        const abilities = player.abilities || {};
        ['q', 'w', 'e', 'r'].forEach((key) => {
            const state = abilities[key];
            if (!state) return;
            data += `${key}:${state.cooldown},${state.ready}|`;
        });
    });
    const enemies = [...(snapshot.enemies || [])].sort((a, b) => a.id.localeCompare(b.id));
    enemies.forEach((enemy) => {
        data += `enemy:${enemy.id},${enemy.x},${enemy.y},${enemy.vx},${enemy.vy},${enemy.hp},${enemy.alive},${enemy.dir},${enemy.frozenTimer},${enemy.stunTimer},${enemy.poisonTimer},${enemy.bleedTimer}|`;
    });
    const flags = snapshot.flags || {};
    ['blue', 'red'].forEach((team) => {
        const flag = flags[team];
        if (!flag) return;
        data += `flag:${team},${flag.x},${flag.y},${flag.isAtBase},${flag.dropped},${flag.returnTimer},${flag.pickupCooldown},${flag.carrierId},${flag.lastX},${flag.lastY}|`;
    });
    data += `scores:${snapshot.scores.blue},${snapshot.scores.red}`;
    return fnv1a(data);
}

function fnv1a(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

function captureSimSnapshot(tick, playerOne, playerTwo) {
    const snapshot = {
        tick,
        players: [capturePlayerState(playerOne), capturePlayerState(playerTwo)].filter(Boolean),
        enemies: captureEnemiesState(level?.enemies || []),
        flags: captureFlagsSnapshot(flagState),
        scores: { blue: teamScores.blue, red: teamScores.red }
    };
    snapshot.hash = hashSnapshot(snapshot);
    return snapshot;
}

function captureEnemiesState(enemies) {
    return enemies.map((enemy, index) => captureEnemyState(enemy, index)).filter(Boolean);
}

function captureEnemyState(enemy, index) {
    if (!enemy) return null;
    return {
        id: enemy.netId || `${enemy.type || 'enemy'}-${index}`,
        type: enemy.type || 'enemy',
        x: quantize(enemy.position.x),
        y: quantize(enemy.position.y),
        vx: quantize(enemy.velocity.x),
        vy: quantize(enemy.velocity.y),
        dir: quantize(enemy.direction || 0, 1000),
        hp: quantize(enemy.currentHealth || 0, 100),
        alive: enemy.isAlive ? 1 : 0,
        frozenTimer: quantize(enemy.frozenTimer || 0, 1000),
        stunTimer: quantize(enemy.stunTimer || 0, 1000),
        poisonTimer: quantize(enemy.poisonTimer || 0, 1000),
        bleedTimer: quantize(enemy.bleedTimer || 0, 1000)
    };
}

function captureFlagsSnapshot(flagData) {
    if (!flagData || !flagData.flags) return null;
    const snapshot = {};
    ['blue', 'red'].forEach((team) => {
        const flag = flagData.flags[team];
        if (!flag) return;
        snapshot[team] = {
            x: quantize(flag.mesh.position.x),
            y: quantize(flag.mesh.position.y),
            isAtBase: flag.isAtBase ? 1 : 0,
            dropped: flag.dropped ? 1 : 0,
            returnTimer: quantize(flag.returnTimer || 0, 1000),
            pickupCooldown: quantize(flag.pickupCooldown || 0, 1000),
            carrierId: flag.carrier?.netId || '',
            lastX: quantize(flag.lastCarrierPosition?.x ?? flag.base.x),
            lastY: quantize(flag.lastCarrierPosition?.y ?? flag.base.y)
        };
    });
    return snapshot;
}

function initDebugOverlay() {
    if (debugOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'debug-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.65);
        color: #ffffff;
        font-family: monospace;
        font-size: 12px;
        padding: 8px 10px;
        border-radius: 6px;
        z-index: 3000;
        white-space: pre;
        display: none;
    `;
    document.body.appendChild(overlay);
    debugOverlay = overlay;

    window.addEventListener('keydown', (event) => {
        if (event.code === 'F1') {
            debugOverlayVisible = !debugOverlayVisible;
            debugOverlay.style.display = debugOverlayVisible ? 'block' : 'none';
            event.preventDefault();
            return;
        }
        if (event.code === 'F2') {
            driftEnabled = !driftEnabled;
            debugStats.driftEnabled = driftEnabled;
            event.preventDefault();
            return;
        }
        if (event.code === 'F3') {
            reconciliationEnabled = !reconciliationEnabled;
            debugStats.reconciliationEnabled = reconciliationEnabled;
            event.preventDefault();
        }
    });
}

function updateDebugOverlay() {
    if (!debugOverlay || !debugOverlayVisible) return;
    debugOverlay.textContent = [
        `tick: ${debugStats.clientTick}`,
        `serverTick: ${debugStats.lastServerTick}`,
        `pendingInputs: ${debugStats.pendingInputs}`,
        `rewinds: ${debugStats.rewinds}`,
        `lastCorrection: ${debugStats.lastCorrectionDist.toFixed(3)}`,
        `simSteps/frame: ${debugStats.simStepsPerFrame}`,
        `net: ${debugStats.netStatus} ${debugStats.playerId || ''} rtt ${debugStats.rttMs.toFixed(0)}ms ack ${debugStats.lastAckCmd}`,
        `reconcile: ${debugStats.reconciliationEnabled ? 'on' : 'off'}`,
        `drift: ${debugStats.driftEnabled ? 'on' : 'off'}`,
        `stateHash: ${debugStats.stateHash}`
    ].join('\n');
}

function initNetworkClient() {
    if (netClient) {
        netClient.close();
    }
    debugStats.netStatus = 'connecting';
    netClient = new NetClient({
        url: NETWORK_URL,
        onStatus: (status, message) => {
            debugStats.netStatus = status;
            useLocalServerSim = status !== 'connected';
            if (status === 'connected') {
                driftEnabled = false;
                debugStats.driftEnabled = false;
                serverTickOffset = null;
            }
            if (message && message.mode) {
                serverMode = message.mode;
            }
            if (message && message.playerId) {
                debugStats.playerId = message.playerId;
                localPlayerId = message.playerId;
                if (player && !player2) {
                    player.netId = localPlayerId;
                }
            }
            if (status === 'connected' && pendingPlayerInfo && netClient) {
                netClient.sendPlayerInfo(pendingPlayerInfo);
                pendingPlayerInfo = null;
            }
            updateAuthoritativeState();
        },
        onSnapshot: (snapshot, message) => {
            handleServerSnapshot(snapshot);
            if (message && typeof message.lastProcessedCmdNumber === 'number') {
                debugStats.lastAckCmd = message.lastProcessedCmdNumber;
            }
        },
        onAck: (message) => {
            if (typeof message.cmdNumber === 'number') {
                debugStats.lastAckCmd = message.cmdNumber;
            }
        },
        onRtt: (rttMs) => {
            debugStats.rttMs = rttMs;
        }
    });
    netClient.connect();
}

function buildInputCommand(input, aimDirection, tick) {
    return {
        tick,
        left: input?.isLeftPressed?.() || false,
        right: input?.isRightPressed?.() || false,
        jump: input?.isJumpPressed?.() || false,
        ability1: input?.isAbility1Pressed?.() || false,
        ability2: input?.isAbility2Pressed?.() || false,
        ability3: input?.isAbility3Pressed?.() || false,
        ultimate: input?.isUltimatePressed?.() || false,
        flagDrop: input?.isFlagDropPressed?.() || false,
        aim: aimDirection ? { x: aimDirection.x, y: aimDirection.y } : null
    };
}

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
    initDebugOverlay();
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

function updateScoreboard() {
    if (scoreBlueEl) {
        scoreBlueEl.textContent = `${teamScores.blue}`;
    }
    if (scoreRedEl) {
        scoreRedEl.textContent = `${teamScores.red}`;
    }
}

function createFlag(team, base, color) {
    const flagGroup = new THREE.Group();
    const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.1, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x4a3a2a })
    );
    pole.position.y = 0.55;
    flagGroup.add(pole);

    const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.35, 0.05),
        new THREE.MeshBasicMaterial({ color })
    );
    cloth.position.set(0.32, 0.75, 0);
    flagGroup.add(cloth);

    flagGroup.position.set(base.x, base.y, 0.45);
    scene.add(flagGroup);

    const ringGeometry = new THREE.RingGeometry(0.9, 1.35, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(base.x, base.y, 0.05);
    ring.visible = false;
    scene.add(ring);

    return {
        team,
        base,
        mesh: flagGroup,
        ring,
        carrier: null,
        isAtBase: true,
        dropped: false,
        returnTimer: 0,
        pickupCooldown: 0,
        lastCarrierPosition: { x: base.x, y: base.y }
    };
}

function initCTF(levelInstance) {
    const spawns = levelInstance.flagSpawns || {
        blue: { x: -60, y: 3 },
        red: { x: 60, y: 3 }
    };
    teamScores = { blue: 0, red: 0 };
    updateScoreboard();
    setScoreboardVisible(true);

    flagState = {
        returnDelay: 10,
        returnRadius: 1.3,
        baseRadius: 1.8,
        bases: {
            blue: { x: spawns.blue.x, y: spawns.blue.y },
            red: { x: spawns.red.x, y: spawns.red.y }
        },
        flags: {
            blue: createFlag('blue', spawns.blue, 0x2f6cb0),
            red: createFlag('red', spawns.red, 0xcc2f2f)
        }
    };
}

function clearCTF() {
    if (flagState && flagState.flags) {
        Object.values(flagState.flags).forEach((flag) => {
            if (flag.mesh && flag.mesh.parent) {
                flag.mesh.parent.remove(flag.mesh);
            }
            if (flag.ring && flag.ring.parent) {
                flag.ring.parent.remove(flag.ring);
            }
        });
    }
    flagState = null;
    setScoreboardVisible(false);
}

function getFlagBounds(flag) {
    const x = flag.mesh.position.x;
    const y = flag.mesh.position.y;
    return {
        left: x - 0.4,
        right: x + 0.4,
        top: y + 0.9,
        bottom: y - 0.2
    };
}

function setFlagCarrier(flag, carrier) {
    flag.carrier = carrier;
    flag.isAtBase = false;
    flag.dropped = false;
    flag.returnTimer = 0;
    flag.pickupCooldown = 0;
    if (flag.ring) {
        flag.ring.visible = false;
    }
    flag.lastCarrierPosition = { x: carrier.position.x, y: carrier.position.y };
    carrier.isCarryingFlag = true;
    carrier.flagCarryTeam = flag.team;
}

function clearFlagCarrier(flag, carrier) {
    if (carrier) {
        carrier.isCarryingFlag = false;
        carrier.flagCarryTeam = null;
    }
    flag.carrier = null;
}

function resetFlag(flag) {
    clearFlagCarrier(flag, flag.carrier);
    flag.isAtBase = true;
    flag.dropped = false;
    flag.returnTimer = 0;
    flag.pickupCooldown = 0;
    flag.mesh.position.set(flag.base.x, flag.base.y, 0.45);
    if (flag.ring) {
        flag.ring.visible = false;
        flag.ring.position.set(flag.base.x, flag.base.y, 0.05);
    }
    flag.lastCarrierPosition = { x: flag.base.x, y: flag.base.y };
}

function dropFlag(flag) {
    const dropPos = flag.lastCarrierPosition || flag.base;
    clearFlagCarrier(flag, flag.carrier);
    flag.isAtBase = false;
    flag.dropped = true;
    flag.returnTimer = flagState.returnDelay;
    flag.pickupCooldown = 0.25;
    flag.mesh.position.set(dropPos.x, dropPos.y, 0.45);
    if (flag.ring) {
        flag.ring.visible = true;
        flag.ring.position.set(dropPos.x, dropPos.y, 0.05);
    }
}

function isPlayerInBase(player, team) {
    if (!flagState) return false;
    const base = flagState.bases[team];
    if (!base) return false;
    const radius = flagState.baseRadius;
    const baseBounds = {
        left: base.x - radius,
        right: base.x + radius,
        top: base.y + radius,
        bottom: base.y - radius
    };
    return checkAABBCollision(player.getBounds(), baseBounds);
}

function updateCTF(deltaTime, inputP1, inputP2) {
    if (!flagState) return;
    const players = [
        { player, input: inputP1 },
        { player: player2, input: inputP2 }
    ].filter((entry) => entry.player);

    const playerInputs = players.map(({ player: activePlayer, input: activeInput }) => {
        const dropPressed = activeInput?.isFlagDropPressed?.() || false;
        const dropJustPressed = dropPressed && !activePlayer.flagDropWasPressed;
        return { player: activePlayer, input: activeInput, dropPressed, dropJustPressed };
    });

    playerInputs.forEach(({ player: activePlayer, dropPressed, dropJustPressed }) => {
        activePlayer.flagCarryBlocksAbility3 = Boolean(activePlayer.isCarryingFlag);
        if (activePlayer.isCarryingFlag && dropJustPressed) {
            const carriedFlag = flagState.flags[activePlayer.flagCarryTeam];
            if (carriedFlag && carriedFlag.carrier === activePlayer) {
                carriedFlag.lastCarrierPosition = { x: activePlayer.position.x, y: activePlayer.position.y };
                dropFlag(carriedFlag);
            }
        }
    });

    Object.values(flagState.flags).forEach((flag) => {
        if (flag.carrier) {
            if (flag.carrier.isAlive) {
                flag.lastCarrierPosition = { x: flag.carrier.position.x, y: flag.carrier.position.y };
                flag.mesh.position.set(flag.carrier.position.x, flag.carrier.position.y + 1.0, 0.45);
            } else {
                dropFlag(flag);
            }
        } else if (flag.dropped) {
            if (flag.ring) {
                flag.ring.position.set(flag.mesh.position.x, flag.mesh.position.y, 0.05);
            }
            if (flag.pickupCooldown > 0) {
                flag.pickupCooldown -= deltaTime;
            }
        }
    });

    playerInputs.forEach(({ player: activePlayer, dropPressed }) => {
        if (!activePlayer.isAlive) return;
        Object.values(flagState.flags).forEach((flag) => {
            if (flag.carrier) return;
            const flagBounds = getFlagBounds(flag);
            if (!checkAABBCollision(activePlayer.getBounds(), flagBounds)) return;

            if (flag.team === activePlayer.team) {
                return;
            } else if (!activePlayer.isCarryingFlag) {
                if (flag.dropped && !dropPressed) {
                    return;
                }
                if (flag.pickupCooldown > 0) {
                    return;
                }
                setFlagCarrier(flag, activePlayer);
            }
        });
    });

    Object.values(flagState.flags).forEach((flag) => {
        if (!flag.dropped) return;
        const radius = flagState.returnRadius;
        const ringBounds = {
            left: flag.mesh.position.x - radius,
            right: flag.mesh.position.x + radius,
            top: flag.mesh.position.y + radius,
            bottom: flag.mesh.position.y - radius
        };

        let friendlyInRing = false;
        let enemyInRing = false;

        players.forEach(({ player: activePlayer }) => {
            if (!activePlayer.isAlive) return;
            if (!checkAABBCollision(activePlayer.getBounds(), ringBounds)) return;
            if (activePlayer.team === flag.team) {
                friendlyInRing = true;
            } else {
                enemyInRing = true;
            }
        });

        if (friendlyInRing && !enemyInRing) {
            flag.returnTimer -= deltaTime;
            if (flag.returnTimer <= 0) {
                resetFlag(flag);
            }
        } else {
            flag.returnTimer = flagState.returnDelay;
        }
    });

    playerInputs.forEach(({ player: activePlayer }) => {
        if (!activePlayer.isCarryingFlag || !activePlayer.isAlive) return;
        const enemyTeam = activePlayer.flagCarryTeam;
        if (!enemyTeam || enemyTeam === activePlayer.team) return;
        const ownFlag = flagState.flags[activePlayer.team];
        if (!ownFlag || !ownFlag.isAtBase) return;
        if (!isPlayerInBase(activePlayer, activePlayer.team)) return;

        teamScores[activePlayer.team] += 1;
        updateScoreboard();
        resetFlag(flagState.flags[enemyTeam]);
        activePlayer.isCarryingFlag = false;
        activePlayer.flagCarryTeam = null;
    });

    playerInputs.forEach(({ player: activePlayer, dropPressed }) => {
        activePlayer.flagDropWasPressed = dropPressed;
    });
}

// Start game with selected hero
function startGame(HeroClass, HeroClassP2 = null, teamP1 = 'blue', teamP2 = 'red') {
    resetInputHistory();

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
    initNetworkClient();

    // Create environment (background, clouds, particles)
    environment = new Environment(scene);
    environment.createBackground();

    // Create level with platforms
    level = new Level(scene);
    level.createTestLevel({ includeInteractiveFlags: false });
    updateAuthoritativeState();

    // Setup parallax manager (foreground/midground/background)
    parallaxManager = new ParallaxManager(camera);
    environment.getParallaxLayers().forEach(layer => parallaxManager.addLayer(layer));
    parallaxManager.addLayer({ root: level.group, speedMultiplier: 1 });

    // Add enemies to level (positioned to avoid platforms)
    const goomba1 = new Goomba(scene, 8, 0);    // Right side near grass platform
    goomba1.netId = 'e1';
    level.addEnemy(goomba1);

    const goomba2 = new Goomba(scene, -7, 0);   // Left side, clear area
    goomba2.netId = 'e2';
    level.addEnemy(goomba2);

    const goomba3 = new Goomba(scene, 12, 3);   // On floating platform
    goomba3.netId = 'e3';
    level.addEnemy(goomba3);

    // REMOVED: goomba4 was at -12 (conflicts with wall with ladder)

    const goomba5 = new Goomba(scene, -17, 3);  // Far left on grass platform
    goomba5.netId = 'e4';
    level.addEnemy(goomba5);

    const goomba6 = new Goomba(scene, 18, 0);   // Far right ground
    goomba6.netId = 'e5';
    level.addEnemy(goomba6);

    const spawnP1 = getTeamSpawn(level, teamP1);
    player = new HeroClass(scene, spawnP1.x, spawnP1.y);
    player.netId = localPlayerId || 'p1';
    player.team = teamP1;
    player.heroType = HeroClass.name;
    player.spawnPoint = { x: spawnP1.x, y: spawnP1.y };
    player.enemies = level.enemies;
    player.level = level; // Pass level reference for platform detection
    player.opponents = [];

    player2 = null;
    if (HeroClassP2) {
        const spawnP2 = getTeamSpawn(level, teamP2);
        player2 = new HeroClassP2(scene, spawnP2.x, spawnP2.y);
        player2.netId = 'p2';
        player2.team = teamP2;
        player2.heroType = HeroClassP2.name;
        player2.spawnPoint = { x: spawnP2.x, y: spawnP2.y };
        player2.enemies = level.enemies;
        player2.level = level;
        player2.opponents = [];
    }

    sendLocalPlayerInfo();
    syncOpponentLinks();

    if (player2 && player.team !== player2.team) {
        addOpponent(player, player2);
        addOpponent(player2, player);
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

    initCTF(level);

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
            const cmdP1 = buildInputCommand(input, aimP1, clientTick);
            cmdP1.cmdNumber = cmdSequenceP1++;
            recordInput(inputHistoryP1, cmdP1);
            lastInputCmdP1 = cmdP1;
            if (netClient && netClient.isConnected()) {
                netClient.sendInput(cmdP1);
            }
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
                const cmdP2 = buildInputCommand(input2, aimP2, clientTick);
                cmdP2.cmdNumber = cmdSequenceP2++;
                recordInput(inputHistoryP2, cmdP2);
                lastInputCmdP2 = cmdP2;
                if (netClient && netClient.isConnected()) {
                    netClient.sendInput(cmdP2);
                }
                if (typeof player2.setAimDirection === 'function') {
                    player2.setAimDirection(aimP2);
                }
            }

            player.update(deltaTime, input);
            if (player2 && input2) {
                player2.update(deltaTime, input2);
            }
            if (authoritativeActive) {
                updateMovingPlatformInterpolation();
            }
            level.update(deltaTime);
            level.checkCollisions(player);
            if (player2) {
                level.checkCollisions(player2);
            }
            const useLocalWorld = !authoritativeActive;
            if (useLocalWorld) {
                player.checkEnemyCollisions(level.enemies);
                if (player2) {
                    player2.checkEnemyCollisions(level.enemies);
                }
                level.checkFlagPickup(player);
                if (player2) {
                    level.checkFlagPickup(player2);
                }
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

            if (!authoritativeActive) {
                updateCTF(deltaTime, input, input2);
            }

            // Update environment animations
            environment.update(deltaTime);

            const serverSnapshot = captureSimSnapshot(clientTick, player, player2);
            if (useLocalServerSim) {
                enqueueServerSnapshot(serverSnapshot);
            }

            injectDrift();

            const snapshot = driftEnabled ? captureSimSnapshot(clientTick, player, player2) : serverSnapshot;
            recordSnapshot(stateHistory, snapshot);
            debugStats.stateHash = snapshot.hash;
            debugStats.clientTick = clientTick;
            debugStats.pendingInputs = 0;
            debugStats.driftEnabled = driftEnabled;
            debugStats.reconciliationEnabled = reconciliationEnabled;
            if (netClient && netClient.isConnected()) {
                if (serverMode !== 'authoritative' && clientTick % SNAPSHOT_SEND_INTERVAL_TICKS === 0) {
                    netClient.sendSnapshot(snapshot);
                }
            } else {
                processServerSnapshots(clientTick);
            }

            updateRemoteInterpolation();
            updateEnemyInterpolation();
            updateProjectileInterpolation();
            updateAoeInterpolation();
            clientTick += 1;
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
            updateDebugOverlay();
        },
        {
            fixedDt: FIXED_DT,
            maxSubSteps: MAX_SUBSTEPS,
            onSubSteps: (steps) => {
                debugStats.simStepsPerFrame = steps;
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
    resetInputHistory();
    if (netClient) {
        netClient.close();
        netClient = null;
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
    clearCTF();
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
    initScoreboard();

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
