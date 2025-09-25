class NeonRPG {
    constructor() {
        this.player = {
            name: 'Hero',
            level: 1,
            class: 'Warrior',
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            xp: 0,
            nextLevelXp: 100,
            gold: 100,
            attack: 20,
            defense: 10,
            magic: 15,
            inventory: [],
            quests: []
        };

        this.currentEnemy = null;
        this.inCombat = false;
        this.locations = [
            { name: 'Forest', x: 100, y: 150, enemies: ['Goblin', 'Wolf', 'Spider'] },
            { name: 'Cave', x: 300, y: 200, enemies: ['Bat', 'Skeleton', 'Orc'] },
            { name: 'Mountain', x: 500, y: 100, enemies: ['Dragon', 'Giant', 'Golem'] },
            { name: 'Village', x: 200, y: 300, enemies: [] },
            { name: 'Dungeon', x: 400, y: 350, enemies: ['Demon', 'Lich', 'Minotaur'] }
        ];

        this.enemies = {
            'Goblin': { hp: 50, maxHp: 50, attack: 15, xp: 25, gold: 20 },
            'Wolf': { hp: 70, maxHp: 70, attack: 18, xp: 30, gold: 15 },
            'Spider': { hp: 40, maxHp: 40, attack: 12, xp: 20, gold: 10 },
            'Bat': { hp: 30, maxHp: 30, attack: 10, xp: 15, gold: 8 },
            'Skeleton': { hp: 80, maxHp: 80, attack: 22, xp: 40, gold: 30 },
            'Orc': { hp: 120, maxHp: 120, attack: 25, xp: 60, gold: 50 },
            'Dragon': { hp: 300, maxHp: 300, attack: 50, xp: 200, gold: 200 },
            'Giant': { hp: 250, maxHp: 250, attack: 45, xp: 150, gold: 150 },
            'Golem': { hp: 200, maxHp: 200, attack: 35, xp: 100, gold: 80 },
            'Demon': { hp: 180, maxHp: 180, attack: 40, xp: 120, gold: 100 },
            'Lich': { hp: 150, maxHp: 150, attack: 60, xp: 180, gold: 180 },
            'Minotaur': { hp: 220, maxHp: 220, attack: 38, xp: 140, gold: 120 }
        };

        this.items = {
            'Health Potion': { price: 50, effect: 'heal', value: 50 },
            'Mana Potion': { price: 40, effect: 'mana', value: 30 },
            'Iron Sword': { price: 200, effect: 'attack', value: 10 },
            'Steel Shield': { price: 150, effect: 'defense', value: 8 },
            'Magic Ring': { price: 300, effect: 'magic', value: 15 },
            'Strength Elixir': { price: 100, effect: 'permanent_attack', value: 5 }
        };

        this.quests = [
            { id: 1, name: 'Goblin Slayer', description: 'Defeat 5 Goblins', target: 'Goblin', count: 0, required: 5, reward: 100, completed: false },
            { id: 2, name: 'Cave Explorer', description: 'Explore the Cave location', target: 'location', location: 'Cave', completed: false, reward: 150 },
            { id: 3, name: 'Dragon Hunter', description: 'Defeat the mighty Dragon', target: 'Dragon', count: 0, required: 1, reward: 500, completed: false }
        ];

        this.currentLocation = 'Village';
        this.canvas = document.getElementById('worldCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.init();
    }

    init() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        this.player.quests = [...this.quests];
        this.updateUI();
        this.drawWorld();
        this.createParticles();
        this.log('Welcome to Neon RPG! Your adventure begins...');
        
        // Auto-save every 30 seconds
        setInterval(() => this.saveGame(), 30000);
        this.loadGame();
    }

    updateUI() {
        document.getElementById('playerName').textContent = this.player.name;
        document.getElementById('playerLevel').textContent = this.player.level;
        document.getElementById('playerClass').textContent = this.player.class;
        document.getElementById('playerGold').textContent = this.player.gold;
        
        document.getElementById('currentHp').textContent = this.player.hp;
        document.getElementById('maxHp').textContent = this.player.maxHp;
        document.getElementById('currentMp').textContent = this.player.mp;
        document.getElementById('maxMp').textContent = this.player.maxMp;
        document.getElementById('currentXp').textContent = this.player.xp;
        document.getElementById('nextLevelXp').textContent = this.player.nextLevelXp;
        
        document.getElementById('hpBar').style.width = (this.player.hp / this.player.maxHp * 100) + '%';
        document.getElementById('mpBar').style.width = (this.player.mp / this.player.maxMp * 100) + '%';
        document.getElementById('xpBar').style.width = (this.player.xp / this.player.nextLevelXp * 100) + '%';
        
        this.updateInventory();
        this.updateQuests();
    }

    updateInventory() {
        const inventory = document.getElementById('inventory');
        inventory.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            if (this.player.inventory[i]) {
                slot.className += ' occupied';
                slot.textContent = this.player.inventory[i].charAt(0);
                slot.title = this.player.inventory[i];
                slot.onclick = () => this.useInventoryItem(i);
            }
            
            inventory.appendChild(slot);
        }
    }

    updateQuests() {
        const questList = document.getElementById('questList');
        questList.innerHTML = '';
        
        this.player.quests.forEach(quest => {
            const questDiv = document.createElement('div');
            questDiv.className = 'quest-item' + (quest.completed ? ' completed' : '');
            
            let progress = '';
            if (quest.target !== 'location') {
                progress = ` (${quest.count}/${quest.required})`;
            }
            
            questDiv.innerHTML = `
                <div><strong>${quest.name}</strong></div>
                <div>${quest.description}${progress}</div>
                <div>Reward: ${quest.reward} gold</div>
            `;
            
            questList.appendChild(questDiv);
        });
    }

    drawWorld() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections between locations
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        for (let i = 0; i < this.locations.length - 1; i++) {
            const loc1 = this.locations[i];
            const loc2 = this.locations[i + 1];
            
            this.ctx.beginPath();
            this.ctx.moveTo(loc1.x + 40, loc1.y + 40);
            this.ctx.lineTo(loc2.x + 40, loc2.y + 40);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
        
        // Draw locations
        this.locations.forEach(location => {
            const isCurrent = location.name === this.currentLocation;
            
            this.ctx.fillStyle = isCurrent ? 'rgba(255, 255, 0, 0.3)' : 'rgba(0, 255, 255, 0.2)';
            this.ctx.strokeStyle = isCurrent ? '#ffff00' : '#00ffff';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.arc(location.x + 40, location.y + 40, 35, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(location.name, location.x + 40, location.y + 45);
            
            // Add click handler
            this.canvas.onclick = (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                this.locations.forEach(loc => {
                    const distance = Math.sqrt((x - (loc.x + 40))**2 + (y - (loc.y + 40))**2);
                    if (distance < 35) {
                        this.travelTo(loc.name);
                    }
                });
            };
        });
    }

    travelTo(locationName) {
        if (locationName === this.currentLocation) return;
        
        this.currentLocation = locationName;
        this.log(`Traveled to ${locationName}`);
        this.drawWorld();
        
        // Check location quest
        const locationQuest = this.player.quests.find(q => q.target === 'location' && q.location === locationName);
        if (locationQuest && !locationQuest.completed) {
            locationQuest.completed = true;
            this.player.gold += locationQuest.reward;
            this.log(`Quest completed: ${locationQuest.name}! Earned ${locationQuest.reward} gold.`);
        }
        
        this.updateUI();
    }

    explore() {
        const location = this.locations.find(loc => loc.name === this.currentLocation);
        
        if (!location.enemies.length) {
            this.log('This is a peaceful area. Nothing to fight here.');
            return;
        }
        
        const randomEnemy = location.enemies[Math.floor(Math.random() * location.enemies.length)];
        this.startCombat(randomEnemy);
    }

    startCombat(enemyName) {
        this.currentEnemy = { ...this.enemies[enemyName], name: enemyName };
        this.inCombat = true;
        
        document.getElementById('combatScreen').style.display = 'flex';
        document.getElementById('enemyName').textContent = enemyName;
        document.getElementById('enemyHp').textContent = this.currentEnemy.hp;
        document.getElementById('enemyMaxHp').textContent = this.currentEnemy.maxHp;
        document.getElementById('enemyHpBar').style.width = '100%';
        
        this.log(`A wild ${enemyName} appears!`);
    }

    attack() {
        if (!this.inCombat) return;
        
        const damage = Math.floor(Math.random() * this.player.attack) + 10;
        this.currentEnemy.hp -= damage;
        this.log(`You deal ${damage} damage to ${this.currentEnemy.name}!`);
        
        if (this.currentEnemy.hp <= 0) {
            this.winCombat();
            return;
        }
        
        this.updateEnemyUI();
        this.enemyAttack();
    }

    useSkill() {
        if (!this.inCombat || this.player.mp < 20) {
            this.log('Not enough MP for magic!');
            return;
        }
        
        this.player.mp -= 20;
        const damage = Math.floor(Math.random() * this.player.magic) + 15;
        this.currentEnemy.hp -= damage;
        this.log(`You cast a spell dealing ${damage} magic damage!`);
        
        if (this.currentEnemy.hp <= 0) {
            this.winCombat();
            return;
        }
        
        this.updateEnemyUI();
        this.updateUI();
        this.enemyAttack();
    }

    useItem() {
        const potions = this.player.inventory.filter(item => item && item.includes('Potion'));
        if (!potions.length) {
            this.log('No usable items in combat!');
            return;
        }
        
        const potion = potions[0];
        const index = this.player.inventory.indexOf(potion);
        this.player.inventory[index] = null;
        
        if (potion === 'Health Potion') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
            this.log('Used Health Potion! Restored 50 HP.');
        } else if (potion === 'Mana Potion') {
            this.player.mp = Math.min(this.player.maxMp, this.player.mp + 30);
            this.log('Used Mana Potion! Restored 30 MP.');
        }
        
        this.updateUI();
        this.enemyAttack();
    }

    flee() {
        if (Math.random() < 0.7) {
            this.log('Successfully fled from combat!');
            this.endCombat();
        } else {
            this.log('Failed to flee!');
            this.enemyAttack();
        }
    }

    enemyAttack() {
        const damage = Math.floor(Math.random() * this.currentEnemy.attack) + 5;
        this.player.hp -= Math.max(1, damage - this.player.defense);
        this.log(`${this.currentEnemy.name} deals ${damage} damage to you!`);
        
        if (this.player.hp <= 0) {
            this.gameOver();
            return;
        }
        
        this.updateUI();
    }

    winCombat() {
        const xpGained = this.currentEnemy.xp;
        const goldGained = this.currentEnemy.gold;
        
        this.player.xp += xpGained;
        this.player.gold += goldGained;
        
        this.log(`${this.currentEnemy.name} defeated! Gained ${xpGained} XP and ${goldGained} gold.`);
        
        // Update quest progress
        const quest = this.player.quests.find(q => q.target === this.currentEnemy.name && !q.completed);
        if (quest) {
            quest.count++;
            if (quest.count >= quest.required) {
                quest.completed = true;
                this.player.gold += quest.reward;
                this.log(`Quest completed: ${quest.name}! Earned ${quest.reward} gold.`);
            }
        }
        
        // Random item drop
        if (Math.random() < 0.3) {
            const items = Object.keys(this.items);
            const randomItem = items[Math.floor(Math.random() * items.length)];
            this.addToInventory(randomItem);
            this.log(`Found ${randomItem}!`);
        }
        
        this.checkLevelUp();
        this.endCombat();
    }

    checkLevelUp() {
        if (this.player.xp >= this.player.nextLevelXp) {
            this.player.level++;
            this.player.xp -= this.player.nextLevelXp;
            this.player.nextLevelXp = Math.floor(this.player.nextLevelXp * 1.5);
            
            // Stat increases
            this.player.maxHp += 20;
            this.player.hp = this.player.maxHp;
            this.player.maxMp += 10;
            this.player.mp = this.player.maxMp;
            this.player.attack += 5;
            this.player.defense += 3;
            this.player.magic += 4;
            
            this.showLevelUp();
            this.log(`Level up! You are now level ${this.player.level}!`);
        }
    }

    showLevelUp() {
        const notification = document.getElementById('levelUpNotification');
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 2000);
    }

    endCombat() {
        this.inCombat = false;
        this.currentEnemy = null;
        document.getElementById('combatScreen').style.display = 'none';
        this.updateUI();
    }

    updateEnemyUI() {
        document.getElementById('enemyHp').textContent = Math.max(0, this.currentEnemy.hp);
        document.getElementById('enemyHpBar').style.width = (Math.max(0, this.currentEnemy.hp) / this.currentEnemy.maxHp * 100) + '%';
    }

    rest() {
        this.player.hp = this.player.maxHp;
        this.player.mp = this.player.maxMp;
        this.log('You rest and recover all HP and MP.');
        this.updateUI();
    }

    openShop() {
        document.getElementById('shopScreen').style.display = 'block';
        document.getElementById('shopGold').textContent = this.player.gold;
        
        const shopItems = document.getElementById('shopItems');
        shopItems.innerHTML = '';
        
        Object.entries(this.items).forEach(([name, item]) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <h3>${name}</h3>
                <p>Price: ${item.price} gold</p>
                <p>Effect: +${item.value} ${item.effect.replace('_', ' ')}</p>
            `;
            itemDiv.onclick = () => this.buyItem(name, item);
            shopItems.appendChild(itemDiv);
        });
    }

    closeShop() {
        document.getElementById('shopScreen').style.display = 'none';
    }

    buyItem(name, item) {
        if (this.player.gold < item.price) {
            this.log('Not enough gold!');
            return;
        }
        
        if (this.player.inventory.filter(i => i).length >= 16) {
            this.log('Inventory full!');
            return;
        }
        
        this.player.gold -= item.price;
        
        if (item.effect.startsWith('permanent_')) {
            const stat = item.effect.replace('permanent_', '');
            this.player[stat] += item.value;
            this.log(`Purchased ${name}! ${stat} permanently increased by ${item.value}.`);
        } else {
            this.addToInventory(name);
            this.log(`Purchased ${name}!`);
        }
        
        document.getElementById('shopGold').textContent = this.player.gold;
        this.updateUI();
    }

    addToInventory(item) {
        const emptySlot = this.player.inventory.findIndex(slot => !slot);
        if (emptySlot !== -1) {
            this.player.inventory[emptySlot] = item;
        }
    }

    useInventoryItem(index) {
        const item = this.player.inventory[index];
        if (!item) return;
        
        const itemData = this.items[item];
        if (!itemData) return;
        
        this.player.inventory[index] = null;
        
        switch (itemData.effect) {
            case 'heal':
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + itemData.value);
                this.log(`Used ${item}! Restored ${itemData.value} HP.`);
                break;
            case 'mana':
                this.player.mp = Math.min(this.player.maxMp, this.player.mp + itemData.value);
                this.log(`Used ${item}! Restored ${itemData.value} MP.`);
                break;
            case 'attack':
                this.player.attack += itemData.value;
                this.log(`Equipped ${item}! Attack increased by ${itemData.value}.`);
                break;
            case 'defense':
                this.player.defense += itemData.value;
                this.log(`Equipped ${item}! Defense increased by ${itemData.value}.`);
                break;
            case 'magic':
                this.player.magic += itemData.value;
                this.log(`Equipped ${item}! Magic increased by ${itemData.value}.`);
                break;
        }
        
        this.updateUI();
    }

    createParticles() {
        const particles = document.getElementById('particles');
        
        setInterval(() => {
            if (particles.children.length < 20) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * window.innerWidth + 'px';
                particle.style.top = window.innerHeight + 'px';
                particle.style.animationDelay = Math.random() * 2 + 's';
                particles.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 3000);
            }
        }, 500);
    }

    log(message) {
        const gameLog = document.getElementById('gameLog');
        const logEntry = document.createElement('div');
        logEntry.textContent = `> ${message}`;
        logEntry.style.marginBottom = '5px';
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
        
        // Keep only last 50 messages
        while (gameLog.children.length > 50) {
            gameLog.removeChild(gameLog.firstChild);
        }
    }

    gameOver() {
        this.log('GAME OVER! You have been defeated...');
        this.player.hp = this.player.maxHp;
        this.player.gold = Math.floor(this.player.gold * 0.8);
        this.endCombat();
        this.travelTo('Village');
        this.log('You wake up in the village, having lost some gold...');
    }

    saveGame() {
        localStorage.setItem('neonRPG_save', JSON.stringify({
            player: this.player,
            currentLocation: this.currentLocation
        }));
    }

    loadGame() {
        const save = localStorage.getItem('neonRPG_save');
        if (save) {
            const data = JSON.parse(save);
            this.player = { ...this.player, ...data.player };
            this.currentLocation = data.currentLocation;
            this.updateUI();
            this.drawWorld();
            this.log('Game loaded successfully!');
        }
    }
}

// Initialize the game
const game = new NeonRPG();

// Handle window resize
window.addEventListener('resize', () => {
    game.canvas.width = game.canvas.offsetWidth;
    game.canvas.height = game.canvas.offsetHeight;
    game.drawWorld();
});