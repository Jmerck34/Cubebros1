const TEAM_COLORS = {
    blue: '#2f6cb0',
    red: '#cc2f2f',
    yellow: '#f4d03f',
    green: '#3fa34d',
    neutral: '#8b8f96'
};

export class MiniMapMarker {
    constructor({ x = 0, y = 0, color = '#ffffff', radius = 3, stroke = null, shape = 'circle', alpha = 1 } = {}) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = radius;
        this.stroke = stroke;
        this.shape = shape;
        this.alpha = alpha;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        if (this.shape === 'square') {
            const size = this.radius * 2;
            ctx.fillRect(this.x - this.radius, this.y - this.radius, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.stroke) {
            ctx.strokeStyle = this.stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }
}

export class MiniMap {
    constructor({ parent = document.body, playerIndex = 0, size = 150, padding = 10 } = {}) {
        this.parent = parent;
        this.playerIndex = playerIndex;
        this.size = size;
        this.padding = padding;
        this.pixelRatio = window.devicePixelRatio || 1;
        this.bounds = null;
        this.platforms = [];
        this.baseCanvas = document.createElement('canvas');
        this.baseCtx = this.baseCanvas.getContext('2d');

        this.container = document.createElement('div');
        this.container.className = 'mini-map';
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.parent.appendChild(this.container);

        this.resizeCanvas();
    }

    resizeCanvas() {
        const width = this.size * this.pixelRatio;
        const height = this.size * this.pixelRatio;
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${this.size}px`;
        this.canvas.style.height = `${this.size}px`;
        this.baseCanvas.width = width;
        this.baseCanvas.height = height;
        this.baseCanvas.style.width = `${this.size}px`;
        this.baseCanvas.style.height = `${this.size}px`;
        const ctx = this.canvas.getContext('2d');
        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        this.baseCtx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }

    setBounds(bounds) {
        if (!bounds || !Number.isFinite(bounds.left) || !Number.isFinite(bounds.right)) {
            this.bounds = { left: -10, right: 10, bottom: -6, top: 6 };
            return;
        }
        this.bounds = { ...bounds };
    }

    setViewport(viewport, fullHeight) {
        if (!viewport || !Number.isFinite(viewport.x) || !Number.isFinite(fullHeight)) {
            return;
        }
        const left = viewport.x;
        const bottom = viewport.y;
        this.container.style.left = `${left + this.padding}px`;
        this.container.style.bottom = `${bottom + this.padding}px`;
        this.container.style.top = '';
    }

    buildBase(level) {
        if (!level) return;
        this.platforms = Array.isArray(level.platforms) ? level.platforms.slice() : [];
        this.drawBase();
    }

    drawBase() {
        const ctx = this.baseCtx;
        ctx.clearRect(0, 0, this.size, this.size);
        ctx.fillStyle = 'rgba(12, 16, 22, 0.65)';
        ctx.fillRect(0, 0, this.size, this.size);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, this.size - 1, this.size - 1);

        if (!this.bounds) return;
        const spanX = this.bounds.right - this.bounds.left;
        const spanY = this.bounds.top - this.bounds.bottom;
        if (!Number.isFinite(spanX) || !Number.isFinite(spanY) || spanX === 0 || spanY === 0) {
            return;
        }
        ctx.fillStyle = 'rgba(170, 180, 190, 0.55)';
        this.platforms.forEach((platform) => {
            if (!platform || !platform.bounds || platform.isLadder) return;
            const bounds = platform.bounds;
            const width = bounds.right - bounds.left;
            const height = bounds.top - bounds.bottom;
            if (!Number.isFinite(width) || !Number.isFinite(height)) return;
            const x = ((bounds.left - this.bounds.left) / spanX) * this.size;
            const y = ((this.bounds.top - bounds.top) / spanY) * this.size;
            const w = (width / spanX) * this.size;
            const h = (height / spanY) * this.size;
            ctx.fillRect(x, y, w, h);
        });
    }

    worldToMap(x, y) {
        if (!this.bounds) return { x: 0, y: 0 };
        const spanX = this.bounds.right - this.bounds.left;
        const spanY = this.bounds.top - this.bounds.bottom;
        if (spanX === 0 || spanY === 0) return { x: 0, y: 0 };
        return {
            x: ((x - this.bounds.left) / spanX) * this.size,
            y: ((this.bounds.top - y) / spanY) * this.size
        };
    }

    drawObjectives(ctx, objectives = []) {
        if (!objectives || !this.bounds) return;
        objectives.forEach((objective) => {
            if (!objective) return;
            if (objective.bounds) {
                const bounds = objective.bounds;
                const spanX = this.bounds.right - this.bounds.left;
                const spanY = this.bounds.top - this.bounds.bottom;
                const x = ((bounds.left - this.bounds.left) / spanX) * this.size;
                const y = ((this.bounds.top - bounds.top) / spanY) * this.size;
                const w = ((bounds.right - bounds.left) / spanX) * this.size;
                const h = ((bounds.top - bounds.bottom) / spanY) * this.size;
                ctx.save();
                ctx.strokeStyle = objective.color || 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(x, y, w, h);
                ctx.restore();
            } else if (Number.isFinite(objective.x) && Number.isFinite(objective.y)) {
                const pos = this.worldToMap(objective.x, objective.y);
                const marker = new MiniMapMarker({
                    x: pos.x,
                    y: pos.y,
                    color: objective.color || '#ffffff',
                    radius: objective.radius || 4,
                    shape: 'square',
                    alpha: 0.9
                });
                marker.draw(ctx);
            }
        });
    }

    update({ players = [], flags = [], objectives = [], focusPlayer = null } = {}) {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.size, this.size);
        ctx.drawImage(this.baseCanvas, 0, 0, this.size, this.size);

        this.drawObjectives(ctx, objectives);

        flags.forEach((flag) => {
            if (!flag || !Number.isFinite(flag.x) || !Number.isFinite(flag.y)) return;
            const pos = this.worldToMap(flag.x, flag.y);
            const color = TEAM_COLORS[flag.team] || TEAM_COLORS.neutral;
            const marker = new MiniMapMarker({
                x: pos.x,
                y: pos.y,
                color,
                radius: 3,
                shape: 'square',
                alpha: 0.95
            });
            marker.draw(ctx);
        });

        players.forEach((player) => {
            if (!player || !player.position) return;
            const pos = this.worldToMap(player.position.x, player.position.y);
            const isFocus = focusPlayer && player === focusPlayer;
            const color = isFocus ? '#000000' : (TEAM_COLORS[player.team] || TEAM_COLORS.neutral);
            const marker = new MiniMapMarker({
                x: pos.x,
                y: pos.y,
                color,
                radius: isFocus ? 4 : 3,
                stroke: isFocus ? '#ffffff' : null,
                shape: 'circle',
                alpha: player.isAlive === false ? 0.5 : 1
            });
            marker.draw(ctx);
        });
    }

    setVisible(visible) {
        if (!this.container) return;
        this.container.style.display = visible ? 'block' : 'none';
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.canvas = null;
        this.baseCanvas = null;
        this.baseCtx = null;
        this.platforms = [];
    }
}
