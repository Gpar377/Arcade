class Chess {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameOver = false;
        this.aiEnabled = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        
        this.pieces = {
            // same solid glyphs for both sides; colour comes from CSS. \uFE0E stops phones swapping in emoji.
            white: { king: '♚\uFE0E', queen: '♛\uFE0E', rook: '♜\uFE0E', bishop: '♝\uFE0E', knight: '♞\uFE0E', pawn: '♟\uFE0E' },
            black: { king: '♚\uFE0E', queen: '♛\uFE0E', rook: '♜\uFE0E', bishop: '♝\uFE0E', knight: '♞\uFE0E', pawn: '♟\uFE0E' }
        };
        
        this.initBoard();
        this.renderBoard();
        this.updateUI();
    }
    
    initBoard() {
        // Initialize empty board
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Place pieces
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        // Black pieces
        for (let i = 0; i < 8; i++) {
            this.board[0][i] = { type: backRow[i], color: 'black' };
            this.board[1][i] = { type: 'pawn', color: 'black' };
        }
        
        // White pieces
        for (let i = 0; i < 8; i++) {
            this.board[6][i] = { type: 'pawn', color: 'white' };
            this.board[7][i] = { type: backRow[i], color: 'white' };
        }
    }
    
    renderBoard() {
        const boardElement = document.getElementById('chessBoard');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = this.pieces[piece.color][piece.type];
                    square.dataset.piece = piece.color;
                }
                
                square.addEventListener('click', () => this.handleSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }
    }
    
    handleSquareClick(row, col) {
        if (this.gameOver) return;
        
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const piece = this.board[row][col];
        
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            
            if (row === selectedRow && col === selectedCol) {
                // Deselect
                this.clearSelection();
                return;
            }
            
            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
                this.switchPlayer();
                
                if (this.aiEnabled && this.currentPlayer === 'black') {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            } else {
                this.clearSelection();
                if (piece && piece.color === this.currentPlayer) {
                    this.selectSquare(row, col);
                }
            }
        } else {
            if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(row, col);
            }
        }
    }
    
    selectSquare(row, col) {
        // highlightMoves() clears the old selection first, so record the new one afterwards
        this.highlightMoves(row, col);
        this.selectedSquare = [row, col];
    }
    
    clearSelection() {
        this.selectedSquare = null;
        document.querySelectorAll('.square').forEach(sq => {
            sq.classList.remove('selected', 'possible-move', 'capture');
        });
    }
    
    highlightMoves(row, col) {
        this.clearSelection();
        
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');
        
        const moves = this.getPossibleMoves(row, col);
        moves.forEach(([r, c]) => {
            const targetSquare = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (this.board[r][c]) {
                targetSquare.classList.add('capture');
            } else {
                targetSquare.classList.add('possible-move');
            }
        });
    }
    
    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        const moves = [];
        
        switch (piece.type) {
            case 'pawn':
                moves.push(...this.getPawnMoves(row, col, piece.color));
                break;
            case 'rook':
                moves.push(...this.getRookMoves(row, col));
                break;
            case 'bishop':
                moves.push(...this.getBishopMoves(row, col));
                break;
            case 'queen':
                moves.push(...this.getRookMoves(row, col));
                moves.push(...this.getBishopMoves(row, col));
                break;
            case 'knight':
                moves.push(...this.getKnightMoves(row, col));
                break;
            case 'king':
                moves.push(...this.getKingMoves(row, col));
                break;
        }
        
        return moves.filter(([r, c]) => this.isValidMove(row, col, r, c));
    }
    
    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        
        // Forward move
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push([row + direction, col]);
            
            // Double move from start
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }
        
        // Captures
        for (const dc of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + dc;
            if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] && 
                this.board[newRow][newCol].color !== color) {
                moves.push([newRow, newCol]);
            }
        }
        
        return moves;
    }
    
    getRookMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                
                if (!this.isInBounds(newRow, newCol)) break;
                
                if (this.board[newRow][newCol]) {
                    if (this.board[newRow][newCol].color !== this.board[row][col].color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
                
                moves.push([newRow, newCol]);
            }
        }
        
        return moves;
    }
    
    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                
                if (!this.isInBounds(newRow, newCol)) break;
                
                if (this.board[newRow][newCol]) {
                    if (this.board[newRow][newCol].color !== this.board[row][col].color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
                
                moves.push([newRow, newCol]);
            }
        }
        
        return moves;
    }
    
    getKnightMoves(row, col) {
        const moves = [];
        const knightMoves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
        
        for (const [dr, dc] of knightMoves) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol) && 
                (!this.board[newRow][newCol] || this.board[newRow][newCol].color !== this.board[row][col].color)) {
                moves.push([newRow, newCol]);
            }
        }
        
        return moves;
    }
    
    getKingMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol) && 
                (!this.board[newRow][newCol] || this.board[newRow][newCol].color !== this.board[row][col].color)) {
                moves.push([newRow, newCol]);
            }
        }
        
        return moves;
    }
    
    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    isValidMove(fromRow, fromCol, toRow, toCol) {
        if (!this.isInBounds(toRow, toCol)) return false;
        
        const piece = this.board[fromRow][fromCol];
        const target = this.board[toRow][toCol];
        
        if (!piece || piece.color !== this.currentPlayer) return false;
        if (target && target.color === piece.color) return false;
        
        return true;
    }
    
    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // Save move for undo
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            captured: capturedPiece
        });
        
        // Handle capture
        if (capturedPiece) {
            this.capturedPieces[this.currentPlayer].push(capturedPiece);
        }
        
        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.board[toRow][toCol] = { type: 'queen', color: piece.color };
        }
        
        this.renderBoard();
        this.updateCapturedPieces();
        this.checkGameEnd();
    }
    
    makeAIMove() {
        const allMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    const moves = this.getPossibleMoves(row, col);
                    moves.forEach(([toRow, toCol]) => {
                        allMoves.push({ from: [row, col], to: [toRow, toCol] });
                    });
                }
            }
        }
        
        if (allMoves.length > 0) {
            const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
            this.makeMove(randomMove.from[0], randomMove.from[1], randomMove.to[0], randomMove.to[1]);
            this.switchPlayer();
        }
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.updateUI();
    }
    
    updateUI() {
        const playerElement = document.getElementById('currentPlayer');
        playerElement.textContent = this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        playerElement.className = `player ${this.currentPlayer}`;
    }
    
    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('whiteCaptured');
        const blackCaptured = document.getElementById('blackCaptured');
        
        whiteCaptured.innerHTML = this.capturedPieces.white.map(piece => 
            `<span class="cap ${piece.color}">${this.pieces[piece.color][piece.type]}</span>`).join('');
        blackCaptured.innerHTML = this.capturedPieces.black.map(piece => 
            `<span class="cap ${piece.color}">${this.pieces[piece.color][piece.type]}</span>`).join('');
    }
    
    checkGameEnd() {
        // This version has no check rules, so the game is won by taking the king.
        const mover = this.currentPlayer;
        const other = mover === 'white' ? 'black' : 'white';
        const name = c => c.charAt(0).toUpperCase() + c.slice(1);
        const kingAlive = this.board.some(r => r.some(p => p && p.type === 'king' && p.color === other));

        if (!kingAlive || !this.hasValidMoves(other)) {
            this.gameOver = true;
            document.getElementById('gameResult').textContent = `${name(mover)} wins`;
            document.getElementById('gameMessage').textContent = kingAlive
                ? `${name(other)} has no moves left.`
                : `${name(mover)} took the king.`;
            document.getElementById('gameOver').style.display = 'block';
        }
    }
    
    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }
    
    newGame() {
        this.gameOver = false;
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.initBoard();
        this.renderBoard();
        this.updateUI();
        this.updateCapturedPieces();
    }
    
    undoMove() {
        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory.pop();
        const { from, to, piece, captured } = lastMove;
        
        this.board[from[0]][from[1]] = piece;
        this.board[to[0]][to[1]] = captured;
        
        if (captured) {
            const capturedArray = this.capturedPieces[piece.color];
            const index = capturedArray.findIndex(p => p.type === captured.type && p.color === captured.color);
            if (index > -1) capturedArray.splice(index, 1);
        }
        
        this.switchPlayer();
        this.renderBoard();
        this.updateCapturedPieces();
    }
    
    toggleAI() {
        this.aiEnabled = !this.aiEnabled;
        alert(`AI ${this.aiEnabled ? 'enabled' : 'disabled'}`);
    }
}

let game;
window.addEventListener('load', () => {
    game = new Chess();
});