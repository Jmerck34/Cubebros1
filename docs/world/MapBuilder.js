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

        const registerMovingPlatform = (platform, rangeX, rangeY, speed) => {
            if (!platform) return;
            const baseX = Number.isFinite(platform.bounds && platform.bounds.centerX)
                ? platform.bounds.centerX
                : platform.mesh.position.x;
            const baseY = Number.isFinite(platform.bounds && platform.bounds.centerY)
                ? platform.bounds.centerY
                : platform.mesh.position.y;
            const phase = 0;
            if (platform.body && typeof platform.body.setMovable === 'function') {
                platform.body.setMovable(true);
            }
            const originalType = platform.type;
            platform.type = 'moving';
            platform.baseType = platform.baseType || originalType;
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
                const platform = level.addPlatform(platformDef.x, platformDef.y, platformDef.width, platformDef.height, platformDef.type || 'grass');
                const traveller = consumeNearestTraveller({ x: platformDef.x, y: platformDef.y }, availableTravellers);
                if (!traveller) {
                    return;
                }
                const rangeX = (traveller.end.x - traveller.start.x) / 2;
                const rangeY = (traveller.end.y - traveller.start.y) / 2;
                registerMovingPlatform(platform, rangeX, rangeY, travelSpeed);
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
