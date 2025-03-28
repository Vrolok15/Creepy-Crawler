import { Scene } from 'phaser';
import { LevelData, LevelGenerator } from './LevelGenerator';

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
    private readonly GRID_SIZE = 40;
    private readonly CELL_SIZE = 32;
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private playerSprite!: Phaser.GameObjects.Sprite;
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
    private entranceX: number = 0;
    private entranceY: number = 0;
    private exitPoint: Point = { x: 0, y: 0 }; // Track exit position
    private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
    private debugMode: boolean = false;
    private debugText!: Phaser.GameObjects.Text;
    private debugGraphics!: Phaser.GameObjects.Graphics;
    private playerGridMarker!: Phaser.GameObjects.Rectangle;
    private playerVisitedTiles: {x: number, y: number}[] = [];
    private playerBrightLightZone: number = 200;
    private playerDimLightZone: number = 400;
    private PLAYER_MAX_HIT_POINTS: number = 6;
    private playerHitPoints: number = this.PLAYER_MAX_HIT_POINTS;
    private player_saved_hit_points: number;
    private playerLastHitTime: number = 0;
    private playerInvincibilityDuration: number = 1000;
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
    private TOTAL_LEVELS: number = 9;
    private level_layouts: LevelData[] = [];
    private GOING_BACK: boolean;

    private lastDirection: 'up' | 'down' | 'left' | 'right' = 'down';
    private frameTime: number = 0;
    private frameDuration: number = 200; // Adjust this to control animation speed (in milliseconds)
    private currentFrame: number = 0; // 0 or 1 for alternating frames

    private sister_cry_frame: number = 1;
    private sister_started_cry_timer: number = 0;
    private sister_cry_duration: number = 14000;
    private sister_time: number = 0;
    private sister_game_object!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private sister_sprite!: Phaser.GameObjects.Sprite;
    private sister_following: boolean;

    //gameplay variables
    private health_sprite_group!: Phaser.GameObjects.Container;
    private health_sprite!: Phaser.GameObjects.Sprite;
    private health_sprite2!: Phaser.GameObjects.Sprite;
    private health_sprite3!: Phaser.GameObjects.Sprite;
    private flashlight_sprite!: Phaser.GameObjects.Sprite;
    private flashlightBattery: number = 100;
    private flashLightBatteryCycle: number = 1000; // 0.5 second
    private flashLightBatteryCycleTimer: number = 0;
    private flashlightMaxDistance: number = 400;
    private flashlightMinDistance: number = 200;

    private battery_sprite!: Phaser.GameObjects.Sprite;
    private battery_count: number = 1;
    private battery_positions: {x: number, y: number}[] = [];
    private batteries!: Phaser.Physics.Arcade.Group;
    private batteryCountText!: Phaser.GameObjects.Text;
    private rechargeTimer: number = 0;
    private rechargeInterval: number = 2000;
    private readonly MAX_BATTERIES_PER_LEVEL = 3;
    private readonly MIN_BATTERIES_PER_LEVEL = 1;

    private key_sprite!: Phaser.GameObjects.Sprite;
    private keys!: Phaser.Physics.Arcade.Group;
    private key_count: number = 0;
    private keyCountText!: Phaser.GameObjects.Text;
    private key_positions: {x: number, y: number}[] = [];
    private readonly MAX_KEYS_PER_LEVEL = 3;
    private readonly MIN_KEYS_PER_LEVEL = 1;
    private key_starting_level = 2;

    private bomb_sprite!: Phaser.GameObjects.Sprite;
    private bombs!: Phaser.Physics.Arcade.Group;
    private bombs_active!: Phaser.Physics.Arcade.Group;
    private bomb_active_positions: {x: number, y: number, time: number, bomb: Phaser.GameObjects.Sprite}[] = [];
    private bomb_count: number = 0;
    private bombCountText!: Phaser.GameObjects.Text;
    private bomb_positions: {x: number, y: number}[] = [];
    private bomb_delay: number = 500;
    private bomb_delay_timer: number = 0;
    private bomb_explosion_radius: number = 100;
    private bomb_placement_delay: number = 1000;
    private bomb_placement_delay_timer: number = 0;
    private readonly MAX_BOMBS_PER_LEVEL = 3;
    private readonly MIN_BOMBS_PER_LEVEL = 1;
    private bomb_starting_level = 4;

    private camera_sprite!: Phaser.GameObjects.Sprite;
    private camera_items!: Phaser.Physics.Arcade.Group;
    private camera_items_positions: {x: number, y: number}[] = [];
    private camera_count: number = 0;
    private camera_count_text!: Phaser.GameObjects.Text;
    private camera_spawn_delay: number = 10000;
    private camera_last_used: number = 0;
    private CAN_SPAWN: boolean = true;
    private MAX_CAMERA_COUNT: number = 2;
    private MIN_CAMERA_COUNT: number = 1;
    private camera_starting_level = 6;

    private lockedDoorPositions: {x: number, y: number, door: Phaser.Physics.Arcade.Sprite}[] = [];
    private lockedDoors!: Phaser.Physics.Arcade.StaticGroup;
    private unlockedDoors: number = 0;
    private MAX_LOCKED_DOORS: number = 5;
    private locked_doors_per_level: number[] = [0, 0, 2, 3, 4, 4, 4, 5, 5];


    //enemy variables
    private ghost_group!: Phaser.Physics.Arcade.Group;
    private ghost_animation_delays: number[] = [];
    private ghost_count: number = 0;
    private max_ghosts: number = 3;
    private ghosts_per_level: number[] = [0, 0, 0, 1, 2, 3, 4, 5, 6];

    private goblin_group!: Phaser.Physics.Arcade.Group;
    private goblin_animation_delays: number[] = [];
    private goblin_count: number = 0;
    private max_goblins: number = 3;
    private goblins_per_level: number[] = [0, 2, 3, 4, 5, 6, 7, 8, 10];

    private isTransitioning: boolean = false;
    private isGeneratingLevel: boolean = false;
    private exitSequenceInProgress: boolean = false;
    private transitionPromise: Promise<void> | null = null;
    private transitionStart: number = 0;

    private note!: Phaser.Physics.Arcade.Sprite;
    private noteText!: string;
    private notes: string[] = [
        "They've taken my wife! I've got to get her back from this place! \n\n The walls are shifting... seems like I need my flashlight to get through. \n\n [Use <Backspace> to change batteries]",
        "They're here... I can hear them... \n\n They won't get me so easily! \n\n [Goblins are afraid of the bright light]",
        "There are these locked doors... \n\n I need to find the keys to open them! \n\n [Use keys to unlock doors]",
        "What are these noises? I swear I can hear them moaning... \n\n These must be poor souls trapped here like me! I see them in the dark... \n\n [Ghosts disappear in the bright light]",
        "Are these explosives? \n\n Great, I can use them to blow the walls open! \n\n [Use <Enter> to plant bombs]",
        "Thank god I've taken my photo camera with me! \n\n It seems like the flashlight is all it takes to scare them all away! \n\n [Use <Space> to take a photo]",
        "I feel like I'm getting close... \n\n Where is my wife?",
        "I've heard her cry! \n\n I need to find her before it's too late! \n\n Hope that we both can make it out of here!",
        "[You find two hugging skeletons]"
    ]

    private readonly TRANSITION_DURATION = 2500; // 2500 second transition
    private readonly CAMERA_ZOOM_FACTOR = 1.5; // Less extreme zoom

    private batteryMeterGraphics!: Phaser.GameObjects.Graphics;
    private batteryText!: Phaser.GameObjects.Text;
    private readonly BATTERY_METER_WIDTH = 200;
    private readonly BATTERY_METER_HEIGHT = 30;
    private readonly BATTERY_METER_PADDING = 5;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;

    // Timer properties
    private gameTimer: number = 0;
    private timerText!: Phaser.GameObjects.Text;
    
    private dialogContainer!: Phaser.GameObjects.Container;
    private dialogBackground!: Phaser.GameObjects.Graphics;
    private dialogText!: Phaser.GameObjects.Text;
    private dialogButton!: Phaser.GameObjects.Container;
    private isDialogOpen: boolean = false;
    private previousTimeScale: number = 1;

    private music!: Phaser.Sound.BaseSound;
    private soundEffects: Map<string, Phaser.Sound.BaseSound> = new Map();

    private playSound(key: string, config: { volume?: number } = {}): void {
        const sound = this.soundEffects.get(key);
        if (sound) {
            sound.play({ volume: config.volume ?? 1 });
        }
    }

    constructor() {
        super('Game');
        this.player_saved_hit_points = this.PLAYER_MAX_HIT_POINTS;
        this.GOING_BACK = false;
        this.sister_following = false;
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

    private redrawTile(): void {
        // Clear all graphics and redraw everything
        this.graphics.clear();
        this.graphics.lineStyle(2, 0xFFFFFF);
        
        // Clear all existing wall colliders
        this.wallGroup.clear(true, true);
        
        // Debug counter for walls
        let wallCount = 0;
        
        // Redraw all tiles and recreate colliders
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x] || x == 0 || y == 0 || x == this.GRID_SIZE - 1 || y == this.GRID_SIZE - 1) {
                    let wall = false;
                    
                    // Skip drawing walls at exit/entrance points but continue with other walls
                    if ((this.exitPoint.x == x && this.exitPoint.y == y) || (this.entranceX == x && this.entranceY == y)) {
                        continue;
                    }
                    else if ((x == 0 || y == 0 || x == this.GRID_SIZE - 1 || y == this.GRID_SIZE - 1)) {
                        this.drawStraightTile(x, y);
                        wall = true;
                    }
                    else if (this.grid[y][x]) {
                        this.drawJaggedTile(x, y);
                        wall = true;
                    }
                    
                    if (wall) {
                        wallCount++;
                        // Add wall collider
                        const wallSprite = this.add.rectangle(x * this.CELL_SIZE + this.CELL_SIZE / 2, y * this.CELL_SIZE + this.CELL_SIZE / 2, this.CELL_SIZE, this.CELL_SIZE);
                        this.wallGroup.add(wallSprite);
                    }
                }
            }
        }
        
        // Debug output
        console.log(`Drew ${wallCount} walls. Grid size: ${this.GRID_SIZE}x${this.GRID_SIZE}`);
    }

    private drawStraightTile(x: number, y: number): void {
        const baseX = x * this.CELL_SIZE;
        const baseY = y * this.CELL_SIZE;
        this.graphics.beginPath();
        this.graphics.lineStyle(2, 0xFFFFFF);
        this.graphics.moveTo(baseX, baseY);
        this.graphics.lineTo(baseX + this.CELL_SIZE, baseY);
        this.graphics.lineTo(baseX + this.CELL_SIZE, baseY + this.CELL_SIZE);
        this.graphics.lineTo(baseX, baseY + this.CELL_SIZE);
        this.graphics.closePath();
        this.graphics.stroke();
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

    private connectRooms(room1: Room, room2: Room): void {
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
                }
            }
        }
    }

    private isValidLockedDoorPosition(x: number, y: number): boolean {
        if (x > 1 && x < this.GRID_SIZE - 2 && y > 1 && y < this.GRID_SIZE - 2){
            var distanceToOtherDoors = 100;
            for (const position of this.lockedDoorPositions){
                if (position.x != x || position.y != y){
                    distanceToOtherDoors = Math.min(distanceToOtherDoors, Math.abs(position.x - x) + Math.abs(position.y - y));
                }
            }
            if (distanceToOtherDoors < 5){
                return false;
            }
            else if (this.grid[y-1][x] && this.grid[y+1][x] && !this.grid[y][x-1] && !this.grid[y][x+1]){
                return true;
            }
            else if (this.grid[y][x-1] && this.grid[y][x+1] && !this.grid[y-1][x] && !this.grid[y+1][x]){
                return true;
            }
        }

        return false;
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
                this.grid[point.y][point.x] = true;
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
                            this.grid[point.y][point.x] = false;
                            if (this.isValidLockedDoorPosition(point.x, point.y)){
                                if (this.unlockedDoors + this.lockedDoors.getChildren().length < this.MAX_LOCKED_DOORS){
                                    this.addLockedDoor(point.x, point.y);
                                }
                            }
                            break;
                        }
                    }
                }
            }

            // If no entrance wall was found, process the next wall in the queue
            if (this.wallsToRemove.length > 0) {
                const point = this.wallsToRemove.shift()!;
                this.grid[point.y][point.x] = false;
                if (this.isValidLockedDoorPosition(point.x, point.y)){
                    if (this.unlockedDoors + this.lockedDoors.getChildren().length < this.MAX_LOCKED_DOORS){
                        this.addLockedDoor(point.x, point.y);
                    }
                }
            }
        }

        // Log queue statistics if there are any changes
        if (this.wallsToAdd.length > 0 || this.wallsToRemove.length > 0) {
            this.redrawTile();
        }

        this.updateLockedDoors();
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
                    if (!this.roomTiles[point.y][point.x] && !(point.x === this.exitX && point.y === this.exitY) && !(point.x === this.entranceX && point.y === this.entranceY)) {
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
        
    }

    preload() {
        // Load sprites
        this.load.image('stair_up', 'assets/sprites/stair_up.png');
        this.load.image('stair_down', 'assets/sprites/stair_down.png');
        this.load.image('sister_down_idle', 'assets/sprites/sister_stand_down.png');
        this.load.image('sister_down_walk1', 'assets/sprites/sister_walk_down_1.png');
        this.load.image('sister_down_walk2', 'assets/sprites/sister_walk_down_2.png');
        this.load.image('sister_left_idle', 'assets/sprites/sister_stand_side.png');
        this.load.image('sister_left_walk1', 'assets/sprites/sister_walk_side_1.png');
        this.load.image('sister_left_walk2', 'assets/sprites/sister_walk_side_2.png');
        this.load.image('sister_up_idle', 'assets/sprites/sister_stand_up.png');
        this.load.image('sister_up_walk1', 'assets/sprites/sister_walk_up_1.png');
        this.load.image('sister_up_walk2', 'assets/sprites/sister_walk_up_2.png');
        this.load.image('sister_dead', 'assets/sprites/sister_skeleton.png');
        this.load.image('sister_cry1', 'assets/sprites/sister_cry_1.png');
        this.load.image('sister_cry2', 'assets/sprites/sister_cry_2.png');
        this.load.image('sister_cry3', 'assets/sprites/sister_cry_3.png');
        this.load.image('sister_cry4', 'assets/sprites/sister_cry_4.png');
        this.load.image('sister_cry5', 'assets/sprites/sister_cry_5.png');
        this.load.image('sister_cry6', 'assets/sprites/sister_cry_6.png');
        this.load.image('player_down_idle', 'assets/sprites/brother_stand_down.png');
        this.load.image('player_down_walk1', 'assets/sprites/brother_walk_down_1.png');
        this.load.image('player_down_walk2', 'assets/sprites/brother_walk_down_2.png');
        this.load.image('player_left_idle', 'assets/sprites/brother_stand_side.png');
        this.load.image('player_left_walk1', 'assets/sprites/brother_walk_side_1.png');
        this.load.image('player_left_walk2', 'assets/sprites/brother_walk_side_2.png');
        this.load.image('player_up_idle', 'assets/sprites/brother_stand_up.png');
        this.load.image('player_up_walk1', 'assets/sprites/brother_walk_up_1.png');
        this.load.image('player_up_walk2', 'assets/sprites/brother_walk_up_2.png');
        this.load.image('player_dead', 'assets/sprites/brother_skeleton.png');
        this.load.image('note', 'assets/sprites/note.png');
        this.load.image('hugging_skeletons', 'assets/sprites/hugging_skeletons.png');
        this.load.image('flashlight', 'assets/sprites/flashlight.png');
        this.load.image('battery', 'assets/sprites/battery.png');
        this.load.image('battery_ui', 'assets/sprites/battery_ui.png');
        this.load.image('ghost_1', 'assets/sprites/ghost_1.png');
        this.load.image('ghost_2', 'assets/sprites/ghost_2.png');
        this.load.image('goblin_1', 'assets/sprites/goblin_1.png');
        this.load.image('goblin_2', 'assets/sprites/goblin_2.png');
        this.load.image('heart_full', 'assets/sprites/heart_full.png');
        this.load.image('heart_half', 'assets/sprites/heart_half.png');
        this.load.image('heart_empty', 'assets/sprites/heart_empty.png');
        this.load.image('locked_door', 'assets/sprites/locked_door.png');
        this.load.image('key', 'assets/sprites/key.png');
        this.load.image('key_ui', 'assets/sprites/key_ui.png');
        this.load.image('bomb_active_1', 'assets/sprites/bomb_active_1.png');
        this.load.image('bomb_active_2', 'assets/sprites/bomb_active_2.png');
        this.load.image('bomb_active_3', 'assets/sprites/bomb_active_3.png');
        this.load.image('bomb_inactive', 'assets/sprites/bomb_inactive.png');
        this.load.image('bomb_ui', 'assets/sprites/bomb_ui.png');
        this.load.image('camera', 'assets/sprites/camera.png');
        this.load.image('camera_ui', 'assets/sprites/camera_ui.png');
        
        // Try to load audio files with error handling
        try {
            // Load footstep sounds
            this.load.audio('footstep', 'assets/sfx/footstep.wav');
            this.load.audio('camera', 'assets/sfx/camera.wav');
            this.load.audio('death', 'assets/sfx/death.wav');
            this.load.audio('door', 'assets/sfx/door.wav');
            this.load.audio('explosion', 'assets/sfx/explosion.wav');
            this.load.audio('goblin', 'assets/sfx/goblin.wav');
            this.load.audio('goblin_death', 'assets/sfx/goblin_death.wav');
            this.load.audio('ghost', 'assets/sfx/ghost.wav');
            this.load.audio('ghost_death', 'assets/sfx/ghost_death.wav');
            this.load.audio('hurt', 'assets/sfx/hurt.wav');
            this.load.audio('item', 'assets/sfx/item.wav');
            this.load.audio('note', 'assets/sfx/note.wav');
            this.load.audio('recharge', 'assets/sfx/recharge.wav');
            this.load.audio('sister', 'assets/sfx/sister.wav');
            this.load.audio('sister_cry', 'assets/sfx/sister_cry.wav');
            this.load.audio('victory', 'assets/sfx/victory.wav');

            // Load music
            this.load.audio('music', 'assets/music/upside down grin2.ogg');
            this.load.audio('music_fast', 'assets/music/gi-i dark ambient techno.ogg');
        } catch (error) {
            console.warn('Error loading audio files:', error);
        }
    }

    create() {
        // Retrieve state from registry if available
        if (this.registry.has('GOING_BACK')) {
            this.GOING_BACK = this.registry.get('GOING_BACK');
        }
        if (this.registry.has('sister_following')) {
            this.sister_following = this.registry.get('sister_following');
        }
        if (this.registry.has('currentLevel')) {
            this.currentLevel = this.registry.get('currentLevel');
        }
        
        if(this.player_saved_hit_points > 0){
            this.playerHitPoints = this.player_saved_hit_points;
        }
        
        this.max_ghosts = this.ghosts_per_level[this.currentLevel - 1];
        this.max_goblins = this.goblins_per_level[this.currentLevel - 1];
        if(this.GOING_BACK){
            this.max_ghosts = 10;
            this.max_goblins = 10;
        }
        this.MAX_LOCKED_DOORS = this.locked_doors_per_level[this.currentLevel - 1];

        // Enable physics
        this.physics.world.setBounds(0, 0, this.GRID_SIZE * this.CELL_SIZE, this.GRID_SIZE * this.CELL_SIZE);
        
        // Create wall group for collisions
        this.wallGroup = this.physics.add.staticGroup();
        this.lockedDoors = this.physics.add.staticGroup();

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

        let levelData: LevelData;
        if(this.GOING_BACK){
            levelData = this.level_layouts[this.currentLevel - 1];
        }
        else{
            levelData = levelGenerator.generateLevel();
            this.level_layouts.push(levelData);
        }
        
        // Initialize grid and room data first
        this.grid = levelData.grid;
        this.entranceX = levelData.entranceX;
        this.entranceY = levelData.entranceY;
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
                    if(this.grid && this.grid[y] && this.grid[y][x] && !this.roomTiles[y]){
                        this.roomTiles[y][x] = true;
                        this.grid[y][x] = false;
                    }
                }
            }
        }

        // Create graphics and container
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(2, 0xFFFFFF);
        this.gridContainer = this.add.container(0, 0);

        // Create entrance and exit markers
        var stair_up = this.add.sprite(levelData.entranceX * this.CELL_SIZE + this.CELL_SIZE / 2, levelData.entranceY * this.CELL_SIZE + this.CELL_SIZE / 2, 'stair_up');
        stair_up.setDepth(1);
        stair_up.setScale(2);
        this.gridContainer.add(stair_up);

        if (this.currentLevel < this.TOTAL_LEVELS){
            var stair_down = this.add.sprite(this.exitX * this.CELL_SIZE + this.CELL_SIZE / 2, this.exitY * this.CELL_SIZE + this.CELL_SIZE / 2, 'stair_down');
            stair_down.setDepth(1);
            stair_down.setScale(2);
            this.gridContainer.add(stair_down);
        }
        if(this.GOING_BACK || this.currentLevel == this.TOTAL_LEVELS){
            this.sister_sprite = this.add.sprite(this.exitX * this.CELL_SIZE + this.CELL_SIZE / 2, this.exitY * this.CELL_SIZE + this.CELL_SIZE / 2, 'sister_down_idle');
            this.sister_game_object = this.physics.add.sprite(this.exitX * this.CELL_SIZE + this.CELL_SIZE / 2, this.exitY * this.CELL_SIZE + this.CELL_SIZE / 2, 'sister');
            this.sister_game_object.setVisible(false);
            console.log(this.sister_game_object);
            console.log(this.sister_sprite);
            console.log("Placed sister at: " + this.exitX * this.CELL_SIZE + this.CELL_SIZE / 2 + ", " + this.exitY * this.CELL_SIZE + this.CELL_SIZE / 2);
            this.sister_sprite.setDepth(1000);
            this.sister_sprite.setMask(this.mask);
            
            // Make sure sister_following is set correctly
            if (this.GOING_BACK) {
                this.sister_following = true;
            }
        }

        // Draw initial grid and create initial colliders
        this.redrawTile();

        // Create player with physics
        let playerX = levelData.entranceX * this.CELL_SIZE + this.CELL_SIZE / 2;
        let playerY = levelData.entranceY * this.CELL_SIZE + this.CELL_SIZE / 2;
        if(this.GOING_BACK){
            playerX = this.exitX * this.CELL_SIZE + this.CELL_SIZE / 2;
            playerY = this.exitY * this.CELL_SIZE + this.CELL_SIZE / 2;
            if (this.sister_game_object) {
                this.sister_game_object.setPosition(playerX, playerY);
                this.sister_sprite.setPosition(playerX, playerY);
            }
        }

        // Create player sprite with the circle texture
        this.player = this.physics.add.sprite(playerX, playerY, 'player');
        console.log('Player created at: ' + playerX + ', ' + playerY);
        console.log('Sister following: ' + this.sister_following);
        console.log('Sister sprite: ' + this.sister_sprite);
        this.player.setVisible(false);
        this.player.setCircle(this.PLAYER_SIZE, this.PLAYER_SIZE, this.PLAYER_SIZE);
        this.player.setOffset(this.PLAYER_SIZE / 2, this.PLAYER_SIZE / 2);

        //create player sprite to follow the circle
        this.playerSprite = this.add.sprite(playerX, playerY, 'player_down_idle');
        this.playerSprite.setDepth(1);

        // Add collision between player and walls
        this.physics.add.collider(this.player, this.wallGroup);
        this.physics.add.collider(this.player, this.lockedDoors);

        // Apply masks to all objects after player is created
        this.gridContainer.setMask(this.mask);
        this.graphics.setMask(this.mask);
        this.player.setMask(this.mask);

        // Set up camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(2);

        // Add level counter
        this.levelText = this.add.text(20, 20, `Level: ${this.currentLevel}`, {
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: {
                left: 10,
                right: 10,
                top: 5,
                bottom: 5
            },
            fontSize: '24px',
            color: '#ffffff'
        });
        this.levelText.setScrollFactor(0);
        this.levelText.setDepth(100);
        
        // Create timer text in the upper right corner
        this.timerText = this.add.text(this.scale.width - 20, 20, '00:00', {
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: {
                left: 10,
                right: 10,
                top: 5,
                bottom: 5
            },
            fontSize: '24px',
            color: '#ffffff'
        });
        this.timerText.setOrigin(1, 0); // Align right
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(100);
        
        if (!this.isTransitioning){
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

        }

        // Create debug graphics
        this.debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.debugGraphic.setVisible(false);
        

        // Create player grid position marker (initially invisible)
        this.playerGridMarker = this.add.rectangle(0, 0, this.CELL_SIZE, this.CELL_SIZE, 0x00ff00, 0.3);
        this.playerGridMarker.setVisible(false);
        this.playerGridMarker.setDepth(1);

        // Add debug text
        this.debugText = this.add.text(16, 60, '', {
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
        this.debugText.setVisible(this.debugMode);

        // Add keyboard input for debug mode
        this.input.keyboard?.on('keydown-T', () => {
            this.debugMode = !this.debugMode;
            this.physics.world.debugGraphic.setVisible(this.debugMode);
            this.playerGridMarker.setVisible(this.debugMode);
            this.debugText.setText('Debug Mode: ON');
            this.debugText.setVisible(this.debugMode);
            
            if (!this.debugMode) {
                this.debugGraphics.clear();
            }
        });

        //create health sprites
        this.health_sprite_group = this.add.container(100, this.scale.height - 35);
        this.health_sprite = this.add.sprite(0, 0, 'heart_full');   
        this.health_sprite2 = this.add.sprite(20, 0, 'heart_full');
        this.health_sprite3 = this.add.sprite(40, 0, 'heart_full');
        this.health_sprite_group.add(this.health_sprite);
        this.health_sprite_group.add(this.health_sprite2);
        this.health_sprite_group.add(this.health_sprite3);
        this.health_sprite_group.setDepth(1000);
        this.health_sprite_group.setScale(2);
        this.cameras.main.ignore(this.health_sprite_group);

        // Add battery meter UI
        this.batteryMeterGraphics = this.add.graphics();
        this.flashlight_sprite = this.add.sprite(this.scale.width - 250, this.scale.height - 35, 'flashlight');
        this.flashlight_sprite.setDepth(1000);
        this.flashlight_sprite.setScale(2);
        this.batteryMeterGraphics.setScrollFactor(0);
        this.batteryMeterGraphics.setDepth(1000);

        //Add battery count text and icon
        this.battery_sprite = this.add.sprite(this.scale.width - 350, this.scale.height - 35, 'battery_ui');
        this.battery_sprite.setDepth(1000);
        this.battery_sprite.setScale(2);
        this.batteryCountText = this.add.text(this.scale.width - 320, this.scale.height - 50, '0', {
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        });

        // Add key sprite and count text
        this.key_sprite = this.add.sprite(this.scale.width - 450, this.scale.height - 35, 'key_ui');
        this.key_sprite.setDepth(1000);
        this.key_sprite.setScale(2);
        this.keyCountText = this.add.text(this.scale.width - 420, this.scale.height - 50, '0', {
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        });

        // Add bomb sprite and count text
        this.bomb_sprite = this.add.sprite(this.scale.width - 550, this.scale.height - 35, 'bomb_ui');
        this.bomb_sprite.setDepth(1000);
        this.bomb_sprite.setScale(2);
        this.bombCountText = this.add.text(this.scale.width - 520, this.scale.height - 50, '0', {
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        });

        // Add camera sprite and count text
        this.camera_sprite = this.add.sprite(this.scale.width - 650, this.scale.height - 35, 'camera_ui');
        this.camera_sprite.setDepth(1000);
        this.camera_sprite.setScale(2);
        this.camera_count_text = this.add.text(this.scale.width - 620, this.scale.height - 50, '0', {
            fontSize: '22px',   
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        });
        
        // Create a camera for UI elements that doesn't zoom
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setZoom(1);  // Keep UI at normal scale
        
        // Make UI camera ignore game objects - we need to add them individually
        // since the ignore method expects GameObjects that implement the Layer interface
        this.uiCamera.ignore(this.graphics);
        this.uiCamera.ignore(this.gridContainer);
        this.uiCamera.ignore(this.player);
        this.uiCamera.ignore(this.playerSprite);
        this.uiCamera.ignore(this.lightingMask);
        this.uiCamera.ignore(this.debugGraphics);
        this.uiCamera.ignore(this.physics.world.debugGraphic);
        this.uiCamera.ignore(this.playerGridMarker);
        if(this.sister_sprite){
            this.uiCamera.ignore(this.sister_sprite);
        }
        
        // Add battery percentage text
        this.batteryText = this.add.text(
            0, 0,
            '100%',
            {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: {
                    left: 5,
                    right: 5,
                    top: 2,
                    bottom: 2
                }
            }
        );
        this.batteryText.setScrollFactor(0);
        this.batteryText.setDepth(1000);

        // Make main camera ignore UI elements
        this.cameras.main.ignore(this.health_sprite_group);
        this.cameras.main.ignore(this.batteryMeterGraphics);
        this.cameras.main.ignore(this.batteryText);
        this.cameras.main.ignore(this.flashlight_sprite);
        this.cameras.main.ignore(this.battery_sprite);
        this.cameras.main.ignore(this.batteryCountText);
        this.cameras.main.ignore(this.key_sprite);
        this.cameras.main.ignore(this.keyCountText);
        this.cameras.main.ignore(this.bomb_sprite);
        this.cameras.main.ignore(this.bombCountText);
        this.cameras.main.ignore(this.camera_sprite);
        this.cameras.main.ignore(this.camera_count_text);


        // Update the battery meter position based on game size
        const resize = () => {
            const width = this.scale.width;
            const height = this.scale.height;
            // Update UI camera viewport
            this.uiCamera.setViewport(0, 0, width, height);
            this.updateBatteryMeter(width, height);
        };

        // Call resize initially and on window resize
        this.scale.on('resize', resize);
        resize();

        // Create groups
        this.lockedDoors = this.physics.add.staticGroup();
        this.batteries = this.physics.add.group();
        this.keys = this.physics.add.group();
        this.bombs = this.physics.add.group();
        this.bombs_active = this.physics.add.group();
        this.camera_items = this.physics.add.group();

        // Create ghost group with physics
        this.ghost_group = this.physics.add.group({
            bounceX: 0.5,
            bounceY: 0.5,
            collideWorldBounds: true
        });

        // Create goblin group with physics
        this.goblin_group = this.physics.add.group({
            bounceX: 0.5,
            bounceY: 0.5,
            collideWorldBounds: true        
        });
        
        // After rooms are created and player is positioned
        this.spawnItems();

        // Make sure batteries are ignored by UI camera but affected by the mask
        this.batteries.getChildren().forEach(battery => {
            this.uiCamera.ignore(battery);
        });

        // Make keys ignored by UI camera but affected by the mask
        this.keys.getChildren().forEach(key => {
            this.uiCamera.ignore(key);
        });

        // Make bombs ignored by UI camera but affected by the mask
        this.bombs.getChildren().forEach(bomb => {
            this.uiCamera.ignore(bomb);
        });

        this.camera_items.getChildren().forEach(camera_item => {
            this.uiCamera.ignore(camera_item);
        });

        this.ghost_group.getChildren().forEach(ghost => {
            this.uiCamera.ignore(ghost);
        });

        this.goblin_group.getChildren().forEach(goblin => {
            this.uiCamera.ignore(goblin);
        });
        
        // Add collision between player and batteries
        this.physics.add.overlap(
            this.player, 
            this.batteries, 
            this.handleBatteryCollection as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, 
            undefined, 
            this
        );

        // Add collision between player and keys
        this.physics.add.overlap(
            this.player,
            this.keys,
            this.handleKeyCollection as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        // Add collision between player and bombs
        this.physics.add.overlap(
            this.player,
            this.bombs,
            this.handleBombCollection as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        // Add collision between player and camera items
        this.physics.add.overlap(
            this.player,
            this.camera_items,
            this.handleCameraItemCollection as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );
        // Add collision between player and locked doors
        this.physics.add.overlap(
            this.player,
            this.lockedDoors,
            this.handleLockedDoorInteraction as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        // Create dialog container (initially hidden)
        this.createDialogSystem();
        if(this.currentLevel === 1 && !this.GOING_BACK){
            this.showDialog("Zack! Your sister Ashley is kidnapped by goblins! Find her and lead her out of the dungeon until your flashlight runs out!", "Let's go!", () => {
            });
        }

        // Initialize audio with error handling
        try {
            // Initialize sound effects if they were loaded successfully
            const soundKeys = ['footstep', 'camera', 'death', 'door', 'explosion', 'goblin', 'goblin_death', 'ghost', 'ghost_death', 'hurt', 'item', 'note', 'recharge', 'sister', 'sister_cry', 'victory'];
            
            for (const key of soundKeys) {
                if (this.cache.audio.exists(key)) {
                    this.soundEffects.set(key, this.sound.add(key));
                }
            }
            
            // Initialize music if it was loaded successfully
            if (this.cache.audio.exists('music') && !this.GOING_BACK) {
                this.music = this.sound.add('music');
                this.music.play({ loop: true, volume: 0.5 });
            }
            else if(this.cache.audio.exists('music_fast') && this.GOING_BACK){
                this.music.stop();
                this.music = this.sound.add('music_fast');
                this.music.play({ loop: true, volume: 0.5 });
            }
        } catch (error) {
            console.warn('Error initializing audio:', error);
        }
    }

    private updateTargetPosition(pointer: Phaser.Input.Pointer) {
        // Convert screen coordinates to world coordinates
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = worldPoint.x;
        this.targetY = worldPoint.y;
    }

    private checkExitReached(): boolean {
        if(!this.GOING_BACK){
            const playerGridX = Math.floor(this.player.x / this.CELL_SIZE);
            const playerGridY = Math.floor(this.player.y / this.CELL_SIZE);
            return playerGridX === this.exitX && playerGridY === this.exitY;
        }
        else{
            const playerGridX = Math.floor(this.player.x / this.CELL_SIZE);
            const playerGridY = Math.floor(this.player.y / this.CELL_SIZE);
            return playerGridX === this.entranceX && playerGridY === this.entranceY;
        }
    }

    private updateSisterSprite(delta: number): void {
        if(this.sister_sprite && !this.GOING_BACK){
            this.sister_time += delta;
            if(this.sister_time > this.frameDuration / 2){
                this.sister_time = 0;
                this.sister_cry_frame++;
                if(this.sister_cry_frame > 6){
                    this.sister_cry_frame = 1;
                }
            }
            this.sister_sprite.setTexture('sister_cry' + this.sister_cry_frame);

            if(this.sister_time > this.sister_started_cry_timer + this.sister_cry_duration){
                this.playSound('sister_cry', {volume: 0.5});
                this.sister_started_cry_timer = this.sister_time;
            }
        }
        else if(this.GOING_BACK && !this.sister_sprite){
            this.sister_sprite = this.add.sprite(this.player.x, this.player.y, 'sister');
            this.sister_sprite.setDepth(100);
            this.uiCamera.ignore(this.sister_sprite);
        }
    }

    private nextLevel(): void {
        // Save important state before restarting
        const wasGoingBack = this.GOING_BACK;
        const wasSisterFollowing = this.sister_following;
        
        if(this.GOING_BACK && this.currentLevel != 1){
            this.currentLevel--;
        }
        else if(this.GOING_BACK && this.currentLevel == 1){
            this.playSound('victory');
            this.music.stop();
            this.showDialog("You've saved your sister, Zack! \n\n You are a hero! \n\n Total time: " + this.timerText.text, "Restart", () => {
                this.resetGame();
            });
            return;
        }
        else{
            this.currentLevel++;
        }
        
        // Store state in registry to persist across scene restart
        this.registry.set('GOING_BACK', wasGoingBack);
        this.registry.set('sister_following', wasSisterFollowing);
        this.registry.set('currentLevel', this.currentLevel);
        
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
        this.lockedDoors.clear(true, true);
        this.graphics.clear();
        this.debugGraphics.clear();
        
        // Reset debug mode
        this.debugMode = false;
        this.physics.world.debugGraphic.setVisible(false);
        this.playerGridMarker.setVisible(false);
        this.debugText.setVisible(this.debugMode);
        
        // Reset player state
        this.isMoving = false;
        this.targetX = 0;
        this.targetY = 0;
        
        // Reset grid and room data
        this.grid = [];
        this.rooms = [];
        this.roomTiles = [];
        
        // Reset all transition and exit states
        this.isTransitioning = false;
        this.isGeneratingLevel = false;
        this.exitSequenceInProgress = false;
        this.transitionPromise = null;
        
        // Reset battery positions but keep the count
        this.battery_positions = [];
        this.ghost_animation_delays = [];
        this.goblin_animation_delays = [];
        
        // Restart the scene to generate a new level
        this.scene.restart();
    }

    private async playExitTransition(): Promise<void> {
        this.transitionStart = 0;
        if (this.transitionPromise) {
            return this.transitionPromise;
        }

        this.transitionPromise = new Promise<void>((resolve, reject) => {
            try {
                this.isTransitioning = true;

                // Center player on exit tile
                let exitCenterX = this.exitX * this.CELL_SIZE + this.CELL_SIZE / 2;
                let exitCenterY = this.exitY * this.CELL_SIZE + this.CELL_SIZE / 2;
                this.isMoving = true;
                // Stop any current movement and set small rightward velocity
                if(!this.GOING_BACK){
                    this.player.setVelocity(1, 0); // Small constant rightward velocity
                    this.lastDirection = 'right';
                }
                else{
                    exitCenterX = this.entranceX * this.CELL_SIZE + this.CELL_SIZE / 2;
                    exitCenterY = this.entranceY * this.CELL_SIZE + this.CELL_SIZE / 2;
                    this.player.setVelocity(-1, 0);
                    this.lastDirection = 'left';
                }
                
                // Move player to exit center
                this.player.setPosition(exitCenterX, exitCenterY);
                this.playerSprite.setPosition(exitCenterX, exitCenterY);

                let completedAnimations = 0;
                const totalAnimations = 3;

                const checkComplete = () => {
                    completedAnimations++;
                    
                    if (completedAnimations >= totalAnimations) {
                        resolve();
                    }
                };

                // Store initial camera position relative to player
                const initialCameraOffset = {
                    x: this.cameras.main.scrollX - this.player.x,
                    y: this.cameras.main.scrollY - this.player.y
                };

                // Camera zoom and follow
                this.tweens.add({
                    targets: this.cameras.main,
                    zoom: this.cameras.main.zoom * this.CAMERA_ZOOM_FACTOR,
                    duration: this.TRANSITION_DURATION,
                    ease: 'Quad.InOut',
                    onUpdate: () => {
                        // Keep camera centered on player during zoom
                        this.cameras.main.scrollX = this.player.x + initialCameraOffset.x;
                        this.cameras.main.scrollY = this.player.y + initialCameraOffset.y;
                    },
                    onComplete: checkComplete
                });

                // Light shrink with slight fade
                this.tweens.add({
                    targets: this,
                    playerBrightLightZone: 0,
                    playerDimLightZone: 0,
                    duration: this.TRANSITION_DURATION,
                    ease: 'Linear',
                    onComplete: checkComplete
                });

                if(!this.GOING_BACK){
                    // Player dissolve effect
                    this.tweens.add({
                        targets: this.playerSprite,
                        scale: 0,
                        duration: this.TRANSITION_DURATION,
                        ease: 'Linear',
                        onComplete: checkComplete
                    });
                }
                else{
                    // Player dissolve effect
                    this.tweens.add({
                        targets: this.playerSprite,
                        scale: 1.5,
                        duration: this.TRANSITION_DURATION,
                        ease: 'Linear',
                        onComplete: checkComplete
                    });
                }

            } catch (error) {
                reject(error);
            }
        });

        try {
            await this.transitionPromise;
        } finally {
            this.isTransitioning = false;
            this.transitionPromise = null;
        }
    }

    private async handleExit() {
        // Prevent multiple exit sequences
        if (this.exitSequenceInProgress || this.isTransitioning || this.isGeneratingLevel) {
            return;
        }

        const isAtExit = this.checkExitReached();

        if (isAtExit && (this.currentLevel != this.TOTAL_LEVELS || this.GOING_BACK && this.currentLevel != 1)) {
            try {
                // Set all state flags at once to prevent race conditions
                this.exitSequenceInProgress = true;
                this.isTransitioning = true;
                this.isGeneratingLevel = true;
                
                await this.playExitTransition();

                await this.nextLevel();

                await this.resetPlayerAndStates();
                
            } catch (error) {
                console.error('Error during exit sequence:', error);
            } finally {
                // Reset all state flags
                this.isTransitioning = false;
                this.isGeneratingLevel = false;
                this.exitSequenceInProgress = false;
                this.transitionPromise = null;
            }
        }
        else if (isAtExit && !this.GOING_BACK && this.currentLevel == this.TOTAL_LEVELS) {
            this.playSound('sister');

            if(this.cache.audio.exists('music_fast')){
                this.music = this.sound.add('music_fast');
                this.music.play({ loop: true, volume: 0.5 });
                this.max_ghosts = 10;
                this.max_goblins = 20;
            }
            this.showDialog("'Zack! It's you, I am so scared'! \n\n 'Don't worry, Ashley! Let's get out of here!'", "Follow me!", () => {
                this.GOING_BACK = true;
                this.sister_following = true;
                this.playerHitPoints = 6;
            });
        }
    }

    private async resetPlayerAndStates(): Promise<void> {
        return new Promise<void>((resolve) => {
            // Fade in effect for new level
            this.cameras.main.fadeIn(500, 0, 0, 0);
            
            // Reset camera with smooth transition
            this.tweens.add({
                targets: this.cameras.main,
                zoom: 1,
                duration: 500,
                ease: 'Quad.Out'
            });
            
            // Reset light with smooth transition
            this.tweens.add({
                targets: this.lightingMask,
                radius: this.playerBrightLightZone,
                alpha: 1,
                duration: 500,
                ease: 'Quad.Out'
            });
            
            // Wait for transitions to complete
            this.time.delayedCall(500, () => {
                resolve();
            });
        });
    }

    update(time: number, delta: number) {

        this.updateGhosts(time);
        this.updateGoblins(time);

        // Skip update if dialog is open
        if (this.isDialogOpen) return;
        this.updatePlayerHealthUI();

        this.CAN_SPAWN = time - this.camera_last_used > this.camera_spawn_delay;

        // Update game timer (convert delta from ms to seconds)
        this.gameTimer += delta / 1000;
        this.updateTimerDisplay();

        this.updateSisterSprite(delta);
        
        this.bomb_delay_timer += delta;
        if(this.bomb_delay_timer > this.bomb_delay){
            this.updateBombsActive();
            this.bomb_delay_timer = 0;
        }
        
        this.player_saved_hit_points = this.playerHitPoints;
        
        // Process wall changes
        this.processWallChanges(time);

        // Update flashlight
        this.updateFlashlight(time);

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
        this.lightingMask.fillStyle(0xFFFFFF, 0.4);
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
        this.lightingMask.fillStyle(0xFFFFFF, 0.1);
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

        this.lightingMask.fillStyle(0xFFFFFF, 0.1);
        this.lightingMask.beginPath();
        this.lightingMask.moveTo(this.player.x, this.player.y);
        this.lightingMask.arc(
            this.player.x,
            this.player.y,
            Math.max(this.playerDimLightZone / 10, 10),
            0,
            Phaser.Math.DegToRad(360)
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

        if(this.input.keyboard && this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).isDown){
            this.showDialog("Game paused", "Resume", () => {});
        }

        // Handle battery recharge
        if(!this.isTransitioning && this.input.keyboard && this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE).isDown && this.battery_count > 0){
            // Track recharge timer to prevent rapid recharges
            this.rechargeTimer += delta;
            
            if (this.rechargeTimer >= this.rechargeInterval) {
                this.useBattery();
            }
        } else {
            // Reset timer if key is released
            this.rechargeTimer = this.rechargeInterval;
        }

        //Handle bomb placement
        if(!this.isTransitioning && this.input.keyboard && this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).isDown && this.bomb_count > 0){
            this.bomb_placement_delay_timer += delta;
            if(this.bomb_placement_delay_timer >= this.bomb_placement_delay){
                if(this.bomb_active_positions.filter(position => position.x === this.player.x && position.y === this.player.y).length == 0){
                    this.placeBomb();
                    this.bomb_placement_delay_timer = 0;
                }
            }
        } else {
            this.bomb_placement_delay_timer = this.bomb_placement_delay;
        }

        //handle camera usage
        if(!this.isTransitioning && this.input.keyboard && this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).isDown && this.camera_count > 0){
            if(this.CAN_SPAWN){
                this.useCamera(time);
            }
        }

        // Handle movement
        if (!this.isTransitioning && !this.isDialogOpen && this.isMoving && this.input.activePointer.isDown && this.input.activePointer.button === 0) {
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
            // Update visual sprite position to match physics player
            this.playerSprite.setPosition(this.player.x, this.player.y);
        } else if (!this.isTransitioning && !this.input.activePointer.isDown || this.input.activePointer.button !== 0) {
            // Stop movement if mouse button is released
            this.isMoving = false;
            this.player.setVelocity(0, 0);
            // Update visual sprite position to match physics player
            this.playerSprite.setPosition(this.player.x, this.player.y);
        }

        this.updatePlayerAnimation(time);
        this.updateKeysUI();
        this.updateBombsUI();
        this.updateCameraUI();

        // Check for exit condition
        this.handleExit();

        if(this.wallsToAdd.length === 0 && this.wallsToRemove.length < 50){
            this.removeSomeConnections();
        }
        if (this.wallsToRemove.length === 0) {
            this.connectUnconnectedRooms();
        }
        // Update lighting mask
        if (this.player && this.player.body) {
            // ... existing lighting code ...
            
            // Apply mask to all batteries
            if (this.mask && this.batteries) {
                this.batteries.getChildren().forEach(battery => {
                    // Cast to Sprite which has the setMask method
                    (battery as Phaser.GameObjects.Sprite).setMask(this.mask);
                });
            }
        }
        this.followPlayer();
    }

    private useBattery(): void {
        if (this.battery_count > 0 && this.flashlightBattery < 100) {
            this.rechargeTimer = 0;
            this.playSound('recharge', { volume: 0.6 });
            this.battery_count--;
            this.updateBatteriesUI();
            this.flashlightBattery = 100; // Recharge to full
            
            // Show recharge text
            this.showPlayerEventText('Recharge');
        }
    }

    updatePlayerAnimation(time: number) {
        if(this.isDialogOpen){
            this.player.setVelocity(0, 0);
            return;
        }
        if(this.transitionStart == 0){
            this.transitionStart = time;
        }
        if(this.playerHitPoints <= 0){
            this.playerSprite.setTexture('player_dead');
            this.playerSprite.setAlpha(1);
            this.playerSprite.setTint(0xffffff);
            if(this.sister_following){
                this.sister_sprite.setTexture('sister_dead');
                this.sister_sprite.setAlpha(1);
                this.sister_sprite.setTint(0xffffff);
            }
            return;
        }
        if (!this.player?.body || !this.playerSprite) return; 
        if(this.isTransitioning && !this.GOING_BACK){
            this.player.setVelocity(2, 0);
            this.playerSprite.setPosition(this.player.x + (time - this.transitionStart) * 0.0005, this.player.y + (time - this.transitionStart) * 0.0005);
        }
        else if(this.isTransitioning && this.GOING_BACK){
            this.player.setVelocity(-2, 0);
            this.playerSprite.setPosition(this.player.x - (time - this.transitionStart) * -0.0005, this.player.y - (time - this.transitionStart) * -0.0005);
        }
        const velocity = this.player.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        // Update movement state
        this.isMoving = speed > 0;

        // Determine direction based on velocity
        if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
            // Horizontal movement dominates
            if (velocity.x > 0) {
                this.lastDirection = 'right';
            } else if (velocity.x < 0) {
                this.lastDirection = 'left';
            }
        } else if (Math.abs(velocity.y) > 0) {
            // Vertical movement dominates
            if (velocity.y > 0) {
                this.lastDirection = 'down';
            } else {
                this.lastDirection = 'up';
            }
        }

        // Update frame time and alternate frames if moving
        if (this.isMoving) {
            if (time > this.frameTime) {
                this.currentFrame = this.currentFrame === 0 ? 1 : 0;
                this.frameTime = time + this.frameDuration;
                if (this.currentFrame == 0) {
                    this.playSound('footstep', { volume: 0.3 });
                }
            }

            // Set the appropriate texture based on direction and current frame
            const frame = this.currentFrame + 1; // Convert 0/1 to 1/2 for texture names
            switch (this.lastDirection) {
                case 'down':
                    this.playerSprite.setTexture(`player_down_walk${frame}`);
                    this.playerSprite.setFlipX(false);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_down_walk${frame}`);
                        this.sister_sprite.setFlipX(false);
                    }
                    break;
                case 'up':
                    this.playerSprite.setTexture(`player_up_walk${frame}`);
                    this.playerSprite.setFlipX(false);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_up_walk${frame}`);
                        this.sister_sprite.setFlipX(false);
                    }
                    break;
                case 'left':
                    this.playerSprite.setTexture(`player_left_walk${frame}`);
                    this.playerSprite.setFlipX(false);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_left_walk${frame}`);
                        this.sister_sprite.setFlipX(false);
                    }
                    break;
                case 'right':
                    this.playerSprite.setTexture(`player_left_walk${frame}`);
                    this.playerSprite.setFlipX(true);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_left_walk${frame}`);
                        this.sister_sprite.setFlipX(true);
                    }
                    break;
            }
        } else {
            // Set idle texture
            switch (this.lastDirection) {
                case 'down':
                    this.playerSprite.setTexture('player_down_idle');
                    this.playerSprite.setFlipX(false);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_down_idle`);
                        this.sister_sprite.setFlipX(false);
                    }
                    break;
                case 'up':
                    this.playerSprite.setTexture('player_up_idle');
                    this.playerSprite.setFlipX(false);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_up_idle`);
                        this.sister_sprite.setFlipX(false);
                    }
                    break;
                case 'left':
                    this.playerSprite.setTexture('player_left_idle');
                    this.playerSprite.setFlipX(false);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_left_idle`);
                        this.sister_sprite.setFlipX(false);
                    }
                    break;
                case 'right':
                    this.playerSprite.setTexture('player_left_idle');
                    this.playerSprite.setFlipX(true);
                    if(this.sister_following){
                        this.sister_sprite.setTexture(`sister_left_idle`);
                        this.sister_sprite.setFlipX(true);
                    }
                    break;
            }
        }
    }

    private updateBatteryMeter(width?: number, height?: number): void {
        // Use provided dimensions or get from scale manager
        const gameWidth = width || this.scale.width;
        const gameHeight = height || this.scale.height;
        
        // Calculate positions in screen space (not world space)
        const x = gameWidth - this.BATTERY_METER_WIDTH - 20;
        const y = gameHeight - this.BATTERY_METER_HEIGHT - 20;

        // Clear previous graphics
        this.batteryMeterGraphics.clear();

        // Draw black background
        this.batteryMeterGraphics.fillStyle(0x000000);
        this.batteryMeterGraphics.fillRect(x, y, this.BATTERY_METER_WIDTH, this.BATTERY_METER_HEIGHT);

        // Draw white border
        this.batteryMeterGraphics.lineStyle(2, 0xFFFFFF);
        this.batteryMeterGraphics.strokeRect(x, y, this.BATTERY_METER_WIDTH, this.BATTERY_METER_HEIGHT);

        // Draw battery level
        const fillWidth = (this.BATTERY_METER_WIDTH - this.BATTERY_METER_PADDING * 2) * (this.flashlightBattery / 100);
        this.batteryMeterGraphics.fillStyle(0xFFFFFF);
        this.batteryMeterGraphics.fillRect(
            x + this.BATTERY_METER_PADDING,
            y + this.BATTERY_METER_PADDING,
            fillWidth,
            this.BATTERY_METER_HEIGHT - this.BATTERY_METER_PADDING * 2
        );

        // Draw percentage marks (every 25%)
        this.batteryMeterGraphics.lineStyle(1, 0xFFFFFF);
        for (let i = 1; i < 4; i++) {
            const markX = x + (this.BATTERY_METER_WIDTH * (i * 0.25));
            this.batteryMeterGraphics.beginPath();
            this.batteryMeterGraphics.moveTo(markX, y);
            this.batteryMeterGraphics.lineTo(markX, y + this.BATTERY_METER_HEIGHT);
            this.batteryMeterGraphics.strokePath();
        }

        // Update battery text
        this.batteryText.setText(`${Math.round(this.flashlightBattery)}%`);
        this.batteryText.setPosition(
            x + this.BATTERY_METER_WIDTH / 2 - this.batteryText.width / 2,
            y + this.BATTERY_METER_HEIGHT / 2 - this.batteryText.height / 2
        );

        if(this.flashlightBattery <= 0){
            if(this.battery_count > 0){
                this.useBattery();
            }else{
                this.max_ghosts = 10;
            }
        }
    }

    private updateBatteriesUI(){
        this.battery_sprite.setVisible(this.battery_count > 0);
        this.batteryCountText.setVisible(this.battery_count > 0);
        this.batteryCountText.setText(`${this.battery_count}`);
    }

    private updateKeysUI(){
        this.key_sprite.setVisible(this.key_count > 0);
        this.keyCountText.setVisible(this.key_count > 0);   
        this.keyCountText.setText(`${this.key_count}`);
    }

    private updateBombsUI(){
        this.bomb_sprite.setVisible(this.bomb_count > 0);
        this.bombCountText.setVisible(this.bomb_count > 0);
        this.bombCountText.setText(`${this.bomb_count}`);
    }

    private updateCameraUI(){
        this.camera_count_text.setText(`${this.camera_count}`);
        this.camera_sprite.setVisible(this.camera_count > 0);
        this.camera_count_text.setVisible(this.camera_count > 0);
    }

    private updateFlashlight(time: number) {
        this.updateBatteriesUI();
        if(time - this.flashLightBatteryCycleTimer > this.flashLightBatteryCycle) {
            if (this.flashlightBattery > 0) {
                this.flashlightBattery -= 1;
            } else {
                this.flashlightBattery = 0;
            }
            this.flashLightBatteryCycleTimer = time;
            
            // Update battery meter UI
            this.updateBatteryMeter();
        }
        if (!this.isTransitioning && this.playerHitPoints > 0) {
            this.playerDimLightZone = this.flashlightMaxDistance * (this.flashlightBattery / 100);
            this.playerBrightLightZone = this.flashlightMinDistance * (this.flashlightBattery / 100);
        }
        if(this.playerHitPoints <= 0){
            this.playerDimLightZone = 0;
            this.playerBrightLightZone = 0;
        }
    }

    private playerTakeDamage(): void {
        if(this.isTransitioning){
            return;
        }
        // Reduce player hit points
        this.playerHitPoints--;
        this.playSound('hurt', { volume: 0.5 });
        
        // Create blood particle effect
        const bloodParticles = this.add.particles(this.player.x, this.player.y, 'ghost_1', {
            speed: { min: 50, max: 200 },
            scale: { start: 0.2, end: 0.05 },
            alpha: { start: 0.8, end: 0 },
            lifespan: { min: 400, max: 600 },
            blendMode: 'MULTIPLY',
            tint: 0xFF0000, // Red tint for blood
            quantity: 20,
            angle: { min: 0, max: 360 },
            emitting: false
        });
        
        // Make sure particles are affected by the lighting mask
        if (this.mask) {
            bloodParticles.setMask(this.mask);
        }
        
        // Make sure UI camera ignores particles
        if (this.uiCamera) {
            this.uiCamera.ignore(bloodParticles);
        }
        
        // Emit particles in a burst
        bloodParticles.explode(30);
        
        // Destroy particles after they're done
        this.time.delayedCall(600, () => {
            bloodParticles.destroy();
        });
        
        // Flash the player red
        this.playerSprite.setTint(0xFF0000);
        this.playerSprite.setAlpha(0.75);
        this.showPlayerEventText('Hit!', '#ff0000');
        
        // Camera shake effect
        this.cameras.main.shake(200, 0.01);
        
        // Reset player appearance after invincibility duration
        this.time.delayedCall(this.playerInvincibilityDuration, () => {
            this.playerSprite.setAlpha(1);
            this.playerSprite.clearTint();
        });

        this.updatePlayerHealthUI();
        
        // Check for game over
        if(this.playerHitPoints <= 0){
            this.playerHitPoints = 0;
            this.playerSprite.setTexture('player_dead');
            this.tweens.add({
                targets: this.cameras.main,
                zoom: 30,
                duration: 7000,
                onComplete: () => {
                    this.showDialog("You are dead! Game over!", "Darn...", () => {
                        this.resetGame();
                    });
                }
            });
        }
    }

    private updatePlayerHealthUI(): void {
            // Update health display
            if(this.playerHitPoints == 6){
                this.health_sprite3.setTexture('heart_full');
                this.health_sprite2.setTexture('heart_full');
                this.health_sprite.setTexture('heart_full');
            }
            else if(this.playerHitPoints == 5){
                this.health_sprite.setTexture('heart_half');
            }
            else if(this.playerHitPoints < 5){
                this.health_sprite3.setTexture('heart_empty');
            }
            else{
                this.health_sprite3.setTexture('heart_full');
            }
            if(this.playerHitPoints == 3){
                this.health_sprite2.setTexture('heart_half');
            }
            else if(this.playerHitPoints < 3){
                this.health_sprite2.setTexture('heart_empty');
            }
            else{
                this.health_sprite2.setTexture('heart_full');
            }
            if(this.playerHitPoints == 1){
                this.health_sprite.setTexture('heart_half');
            }
            else if(this.playerHitPoints < 1){
                this.health_sprite.setTexture('heart_empty');
            }
            else{
                this.health_sprite.setTexture('heart_full');
            }
        }
    private resetGame(): void {
        this.scene.start('MainMenu');
        this.playerHitPoints = this.PLAYER_MAX_HIT_POINTS;
        this.flashlightBattery = 100;
        this.battery_count = 0;
        this.key_count = 0;
        this.bomb_count = 0;
        this.camera_count = 0;
        this.gameTimer = 0;
        this.music.stop();
    }

    private spawnGoblins(): void {
        if(!this.CAN_SPAWN){
            return;
        }
        // Determine how many ghosts to spawn
        const goblinsToSpawn = this.max_goblins - this.goblin_count;
        
        // Get a shuffled copy of the rooms array to randomize placement
        const shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        
        // Spawn goblins in different rooms
        for (let i = 0; i < goblinsToSpawn && i < shuffledRooms.length; i++) {
            const room = shuffledRooms[i];
            
            // Find a random position within the room (not too close to edges)
            const padding = 1; // Cells from the edge
            const x = Phaser.Math.Between(
                room.x + padding * 2, 
                room.x + room.width - padding * 2
            ) * this.CELL_SIZE + this.CELL_SIZE / 2;

            const y = Phaser.Math.Between(
                room.y + padding * 2, 
                room.y + room.height - padding * 2
            ) * this.CELL_SIZE + this.CELL_SIZE / 2;

            if(Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 200 || Phaser.Math.Distance.Between(x, y, this.entranceX, this.entranceY) < 200)
            {
                continue;
            }
            else{
                // Create goblin sprite
                const goblin = this.goblin_group.create(x, y, 'goblin_1') as Phaser.Physics.Arcade.Sprite;
                this.goblin_count++;
                goblin.setDepth(5); // Above floor, below player
                goblin.setMask(this.mask);
                this.physics.add.collider(goblin, this.wallGroup);
                
                // Set physics properties
                goblin.setCollideWorldBounds(true);
                goblin.setCircle(8); // Set circular hitbox

                // Set initial animation delay
                this.goblin_animation_delays.push(Phaser.Math.Between(700, 1000));
            }
        }
        
        // Set up collisions between goblins and with player
        this.physics.add.collider(this.goblin_group, this.goblin_group);
    }

    private updateGoblins(time: number): void {
        // Skip if no goblins
        if (this.max_goblins == 0) {
            return;
        }
        else if(this.isDialogOpen || this.isTransitioning){
            this.goblin_group.getChildren().forEach((goblin) => {
                const goblinSprite = goblin as Phaser.Physics.Arcade.Sprite;
                goblinSprite.setVelocity(0, 0);
                goblinSprite.setData('isRunning', false);
            });
            return;
        }
        else if(this.goblin_count < this.max_goblins){  
            this.spawnGoblins();
        }
        
        // Ensure goblin_count matches actual count
        if (this.goblin_count !== this.goblin_group.getChildren().length) {
            this.goblin_count = this.goblin_group.getChildren().length;
        }
        
        for (let i = 0; i < this.goblin_count; i++) {
            const goblin = this.goblin_group.getChildren()[i];
            if (goblin) {
                const delay = this.goblin_animation_delays[i];
                const currentTime = time % delay;
                if (currentTime < delay / 2) {
                    (goblin as Phaser.GameObjects.Sprite).setTexture('goblin_1');
                } else {
                    (goblin as Phaser.GameObjects.Sprite).setTexture('goblin_2');
                }
            }
        }
        
        // Collect goblins to destroy
        const goblinsToDestroy: {goblin: Phaser.GameObjects.GameObject, sprite: Phaser.Physics.Arcade.Sprite}[] = [];
        
        // If goblin is within screen view, follow player
        this.goblin_group.getChildren().forEach((goblin) => {
            const goblinSprite = goblin as Phaser.Physics.Arcade.Sprite;
            this.uiCamera.ignore(goblinSprite);
            const distanceToPlayer = Phaser.Math.Distance.Between(
                goblinSprite.x,
                goblinSprite.y,
                this.player.x,
                this.player.y
            );
            
            // Check if goblin is in bright light zone
            const isInBrightLight = this.isInBrightLight(goblinSprite.x, goblinSprite.y);
            
            if (isInBrightLight) {
                if (!goblinSprite.getData('isRunning')) {
                    this.playSound('goblin', { volume: 0.5 });
                    goblinSprite.setData('isRunning', true);
                }
                // Calculate direction to player
                const dx = this.player.x - goblinSprite.x;
                const dy = this.player.y - goblinSprite.y;
                
                // Normalize the direction vector
                const length = Math.sqrt(dx * dx + dy * dy);
                const normalizedDx = dx / length;
                const normalizedDy = dy / length;
                
                // Set velocity directly with speed of 50
                let speed = Math.max(50, 100 - distanceToPlayer / 10);
                goblinSprite.setVelocity(normalizedDx * -speed * 2, normalizedDy * -speed * 2);
                return; // Skip the rest of the logic for this goblin
            } 

            if(time % 3 == 0) {
                goblinSprite.setData('isRunning', false);
            }

            if (distanceToPlayer < 1000) {
                const goblinGridX = Math.floor(goblinSprite.x / this.CELL_SIZE);
                const goblinGridY = Math.floor(goblinSprite.y / this.CELL_SIZE);

                if(this.playerVisitedTiles.includes({x: goblinGridX, y: goblinGridY})){
                    var currentTile = this.playerVisitedTiles.indexOf({x: goblinGridX, y: goblinGridY})
                    //follow the path of visited tiles
                    const tile = this.playerVisitedTiles[currentTile + 1];
                    const dx = tile.x - goblinSprite.x;
                    const dy = tile.y - goblinSprite.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const normalizedDx = dx / length;
                    const normalizedDy = dy / length;
                    goblinSprite.setVelocity(normalizedDx * 50, normalizedDy * 50);
                }
                else if(distanceToPlayer > 10 && goblin.active && !this.isTransitioning && this.playerHitPoints > 0){
                    // Calculate direction to player
                    const dx = this.player.x - goblinSprite.x;
                    const dy = this.player.y - goblinSprite.y;
                    
                    // Normalize the direction vector
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const normalizedDx = dx / length;
                    const normalizedDy = dy / length;
                    
                    // Set velocity directly with speed of 50
                    let speed = Math.max(50, 100 - distanceToPlayer / 10);
                    goblinSprite.setVelocity(normalizedDx * speed, normalizedDy * speed);
                }
                else if(distanceToPlayer < 10 && goblin.active){
                    if(time - this.playerLastHitTime > this.playerInvincibilityDuration){
                        this.playerTakeDamage();
                        this.playerLastHitTime = time;
                        goblinsToDestroy.push({goblin, sprite: goblinSprite});
                        return;
                    }
                }
            } else {
                goblinSprite.setVelocity(Phaser.Math.Between(-10, 10), Phaser.Math.Between(-10, 10));
            }
        });
        
        // Destroy collected goblins after iteration
        if (goblinsToDestroy.length > 0) {
            goblinsToDestroy.forEach(({goblin, sprite}) => {
                // Destroy the goblin
                this.destroyGoblin(goblin, sprite);
            });
        }
    }

    private updateGhosts(time: number): void {
        // Skip if no ghosts
        if (this.max_ghosts == 0) {
            return;
        }
        else if(this.isDialogOpen || this.isTransitioning){
            this.ghost_group.getChildren().forEach((ghost) => {
                const ghostSprite = ghost as Phaser.Physics.Arcade.Sprite;
                ghostSprite.setVelocity(0, 0);
                ghostSprite.setData('isFollowing', false);
            });
            return;
        }
        else if(this.ghost_count < this.max_ghosts){
            this.spawnGhosts();
        }
        
        // Ensure ghost_count matches actual count
        if (this.ghost_count !== this.ghost_group.getChildren().length) {
            this.ghost_count = this.ghost_group.getChildren().length;
        }
        
        for (let i = 0; i < this.ghost_count; i++) {
            const ghost = this.ghost_group.getChildren()[i];
            if (ghost) {
                const delay = this.ghost_animation_delays[i];
                const currentTime = time % delay;
                if (currentTime < delay / 2) {
                    (ghost as Phaser.GameObjects.Sprite).setTexture('ghost_1');
                } else {
                    (ghost as Phaser.GameObjects.Sprite).setTexture('ghost_2');
                }
            }
        }
        
        // Collect ghosts to destroy
        const ghostsToDestroy: {ghost: Phaser.GameObjects.GameObject, sprite: Phaser.Physics.Arcade.Sprite}[] = [];
        
        // If ghost is within screen view, follow player
        this.ghost_group.getChildren().forEach((ghost) => {
            const ghostSprite = ghost as Phaser.Physics.Arcade.Sprite;
            this.uiCamera.ignore(ghostSprite);
            const distanceToPlayer = Phaser.Math.Distance.Between(
                ghostSprite.x,
                ghostSprite.y,
                this.player.x,
                this.player.y
            );
            
            // Check if ghost is in bright light zone
            const isInBrightLight = this.isInBrightLight(ghostSprite.x, ghostSprite.y);
            
            if (isInBrightLight) {
                // Mark ghost for destruction if it's in bright light
                ghostsToDestroy.push({ghost, sprite: ghostSprite});
                ghost.active = false;
                return; // Skip the rest of the logic for this ghost
            } 
            
            if ((distanceToPlayer < 1000 || this.flashlightBattery <= 0) && this.playerHitPoints > 0) {
                // Play sound when ghost first sees player
                if (!ghostSprite.getData('isFollowing')) {
                    this.playSound('ghost', { volume: 0.5 });
                    ghostSprite.setData('isFollowing', true);
                }
                // Calculate direction to player
                const dx = this.player.x - ghostSprite.x;
                const dy = this.player.y - ghostSprite.y;
                
                // Normalize the direction vector
                const length = Math.sqrt(dx * dx + dy * dy);
                const normalizedDx = dx / length;
                const normalizedDy = dy / length;
                
                // Set velocity directly with speed of 50
                let speed = Math.max(50, 100 - distanceToPlayer / 10);
                ghostSprite.setVelocity(normalizedDx * speed, normalizedDy * speed);
                
                if(distanceToPlayer < 10 && ghost.active && !this.isTransitioning && this.playerHitPoints > 0){
                    if(time - this.playerLastHitTime > this.playerInvincibilityDuration){
                        this.playerTakeDamage();
                        this.playerLastHitTime = time;
                        ghostsToDestroy.push({ghost, sprite: ghostSprite});
                        return;
                    }
                }
            } else {
                //add random movement to the ghost
                ghostSprite.setVelocity(Phaser.Math.Between(-10, 10), Phaser.Math.Between(-10, 10));
            }
        }); 
        
        // Destroy collected ghosts after iteration
        if (ghostsToDestroy.length > 0) {
            ghostsToDestroy.forEach(({ghost, sprite}) => {
                // Destroy the ghost
                this.destroyGhost(ghost, sprite);
            });
        }
    }

    private destroyGoblin(goblin: Phaser.GameObjects.GameObject, goblinSprite: Phaser.Physics.Arcade.Sprite): void {
        goblin.destroy();
        
        // Check if the goblin is already being destroyed (has an active tween)
        const existingTweens = this.tweens.getTweensOf(goblinSprite);
        if (existingTweens.length > 0) {
            return;
        }
        
        // Ensure ghost count doesn't go below 0
        if (this.goblin_count <= 0) {
            this.goblin_count = Math.max(1, this.goblin_group.getChildren().length);
        }
        
        // Store the goblin's position since it will be destroyed
        const goblinX = goblinSprite.x;
        const goblinY = goblinSprite.y;
        
        // Create particle effect for ghost destruction
        const particles = this.add.particles(goblinX, goblinY, 'goblin_1', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.4, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            quantity: 15,
            rotate: { min: 0, max: 360 },
            emitting: false
        });
        
        // Make sure particles are affected by the lighting mask
        if (this.mask) {
            particles.setMask(this.mask);
        }
        
        // Make sure UI camera ignores particles
        if (this.uiCamera) {
            this.uiCamera.ignore(particles);
        }
        
        // Emit particles in a burst
        particles.explode(20);
        
        // Add a flash effect
        goblinSprite.setTint(0xFFFFFF);
        
        // Create a shockwave effect
        const shockwave = this.add.graphics();
        shockwave.setDepth(goblinSprite.depth - 1);
        
        // Make sure shockwave is affected by the lighting mask
        if (this.mask) {
            shockwave.setMask(this.mask);
        }
        
        // Make sure UI camera ignores shockwave
        if (this.uiCamera) {
            this.uiCamera.ignore(shockwave);
        }
        
        // Animate the shockwave
        this.tweens.add({
            targets: { radius: 0, alpha: 0.7 },
            radius: 50,
            alpha: 0,
            duration: 500,
            onUpdate: (tween, target) => {
                shockwave.clear();
                shockwave.lineStyle(3, 0xFFFFFF, target.alpha);
                shockwave.strokeCircle(goblinX, goblinY, target.radius);
            },
            onComplete: () => {
                shockwave.destroy();
                goblin.destroy();
                this.goblin_count = Math.max(0, this.goblin_count - 1);
            }   
        });
        
        // Animate the goblin fading away
        this.tweens.add({
            targets: goblinSprite,
            alpha: 0,
            scale: 0,
            duration: 500,
            onComplete: () => {
                // Destroy the sprite
                goblinSprite.destroy();
                
                // Set a timer to destroy particles after their lifespan
                this.time.delayedCall(800, () => {
                    particles.destroy();
                });
            }
        });
    }


    private spawnGhosts(): void {
        if(!this.CAN_SPAWN){
            return;
        }
        // Determine how many ghosts to spawn
        const ghostsToSpawn = this.max_ghosts - this.ghost_count;
        
        // Get a shuffled copy of the rooms array to randomize placement
        const shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        
        // Spawn ghosts in different rooms
        for (let i = 0; i < ghostsToSpawn && i < shuffledRooms.length; i++) {
            const room = shuffledRooms[i];
            
            // Find a random position within the room (not too close to edges)
            const padding = 1; // Cells from the edge
            const x = Phaser.Math.Between(
                room.x + padding * 2, 
                room.x + room.width - padding * 2
            ) * this.CELL_SIZE + this.CELL_SIZE / 2;

            const y = Phaser.Math.Between(
                room.y + padding * 2, 
                room.y + room.height - padding * 2
            ) * this.CELL_SIZE + this.CELL_SIZE / 2;

            if(Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 200 || Phaser.Math.Distance.Between(x, y, this.entranceX, this.entranceY) < 200)
            {
                continue;
            }
            else{
                // Create ghost sprite
                const ghost = this.ghost_group.create(x, y, 'ghost_1') as Phaser.Physics.Arcade.Sprite;
                this.ghost_count++;
                ghost.setDepth(5); // Above floor, below player
                
                // Set physics properties
                ghost.setCollideWorldBounds(true);
                ghost.setCircle(8); // Set circular hitbox

                // Set initial animation delay
                this.ghost_animation_delays.push(Phaser.Math.Between(700, 1000));
            }
        }
        
        // Set up collisions between ghosts and with player
        this.physics.add.collider(this.ghost_group, this.ghost_group);
    }

    private destroyGhost(ghost: Phaser.GameObjects.GameObject, ghostSprite: Phaser.Physics.Arcade.Sprite): void {
        this.playSound('ghost_death', { volume: 1 });
        ghost.destroy();
        
        // Check if the ghost is already being destroyed (has an active tween)
        const existingTweens = this.tweens.getTweensOf(ghostSprite);
        if (existingTweens.length > 0) {
            return;
        }
        
        // Ensure ghost count doesn't go below 0
        if (this.ghost_count <= 0) {
            this.ghost_count = Math.max(1, this.ghost_group.getChildren().length);
        }
        
        // Store the ghost's position since it will be destroyed
        const ghostX = ghostSprite.x;
        const ghostY = ghostSprite.y;
        
        // Create particle effect for ghost destruction
        const particles = this.add.particles(ghostX, ghostY, 'ghost_1', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.4, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            quantity: 15,
            rotate: { min: 0, max: 360 },
            emitting: false
        });
        
        // Make sure particles are affected by the lighting mask
        if (this.mask) {
            particles.setMask(this.mask);
        }
        
        // Make sure UI camera ignores particles
        if (this.uiCamera) {
            this.uiCamera.ignore(particles);
        }
        
        // Emit particles in a burst
        particles.explode(20);
        
        // Add a flash effect
        ghostSprite.setTint(0xFFFFFF);
        
        // Create a shockwave effect
        const shockwave = this.add.graphics();
        shockwave.setDepth(ghostSprite.depth - 1);
        
        // Make sure shockwave is affected by the lighting mask
        if (this.mask) {
            shockwave.setMask(this.mask);
        }
        
        // Make sure UI camera ignores shockwave
        if (this.uiCamera) {
            this.uiCamera.ignore(shockwave);
        }
        
        // Immediately destroy the ghost object to prevent multiple destructions
        
        // Animate the shockwave
        this.tweens.add({
            targets: { radius: 0, alpha: 0.7 },
            radius: 50,
            alpha: 0,
            duration: 500,
            onUpdate: (tween, target) => {
                shockwave.clear();
                shockwave.lineStyle(3, 0xFFFFFF, target.alpha);
                shockwave.strokeCircle(ghostX, ghostY, target.radius);
            },
            onComplete: () => {
                shockwave.destroy();
                ghost.destroy();
                this.ghost_count = Math.max(0, this.ghost_count - 1);
            }
        });
        
        // Animate the ghost fading away
        this.tweens.add({
            targets: ghostSprite,
            alpha: 0,
            scale: 0,
            duration: 500,
            onComplete: () => {
                // Destroy the sprite
                ghostSprite.destroy();
                
                // Set a timer to destroy particles after their lifespan
                this.time.delayedCall(800, () => {
                    particles.destroy();
                });
            }
        });
    }

    private followPlayer(): void {
        if(this.GOING_BACK && this.sister_following){
            if(this.sister_game_object && this.sister_sprite){
                // Calculate direction from sister to player
                const dx = this.player.x - this.sister_game_object.x;
                const dy = this.player.y - this.sister_game_object.y;
                
                // Normalize the direction vector
                const length = Math.sqrt(dx * dx + dy * dy);
                
                // Prevent division by zero
                if (length > 0) {
                    const normalizedDx = dx / length;
                    const normalizedDy = dy / length;
                    
                    //closer to player, lower speed, until halt
                    let speed = 100
                    if(length < 10){
                        speed = 0;
                    }
                    else if(length > 32){
                        speed = 200;
                    }
                    this.sister_game_object.setVelocity(normalizedDx * speed, normalizedDy * speed);
                } else {
                    this.sister_game_object.setVelocity(0, 0);
                }
                
                this.sister_sprite.setPosition(this.sister_game_object.x, this.sister_game_object.y);
                console.log("Sister position: " + this.sister_game_object.x + ", " + this.sister_game_object.y);
                
                // Make sure the sister is always visible by clearing any mask
                this.sister_sprite.clearMask();
            }
        }
    }


    private spawnItems(): void {
        if(this.GOING_BACK){
            return;
        }
        // Clear any existing batteries
        this.batteries.clear(true, true);
        this.battery_positions = [];

        // Clear any existing keys
        this.keys.clear(true, true);
        this.key_positions = [];

        // Clear any existing camera items
        this.camera_items.clear(true, true);
        this.camera_items_positions = [];

        // Clear any existing bombs
        this.bombs.clear(true, true);
        this.bomb_positions = [];

        let keysToSpawn = 0;

        if(this.currentLevel >= this.key_starting_level){
            keysToSpawn = Phaser.Math.Between(
                this.MIN_KEYS_PER_LEVEL, 
                this.MAX_KEYS_PER_LEVEL
            );
        }

        let bombsToSpawn = 0;

        if(this.currentLevel >= this.bomb_starting_level){
            bombsToSpawn = Phaser.Math.Between(
                this.MIN_BOMBS_PER_LEVEL, 
                this.MAX_BOMBS_PER_LEVEL
            );
        }

        let cameraItemsToSpawn = 0;

        if(this.currentLevel >= this.camera_starting_level){
            cameraItemsToSpawn = Phaser.Math.Between(
                this.MIN_CAMERA_COUNT, 
                this.MAX_CAMERA_COUNT
            );
        }
        
        // Determine how many batteries to spawn (between MIN and MAX)
        let batteriesToSpawn = Phaser.Math.Between(
            this.MIN_BATTERIES_PER_LEVEL, 
            this.MAX_BATTERIES_PER_LEVEL
        );  
        
        // Get a shuffled copy of the rooms array to randomize placement
        const shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        const entranceRoom = this.rooms.find(room => 
            room.x <= this.player.x / this.CELL_SIZE && 
            room.x + room.width > this.player.x / this.CELL_SIZE && 
            room.y <= this.player.y / this.CELL_SIZE && 
            room.y + room.height > this.player.y / this.CELL_SIZE
        );

        if(this.notes.length > this.currentLevel && entranceRoom){
            this.spawnItem(entranceRoom, "Note");
            shuffledRooms.splice(shuffledRooms.indexOf(entranceRoom), 1);
        }
        
        // Spawn batteries in different rooms
        for (let i = 0; i < batteriesToSpawn && i < shuffledRooms.length; i++) {
            const room = shuffledRooms.pop();
            if (room) {
                this.spawnItem(room, "Battery");
            }
        }

        // Spawn keys in different rooms
        for (let i = 0; i < keysToSpawn && i < shuffledRooms.length; i++) {
            const room = shuffledRooms.pop();
            if (room) {
                this.spawnItem(room, "Key");
            }
        }

        // Spawn bombs in different rooms
        for (let i = 0; i < bombsToSpawn && i < shuffledRooms.length; i++) {
            const room = shuffledRooms.pop();
            if (room) {
                this.spawnItem(room, "Bomb");
            }
        }

        // Spawn camera items in different rooms
        for (let i = 0; i < cameraItemsToSpawn && i < shuffledRooms.length; i++) {
            const room = shuffledRooms.pop();
            if (room) {
                this.spawnItem(room, "Camera");
            }
        }
    }

    private spawnItem(room: Room, itemType: string): void {
        // Find a random position within the room (not too close to edges)
        const padding = 2; // Cells from the edge
        const x = Phaser.Math.Between(
            room.x + padding, 
            room.x + room.width - padding   
        ) * this.CELL_SIZE + this.CELL_SIZE / 2;

        const y = Phaser.Math.Between(
            room.y + padding, 
            room.y + room.height - padding
        ) * this.CELL_SIZE + this.CELL_SIZE / 2;

        // Create item sprite
        let item: Phaser.GameObjects.Sprite;
        if (itemType == "Battery") {
            item = this.batteries.create(x, y, 'battery') as Phaser.GameObjects.Sprite;
            this.battery_positions.push({x: Math.floor(x / this.CELL_SIZE), y: Math.floor(y / this.CELL_SIZE)});
        } 
        else if (itemType == "Note") {
            if(this.notes.length > this.currentLevel){
                this.note = this.physics.add.sprite(x, y, 'note');
            }
            else{
                this.note = this.physics.add.sprite(x, y, 'hugging_skeletons');
            }
            this.noteText = this.notes[this.currentLevel - 1];
            this.note.setDepth(5);
            item = this.note;
            
            this.physics.add.overlap(
                this.player,
                this.note,
                this.readNote as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
                undefined,
                this
            );
            this.uiCamera.ignore(item);
        }
        else if (itemType == "Bomb") {
            item = this.bombs.create(x, y, 'bomb_inactive') as Phaser.GameObjects.Sprite;
            this.bomb_positions.push({x: Math.floor(x / this.CELL_SIZE), y: Math.floor(y / this.CELL_SIZE)});
        }
        else if (itemType == "Camera") {
            item = this.camera_items.create(x, y, 'camera') as Phaser.GameObjects.Sprite;
            this.camera_items_positions.push({x: Math.floor(x / this.CELL_SIZE), y: Math.floor(y / this.CELL_SIZE)});
        }
        else {
            item = this.keys.create(x, y, 'key') as Phaser.GameObjects.Sprite;
            this.key_positions.push({x: Math.floor(x / this.CELL_SIZE), y: Math.floor(y / this.CELL_SIZE)});
        }
        item.setDepth(5); // Above floor, below player

        // Apply the lighting mask to the item  
        if (this.mask) {
            item.setMask(this.mask);
        }

        // Add a small bobbing animation
        this.tweens.add({
            targets: item,
            y: y - 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private placeBomb(): void {
        console.log("Placing bomb");
        let bomb: Phaser.GameObjects.Sprite;
        bomb = this.bombs_active.create(this.player.x, this.player.y, 'bomb_active_1') as Phaser.GameObjects.Sprite;
        bomb.setDepth(5);
        this.uiCamera.ignore(bomb);
        this.bomb_active_positions.push({x: Math.floor(this.player.x / this.CELL_SIZE), y: Math.floor(this.player.y / this.CELL_SIZE), time: 1, bomb: bomb});
    }

    private updateBombsActive(): void {
        for (const position of this.bomb_active_positions){
            position.time++;
            if(position.time > 3){
                this.bombExplode(position);
            }
            else{
                position.bomb.setTexture('bomb_active_' + position.time);
            }
        }
        this.bomb_active_positions = this.bomb_active_positions.filter(p => p.time <= 3);
    }

    private bombExplode(position: {x: number, y: number, time: number, bomb: Phaser.GameObjects.Sprite}): void {
        this.playSound('explosion', { volume: 0.8 });
        position.bomb.destroy();
        
        // Calculate explosion center coordinates in pixels
        const centerX = position.x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const centerY = position.y * this.CELL_SIZE + this.CELL_SIZE / 2;
        
        // Add camera shake effect for more impact
        this.cameras.main.shake(300, 0.01);
        
        // Create explosion visual effect
        const explosion = this.add.graphics();
        explosion.fillStyle(0xff8800, 0.8);
        explosion.fillCircle(centerX, centerY, this.bomb_explosion_radius);
        explosion.fillStyle(0xffff00, 0.6);
        explosion.fillCircle(centerX, centerY, this.bomb_explosion_radius * 0.7);
        explosion.fillStyle(0xffffff, 0.4);
        explosion.fillCircle(centerX, centerY, this.bomb_explosion_radius * 0.4);
        
        // Make UI camera ignore explosion effect
        this.uiCamera.ignore(explosion);
        
        // Create simple explosion particles using graphics instead of particle emitter
        const particleCount = 20;
        const particles: Phaser.GameObjects.Graphics[] = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.graphics();
            const particleSize = Phaser.Math.Between(3, 8);
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.bomb_explosion_radius;
            
            const particleX = centerX + Math.cos(angle) * distance;
            const particleY = centerY + Math.sin(angle) * distance;
            
            particle.fillStyle(0xffaa00, 0.8);
            particle.fillCircle(particleX, particleY, particleSize);
            
            if (this.mask) {
                particle.setMask(this.mask);
            }
            
            this.uiCamera.ignore(particle);
            particles.push(particle);
            
            // Animate each particle
            this.tweens.add({
                targets: particle,
                alpha: 0,
                x: particleX + Math.cos(angle) * 50,
                y: particleY + Math.sin(angle) * 50,
                duration: 500,
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Fade out explosion effect
        this.tweens.add({
            targets: explosion,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Check if player is within explosion radius
        const distanceToPlayer = Phaser.Math.Distance.Between(
            centerX, centerY, this.player.x, this.player.y
        );
        
        if (distanceToPlayer <= this.bomb_explosion_radius) {
            // Damage player if within explosion radius
            this.playerTakeDamage();
            
            // Apply knockback force to player
            const angle = Phaser.Math.Angle.Between(centerX, centerY, this.player.x, this.player.y);
            const knockbackForce = 200;
            const knockbackX = Math.cos(angle) * knockbackForce;
            const knockbackY = Math.sin(angle) * knockbackForce;
            this.player.setVelocity(knockbackX, knockbackY);
            
            // Show damage message
            this.showPlayerEventText('Bomb Damage!', '#ff0000');
        }
        
        // Destroy ghosts within explosion radius
        this.ghost_group.getChildren().forEach((ghost) => {
            const ghostSprite = ghost as Phaser.Physics.Arcade.Sprite;
            const distanceToGhost = Phaser.Math.Distance.Between(
                centerX, centerY, ghostSprite.x, ghostSprite.y
            );
            
            if (distanceToGhost <= this.bomb_explosion_radius) {
                this.destroyGhost(ghost, ghostSprite);
                
                // Show score or effect text
                this.showPlayerEventText('+100', '#00ff00');
            }
        });
        
        // Destroy goblins within explosion radius
        this.goblin_group.getChildren().forEach((goblin) => {
            const goblinSprite = goblin as Phaser.Physics.Arcade.Sprite;
            const distanceToGoblin = Phaser.Math.Distance.Between(
                centerX, centerY, goblinSprite.x, goblinSprite.y
            );
            
            if (distanceToGoblin <= this.bomb_explosion_radius) {
                this.destroyGoblin(goblin, goblinSprite);
                this.playSound('goblin_death', { volume: 0.7 });
            }
        });
        
        // Remove walls within explosion radius
        const gridRadius = Math.ceil(this.bomb_explosion_radius / this.CELL_SIZE);
        
        for (let y = position.y - gridRadius; y <= position.y + gridRadius; y++) {
            for (let x = position.x - gridRadius; x <= position.x + gridRadius; x++) {
                // Check if coordinates are within grid bounds
                if (x >= 1 && x < this.GRID_SIZE - 1 && y >= 1 && y < this.GRID_SIZE - 1) {
                    // Check if cell is within explosion radius
                    const distanceToCell = Phaser.Math.Distance.Between(
                        position.x, position.y, x, y
                    );
                    
                    if (distanceToCell <= gridRadius) {
                        // Don't destroy border walls
                        if (x > 0 && y > 0 && x < this.GRID_SIZE - 1 && y < this.GRID_SIZE - 1) {
                            // If it's a wall, remove it
                            if (this.grid[y][x]) {
                                this.removeTile(x, y);
                            }
                            
                            // Check if there's a locked door here
                            const doorPosition = this.lockedDoorPositions.find(
                                door => door.x === x && door.y === y
                            );
                            
                            if (doorPosition) {
                                this.removeLockedDoor(doorPosition.door);
                                
                                // Show door destroyed message
                                this.showPlayerEventText('Door Destroyed!', '#ffaa00');
                            }
                        }
                    }
                }
            }
        }
        
        // Update grid rendering after changes
        this.redrawTile();
        
        // Decrease player's bomb count
        this.bomb_count--;
        this.updateBombsUI();
        
        // Play explosion sound effect (if available)
        // this.sound.play('explosion');
    }

    private readNote(): void {
        this.playSound('note', { volume: 0.5 });
        this.showDialog(this.noteText, "Okay", () => {
            this.note.destroy();
        });
    }
    

    private addLockedDoor(x: number, y: number): void {
        // Create the locked door sprite
        const lockedDoor = this.lockedDoors.create(
            x * this.CELL_SIZE + this.CELL_SIZE / 2, 
            y * this.CELL_SIZE + this.CELL_SIZE / 2, 
            'locked_door'
        ) as Phaser.Physics.Arcade.Sprite;
        
        // Set sprite properties
        lockedDoor.setScale(2);
        lockedDoor.setDepth(5);
        lockedDoor.setImmovable(true);
        
        // Adjust the physics body to match the visual size
        if (lockedDoor.body) {
            lockedDoor.body.setSize(this.CELL_SIZE / 2, this.CELL_SIZE / 2);
            // Refresh the physics body
            lockedDoor.body.reset(
                x * this.CELL_SIZE + this.CELL_SIZE / 2,
                y * this.CELL_SIZE + this.CELL_SIZE / 2
            );
        }
        
        // Add to tracking array
        this.lockedDoorPositions.push({
            x: Math.floor(x), 
            y: Math.floor(y), 
            door: lockedDoor
        });
        
        // Apply lighting mask
        if (this.mask) {
            lockedDoor.setMask(this.mask);
        }
        
        // Make UI camera ignore door
        this.uiCamera.ignore(lockedDoor);
        
        // Add collision with player
        this.physics.add.collider(this.player, lockedDoor);
        
    }

    private removeLockedDoor(door: Phaser.Physics.Arcade.Sprite): void {
        door.destroy();
        this.lockedDoorPositions = this.lockedDoorPositions.filter(position => position.x !== door.x && position.y !== door.y);
    }

    private updateLockedDoors(): void {
        let doorsToRemove: Phaser.Physics.Arcade.Sprite[] = [];
        for (const position of this.lockedDoorPositions){
            if (this.grid[position.y][position.x] || !this.isValidLockedDoorPosition(position.x, position.y)){
                doorsToRemove.push(position.door);
            }
        }
        for (const door of doorsToRemove){
            this.removeLockedDoor(door);
        }
    }
    
    private showPlayerEventText(message: string, color: string = '#ffff00'): void {
        // Use player position for the text
        const x = this.player.x;
        const y = this.player.y - 20;
        
        // Create text with specified message and color
        const eventText = this.add.text(x, y, message, {
            fontSize: '16px',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        eventText.setDepth(100);
        this.uiCamera.ignore(eventText);
        
        // Animate the text upward and fade out
        this.tweens.add({
            targets: eventText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                eventText.destroy();
            }
        });
    }
    
    private handleBatteryCollection(
        _obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile,
        obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile
    ): void {
        this.playSound('item', { volume: 0.6 });
        // Remove the battery from the scene (obj2 is the battery)
        obj2.destroy();
        
        // Increment battery count
        this.battery_count++;
        
        this.updateBatteriesUI();
        
        // Show pickup text
        this.showPlayerEventText('+1 Battery');
    }

    private handleBombCollection(
        _obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile,
        obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile
    ): void {
        this.playSound('item', { volume: 0.6 });
        // Remove the bomb from the scene (obj2 is the bomb)
        obj2.destroy();

        // Increment bomb count
        this.bomb_count++;
        
        this.updateBombsUI();

        // Show pickup text
        this.showPlayerEventText('+1 Bomb');
    }

    private handleKeyCollection(
        _obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile,
        obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile
    ): void {
        this.playSound('item', { volume: 0.6 });
        // Remove the key from the scene (obj2 is the key)
        obj2.destroy();

        // Increment key count
        this.key_count++;
        
        this.updateKeysUI();

        // Show pickup text
        this.showPlayerEventText('+1 Key');
    }

    private handleCameraItemCollection(
        _obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile,
        obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile
    ): void {
        this.playSound('item', { volume: 0.6 });
        obj2.destroy();
        this.camera_count++;
        this.updateCameraUI();
        this.showPlayerEventText('+1 Camera');
    }

    private handleLockedDoorInteraction(
        _obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile,
        obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile
    ): void {
        if (this.key_count > 0){
            this.playSound('door', { volume: 0.8 });
            this.key_count--;
            this.updateKeysUI();
            this.removeLockedDoor(obj2 as Phaser.Physics.Arcade.Sprite);
            this.showPlayerEventText('Unlocked!');
            this.unlockedDoors++;
        } 
    }

    private useCamera(time: number): void {
        if (this.camera_count > 0 && time - this.camera_last_used >= this.camera_spawn_delay) {
            this.playSound('camera', { volume: 0.7 });
            this.camera_last_used = time;
            this.camera_count--;
            this.updateCameraUI();
            //create white rectangle to cover the screen
            const whiteRectangle = this.add.rectangle(0, 0, 100000 , 100000, 0xffffff, 1);
            // Camera doesn't have an add method, we use the scene's add method instead
            this.cameras.main.ignore(whiteRectangle);
            this.tweens.add({
                targets: whiteRectangle,
                alpha: 0,
                duration: this.camera_spawn_delay,
                onComplete: () => {
                    whiteRectangle.destroy();
                }
            });

            //remove all ghosts and goblins
            this.ghost_group.clear(true, true);
            this.goblin_group.clear(true, true);
        }
    }

    // Add cleanup method for scene shutdown
    shutdown() {
        this.isTransitioning = false;
        this.isGeneratingLevel = false;
        this.exitSequenceInProgress = false;
        this.transitionPromise = null;
    }

    /**
     * Creates the dialog system components
     */
    private createDialogSystem(): void {
        // Create container for all dialog elements
        this.dialogContainer = this.add.container(0, 0);
        this.dialogContainer.setDepth(2000); // Above everything
        this.dialogContainer.setVisible(false);
        
        // Create semi-transparent background overlay
        const overlay = this.add.rectangle(
            0, 0, 
            this.scale.width, this.scale.height, 
            0x000000, 0.7
        );
        overlay.setOrigin(0, 0);
        this.dialogContainer.add(overlay);
        
        // Create dialog background
        this.dialogBackground = this.add.graphics();
        this.dialogContainer.add(this.dialogBackground);
        
        // Create dialog text
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 400 }
        });
        this.dialogText.setOrigin(0.5);
        this.dialogContainer.add(this.dialogText);
        
        // Create button container
        this.dialogButton = this.add.container(0, 0);
        this.dialogContainer.add(this.dialogButton);
        
        // Make sure UI camera doesn't ignore dialog
        if (this.uiCamera) {
            // Don't ignore the dialog container
            this.cameras.main.ignore(this.dialogContainer);
        }
    }
    
    /**
     * Shows a dialog with the specified message and button text
     * @param message The message to display
     * @param buttonText The text for the button
     * @param callback Function to call when the button is clicked
     */
    public showDialog(message: string, buttonText: string, callback: () => void): void {
        if (this.isDialogOpen) return;
        
        // Pause the game
        this.previousTimeScale = this.time.timeScale;
        this.time.timeScale = 0;
        this.isDialogOpen = true;
        
        // Set dialog text
        this.dialogText.setText(message);
        
        // Calculate dialog size based on text
        const padding = 40;
        const dialogWidth = Math.max(400, this.dialogText.width + padding * 2);
        const buttonHeight = 60;
        const dialogHeight = this.dialogText.height + buttonHeight + padding * 3;
        
        // Position dialog in center of screen
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // Draw dialog background
        this.dialogBackground.clear();
        this.dialogBackground.fillStyle(0x000000, 1);
        this.dialogBackground.fillRect(
            centerX - dialogWidth / 2,
            centerY - dialogHeight / 2,
            dialogWidth,
            dialogHeight
        );
        this.dialogBackground.lineStyle(4, 0xffffff, 1);
        this.dialogBackground.strokeRect(
            centerX - dialogWidth / 2,
            centerY - dialogHeight / 2,
            dialogWidth,
            dialogHeight
        );
        
        // Position text
        this.dialogText.setPosition(centerX, centerY - buttonHeight / 2);
        
        // Clear previous button
        this.dialogButton.removeAll(true);
        
        // Create button background
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(0x333333, 1);
        buttonBackground.fillRect(
            centerX - 100,
            centerY + dialogHeight / 2 - buttonHeight - padding,
            200,
            buttonHeight
        );
        buttonBackground.lineStyle(2, 0xffffff, 1);
        buttonBackground.strokeRect(
            centerX - 100,
            centerY + dialogHeight / 2 - buttonHeight - padding,
            200,
            buttonHeight
        );
        this.dialogButton.add(buttonBackground);
        
        // Create button text
        const buttonTextObj = this.add.text(
            centerX,
            centerY + dialogHeight / 2 - buttonHeight / 2 - padding,
            buttonText,
            {
                fontSize: '20px',
                color: '#ffffff'
            }
        );
        buttonTextObj.setOrigin(0.5);
        this.dialogButton.add(buttonTextObj);
        
        // Create a clickable button zone
        const buttonZone = this.add.zone(
            centerX,
            centerY + dialogHeight / 2 - buttonHeight / 2 - padding,
            200,
            buttonHeight
        );
        buttonZone.setInteractive();
        buttonZone.setOrigin(0.5);
        this.dialogButton.add(buttonZone);
        
        // Add hover effect
        buttonZone.on('pointerover', () => {
            buttonBackground.clear();
            buttonBackground.fillStyle(0x555555, 1);
            buttonBackground.fillRect(
                centerX - 100,
                centerY + dialogHeight / 2 - buttonHeight - padding,
                200,
                buttonHeight
            );
            buttonBackground.lineStyle(2, 0xffffff, 1);
            buttonBackground.strokeRect(
                centerX - 100,
                centerY + dialogHeight / 2 - buttonHeight - padding,
                200,
                buttonHeight
            );
        });
        
        buttonZone.on('pointerout', () => {
            buttonBackground.clear();
            buttonBackground.fillStyle(0x333333, 1);
            buttonBackground.fillRect(
                centerX - 100,
                centerY + dialogHeight / 2 - buttonHeight - padding,
                200,
                buttonHeight
            );
            buttonBackground.lineStyle(2, 0xffffff, 1);
            buttonBackground.strokeRect(
                centerX - 100,
                centerY + dialogHeight / 2 - buttonHeight - padding,
                200,
                buttonHeight
            );
        });
        
        // Add click handler
        buttonZone.on('pointerdown', () => {
            this.closeDialog();
            if (callback) callback();
        });
        
        // Show dialog
        this.dialogContainer.setVisible(true);
    }
    
    /**
     * Closes the dialog and resumes the game
     */
    private closeDialog(): void {
        if (!this.isDialogOpen) return;
        
        // Hide dialog
        this.dialogContainer.setVisible(false);
        
        // Resume game
        this.time.timeScale = this.previousTimeScale;
        this.isDialogOpen = false;
    }

    /**
     * Checks if a position is within the player's bright light zone
     * @param x The x coordinate to check
     * @param y The y coordinate to check
     * @returns True if the position is in the bright light zone
     */
    private isInBrightLight(x: number, y: number): boolean {
        // If flashlight battery is dead, nothing is in bright light
        if (this.flashlightBattery <= 0) {
            return false;
        }
        
        // Calculate distance from player
        const distanceToPlayer = Phaser.Math.Distance.Between(
            x, y, this.player.x, this.player.y
        );
        
        // Check if within bright light zone radius
        if (distanceToPlayer > this.playerBrightLightZone) {
            return false;
        }
        
        // Calculate angle to position
        const angleToPosition = Phaser.Math.Angle.Between(
            this.player.x, this.player.y, x, y
        );
        
        // Calculate angle difference with player's facing direction
        const angleDiff = Phaser.Math.Angle.Wrap(angleToPosition - this.lastPlayerAngle);
        
        // Check if within flashlight cone (60 degrees)
        const halfConeAngle = Phaser.Math.DegToRad(60);
        const isInCone = Math.abs(angleDiff) <= halfConeAngle;
        
        return isInCone;
    }

    /**
     * Removes a wall (sets a cell to traversable) at the specified grid position
     * @param x X-coordinate in the grid
     * @param y Y-coordinate in the grid
     * @returns true if the wall was removed, false if the cell was already traversable
     */
    private removeTile(x: number, y: number): boolean {
        // Check if coordinates are within grid bounds
        if (x < 0 || x >= this.GRID_SIZE || y < 0 || y >= this.GRID_SIZE) {
            return false;
        }
        

        if (!this.grid[y][x]) {
            return false; 
        }

        this.grid[y][x] = false;
        
        return true;
    }

    // Format and update the timer display
    private updateTimerDisplay(): void {
        const minutes = Math.floor(this.gameTimer / 60);
        const seconds = Math.floor(this.gameTimer % 60);
        
        // Format as MM:SS with leading zeros
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        
        this.timerText.setText(`${formattedMinutes}:${formattedSeconds}`);
    }
} 

