import { GRAVITY, PLAYER_SPEED, JUMP_VELOCITY, DEATH_Y } from '../docs/core/constants.js';
import { buildTestLevelData } from './levelData.js';

const PLAYER_HALF_SIZE = 0.5;
const PLAYER_JUMPS = 2;
const RESPAWN_TIME = 1.2;
const DEFAULT_MAX_HP = 100;
const ENEMY_HALF_SIZE = 0.5;
const DEFAULT_ENEMY_MAX_HP = 3;
const DEFAULT_ENEMY_SPEED = 2;
const FLAG_CARRY_HEIGHT = 1.0;
const FLAG_PICKUP_COOLDOWN = 0.25;

const ULTIMATE_MAX = 100;
const ULTIMATE_RATE = 5;
const ULTIMATE_PER_KILL = 25;

const CONTACT_DAMAGE = 8;
const CONTACT_COOLDOWN = 0.6;
const CONTACT_KNOCKBACK_X = 1.8;
const CONTACT_KNOCKBACK_Y = 2.2;

const HERO_COOLDOWNS = {
    Warrior: { q: 1, w: 4, e: 4, r: 0 },
    Assassin: { q: 3, w: 5, e: 8, r: 0 },
    Archer: { q: 1.2, w: 8, e: 6, r: 0 },
    Warlock: { q: 3, w: 5, e: 6, r: 0 },
    Cyborg: { q: 2, w: 4, e: 6, r: 0 }
};

const ARCHER_MAX_CHARGE = 1.5;
const ARCHER_POTION_DURATION = 3;
const ARCHER_POTION_HEAL_RATE = 4;
const ARCHER_SPEED_BOOST = 1.2;
const ARCHER_MACHINE_BOW_DURATION = 2;
const ARCHER_MACHINE_BOW_INTERVAL = 0.1;

const ASSASSIN_SLASH_INTERVAL = 0.15;
const ASSASSIN_SHADOW_WALK_DURATION = 5;
const ASSASSIN_POISON_DURATION = 3;
const ASSASSIN_POISON_TICK = 0.5;
const ASSASSIN_POISON_TIMER = 0.7;
const ASSASSIN_BLEED_DURATION = 3;
const ASSASSIN_BLEED_INTERVAL = 1;
const ASSASSIN_BLEED_TICKS = 3;

const WARRIOR_SLASH_INTERVAL = 0.19;
const WARRIOR_SLASH_HITS = 3;
const WARRIOR_WHIRLWIND_INTERVAL = 0.05;
const WARRIOR_WHIRLWIND_TICKS = 16;

const WARLOCK_LIGHTNING_DURATION = 0.3;
const WARLOCK_LIGHTNING_INTERVAL = 0.05;
const WARLOCK_LIGHTNING_DISTANCE = 4;
const WARLOCK_LIGHTNING_THICKNESS = 2;
const WARLOCK_FEAR_DURATION = 0.7;
const WARLOCK_HOVER_DURATION = 5;
const WARLOCK_HOVER_SPEED = 5;
const WARLOCK_CHAOS_DURATION = 3;
const WARLOCK_CHAOS_INTERVAL = 0.5;
const WARLOCK_CHAOS_RADIUS = 3.5;
const WARLOCK_CHAOS_BASE_HITS = 2;
const WARLOCK_CHAOS_LIFESTEAL = 0.35;

const CYBORG_FIREBALL_SPEED = 12;
const CYBORG_FIREBALL_MAX_DISTANCE = 12;
const CYBORG_FREEZE_DURATION = 1.5;
const CYBORG_FREEZE_DISTANCE = 3;
const CYBORG_FREEZE_THICKNESS = 1.5;
const CYBORG_BUBBLE_DURATION = 2;
const CYBORG_BUBBLE_BONUS = 0.3;
const CYBORG_BUBBLE_RADIUS = 3.5;
const CYBORG_KAME_CHARGE = 0.8;
const CYBORG_BEAM_LENGTH = 10;
const CYBORG_BEAM_SPEED = 12;
const CYBORG_BEAM_MAX_TRAVEL = 80;
const CYBORG_BEAM_THICKNESS = 0.7;

const DEFAULT_HERO = 'Warrior';

export function createWorld(levelData = null) {
    const resolvedLevel = levelData || buildTestLevelData();
    const flagBases = resolveFlagBases(resolvedLevel);
    return {
        tick: 0,
        players: new Map(),
        level: resolvedLevel,
        platforms: resolvedLevel.platforms || [],
        movingPlatforms: resolvedLevel.movingPlatforms || [],
        enemies: createEnemies(resolvedLevel.enemies || []),
        groundSurfaceY: resolvedLevel.groundSurfaceY ?? -3,
        ctf: {
            returnDelay: 10,
            returnRadius: 1.3,
            baseRadius: 1.8,
            bases: flagBases
        },
        flags: createFlags(flagBases),
        scores: { blue: 0, red: 0 },
        projectiles: [],
        aoeZones: [],
        nextProjectileId: 1,
        nextAoeId: 1
    };
}

function createEnemies(definitions) {
    if (!definitions || !definitions.length) return [];
    return definitions.map((def, index) => {
        const maxHp = Number.isFinite(def.maxHp) ? def.maxHp : DEFAULT_ENEMY_MAX_HP;
        return {
            id: def.id || `e${index + 1}`,
            type: def.type || 'goomba',
            isEnemy: true,
            team: def.team || '',
            x: Number.isFinite(def.x) ? def.x : 0,
            y: Number.isFinite(def.y) ? def.y : 0,
            vx: 0,
            vy: 0,
            dir: Number.isFinite(def.dir) ? def.dir : -1,
            speed: Number.isFinite(def.speed) ? def.speed : DEFAULT_ENEMY_SPEED,
            isAlive: true,
            maxHp,
            hp: maxHp,
            frozenTimer: 0,
            stunTimer: 0,
            poisonTimer: 0,
            bleedTimer: 0,
            bleedTicksRemaining: 0,
            bleedTickTimer: 0,
            enemyContactCooldown: 0,
            enemyContactCooldownDuration: CONTACT_COOLDOWN
        };
    });
}

export function ensurePlayer(world, id, options = null) {
    const fallbackY = typeof world.groundSurfaceY === 'number' ? world.groundSurfaceY + 0.5 : -2;
    if (world.players.has(id)) {
        const existing = world.players.get(id);
        if (options?.heroType || options?.hero || options?.class || options?.type) {
            applyHeroType(existing, options?.heroType || options?.hero || options?.class || options?.type);
        }
        let teamChanged = false;
        if (options?.team && options.team !== existing.team) {
            existing.team = options.team;
            teamChanged = true;
        }
        const hasSpawnOverride = !!(options?.spawn || (typeof options?.x === 'number' && typeof options?.y === 'number'));
        if (teamChanged || hasSpawnOverride || options?.forceSpawn) {
            const spawn = resolveSpawn(world, options, existing.team, fallbackY);
            existing.spawn = { x: spawn.x, y: spawn.y };
            if (options?.forceSpawn || teamChanged) {
                existing.x = spawn.x;
                existing.y = spawn.y;
                existing.vx = 0;
                existing.vy = 0;
                existing.grounded = true;
                existing.jumpsRemaining = PLAYER_JUMPS;
            }
        }
        return existing;
    }

    const team = options?.team || (id === 'p1' ? 'blue' : 'red');
    const spawn = resolveSpawn(world, options, team, fallbackY);
    const heroType = resolveHeroType(options?.heroType || options?.hero || options?.class || options?.type);
    const player = {
        id,
        team,
        heroType,
        world,
        spawn: { x: spawn.x, y: spawn.y },
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        grounded: true,
        jumpsRemaining: PLAYER_JUMPS,
        jumpHeld: false,
        lastInput: createDefaultInput(),
        isAlive: true,
        respawnTimer: 0,
        baseMaxHp: DEFAULT_MAX_HP,
        bonusHp: 0,
        bonusHpTimer: 0,
        maxHp: DEFAULT_MAX_HP,
        hp: DEFAULT_MAX_HP,
        ultimateCharge: 0,
        ultimateChargeMax: ULTIMATE_MAX,
        ultimateChargeRate: ULTIMATE_RATE,
        ultimateChargePerKill: ULTIMATE_PER_KILL,
        frozenTimer: 0,
        stunTimer: 0,
        poisonTimer: 0,
        bleedTimer: 0,
        bleedTicksRemaining: 0,
        bleedTickTimer: 0,
        fearTimer: 0,
        fearDirection: 0,
        mindControlTimer: 0,
        controlsInverted: false,
        controlsLocked: false,
        isCarryingFlag: false,
        flagCarryTeam: null,
        flagDropWasPressed: false,
        flagCarryBlocksAbility3: false,
        cooldowns: createCooldowns(heroType),
        lastAbilityInput: { q: false, w: false, e: false, r: false },
        facing: 1,
        enemyContactDamage: CONTACT_DAMAGE,
        enemyContactCooldownDuration: CONTACT_COOLDOWN,
        enemyContactCooldown: 0,
        enemyContactKnockbackX: CONTACT_KNOCKBACK_X,
        enemyContactKnockbackY: CONTACT_KNOCKBACK_Y,
        moveSpeedMultiplier: 1,
        warriorSlash: null,
        whirlwind: null,
        assassinSlash: null,
        isShadowWalking: false,
        shadowWalkTimer: 0,
        archerCharging: false,
        archerChargeTime: 0,
        machineBowActive: false,
        machineBowDuration: 0,
        machineBowShotTimer: 0,
        healOverTimeRemaining: 0,
        speedBoostRemaining: 0,
        lightning: null,
        chaosStorm: null,
        isHovering: false,
        hoverTimer: 0,
        bubbleShield: false,
        bubbleShieldTimer: 0,
        isChargingBeam: false,
        beamChargeTime: 0,
        kameChargeTimer: 0,
        beamAim: { x: 1, y: 0 },
        pendingProjectiles: []
    };

    world.players.set(id, player);
    return player;
}

export function stepWorld(world, inputsById, dt) {
    world.tick += 1;
    updateMovingPlatforms(world, dt);
    updateEnemies(world, dt);

    const playerInputs = [];
    for (const [id, player] of world.players.entries()) {
        const input = inputsById.get(id) || player.lastInput;
        if (input) {
            player.lastInput = input;
        }
        playerInputs.push({ player, input: player.lastInput });
    }

    for (const entry of playerInputs) {
        const { player, input } = entry;
        if (!player.isAlive) {
            player.respawnTimer = Math.max(0, player.respawnTimer - dt);
            if (player.respawnTimer <= 0) {
                respawnPlayer(player);
            }
            continue;
        }

        updateStatusEffects(player, dt);
        updateBonusHealth(player, dt);
        updateCooldowns(player, dt);
        updateUltimateCharge(player, dt);
        updateAbilityTimers(player, dt);
        updateFacing(player, input);

        handleAbilityInput(world, player, input, dt);
        applyMovement(player, input, dt);
        resolveCollisions(player, world.platforms);

        if (player.y <= DEATH_Y) {
            killPlayer(player);
        }
    }

    for (const entry of playerInputs) {
        updateAbilityEffects(world, entry.player, dt);
    }

    updateProjectiles(world, dt);
    updateAoeZones(world, dt);
    applyContactDamage(world);
    applyEnemyContactDamage(world);
    updateCTF(world, playerInputs, dt);
}

export function getSnapshot(world) {
    const players = [];
    world.players.forEach((player) => {
        players.push(serializePlayer(player));
    });

    return {
        tick: world.tick,
        players,
        enemies: serializeEnemies(world.enemies),
        projectiles: serializeProjectiles(world.projectiles),
        aoeZones: serializeAoeZones(world.aoeZones),
        movingPlatforms: serializeMovingPlatforms(world.movingPlatforms),
        flags: serializeFlags(world.flags),
        scores: {
            blue: world.scores?.blue ?? 0,
            red: world.scores?.red ?? 0
        }
    };
}

function resolveHeroType(value) {
    if (!value || typeof value !== 'string') return DEFAULT_HERO;
    const trimmed = value.trim();
    if (!trimmed) return DEFAULT_HERO;
    const direct = HERO_COOLDOWNS[trimmed];
    if (direct) return trimmed;
    const normalized = trimmed.toLowerCase();
    const match = Object.keys(HERO_COOLDOWNS).find((key) => key.toLowerCase() === normalized);
    return match || DEFAULT_HERO;
}

function applyHeroType(player, heroType) {
    const resolved = resolveHeroType(heroType);
    player.heroType = resolved;
    if (player.cooldowns) {
        player.cooldowns.durations = HERO_COOLDOWNS[resolved] || HERO_COOLDOWNS[DEFAULT_HERO];
        player.cooldowns.q = 0;
        player.cooldowns.w = 0;
        player.cooldowns.e = 0;
        player.cooldowns.r = 0;
    }
}

function createCooldowns(heroType) {
    const durations = HERO_COOLDOWNS[heroType] || HERO_COOLDOWNS[DEFAULT_HERO];
    return {
        q: 0,
        w: 0,
        e: 0,
        r: 0,
        durations
    };
}

function isCooldownReady(player, key) {
    return (player.cooldowns?.[key] || 0) <= 0;
}

function startCooldown(player, key) {
    const durations = player.cooldowns?.durations;
    const duration = durations ? durations[key] : 0;
    if (duration > 0) {
        player.cooldowns[key] = duration;
    }
}

function updateCooldowns(player, dt) {
    if (!player.cooldowns) return;
    ['q', 'w', 'e', 'r'].forEach((key) => {
        if (player.cooldowns[key] > 0) {
            player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt);
        }
    });
}

function updateUltimateCharge(player, dt) {
    if (player.ultimateCharge >= player.ultimateChargeMax) return;
    player.ultimateCharge = Math.min(
        player.ultimateChargeMax,
        player.ultimateCharge + player.ultimateChargeRate * dt
    );
}

function updateStatusEffects(player, dt) {
    if (player.frozenTimer > 0) {
        player.frozenTimer = Math.max(0, player.frozenTimer - dt);
    }
    if (player.stunTimer > 0) {
        player.stunTimer = Math.max(0, player.stunTimer - dt);
    }
    if (player.poisonTimer > 0) {
        player.poisonTimer = Math.max(0, player.poisonTimer - dt);
    }
    if (player.bleedTimer > 0) {
        player.bleedTimer = Math.max(0, player.bleedTimer - dt);
    }
    if (player.fearTimer > 0) {
        player.fearTimer = Math.max(0, player.fearTimer - dt);
        if (player.fearTimer <= 0) {
            player.fearDirection = 0;
        }
    }
    if (player.mindControlTimer > 0) {
        player.mindControlTimer = Math.max(0, player.mindControlTimer - dt);
    }

    if (player.bleedTicksRemaining > 0) {
        player.bleedTickTimer += dt;
        while (player.bleedTickTimer >= ASSASSIN_BLEED_INTERVAL && player.bleedTicksRemaining > 0) {
            player.bleedTickTimer -= ASSASSIN_BLEED_INTERVAL;
            player.bleedTicksRemaining -= 1;
            applyAbilityDamage(null, player, 1);
        }
    }

    player.controlsLocked = player.stunTimer > 0 || player.frozenTimer > 0;
    player.controlsInverted = player.mindControlTimer > 0;

    if (player.enemyContactCooldown > 0) {
        player.enemyContactCooldown = Math.max(0, player.enemyContactCooldown - dt);
    }
}

function updateBonusHealth(player, dt) {
    if (player.bonusHpTimer > 0) {
        player.bonusHpTimer = Math.max(0, player.bonusHpTimer - dt);
        if (player.bonusHpTimer === 0) {
            player.bonusHp = 0;
            player.maxHp = player.baseMaxHp;
            if (player.hp > player.maxHp) {
                player.hp = player.maxHp;
            }
        }
    }
}

function updateAbilityTimers(player, dt) {
    if (player.isShadowWalking) {
        player.shadowWalkTimer = Math.max(0, player.shadowWalkTimer - dt);
        if (player.shadowWalkTimer <= 0) {
            player.isShadowWalking = false;
        }
    }

    if (player.isHovering) {
        player.hoverTimer = Math.max(0, player.hoverTimer - dt);
        if (player.hoverTimer <= 0 || player.controlsLocked) {
            player.isHovering = false;
        }
    }

    if (player.bubbleShield) {
        player.bubbleShieldTimer = Math.max(0, player.bubbleShieldTimer - dt);
        if (player.bubbleShieldTimer <= 0) {
            player.bubbleShield = false;
        }
    }

    if (player.isChargingBeam) {
        player.beamChargeTime += dt;
        player.kameChargeTimer = Math.max(0, player.kameChargeTimer - dt);
        if (player.kameChargeTimer <= 0) {
            fireKameBeam(player);
        }
    }

    if (player.machineBowActive) {
        player.machineBowDuration = Math.max(0, player.machineBowDuration - dt);
        player.machineBowShotTimer = Math.max(0, player.machineBowShotTimer - dt);
        if (player.machineBowShotTimer <= 0) {
            player.machineBowShotTimer = ARCHER_MACHINE_BOW_INTERVAL;
            spawnArcherArrow(player, 1, false, true);
        }
        if (player.machineBowDuration <= 0) {
            player.machineBowActive = false;
        }
    }

    if (player.healOverTimeRemaining > 0) {
        const healAmount = ARCHER_POTION_HEAL_RATE * dt;
        healPlayer(player, healAmount);
        player.healOverTimeRemaining = Math.max(0, player.healOverTimeRemaining - dt);
    }

    if (player.speedBoostRemaining > 0) {
        player.speedBoostRemaining = Math.max(0, player.speedBoostRemaining - dt);
        player.moveSpeedMultiplier = ARCHER_SPEED_BOOST;
        if (player.speedBoostRemaining <= 0) {
            player.moveSpeedMultiplier = 1;
        }
    }
}

function updateFacing(player, input) {
    const aim = input?.aim;
    if (aim && Number.isFinite(aim.x) && Math.abs(aim.x) > 0.15) {
        player.facing = aim.x >= 0 ? 1 : -1;
        return;
    }
    if (input?.left) {
        player.facing = -1;
    } else if (input?.right) {
        player.facing = 1;
    }
}

function handleAbilityInput(world, player, input, dt) {
    const abilities = {
        q: !!input?.ability1,
        w: !!input?.ability2,
        e: !!input?.ability3,
        r: !!input?.ultimate
    };
    const prev = player.lastAbilityInput || { q: false, w: false, e: false, r: false };
    const justPressed = {
        q: abilities.q && !prev.q,
        w: abilities.w && !prev.w,
        e: abilities.e && !prev.e,
        r: abilities.r && !prev.r
    };
    player.lastAbilityInput = abilities;

    if (player.controlsLocked || player.isChargingBeam) {
        return;
    }

    if (player.heroType === 'Archer') {
        handleArcherCharge(player, abilities.q, dt);
        if (justPressed.w && isCooldownReady(player, 'w')) {
            startCooldown(player, 'w');
            player.healOverTimeRemaining = ARCHER_POTION_DURATION;
            player.speedBoostRemaining = ARCHER_POTION_DURATION;
        }
        if (justPressed.e && isCooldownReady(player, 'e')) {
            startCooldown(player, 'e');
            spawnArcherArrow(player, 0.6, true, false);
        }
        if (justPressed.r && isUltimateReady(player)) {
            player.ultimateCharge = 0;
            player.machineBowActive = true;
            player.machineBowDuration = ARCHER_MACHINE_BOW_DURATION;
            player.machineBowShotTimer = 0;
        }
        return;
    }

    if (player.isCarryingFlag && player.flagCarryBlocksAbility3 && justPressed.e) {
        return;
    }

    switch (player.heroType) {
        case 'Warrior':
            if (justPressed.q && isCooldownReady(player, 'q')) {
                startCooldown(player, 'q');
                player.warriorSlash = {
                    hitsRemaining: WARRIOR_SLASH_HITS,
                    timer: 0
                };
                applyWarriorSlash(player);
                player.warriorSlash.hitsRemaining -= 1;
                player.warriorSlash.timer = WARRIOR_SLASH_INTERVAL;
            }
            if (justPressed.w && isCooldownReady(player, 'w')) {
                startCooldown(player, 'w');
                applyWarriorShieldBash(player);
            }
            if (justPressed.e && isCooldownReady(player, 'e')) {
                startCooldown(player, 'e');
                applyWarriorDash(player);
            }
            if (justPressed.r && isUltimateReady(player)) {
                player.ultimateCharge = 0;
                player.whirlwind = {
                    ticksRemaining: WARRIOR_WHIRLWIND_TICKS,
                    timer: 0
                };
                applyWarriorWhirlwind(player);
                player.whirlwind.ticksRemaining -= 1;
                player.whirlwind.timer = WARRIOR_WHIRLWIND_INTERVAL;
            }
            break;
        case 'Assassin':
            if (justPressed.q && isCooldownReady(player, 'q')) {
                player.isShadowWalking = false;
                player.shadowWalkTimer = 0;
                startCooldown(player, 'q');
                player.assassinSlash = {
                    hitsRemaining: 3,
                    timer: 0
                };
                applyAssassinSlash(player);
                player.assassinSlash.hitsRemaining -= 1;
                player.assassinSlash.timer = ASSASSIN_SLASH_INTERVAL;
            }
            if (justPressed.w && isCooldownReady(player, 'w')) {
                player.isShadowWalking = false;
                player.shadowWalkTimer = 0;
                startCooldown(player, 'w');
                spawnPoisonBomb(world, player);
            }
            if (justPressed.e && isCooldownReady(player, 'e')) {
                startCooldown(player, 'e');
                player.isShadowWalking = true;
                player.shadowWalkTimer = ASSASSIN_SHADOW_WALK_DURATION;
            }
            if (justPressed.r && isUltimateReady(player)) {
                player.isShadowWalking = false;
                player.shadowWalkTimer = 0;
                player.ultimateCharge = 0;
                applyAssassinate(player, world);
            }
            break;
        case 'Warlock':
            if (justPressed.q && isCooldownReady(player, 'q')) {
                player.isHovering = false;
                player.hoverTimer = 0;
                startCooldown(player, 'q');
                player.lightning = {
                    elapsed: 0,
                    timer: 0,
                    direction: getAimDirection(player, input)
                };
                applyWarlockLightning(player);
            }
            if (justPressed.w && isCooldownReady(player, 'w')) {
                player.isHovering = false;
                player.hoverTimer = 0;
                startCooldown(player, 'w');
                applyWarlockFear(player, world);
            }
            if (justPressed.e && isCooldownReady(player, 'e')) {
                startCooldown(player, 'e');
                player.isHovering = true;
                player.hoverTimer = WARLOCK_HOVER_DURATION;
            }
            if (justPressed.r && isUltimateReady(player) && !player.chaosStorm) {
                player.isHovering = false;
                player.hoverTimer = 0;
                player.ultimateCharge = 0;
                player.chaosStorm = {
                    elapsed: 0,
                    timer: 0
                };
                applyWarlockChaos(player, world);
            }
            break;
        case 'Cyborg':
            if (justPressed.q && isCooldownReady(player, 'q')) {
                startCooldown(player, 'q');
                spawnFireball(world, player);
            }
            if (justPressed.w && isCooldownReady(player, 'w')) {
                startCooldown(player, 'w');
                applyFreezeBlast(player, world);
            }
            if (justPressed.e && isCooldownReady(player, 'e')) {
                startCooldown(player, 'e');
                applyBubbleShield(world, player);
            }
            if (justPressed.r && isUltimateReady(player) && !player.isChargingBeam) {
                player.beamAim = getAimDirection(player, input);
                player.beamChargeTime = 0;
                player.kameChargeTimer = CYBORG_KAME_CHARGE;
                player.isChargingBeam = true;
            }
            break;
        default:
            break;
    }
}

function handleArcherCharge(player, isPressed, dt) {
    if (player.machineBowActive) {
        player.archerCharging = false;
        player.archerChargeTime = 0;
        return;
    }

    if (isPressed && isCooldownReady(player, 'q') && !player.archerCharging) {
        player.archerCharging = true;
        player.archerChargeTime = 0;
    }

    if (player.archerCharging) {
        if (isPressed) {
            player.archerChargeTime = Math.min(player.archerChargeTime + dt, ARCHER_MAX_CHARGE);
        } else {
            const chargeRatio = Math.min(1, player.archerChargeTime / ARCHER_MAX_CHARGE);
            if (isCooldownReady(player, 'q')) {
                startCooldown(player, 'q');
                spawnArcherArrow(player, chargeRatio, false, false);
            }
            player.archerCharging = false;
            player.archerChargeTime = 0;
        }
    }
}

function isUltimateReady(player) {
    return player.ultimateCharge >= player.ultimateChargeMax;
}

function applyMovement(player, input, dt) {
    if (player.isChargingBeam) {
        player.vx = 0;
        player.vy = 0;
        return;
    }

    const controlsLocked = player.controlsLocked;
    let leftPressed = !!input?.left;
    let rightPressed = !!input?.right;
    if (player.controlsInverted) {
        const swap = leftPressed;
        leftPressed = rightPressed;
        rightPressed = swap;
    }

    let speed = PLAYER_SPEED * (player.moveSpeedMultiplier || 1);
    if (player.isHovering) {
        speed = WARLOCK_HOVER_SPEED;
    }

    if (!controlsLocked) {
        if (player.fearTimer > 0 && player.fearDirection) {
            player.vx = speed * player.fearDirection;
        } else {
            player.vx = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0);
            player.vx *= speed;
        }
    } else {
        player.vx = 0;
    }

    const jumpPressed = !!input?.jump;
    if (!controlsLocked && !player.isHovering && jumpPressed && !player.jumpHeld && player.jumpsRemaining > 0) {
        player.vy = JUMP_VELOCITY;
        player.jumpsRemaining -= 1;
        player.grounded = false;
    }
    player.jumpHeld = controlsLocked || player.isHovering ? false : jumpPressed;

    if (player.isHovering) {
        player.vy = 0;
    } else {
        player.grounded = false;
        player.vy += GRAVITY * dt;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;
}

function updateAbilityEffects(world, player, dt) {
    if (!player.isAlive) return;

    if (player.warriorSlash) {
        player.warriorSlash.timer -= dt;
        while (player.warriorSlash.hitsRemaining > 0 && player.warriorSlash.timer <= 0) {
            applyWarriorSlash(player);
            player.warriorSlash.hitsRemaining -= 1;
            player.warriorSlash.timer += WARRIOR_SLASH_INTERVAL;
        }
        if (player.warriorSlash.hitsRemaining <= 0) {
            player.warriorSlash = null;
        }
    }

    if (player.assassinSlash) {
        player.assassinSlash.timer -= dt;
        while (player.assassinSlash.hitsRemaining > 0 && player.assassinSlash.timer <= 0) {
            applyAssassinSlash(player);
            player.assassinSlash.hitsRemaining -= 1;
            player.assassinSlash.timer += ASSASSIN_SLASH_INTERVAL;
        }
        if (player.assassinSlash.hitsRemaining <= 0) {
            player.assassinSlash = null;
        }
    }

    if (player.whirlwind) {
        player.whirlwind.timer -= dt;
        while (player.whirlwind.ticksRemaining > 0 && player.whirlwind.timer <= 0) {
            applyWarriorWhirlwind(player);
            player.whirlwind.ticksRemaining -= 1;
            player.whirlwind.timer += WARRIOR_WHIRLWIND_INTERVAL;
        }
        if (player.whirlwind.ticksRemaining <= 0) {
            player.whirlwind = null;
        }
    }

    if (player.lightning) {
        player.lightning.timer += dt;
        while (player.lightning.timer >= WARLOCK_LIGHTNING_INTERVAL) {
            player.lightning.timer -= WARLOCK_LIGHTNING_INTERVAL;
            player.lightning.elapsed += WARLOCK_LIGHTNING_INTERVAL;
            applyWarlockLightning(player);
        }
        if (player.lightning.elapsed >= WARLOCK_LIGHTNING_DURATION) {
            player.lightning = null;
        }
    }

    if (player.chaosStorm) {
        player.chaosStorm.elapsed += dt;
        player.chaosStorm.timer += dt;
        while (player.chaosStorm.timer >= WARLOCK_CHAOS_INTERVAL) {
            player.chaosStorm.timer -= WARLOCK_CHAOS_INTERVAL;
            applyWarlockChaos(player, world);
        }
        if (player.chaosStorm.elapsed >= WARLOCK_CHAOS_DURATION) {
            player.chaosStorm = null;
        }
    }
}

function applyWarriorSlash(player) {
    const range = 2.5;
    const height = 1.5;
    const bounds = {
        left: player.x + (player.facing > 0 ? -0.3 : -range),
        right: player.x + (player.facing > 0 ? range : 0.3),
        top: player.y + height,
        bottom: player.y - height
    };
    damagePlayersInArea(player, bounds, 1);
}

function applyWarriorShieldBash(player) {
    const range = 2.3;
    const bounds = {
        left: player.x - range,
        right: player.x + range,
        top: player.y + 1,
        bottom: player.y - 1
    };
    damagePlayersInArea(player, bounds, 1);
}

function applyWarriorDash(player) {
    const dashDistance = 3.2;
    const startX = player.x;
    const endX = startX + player.facing * dashDistance;
    player.x = endX;

    const bounds = {
        left: Math.min(startX, endX) - 0.6,
        right: Math.max(startX, endX) + 0.6,
        top: player.y + 0.9,
        bottom: player.y - 0.9
    };

    const targets = findPlayersInArea(player, bounds);
    targets.forEach((target) => {
        const damage = applyAbilityDamage(player, target, 1);
        if (damage > 0) {
            target.stunTimer = Math.max(target.stunTimer, 0.6);
        }
    });
}

function applyWarriorWhirlwind(player) {
    const range = 2.5 * 1.35;
    const bounds = {
        left: player.x - range,
        right: player.x + range,
        top: player.y + range,
        bottom: player.y - range
    };
    damagePlayersInArea(player, bounds, 1);
}

function applyAssassinSlash(player) {
    const leftBounds = {
        left: player.x - 1.5,
        right: player.x - 0.2,
        top: player.y + 1.2,
        bottom: player.y - 1.2
    };
    const rightBounds = {
        left: player.x + 0.2,
        right: player.x + 1.5,
        top: player.y + 1.2,
        bottom: player.y - 1.2
    };
    applyBleedOnTargets(player, leftBounds);
    applyBleedOnTargets(player, rightBounds);
}

function applyAssassinate(player, world) {
    let closest = null;
    let closestDistance = Infinity;
    world.players.forEach((target) => {
        if (target === player || !target.isAlive) return;
        if (target.team && player.team && target.team === player.team) return;
        const distance = Math.abs(target.x - player.x);
        if (distance < closestDistance && distance < 15) {
            closestDistance = distance;
            closest = target;
        }
    });
    if (!closest) return;
    player.x = closest.x - player.facing;
    player.y = closest.y;
    applyAbilityDamage(player, closest, 3);
}

function applyWarlockLightning(player) {
    if (!player.lightning) return;
    const direction = player.lightning.direction || { x: player.facing, y: 0 };
    const startX = player.x;
    const startY = player.y;
    const endX = startX + direction.x * WARLOCK_LIGHTNING_DISTANCE;
    const endY = startY + direction.y * WARLOCK_LIGHTNING_DISTANCE;
    const bounds = {
        left: Math.min(startX, endX) - WARLOCK_LIGHTNING_THICKNESS,
        right: Math.max(startX, endX) + WARLOCK_LIGHTNING_THICKNESS,
        top: Math.max(startY, endY) + WARLOCK_LIGHTNING_THICKNESS,
        bottom: Math.min(startY, endY) - WARLOCK_LIGHTNING_THICKNESS
    };
    damagePlayersInArea(player, bounds, 1);
}

function applyWarlockFear(player, world) {
    const bounds = {
        left: player.x - 3,
        right: player.x + 3,
        top: player.y + 3,
        bottom: player.y - 3
    };
    const targets = findPlayersInArea(player, bounds);
    targets.forEach((target) => {
        target.fearTimer = Math.max(target.fearTimer, WARLOCK_FEAR_DURATION);
        target.fearDirection = target.x >= player.x ? 1 : -1;
    });
}

function applyWarlockChaos(player, world) {
    const bounds = {
        left: player.x - WARLOCK_CHAOS_RADIUS,
        right: player.x + WARLOCK_CHAOS_RADIUS,
        top: player.y + WARLOCK_CHAOS_RADIUS,
        bottom: player.y - WARLOCK_CHAOS_RADIUS
    };
    const targets = findPlayersInArea(player, bounds);
    targets.forEach((target) => {
        const damage = applyAbilityDamage(player, target, WARLOCK_CHAOS_BASE_HITS);
        if (damage > 0) {
            healPlayer(player, damage * WARLOCK_CHAOS_LIFESTEAL);
        }
    });
}

function applyFreezeBlast(player, world) {
    const direction = getAimDirection(player, player.lastInput);
    const startX = player.x;
    const startY = player.y;
    const endX = startX + direction.x * CYBORG_FREEZE_DISTANCE;
    const endY = startY + direction.y * CYBORG_FREEZE_DISTANCE;
    const bounds = {
        left: Math.min(startX, endX) - CYBORG_FREEZE_THICKNESS,
        right: Math.max(startX, endX) + CYBORG_FREEZE_THICKNESS,
        top: Math.max(startY, endY) + CYBORG_FREEZE_THICKNESS,
        bottom: Math.min(startY, endY) - CYBORG_FREEZE_THICKNESS
    };
    const targets = findPlayersInArea(player, bounds);
    targets.forEach((target) => {
        const damage = applyAbilityDamage(player, target, 1);
        if (damage > 0) {
            target.frozenTimer = Math.max(target.frozenTimer, CYBORG_FREEZE_DURATION);
        }
    });
}

function applyBubbleShield(world, player) {
    player.bubbleShield = true;
    player.bubbleShieldTimer = CYBORG_BUBBLE_DURATION;

    world.players.forEach((target) => {
        if (!target.isAlive) return;
        if (target.team && player.team && target.team !== player.team) return;
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (target === player || distance <= CYBORG_BUBBLE_RADIUS) {
            applyHealthBonus(target, CYBORG_BUBBLE_BONUS, CYBORG_BUBBLE_DURATION);
        }
    });
}

function fireKameBeam(player) {
    player.isChargingBeam = false;
    const damage = Math.max(1, Math.floor(player.beamChargeTime * 2));
    player.beamChargeTime = 0;
    spawnBeam(player, damage);
    player.ultimateCharge = 0;
}

function spawnBeam(player, damage) {
    const direction = player.beamAim || { x: player.facing, y: 0 };
    const normalized = normalizeVector(direction);
    const beamPos = {
        x: player.x + normalized.x * 5,
        y: player.y + normalized.y * 5
    };
    player.pendingProjectiles.push({
        id: `beam-${player.id}-${Date.now()}`,
        type: 'beam',
        ownerId: player.id,
        team: player.team,
        x: beamPos.x,
        y: beamPos.y,
        vx: normalized.x * CYBORG_BEAM_SPEED,
        vy: normalized.y * CYBORG_BEAM_SPEED,
        direction: normalized,
        length: CYBORG_BEAM_LENGTH,
        thickness: CYBORG_BEAM_THICKNESS,
        maxTravel: CYBORG_BEAM_MAX_TRAVEL,
        traveled: 0,
        damageHits: damage,
        hitTargets: new Set()
    });
}

function spawnFireball(world, player) {
    const direction = getAimDirection(player, player.lastInput);
    const origin = { x: player.x, y: player.y };
    world.projectiles.push({
        id: world.nextProjectileId++,
        type: 'fireball',
        ownerId: player.id,
        team: player.team,
        x: player.x + direction.x * 0.5,
        y: player.y + direction.y * 0.5,
        vx: direction.x * CYBORG_FIREBALL_SPEED,
        vy: direction.y * CYBORG_FIREBALL_SPEED,
        origin,
        radius: 0.28,
        damageHits: 2,
        maxDistance: CYBORG_FIREBALL_MAX_DISTANCE,
        hitTargets: new Set()
    });
}

function spawnArcherArrow(player, chargeRatio, teleportOnHit, piercing) {
    const direction = getAimDirection(player, player.lastInput);
    const baseSpeed = 14;
    const speed = baseSpeed + chargeRatio * 10;
    const damageHits = 1 + Math.round(chargeRatio * 2);
    const useAim = Math.abs(direction.y) > 0.01;
    const velocityY = useAim ? direction.y * speed : 3.5 + chargeRatio * 2.2;
    const velocityX = direction.x * speed;
    player.pendingProjectiles.push({
        id: `arrow-${player.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'arrow',
        ownerId: player.id,
        team: player.team,
        x: player.x + direction.x * 0.6,
        y: player.y + 0.1 + direction.y * 0.6,
        vx: velocityX,
        vy: velocityY,
        gravity: -14,
        radius: 0.25,
        teleportOnHit,
        piercing,
        damageHits,
        hitTargets: new Set(),
        lifetime: 4
    });
}

function spawnPoisonBomb(world, player) {
    const direction = getAimDirection(player, player.lastInput);
    world.projectiles.push({
        id: world.nextProjectileId++,
        type: 'poisonBomb',
        ownerId: player.id,
        team: player.team,
        x: player.x + direction.x * 0.5,
        y: player.y + direction.y * 0.5,
        vx: direction.x * 8,
        vy: Math.abs(direction.y) > 0.01 ? direction.y * 8 : 5,
        gravity: -20,
        radius: 0.15,
        origin: { x: player.x, y: player.y },
        damageHits: 0
    });
}

function updateProjectiles(world, dt) {
    const next = [];
    for (const projectile of world.projectiles) {
        if (projectile.type === 'beam') {
            updateBeamProjectile(world, projectile, dt);
            if (projectile.traveled < projectile.maxTravel) {
                next.push(projectile);
            }
            continue;
        }

        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        if (projectile.gravity) {
            projectile.vy += projectile.gravity * dt;
        }
        if (projectile.lifetime !== undefined) {
            projectile.lifetime -= dt;
            if (projectile.lifetime <= 0) {
                continue;
            }
        }

        const bounds = getCircleBounds(projectile.x, projectile.y, projectile.radius || 0.2);
        const hitTarget = applyProjectileDamage(world, projectile, bounds);
        if (hitTarget && !projectile.piercing) {
            if (projectile.teleportOnHit) {
                teleportOwner(world, projectile);
            }
            continue;
        }

        const hitPlatform = checkPlatformCollision(bounds, world.platforms);
        if (hitPlatform) {
            if (projectile.type === 'poisonBomb') {
                spawnPoisonCloud(world, projectile.x, projectile.y, projectile.ownerId, projectile.team);
            } else if (projectile.teleportOnHit) {
                teleportOwner(world, projectile);
            }
            continue;
        }

        if (projectile.type === 'fireball') {
            const traveled = Math.hypot(projectile.x - projectile.origin.x, projectile.y - projectile.origin.y);
            if (traveled > projectile.maxDistance) {
                continue;
            }
        }

        if (projectile.type === 'poisonBomb') {
            const traveled = Math.abs(projectile.x - projectile.origin.x);
            if (traveled > 10) {
                spawnPoisonCloud(world, projectile.x, projectile.y, projectile.ownerId, projectile.team);
                continue;
            }
        }

        next.push(projectile);
    }

    world.projectiles = next;

    world.players.forEach((player) => {
        if (player.pendingProjectiles && player.pendingProjectiles.length) {
            player.pendingProjectiles.forEach((projectile) => {
                world.projectiles.push(projectile);
            });
            player.pendingProjectiles.length = 0;
        }
    });
}

function forEachDamageableTarget(world, callback) {
    if (!world) return;
    world.players.forEach((player) => {
        callback(player);
    });
    if (world.enemies && world.enemies.length) {
        world.enemies.forEach((enemy) => {
            callback(enemy);
        });
    }
}

function updateBeamProjectile(world, projectile, dt) {
    const step = Math.hypot(projectile.vx, projectile.vy) * dt;
    projectile.traveled += step;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    const halfLength = projectile.length * 0.5;
    const startX = projectile.x - projectile.direction.x * halfLength;
    const startY = projectile.y - projectile.direction.y * halfLength;
    const endX = projectile.x + projectile.direction.x * halfLength;
    const endY = projectile.y + projectile.direction.y * halfLength;
    const bounds = {
        left: Math.min(startX, endX) - projectile.thickness,
        right: Math.max(startX, endX) + projectile.thickness,
        top: Math.max(startY, endY) + projectile.thickness,
        bottom: Math.min(startY, endY) - projectile.thickness
    };

    forEachDamageableTarget(world, (target) => {
        if (!target.isAlive) return;
        if (target.id === projectile.ownerId) return;
        if (!target.isEnemy && target.team && projectile.team && target.team === projectile.team) return;
        if (projectile.hitTargets.has(target.id)) return;
        const targetBounds = target.isEnemy ? getEnemyBounds(target) : getPlayerBounds(target);
        if (!checkAABB(targetBounds, bounds)) return;
        projectile.hitTargets.add(target.id);
        applyAbilityDamage(getPlayerById(world, projectile.ownerId), target, projectile.damageHits);
    });
}

function updateAoeZones(world, dt) {
    const next = [];
    for (const zone of world.aoeZones) {
        zone.duration -= dt;
        zone.timer += dt;
        while (zone.timer >= zone.interval) {
            zone.timer -= zone.interval;
            const bounds = {
                left: zone.x - zone.radiusX,
                right: zone.x + zone.radiusX,
                top: zone.y + zone.radiusY,
                bottom: zone.y - zone.radiusY
            };
            forEachDamageableTarget(world, (target) => {
                if (!target.isAlive) return;
                if (!target.isEnemy && zone.team && target.team === zone.team) return;
                const targetBounds = target.isEnemy ? getEnemyBounds(target) : getPlayerBounds(target);
                if (checkAABB(targetBounds, bounds)) {
                    const damage = applyAbilityDamage(getPlayerById(world, zone.ownerId), target, 1);
                    if (!target.isEnemy && damage > 0) {
                        target.poisonTimer = Math.max(target.poisonTimer, ASSASSIN_POISON_TIMER);
                    }
                }
            });
        }
        if (zone.duration > 0) {
            next.push(zone);
        }
    }
    world.aoeZones = next;
}

function applyProjectileDamage(world, projectile, bounds) {
    let hit = false;
    const damageHits = projectile.damageHits || 0;
    if (damageHits <= 0) {
        return false;
    }
    forEachDamageableTarget(world, (target) => {
        if (!target.isAlive) return;
        if (target.id === projectile.ownerId) return;
        if (!target.isEnemy && projectile.team && target.team && projectile.team === target.team) return;
        if (projectile.hitTargets && projectile.hitTargets.has(target.id)) return;
        const targetBounds = target.isEnemy ? getEnemyBounds(target) : getPlayerBounds(target);
        if (!checkAABB(targetBounds, bounds)) return;
        if (projectile.hitTargets) {
            projectile.hitTargets.add(target.id);
        }
        applyAbilityDamage(getPlayerById(world, projectile.ownerId), target, damageHits);
        hit = true;
    });
    return hit;
}

function spawnPoisonCloud(world, x, y, ownerId, team) {
    world.aoeZones.push({
        id: world.nextAoeId++,
        type: 'poison',
        x,
        y,
        duration: ASSASSIN_POISON_DURATION,
        interval: ASSASSIN_POISON_TICK,
        timer: 0,
        radiusX: 1.6,
        radiusY: 1.2,
        ownerId: ownerId || null,
        team: team || null
    });
}

function teleportOwner(world, projectile) {
    const owner = getPlayerById(world, projectile.ownerId);
    if (!owner || !owner.isAlive) return;
    owner.x = projectile.x;
    owner.y = projectile.y;
    owner.vx = 0;
    owner.vy = 0;
}

function applyContactDamage(world) {
    const players = Array.from(world.players.values());
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const a = players[i];
            const b = players[j];
            if (!a.isAlive || !b.isAlive) continue;
            if (a.team && b.team && a.team === b.team) continue;
            if (!checkAABB(getPlayerBounds(a), getPlayerBounds(b))) continue;
            if (a.enemyContactCooldown <= 0) {
                applyContactDamageTo(a, b);
            }
            if (b.enemyContactCooldown <= 0) {
                applyContactDamageTo(b, a);
            }
        }
    }
}

function applyEnemyContactDamage(world) {
    if (!world.enemies || !world.enemies.length) return;
    world.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        world.players.forEach((player) => {
            if (!player.isAlive) return;
            if (!checkAABB(getPlayerBounds(player), getEnemyBounds(enemy))) return;
            if (player.enemyContactCooldown <= 0) {
                applyContactDamageTo(player, enemy);
            }
        });
    });
}

function applyContactDamageTo(player, enemy) {
    if (!player.isAlive) return;
    if (player.isShadowWalking || player.bubbleShield) return;
    if (player.enemyContactCooldown > 0) return;
    if (player.enemyContactDamage > 0) {
        applyDamageAmount(player, player.enemyContactDamage);
    }
    const knockDir = player.x < enemy.x ? -1 : 1;
    player.vx = (player.enemyContactKnockbackX || 0) * knockDir;
    player.vy = Math.max(player.vy, player.enemyContactKnockbackY || 0);
    player.grounded = false;
    player.enemyContactCooldown = player.enemyContactCooldownDuration || 0;
}

function applyBleedOnTargets(player, bounds) {
    const targets = findPlayersInArea(player, bounds);
    targets.forEach((target) => {
        const damage = applyAbilityDamage(player, target, 1);
        if (damage > 0) {
            target.bleedTimer = Math.max(target.bleedTimer, ASSASSIN_BLEED_DURATION);
            target.bleedTicksRemaining = Math.max(target.bleedTicksRemaining, ASSASSIN_BLEED_TICKS);
            target.bleedTickTimer = 0;
        }
    });
}

function damagePlayersInArea(player, bounds, baseHits) {
    const targets = findPlayersInArea(player, bounds);
    targets.forEach((target) => {
        applyAbilityDamage(player, target, baseHits);
    });
}

function findPlayersInArea(source, bounds) {
    const results = [];
    if (!source || !source.world) {
        return results;
    }
    const world = source.world;
    world.players.forEach((player) => {
        if (!player.isAlive) return;
        if (player === source) return;
        if (player.team && source.team && player.team === source.team) return;
        if (!checkAABB(getPlayerBounds(player), bounds)) return;
        results.push(player);
    });
    if (world.enemies && world.enemies.length) {
        world.enemies.forEach((enemy) => {
            if (!enemy.isAlive) return;
            if (!checkAABB(getEnemyBounds(enemy), bounds)) return;
            results.push(enemy);
        });
    }
    return results;
}

function applyAbilityDamage(source, target, baseHits) {
    if (!target || !target.isAlive) return 0;
    if (target.isShadowWalking || target.bubbleShield) return 0;
    const hits = Math.max(1, Math.round(baseHits || 1));
    const maxHealth = Number.isFinite(target.maxHp) ? target.maxHp : DEFAULT_MAX_HP;
    const damagePerHit = Math.max(1, Math.round(maxHealth * 0.1));
    const damage = hits * damagePerHit;
    applyDamageAmount(target, damage);
    return damage;
}

function applyDamageAmount(target, amount) {
    if (!target || !target.isAlive) return;
    if (target.isShadowWalking || target.bubbleShield) return;
    const damage = Math.max(0, amount || 0);
    if (damage <= 0) return;
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) {
        if (target.isEnemy) {
            killEnemy(target);
        } else {
            killPlayer(target);
        }
    }
}

function healPlayer(target, amount) {
    if (!target || !target.isAlive) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    const maxHealth = target.maxHp || DEFAULT_MAX_HP;
    target.hp = Math.min(maxHealth, target.hp + amount);
}

function applyHealthBonus(target, percent, durationSeconds) {
    const bonusAmount = Math.round(target.baseMaxHp * percent);
    if (!Number.isFinite(bonusAmount) || bonusAmount <= 0) return;
    const previousBonus = target.bonusHp;
    const nextBonus = Math.max(previousBonus, bonusAmount);
    const bonusDelta = nextBonus - previousBonus;
    target.bonusHp = nextBonus;
    target.bonusHpTimer = Math.max(target.bonusHpTimer, durationSeconds);
    target.maxHp = target.baseMaxHp + target.bonusHp;
    if (bonusDelta > 0) {
        target.hp = Math.min(target.hp + bonusDelta, target.maxHp);
    }
}

function getAimDirection(player, input) {
    const aim = input?.aim;
    if (aim && Number.isFinite(aim.x) && Number.isFinite(aim.y)) {
        const normalized = normalizeVector(aim);
        if (Math.hypot(normalized.x, normalized.y) > 0.001) {
            return normalized;
        }
    }
    return { x: player.facing || 1, y: 0 };
}

function normalizeVector(vec) {
    const length = Math.hypot(vec.x, vec.y);
    if (!Number.isFinite(length) || length <= 0.0001) {
        return { x: 1, y: 0 };
    }
    return { x: vec.x / length, y: vec.y / length };
}

function getPlayerById(world, id) {
    if (!id) return null;
    return world.players.get(id) || null;
}

function resolveFlagBases(levelData) {
    const spawns = levelData?.flagSpawns || {
        blue: { x: -60, y: 3 },
        red: { x: 60, y: 3 }
    };
    return {
        blue: { x: spawns.blue.x, y: spawns.blue.y },
        red: { x: spawns.red.x, y: spawns.red.y }
    };
}

function createFlags(flagBases) {
    return {
        blue: createFlag('blue', flagBases.blue),
        red: createFlag('red', flagBases.red)
    };
}

function createFlag(team, base) {
    return {
        team,
        base: { x: base.x, y: base.y },
        x: base.x,
        y: base.y,
        carrierId: null,
        isAtBase: true,
        dropped: false,
        returnTimer: 0,
        pickupCooldown: 0,
        lastCarrierPosition: { x: base.x, y: base.y }
    };
}

function resolveSpawn(world, options, team, fallbackY) {
    if (options) {
        if (options.spawn) {
            return options.spawn;
        }
        if (typeof options.x === 'number' && typeof options.y === 'number') {
            return { x: options.x, y: options.y };
        }
    }
    if (world.ctf?.bases && world.ctf.bases[team]) {
        return world.ctf.bases[team];
    }
    return { x: 0, y: fallbackY };
}

function createDefaultInput() {
    return {
        left: false,
        right: false,
        jump: false,
        ability1: false,
        ability2: false,
        ability3: false,
        ultimate: false,
        flagDrop: false,
        aim: null
    };
}

function respawnPlayer(player) {
    player.isAlive = true;
    player.respawnTimer = 0;
    player.x = player.spawn.x;
    player.y = player.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.jumpsRemaining = PLAYER_JUMPS;
    player.jumpHeld = false;
    player.bonusHp = 0;
    player.bonusHpTimer = 0;
    player.maxHp = player.baseMaxHp;
    player.hp = player.maxHp;
    player.isCarryingFlag = false;
    player.flagCarryTeam = null;
    player.flagDropWasPressed = false;
    player.frozenTimer = 0;
    player.stunTimer = 0;
    player.poisonTimer = 0;
    player.bleedTimer = 0;
    player.bleedTicksRemaining = 0;
    player.fearTimer = 0;
    player.fearDirection = 0;
    player.mindControlTimer = 0;
    player.controlsLocked = false;
    player.controlsInverted = false;
    player.warriorSlash = null;
    player.assassinSlash = null;
    player.whirlwind = null;
    player.lightning = null;
    player.chaosStorm = null;
    player.isShadowWalking = false;
    player.shadowWalkTimer = 0;
    player.archerCharging = false;
    player.archerChargeTime = 0;
    player.machineBowActive = false;
    player.machineBowDuration = 0;
    player.machineBowShotTimer = 0;
    player.healOverTimeRemaining = 0;
    player.speedBoostRemaining = 0;
    player.moveSpeedMultiplier = 1;
    player.isHovering = false;
    player.hoverTimer = 0;
    player.bubbleShield = false;
    player.bubbleShieldTimer = 0;
    player.isChargingBeam = false;
    player.beamChargeTime = 0;
    player.kameChargeTimer = 0;
    if (player.cooldowns) {
        player.cooldowns.q = 0;
        player.cooldowns.w = 0;
        player.cooldowns.e = 0;
        player.cooldowns.r = 0;
    }
    if (player.pendingProjectiles) {
        player.pendingProjectiles.length = 0;
    }
}

function killPlayer(player) {
    if (!player.isAlive) return;
    player.isAlive = false;
    player.respawnTimer = RESPAWN_TIME;
    player.hp = 0;
    player.vx = 0;
    player.vy = 0;
}

function killEnemy(enemy) {
    if (!enemy || !enemy.isAlive) return;
    enemy.isAlive = false;
    enemy.hp = 0;
    enemy.vx = 0;
    enemy.vy = 0;
}

function serializePlayer(player) {
    const abilities = {};
    ['q', 'w', 'e', 'r'].forEach((key) => {
        abilities[key] = {
            cooldown: round3(player.cooldowns?.[key] || 0),
            ready: player.cooldowns?.[key] ? 0 : 1
        };
    });

    return {
        id: player.id,
        heroType: player.heroType || '',
        team: player.team || '',
        x: round3(player.x),
        y: round3(player.y),
        vx: round3(player.vx),
        vy: round3(player.vy),
        hp: round3(player.hp),
        maxHp: round3(player.maxHp),
        bonusHp: round3(player.bonusHp),
        alive: player.isAlive ? 1 : 0,
        grounded: player.grounded ? 1 : 0,
        jumps: player.jumpsRemaining,
        jumpHeld: player.jumpHeld ? 1 : 0,
        respawnTimer: round3(player.respawnTimer),
        ultimate: round3(player.ultimateCharge || 0),
        frozenTimer: round3(player.frozenTimer || 0),
        stunTimer: round3(player.stunTimer || 0),
        poisonTimer: round3(player.poisonTimer || 0),
        bleedTimer: round3(player.bleedTimer || 0),
        fearTimer: round3(player.fearTimer || 0),
        fearDirection: round3(player.fearDirection || 0),
        mindControlTimer: round3(player.mindControlTimer || 0),
        controlsInverted: player.controlsInverted ? 1 : 0,
        controlsLocked: player.controlsLocked ? 1 : 0,
        carryingFlag: player.isCarryingFlag ? 1 : 0,
        flagTeam: player.flagCarryTeam || '',
        abilities
    };
}

function serializeEnemies(enemies) {
    if (!enemies || !enemies.length) return [];
    return enemies.map((enemy) => ({
        id: enemy.id,
        type: enemy.type || 'enemy',
        x: round3(enemy.x),
        y: round3(enemy.y),
        vx: round3(enemy.vx),
        vy: round3(enemy.vy),
        dir: round3(enemy.dir || 0),
        hp: round3(enemy.hp),
        maxHp: round3(enemy.maxHp),
        alive: enemy.isAlive ? 1 : 0,
        frozenTimer: round3(enemy.frozenTimer || 0),
        stunTimer: round3(enemy.stunTimer || 0),
        poisonTimer: round3(enemy.poisonTimer || 0),
        bleedTimer: round3(enemy.bleedTimer || 0)
    }));
}

function serializeProjectiles(projectiles) {
    if (!projectiles || !projectiles.length) return [];
    return projectiles.map((projectile) => ({
        id: projectile.id,
        type: projectile.type || '',
        ownerId: projectile.ownerId || '',
        team: projectile.team || '',
        x: round3(projectile.x),
        y: round3(projectile.y),
        vx: round3(projectile.vx || 0),
        vy: round3(projectile.vy || 0),
        radius: round3(projectile.radius || 0),
        length: round3(projectile.length || 0),
        thickness: round3(projectile.thickness || 0),
        dirX: round3(projectile.direction?.x ?? 0),
        dirY: round3(projectile.direction?.y ?? 0)
    }));
}

function serializeAoeZones(zones) {
    if (!zones || !zones.length) return [];
    return zones.map((zone) => ({
        id: zone.id,
        type: zone.type || '',
        ownerId: zone.ownerId || '',
        team: zone.team || '',
        x: round3(zone.x),
        y: round3(zone.y),
        radiusX: round3(zone.radiusX || 0),
        radiusY: round3(zone.radiusY || 0),
        duration: round3(zone.duration || 0)
    }));
}

function serializeMovingPlatforms(platforms) {
    if (!platforms || !platforms.length) return [];
    return platforms.map((platform, index) => {
        const centerX = (platform.bounds.left + platform.bounds.right) / 2;
        const centerY = (platform.bounds.top + platform.bounds.bottom) / 2;
        return {
            id: platform.id || `mp${index}`,
            index,
            x: round3(centerX),
            y: round3(centerY)
        };
    });
}

function serializeFlags(flags) {
    if (!flags) return null;
    const snapshot = {};
    ['blue', 'red'].forEach((team) => {
        const flag = flags[team];
        if (!flag) return;
        snapshot[team] = {
            x: round3(flag.x),
            y: round3(flag.y),
            isAtBase: flag.isAtBase ? 1 : 0,
            dropped: flag.dropped ? 1 : 0,
            returnTimer: round3(flag.returnTimer || 0),
            pickupCooldown: round3(flag.pickupCooldown || 0),
            carrierId: flag.carrierId || '',
            lastX: round3(flag.lastCarrierPosition?.x ?? flag.base.x),
            lastY: round3(flag.lastCarrierPosition?.y ?? flag.base.y)
        };
    });
    return snapshot;
}

function round3(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 1000) / 1000;
}

function updateMovingPlatforms(world, dt) {
    if (!world.movingPlatforms) return;
    world.movingPlatforms.forEach((platform) => {
        platform.time += dt;
        const offsetX = Math.sin(platform.time * platform.speed + platform.phase) * platform.rangeX;
        const offsetY = Math.sin(platform.time * platform.speed + platform.phase) * platform.rangeY;
        const nextX = platform.baseX + offsetX;
        const nextY = platform.baseY + offsetY;

        platform.deltaX = nextX - platform.prevX;
        platform.deltaY = nextY - platform.prevY;
        platform.prevX = nextX;
        platform.prevY = nextY;

        platform.bounds.left = nextX - platform.width / 2;
        platform.bounds.right = nextX + platform.width / 2;
        platform.bounds.top = nextY + platform.height / 2;
        platform.bounds.bottom = nextY - platform.height / 2;
    });
}

function updateEnemies(world, dt) {
    if (!world.enemies || !world.enemies.length) return;
    world.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        updateEnemyStatus(enemy, dt);

        enemy.vy += GRAVITY * dt;
        enemy.y += enemy.vy * dt;

        const moveSpeed = (enemy.frozenTimer > 0 || enemy.stunTimer > 0) ? 0 : enemy.speed;
        enemy.vx = enemy.dir * moveSpeed;
        enemy.x += enemy.vx * dt;

        resolveEnemyCollisions(enemy, world.platforms);
        checkEnemyEdges(enemy, world.platforms);

        if (enemy.y <= DEATH_Y) {
            killEnemy(enemy);
        }
    });
}

function updateEnemyStatus(enemy, dt) {
    if (enemy.frozenTimer > 0) {
        enemy.frozenTimer = Math.max(0, enemy.frozenTimer - dt);
    }
    if (enemy.stunTimer > 0) {
        enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
    }
    if (enemy.poisonTimer > 0) {
        enemy.poisonTimer = Math.max(0, enemy.poisonTimer - dt);
    }
    if (enemy.bleedTimer > 0) {
        enemy.bleedTimer = Math.max(0, enemy.bleedTimer - dt);
    }
    if (enemy.bleedTicksRemaining > 0) {
        enemy.bleedTickTimer += dt;
        while (enemy.bleedTickTimer >= ASSASSIN_BLEED_INTERVAL && enemy.bleedTicksRemaining > 0) {
            enemy.bleedTickTimer -= ASSASSIN_BLEED_INTERVAL;
            enemy.bleedTicksRemaining -= 1;
        }
    }
    if (enemy.enemyContactCooldown > 0) {
        enemy.enemyContactCooldown = Math.max(0, enemy.enemyContactCooldown - dt);
    }
}

function resolveEnemyCollisions(enemy, platforms) {
    if (!enemy || !platforms) return;
    const bounds = getEnemyBounds(enemy);
    for (const platform of platforms) {
        if (!platform || !platform.bounds) continue;
        if (platform.type === 'ladder') continue;
        if (!checkAABB(bounds, platform.bounds)) continue;
        if (enemy.vy <= 0) {
            enemy.y = platform.bounds.top + ENEMY_HALF_SIZE;
            enemy.vy = 0;
        }
    }
}

function checkEnemyEdges(enemy, platforms) {
    if (!enemy || !platforms) return;
    const aheadDistance = 1.0;
    const aheadX = enemy.x + enemy.dir * aheadDistance;
    const aheadY = enemy.y - 1;
    const testBounds = {
        left: aheadX - 0.1,
        right: aheadX + 0.1,
        top: aheadY + 0.1,
        bottom: aheadY - 0.1
    };
    let groundAhead = false;
    for (const platform of platforms) {
        if (!platform || !platform.bounds) continue;
        if (checkAABB(testBounds, platform.bounds)) {
            groundAhead = true;
            break;
        }
    }
    if (!groundAhead) {
        enemy.dir *= -1;
    }
}

function resolveCollisions(player, platforms) {
    const handlePlatform = (platform) => {
        if (!platform || !platform.bounds) return;
        if (platform.type === 'ladder') return;

        const bounds = getPlayerBounds(player);

        if (!checkAABB(bounds, platform.bounds)) return;

        const overlapLeft = bounds.right - platform.bounds.left;
        const overlapRight = platform.bounds.right - bounds.left;
        const overlapTop = bounds.top - platform.bounds.bottom;
        const overlapBottom = platform.bounds.top - bounds.bottom;

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapBottom && player.vy <= 0) {
            player.y = platform.bounds.top + PLAYER_HALF_SIZE;
            player.vy = 0;
            player.grounded = true;
            player.jumpsRemaining = PLAYER_JUMPS;
            if (platform.type === 'moving') {
                player.x += platform.deltaX || 0;
                player.y += platform.deltaY || 0;
            }
        } else if (minOverlap === overlapTop && player.vy > 0) {
            player.y = platform.bounds.bottom - PLAYER_HALF_SIZE;
            player.vy = 0;
        } else if (minOverlap === overlapLeft && player.vx > 0) {
            player.x = platform.bounds.left - PLAYER_HALF_SIZE;
            player.vx = 0;
        } else if (minOverlap === overlapRight && player.vx < 0) {
            player.x = platform.bounds.right + PLAYER_HALF_SIZE;
            player.vx = 0;
        }
    };

    const walls = platforms.filter((platform) => platform.type === 'wall');
    walls.forEach(handlePlatform);
    platforms.forEach((platform) => {
        if (platform.type === 'wall') return;
        handlePlatform(platform);
    });
}

function checkPlatformCollision(bounds, platforms) {
    return platforms.some((platform) => platform.bounds && checkAABB(bounds, platform.bounds));
}

function getCircleBounds(x, y, radius) {
    return {
        left: x - radius,
        right: x + radius,
        top: y + radius,
        bottom: y - radius
    };
}

function updateCTF(world, entries, dt) {
    if (!world.flags || !world.ctf) return;
    const flags = world.flags;
    const players = entries.map((entry) => entry.player);

    const inputs = entries.map(({ player, input }) => {
        const dropPressed = !!input?.flagDrop;
        const dropJustPressed = dropPressed && !player.flagDropWasPressed;
        return { player, dropPressed, dropJustPressed };
    });

    inputs.forEach(({ player }) => {
        player.flagCarryBlocksAbility3 = Boolean(player.isCarryingFlag);
    });

    inputs.forEach(({ player, dropJustPressed }) => {
        if (!player.isCarryingFlag || !dropJustPressed) return;
        const carriedFlag = flags[player.flagCarryTeam];
        if (!carriedFlag || carriedFlag.carrierId !== player.id) return;
        carriedFlag.lastCarrierPosition = { x: player.x, y: player.y };
        dropFlag(world, carriedFlag);
    });

    Object.values(flags).forEach((flag) => {
        if (flag.carrierId) {
            const carrier = world.players.get(flag.carrierId);
            if (carrier && carrier.isAlive) {
                flag.lastCarrierPosition = { x: carrier.x, y: carrier.y };
                flag.x = carrier.x;
                flag.y = carrier.y + FLAG_CARRY_HEIGHT;
            } else {
                if (carrier) {
                    flag.lastCarrierPosition = { x: carrier.x, y: carrier.y };
                }
                dropFlag(world, flag);
            }
        } else if (flag.dropped) {
            flag.pickupCooldown = Math.max(0, flag.pickupCooldown - dt);
        }
    });

    inputs.forEach(({ player, dropPressed }) => {
        if (!player.isAlive) return;
        Object.values(flags).forEach((flag) => {
            if (flag.carrierId) return;
            if (flag.team === player.team) return;
            if (player.isCarryingFlag) return;
            if (!checkAABB(getPlayerBounds(player), getFlagBounds(flag))) return;
            if (flag.dropped && !dropPressed) return;
            if (flag.pickupCooldown > 0) return;
            setFlagCarrier(world, flag, player);
        });
    });

    Object.values(flags).forEach((flag) => {
        if (!flag.dropped) return;
        const radius = world.ctf.returnRadius;
        const ringBounds = {
            left: flag.x - radius,
            right: flag.x + radius,
            top: flag.y + radius,
            bottom: flag.y - radius
        };

        let friendlyInRing = false;
        let enemyInRing = false;

        players.forEach((player) => {
            if (!player.isAlive) return;
            if (!checkAABB(getPlayerBounds(player), ringBounds)) return;
            if (player.team === flag.team) {
                friendlyInRing = true;
            } else {
                enemyInRing = true;
            }
        });

        if (friendlyInRing && !enemyInRing) {
            flag.returnTimer -= dt;
            if (flag.returnTimer <= 0) {
                resetFlag(world, flag);
            }
        } else {
            flag.returnTimer = world.ctf.returnDelay;
        }
    });

    inputs.forEach(({ player }) => {
        if (!player.isCarryingFlag || !player.isAlive) return;
        const enemyTeam = player.flagCarryTeam;
        if (!enemyTeam || enemyTeam === player.team) return;
        const ownFlag = flags[player.team];
        if (!ownFlag || !ownFlag.isAtBase) return;
        if (!isPlayerInBase(world, player, player.team)) return;

        world.scores[player.team] = (world.scores[player.team] || 0) + 1;
        resetFlag(world, flags[enemyTeam]);
        player.isCarryingFlag = false;
        player.flagCarryTeam = null;
    });

    inputs.forEach(({ player, dropPressed }) => {
        player.flagDropWasPressed = dropPressed;
    });
}

function getFlagBounds(flag) {
    return {
        left: flag.x - 0.4,
        right: flag.x + 0.4,
        top: flag.y + 0.9,
        bottom: flag.y - 0.2
    };
}

function isPlayerInBase(world, player, team) {
    const base = world.ctf?.bases?.[team];
    if (!base) return false;
    const radius = world.ctf.baseRadius;
    const baseBounds = {
        left: base.x - radius,
        right: base.x + radius,
        top: base.y + radius,
        bottom: base.y - radius
    };
    return checkAABB(getPlayerBounds(player), baseBounds);
}

function setFlagCarrier(world, flag, player) {
    flag.carrierId = player.id;
    flag.isAtBase = false;
    flag.dropped = false;
    flag.returnTimer = 0;
    flag.pickupCooldown = 0;
    flag.lastCarrierPosition = { x: player.x, y: player.y };
    player.isCarryingFlag = true;
    player.flagCarryTeam = flag.team;
}

function clearFlagCarrier(world, flag) {
    if (flag.carrierId) {
        const carrier = world.players.get(flag.carrierId);
        if (carrier) {
            carrier.isCarryingFlag = false;
            carrier.flagCarryTeam = null;
        }
    }
    flag.carrierId = null;
}

function resetFlag(world, flag) {
    clearFlagCarrier(world, flag);
    flag.isAtBase = true;
    flag.dropped = false;
    flag.returnTimer = 0;
    flag.pickupCooldown = 0;
    flag.x = flag.base.x;
    flag.y = flag.base.y;
    flag.lastCarrierPosition = { x: flag.base.x, y: flag.base.y };
}

function dropFlag(world, flag) {
    const dropPos = flag.lastCarrierPosition || flag.base;
    clearFlagCarrier(world, flag);
    flag.isAtBase = false;
    flag.dropped = true;
    flag.returnTimer = world.ctf.returnDelay;
    flag.pickupCooldown = FLAG_PICKUP_COOLDOWN;
    flag.x = dropPos.x;
    flag.y = dropPos.y;
}

function getPlayerBounds(player) {
    return {
        left: player.x - PLAYER_HALF_SIZE,
        right: player.x + PLAYER_HALF_SIZE,
        top: player.y + PLAYER_HALF_SIZE,
        bottom: player.y - PLAYER_HALF_SIZE
    };
}

function getEnemyBounds(enemy) {
    return {
        left: enemy.x - ENEMY_HALF_SIZE,
        right: enemy.x + ENEMY_HALF_SIZE,
        top: enemy.y + ENEMY_HALF_SIZE,
        bottom: enemy.y - ENEMY_HALF_SIZE
    };
}

function checkAABB(a, b) {
    return a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom;
}
