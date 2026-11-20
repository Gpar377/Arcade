class CyberDungeon {
    constructor() {
        this.player = {
            x: 10, y: 7, level: 1, hp: 100, maxHp: 100, energy: 100, maxEnergy: 100,
            xp: 0, nextLevelXp: 100, attack: 10, defense: 5, hackPower: 8, speed: 3,
            credits: 0, skillPoints: 0, class: 'Hacker',
            inventory: [], equipment: { weapon: null, armor: null, accessory: null },
            skills: {}
        };

        this.dungeon = { width: 20, height: 15, floor: 1, grid: [], enemies: [], treasures: [], stairs: null };
        this.inCombat = false;
        this.currentEnemy = null;
        this.gameScore = 0;

        this.enemyTypes = {
            'Virus': { hp: 30, attack: 8, xp: 15, credits: 10, symbol: 'V' },
            'Malware': { hp: 50, attack: 12, xp: 25, credits: 20, symbol: 'M' },
            'Trojan': { hp: 80, attack: 18, xp: 40, credits: 35, symbol: 'T' },
            'Worm': { hp: 40, attack: 10, xp: 20, credits: 15, symbol: 'W' },
            'Spyware': { hp: 60, attack: 15, xp: 30, credits: 25, symbol: 'S' },
            'Rootkit': { hp: 120, attack: 25, xp: 60, credits: 50, symbol: 'R' },
            'AI Guardian': { hp: 200, attack: 35, xp: 100, credits: 100, symbol: 'G' }
        };

        this.itemTypes = {
            'Data Shard': { type: 'consumable', effect: 'heal', value: 30, price: 25 },
            'Energy Cell': { type: 'consumable', effect: 'energy', value: 40, price: 30 },
            'Nano Sword': { type: 'weapon', attack: 15, price: 100 },
            'Plasma Rifle': { type: 'weapon', attack: 25, price: 200 },
            'Cyber Armor': { type: 'armor', defense: 10, price: 150 },
            'Shield Matrix': { type: 'armor', defense: 18, price: 300 },
            'Hack Module': { type: 'accessory', hackPower: 12, price: 120 },
            'Speed Chip': { type: 'accessory', speed: 5, price: 180 },
            'Credit Chip': { type: 'consumable', effect: 'credits', value: 50, price: 0 }
        };

        this.skills = {
            'Combat': { 'Power Strike': 0, 'Berserker': 0, 'Armor Mastery': 0 },
            'Hacking': { 'System Breach': 0, 'Data Mining': 0, 'Firewall': 0 },
            'Utility': { 'Fast Heal': 0, 'Energy Boost': 0, 'Treasure Hunter': 0 }
        };

        this.init();
    }

    init() {
        this.generateDungeon();
        this.updateUI();
        this.setupEventListeners();
        this.log('Welcome to Cyber Dungeon! Navigate with WASD or arrow keys.');
        this.createSkillTree();
    }

    generateDungeon() {
        // Initialize grid
        this.dungeon.grid = Array(this.dungeon.height).fill().map(() => 
            Array(this.dungeon.width).fill().map(() => ({ type: 'wall', entity: null }))
        );

        // Generate rooms using cellular automata
        for (let y = 1; y < this.dungeon.height - 1; y++) {
            for (let x = 1; x < this.dungeon.width - 1; x++) {
                if (Math.random() < 0.45) {
                    this.dungeon.grid[y][x].type = 'floor';
                }
            }
        }

        // Smooth the dungeon
        for (let i = 0; i < 3; i++) {
            this.smoothDungeon();
        }

        // Ensure connectivity
        this.ensureConnectivity();

        // Place player
        this.placePlayer();

        // Place stairs
        this.placeStairs();

        // Place enemies
        this.placeEnemies();

        // Place treasures
        this.placeTreasures();

        this.renderDungeon();
    }

    smoothDungeon() {
        const newGrid = JSON.parse(JSON.stringify(this.dungeon.grid));
        
        for (let y = 1; y < this.dungeon.height - 1; y++) {
            for (let x = 1; x < this.dungeon.width - 1; x++) {
                let wallCount = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (this.dungeon.grid[y + dy][x + dx].type === 'wall') {
                            wallCount++;
                        }
                    }
                }
                
                newGrid[y][x].type = wallCount >= 5 ? 'wall' : 'floor';
            }
        }
        
        this.dungeon.grid = newGrid;
    }

    ensureConnectivity() {
        // Find all floor tiles
        const floorTiles = [];
        for (let y = 0; y < this.dungeon.height; y++) {
            for (let x = 0; x < this.dungeon.width; x++) {
                if (this.dungeon.grid[y][x].type === 'floor') {
                    floorTiles.push({ x, y });
                }
            }
        }

        // If no floor tiles, create a basic room
        if (floorTiles.length === 0) {
            for (let y = 5; y < 10; y++) {
                for (let x = 8; x < 12; x++) {
                    this.dungeon.grid[y][x].type = 'floor';
                }
            }
        }

        // The cave smoothing leaves separate pockets of floor. Join them all up so the
        // player can always reach the stairs and every enemy and treasure.
        const { width: W, height: H, grid } = this.dungeon;
        const regions = [];
        const seen = Array.from({ length: H }, () => Array(W).fill(false));
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (grid[y][x].type !== 'floor' || seen[y][x]) continue;
                const region = [];
                const stack = [[x, y]];
                seen[y][x] = true;
                while (stack.length) {
                    const [cx, cy] = stack.pop();
                    region.push({ x: cx, y: cy });
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = cx + dx, ny = cy + dy;
                        if (nx >= 0 && ny >= 0 && nx < W && ny < H && !seen[ny][nx] && grid[ny][nx].type === 'floor') {
                            seen[ny][nx] = true;
                            stack.push([nx, ny]);
                        }
                    }
                }
                regions.push(region);
            }
        }
        regions.sort((a, b) => b.length - a.length);
        const main = regions[0] || [];

        // Pockets of one to three tiles are just noise: fill them in. This has to happen before
        // any tunnels are dug, or filling a pocket could cut a tunnel that runs through it.
        regions.slice(1).filter(r => r.length < 4).forEach(r => r.forEach(t => { grid[t.y][t.x].type = 'wall'; }));

        for (const region of regions.slice(1).filter(r => r.length >= 4)) {
            // Dig an L-shaped tunnel from the pocket to the nearest part of the main cave.
            let best = null;
            for (const a of region) {
                for (const b of main) {
                    const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
                    if (!best || d < best.d) best = { a, b, d };
                }
            }
            let { x, y } = best.a;
            const horizontalFirst = Math.random() < 0.5;
            const stepX = () => { while (x !== best.b.x) { x += Math.sign(best.b.x - x); grid[y][x].type = 'floor'; } };
            const stepY = () => { while (y !== best.b.y) { y += Math.sign(best.b.y - y); grid[y][x].type = 'floor'; } };
            if (horizontalFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
            main.push(...region);
        }
    }

    placePlayer() {
        const floorTiles = this.getFloorTiles();
        if (floorTiles.length > 0) {
            const spawn = floorTiles[Math.floor(Math.random() * floorTiles.length)];
            this.player.x = spawn.x;
            this.player.y = spawn.y;
        }
    }

    placeStairs() {
        const floorTiles = this.getFloorTiles().filter(tile => 
            tile.x !== this.player.x || tile.y !== this.player.y
        );
        
        if (floorTiles.length > 0) {
            const stairPos = floorTiles[Math.floor(Math.random() * floorTiles.length)];
            this.dungeon.stairs = stairPos;
            this.dungeon.grid[stairPos.y][stairPos.x].entity = 'stairs';
        }
    }

    placeEnemies() {
        this.dungeon.enemies = [];
        const floorTiles = this.getFloorTiles().filter(tile => 
            (tile.x !== this.player.x || tile.y !== this.player.y) &&
            (tile.x !== this.dungeon.stairs?.x || tile.y !== this.dungeon.stairs?.y)
        );

        const enemyCount = Math.min(8 + this.dungeon.floor * 2, floorTiles.length);
        const enemyNames = Object.keys(this.enemyTypes);

        for (let i = 0; i < enemyCount; i++) {
            if (floorTiles.length === 0) break;
            
            const pos = floorTiles.splice(Math.floor(Math.random() * floorTiles.length), 1)[0];
            const enemyName = enemyNames[Math.floor(Math.random() * Math.min(enemyNames.length, 3 + this.dungeon.floor))];
            const enemy = { 
                ...this.enemyTypes[enemyName], 
                name: enemyName, 
                x: pos.x, 
                y: pos.y,
                maxHp: this.enemyTypes[enemyName].hp + this.dungeon.floor * 5
            };
            enemy.hp = enemy.maxHp;
            
            this.dungeon.enemies.push(enemy);
            this.dungeon.grid[pos.y][pos.x].entity = 'enemy';
        }
    }

    placeTreasures() {
        this.dungeon.treasures = [];
        const floorTiles = this.getFloorTiles().filter(tile => 
            !this.dungeon.grid[tile.y][tile.x].entity
        );

        const treasureCount = Math.min(5 + this.dungeon.floor, floorTiles.length);

        for (let i = 0; i < treasureCount; i++) {
            if (floorTiles.length === 0) break;
            
            const pos = floorTiles.splice(Math.floor(Math.random() * floorTiles.length), 1)[0];
            const itemNames = Object.keys(this.itemTypes);
            const item = itemNames[Math.floor(Math.random() * itemNames.length)];
            
            this.dungeon.treasures.push({ x: pos.x, y: pos.y, item });
            this.dungeon.grid[pos.y][pos.x].entity = 'treasure';
        }
    }

    getFloorTiles() {
        const tiles = [];
        for (let y = 0; y < this.dungeon.height; y++) {
            for (let x = 0; x < this.dungeon.width; x++) {
                if (this.dungeon.grid[y][x].type === 'floor') {
                    tiles.push({ x, y });
                }
            }
        }
        return tiles;
    }

    renderDungeon() {
        const grid = document.getElementById('dungeonGrid');
        grid.innerHTML = '';

        for (let y = 0; y < this.dungeon.height; y++) {
            for (let x = 0; x < this.dungeon.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                const tile = this.dungeon.grid[y][x];
                
                if (tile.type === 'wall') {
                    cell.classList.add('wall');
                    cell.textContent = '█';
                } else {
                    cell.classList.add('floor');
                    
                    if (x === this.player.x && y === this.player.y) {
                        cell.classList.add('player');
                        cell.textContent = '@';
                    } else if (tile.entity === 'enemy') {
                        cell.classList.add('enemy');
                        const enemy = this.dungeon.enemies.find(e => e.x === x && e.y === y);
                        cell.textContent = enemy ? enemy.symbol : 'E';
                    } else if (tile.entity === 'treasure') {
                        cell.classList.add('treasure');
                        cell.textContent = '$';
                    } else if (tile.entity === 'stairs') {
                        cell.classList.add('stairs');
                        cell.textContent = '>';
                    } else {
                        cell.textContent = '·';
                    }
                }
                
                grid.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.inCombat) return;
            
            switch (e.key.toLowerCase()) {
                case 'w': case 'arrowup': this.movePlayer(0, -1); break;
                case 's': case 'arrowdown': this.movePlayer(0, 1); break;
                case 'a': case 'arrowleft': this.movePlayer(-1, 0); break;
                case 'd': case 'arrowright': this.movePlayer(1, 0); break;
                case ' ': this.interact(); break;
                case 'i': this.toggleInventory(); break;
            }
        });
    }

    movePlayer(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        if (newX < 0 || newX >= this.dungeon.width || newY < 0 || newY >= this.dungeon.height) {
            return;
        }
        
        if (this.dungeon.grid[newY][newX].type === 'wall') {
            return;
        }
        
        // Check for enemy collision
        const enemy = this.dungeon.enemies.find(e => e.x === newX && e.y === newY);
        if (enemy) {
            this.startCombat(enemy);
            return;
        }
        
        this.player.x = newX;
        this.player.y = newY;
        
        // Check for treasure
        const treasureIndex = this.dungeon.treasures.findIndex(t => t.x === newX && t.y === newY);
        if (treasureIndex !== -1) {
            const treasure = this.dungeon.treasures[treasureIndex];
            this.collectTreasure(treasure);
            this.dungeon.treasures.splice(treasureIndex, 1);
            this.dungeon.grid[newY][newX].entity = null;
        }
        
        this.renderDungeon();
        this.updateMinimap();
    }

    interact() {
        const tile = this.dungeon.grid[this.player.y][this.player.x];
        if (tile.entity === 'stairs') {
            this.useStairs();
        }
    }

    startCombat(enemy) {
        this.inCombat = true;
        this.currentEnemy = enemy;
        
        document.getElementById('combatOverlay').style.display = 'flex';
        document.getElementById('enemyDisplay').textContent = enemy.name;
        document.getElementById('enemyHp').textContent = enemy.hp;
        document.getElementById('enemyMaxHp').textContent = enemy.maxHp;
        document.getElementById('enemyHpBar').style.width = '100%';
        
        this.log(`Combat started with ${enemy.name}!`);
    }

    combatAction(action) {
        if (!this.inCombat || !this.currentEnemy) return;
        
        switch (action) {
            case 'attack':
                this.playerAttack();
                break;
            case 'hack':
                this.playerHack();
                break;
            case 'defend':
                this.playerDefend();
                break;
            case 'item':
                this.useItemInCombat();
                break;
        }
        
        if (this.currentEnemy && this.currentEnemy.hp > 0) {
            this.enemyAttack();
        }
    }

    playerAttack() {
        const damage = Math.floor(Math.random() * this.player.attack) + 5;
        this.currentEnemy.hp -= damage;
        this.log(`You attack for ${damage} damage!`);
        
        if (this.currentEnemy.hp <= 0) {
            this.winCombat();
        } else {
            this.updateEnemyUI();
        }
    }

    playerHack() {
        if (this.player.energy < 20) {
            this.log('Not enough energy to hack!');
            return;
        }
        
        this.player.energy -= 20;
        const damage = Math.floor(Math.random() * this.player.hackPower) + 8;
        this.currentEnemy.hp -= damage;
        this.log(`You hack the system for ${damage} damage!`);
        
        if (this.currentEnemy.hp <= 0) {
            this.winCombat();
        } else {
            this.updateEnemyUI();
        }
        
        this.updateUI();
    }

    playerDefend() {
        this.log('You defend, reducing incoming damage!');
        this.player.defending = true;
    }

    useItemInCombat() {
        const healingItems = this.player.inventory.filter(item => 
            this.itemTypes[item] && this.itemTypes[item].effect === 'heal'
        );
        
        if (healingItems.length === 0) {
            this.log('No healing items available!');
            return;
        }
        
        const item = healingItems[0];
        this.useItem(item);
    }

    enemyAttack() {
        let damage = Math.floor(Math.random() * this.currentEnemy.attack) + 3;
        
        if (this.player.defending) {
            damage = Math.floor(damage / 2);
            this.player.defending = false;
        }
        
        damage = Math.max(1, damage - this.player.defense);
        this.player.hp -= damage;
        
        this.log(`${this.currentEnemy.name} attacks for ${damage} damage!`);
        
        if (this.player.hp <= 0) {
            this.gameOver();
        } else {
            this.updateUI();
        }
    }

    winCombat() {
        const xpGained = this.currentEnemy.xp;
        const creditsGained = this.currentEnemy.credits;
        
        this.player.xp += xpGained;
        this.player.credits += creditsGained;
        this.gameScore += xpGained * 10;
        
        this.log(`Victory! Gained ${xpGained} XP and ${creditsGained} credits.`);
        
        // Remove enemy from dungeon
        const enemyIndex = this.dungeon.enemies.findIndex(e => e === this.currentEnemy);
        if (enemyIndex !== -1) {
            this.dungeon.enemies.splice(enemyIndex, 1);
            this.dungeon.grid[this.currentEnemy.y][this.currentEnemy.x].entity = null;
        }
        
        this.checkLevelUp();
        this.endCombat();
        this.renderDungeon();
    }

    checkLevelUp() {
        if (this.player.xp >= this.player.nextLevelXp) {
            this.player.level++;
            this.player.xp -= this.player.nextLevelXp;
            this.player.nextLevelXp = Math.floor(this.player.nextLevelXp * 1.4);
            this.player.skillPoints++;
            
            // Stat increases
            this.player.maxHp += 15;
            this.player.hp = this.player.maxHp;
            this.player.maxEnergy += 10;
            this.player.energy = this.player.maxEnergy;
            this.player.attack += 3;
            this.player.defense += 2;
            this.player.hackPower += 2;
            
            this.showNotification(`Level Up! You are now level ${this.player.level}!`);
            this.log(`Level up! All stats increased. Gained 1 skill point.`);
        }
    }

    endCombat() {
        this.inCombat = false;
        this.currentEnemy = null;
        document.getElementById('combatOverlay').style.display = 'none';
        this.updateUI();
    }

    updateEnemyUI() {
        document.getElementById('enemyHp').textContent = Math.max(0, this.currentEnemy.hp);
        document.getElementById('enemyHpBar').style.width = 
            (Math.max(0, this.currentEnemy.hp) / this.currentEnemy.maxHp * 100) + '%';
    }

    collectTreasure(treasure) {
        this.addToInventory(treasure.item);
        this.log(`Found ${treasure.item}!`);
    }

    addToInventory(item) {
        if (this.player.inventory.length < 20) {
            this.player.inventory.push(item);
            this.updateUI();
        } else {
            this.log('Inventory full!');
        }
    }

    useItem(item) {
        const itemData = this.itemTypes[item];
        if (!itemData) return;
        
        const index = this.player.inventory.indexOf(item);
        if (index === -1) return;
        
        this.player.inventory.splice(index, 1);
        
        switch (itemData.effect) {
            case 'heal':
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + itemData.value);
                this.log(`Used ${item}! Restored ${itemData.value} HP.`);
                break;
            case 'energy':
                this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + itemData.value);
                this.log(`Used ${item}! Restored ${itemData.value} energy.`);
                break;
            case 'credits':
                this.player.credits += itemData.value;
                this.log(`Used ${item}! Gained ${itemData.value} credits.`);
                break;
        }
        
        this.updateUI();
    }

    equipItem(item) {
        const itemData = this.itemTypes[item];
        if (!itemData || !['weapon', 'armor', 'accessory'].includes(itemData.type)) return;
        
        const index = this.player.inventory.indexOf(item);
        if (index === -1) return;
        
        // Unequip current item
        const slot = itemData.type === 'weapon' ? 'weapon' : 
                    itemData.type === 'armor' ? 'armor' : 'accessory';
        
        if (this.player.equipment[slot]) {
            this.addToInventory(this.player.equipment[slot]);
        }
        
        // Equip new item
        this.player.inventory.splice(index, 1);
        this.player.equipment[slot] = item;
        
        // Apply stats
        if (itemData.attack) this.player.attack += itemData.attack;
        if (itemData.defense) this.player.defense += itemData.defense;
        if (itemData.hackPower) this.player.hackPower += itemData.hackPower;
        if (itemData.speed) this.player.speed += itemData.speed;
        
        this.log(`Equipped ${item}!`);
        this.updateUI();
    }

    useStairs() {
        if (this.player.x === this.dungeon.stairs?.x && this.player.y === this.dungeon.stairs?.y) {
            this.dungeon.floor++;
            this.gameScore += 100;
            this.log(`Descended to floor ${this.dungeon.floor}!`);
            this.generateDungeon();
            this.updateUI();
        }
    }

    rest() {
        this.player.hp = this.player.maxHp;
        this.player.energy = this.player.maxEnergy;
        this.log('You rest and recover all HP and energy.');
        this.updateUI();
    }

    createSkillTree() {
        const skillTree = document.getElementById('skillTree');
        skillTree.innerHTML = '';
        
        Object.entries(this.skills).forEach(([category, skills]) => {
            Object.entries(skills).forEach(([skillName, level]) => {
                const skillNode = document.createElement('div');
                skillNode.className = 'skill-node' + (level > 0 ? ' learned' : '');
                skillNode.textContent = skillName.replace(/([a-z])([A-Z])/g, '$1 $2');
                skillNode.title = `${skillName} (Level ${level})`;
                skillNode.onclick = () => this.learnSkill(category, skillName);
                skillTree.appendChild(skillNode);
            });
        });
    }

    learnSkill(category, skillName) {
        if (this.player.skillPoints <= 0) {
            this.log('No skill points available!');
            return;
        }
        
        this.player.skillPoints--;
        this.skills[category][skillName]++;
        this.player.skills[skillName] = this.skills[category][skillName];
        
        this.log(`Learned ${skillName}!`);
        this.createSkillTree();
        this.updateUI();
    }

    updateUI() {
        document.getElementById('playerLevel').textContent = this.player.level;
        document.getElementById('currentHp').textContent = this.player.hp;
        document.getElementById('maxHp').textContent = this.player.maxHp;
        document.getElementById('currentEnergy').textContent = this.player.energy;
        document.getElementById('maxEnergy').textContent = this.player.maxEnergy;
        document.getElementById('currentXp').textContent = this.player.xp;
        document.getElementById('nextLevelXp').textContent = this.player.nextLevelXp;
        document.getElementById('skillPoints').textContent = this.player.skillPoints;
        document.getElementById('credits').textContent = this.player.credits;
        document.getElementById('currentFloor').textContent = this.dungeon.floor;
        document.getElementById('gameScore').textContent = this.gameScore;
        
        document.getElementById('attackStat').textContent = this.player.attack;
        document.getElementById('defenseStat').textContent = this.player.defense;
        document.getElementById('hackStat').textContent = this.player.hackPower;
        document.getElementById('speedStat').textContent = this.player.speed;
        
        document.getElementById('hpBar').style.width = (this.player.hp / this.player.maxHp * 100) + '%';
        document.getElementById('energyBar').style.width = (this.player.energy / this.player.maxEnergy * 100) + '%';
        document.getElementById('xpBar').style.width = (this.player.xp / this.player.nextLevelXp * 100) + '%';
        
        this.updateInventoryUI();
        this.updateEquipmentUI();
    }

    updateInventoryUI() {
        const grid = document.getElementById('inventoryGrid');
        grid.innerHTML = '';
        
        for (let i = 0; i < 20; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            
            if (this.player.inventory[i]) {
                slot.className += ' occupied';
                slot.textContent = this.player.inventory[i].charAt(0);
                slot.title = this.player.inventory[i];
                slot.onclick = () => this.inventoryAction(i);
            }
            
            grid.appendChild(slot);
        }
    }

    updateEquipmentUI() {
        ['weapon', 'armor', 'accessory'].forEach(slot => {
            const element = document.getElementById(slot + 'Slot');
            if (this.player.equipment[slot]) {
                element.classList.add('equipped');
                element.textContent = this.player.equipment[slot].charAt(0);
                element.title = this.player.equipment[slot];
            } else {
                element.classList.remove('equipped');
                element.textContent = slot.charAt(0).toUpperCase();
                element.title = slot;
            }
        });
    }

    inventoryAction(index) {
        const item = this.player.inventory[index];
        if (!item) return;
        
        const itemData = this.itemTypes[item];
        if (itemData.type === 'consumable') {
            this.useItem(item);
        } else {
            this.equipItem(item);
        }
    }

    updateMinimap() {
        // Simple minimap implementation
        const minimap = document.getElementById('minimap');
        minimap.innerHTML = `Floor ${this.dungeon.floor} - Enemies: ${this.dungeon.enemies.length}`;
    }

    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    log(message) {
        const gameLog = document.getElementById('gameLog');
        const logEntry = document.createElement('div');
        logEntry.textContent = `> ${message}`;
        logEntry.style.marginBottom = '3px';
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
        
        // Keep only last 30 messages
        while (gameLog.children.length > 30) {
            gameLog.removeChild(gameLog.firstChild);
        }
    }

    gameOver() {
        this.log('SYSTEM FAILURE! You have been terminated...');
        this.showNotification('Game Over! Restarting...');
        
        setTimeout(() => {
            this.player.hp = this.player.maxHp;
            this.player.energy = this.player.maxEnergy;
            this.dungeon.floor = 1;
            this.generateDungeon();
            this.updateUI();
        }, 2000);
    }

    saveGame() {
        const saveData = {
            player: this.player,
            dungeon: this.dungeon,
            gameScore: this.gameScore,
            skills: this.skills
        };
        localStorage.setItem('cyberDungeon_save', JSON.stringify(saveData));
        this.log('Game saved successfully!');
    }

    loadGame() {
        const save = localStorage.getItem('cyberDungeon_save');
        if (save) {
            const data = JSON.parse(save);
            this.player = data.player;
            this.dungeon = data.dungeon;
            this.gameScore = data.gameScore || 0;
            this.skills = data.skills || this.skills;
            
            this.renderDungeon();
            this.updateUI();
            this.createSkillTree();
            this.log('Game loaded successfully!');
        } else {
            this.log('No save file found!');
        }
    }
}

// Initialize the game
const game = new CyberDungeon();