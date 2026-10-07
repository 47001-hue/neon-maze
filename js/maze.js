// ============================================================
// NEON MAZE — Maze Renderer & Collision System
// ============================================================

class Maze {
    constructor() {
        this.grid = [];
        this.fragments = [];
        this.totalFragments = 0;
        this.collectedFragments = 0;
        this.theme = THEMES[0];
        this.levelIndex = 0;
        this.portalActive = false;
        this.portalPos = { col: 0, row: 0 };
        this.portalAnimTime = 0;
        this.fragmentAnimTime = 0;
        this.wallGlowTime = 0;
    }

    loadLevel(levelIndex) {
        this.levelIndex = levelIndex;
        const level = LEVELS[levelIndex];
        this.theme = THEMES[levelIndex];
        this.grid = level.grid.map(row => [...row]);
        this.portalPos = { ...level.portalPos };
        this.portalActive = false;
        this.portalAnimTime = 0;
        this.fragmentAnimTime = 0;
        this.wallGlowTime = 0;

        // Place fragments on all open path cells (except spawn points and portal)
        this.fragments = [];
        this.collectedFragments = 0;

        const reservedCells = new Set();
        reservedCells.add(`${level.playerSpawn.col},${level.playerSpawn.row}`);
        reservedCells.add(`${level.portalPos.col},${level.portalPos.row}`);
        level.enemySpawns.forEach(e => reservedCells.add(`${e.col},${e.row}`));
        level.powerUpPositions.forEach(p => reservedCells.add(`${p.col},${p.row}`));

        for (let row = 0; row < CONFIG.ROWS; row++) {
            for (let col = 0; col < CONFIG.COLS; col++) {
                if (this.grid[row][col] === CONFIG.CELL.PATH && !reservedCells.has(`${col},${row}`)) {
                    this.fragments.push({ col, row, collected: false, animOffset: Math.random() * Math.PI * 2 });
                }
            }
        }
        this.totalFragments = this.fragments.length;
    }

    isWall(col, row) {
        if (col < 0 || col >= CONFIG.COLS || row < 0 || row >= CONFIG.ROWS) return true;
        return this.grid[row][col] === CONFIG.CELL.WALL;
    }

    isPath(col, row) {
        if (col < 0 || col >= CONFIG.COLS || row < 0 || row >= CONFIG.ROWS) return false;
        return this.grid[row][col] === CONFIG.CELL.PATH;
    }

    canMove(col, row, dirX, dirY, phaseActive) {
        const newCol = col + dirX;
        const newRow = row + dirY;
        if (phaseActive) {
            // Can pass through walls but not out of bounds
            return newCol >= 0 && newCol < CONFIG.COLS && newRow >= 0 && newRow < CONFIG.ROWS;
        }
        return this.isPath(newCol, newRow);
    }

    collectFragment(col, row) {
        const frag = this.fragments.find(f => f.col === col && f.row === row && !f.collected);
        if (frag) {
            frag.collected = true;
            this.collectedFragments++;
            if (this.collectedFragments >= this.totalFragments) {
                this.portalActive = true;
            }
            return true;
        }
        return false;
    }

    activatePortal() {
        this.portalActive = true;
    }

    isPortal(col, row) {
        return col === this.portalPos.col && row === this.portalPos.row && this.portalActive;
    }

    getRemainingFragments() {
        return this.totalFragments - this.collectedFragments;
    }

    update(dt) {
        this.fragmentAnimTime += dt;
        this.portalAnimTime += dt;
        this.wallGlowTime += dt;
    }

    render(ctx) {
        const cs = CONFIG.CELL_SIZE;
        const hudH = CONFIG.HUD_HEIGHT;
        const theme = this.theme;

        // Background
        ctx.fillStyle = theme.bgColor;
        ctx.fillRect(0, hudH, CONFIG.WIDTH, CONFIG.ROWS * cs);

        // Render walls
        for (let row = 0; row < CONFIG.ROWS; row++) {
            for (let col = 0; col < CONFIG.COLS; col++) {
                const x = col * cs;
                const y = row * cs + hudH;

                if (this.grid[row][col] === CONFIG.CELL.WALL) {
                    // Wall fill
                    ctx.fillStyle = theme.wallColor;
                    ctx.fillRect(x, y, cs, cs);

                    // Draw neon borders only on edges adjacent to paths
                    ctx.strokeStyle = theme.wallBorder;
                    ctx.lineWidth = 1.5;

                    const glowPulse = 0.6 + 0.4 * Math.sin(this.wallGlowTime * 1.5);
                    ctx.shadowColor = theme.wallBorder;
                    ctx.shadowBlur = 6 * glowPulse;

                    // Top edge
                    if (row > 0 && this.grid[row - 1][col] === CONFIG.CELL.PATH) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + cs, y);
                        ctx.stroke();
                    }
                    // Bottom edge
                    if (row < CONFIG.ROWS - 1 && this.grid[row + 1][col] === CONFIG.CELL.PATH) {
                        ctx.beginPath();
                        ctx.moveTo(x, y + cs);
                        ctx.lineTo(x + cs, y + cs);
                        ctx.stroke();
                    }
                    // Left edge
                    if (col > 0 && this.grid[row][col - 1] === CONFIG.CELL.PATH) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, y + cs);
                        ctx.stroke();
                    }
                    // Right edge
                    if (col < CONFIG.COLS - 1 && this.grid[row][col + 1] === CONFIG.CELL.PATH) {
                        ctx.beginPath();
                        ctx.moveTo(x + cs, y);
                        ctx.lineTo(x + cs, y + cs);
                        ctx.stroke();
                    }

                    ctx.shadowBlur = 0;
                } else {
                    // Path fill
                    ctx.fillStyle = theme.pathColor;
                    ctx.fillRect(x, y, cs, cs);

                    // Subtle grid lines
                    ctx.strokeStyle = Utils.hexToRGBA(theme.wallBorder, 0.05);
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x, y, cs, cs);
                }
            }
        }

        // Render fragments
        this.fragments.forEach(frag => {
            if (frag.collected) return;
            const pos = Utils.gridToPixel(frag.col, frag.row);
            const pulse = 0.5 + 0.5 * Math.sin(this.fragmentAnimTime * 4 + frag.animOffset);
            const size = 3 + pulse * 1.5;

            ctx.save();
            ctx.shadowColor = theme.fragmentColor;
            ctx.shadowBlur = 8 + pulse * 4;
            ctx.fillStyle = theme.fragmentColor;
            ctx.globalAlpha = 0.7 + pulse * 0.3;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5 + pulse * 0.3;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        // Render portal
        this._renderPortal(ctx);
    }

    _renderPortal(ctx) {
        const pos = Utils.gridToPixel(this.portalPos.col, this.portalPos.row);
        const cs = CONFIG.CELL_SIZE;
        const theme = this.theme;

        if (!this.portalActive) {
            // Inactive portal - dim outline
            ctx.save();
            ctx.strokeStyle = Utils.hexToRGBA(theme.portalColor, 0.2);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, cs * 0.35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            return;
        }

        // Active portal
        ctx.save();
        const t = this.portalAnimTime;

        // Outer glow
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, cs * 0.5);
        gradient.addColorStop(0, Utils.hexToRGBA(theme.portalColor, 0.4));
        gradient.addColorStop(0.5, Utils.hexToRGBA(theme.portalColor, 0.15));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, cs * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Rotating rings
        for (let i = 0; i < 3; i++) {
            const radius = cs * (0.2 + i * 0.06);
            const rotation = t * (2 + i) * (i % 2 === 0 ? 1 : -1);
            const pulse = 0.7 + 0.3 * Math.sin(t * 3 + i);

            ctx.strokeStyle = Utils.hexToRGBA(theme.portalColor, pulse * 0.8);
            ctx.shadowColor = theme.portalColor;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, rotation, rotation + Math.PI * 1.5);
            ctx.stroke();
        }

        // Center bright point
        const centerPulse = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = theme.portalColor;
        ctx.shadowBlur = 15 + centerPulse * 10;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3 + centerPulse * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
