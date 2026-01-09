export const hilltowerMaskConfig = {
    key: 'hilltower',
    url: './assets/maps/hilltower-map.png',
    solidType: 'stone',
    oneWayType: 'grass',
    autoBounds: true,
    boundsPadding: { x: 2, y: 2 },
    killFloorPadding: 6,
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
