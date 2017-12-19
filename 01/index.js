const WIDTH = 512;
const HEIGHT = 512;
const N = 64;

// 光源的中心位置
let sourceX = 0.5;
let sourceY = 0.5;

const p = [];
for (let y = 0, i = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        // x / W, y / H 后其值被限制在 [0, 1] 之间
        p[i++] = Math.floor(Math.min(sample(x / WIDTH, y / HEIGHT) * 255, 255));
    }
}

function sample(x, y) {
    let sum = 0;
    for (let i = 0; i < N; i++) {
        // 以下为三种不同的采样方式
        // const theta = Math.PI * 2 * Math.random();           // 随机采样
        // const theta = Math.PI * 2 * i / N;                   // 分层采样（stratified sampling）
        const theta = Math.PI * 2 * (i + Math.random()) / N;    // 抖动采样（jittered sampling）

        // trace() 所返回的值是点 (x, y) 从 theta 方向获取的光
        sum += trace(x, y, Math.cos(theta), Math.sin(theta));
    }
    return sum / N;
}

function circleSDF(x, y, cx, cy, r) {
    const ux = x - cx;
    const uy = y - cy;
    return Math.sqrt(ux * ux + uy * uy) - r;
}

function trace(ox, oy, dx, dy) {
    const MAX_STEP = 10;
    const MAX_DISTANCE = 2;
    const EPSILON = 1e-6;

    let t = 0.0;    // t 为步进的距离
    for (let i = 0; i < MAX_STEP && t < MAX_DISTANCE; i++) {
        // 光源中心为 (sourceX, sourceY) 
        // 沿单位向量 (dx, dy) 方向前进，t 表示前进的距离
        const sd = circleSDF(ox + dx * t, oy + dy * t, sourceX, sourceY, 0.1);

        // 此时已到达发光的圆形表面
        if (sd < EPSILON) {
            return 2.0;
        }
        // 继续增加步进的距离
        t += sd;
    }
    return 0.0;
}

const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
const data = imageData;

processImageData(imageData, p);
ctx.putImageData(imageData, 0, 0);

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

function mouseMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    console.log('点击位置', e.clientX, e.clientY);

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 改变光源位置
    sourceX = x / 512;
    sourceY = y / 512;

    for (let y = 0, i = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            p[i++] = Math.floor(Math.min(sample(x / WIDTH, y / HEIGHT) * 255.0, 255.0));
        }
    }
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    processImageData(imageData, p);
    ctx.putImageData(imageData, 0, 0);
}

// 加上以下点击事件后，可改变光源位置
canvas.addEventListener('click', mouseMoveHandler);
