// ============================================================
// NEON MAZE — Main Game Controller
// ============================================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = CONFIG.STATE.MENU;
        this.currentLevel = 0;
        this.lastTime = 0;
        this.animTime = 0;

        // Systems
        this.maze = new Maze();
        this.player = new Player();
        this.enemies = [];
        this.particles = new ParticleSystem();
        this.audio = new AudioSystem();
        this.input = new InputManager();
        this.hud = new HUD();
        this.scoring = new ScoringSystem();
        this.powerUpManager = new PowerUpManager();

        // Transition
        this.transitionAlpha = 0;
        this.transitionTarget = 0;
        this.transitionCallback = null;
        this.levelCompleteTimer = 0;
        this.gameOverTimer = 0;
        this.victoryTimer = 0;

        // Menu background animation
        this.menuBgMaze = null;
        this.menuNovaX = 60;
        this.menuNovaY = 0;
        this.menuNovaDir = 1;
        this.menuAnimTime = 0;

        // Enemy proximity alert
        this.enemyAlertCooldown = 0;

        // Scale
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this._bindEvents();
    }

    _bindEvents() {
        // Menu button clicks
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.audio.init();
                this.audio.resume();
                this.audio.playMenuSelect();
                this._handleMenuAction(btn.dataset.action);
            });
            btn.addEventListener('mouseenter', () => {
                this.audio.playMenuHover();
            });
        });

        // Canvas click (for focus)
        this.canvas.addEventListener('click', () => {
            this.audio.init();
            this.audio.resume();
        });

        // Keyboard shortcuts for menus
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.state === CONFIG.STATE.PLAYING) {
                    this.state = CONFIG.STATE.PAUSED;
                    this._showScreen('pauseScreen');
                    this.audio.stopMusic();
                } else if (this.state === CONFIG.STATE.PAUSED) {
                    this._resumeGame();
                } else if (this.state === CONFIG.STATE.HOW_TO_PLAY ||
                           this.state === CONFIG.STATE.HIGH_SCORES ||
                           this.state === CONFIG.STATE.SETTINGS) {
                    this.state = CONFIG.STATE.MENU;
                    this._showScreen('mainMenu');
                }
            }
            if (e.code === 'Enter' || e.code === 'Space') {
                if (this.state === CONFIG.STATE.MENU) {
                    this._handleMenuAction('play');
                }
            }
        });

        // Resize handler
        window.addEventListener('resize', () => this._resize());
        this._resize();
    }

    _resize() {
        const container = document.getElementById('gameContainer');
        const maxW = window.innerWidth;
        const maxH = window.innerHeight;

        const gameW = CONFIG.WIDTH;
        const gameH = CONFIG.HEIGHT;

        this.scale = Math.min(maxW / gameW, maxH / gameH, 1.5);

        this.canvas.width = gameW;
        this.canvas.height = gameH;
        this.canvas.style.width = `${gameW * this.scale}px`;
        this.canvas.style.height = `${gameH * this.scale}px`;
    }

    _handleMenuAction(action) {
        switch (action) {
            case 'play':
                this._hideAllScreens();
                this.startGame();
                break;
            case 'howtoplay':
                this.state = CONFIG.STATE.HOW_TO_PLAY;
                this._showScreen('howToPlayScreen');
                break;
            case 'highscores':
                this.state = CONFIG.STATE.HIGH_SCORES;
                this._updateHighScoreDisplay();
                this._showScreen('highScoreScreen');
                break;
            case 'settings':
                this.state = CONFIG.STATE.SETTINGS;
                this._showScreen('settingsScreen');
                break;
            case 'back':
                this.state = CONFIG.STATE.MENU;
                this._showScreen('mainMenu');
                break;
            case 'retry':
                this._hideAllScreens();
                this.startGame();
                break;
            case 'mainmenu':
                this.audio.stopMusic();
                this.state = CONFIG.STATE.MENU;
                this._hideAllScreens();
                this._showScreen('mainMenu');
                break;
            case 'resume':
                this._resumeGame();
                break;
            case 'nextlevel':
                this._hideAllScreens();
                this._nextLevel();
                break;
            case 'toggleMusic':
                this.audio.toggleMusic();
                this._updateSettingsDisplay();
                break;
            case 'toggleSfx':
                this.audio.toggleSfx();
                this._updateSettingsDisplay();
                break;
        }
    }

    _showScreen(id) {
        this._hideAllScreens();
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    _hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    }

    _resumeGame() {
        this.state = CONFIG.STATE.PLAYING;
        this._hideAllScreens();
        this.audio.startMusic(this.currentLevel);
        this.lastTime = performance.now();
    }

    _updateHighScoreDisplay() {
        const list = document.getElementById('rankingList');
        if (!list) return;
        const rankings = this.scoring.getRankings();
        if (rankings.length === 0) {
            list.innerHTML = '<div class="ranking-empty">NO RECORDS YET</div>';
            return;
        }
        list.innerHTML = rankings.map((r, i) => `
            <div class="ranking-row">
                <span class="rank">#${i + 1}</span>
                <span class="rank-score">${String(r.score).padStart(6, '0')}</span>
                <span class="rank-level">LVL ${r.level}</span>
                <span class="rank-date">${r.date}</span>
            </div>
        `).join('');
    }

    _updateSettingsDisplay() {
        const musicBtn = document.getElementById('musicToggle');
        const sfxBtn = document.getElementById('sfxToggle');
        if (musicBtn) musicBtn.textContent = `MUSIC: ${this.audio.musicEnabled ? 'ON' : 'OFF'}`;
        if (sfxBtn) sfxBtn.textContent = `SFX: ${this.audio.sfxEnabled ? 'ON' : 'OFF'}`;
    }

    // === GAME LIFECYCLE ===

    startGame() {
        this.audio.init();
        this.audio.resume();

        this.currentLevel = 0;
        this.scoring.reset();
        this.player.lives = CONFIG.PLAYER_LIVES;
        this._loadLevel(this.currentLevel);
        this.state = CONFIG.STATE.PLAYING;
        this.audio.startMusic(this.currentLevel);
    }

    _loadLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            this._victory();
            return;
        }

        this.currentLevel = levelIndex;
        const level = LEVELS[levelIndex];

        this.maze.loadLevel(levelIndex);
        this.player.spawn(level.playerSpawn.col, level.playerSpawn.row);
        this.player.currentLevel = levelIndex;
        this.particles.clear();

        // Create enemies
        this.enemies = [];
        level.enemySpawns.forEach(e => {
            const enemy = new Enemy(e.col, e.row, e.type);
            if (e.type === 'GUARDIAN' && level.guardianZone) {
                enemy.setGuardianZone(level.guardianZone);
            }
            this.enemies.push(enemy);
        });

        // Load power-ups
        this.powerUpManager.loadLevel(levelIndex);

        // Scoring
        this.scoring.startLevel();

        // HUD notification
        this.hud.addNotification(
            `LEVEL ${levelIndex + 1} — ${THEMES[levelIndex].name.toUpperCase()}`,
            THEMES[levelIndex].accentColor,
            3
        );

        // Speed scaling for difficulty
        const speedMult = 1 + levelIndex * 0.1;
        this.enemies.forEach(e => {
            e.speed = e.baseSpeed * speedMult;
        });
    }

    _nextLevel() {
        this.currentLevel++;
        this._loadLevel(this.currentLevel);
        this.state = CONFIG.STATE.PLAYING;
        this.audio.startMusic(this.currentLevel);
    }

    _playerDeath() {
        this.player.die();
        this.audio.playDeath();
        this.particles.emitDeath(this.player.x, this.player.y);
        this.hud.shake(8);

        setTimeout(() => {
            if (this.player.lives <= 0) {
                this._gameOver();
            } else {
                // Respawn
                const level = LEVELS[this.currentLevel];
                this.player.spawn(level.playerSpawn.col, level.playerSpawn.row);
                this.player.currentLevel = this.currentLevel;
                this.enemies.forEach(e => e.respawn());
            }
        }, 1800);
    }

    _gameOver() {
        this.state = CONFIG.STATE.GAME_OVER;
        this.audio.stopMusic();
        this.audio.playGameOver();

        const isNewHigh = this.scoring.updateHighScore();
        this.scoring.saveRanking(this.currentLevel + 1);

        // Update game over screen
        document.getElementById('finalScore').textContent = String(this.scoring.score).padStart(6, '0');
        document.getElementById('bestScore').textContent = String(this.scoring.highScore).padStart(6, '0');

        const newHighEl = document.getElementById('newHighScore');
        if (newHighEl) newHighEl.style.display = isNewHigh ? 'block' : 'none';

        setTimeout(() => {
            this._showScreen('gameOverScreen');
        }, 500);
    }

    _levelComplete() {
        this.state = CONFIG.STATE.LEVEL_COMPLETE;
        this.player.startPortalAnim();
        this.audio.playPortal();

        const timeBonus = this.scoring.addTimeBonusScore();

        // Portal particles
        const portalPos = Utils.gridToPixel(this.maze.portalPos.col, this.maze.portalPos.row);
        this.particles.emitPortalEnter(portalPos.x, portalPos.y, THEMES[this.currentLevel].portalColor);

        setTimeout(() => {
            this.audio.stopMusic();

            if (this.currentLevel >= LEVELS.length - 1) {
                this._victory();
                return;
            }

            // Update level complete screen
            document.getElementById('levelCompleteName').textContent =
                `LEVEL ${this.currentLevel + 1} — ${THEMES[this.currentLevel].name.toUpperCase()}`;
            document.getElementById('levelScore').textContent = String(this.scoring.score).padStart(6, '0');
            document.getElementById('timeBonus').textContent = `+${timeBonus}`;

            this._showScreen('levelCompleteScreen');
        }, 2000);
    }

    _victory() {
        this.state = CONFIG.STATE.VICTORY;
        this.audio.stopMusic();

        const isNewHigh = this.scoring.updateHighScore();
        this.scoring.saveRanking(LEVELS.length);

        document.getElementById('victoryScore').textContent = String(this.scoring.score).padStart(6, '0');

        setTimeout(() => {
            this._showScreen('victoryScreen');
        }, 500);
    }

    // === MAIN LOOP ===

    init() {
        this.input.init();
        this._showScreen('mainMenu');
        this._updateSettingsDisplay();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._loop(t));
    }

    _loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        this.animTime += dt;

        this._update(dt);
        this._render();

        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        if (this.state === CONFIG.STATE.PLAYING) {
            // Update game systems
            this.maze.update(dt);
            this.player.update(dt, this.maze, this.input);
            this.powerUpManager.update(dt);
            this.scoring.update(dt);
            this.hud.update(dt);
            this.particles.update(dt);

            // Update enemies
            this.enemies.forEach(e => {
                e.update(dt, this.maze,
                    this.player.gridCol, this.player.gridRow,
                    this.player.direction.x, this.player.direction.y
                );
            });

            // Check collisions
            this._checkCollisions();

            // Ambient particles
            const theme = THEMES[this.currentLevel];
            this.particles.emitAmbient(0, CONFIG.HUD_HEIGHT, CONFIG.WIDTH, CONFIG.ROWS * CONFIG.CELL_SIZE, theme.particleColors);

            // Portal swirl
            if (this.maze.portalActive) {
                const portalPos = Utils.gridToPixel(this.maze.portalPos.col, this.maze.portalPos.row);
                this.particles.emitPortalSwirl(portalPos.x, portalPos.y, [theme.portalColor, '#ffffff'], CONFIG.CELL_SIZE * 0.4);
            }

            // Enemy proximity alert
            this.enemyAlertCooldown -= dt;
            if (this.enemyAlertCooldown <= 0) {
                const closestDist = Math.min(...this.enemies.map(e =>
                    e.alive && !e.stunned ? Utils.dist(this.player.x, this.player.y, e.x, e.y) : Infinity
                ));
                if (closestDist < CONFIG.CELL_SIZE * 3) {
                    this.audio.playEnemyNear();
                    this.enemyAlertCooldown = 1.5;
                }
            }
        } else if (this.state === CONFIG.STATE.LEVEL_COMPLETE || this.state === CONFIG.STATE.GAME_OVER) {
            this.particles.update(dt);
            this.player.update(dt, this.maze, this.input);
        } else if (this.state === CONFIG.STATE.MENU) {
            // Menu background animation
            this.menuAnimTime += dt;
        }
    }

    _checkCollisions() {
        if (!this.player.alive || this.player.portalAnimating) return;

        const pCol = this.player.gridCol;
        const pRow = this.player.gridRow;

        // Fragment collection
        if (this.maze.collectFragment(pCol, pRow)) {
            const result = this.scoring.addFragmentScore();
            const theme = THEMES[this.currentLevel];
            const pos = Utils.gridToPixel(pCol, pRow);
            this.particles.emitCollect(pos.x, pos.y, theme.fragmentColor);

            if (result.combo > 2) {
                this.audio.playCollectCombo(Math.min(result.combo, 10));
                this.hud.addComboDisplay(result.combo, result.multiplier, result.points);
            } else {
                this.audio.playCollect();
            }

            // Check if all fragments collected
            if (this.maze.portalActive) {
                this.hud.addNotification('PORTAL ACTIVATED!', THEMES[this.currentLevel].portalColor, 2);
            }
        }

        // Power-up collection
        const pu = this.powerUpManager.checkCollection(pCol, pRow);
        if (pu) {
            this.audio.playPowerUp();
            const pos = Utils.gridToPixel(pCol, pRow);
            this.particles.emitPowerUp(pos.x, pos.y, pu.color);
            this.scoring.addPowerUpScore();

            switch (pu.type) {
                case 'OVERDRIVE':
                    this.player.activateOverdrive();
                    this.hud.addNotification('⚡ OVERDRIVE!', '#ffaa00', 2);
                    this.powerUpManager.addActiveEffect('OVERDRIVE', CONFIG.OVERDRIVE_DURATION);
                    break;
                case 'PHASE':
                    this.player.activatePhase();
                    this.hud.addNotification('👻 PHASE SHIFT!', '#aa44ff', 2);
                    this.powerUpManager.addActiveEffect('PHASE', CONFIG.PHASE_DURATION);
                    break;
                case 'PULSE':
                    this._triggerPulse();
                    this.hud.addNotification('💥 PULSE WAVE!', '#ff4444', 2);
                    break;
                case 'PORTAL_KEY':
                    this.maze.activatePortal();
                    this.hud.addNotification('🌀 PORTAL KEY!', '#00ff88', 2);
                    break;
            }
        }

        // Portal check
        if (this.maze.isPortal(pCol, pRow)) {
            this._levelComplete();
            return;
        }

        // Enemy collision
        if (!this.player.invulnerable) {
            for (const enemy of this.enemies) {
                if (!enemy.alive || enemy.stunned || enemy.isSpawning) continue;
                const dist = Utils.dist(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist < CONFIG.CELL_SIZE * 0.6) {
                    if (this.player.pulseReady) {
                        // Pulse kills on contact during pulse mode
                        enemy.stun(5);
                        this.scoring.addEnemyScore();
                        this.audio.playEnemyDefeated();
                        this.particles.emitExplosion(enemy.x, enemy.y, enemy.color, 20);
                    } else {
                        this._playerDeath();
                        return;
                    }
                }
            }
        }
    }

    _triggerPulse() {
        this.audio.playPulse();
        this.hud.shake(6);
        const pos = { x: this.player.x, y: this.player.y };
        this.particles.emitPulseWave(pos.x, pos.y, '#ff4444', CONFIG.CELL_SIZE * 5);

        this.enemies.forEach(e => {
            if (!e.alive) return;
            const dist = Utils.dist(pos.x, pos.y, e.x, e.y);
            if (dist < CONFIG.CELL_SIZE * 5) {
                e.stun(CONFIG.PULSE_DURATION / 1000);
                this.particles.emitExplosion(e.x, e.y, '#ff4444', 10);
                this.scoring.addEnemyScore();
            }
        });
    }

    // === RENDERING ===

    _render() {
        const ctx = this.ctx;
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        ctx.clearRect(0, 0, w, h);

        // Screen shake
        const shake = this.hud.getShakeOffset();
        if (shake.x !== 0 || shake.y !== 0) {
            ctx.save();
            ctx.translate(shake.x, shake.y);
        }

        if (this.state === CONFIG.STATE.PLAYING ||
            this.state === CONFIG.STATE.LEVEL_COMPLETE ||
            this.state === CONFIG.STATE.GAME_OVER ||
            this.state === CONFIG.STATE.PAUSED) {
            this._renderGame(ctx);
        } else if (this.state === CONFIG.STATE.MENU) {
            this._renderMenuBackground(ctx);
        }

        if (shake.x !== 0 || shake.y !== 0) {
            ctx.restore();
        }
    }

    _renderGame(ctx) {
        const theme = THEMES[this.currentLevel];

        // Maze
        this.maze.render(ctx);

        // Power-ups
        this.powerUpManager.render(ctx);

        // Enemies
        this.enemies.forEach(e => e.render(ctx, theme));

        // Player
        this.player.render(ctx, this.particles, theme);

        // Particles (on top)
        this.particles.render(ctx);

        // HUD
        this.hud.render(ctx, this.scoring, this.player, this.currentLevel, theme);

        // Active power-up timers
        this.powerUpManager.renderActiveEffects(ctx);

        // Mobile joystick
        if (this.input.isMobile) {
            const rect = this.canvas.getBoundingClientRect();
            this.input.renderJoystick(ctx, rect);
        }
    }

    _renderMenuBackground(ctx) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Dark background with animated grid
        ctx.fillStyle = '#020810';
        ctx.fillRect(0, 0, w, h);

        // Animated grid lines
        const gridSize = 40;
        const t = this.menuAnimTime;

        ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
        ctx.lineWidth = 1;

        for (let x = 0; x < w; x += gridSize) {
            const offset = Math.sin(t * 0.5 + x * 0.01) * 3;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + offset, h);
            ctx.stroke();
        }

        for (let y = 0; y < h; y += gridSize) {
            const offset = Math.sin(t * 0.3 + y * 0.01) * 3;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y + offset);
            ctx.stroke();
        }

        // Floating particles
        const colors = ['#00d4ff', '#ff0088', '#00ff88', '#aa44ff'];
        for (let i = 0; i < 20; i++) {
            const px = (Math.sin(t * 0.2 + i * 1.7) * 0.5 + 0.5) * w;
            const py = (Math.cos(t * 0.15 + i * 2.3) * 0.5 + 0.5) * h;
            const size = 1.5 + Math.sin(t * 2 + i) * 1;
            const alpha = 0.3 + 0.3 * Math.sin(t * 1.5 + i * 0.7);

            ctx.fillStyle = Utils.hexToRGBA(colors[i % colors.length], alpha);
            ctx.shadowColor = colors[i % colors.length];
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Animated mini maze in background
        this._renderMiniMaze(ctx, t);

        // Animated Nova traversing
        this._renderMenuNova(ctx, t);
    }

    _renderMiniMaze(ctx, t) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Draw some neon maze wall segments in the background
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 4;

        const segments = [
            [100, 200, 300, 200], [300, 200, 300, 350],
            [400, 150, 400, 300], [400, 300, 550, 300],
            [550, 300, 550, 450], [200, 400, 350, 400],
            [600, 200, 750, 200], [750, 200, 750, 350],
            [150, 500, 300, 500], [500, 450, 650, 450],
        ];

        segments.forEach(([x1, y1, x2, y2]) => {
            const wobble = Math.sin(t * 1.5 + x1 * 0.01) * 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1 + wobble);
            ctx.lineTo(x2, y2 + wobble);
            ctx.stroke();
        });

        ctx.shadowBlur = 0;
    }

    _renderMenuNova(ctx, t) {
        // Simple Nova animation moving across
        const speed = 60;
        const yBase = CONFIG.HEIGHT * 0.65;
        const x = ((t * speed) % (CONFIG.WIDTH + 100)) - 50;
        const y = yBase + Math.sin(t * 3) * 10;

        const r = 10;

        // Trail
        for (let i = 0; i < 5; i++) {
            const tx = x - i * 15;
            const alpha = (5 - i) / 10;
            ctx.fillStyle = Utils.hexToRGBA('#00d4ff', alpha);
            ctx.beginPath();
            ctx.arc(tx, y, r * (1 - i * 0.15), 0, Math.PI * 2);
            ctx.fill();
        }

        // Body glow
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#00d4ff');
        grad.addColorStop(1, 'rgba(0, 212, 255, 0.3)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }
}

// === INITIALIZATION ===

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
