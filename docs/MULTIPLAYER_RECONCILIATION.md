# Multiplayer + Prediction/Reconciliation Notes

This file captures the key information needed to add deterministic simulation,
prediction + reconciliation, and a server-authoritative multiplayer model.
It is written for the current Three.js codebase in `docs/`.

## 1) Current Architecture (high level)

- Client-only simulation with rendering in the same update loop.
- Variable delta time from requestAnimationFrame.
- Many abilities and projectiles are driven by setTimeout/setInterval.
- State is stored directly on Three.js objects or game classes.
- UI and audio are updated directly from client state.

Key files:
- Game loop: `docs/core/gameLoop.js`
- Main runtime: `docs/main_hero_select.js`
- Player/Hero: `docs/player/Player.js`, `docs/player/Hero.js`
- Heroes: `docs/player/*.js`
- Level/CTF: `docs/world/Level.js`, CTF logic in `docs/main_hero_select.js`
- Enemies: `docs/entities/*.js`

## 2) Determinism blockers (must fix for prediction/rollback)

The current simulation is not deterministic across clients. For prediction and
server reconciliation you need deterministic simulation given identical inputs.

Primary blockers:
- Variable timestep (frame delta) from requestAnimationFrame.
- setTimeout/setInterval used for damage ticks, projectiles, ability effects.
- Math.random/performance.now used inside active gameplay logic.
- Simulation intertwined with rendering (Three.js meshes updated inside logic).

Required fixes:
1) Introduce a fixed-tick simulation (e.g., 60 Hz or 30 Hz).
2) Replace setTimeout/setInterval in gameplay with tick-driven timers.
3) Move random usage into client-only visuals or use deterministic RNG seeds.
4) Separate simulation state from rendering state (render from sim state).

## 3) State Inventory (what must be simulated and snapshotted)

### Player / Hero state
- position (x,y,z), velocity (x,y)
- isGrounded, isAlive, respawnTimer, respawnDelay
- jumpsRemaining, jumpKeyWasPressed
- health: maxHealth, currentHealth
- team, type, spawnPoint
- status effects: frozenTimer, stunTimer, poisonTimer, bleedTimer, fearTimer,
  mindControlTimer, controlsLocked, controlsInverted, fearDirection
- ability system: cooldowns, isReady per ability
- ultimate: ultimateCharge, ultimateChargeMax, ultimateChargeRate
- hero-specific state (examples):
  - Archer: isCharging, chargeTime, maxChargeTime, machineBowActive, etc.
  - Warlock: isHovering, hover timers, chaos storm timers
  - Assassin: isShadowWalking, shadow timers
- flag state (CTF): isCarryingFlag, flagCarryTeam

### Enemies
- position, velocity, isAlive, direction
- health
- AI state (e.g., Goomba direction)

### Projectiles / ability objects (convert to sim entities)
- Archer arrows (position, velocity, remaining lifetime)
- Assassin bombs (position, velocity, fuse, collision state)
- Warlock chaos storm ticks (timer) or treat as aura

### Level
- platforms (static) and moving platform phase/time
- ladders
- boundary walls

### CTF state
- team scores
- flag state per team: carrier, isAtBase, dropped
- dropped flag position
- return ring timer

### What can be client-only
- VFX meshes (wind trails, particles, sparkles)
- audio
- UI (health bars, ability UI)
- camera and parallax layers

## 4) Required code refactors (before networking)

1) Fixed simulation tick
- Add a deterministic tick loop (e.g., 60 Hz) independent of rendering.
- Simulation uses fixed dt (1/60) in all physics and cooldowns.

2) Eliminate setTimeout/setInterval in gameplay logic
- Replace with per-entity timers updated in the fixed tick.
- Example: Warlock chaos storm tick should be a timer field that fires when
  `timeSinceLastTick >= tickInterval`.

3) Deterministic RNG
- If randomness affects damage or collision, use a seeded RNG.
- Visual-only randomness is fine to keep client side.

4) Separate simulation state from render state
- Create a state object per entity.
- Render layer reads state to update meshes.
- Server runs simulation without Three.js.

## 5) Network Model (authoritative server)

### Suggested transport
- WebSocket server (Node.js) for reliable input and snapshots.
- UDP is possible later, but WebSocket is simplest to start.

### Server authority
- Server owns truth for simulation state.
- Clients send input commands with sequence numbers.
- Server simulates world, sends snapshots back at fixed rate.

### Client prediction
- Client runs local prediction using inputs sent.
- Client stores input history indexed by sequence/tick.
- On snapshot, client rewinds to the server tick, reapplies inputs.

### Reconciliation steps
1) Client sends input (per tick): seq, tick, actions, aim vector.
2) Server simulates input at tick, advances simulation.
3) Server sends snapshot: tick + state for all entities + lastProcessedInput.
4) Client compares server state with predicted state at that tick.
5) If mismatch > threshold, rewind to server state and replay inputs.

### Interpolation for remote players
- Non-local entities interpolate between snapshots (buffer ~100ms).
- Use smooth interpolation for position/velocity.

## 6) Inputs to send (compact bitmask)

Example input packet:
- tick, sequence
- buttons bitmask: left/right/jump/A1/A2/A3/ultimate/flagDrop
- aim vector (x,y) normalized
- optional: analog move (for gamepad)

## 7) Snapshot data (server -> client)

Minimum snapshot:
- tick
- players: id, team, position, velocity, health, status timers, ability cooldowns,
  ultimate charge, isCarryingFlag, facing, hero type
- enemies: id, position, velocity, health, direction
- CTF: team scores, flag states (carrier id or null), dropped positions, return timers

Consider delta compression later once stable.

## 8) CTF rules for server

- Flag pickup
  - Only enemy team can pick up.
  - Pick up on contact OR press drop/pickup key if dropped.
- Flag drop
  - If carrier dies or presses drop key.
- Return ring
  - When flag is dropped, a translucent ring appears at drop position.
  - If only the owning team stands in the ring for 10 seconds,
    the flag returns to base.
- Capture
  - Carrier returns to own base with enemy flag while own flag is at base.

## 9) Server hosting plan

### Local network (LAN)
- Run Node server on host PC (e.g., port 8080).
- Clients connect to `ws://<LAN_IP>:8080`.
- Ensure firewall allows the port.

### Internet (home dedicated PC)
- Set up port forwarding on router to the server PC.
- Use a dynamic DNS name (DuckDNS or similar).
- Serve over TLS if using `wss://` (reverse proxy like Caddy or Nginx).
- Expect NAT/ISP restrictions; consider Tailscale for easier access.

## 10) Testing and validation

- Add a debug checksum of state per tick to detect desyncs.
- Log mismatches with tick, entity id, and fields.
- Add a headless simulation test that runs the same input stream twice
  and checks for identical results.

## 11) Suggested milestones

1) Refactor simulation loop to fixed tick.
2) Replace setInterval/setTimeout gameplay logic with timers.
3) Split simulation state from rendering.
4) Implement local input buffer + rollback (single player).
5) Add server with authoritative simulation and snapshots.
6) Add client prediction and reconciliation.
7) Add interpolation for remote players.
8) Harden for WAN play (port forwarding / TLS / NAT).

