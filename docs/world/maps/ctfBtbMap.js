export const ctfBtbMaskConfig = {
    key: 'ctf-btb',
    url: './assets/maps/ctf-btb-map.png?v=20260113',
    solidBodyType: 'stone',
    solidBodyShape: 'pixelRuns',
    solidPlatformType: 'grass',
    oneWayType: 'grass',
    movingPlatformType: 'grass',
    bounceType: 'launcher',
    disableNeutralSpawns: false,
    disableBounce: false,
    autoBounds: true,
    boundsPadding: { x: 2, y: 2 },
    killFloorPadding: 6,
    travelSpeed: 1.0,
    mergeSolids: {
        gap: 0.6,
        heightTolerance: 0.2
    },
    camera: {
        smoothing: 0.1,
        followVertical: true,
        verticalFollowStart: 0,
        verticalFollowMaxOffset: 30,
        offset: { x: 0, y: 0, z: 10 },
        zoom: 1,
        bounds: null
    },
    flagSpawnsFromPlayerSpawns: true
};
