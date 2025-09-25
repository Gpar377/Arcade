class EnhancedDeletionGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.TILE_SIZE = 40;
        this.COLS = Math.floor(this.canvas.width / this.TILE_SIZE);
        this.ROWS = Math.floor(this.canvas.height / this.TILE_SIZE);
        
        this.player = { x: 1, y: 1 };
        this.exit = { x: this.COLS - 2, y: this.ROWS - 2 };
        this.world = [];
        this.gameWon = false;
        this.gameLost = false;
        this.moveHistory = [];
        
        // Stats
        this.stepCount = 0;
        this.deletedCount = 0;
        this.totalAttempts = 0;
        
        // Visual effects
        this.particles = [];
        this.screenShake = 0;
        
        this.initWorld();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    initWorld() {
        this.world = [];
        this.moveHistory = [];
        this.stepCount = 0;
        this.deletedCount = 0;
        this.gameWon = false;
        this.gameLost = false;
        
        for (let y = 0; y < this.ROWS; y++) {
            this.world[y] = [];
            for (let x = 0; x < this.COLS; x++) {
                if (x === 0 || x === this.COLS - 1 || y === 0 || y === this.ROWS - 1) {
                    this.world[y][x] = 'wall';
                } else {
                    this.world[y][x] = 'ground';
                }
            }
        }
        
        // Add strategic obstacles
        for (let i = 0; i < 15; i++) {
            let x = Math.floor(Math.random() * (this.COLS - 4)) + 2;
            let y = Math.floor(Math.random() * (this.ROWS - 4)) + 2;
            if (!(x === this.player.x && y === this.player.y) && 
                !(x === this.exit.x && y === this.exit.y) &&
                this.getDistance(x, y, this.exit.x, this.exit.y) > 3) {
                this.world[y][x] = 'void';
            }
        }
        
        this.updateStats();
        this.updateStatus("Navigate carefully - there's no going back!");
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        document.getElementById('newGame').addEventListener('click', () => {
            this.totalAttempts++;
            this.initWorld();
        });
        
        document.getElementById('undoMove').addEventListener('click', () => this.undoLastMove());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
    }
    
    handleKeyPress(e) {
        if (this.gameWon || this.gameLost) return;
        
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.movePlayer(0, -1);
                break;
            case 's':
            case 'arrowdown':
                this.movePlayer(0, 1);
                break;
            case 'a':
            case 'arrowleft':
                this.movePlayer(-1, 0);
                break;
            case 'd':
            case 'arrowright':
                this.movePlayer(1, 0);
                break;
            case 'r':
                this.totalAttempts++;
                this.initWorld();
                break;
            case 'h':
                this.showHint();
                break;
        }
    }
    
    movePlayer(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        if (newX < 0 || newX >= this.COLS || newY < 0 || newY >= this.ROWS) return;
        
        const destTile = this.world[newY][newX];
        if (destTile === 'wall' || destTile === 'void' || destTile === 'deleted') {
            this.gameLost = true;
            this.screenShake = 10;
            this.createExplosion(newX * this.TILE_SIZE, newY * this.TILE_SIZE);
            this.updateStatus("GAME OVER! You hit an obstacle!", 'lose');
            return;
        }
        
        // Save move for undo
        this.moveHistory.push({
            oldPos: { x: this.player.x, y: this.player.y },
            deletedTile: this.world[this.player.y][this.player.x]
        });
        
        // Delete current position
        this.world[this.player.y][this.player.x] = 'deleted';
        this.deletedCount++;
        
        // Move player
        this.player.x = newX;
        this.player.y = newY;
        this.stepCount++;
        
        // Create deletion particles
        this.createDeletionParticles(this.moveHistory[this.moveHistory.length - 1].oldPos.x * this.TILE_SIZE, 
                                   this.moveHistory[this.moveHistory.length - 1].oldPos.y * this.TILE_SIZE);
        
        // Check win condition
        if (this.player.x === this.exit.x && this.player.y === this.exit.y) {
            this.gameWon = true;
            this.createVictoryParticles();
            this.updateStatus("VICTORY! You reached the exit!", 'win');
        }
        
        this.updateStats();
    }
    
    undoLastMove() {
        if (this.moveHistory.length === 0 || this.gameWon || this.gameLost) return;
        
        const lastMove = this.moveHistory.pop();
        
        // Restore deleted tile
        this.world[lastMove.oldPos.y][lastMove.oldPos.x] = lastMove.deletedTile;
        
        // Move player back
        this.player.x = lastMove.oldPos.x;
        this.player.y = lastMove.oldPos.y;
        
        this.stepCount--;
        this.deletedCount--;
        this.updateStats();
    }
    
    showHint() {
        // Simple pathfinding hint
        const path = this.findPath(this.player.x, this.player.y, this.exit.x, this.exit.y);
        if (path && path.length > 1) {
            const nextStep = path[1];
            this.highlightTile(nextStep.x, nextStep.y);
        }
    }
    
    findPath(startX, startY, endX, endY) {
        // Simple A* pathfinding
        const openSet = [{ x: startX, y: startY, g: 0, h: this.getDistance(startX, startY, endX, endY), parent: null }];
        const closedSet = new Set();
        
        while (openSet.length > 0) {
            openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            const current = openSet.shift();
            
            if (current.x === endX && current.y === endY) {
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({ x: node.x, y: node.y });
                    node = node.parent;
                }
                return path;
            }
            
            closedSet.add(`${current.x},${current.y}`);
            
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];
            
            for (const neighbor of neighbors) {
                if (neighbor.x < 0 || neighbor.x >= this.COLS || neighbor.y < 0 || neighbor.y >= this.ROWS) continue;
                if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;
                
                const tile = this.world[neighbor.y][neighbor.x];
                if (tile === 'wall' || tile === 'void' || tile === 'deleted') continue;
                
                const g = current.g + 1;
                const h = this.getDistance(neighbor.x, neighbor.y, endX, endY);
                
                const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                if (!existing || g < existing.g) {
                    if (existing) {
                        existing.g = g;
                        existing.parent = current;
                    } else {
                        openSet.push({ x: neighbor.x, y: neighbor.y, g, h, parent: current });
                    }
                }
            }
        }
        
        return null;
    }
    
    getDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    createDeletionParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x + this.TILE_SIZE / 2,
                y: y + this.TILE_SIZE / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                maxLife: 30,
                color: '#ff4757'
            });
        }
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x + this.TILE_SIZE / 2,
                y: y + this.TILE_SIZE / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 60,
                maxLife: 60,
                color: Math.random() > 0.5 ? '#ff4757' : '#ffa502'
            });
        }
    }
    
    createVictoryParticles() {
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: this.exit.x * this.TILE_SIZE + this.TILE_SIZE / 2,
                y: this.exit.y * this.TILE_SIZE + this.TILE_SIZE / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 120,
                maxLife: 120,
                color: '#00ff88'
            });
        }
    }
    
    highlightTile(x, y) {
        // Add temporary highlight effect
        setTimeout(() => {
            this.particles.push({
                x: x * this.TILE_SIZE + this.TILE_SIZE / 2,
                y: y * this.TILE_SIZE + this.TILE_SIZE / 2,
                vx: 0,
                vy: 0,
                life: 60,
                maxLife: 60,
                color: '#00ff88',
                isHint: true
            });
        }, 100);
    }
    
    updateStats() {
        document.getElementById('stepCount').textContent = this.stepCount;
        document.getElementById('deletedCount').textContent = this.deletedCount;
        document.getElementById('distanceToExit').textContent = this.getDistance(this.player.x, this.player.y, this.exit.x, this.exit.y);
        
        const survivalRate = this.totalAttempts > 0 ? Math.round((1 / (this.totalAttempts + 1)) * 100) : 100;
        document.getElementById('survivalRate').textContent = survivalRate + '%';
    }
    
    updateStatus(message, type = 'normal') {
        const overlay = document.getElementById('statusOverlay');
        overlay.textContent = message;
        overlay.className = 'status-overlay';
        if (type !== 'normal') {
            overlay.classList.add(type);
        }
    }
    
    draw() {
        // Apply screen shake
        if (this.screenShake > 0) {
            this.ctx.save();
            this.ctx.translate(Math.random() * this.screenShake - this.screenShake / 2, 
                             Math.random() * this.screenShake - this.screenShake / 2);
            this.screenShake *= 0.9;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw world
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                const tileX = x * this.TILE_SIZE;
                const tileY = y * this.TILE_SIZE;
                
                switch (this.world[y][x]) {
                    case 'wall':
                        this.drawTile(tileX, tileY, '#444', '#666');
                        break;
                    case 'ground':
                        this.drawTile(tileX, tileY, '#222', '#333');
                        break;
                    case 'deleted':
                        this.drawTile(tileX, tileY, '#111', '#000');
                        break;
                    case 'void':
                        // Draw void with animated effect
                        this.ctx.fillStyle = '#000';
                        this.ctx.fillRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);
                        break;
                }
            }
        }
        
        // Draw exit with glow effect
        const exitX = this.exit.x * this.TILE_SIZE;
        const exitY = this.exit.y * this.TILE_SIZE;
        this.ctx.shadowColor = '#00ff88';
        this.ctx.shadowBlur = 20;
        this.drawTile(exitX, exitY, '#00ff88', '#00cc66');
        this.ctx.shadowBlur = 0;
        
        // Draw player with glow
        const playerX = this.player.x * this.TILE_SIZE;
        const playerY = this.player.y * this.TILE_SIZE;
        this.ctx.shadowColor = '#ff4757';
        this.ctx.shadowBlur = 15;
        this.drawTile(playerX, playerY, '#ff4757', '#ff3742');
        this.ctx.shadowBlur = 0;
        
        // Draw particles
        this.updateParticles();
        
        if (this.screenShake > 0) {
            this.ctx.restore();
        }
    }
    
    drawTile(x, y, fillColor, strokeColor) {
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x + 2, y + 2, this.TILE_SIZE - 4, this.TILE_SIZE - 4);
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 2, y + 2, this.TILE_SIZE - 4, this.TILE_SIZE - 4);
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            const alpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            
            if (p.isHint) {
                this.ctx.fillRect(p.x - 15, p.y - 15, 30, 30);
            } else {
                this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            }
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game
window.addEventListener('load', () => {
    new EnhancedDeletionGame();
});