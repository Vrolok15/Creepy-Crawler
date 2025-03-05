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
    private graphics!: Phaser.GameObjects.Graphics;
    private rooms: Room[] = [];
    private roomTiles: boolean[][] = []; // Tracks which tiles are part of rooms
    private roomConnections: Set<string> = new Set(); // Tracks which rooms are connected
    private paths: Map<string, Point[]> = new Map(); // Tracks all paths between rooms
    private readonly ROOM_CONNECTION_CHECK_TIME = 5000; // Check every 10 seconds
    private lastRoomConnectionCheck: number = 0;
    private levelGenerator!: LevelGenerator; // Store the generator for later use

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
        // Restore walls for all paths, but only for tiles that weren't part of rooms
        for (const path of this.paths.values()) {
            for (const point of path) {
                // Only restore wall if this tile wasn't part of a room originally
                if (!this.roomTiles[point.y][point.x]) {
                    this.grid[point.y][point.x] = true;
                }
            }
        }
        
        // Clear all connections and paths
        this.roomConnections.clear();
        this.paths.clear();
        
        // Redraw the grid
        this.redrawTile(0, 0);
        
        console.log('Removed all connections');
    }

    private connectRooms(room1: Room, room2: Room): void {
        console.log(`\nConnecting rooms:`);
        console.log(`Room 1: (${room1.x},${room1.y}) ${room1.width}x${room1.height}`);
        console.log(`Room 2: (${room2.x},${room2.y}) ${room2.width}x${room2.height}`);
        
        const path = this.levelGenerator.connectRooms(room1, room2);
        
        if (path.length > 0) {
            console.log(`Successfully created corridor with ${path.length} points`);
            const connectionKey = this.getRoomConnectionKey(room1, room2);
            
            // Mark rooms as connected
            this.roomConnections.add(connectionKey);
            
            // Store the path
            this.paths.set(connectionKey, path);
            
            // Update our grid with the changes from LevelGenerator
            this.grid = this.levelGenerator.getGrid();
            
            // Log grid changes
            let wallCount = 0;
            let floorCount = 0;
            for (let y = 0; y < this.GRID_SIZE; y++) {
                for (let x = 0; x < this.GRID_SIZE; x++) {
                    if (this.grid[y][x]) wallCount++;
                    else floorCount++;
                }
            }
            console.log(`Grid updated: ${wallCount} walls, ${floorCount} floor tiles`);
            
            // Redraw the grid to show the new corridor
            this.redrawTile(0, 0);
        } else {
            console.log('Failed to create corridor - no path found');
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
        console.log('\nAttempting to connect unconnected rooms:');
        console.log(`Total rooms: ${this.rooms.length}`);
        console.log(`Current connections: ${this.roomConnections.size}`);
        
        // Keep track of rooms with 0 connections
        const unconnectedRooms = this.rooms.filter(room => this.getRoomConnectionCount(room) === 0);
        console.log(`Rooms with 0 connections: ${unconnectedRooms.length}`);
        
        while (unconnectedRooms.length > 0) {
            // Get a random room with 0 connections
            const room1Index = Math.floor(Math.random() * unconnectedRooms.length);
            const room1 = unconnectedRooms[room1Index];
            
            // Find potential room2 (rooms with 0-1 connections)
            const potentialRoom2s = this.rooms.filter(room => 
                room !== room1 && 
                this.getRoomConnectionCount(room) < 2 &&
                !this.areRoomsConnected(room1, room)
            );
            
            if (potentialRoom2s.length === 0) {
                // No valid room2 found, remove room1 from unconnected list
                unconnectedRooms.splice(room1Index, 1);
                continue;
            }
            
            // Get a random room2 from potential candidates
            const room2 = potentialRoom2s[Math.floor(Math.random() * potentialRoom2s.length)];
            
            console.log(`Attempting to connect rooms:`);
            console.log(`Room 1: (${room1.x},${room1.y}) ${room1.width}x${room1.height}`);
            console.log(`Room 2: (${room2.x},${room2.y}) ${room2.width}x${room2.height}`);
            
            this.connectRooms(room1, room2);
            
            // Remove room1 from unconnected list if it now has a connection
            if (this.getRoomConnectionCount(room1) > 0) {
                unconnectedRooms.splice(room1Index, 1);
            }
        }
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
        this.rooms = levelData.rooms;
        this.levelGenerator = levelGenerator; // Store the generator for later use

        // Initialize room tiles array
        this.roomTiles = Array(this.GRID_SIZE).fill(false).map(() => Array(this.GRID_SIZE).fill(false));
        for (const room of this.rooms) {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    this.roomTiles[y][x] = true;
                }
            }
        }

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

        this.updateLayout();

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

        // Check if it's time to update connections
        if (time - this.lastRoomConnectionCheck >= this.ROOM_CONNECTION_CHECK_TIME) {
            // Remove all existing connections
            this.updateLayout();
            this.lastRoomConnectionCheck = time;
        }
    }

    updateLayout(){
        // Remove all existing connections
        this.removeAllConnections();
        
        // Then connect unconnected rooms
        this.connectUnconnectedRooms();
    }
} 

