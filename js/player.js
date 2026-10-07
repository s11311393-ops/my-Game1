/**
 * 玩家控制、精靈圖切割播放與狀態模組 (Player & Sprite Animation Module)
 */

import { BASKET_CONFIG } from './config.js';

export class Player {
    constructor(canvas, assetManager = null) {
        this.canvas = canvas;
        this.assetManager = assetManager;

        // 物理與幾何屬性（嚴格維持原始數值與手感）
        this.w = BASKET_CONFIG.width;
        this.h = BASKET_CONFIG.height;
        this.speed = BASKET_CONFIG.speed;
        this.bottomOffset = BASKET_CONFIG.bottomOffset;
        this.lerpFactor = BASKET_CONFIG.lerpFactor;

        this.x = 0;
        this.y = 0;
        this.targetX = 0;

        // 輸入監聽狀態
        this.keys = { ArrowLeft: false, ArrowRight: false, KeyA: false, KeyD: false };
        this.isPointerDown = false;

        // 精靈圖動畫系統
        this.state = 'idle';           // 'idle' | 'run' | 'attack'
        this.facing = 1;               // 1: 朝右, -1: 朝左（鏡像反轉）
        this.frameIndex = 0;
        this.animTimer = 0;
        this.idleFrameSpeed = 0.16;    // 待機每幀秒數
        this.runFrameSpeed = 0.10;     // 移動每幀秒數
        this.catchAnimationTimer = 0;  // 接到水果時的攻擊/回饋動作計時

        // 精靈圖規格（96x96 / 4 欄 x 2 列）
        this.frameWidth = 96;
        this.frameHeight = 96;
        this.cols = 4;

        this.bindEvents();
    }

    setAssetManager(assetManager) {
        this.assetManager = assetManager;
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
        this.state = 'idle';
        this.facing = 1;
        this.frameIndex = 0;
        this.animTimer = 0;
        this.catchAnimationTimer = 0;
    }

    onResize(isStartScreen = false) {
        this.y = this.canvas.height - this.bottomOffset;
        if (isStartScreen) {
            this.x = this.canvas.width / 2 - this.w / 2;
            this.targetX = this.x;
        }
    }

    triggerCatch() {
        this.catchAnimationTimer = 0.22;
        this.frameIndex = 1; // 躍動反饋幀
    }

    update(dt = 0.016, frenzyActive = false) {
        const speedBoost = frenzyActive ? 1.2 : 1.0;
        const currentBasketSpeed = this.speed * speedBoost;

        let movingLeft = false;
        let movingRight = false;

        if (this.keys.ArrowLeft || this.keys.KeyA) {
            this.targetX -= currentBasketSpeed;
            movingLeft = true;
        }
        if (this.keys.ArrowRight || this.keys.KeyD) {
            this.targetX += currentBasketSpeed;
            movingRight = true;
        }

        // 觸控拖曳移動判定
        if (this.isPointerDown) {
            if (this.targetX < this.x - 2) movingLeft = true;
            else if (this.targetX > this.x + 2) movingRight = true;
        }

        this.targetX = Math.max(0, Math.min(this.canvas.width - this.w, this.targetX));
        const prevX = this.x;
        this.x += (this.targetX - this.x) * this.lerpFactor;
        const deltaX = this.x - prevX;

        // 決定面向（支援左右鏡像轉向）
        if (movingLeft || deltaX < -0.8) {
            this.facing = -1;
        } else if (movingRight || deltaX > 0.8) {
            this.facing = 1;
        }

        // 決定動作狀態 (Idle / Run / Attack)
        if (this.catchAnimationTimer > 0) {
            this.catchAnimationTimer -= dt;
            this.state = 'attack';
        } else if (movingLeft || movingRight || Math.abs(deltaX) > 0.8) {
            this.state = 'run';
        } else {
            this.state = 'idle';
        }

        // 播放幀累計與推進
        const frameSpeed = this.state === 'run' ? this.runFrameSpeed : this.idleFrameSpeed;
        this.animTimer += dt;
        if (this.animTimer >= frameSpeed) {
            this.animTimer = 0;
            this.frameIndex = (this.frameIndex + 1) % this.cols;
        }
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
        const playerImg = this.assetManager ? this.assetManager.getImage('player') : null;

        if (playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
            // === drawImage 動態精靈圖多幀切分播放 ===
            // Row 0: Idle, Row 1: Run/Attack
            const rowIndex = (this.state === 'idle') ? 0 : 1;
            const sx = this.frameIndex * this.frameWidth;
            const sy = rowIndex * this.frameHeight;

            ctx.save();

            // 狂熱模式發光光暈
            if (frenzyActive) {
                ctx.shadowColor = '#06b6d4';
                ctx.shadowBlur = 25;
            }

            // 以籃子中心點作為原點，進行左右轉向鏡像反轉 scale(facing, 1)
            const centerX = this.x + this.w / 2;
            const centerY = this.y + this.h / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(this.facing, 1);

            // 比例對齊：精靈圖中的籃子寬 80px 對齊物理籃子 100px (縮放比 1.25)
            const scale = this.w / 80;
            const drawW = this.frameWidth * scale;   // 120px
            const drawH = this.frameHeight * scale;  // 120px
            // 精靈圖中籃子中心位於 (48, 69)
            const drawX = -48 * scale;
            const drawY = -69 * scale;

            ctx.drawImage(
                playerImg,
                sx, sy, this.frameWidth, this.frameHeight,
                drawX, drawY, drawW, drawH
            );

            ctx.restore();
        } else {
            // === 容錯備援：若貼圖載入中或失效，自動渲染高品質向量籃子 ===
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
}
