export const gameTestMap = {
    key: 'game-test',
    platforms: [
        { x: 0, y: -5, width: 40, height: 5, type: 'ground' },
        { x: -8, y: 1.0, width: 6, height: 0.6, type: 'stone' },
        { x: 0, y: 1.0, width: 6, height: 0.6, type: 'stone' },
        { x: 8, y: 1.0, width: 6, height: 0.6, type: 'stone' }
    ],
    playerSpawns: {
        blue: { x: -6, y: -2.0 },
        red: { x: 6, y: -2.0 }
    },
    flagSpawns: {
        blue: { x: -6, y: -2.0 },
        red: { x: 6, y: -2.0 }
    },
    camera: {
        smoothing: 0.1,
        verticalFollowStart: 2.5,
        verticalFollowMaxOffset: 6,
        offset: { x: 0, y: 0, z: 10 },
        bounds: { left: -14, right: 14, bottom: -6, top: 8 },
        zoom: 1
    }
};
