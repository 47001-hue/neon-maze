// ============================================================
// NEON MAZE — Scoring System
// ============================================================

class ScoringSystem {
    constructor() {
        this.score = 0;
        this.highScore = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.levelStartTime = 0;
        this.levelTime = 0;
        this.rankings = [];

        this._loadHighScores();
    }

    reset() {
        this.score = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.levelStartTime = performance.now();
        this.levelTime = 0;
    }

    startLevel() {
        this.levelStartTime = performance.now();
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
    }

    update(dt) {
        this.levelTime = (performance.now() - this.levelStartTime) / 1000;

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt * 1000;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
                this.comboMultiplier = 1;
            }
        }
    }

    addFragmentScore() {
        this.comboCount++;
        this.comboTimer = CONFIG.COMBO_TIMEOUT;
        this.comboMultiplier = 1 + Math.floor(this.comboCount / 5) * 0.5;
        const points = Math.floor(CONFIG.FRAGMENT_SCORE * this.comboMultiplier);
        this.score += points;
        return { points, combo: this.comboCount, multiplier: this.comboMultiplier };
    }

    addEnemyScore() {
        this.score += CONFIG.ENEMY_DEFEAT_SCORE;
        return CONFIG.ENEMY_DEFEAT_SCORE;
    }

    addTimeBonusScore() {
        // Bonus based on time: faster = more points
        const maxBonusTime = 120; // 2 minutes threshold
        const timeRatio = Math.max(0, 1 - this.levelTime / maxBonusTime);
        const bonus = Math.floor(timeRatio * CONFIG.LEVEL_TIME_BONUS * 100);
        this.score += bonus;
        return bonus;
    }

    addPowerUpScore() {
        const points = 50;
        this.score += points;
        return points;
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this._saveHighScores();
            return true;
        }
        return false;
    }

    saveRanking(levelReached) {
        const entry = {
            score: this.score,
            level: levelReached,
            date: new Date().toLocaleDateString(),
            time: Math.floor(this.levelTime)
        };

        this.rankings.push(entry);
        this.rankings.sort((a, b) => b.score - a.score);
        this.rankings = this.rankings.slice(0, 10); // Keep top 10

        this._saveHighScores();
    }

    getRankings() {
        return this.rankings;
    }

    _loadHighScores() {
        try {
            const data = localStorage.getItem('neonmaze_scores');
            if (data) {
                const parsed = JSON.parse(data);
                this.highScore = parsed.highScore || 0;
                this.rankings = parsed.rankings || [];
            }
        } catch (e) {
            console.warn('Could not load high scores:', e);
        }
    }

    _saveHighScores() {
        try {
            localStorage.setItem('neonmaze_scores', JSON.stringify({
                highScore: this.highScore,
                rankings: this.rankings
            }));
        } catch (e) {
            console.warn('Could not save high scores:', e);
        }
    }
}
