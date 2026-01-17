/**
 * Shield - Temporary shield that absorbs damage before health.
 */
export class Shield {
    constructor() {
        this.amount = 0;
        this.timer = 0;
    }

    set(amount, durationSeconds = 0) {
        const nextAmount = Math.max(0, Math.round(amount));
        this.amount = nextAmount;
        this.timer = Math.max(0, durationSeconds);
    }

    absorb(damage) {
        if (this.amount <= 0 || damage <= 0) return damage;
        const absorbed = Math.min(this.amount, damage);
        this.amount = Math.max(0, this.amount - absorbed);
        if (this.amount === 0) {
            this.timer = 0;
        }
        return damage - absorbed;
    }

    update(deltaTime) {
        if (this.amount <= 0) return;
        if (this.timer > 0) {
            this.timer = Math.max(0, this.timer - deltaTime);
            if (this.timer === 0) {
                this.amount = 0;
            }
        }
    }

    get isActive() {
        return this.amount > 0;
    }
}
