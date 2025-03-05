class LabyrinthEngine {
    constructor(containerId) {
        this.containerId = containerId;
        this.canvas = null;
        this.ctx = null;
        this.miniMapCanvas = null;
        this.miniMapCtx = null;
        this.wallHeight = 2;
        this.cellSize = 2;
        this.player = {
            x: 2,
            y: 2,
            angle: 0,
            speed: 0.05,
            rotationSpeed: 0.04
        };
        
        this.maze = null;
        this.mazeData = null;
        this.textures = [];
        this.isGeneratingMap = false;
        this.showMap = false;
        this.keys = {};
        this.players = {}; // Other players
        this.title = "";
        this.isRunning = false;
        this.audioInitialized = false;
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handlePlayerMoved = this.handlePlayerMoved.bind(this);
    }
    
    async initialize(labyrinthId) {
        // Get labyrinth data
        const labyrinth = await labyrinthRoom.getLabyrinthById(labyrinthId);
        if (!labyrinth) {
            console.error("Labyrinth not found");
            return false;
        }
        
        this.title = labyrinth.title;
        this.mazeData = labyrinth.mazeData;
        
        // Create container for the game
        const container = document.createElement('div');
        container.id = this.containerId;
        container.className = 'labyrinth-game';
        document.body.appendChild(container);
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'game-canvas';
        container.appendChild(this.canvas);
        
        // Setup canvas
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Create mini-map
        this.createMiniMap();
        
        // Create close button
        this.createCloseButton(container);
        
        // Create map toggle button
        this.createMapButton(container);
        
        // Create game info panel
        this.createInfoPanel(container, labyrinth);
        
        // Create mobile controls
        this.createMobileControls(container);
        
        // Load textures
        await this.loadTextures(labyrinth.textures.textures);
        
        // Generate maze
        this.generateMaze();
        
        // Add event listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        window.addEventListener('player-moved', this.handlePlayerMoved);
        
        // Play music on first interaction
        const setupAudio = () => {
            if (!this.audioInitialized) {
                const music = document.getElementById('labyrinthMusic');
                if (music) {
                    music.play().catch(e => console.warn("Audio playback failed:", e));
                    this.audioInitialized = true;
                }
                document.removeEventListener('click', setupAudio);
            }
        };
        document.addEventListener('click', setupAudio);
        
        this.isRunning = true;
        
        // Start game loop
        this.gameLoop();
        
        return true;
    }
    
    createCloseButton(container) {
        const closeButton = document.createElement('div');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => this.stop());
        container.appendChild(closeButton);
    }
    
    createMapButton(container) {
        const mapButton = document.createElement('div');
        mapButton.className = 'map-button';
        mapButton.innerHTML = 'Show Map';
        mapButton.addEventListener('click', () => {
            this.toggleMap();
        });
        container.appendChild(mapButton);
    }
    
    createInfoPanel(container, labyrinth) {
        const infoPanel = document.createElement('div');
        infoPanel.className = 'game-info';
        infoPanel.innerHTML = `
            <h3>${labyrinth.title}</h3>
            <p>Use the arrow keys to move, or touch controls on mobile.</p>
            <p>The labyrinth extends infinitely - how deep will you go?</p>
        `;
        container.appendChild(infoPanel);
    }
    
    createMobileControls(container) {
        const mobileControls = document.createElement('div');
        mobileControls.className = 'mobile-controls';
        
        // Forward button
        const controlRow1 = document.createElement('div');
        controlRow1.className = 'control-row';
        const forwardBtn = document.createElement('div');
        forwardBtn.className = 'control-button';
        forwardBtn.innerHTML = '↑';
        forwardBtn.addEventListener('touchstart', () => { this.keys['ArrowUp'] = true; });
        forwardBtn.addEventListener('touchend', () => { this.keys['ArrowUp'] = false; });
        controlRow1.appendChild(forwardBtn);
        
        // Left, backward, right buttons
        const controlRow2 = document.createElement('div');
        controlRow2.className = 'control-row';
        
        const leftBtn = document.createElement('div');
        leftBtn.className = 'control-button';
        leftBtn.innerHTML = '←';
        leftBtn.addEventListener('touchstart', () => { this.keys['ArrowLeft'] = true; });
        leftBtn.addEventListener('touchend', () => { this.keys['ArrowLeft'] = false; });
        
        const backwardBtn = document.createElement('div');
        backwardBtn.className = 'control-button';
        backwardBtn.innerHTML = '↓';
        backwardBtn.addEventListener('touchstart', () => { this.keys['ArrowDown'] = true; });
        backwardBtn.addEventListener('touchend', () => { this.keys['ArrowDown'] = false; });
        
        const rightBtn = document.createElement('div');
        rightBtn.className = 'control-button';
        rightBtn.innerHTML = '→';
        rightBtn.addEventListener('touchstart', () => { this.keys['ArrowRight'] = true; });
        rightBtn.addEventListener('touchend', () => { this.keys['ArrowRight'] = false; });
        
        controlRow2.appendChild(leftBtn);
        controlRow2.appendChild(backwardBtn);
        controlRow2.appendChild(rightBtn);
        
        mobileControls.appendChild(controlRow1);
        mobileControls.appendChild(controlRow2);
        
        container.appendChild(mobileControls);
    }
    
    createMiniMap() {
        const mapOverlay = document.createElement('div');
        mapOverlay.className = 'map-overlay';
        mapOverlay.style.display = 'none';
        
        const mapTitle = document.createElement('h3');
        mapTitle.className = 'map-title';
        mapTitle.textContent = 'Labyrinth Map';
        
        this.miniMapCanvas = document.createElement('canvas');
        this.miniMapCanvas.className = 'map-canvas';
        this.miniMapCtx = this.miniMapCanvas.getContext('2d');
        
        mapOverlay.appendChild(mapTitle);
        mapOverlay.appendChild(this.miniMapCanvas);
        
        document.body.appendChild(mapOverlay);
        this.mapOverlay = mapOverlay;
    }
    
    toggleMap() {
        this.showMap = !this.showMap;
        if (this.showMap) {
            this.mapOverlay.style.display = 'flex';
            this.renderMiniMap();
        } else {
            this.mapOverlay.style.display = 'none';
        }
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        if (this.miniMapCanvas) {
            this.miniMapCanvas.width = this.mapOverlay.clientWidth - 40;
            this.miniMapCanvas.height = this.mapOverlay.clientHeight - 80;
        }
    }
    
    async loadTextures(textureData) {
        try {
            this.textures = await Promise.all(textureData.map(texture => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = texture.imageUrl;
                });
            }));
            console.log("Textures loaded:", this.textures.length);
        } catch (error) {
            console.error("Error loading textures:", error);
        }
    }
    
    generateMaze() {
        const { seed, width, height } = this.mazeData;
        
        // Initialize pseudo-random number generator with seed
        const seededRandom = (max) => {
            const x = Math.sin(seed + this.seededRandomCalls++) * 10000;
            return Math.floor((x - Math.floor(x)) * max);
        };
        this.seededRandomCalls = 0;
        
        // Create empty maze
        this.maze = Array(height).fill().map(() => Array(width).fill(1)); // 1 = wall
        
        // Start at the center and carve passages
        const startX = 1;
        const startY = 1;
        this.player.x = startX + 0.5;
        this.player.y = startY + 0.5;
        
        this.carveMazePath(startX, startY, seededRandom);
        
        // Set player position at entrance
        this.player.x = startX + 0.5;
        this.player.y = startY + 0.5;
        this.player.angle = 0;
    }
    
    carveMazePath(x, y, randomFunc) {
        // Mark current cell as path
        this.maze[y][x] = 0;
        
        // Define the 4 possible directions to move
        const directions = [
            [0, -2], // North
            [2, 0],  // East
            [0, 2],  // South
            [-2, 0]  // West
        ];
        
        // Randomize directions
        for (let i = directions.length - 1; i > 0; i--) {
            const j = randomFunc(i + 1);
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        
        // Try each direction
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            // Check if new position is inside the maze and not yet visited
            if (nx > 0 && ny > 0 && nx < this.maze[0].length - 1 && ny < this.maze.length - 1 && this.maze[ny][nx] === 1) {
                // Create path between current cell and new cell
                this.maze[y + dy/2][x + dx/2] = 0;
                
                // Recursively carve from the new cell
                this.carveMazePath(nx, ny, randomFunc);
            }
        }
    }
    
    getCell(x, y) {
        // Handle out-of-bounds by procedurally generating new sections
        const mazeWidth = this.maze[0].length;
        const mazeHeight = this.maze.length;
        
        // If within bounds of current maze, return the cell
        if (x >= 0 && x < mazeWidth && y >= 0 && y < mazeHeight) {
            return this.maze[y][x];
        }
        
        // For out-of-bounds, generate procedurally using player position and seeded random
        // This creates the "infinite" maze effect
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        
        // Create a deterministic random value based on position and seed
        const positionSeed = this.mazeData.seed + cellX * 10000 + cellY * 1000;
        const random = Math.sin(positionSeed) * 10000;
        const randomValue = random - Math.floor(random);
        
        // The further from the origin, the more likely to be a wall
        const distanceFromOrigin = Math.sqrt(cellX * cellX + cellY * cellY);
        const wallProbability = 0.25 + (distanceFromOrigin / 200) * 0.4; // 25-65% chance of being a wall
        
        // Ensure borders are always walls
        if (cellX % 10 === 0 || cellY % 10 === 0) {
            return 1; // Wall
        }
        
        // Make it less predictable by checking surrounding "virtual" cells
        const surroundingSum = 
            this.virtualCell(cellX+1, cellY, positionSeed) + 
            this.virtualCell(cellX-1, cellY, positionSeed) + 
            this.virtualCell(cellX, cellY+1, positionSeed) + 
            this.virtualCell(cellX, cellY-1, positionSeed);
            
        // If 2 or more surrounding cells are paths, make this one more likely to be a path
        if (surroundingSum >= 2) {
            return randomValue > wallProbability * 1.5 ? 0 : 1;
        }
        
        return randomValue > wallProbability ? 0 : 1;
    }
    
    virtualCell(x, y, seed) {
        // Create a deterministic value for a "virtual" cell
        const cellSeed = seed + x * 100 + y * 10;
        const random = Math.sin(cellSeed) * 10000;
        const randomValue = random - Math.floor(random);
        return randomValue > 0.7 ? 0 : 1; // 30% chance of being a path
    }
    
    getBiomeIndex(x, y) {
        // Determine which biome to use based on position
        // This creates regions of different textures
        const distanceFromCenter = Math.sqrt(x * x + y * y);
        
        if (distanceFromCenter < 15) {
            return 0; // First biome near start
        } else if (distanceFromCenter < 40) {
            return 1; // Second biome in middle area
        } else {
            return 2; // Third biome in outer areas
        }
    }
    
    handleKeyDown(e) {
        this.keys[e.key] = true;
    }
    
    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
    
    handlePlayerMoved(event) {
        const { clientId, username, x, y, direction } = event.detail;
        
        this.players[clientId] = {
            username,
            x,
            y,
            angle: direction
        };
    }
    
    movePlayer(deltaTime) {
        const moveSpeed = this.player.speed * deltaTime;
        const rotSpeed = this.player.rotationSpeed * deltaTime;
        
        // Rotation with left/right arrow keys
        if (this.keys['ArrowLeft']) {
            this.player.angle -= rotSpeed;
        }
        if (this.keys['ArrowRight']) {
            this.player.angle += rotSpeed;
        }
        
        // Forward/backward with up/down arrow keys
        const moveX = Math.cos(this.player.angle) * moveSpeed;
        const moveY = Math.sin(this.player.angle) * moveSpeed;
        
        if (this.keys['ArrowUp']) {
            const newX = this.player.x + moveX;
            const newY = this.player.y + moveY;
            
            // Check if new position is valid (not inside a wall)
            if (this.getCell(Math.floor(newX), Math.floor(newY)) === 0) {
                this.player.x = newX;
                this.player.y = newY;
            }
        }
        
        if (this.keys['ArrowDown']) {
            const newX = this.player.x - moveX;
            const newY = this.player.y - moveY;
            
            // Check if new position is valid
            if (this.getCell(Math.floor(newX), Math.floor(newY)) === 0) {
                this.player.x = newX;
                this.player.y = newY;
            }
        }
        
        // Send position update to other players
        labyrinthRoom.sendPlayerPosition(this.player.x, this.player.y, this.player.angle);
    }
    
    castRays() {
        const rays = [];
        const fov = Math.PI / 3; // Field of view (60 degrees)
        const numRays = this.canvas.width;
        
        for (let i = 0; i < numRays; i++) {
            const rayAngle = this.player.angle - fov / 2 + (i / numRays) * fov;
            
            let rayX = Math.cos(rayAngle);
            let rayY = Math.sin(rayAngle);
            
            // Raycasting
            let distance = 0;
            let hitWall = false;
            const maxDistance = 20; // Maximum distance to check
            
            while (!hitWall && distance < maxDistance) {
                distance += 0.05;
                
                const testX = Math.floor(this.player.x + rayX * distance);
                const testY = Math.floor(this.player.y + rayY * distance);
                
                // Check if ray is out of bounds
                if (testX < 0 || testY < 0) {
                    distance = maxDistance; // Set to max distance
                    hitWall = true;
                } else {
                    // Check if ray hit a wall
                    if (this.getCell(testX, testY) === 1) {
                        hitWall = true;
                        
                        // Store ray information
                        rays.push({
                            distance,
                            angle: rayAngle,
                            hitX: this.player.x + rayX * distance,
                            hitY: this.player.y + rayY * distance,
                            biomeIndex: this.getBiomeIndex(testX, testY)
                        });
                    }
                }
            }
            
            // If no wall was hit, add ray with maximum distance
            if (!hitWall) {
                rays.push({
                    distance: maxDistance,
                    angle: rayAngle,
                    hitX: this.player.x + rayX * maxDistance,
                    hitY: this.player.y + rayY * maxDistance,
                    biomeIndex: 0
                });
            }
        }
        
        return rays;
    }
    
    renderScene(rays) {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height / 2);
        gradient.addColorStop(0, '#000');
        gradient.addColorStop(1, '#333');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height / 2);
        
        // Render floor
        const floorGradient = this.ctx.createLinearGradient(0, this.canvas.height / 2, 0, this.canvas.height);
        floorGradient.addColorStop(0, '#222');
        floorGradient.addColorStop(1, '#111');
        this.ctx.fillStyle = floorGradient;
        this.ctx.fillRect(0, this.canvas.height / 2, this.canvas.width, this.canvas.height / 2);
        
        // Render walls
        for (let i = 0; i < rays.length; i++) {
            const ray = rays[i];
            
            // Calculate wall height based on distance
            const wallHeight = this.canvas.height / ray.distance;
            
            // Draw wall slice
            const wallTop = (this.canvas.height - wallHeight) / 2;
            const wallBottom = wallTop + wallHeight;
            
            // Determine which part of the texture to use
            const wallX = ray.hitX % 1; // Horizontal position on the wall (0-1)
            
            // Only try to render texture if it exists
            if (this.textures && this.textures.length > 0) {
                const textureIndex = ray.biomeIndex % this.textures.length;
                const texture = this.textures[textureIndex];
                
                if (texture) {
                    // Calculate texture coordinates
                    const textureX = Math.floor(wallX * texture.width);
                    
                    // Draw textured wall slice
                    try {
                        this.ctx.drawImage(
                            texture,
                            textureX, 0, 1, texture.height,
                            i, wallTop, 1, wallHeight
                        );
                    } catch (e) {
                        // Fallback if texture fails
                        this.ctx.fillStyle = `rgba(150, 150, 150, ${1 - ray.distance/20})`;
                        this.ctx.fillRect(i, wallTop, 1, wallHeight);
                    }
                    
                    // Add shading based on distance
                    const brightness = 1 - ray.distance / 15;
                    this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
                    this.ctx.fillRect(i, wallTop, 1, wallHeight);
                } else {
                    // Fallback if texture doesn't exist
                    this.ctx.fillStyle = `rgba(150, 150, 150, ${1 - ray.distance/20})`;
                    this.ctx.fillRect(i, wallTop, 1, wallHeight);
                }
            } else {
                // Fallback if no textures
                this.ctx.fillStyle = `rgba(150, 150, 150, ${1 - ray.distance/20})`;
                this.ctx.fillRect(i, wallTop, 1, wallHeight);
            }
        }
        
        // Render other players
        for (const clientId in this.players) {
            const otherPlayer = this.players[clientId];
            
            // Calculate relative position to current player
            const dx = otherPlayer.x - this.player.x;
            const dy = otherPlayer.y - this.player.y;
            
            // Calculate distance and angle
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) - this.player.angle;
            
            // Only render if in field of view
            if (distance < 10 && Math.abs(angle) < Math.PI / 3) {
                // Calculate screen position
                const screenX = (this.canvas.width / 2) + Math.tan(angle) * (this.canvas.width / 2);
                const screenY = this.canvas.height / 2;
                const size = 100 / distance;
                
                // Draw player marker
                this.ctx.fillStyle = '#ff4d4d';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw username
                if (distance < 5) {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = `${Math.max(12, 20/distance)}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(otherPlayer.username, screenX, screenY - size - 10);
                }
            }
        }
    }
    
    renderMiniMap() {
        if (!this.miniMapCtx || !this.miniMapCanvas) return;
        
        // Clear mini-map
        this.miniMapCtx.fillStyle = '#000';
        this.miniMapCtx.fillRect(0, 0, this.miniMapCanvas.width, this.miniMapCanvas.height);
        
        const cellSize = 10;
        const mapWidth = this.miniMapCanvas.width / cellSize;
        const mapHeight = this.miniMapCanvas.height / cellSize;
        
        // Center the map on the player
        const offsetX = this.player.x - mapWidth / 2;
        const offsetY = this.player.y - mapHeight / 2;
        
        // Draw map
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const cellX = Math.floor(x + offsetX);
                const cellY = Math.floor(y + offsetY);
                
                // Get cell type (wall or path)
                const cell = this.getCell(cellX, cellY);
                
                // Color based on cell type and biome
                if (cell === 1) { // Wall
                    const biomeIndex = this.getBiomeIndex(cellX, cellY);
                    
                    // Different color for each biome
                    switch(biomeIndex % 3) {
                        case 0:
                            this.miniMapCtx.fillStyle = '#555';
                            break;
                        case 1:
                            this.miniMapCtx.fillStyle = '#775';
                            break;
                        case 2:
                            this.miniMapCtx.fillStyle = '#557';
                            break;
                    }
                } else { // Path
                    this.miniMapCtx.fillStyle = '#222';
                }
                
                this.miniMapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
        
        // Draw explored area (e.g., cells the player has seen)
        // This would require tracking visited cells
        
        // Draw player on mini-map
        const playerX = (mapWidth / 2) * cellSize;
        const playerY = (mapHeight / 2) * cellSize;
        this.miniMapCtx.fillStyle = '#ff0000';
        this.miniMapCtx.beginPath();
        this.miniMapCtx.arc(playerX, playerY, cellSize / 2, 0, Math.PI * 2);
        this.miniMapCtx.fill();
        
        // Draw player direction
        const dirX = playerX + Math.cos(this.player.angle) * cellSize;
        const dirY = playerY + Math.sin(this.player.angle) * cellSize;
        this.miniMapCtx.strokeStyle = '#ff0000';
        this.miniMapCtx.lineWidth = 2;
        this.miniMapCtx.beginPath();
        this.miniMapCtx.moveTo(playerX, playerY);
        this.miniMapCtx.lineTo(dirX, dirY);
        this.miniMapCtx.stroke();
        
        // Draw other players on mini-map
        for (const clientId in this.players) {
            const otherPlayer = this.players[clientId];
            
            // Calculate position on mini-map
            const otherX = (otherPlayer.x - offsetX) * cellSize;
            const otherY = (otherPlayer.y - offsetY) * cellSize;
            
            // Only draw if on the visible map area
            if (otherX >= 0 && otherX <= this.miniMapCanvas.width && 
                otherY >= 0 && otherY <= this.miniMapCanvas.height) {
                
                this.miniMapCtx.fillStyle = '#00ff00';
                this.miniMapCtx.beginPath();
                this.miniMapCtx.arc(otherX, otherY, cellSize / 2, 0, Math.PI * 2);
                this.miniMapCtx.fill();
                
                // Draw username
                this.miniMapCtx.fillStyle = '#ffffff';
                this.miniMapCtx.font = '8px Arial';
                this.miniMapCtx.textAlign = 'center';
                this.miniMapCtx.fillText(otherPlayer.username, otherX, otherY - cellSize);
            }
        }
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const deltaTime = now - (this.lastFrameTime || now);
        this.lastFrameTime = now;
        
        // Move player
        this.movePlayer(deltaTime);
        
        // Cast rays
        const rays = this.castRays();
        
        // Render scene
        this.renderScene(rays);
        
        // Render mini-map if visible
        if (this.showMap) {
            this.renderMiniMap();
        }
        
        // Continue game loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    stop() {
        // Stop game loop
        this.isRunning = false;
        
        // Stop music
        const music = document.getElementById('labyrinthMusic');
        if (music) {
            music.pause();
            music.currentTime = 0;
        }
        
        // Remove event listeners
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('player-moved', this.handlePlayerMoved);
        
        // Remove container
        const container = document.getElementById(this.containerId);
        if (container) {
            container.remove();
        }
        
        // Remove map overlay
        if (this.mapOverlay) {
            this.mapOverlay.remove();
        }
        
        // Trigger callback if exists
        if (typeof this.onStop === 'function') {
            this.onStop();
        }
    }
}

