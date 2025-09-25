class CyberSnake {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        this.snake = [{ x: 10, y: 10 }];
        this.food = {};
        this.powerUps = [];
        this.obstacles = [];
        this.particles = [];
        
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.highScore = localStorage.getItem('cyberSnakeHighScore') || 0;
        this.gameRunning = false;
        this.paused = false;
        
        // Power-up states
        this.powerUpStates = {
            speedBoost: { active: false, timeLeft: 0 },
            shield: { active: false, timeLeft: 0 },
            multiplier: { active: false, timeLeft: 0 }
        };
        
        this.baseSpeed = 150;
        this.currentSpeed = this.baseSpeed;
        
        this.init();
        this.setupControls();
        this.gameLoop();
    }
    
    init() {
        this.generateFood();
        this.generatePowerUp();
        this.generateObstacles();
        this.updateUI();
        document.getElementById('highScore').textContent = this.highScore;
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning && (e.key === ' ' || e.key.includes('Arrow') || 'wasd'.includes(e.key.toLowerCase()))) {
                this.startGame();
            }
            
            if (e.key === 'r' || e.key === 'R') {
                this.restart();
                return;
            }
            
            if (e.key === ' ') {
                this.togglePause();
                return;
            }
            
            if (!this.gameRunning || this.paused) return;
            
            // Prevent reverse direction
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.dy === 0) { this.dx = 0; this.dy = -1; }
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.dy === 0) { this.dx = 0; this.dy = 1; }
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.dx === 0) { this.dx = -1; this.dy = 0; }
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.dx === 0) { this.dx = 1; this.dy = 0; }
                    break;
            }
        });
    }
    
    startGame() {
        this.gameRunning = true;
        this.dx = 1;
        this.dy = 0;
    }
    
    togglePause() {
        if (this.gameRunning) {
            this.paused = !this.paused;
        }
    }
    
    generateFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount),
            type: 'normal'
        };
        
        // Ensure food doesn't spawn on snake
        while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y)) {
            this.food.x = Math.floor(Math.random() * this.tileCount);
            this.food.y = Math.floor(Math.random() * this.tileCount);
        }
    }
    
    generatePowerUp() {
        if (Math.random() < 0.3 && this.powerUps.length < 2) {
            const types = ['speed', 'shield', 'multiplier', 'bomb'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            const powerUp = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount),
                type: type,
                lifeTime: 300
            };
            
            this.powerUps.push(powerUp);
        }
    }
    
    generateObstacles() {
        this.obstacles = [];
        const numObstacles = Math.floor(this.score / 200) + 2;
        
        for (let i = 0; i < numObstacles; i++) {
            const obstacle = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
            this.obstacles.push(obstacle);
        }
    }
    
    update() {
        if (!this.gameRunning || this.paused) return;
        
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        
        // Check collisions
        if (!this.powerUpStates.shield.active) {
            if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
                this.gameOver();
                return;
            }
        } else {
            if (head.x < 0) head.x = this.tileCount - 1;
            if (head.x >= this.tileCount) head.x = 0;
            if (head.y < 0) head.y = this.tileCount - 1;
            if (head.y >= this.tileCount) head.y = 0;
        }
        
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            const points = this.powerUpStates.multiplier.active ? 20 : 10;
            this.score += points;
            this.generateFood();
        } else {
            this.snake.pop();
        }
        
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('length').textContent = this.snake.length;
    }
    
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw snake
        this.snake.forEach((segment, index) => {
            this.ctx.fillStyle = index === 0 ? '#00ff41' : '#00aa22';
            this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize, this.gridSize);
        });
        
        // Draw food
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize, this.gridSize);
        
        if (!this.gameRunning) {
            this.ctx.fillStyle = '#00ff41';
            this.ctx.font = '32px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CYBER SNAKE', this.canvas.width/2, this.canvas.height/2 - 40);
            this.ctx.font = '16px Courier New';
            this.ctx.fillText('Press any arrow key to start', this.canvas.width/2, this.canvas.height/2 + 20);
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('cyberSnakeHighScore', this.highScore);
        }
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLength').textContent = this.snake.length;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    restart() {
        this.snake = [{ x: 10, y: 10 }];
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameRunning = false;
        document.getElementById('gameOver').style.display = 'none';
        this.init();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        setTimeout(() => {
            requestAnimationFrame(() => this.gameLoop());
        }, this.currentSpeed);
    }
}

let game;
window.addEventListener('load', () => {
    game = new CyberSnake();
});