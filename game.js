const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');

// Dynamic canvas sizing
function resizeCanvas() {
    const aspectRatio = 4 / 3; // Original 800x600 ratio
    canvas.width = Math.min(window.innerWidth, 800); // Cap at 800 for larger screens
    canvas.height = canvas.width / aspectRatio;

    // Ensure it fits vertically if needed
    if (canvas.height > window.innerHeight) {
        canvas.height = Math.min(window.innerHeight, 600);
        canvas.width = canvas.height * aspectRatio;
    }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Starfield (reduced layers for depth)
const stars = Array(50).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 1 + 0.5
}));
const distantStars = Array(25).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 1 + 0.5,
    speed: Math.random() * 0.5 + 0.2
}));

// Spaceship
const ship = {
    x: 100,
    y: 300,
    width: 40,
    height: 20,
    velocity: 0,
    gravity: 0.3,
    thrust: -6,
    shield: false,
    trail: [] // For engine trail
};

// Game objects
let obstacles = [];
let powerUps = [];
let frameCount = 0;
let score = 0;
let gameOver = false;
let gameStarted = false; // Tracks if game is active
const obstacleGap = 200;
let gameSpeed = 3;
let shake = 0; // For screen shake

// Sound effects (add these files)
const thrustSound = new Audio('thrust.wav');
const collectSound = new Audio('collect.wav');
const crashSound = new Audio('crash.wav');

// Input handling for both mouse and touch
function handleInput(event) {
    if (!gameOver && gameStarted) {
        event.preventDefault(); // Prevent scrolling on touch
        ship.velocity = ship.thrust;
        thrustSound.play().catch(() => {});
    }
}
document.addEventListener('click', handleInput);
document.addEventListener('touchstart', handleInput);

startBtn.addEventListener('click', startGame);

function startGame() {
    gameStarted = true;
    gameOver = false; // Ensure gameOver is reset
    startBtn.style.display = 'none';
    resetGame();
}

function spawnObstacle() {
    const type = Math.random();
    if (type < 0.5) {
        const height = Math.random() * (canvas.height - 150);
        obstacles.push({
            x: canvas.width,
            topHeight: height,
            bottomHeight: canvas.height - height - obstacleGap,
            width: 50,
            speed: gameSpeed,
            type: 'gate',
            passed: false,
            pulse: 0 // For pulsing effect
        });
    } else if (type < 0.8) {
        obstacles.push({
            x: canvas.width,
            y: Math.random() * (canvas.height - 50),
            size: 50,
            speed: gameSpeed,
            type: 'asteroid',
            passed: false,
            rotation: 0
        });
    } else {
        obstacles.push({
            x: canvas.width,
            y: Math.random() * (canvas.height - 30),
            width: 60,
            height: 30,
            speed: gameSpeed * 1.5,
            type: 'drone',
            passed: false,
            lightBlink: 0
        });
    }
}

function spawnPowerUp() {
    if (Math.random() < 0.05) {
        powerUps.push({
            x: canvas.width,
            y: Math.random() * (canvas.height - 20),
            size: 20,
            type: Math.random() < 0.5 ? 'shield' : 'boost',
            glow: 0 // For pulsating glow
        });
    }
}

function resetGame() {
    ship.y = canvas.height / 2; // Center ship on reset
    ship.velocity = 0;
    ship.shield = false;
    ship.trail = [];
    obstacles = [];
    powerUps = [];
    score = 0;
    gameSpeed = 3;
    shake = 0;
    if (gameStarted) gameLoop(); // Only loop if game is started
}

function update() {
    if (gameOver || !gameStarted) return;

    ship.velocity += ship.gravity;
    ship.y += ship.velocity;
    if (ship.y < 0) ship.y = 0;
    if (ship.y + ship.height > canvas.height) {
        ship.y = canvas.height - ship.height;
        if (!ship.shield) {
            gameOver = true;
            gameStarted = false; // Reset to show start screen
            shake = 10; // Trigger screen shake
            crashSound.play().catch(() => {});
            startBtn.style.display = 'block'; // Show start button again
        }
    }

    // Engine trail (shortened)
    ship.trail.push({ x: ship.x, y: ship.y + ship.height / 2 });
    if (ship.trail.length > 5) ship.trail.shift();

    frameCount++;
    if (frameCount % 80 === 0) spawnObstacle();
    if (frameCount % 100 === 0) spawnPowerUp();
    if (frameCount % 500 === 0) gameSpeed += 0.5;

    stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    });
    distantStars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    });

    obstacles.forEach((obs, index) => {
        obs.x -= obs.speed;
        if (obs.type === 'gate') obs.pulse += 0.1;
        else if (obs.type === 'asteroid') obs.rotation += 0.05;
        else if (obs.type === 'drone') obs.lightBlink += 0.2;

        let hit = false;
        if (obs.type === 'gate') {
            hit = ship.x + ship.width > obs.x && ship.x < obs.x + obs.width &&
                (ship.y < obs.topHeight || ship.y + ship.height > canvas.height - obs.bottomHeight);
        } else if (obs.type === 'asteroid') {
            hit = ship.x + ship.width > obs.x && ship.x < obs.x + obs.size &&
                ship.y + ship.height > obs.y && ship.y < obs.y + obs.size;
        } else if (obs.type === 'drone') {
            hit = ship.x + ship.width > obs.x && ship.x < obs.x + obs.width &&
                ship.y + ship.height > obs.y && ship.y < obs.y + obs.height;
        }

        if (hit && !ship.shield) {
            gameOver = true;
            gameStarted = false; // Reset to show start screen
            shake = 10;
            crashSound.play().catch(() => {});
            startBtn.style.display = 'block'; // Show start button again
        } else if (hit && ship.shield) {
            ship.shield = false;
            obstacles.splice(index, 1);
        }

        if (obs.x + (obs.width || obs.size) < ship.x && !obs.passed) {
            score++;
            obs.passed = true;
        }

        if (obs.x + (obs.width || obs.size) < 0) obstacles.splice(index, 1);
    });

    powerUps.forEach((pu, index) => {
        pu.x -= gameSpeed;
        pu.glow += 0.1;
        if (
            ship.x + ship.width > pu.x && ship.x < pu.x + pu.size &&
            ship.y + ship.height > pu.y && ship.y < pu.y + pu.size
        ) {
            if (pu.type === 'shield') ship.shield = true;
            else if (pu.type === 'boost') gameSpeed *= 1.5;
            powerUps.splice(index, 1);
            collectSound.play().catch(() => {});
        }
        if (pu.x + pu.size < 0) powerUps.splice(index, 1);
    });

    if (shake > 0) shake--;
}

function draw() {
    ctx.save();
    if (shake > 0) {
        ctx.translate(Math.random() * shake - shake / 2, Math.random() * shake - shake / 2);
    }

    // Background with nebula gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#2a2a4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Distant stars
    ctx.fillStyle = '#aaa';
    distantStars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Closer stars
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    if (!gameStarted) {
        // Start screen (shown initially and after game over)
        ctx.fillStyle = '#fff';
        ctx.font = '40px Arial';
        ctx.fillText('Starship Drift', canvas.width / 2 - 150, canvas.height / 2 - 50);
        ctx.font = '20px Arial';
        ctx.fillText('Tap or Click to Thrust', canvas.width / 2 - 100, canvas.height / 2 + 50);
        if (gameOver) {
            ctx.fillText(`Score: ${score}`, canvas.width / 2 - 50, canvas.height / 2 + 80); // Show last score
        }
    } else {
        // Ship with trail
        ship.trail.forEach((t, i) => {
            ctx.fillStyle = `rgba(0, 255, 204, ${(1 - i / ship.trail.length) * 0.5})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 5 - i / 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = ship.shield ? '#00ff00' : '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y + ship.height / 2); // Nose
        ctx.lineTo(ship.x + ship.width, ship.y); // Top wing
        ctx.lineTo(ship.x + ship.width - 10, ship.y + ship.height / 2); // Rear top
        ctx.lineTo(ship.x + ship.width, ship.y + ship.height); // Bottom wing
        ctx.closePath();
        ctx.fill();

        // Obstacles
        obstacles.forEach(obs => {
            if (obs.type === 'gate') {
                const pulse = Math.sin(obs.pulse) * 10;
                ctx.fillStyle = `rgba(255, 51, 51, ${0.7 + Math.sin(obs.pulse) * 0.3})`;
                ctx.fillRect(obs.x, 0, obs.width + pulse, obs.topHeight);
                ctx.fillRect(obs.x, canvas.height - obs.bottomHeight, obs.width + pulse, obs.bottomHeight);
            } else if (obs.type === 'asteroid') {
                ctx.save();
                ctx.translate(obs.x + obs.size / 2, obs.y + obs.size / 2);
                ctx.rotate(obs.rotation);
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.moveTo(0, -obs.size / 2);
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    const r = obs.size / 2 + (Math.random() - 0.5) * 10;
                    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (obs.type === 'drone') {
                ctx.fillStyle = '#ff6666';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.fillStyle = `rgba(255, 255, 0, ${Math.sin(obs.lightBlink) * 0.5 + 0.5})`;
                ctx.fillRect(obs.x + obs.width - 10, obs.y + 5, 5, 5); // Blinking light
            }
        });

        // Power-ups
        powerUps.forEach(pu => {
            const glowSize = pu.size / 2 + Math.sin(pu.glow) * 5;
            ctx.fillStyle = pu.type === 'shield' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(pu.x + pu.size / 2, pu.y + pu.size / 2, glowSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = pu.type === 'shield' ? '#00ff00' : '#ffff00';
            ctx.beginPath();
            ctx.arc(pu.x + pu.size / 2, pu.y + pu.size / 2, pu.size / 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 10, 30);

        // Game over (briefly shown before start screen)
        if (gameOver) {
            ctx.fillStyle = '#fff';
            ctx.font = '40px Arial';
            ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
        }
    }

    ctx.restore();
}

function gameLoop() {
    if (!gameStarted) return; // Stop loop when game ends
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initial draw to show start screen
draw();