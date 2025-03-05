import { Scene } from 'phaser';
import { LevelGenerator } from './LevelGenerator';

interface TileChange {
    x: number;
    y: number;
    isWall: boolean;
}

interface Room {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Point {
    x: number;
    y: number;
}

export class Game extends Scene {
    private grid: boolean[][] = [];
    private readonly GRID_SIZE = 50;
    private readonly CELL_SIZE = 32;
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private readonly PLAYER_SIZE = 10;
    private readonly PLAYER_SPEED = 150;
    private targetX: number = 0;
    private targetY: number = 0;
    private isMoving: boolean = false;
    private gridContainer!: Phaser.GameObjects.Container;
    private currentLevel: number = 1;
    private levelText!: Phaser.GameObjects.Text;
    private exitX: number = 0;
    private exitY: number = 0;
    private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
    private debugMode: boolean = false;
    private debugText!: Phaser.GameObjects.Text;
    private debugGraphics!: Phaser.GameObjects.Graphics;
    private playerGridMarker!: Phaser.GameObjects.Rectangle;
    private playerVisitedTiles: {x: number, y: number}[] = [];
    
    // Corridor management
    private readonly CORRIDOR_SWITCH_TIME = 5000; // 10 seconds
    private readonly TILE_UPDATE_TIME = 500; // 1 second
    private tilesToAdd: TileChange[] = [];
    private tilesToRemove: TileChange[] = [];
    private lastCorridorSwitch: number = 0;
    private lastTileUpdate: number = 0;
    private graphics!: Phaser.GameObjects.Graphics;
    private rooms: Room[] = [];
    private roomTiles: boolean[][] = []; // Tracks which tiles are part of rooms

    constructor() {
        super({ key: 'Game' });
    }

    private findSafeSpot(currentX: number, currentY: number): Point | null {
        // Go through visited tiles from most recent to oldest
        for (let i = this.playerVisitedTiles.length - 1; i >= 0; i--) {
            const tile = this.playerVisitedTiles[i];
            
            // Check if this tile is currently safe (not a wall)
            if (!this.grid[tile.y][tile.x]) {
                return { x: tile.x, y: tile.y };
            }
        }

        // If no safe visited tiles found, try adjacent tiles as fallback
        const directions = [
            { x: 1, y: 0 },   // right
            { x: -1, y: 0 },  // left
            { x: 0, y: 1 },   // down
            { x: 0, y: -1 },  // up
            { x: 1, y: 1 },   // down-right
            { x: -1, y: 1 },  // down-left
            { x: 1, y: -1 },  // up-right
            { x: -1, y: -1 }  // up-left
        ];

        for (const dir of directions) {
            const newX = currentX + dir.x;
            const newY = currentY + dir.y;

            if (newX >= 0 && newX < this.GRID_SIZE &&
                newY >= 0 && newY < this.GRID_SIZE &&
                !this.grid[newY][newX]) {
                return { x: newX, y: newY };
            }
        }

        return null;
    }

    private updateTileQueues(): void {
        if (this.tilesToAdd.length > 0) {
            const tile = this.tilesToAdd.shift();
            if (tile) {
                this.grid[tile.y][tile.x] = tile.isWall;
                this.redrawTile(tile.x, tile.y);
            }
        }
        if (this.tilesToRemove.length > 0) {
            const tile = this.tilesToRemove.shift();
            if (tile) {
                this.grid[tile.y][tile.x] = tile.isWall;
                this.redrawTile(tile.x, tile.y);
            }
        }
        //check if player is out of bounds
        // Check player position before removing the tile
        const playerGridX = Math.floor(this.player.x / this.CELL_SIZE);
        const playerGridY = Math.floor(this.player.y / this.CELL_SIZE);

        // If player is in the tile being removed
        if (this.grid[playerGridY][playerGridX]) {
            const safeSpot = this.findSafeSpot(playerGridX, playerGridY);
            if (safeSpot) {
                // Move player to safe spot
                this.player.setPosition(
                    safeSpot.x * this.CELL_SIZE + this.CELL_SIZE / 2,
                    safeSpot.y * this.CELL_SIZE + this.CELL_SIZE / 2
                );
                // Stop any current movement
                this.isMoving = false;
                this.player.setVelocity(0, 0);
            }
        }
    }

    private redrawTile(x: number, y: number): void {
        // Clear all graphics and redraw everything
        this.graphics.clear();
        this.graphics.lineStyle(2, 0xFFFFFF);
        
        // Clear all existing wall colliders
        this.wallGroup.clear(true, true);
        
        // Redraw all tiles and recreate colliders
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x]) {
                    const hasEmptyNeighbor = 
                        // Orthogonal neighbors
                        (y > 0 && !this.grid[y-1][x]) || // top
                        (y < this.GRID_SIZE - 1 && !this.grid[y+1][x]) || // bottom
                        (x > 0 && !this.grid[y][x-1]) || // left
                        (x < this.GRID_SIZE - 1 && !this.grid[y][x+1]) || // right
                        // Diagonal neighbors
                        (x > 0 && y > 0 && !this.grid[y-1][x-1]) || // top-left
                        (x < this.GRID_SIZE - 1 && y > 0 && !this.grid[y-1][x+1]) || // top-right
                        (x > 0 && y < this.GRID_SIZE - 1 && !this.grid[y+1][x-1]) || // bottom-left
                        (x < this.GRID_SIZE - 1 && y < this.GRID_SIZE - 1 && !this.grid[y+1][x+1]); // bottom-right

                    if (hasEmptyNeighbor) {
                        this.drawJaggedTile(x, y);
                        // Add a static body for collision
                        const wall = this.physics.add.staticImage(
                            x * this.CELL_SIZE + this.CELL_SIZE / 2,
                            y * this.CELL_SIZE + this.CELL_SIZE / 2,
                            '__DEFAULT'
                        );
                        wall.setDisplaySize(this.CELL_SIZE, this.CELL_SIZE);
                        wall.setVisible(false);
                        wall.refreshBody();
                        this.wallGroup.add(wall);
                    }
                }
            }
        }
    }

    private drawJaggedTile(x: number, y: number): void {
        const baseX = x * this.CELL_SIZE;
        const baseY = y * this.CELL_SIZE;
        
        this.graphics.beginPath();
        this.graphics.moveTo(baseX + Math.random() * 4, baseY + Math.random() * 4);
        
        // Top edge
        for (let i = 0; i < 4; i++) {
            const nextX = baseX + (i + 1) * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
            const nextY = baseY + (Math.random() * 4 - 2);
            this.graphics.lineTo(nextX, nextY);
        }
        
        // Right edge
        for (let i = 0; i < 4; i++) {
            const nextX = baseX + this.CELL_SIZE + (Math.random() * 4 - 2);
            const nextY = baseY + (i + 1) * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
            this.graphics.lineTo(nextX, nextY);
        }
        
        // Bottom edge
        for (let i = 3; i >= 0; i--) {
            const nextX = baseX + i * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
            const nextY = baseY + this.CELL_SIZE + (Math.random() * 4 - 2);
            this.graphics.lineTo(nextX, nextY);
        }
        
        // Left edge
        for (let i = 3; i >= 0; i--) {
            const nextX = baseX + (Math.random() * 4 - 2);
            const nextY = baseY + i * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
            this.graphics.lineTo(nextX, nextY);
        }
        
        this.graphics.closePath();
        this.graphics.stroke();
    }

    private drawInitialGrid(): void {
        this.graphics.clear();
        this.graphics.lineStyle(2, 0xFFFFFF);
        
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x]) {
                    const hasEmptyNeighbor = 
                        // Orthogonal neighbors
                        (y > 0 && !this.grid[y-1][x]) || // top
                        (y < this.GRID_SIZE - 1 && !this.grid[y+1][x]) || // bottom
                        (x > 0 && !this.grid[y][x-1]) || // left
                        (x < this.GRID_SIZE - 1 && !this.grid[y][x+1]) || // right
                        // Diagonal neighbors
                        (x > 0 && y > 0 && !this.grid[y-1][x-1]) || // top-left
                        (x < this.GRID_SIZE - 1 && y > 0 && !this.grid[y-1][x+1]) || // top-right
                        (x > 0 && y < this.GRID_SIZE - 1 && !this.grid[y+1][x-1]) || // bottom-left
                        (x < this.GRID_SIZE - 1 && y < this.GRID_SIZE - 1 && !this.grid[y+1][x+1]); // bottom-right

                    if (hasEmptyNeighbor) {
                        this.drawJaggedTile(x, y);
                    }
                }
            }
        }
    }

    private switchCorridors(): void {
        // Find a corridor to close
        const corridorToClose = this.findRandomCorridor();
        if (corridorToClose) {
            // Add walls to close the corridor
            for (const tile of corridorToClose) {
                this.tilesToAdd.push({ x: tile.x, y: tile.y, isWall: true });
            }
        }

        // Create a new corridor
        const newCorridor = this.createNewCorridor();
        if (newCorridor) {
            // Remove walls to open the new corridor
            for (const tile of newCorridor) {
                this.tilesToRemove.push({ x: tile.x, y: tile.y, isWall: false });
            }
        }
    }

    private findRooms(): void {
        this.rooms = [];
        this.roomTiles = Array(this.GRID_SIZE).fill(false).map(() => Array(this.GRID_SIZE).fill(false));
        const visited = Array(this.GRID_SIZE).fill(false).map(() => Array(this.GRID_SIZE).fill(false));
        
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.grid[y][x] && !visited[y][x]) {
                    // Found potential room start
                    let width = 0;
                    let height = 0;
                    
                    // Find width
                    let tx = x;
                    while (tx < this.GRID_SIZE && !this.grid[y][tx]) {
                        tx++;
                        width++;
                    }
                    
                    // Find height
                    let ty = y;
                    while (ty < this.GRID_SIZE) {
                        let isRowEmpty = true;
                        for (let rx = x; rx < x + width; rx++) {
                            if (this.grid[ty][rx]) {
                                isRowEmpty = false;
                                break;
                            }
                        }
                        if (!isRowEmpty) break;
                        ty++;
                        height++;
                    }
                    
                    // Mark as visited and mark room tiles
                    for (let vy = y; vy < y + height; vy++) {
                        for (let vx = x; vx < x + width; vx++) {
                            visited[vy][vx] = true;
                            if (width >= 2 && height >= 2) {
                                this.roomTiles[vy][vx] = true;
                            }
                        }
                    }
                    
                    // Add room if it's big enough
                    if (width >= 2 && height >= 2) {
                        this.rooms.push({ x, y, width, height });
                    }
                }
            }
        }
    }

    private findRandomCorridor(): TileChange[] | null {
        const corridor: TileChange[] = [];
        
        // Look for a sequence of empty tiles surrounded by walls that aren't in rooms
        for (let y = 1; y < this.GRID_SIZE - 1; y++) {
            for (let x = 1; x < this.GRID_SIZE - 1; x++) {
                if (!this.grid[y][x] && !this.roomTiles[y][x] && 
                    (this.grid[y-1][x] || this.grid[y+1][x]) && 
                    (this.grid[y][x-1] || this.grid[y][x+1])) {
                    // This might be part of a corridor and is not in a room
                    corridor.push({ x, y, isWall: true });
                }
            }
        }
        
        return corridor.length > 0 ? corridor : null;
    }

    private createNewCorridor(): TileChange[] | null {
        if (this.rooms.length < 2) return null;
        
        // Pick two random different rooms
        const roomIndex1 = Math.floor(Math.random() * this.rooms.length);
        let roomIndex2 = Math.floor(Math.random() * (this.rooms.length - 1));
        if (roomIndex2 >= roomIndex1) roomIndex2++;
        
        const room1 = this.rooms[roomIndex1];
        const room2 = this.rooms[roomIndex2];
        
        // Pick random points in each room
        const start: Point = {
            x: room1.x + Math.floor(Math.random() * room1.width),
            y: room1.y + Math.floor(Math.random() * room1.height)
        };
        
        const end: Point = {
            x: room2.x + Math.floor(Math.random() * room2.width),
            y: room2.y + Math.floor(Math.random() * room2.height)
        };
        
        // Create L-shaped or Z-shaped path
        const corridor: TileChange[] = [];
        const useZShape = Math.random() < 0.5;
        
        if (useZShape) {
            const midX = Math.floor((start.x + end.x) / 2);
            
            // Add horizontal path from start to midpoint
            for (let x = Math.min(start.x, midX); x <= Math.max(start.x, midX); x++) {
                if (this.grid[start.y][x] && !this.roomTiles[start.y][x]) {
                    corridor.push({ x, y: start.y, isWall: false });
                }
            }
            
            // Add vertical path at midpoint
            for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++) {
                if (this.grid[y][midX] && !this.roomTiles[y][midX]) {
                    corridor.push({ x: midX, y, isWall: false });
                }
            }
            
            // Add horizontal path from midpoint to end
            for (let x = Math.min(midX, end.x); x <= Math.max(midX, end.x); x++) {
                if (this.grid[end.y][x] && !this.roomTiles[end.y][x]) {
                    corridor.push({ x, y: end.y, isWall: false });
                }
            }
        } else {
            // L-shaped path
            // First go horizontally
            for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) {
                if (this.grid[start.y][x] && !this.roomTiles[start.y][x]) {
                    corridor.push({ x, y: start.y, isWall: false });
                }
            }
            
            // Then vertically
            for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++) {
                if (this.grid[y][end.x] && !this.roomTiles[y][end.x]) {
                    corridor.push({ x: end.x, y, isWall: false });
                }
            }
        }
        
        return corridor.length > 0 ? corridor : null;
    }

    create() {
        // Enable physics
        this.physics.world.setBounds(0, 0, this.GRID_SIZE * this.CELL_SIZE, this.GRID_SIZE * this.CELL_SIZE);
        
        // Create wall group for collisions
        this.wallGroup = this.physics.add.staticGroup();

        // Generate level using LevelGenerator with configuration
        const levelGenerator = new LevelGenerator({
            gridSize: this.GRID_SIZE,
            minRoomSize: 3,
            maxRoomSize: 12,
            maxSplits: 5,
            roomPadding: 1,
            splitRandomness: 0.25
        });
        const levelData = levelGenerator.generateLevel();
        this.grid = levelData.grid;
        this.exitX = levelData.exitX;
        this.exitY = levelData.exitY;
        
        // Find rooms after grid is created
        this.findRooms();

        // Create a container for the grid
        this.gridContainer = this.add.container(0, 0);

        // Create graphics for the grid
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(2, 0xFFFFFF);
        
        // Draw initial grid and create initial colliders
        this.redrawTile(0, 0); // This will draw all tiles and create all colliders

        // Create entrance and exit markers
        const entranceMarker = this.add.rectangle(
            levelData.entranceX * this.CELL_SIZE + this.CELL_SIZE / 2,
            levelData.entranceY * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE * 0.8,
            this.CELL_SIZE * 0.8,
            0xff0000
        );
        this.gridContainer.add(entranceMarker);

        const exitMarker = this.add.rectangle(
            levelData.exitX * this.CELL_SIZE + this.CELL_SIZE / 2,
            levelData.exitY * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE * 0.8,
            this.CELL_SIZE * 0.8,
            0x00ff00
        );
        this.gridContainer.add(exitMarker);

        // Create player with physics
        const playerX = levelData.entranceX * this.CELL_SIZE + this.CELL_SIZE / 2;
        const playerY = levelData.entranceY * this.CELL_SIZE + this.CELL_SIZE / 2;

        // Create a circle texture for the player
        const playerGraphics = this.add.graphics();
        playerGraphics.lineStyle(2, 0xff0000);
        playerGraphics.fillStyle(0xff0000);
        playerGraphics.beginPath();
        playerGraphics.arc(this.PLAYER_SIZE, this.PLAYER_SIZE, this.PLAYER_SIZE / 2, 0, Math.PI * 2);
        playerGraphics.closePath();
        playerGraphics.fill();
        playerGraphics.stroke();

        // Generate texture from graphics
        const texture = playerGraphics.generateTexture('player', this.PLAYER_SIZE * 2, this.PLAYER_SIZE * 2);
        playerGraphics.destroy();

        // Create player sprite with the circle texture
        this.player = this.physics.add.sprite(playerX, playerY, 'player');
        this.player.setCircle(this.PLAYER_SIZE / 2, this.PLAYER_SIZE / 2, this.PLAYER_SIZE / 2);

        // Add collision between player and walls
        this.physics.add.collider(this.player, this.wallGroup);

        // Set up camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1);

        // Add level counter
        this.levelText = this.add.text(16, 16, `Level: ${this.currentLevel}`, {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                left: 10,
                right: 10,
                top: 5,
                bottom: 5
            }
        });
        this.levelText.setScrollFactor(0);

        // Setup mouse input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 0) { // Only left mouse button
                this.isMoving = true;
                this.updateTargetPosition(pointer);
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isMoving && pointer.isDown && pointer.button === 0) {
                this.updateTargetPosition(pointer);
            } else {
                this.isMoving = false;
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 0) {
                this.isMoving = false;
                this.player.setVelocity(0, 0);
            }
        });

        // Add a handler for when pointer leaves game canvas
        this.game.canvas.addEventListener('mouseout', () => {
            this.isMoving = false;
            this.player.setVelocity(0, 0);
        });

        // Create debug graphics
        this.debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.debugGraphic.setVisible(false);

        // Create player grid position marker (initially invisible)
        this.playerGridMarker = this.add.rectangle(0, 0, this.CELL_SIZE, this.CELL_SIZE, 0x00ff00, 0.3);
        this.playerGridMarker.setVisible(false);
        this.playerGridMarker.setDepth(1); // Above the walls but below the player

        // Add debug text
        this.debugText = this.add.text(16, 60, 'Debug Mode: OFF', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: {
                left: 10,
                right: 10,
                top: 5,
                bottom: 5
            }
        });
        this.debugText.setScrollFactor(0);
        this.debugText.setDepth(1000);

        // Add keyboard input for debug mode
        this.input.keyboard?.on('keydown-T', () => {
            this.debugMode = !this.debugMode;
            this.physics.world.debugGraphic.setVisible(this.debugMode);
            this.playerGridMarker.setVisible(this.debugMode);
            this.debugText.setText(`Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        });
    }

    private updateTargetPosition(pointer: Phaser.Input.Pointer) {
        // Convert screen coordinates to world coordinates
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = worldPoint.x;
        this.targetY = worldPoint.y;
    }

    private checkExitReached(): boolean {
        const playerGridX = Math.floor(this.player.x / this.CELL_SIZE);
        const playerGridY = Math.floor(this.player.y / this.CELL_SIZE);
        return playerGridX === this.exitX && playerGridY === this.exitY;
    }

    private nextLevel(): void {
        this.currentLevel++;
        this.scene.restart();
    }

    update(time: number, delta: number) {
        // Update player grid marker position
        const playerGridX = Math.floor(this.player.x / this.CELL_SIZE);
        const playerGridY = Math.floor(this.player.y / this.CELL_SIZE);
        this.playerGridMarker.setPosition(
            playerGridX * this.CELL_SIZE + this.CELL_SIZE / 2,
            playerGridY * this.CELL_SIZE + this.CELL_SIZE / 2
        );

        // Check if player is in a safe spot
        if (this.grid[playerGridY][playerGridX]) {
            const safeSpot = this.findSafeSpot(playerGridX, playerGridY);
            if (safeSpot) {
                // Move player to safe spot
                this.player.setPosition(
                    safeSpot.x * this.CELL_SIZE + this.CELL_SIZE / 2,
                    safeSpot.y * this.CELL_SIZE + this.CELL_SIZE / 2
                );
                // Stop any current movement
                this.isMoving = false;
                this.player.setVelocity(0, 0);
            }
        }

        // Track visited tiles
        const currentTile = { x: playerGridX, y: playerGridY };
        const existingIndex = this.playerVisitedTiles.findIndex(tile => 
            tile.x === currentTile.x && tile.y === currentTile.y
        );

        if (existingIndex !== -1) {
            // Remove from current position and add to end (top)
            this.playerVisitedTiles.splice(existingIndex, 1);
        }
        this.playerVisitedTiles.push(currentTile);

        // Update visited tiles visualization in debug mode
        if (this.debugMode) {
            this.debugGraphics.clear();
            this.debugGraphics.lineStyle(2, 0x00ff00);
            
            // Draw visited tiles with different colors based on recency
            this.playerVisitedTiles.forEach((tile, index) => {
                const alpha = 0.3 + (index / this.playerVisitedTiles.length) * 0.7;
                this.debugGraphics.fillStyle(0x00ff00, alpha);
                this.debugGraphics.fillRect(
                    tile.x * this.CELL_SIZE,
                    tile.y * this.CELL_SIZE,
                    this.CELL_SIZE,
                    this.CELL_SIZE
                );
            });
        }

        // Check if it's time to update tiles
        if (time - this.lastTileUpdate >= this.TILE_UPDATE_TIME) {
            this.updateTileQueues();
            this.lastTileUpdate = time;

            // If both queues are empty, trigger new corridor switch
            if (this.tilesToAdd.length === 0 && this.tilesToRemove.length === 0) {
                this.switchCorridors();
            }
        }

        // Handle movement
        if (this.isMoving && this.input.activePointer.isDown && this.input.activePointer.button === 0) {
            // Calculate distance to target
            const distanceToTarget = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.targetX,
                this.targetY
            );

            // If we're very close to the target, update target from current pointer position
            if (distanceToTarget < 4) {
                this.updateTargetPosition(this.input.activePointer);
            }

            // Calculate direction to target
            const angle = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                this.targetX,
                this.targetY
            );
            
            // Set velocity based on angle
            const velocity = new Phaser.Math.Vector2();
            velocity.setToPolar(angle, this.PLAYER_SPEED);

            // Normalize velocity if we're close to target
            if (distanceToTarget < this.PLAYER_SPEED * (delta / 1000)) {
                const scale = distanceToTarget / (this.PLAYER_SPEED * (delta / 1000));
                velocity.scale(scale);
            }

            this.player.setVelocity(velocity.x, velocity.y);
        } else if (!this.input.activePointer.isDown || this.input.activePointer.button !== 0) {
            // Stop movement if mouse button is released
            this.isMoving = false;
            this.player.setVelocity(0, 0);
        }

        // Check if player reached the exit
        if (this.checkExitReached()) {
            this.nextLevel();
        }
    }
} 