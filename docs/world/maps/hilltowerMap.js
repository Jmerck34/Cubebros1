export const hilltowerMaskConfig = {
    key: 'hilltower',
    url: './assets/maps/hilltower-map.png?v=20260111',
    solidBodyType: 'stone',
    solidPlatformType: 'grass',
    oneWayType: 'grass',
    movingPlatformType: 'grass',
    movingPlatformStatic: false,
    disableMovingPlatforms: false,
    disableTravellers: false,
    autoBounds: true,
    boundsPadding: { x: 2, y: 2 },
    killFloorPadding: 6,
    travelPlatform: null,
    travelSpeed: null,
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
