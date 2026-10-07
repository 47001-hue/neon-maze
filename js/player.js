// ============================================================
// NEON MAZE — Player (NOVA)
// ============================================================

class Player {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.gridCol = 0;
        this.gridRow = 0;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = null;
        this.speed = CONFIG.PLAYER_SPEED;
        this.baseSpeed = CONFIG.PLAYER_SPEED;
        this.alive = true;
        this.lives = CONFIG.PLAYER_LIVES;

        // Animation
        this.animTime = 0;
        this.trailTimer = 0;
        this.pulsePhase = 0;
        this.isMoving = false;
        this.deathAnimTime = 0;
        this.deathAnimating = false;
        this.portalAnimTime = 0;
        this.portalAnimating = false;
        this.spawnAnimTime = 0;
        this.isSpawning = true;
        this.hitAnimTime = 0;
        this.isHit = false;
        this.invulnerable = false;
        this.invulnerableTime = 0;

        // Power-up states
        this.overdrive = false;
        this.overdriveTimer = 0;
        this.phase = false;
        this.phaseTimer = 0;
        this.pulseReady = false;
        this.pulseTimer = 0;

        // Visual
        this.coreColor = '#00d4ff';
        this.glowColor = 'rgba(0, 212, 255, 0.5)';
        this.bodyRadius = CONFIG.CELL_SIZE * 0.32;
        this.coreRadius = CONFIG.CELL_SIZE * 0.15;
    }

    spawn(col, row) {
        const pos = Utils.gridToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;
        this.gridCol = col;
        this.gridRow = row;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = null;
        this.alive = true;
        this.isMoving = false;
        this.deathAnimating = false;
        this.deathAnimTime = 0;
        this.portalAnimating = false;
        this.portalAnimTime = 0;
        this.isSpawning = true;
        this.spawnAnimTime = 0;
        this.isHit = false;
        this.hitAnimTime = 0;
        this.speed = this.baseSpeed;
        this.clearPowerUps();

        // Invulnerability on spawn
        this.invulnerable = true;
        this.invulnerableTime = 2;
    }

    clearPowerUps() {
        this.overdrive = false;
        this.overdriveTimer = 0;
        this.phase = false;
        this.phaseTimer = 0;
        this.pulseReady = false;
        this.pulseTimer = 0;
    }

    activateOverdrive() {
        this.overdrive = true;
        this.overdriveTimer = CONFIG.OVERDRIVE_DURATION / 1000;
        this.speed = this.baseSpeed * CONFIG.OVERDRIVE_SPEED_MULT;
    }

    activatePhase() {
        this.phase = true;
        this.phaseTimer = CONFIG.PHASE_DURATION / 1000;
    }

    activatePulse() {
        this.pulseReady = true;
        this.pulseTimer = CONFIG.PULSE_DURATION / 1000;
    }

    update(dt, maze, input) {
        if (!this.alive) {
            if (this.deathAnimating) {
                this.deathAnimTime += dt;
            }
            return;
        }

        if (this.portalAnimating) {
            this.portalAnimTime += dt;
            return;
        }

        // Spawn animation
        if (this.isSpawning) {
            this.spawnAnimTime += dt;
            if (this.spawnAnimTime > 1) {
                this.isSpawning = false;
            }
        }

        // Hit flash
        if (this.isHit) {
            this.hitAnimTime += dt;
            if (this.hitAnimTime > 0.3) {
                this.isHit = false;
                this.hitAnimTime = 0;
            }
        }

        // Invulnerability
        if (this.invulnerable) {
            this.invulnerableTime -= dt;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
            }
        }

        // Power-up timers
        if (this.overdrive) {
            this.overdriveTimer -= dt;
            if (this.overdriveTimer <= 0) {
                this.overdrive = false;
                this.speed = this.baseSpeed;
            }
        }
        if (this.phase) {
            this.phaseTimer -= dt;
            if (this.phaseTimer <= 0) {
                this.phase = false;
                // If inside a wall when phase ends, push to nearest path
                const grid = Utils.pixelToGrid(this.x, this.y);
                if (maze.isWall(grid.col, grid.row)) {
                    // Find nearest path cell
                    this._pushToNearestPath(maze);
                }
            }
        }
        if (this.pulseReady) {
            this.pulseTimer -= dt;
            if (this.pulseTimer <= 0) {
                this.pulseReady = false;
            }
        }

        this.animTime += dt;
        this.pulsePhase += dt * 5;

        // Get queued direction from input
        const queuedDir = input.getDirection();
        if (queuedDir) {
            this.nextDirection = { ...queuedDir };
        }

        // Store previous position to detect center crossing
        const prevX = this.x;
        const prevY = this.y;

        // Move player
        if (this.direction.x !== 0 || this.direction.y !== 0) {
            const moveAmt = this.speed * dt * 60;
            this.x += this.direction.x * moveAmt;
            this.y += this.direction.y * moveAmt;
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }

        // Check if we crossed a grid center
        const gridCenter = Utils.gridToPixel(this.gridCol, this.gridRow);
        
        // Calculate distance to center
        let crossedCenter = false;
        if (this.direction.x > 0 && prevX <= gridCenter.x && this.x >= gridCenter.x) crossedCenter = true;
        if (this.direction.x < 0 && prevX >= gridCenter.x && this.x <= gridCenter.x) crossedCenter = true;
        if (this.direction.y > 0 && prevY <= gridCenter.y && this.y >= gridCenter.y) crossedCenter = true;
        if (this.direction.y < 0 && prevY >= gridCenter.y && this.y <= gridCenter.y) crossedCenter = true;
        
        // Also check if we are perfectly still at the center (e.g. spawn)
        if (this.direction.x === 0 && this.direction.y === 0 && 
            Math.abs(this.x - gridCenter.x) < 0.1 && Math.abs(this.y - gridCenter.y) < 0.1) {
            crossedCenter = true;
        }

        if (crossedCenter) {
            // Snap to grid center
            this.x = gridCenter.x;
            this.y = gridCenter.y;

            // Try queued direction
            let canChangeDir = false;
            if (this.nextDirection && maze.canMove(this.gridCol, this.gridRow, this.nextDirection.x, this.nextDirection.y, this.phase)) {
                this.direction = { ...this.nextDirection };
                this.nextDirection = null;
                canChangeDir = true;
            }

            // Check if current direction is still valid
            if (!maze.canMove(this.gridCol, this.gridRow, this.direction.x, this.direction.y, this.phase)) {
                this.direction = { x: 0, y: 0 };
                this.isMoving = false;
            } else {
                this.isMoving = true;
                
                // Update grid position based on new direction
                this.gridCol += this.direction.x;
                this.gridRow += this.direction.y;
            }
        }

        // Trail particles
        if (this.isMoving) {
            this.trailTimer += dt;
            if (this.trailTimer > 0.02) {
                this.trailTimer = 0;
            }
        }
    }

    _pushToNearestPath(maze) {
        const grid = Utils.pixelToGrid(this.x, this.y);
        const directions = [
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: 0 }, { x: 1, y: 0 }
        ];
        for (const dir of directions) {
            if (maze.isPath(grid.col + dir.x, grid.row + dir.y)) {
                const pos = Utils.gridToPixel(grid.col + dir.x, grid.row + dir.y);
                this.x = pos.x;
                this.y = pos.y;
                return;
            }
        }
    }

    die() {
        this.alive = false;
        this.deathAnimating = true;
        this.deathAnimTime = 0;
        this.lives--;
    }

    startPortalAnim() {
        this.portalAnimating = true;
        this.portalAnimTime = 0;
    }

    render(ctx, particleSystem, theme) {
        if (this.deathAnimating) {
            this._renderDeath(ctx);
            return;
        }

        if (this.portalAnimating) {
            this._renderPortalEnter(ctx, theme);
            return;
        }

        if (!this.alive) return;

        const cs = CONFIG.CELL_SIZE;
        const x = this.x;
        const y = this.y;

        ctx.save();

        // Invulnerability flashing
        if (this.invulnerable) {
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.animTime * 15);
        }

        // Spawn animation
        let scale = 1;
        if (this.isSpawning) {
            scale = Utils.easeOutCubic(Math.min(1, this.spawnAnimTime));
        }

        // Hit flash
        if (this.isHit) {
            ctx.globalAlpha = 0.3 + 0.7 * Math.sin(this.hitAnimTime * 30);
        }

        // Phase effect
        if (this.phase) {
            ctx.globalAlpha *= 0.5 + 0.3 * Math.sin(this.animTime * 8);
        }

        // Outer glow
        const glowPulse = 0.6 + 0.4 * Math.sin(this.pulsePhase);
        const bodyR = this.bodyRadius * scale;

        // Glow aura
        const auraGradient = ctx.createRadialGradient(x, y, bodyR * 0.5, x, y, bodyR * 2.5);
        let auraColor = this.overdrive ? '#ffaa00' : (this.phase ? '#aa44ff' : theme.accentColor);
        auraGradient.addColorStop(0, Utils.hexToRGBA(auraColor, 0.3 * glowPulse));
        auraGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(x, y, bodyR * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        ctx.shadowColor = auraColor;
        ctx.shadowBlur = 15 + glowPulse * 8;

        const bodyGrad = ctx.createRadialGradient(x - bodyR * 0.2, y - bodyR * 0.2, 0, x, y, bodyR);
        if (this.overdrive) {
            bodyGrad.addColorStop(0, '#ffffff');
            bodyGrad.addColorStop(0.3, '#ffcc44');
            bodyGrad.addColorStop(1, '#ff8800');
        } else if (this.phase) {
            bodyGrad.addColorStop(0, '#ffffff');
            bodyGrad.addColorStop(0.3, '#cc88ff');
            bodyGrad.addColorStop(1, '#6622aa');
        } else {
            bodyGrad.addColorStop(0, '#ffffff');
            bodyGrad.addColorStop(0.3, Utils.hexToRGBA(theme.accentColor, 1));
            bodyGrad.addColorStop(1, Utils.hexToRGBA(theme.wallBorder, 0.8));
        }

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(x, y, bodyR, 0, Math.PI * 2);
        ctx.fill();

        // Inner core (bright nucleus)
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        const coreR = this.coreRadius * scale * (0.8 + 0.2 * Math.sin(this.pulsePhase * 2));
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Eye / direction indicator
        if (this.isMoving) {
            const eyeX = x + this.direction.x * bodyR * 0.35;
            const eyeY = y + this.direction.y * bodyR * 0.35;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, coreR * 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eyeX + this.direction.x * coreR * 0.2, eyeY + this.direction.y * coreR * 0.2, coreR * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        // Emit trail particles
        if (this.isMoving && particleSystem) {
            const trailColor = this.overdrive ? '#ffaa00' : (this.phase ? '#aa44ff' : theme.accentColor);
            particleSystem.emitTrail(
                x - this.direction.x * bodyR,
                y - this.direction.y * bodyR,
                trailColor,
                this.direction.x,
                this.direction.y
            );
        }
    }

    _renderDeath(ctx) {
        const t = this.deathAnimTime;
        if (t > 1.5) return;

        const x = this.x;
        const y = this.y;
        const progress = t / 1.5;

        ctx.save();

        // Expanding and fading rings
        for (let i = 0; i < 3; i++) {
            const ringProgress = Math.max(0, (t - i * 0.15) / 1.0);
            if (ringProgress > 1) continue;
            const radius = this.bodyRadius * (1 + ringProgress * 4);
            const alpha = (1 - ringProgress) * 0.5;

            ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
            ctx.shadowColor = '#ff3333';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2 * (1 - ringProgress);
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Shrinking core
        if (progress < 0.5) {
            const shrink = 1 - progress * 2;
            ctx.fillStyle = `rgba(255, 100, 100, ${shrink})`;
            ctx.shadowColor = '#ff0044';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(x, y, this.bodyRadius * shrink, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _renderPortalEnter(ctx, theme) {
        const t = this.portalAnimTime;
        if (t > 1.5) return;

        const portalPos = Utils.gridToPixel(
            LEVELS[this.currentLevel || 0].portalPos.col,
            LEVELS[this.currentLevel || 0].portalPos.row
        );

        const progress = Math.min(1, t / 1.0);
        const x = Utils.lerp(this.x, portalPos.x, Utils.easeInOutQuad(progress));
        const y = Utils.lerp(this.y, portalPos.y, Utils.easeInOutQuad(progress));
        const scale = 1 - Utils.easeInOutQuad(Math.max(0, (t - 0.5) / 1.0));

        ctx.save();
        ctx.globalAlpha = scale;

        // Spiraling body
        const bodyR = this.bodyRadius * Math.max(0.1, scale);
        ctx.translate(x, y);
        ctx.rotate(t * 10);

        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.5, theme.portalColor);
        bodyGrad.addColorStop(1, Utils.hexToRGBA(theme.portalColor, 0.5));

        ctx.shadowColor = theme.portalColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
