// ============================================================
// NEON MAZE — Configuration & Constants
// ============================================================

const CONFIG = {
    // Grid
    COLS: 21,
    ROWS: 15,
    CELL_SIZE: 40,
    HUD_HEIGHT: 54,

    // Canvas
    get WIDTH() { return this.COLS * this.CELL_SIZE; },
    get HEIGHT() { return this.ROWS * this.CELL_SIZE + this.HUD_HEIGHT; },

    // Gameplay
    PLAYER_SPEED: 3.2,
    PLAYER_LIVES: 3,
    FRAGMENT_SCORE: 10,
    ENEMY_DEFEAT_SCORE: 200,
    LEVEL_TIME_BONUS: 50,
    COMBO_MULTIPLIER: 1.5,
    COMBO_TIMEOUT: 1500,

    // Power-up durations (ms)
    OVERDRIVE_DURATION: 5000,
    PHASE_DURATION: 4000,
    PULSE_DURATION: 3000,
    OVERDRIVE_SPEED_MULT: 1.8,

    // Enemy speeds
    ENEMY_SPEED: {
        CHASER: 2.4,
        SHADOW: 2.2,
        RUSHER: 4.0,
        GUARDIAN: 1.8
    },

    // Directions
    DIR: {
        NONE: { x: 0, y: 0 },
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 }
    },

    // Game states
    STATE: {
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        GAME_OVER: 'GAME_OVER',
        LEVEL_COMPLETE: 'LEVEL_COMPLETE',
        LEVEL_TRANSITION: 'LEVEL_TRANSITION',
        HOW_TO_PLAY: 'HOW_TO_PLAY',
        HIGH_SCORES: 'HIGH_SCORES',
        SETTINGS: 'SETTINGS',
        VICTORY: 'VICTORY'
    },

    // Cell types
    CELL: {
        PATH: 0,
        WALL: 1
    }
};

// Level themes
const THEMES = [
    {
        name: 'Neon City',
        wallColor: '#0a1628',
        wallBorder: '#00d4ff',
        wallGlow: 'rgba(0, 212, 255, 0.4)',
        pathColor: '#050d1a',
        fragmentColor: '#00d4ff',
        portalColor: '#00ff88',
        bgColor: '#020810',
        accentColor: '#00d4ff',
        enemyTint: 0,
        particleColors: ['#00d4ff', '#00a8cc', '#66e0ff']
    },
    {
        name: 'Cyber Factory',
        wallColor: '#1a1208',
        wallBorder: '#ff8800',
        wallGlow: 'rgba(255, 136, 0, 0.4)',
        pathColor: '#0d0a04',
        fragmentColor: '#ffaa00',
        portalColor: '#00ff88',
        bgColor: '#080600',
        accentColor: '#ff8800',
        enemyTint: 30,
        particleColors: ['#ff8800', '#ffaa44', '#ffcc88']
    },
    {
        name: 'Digital Ruins',
        wallColor: '#081a10',
        wallBorder: '#00ff66',
        wallGlow: 'rgba(0, 255, 102, 0.4)',
        pathColor: '#040d08',
        fragmentColor: '#00ff66',
        portalColor: '#ff00ff',
        bgColor: '#020a05',
        accentColor: '#00ff66',
        enemyTint: 120,
        particleColors: ['#00ff66', '#44ff88', '#88ffaa']
    },
    {
        name: 'Dark Space',
        wallColor: '#140828',
        wallBorder: '#aa44ff',
        wallGlow: 'rgba(170, 68, 255, 0.4)',
        pathColor: '#0a0414',
        fragmentColor: '#cc66ff',
        portalColor: '#ffff00',
        bgColor: '#060210',
        accentColor: '#aa44ff',
        enemyTint: 270,
        particleColors: ['#aa44ff', '#cc88ff', '#dd99ff']
    },
    {
        name: 'Quantum Core',
        wallColor: '#1a0818',
        wallBorder: '#ff0088',
        wallGlow: 'rgba(255, 0, 136, 0.4)',
        pathColor: '#0d040c',
        fragmentColor: '#ff44aa',
        portalColor: '#00ffff',
        bgColor: '#0a0208',
        accentColor: '#ff0088',
        enemyTint: 330,
        particleColors: ['#ff0088', '#ff44aa', '#ff88cc']
    }
];

// Utility functions
const Utils = {
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    dist(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },
    manhattanDist(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },
    randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    },
    gridToPixel(col, row) {
        return {
            x: col * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            y: row * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2 + CONFIG.HUD_HEIGHT
        };
    },
    pixelToGrid(px, py) {
        return {
            col: Math.floor(px / CONFIG.CELL_SIZE),
            row: Math.floor((py - CONFIG.HUD_HEIGHT) / CONFIG.CELL_SIZE)
        };
    },
    isAlignedToGrid(px, py) {
        const half = CONFIG.CELL_SIZE / 2;
        const gx = px % CONFIG.CELL_SIZE;
        const gy = (py - CONFIG.HUD_HEIGHT) % CONFIG.CELL_SIZE;
        return Math.abs(gx - half) < 2 && Math.abs(gy - half) < 2;
    },
    snapToGrid(px, py) {
        const col = Math.round((px - CONFIG.CELL_SIZE / 2) / CONFIG.CELL_SIZE);
        const row = Math.round((py - CONFIG.HUD_HEIGHT - CONFIG.CELL_SIZE / 2) / CONFIG.CELL_SIZE);
        return Utils.gridToPixel(col, row);
    },
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    },
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }
};
