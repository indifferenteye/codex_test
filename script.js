const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const messageEl = document.getElementById('message');
const difficultyEl = document.getElementById('difficulty');

// simple audio setup for juicy feedback
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;
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
    speed: 4,
    hp: 3
};

let bullets = [];
let enemies = [];
let obstacles = [];

const keys = {};
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
let isShooting = false;
let lastShot = 0;
let gameOver = false;
let running = false;
let score = 0;
let spawnInterval = parseInt(difficultyEl.value, 10);
let particles = [];
let shake = 0;

function generateWorld() {
    obstacles = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
        const size = randomRange(40, 80);
        const x = randomRange(size, canvas.width - size);
        const y = randomRange(size, canvas.height - size);
        obstacles.push({ x, y, width: size, height: size });
    }
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function playTone(freq, duration) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.start();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

function shootSound() {
    playTone(600, 0.1);
}

function hitSound() {
    playTone(200, 0.2);
}

function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: randomRange(-3, 3),
            vy: randomRange(-3, 3),
            life: 30,
            color
        });
    }
    shake = 5;
}

function spawnBullet() {
    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    const speed = 8;
    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        bounced: false
    });
    shootSound();
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
    enemies.push({
        x,
        y,
        size,
        speed: 1.5,
        hp: 2,
        maxHp: 2,
        color: 'red'
    });
}

function updatePlayer() {
    const oldX = player.x;
    const oldY = player.y;
    if (keys['w'] || keys['ArrowUp']) player.y -= player.speed;
    if (keys['s'] || keys['ArrowDown']) player.y += player.speed;
    if (keys['a'] || keys['ArrowLeft']) player.x -= player.speed;
    if (keys['d'] || keys['ArrowRight']) player.x += player.speed;
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
    obstacles.forEach(o => {
        if (
            player.x + player.size > o.x - o.width / 2 &&
            player.x - player.size < o.x + o.width / 2 &&
            player.y + player.size > o.y - o.height / 2 &&
            player.y - player.size < o.y + o.height / 2
        ) {
            player.x = oldX;
            player.y = oldY;
        }
    });
}

function updateBullets() {
    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;

        let removed = false;
        obstacles.forEach(o => {
            if (
                !removed &&
                b.x > o.x - o.width / 2 &&
                b.x < o.x + o.width / 2 &&
                b.y > o.y - o.height / 2 &&
                b.y < o.y + o.height / 2
            ) {
                if (!b.bounced) {
                    const dx = b.x - o.x;
                    const dy = b.y - o.y;
                    if (Math.abs(dx * o.height) > Math.abs(dy * o.width)) {
                        b.vx *= -1;
                    } else {
                        b.vy *= -1;
                    }
                    b.bounced = true;
                } else {
                    bullets.splice(i, 1);
                    removed = true;
                }
            }
        });
        if (removed) return;

        const hitLeft = b.x - b.radius < 0;
        const hitRight = b.x + b.radius > canvas.width;
        const hitTop = b.y - b.radius < 0;
        const hitBottom = b.y + b.radius > canvas.height;

        if (hitLeft || hitRight) {
            if (!b.bounced) {
                b.vx *= -1;
                b.bounced = true;
                if (hitLeft) b.x = b.radius;
                if (hitRight) b.x = canvas.width - b.radius;
            } else {
                bullets.splice(i, 1);
                removed = true;
            }
        }
        if (removed) return;

        if (hitTop || hitBottom) {
            if (!b.bounced) {
                b.vy *= -1;
                b.bounced = true;
                if (hitTop) b.y = b.radius;
                if (hitBottom) b.y = canvas.height - b.radius;
            } else {
                bullets.splice(i, 1);
                removed = true;
            }
        }
        if (removed) return;

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
            spawnParticles(player.x, player.y, 30, 'red');
            hitSound();
            player.hp -= 1;
            healthEl.textContent = `Health: ${player.hp}`;
            enemies.splice(i, 1);
            if (player.hp <= 0) {
                gameOver = true;
            }
        }

        // collision with bullets
        bullets.forEach((b, bi) => {
            const distB = Math.hypot(b.x - e.x, b.y - e.y);
            if (distB < b.radius + e.size) {
                bullets.splice(bi, 1);
                e.hp -= 1;
                if (e.hp <= e.maxHp / 2) {
                    e.color = 'orange';
                }
                if (e.hp <= 0) {
                    enemies.splice(i, 1);
                    spawnParticles(e.x, e.y, 15, 'orange');
                    hitSound();
                    score += 10;
                    scoreEl.textContent = `Score: ${score}`;
                }
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

function drawObstacles() {
    ctx.fillStyle = '#555';
    obstacles.forEach(o => {
        ctx.fillRect(o.x - o.width / 2, o.y - o.height / 2, o.width, o.height);
    });
}

function drawEnemies() {
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateParticles() {
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(p.life / 30, 0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

let lastEnemySpawn = 0;
function startGame() {
    resizeCanvas();
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.hp = 3;
    bullets = [];
    enemies = [];
    generateWorld();
    particles = [];
    shake = 0;
    score = 0;
    scoreEl.textContent = 'Score: 0';
    healthEl.textContent = `Health: ${player.hp}`;
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
    if (shake > 0) {
        ctx.save();
        ctx.translate(randomRange(-shake, shake), randomRange(-shake, shake));
        shake *= 0.9;
    }
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    drawObstacles();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawParticles();
    if (shake > 0) {
        ctx.restore();
    }

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
