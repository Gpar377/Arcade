class SpaceInvaders {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.player = { x: 400, y: 550, width: 40, height: 30, speed: 5 };
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.gameOver = false;
        this.paused = false;
        
        this.keys = {};
        this.lastShot = 0;
        this.shootCooldown = 200;
        
        this.setupControls();
        this.createEnemyWave();
        this.gameLoop();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                this.shoot();
            }
            if (e.key.toLowerCase() === 'p') {
                this.paused = !this.paused;
            }
            if (e.key.toLowerCase() === 'r') {
                this.restart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    createEnemyWave() {
        this.enemies = [];
        const rows = 5;
        const cols = 10;
        const enemyWidth = 30;
        const enemyHeight = 20;
        const spacing = 50;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.enemies.push({
                    x: col * spacing + 100,
                    y: row * 40 + 50,
                    width: enemyWidth,
                    height: enemyHeight,
                    type: row < 2 ? 'fast' : 'normal',
                    points: row < 2 ? 30 : 10
                });
            }
        }
    }
    
    update() {
        if (this.gameOver || this.paused) return;
        
        // Player movement
        if ((this.keys['a'] || this.keys['arrowleft']) && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if ((this.keys['d'] || this.keys['arrowright']) && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
        
        // Update bullets
        this.bullets.forEach((bullet, index) => {
            bullet.y -= 8;
            if (bullet.y < 0) {
                this.bullets.splice(index, 1);
            }
        });
        
        // Update enemy bullets
        this.enemyBullets.forEach((bullet, index) => {
            bullet.y += 4;
            if (bullet.y > this.canvas.height) {
                this.enemyBullets.splice(index, 1);
            }
        });
        
        // Move enemies
        let moveDown = false;
        let direction = Math.sin(Date.now() * 0.001) > 0 ? 1 : -1;
        
        this.enemies.forEach(enemy => {
            enemy.x += direction * 0.5;
            if (enemy.x <= 0 || enemy.x >= this.canvas.width - enemy.width) {
                moveDown = true;
            }
        });
        
        if (moveDown) {
            this.enemies.forEach(enemy => {
                enemy.y += 20;
            });
        }
        
        // Enemy shooting
        if (Math.random() < 0.002 && this.enemies.length > 0) {
            const randomEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            this.enemyBullets.push({
                x: randomEnemy.x + randomEnemy.width / 2,
                y: randomEnemy.y + randomEnemy.height,
                width: 3,
                height: 8
            });
        }
        
        // Collision detection
        this.checkCollisions();
        
        // Update particles
        this.updateParticles();
        
        // Check win condition
        if (this.enemies.length === 0) {
            this.wave++;
            this.createEnemyWave();
            this.updateUI();
        }
        
        // Check lose condition
        if (this.enemies.some(enemy => enemy.y + enemy.height >= this.player.y)) {
            this.lives = 0;
        }
        
        if (this.lives <= 0) {
            this.endGame();
        }
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shootCooldown) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 10
            });
            this.lastShot = now;
        }
    }
    
    checkCollisions() {
        // Bullet vs Enemy
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#00ff00');
                    this.score += enemy.points;
                    this.bullets.splice(bulletIndex, 1);
                    this.enemies.splice(enemyIndex, 1);
                    this.updateUI();
                }
            });
        });
        
        // Enemy bullet vs Player
        this.enemyBullets.forEach((bullet, index) => {
            if (this.isColliding(bullet, this.player)) {
                this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#ff0040');
                this.lives--;
                this.enemyBullets.splice(index, 1);
                this.updateUI();
            }
        });
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                maxLife: 30,
                color: color
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
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.drawStars();
        
        // Draw player
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw bullets
        this.ctx.fillStyle = '#ffff00';
        this.bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw enemy bullets
        this.ctx.fillStyle = '#ff0040';
        this.enemyBullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.type === 'fast' ? '#ff00ff' : '#00ffff';
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            this.ctx.strokeStyle = enemy.type === 'fast' ? '#ff00ff' : '#00ffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
        
        // Draw particles
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        });
        
        // Draw pause overlay
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width/2, this.canvas.height/2);
        }
    }
    
    drawStars() {
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.canvas.width;
            const y = (i * 73 + Date.now() * 0.01) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('wave').textContent = this.wave;
    }
    
    endGame() {
        this.gameOver = true;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalWave').textContent = this.wave;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    restart() {
        this.player = { x: 400, y: 550, width: 40, height: 30, speed: 5 };
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.gameOver = false;
        this.paused = false;
        
        document.getElementById('gameOver').style.display = 'none';
        this.createEnemyWave();
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
    game = new SpaceInvaders();
});