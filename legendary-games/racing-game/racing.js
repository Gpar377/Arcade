class NeonRacer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 30,
            height: 60,
            speed: 0,
            maxSpeed: 8,
            acceleration: 0.2,
            friction: 0.95,
            angle: 0
        };
        
        this.cars = [];
        this.roadLines = [];
        this.particles = [];
        
        this.speed = 0;
        this.distance = 0;
        this.score = 0;
        this.topSpeed = 0;
        this.gameOver = false;
        this.nitroTime = 0;
        
        this.keys = {};
        this.roadOffset = 0;
        
        this.setupControls();
        this.initRoad();
        this.gameLoop();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                this.activateNitro();
            }
            if (e.key.toLowerCase() === 'r') {
                this.restart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    initRoad() {
        for (let i = 0; i < 20; i++) {
            this.roadLines.push({
                x: this.canvas.width / 2,
                y: i * 40,
                width: 4,
                height: 20
            });
        }
        this.spawnCar();
    }
    
    spawnCar() {
        if (Math.random() < 0.02) {
            const lanes = [200, 300, 400, 500];
            this.cars.push({
                x: lanes[Math.floor(Math.random() * lanes.length)],
                y: -60,
                width: 30,
                height: 60,
                speed: Math.random() * 3 + 2,
                color: ['#ff0040', '#00ff40', '#4000ff', '#ff4000'][Math.floor(Math.random() * 4)]
            });
        }
    }
    
    activateNitro() {
        if (this.nitroTime <= 0) {
            this.nitroTime = 120;
            this.player.maxSpeed = 12;
        }
    }
    
    update() {
        if (this.gameOver) return;
        
        if (this.keys['w']) {
            this.player.speed = Math.min(this.player.speed + this.player.acceleration, this.player.maxSpeed);
        }
        if (this.keys['s']) {
            this.player.speed = Math.max(this.player.speed - this.player.acceleration * 2, -2);
        }
        if (this.keys['a'] && this.player.x > 150) {
            this.player.x -= 4;
            this.player.angle = -0.1;
        } else if (this.keys['d'] && this.player.x < this.canvas.width - 150) {
            this.player.x += 4;
            this.player.angle = 0.1;
        } else {
            this.player.angle *= 0.9;
        }
        
        this.player.speed *= this.player.friction;
        
        if (this.nitroTime > 0) {
            this.nitroTime--;
            this.createNitroParticles();
            if (this.nitroTime === 0) {
                this.player.maxSpeed = 8;
            }
        }
        
        this.roadLines.forEach(line => {
            line.y += this.player.speed * 2;
            if (line.y > this.canvas.height) {
                line.y = -20;
            }
        });
        
        this.cars.forEach((car, index) => {
            car.y += this.player.speed * 2 + car.speed;
            if (car.y > this.canvas.height) {
                this.cars.splice(index, 1);
                this.score += 10;
            }
        });
        
        this.spawnCar();
        this.checkCollisions();
        
        this.speed = Math.round(this.player.speed * 20);
        this.distance += this.player.speed;
        this.topSpeed = Math.max(this.topSpeed, this.speed);
        
        this.updateParticles();
        this.updateUI();
    }
    
    checkCollisions() {
        this.cars.forEach(car => {
            if (this.isColliding(this.player, car)) {
                this.createCrashParticles(this.player.x, this.player.y);
                this.endGame();
            }
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createNitroParticles() {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                life: 20,
                maxLife: 20,
                color: '#00ffff'
            });
        }
    }
    
    createCrashParticles(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x + this.player.width / 2,
                y: y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 60,
                maxLife: 60,
                color: '#ff0040'
            });
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(150, 0, this.canvas.width - 300, this.canvas.height);
        
        this.ctx.fillStyle = '#ffff00';
        this.roadLines.forEach(line => {
            this.ctx.fillRect(line.x - line.width/2, line.y, line.width, line.height);
        });
        
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(150, 0);
        this.ctx.lineTo(150, this.canvas.height);
        this.ctx.moveTo(this.canvas.width - 150, 0);
        this.ctx.lineTo(this.canvas.width - 150, this.canvas.height);
        this.ctx.stroke();
        
        this.cars.forEach(car => {
            this.ctx.fillStyle = car.color;
            this.ctx.fillRect(car.x, car.y, car.width, car.height);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(car.x, car.y, car.width, car.height);
        });
        
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
        this.ctx.rotate(this.player.angle);
        
        if (this.nitroTime > 0) {
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 20;
        }
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(-this.player.width/2, -this.player.height/2, this.player.width, this.player.height);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-this.player.width/2, -this.player.height/2, this.player.width, this.player.height);
        
        this.ctx.restore();
        
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        });
        
        if (this.nitroTime > 0) {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            this.ctx.fillRect(this.canvas.width - 200, 20, (this.nitroTime / 120) * 150, 10);
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.strokeRect(this.canvas.width - 200, 20, 150, 10);
        }
    }
    
    updateUI() {
        document.getElementById('speed').textContent = this.speed;
        document.getElementById('distance').textContent = Math.round(this.distance);
        document.getElementById('score').textContent = this.score;
    }
    
    endGame() {
        this.gameOver = true;
        document.getElementById('finalDistance').textContent = Math.round(this.distance);
        document.getElementById('topSpeed').textContent = this.topSpeed;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    restart() {
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 30,
            height: 60,
            speed: 0,
            maxSpeed: 8,
            acceleration: 0.2,
            friction: 0.95,
            angle: 0
        };
        
        this.cars = [];
        this.particles = [];
        this.speed = 0;
        this.distance = 0;
        this.score = 0;
        this.topSpeed = 0;
        this.gameOver = false;
        this.nitroTime = 0;
        
        document.getElementById('gameOver').style.display = 'none';
        this.initRoad();
        this.updateUI();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

let game;
window.addEventListener('load', () => {
    game = new NeonRacer();
});