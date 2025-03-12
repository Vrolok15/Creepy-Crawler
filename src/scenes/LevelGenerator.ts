interface Room {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface BSPNode {
    x: number;
    y: number;
    width: number;
    height: number;
    left?: BSPNode;
    right?: BSPNode;
}

interface LevelGeneratorConfig {
    gridSize: number;
    minRoomSize: number;
    maxRoomSize: number;
    maxSplits: number;
    roomPadding: number;
    splitRandomness: number;
}

interface Point {
    x: number;
    y: number;
}

interface AStarNode {
    point: Point;
    g: number;  // Cost from start to current node
    h: number;  // Estimated cost from current node to end
    f: number;  // Total cost (g + h)
    parent?: AStarNode;
}

export interface LevelData {
    grid: boolean[][];
    entranceX: number;
    entranceY: number;
    exitX: number;
    exitY: number;
    rooms: Room[];
}

export class LevelGenerator {
    private grid: boolean[][];
    private rooms: Room[] = [];
    private config: LevelGeneratorConfig;

    constructor(config: LevelGeneratorConfig) {
        this.config = config;
        this.grid = Array(config.gridSize).fill(false).map(() => Array(config.gridSize).fill(true));
    }

    createGrid(): boolean[][] {
        return Array(this.config.gridSize).fill(false).map(() => Array(this.config.gridSize).fill(true));
    }

    generateLevel(): LevelData {
        // Reset state
        this.rooms = [];
        this.grid = this.createGrid();

        // Create root node
        const root: BSPNode = {
            x: 0,
            y: 0,
            width: this.config.gridSize,
            height: this.config.gridSize
        };

        for(let i = 0; i < this.config.gridSize; i++){
            for(let j = 0; j < this.config.gridSize; j++){
                this.grid[i][j] = true;
            }
        }

        // Split space into rooms
        this.splitNode(root, 0);

        // Place entrance and exit
        const { entranceX, entranceY, exitX, exitY } = this.placeEntranceAndExit();

        return {
            grid: this.grid,
            entranceX,
            entranceY,
            exitX,
            exitY,
            rooms: this.rooms
        };
    }

    private splitNode(node: BSPNode, depth: number): void {
        if (depth >= this.config.maxSplits) {
            this.createRoom(node);
            return;
        }

        // Determine split direction (horizontal or vertical)
        const isHorizontal = node.width > node.height;

        if (isHorizontal) {
            // Calculate split point with randomness
            const minSplit = node.x + this.config.minRoomSize;
            const maxSplit = node.x + node.width - this.config.minRoomSize;
            const splitPoint = Math.floor(minSplit + Math.random() * (maxSplit - minSplit));

            // Create child nodes
            node.left = {
                x: node.x,
                y: node.y,
                width: splitPoint - node.x,
                height: node.height
            };

            node.right = {
                x: splitPoint,
                y: node.y,
                width: node.width - (splitPoint - node.x),
                height: node.height
            };
        } else {
            // Calculate split point with randomness
            const minSplit = node.y + this.config.minRoomSize;
            const maxSplit = node.y + node.height - this.config.minRoomSize;
            const splitPoint = Math.floor(minSplit + Math.random() * (maxSplit - minSplit));

            // Create child nodes
            node.left = {
                x: node.x,
                y: node.y,
                width: node.width,
                height: splitPoint - node.y
            };

            node.right = {
                x: node.x,
                y: splitPoint,
                width: node.width,
                height: node.height - (splitPoint - node.y)
            };
        }

        // Recursively split child nodes
        this.splitNode(node.left!, depth + 1);
        this.splitNode(node.right!, depth + 1);
    }

    private createRoom(node: BSPNode): void {
        // Add padding to room size
        const padding = this.config.roomPadding;
        const roomWidth = node.width - padding * 2;
        const roomHeight = node.height - padding * 2;

        // Skip if room is too small
        if (roomWidth < this.config.minRoomSize || roomHeight < this.config.minRoomSize) {
            return;
        }

        // Add randomness to room size
        const randomWidth = Math.min(
            Math.floor(roomWidth + Math.random() * this.config.splitRandomness * roomWidth),
            this.config.maxRoomSize
        );
        const randomHeight = Math.min(
            Math.floor(roomHeight + Math.random() * this.config.splitRandomness * roomHeight),
            this.config.maxRoomSize
        );

        // Calculate room position with padding
        const roomX = Math.floor(node.x + padding);
        const roomY = Math.floor(node.y + padding);

        // Create room
        const room: Room = {
            x: roomX,
            y: roomY,
            width: randomWidth,
            height: randomHeight
        };

        // Add room to list
        this.rooms.push(room);

        // Create room in grid
        for (let y = roomY; y < roomY + randomHeight; y++) {
            for (let x = roomX; x < roomX + randomWidth; x++) {
                if (x >= 0 && x < this.config.gridSize && y >= 0 && y < this.config.gridSize) {
                    this.grid[y][x] = false;
                }
            }
        }
    }

    private placeEntranceAndExit(): { entranceX: number; entranceY: number; exitX: number; exitY: number } {
        // Calculate minimum distance (half the map size)
        const minDistance = Math.floor(this.config.gridSize / 2);

        // Shuffle rooms to randomize selection
        const shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);

        // Find suitable rooms for entrance and exit
        let entranceRoom: Room | null = null;
        let exitRoom: Room | null = null;

        // Helper function to calculate distance between room centers
        const getRoomDistance = (room1: Room, room2: Room): number => {
            const center1 = {
                x: room1.x + Math.floor(room1.width / 2),
                y: room1.y + Math.floor(room1.height / 2)
            };
            const center2 = {
                x: room2.x + Math.floor(room2.width / 2),
                y: room2.y + Math.floor(room2.height / 2)
            };
            return Math.abs(center1.x - center2.x) + Math.abs(center1.y - center2.y);
        };

        // Try to find suitable rooms
        for (let i = 0; i < shuffledRooms.length; i++) {
            for (let j = i + 1; j < shuffledRooms.length; j++) {
                const distance = getRoomDistance(shuffledRooms[i], shuffledRooms[j]);
                if (distance >= minDistance) {
                    entranceRoom = shuffledRooms[i];
                    exitRoom = shuffledRooms[j];
                    break;
                }
            }
            if (entranceRoom && exitRoom) break;
        }

        // If no suitable rooms found, use first and last rooms
        if (!entranceRoom || !exitRoom) {
            entranceRoom = shuffledRooms[0];
            exitRoom = shuffledRooms[shuffledRooms.length - 1];
        }

        // Place entrance in entrance room
        const entranceX = entranceRoom.x + Math.floor(Math.random() * entranceRoom.width);
        const entranceY = entranceRoom.y + Math.floor(Math.random() * entranceRoom.height);

        // Place exit in exit room
        let exitX: number;
        let exitY: number;
        do {
            exitX = exitRoom.x + Math.floor(Math.random() * exitRoom.width);
            exitY = exitRoom.y + Math.floor(Math.random() * exitRoom.height);
        } while (this.grid[exitY][exitX]); // Keep trying until we find a non-wall position

        // Ensure the exit position is marked as floor
        this.grid[exitY][exitX] = false;

        return { entranceX, entranceY, exitX, exitY };
    }

    connectRooms(room1: Room, room2: Room): Point[] {
        // Get room centers
        const start: Point = {
            x: room1.x + Math.floor(room1.width / 2),
            y: room1.y + Math.floor(room1.height / 2)
        };
        const end: Point = {
            x: room2.x + Math.floor(room2.width / 2),
            y: room2.y + Math.floor(room2.height / 2)
        };

        // Initialize open and closed sets
        const openSet: AStarNode[] = [];
        const closedSet = new Set<string>();
        const nodeMap = new Map<string, AStarNode>();

        // Helper function to get key for a point
        const getKey = (point: Point): string => `${point.x},${point.y}`;

        // Helper function to get Manhattan distance
        const getManhattanDistance = (p1: Point, p2: Point): number => {
            return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
        };

        // Helper function to get cost for a tile
        const getTileCost = (x: number, y: number): number => {
            // Prefer walls (cost 1) over floor tiles (cost 3)
            return this.grid[y][x] ? 1 : 3;
        };

        // Helper function to get valid neighbors (orthogonal only)
        const getValidNeighbors = (point: Point): Point[] => {
            const neighbors: Point[] = [];
            const directions = [
                { x: 0, y: 1 },  // down
                { x: 0, y: -1 }, // up
                { x: 1, y: 0 },  // right
                { x: -1, y: 0 }  // left
            ];

            for (const dir of directions) {
                const newX = point.x + dir.x;
                const newY = point.y + dir.y;

                // Exclude border tiles (first and last row/column)
                if (newX > 0 && newX < this.config.gridSize - 1 &&
                    newY > 0 && newY < this.config.gridSize - 1) {
                    neighbors.push({ x: newX, y: newY });
                }
            }

            return neighbors;
        };

        // Create start node
        const startNode: AStarNode = {
            point: start,
            g: 0,
            h: getManhattanDistance(start, end),
            f: getManhattanDistance(start, end)
        };
        startNode.f = startNode.g + startNode.h;

        // Add start node to open set
        openSet.push(startNode);
        nodeMap.set(getKey(start), startNode);

        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loops

        // A* main loop
        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // Find node with lowest f in open set
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[currentIndex].f) {
                    currentIndex = i;
                }
            }
            const current = openSet[currentIndex];

            // Check if we reached the end
            if (current.point.x === end.x && current.point.y === end.y) {
                // Reconstruct path
                const path: Point[] = [];
                let node: AStarNode | undefined = current;
                while (node) {
                    path.unshift(node.point);
                    node = node.parent;
                }

                // Update grid with the path
                let wallCount = 0;
                for (const point of path) {
                    if (this.grid[point.y][point.x]) wallCount++;
                }
                return path;
            }

            // Move current node from open to closed set
            openSet.splice(currentIndex, 1);
            closedSet.add(getKey(current.point));

            // Check all neighbors
            const neighbors = getValidNeighbors(current.point);
            
            for (const neighbor of neighbors) {
                const neighborKey = getKey(neighbor);
                if (closedSet.has(neighborKey)) continue;

                const cost = getTileCost(neighbor.x, neighbor.y);
                const tentativeG = current.g + cost;

                let neighborNode = nodeMap.get(neighborKey);
                if (!neighborNode) {
                    // Create new node
                    neighborNode = {
                        point: neighbor,
                        g: tentativeG,
                        h: getManhattanDistance(neighbor, end),
                        f: tentativeG + getManhattanDistance(neighbor, end),
                        parent: current
                    };
                    openSet.push(neighborNode);
                    nodeMap.set(neighborKey, neighborNode);
                } else if (tentativeG < neighborNode.g) {
                    // Update existing node
                    neighborNode.g = tentativeG;
                    neighborNode.f = tentativeG + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }

        return [];
    }

    getGrid(): boolean[][] {
        return this.grid;
    }
} 