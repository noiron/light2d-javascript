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
    if (option == 1) {
        const r1 = Result(circleSDF(x, y, 0.3, 0.3, 0.1), 2.0);
        const r2 = Result(circleSDF(x, y, 0.3, 0.7, 0.05), 0.8);
        const r3 = Result(circleSDF(x, y, 0.7, 0.5, 0.1), 0.0);
        return unionOp(unionOp(r1, r2), r3);
    }

    const a = Result(circleSDF(x, y, 0.4, 0.5, 0.2), 1);
    const b = Result(circleSDF(x, y, 0.6, 0.5, 0.2), 0.8);

    switch (option) {
        case 'union': 
            return unionOp(a, b);
        case 'intersect':
            return intersectOp(a, b);
        case 'subtract-1':
            return subtractOp(a, b);
        case 'subtract-2':
            return subtractOp(b, a);
        default:
            return unionOp(a, b);
    }
}

const p = [];
const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
const data = imageData;

function generateImage() {
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
