class WarCommander {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.gridSize = 40;
        this.cols = Math.floor(this.canvas.width / this.gridSize);
        this.rows = Math.floor(this.canvas.height / this.gridSize);
        
        this.currentPlayer = 1;
        this.selectedUnit = null;
        this.selectedAction = null;
        this.units = [];
        this.resources = { 1: 100, 2: 100 };
        this.unitCosts = { soldier: 20, tank: 50, aircraft: 40 };
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        document.getElementById('soldierBtn').addEventListener('click', () => this.selectUnitType('soldier'));
        document.getElementById('tankBtn').addEventListener('click', () => this.selectUnitType('tank'));
        document.getElementById('aircraftBtn').addEventListener('click', () => this.selectUnitType('aircraft'));
        
        document.getElementById('moveBtn').addEventListener('click', () => this.selectAction('move'));
        document.getElementById('attackBtn').addEventListener('click', () => this.selectAction('attack'));
        document.getElementById('endTurnBtn').addEventListener('click', () => this.endTurn());
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.gridSize);
        const y = Math.floor((e.clientY - rect.top) / this.gridSize);
        
        if (this.selectedAction === 'deploy') {
            this.deployUnit(x, y);
        } else if (this.selectedAction === 'move') {
            this.moveUnit(x, y);
        } else if (this.selectedAction === 'attack') {
            this.attackUnit(x, y);
        } else {
            this.selectUnit(x, y);
        }
    }
    
    selectUnitType(type) {
        if (this.resources[this.currentPlayer] >= this.unitCosts[type]) {
            this.selectedAction = 'deploy';
            this.selectedUnitType = type;
            this.clearButtonSelection();
            document.getElementById(type + 'Btn').classList.add('selected');
        }
    }
    
    selectAction(action) {
        this.selectedAction = action;
        this.clearButtonSelection();
        document.getElementById(action + 'Btn').classList.add('selected');
    }
    
    clearButtonSelection() {
        document.querySelectorAll('.unit-btn').forEach(btn => btn.classList.remove('selected'));
    }
    
    deployUnit(x, y) {
        if (this.getUnitAt(x, y)) return;
        
        const cost = this.unitCosts[this.selectedUnitType];
        if (this.resources[this.currentPlayer] < cost) return;
        
        // Check deployment zones
        const validZone = this.currentPlayer === 1 ? y >= this.rows - 3 : y <= 2;
        if (!validZone) return;
        
        const unitStats = {
            soldier: { hp: 3, maxHp: 3, attack: 2, range: 1, move: 2 },
            tank: { hp: 5, maxHp: 5, attack: 4, range: 1, move: 1 },
            aircraft: { hp: 2, maxHp: 2, attack: 5, range: 3, move: 3 }
        };
        
        const unit = {
            x, y,
            type: this.selectedUnitType,
            player: this.currentPlayer,
            moved: false,
            attacked: false,
            ...unitStats[this.selectedUnitType]
        };
        
        this.units.push(unit);
        this.resources[this.currentPlayer] -= cost;
        this.selectedAction = null;
        this.clearButtonSelection();
        this.updateUI();
    }
    
    selectUnit(x, y) {
        const unit = this.getUnitAt(x, y);
        if (unit && unit.player === this.currentPlayer) {
            this.selectedUnit = unit;
        } else {
            this.selectedUnit = null;
        }
    }
    
    moveUnit(x, y) {
        if (!this.selectedUnit || this.selectedUnit.moved) return;
        if (this.getUnitAt(x, y)) return;
        
        const distance = Math.abs(x - this.selectedUnit.x) + Math.abs(y - this.selectedUnit.y);
        if (distance <= this.selectedUnit.move) {
            this.selectedUnit.x = x;
            this.selectedUnit.y = y;
            this.selectedUnit.moved = true;
            this.selectedAction = null;
            this.clearButtonSelection();
        }
    }
    
    attackUnit(x, y) {
        if (!this.selectedUnit || this.selectedUnit.attacked) return;
        
        const target = this.getUnitAt(x, y);
        if (!target || target.player === this.currentPlayer) return;
        
        const distance = Math.abs(x - this.selectedUnit.x) + Math.abs(y - this.selectedUnit.y);
        if (distance <= this.selectedUnit.range) {
            target.hp -= this.selectedUnit.attack;
            this.selectedUnit.attacked = true;
            
            if (target.hp <= 0) {
                this.units = this.units.filter(u => u !== target);
            }
            
            this.selectedAction = null;
            this.clearButtonSelection();
            this.updateUI();
        }
    }
    
    getUnitAt(x, y) {
        return this.units.find(unit => unit.x === x && unit.y === y);
    }
    
    endTurn() {
        // Reset unit actions
        this.units.forEach(unit => {
            if (unit.player === this.currentPlayer) {
                unit.moved = false;
                unit.attacked = false;
            }
        });
        
        // Add resources
        this.resources[this.currentPlayer] += 20;
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.selectedUnit = null;
        this.selectedAction = null;
        this.clearButtonSelection();
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('p1Units').textContent = this.units.filter(u => u.player === 1).length;
        document.getElementById('p2Units').textContent = this.units.filter(u => u.player === 2).length;
        document.getElementById('p1Resources').textContent = this.resources[1];
        document.getElementById('p2Resources').textContent = this.resources[2];
        
        const turnIndicator = document.getElementById('turnIndicator');
        turnIndicator.innerHTML = this.currentPlayer === 1 ? 
            '<span class="player1">Player 1\'s Turn</span>' : 
            '<span class="player2">Player 2\'s Turn</span>';
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.gridSize, 0);
            this.ctx.lineTo(x * this.gridSize, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.gridSize);
            this.ctx.lineTo(this.canvas.width, y * this.gridSize);
            this.ctx.stroke();
        }
        
        // Draw deployment zones
        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        this.ctx.fillRect(0, (this.rows - 3) * this.gridSize, this.canvas.width, 3 * this.gridSize);
        
        this.ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, 3 * this.gridSize);
        
        // Draw units
        this.units.forEach(unit => {
            const x = unit.x * this.gridSize;
            const y = unit.y * this.gridSize;
            
            // Unit background
            this.ctx.fillStyle = unit.player === 1 ? '#3498db' : '#e74c3c';
            this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
            
            // Unit icon
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            const icons = { soldier: '👤', tank: '🚗', aircraft: '✈️' };
            this.ctx.fillText(icons[unit.type], x + this.gridSize/2, y + this.gridSize/2 + 7);
            
            // HP bar
            const barWidth = this.gridSize - 8;
            const barHeight = 4;
            const hpPercent = unit.hp / unit.maxHp;
            
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(x + 4, y + this.gridSize - 8, barWidth, barHeight);
            
            this.ctx.fillStyle = hpPercent > 0.5 ? '#27ae60' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
            this.ctx.fillRect(x + 4, y + this.gridSize - 8, barWidth * hpPercent, barHeight);
            
            // Selection highlight
            if (unit === this.selectedUnit) {
                this.ctx.strokeStyle = '#f1c40f';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(x, y, this.gridSize, this.gridSize);
            }
        });
        
        // Draw action indicators
        if (this.selectedUnit && this.selectedAction === 'move') {
            this.drawMoveRange(this.selectedUnit);
        }
        if (this.selectedUnit && this.selectedAction === 'attack') {
            this.drawAttackRange(this.selectedUnit);
        }
    }
    
    drawMoveRange(unit) {
        this.ctx.fillStyle = 'rgba(46, 213, 115, 0.3)';
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                const distance = Math.abs(x - unit.x) + Math.abs(y - unit.y);
                if (distance <= unit.move && !this.getUnitAt(x, y)) {
                    this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
                }
            }
        }
    }
    
    drawAttackRange(unit) {
        this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                const distance = Math.abs(x - unit.x) + Math.abs(y - unit.y);
                if (distance <= unit.range) {
                    this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
                }
            }
        }
    }
    
    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new WarCommander();
});