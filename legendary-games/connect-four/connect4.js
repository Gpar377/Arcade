class ConnectFour {
    constructor() {
        this.board = Array(6).fill().map(() => Array(7).fill(0));
        this.currentPlayer = 1; // 1 = red, 2 = yellow
        this.gameOver = false;
        this.aiEnabled = false;
        this.scores = { red: 0, yellow: 0 };
        this.winningCells = [];
        
        this.initGame();
    }
    
    initGame() {
        this.renderBoard();
        this.renderColumnIndicators();
        this.updateUI();
        this.loadScores();
    }
    
    renderBoard() {
        const grid = document.getElementById('gameGrid');
        grid.innerHTML = '';
        
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const value = this.board[row][col];
                if (value === 1) cell.classList.add('red');
                if (value === 2) cell.classList.add('yellow');
                
                if (this.winningCells.some(([r, c]) => r === row && c === col)) {
                    cell.classList.add('winning');
                }
                
                cell.addEventListener('click', () => this.handleCellClick(col));
                grid.appendChild(cell);
            }
        }
    }
    
    renderColumnIndicators() {
        const indicator = document.getElementById('columnIndicator');
        indicator.innerHTML = '';
        
        for (let col = 0; col < 7; col++) {
            const colDiv = document.createElement('div');
            colDiv.className = `column-hover ${this.currentPlayer === 1 ? 'red' : 'yellow'}`;
            colDiv.dataset.col = col;
            
            colDiv.addEventListener('mouseenter', () => {
                if (!this.gameOver && this.canDropPiece(col)) {
                    colDiv.classList.add('active');
                }
            });
            
            colDiv.addEventListener('mouseleave', () => {
                colDiv.classList.remove('active');
            });
            
            colDiv.addEventListener('click', () => this.handleCellClick(col));
            indicator.appendChild(colDiv);
        }
    }
    
    handleCellClick(col) {
        if (this.gameOver || !this.canDropPiece(col)) return;
        
        this.dropPiece(col);
        
        if (this.checkWin()) {
            this.handleWin();
        } else if (this.isBoardFull()) {
            this.handleDraw();
        } else {
            this.switchPlayer();
            
            if (this.aiEnabled && this.currentPlayer === 2) {
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
    }
    
    canDropPiece(col) {
        return this.board[0][col] === 0;
    }
    
    dropPiece(col) {
        for (let row = 5; row >= 0; row--) {
            if (this.board[row][col] === 0) {
                this.board[row][col] = this.currentPlayer;
                this.animateDropPiece(row, col);
                break;
            }
        }
    }
    
    animateDropPiece(row, col) {
        // Simple animation by re-rendering
        setTimeout(() => {
            this.renderBoard();
            this.renderColumnIndicators();
        }, 100);
    }
    
    checkWin() {
        // Check all directions for 4 in a row
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal /
            [1, -1]   // diagonal \\
        ];
        
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                if (this.board[row][col] === 0) continue;
                
                for (const [dr, dc] of directions) {
                    const cells = [[row, col]];
                    
                    // Check forward direction
                    for (let i = 1; i < 4; i++) {
                        const newRow = row + dr * i;
                        const newCol = col + dc * i;
                        
                        if (newRow < 0 || newRow >= 6 || newCol < 0 || newCol >= 7) break;
                        if (this.board[newRow][newCol] !== this.board[row][col]) break;
                        
                        cells.push([newRow, newCol]);
                    }
                    
                    if (cells.length >= 4) {
                        this.winningCells = cells;
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    isBoardFull() {
        return this.board[0].every(cell => cell !== 0);
    }
    
    handleWin() {
        this.gameOver = true;
        const winner = this.currentPlayer === 1 ? 'Red' : 'Yellow';
        
        if (this.currentPlayer === 1) {
            this.scores.red++;
        } else {
            this.scores.yellow++;
        }
        
        this.saveScores();
        this.updateUI();
        this.renderBoard(); // Show winning animation
        
        document.getElementById('gameResult').textContent = `${winner} wins`;
        document.getElementById('gameMessage').textContent = 'Four in a row.';
        document.getElementById('gameOver').style.display = 'block';
    }
    
    handleDraw() {
        this.gameOver = true;
        document.getElementById('gameResult').textContent = 'Draw';
        document.getElementById('gameMessage').textContent = 'The board is full.';
        document.getElementById('gameOver').style.display = 'block';
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateUI();
        this.renderColumnIndicators();
    }
    
    makeAIMove() {
        if (this.gameOver) return;
        
        // Simple AI: try to win, block opponent, or random
        let bestCol = this.findWinningMove(2);
        if (bestCol === -1) bestCol = this.findWinningMove(1);
        if (bestCol === -1) bestCol = this.getRandomMove();
        
        if (bestCol !== -1) {
            this.handleCellClick(bestCol);
        }
    }
    
    findWinningMove(player) {
        for (let col = 0; col < 7; col++) {
            if (!this.canDropPiece(col)) continue;
            
            // Simulate move
            let row = -1;
            for (let r = 5; r >= 0; r--) {
                if (this.board[r][col] === 0) {
                    row = r;
                    break;
                }
            }
            
            this.board[row][col] = player;
            const isWin = this.checkWin();
            this.board[row][col] = 0; // Undo move
            this.winningCells = [];
            
            if (isWin) return col;
        }
        
        return -1;
    }
    
    getRandomMove() {
        const availableCols = [];
        for (let col = 0; col < 7; col++) {
            if (this.canDropPiece(col)) {
                availableCols.push(col);
            }
        }
        
        return availableCols.length > 0 ? 
            availableCols[Math.floor(Math.random() * availableCols.length)] : -1;
    }
    
    updateUI() {
        const playerElement = document.getElementById('currentPlayer');
        const playerName = this.currentPlayer === 1 ? 'Red' : 'Yellow';
        const playerClass = this.currentPlayer === 1 ? 'player-red' : 'player-yellow';
        
        playerElement.textContent = playerName;
        playerElement.className = playerClass;
        
        document.getElementById('redScore').textContent = this.scores.red;
        document.getElementById('yellowScore').textContent = this.scores.yellow;
    }
    
    newGame() {
        this.board = Array(6).fill().map(() => Array(7).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.winningCells = [];
        
        this.renderBoard();
        this.renderColumnIndicators();
        this.updateUI();
    }
    
    toggleAI() {
        this.aiEnabled = !this.aiEnabled;
        alert(this.aiEnabled ? 'The computer now plays Yellow.' : 'Computer opponent off. Two players.');
    }
    
    resetScore() {
        this.scores = { red: 0, yellow: 0 };
        this.saveScores();
        this.updateUI();
    }
    
    saveScores() {
        localStorage.setItem('connect4Scores', JSON.stringify(this.scores));
    }
    
    loadScores() {
        const saved = localStorage.getItem('connect4Scores');
        if (saved) {
            this.scores = JSON.parse(saved);
            this.updateUI();
        }
    }
}

let game;
window.addEventListener('load', () => {
    game = new ConnectFour();
});