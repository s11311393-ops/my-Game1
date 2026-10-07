/**
 * 玩家控制與籃子狀態模組 (Player / Basket Module)
 */

import { BASKET_CONFIG } from './config.js';

export class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.w = BASKET_CONFIG.width;
        this.h = BASKET_CONFIG.height;
        this.speed = BASKET_CONFIG.speed;
        this.bottomOffset = BASKET_CONFIG.bottomOffset;
        this.lerpFactor = BASKET_CONFIG.lerpFactor;

        this.x = 0;
        this.y = 0;
        this.targetX = 0;

        this.keys = { ArrowLeft: false, ArrowRight: false, KeyA: false, KeyD: false };
        this.isPointerDown = false;

        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            this.isPointerDown = true;
            this.updatePointerX(e);
        });

        this.canvas.addEventListener('pointermove', (e) => {
            if (this.isPointerDown) {
                this.updatePointerX(e);
            }
        });

        this.canvas.addEventListener('pointerup', () => {
            this.isPointerDown = false;
        });

        this.canvas.addEventListener('pointercancel', () => {
            this.isPointerDown = false;
        });
    }

    updatePointerX(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        this.targetX = clientX - this.w / 2;
    }

    reset(center = true) {
        this.y = this.canvas.height - this.bottomOffset;
        if (center) {
            this.x = this.canvas.width / 2 - this.w / 2;
            this.targetX = this.x;
        }
    }

    onResize(isStartScreen = false) {
        this.y = this.canvas.height - this.bottomOffset;
        if (isStartScreen) {
            this.x = this.canvas.width / 2 - this.w / 2;
            this.targetX = this.x;
        }
    }

    update(frenzyActive = false) {
        const speedBoost = frenzyActive ? 1.2 : 1.0;
        const currentBasketSpeed = this.speed * speedBoost;

        if (this.keys.ArrowLeft || this.keys.KeyA) {
            this.targetX -= currentBasketSpeed;
        }
        if (this.keys.ArrowRight || this.keys.KeyD) {
            this.targetX += currentBasketSpeed;
        }

        this.targetX = Math.max(0, Math.min(this.canvas.width - this.w, this.targetX));
        this.x += (this.targetX - this.x) * this.lerpFactor;
    }

    getHitbox() {
        return {
            x: this.x + 6,
            y: this.y + 4,
            w: this.w - 12,
            h: this.h - 8
        };
    }

    draw(ctx, frenzyActive = false) {
        ctx.save();
        ctx.shadowColor = frenzyActive ? '#06b6d4' : 'rgba(99, 102, 241, 0.7)';
        ctx.shadowBlur = frenzyActive ? 25 : 18;

        const basketGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
        basketGradient.addColorStop(0, frenzyActive ? '#22d3ee' : '#818cf8');
        basketGradient.addColorStop(1, frenzyActive ? '#0284c7' : '#4f46e5');
        ctx.fillStyle = basketGradient;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, [10, 10, 22, 22]);
        ctx.fill();

        ctx.fillStyle = frenzyActive ? '#cffafe' : '#c7d2fe';
        ctx.beginPath();
        ctx.roundRect(this.x - 5, this.y - 5, this.w + 10, 9, 5);
        ctx.fill();
        ctx.restore();
    }
}
