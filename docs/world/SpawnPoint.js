/**
 * SpawnPoint - Defines a respawn location with team/mode filters.
 */
export class SpawnPoint {
    constructor({
        position = { x: 0, y: 0 },
        team = null,
        gameMode = null,
        reserveDuration = 0.75
    } = {}) {
        this.position = { x: position.x || 0, y: position.y || 0 };
        this.team = team;
        this.gameMode = gameMode;
        this.reserveDuration = Math.max(0, reserveDuration);
        this.reservedUntil = 0;
    }

    canUseFor(team, gameMode) {
        if (this.team && team && this.team !== team) return false;
        if (this.gameMode && gameMode && this.gameMode !== gameMode) return false;
        return true;
    }

    isReserved(now = performance.now()) {
        return now < this.reservedUntil;
    }

    reserve(now = performance.now()) {
        this.reservedUntil = now + this.reserveDuration * 1000;
    }

    getPosition() {
        return { x: this.position.x, y: this.position.y };
    }

    /**
     * Choose the best spawn point for a team/mode, preferring unreserved points.
     */
    static selectBest(spawnPoints, { team = null, gameMode = null, now = performance.now() } = {}) {
        const candidates = (spawnPoints || []).filter((spawn) => spawn?.canUseFor?.(team, gameMode));
        if (!candidates.length) return null;
        const unreserved = candidates.filter((spawn) => !spawn.isReserved(now));
        const pool = unreserved.length ? unreserved : candidates;
        return pool[Math.floor(Math.random() * pool.length)] || null;
    }
}
