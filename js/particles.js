// ============================================================
// NEON MAZE — Particle System
// ============================================================

class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, glow) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.decay = decay || 1;
        this.alpha = 1;
        this.glow = glow || false;
        this.friction = 0.98;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= dt * this.decay;
        this.alpha = Math.max(0, this.life / this.maxLife);
        this.size *= 0.997;
        return this.life > 0 && this.size > 0.3;
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.size * 3;
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    update(dt) {
        this.particles = this.particles.filter(p => p.update(dt));
    }

    render(ctx) {
        this.particles.forEach(p => p.render(ctx));
    }

    addParticle(p) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(p);
        }
    }

    clear() {
        this.particles = [];
    }

    // === Preset Emitters ===

    emitTrail(x, y, color, dirX, dirY) {
        const count = 1;
        for (let i = 0; i < count; i++) {
            const angle = Math.atan2(-dirY, -dirX) + Utils.randomFloat(-0.5, 0.5);
            const speed = Utils.randomFloat(20, 60);
            this.addParticle(new Particle(
                x + Utils.randomFloat(-3, 3),
                y + Utils.randomFloat(-3, 3),
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Utils.randomFloat(1.5, 3.5),
                Utils.randomFloat(0.2, 0.5),
                1,
                true
            ));
        }
    }

    emitCollect(x, y, color) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Utils.randomFloat(-0.2, 0.2);
            const speed = Utils.randomFloat(50, 150);
            this.addParticle(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Utils.randomFloat(2, 4),
                Utils.randomFloat(0.3, 0.6),
                1,
                true
            ));
        }
    }

    emitPowerUp(x, y, color) {
        const count = 25;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Utils.randomFloat(80, 200);
            this.addParticle(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Utils.randomFloat(3, 6),
                Utils.randomFloat(0.5, 1.0),
                1,
                true
            ));
        }
    }

    emitExplosion(x, y, color, count = 30) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.randomFloat(30, 200);
            this.addParticle(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Utils.randomFloat(2, 6),
                Utils.randomFloat(0.4, 1.0),
                1.2,
                true
            ));
        }
    }

    emitPortalSwirl(x, y, colors, radius) {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Utils.randomFloat(0, radius);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            const tangentAngle = angle + Math.PI / 2;
            const speed = Utils.randomFloat(10, 40);
            this.addParticle(new Particle(
                px, py,
                Math.cos(tangentAngle) * speed + (x - px) * 0.5,
                Math.sin(tangentAngle) * speed + (y - py) * 0.5,
                Utils.randomChoice(colors),
                Utils.randomFloat(1.5, 3),
                Utils.randomFloat(0.5, 1.0),
                1,
                true
            ));
        }
    }

    emitPulseWave(x, y, color, maxRadius) {
        const count = 40;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = maxRadius * 2;
            this.addParticle(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                Utils.randomFloat(3, 5),
                0.5,
                1,
                true
            ));
        }
    }

    emitDeath(x, y) {
        const colors = ['#ff0044', '#ff4400', '#ff8800', '#ffff00', '#ffffff'];
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.randomFloat(50, 250);
            this.addParticle(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Utils.randomChoice(colors),
                Utils.randomFloat(2, 7),
                Utils.randomFloat(0.5, 1.5),
                1,
                true
            ));
        }
    }

    emitPortalEnter(x, y, color) {
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Utils.randomFloat(20, 100);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            const speed = Utils.randomFloat(100, 300);
            this.addParticle(new Particle(
                px, py,
                (x - px) / r * speed,
                (y - py) / r * speed,
                color,
                Utils.randomFloat(2, 5),
                Utils.randomFloat(0.3, 0.8),
                1,
                true
            ));
        }
    }

    emitAmbient(x, y, w, h, colors) {
        if (Math.random() > 0.05) return;
        const px = Utils.randomFloat(x, x + w);
        const py = Utils.randomFloat(y, y + h);
        this.addParticle(new Particle(
            px, py,
            Utils.randomFloat(-5, 5),
            Utils.randomFloat(-20, -5),
            Utils.randomChoice(colors),
            Utils.randomFloat(1, 2),
            Utils.randomFloat(1, 3),
            0.5,
            true
        ));
    }
}
