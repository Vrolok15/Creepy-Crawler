interface Room {
    x: number;
    y: number;
    width: number;
    height: number;
    depth: number; // BSP tree depth
}

interface BSPNode {
    x: number;
    y: number;
    width: number;
    height: number;
    room?: Room;
    left?: BSPNode;
    right?: BSPNode;
    depth: number;
}

interface LevelConfig {
    gridSize?: number;
    minRoomSize?: number;
    maxRoomSize?: number;
    maxSplits?: number;
    roomPadding?: number;
    splitRandomness?: number; // 0-1, how random the split position is
}

export interface LevelData {
    grid: boolean[][];
    entranceX: number;
    entranceY: number;
    exitX: number;
    exitY: number;
}

export class LevelGenerator {
    private readonly GRID_SIZE: number;
    private readonly MIN_ROOM_SIZE: number;
    private readonly MAX_ROOM_SIZE: number;
    private readonly MAX_SPLITS: number;
    private readonly ROOM_PADDING: number;
    private readonly SPLIT_RANDOMNESS: number;
    private grid: boolean[][] = [];
    private rooms: Room[] = [];
    private entrance?: Room;
    private exit?: Room;

    constructor(config: LevelConfig = {}) {
        this.GRID_SIZE = config.gridSize || 50;
        this.MIN_ROOM_SIZE = config.minRoomSize || 5;
        this.MAX_ROOM_SIZE = config.maxRoomSize || 15;
        this.MAX_SPLITS = config.maxSplits || 4;
        this.ROOM_PADDING = config.roomPadding || 1;
        this.SPLIT_RANDOMNESS = config.splitRandomness || 0.5;
    }

    generateLevel(): LevelData {
        // Reset state
        this.rooms = [];
        this.entrance = undefined;
        this.exit = undefined;

        // Fill the grid with walls
        this.grid = Array(this.GRID_SIZE).fill(null).map(() => 
            Array(this.GRID_SIZE).fill(true)
        );

        // Generate rooms using BSP
        const rootNode: BSPNode = {
            x: 1,
            y: 1,
            width: this.GRID_SIZE - 2,
            height: this.GRID_SIZE - 2,
            depth: 0
        };

        this.splitNode(rootNode);
        this.createRooms(rootNode);
        this.connectRooms(rootNode);
        this.placeEntranceAndExit();
        this.carveRooms();

        const entrancePos = this.getEntrancePosition();
        const exitPos = this.getExitPosition();
        
        return {
            grid: this.grid,
            entranceX: entrancePos.x,
            entranceY: entrancePos.y,
            exitX: exitPos.x,
            exitY: exitPos.y
        };
    }

    private getEntrancePosition(): { x: number, y: number } {
        if (!this.entrance) {
            return { x: this.GRID_SIZE / 2, y: this.GRID_SIZE / 2 };
        }
        return {
            x: this.entrance.x + Math.floor(this.entrance.width / 2),
            y: this.entrance.y + Math.floor(this.entrance.height / 2)
        };
    }

    private getExitPosition(): { x: number, y: number } {
        if (!this.exit) {
            return { x: this.GRID_SIZE / 2, y: this.GRID_SIZE / 2 };
        }
        return {
            x: this.exit.x + Math.floor(this.exit.width / 2),
            y: this.exit.y + Math.floor(this.exit.height / 2)
        };
    }

    private connectRooms(node: BSPNode): void {
        if (node.left && node.right) {
            // Get rooms from left and right nodes
            const leftRooms = this.getAllRooms(node.left);
            const rightRooms = this.getAllRooms(node.right);

            if (leftRooms.length > 0 && rightRooms.length > 0) {
                // Choose random rooms from each side
                const leftRoom = leftRooms[Math.floor(Math.random() * leftRooms.length)];
                const rightRoom = rightRooms[Math.floor(Math.random() * rightRooms.length)];

                // Create corridor between rooms
                this.createCorridor(leftRoom, rightRoom);
            }

            // Continue connecting rooms in children
            this.connectRooms(node.left);
            this.connectRooms(node.right);
        }
    }

    private getAllRooms(node: BSPNode): Room[] {
        const rooms: Room[] = [];
        if (node.room) {
            rooms.push(node.room);
        }
        if (node.left) {
            rooms.push(...this.getAllRooms(node.left));
        }
        if (node.right) {
            rooms.push(...this.getAllRooms(node.right));
        }
        return rooms;
    }

    private createCorridor(roomA: Room, roomB: Room): void {
        // Get centers of rooms
        const ax = roomA.x + Math.floor(roomA.width / 2);
        const ay = roomA.y + Math.floor(roomA.height / 2);
        const bx = roomB.x + Math.floor(roomB.width / 2);
        const by = roomB.y + Math.floor(roomB.height / 2);

        // Randomly choose whether to go horizontal or vertical first
        if (Math.random() < 0.5) {
            this.createHorizontalCorridor(ax, bx, ay);
            this.createVerticalCorridor(ay, by, bx);
        } else {
            this.createVerticalCorridor(ay, by, ax);
            this.createHorizontalCorridor(ax, bx, by);
        }
    }

    private createHorizontalCorridor(x1: number, x2: number, y: number): void {
        const start = Math.min(x1, x2);
        const end = Math.max(x1, x2);
        for (let x = start; x <= end; x++) {
            this.grid[y][x] = false;
        }
    }

    private createVerticalCorridor(y1: number, y2: number, x: number): void {
        const start = Math.min(y1, y2);
        const end = Math.max(y1, y2);
        for (let y = start; y <= end; y++) {
            this.grid[y][x] = false;
        }
    }

    private splitNode(node: BSPNode): void {
        if (node.depth >= this.MAX_SPLITS) return;

        const minSize = this.MIN_ROOM_SIZE + this.ROOM_PADDING * 2;
        const isVertical = Math.random() < 0.5;

        if (isVertical && node.width > minSize * 2) {
            // Vertical split
            const minSplit = Math.floor(node.width * (0.5 - this.SPLIT_RANDOMNESS / 2));
            const maxSplit = Math.floor(node.width * (0.5 + this.SPLIT_RANDOMNESS / 2));
            const split = minSplit + Math.floor(Math.random() * (maxSplit - minSplit));
            
            node.left = {
                x: node.x,
                y: node.y,
                width: split,
                height: node.height,
                depth: node.depth + 1
            };

            node.right = {
                x: node.x + split + 1,
                y: node.y,
                width: node.width - split - 1,
                height: node.height,
                depth: node.depth + 1
            };

            this.splitNode(node.left);
            this.splitNode(node.right);
        } 
        else if (!isVertical && node.height > minSize * 2) {
            // Horizontal split
            const minSplit = Math.floor(node.height * (0.5 - this.SPLIT_RANDOMNESS / 2));
            const maxSplit = Math.floor(node.height * (0.5 + this.SPLIT_RANDOMNESS / 2));
            const split = minSplit + Math.floor(Math.random() * (maxSplit - minSplit));

            node.left = {
                x: node.x,
                y: node.y,
                width: node.width,
                height: split,
                depth: node.depth + 1
            };

            node.right = {
                x: node.x,
                y: node.y + split + 1,
                width: node.width,
                height: node.height - split - 1,
                depth: node.depth + 1
            };

            this.splitNode(node.left);
            this.splitNode(node.right);
        }
    }

    private createRooms(node: BSPNode): void {
        if (!node.left && !node.right) {
            // This is a leaf node, create a room
            const maxWidth = Math.min(node.width - this.ROOM_PADDING * 2, this.MAX_ROOM_SIZE);
            const maxHeight = Math.min(node.height - this.ROOM_PADDING * 2, this.MAX_ROOM_SIZE);
            
            const roomWidth = Math.max(
                Math.floor(Math.random() * (maxWidth - this.MIN_ROOM_SIZE)) + this.MIN_ROOM_SIZE,
                this.MIN_ROOM_SIZE
            );
            const roomHeight = Math.max(
                Math.floor(Math.random() * (maxHeight - this.MIN_ROOM_SIZE)) + this.MIN_ROOM_SIZE,
                this.MIN_ROOM_SIZE
            );

            const roomX = node.x + this.ROOM_PADDING + Math.floor((node.width - this.ROOM_PADDING * 2 - roomWidth) / 2);
            const roomY = node.y + this.ROOM_PADDING + Math.floor((node.height - this.ROOM_PADDING * 2 - roomHeight) / 2);

            const room: Room = {
                x: roomX,
                y: roomY,
                width: roomWidth,
                height: roomHeight,
                depth: node.depth
            };

            node.room = room;
            this.rooms.push(room);
            return;
        }

        if (node.left) this.createRooms(node.left);
        if (node.right) this.createRooms(node.right);
    }

    private placeEntranceAndExit(): void {
        // Sort rooms by depth to find ones furthest apart in the BSP tree
        const sortedRooms = [...this.rooms].sort((a, b) => a.depth - b.depth);
        
        // Place entrance in a room with lowest depth (closest to root)
        this.entrance = sortedRooms[0];
        
        // Place exit in a room with highest depth (furthest from root)
        this.exit = sortedRooms[sortedRooms.length - 1];
    }

    private carveRooms(): void {
        // Carve out all rooms
        for (const room of this.rooms) {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    this.grid[y][x] = false;
                }
            }
        }

        // Mark entrance and exit
        if (this.entrance) {
            const entranceCenter = {
                x: this.entrance.x + Math.floor(this.entrance.width / 2),
                y: this.entrance.y + Math.floor(this.entrance.height / 2)
            };
            this.grid[entranceCenter.y][entranceCenter.x] = false;
        }

        if (this.exit) {
            const exitCenter = {
                x: this.exit.x + Math.floor(this.exit.width / 2),
                y: this.exit.y + Math.floor(this.exit.height / 2)
            };
            this.grid[exitCenter.y][exitCenter.x] = false;
        }
    }
} 