export class ArenaMode {
    constructor({ onScoreboardVisible, onScoreChange, onTimerUpdate, onMatchEnd } = {}) {
        this.onScoreboardVisible = onScoreboardVisible || (() => {});
        this.onScoreChange = onScoreChange || (() => {});
        this.onTimerUpdate = onTimerUpdate || (() => {});
        this.onMatchEnd = onMatchEnd || (() => {});
        this.scores = { blue: 0, red: 0, yellow: 0, green: 0 };
        this.playerStates = new Map();
        this.killCreditWindowMs = 2500;
        this.matchDuration = 600;
        this.timeRemaining = this.matchDuration;
        this.matchEnded = false;
    }

    init() {
        this.scores = { blue: 0, red: 0, yellow: 0, green: 0 };
        this.playerStates.clear();
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

        this.timeRemaining = Math.max(0, this.timeRemaining - deltaTime);
        this.onTimerUpdate({ remaining: this.timeRemaining, duration: this.matchDuration });
        if (this.timeRemaining <= 0) {
            this.matchEnded = true;
            this.onMatchEnd({ scores: { ...this.scores } });
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
    }

    handlePlayerDeath(player) {
        const killer = this.getKillCredit(player);
        if (!killer) return;
        if (killer.team === 'blue' || killer.team === 'red' || killer.team === 'yellow' || killer.team === 'green') {
            this.scores[killer.team] += 1;
            this.onScoreChange(this.scores);
        }
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
