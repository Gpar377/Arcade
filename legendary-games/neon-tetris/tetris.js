class NeonTetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.BLOCK_SIZE = 30;
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropTime = 0;
        this.dropInterval = 1000;
        this.gameOver = false;
        this.paused = false;
        
        this.pieces = {
            I: { shape: [[1,1,1,1]], color: '#00ffff' },
            O: { shape: [[1,1],[1,1]], color: '#ffff00' },
            T: { shape: [[0,1,0],[1,1,1]], color: '#ff00ff' },
            S: { shape: [[0,1,1],[1,1,0]], color: '#00ff00' },
            Z: { shape: [[1,1,0],[0,1,1]], color: '#ff0000' },
            J: { shape: [[1,0,0],[1,1,1]], color: '#0000ff' },
            L: { shape: [[0,0,1],[1,1,1]], color: '#ff8800' }
        };
        
        this.particles = [];
        
        this.init();
        this.setupControls();
        this.gameLoop();
    }
    
    init() {
        // Initialize board
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                this.board[y][x] = 0;
            }
        }
        
        this.spawnPiece();
        this.generateNextPiece();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.paused) {
                if (e.key === 'r' || e.key === 'R') this.restart();
                if (e.key === 'p' || e.key === 'P') this.togglePause();
                return;
            }
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    this.movePiece(0, 1);
                    break;
                case 'ArrowUp':
                    this.rotatePiece();
                    break;
                case ' ':
                    this.hardDrop();
                    break;
                case 'p':
                case 'P':
                    this.togglePause();
                    break;
                case 'r':
                case 'R':
                    this.restart();
                    break;
            }
        });
    }
    
    spawnPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            const pieceTypes = Object.keys(this.pieces);
            const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
            this.currentPiece = {
                type: randomType,
                shape: this.pieces[randomType].shape,
                color: this.pieces[randomType].color,
                x: Math.floor(this.BOARD_WIDTH / 2) - 1,
                y: 0
            };
        }
        
        this.generateNextPiece();
        
        // Check game over
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
            this.gameOver = true;
            document.getElementById('gameOver').style.display = 'block';
            document.getElementById('finalScore').textContent = this.score;
        }
    }
    
    generateNextPiece() {
        const pieceTypes = Object.keys(this.pieces);
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        this.nextPiece = {
            type: randomType,
            shape: this.pieces[randomType].shape,
            color: this.pieces[randomType].color,
            x: Math.floor(this.BOARD_WIDTH / 2) - 1,
            y: 0
        };
    }
    
    movePiece(dx, dy) {
        if (!this.checkCollision(this.currentPiece.x + dx, this.currentPiece.y + dy, this.currentPiece.shape)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            return true;
        }
        return false;
    }
    
    rotatePiece() {
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, rotated)) {
            this.currentPiece.shape = rotated;
        }
    }
    
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = [];
        
        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = 0; j < rows; j++) {
                rotated[i][j] = matrix[rows - 1 - j][i];
            }
        }
        
        return rotated;
    }
    
    hardDrop() {
        while (this.movePiece(0, 1)) {
            this.score += 2;
        }
        this.lockPiece();
    }
    
    checkCollision(x, y, shape) {
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const newX = x + px;
                    const newY = y + py;
                    
                    if (newX < 0 || newX >= this.BOARD_WIDTH || newY >= this.BOARD_HEIGHT) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    lockPiece() {
        for (let py = 0; py < this.currentPiece.shape.length; py++) {
            for (let px = 0; px < this.currentPiece.shape[py].length; px++) {
                if (this.currentPiece.shape[py][px]) {
                    const x = this.currentPiece.x + px;
                    const y = this.currentPiece.y + py;
                    if (y >= 0) {
                        this.board[y][x] = this.currentPiece.color;
                    }
                }
            }
        }
        
        this.clearLines();
        this.spawnPiece();
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                // Create line clear particles
                this.createLineClearParticles(y);
                
                this.board.splice(y, 1);
                this.board.unshift(new Array(this.BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // Check the same line again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 50);
            
            // Scoring
            const scores = [0, 100, 300, 500, 800];
            this.score += scores[linesCleared] * this.level;
            
            this.updateUI();
        }
    }
    
    createLineClearParticles(lineY) {
        for (let x = 0; x < this.BOARD_WIDTH; x++) {
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: x * this.BLOCK_SIZE + this.BLOCK_SIZE / 2,
                    y: lineY * this.BLOCK_SIZE + this.BLOCK_SIZE / 2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 60,
                    maxLife: 60,
                    color: '#ffffff'
                });
            }
        }
    }
    
    togglePause() {
        this.paused = !this.paused;
    }
    
    restart() {
        this.board = [];
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.particles = [];
        document.getElementById('gameOver').style.display = 'none';
        this.init();
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece && !this.gameOver) {
            for (let py = 0; py < this.currentPiece.shape.length; py++) {
                for (let px = 0; px < this.currentPiece.shape[py].length; px++) {
                    if (this.currentPiece.shape[py][px]) {
                        this.drawBlock(this.currentPiece.x + px, this.currentPiece.y + py, this.currentPiece.color);
                    }
                }
            }
        }
        
        // Draw particles
        this.updateParticles();
        
        // Draw grid
        this.drawGrid();
        
        // Draw next piece
        this.drawNextPiece();
    }
    
    drawBlock(x, y, color) {
        const pixelX = x * this.BLOCK_SIZE;
        const pixelY = y * this.BLOCK_SIZE;
        
        // Main block
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, this.BLOCK_SIZE, this.BLOCK_SIZE);
        
        // Neon glow effect
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX + 1, pixelY + 1, this.BLOCK_SIZE - 2, this.BLOCK_SIZE - 2);
        this.ctx.shadowBlur = 0;
        
        // Inner highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(pixelX + 2, pixelY + 2, this.BLOCK_SIZE - 4, 4);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawNextPiece() {
        this.nextCtx.fillStyle = '#000011';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const blockSize = 15;
            const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
            const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;
            
            for (let py = 0; py < this.nextPiece.shape.length; py++) {
                for (let px = 0; px < this.nextPiece.shape[py].length; px++) {
                    if (this.nextPiece.shape[py][px]) {
                        const x = offsetX + px * blockSize;
                        const y = offsetY + py * blockSize;
                        
                        this.nextCtx.fillStyle = this.nextPiece.color;
                        this.nextCtx.fillRect(x, y, blockSize, blockSize);
                        
                        this.nextCtx.strokeStyle = this.nextPiece.color;
                        this.nextCtx.lineWidth = 1;
                        this.nextCtx.strokeRect(x, y, blockSize, blockSize);
                    }
                }
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            const alpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    gameLoop() {
        if (!this.gameOver && !this.paused) {
            this.dropTime += 16;
            if (this.dropTime >= this.dropInterval) {
                if (!this.movePiece(0, 1)) {
                    this.lockPiece();
                }
                this.dropTime = 0;
            }
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

let game;
window.addEventListener('load', () => {
    game = new NeonTetris();
});