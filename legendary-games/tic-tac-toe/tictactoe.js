class TicTacToe {
    constructor() {
        this.board = Array(9).fill('');
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.aiEnabled = false;
        this.difficulty = 'hard';
        this.scores = { x: 0, o: 0, draw: 0 };
        this.winningCombos = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6] // diagonals
        ];
        this.winningCells = [];
        
        this.initGame();
    }
    
    initGame() {
        this.renderBoard();
        this.updateUI();
        this.loadScores();
    }
    
    renderBoard() {
        const board = document.getElementById('gameBoard');
        board.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('button');
            cell.className = 'cell';
            cell.textContent = this.board[i];
            cell.dataset.index = i;
            
            if (this.board[i] === 'X') cell.classList.add('x');
            if (this.board[i] === 'O') cell.classList.add('o');
            
            if (this.winningCells.includes(i)) {
                cell.classList.add('winning');
            }
            
            cell.addEventListener('click', () => this.handleCellClick(i));
            board.appendChild(cell);
        }
    }
    
    handleCellClick(index) {
        if (this.gameOver || this.board[index] !== '') return;
        
        this.makeMove(index, this.currentPlayer);
        
        if (this.checkWin()) {
            this.handleWin();
        } else if (this.isBoardFull()) {
            this.handleDraw();
        } else {
            this.switchPlayer();
            
            if (this.aiEnabled && this.currentPlayer === 'O') {
                setTimeout(() => this.makeAIMove(), 300);
            }
        }
    }
    
    makeMove(index, player) {
        this.board[index] = player;
        this.renderBoard();
    }
    
    checkWin() {
        for (const combo of this.winningCombos) {
            const [a, b, c] = combo;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                this.winningCells = combo;
                return true;
            }
        }
        return false;
    }
    
    isBoardFull() {
        return this.board.every(cell => cell !== '');
    }
    
    handleWin() {
        this.gameOver = true;
        const winner = this.currentPlayer;
        
        if (winner === 'X') {
            this.scores.x++;
        } else {
            this.scores.o++;
        }
        
        this.saveScores();
        this.updateUI();
        this.renderBoard();
        
        document.getElementById('gameResult').textContent = `${winner} wins`;
        document.getElementById('gameMessage').textContent = 'Three in a row.';
        document.getElementById('gameOver').style.display = 'block';
    }
    
    handleDraw() {
        this.gameOver = true;
        this.scores.draw++;
        this.saveScores();
        this.updateUI();
        
        document.getElementById('gameResult').textContent = 'Draw';
        document.getElementById('gameMessage').textContent = 'Nobody got three in a row.';
        document.getElementById('gameOver').style.display = 'block';
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.updateUI();
    }
    
    makeAIMove() {
        if (this.gameOver) return;
        
        let move;
        
        switch (this.difficulty) {
            case 'easy':
                move = this.getRandomMove();
                break;
            case 'medium':
                move = Math.random() < 0.7 ? this.getBestMove() : this.getRandomMove();
                break;
            case 'hard':
                move = this.getBestMove();
                break;
        }
        
        if (move !== -1) {
            this.handleCellClick(move);
        }
    }
    
    getBestMove() {
        // Try to win
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                this.board[i] = 'O';
                if (this.checkWin()) {
                    this.board[i] = '';
                    this.winningCells = [];
                    return i;
                }
                this.board[i] = '';
            }
        }
        
        // Try to block
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                this.board[i] = 'X';
                if (this.checkWin()) {
                    this.board[i] = '';
                    this.winningCells = [];
                    return i;
                }
                this.board[i] = '';
            }
        }
        
        // Take center if available
        if (this.board[4] === '') return 4;
        
        // Take corners
        const corners = [0, 2, 6, 8];
        const availableCorners = corners.filter(i => this.board[i] === '');
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }
        
        // Take any available space
        return this.getRandomMove();
    }
    
    getRandomMove() {
        const availableMoves = [];
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                availableMoves.push(i);
            }
        }
        
        return availableMoves.length > 0 ? 
            availableMoves[Math.floor(Math.random() * availableMoves.length)] : -1;
    }
    
    updateUI() {
        document.getElementById('currentPlayer').textContent = this.currentPlayer;
        document.getElementById('xScore').textContent = this.scores.x;
        document.getElementById('oScore').textContent = this.scores.o;
        document.getElementById('drawScore').textContent = this.scores.draw;
    }
    
    newGame() {
        this.board = Array(9).fill('');
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winningCells = [];
        
        this.renderBoard();
        this.updateUI();
    }
    
    toggleAI() {
        this.aiEnabled = !this.aiEnabled;
        alert(this.aiEnabled ? 'The computer now plays O.' : 'Computer opponent off. Two players.');
        if (!this.aiEnabled) {
            this.newGame();
        }
    }
    
    setDifficulty(level) {
        this.difficulty = level;
    }
    
    resetScore() {
        this.scores = { x: 0, o: 0, draw: 0 };
        this.saveScores();
        this.updateUI();
    }
    
    saveScores() {
        localStorage.setItem('tictactoeScores', JSON.stringify(this.scores));
    }
    
    loadScores() {
        const saved = localStorage.getItem('tictactoeScores');
        if (saved) {
            this.scores = JSON.parse(saved);
            this.updateUI();
        }
    }
}

let game;
window.addEventListener('load', () => {
    game = new TicTacToe();
});