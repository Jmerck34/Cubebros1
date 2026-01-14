/**
 * MapBuilder - Builds Level geometry from map data.
 */
export class MapBuilder {
    static build(level, mapData) {
        if (!level || !mapData) return;
        const platforms = mapData.platforms || [];
        platforms.forEach((platform) => {
            if (!platform) return;
            const { x, y, width, height, type = 'grass', collisionShape = null } = platform;
            level.addPlatform(x, y, width, height, type, { collisionShape });
        });

        const oneWayPlatforms = mapData.oneWayPlatforms || [];
        oneWayPlatforms.forEach((platform) => {
            if (!platform || typeof level.addOneWayPlatform !== 'function') return;
            const { x, y, width, height, type = 'grass' } = platform;
            level.addOneWayPlatform(x, y, width, height, type);
        });

        const bridges = mapData.bridges || [];
        bridges.forEach((bridge) => {
            if (!bridge) return;
            const { x, y, width, height } = bridge;
            const type = 'rope';
            const platform = typeof level.addOneWayPlatform === 'function'
                ? level.addOneWayPlatform(x, y, width, height, type)
                : level.addPlatform(x, y, width, height, type);
            if (!platform) return;
            platform.breakable = true;
            platform.breakState = 'idle';
            platform.breakDelay = bridge.breakDelay != null ? bridge.breakDelay : 0.25;
            platform.respawnDelay = bridge.respawnDelay != null ? bridge.respawnDelay : 5;
            platform.breakTimer = 0;
            platform.respawnTimer = 0;
            platform.disabled = false;
            platform.shakeTime = 0;
            platform.isBridge = true;
        });

        const explodingBarrels = mapData.explodingBarrels || [];
        explodingBarrels.forEach((barrel) => {
            if (!barrel || typeof level.addExplodingBarrel !== 'function') return;
            const { x, y, width, height } = barrel;
            level.addExplodingBarrel(x, y, width, height);
        });

        const flagPlates = mapData.flagPlates || [];
        flagPlates.forEach((plate) => {
            if (!plate || typeof level.addFlagPlate !== 'function') return;
            const { x, y, width, height, team } = plate;
            level.addFlagPlate(x, y, width, height, team);
        });

        const ladders = mapData.ladders || [];
        ladders.forEach((ladder) => {
            if (!ladder || typeof level.addLadderZone !== 'function') return;
            const { x, y, width, height } = ladder;
            level.addLadderZone(x, y, width, height);
        });

        const travellers = Array.isArray(mapData.travellers)
            ? mapData.travellers.map((traveller) => ({ ...traveller }))
            : [];
        level.travellers = travellers;
        const travelSpeed = Number.isFinite(mapData.travelSpeed) ? mapData.travelSpeed : 1.0;

        const distanceToSegment = (point, segment) => {
            const ax = segment.start.x;
            const ay = segment.start.y;
            const bx = segment.end.x;
            const by = segment.end.y;
            const vx = bx - ax;
            const vy = by - ay;
            const wx = point.x - ax;
            const wy = point.y - ay;
            const lengthSq = (vx * vx + vy * vy) || 1;
            let t = (wx * vx + wy * vy) / lengthSq;
            t = Math.max(0, Math.min(1, t));
            const px = ax + t * vx;
            const py = ay + t * vy;
            const dx = point.x - px;
            const dy = point.y - py;
            return Math.hypot(dx, dy);
        };

        const consumeNearestTraveller = (point, available) => {
            if (!available.length) return null;
            let bestIndex = 0;
            let bestDistance = Infinity;
            for (let i = 0; i < available.length; i += 1) {
                const traveller = available[i];
                if (!traveller || !traveller.start || !traveller.end) continue;
                const distance = distanceToSegment(point, traveller);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = i;
                }
            }
            const [picked] = available.splice(bestIndex, 1);
            return picked || null;
        };

        const registerMovingPlatform = (platform, traveller, speed) => {
            if (!platform || !traveller || !traveller.start || !traveller.end) return;
            const originX = Number.isFinite(platform.bounds && platform.bounds.centerX)
                ? platform.bounds.centerX
                : platform.mesh.position.x;
            const originY = Number.isFinite(platform.bounds && platform.bounds.centerY)
                ? platform.bounds.centerY
                : platform.mesh.position.y;
            const startX = traveller.start.x;
            const startY = traveller.start.y;
            const endX = traveller.end.x;
            const endY = traveller.end.y;
            const dx = endX - startX;
            const dy = endY - startY;
            const moveHorizontal = Math.abs(dx) >= Math.abs(dy);
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            const minY = Math.min(startY, endY);
            const maxY = Math.max(startY, endY);
            const baseX = moveHorizontal ? (minX + maxX) / 2 : originX;
            const baseY = moveHorizontal ? originY : (minY + maxY) / 2;
            let rangeX = moveHorizontal ? (maxX - minX) / 2 : 0;
            let rangeY = moveHorizontal ? 0 : (maxY - minY) / 2;
            if (platform.body && typeof platform.body.setMovable === 'function') {
                platform.body.setMovable(true);
            }
            const originalType = platform.type;
            platform.type = 'moving';
            platform.baseType = platform.baseType || originalType;
            if (platform.bounds) {
                const halfW = (platform.bounds.right - platform.bounds.left) / 2;
                const halfH = (platform.bounds.top - platform.bounds.bottom) / 2;
                if (moveHorizontal) {
                    rangeX = Math.max(0, rangeX - halfW);
                } else {
                    rangeY = Math.max(0, rangeY - halfH);
                }
            }
            let phase = 0;
            if (moveHorizontal && rangeX > 0) {
                const offsetX = Math.max(-rangeX, Math.min(rangeX, originX - baseX));
                phase = Math.asin(offsetX / rangeX);
            } else if (!moveHorizontal && rangeY > 0) {
                const offsetY = Math.max(-rangeY, Math.min(rangeY, originY - baseY));
                phase = Math.asin(offsetY / rangeY);
            }
            level.movingPlatforms.push({
                platform,
                baseX,
                baseY,
                rangeX,
                rangeY,
                speed,
                phase,
                time: 0
            });
        };

        const availableTravellers = travellers.slice();
        const movingPlatforms = mapData.movingPlatforms || [];
        if (movingPlatforms.length) {
            movingPlatforms.forEach((platformDef) => {
                if (!platformDef) return;
                const platform = typeof level.addOneWayPlatform === 'function'
                    ? level.addOneWayPlatform(platformDef.x, platformDef.y, platformDef.width, platformDef.height, platformDef.type || 'grass')
                    : level.addPlatform(platformDef.x, platformDef.y, platformDef.width, platformDef.height, platformDef.type || 'grass');
                const traveller = consumeNearestTraveller({ x: platformDef.x, y: platformDef.y }, availableTravellers);
                if (!traveller) {
                    return;
                }
                registerMovingPlatform(platform, traveller, travelSpeed);
            });
        }

        // Travellers only define motion for explicit moving platforms.

        if (mapData.playerSpawns) {
            level.playerSpawns = { ...mapData.playerSpawns };
        }
        if (mapData.flagSpawns) {
            level.flagSpawns = { ...mapData.flagSpawns };
        }
        if (mapData.camera) {
            level.cameraConfig = { ...mapData.camera };
        }
        if (Number.isFinite(mapData.deathY)) {
            level.deathY = mapData.deathY;
        }
    }
}
