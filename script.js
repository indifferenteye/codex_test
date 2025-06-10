const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const difficultyEl = document.getElementById('difficulty');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    speed: 4
};

let bullets = [];
let enemies = [];

const keys = {};
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
let isShooting = false;
let lastShot = 0;
let gameOver = false;
let running = false;
let score = 0;
let spawnInterval = parseInt(difficultyEl.value, 10);

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function spawnBullet() {
    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    const speed = 8;
    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5
    });
}

function spawnEnemy() {
    const size = 20;
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0: // left
            x = -size;
            y = randomRange(0, canvas.height);
            break;
        case 1: // right
            x = canvas.width + size;
            y = randomRange(0, canvas.height);
            break;
        case 2: // top
            x = randomRange(0, canvas.width);
            y = -size;
            break;
        case 3: // bottom
            x = randomRange(0, canvas.width);
            y = canvas.height + size;
            break;
    }
    enemies.push({ x, y, size, speed: 1.5 });
}

function updatePlayer() {
    if (keys['w'] || keys['ArrowUp']) player.y -= player.speed;
    if (keys['s'] || keys['ArrowDown']) player.y += player.speed;
    if (keys['a'] || keys['ArrowLeft']) player.x -= player.speed;
    if (keys['d'] || keys['ArrowRight']) player.x += player.speed;
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function updateBullets() {
    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;
        if (
            b.x < -b.radius ||
            b.x > canvas.width + b.radius ||
            b.y < -b.radius ||
            b.y > canvas.height + b.radius
        ) {
            bullets.splice(i, 1);
        }
    });
}

function updateEnemies() {
    enemies.forEach((e, i) => {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        // collision with player
        const distP = Math.hypot(player.x - e.x, player.y - e.y);
        if (distP < player.size + e.size) {
            gameOver = true;
        }

        // collision with bullets
        bullets.forEach((b, bi) => {
            const distB = Math.hypot(b.x - e.x, b.y - e.y);
            if (distB < b.radius + e.size) {
                enemies.splice(i, 1);
                bullets.splice(bi, 1);
                score += 10;
                scoreEl.textContent = `Score: ${score}`;
            }
        });
    });
}

function drawPlayer() {
    ctx.fillStyle = 'lime';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
}

function drawBullets() {
    ctx.fillStyle = 'yellow';
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawEnemies() {
    ctx.fillStyle = 'red';
    enemies.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

let lastEnemySpawn = 0;
function startGame() {
    resizeCanvas();
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    bullets = [];
    enemies = [];
    score = 0;
    scoreEl.textContent = 'Score: 0';
    messageEl.textContent = '';
    gameOver = false;
    spawnInterval = parseInt(difficultyEl.value, 10);
    lastEnemySpawn = 0;
    lastShot = 0;
    running = true;
    requestAnimationFrame(gameLoop);
}
function gameLoop(timestamp) {
    if (!running) return;

    if (gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 120, canvas.height / 2);
        messageEl.textContent = 'Game Over - click to restart';
        running = false;
        return;
    }

    if (timestamp - lastEnemySpawn > spawnInterval) {
        spawnEnemy();
        lastEnemySpawn = timestamp;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    updateBullets();
    updateEnemies();
    drawPlayer();
    drawBullets();
    drawEnemies();

    if (isShooting && timestamp - lastShot > 200) {
        spawnBullet();
        lastShot = timestamp;
    }

    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (!running && e.key === ' ') {
        startGame();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => {
    if (running) {
        isShooting = true;
    }
});

canvas.addEventListener('mouseup', () => {
    isShooting = false;
});

canvas.addEventListener('click', () => {
    if (!running) {
        startGame();
    }
});

difficultyEl.addEventListener('change', () => {
    spawnInterval = parseInt(difficultyEl.value, 10);
});
