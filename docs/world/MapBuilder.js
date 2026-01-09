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
