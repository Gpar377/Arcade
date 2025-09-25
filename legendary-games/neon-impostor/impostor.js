class NeonImpostor {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        // Game state
        this.gameState = 'playing'; // playing, meeting, gameOver
        this.isImpostor = Math.random() < 0.3; // 30% chance to be impostor
        this.playerId = 0;
        
        // Players
        this.players = [
            { id: 0, name: 'You', x: 400, y: 300, color: '#ff0040', alive: true, isImpostor: this.isImpostor },
            { id: 1, name: 'Red', x: 200, y: 200, color: '#ff0000', alive: true, isImpostor: false },
            { id: 2, name: 'Blue', x: 600, y: 200, color: '#0080ff', alive: true, isImpostor: !this.isImpostor && Math.random() < 0.5 },
            { id: 3, name: 'Green', x: 300, y: 400, color: '#00ff00', alive: true, isImpostor: false },
            { id: 4, name: 'Yellow', x: 500, y: 400, color: '#ffff00', alive: true, isImpostor: false },
            { id: 5, name: 'Purple', x: 150, y: 350, color: '#8000ff', alive: true, isImpostor: false }
        ];
        
        // Ensure at least one impostor exists
        if (!this.players.some(p => p.isImpostor)) {
            this.players[Math.floor(Math.random() * this.players.length)].isImpostor = true;
        }
        
        // Tasks
        this.tasks = [
            { name: 'Fix Wiring', location: 'Electrical', completed: false },
            { name: 'Calibrate Distributor', location: 'Electrical', completed: false },
            { name: 'Empty Garbage', location: 'Storage', completed: false },
            { name: 'Fuel Engines', location: 'Engine Room', completed: false },
            { name: 'Scan Boarding Pass', location: 'Admin', completed: false }
        ];
        
        // Map rooms
        this.rooms = [
            { name: 'Cafeteria', x: 350, y: 250, width: 100, height: 80, color: '#444' },
            { name: 'Engine Room', x: 50, y: 150, width: 120, height: 100, color: '#666' },
            { name: 'Electrical', x: 600, y: 150, width: 100, height: 80, color: '#333' },
            { name: 'Storage', x: 300, y: 450, width: 200, height: 100, color: '#555' },
            { name: 'Admin', x: 150, y: 350, width: 100, height: 80, color: '#777' }
        ];
        
        // Game mechanics
        this.killCooldown = 0;
        this.sabotageCooldown = 0;
        this.emergencyMeetings = 1;
        this.votingTime = 0;
        this.votes = {};
        this.deadBodies = [];
        
        // Visual effects
        this.particles = [];
        this.alerts = [];
        
        this.init();
    }
    
    init() {
        this.updateUI();
        this.updatePlayersList();
        this.updateTasksList();
        this.gameLoop();
        
        // AI behavior for other players
        setInterval(() => this.updateAI(), 2000);
    }
    
    updateAI() {
        if (this.gameState !== 'playing') return;
        
        this.players.forEach(player => {
            if (player.id === this.playerId || !player.alive) return;
            
            // Random movement
            player.x += (Math.random() - 0.5) * 40;
            player.y += (Math.random() - 0.5) * 40;
            
            // Keep in bounds
            player.x = Math.max(50, Math.min(750, player.x));
            player.y = Math.max(50, Math.min(550, player.y));
            
            // AI impostor behavior
            if (player.isImpostor && Math.random() < 0.1) {
                const nearbyCrewmates = this.players.filter(p => 
                    !p.isImpostor && p.alive && p.id !== this.playerId &&
                    Math.abs(p.x - player.x) < 80 && Math.abs(p.y - player.y) < 80
                );
                
                if (nearbyCrewmates.length > 0 && Math.random() < 0.3) {
                    const victim = nearbyCrewmates[0];
                    this.killPlayer(victim.id);
                }
            }
        });
    }
    
    doTask() {
        if (!this.isImpostor && this.gameState === 'playing') {
            const incompleteTasks = this.tasks.filter(t => !t.completed);
            if (incompleteTasks.length > 0) {
                const task = incompleteTasks[Math.floor(Math.random() * incompleteTasks.length)];
                task.completed = true;
                this.createAlert('Task completed!', '#00ff00');
                this.updateTasksList();
                this.checkWinCondition();
            }
        }
    }
    
    sabotage() {
        if (this.isImpostor && this.sabotageCooldown <= 0 && this.gameState === 'playing') {
            this.sabotageCooldown = 300; // 5 seconds
            this.createAlert('Systems sabotaged!', '#ff0040');
            
            // Create sabotage effect
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 60,
                    color: '#ff0040',
                    size: Math.random() * 4 + 2
                });
            }
        }
    }
    
    kill() {
        if (this.isImpostor && this.killCooldown <= 0 && this.gameState === 'playing') {
            const nearbyPlayers = this.players.filter(p => 
                p.id !== this.playerId && p.alive &&
                Math.abs(p.x - this.players[0].x) < 100 && 
                Math.abs(p.y - this.players[0].y) < 100
            );
            
            if (nearbyPlayers.length > 0) {
                const victim = nearbyPlayers[0];
                this.killPlayer(victim.id);
                this.killCooldown = 600; // 10 seconds
            }
        }
    }
    
    killPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player && player.alive) {
            player.alive = false;
            this.deadBodies.push({ x: player.x, y: player.y, color: player.color });
            
            // Create death particles
            for (let i = 0; i < 15; i++) {
                this.particles.push({
                    x: player.x,
                    y: player.y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    life: 40,
                    color: player.color,
                    size: Math.random() * 3 + 1
                });
            }
            
            this.createAlert(`${player.name} was eliminated!`, '#ff0040');
            this.updatePlayersList();
            this.checkWinCondition();
        }
    }
    
    reportBody() {
        if (this.deadBodies.length > 0 && this.gameState === 'playing') {
            this.callEmergencyMeeting('A body was reported!');
        }
    }
    
    callEmergency() {
        if (this.emergencyMeetings > 0 && this.gameState === 'playing') {
            this.emergencyMeetings--;
            this.callEmergencyMeeting('Emergency meeting called!');
        }
    }
    
    callEmergencyMeeting(reason) {
        this.gameState = 'meeting';
        this.votingTime = 30; // 30 seconds to vote
        this.votes = {};
        this.createAlert(reason, '#ffff00');
        this.showVotingPanel();
        
        // Auto-vote for AI players after random delay
        setTimeout(() => {
            this.players.forEach(player => {
                if (player.id !== this.playerId && player.alive && Math.random() < 0.8) {
                    const suspects = this.players.filter(p => p.alive && p.id !== player.id);
                    if (suspects.length > 0) {
                        const target = suspects[Math.floor(Math.random() * suspects.length)];
                        this.votes[player.id] = target.id;
                    }
                }
            });
        }, Math.random() * 15000 + 5000);
    }
    
    showVotingPanel() {
        const panel = document.getElementById('votingPanel');
        const options = document.getElementById('voteOptions');
        options.innerHTML = '';
        
        this.players.filter(p => p.alive).forEach(player => {
            const btn = document.createElement('button');
            btn.className = 'vote-btn';
            btn.textContent = player.name;
            btn.style.backgroundColor = player.color;
            btn.onclick = () => this.vote(player.id);
            options.appendChild(btn);
        });
        
        panel.style.display = 'block';
    }
    
    vote(playerId) {
        this.votes[this.playerId] = playerId;
        this.createAlert(`You voted for ${this.players.find(p => p.id === playerId).name}`, '#ffff00');
        
        // Check if voting is complete
        setTimeout(() => this.processVotes(), 2000);
    }
    
    skipVote() {
        this.votes[this.playerId] = -1; // Skip vote
        this.createAlert('You skipped the vote', '#00ffff');
        setTimeout(() => this.processVotes(), 2000);
    }
    
    processVotes() {
        document.getElementById('votingPanel').style.display = 'none';
        
        // Count votes
        const voteCount = {};
        Object.values(this.votes).forEach(vote => {
            if (vote !== -1) {
                voteCount[vote] = (voteCount[vote] || 0) + 1;
            }
        });
        
        // Find player with most votes
        let maxVotes = 0;
        let ejectedPlayer = null;
        Object.entries(voteCount).forEach(([playerId, votes]) => {
            if (votes > maxVotes) {
                maxVotes = votes;
                ejectedPlayer = parseInt(playerId);
            }
        });
        
        if (ejectedPlayer !== null && maxVotes > 1) {
            const player = this.players.find(p => p.id === ejectedPlayer);
            player.alive = false;
            this.createAlert(`${player.name} was ejected! ${player.isImpostor ? 'They were an impostor!' : 'They were innocent...'}`, 
                           player.isImpostor ? '#00ff00' : '#ff0040');
        } else {
            this.createAlert('No one was ejected (tie vote)', '#ffff00');
        }
        
        this.gameState = 'playing';
        this.deadBodies = []; // Clear bodies after meeting
        this.updatePlayersList();
        this.checkWinCondition();
    }
    
    checkWinCondition() {
        const aliveCrewmates = this.players.filter(p => p.alive && !p.isImpostor).length;
        const aliveImpostors = this.players.filter(p => p.alive && p.isImpostor).length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        
        if (aliveImpostors === 0) {
            this.endGame('Crewmates Win!', 'All impostors have been eliminated!', '#00ff00');
        } else if (aliveImpostors >= aliveCrewmates) {
            this.endGame('Impostors Win!', 'Impostors have taken control!', '#ff0040');
        } else if (completedTasks === this.tasks.length && !this.isImpostor) {
            this.endGame('Crewmates Win!', 'All tasks have been completed!', '#00ff00');
        }
    }
    
    endGame(title, message, color) {
        this.gameState = 'gameOver';
        document.getElementById('overlayTitle').textContent = title;
        document.getElementById('overlayTitle').style.color = color;
        document.getElementById('overlayMessage').textContent = message;
        document.getElementById('gameOverlay').style.display = 'block';
    }
    
    hideOverlay() {
        document.getElementById('gameOverlay').style.display = 'none';
    }
    
    newGame() {
        // Reset game state
        this.gameState = 'playing';
        this.isImpostor = Math.random() < 0.3;
        this.killCooldown = 0;
        this.sabotageCooldown = 0;
        this.emergencyMeetings = 1;
        this.deadBodies = [];
        this.particles = [];
        this.alerts = [];
        
        // Reset players
        this.players.forEach((player, index) => {
            player.alive = true;
            player.isImpostor = false;
            player.x = 200 + (index * 100);
            player.y = 200 + (index % 2) * 200;
        });
        
        // Set impostors
        this.players[0].isImpostor = this.isImpostor;
        if (!this.isImpostor) {
            const randomPlayer = this.players[Math.floor(Math.random() * (this.players.length - 1)) + 1];
            randomPlayer.isImpostor = true;
        }
        
        // Reset tasks
        this.tasks.forEach(task => task.completed = false);
        
        this.updateUI();
        this.updatePlayersList();
        this.updateTasksList();
        this.hideOverlay();
    }
    
    createAlert(message, color) {
        this.alerts.push({
            message: message,
            color: color,
            life: 180, // 3 seconds
            y: 50
        });
    }
    
    updateUI() {
        const roleElement = document.getElementById('playerRole');
        if (this.isImpostor) {
            roleElement.innerHTML = '<span class="role-impostor">IMPOSTOR</span>';
            document.getElementById('sabotageBtn').style.display = 'block';
            document.getElementById('killBtn').style.display = 'block';
        } else {
            roleElement.innerHTML = '<span class="role-crewmate">CREWMATE</span>';
            document.getElementById('sabotageBtn').style.display = 'none';
            document.getElementById('killBtn').style.display = 'none';
        }
        
        const alivePlayers = this.players.filter(p => p.alive).length;
        document.getElementById('playersAlive').textContent = alivePlayers;
    }
    
    updatePlayersList() {
        const list = document.getElementById('playersList');
        list.innerHTML = '';
        
        this.players.forEach(player => {
            const item = document.createElement('div');
            item.className = `player-item ${!player.alive ? 'player-dead' : ''}`;
            
            const colorDiv = document.createElement('div');
            colorDiv.className = 'player-color';
            colorDiv.style.backgroundColor = player.color;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = player.name;
            
            item.appendChild(colorDiv);
            item.appendChild(nameSpan);
            list.appendChild(item);
        });
    }
    
    updateTasksList() {
        const list = document.getElementById('tasksList');
        const completed = this.tasks.filter(t => t.completed).length;
        
        document.getElementById('taskProgress').textContent = `${completed}/${this.tasks.length}`;
        
        list.innerHTML = '';
        this.tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'task-completed' : ''}`;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = task.name;
            
            const locationSpan = document.createElement('span');
            locationSpan.textContent = task.location;
            locationSpan.style.fontSize = '10px';
            locationSpan.style.opacity = '0.7';
            
            item.appendChild(nameSpan);
            item.appendChild(locationSpan);
            list.appendChild(item);
        });
    }
    
    update() {
        // Update cooldowns
        if (this.killCooldown > 0) this.killCooldown--;
        if (this.sabotageCooldown > 0) this.sabotageCooldown--;
        if (this.votingTime > 0) this.votingTime--;
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update alerts
        for (let i = this.alerts.length - 1; i >= 0; i--) {
            const alert = this.alerts[i];
            alert.life--;
            alert.y -= 0.5;
            
            if (alert.life <= 0) {
                this.alerts.splice(i, 1);
            }
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw rooms
        this.rooms.forEach(room => {
            this.ctx.fillStyle = room.color;
            this.ctx.fillRect(room.x, room.y, room.width, room.height);
            
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(room.x, room.y, room.width, room.height);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(room.name, room.x + room.width/2, room.y + room.height/2);
        });
        
        // Draw dead bodies
        this.deadBodies.forEach(body => {
            this.ctx.fillStyle = body.color;
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            this.ctx.arc(body.x, body.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(body.x - 20, body.y - 5, 40, 10);
            this.ctx.globalAlpha = 1;
        });
        
        // Draw players
        this.players.forEach(player => {
            if (!player.alive) return;
            
            // Player glow
            if (player.isImpostor && this.isImpostor) {
                this.ctx.shadowColor = '#ff0040';
                this.ctx.shadowBlur = 15;
            } else {
                this.ctx.shadowColor = player.color;
                this.ctx.shadowBlur = 10;
            }
            
            // Player body
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Player outline
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Player name
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - 30);
            
            // Impostor indicator (only visible to impostors)
            if (player.isImpostor && this.isImpostor) {
                this.ctx.fillStyle = '#ff0040';
                this.ctx.fillText('👹', player.x, player.y + 35);
            }
        });
        
        // Draw particles
        this.particles.forEach(p => {
            const alpha = p.life / 60;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
        this.ctx.globalAlpha = 1;
        
        // Draw alerts
        this.alerts.forEach(alert => {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(this.canvas.width/2 - 150, alert.y - 15, 300, 30);
            
            this.ctx.fillStyle = alert.color;
            this.ctx.font = '16px Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(alert.message, this.canvas.width/2, alert.y + 5);
        });
        
        // Draw minimap
        this.drawMinimap();
    }
    
    drawMinimap() {
        this.minimapCtx.fillStyle = '#000033';
        this.minimapCtx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        
        // Scale factor
        const scaleX = this.minimapCanvas.width / this.canvas.width;
        const scaleY = this.minimapCanvas.height / this.canvas.height;
        
        // Draw rooms on minimap
        this.rooms.forEach(room => {
            this.minimapCtx.fillStyle = '#444';
            this.minimapCtx.fillRect(
                room.x * scaleX, 
                room.y * scaleY, 
                room.width * scaleX, 
                room.height * scaleY
            );
        });
        
        // Draw players on minimap
        this.players.forEach(player => {
            if (!player.alive) return;
            
            this.minimapCtx.fillStyle = player.color;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(
                player.x * scaleX, 
                player.y * scaleY, 
                3, 0, Math.PI * 2
            );
            this.minimapCtx.fill();
        });
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

let game;
window.addEventListener('load', () => {
    game = new NeonImpostor();
});