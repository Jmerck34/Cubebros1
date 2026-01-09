/**
 * MapBuilder - Builds Level geometry from map data.
 */
export class MapBuilder {
    static build(level, mapData) {
        if (!level || !mapData) return;
        const platforms = mapData.platforms || [];
        platforms.forEach((platform) => {
            if (!platform) return;
            const { x, y, width, height, type = 'grass' } = platform;
            level.addPlatform(x, y, width, height, type);
        });

        const oneWayPlatforms = mapData.oneWayPlatforms || [];
        oneWayPlatforms.forEach((platform) => {
            if (!platform || typeof level.addOneWayPlatform !== 'function') return;
            const { x, y, width, height, type = 'grass' } = platform;
            level.addOneWayPlatform(x, y, width, height, type);
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
            const baseX = (traveller.start.x + traveller.end.x) / 2;
            const baseY = (traveller.start.y + traveller.end.y) / 2;
            const rangeX = (traveller.end.x - traveller.start.x) / 2;
            const rangeY = (traveller.end.y - traveller.start.y) / 2;
            const phase = 0;
            if (platform.body && typeof platform.body.setMovable === 'function') {
                platform.body.setMovable(true);
            }
            const originalType = platform.type;
            platform.type = 'moving';
            platform.baseType = platform.baseType || originalType;
            if (platform.mesh && platform.bounds) {
                const width = platform.bounds.right - platform.bounds.left;
                const height = platform.bounds.top - platform.bounds.bottom;
                platform.mesh.position.set(baseX, baseY, 0);
                platform.bounds.left = baseX - width / 2;
                platform.bounds.right = baseX + width / 2;
                platform.bounds.top = baseY + height / 2;
                platform.bounds.bottom = baseY - height / 2;
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
        const movingOneWayPlatforms = mapData.movingOneWayPlatforms || [];
        if (movingOneWayPlatforms.length) {
            movingOneWayPlatforms.forEach((platformDef) => {
                if (!platformDef || typeof level.addOneWayPlatform !== 'function') return;
                const platform = level.addOneWayPlatform(platformDef.x, platformDef.y, platformDef.width, platformDef.height, platformDef.type || 'grass');
                const traveller = consumeNearestTraveller({ x: platformDef.x, y: platformDef.y }, availableTravellers);
                if (traveller) {
                    registerMovingPlatform(platform, traveller, travelSpeed);
                }
            });
        }

        if (availableTravellers.length) {
            const platformConfig = mapData.travelPlatform || { width: 3, height: 0.6, type: 'stone' };
            availableTravellers.forEach((traveller) => {
                if (!traveller || !traveller.start || !traveller.end) return;
                if (typeof level.addMovingPlatform === 'function') {
                    level.addMovingPlatform(
                        (traveller.start.x + traveller.end.x) / 2,
                        (traveller.start.y + traveller.end.y) / 2,
                        platformConfig.width,
                        platformConfig.height,
                        platformConfig.type || 'stone',
                        {
                            rangeX: (traveller.end.x - traveller.start.x) / 2,
                            rangeY: (traveller.end.y - traveller.start.y) / 2,
                            speed: travelSpeed
                        }
                    );
                }
            });
        }

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
