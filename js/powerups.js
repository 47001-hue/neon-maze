// ============================================================
// NEON MAZE — Power-Up System
// ============================================================

class PowerUp {
    constructor(col, row, type) {
        this.col = col;
        this.row = row;
        this.type = type;
        this.collected = false;
        this.animTime = Math.random() * Math.PI * 2;

        const pos = Utils.gridToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;

        this._setupVisuals();
    }

    _setupVisuals() {
        switch (this.type) {
            case 'OVERDRIVE':
                this.color = '#ffaa00';
                this.glowColor = '#ff8800';
                this.icon = '⚡';
                this.label = 'OVERDRIVE';
                break;
            case 'PHASE':
                this.color = '#aa44ff';
                this.glowColor = '#8800ff';
                this.icon = '👻';
                this.label = 'PHASE';
                break;
            case 'PULSE':
                this.color = '#ff4444';
                this.glowColor = '#ff0000';
                this.icon = '💥';
                this.label = 'PULSE';
                break;
            case 'PORTAL_KEY':
                this.color = '#00ff88';
                this.glowColor = '#00cc66';
                this.icon = '🌀';
                this.label = 'PORTAL KEY';
                break;
        }
    }

    update(dt) {
        this.animTime += dt;
    }

    render(ctx) {
        if (this.collected) return;

        const x = this.x;
        const y = this.y;
        const cs = CONFIG.CELL_SIZE;
        const r = cs * 0.3;
        const t = this.animTime;

        ctx.save();

        // Floating animation
        const floatY = Math.sin(t * 2.5) * 3;

        // Outer glow pulse
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        const auraGrad = ctx.createRadialGradient(x, y + floatY, 0, x, y + floatY, r * 2.5);
        auraGrad.addColorStop(0, Utils.hexToRGBA(this.color, 0.3 * pulse));
        auraGrad.addColorStop(0.5, Utils.hexToRGBA(this.color, 0.1 * pulse));
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(x, y + floatY, r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Rotating ring
        ctx.strokeStyle = Utils.hexToRGBA(this.color, 0.6 + 0.4 * pulse);
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 8 + pulse * 5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y + floatY, r, t * 2, t * 2 + Math.PI * 1.3);
        ctx.stroke();

        // Inner icon
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.font = `${cs * 0.35}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, x, y + floatY + 1);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    collect() {
        this.collected = true;
    }
}

class PowerUpManager {
    constructor() {
        this.powerUps = [];
        this.activeEffects = []; // Visual feedback for active power-ups
    }

    loadLevel(levelIndex) {
        this.powerUps = [];
        this.activeEffects = [];

        const level = LEVELS[levelIndex];
        level.powerUpPositions.forEach(p => {
            this.powerUps.push(new PowerUp(p.col, p.row, p.type));
        });
    }

    update(dt) {
        this.powerUps.forEach(p => p.update(dt));
        this.activeEffects = this.activeEffects.filter(e => {
            e.time -= dt;
            return e.time > 0;
        });
    }

    render(ctx) {
        this.powerUps.forEach(p => p.render(ctx));
    }

    checkCollection(playerCol, playerRow) {
        for (const pu of this.powerUps) {
            if (!pu.collected && pu.col === playerCol && pu.row === playerRow) {
                pu.collect();
                return pu;
            }
        }
        return null;
    }

    addActiveEffect(type, duration) {
        this.activeEffects.push({ type, time: duration / 1000 });
    }

    renderActiveEffects(ctx) {
        if (this.activeEffects.length === 0) return;

        ctx.save();
        let yOffset = CONFIG.HUD_HEIGHT + 25;
        ctx.font = '11px "Orbitron", monospace';
        ctx.textAlign = 'right';

        this.activeEffects.forEach(e => {
            let color, label;
            switch (e.type) {
                case 'OVERDRIVE': color = '#ffaa00'; label = '⚡ OVERDRIVE'; break;
                case 'PHASE': color = '#aa44ff'; label = '👻 PHASE'; break;
                case 'PULSE': color = '#ff4444'; label = '💥 PULSE'; break;
            }
            const alpha = Math.min(1, e.time * 2);
            ctx.fillStyle = Utils.hexToRGBA(color, alpha);
            ctx.shadowColor = color;
            ctx.shadowBlur = 5;
            ctx.fillText(`${label} ${e.time.toFixed(1)}s`, CONFIG.WIDTH - 10, yOffset);
            yOffset += 16;
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
