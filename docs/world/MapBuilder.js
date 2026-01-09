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

        if (Array.isArray(mapData.travellers)) {
            level.travellers = mapData.travellers.map((traveller) => ({ ...traveller }));
            const platformConfig = mapData.travelPlatform || { width: 3, height: 0.6, type: 'stone' };
            const speed = Number.isFinite(mapData.travelSpeed) ? mapData.travelSpeed : 1.0;
            level.travellers.forEach((traveller) => {
                if (!traveller || !traveller.start || !traveller.end) return;
                const baseX = (traveller.start.x + traveller.end.x) / 2;
                const baseY = (traveller.start.y + traveller.end.y) / 2;
                const rangeX = (traveller.end.x - traveller.start.x) / 2;
                const rangeY = (traveller.end.y - traveller.start.y) / 2;
                if (typeof level.addMovingPlatform === 'function') {
                    level.addMovingPlatform(
                        baseX,
                        baseY,
                        platformConfig.width,
                        platformConfig.height,
                        platformConfig.type || 'stone',
                        { rangeX, rangeY, speed }
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
