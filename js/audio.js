// ============================================================
// NEON MAZE — Audio System (Web Audio API Synthesis)
// ============================================================

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
        this.musicPlaying = false;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.currentMusicNodes = [];
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.musicGain) this.musicGain.gain.value = vol;
    }

    setSfxVolume(vol) {
        this.sfxVolume = vol;
        if (this.sfxGain) this.sfxGain.gain.value = vol;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        }
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        }
    }

    // === Sound Effects ===

    playCollect() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    playCollectCombo(comboLevel) {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const baseFreq = 880 + comboLevel * 110;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, t + 0.1);
        osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, t + 0.1);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc2.start(t);
        osc.stop(t + 0.2);
        osc2.stop(t + 0.2);
    }

    playPowerUp() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc2.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
        osc2.frequency.setValueAtTime(330, t);
        osc2.frequency.exponentialRampToValueAtTime(1320, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.setValueAtTime(0.2, t + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc2.start(t);
        osc.stop(t + 0.5);
        osc2.stop(t + 0.5);
    }

    playDeath() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.6);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.7);

        // Noise burst
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = this.ctx.createBufferSource();
        const noiseGain = this.ctx.createGain();
        noise.buffer = buffer;
        noiseGain.gain.setValueAtTime(0.15, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        noise.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);
    }

    playPortal() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.1);
            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.4);
        });
    }

    playPulse() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.5);
    }

    playEnemyNear() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.setValueAtTime(100, t + 0.1);
        osc.frequency.setValueAtTime(120, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    playMenuSelect() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(660, t + 0.05);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    playMenuHover() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.06);
    }

    playGameOver() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const notes = [392, 349, 311, 262, 196];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + i * 0.25);
            gain.gain.setValueAtTime(0.15, t + i * 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.25);
            osc.stop(t + i * 0.25 + 0.4);
        });
    }

    playEnemyDefeated() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
    }

    // === Background Music ===

    startMusic(levelIndex) {
        if (!this.initialized) return;
        this.stopMusic();
        this.musicPlaying = true;
        this._playMusicLoop(levelIndex);
    }

    _playMusicLoop(levelIndex) {
        if (!this.musicPlaying || !this.initialized) return;
        const t = this.ctx.currentTime;
        const bpm = 130 + levelIndex * 10;
        const beatDur = 60 / bpm;

        // Different note patterns per level
        const patterns = [
            // Level 1 — Neon City (upbeat, bright)
            [262, 330, 392, 330, 262, 392, 523, 392, 262, 330, 392, 523, 659, 523, 392, 330],
            // Level 2 — Cyber Factory (driving, industrial)
            [165, 196, 220, 196, 165, 220, 262, 220, 165, 196, 220, 262, 330, 262, 220, 196],
            // Level 3 — Digital Ruins (mysterious)
            [196, 233, 262, 294, 262, 233, 196, 175, 196, 233, 262, 330, 294, 262, 233, 196],
            // Level 4 — Dark Space (ominous)
            [131, 156, 175, 156, 131, 175, 196, 175, 131, 156, 175, 196, 220, 196, 175, 156],
            // Level 5 — Quantum Core (intense, complex)
            [330, 392, 440, 523, 392, 330, 294, 330, 440, 523, 659, 523, 440, 392, 330, 294]
        ];

        const bassPatterns = [
            [65, 65, 82, 82, 65, 65, 98, 98, 73, 73, 82, 82, 65, 65, 82, 82],
            [55, 55, 65, 65, 55, 55, 73, 73, 55, 55, 65, 65, 55, 55, 73, 73],
            [65, 65, 73, 73, 82, 82, 73, 73, 65, 65, 82, 82, 98, 98, 82, 82],
            [55, 55, 65, 65, 55, 55, 73, 73, 55, 55, 65, 65, 73, 73, 65, 65],
            [82, 82, 98, 98, 110, 110, 98, 98, 82, 82, 110, 110, 131, 131, 110, 110]
        ];

        const idx = Math.min(levelIndex, patterns.length - 1);
        const melody = patterns[idx];
        const bass = bassPatterns[idx];
        const loopDuration = melody.length * beatDur;

        // Melody
        melody.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * beatDur);
            gain.gain.setValueAtTime(0, t + i * beatDur);
            gain.gain.linearRampToValueAtTime(0.08, t + i * beatDur + 0.02);
            gain.gain.setValueAtTime(0.08, t + i * beatDur + beatDur * 0.6);
            gain.gain.linearRampToValueAtTime(0, t + i * beatDur + beatDur * 0.95);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(t + i * beatDur);
            osc.stop(t + i * beatDur + beatDur);
            this.currentMusicNodes.push(osc);
        });

        // Bass
        bass.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * beatDur);
            gain.gain.setValueAtTime(0, t + i * beatDur);
            gain.gain.linearRampToValueAtTime(0.06, t + i * beatDur + 0.01);
            gain.gain.setValueAtTime(0.06, t + i * beatDur + beatDur * 0.5);
            gain.gain.linearRampToValueAtTime(0, t + i * beatDur + beatDur * 0.9);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(t + i * beatDur);
            osc.stop(t + i * beatDur + beatDur);
            this.currentMusicNodes.push(osc);
        });

        // Hi-hat (rhythm)
        for (let i = 0; i < melody.length * 2; i++) {
            const bufferSize = this.ctx.sampleRate * 0.03;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufferSize; j++) {
                data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
            }
            const noise = this.ctx.createBufferSource();
            const hpFilter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            noise.buffer = buffer;
            hpFilter.type = 'highpass';
            hpFilter.frequency.value = 8000;
            gain.gain.setValueAtTime(i % 2 === 0 ? 0.04 : 0.02, t + i * beatDur / 2);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * beatDur / 2 + 0.05);
            noise.connect(hpFilter);
            hpFilter.connect(gain);
            gain.connect(this.musicGain);
            noise.start(t + i * beatDur / 2);
            this.currentMusicNodes.push(noise);
        }

        // Schedule next loop
        this._musicTimeout = setTimeout(() => {
            this.currentMusicNodes = [];
            this._playMusicLoop(levelIndex);
        }, loopDuration * 1000 - 50);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this._musicTimeout) {
            clearTimeout(this._musicTimeout);
            this._musicTimeout = null;
        }
        this.currentMusicNodes.forEach(node => {
            try { node.stop(); } catch (e) {}
        });
        this.currentMusicNodes = [];
    }
}
