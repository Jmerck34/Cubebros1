/**
 * PlayerStateOverlay - Toggleable HUD for player state (F1).
 */
export class PlayerStateOverlay {
    constructor(getPlayer) {
        this.getPlayer = getPlayer;
        this.visible = false;
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 12px;
            left: 12px;
            padding: 10px 12px;
            background: rgba(0, 0, 0, 0.7);
            color: #e8f4ff;
            font-family: "Courier New", monospace;
            font-size: 12px;
            line-height: 1.4;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            z-index: 2500;
            display: none;
            white-space: pre;
        `;
        document.body.appendChild(this.container);
        window.addEventListener('keydown', (event) => {
            if (event.code === 'F1') {
                event.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
    }

    update() {
        if (!this.visible) return;
        const player = this.getPlayer ? this.getPlayer() : null;
        if (!player) {
            this.container.textContent = 'Player State\n(no player)';
            return;
        }
        const pos = player.position || { x: 0, y: 0 };
        const vel = player.velocity || { x: 0, y: 0 };
        const health = Number.isFinite(player.currentHealth) ? player.currentHealth : 0;
        const maxHealth = Number.isFinite(player.maxHealth) ? player.maxHealth : 0;
        const grounded = Boolean(player.isGrounded);
        const onLadder = Boolean(player.onLadder);
        const onOneWay = Boolean(player.onOneWay);
        const team = player.team || 'none';
        this.container.textContent = [
            'Player State',
            `pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`,
            `vel: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)})`,
            `health: ${health.toFixed(0)} / ${maxHealth.toFixed(0)}`,
            `grounded: ${grounded}`,
            `ladder: ${onLadder}`,
            `one-way: ${onOneWay}`,
            `team: ${team}`
        ].join('\n');
    }
}
