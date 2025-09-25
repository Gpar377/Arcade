class NeonBreakout {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver, levelComplete
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.highScore = localStorage.getItem('neonBreakoutHighScore') || 0;
        
        // Game objects
        this.paddle = { x: 350, y: 550, width: 100, height: 15, speed: 8 };
        this.balls = [];
        this.bricks = [];
        this.powerUps = [];
        this.lasers = [];
        this.particles = [];
        
        // Power-up states
        this.powerUpStates = {
            fireBall: { active: false, timeLeft: 0 },
            multiBall: { active: false, timeLeft: 0 },
            megaPaddle: { active: false, timeLeft: 0 },
            bonusPoints: { active: false, timeLeft: 0 },
            laserPaddle: { active: false, timeLeft: 0 }
        };
        
        // Input handling
        this.keys = {};
        this.lastTime = 0;
        this.fps = 60;
        
        this.init();
    }
    
    init() {
        this.setupControls();
        this.createLevel();
        this.resetBall();
        this.updateUI();
        this.gameLoop();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    if (this.powerUpStates.laserPaddle.active) {
                        this.shootLaser();
                    } else if (this.balls.length === 0 || this.balls.every(ball => !ball.launched)) {
                        this.launchBall();
                    }
                }
            }
            
            if (e.key.toLowerCase() === 'p') {
                this.pauseGame();
            }
            
            if (e.key.toLowerCase() === 'r') {
                this.resetGame();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    createLevel() {
        this.bricks = [];
        const rows = Math.min(5 + Math.floor(this.level / 3), 10);
        const cols = 10;
        const brickWidth = 70;
        const brickHeight = 25;
        const padding = 5;
        const offsetX = (this.canvas.width - (cols * (brickWidth + padding) - padding)) / 2;
        const offsetY = 50;
        
        const colors = ['#ff0040', '#ff4070', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0080ff', '#8000ff', '#ff00ff'];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Skip some bricks for interesting patterns
                if (this.level > 3 && Math.random() < 0.1) continue;
                
                const brick = {
                    x: offsetX + col * (brickWidth + padding),
                    y: offsetY + row * (brickHeight + padding),
                    width: brickWidth,
                    height: brickHeight,
                    color: colors[row % colors.length],
                    hits: Math.floor(this.level / 5) + 1,
                    maxHits: Math.floor(this.level / 5) + 1,
                    powerUp: Math.random() < 0.15 ? this.getRandomPowerUp() : null
                };
                
                this.bricks.push(brick);
            }
        }
    }
    
    getRandomPowerUp() {
        const powerUps = ['fireBall', 'multiBall', 'megaPaddle', 'bonusPoints', 'laserPaddle'];
        return powerUps[Math.floor(Math.random() * powerUps.length)];
    }
    
    resetBall() {
        this.balls = [{
            x: this.paddle.x + this.paddle.width / 2,
            y: this.paddle.y - 10,
            vx: 0,
            vy: 0,
            radius: 8,
            launched: false,
            trail: []
        }];
    }
    
    launchBall() {
        this.balls.forEach(ball => {
            if (!ball.launched) {
                const angle = (Math.random() - 0.5) * Math.PI / 3; // Random angle within 60 degrees
                ball.vx = Math.sin(angle) * 6;
                ball.vy = -Math.cos(angle) * 6;
                ball.launched = true;
            }
        });
        
        if (this.gameState === 'menu') {
            this.gameState = 'playing';
        }
    }
    
    shootLaser() {
        this.lasers.push({
            x: this.paddle.x + this.paddle.width / 4,
            y: this.paddle.y,
            width: 3,
            height: 15,
            speed: 10
        });
        
        this.lasers.push({
            x: this.paddle.x + (3 * this.paddle.width) / 4,
            y: this.paddle.y,
            width: 3,
            height: 15,
            speed: 10
        });
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePaddle();
        this.updateBalls();
        this.updatePowerUps();
        this.updateLasers();
        this.updateParticles();
        this.updatePowerUpStates();
        this.checkCollisions();
        this.checkGameState();
    }
    
    updatePaddle() {
        // Paddle movement
        if ((this.keys['arrowleft'] || this.keys['a']) && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if ((this.keys['arrowright'] || this.keys['d']) && this.paddle.x < this.canvas.width - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }
        
        // Update paddle size based on power-up
        const baseWidth = 100;
        this.paddle.width = this.powerUpStates.megaPaddle.active ? baseWidth * 1.5 : baseWidth;
    }
    
    updateBalls() {
        this.balls.forEach((ball, ballIndex) => {
            if (!ball.launched) {
                // Follow paddle before launch
                ball.x = this.paddle.x + this.paddle.width / 2;
                ball.y = this.paddle.y - 10;
                return;
            }
            
            // Update trail
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 10) ball.trail.shift();
            
            // Move ball
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // Wall collisions
            if (ball.x <= ball.radius || ball.x >= this.canvas.width - ball.radius) {
                ball.vx = -ball.vx;
                ball.x = Math.max(ball.radius, Math.min(this.canvas.width - ball.radius, ball.x));
                this.createImpactParticles(ball.x, ball.y, '#00ffff');
            }
            
            if (ball.y <= ball.radius) {
                ball.vy = -ball.vy;
                ball.y = ball.radius;
                this.createImpactParticles(ball.x, ball.y, '#00ffff');
            }
            
            // Paddle collision
            if (ball.y + ball.radius >= this.paddle.y && 
                ball.y - ball.radius <= this.paddle.y + this.paddle.height &&
                ball.x >= this.paddle.x && 
                ball.x <= this.paddle.x + this.paddle.width &&
                ball.vy > 0) {
                
                // Calculate bounce angle based on hit position
                const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
                const bounceAngle = (hitPos - 0.5) * Math.PI / 3;
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                
                ball.vx = Math.sin(bounceAngle) * speed;
                ball.vy = -Math.abs(Math.cos(bounceAngle) * speed);
                ball.y = this.paddle.y - ball.radius;
                
                this.createImpactParticles(ball.x, ball.y, '#00ff00');
            }
            
            // Remove balls that fall off screen
            if (ball.y > this.canvas.height + 50) {
                this.balls.splice(ballIndex, 1);
            }
        });
        
        // Check if all balls are lost
        if (this.balls.length === 0) {
            this.lives--;
            if (this.lives > 0) {
                this.resetBall();
            }
        }
    }
    
    updatePowerUps() {
        this.powerUps.forEach((powerUp, index) => {
            powerUp.y += powerUp.speed;
            powerUp.rotation += 0.1;
            
            // Paddle collision
            if (powerUp.y + powerUp.size >= this.paddle.y &&
                powerUp.y <= this.paddle.y + this.paddle.height &&
                powerUp.x + powerUp.size >= this.paddle.x &&
                powerUp.x <= this.paddle.x + this.paddle.width) {
                
                this.activatePowerUp(powerUp.type);
                this.createPowerUpParticles(powerUp.x, powerUp.y);
                this.powerUps.splice(index, 1);
            }
            
            // Remove if off screen
            if (powerUp.y > this.canvas.height) {
                this.powerUps.splice(index, 1);
            }
        });
    }
    
    updateLasers() {
        this.lasers.forEach((laser, index) => {
            laser.y -= laser.speed;
            
            if (laser.y < 0) {
                this.lasers.splice(index, 1);
            }
        });
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.1; // Gravity
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updatePowerUpStates() {
        Object.keys(this.powerUpStates).forEach(key => {
            const powerUp = this.powerUpStates[key];
            if (powerUp.active) {
                powerUp.timeLeft--;
                if (powerUp.timeLeft <= 0) {
                    powerUp.active = false;
                }
            }
        });
    }
    
    checkCollisions() {
        // Ball-brick collisions
        this.balls.forEach(ball => {
            this.bricks.forEach((brick, brickIndex) => {
                if (this.isColliding(ball, brick)) {
                    this.hitBrick(brick, brickIndex, ball);
                }
            });
        });
        
        // Laser-brick collisions
        this.lasers.forEach((laser, laserIndex) => {
            this.bricks.forEach((brick, brickIndex) => {
                if (laser.x < brick.x + brick.width &&
                    laser.x + laser.width > brick.x &&
                    laser.y < brick.y + brick.height &&
                    laser.y + laser.height > brick.y) {
                    
                    this.hitBrick(brick, brickIndex);
                    this.lasers.splice(laserIndex, 1);
                }
            });
        });
    }
    
    isColliding(ball, brick) {
        return ball.x + ball.radius > brick.x &&
               ball.x - ball.radius < brick.x + brick.width &&
               ball.y + ball.radius > brick.y &&
               ball.y - ball.radius < brick.y + brick.height;
    }
    
    hitBrick(brick, brickIndex, ball = null) {
        brick.hits--;
        
        if (brick.hits <= 0) {
            // Brick destroyed
            const points = (10 + this.level * 5) * (this.powerUpStates.bonusPoints.active ? 2 : 1);
            this.score += points;
            
            // Create explosion particles
            this.createBrickExplosion(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
            
            // Drop power-up
            if (brick.powerUp) {
                this.powerUps.push({
                    x: brick.x + brick.width/2,
                    y: brick.y + brick.height/2,
                    size: 20,
                    type: brick.powerUp,
                    speed: 2,
                    rotation: 0
                });
            }
            
            this.bricks.splice(brickIndex, 1);
        } else {
            // Brick damaged
            this.createImpactParticles(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
        }
        
        // Ball bounce (if ball collision)
        if (ball && !this.powerUpStates.fireBall.active) {
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;
            
            const dx = ballCenterX - brickCenterX;
            const dy = ballCenterY - brickCenterY;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                ball.vx = -ball.vx;
            } else {
                ball.vy = -ball.vy;
            }
        }
    }
    
    activatePowerUp(type) {
        switch (type) {
            case 'fireBall':
                this.powerUpStates.fireBall.active = true;
                this.powerUpStates.fireBall.timeLeft = 600; // 10 seconds
                break;
            case 'multiBall':
                if (this.balls.length > 0) {
                    const originalBall = this.balls[0];
                    for (let i = 0; i < 2; i++) {
                        this.balls.push({
                            x: originalBall.x,
                            y: originalBall.y,
                            vx: originalBall.vx + (Math.random() - 0.5) * 4,
                            vy: originalBall.vy + (Math.random() - 0.5) * 2,
                            radius: originalBall.radius,
                            launched: true,
                            trail: []
                        });
                    }
                }
                break;
            case 'megaPaddle':
                this.powerUpStates.megaPaddle.active = true;
                this.powerUpStates.megaPaddle.timeLeft = 900; // 15 seconds
                break;
            case 'bonusPoints':
                this.powerUpStates.bonusPoints.active = true;
                this.powerUpStates.bonusPoints.timeLeft = 600; // 10 seconds
                break;
            case 'laserPaddle':
                this.powerUpStates.laserPaddle.active = true;
                this.powerUpStates.laserPaddle.timeLeft = 900; // 15 seconds
                break;
        }
    }
    
    createBrickExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30 + Math.random() * 20,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    createImpactParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 20,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }
    
    createPowerUpParticles(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 40,
                color: '#ffff00',
                size: Math.random() * 4 + 2
            });
        }
    }
    
    checkGameState() {
        if (this.lives <= 0) {
            this.gameState = 'gameOver';
            this.showOverlay('lose', 'GAME OVER', `Final Score: ${this.score}`);
            
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('neonBreakoutHighScore', this.highScore);
            }
        } else if (this.bricks.length === 0) {
            this.level++;
            this.gameState = 'levelComplete';
            this.showOverlay('win', 'LEVEL COMPLETE!', `Advancing to Level ${this.level}`);
            
            setTimeout(() => {
                this.createLevel();
                this.resetBall();
                this.gameState = 'playing';
                this.hideOverlay();
            }, 2000);
        }
    }
    
    draw() {
        // Clear canvas with gradient
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width/2, this.canvas.height/2, 0,
            this.canvas.width/2, this.canvas.height/2, this.canvas.width/2
        );
        gradient.addColorStop(0, '#001133');
        gradient.addColorStop(1, '#000011');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game objects
        this.drawBricks();
        this.drawPaddle();
        this.drawBalls();
        this.drawPowerUps();
        this.drawLasers();
        this.drawParticles();
        this.drawEffects();
    }
    
    drawBricks() {
        this.bricks.forEach(brick => {
            // Brick shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(brick.x + 3, brick.y + 3, brick.width, brick.height);
            
            // Brick gradient based on hits
            const alpha = brick.hits / brick.maxHits;
            const gradient = this.ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
            gradient.addColorStop(0, brick.color);
            gradient.addColorStop(1, this.darkenColor(brick.color, 0.3));
            
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            
            // Brick outline
            this.ctx.globalAlpha = 1;
            this.ctx.strokeStyle = this.lightenColor(brick.color, 0.3);
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            
            // Power-up indicator
            if (brick.powerUp) {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.font = '12px Orbitron';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('★', brick.x + brick.width/2, brick.y + brick.height/2 + 4);
            }
        });
    }
    
    drawPaddle() {
        // Paddle glow
        if (this.powerUpStates.laserPaddle.active) {
            this.ctx.shadowColor = '#ff0040';
            this.ctx.shadowBlur = 20;
        } else if (this.powerUpStates.megaPaddle.active) {
            this.ctx.shadowColor = '#00ff00';
            this.ctx.shadowBlur = 15;
        } else {
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 10;
        }
        
        // Paddle gradient
        const gradient = this.ctx.createLinearGradient(this.paddle.x, this.paddle.y, this.paddle.x, this.paddle.y + this.paddle.height);
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(1, '#0080ff');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        
        this.ctx.shadowBlur = 0;
        
        // Paddle outline
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    }
    
    drawBalls() {
        this.balls.forEach(ball => {
            // Ball trail
            ball.trail.forEach((point, index) => {
                const alpha = index / ball.trail.length;
                this.ctx.globalAlpha = alpha * 0.5;
                this.ctx.fillStyle = this.powerUpStates.fireBall.active ? '#ff4000' : '#00ffff';
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, ball.radius * alpha, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            this.ctx.globalAlpha = 1;
            
            // Ball glow
            if (this.powerUpStates.fireBall.active) {
                this.ctx.shadowColor = '#ff4000';
                this.ctx.shadowBlur = 20;
            } else {
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 15;
            }
            
            // Ball
            const gradient = this.ctx.createRadialGradient(ball.x - 3, ball.y - 3, 0, ball.x, ball.y, ball.radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, this.powerUpStates.fireBall.active ? '#ff0040' : '#00ffff');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            this.ctx.save();
            this.ctx.translate(powerUp.x + powerUp.size/2, powerUp.y + powerUp.size/2);
            this.ctx.rotate(powerUp.rotation);
            
            // Power-up glow
            this.ctx.shadowColor = '#ffff00';
            this.ctx.shadowBlur = 15;
            
            // Power-up icon
            const icons = {
                fireBall: '🔥',
                multiBall: '⚡',
                megaPaddle: '🛡️',
                bonusPoints: '💎',
                laserPaddle: '🎯'
            };
            
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = `${powerUp.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(icons[powerUp.type] || '★', 0, powerUp.size/3);
            
            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        });
    }
    
    drawLasers() {
        this.lasers.forEach(laser => {
            this.ctx.shadowColor = '#ff0040';
            this.ctx.shadowBlur = 10;
            
            const gradient = this.ctx.createLinearGradient(laser.x, laser.y, laser.x, laser.y + laser.height);
            gradient.addColorStop(0, '#ff0040');
            gradient.addColorStop(1, '#ff8080');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / 50;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawEffects() {
        // Power-up status indicators
        let yOffset = 20;
        Object.keys(this.powerUpStates).forEach(key => {
            const powerUp = this.powerUpStates[key];
            if (powerUp.active) {
                const timeLeft = Math.ceil(powerUp.timeLeft / 60);
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(10, yOffset, 150, 25);
                
                this.ctx.fillStyle = '#ffff00';
                this.ctx.font = '14px Orbitron';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${key}: ${timeLeft}s`, 15, yOffset + 17);
                
                yOffset += 30;
            }
        });
    }
    
    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
    
    lightenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) * (1 + factor));
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) * (1 + factor));
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) * (1 + factor));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('bricksLeft').textContent = this.bricks.length;
        document.getElementById('highScore').textContent = this.highScore;
        
        // Update progress bar
        const totalBricks = this.bricks.length + (this.level - 1) * 50; // Estimate
        const progress = Math.max(0, 100 - (this.bricks.length / Math.max(1, totalBricks / this.level)) * 100);
        document.getElementById('progressBar').style.width = progress + '%';
    }
    
    showOverlay(type, title, message) {
        const overlay = document.getElementById('gameOverlay');
        const overlayTitle = document.getElementById('overlayTitle');
        const overlayMessage = document.getElementById('overlayMessage');
        
        overlayTitle.textContent = title;
        overlayTitle.className = `overlay-title ${type}`;
        overlayMessage.textContent = message;
        overlay.style.display = 'block';
    }
    
    hideOverlay() {
        document.getElementById('gameOverlay').style.display = 'none';
    }
    
    startGame() {
        if (this.gameState === 'menu' || this.gameState === 'gameOver') {
            this.resetGame();
        }
        this.gameState = 'playing';
        this.hideOverlay();
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showOverlay('pause', 'GAME PAUSED', 'Press P to resume or click below');
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.hideOverlay();
    }
    
    resetGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameState = 'menu';
        
        // Reset power-ups
        Object.keys(this.powerUpStates).forEach(key => {
            this.powerUpStates[key].active = false;
            this.powerUpStates[key].timeLeft = 0;
        });
        
        this.balls = [];
        this.powerUps = [];
        this.lasers = [];
        this.particles = [];
        
        this.createLevel();
        this.resetBall();
        this.updateUI();
        this.hideOverlay();
    }
    
    resetHighScore() {
        this.highScore = 0;
        localStorage.removeItem('neonBreakoutHighScore');
        this.updateUI();
    }
    
    gameLoop(currentTime = 0) {
        // Calculate FPS
        const deltaTime = currentTime - this.lastTime;
        this.fps = Math.round(1000 / deltaTime);
        document.getElementById('fpsCounter').textContent = `FPS: ${this.fps}`;
        this.lastTime = currentTime;
        
        this.update();
        this.draw();
        this.updateUI();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

let game;
window.addEventListener('load', () => {
    game = new NeonBreakout();
});