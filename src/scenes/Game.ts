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
    private exitPoint: Point = { x: 0, y: 0 }; // Track exit position
    private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
    private debugMode: boolean = false;
    private debugText!: Phaser.GameObjects.Text;
    private debugGraphics!: Phaser.GameObjects.Graphics;
    private playerGridMarker!: Phaser.GameObjects.Rectangle;
    private playerVisitedTiles: {x: number, y: number}[] = [];
    private playerBrightLightZone: number = 200;
    private playerDimLightZone: number = 400;
    private lastPlayerAngle: number = 0; // Store the last known player direction
    private graphics!: Phaser.GameObjects.Graphics;
    private rooms: Room[] = [];
    private roomTiles: boolean[][] = []; // Tracks which tiles are part of rooms
    private roomConnections: Set<string> = new Set(); // Tracks which rooms are connected
    private paths: Map<string, Point[]> = new Map(); // Tracks all paths between rooms
    private wallsToAdd: Point[] = []; // Queue of walls to add
    private wallsToRemove: Point[] = []; // Queue of walls to remove
    private lastWallUpdate: number = 0; // Last time we processed wall changes
    private readonly WALL_UPDATE_INTERVAL = 200; // Process one wall change every 200ms
    private levelGenerator!: LevelGenerator; // Store the generator for later use
    private lightingMask!: Phaser.GameObjects.Graphics; // For the lighting mask
    private mask!: Phaser.Display.Masks.BitmapMask; // The actual mask

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

    private redrawTile(x: number, y: number): void {
        // Clear all graphics and redraw everything
        this.graphics.clear();
        this.graphics.lineStyle(2, 0xFFFFFF);
        
        // Clear all existing wall colliders
        this.wallGroup.clear(true, true);
        
        // Redraw all tiles and recreate colliders
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x] || x == 0 || y == 0 || x == this.GRID_SIZE - 1 || y == this.GRID_SIZE - 1) {
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

    private getRoomConnectionKey(room1: Room, room2: Room): string {
        const [id1, id2] = [this.rooms.indexOf(room1), this.rooms.indexOf(room2)];
        return `${Math.min(id1, id2)},${Math.max(id1, id2)}`;
    }

    private areRoomsConnected(room1: Room, room2: Room): boolean {
        return this.roomConnections.has(this.getRoomConnectionKey(room1, room2));
    }

    private removeAllConnections(): void {
        console.log('[Grid Debug] Starting removeAllConnections');
        // Clear both queues first
        this.wallsToAdd = [];
        this.wallsToRemove = [];
        
        // Add all path tiles to wallsToAdd queue, but only for tiles that weren't part of rooms
        for (const path of this.paths.values()) {
            for (const point of path) {
                // Only add to queue if this tile wasn't part of a room originally
                if (!this.roomTiles[point.y][point.x]) {
                    console.log(`[Grid Debug] Queuing wall addition at (${point.x}, ${point.y})`);
                    this.wallsToAdd.push(point);
                }
            }
        }
        
        // Clear all connections and paths
        this.roomConnections.clear();
        this.paths.clear();
        
        console.log('[Queue] Queued all connections for removal');
    }

    private connectRooms(room1: Room, room2: Room): void {
        console.log(`[Grid Debug] Starting connectRooms between rooms ${this.rooms.indexOf(room1)} and ${this.rooms.indexOf(room2)}`);
        const path = this.levelGenerator.connectRooms(room1, room2);
        
        if (path.length > 0) {
            const connectionKey = this.getRoomConnectionKey(room1, room2);
            
            // Mark rooms as connected
            this.roomConnections.add(connectionKey);
            
            // Store the path
            this.paths.set(connectionKey, path);
      
            for (const point of path) {
                if (!this.roomTiles[point.y][point.x]) {
                    this.wallsToRemove.push(point);
                    console.log(`[Grid Debug] Queued wall removal at (${point.x}, ${point.y}) - Current state: ${this.grid[point.y][point.x]}`);
                }
            }
            console.log(`[Queue] Added ${path.length} walls to removal queue for path between rooms ${this.rooms.indexOf(room1)} and ${this.rooms.indexOf(room2)}`);

        }
    }

    private processWallChanges(time: number): void {
        if (time - this.lastWallUpdate < this.WALL_UPDATE_INTERVAL) {
            return;
        }
        this.lastWallUpdate = time;

        // Process one wall to add
        if (this.wallsToAdd.length > 0) {
            const point = this.wallsToAdd.shift()!;
            // Don't add wall if it's the exit position
            if (point.x !== this.exitPoint.x || point.y !== this.exitPoint.y) {
                console.log(`[Grid Debug] Before adding wall at (${point.x}, ${point.y}): ${this.grid[point.y][point.x]}`);
                this.grid[point.y][point.x] = true;
                console.log(`[Grid Debug] After adding wall at (${point.x}, ${point.y}): ${this.grid[point.y][point.x]}`);
                console.log(`[Wall Change] Added wall at (${point.x}, ${point.y})`);
            } else {
                console.log(`[Wall Change] Skipped adding wall at exit position (${point.x}, ${point.y})`);
            }
        }

        // Process one wall to remove
        if (this.wallsToRemove.length > 0) {
            // Find the entrance room
            const entranceRoom = this.rooms.find(room => 
                room.x <= this.player.x / this.CELL_SIZE && 
                room.x + room.width > this.player.x / this.CELL_SIZE && 
                room.y <= this.player.y / this.CELL_SIZE && 
                room.y + room.height > this.player.y / this.CELL_SIZE
            );

            // If we have an entrance room, prioritize its connected paths
            if (entranceRoom) {
                const entranceRoomIndex = this.rooms.indexOf(entranceRoom);
                const entrancePaths = Array.from(this.paths.entries()).filter(([key]) => {
                    const [id1, id2] = key.split(',').map(Number);
                    return id1 === entranceRoomIndex || id2 === entranceRoomIndex;
                });

                if (entrancePaths.length > 0) {
                    // Find a wall from an entrance path
                    for (const [_, path] of entrancePaths) {
                        const entranceWall = this.wallsToRemove.find(point => 
                            path.some(pathPoint => pathPoint.x === point.x && pathPoint.y === point.y)
                        );
                        
                        if (entranceWall) {
                            const point = entranceWall;
                            const index = this.wallsToRemove.indexOf(point);
                            if (index > -1) {
                                this.wallsToRemove.splice(index, 1);
                            }
                            console.log(`[Grid Debug] Before removing entrance wall at (${point.x}, ${point.y}): ${this.grid[point.y][point.x]}`);
                            this.grid[point.y][point.x] = false;
                            console.log(`[Grid Debug] After removing entrance wall at (${point.x}, ${point.y}): ${this.grid[point.y][point.x]}`);
                            console.log(`[Wall Change] Removed entrance wall at (${point.x}, ${point.y})`);
                            break;
                        }
                    }
                }
            }

            // If no entrance wall was found, process the next wall in the queue
            if (this.wallsToRemove.length > 0) {
                const point = this.wallsToRemove.shift()!;
                console.log(`[Grid Debug] Before removing wall at (${point.x}, ${point.y}): ${this.grid[point.y][point.x]}`);
                this.grid[point.y][point.x] = false;
                console.log(`[Grid Debug] After removing wall at (${point.x}, ${point.y}): ${this.grid[point.y][point.x]}`);
                console.log(`[Wall Change] Removed wall at (${point.x}, ${point.y})`);
            }
        }

        // Log queue statistics if there are any changes
        if (this.wallsToAdd.length > 0 || this.wallsToRemove.length > 0) {
            console.log(`[Queue Stats] Walls to add: ${this.wallsToAdd.length}, Walls to remove: ${this.wallsToRemove.length}`);
            this.redrawTile(0, 0);
        }
    }

    private getRoomConnectionCount(room: Room): number {
        let count = 0;
        for (const connection of this.roomConnections) {
            const [id1, id2] = connection.split(',').map(Number);
            if (id1 === this.rooms.indexOf(room) || id2 === this.rooms.indexOf(room)) {
                count++;
            }
        }
        return count;
    }

    private connectUnconnectedRooms(): void {
        // Keep track of rooms with 0 connections
        const unconnectedRooms = this.rooms.filter(room => this.getRoomConnectionCount(room) === 0);
        
        while (unconnectedRooms.length > 0) {
            // Find the exit and entrance rooms
            const exitRoom = this.rooms.find(room => 
                room.x <= this.exitX && 
                room.x + room.width > this.exitX && 
                room.y <= this.exitY && 
                room.y + room.height > this.exitY
            );

            const entranceRoom = this.rooms.find(room => 
                room.x <= this.player.x / this.CELL_SIZE && 
                room.x + room.width > this.player.x / this.CELL_SIZE && 
                room.y <= this.player.y / this.CELL_SIZE && 
                room.y + room.height > this.player.y / this.CELL_SIZE
            );

            // If exit room exists and has no connections, use it as room1
            let room1: Room;
            if (entranceRoom && this.getRoomConnectionCount(entranceRoom) === 0) {
                // If entrance room exists and has no connections, use it as room1
                room1 = entranceRoom;
                // Remove entrance room from unconnected list
                const entranceRoomIndex = unconnectedRooms.findIndex(room => room === entranceRoom);
                if (entranceRoomIndex !== -1) {
                    unconnectedRooms.splice(entranceRoomIndex, 1);
                }
            } else if (exitRoom && this.getRoomConnectionCount(exitRoom) === 0) {
                room1 = exitRoom;
                // Remove exit room from unconnected list
                const exitRoomIndex = unconnectedRooms.findIndex(room => room === exitRoom);
                if (exitRoomIndex !== -1) {
                    unconnectedRooms.splice(exitRoomIndex, 1);
                }
            } else  {
                // Get a random room with 0 connections
                const room1Index = Math.floor(Math.random() * unconnectedRooms.length);
                room1 = unconnectedRooms[room1Index];
                unconnectedRooms.splice(room1Index, 1);
            }
            
            // Find potential room2 (rooms with 0-1 connections)
            const potentialRoom2s = this.rooms.filter(room => 
                room !== room1 && 
                this.getRoomConnectionCount(room) < 2 &&
                !this.areRoomsConnected(room1, room)
            );
            
            if (potentialRoom2s.length === 0) {
                // No valid room2 found, continue to next room
                continue;
            }
            
            // Get a random room2 from potential candidates
            const room2 = potentialRoom2s[Math.floor(Math.random() * potentialRoom2s.length)];
            
            this.connectRooms(room1, room2);
        }
    }

    private removeSomeConnections(): void {
        console.log('[Grid Debug] Starting removeSomeConnections');
        this.wallsToAdd = [];
        
        // Get all paths
        const allPaths = Array.from(this.paths.entries());
        if (allPaths.length === 0) return;

        // Calculate how many connections to remove (30-60%)
        const removeCount = Math.floor(allPaths.length * (0.3 + Math.random() * 0.3));
        
        // Randomly select connections to remove
        const connectionsToRemove = new Set<string>();
        while (connectionsToRemove.size < removeCount) {
            const randomIndex = Math.floor(Math.random() * allPaths.length);
            connectionsToRemove.add(allPaths[randomIndex][0]);
        }
        
        // Add path tiles to wallsToAdd queue for selected connections
        for (const [connectionKey, path] of allPaths) {
            if (connectionsToRemove.has(connectionKey)) {
                for (const point of path) {
                    // Only add to queue if this tile wasn't part of a room originally
                    if (!this.roomTiles[point.y][point.x]) {
                        console.log(`[Grid Debug] Queuing wall addition at (${point.x}, ${point.y})`);
                        this.wallsToAdd.push(point);
                    }
                }
            }
        }
        
        // Remove selected connections and their paths
        for (const connectionKey of connectionsToRemove) {
            this.roomConnections.delete(connectionKey);
            this.paths.delete(connectionKey);
        }
        
        console.log(`[Queue] Queued ${connectionsToRemove.size} connections for removal`);
    }

    create() {
        // Enable physics
        this.physics.world.setBounds(0, 0, this.GRID_SIZE * this.CELL_SIZE, this.GRID_SIZE * this.CELL_SIZE);
        
        // Create wall group for collisions
        this.wallGroup = this.physics.add.staticGroup();

        // Create lighting mask
        this.lightingMask = this.add.graphics();
        this.lightingMask.setDepth(1);
        this.mask = new Phaser.Display.Masks.BitmapMask(this, this.lightingMask);

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
        console.log('[Grid Debug] Initial grid state from level generator');
        
        // Initialize grid and room data first
        this.grid = levelData.grid;
        this.exitX = levelData.exitX;
        this.exitY = levelData.exitY;
        this.exitPoint = { x: this.exitX, y: this.exitY };
        this.rooms = levelData.rooms;
        this.levelGenerator = levelGenerator;

        // Initialize room tiles array
        this.roomTiles = Array(this.GRID_SIZE).fill(false).map(() => Array(this.GRID_SIZE).fill(false));
        for (const room of this.rooms) {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    this.roomTiles[y][x] = true;
                }
            }
        }

        // Create graphics and container
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(2, 0xFFFFFF);
        this.gridContainer = this.add.container(0, 0);

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
            this.exitX * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.exitY * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE * 0.8,
            this.CELL_SIZE * 0.8,
            0x00ff00
        );
        this.gridContainer.add(exitMarker);

        // Draw initial grid and create initial colliders
        this.redrawTile(0, 0);

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

        // Apply masks to all objects after player is created
        this.gridContainer.setMask(this.mask);
        this.graphics.setMask(this.mask);
        this.player.setMask(this.mask);

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
            if (this.player) {
                this.player.setVelocity(0, 0);
            }
        });

        // Create debug graphics
        this.debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.debugGraphic.setVisible(false);

        // Create player grid position marker (initially invisible)
        this.playerGridMarker = this.add.rectangle(0, 0, this.CELL_SIZE, this.CELL_SIZE, 0x00ff00, 0.3);
        this.playerGridMarker.setVisible(false);
        this.playerGridMarker.setDepth(1);

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
            
            if (!this.debugMode) {
                this.debugGraphics.clear();
            }
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
        console.log('[Game] Starting next level...');
        this.currentLevel++;
        
        // Clear all queues
        this.wallsToAdd = [];
        this.wallsToRemove = [];
        
        // Clear all connections and paths
        this.roomConnections.clear();
        this.paths.clear();
        
        // Clear player visited tiles
        this.playerVisitedTiles = [];
        
        // Reset entrance and exit information
        this.exitX = 0;
        this.exitY = 0;
        this.exitPoint = { x: 0, y: 0 };
        
        // Clear all game objects
        this.wallGroup.clear(true, true);
        this.graphics.clear();
        this.debugGraphics.clear();
        
        // Reset debug mode
        this.debugMode = false;
        this.physics.world.debugGraphic.setVisible(false);
        this.playerGridMarker.setVisible(false);
        this.debugText.setText('Debug Mode: OFF');
        
        // Reset player state
        this.isMoving = false;
        this.targetX = 0;
        this.targetY = 0;
        
        // Reset grid and room data
        this.grid = [];
        this.rooms = [];
        this.roomTiles = [];
        
        // Restart the scene to generate a new level
        this.scene.restart();
    }

    update(time: number, delta: number) {
        // Process wall changes
        this.processWallChanges(time);

        // Update lighting mask
        this.lightingMask.clear();
        
        // Calculate player's movement direction
        const velocity = this.player.body.velocity;
        let angle = 0;
        
        // If player is moving, use velocity to determine angle
        if (velocity.x !== 0 || velocity.y !== 0) {
            angle = Math.atan2(velocity.y, velocity.x);
        } else {
            // If not moving, use the last known angle or default to right
            angle = this.lastPlayerAngle || 0;
        }
        this.lastPlayerAngle = angle;

        // Convert angle to degrees and calculate cone angles
        const angleDeg = Phaser.Math.RadToDeg(angle);
        const coneAngle = 120; // 120 degree cone
        const startAngle = angleDeg - coneAngle / 2;
        const endAngle = angleDeg + coneAngle / 2;

        // Draw bright center
        this.lightingMask.fillStyle(0xFFFFFF, 0.5);
        this.lightingMask.beginPath();
        this.lightingMask.moveTo(this.player.x, this.player.y);
        this.lightingMask.arc(
            this.player.x,
            this.player.y,
            this.playerBrightLightZone,
            Phaser.Math.DegToRad(startAngle),
            Phaser.Math.DegToRad(endAngle)
        );
        this.lightingMask.closePath();
        this.lightingMask.fill();

        // Draw dim transition
        this.lightingMask.fillStyle(0xFFFFFF, 0.2);
        this.lightingMask.beginPath();
        this.lightingMask.moveTo(this.player.x, this.player.y);
        this.lightingMask.arc(
            this.player.x,
            this.player.y,
            this.playerDimLightZone,
            Phaser.Math.DegToRad(startAngle),
            Phaser.Math.DegToRad(endAngle)
        );
        this.lightingMask.closePath();
        this.lightingMask.fill();

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
            console.log('[Game] Exit reached! Moving to next level...');
            this.nextLevel();
        }

        if(this.wallsToAdd.length === 0 && this.wallsToRemove.length < 50){
            this.removeSomeConnections();
        }
        if (this.wallsToRemove.length === 0) {
            this.connectUnconnectedRooms();
        }
    }

} 

