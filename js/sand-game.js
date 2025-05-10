/**
 * Enhanced Falling Sand Simulation
 * A physics-based particle simulation with multiple materials and interactions
 */

class Grid {
    constructor(width, height, parent) {
        this.width = width;
        this.height = height;
        this.grid = new Array(width * height).fill(0);
        this.parent = parent;
        
        // Material types
        this.materials = {
            EMPTY: 0,
            SAND: 1,
            WATER: 2,
            WALL: 3,
            FIRE: 4,
            OIL: 5,
            PLANT: 6,
            ACID: 7,
            ICE: 8,
            STEAM: 9
        };
        
        // Material properties
        this.properties = {
            [this.materials.EMPTY]: { density: 0, flammable: false, lifespan: 0 },
            [this.materials.SAND]: { density: 3, flammable: false, lifespan: 0 },
            [this.materials.WATER]: { density: 2, flammable: false, lifespan: 0 },
            [this.materials.WALL]: { density: 10, flammable: false, lifespan: 0 },
            [this.materials.FIRE]: { density: 0.5, flammable: false, lifespan: 100 },
            [this.materials.OIL]: { density: 1.5, flammable: true, lifespan: 0 },
            [this.materials.PLANT]: { density: 1, flammable: true, lifespan: 0, growthRate: 0.01 },
            [this.materials.ACID]: { density: 2.2, flammable: false, lifespan: 500, dissolveRate: 0.2 },
            [this.materials.ICE]: { density: 1.8, flammable: false, lifespan: 0, meltRate: 0.01 },
            [this.materials.STEAM]: { density: 0.3, flammable: false, lifespan: 200 }
        };
        
        // Particle metadata (for lifespan, temperature, etc.)
        this.metadata = new Array(width * height).fill(null).map(() => ({
            life: 0,
            temp: 20 // room temperature in celsius
        }));
    }

    clear() {
        this.grid = new Array(this.width * this.height).fill(0);
        this.metadata = new Array(this.width * this.height).fill(null).map(() => ({
            life: 0,
            temp: 20
        }));
    }

    set(x, y, value) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            const index = y * this.width + x;
            this.grid[index] = value;
            
            // Initialize metadata based on material type
            if (value === this.materials.FIRE) {
                this.metadata[index].temp = 400; // fire is hot
                this.metadata[index].life = this.properties[value].lifespan;
            } else if (value === this.materials.ACID) {
                this.metadata[index].life = this.properties[value].lifespan;
            } else if (value === this.materials.STEAM) {
                this.metadata[index].temp = 110; // steam is hot
                this.metadata[index].life = this.properties[value].lifespan;
            }
        }
    }

    get(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.grid[y * this.width + x];
        }
        return -1; // Out of bounds
    }

    // Get metadata for a specific position
    getMeta(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.metadata[y * this.width + x];
        }
        return null; // Out of bounds
    }

    swap(i1, i2) {
        if (i1 >= 0 && i1 < this.grid.length && i2 >= 0 && i2 < this.grid.length) {
            // Swap grid values
            const temp = this.grid[i1];
            this.grid[i1] = this.grid[i2];
            this.grid[i2] = temp;
            
            // Swap metadata too
            const tempMeta = this.metadata[i1];
            this.metadata[i1] = this.metadata[i2];
            this.metadata[i2] = tempMeta;
        }
    }

    isEmpty(index) {
        if (index < 0 || index >= this.grid.length) return false;
        return this.grid[index] === this.materials.EMPTY;
    }

    isType(index, type) {
        if (index < 0 || index >= this.grid.length) return false;
        return this.grid[index] === type;
    }

    inBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    canDisplace(i1, i2) {
        if (!this.inBounds(i1 % this.width, Math.floor(i1 / this.width)) || 
            !this.inBounds(i2 % this.width, Math.floor(i2 / this.width))) {
            return false;
        }
        
        // Empty space can always be replaced
        if (this.grid[i2] === this.materials.EMPTY) return true;
        
        // Wall can't be displaced
        if (this.grid[i2] === this.materials.WALL) return false;
        
        // Higher density materials sink in lower density ones
        const density1 = this.properties[this.grid[i1]].density;
        const density2 = this.properties[this.grid[i2]].density;
        return density1 > density2;
    }

    // Advanced method to set shapes
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

    drawLine(x1, y1, x2, y2, material, thickness = 1) {
        // Bresenham's line algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        while (true) {
            // Draw a circle at each point for thickness
            this.setCircle(x1, y1, material, thickness);
            
            if (x1 === x2 && y1 === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x1 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y1 += sy;
            }
        }
    }

    drawRect(x1, y1, x2, y2, material, filled = false) {
        // Sort coordinates
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        
        if (filled) {
            // Fill the rectangle
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    if (this.inBounds(x, y) && this.get(x, y) === this.materials.EMPTY) {
                        this.set(x, y, material);
                    }
                }
            }
        } else {
            // Draw only the border
            for (let x = startX; x <= endX; x++) {
                if (this.inBounds(x, startY)) this.set(x, startY, material);
                if (this.inBounds(x, endY)) this.set(x, endY, material);
            }
            for (let y = startY + 1; y < endY; y++) {
                if (this.inBounds(startX, y)) this.set(startX, y, material);
                if (this.inBounds(endX, y)) this.set(endX, y, material);
            }
        }
    }

    update() {
        // Process different materials with different passes
        
        // First pass: Bottom to top for falling materials (sand, water, etc)
        for (let y = this.height - 1; y >= 0; y--) {
            // Alternate direction each row for more natural movement
            const rowDirection = y % 2 === 0 ? 1 : -1;
            
            for (let x0 = 0; x0 < this.width; x0++) {
                const x = rowDirection === 1 ? x0 : this.width - 1 - x0;
                const i = y * this.width + x;
                const material = this.grid[i];
                
                switch (material) {
                    case this.materials.SAND:
                        this.updateSand(i, x, y);
                        break;
                    case this.materials.WATER:
                        this.updateWater(i, x, y);
                        break;
                    case this.materials.OIL:
                        this.updateOil(i, x, y);
                        break;
                    case this.materials.ACID:
                        this.updateAcid(i, x, y);
                        break;
                    case this.materials.ICE:
                        this.updateIce(i, x, y);
                        break;
                }
            }
        }
        
        // Second pass: Top to bottom for rising materials (fire, steam, etc)
        for (let y = 0; y < this.height; y++) {
            const rowDirection = y % 2 === 0 ? 1 : -1;
            
            for (let x0 = 0; x0 < this.width; x0++) {
                const x = rowDirection === 1 ? x0 : this.width - 1 - x0;
                const i = y * this.width + x;
                const material = this.grid[i];
                
                switch (material) {
                    case this.materials.FIRE:
                        this.updateFire(i, x, y);
                        break;
                    case this.materials.STEAM:
                        this.updateSteam(i, x, y);
                        break;
                    case this.materials.PLANT:
                        this.updatePlant(i, x, y);
                        break;
                }
            }
        }
        
        // Third pass: Temperature transfer and other effects
        for (let i = 0; i < this.grid.length; i++) {
            this.updateTemperature(i);
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
            if (this.canDisplace(currentI, below)) {
                this.swap(currentI, below);
                moved = true;
            } 
            else if (x > 0 && this.canDisplace(currentI, belowLeft)) {
                this.swap(currentI, belowLeft);
                moved = true;
            }
            else if (x < this.width - 1 && this.canDisplace(currentI, belowRight)) {
                this.swap(currentI, belowRight);
                moved = true;
            }
            
            // If particle couldn't move, stop applying gravity
            if (!moved) break;
        }
    }

    updateWater(i, x, y) {
        // Get the current gravity strength
        const gravity = this.parent.gravityStrength;
        
        // Apply gravity 
        for (let g = 0; g < gravity; g++) {
            const currentY = y + g;
            const currentI = i + (g * this.width);
            const currentX = x; // X doesn't change with gravity alone
            
            if (currentY >= this.height - 1) return;
            
            const below = currentI + this.width;
            const left = currentI - 1;
            const right = currentI + 1;
            const belowLeft = below - 1;
            const belowRight = below + 1;
            
            let moved = false;
            
            // Try to move directly below
            if (this.canDisplace(currentI, below)) {
                this.swap(currentI, below);
                moved = true;
            }
            // Try to move diagonally
            else if (currentX > 0 && this.canDisplace(currentI, belowLeft)) {
                this.swap(currentI, belowLeft);
                moved = true;
            }
            else if (currentX < this.width - 1 && this.canDisplace(currentI, belowRight)) {
                this.swap(currentI, belowRight);
                moved = true;
            }
            // Try to move horizontally (if not moved vertically)
            else if (Math.random() < 0.5) {
                // Try left first
                if (currentX > 0 && this.canDisplace(currentI, left)) {
                    this.swap(currentI, left);
                    moved = true;
                }
                // Try right if left failed
                else if (currentX < this.width - 1 && this.canDisplace(currentI, right)) {
                    this.swap(currentI, right);
                    moved = true;
                }
            } else {
                // Try right first
                if (currentX < this.width - 1 && this.canDisplace(currentI, right)) {
                    this.swap(currentI, right);
                    moved = true;
                }
                // Try left if right failed
                else if (currentX > 0 && this.canDisplace(currentI, left)) {
                    this.swap(currentI, left);
                    moved = true;
                }
            }
            
            // Water has chance to evaporate if hot
            if (this.metadata[currentI].temp > 99) {
                if (Math.random() < 0.1) {
                    this.grid[currentI] = this.materials.STEAM;
                    this.metadata[currentI].life = this.properties[this.materials.STEAM].lifespan;
                    this.metadata[currentI].temp = 110;
                }
            }
            
            // Water freezes if cold
            if (this.metadata[currentI].temp < 0) {
                if (Math.random() < 0.05) {
                    this.grid[currentI] = this.materials.ICE;
                }
            }
            
            // Water can extinguish fire
            this.extinguishNearbySources(currentI, currentX, currentY);
            
            // If particle couldn't move, stop applying gravity
            if (!moved) break;
        }
    }
    
    updateOil(i, x, y) {
        // Oil behaves like water but with different density
        // Similar to water but slower and more viscous
        const gravity = Math.max(1, this.parent.gravityStrength - 1);
        
        for (let g = 0; g < gravity; g++) {
            const currentY = y + g;
            const currentI = i + (g * this.width);
            const currentX = x;
            
            if (currentY >= this.height - 1) return;
            
            const below = currentI + this.width;
            const left = currentI - 1;
            const right = currentI + 1;
            const belowLeft = below - 1;
            const belowRight = below + 1;
            
            let moved = false;
            
            // Movement logic similar to water
            if (this.canDisplace(currentI, below)) {
                this.swap(currentI, below);
                moved = true;
            }
            else if (Math.random() < 0.3 && currentX > 0 && this.canDisplace(currentI, belowLeft)) {
                this.swap(currentI, belowLeft);
                moved = true;
            }
            else if (Math.random() < 0.3 && currentX < this.width - 1 && this.canDisplace(currentI, belowRight)) {
                this.swap(currentI, belowRight);
                moved = true;
            }
            else if (Math.random() < 0.3) {
                if (Math.random() < 0.5 && currentX > 0 && this.canDisplace(currentI, left)) {
                    this.swap(currentI, left);
                    moved = true;
                }
                else if (currentX < this.width - 1 && this.canDisplace(currentI, right)) {
                    this.swap(currentI, right);
                    moved = true;
                }
            }
            
            // Oil has chance to ignite if hot or near fire
            if (this.metadata[currentI].temp > 220 || this.isNearMaterial(currentX, currentY, this.materials.FIRE)) {
                if (Math.random() < 0.2) {
                    this.grid[currentI] = this.materials.FIRE;
                    this.metadata[currentI].life = this.properties[this.materials.FIRE].lifespan;
                    this.metadata[currentI].temp = 400;
                }
            }
            
            if (!moved) break;
        }
    }
    
    updateFire(i, x, y) {
        // Fire rises up and has limited lifespan
        const meta = this.metadata[i];
        meta.life--;
        
        // Fire disappears when its life is over
        if (meta.life <= 0) {
            this.grid[i] = this.materials.EMPTY;
            meta.temp = 20;
            return;
        }
        
        // Fire tries to rise
        const above = i - this.width;
        const aboveLeft = above - 1;
        const aboveRight = above + 1;
        
        // Try to move upward
        let moved = false;
        if (y > 0 && this.isEmpty(above)) {
            this.swap(i, above);
            moved = true;
        }
        else if (y > 0 && x > 0 && this.isEmpty(aboveLeft)) {
            this.swap(i, aboveLeft);
            moved = true;
        }
        else if (y > 0 && x < this.width - 1 && this.isEmpty(aboveRight)) {
            this.swap(i, aboveRight);
            moved = true;
        }
        
        // Fire heats nearby materials and can ignite flammable ones
        this.heatAndIgniteNearbySources(i, x, y);
        
        // Create some smoke/steam occasionally
        if (Math.random() < 0.05 && y > 0 && this.isEmpty(above)) {
            this.grid[above] = this.materials.STEAM;
            this.metadata[above].life = this.properties[this.materials.STEAM].lifespan;
        }
        
        // Fire flickers and varies in intensity - adjust temperature
        meta.temp = 350 + Math.floor(Math.random() * 100);
    }
    
    updateSteam(i, x, y) {
        // Steam rises and has limited lifespan
        const meta = this.metadata[i];
        meta.life--;
        
        // Steam disappears when its life is over or condenses back to water if cool
        if (meta.life <= 0 || meta.temp < 90) {
            if (meta.temp < 90 && Math.random() < 0.2) {
                this.grid[i] = this.materials.WATER;
            } else {
                this.grid[i] = this.materials.EMPTY;
            }
            meta.temp = 20;
            return;
        }
        
        // Steam rises
        const above = i - this.width;
        const left = i - 1;
        const right = i + 1;
        const aboveLeft = above - 1;
        const aboveRight = above + 1;
        
        let moved = false;
        // Try to move upward
        if (y > 0 && this.isEmpty(above)) {
            this.swap(i, above);
            moved = true;
        }
        else if (y > 0 && x > 0 && this.isEmpty(aboveLeft)) {
            this.swap(i, aboveLeft);
            moved = true;
        }
        else if (y > 0 && x < this.width - 1 && this.isEmpty(aboveRight)) {
            this.swap(i, aboveRight);
            moved = true;
        }
        // Try moving sideways if can't move up
        else if (!moved) {
            if (Math.random() < 0.5 && x > 0 && this.isEmpty(left)) {
                this.swap(i, left);
                moved = true;
            }
            else if (x < this.width - 1 && this.isEmpty(right)) {
                this.swap(i, right);
                moved = true;
            }
        }
        
        // Steam gradually cools
        meta.temp -= 0.2;
    }
    
    updateAcid(i, x, y) {
        // Acid behaves like water but dissolves materials
        const gravity = this.parent.gravityStrength;
        const meta = this.metadata[i];
        meta.life--;
        
        // Acid disappears over time
        if (meta.life <= 0) {
            this.grid[i] = this.materials.EMPTY;
            return;
        }
        
        // Dissolve nearby materials
        this.dissolveNearbySources(i, x, y);
        
        // Update movement like water
        for (let g = 0; g < gravity; g++) {
            const currentY = y + g;
            const currentI = i + (g * this.width);
            const currentX = x;
            
            if (currentY >= this.height - 1) return;
            
            const below = currentI + this.width;
            const left = currentI - 1;
            const right = currentI + 1;
            const belowLeft = below - 1;
            const belowRight = below + 1;
            
            let moved = false;
            
            if (this.canDisplace(currentI, below)) {
                this.swap(currentI, below);
                moved = true;
            }
            else if (currentX > 0 && this.canDisplace(currentI, belowLeft)) {
                this.swap(currentI, belowLeft);
                moved = true;
            }
            else if (currentX < this.width - 1 && this.canDisplace(currentI, belowRight)) {
                this.swap(currentI, belowRight);
                moved = true;
            }
            else if (Math.random() < 0.7) {
                if (Math.random() < 0.5 && currentX > 0 && this.canDisplace(currentI, left)) {
                    this.swap(currentI, left);
                    moved = true;
                }
                else if (currentX < this.width - 1 && this.canDisplace(currentI, right)) {
                    this.swap(currentI, right);
                    moved = true;
                }
            }
            
            if (!moved) break;
        }
    }
    
    updateIce(i, x, y) {
        // Ice is static but can melt
        const meta = this.metadata[i];
        
        // Ice melts if temperature is above 0
        if (meta.temp > 0) {
            // Chance to melt increases with temperature
            const meltChance = this.properties[this.materials.ICE].meltRate * meta.temp;
            if (Math.random() < meltChance) {
                this.grid[i] = this.materials.WATER;
                meta.temp = 2; // Cold water
            }
        }
        
        // Ice has a small chance to freeze nearby water
        if (Math.random() < 0.02) {
            this.freezeNearbySources(i, x, y);
        }
    }
    
    updatePlant(i, x, y) {
        // Plants are static but can grow, burn, or be eaten by acid
        
        // Plants can grow if next to water
        if (this.isNearMaterial(x, y, this.materials.WATER) && Math.random() < this.properties[this.materials.PLANT].growthRate) {
            this.growPlant(x, y);
        }
        
        // Plants can catch fire if hot or near fire
        if (this.metadata[i].temp > 150 || this.isNearMaterial(x, y, this.materials.FIRE)) {
            if (Math.random() < 0.1) {
                this.grid[i] = this.materials.FIRE;
                this.metadata[i].life = this.properties[this.materials.FIRE].lifespan;
                this.metadata[i].temp = 400;
            }
        }
    }
    
    updateTemperature(i) {
        if (i < 0 || i >= this.grid.length || this.grid[i] === this.materials.EMPTY) return;
        
        const x = i % this.width;
        const y = Math.floor(i / this.width);
        const meta = this.metadata[i];
        
        // Heat transfer to adjacent cells
        const neighbors = this.getNeighborIndices(x, y);
        for (const neighborIdx of neighbors) {
            if (neighborIdx >= 0 && neighborIdx < this.grid.length && this.grid[neighborIdx] !== this.materials.EMPTY) {
                const neighborTemp = this.metadata[neighborIdx].temp;
                // Heat flows from hot to cold
                if (meta.temp !== neighborTemp) {
                    const transferAmount = (meta.temp - neighborTemp) * 0.1;
                    this.metadata[i].temp -= transferAmount * 0.5;
                    this.metadata[neighborIdx].temp += transferAmount * 0.5;
                }
            }
        }
        
        // Temperature tends toward ambient (20°C) very slowly
        if (meta.temp !== 20) {
            meta.temp += (20 - meta.temp) * 0.001;
        }
    }
    
    // Helper methods for material interactions
    
    isNearMaterial(x, y, materialType) {
        const neighbors = this.getNeighborIndices(x, y);
        for (const neighborIdx of neighbors) {
            if (neighborIdx >= 0 && neighborIdx < this.grid.length && this.grid[neighborIdx] === materialType) {
                return true;
            }
        }
        return false;
    }
    
    getNeighborIndices(x, y) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (this.inBounds(nx, ny)) {
                    neighbors.push(ny * this.width + nx);
                }
            }
        }
        return neighbors;
    }
    
    heatAndIgniteNearbySources(i, x, y) {
        const neighbors = this.getNeighborIndices(x, y);
        
        for (const neighborIdx of neighbors) {
            if (neighborIdx >= 0 && neighborIdx < this.grid.length && this.grid[neighborIdx] !== this.materials.EMPTY) {
                // Heat up nearby materials
                this.metadata[neighborIdx].temp += 5;
                
                // Chance to ignite flammable materials
                const material = this.grid[neighborIdx];
                if (this.properties[material].flammable) {
                    if (Math.random() < 0.1) {
                        this.grid[neighborIdx] = this.materials.FIRE;
                        this.metadata[neighborIdx].life = this.properties[this.materials.FIRE].lifespan;
                        this.metadata[neighborIdx].temp = 400;
                    }
                }
            }
        }
    }
    
    extinguishNearbySources(i, x, y) {
        const neighbors = this.getNeighborIndices(x, y);
        
        for (const neighborIdx of neighbors) {
            if (neighborIdx >= 0 && neighborIdx < this.grid.length && this.grid[neighborIdx] === this.materials.FIRE) {
                // Water has a chance to extinguish fire
                if (Math.random() < 0.4) {
                    this.grid[neighborIdx] = this.materials.STEAM;
                    this.metadata[neighborIdx].life = this.properties[this.materials.STEAM].lifespan;
                    this.metadata[neighborIdx].temp = 110;
                }
            }
        }
    }
    
    dissolveNearbySources(i, x, y) {
        const neighbors = this.getNeighborIndices(x, y);
        
        for (const neighborIdx of neighbors) {
            if (neighborIdx >= 0 && neighborIdx < this.grid.length) {
                const material = this.grid[neighborIdx];
                
                // Acid dissolves most materials except itself
                if (material !== this.materials.EMPTY && 
                    material !== this.materials.ACID && 
                    material !== this.materials.STEAM) {
                    
                    if (Math.random() < this.properties[this.materials.ACID].dissolveRate) {
                        // Different materials have different resistance to acid
                        let resistFactor = 1.0;
                        
                        if (material === this.materials.WALL) resistFactor = 0.1;
                        else if (material === this.materials.SAND) resistFactor = 0.5;
                        
                        if (Math.random() < this.properties[this.materials.ACID].dissolveRate * resistFactor) {
                            this.grid[neighborIdx] = this.materials.EMPTY;
                        }
                    }
                }
            }
        }
    }
    
    freezeNearbySources(i, x, y) {
        const neighbors = this.getNeighborIndices(x, y);
        
        for (const neighborIdx of neighbors) {
            if (neighborIdx >= 0 && neighborIdx < this.grid.length && this.grid[neighborIdx] === this.materials.WATER) {
                // Ice can freeze nearby water
                this.metadata[neighborIdx].temp -= 1;
                
                if (this.metadata[neighborIdx].temp < 0 && Math.random() < 0.1) {
                    this.grid[neighborIdx] = this.materials.ICE;
                }
            }
        }
    }
    
    growPlant(x, y) {
        // Try to grow plant in empty neighboring cells
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (this.inBounds(nx, ny) && this.get(nx, ny) === this.materials.EMPTY) {
                    neighbors.push({x: nx, y: ny});
                }
            }
        }
        
        // Randomly select one empty neighbor to grow into
        if (neighbors.length > 0) {
            const target = neighbors[Math.floor(Math.random() * neighbors.length)];
            this.set(target.x, target.y, this.materials.PLANT);
        }
    }

    // Shape tools and presets
    
    createPreset(preset, x, y) {
        const material = this.materials.WALL;
        
        switch (preset) {
            case 'barrier':
                this.drawRect(x - 20, y - 3, x + 20, y + 3, material, true);
                break;
                
            case 'funnel':
                this.drawLine(x - 15, y - 15, x, y + 5, material, 1);
                this.drawLine(x + 15, y - 15, x, y + 5, material, 1);
                break;
                
            case 'container':
                this.drawRect(x - 20, y - 20, x + 20, y + 20, material, false);
                // Add a small opening at the top
                this.drawLine(x - 5, y - 20, x + 5, y - 20, this.materials.EMPTY, 1);
                break;
                
            case 'hourglass':
                // Top container
                this.drawRect(x - 15, y - 25, x + 15, y - 10, material, false);
                // Bottom container
                this.drawRect(x - 15, y + 10, x + 15, y + 25, material, false);
                // Funnel connecting them
                this.drawLine(x - 10, y - 10, x, y, material, 1);
                this.drawLine(x + 10, y - 10, x, y, material, 1);
                this.drawLine(x - 10, y + 10, x, y, material, 1);
                this.drawLine(x + 10, y + 10, x, y, material, 1);
                // Add some sand in the top half
                for (let cy = y - 24; cy < y - 12; cy++) {
                    for (let cx = x - 14; cx < x + 14; cx++) {
                        if (this.inBounds(cx, cy) && Math.random() < 0.7) {
                            this.set(cx, cy, this.materials.SAND);
                        }
                    }
                }
                break;
                
            case 'maze':
                // Create a simple maze pattern
                const size = 40;
                const halfSize = size / 2;
                
                // Outer walls
                this.drawRect(x - halfSize, y - halfSize, x + halfSize, y + halfSize, material, false);
                
                // Horizontal dividers
                for (let i = 1; i < 3; i++) {
                    const yPos = y - halfSize + (size / 3) * i;
                    const gap = 10;
                    const gapPos = x - halfSize + gap + Math.floor(Math.random() * (size - 2 * gap));
                    
                    // Draw line with a gap
                    this.drawLine(x - halfSize, yPos, gapPos, yPos, material, 1);
                    this.drawLine(gapPos + 10, yPos, x + halfSize, yPos, material, 1);
                }
                
                // Vertical dividers
                for (let i = 1; i < 3; i++) {
                    const xPos = x - halfSize + (size / 3) * i;
                    const gap = 10;
                    const gapPos = y - halfSize + gap + Math.floor(Math.random() * (size - 2 * gap));
                    
                    // Draw line with a gap
                    this.drawLine(xPos, y - halfSize, xPos, gapPos, material, 1);
                    this.drawLine(xPos, gapPos + 10, xPos, y + halfSize, material, 1);
                }
                break;
        }
    }
}

class SandGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game settings
        this.canvasWidth = 800;
        this.canvasHeight = 450;
        this.pixelSize = 2; // Size of each "particle"
        this.isMouseDown = false;
        this.isRightMouseDown = false;
        this.lastMouseX = -1;
        this.lastMouseY = -1;
        this.activeMaterial = 1; // Default to sand
        this.gravityStrength = 1; // Default gravity strength
        this.brushSize = 3; // Default brush size
        this.simSpeed = 1; // Default simulation speed
        this.isPaused = false;
        
        // Drawing tools
        this.currentTool = 'brush'; // brush, line, rect, circle
        this.drawingStart = null; // For shapes that need start/end points
        
        // Material colors - in a more sophisticated palette
        this.colors = {
            0: '#000000', // Empty (black)
            1: '#e6c88c', // Sand (tan)
            2: '#4b8ffc', // Water (blue)
            3: '#888888', // Wall (gray)
            4: '#ff4a00', // Fire (orange-red)
            5: '#6b5918', // Oil (dark amber)
            6: '#3a9e37', // Plant (green)
            7: '#97fc5c', // Acid (bright green)
            8: '#b0f5fc', // Ice (light blue)
            9: '#d0d0d0'  // Steam (light gray)
        };
        
        this.materialNames = {
            'sand': 1,
            'water': 2,
            'wall': 3,
            'fire': 4,
            'oil': 5,
            'plant': 6,
            'acid': 7,
            'ice': 8,
            'steam': 9,
            'eraser': 0
        };
        
        this.setup();
        this.setupEventListeners();
        this.startGameLoop();
    }
    
    setup() {
        // Setup canvas with explicit styles
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // Clear any existing content and append canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);
        
        // Setup grid - use actual pixels for simulation
        this.grid = new Grid(
            Math.floor(this.canvasWidth / this.pixelSize),
            Math.floor(this.canvasHeight / this.pixelSize),
            this // Pass reference to parent for access to settings
        );
    }
    
    setupEventListeners() {
        // Mouse events for drawing particles
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.isMouseDown = true;
                this.handleDrawStart(e);
            } else if (e.button === 2) { // Right click
                this.isRightMouseDown = true;
                // Default right click is eraser
                const activeMaterialBackup = this.activeMaterial;
                this.activeMaterial = this.grid.materials.EMPTY;
                this.handleDraw(e);
                this.activeMaterial = activeMaterialBackup;
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isMouseDown) {
                this.handleDraw(e);
            } else if (this.isRightMouseDown) {
                const activeMaterialBackup = this.activeMaterial;
                this.activeMaterial = this.grid.materials.EMPTY;
                this.handleDraw(e);
                this.activeMaterial = activeMaterialBackup;
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Left click
                this.isMouseDown = false;
                this.handleDrawEnd(e);
            } else if (e.button === 2) { // Right click
                this.isRightMouseDown = false;
            }
            this.lastMouseX = -1;
            this.lastMouseY = -1;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
            this.isRightMouseDown = false;
            this.lastMouseX = -1;
            this.lastMouseY = -1;
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            this.isMouseDown = true;
            this.handleDrawStart(e.touches[0]);
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isMouseDown) {
                this.handleDraw(e.touches[0]);
            }
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.handleDrawEnd();
            this.isMouseDown = false;
            this.lastMouseX = -1;
            this.lastMouseY = -1;
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
                this.activeMaterial = this.materialNames[material] || 0;
            });
        });
        
        // Tool selection buttons
        document.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                document.querySelectorAll('.tool-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Set active tool
                this.currentTool = button.dataset.tool;
            });
        });
        
        // Preset buttons
        document.querySelectorAll('.preset-button').forEach(button => {
            button.addEventListener('click', () => {
                const preset = button.dataset.preset;
                
                // Place preset in the center of the screen
                const centerX = Math.floor(this.grid.width / 2);
                const centerY = Math.floor(this.grid.height / 2);
                
                this.grid.createPreset(preset, centerX, centerY);
            });
        });
        
        // Clear button
        document.getElementById('clear-button').addEventListener('click', () => {
            this.grid.clear();
        });
        
        // Screenshot button
        document.getElementById('screenshot-button').addEventListener('click', () => {
            const dataURL = this.canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'sand-simulation.png';
            link.click();
        });
        
        // Pause button
        document.getElementById('pause-button').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
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
        
        // Brush size slider
        const brushSlider = document.getElementById('brush-size');
        const brushValue = document.getElementById('brush-value');
        
        brushSlider.addEventListener('input', () => {
            this.brushSize = parseInt(brushSlider.value);
            brushValue.textContent = this.brushSize;
        });
        
        // Simulation speed slider
        const speedSlider = document.getElementById('sim-speed');
        const speedValue = document.getElementById('speed-value');
        
        speedSlider.addEventListener('input', () => {
            this.simSpeed = parseInt(speedSlider.value);
            speedValue.textContent = this.simSpeed;
        });
        
        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            // Material selection with number keys
            if (!isNaN(parseInt(e.key)) && parseInt(e.key) >= 0 && parseInt(e.key) <= 9) {
                // Materials are mapped to numbers 1-9
                const materialValue = parseInt(e.key);
                if (materialValue === 0) return; // Skip 0
                
                // Update UI and select material
                document.querySelectorAll('.material-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Find the corresponding material button and activate it
                const materialButtons = document.querySelectorAll('.material-button');
                if (materialValue <= materialButtons.length) {
                    materialButtons[materialValue - 1].classList.add('active');
                    this.activeMaterial = materialValue;
                }
            }
            
            // Tool selection
            switch(e.key.toLowerCase()) {
                case 'b':
                    this.setTool('brush');
                    break;
                case 'l':
                    this.setTool('line');
                    break;
                case 'r':
                    this.setTool('rect');
                    break;
                case 'c':
                    this.setTool('circle');
                    break;
                case 'e':
                    // Select eraser (material 0)
                    document.querySelectorAll('.material-button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    document.querySelector('.material-button[data-material="eraser"]').classList.add('active');
                    this.activeMaterial = 0;
                    break;
                case '[':
                    // Decrease brush size
                    this.brushSize = Math.max(1, this.brushSize - 1);
                    document.getElementById('brush-size').value = this.brushSize;
                    document.getElementById('brush-value').textContent = this.brushSize;
                    break;
                case ']':
                    // Increase brush size
                    this.brushSize = Math.min(10, this.brushSize + 1);
                    document.getElementById('brush-size').value = this.brushSize;
                    document.getElementById('brush-value').textContent = this.brushSize;
                    break;
                case ' ':
                    // Pause/play
                    this.isPaused = !this.isPaused;
                    break;
                case 's':
                    // Screenshot
                    document.getElementById('screenshot-button').click();
                    break;
                case 'delete':
                    // Clear screen
                    this.grid.clear();
                    break;
            }
        });
    }
    
    setTool(toolName) {
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.tool-button[data-tool="${toolName}"]`).classList.add('active');
        this.currentTool = toolName;
    }
    
    handleDrawStart(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = Math.floor((e.clientX - rect.left) * scaleX / this.pixelSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / this.pixelSize);
        
        // Store starting point for shape tools
        if (this.currentTool !== 'brush') {
            this.drawingStart = { x, y };
        }
        
        // For brush, draw immediately
        if (this.currentTool === 'brush') {
            this.drawAtPosition(x, y);
        }
    }
    
    handleDraw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = Math.floor((e.clientX - rect.left) * scaleX / this.pixelSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / this.pixelSize);
        
        // Only handle brush drawing on mouse move
        if (this.currentTool === 'brush') {
            // Draw a line between last position and current position for smoother drawing
            if (this.lastMouseX !== -1) {
                this.grid.drawLine(this.lastMouseX, this.lastMouseY, x, y, this.activeMaterial, this.brushSize);
            } else {
                this.drawAtPosition(x, y);
            }
            
            this.lastMouseX = x;
            this.lastMouseY = y;
        }
    }
    
    handleDrawEnd(e) {
        // Only handle draw end for shape tools
        if (this.currentTool !== 'brush' && this.drawingStart) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            let endX, endY;
            if (e) {
                endX = Math.floor((e.clientX - rect.left) * scaleX / this.pixelSize);
                endY = Math.floor((e.clientY - rect.top) * scaleY / this.pixelSize);
            } else {
                // For touch events where e might not be available
                endX = this.lastMouseX;
                endY = this.lastMouseY;
            }
            
            switch(this.currentTool) {
                case 'line':
                    this.grid.drawLine(
                        this.drawingStart.x,
                        this.drawingStart.y,
                        endX,
                        endY,
                        this.activeMaterial,
                        this.brushSize
                    );
                    break;
                    
                case 'rect':
                    this.grid.drawRect(
                        this.drawingStart.x,
                        this.drawingStart.y,
                        endX,
                        endY,
                        this.activeMaterial,
                        e.shiftKey // Hold shift for filled rectangle
                    );
                    break;
                    
                case 'circle':
                    // Calculate radius from two points
                    const dx = endX - this.drawingStart.x;
                    const dy = endY - this.drawingStart.y;
                    const radius = Math.floor(Math.sqrt(dx * dx + dy * dy));
                    
                    this.grid.setCircle(
                        this.drawingStart.x,
                        this.drawingStart.y,
                        this.activeMaterial,
                        radius,
                        0.9 // High probability for solid circle
                    );
                    break;
            }
            
            this.drawingStart = null;
        }
    }
    
    drawAtPosition(x, y) {
        // Draw particles with the active material and current brush size
        // Use a circle and randomness for more natural look
        this.grid.setCircle(
            x,
            y,
            this.activeMaterial,
            this.brushSize,
            this.activeMaterial === this.grid.materials.WALL ? 1.0 : 0.7 // Less randomness for walls
        );
    }
    
    update() {
        if (!this.isPaused) {
            // Run update multiple times based on simulation speed
            for (let i = 0; i < this.simSpeed; i++) {
                this.grid.update();
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Render grid
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const value = this.grid.get(x, y);
                if (value !== 0) { // If not empty
                    const baseColor = this.colors[value];
                    
                    let adjustedColor;
                    
                    // Apply color variations and effects based on material and metadata
                    switch (value) {
                        case this.grid.materials.SAND:
                            adjustedColor = this.varyColor(baseColor, 15, 10);
                            break;
                        case this.grid.materials.WATER:
                            adjustedColor = this.varyColor(baseColor, 5, 10);
                            break;
                        case this.grid.materials.FIRE: {
                            // Fire gets more yellow as it ages
                            const meta = this.grid.getMeta(x, y);
                            const lifeRatio = meta.life / this.grid.properties[this.grid.materials.FIRE].lifespan;
                            const r = 255;
                            const g = Math.min(255, Math.floor(lifeRatio * 200) + 50);
                            const b = Math.floor(lifeRatio * 50);
                            adjustedColor = `rgb(${r}, ${g}, ${b})`;
                            break;
                        }
                        case this.grid.materials.STEAM: {
                            // Steam becomes more transparent as it ages
                            const meta = this.grid.getMeta(x, y);
                            const lifeRatio = meta.life / this.grid.properties[this.grid.materials.STEAM].lifespan;
                            const alpha = lifeRatio * 0.8;
                            adjustedColor = `rgba(200, 200, 200, ${alpha})`;
                            break;
                        }
                        default:
                            adjustedColor = this.varyColor(baseColor, 5, 5);
                    }
                    
                    this.ctx.fillStyle = adjustedColor;
                    this.ctx.fillRect(
                        x * this.pixelSize,
                        y * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
        
        // Draw preview for shape tools
        if (this.isMouseDown && this.drawingStart && this.currentTool !== 'brush') {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 1;
            
            const startX = this.drawingStart.x * this.pixelSize;
            const startY = this.drawingStart.y * this.pixelSize;
            
            // Get current mouse position for preview
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (this.lastMouseX >= 0 ? this.lastMouseX : this.drawingStart.x) * this.pixelSize;
            const mouseY = (this.lastMouseY >= 0 ? this.lastMouseY : this.drawingStart.y) * this.pixelSize;
            
            switch(this.currentTool) {
                case 'line':
                    this.ctx.beginPath();
                    this.ctx.moveTo(startX, startY);
                    this.ctx.lineTo(mouseX, mouseY);
                    this.ctx.stroke();
                    break;
                    
                case 'rect':
                    this.ctx.strokeRect(
                        startX,
                        startY,
                        mouseX - startX,
                        mouseY - startY
                    );
                    break;
                    
                case 'circle':
                    const dx = mouseX - startX;
                    const dy = mouseY - startY;
                    const radius = Math.sqrt(dx * dx + dy * dy);
                    
                    this.ctx.beginPath();
                    this.ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
            }
        }
    }
    
    varyColor(baseColor, satVar = 10, lightVar = 5) {
        // Convert hex to RGB
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        // Add slight random variations
        const rVar = r + Math.floor(Math.random() * satVar - satVar/2);
        const gVar = g + Math.floor(Math.random() * satVar - satVar/2);
        const bVar = b + Math.floor(Math.random() * lightVar - lightVar/2);
        
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

// Initialize when the page loads
console.log('Sand Game script loaded');

window.addEventListener('load', () => {
    console.log('Window loaded, initializing game');
    document.getElementById('game-container').innerHTML = 'Initializing game...';
    try {
        new SandGame();
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('game-container').innerHTML = 'Error loading game: ' + error.message;
    }
});
