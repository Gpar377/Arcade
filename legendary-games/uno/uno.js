class UnoGame {
    constructor() {
        this.colors = ['red', 'blue', 'green', 'yellow'];
        this.numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.specials = ['skip', 'reverse', 'draw2'];
        this.wilds = ['wild', 'wild4'];
        
        this.deck = [];
        this.playerHand = [];
        this.computerHand = [];
        this.discardPile = [];
        this.currentPlayer = 'player';
        this.gameDirection = 1;
        this.currentColor = null;
        this.gameOver = false;
        
        this.initGame();
        this.setupEventListeners();
    }
    
    initGame() {
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.startGame();
        this.updateDisplay();
    }
    
    createDeck() {
        this.deck = [];
        
        // Number cards (0-9) for each color
        this.colors.forEach(color => {
            this.numbers.forEach(number => {
                this.deck.push({ color, value: number, type: 'number' });
                if (number !== 0) { // Two of each except 0
                    this.deck.push({ color, value: number, type: 'number' });
                }
            });
            
            // Special cards (2 of each per color)
            this.specials.forEach(special => {
                this.deck.push({ color, value: special, type: 'special' });
                this.deck.push({ color, value: special, type: 'special' });
            });
        });
        
        // Wild cards (4 of each)
        for (let i = 0; i < 4; i++) {
            this.deck.push({ color: 'wild', value: 'wild', type: 'wild' });
            this.deck.push({ color: 'wild', value: 'wild4', type: 'wild' });
        }
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    dealCards() {
        this.playerHand = [];
        this.computerHand = [];
        
        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            this.playerHand.push(this.deck.pop());
            this.computerHand.push(this.deck.pop());
        }
    }
    
    startGame() {
        // Find first non-wild card for discard pile
        let startCard;
        do {
            startCard = this.deck.pop();
        } while (startCard.type === 'wild');
        
        this.discardPile = [startCard];
        this.currentColor = startCard.color;
        this.currentPlayer = 'player';
        this.gameOver = false;
    }
    
    setupEventListeners() {
        document.getElementById('drawBtn').addEventListener('click', () => this.drawCard());
        document.getElementById('unoBtn').addEventListener('click', () => this.callUno());
        document.getElementById('newGameBtn').addEventListener('click', () => this.initGame());
        
        // Color selector
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectWildColor(e.target.dataset.color);
            });
        });
    }
    
    drawCard() {
        if (this.currentPlayer !== 'player' || this.gameOver) return;
        
        if (this.deck.length === 0) {
            this.reshuffleDeck();
        }
        
        const card = this.deck.pop();
        this.playerHand.push(card);
        this.showMessage('You drew a card');
        this.switchPlayer();
        this.updateDisplay();
        
        setTimeout(() => this.computerTurn(), 1000);
    }
    
    playCard(cardIndex) {
        if (this.currentPlayer !== 'player' || this.gameOver) return;
        
        const card = this.playerHand[cardIndex];
        if (!this.isValidPlay(card)) {
            this.showMessage('Invalid move!');
            return;
        }
        
        // Remove card from hand
        this.playerHand.splice(cardIndex, 1);
        this.discardPile.push(card);
        
        // Handle special cards
        this.handleSpecialCard(card);
        
        // Check for win
        if (this.playerHand.length === 0) {
            this.gameOver = true;
            this.showMessage('🎉 You Win! 🎉');
            return;
        }
        
        // Check for UNO
        if (this.playerHand.length === 1) {
            this.showMessage('Don\'t forget to call UNO!');
        }
        
        this.updateDisplay();
        
        if (!this.gameOver && this.currentPlayer === 'computer') {
            setTimeout(() => this.computerTurn(), 1000);
        }
    }
    
    isValidPlay(card) {
        const topCard = this.discardPile[this.discardPile.length - 1];
        
        if (card.type === 'wild') return true;
        if (card.color === this.currentColor) return true;
        if (card.value === topCard.value) return true;
        
        return false;
    }
    
    handleSpecialCard(card) {
        switch (card.value) {
            case 'skip':
                this.showMessage('Player skipped!');
                this.switchPlayer();
                break;
            case 'reverse':
                this.gameDirection *= -1;
                this.showMessage('Direction reversed!');
                break;
            case 'draw2':
                if (this.currentPlayer === 'player') {
                    for (let i = 0; i < 2; i++) {
                        if (this.deck.length > 0) {
                            this.computerHand.push(this.deck.pop());
                        }
                    }
                    this.showMessage('Computer draws 2 cards!');
                } else {
                    for (let i = 0; i < 2; i++) {
                        if (this.deck.length > 0) {
                            this.playerHand.push(this.deck.pop());
                        }
                    }
                    this.showMessage('You draw 2 cards!');
                }
                this.switchPlayer();
                break;
            case 'wild':
                if (this.currentPlayer === 'player') {
                    this.showColorSelector();
                    return; // Don't switch player yet
                } else {
                    this.currentColor = this.colors[Math.floor(Math.random() * 4)];
                    this.showMessage(`Computer chose ${this.currentColor}`);
                }
                break;
            case 'wild4':
                if (this.currentPlayer === 'player') {
                    for (let i = 0; i < 4; i++) {
                        if (this.deck.length > 0) {
                            this.computerHand.push(this.deck.pop());
                        }
                    }
                    this.showMessage('Computer draws 4 cards!');
                    this.showColorSelector();
                    return; // Don't switch player yet
                } else {
                    for (let i = 0; i < 4; i++) {
                        if (this.deck.length > 0) {
                            this.playerHand.push(this.deck.pop());
                        }
                    }
                    this.currentColor = this.colors[Math.floor(Math.random() * 4)];
                    this.showMessage(`You draw 4 cards! Computer chose ${this.currentColor}`);
                }
                this.switchPlayer();
                break;
            default:
                this.currentColor = card.color;
                this.switchPlayer();
        }
    }
    
    showColorSelector() {
        document.getElementById('colorSelector').style.display = 'block';
    }
    
    selectWildColor(color) {
        this.currentColor = color;
        document.getElementById('colorSelector').style.display = 'none';
        this.showMessage(`You chose ${color}`);
        this.switchPlayer();
        this.updateDisplay();
        
        if (this.currentPlayer === 'computer') {
            setTimeout(() => this.computerTurn(), 1000);
        }
    }
    
    computerTurn() {
        if (this.currentPlayer !== 'computer' || this.gameOver) return;
        
        // Find playable cards
        const playableCards = this.computerHand.filter(card => this.isValidPlay(card));
        
        if (playableCards.length > 0) {
            // Play a random valid card
            const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
            const cardIndex = this.computerHand.indexOf(cardToPlay);
            
            this.computerHand.splice(cardIndex, 1);
            this.discardPile.push(cardToPlay);
            
            this.showMessage(`Computer played ${cardToPlay.value} ${cardToPlay.color}`);
            
            // Handle special cards
            this.handleSpecialCard(cardToPlay);
            
            // Check for win
            if (this.computerHand.length === 0) {
                this.gameOver = true;
                this.showMessage('💻 Computer Wins! 💻');
                return;
            }
            
            // Check for UNO
            if (this.computerHand.length === 1) {
                this.showMessage('Computer says UNO!');
            }
        } else {
            // Draw a card
            if (this.deck.length === 0) {
                this.reshuffleDeck();
            }
            this.computerHand.push(this.deck.pop());
            this.showMessage('Computer drew a card');
            this.switchPlayer();
        }
        
        this.updateDisplay();
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'player' ? 'computer' : 'player';
    }
    
    callUno() {
        if (this.playerHand.length === 1) {
            this.showMessage('UNO called!');
        } else {
            this.showMessage('You can only call UNO with 1 card!');
        }
    }
    
    reshuffleDeck() {
        const topCard = this.discardPile.pop();
        this.deck = [...this.discardPile];
        this.discardPile = [topCard];
        this.shuffleDeck();
    }
    
    showMessage(text) {
        const message = document.getElementById('message');
        message.textContent = text;
        message.style.display = 'block';
        setTimeout(() => {
            message.style.display = 'none';
        }, 2000);
    }
    
    updateDisplay() {
        // Update card counts
        document.getElementById('playerCardCount').textContent = this.playerHand.length;
        document.getElementById('computerCardCount').textContent = this.computerHand.length;
        document.getElementById('currentPlayer').textContent = this.currentPlayer === 'player' ? 'You' : 'Computer';
        
        // Update player hand
        const playerHandEl = document.getElementById('playerHand');
        playerHandEl.innerHTML = '';
        this.playerHand.forEach((card, index) => {
            const cardEl = this.createCardElement(card);
            cardEl.addEventListener('click', () => this.playCard(index));
            playerHandEl.appendChild(cardEl);
        });
        
        // Update computer hand (back of cards)
        const computerHandEl = document.getElementById('computerHand');
        computerHandEl.innerHTML = '';
        this.computerHand.forEach(() => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.textContent = 'UNO';
            computerHandEl.appendChild(cardEl);
        });
        
        // Update discard pile
        const discardPileEl = document.getElementById('discardPile');
        const topCard = this.discardPile[this.discardPile.length - 1];
        if (topCard) {
            discardPileEl.className = `card ${topCard.color}`;
            discardPileEl.textContent = topCard.value.toString().toUpperCase();
        }
    }
    
    createCardElement(card) {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.color}`;
        cardEl.textContent = card.value.toString().toUpperCase();
        return cardEl;
    }
}

// Initialize game
window.addEventListener('load', () => {
    new UnoGame();
});