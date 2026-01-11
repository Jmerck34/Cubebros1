export const VISIBILITY_LAYER_MIN = -5;
export const VISIBILITY_LAYER_MAX = 5;
export const VISIBILITY_LAYER_STEP = 1;

export const VISIBILITY_LAYERS = {
    background: -5,
    default: 0,
    foreground: 1
};

export function normalizeVisibilityLayer(value, fallback = VISIBILITY_LAYERS.default) {
    const numeric = Number.isFinite(value) ? Math.round(value) : fallback;
    return Math.min(VISIBILITY_LAYER_MAX, Math.max(VISIBILITY_LAYER_MIN, numeric));
}

export function visibilityLayerToZ(layer, baseZ = 0, step = VISIBILITY_LAYER_STEP) {
    const normalized = normalizeVisibilityLayer(layer);
    return baseZ + normalized * step;
}

export function applyVisibilityLayer(object3d, layer, options = {}) {
    if (!object3d) {
        return normalizeVisibilityLayer(layer, options.fallback);
    }

    const normalized = normalizeVisibilityLayer(layer, options.fallback);
    if (options.applyZ !== false) {
        const step = Number.isFinite(options.step) ? options.step : VISIBILITY_LAYER_STEP;
        const baseZ = Number.isFinite(options.baseZ) ? options.baseZ : object3d.position.z;
        object3d.position.z = baseZ + normalized * step;
    }

    if (!object3d.userData) {
        object3d.userData = {};
    }
    object3d.userData.visibilityLayer = normalized;
    return normalized;
}
