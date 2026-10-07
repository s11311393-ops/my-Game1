/**
 * 掉落物/障礙物/敵人生成與碰撞邏輯模組 (Item / Obstacle / Enemy Manager)
 */

import { GAME_CONFIG, ITEM_TYPES, POOL_CONFIG } from './config.js';

/**
 * 記憶體物件池 (Object Pool)
 */
export class ObjectPool {
    constructor(createFn, resetFn, initialSize = 30) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    acquire() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }

    release(obj) {
        this.resetFn(obj);
        this.pool.push(obj);
    }
}

export class EnemyManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.spawnTimer = null;

        this.activeItems = [];
        this.activeParticles = [];
        this.activeFloatTexts = [];

        // 掉落物物件池
        this.itemPool = new ObjectPool(
            () => ({ x: 0, y: 0, radius: 22, speed: 3, config: null, rotation: 0, rotSpeed: 0, active: false }),
            (item) => { item.active = false; },
            POOL_CONFIG.items
        );

        // 幾何粒子物件池
        this.particlePool = new ObjectPool(
            () => ({ x: 0, y: 0, vx: 0, vy: 0, alpha: 1, color: '#fff', size: 4, shape: 'square', active: false }),
            (p) => { p.active = false; },
            POOL_CONFIG.particles
        );

        // 浮動文字物件池
        this.floatTextPool = new ObjectPool(
            () => ({ x: 0, y: 0, text: '', color: '#fff', alpha: 1, vy: -1.5, active: false }),
            (ft) => { ft.active = false; },
            POOL_CONFIG.floatTexts
        );
    }

    startSpawning(getLevelFn, getFrenzyFn) {
        this.stopSpawning();
        this.scheduleNextSpawn(getLevelFn, getFrenzyFn);
    }

    stopSpawning() {
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
            this.spawnTimer = null;
        }
    }

    scheduleNextSpawn(getLevelFn, getFrenzyFn) {
        const level = getLevelFn();
        const frenzyActive = getFrenzyFn();

        // 效能優化：限制畫面上的最大掉落物數量（超過 8 個時暫緩生成，防止卡頓）
        if (this.activeItems.length < GAME_CONFIG.MAX_ACTIVE_ITEMS) {
            this.spawnItem(level, frenzyActive);
        }

        // 超過 Lv.5 以後，生成間隔維持不變，僅靠掉落速度提升難度，徹底解決卡頓問題
        const effectiveLevel = Math.min(level, GAME_CONFIG.MAX_SPAWN_DIFFICULTY_LEVEL);
        const frenzyMult = frenzyActive ? 0.75 : 1.0;
        const delay = Math.max(300, (1000 - (effectiveLevel * 100))) * frenzyMult;

        this.spawnTimer = setTimeout(() => {
            this.scheduleNextSpawn(getLevelFn, getFrenzyFn);
        }, delay + Math.random() * 200);
    }

    spawnItem(level, frenzyActive) {
        const rand = Math.random();
        let cumulative = 0;
        let selectedType = ITEM_TYPES[0];

        for (let t of ITEM_TYPES) {
            cumulative += t.prob;
            if (rand <= cumulative) {
                selectedType = t;
                break;
            }
        }

        const item = this.itemPool.acquire();
        item.active = true;
        item.radius = selectedType.radius;
        item.x = Math.random() * (this.canvas.width - item.radius * 2.5) + item.radius * 1.25;
        item.y = -50;

        // 核心優化：Lv.1~5 隨等級提升基礎速度，Lv.5 後維持掉落物數量，但速度持續累加（每級 +0.7）
        const baseSpeed = GAME_CONFIG.BASE_ITEM_SPEED + (level * GAME_CONFIG.SPEED_PER_LEVEL);
        const frenzyBoost = frenzyActive ? 1.2 : 1.0;
        item.speed = (baseSpeed + Math.random() * 1.2) * frenzyBoost;
        item.config = selectedType;
        item.rotation = Math.random() * Math.PI;
        item.rotSpeed = (Math.random() - 0.5) * 0.04;

        this.activeItems.push(item);
    }

    spawnParticles(x, y, color) {
        const count = Math.floor(Math.random() * 5) + 12; // 12-16 geometric particles
        for (let i = 0; i < count; i++) {
            const p = this.particlePool.acquire();
            p.active = true;
            p.x = x;
            p.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 7 + 2;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed - 1.5;
            p.alpha = 1;
            p.color = color;
            p.size = Math.random() * 5 + 3;
            p.shape = Math.random() > 0.5 ? 'square' : 'circle';
            this.activeParticles.push(p);
        }
    }

    addFloatText(x, y, text, color) {
        const ft = this.floatTextPool.acquire();
        ft.active = true;
        ft.x = x;
        ft.y = y;
        ft.text = text;
        ft.color = color;
        ft.alpha = 1;
        ft.vy = -1.8;
        this.activeFloatTexts.push(ft);
    }

    update(dt, playerHitbox, collisionCallbacks) {
        // 更新掉落物並檢測碰撞
        for (let i = this.activeItems.length - 1; i >= 0; i--) {
            const item = this.activeItems[i];
            item.y += item.speed;
            item.rotation += item.rotSpeed;

            // 碰撞檢測
            if (
                item.x + item.radius >= playerHitbox.x &&
                item.x - item.radius <= playerHitbox.x + playerHitbox.w &&
                item.y + item.radius >= playerHitbox.y &&
                item.y - item.radius <= playerHitbox.y + playerHitbox.h
            ) {
                const isGameOver = collisionCallbacks.onHit(item);

                this.itemPool.release(item);
                this.activeItems.splice(i, 1);

                if (isGameOver) {
                    return; // 遊戲結束立即終止本幀後續物品碰撞處理
                }
                continue;
            }

            // 超出畫面下方移除
            if (item.y > this.canvas.height + 60) {
                this.itemPool.release(item);
                this.activeItems.splice(i, 1);
            }
        }

        // 更新幾何粒子
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.alpha -= 0.035;
            if (p.alpha <= 0) {
                this.particlePool.release(p);
                this.activeParticles.splice(i, 1);
            }
        }

        // 更新浮動文字
        for (let i = this.activeFloatTexts.length - 1; i >= 0; i--) {
            const ft = this.activeFloatTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.025;
            if (ft.alpha <= 0) {
                this.floatTextPool.release(ft);
                this.activeFloatTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // 繪製掉落物 (果實 / 星星 / 炸彈)
        this.activeItems.forEach((item) => {
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate(item.rotation);

            ctx.shadowColor = item.config.glowColor;
            ctx.shadowBlur = item.config.type === 'bomb' ? 25 : 18;

            ctx.fillStyle = item.config.bgColor;
            ctx.beginPath();
            ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = item.config.glowColor;
            ctx.lineWidth = item.config.type === 'bomb' ? 4 : 3;
            ctx.stroke();

            ctx.font = `${item.radius * 1.3}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.config.symbol, 0, 0);

            // 炸彈引信閃爍亮點
            if (item.config.type === 'bomb') {
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.arc(item.radius * 0.6, -item.radius * 0.6, 5 + Math.sin(Date.now() * 0.02) * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });

        // 繪製爆炸粒子
        this.activeParticles.forEach((p) => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            if (p.shape === 'square') {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // 繪製浮動得分/提示文字
        this.activeFloatTexts.forEach((ft) => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.font = 'bold 15px "Press Start 2P", monospace';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
    }

    reset() {
        this.stopSpawning();
        this.activeItems.forEach((i) => this.itemPool.release(i));
        this.activeParticles.forEach((p) => this.particlePool.release(p));
        this.activeFloatTexts.forEach((ft) => this.floatTextPool.release(ft));
        this.activeItems = [];
        this.activeParticles = [];
        this.activeFloatTexts = [];
    }
}
