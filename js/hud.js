// ============================================================
// NEON MAZE — HUD (Heads-Up Display)
// ============================================================

class HUD {
    constructor() {
        this.notifications = [];
        this.comboDisplay = null;
        this.shakeTime = 0;
        this.shakeIntensity = 0;
    }

    addNotification(text, color, duration) {
        this.notifications.push({
            text,
            color,
            time: duration || 2,
            maxTime: duration || 2,
            y: CONFIG.HUD_HEIGHT + 80
        });
    }

    addComboDisplay(combo, multiplier, points) {
        this.comboDisplay = {
            combo,
            multiplier,
            points,
            time: 1.0,
            maxTime: 1.0
        };
    }

    shake(intensity) {
        this.shakeTime = 0.3;
        this.shakeIntensity = intensity || 5;
    }

    update(dt) {
        // Update notifications
        this.notifications = this.notifications.filter(n => {
            n.time -= dt;
            n.y -= dt * 30;
            return n.time > 0;
        });

        // Update combo display
        if (this.comboDisplay) {
            this.comboDisplay.time -= dt;
            if (this.comboDisplay.time <= 0) {
                this.comboDisplay = null;
            }
        }

        // Screen shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
        }
    }

    getShakeOffset() {
        if (this.shakeTime <= 0) return { x: 0, y: 0 };
        return {
            x: (Math.random() - 0.5) * this.shakeIntensity * 2,
            y: (Math.random() - 0.5) * this.shakeIntensity * 2
        };
    }

    render(ctx, scoring, player, currentLevel, theme) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HUD_HEIGHT;

        // HUD background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, w, h);

        // Bottom border glow
        ctx.shadowColor = theme.accentColor;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = theme.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, h);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // SCORE
        ctx.font = '10px "Orbitron", monospace';
        ctx.fillStyle = Utils.hexToRGBA(theme.accentColor, 0.6);
        ctx.textAlign = 'left';
        ctx.fillText('SCORE', 12, 18);
        ctx.font = 'bold 18px "Orbitron", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(scoring.score).padStart(6, '0'), 12, 40);

        // HIGH SCORE
        ctx.font = '10px "Orbitron", monospace';
        ctx.fillStyle = Utils.hexToRGBA(theme.accentColor, 0.6);
        ctx.textAlign = 'center';
        ctx.fillText('HIGH SCORE', w / 2, 18);
        ctx.font = 'bold 18px "Orbitron", monospace';
        ctx.fillStyle = theme.accentColor;
        ctx.fillText(String(scoring.highScore).padStart(6, '0'), w / 2, 40);

        // LIVES (ENERGY)
        ctx.font = '10px "Orbitron", monospace';
        ctx.fillStyle = Utils.hexToRGBA(theme.accentColor, 0.6);
        ctx.textAlign = 'left';
        const livesX = w * 0.6 + 20;
        ctx.fillText('ENERGY', livesX, 18);

        for (let i = 0; i < player.lives; i++) {
            const lx = livesX + i * 22;
            ctx.fillStyle = theme.accentColor;
            ctx.shadowColor = theme.accentColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(lx + 8, 36, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(lx + 8, 36, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // LEVEL
        ctx.font = '10px "Orbitron", monospace';
        ctx.fillStyle = Utils.hexToRGBA(theme.accentColor, 0.6);
        ctx.textAlign = 'right';
        ctx.fillText('LEVEL', w - 12, 18);
        ctx.font = 'bold 18px "Orbitron", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${currentLevel + 1}`, w - 12, 40);

        // Level name
        ctx.font = '9px "Orbitron", monospace';
        ctx.fillStyle = Utils.hexToRGBA(theme.accentColor, 0.5);
        ctx.fillText(THEMES[currentLevel].name.toUpperCase(), w - 12, 50);

        // Combo display
        if (this.comboDisplay) {
            const cd = this.comboDisplay;
            const alpha = Math.min(1, cd.time * 3);
            const scale = 1 + (1 - cd.time / cd.maxTime) * 0.5;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${14 * scale}px "Orbitron", monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 10;
            ctx.fillText(`COMBO x${cd.combo} (+${cd.points})`, w / 2, CONFIG.HUD_HEIGHT + 30);
            if (cd.multiplier > 1) {
                ctx.font = `${11 * scale}px "Orbitron", monospace`;
                ctx.fillText(`MULTIPLIER x${cd.multiplier.toFixed(1)}`, w / 2, CONFIG.HUD_HEIGHT + 48);
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Notifications
        this.notifications.forEach(n => {
            const alpha = Math.min(1, n.time * 2);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 14px "Orbitron", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = n.color;
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 8;
            ctx.fillText(n.text, w / 2, n.y);
            ctx.shadowBlur = 0;
            ctx.restore();
        });

        // Fragments remaining
        ctx.font = '10px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = Utils.hexToRGBA(theme.fragmentColor, 0.7);
        const fragX = w / 2;
        const fragText = `◆ FRAGMENTS`;
        ctx.fillText(fragText, fragX, h + CONFIG.ROWS * CONFIG.CELL_SIZE + 10);
    }
}
