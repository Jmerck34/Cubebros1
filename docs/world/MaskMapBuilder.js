const COLOR_MAP = {
    solid: '#00FF01',
    oneWay: '#FFEF00',
    ladder: '#CC00FF',
    travel: '#FF0008',
    reference: '#0005FF',
    ignore: '#000000'
};

function hexToRgb(hex) {
    const sanitized = hex.replace('#', '');
    const value = parseInt(sanitized, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
    };
}

function colorKey(r, g, b) {
    return `${r},${g},${b}`;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
    });
}

function getPixel(data, index) {
    return { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] };
}

function floodFill({ data, width, height, startX, startY, matchKey, visited }) {
    const stack = [[startX, startY]];
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;
    visited[startY * width + startX] = true;

    while (stack.length) {
        const [x, y] = stack.pop();
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1]
        ];
        for (const [nx, ny] of neighbors) {
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const idx = ny * width + nx;
            if (visited[idx]) continue;
            const pixelIndex = idx * 4;
            const { r, g, b, a } = getPixel(data, pixelIndex);
            if (a === 0) {
                visited[idx] = true;
                continue;
            }
            if (colorKey(r, g, b) !== matchKey) continue;
            visited[idx] = true;
            stack.push([nx, ny]);
        }
    }

    return { minX, maxX, minY, maxY };
}

function boundsFromPixels({ minX, maxX, minY, maxY }, { originX, originY, pixelsPerUnit }) {
    const left = (minX - originX) / pixelsPerUnit;
    const right = (maxX + 1 - originX) / pixelsPerUnit;
    const top = (originY - minY) / pixelsPerUnit;
    const bottom = (originY - (maxY + 1)) / pixelsPerUnit;
    return {
        left,
        right,
        top,
        bottom,
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        width: right - left,
        height: top - bottom
    };
}

export class MaskMapBuilder {
    static async build(config) {
        if (!config || !config.url) return null;
        const img = await loadImage(config.url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

        const colorToType = new Map();
        Object.entries(COLOR_MAP).forEach(([key, hex]) => {
            const rgb = hexToRgb(hex);
            colorToType.set(colorKey(rgb.r, rgb.g, rgb.b), key);
        });

        const visited = new Array(width * height).fill(false);
        const regions = [];
        const references = [];

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const idx = y * width + x;
                if (visited[idx]) continue;
                const pixelIndex = idx * 4;
                const { r, g, b, a } = getPixel(data, pixelIndex);
                if (a === 0) {
                    visited[idx] = true;
                    continue;
                }
                const key = colorKey(r, g, b);
                const type = colorToType.get(key);
                if (!type || type === 'ignore') {
                    visited[idx] = true;
                    continue;
                }
                const region = floodFill({ data, width, height, startX: x, startY: y, matchKey: key, visited });
                if (type === 'reference') {
                    references.push(region);
                } else {
                    regions.push({ type, region });
                }
            }
        }

        let pixelsPerUnit = config.pixelsPerUnit || 10;
        if (references.length) {
            const largest = references.reduce((best, current) => {
                const area = (current.maxX - current.minX + 1) * (current.maxY - current.minY + 1);
                if (!best) return { region: current, area };
                return area > best.area ? { region: current, area } : best;
            }, null);
            if (largest && largest.region) {
                const refHeight = largest.region.maxY - largest.region.minY + 1;
                pixelsPerUnit = refHeight || pixelsPerUnit;
            }
        }

        const originX = typeof config.originX === 'number' ? config.originX : width / 2;
        const originY = typeof config.originY === 'number' ? config.originY : height / 2;

        const mapData = {
            key: config.key,
            platforms: [],
            oneWayPlatforms: [],
            ladders: [],
            travellers: [],
            playerSpawns: config.playerSpawns || null,
            flagSpawns: config.flagSpawns || null,
            camera: config.camera || null
        };

        regions.forEach(({ type, region }) => {
            const bounds = boundsFromPixels(region, { originX, originY, pixelsPerUnit });
            if (type === 'solid') {
                mapData.platforms.push({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, type: config.solidType || 'stone' });
            } else if (type === 'oneWay') {
                mapData.oneWayPlatforms.push({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, type: config.oneWayType || 'grass' });
            } else if (type === 'ladder') {
                mapData.ladders.push({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
            } else if (type === 'travel') {
                const horizontal = bounds.width >= bounds.height;
                const start = horizontal
                    ? { x: bounds.left, y: bounds.y }
                    : { x: bounds.x, y: bounds.bottom };
                const end = horizontal
                    ? { x: bounds.right, y: bounds.y }
                    : { x: bounds.x, y: bounds.top };
                mapData.travellers.push({ start, end });
            }
        });

        if (config.autoBounds) {
            const allBounds = [];
            mapData.platforms.forEach((platform) => {
                allBounds.push({
                    left: platform.x - platform.width / 2,
                    right: platform.x + platform.width / 2,
                    top: platform.y + platform.height / 2,
                    bottom: platform.y - platform.height / 2
                });
            });
            mapData.oneWayPlatforms.forEach((platform) => {
                allBounds.push({
                    left: platform.x - platform.width / 2,
                    right: platform.x + platform.width / 2,
                    top: platform.y + platform.height / 2,
                    bottom: platform.y - platform.height / 2
                });
            });
            mapData.ladders.forEach((ladder) => {
                allBounds.push({
                    left: ladder.x - ladder.width / 2,
                    right: ladder.x + ladder.width / 2,
                    top: ladder.y + ladder.height / 2,
                    bottom: ladder.y - ladder.height / 2
                });
            });

            if (allBounds.length) {
                const left = Math.min(...allBounds.map((b) => b.left));
                const right = Math.max(...allBounds.map((b) => b.right));
                const top = Math.max(...allBounds.map((b) => b.top));
                const bottom = Math.min(...allBounds.map((b) => b.bottom));
                const paddingX = config.boundsPadding?.x ?? 2;
                const paddingY = config.boundsPadding?.y ?? 2;
                const cameraHasBounds = Boolean(config.camera && Object.prototype.hasOwnProperty.call(config.camera, 'bounds'));
                if (!cameraHasBounds) {
                    if (!mapData.camera) {
                        mapData.camera = {};
                    }
                    mapData.camera.bounds = {
                        left: left - paddingX,
                        right: right + paddingX,
                        bottom: bottom - paddingY,
                        top: top + paddingY
                    };
                }
                const killPadding = config.killFloorPadding ?? 4;
                mapData.deathY = bottom - killPadding;
            }
        }

        return mapData;
    }
}
