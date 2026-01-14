const COLOR_MAP = {
    solidBody: '#00FF01',
    solidPlatform: '#99FF00',
    oneWay: '#FFEF00',
    movingPlatform: '#F8A900',
    bridge: '#CEFF00',
    explodingBarrel: '#FF7000',
    flagPlateBlue: '#0012FF',
    flagPlateRed: '#FF0037',
    ladder: '#CC00FF',
    travel: '#FF0008',
    killFloor: '#FF8B00',
    reference: '#FF00EA',
    spawnBlue: '#8E00FF',
    spawnRed: '#FF006C',
    spawnNeutral: '#FFFFFF',
    bounce: '#00FFCB',
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

function pixelMatches(data, width, height, x, y, matchKey) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return false;
    }
    const index = (y * width + x) * 4;
    const a = data[index + 3];
    if (a === 0) return false;
    return colorKey(data[index], data[index + 1], data[index + 2]) === matchKey;
}

function extractPixelRuns(region, matchKey, { data, width, height }) {
    const runs = [];
    const active = new Map();
    for (let y = region.minY; y <= region.maxY; y += 1) {
        const rowRuns = [];
        let runStart = null;
        for (let x = region.minX; x <= region.maxX; x += 1) {
            const matches = pixelMatches(data, width, height, x, y, matchKey);
            if (matches && runStart === null) {
                runStart = x;
            } else if (!matches && runStart !== null) {
                rowRuns.push({ startX: runStart, endX: x - 1, y });
                runStart = null;
            }
        }
        if (runStart !== null) {
            rowRuns.push({ startX: runStart, endX: region.maxX, y });
        }

        const nextActive = new Map();
        for (const run of rowRuns) {
            const key = `${run.startX},${run.endX}`;
            const prev = active.get(key);
            if (prev && prev.maxY === run.y - 1) {
                prev.maxY = run.y;
                nextActive.set(key, prev);
            } else {
                const merged = {
                    minX: run.startX,
                    maxX: run.endX,
                    minY: run.y,
                    maxY: run.y
                };
                nextActive.set(key, merged);
            }
        }

        active.forEach((value, key) => {
            if (!nextActive.has(key)) {
                runs.push(value);
            }
        });
        active.clear();
        nextActive.forEach((value, key) => active.set(key, value));
    }

    active.forEach((value) => runs.push(value));
    return runs;
}

function marchingSquares(region, matchKey, { data, width, height }) {
    const segments = [];
    const inside = (x, y) => pixelMatches(data, width, height, x, y, matchKey);

    const addSegment = (x1, y1, x2, y2) => {
        segments.push({ a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
    };

    for (let y = region.minY; y < region.maxY + 1; y += 1) {
        for (let x = region.minX; x < region.maxX + 1; x += 1) {
            const tl = inside(x, y);
            const tr = inside(x + 1, y);
            const br = inside(x + 1, y + 1);
            const bl = inside(x, y + 1);
            const state = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
            if (state === 0 || state === 15) continue;

            const xMid = x + 0.5;
            const yMid = y + 0.5;
            const top = { x: xMid, y };
            const right = { x: x + 1, y: yMid };
            const bottom = { x: xMid, y: y + 1 };
            const left = { x, y: yMid };

            switch (state) {
                case 1:
                    addSegment(left.x, left.y, bottom.x, bottom.y);
                    break;
                case 2:
                    addSegment(bottom.x, bottom.y, right.x, right.y);
                    break;
                case 3:
                    addSegment(left.x, left.y, right.x, right.y);
                    break;
                case 4:
                    addSegment(top.x, top.y, right.x, right.y);
                    break;
                case 5:
                    addSegment(top.x, top.y, left.x, left.y);
                    addSegment(bottom.x, bottom.y, right.x, right.y);
                    break;
                case 6:
                    addSegment(top.x, top.y, bottom.x, bottom.y);
                    break;
                case 7:
                    addSegment(top.x, top.y, left.x, left.y);
                    break;
                case 8:
                    addSegment(left.x, left.y, top.x, top.y);
                    break;
                case 9:
                    addSegment(bottom.x, bottom.y, top.x, top.y);
                    break;
                case 10:
                    addSegment(left.x, left.y, bottom.x, bottom.y);
                    addSegment(top.x, top.y, right.x, right.y);
                    break;
                case 11:
                    addSegment(right.x, right.y, top.x, top.y);
                    break;
                case 12:
                    addSegment(right.x, right.y, left.x, left.y);
                    break;
                case 13:
                    addSegment(right.x, right.y, bottom.x, bottom.y);
                    break;
                case 14:
                    addSegment(bottom.x, bottom.y, left.x, left.y);
                    break;
                default:
                    break;
            }
        }
    }

    return segments;
}

function connectSegments(segments) {
    const keyFor = (point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
    const adjacency = new Map();
    const pointMap = new Map();

    segments.forEach((seg) => {
        const aKey = keyFor(seg.a);
        const bKey = keyFor(seg.b);
        if (!adjacency.has(aKey)) adjacency.set(aKey, []);
        if (!adjacency.has(bKey)) adjacency.set(bKey, []);
        adjacency.get(aKey).push(bKey);
        adjacency.get(bKey).push(aKey);
        if (!pointMap.has(aKey)) pointMap.set(aKey, seg.a);
        if (!pointMap.has(bKey)) pointMap.set(bKey, seg.b);
    });

    const loops = [];
    const visitedEdges = new Set();

    const edgeKey = (a, b) => `${a}|${b}`;

    for (const [startKey] of adjacency) {
        const neighbors = adjacency.get(startKey);
        if (!neighbors || neighbors.length === 0) continue;
        for (const nextKey of neighbors) {
            const eKey = edgeKey(startKey, nextKey);
            if (visitedEdges.has(eKey)) continue;

            const loop = [];
            let currentKey = startKey;
            let prevKey = null;
            while (true) {
                loop.push(pointMap.get(currentKey));
                const options = adjacency.get(currentKey) || [];
                let next = options[0];
                if (prevKey && options.length > 1) {
                    next = options.find((key) => key !== prevKey) || options[0];
                }
                if (!next) break;
                visitedEdges.add(edgeKey(currentKey, next));
                visitedEdges.add(edgeKey(next, currentKey));
                prevKey = currentKey;
                currentKey = next;
                if (currentKey === startKey) {
                    break;
                }
            }
            if (loop.length >= 3) {
                loops.push(loop);
            }
        }
    }

    return loops;
}

function polygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        area += a.x * b.y - b.x * a.y;
    }
    return area * 0.5;
}

function triangulatePolygon(points) {
    if (points.length < 3) return [];
    const triangles = [];
    const verts = points.map((p) => ({ x: p.x, y: p.y }));
    const indices = [...verts.keys()];
    const isClockwise = polygonArea(verts) < 0;
    const sign = isClockwise ? -1 : 1;

    const isConvex = (prev, curr, next) => {
        const ax = curr.x - prev.x;
        const ay = curr.y - prev.y;
        const bx = next.x - curr.x;
        const by = next.y - curr.y;
        const cross = ax * by - ay * bx;
        return cross * sign >= 0;
    };

    const pointInTriangle = (p, a, b, c) => {
        const area = (p1, p2, p3) => (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
        const a1 = area(p, a, b);
        const a2 = area(p, b, c);
        const a3 = area(p, c, a);
        const hasNeg = (a1 < 0) || (a2 < 0) || (a3 < 0);
        const hasPos = (a1 > 0) || (a2 > 0) || (a3 > 0);
        return !(hasNeg && hasPos);
    };

    let guard = 0;
    while (indices.length > 3 && guard < 10000) {
        guard += 1;
        let earFound = false;
        for (let i = 0; i < indices.length; i += 1) {
            const prevIndex = indices[(i - 1 + indices.length) % indices.length];
            const currIndex = indices[i];
            const nextIndex = indices[(i + 1) % indices.length];
            const prev = verts[prevIndex];
            const curr = verts[currIndex];
            const next = verts[nextIndex];
            if (!isConvex(prev, curr, next)) continue;
            let hasPointInside = false;
            for (let j = 0; j < indices.length; j += 1) {
                const testIndex = indices[j];
                if (testIndex === prevIndex || testIndex === currIndex || testIndex === nextIndex) continue;
                if (pointInTriangle(verts[testIndex], prev, curr, next)) {
                    hasPointInside = true;
                    break;
                }
            }
            if (hasPointInside) continue;
            triangles.push([prev, curr, next]);
            indices.splice(i, 1);
            earFound = true;
            break;
        }
        if (!earFound) break;
    }
    if (indices.length === 3) {
        triangles.push([verts[indices[0]], verts[indices[1]], verts[indices[2]]]);
    }
    return triangles;
}

function toWorld(point, { originX, originY, pixelsPerUnit }) {
    return {
        x: (point.x - originX) / pixelsPerUnit,
        y: (originY - point.y) / pixelsPerUnit
    };
}

function getPolygonBounds(points) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
        left: Math.min(...xs),
        right: Math.max(...xs),
        bottom: Math.min(...ys),
        top: Math.max(...ys)
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
        const spawnRegions = { blue: [], red: [], neutral: [] };
        const killFloors = [];

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
                } else if (type === 'spawnBlue') {
                    spawnRegions.blue.push(region);
                } else if (type === 'spawnRed') {
                    spawnRegions.red.push(region);
                } else if (type === 'spawnNeutral') {
                    if (config.disableNeutralSpawns) {
                        visited[idx] = true;
                        continue;
                    }
                    spawnRegions.neutral.push(region);
                } else if (type === 'killFloor') {
                    killFloors.push(region);
                } else {
                    regions.push({ type, region, matchKey: key });
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
            movingPlatforms: [],
            bridges: [],
            explodingBarrels: [],
            flagPlates: [],
            ladders: [],
            travellers: [],
            playerSpawns: config.playerSpawns || null,
            flagSpawns: config.flagSpawns || null,
            camera: config.camera || null,
            travelPlatform: config.travelPlatform || null,
            travelSpeed: config.travelSpeed || null
        };

        const solidBodyShape = config.solidBodyShape || 'polygon';
        const polygonMaxSegments = Number.isFinite(config.polygonMaxSegments) ? config.polygonMaxSegments : 4000;
        const polygonMaxVertices = Number.isFinite(config.polygonMaxVertices) ? config.polygonMaxVertices : 1200;
        regions.forEach(({ type, region, matchKey }) => {
            const bounds = boundsFromPixels(region, { originX, originY, pixelsPerUnit });
            if (type === 'solidBody') {
                if (solidBodyShape === 'pixelRuns') {
                    const runs = extractPixelRuns(region, matchKey, { data, width, height });
                    runs.forEach((run) => {
                        const runBounds = boundsFromPixels(run, { originX, originY, pixelsPerUnit });
                        mapData.platforms.push({
                            x: runBounds.x,
                            y: runBounds.y,
                            width: runBounds.width,
                            height: runBounds.height,
                            type: config.solidBodyType || config.solidType || 'stone',
                            noMerge: true
                        });
                    });
                } else if (solidBodyShape === 'polygon') {
                    const segments = marchingSquares(region, matchKey, { data, width, height });
                    if (segments.length > polygonMaxSegments) {
                        const runs = extractPixelRuns(region, matchKey, { data, width, height });
                        runs.forEach((run) => {
                            const runBounds = boundsFromPixels(run, { originX, originY, pixelsPerUnit });
                            mapData.platforms.push({
                                x: runBounds.x,
                                y: runBounds.y,
                                width: runBounds.width,
                                height: runBounds.height,
                                type: config.solidBodyType || config.solidType || 'stone',
                                noMerge: true
                            });
                        });
                        return;
                    }
                    const loops = connectSegments(segments);
                    let built = false;
                    loops.forEach((loop) => {
                        if (loop.length > polygonMaxVertices) {
                            return;
                        }
                        const worldPoints = loop.map((p) => toWorld(p, { originX, originY, pixelsPerUnit }));
                        const triangles = triangulatePolygon(worldPoints);
                        if (!triangles.length) return;
                        const bounds = getPolygonBounds(worldPoints);
                        mapData.platforms.push({
                            x: (bounds.left + bounds.right) / 2,
                            y: (bounds.top + bounds.bottom) / 2,
                            width: bounds.right - bounds.left,
                            height: bounds.top - bounds.bottom,
                            type: config.solidBodyType || config.solidType || 'stone',
                            collisionShape: {
                                type: 'polygon',
                                bounds,
                                triangles
                            },
                            noMerge: true
                        });
                        built = true;
                    });
                    if (!built) {
                        const runs = extractPixelRuns(region, matchKey, { data, width, height });
                        runs.forEach((run) => {
                            const runBounds = boundsFromPixels(run, { originX, originY, pixelsPerUnit });
                            mapData.platforms.push({
                                x: runBounds.x,
                                y: runBounds.y,
                                width: runBounds.width,
                                height: runBounds.height,
                                type: config.solidBodyType || config.solidType || 'stone',
                                noMerge: true
                            });
                        });
                    }
                } else {
                    mapData.platforms.push({
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.width,
                        height: bounds.height,
                        type: config.solidBodyType || config.solidType || 'stone'
                    });
                }
            } else if (type === 'solidPlatform') {
                mapData.platforms.push({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    type: config.solidPlatformType || config.solidType || 'grass'
                });
            } else if (type === 'oneWay') {
                mapData.oneWayPlatforms.push({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, type: config.oneWayType || 'grass' });
            } else if (type === 'bridge') {
                mapData.bridges.push({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    type: config.bridgeType || config.oneWayType || 'rope'
                });
            } else if (type === 'explodingBarrel') {
                mapData.explodingBarrels.push({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height
                });
            } else if (type === 'flagPlateBlue') {
                mapData.flagPlates.push({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    team: 'blue'
                });
            } else if (type === 'flagPlateRed') {
                mapData.flagPlates.push({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    team: 'red'
                });
            } else if (type === 'movingPlatform') {
                if (config.movingPlatformStatic) {
                    mapData.platforms.push({
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.width,
                        height: bounds.height,
                        type: config.movingPlatformType || config.solidPlatformType || config.solidType || 'grass'
                    });
                    return;
                }
                if (config.disableMovingPlatforms) {
                    return;
                }
                mapData.movingPlatforms.push({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    type: config.movingPlatformType || config.solidPlatformType || config.solidType || 'grass'
                });
            } else if (type === 'bounce') {
                if (config.disableBounce) {
                    return;
                }
                mapData.platforms.push({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    type: config.bounceType || 'launcher'
                });
            } else if (type === 'ladder') {
                mapData.ladders.push({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
            } else if (type === 'travel') {
                if (config.disableTravellers) {
                    return;
                }
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

        if (config.mergeSolids && mapData.platforms.length) {
            const gap = Number.isFinite(config.mergeSolids.gap) ? config.mergeSolids.gap : 0.4;
            const heightTolerance = Number.isFinite(config.mergeSolids.heightTolerance) ? config.mergeSolids.heightTolerance : 0.15;
            const byRow = [...mapData.platforms].sort((a, b) => (a.y - b.y) || (a.x - b.x));
            const merged = [];
            for (const platform of byRow) {
                if (platform.noMerge) {
                    merged.push({ ...platform });
                    continue;
                }
                const left = platform.x - platform.width / 2;
                const right = platform.x + platform.width / 2;
                const top = platform.y + platform.height / 2;
                const bottom = platform.y - platform.height / 2;
                let didMerge = false;
                for (const target of merged) {
                    if (target.noMerge) continue;
                    if (target.type !== platform.type) continue;
                    const tLeft = target.x - target.width / 2;
                    const tRight = target.x + target.width / 2;
                    const tTop = target.y + target.height / 2;
                    const tBottom = target.y - target.height / 2;
                    if (Math.abs(tTop - top) > heightTolerance || Math.abs(tBottom - bottom) > heightTolerance) {
                        continue;
                    }
                    const gapDistance = Math.min(Math.abs(left - tRight), Math.abs(tLeft - right));
                    const overlaps = !(right < tLeft - gap || left > tRight + gap);
                    if (!overlaps || gapDistance > gap) continue;
                    const mergedLeft = Math.min(left, tLeft);
                    const mergedRight = Math.max(right, tRight);
                    const mergedTop = (tTop + top) / 2;
                    const mergedBottom = (tBottom + bottom) / 2;
                    target.x = (mergedLeft + mergedRight) / 2;
                    target.y = (mergedTop + mergedBottom) / 2;
                    target.width = mergedRight - mergedLeft;
                    target.height = mergedTop - mergedBottom;
                    didMerge = true;
                    break;
                }
                if (!didMerge) {
                    merged.push({ ...platform });
                }
            }
            mapData.platforms = merged;
        }

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
            mapData.movingPlatforms.forEach((platform) => {
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
                const paddingX = config.boundsPadding && Number.isFinite(config.boundsPadding.x) ? config.boundsPadding.x : 2;
                const paddingY = config.boundsPadding && Number.isFinite(config.boundsPadding.y) ? config.boundsPadding.y : 2;
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
                if (!Number.isFinite(mapData.deathY)) {
                    const killPadding = Number.isFinite(config.killFloorPadding) ? config.killFloorPadding : 4;
                    mapData.deathY = bottom - killPadding;
                }
            }
        }

        if (!mapData.playerSpawns) {
            const pickLargest = (items) => {
                if (!items.length) return null;
                return items.reduce((best, current) => {
                    const area = (current.maxX - current.minX + 1) * (current.maxY - current.minY + 1);
                    if (!best) return { region: current, area };
                    return area > best.area ? { region: current, area } : best;
                }, null);
            };
            const blue = pickLargest(spawnRegions.blue);
            const red = pickLargest(spawnRegions.red);
            const neutral = config.disableNeutralSpawns ? null : pickLargest(spawnRegions.neutral);
            if (blue || red || neutral) {
                mapData.playerSpawns = {};
                if (neutral && neutral.region) {
                    const bounds = boundsFromPixels(neutral.region, { originX, originY, pixelsPerUnit });
                    mapData.playerSpawns.neutral = { x: bounds.x, y: bounds.y };
                }
                if (blue && blue.region) {
                    const bounds = boundsFromPixels(blue.region, { originX, originY, pixelsPerUnit });
                    mapData.playerSpawns.blue = { x: bounds.x, y: bounds.y };
                }
                if (red && red.region) {
                    const bounds = boundsFromPixels(red.region, { originX, originY, pixelsPerUnit });
                    mapData.playerSpawns.red = { x: bounds.x, y: bounds.y };
                }
                if (neutral && neutral.region) {
                    if (!mapData.playerSpawns.blue) {
                        mapData.playerSpawns.blue = { ...mapData.playerSpawns.neutral };
                    }
                    if (!mapData.playerSpawns.red) {
                        mapData.playerSpawns.red = { ...mapData.playerSpawns.neutral };
                    }
                }
            }
        }

        if (killFloors.length) {
            const floorYs = killFloors.map((region) => {
                const bounds = boundsFromPixels(region, { originX, originY, pixelsPerUnit });
                return bounds.y;
            });
            const lowest = Math.min(...floorYs);
            mapData.deathY = lowest;
        }

        return mapData;
    }
}
