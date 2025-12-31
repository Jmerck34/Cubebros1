import { WebSocketServer } from 'ws';
import { createWorld, ensurePlayer, stepWorld, getSnapshot } from '../sim/simCore.js';
import { buildTestLevelData } from '../sim/levelData.js';

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const TICK_RATE = 60;
const TICK_MS = Math.round(1000 / TICK_RATE);
const SNAPSHOT_RATE = 20;
const SNAPSHOT_INTERVAL = Math.max(1, Math.round(TICK_RATE / SNAPSHOT_RATE));
const SERVER_MODE = process.env.SERVER_MODE || 'relay';

let serverTick = 0;
let nextClientId = 1;
const activePlayerIds = new Set();
const PLAYER_SLOTS = ['p1', 'p2'];

const wss = new WebSocketServer({ port: PORT });
const levelData = buildTestLevelData();
const world = createWorld(levelData);
const inputQueues = new Map();
const lastInputs = new Map();

setInterval(() => {
    serverTick += 1;
    if (SERVER_MODE === 'authoritative') {
        tickAuthoritative();
    }
}, TICK_MS);

function broadcast(message) {
    const payload = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    });
}

function tickAuthoritative() {
    const inputsById = new Map();

    for (const [playerId, queue] of inputQueues.entries()) {
        let lastInput = lastInputs.get(playerId) || null;
        while (queue.length && queue[0].tick <= world.tick) {
            lastInput = queue.shift();
        }
        if (lastInput) {
            lastInputs.set(playerId, lastInput);
            inputsById.set(playerId, lastInput);
        }
    }

    stepWorld(world, inputsById, 1 / TICK_RATE);

    if (world.tick % SNAPSHOT_INTERVAL === 0) {
        const snapshot = getSnapshot(world);
        broadcast({
            type: 'snapshot',
            serverTick: world.tick,
            lastProcessedCmdNumber: 0,
            snapshot
        });
    }
}

wss.on('connection', (ws) => {
    const clientId = `c${nextClientId++}`;
    const playerId = PLAYER_SLOTS.find((slot) => !activePlayerIds.has(slot)) || `p${nextClientId}`;
    ws.clientId = clientId;
    ws.playerId = playerId;
    ws.lastCmdNumber = 0;

    activePlayerIds.add(playerId);
    inputQueues.set(playerId, []);
    const team = playerId === 'p1' ? 'blue' : 'red';
    const spawn = team === 'blue' ? levelData.flagSpawns.blue : levelData.flagSpawns.red;
    ensurePlayer(world, playerId, { x: spawn.x, y: spawn.y, team, forceSpawn: true });

    ws.send(JSON.stringify({ type: 'welcome', clientId, playerId, serverTick, mode: SERVER_MODE }));

    ws.on('message', (data) => {
        let message = null;
        try {
            message = JSON.parse(data.toString());
        } catch (error) {
            return;
        }

        if (!message || !message.type) return;

        if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', time: message.time || 0 }));
            return;
        }

        if (message.type === 'input') {
            if (typeof message.cmdNumber === 'number') {
                ws.lastCmdNumber = message.cmdNumber;
            }
            if (SERVER_MODE === 'authoritative') {
                const queue = inputQueues.get(ws.playerId) || [];
                queue.push(message.input);
                inputQueues.set(ws.playerId, queue);
            }
            ws.send(JSON.stringify({
                type: 'ack',
                cmdNumber: ws.lastCmdNumber,
                serverTick
            }));
            return;
        }

        if (message.type === 'snapshot' && message.snapshot && SERVER_MODE !== 'authoritative') {
            const payload = {
                type: 'snapshot',
                serverTick,
                lastProcessedCmdNumber: ws.lastCmdNumber || 0,
                snapshot: message.snapshot
            };
            broadcast(payload);
            return;
        }

        if (message.type === 'playerInfo') {
            const heroType = message.heroType || message.hero || message.class || (message.info && message.info.heroType);
            const team = message.team || (message.info && message.info.team);
            if (heroType || team) {
                const hasInput = lastInputs.get(ws.playerId);
                ensurePlayer(world, ws.playerId, {
                    heroType: heroType || undefined,
                    team: team || undefined,
                    forceSpawn: Boolean(team && !hasInput)
                });
            }
        }
    });

    ws.on('close', () => {
        inputQueues.delete(ws.playerId);
        lastInputs.delete(ws.playerId);
        activePlayerIds.delete(ws.playerId);
        world.players.delete(ws.playerId);
        ws.terminate();
    });
});

console.log(`WebSocket server listening on ws://localhost:${PORT} (mode: ${SERVER_MODE})`);
