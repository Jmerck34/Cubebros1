export const bowlMaskConfig = {
    key: 'bowl',
    url: './assets/maps/bowl-map.png?v=20260112',
    solidBodyType: 'stone',
    solidPlatformType: 'grass',
    oneWayType: 'grass',
    movingPlatformType: 'grass',
    bounceType: 'launcher',
    disableNeutralSpawns: true,
    disableBounce: true,
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
    }
};
