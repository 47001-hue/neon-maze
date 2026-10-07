// ============================================================
// NEON MAZE — Enemy AI (VOIDERS)
// ============================================================

class Enemy {
    constructor(col, row, type) {
        this.type = type;
        this.spawnCol = col;
        this.spawnRow = row;

        const pos = Utils.gridToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;
        this.gridCol = col;
        this.gridRow = row;
        this.direction = { x: 0, y: 0 };
        this.speed = CONFIG.ENEMY_SPEED[type];
        this.baseSpeed = this.speed;
        this.alive = true;
        this.stunned = false;
        this.stunTimer = 0;
        this.animTime = 0;
        this.moveTimer = 0;
        this.directionChangeInterval = 0.5;
        this.retreating = false;
        this.retreatTimer = 0;
        this.spawnAnimTime = 0;
        this.isSpawning = true;

        // Guardian-specific
        this.guardianZone = null;
        this.patrolTarget = null;
        this.patrolIndex = 0;

        // Visual
        this._setupVisuals();
    }

    _setupVisuals() {
        switch (this.type) {
            case 'CHASER':
                this.color = '#ff3344';
                this.glowColor = '#ff0022';
                this.eyeColor = '#ffff00';
                this.bodyShape = 'circle';
                break;
            case 'SHADOW':
                this.color = '#aa44ff';
                this.glowColor = '#8800ff';
                this.eyeColor = '#00ffff';
                this.bodyShape = 'diamond';
                break;
            case 'RUSHER':
                this.color = '#ff8800';
                this.glowColor = '#ff6600';
                this.eyeColor = '#ff0000';
                this.bodyShape = 'triangle';
                break;
            case 'GUARDIAN':
                this.color = '#44ff44';
                this.glowColor = '#00ff00';
                this.eyeColor = '#ffffff';
                this.bodyShape = 'square';
                break;
        }
    }

    setGuardianZone(zone) {
        this.guardianZone = zone;
        this._generatePatrolPath();
    }

    _generatePatrolPath() {
        if (!this.guardianZone) return;
        const z = this.guardianZone;
        this.patrolPoints = [
            { col: z.col - z.radius, row: z.row - z.radius },
            { col: z.col + z.radius, row: z.row - z.radius },
            { col: z.col + z.radius, row: z.row + z.radius },
            { col: z.col - z.radius, row: z.row + z.radius }
        ].filter(p => p.col >= 0 && p.col < CONFIG.COLS && p.row >= 0 && p.row < CONFIG.ROWS);
    }

    stun(duration) {
        this.stunned = true;
        this.stunTimer = duration;
    }

    respawn() {
        const pos = Utils.gridToPixel(this.spawnCol, this.spawnRow);
        this.x = pos.x;
        this.y = pos.y;
        this.gridCol = this.spawnCol;
        this.gridRow = this.spawnRow;
        this.direction = { x: 0, y: 0 };
        this.alive = true;
        this.stunned = false;
        this.stunTimer = 0;
        this.retreating = false;
        this.isSpawning = true;
        this.spawnAnimTime = 0;
        this.speed = this.baseSpeed;
    }

    update(dt, maze, playerCol, playerRow, playerDirX, playerDirY) {
        this.animTime += dt;

        // Spawn animation
        if (this.isSpawning) {
            this.spawnAnimTime += dt;
            if (this.spawnAnimTime > 0.8) {
                this.isSpawning = false;
            }
            return;
        }

        if (!this.alive) return;

        // Stun
        if (this.stunned) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.stunned = false;
            }
            return;
        }

        // Store previous position to detect center crossing
        const prevX = this.x;
        const prevY = this.y;

        // Move
        if (this.direction.x !== 0 || this.direction.y !== 0) {
            const moveAmt = this.speed * dt * 60;
            this.x += this.direction.x * moveAmt;
            this.y += this.direction.y * moveAmt;
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

            // Choose new direction based on AI type
            this._chooseDirection(maze, playerCol, playerRow, playerDirX, playerDirY);
            
            // Update grid position based on new direction
            this.gridCol += this.direction.x;
            this.gridRow += this.direction.y;
        }
    }

    _chooseDirection(maze, playerCol, playerRow, playerDirX, playerDirY) {
        const possibleDirs = this._getValidDirections(maze);
        if (possibleDirs.length === 0) {
            this.direction = { x: 0, y: 0 };
            return;
        }

        // Don't reverse unless it's the only option
        const nonReverse = possibleDirs.filter(d =>
            !(d.x === -this.direction.x && d.y === -this.direction.y)
        );
        const candidates = nonReverse.length > 0 ? nonReverse : possibleDirs;

        switch (this.type) {
            case 'CHASER':
                this._aiChaser(candidates, playerCol, playerRow);
                break;
            case 'SHADOW':
                this._aiShadow(candidates, playerCol, playerRow, playerDirX, playerDirY);
                break;
            case 'RUSHER':
                this._aiRusher(candidates, playerCol, playerRow);
                break;
            case 'GUARDIAN':
                this._aiGuardian(candidates, maze, playerCol, playerRow);
                break;
        }
    }

    _getValidDirections(maze) {
        const dirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];
        return dirs.filter(d => maze.canMove(this.gridCol, this.gridRow, d.x, d.y, false));
    }

    // CHASER — pursues player directly
    _aiChaser(candidates, playerCol, playerRow) {
        let bestDir = candidates[0];
        let bestDist = Infinity;

        candidates.forEach(d => {
            const newCol = this.gridCol + d.x;
            const newRow = this.gridRow + d.y;
            const dist = Utils.manhattanDist(newCol, newRow, playerCol, playerRow);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
            }
        });

        this.direction = { ...bestDir };
    }

    // SHADOW — targets position ahead of player
    _aiShadow(candidates, playerCol, playerRow, playerDirX, playerDirY) {
        // Predict 4 cells ahead
        const targetCol = playerCol + playerDirX * 4;
        const targetRow = playerRow + playerDirY * 4;

        let bestDir = candidates[0];
        let bestDist = Infinity;

        candidates.forEach(d => {
            const newCol = this.gridCol + d.x;
            const newRow = this.gridRow + d.y;
            const dist = Utils.manhattanDist(newCol, newRow, targetCol, targetRow);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
            }
        });

        this.direction = { ...bestDir };
    }

    // RUSHER — fast but dumb (mostly random, occasional chase)
    _aiRusher(candidates, playerCol, playerRow) {
        // 30% chance to chase, 70% random
        if (Math.random() < 0.3) {
            this._aiChaser(candidates, playerCol, playerRow);
        } else {
            this.direction = { ...Utils.randomChoice(candidates) };
        }
    }

    // GUARDIAN — patrols area, chases if player is nearby
    _aiGuardian(candidates, maze, playerCol, playerRow) {
        if (!this.guardianZone) {
            this._aiChaser(candidates, playerCol, playerRow);
            return;
        }

        const distToPlayer = Utils.manhattanDist(this.gridCol, this.gridRow, playerCol, playerRow);

        // If player is within guardian zone, chase aggressively
        if (distToPlayer <= this.guardianZone.radius + 1) {
            this._aiChaser(candidates, playerCol, playerRow);
            return;
        }

        // Otherwise, patrol
        if (this.patrolPoints && this.patrolPoints.length > 0) {
            const target = this.patrolPoints[this.patrolIndex % this.patrolPoints.length];
            const distToTarget = Utils.manhattanDist(this.gridCol, this.gridRow, target.col, target.row);

            if (distToTarget <= 1) {
                this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
            }

            let bestDir = candidates[0];
            let bestDist = Infinity;
            candidates.forEach(d => {
                const newCol = this.gridCol + d.x;
                const newRow = this.gridRow + d.y;
                const dist = Utils.manhattanDist(newCol, newRow, target.col, target.row);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestDir = d;
                }
            });
            this.direction = { ...bestDir };
        } else {
            this.direction = { ...Utils.randomChoice(candidates) };
        }
    }

    render(ctx, theme) {
        if (!this.alive && !this.isSpawning) return;

        const x = this.x;
        const y = this.y;
        const r = CONFIG.CELL_SIZE * 0.32;
        const t = this.animTime;

        ctx.save();

        // Spawn animation
        if (this.isSpawning) {
            const progress = Utils.easeOutCubic(Math.min(1, this.spawnAnimTime / 0.8));
            ctx.globalAlpha = progress;
        }

        // Stun visual
        if (this.stunned) {
            ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 10);
        }

        // Glow aura
        const pulse = 0.6 + 0.4 * Math.sin(t * 3);
        const auraGrad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2);
        auraGrad.addColorStop(0, Utils.hexToRGBA(this.color, 0.25 * pulse));
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 12 + pulse * 5;

        switch (this.bodyShape) {
            case 'circle':
                this._renderCircleBody(ctx, x, y, r);
                break;
            case 'diamond':
                this._renderDiamondBody(ctx, x, y, r);
                break;
            case 'triangle':
                this._renderTriangleBody(ctx, x, y, r);
                break;
            case 'square':
                this._renderSquareBody(ctx, x, y, r);
                break;
        }

        // Eyes
        ctx.shadowBlur = 0;
        this._renderEyes(ctx, x, y, r);

        // Stunned stars
        if (this.stunned) {
            this._renderStunStars(ctx, x, y, r);
        }

        ctx.restore();
    }

    _renderCircleBody(ctx, x, y, r) {
        const grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, this.color);
        grad.addColorStop(1, Utils.hexToRGBA(this.color, 0.6));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderDiamondBody(ctx, x, y, r) {
        const grad = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, this.color);
        grad.addColorStop(1, Utils.hexToRGBA(this.color, 0.6));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
    }

    _renderTriangleBody(ctx, x, y, r) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, this.color);
        grad.addColorStop(1, Utils.hexToRGBA(this.color, 0.6));
        ctx.fillStyle = grad;
        ctx.beginPath();
        const angleOffset = this.direction.x > 0 ? 0 :
                            this.direction.x < 0 ? Math.PI :
                            this.direction.y < 0 ? -Math.PI / 2 : Math.PI / 2;
        for (let i = 0; i < 3; i++) {
            const a = angleOffset + (Math.PI * 2 * i) / 3 - Math.PI / 2;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    _renderSquareBody(ctx, x, y, r) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, this.color);
        grad.addColorStop(1, Utils.hexToRGBA(this.color, 0.6));
        ctx.fillStyle = grad;

        const angle = this.animTime * 0.5;
        ctx.translate(x, y);
        ctx.rotate(angle);
        const s = r * 0.85;
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.rotate(-angle);
        ctx.translate(-x, -y);
    }

    _renderEyes(ctx, x, y, r) {
        const eyeOffsetX = this.direction.x * r * 0.2;
        const eyeOffsetY = this.direction.y * r * 0.2;
        const eyeSpacing = r * 0.3;

        // Determine eye positions based on movement direction
        let eye1X, eye1Y, eye2X, eye2Y;
        if (Math.abs(this.direction.x) > 0) {
            eye1X = x + eyeOffsetX;
            eye1Y = y - eyeSpacing;
            eye2X = x + eyeOffsetX;
            eye2Y = y + eyeSpacing;
        } else {
            eye1X = x - eyeSpacing;
            eye1Y = y + eyeOffsetY;
            eye2X = x + eyeSpacing;
            eye2Y = y + eyeOffsetY;
        }

        // Eye whites
        ctx.fillStyle = this.eyeColor;
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, r * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        const pupilOffX = this.direction.x * r * 0.06;
        const pupilOffY = this.direction.y * r * 0.06;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(eye1X + pupilOffX, eye1Y + pupilOffY, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X + pupilOffX, eye2Y + pupilOffY, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderStunStars(ctx, x, y, r) {
        const starCount = 3;
        for (let i = 0; i < starCount; i++) {
            const angle = this.animTime * 3 + (Math.PI * 2 * i) / starCount;
            const sx = x + Math.cos(angle) * r * 1.3;
            const sy = y - r * 0.8 + Math.sin(angle * 2) * r * 0.3;

            ctx.fillStyle = '#ffff00';
            ctx.font = `${r * 0.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('✦', sx, sy);
        }
    }
}
