class FlappyNeon {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'start'; // start, playing, gameOver
        this.score = 0;
        this.highScore = localStorage.getItem('flappyNeonHighScore') || 0;
        this.difficulty = 'Easy';
        
        // Bird properties
        this.bird = {
            x: 80,
            y: 300,
            width: 30,
            height: 25,
            velocity: 0,
            gravity: 0.5,
            jumpPower: -8,
            rotation: 0,
            trail: []
        };
        
        // Pipes
        this.pipes = [];
        this.pipeWidth = 60;
        this.pipeGap = 150;
        this.pipeSpeed = 2;
        this.pipeSpawnTimer = 0;
        this.pipeSpawnRate = 90;
        
        // Power-ups
        this.powerUps = [];
        this.powerUpTypes = ['shield', 'slowmo', 'points', 'shrink'];
        this.activePowerUps = {};
        
        // Visual effects
        this.particles = [];
        this.stars = [];
        this.clouds = [];
        
        // Performance
        this.lastTime = 0;
        this.fps = 60;
        this.frameCount = 0;
        
        // Audio context for sound effects (visual feedback)
        this.soundEnabled = true;
        
        this.init();
    }
    
    init() {
        this.createStars();
        this.createClouds();
        this.setupControls();
        this.updateUI();
        this.gameLoop();
    }
    
    createStars() {
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.1,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    createClouds() {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * 200 + 50,
                width: Math.random() * 80 + 40,
                height: Math.random() * 30 + 20,
                speed: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.3 + 0.1
            });
        }
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.flap();
            }
        });
        
        // Touch/mouse controls
        this.canvas.addEventListener('click', () => this.flap());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.flap();
        });
    }
    
    flap() {
        if (this.gameState === 'playing') {
            this.bird.velocity = this.bird.jumpPower;
            this.createFlapParticles();
            
            // Visual feedback for flap
            this.bird.rotation = -0.3;
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.resetGame();
        document.getElementById('startScreen').style.display = 'none';
    }
    
    resetGame() {
        this.bird.y = 300;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.bird.trail = [];
        this.pipes = [];
        this.powerUps = [];
        this.particles = [];
        this.activePowerUps = {};
        this.score = 0;
        this.pipeSpawnTimer = 0;
        this.pipeSpeed = 2;
        this.difficulty = 'Easy';
        this.updateUI();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updateBird();
        this.updatePipes();
        this.updatePowerUps();
        this.updateParticles();
        this.updateBackground();
        this.updateDifficulty();
        this.checkCollisions();
    }
    
    updateBird() {
        // Apply gravity
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;
        
        // Update rotation based on velocity
        this.bird.rotation = Math.max(-0.5, Math.min(0.5, this.bird.velocity * 0.05));
        
        // Update trail
        this.bird.trail.push({ x: this.bird.x, y: this.bird.y });
        if (this.bird.trail.length > 15) {
            this.bird.trail.shift();
        }
        
        // Check boundaries
        if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.velocity = 0;
        }
        
        if (this.bird.y > this.canvas.height - this.bird.height) {
            this.gameOver();
        }
    }
    
    updatePipes() {
        // Spawn new pipes
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer >= this.pipeSpawnRate) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }
        
        // Update existing pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;
            
            // Score when passing pipe
            if (!pipe.scored && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.createScoreParticles();
                
                // Chance to spawn power-up
                if (Math.random() < 0.3) {
                    this.spawnPowerUp(pipe.x + this.pipeWidth + 50);
                }
            }
            
            // Remove off-screen pipes
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }
    }
    
    spawnPipe() {
        const minGapY = 100;
        const maxGapY = this.canvas.height - 200;
        const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
        
        this.pipes.push({
            x: this.canvas.width,
            topHeight: gapY,
            bottomY: gapY + this.pipeGap,
            bottomHeight: this.canvas.height - (gapY + this.pipeGap),
            scored: false,
            color: this.getRandomPipeColor()
        });
    }
    
    getRandomPipeColor() {
        const colors = ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff0080'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    spawnPowerUp(x) {
        const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];
        this.powerUps.push({
            x: x,
            y: Math.random() * (this.canvas.height - 200) + 100,
            type: type,
            size: 20,
            rotation: 0,
            collected: false
        });
    }
    
    updatePowerUps() {
        // Update power-up positions and animations
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.x -= this.pipeSpeed;
            powerUp.rotation += 0.1;
            
            // Remove off-screen power-ups
            if (powerUp.x + powerUp.size < 0) {
                this.powerUps.splice(i, 1);
            }
        }
        
        // Update active power-up timers
        Object.keys(this.activePowerUps).forEach(type => {
            this.activePowerUps[type]--;
            if (this.activePowerUps[type] <= 0) {
                delete this.activePowerUps[type];
                this.deactivatePowerUp(type);
            }
        });
    }
    
    activatePowerUp(type) {
        switch (type) {
            case 'shield':
                this.activePowerUps.shield = 300; // 5 seconds
                break;
            case 'slowmo':
                this.activePowerUps.slowmo = 180; // 3 seconds
                this.pipeSpeed = 1;
                break;
            case 'points':
                this.score += 5;
                break;
            case 'shrink':
                this.activePowerUps.shrink = 240; // 4 seconds
                break;
        }
    }
    
    deactivatePowerUp(type) {
        switch (type) {
            case 'slowmo':
                this.pipeSpeed = Math.min(2 + Math.floor(this.score / 10) * 0.5, 5);
                break;
        }
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
    
    updateBackground() {
        // Update stars
        this.stars.forEach(star => {
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        });
        
        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.canvas.width;
                cloud.y = Math.random() * 200 + 50;
            }
        });
    }
    
    updateDifficulty() {
        const oldSpeed = this.pipeSpeed;
        this.pipeSpeed = Math.min(2 + Math.floor(this.score / 10) * 0.5, 5);
        
        if (this.score >= 50) this.difficulty = 'Insane';
        else if (this.score >= 30) this.difficulty = 'Hard';
        else if (this.score >= 15) this.difficulty = 'Medium';
        else this.difficulty = 'Easy';
        
        // Adjust spawn rate based on difficulty
        this.pipeSpawnRate = Math.max(60, 90 - Math.floor(this.score / 5) * 5);
    }
    
    checkCollisions() {
        const birdSize = this.activePowerUps.shrink ? 
            { width: this.bird.width * 0.7, height: this.bird.height * 0.7 } :
            { width: this.bird.width, height: this.bird.height };
        
        // Pipe collisions
        this.pipes.forEach(pipe => {
            const birdRight = this.bird.x + birdSize.width;
            const birdLeft = this.bird.x;
            const birdTop = this.bird.y;
            const birdBottom = this.bird.y + birdSize.height;
            
            const pipeLeft = pipe.x;
            const pipeRight = pipe.x + this.pipeWidth;
            
            if (birdRight > pipeLeft && birdLeft < pipeRight) {
                if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
                    if (!this.activePowerUps.shield) {
                        this.gameOver();
                    } else {
                        // Shield protects, create shield effect
                        this.createShieldParticles();
                    }
                }
            }
        });
        
        // Power-up collisions
        this.powerUps.forEach((powerUp, index) => {
            const distance = Math.sqrt(
                Math.pow(this.bird.x + birdSize.width/2 - powerUp.x, 2) +
                Math.pow(this.bird.y + birdSize.height/2 - powerUp.y, 2)
            );
            
            if (distance < powerUp.size) {
                this.activatePowerUp(powerUp.type);
                this.createPowerUpParticles(powerUp.x, powerUp.y, powerUp.type);
                this.powerUps.splice(index, 1);
            }
        });
    }
    
    createFlapParticles() {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.bird.x,
                y: this.bird.y + this.bird.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 1,
                life: 20,
                color: '#00ffff',
                size: Math.random() * 3 + 1
            });
        }
    }
    
    createScoreParticles() {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width/2,
                y: this.bird.y + this.bird.height/2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: '#ffff00',
                size: Math.random() * 4 + 2
            });
        }
    }
    
    createShieldParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width/2,
                y: this.bird.y + this.bird.height/2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 25,
                color: '#00ff00',
                size: Math.random() * 3 + 2
            });
        }
    }
    
    createPowerUpParticles(x, y, type) {
        const colors = {
            shield: '#00ff00',
            slowmo: '#0080ff',
            points: '#ffff00',
            shrink: '#ff00ff'
        };
        
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 35,
                color: colors[type] || '#ffffff',
                size: Math.random() * 4 + 2
            });
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        // Check for high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flappyNeonHighScore', this.highScore);
            document.getElementById('newRecord').style.display = 'block';
        } else {
            document.getElementById('newRecord').style.display = 'none';
        }
        
        document.getElementById('finalScore').textContent = `Score: ${this.score}`;
        document.getElementById('gameOverScreen').style.display = 'block';
    }
    
    restartGame() {
        this.gameState = 'playing';
        this.resetGame();
        document.getElementById('gameOverScreen').style.display = 'none';
    }
    
    showStartScreen() {
        this.gameState = 'start';
        this.resetGame();
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'block';
    }
    
    draw() {
        // Clear canvas with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#001133');
        gradient.addColorStop(0.5, '#000022');
        gradient.addColorStop(1, '#001100');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        this.drawPipes();
        this.drawPowerUps();
        this.drawBird();
        this.drawParticles();
        this.drawEffects();
    }
    
    drawBackground() {
        // Draw stars
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.opacity;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        
        // Draw clouds
        this.ctx.globalAlpha = 0.3;
        this.clouds.forEach(cloud => {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(cloud.x, cloud.y, cloud.width, cloud.height);
        });
        
        this.ctx.globalAlpha = 1;
    }
    
    drawPipes() {
        this.pipes.forEach(pipe => {
            // Pipe glow effect
            this.ctx.shadowColor = pipe.color;
            this.ctx.shadowBlur = 15;
            
            // Top pipe
            const topGradient = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + this.pipeWidth, 0);
            topGradient.addColorStop(0, pipe.color);
            topGradient.addColorStop(0.5, this.lightenColor(pipe.color));
            topGradient.addColorStop(1, this.darkenColor(pipe.color));
            
            this.ctx.fillStyle = topGradient;
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            
            // Bottom pipe
            this.ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
            
            // Pipe caps
            this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, this.pipeWidth + 10, 20);
            this.ctx.fillRect(pipe.x - 5, pipe.bottomY, this.pipeWidth + 10, 20);
            
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            this.ctx.save();
            this.ctx.translate(powerUp.x, powerUp.y);
            this.ctx.rotate(powerUp.rotation);
            
            const icons = {
                shield: '🛡️',
                slowmo: '⏰',
                points: '💎',
                shrink: '🔸'
            };
            
            // Power-up glow
            this.ctx.shadowColor = '#ffff00';
            this.ctx.shadowBlur = 20;
            
            this.ctx.font = `${powerUp.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(icons[powerUp.type] || '⭐', 0, powerUp.size/3);
            
            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        });
    }
    
    drawBird() {
        this.ctx.save();
        
        // Draw trail
        this.bird.trail.forEach((point, index) => {
            const alpha = index / this.bird.trail.length;
            this.ctx.globalAlpha = alpha * 0.5;
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillRect(point.x, point.y, 3, 3);
        });
        
        this.ctx.globalAlpha = 1;
        
        // Bird transformation
        this.ctx.translate(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2);
        this.ctx.rotate(this.bird.rotation);
        
        // Bird size (affected by shrink power-up)
        const size = this.activePowerUps.shrink ? 0.7 : 1;
        const width = this.bird.width * size;
        const height = this.bird.height * size;
        
        // Bird glow
        if (this.activePowerUps.shield) {
            this.ctx.shadowColor = '#00ff00';
            this.ctx.shadowBlur = 25;
        } else {
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
        }
        
        // Bird gradient
        const gradient = this.ctx.createLinearGradient(-width/2, -height/2, width/2, height/2);
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#0080ff');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-width/2, -height/2, width, height);
        
        // Bird outline
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-width/2, -height/2, width, height);
        
        this.ctx.restore();
    }
    
    drawParticles() {
        this.particles.forEach(p => {
            const alpha = p.life / 35;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawEffects() {
        // Active power-up indicators
        let yOffset = 150;
        Object.keys(this.activePowerUps).forEach(type => {
            const timeLeft = Math.ceil(this.activePowerUps[type] / 60);
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, yOffset, 120, 25);
            
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '12px Orbitron';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${type}: ${timeLeft}s`, 15, yOffset + 17);
            
            yOffset += 30;
        });
    }
    
    lightenColor(color) {
        // Simple color manipulation
        return color.replace(/[0-9a-f]/gi, (match) => {
            const val = parseInt(match, 16);
            return Math.min(15, val + 3).toString(16);
        });
    }
    
    darkenColor(color) {
        return color.replace(/[0-9a-f]/gi, (match) => {
            const val = parseInt(match, 16);
            return Math.max(0, val - 3).toString(16);
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
        document.getElementById('difficulty').textContent = this.difficulty;
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
    game = new FlappyNeon();
});