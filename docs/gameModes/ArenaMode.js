export class ArenaMode {
    constructor({ onScoreboardVisible, onScoreChange, onTimerUpdate, onMatchEnd, matchDuration = 600, livesLimit = Infinity } = {}) {
        this.onScoreboardVisible = onScoreboardVisible || (() => {});
        this.onScoreChange = onScoreChange || (() => {});
        this.onTimerUpdate = onTimerUpdate || (() => {});
        this.onMatchEnd = onMatchEnd || (() => {});
        this.scores = { blue: 0, red: 0, yellow: 0, green: 0 };
        this.playerStates = new Map();
        this.playerLives = new Map();
        this.killCreditWindowMs = 2500;
        this.matchDuration = matchDuration;
        this.timeRemaining = this.matchDuration;
        this.matchEnded = false;
        this.livesLimit = livesLimit;
        this.livesEnabled = Number.isFinite(livesLimit);
    }

    init() {
        this.scores = { blue: 0, red: 0, yellow: 0, green: 0 };
        this.playerStates.clear();
        this.playerLives.clear();
        this.timeRemaining = this.matchDuration;
        this.matchEnded = false;
        this.onScoreChange(this.scores);
        this.onScoreboardVisible(true);
        this.onTimerUpdate({ remaining: this.timeRemaining, duration: this.matchDuration });
    }

    update(deltaTime, players = []) {
        if (this.matchEnded) {
            return;
        }
        if (!Array.isArray(players) || players.length === 0) {
            return;
        }
        if (this.livesEnabled) {
            this.ensurePlayerLives(players);
        }

        this.timeRemaining = Math.max(0, this.timeRemaining - deltaTime);
        this.onTimerUpdate({ remaining: this.timeRemaining, duration: this.matchDuration });
        if (this.timeRemaining <= 0) {
            this.matchEnded = true;
            if (this.livesEnabled) {
                const winners = this.getRemainingTeams(players);
                this.onMatchEnd({ mode: 'lives', winners, reason: 'time' });
            } else {
                this.onMatchEnd({ scores: { ...this.scores } });
            }
            return;
        }

        players.forEach((player) => {
            if (!player) return;
            const wasAlive = this.playerStates.has(player) ? this.playerStates.get(player) : player.isAlive;
            if (wasAlive && !player.isAlive) {
                this.handlePlayerDeath(player);
            }
            this.playerStates.set(player, player.isAlive);
        });

        if (this.livesEnabled) {
            const remainingTeams = this.getRemainingTeams(players);
            if (remainingTeams.length <= 1) {
                this.matchEnded = true;
                this.onMatchEnd({ mode: 'lives', winners: remainingTeams, reason: 'elimination' });
            }
        }
    }

    handlePlayerDeath(player) {
        if (this.livesEnabled) {
            const remaining = this.getPlayerLives(player);
            const nextLives = Math.max(0, remaining - 1);
            this.playerLives.set(player, nextLives);
            player.arenaLivesRemaining = nextLives;
            if (nextLives <= 0) {
                player.respawnTimer = Number.POSITIVE_INFINITY;
            }
        }
        const killer = this.getKillCredit(player);
        if (!killer) return;
        if (killer.team === 'blue' || killer.team === 'red' || killer.team === 'yellow' || killer.team === 'green') {
            this.scores[killer.team] += 1;
            this.onScoreChange(this.scores);
        }
    }

    ensurePlayerLives(players) {
        for (const player of players) {
            if (!player) continue;
            if (!this.playerLives.has(player)) {
                this.playerLives.set(player, this.livesLimit);
                player.arenaLivesRemaining = this.livesLimit;
            }
        }
    }

    getPlayerLives(player) {
        if (!this.playerLives.has(player)) {
            this.playerLives.set(player, this.livesLimit);
        }
        return this.playerLives.get(player);
    }

    getRemainingTeams(players) {
        const remaining = new Set();
        for (const player of players) {
            if (!player) continue;
            const lives = this.getPlayerLives(player);
            if (lives > 0 && player.team) {
                remaining.add(player.team);
            }
        }
        return Array.from(remaining);
    }

    getKillCredit(player) {
        const source = player.lastDamageSource;
        if (!source || source === player) {
            return null;
        }
        const sourceTeam = source.team;
        if (!sourceTeam || sourceTeam === player.team) {
            return null;
        }
        const lastTime = Number.isFinite(player.lastDamageTime) ? player.lastDamageTime : null;
        if (!lastTime) {
            return null;
        }
        const now = performance.now();
        if (now - lastTime > this.killCreditWindowMs) {
            return null;
        }
        return source;
    }

    destroy() {
        this.onScoreboardVisible(false);
    }
}
