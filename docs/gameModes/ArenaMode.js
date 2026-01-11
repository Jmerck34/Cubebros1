export class ArenaMode {
    constructor({ onScoreboardVisible, onScoreChange } = {}) {
        this.onScoreboardVisible = onScoreboardVisible || (() => {});
        this.onScoreChange = onScoreChange || (() => {});
        this.scores = { blue: 0, red: 0 };
        this.playerStates = new Map();
        this.killCreditWindowMs = 2500;
    }

    init() {
        this.scores = { blue: 0, red: 0 };
        this.playerStates.clear();
        this.onScoreChange(this.scores);
        this.onScoreboardVisible(true);
    }

    update(deltaTime, players = []) {
        if (!Array.isArray(players) || players.length === 0) {
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
        if (killer.team === 'blue' || killer.team === 'red') {
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
