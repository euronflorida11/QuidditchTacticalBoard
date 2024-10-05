const canvas = document.getElementById('tacticalBoard');
const ctx = canvas.getContext('2d');
const resetButton = document.getElementById('reset');
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');

let dragging = false;
let dragStart = { x: 0, y: 0 };
let draggedItem = null;
let history = [];
let redoStack = [];
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;


// ボールとプレイヤーのサイズは半分に設定
const playerScale = 0.95; // プレイヤーのサイズスケール
const ballScale = 0.95;   // ボールのサイズスケール

// テーマカラーの定義
const colors = {
    background: '#1E2A38', // 全体背景色
    container: '#A0D1A0',  // コートの背景色（薄い緑）
    grid: '#34495e',       // グリッド線
    court: '#F2F0F5',      // コートの線とプレイヤー名
    goals: '#FFFFFF',      // ゴールの色（白）
    ball: {
        quaffle: '#FFA500',  // クアッフル（オレンジ）
        bludger: '#8B4513',  // ブラッジャー（ブラウン）
        snitch: '#F5C242'    // スニッチ（黄色）
    },
    player: {
        team1: ['#507DBC', '#688EBD', '#A3BCE2'], // チーム1のプレイヤーカラー（青系）
        team2: ['#E56B70', '#F6A4B4', '#F2C6D0']  // チーム2のプレイヤーカラー（ピンク系）
    },
    lines: '#F27878' // ライン（描画モード）の色

};

// チーム1とチーム2のプレイヤーデータ
const initialTeam1 = [
    { x: 150, y: 100, color: 'white', role: 'chaser', direction: 49.75 },  // 右向き
    { x: 150, y: 150, color: 'white', role: 'chaser', direction: 49.75 },
    { x: 150, y: 200, color: 'white', role: 'chaser', direction: 49.75 },
    { x: 200, y: 130, color: 'green', role: 'keeper', direction: 49.75 },  // 右向き
    { x: 220, y: 110, color: 'black', role: 'beater', direction: 49.75 },  // 右向き
    { x: 220, y: 180, color: 'black', role: 'beater', direction: 49.75 },
    { x: 285, y: 320, color: 'yellow', role: 'seeker', direction: 49.75 }  // 右向き
];

const initialTeam2 = [
    { x: 500, y: 100, color: 'white', role: 'chaser', direction: Math.PI / 5.8 },   // 左向き
    { x: 500, y: 150, color: 'white', role: 'chaser', direction: Math.PI / 5.8 },
    { x: 500, y: 200, color: 'white', role: 'chaser', direction: Math.PI / 5.8  },
    { x: 450, y: 130, color: 'green', role: 'keeper', direction: Math.PI / 5.8  },   // 左向き
    { x: 430, y: 110, color: 'black', role: 'beater', direction: Math.PI / 5.8  },   // 左向き
    { x: 430, y: 180, color: 'black', role: 'beater', direction: Math.PI / 5.8 },
    { x: 315, y: 320, color: 'yellow', role: 'seeker', direction: Math.PI / 5.8  }   // 左向き
];

// プレイヤーやボールの状態を保存する関数
function saveState() {
    history.push({
        team1: JSON.parse(JSON.stringify(team1)),
        team2: JSON.parse(JSON.stringify(team2)),
        balls: JSON.parse(JSON.stringify(balls))
    });
    redoStack = []; // 新しい操作が発生したらredoStackをクリア
}

// ボールのデータ
const initialBalls = [
    { x: 300, y: 150, type: 'quaffle', color: colors.ball.quaffle },  // クアッフル
    { x: 250, y:  80, type: 'bludger', color: colors.ball.bludger },  // ブラッジャー
    { x: 350, y:  80, type: 'bludger', color: colors.ball.bludger },
    { x: 300, y: 260, type: 'bludger', color: colors.ball.bludger },
    { x: 300, y: 310, type: 'snitch', color: colors.ball.snitch }     // スニッチ
];

let team1 = JSON.parse(JSON.stringify(initialTeam1));
let team2 = JSON.parse(JSON.stringify(initialTeam2));
let balls = JSON.parse(JSON.stringify(initialBalls));


// キャンバスのサイズをウィンドウサイズに合わせて調整する関数
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.95;
    canvas.height = canvas.width * (33 / 60); // 33m:60mの比率を維持
    initialDraw();
}

// グリッド線を描画する関数
function drawGrid() {
    const gridSize = 20 * (canvas.width / 600);
    ctx.strokeStyle = colors.grid;

    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// フィールドのラインやゴールの描画
function drawFieldLines() {
    const lineThickness = 2;
    const halfWidth = canvas.width / 2;

    ctx.strokeStyle = colors.court;
    ctx.lineWidth = lineThickness;

    // サイドラインとエンドライン
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // センターライン
    ctx.beginPath();
    ctx.moveTo(halfWidth, 0);
    ctx.lineTo(halfWidth, canvas.height);
    ctx.stroke();

    // キーパーゾーンライン
    const keeperZoneOffset = (11 / 60) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(halfWidth - keeperZoneOffset, 0);
    ctx.lineTo(halfWidth - keeperZoneOffset, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(halfWidth + keeperZoneOffset, 0);
    ctx.lineTo(halfWidth + keeperZoneOffset, canvas.height);
    ctx.stroke();

    
}

// ゴールを描画する関数（ゴールライン上に配置）
function drawGoals() {
    const goalRadius = canvas.width * 0.015; // サイズ半分
    const goalPositions = [
        { x: canvas.width * 0.20, y: canvas.height * 0.25 }, // ゴールライン上
        { x: canvas.width * 0.20, y: canvas.height * 0.5 },
        { x: canvas.width * 0.20, y: canvas.height * 0.75 },
        { x: canvas.width * 0.80, y: canvas.height * 0.25 },
        { x: canvas.width * 0.80, y: canvas.height * 0.5 },
        { x: canvas.width * 0.80, y: canvas.height * 0.75 }
    ];

    ctx.strokeStyle = colors.goals;
    goalPositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, goalRadius, 0, Math.PI * 2);
        ctx.stroke();
    });
}

// プレイヤーまたはボールの検出関数
function detectItem(x, y, items) {
    return items.find(item => {
        const itemX = item.x * (canvas.width / 600);
        const itemY = item.y * (canvas.height / 330);
        const distance = Math.hypot(x - itemX, y - itemY);
        return distance < 30; // クリック範囲を30pxに設定
    });
}

// マウスまたはタッチイベントから座標を取得する関数
function getMousePosition(e) {
    const rect = canvas.getBoundingClientRect(); // キャンバスの相対座標を取得
    if (e.touches && e.touches.length > 0) {
        return {
            mouseX: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
            mouseY: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
        };
    } else {
        return {
            mouseX: (e.clientX - rect.left) * (canvas.width / rect.width),
            mouseY: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    }
}


// プレイヤーを描画する関数（進行方向を示す正三角形）
function drawPlayer(player) {
    const playerSize = 12.5 * (canvas.width / 600) * playerScale; // サイズ半分
    const { x, y, color, direction } = player; // データをデコンストラクト
    const centerX = x * (canvas.width / 600);  // X座標をキャンバスに適応
    const centerY = y * (canvas.height / 330); // Y座標をキャンバスに適応

    ctx.save(); // 現在の状態を保存

    // プレイヤーの中心点を基準に回転
    ctx.translate(centerX, centerY); 
    ctx.rotate(direction); // 指定された進行方向に回転

    // 正三角形を描画
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -playerSize); // 頂点（上）
    ctx.lineTo(-playerSize * Math.sqrt(3) / 2, playerSize / 2); // 左下
    ctx.lineTo(playerSize * Math.sqrt(3) / 2, playerSize / 2);  // 右下
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // 状態を復元して回転を解除
}

// ボールを描画する関数
function drawBall(ball) {
    const ballSize = 7.5 * (canvas.width / 600) * ballScale; // サイズ半分
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x * (canvas.width / 600), ball.y * (canvas.height / 330), ballSize, 0, Math.PI * 2);
    ctx.fill();
}

// フィールド、プレイヤー、ボールを描画する関数
function drawGame() {
    drawFieldLines(); // フィールドのラインを描画
    drawGoals(); // ゴールを描画
    team1.forEach(drawPlayer); // チーム1のプレイヤーを描画
    team2.forEach(drawPlayer); // チーム2のプレイヤーを描画
    balls.forEach(drawBall);   // ボールを描画
}

// 初期描画関数
function initialDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリアして再描画
    drawGame(); // コート、プレイヤー、ボールを描画
}


// 初期状態を記録する
saveState();

// リセットボタンイベント
resetButton.addEventListener('click', () => {
    team1 = JSON.parse(JSON.stringify(initialTeam1));
    team2 = JSON.parse(JSON.stringify(initialTeam2));
    balls = JSON.parse(JSON.stringify(initialBalls));
    lines = [];
    history = [];
    redoStack = [];
    initialDraw();
    saveState(); // リセット後の状態を保存
});

// 戻るボタン（Undo）の機能
undoButton.addEventListener('click', () => {
    if (history.length > 1) {
        redoStack.push(history.pop());
        const lastState = history[history.length - 1];
        team1 = lastState.team1;
        team2 = lastState.team2;
        balls = lastState.balls;
        initialDraw();
    }
});

// やり直すボタン（Redo）の機能
redoButton.addEventListener('click', () => {
    if (redoStack.length > 0) {
        history.push(redoStack.pop());
        const currentState = history[history.length - 1];
        team1 = currentState.team1;
        team2 = currentState.team2;
        balls = currentState.balls;
        initialDraw();
    }
});

// ウィンドウのサイズ変更に対応
window.addEventListener('resize', resizeCanvas);

// ドラッグイベントリスナー（マウス専用）
canvas.addEventListener('mousedown', (e) => {
    const { mouseX, mouseY } = getMousePosition(e);
    draggedItem = detectItem(mouseX, mouseY, team1) || detectItem(mouseX, mouseY, team2) || detectItem(mouseX, mouseY, balls);

    if (draggedItem) {
        dragging = true;
        dragStart = { x: mouseX - draggedItem.x * (canvas.width / 600), y: mouseY - draggedItem.y * (canvas.height / 330) };
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (dragging && draggedItem) {
        const { mouseX, mouseY } = getMousePosition(e);
        draggedItem.x = (mouseX - dragStart.x) / (canvas.width / 600);
        draggedItem.y = (mouseY - dragStart.y) / (canvas.height / 330);
        initialDraw(); // 再描画
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (dragging) {
        saveState(); // 操作終了時に状態を保存
        dragging = false;
        draggedItem = null;
    }
});

// タッチイベントリスナー（タッチ専用）
canvas.addEventListener('touchstart', (e) => {
    const { mouseX, mouseY } = getTouchPosition(e);
    draggedItem = detectItem(mouseX, mouseY, team1) || detectItem(mouseX, mouseY, team2) || detectItem(mouseX, mouseY, balls);

    if (draggedItem) {
        dragging = true;
        dragStart = { x: mouseX - draggedItem.x * (canvas.width / 600), y: mouseY - draggedItem.y * (canvas.height / 330) };
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (dragging && draggedItem) {
        const { mouseX, mouseY } = getTouchPosition(e);
        draggedItem.x = (mouseX - dragStart.x) / (canvas.width / 600);
        draggedItem.y = (mouseY - dragStart.y) / (canvas.height / 330);
        initialDraw(); // 再描画
    }
});

canvas.addEventListener('touchend', (e) => {
    if (dragging) {
        saveState(); // 操作終了時に状態を保存
        dragging = false;
        draggedItem = null;
    }
});

// ウィンドウのサイズ変更に対応
window.addEventListener('resize', resizeCanvas);

// 初期描画を実行
resizeCanvas();