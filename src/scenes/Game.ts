import { Scene } from 'phaser';
import { LevelGenerator } from './LevelGenerator';

export class Game extends Scene {
    private grid: boolean[][] = [];
    private readonly GRID_SIZE = 50;
    private readonly CELL_SIZE = 32;
    private player!: Phaser.GameObjects.Arc;
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

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        // Generate level using LevelGenerator with configuration
        const levelGenerator = new LevelGenerator({
            gridSize: this.GRID_SIZE,
            minRoomSize: 3,
            maxRoomSize: 9,
            maxSplits: 5,
            roomPadding: 2,
            splitRandomness: 0.3
        });
        const levelData = levelGenerator.generateLevel();
        this.grid = levelData.grid;
        this.exitX = levelData.exitX;
        this.exitY = levelData.exitY;

        // Create a container for the grid
        this.gridContainer = this.add.container(0, 0);

        // Create graphics for the grid
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xFFFFFF);
        
        // Draw the grid
        const gridWidth = this.GRID_SIZE * this.CELL_SIZE;
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x]) {
                    // Check if this wall has any empty neighbors (including diagonals)
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
                        const baseX = x * this.CELL_SIZE;
                        const baseY = y * this.CELL_SIZE;
                        
                        // Draw jagged lines for each wall tile
                        graphics.beginPath();
                        graphics.moveTo(baseX + Math.random() * 4, baseY + Math.random() * 4);
                        
                        // Top edge
                        for (let i = 0; i < 4; i++) {
                            const nextX = baseX + (i + 1) * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
                            const nextY = baseY + (Math.random() * 4 - 2);
                            graphics.lineTo(nextX, nextY);
                        }
                        
                        // Right edge
                        for (let i = 0; i < 4; i++) {
                            const nextX = baseX + this.CELL_SIZE + (Math.random() * 4 - 2);
                            const nextY = baseY + (i + 1) * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
                            graphics.lineTo(nextX, nextY);
                        }
                        
                        // Bottom edge
                        for (let i = 3; i >= 0; i--) {
                            const nextX = baseX + i * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
                            const nextY = baseY + this.CELL_SIZE + (Math.random() * 4 - 2);
                            graphics.lineTo(nextX, nextY);
                        }
                        
                        // Left edge
                        for (let i = 3; i >= 0; i--) {
                            const nextX = baseX + (Math.random() * 4 - 2);
                            const nextY = baseY + i * (this.CELL_SIZE / 4) + (Math.random() * 4 - 2);
                            graphics.lineTo(nextX, nextY);
                        }
                        
                        graphics.closePath();
                        graphics.stroke();
                    }
                }
            }
        }

        this.gridContainer.add(graphics);

        // Create entrance marker (red)
        const entranceMarker = this.add.rectangle(
            levelData.entranceX * this.CELL_SIZE + this.CELL_SIZE / 2,
            levelData.entranceY * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE * 0.8,
            this.CELL_SIZE * 0.8,
            0xff0000
        );
        this.gridContainer.add(entranceMarker);

        // Create exit marker (green)
        const exitMarker = this.add.rectangle(
            levelData.exitX * this.CELL_SIZE + this.CELL_SIZE / 2,
            levelData.exitY * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE * 0.8,
            this.CELL_SIZE * 0.8,
            0x00ff00
        );
        this.gridContainer.add(exitMarker);

        // Create player at the entrance position
        const playerX = levelData.entranceX * this.CELL_SIZE + this.CELL_SIZE / 2;
        const playerY = levelData.entranceY * this.CELL_SIZE + this.CELL_SIZE / 2;
        this.player = this.add.circle(playerX, playerY, this.PLAYER_SIZE / 2, 0xff0000);

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
        this.levelText.setScrollFactor(0); // Fix to camera

        // Setup mouse input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isMoving = true;
            this.updateTargetPosition(pointer);
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isMoving) {
                this.updateTargetPosition(pointer);
            }
        });

        this.input.on('pointerup', () => {
            this.isMoving = false;
        });
    }

    private updateTargetPosition(pointer: Phaser.Input.Pointer) {
        // Convert screen coordinates to world coordinates
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = worldPoint.x;
        this.targetY = worldPoint.y;
    }

    private checkCircleCollision(centerX: number, centerY: number): boolean {
        const radius = this.PLAYER_SIZE / 2;

        // Check a box of cells around the circle's center
        const startGridX = Math.floor(centerX / this.CELL_SIZE);
        const endGridX = Math.ceil((centerX + radius) / this.CELL_SIZE);
        const startGridY = Math.floor(centerY / this.CELL_SIZE);
        const endGridY = Math.ceil((centerY + radius) / this.CELL_SIZE);

        for (let gridY = startGridY; gridY <= endGridY; gridY++) {
            for (let gridX = startGridX; gridX <= endGridX; gridX++) {
                if (gridX < 0 || gridX >= this.GRID_SIZE || gridY < 0 || gridY >= this.GRID_SIZE) {
                    continue;
                }
                
                if (this.grid[gridY][gridX]) {
                    // Calculate the closest point of the cell to the circle
                    const cellX = gridX * this.CELL_SIZE;
                    const cellY = gridY * this.CELL_SIZE;
                    
                    const closestX = Math.max(cellX, Math.min(centerX, cellX + this.CELL_SIZE));
                    const closestY = Math.max(cellY, Math.min(centerY, cellY + this.CELL_SIZE));
                    
                    // Check if this closest point is within the circle's radius
                    const distanceX = centerX - closestX;
                    const distanceY = centerY - closestY;
                    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
                    
                    if (distanceSquared < radius * radius) {
                        return true; // Collision detected
                    }
                }
            }
        }
        
        return false;
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
        if (!this.isMoving) return;

        // Calculate direction to target
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.targetX, this.targetY);
        
        // Calculate potential new position
        const speed = (this.PLAYER_SPEED * delta) / 1000;
        const newX = this.player.x + Math.cos(angle) * speed;
        const newY = this.player.y + Math.sin(angle) * speed;

        // Check for collision at new position
        if (!this.checkCircleCollision(newX, newY)) {
            this.player.setPosition(newX, newY);
        }

        // Check if player reached the exit
        if (this.checkExitReached()) {
            this.nextLevel();
        }
    }
} 