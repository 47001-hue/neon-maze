// ============================================================
// NEON MAZE — Input Manager (Keyboard + Touch/Mobile)
// ============================================================

class InputManager {
    constructor() {
        this.keys = {};
        this.direction = { x: 0, y: 0 };
        this.queuedDirection = null;
        this.touchActive = false;
        this.joystickAngle = 0;
        this.joystickActive = false;
        this.joystickBase = { x: 0, y: 0 };
        this.joystickKnob = { x: 0, y: 0 };
        this.joystickRadius = 50;
        this.isMobile = false;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    init() {
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);

        // Mobile detection
        this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (this.isMobile) {
            this._setupMobileControls();
        }

        window.addEventListener('resize', this._onResize);
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('resize', this._onResize);
    }

    _onKeyDown(e) {
        this.keys[e.code] = true;

        // Prevent page scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        // Update direction immediately
        this._updateDirectionFromKeys();
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
        this._updateDirectionFromKeys();
    }

    _updateDirectionFromKeys() {
        let dir = null;

        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            dir = { x: 0, y: -1 };
        } else if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            dir = { x: 0, y: 1 };
        } else if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            dir = { x: -1, y: 0 };
        } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            dir = { x: 1, y: 0 };
        }

        if (dir) {
            this.queuedDirection = dir;
        }
    }

    _setupMobileControls() {
        const joystickArea = document.getElementById('joystickArea');
        if (!joystickArea) return;

        joystickArea.style.display = 'block';

        joystickArea.addEventListener('touchstart', this._onTouchStart, { passive: false });
        joystickArea.addEventListener('touchmove', this._onTouchMove, { passive: false });
        joystickArea.addEventListener('touchend', this._onTouchEnd, { passive: false });
    }

    _onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.joystickActive = true;
        this.joystickBase = { x: touch.clientX, y: touch.clientY };
        this.joystickKnob = { x: touch.clientX, y: touch.clientY };
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (!this.joystickActive) return;
        const touch = e.touches[0];
        const dx = touch.clientX - this.joystickBase.x;
        const dy = touch.clientY - this.joystickBase.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.joystickRadius;

        if (dist > maxDist) {
            this.joystickKnob = {
                x: this.joystickBase.x + (dx / dist) * maxDist,
                y: this.joystickBase.y + (dy / dist) * maxDist
            };
        } else {
            this.joystickKnob = { x: touch.clientX, y: touch.clientY };
        }

        // Convert to 4-directional input
        if (dist > 15) {
            const angle = Math.atan2(dy, dx);
            // Snap to 4 directions
            if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
                this.queuedDirection = { x: 1, y: 0 }; // Right
            } else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) {
                this.queuedDirection = { x: 0, y: 1 }; // Down
            } else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4) {
                this.queuedDirection = { x: 0, y: -1 }; // Up
            } else {
                this.queuedDirection = { x: -1, y: 0 }; // Left
            }
        }
    }

    _onTouchEnd(e) {
        e.preventDefault();
        this.joystickActive = false;
    }

    _onResize() {
        this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }

    isKeyPressed(code) {
        return !!this.keys[code];
    }

    consumeDirection() {
        const dir = this.queuedDirection;
        return dir;
    }

    getDirection() {
        return this.queuedDirection;
    }

    clearQueue() {
        this.queuedDirection = null;
    }

    renderJoystick(ctx, canvasRect) {
        if (!this.isMobile || !this.joystickActive) return;

        const baseX = this.joystickBase.x - canvasRect.left;
        const baseY = this.joystickBase.y - canvasRect.top;
        const knobX = this.joystickKnob.x - canvasRect.left;
        const knobY = this.joystickKnob.y - canvasRect.top;

        // Base circle
        ctx.beginPath();
        ctx.arc(baseX, baseY, this.joystickRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Knob
        ctx.beginPath();
        ctx.arc(knobX, knobY, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
