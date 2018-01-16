const WIDTH = 512;
const HEIGHT = 512;
const N = 64;

const selectEl = document.getElementsByTagName('select')[0];
selectEl.addEventListener('change', handleOptionChange);
let option = selectEl.value;

function Result(signedDistance, emissive) {
    return {
        sd: signedDistance,     // 带符号距离
        emissive                // 自发光强度
    }
};

function circleSDF(x, y, cx, cy, r) {
    const ux = x - cx;
    const uy = y - cy;
    return Math.sqrt(ux * ux + uy * uy) - r;
}

/**
 * 点 p(px, py) 为平面上的一点
 * (nx, ny) 为平面的法向量，且为单位向量
 */
function planeSDF(x, y, px, py, nx, ny) {
    return (x - px) * nx + (y - py) * ny;
}

/**
 * (x, y) 至线段 ab 的距离
 */
function segmentSDF(x, y, ax, ay, bx, by) {
    const vx = x - ax;
    const vy = y - ay;
    const ux = bx - ax;
    const uy = by - ay;

    const t = Math.max(Math.min((vx * ux + vy * uy) / (ux * ux + uy * uy), 1), 0);

    const dx = vx - ux * t;
    const dy = vy - uy * t;

    return Math.sqrt(dx * dx + dy * dy);
}

function capsuleSDF(x, y, ax, ay, bx, by, r) {
    return segmentSDF(x, y, ax, ay, bx, by) - r;
}

/**
 * (x, y) 至矩形的距离
 * theta 为矩形顺时针方向旋转的角度
 * sx, sy 分别为矩形长和宽的一半
 */
function boxSDF(x, y, cx, cy, theta, sx, sy) {
    const costheta = Math.cos(theta);
    const sintheta = Math.sin(theta);

    const dx = Math.abs((x - cx) * costheta + (y - cy) * sintheta) - sx;
    const dy = Math.abs((y - cy) * costheta - (x - cx) * sintheta) - sy;
    
    const ax = Math.max(dx, 0);
    const ay = Math.max(dy, 0);

    // 需要根据点在矩形的内外分别计算距离：
    // 如果点在矩形的内部，此时 dx < 0, dy < 0 => ax = 0, ay = 0
    // 以下表达式的第二项为0
    // 如果点在矩形的外部，则第一项为0
    return Math.min(Math.max(dx, dy), 0) + Math.sqrt(ax * ax + ay * ay);
}

function triangleSDF(x, y, ax, ay, bx, by, cx, cy) {
    const d = Math.min(
        Math.min(
            segmentSDF(x, y, ax, ay, bx, by),
            segmentSDF(x, y, bx, by, cx, cy)
        ), segmentSDF(x, y, cx, cy, ax, ay)
    );

    return (bx -ax) * (y - ay) > (by - ay) * (x - ax) &&
        (cx - bx) * (y - by) > (cy - by) * (x - bx) &&
        (ax - cx) * (y - cy) > (ay - cy) * (x - cx) ? -d : d;
}

function unionOp(a, b) {
    const result = a.sd < b.sd ? a : b;
    return result;
}

function intersectOp(a, b) {
    const r = a.sd > b.sd ? b : a;
    r.sd = a.sd > b.sd ? a.sd : b.sd;
    return r;
}

function subtractOp(a, b) {
    const r = a;
    r.sd = (a.sd > -b.sd) ? a.sd : -b.sd;
    return r;
}

function complementOp(a) {
    a.sd = -a.sd;
    return a;
}

function scene(x, y) {
    const a = Result(circleSDF(x, y, 0.4, 0.5, 0.2), 1);
    const b = Result(circleSDF(x, y, 0.6, 0.5, 0.2), 0.8);

    switch (option) {
        case 'capsule':
            const c = Result( capsuleSDF(x, y, 0.4, 0.4, 0.6, 0.6, 0.1), 1 );
            return c;

        case 'box':
            const d = Result(boxSDF(x, y, 0.5, 0.5, Math.PI * 2 / 16, 0.3, 0.1), 1);
            return d;
        
        case 'rounded-box':
            const e = Result(boxSDF(x, y, 0.5, 0.5, Math.PI * 2 / 16, 0.3, 0.1) - 0.1, 1);
            return e;

        case 'triangle':
            return Result(triangleSDF(x, y, 0.5, 0.2, 0.8, 0.8, 0.3, 0.6), 1);

        case 'rounded-triangle':
            return Result(triangleSDF(x, y, 0.5, 0.2, 0.8, 0.8, 0.3, 0.6) - 0.1, 1);
            
        default:
            return unionOp(a, b);
    }
}


function generateImage() {
    const p = [];
    const canvas = document.getElementsByTagName('canvas')[0];
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    
    for (let y = 0, i = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            p[i++] = Math.floor(Math.min(sample(x / WIDTH, y / HEIGHT) * 255, 255));
        }
    }

    processImageData(imageData, p);
    ctx.putImageData(imageData, 0, 0);
}
generateImage();

function sample(x, y) {
    let sum = 0;
    for (let i = 0; i < N; i++) {
        // 抖动采样（jittered sampling）
        const theta = Math.PI * 2 * (i + Math.random()) / N;    

        // trace() 所返回的值是点 (x, y) 从 theta 方向获取的光
        sum += trace(x, y, Math.cos(theta), Math.sin(theta));
    }
    return sum / N;
}

function trace(ox, oy, dx, dy) {
    const MAX_STEP = 64;
    const MAX_DISTANCE = 2;
    const EPSILON = 1e-6;

    let t = 0.001;
    for (let i = 0; i < MAX_STEP && t < MAX_DISTANCE; i++) {
        // 沿单位向量 (dx, dy) 方向前进，t 表示前进的距离
        const r = scene(ox + dx * t, oy + dy * t);

        if (r.sd < EPSILON) {
            return r.emissive;
        }
        // 继续增加步进的距离
        t += r.sd;
    }
    return 0.0;
}

function processImageData(imageData, p) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const value = p[i / 4];
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
    }
}

function handleOptionChange(e) {
    console.log(e.target.value);
    option = e.target.value;
    setTimeout(() => generateImage(), 0);
}
