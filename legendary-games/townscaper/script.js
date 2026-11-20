class Townscaper {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.buildings = new Map();
        this.selectedColor = '#ff6b6b';
        this.buildMode = true;
        this.camera = { x: 0, y: 0, zoom: 1, rotation: 0 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        
        // Grid settings
        this.gridSize = 30;
        this.hexRadius = 20;
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    setupEventListeners() {
        // Color palette
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelector('.color-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.selectedColor = btn.dataset.color;
            });
        });
        
        // Tools
        document.getElementById('buildMode').addEventListener('click', () => {
            this.buildMode = true;
            document.querySelector('.tool-btn.active').classList.remove('active');
            document.getElementById('buildMode').classList.add('active');
        });
        
        document.getElementById('deleteMode').addEventListener('click', () => {
            this.buildMode = false;
            document.querySelector('.tool-btn.active').classList.remove('active');
            document.getElementById('deleteMode').classList.add('active');
        });
        
        document.getElementById('clearAll').addEventListener('click', () => {
            this.buildings.clear();
        });
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (e.button === 0) { // Left click
            const gridPos = this.screenToGrid(x, y);
            if (this.buildMode) {
                this.placeBuilding(gridPos.x, gridPos.y);
            } else {
                this.removeBuilding(gridPos.x, gridPos.y);
            }
        } else if (e.button === 2) { // Right click
            this.isDragging = true;
            this.lastMouse = { x, y };
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const dx = x - this.lastMouse.x;
            const dy = y - this.lastMouse.y;
            
            this.camera.x += dx / this.camera.zoom;
            this.camera.y += dy / this.camera.zoom;
            
            this.lastMouse = { x, y };
        }
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Math.max(0.3, Math.min(3, this.camera.zoom * zoomFactor));
    }
    
    screenToGrid(screenX, screenY) {
        const worldX = (screenX - this.canvas.width / 2) / this.camera.zoom - this.camera.x;
        const worldY = (screenY - this.canvas.height / 2) / this.camera.zoom - this.camera.y;
        
        // Convert to hex grid coordinates
        const size = this.hexRadius;
        const x = (Math.sqrt(3) * worldX - worldY) / (3 * size);
        const z = (2 * worldY) / (3 * size);
        const y = -x - z;
        
        // Round to nearest hex
        let rx = Math.round(x);
        let ry = Math.round(y);
        let rz = Math.round(z);
        
        const xDiff = Math.abs(rx - x);
        const yDiff = Math.abs(ry - y);
        const zDiff = Math.abs(rz - z);
        
        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }
        
        return { x: rx, y: rz };
    }
    
    gridToScreen(gridX, gridY) {
        const size = this.hexRadius;
        const worldX = size * (Math.sqrt(3) * gridX + Math.sqrt(3) / 2 * gridY);
        const worldY = size * (3 / 2 * gridY);
        
        const screenX = (worldX + this.camera.x) * this.camera.zoom + this.canvas.width / 2;
        const screenY = (worldY + this.camera.y) * this.camera.zoom + this.canvas.height / 2;
        
        return { x: screenX, y: screenY };
    }
    
    placeBuilding(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        const existing = this.buildings.get(key);
        
        if (existing) {
            // Increase height or change color
            if (existing.color === this.selectedColor) {
                existing.height = Math.min(5, existing.height + 1);
            } else {
                existing.color = this.selectedColor;
            }
        } else {
            this.buildings.set(key, {
                x: gridX,
                y: gridY,
                height: 1,
                color: this.selectedColor,
                age: 0
            });
        }
    }
    
    removeBuilding(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        const existing = this.buildings.get(key);
        
        if (existing) {
            if (existing.height > 1) {
                existing.height--;
            } else {
                this.buildings.delete(key);
            }
        }
    }
    
    drawHexagon(x, y, radius, color, height = 1) {
        const ctx = this.ctx;
        
        // Draw building with 3D effect
        for (let h = 0; h < height; h++) {
            const offsetY = -h * 8;
            const currentRadius = radius - h * 1;
            
            // Shadow/depth
            ctx.fillStyle = this.darkenColor(color, 0.3);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = x + Math.cos(angle) * currentRadius;
                const hy = y + Math.sin(angle) * currentRadius + offsetY + 3;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            
            // Main building
            ctx.fillStyle = h === height - 1 ? color : this.darkenColor(color, 0.1);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = x + Math.cos(angle) * currentRadius;
                const hy = y + Math.sin(angle) * currentRadius + offsetY;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = this.darkenColor(color, 0.4);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Highlight top
        if (height > 1) {
            const topY = y - (height - 1) * 8;
            ctx.fillStyle = this.lightenColor(color, 0.2);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = x + Math.cos(angle) * (radius - (height - 1));
                const hy = topY + Math.sin(angle) * (radius - (height - 1));
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
        }
    }
    
    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
    
    lightenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) * (1 + factor));
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) * (1 + factor));
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) * (1 + factor));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
    
    drawWater() {
        const ctx = this.ctx;
        const time = Date.now() * 0.001;
        
        // Animated water
        const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const wave1 = Math.sin(time * 0.5) * 0.1 + 0.5;
        const wave2 = Math.cos(time * 0.3) * 0.1 + 0.5;
        
        gradient.addColorStop(0, `hsl(200, 60%, ${45 + wave1 * 10}%)`);
        gradient.addColorStop(wave2, `hsl(210, 70%, ${50 + wave2 * 5}%)`);
        gradient.addColorStop(1, `hsl(220, 50%, ${40 + wave1 * 8}%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const startX = Math.floor(-this.camera.x / this.gridSize) - 2;
        const endX = Math.ceil((this.canvas.width / this.camera.zoom - this.camera.x) / this.gridSize) + 2;
        const startY = Math.floor(-this.camera.y / this.gridSize) - 2;
        const endY = Math.ceil((this.canvas.height / this.camera.zoom - this.camera.y) / this.gridSize) + 2;
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const screenPos = this.gridToScreen(x, y);
                if (screenPos.x > -50 && screenPos.x < this.canvas.width + 50 && 
                    screenPos.y > -50 && screenPos.y < this.canvas.height + 50) {
                    
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i;
                        const hx = screenPos.x + Math.cos(angle) * this.hexRadius * this.camera.zoom;
                        const hy = screenPos.y + Math.sin(angle) * this.hexRadius * this.camera.zoom;
                        if (i === 0) ctx.moveTo(hx, hy);
                        else ctx.lineTo(hx, hy);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw water background
        this.drawWater();
        
        // Draw grid (optional)
        if (this.camera.zoom > 0.5) {
            this.drawGrid();
        }
        
        // Sort buildings by Y position for proper depth
        const sortedBuildings = Array.from(this.buildings.values()).sort((a, b) => a.y - b.y);
        
        // Draw buildings
        sortedBuildings.forEach(building => {
            const screenPos = this.gridToScreen(building.x, building.y);
            if (screenPos.x > -100 && screenPos.x < this.canvas.width + 100 && 
                screenPos.y > -100 && screenPos.y < this.canvas.height + 100) {
                
                this.drawHexagon(
                    screenPos.x, 
                    screenPos.y, 
                    this.hexRadius * this.camera.zoom, 
                    building.color, 
                    building.height
                );
            }
        });
        
        // Draw UI overlay
        this.drawUI();
    }
    
    drawUI() {
        const ctx = this.ctx;
        
        // Building count
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width - 150, 10, 140, 30);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(`Buildings: ${this.buildings.size}`, this.canvas.width - 140, 30);
        
        // Zoom level
        ctx.fillRect(this.canvas.width - 150, 50, 140, 30);
        ctx.fillText(`Zoom: ${(this.camera.zoom * 100).toFixed(0)}%`, this.canvas.width - 140, 70);
    }
    
    gameLoop() {
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when page loads
window.addEventListener('load', () => {
    window.game = new Townscaper();
});