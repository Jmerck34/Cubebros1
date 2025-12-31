export class NetClient {
    constructor({ url, onSnapshot, onStatus, onAck, onRtt } = {}) {
        this.url = url;
        this.onSnapshot = onSnapshot;
        this.onStatus = onStatus;
        this.onAck = onAck;
        this.onRtt = onRtt;
        this.ws = null;
        this.status = 'disconnected';
        this.rttMs = 0;
        this.lastPingTime = 0;
        this.pingInterval = null;
        this.clientId = null;
        this.playerInfo = null;
    }

    connect() {
        if (!this.url) return;
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket(this.url);
        this.ws.addEventListener('open', () => {
            this.status = 'connected';
            this.emitStatus();
            this.startPing();
            this.flushPlayerInfo();
        });
        this.ws.addEventListener('close', () => {
            this.status = 'disconnected';
            this.emitStatus();
            this.stopPing();
        });
        this.ws.addEventListener('error', () => {
            this.status = 'error';
            this.emitStatus();
        });
        this.ws.addEventListener('message', (event) => {
            this.handleMessage(event.data);
        });
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stopPing();
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    sendInput(cmd) {
        if (!this.isConnected() || !cmd) return;
        this.send({
            type: 'input',
            cmdNumber: cmd.cmdNumber,
            tick: cmd.tick,
            input: cmd
        });
    }

    sendSnapshot(snapshot) {
        if (!this.isConnected() || !snapshot) return;
        this.send({
            type: 'snapshot',
            snapshot
        });
    }

    sendPlayerInfo(info) {
        if (!info) return;
        this.playerInfo = info;
        if (this.isConnected()) {
            this.send({ type: 'playerInfo', ...info });
        }
    }

    send(data) {
        if (!this.ws) return;
        this.ws.send(JSON.stringify(data));
    }

    startPing() {
        this.stopPing();
        this.pingInterval = window.setInterval(() => {
            if (!this.isConnected()) return;
            this.lastPingTime = performance.now();
            this.send({ type: 'ping', time: this.lastPingTime });
        }, 1000);
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    flushPlayerInfo() {
        if (!this.playerInfo || !this.isConnected()) return;
        this.send({ type: 'playerInfo', ...this.playerInfo });
    }

    handleMessage(data) {
        let message = null;
        try {
            message = JSON.parse(data);
        } catch (error) {
            return;
        }

        if (!message || !message.type) return;

        if (message.type === 'welcome') {
            this.clientId = message.clientId || null;
            if (this.onStatus && message.playerId) {
                this.onStatus(this.status, message);
            }
            return;
        }

        if (message.type === 'pong') {
            const now = performance.now();
            this.rttMs = Math.max(0, now - (message.time || now));
            if (this.onRtt) {
                this.onRtt(this.rttMs);
            }
            return;
        }

        if (message.type === 'ack') {
            if (this.onAck) {
                this.onAck(message);
            }
            return;
        }

        if (message.type === 'snapshot') {
            if (this.onSnapshot && message.snapshot) {
                this.onSnapshot(message.snapshot, message);
            }
        }
    }

    emitStatus() {
        if (this.onStatus) {
            this.onStatus(this.status);
        }
    }
}
