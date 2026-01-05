import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { checkAABBCollision } from '../utils/collision.js';

const TEAM_COLORS = {
    neutral: 0x8b8f96,
    blue: 0x2f6cb0,
    red: 0xcc2f2f
};

export class KingOfTheHillMode {
    constructor({ scene, level, onScoreboardVisible, onScoreChange, onMeterUpdate } = {}) {
        this.scene = scene;
        this.level = level;
        this.onScoreboardVisible = onScoreboardVisible || (() => {});
        this.onScoreChange = onScoreChange || (() => {});
        this.onMeterUpdate = onMeterUpdate || (() => {});
        this.zone = null;
        this.zoneBounds = null;
        this.controllingTeam = null;
        this.controlProgress = 0;
        this.controlTeam = null;
        this.captureOverlay = null;
        this.capturePulse = 0;
        this.capturePoints = { blue: 0, red: 0 };
        this.captureTick = 0;
    }

    init() {
        this.onScoreChange({ blue: 0, red: 0 });
        this.onScoreboardVisible(false);
        this.createZone();
        this.capturePoints = { blue: 0, red: 0 };
        this.captureTick = 0;
        this.onMeterUpdate({ score: { blue: 0, red: 0 }, max: 50 });
    }

    update(deltaTime, activePlayers) {
        if (!this.zone || !this.zoneBounds) return;
        let blueInZone = false;
        let redInZone = false;
        (activePlayers || []).forEach((player) => {
            if (!player || !player.isAlive) return;
            if (!checkAABBCollision(player.getBounds(), this.zoneBounds)) return;
            if (player.team === 'blue') {
                blueInZone = true;
            } else if (player.team === 'red') {
                redInZone = true;
            }
        });

        let nextTeam = null;
        if (blueInZone && !redInZone) {
            nextTeam = 'blue';
        } else if (redInZone && !blueInZone) {
            nextTeam = 'red';
        }

        const chargeRate = 0.35;
        const decayRate = 0.18;

        if (nextTeam) {
            if (this.controlTeam && this.controlTeam !== nextTeam) {
                this.controlProgress = Math.max(0, this.controlProgress - deltaTime * chargeRate);
                if (this.controlProgress === 0) {
                    this.controlTeam = nextTeam;
                }
            } else {
                this.controlTeam = nextTeam;
                this.controlProgress = Math.min(1, this.controlProgress + deltaTime * chargeRate);
            }
        } else {
            this.controlProgress = Math.max(0, this.controlProgress - deltaTime * decayRate);
            if (this.controlProgress === 0) {
                this.controlTeam = null;
            }
        }

        const nextControl = this.controlProgress >= 1 ? this.controlTeam : null;
        if (nextControl !== this.controllingTeam) {
            this.controllingTeam = nextControl;
            this.updateZoneColor();
        }
        this.updateZoneCapture();

        if (this.controllingTeam) {
            this.captureTick += deltaTime;
            if (this.captureTick >= 1) {
                const ticks = Math.floor(this.captureTick);
                this.captureTick -= ticks;
                const team = this.controllingTeam;
                this.capturePoints[team] = Math.min(50, this.capturePoints[team] + ticks);
            }
        } else {
            this.captureTick = 0;
        }

        this.onMeterUpdate({ score: { ...this.capturePoints }, max: 50 });
    }

    destroy() {
        if (this.zone && this.zone.parent) {
            this.zone.parent.remove(this.zone);
        }
        this.zone = null;
        this.zoneBounds = null;
        this.controllingTeam = null;
        this.controlProgress = 0;
        this.controlTeam = null;
        this.captureOverlay = null;
        this.capturePulse = 0;
        this.capturePoints = { blue: 0, red: 0 };
        this.captureTick = 0;
        this.onMeterUpdate({ score: { blue: 0, red: 0 }, max: 50 });
        this.onScoreboardVisible(false);
    }

    createZone() {
        if (!this.scene) return;
        const platform = this.findMidfieldPlatform();
        const centerX = platform ? (platform.bounds.left + platform.bounds.right) / 2 : 0;
        const centerY = platform ? platform.bounds.top + 0.1 : 0.2;
        const width = platform ? (platform.bounds.right - platform.bounds.left) : 6;
        const height = platform ? Math.max(1.8, (platform.bounds.top - platform.bounds.bottom) + 1.6) : 2.8;

        const outerGeometry = new THREE.PlaneGeometry(width, height);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: TEAM_COLORS.neutral,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });
        const outer = new THREE.Mesh(outerGeometry, outerMaterial);
        outer.position.set(centerX, centerY, 0.05);

        const innerGeometry = new THREE.PlaneGeometry(Math.max(0.1, width - 0.6), Math.max(0.1, height - 0.4));
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);
        inner.position.set(0, 0, 0.01);
        outer.add(inner);

        const glowGeometry = new THREE.PlaneGeometry(width + 0.8, height + 0.6);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: TEAM_COLORS.neutral,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, -0.01);
        outer.add(glow);

        this.scene.add(outer);

        const overlayGeometry = new THREE.PlaneGeometry(Math.max(0.1, width - 0.8), Math.max(0.1, height - 0.7));
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: TEAM_COLORS.neutral,
            transparent: true,
            opacity: 0
        });
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.position.set(0, 0, 0.02);
        overlay.scale.y = 0.1;
        outer.add(overlay);

        this.zone = outer;
        this.captureOverlay = overlay;
        this.zoneBounds = {
            left: centerX - width / 2,
            right: centerX + width / 2,
            top: centerY + height / 2,
            bottom: centerY - height / 2
        };
        this.updateZoneColor();
    }

    updateZoneColor() {
        if (!this.zone || !this.zone.material) return;
        const colorKey = this.controllingTeam || this.controlTeam || 'neutral';
        const color = TEAM_COLORS[colorKey] || TEAM_COLORS.neutral;
        this.zone.material.color.setHex(color);
        if (this.zone.children) {
            this.zone.children.forEach((child) => {
                if (child.material && child.material.color) {
                    child.material.color.setHex(color);
                }
            });
        }
    }

    updateZoneCapture() {
        if (!this.captureOverlay) return;
        const progress = Math.max(0, Math.min(1, this.controlProgress || 0));
        const colorKey = this.controlTeam || 'neutral';
        const color = TEAM_COLORS[colorKey] || TEAM_COLORS.neutral;
        this.captureOverlay.material.color.setHex(color);
        this.capturePulse += 0.02;
        const pulse = 0.9 + Math.sin(this.capturePulse) * 0.1;
        this.captureOverlay.scale.y = Math.max(0.12, progress) * pulse;
        this.captureOverlay.material.opacity = Math.max(0, Math.min(0.75, progress * 0.8));
    }

    findMidfieldPlatform() {
        if (!this.level || !Array.isArray(this.level.platforms)) return null;
        const candidates = this.level.platforms.filter((platform) => {
            if (!platform || !platform.bounds) return false;
            if (platform.type === 'wall' || platform.type === 'ladder' || platform.isLadder) return false;
            return platform.bounds.left <= 0 && platform.bounds.right >= 0;
        });
        if (!candidates.length) return null;
        return candidates.reduce((best, platform) => {
            if (!best) return platform;
            return platform.bounds.top > best.bounds.top ? platform : best;
        }, null);
    }
}
