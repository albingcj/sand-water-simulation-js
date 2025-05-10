/**
 * Falling Sand Simulation
 * A physics-based particle simulation with adjustable gravity
 */

class Grid {
    constructor(width, height, parent) {
        this.width = width;
        this.height = height;
        this.grid = new Array(width * height).fill(0);
        this.parent = parent;
        this.materials = {
            EMPTY: 0,
            SAND: 1,
            WATER: 2,
            WALL: 3
        };
    }

    clear() {
        this.grid = new Array(this.width * this.height).fill(0);
    }

    set(x, y, value) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y * this.width + x] = value;
        }
    }

    get(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.grid[y * this.width + x];
        }
        return -1; // Out of bounds
    }

    swap(i1, i2) {
        if (i1 >= 0 && i1 < this.grid.length && i2 >= 0 && i2 < this.grid.length) {
            const temp = this.grid[i1];
            this.grid[i1] = this.grid[i2];
            this.grid[i2] = temp;
        }
    }

    isEmpty(index) {
        if (index < 0 || index >= this.grid.length) return false;
        return this.grid[index] === this.materials.EMPTY;
    }

    isWater(index) {
        if (index < 0 || index >= this.grid.length) return false;
        return this.grid[index] === this.materials.WATER;
    }

    inBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    setCircle(x, y, material, radius, probability = 1) {
        for (let j = -radius; j <= radius; j++) {
            for (let i = -radius; i <= radius; i++) {
                if (i * i + j * j <= radius * radius && Math.random() < probability) {
                    const newX = x + i;
                    const newY = y + j;
                    if (this.inBounds(newX, newY) && this.get(newX, newY) === this.materials.EMPTY) {
                        this.set(newX, newY, material);
                    }
                }
            }
        }
    }

    update() {
        // Process from bottom to top, right to left for falling particles
        for (let y = this.height - 1; y >= 0; y--) {
            // Alternate direction each row for more natural movement
            const rowDirection = y % 2 === 0 ? 1 : -1;

            for (let x0 = 0; x0 < this.width; x0++) {
                const x = rowDirection === 1 ? x0 : this.width - 1 - x0;
                const i = y * this.width + x;
                const material = this.grid[i];

                if (material === this.materials.SAND) {
                    this.updateSand(i, x, y);
                } else if (material === this.materials.WATER) {
                    this.updateWater(i, x, y);
                }
                // WALL doesn't move
            }
        }
    }

    updateSand(i, x, y) {
        // Get the current gravity strength from the game
        const gravity = this.parent.gravityStrength;

        // Apply gravity potentially multiple times per frame
        for (let g = 0; g < gravity; g++) {
            // Calculate the current position after previous gravity steps
            const currentY = y + g;
            const currentI = i + (g * this.width);

            // Don't update if we've reached the bottom
            if (currentY >= this.height - 1) return;

            const below = currentI + this.width;
            const belowLeft = below - 1;
            const belowRight = below + 1;

            // Standard sand behavior for this step
            let moved = false;
            if (this.isEmpty(below) || this.isWater(below)) {
                this.swap(currentI, below);
                moved = true;
            }
            else if (x > 0 && (this.isEmpty(belowLeft) || this.isWater(belowLeft))) {
                this.swap(currentI, belowLeft);
                moved = true;
            }
            else if (x < this.width - 1 && (this.isEmpty(belowRight) || this.isWater(belowRight))) {
                this.swap(currentI, belowRight);
                moved = true;
            }

            // If particle couldn't move, stop applying gravity
            if (!moved) break;
        }
    }

    updateWater(i, x, y) {
        // Get the current gravity strength from the game
        const gravity = this.parent.gravityStrength;

        // Apply gravity potentially multiple times per frame
        for (let g = 0; g < gravity; g++) {
            // Calculate the current position after previous gravity steps
            const currentY = y + g;
            const currentI = i + (g * this.width);
            const currentX = x; // X doesn't change with gravity alone

            // Don't update if we've reached the bottom
            if (currentY >= this.height - 1) return;

            const below = currentI + this.width;
            const left = currentI - 1;
            const right = currentI + 1;
            const belowLeft = below - 1;
            const belowRight = below + 1;

            let moved = false;

            // Try to move directly below
            if (this.isEmpty(below)) {
                this.swap(currentI, below);
                moved = true;
            }
            // Try to move diagonally
            else if (currentX > 0 && this.isEmpty(belowLeft)) {
                this.swap(currentI, belowLeft);
                moved = true;
            }
            else if (currentX < this.width - 1 && this.isEmpty(belowRight)) {
                this.swap(currentI, belowRight);
                moved = true;
            }
            // Try to move horizontally (if not moved vertically)
            else if (Math.random() < 0.5) {
                // Try left first
                if (currentX > 0 && this.isEmpty(left)) {
                    this.swap(currentI, left);
                    moved = true;
                }
                // Try right if left failed
                else if (currentX < this.width - 1 && this.isEmpty(right)) {
                    this.swap(currentI, right);
                    moved = true;
                }
            } else {
                // Try right first
                if (currentX < this.width - 1 && this.isEmpty(right)) {
                    this.swap(currentI, right);
                    moved = true;
                }
                // Try left if right failed
                else if (currentX > 0 && this.isEmpty(left)) {
                    this.swap(currentI, left);
                    moved = true;
                }
            }

            // If particle couldn't move, stop applying gravity
            if (!moved) break;
        }
    }
}

class SandGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game settings
        this.canvasWidth = 600;
        this.canvasHeight = 400;
        this.pixelSize = 2; // Size of each "particle"
        this.isMouseDown = false;
        this.activeMaterial = 1; // Default to sand
        this.gravityStrength = 1; // Default gravity strength

        // Material colors
        this.colors = {
            0: '#000000', // Empty (black)
            1: '#e6c88c', // Sand
            2: '#4b8ffc', // Water
            3: '#888888'  // Wall
        };

        this.setup();
        this.setupEventListeners();
        this.startGameLoop();
    }

    setup() {
        // Setup canvas
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.container.appendChild(this.canvas);

        // Setup grid - use actual pixels for simplicity
        this.grid = new Grid(
            Math.floor(this.canvasWidth / this.pixelSize),
            Math.floor(this.canvasHeight / this.pixelSize),
            this // Pass reference to parent for gravity access
        );
    }

    setupEventListeners() {
        // Mouse events for drawing particles
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.handleDraw(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isMouseDown) {
                this.handleDraw(e);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
        });

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            this.isMouseDown = true;
            this.handleDraw(e.touches[0]);
            e.preventDefault();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isMouseDown) {
                this.handleDraw(e.touches[0]);
            }
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', () => {
            this.isMouseDown = false;
        });

        // Material selection buttons
        document.querySelectorAll('.material-button').forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                document.querySelectorAll('.material-button').forEach(btn => {
                    btn.classList.remove('active');
                });

                // Add active class to clicked button
                button.classList.add('active');

                // Set active material
                const material = button.dataset.material;
                switch (material) {
                    case 'sand':
                        this.activeMaterial = this.grid.materials.SAND;
                        break;
                    case 'water':
                        this.activeMaterial = this.grid.materials.WATER;
                        break;
                    case 'wall':
                        this.activeMaterial = this.grid.materials.WALL;
                        break;
                }
            });
        });

        // Clear button
        document.getElementById('clear-button').addEventListener('click', () => {
            this.grid.clear();
        });

        // Particle size slider
        const sizeSlider = document.getElementById('particle-size');
        const sizeValue = document.getElementById('size-value');

        sizeSlider.addEventListener('input', () => {
            // Get new size
            const newSize = parseInt(sizeSlider.value);
            sizeValue.textContent = newSize;

            // Update pixel size
            this.pixelSize = newSize;

            // Adjust gravity based on particle size
            // Smaller particles need higher gravity values
            this.gravityStrength = Math.max(1, Math.floor(3 / this.pixelSize));
            document.getElementById('gravity-strength').value = this.gravityStrength;
            document.getElementById('gravity-value').textContent = this.gravityStrength;

            // Rebuild grid with new resolution
            const newWidth = Math.floor(this.canvasWidth / this.pixelSize);
            const newHeight = Math.floor(this.canvasHeight / this.pixelSize);

            // Create new grid with adjusted size
            this.grid = new Grid(newWidth, newHeight, this);
        });

        // Gravity strength slider
        const gravitySlider = document.getElementById('gravity-strength');
        const gravityValue = document.getElementById('gravity-value');

        gravitySlider.addEventListener('input', () => {
            this.gravityStrength = parseInt(gravitySlider.value);
            gravityValue.textContent = this.gravityStrength;
        });
    }

    handleDraw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX / this.pixelSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / this.pixelSize);

        // Draw a circle of particles
        const radius = Math.max(2, Math.floor(3 * (2 / this.pixelSize)));
        const probability = this.activeMaterial === this.grid.materials.WALL ? 1 : 0.7;
        this.grid.setCircle(x, y, this.activeMaterial, radius, probability);
    }

    update() {
        this.grid.update();
    }

    render() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const value = this.grid.get(x, y);
                if (value !== 0) { // If not empty
                    const color = this.colors[value];

                    // Add slight variation to make it look more natural
                    if (value === this.grid.materials.SAND) {
                        this.ctx.fillStyle = this.varyColor(color, 15, 10);
                    } else if (value === this.grid.materials.WATER) {
                        this.ctx.fillStyle = this.varyColor(color, 5, 10);
                    } else {
                        this.ctx.fillStyle = color;
                    }

                    this.ctx.fillRect(
                        x * this.pixelSize,
                        y * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
    }

    varyColor(baseColor, satVar = 10, lightVar = 5) {
        // Simple color variation for natural look
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);

        // Add slight random variations
        const rVar = r + Math.floor(Math.random() * satVar - satVar / 2);
        const gVar = g + Math.floor(Math.random() * satVar - satVar / 2);
        const bVar = b + Math.floor(Math.random() * lightVar - lightVar / 2);

        // Ensure values stay in valid range
        const rFinal = Math.min(255, Math.max(0, rVar));
        const gFinal = Math.min(255, Math.max(0, gVar));
        const bFinal = Math.min(255, Math.max(0, bVar));

        return `rgb(${rFinal}, ${gFinal}, ${bFinal})`;
    }

    startGameLoop() {
        const gameLoop = () => {
            this.update();
            this.render();
            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }
}

// console.log('Sand Game script loaded');

window.addEventListener('load', () => {
    console.log('Window loaded, initializing game');
    // document.getElementById('game-container').innerHTML = 'Initializing game...';
    try {
        new SandGame();
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('game-container').innerHTML = 'Error loading game: ' + error.message;
    }
});
