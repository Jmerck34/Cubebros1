export class ArenaMode {
    constructor({ onScoreboardVisible, onScoreChange } = {}) {
        this.onScoreboardVisible = onScoreboardVisible || (() => {});
        this.onScoreChange = onScoreChange || (() => {});
    }

    init() {
        this.onScoreChange({ blue: 0, red: 0 });
        this.onScoreboardVisible(false);
    }

    update() {}

    destroy() {
        this.onScoreboardVisible(false);
    }
}
