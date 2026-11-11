/**
 * 獨立子彈與散射動效系統模組 (Independent Bullet & Spread VFX System)
 * 視覺動效專用：提供扇形散射、絢麗霓虹曳尾、衝擊光圈與精緻微粒子特效
 */

// 絢麗霓虹色票定義（依扇形角度漸層分佈）
const BULLET_PALETTES = [
    {
        name: 'violet',
        glow: '#c084fc',
        core: '#ffffff',
        trailStart: 'rgba(192, 132, 252, 0.95)',
        trailEnd: 'rgba(147, 51, 234, 0)',
        spark: '#e9d5ff'
    },
    {
        name: 'neon-blue',
        glow: '#38bdf8',
        core: '#ffffff',
        trailStart: 'rgba(56, 189, 248, 0.95)',
        trailEnd: 'rgba(2, 132, 199, 0)',
        spark: '#bae6fd'
    },
    {
        name: 'cyber-cyan',
        glow: '#22d3ee',
        core: '#ffffff',
        trailStart: 'rgba(34, 211, 238, 0.95)',
        trailEnd: 'rgba(8, 145, 178, 0)',
        spark: '#cffafe'
    },
    {
        name: 'mint-emerald',
        glow: '#34d399',
        core: '#ffffff',
        trailStart: 'rgba(52, 211, 153, 0.95)',
        trailEnd: 'rgba(5, 150, 105, 0)',
        spark: '#a7f3d0'
    },
    {
        name: 'solar-amber',
        glow: '#fbbf24',
        core: '#ffffff',
        trailStart: 'rgba(251, 191, 36, 0.95)',
        trailEnd: 'rgba(217, 119, 6, 0)',
        spark: '#fef08a'
    },
    {
        name: 'laser-pink',
        glow: '#f43f5e',
        core: '#ffffff',
        trailStart: 'rgba(244, 63, 94, 0.95)',
        trailEnd: 'rgba(190, 18, 60, 0)',
        spark: '#fecdd3'
    }
];

class Bullet {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.speed = 0;
        this.radius = 4;
        this.palette = BULLET_PALETTES[0];
        this.trail = []; // [{x, y, alpha, width}]
        this.maxTrailLength = 14;
        this.active = false;
        this.lifetime = 0;
        this.maxLifetime = 2.5; // 秒
    }

    init(x, y, angleRad, speed, palette) {
        this.x = x;
        this.y = y;
        this.angle = angleRad;
        this.speed = speed;
        this.vx = Math.cos(angleRad) * speed;
        this.vy = Math.sin(angleRad) * speed;
        this.palette = palette;
        this.trail = [{ x, y }];
        this.active = true;
        this.lifetime = 0;
    }

    update(dt) {
        if (!this.active) return;

        this.lifetime += dt;
        if (this.lifetime >= this.maxLifetime) {
            this.active = false;
            return;
        }

        // 紀錄過去軌跡節點以形成平滑曳尾
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 飛出畫面頂端或兩側超出範圍時銷毀
        if (this.y < -60 || this.x < -60 || this.x > 2000) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active || this.trail.length < 2) return;

        ctx.save();

        // 1. 繪製流體發光曳尾 (Additive blending 霓虹流光效果)
        ctx.globalCompositeOperation = 'lighter';

        // 雙層繪製：外層柔光光暈 + 內層銳利光束
        for (let pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);

            for (let i = 1; i < this.trail.length; i++) {
                const pt = this.trail[i];
                ctx.lineTo(pt.x, pt.y);
            }

            const isGlowPass = pass === 0;
            const grad = ctx.createLinearGradient(
                this.x, this.y,
                this.trail[this.trail.length - 1].x,
                this.trail[this.trail.length - 1].y
            );

            grad.addColorStop(0, this.palette.trailStart);
            grad.addColorStop(1, this.palette.trailEnd);

            ctx.strokeStyle = grad;
            ctx.lineWidth = isGlowPass ? 6.5 : 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (isGlowPass) {
                ctx.shadowColor = this.palette.glow;
                ctx.shadowBlur = 14;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.stroke();
        }

        // 2. 繪製子彈主體（高亮度發光能量膠囊）
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 外層霓虹光環
        ctx.shadowColor = this.palette.glow;
        ctx.shadowBlur = 16;
        ctx.fillStyle = this.palette.glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 核心亮白高光
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = this.palette.core;
        ctx.beginPath();
        ctx.ellipse(2, 0, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class VisualParticle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.alpha = 1;
        this.decay = 0.03;
        this.size = 3;
        this.color = '#fff';
        this.active = false;
    }

    init(x, y, vx, vy, size, color, decay = 0.03) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.alpha = 1;
        this.decay = decay;
        this.active = true;
    }

    update(dt) {
        if (!this.active) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.alpha -= this.decay * (dt * 60);
        this.size = Math.max(0.2, this.size - 0.05 * (dt * 60));
        if (this.alpha <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class MuzzleFlash {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.maxRadius = 26;
        this.alpha = 1;
        this.color = '#22d3ee';
        this.active = false;
    }

    init(x, y, color = '#22d3ee') {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.alpha = 1;
        this.color = color;
        this.active = true;
    }

    update(dt) {
        if (!this.active) return;
        this.radius += 110 * dt;
        this.alpha -= 5 * dt;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

export class BulletSystem {
    constructor() {
        // 物件池管理
        this.bullets = [];
        this.particles = [];
        this.flashes = [];
        this.maxBullets = 150;
        this.maxParticles = 200;

        // 連續發射狀態與扇形散射參數
        this.fireCount = 0;
        this.lastFireTime = 0;
        this.baseSpeed = 760; // 像素/秒

        // 預建立物件池防止垃圾回收 (GC) 抖動
        for (let i = 0; i < this.maxBullets; i++) {
            this.bullets.push(new Bullet());
        }
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(new VisualParticle());
        }
        for (let i = 0; i < 20; i++) {
            this.flashes.push(new MuzzleFlash());
        }

        this.lastTimestamp = performance.now();
        this.audioCtx = null;
    }

    static getInstance() {
        if (!BulletSystem._instance) {
            BulletSystem._instance = new BulletSystem();
        }
        return BulletSystem._instance;
    }

    static fire(playerX, playerY) {
        return BulletSystem.getInstance().fire(playerX, playerY);
    }

    static update(ctx) {
        return BulletSystem.getInstance().update(ctx);
    }

    getBullet() {
        const b = this.bullets.find(item => !item.active);
        if (b) return b;
        const newB = new Bullet();
        this.bullets.push(newB);
        return newB;
    }

    getParticle() {
        const p = this.particles.find(item => !item.active);
        if (p) return p;
        const newP = new VisualParticle();
        this.particles.push(newP);
        return newP;
    }

    getFlash() {
        const f = this.flashes.find(item => !item.active);
        if (f) return f;
        const newF = new MuzzleFlash();
        this.flashes.push(newF);
        return newF;
    }

    /**
     * 播放程序化合成射擊音效 (Web Audio API)
     */
    playLaserSFX() {
        try {
            if (!this.audioCtx) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    this.audioCtx = new AudioCtxClass();
                }
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const now = this.audioCtx.currentTime;

            osc.type = 'sawtooth';
            // 疾速滑音 (880Hz -> 180Hz)
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {
            // 忽略音訊限制錯誤
        }
    }

    /**
     * 發射子彈：連續射擊時呈現優美的扇形散射 (Fan Spread)
     * @param {number} playerX 玩家中心 X 座標
     * @param {number} playerY 玩家頂部 Y 座標
     */
    fire(playerX, playerY) {
        if (typeof playerX !== 'number' || typeof playerY !== 'number') {
            playerX = window.innerWidth / 2;
            playerY = window.innerHeight - 80;
        }

        const now = performance.now();
        this.fireCount++;
        this.lastFireTime = now;

        // 扇形散射角度計算（以向上 -90 度為基準軸心）
        // 連續發射時，在 5 條主散射光束與交錯呼吸微偏角間律動
        const waveOffset = Math.sin(this.fireCount * 0.4) * 3; // 動態呼吸偏角 ±3 度
        const fanSpreadAngles = [-24, -12, 0, 12, 24]; // 基礎 5 束扇形散角 (度)

        // 開火處槍口霓虹光圈與微火花
        const flash = this.getFlash();
        const mainColor = BULLET_PALETTES[this.fireCount % BULLET_PALETTES.length].glow;
        flash.init(playerX, playerY, mainColor);

        for (let i = 0; i < 6; i++) {
            const p = this.getParticle();
            const pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            const pSpeed = Math.random() * 120 + 40;
            p.init(
                playerX, playerY,
                Math.cos(pAngle) * pSpeed,
                Math.sin(pAngle) * pSpeed,
                Math.random() * 3 + 1.5,
                mainColor,
                0.05
            );
        }

        // 生成扇形散射子彈群，依角度分配對應彩虹霓虹色票
        fanSpreadAngles.forEach((deg, idx) => {
            const totalDeg = -90 + deg + (deg !== 0 ? waveOffset : 0);
            const rad = (totalDeg * Math.PI) / 180;
            const palette = BULLET_PALETTES[idx % BULLET_PALETTES.length];

            const bullet = this.getBullet();
            // 稍微讓兩側子彈速度略高，形成更舒展的扇面弧線
            const speed = this.baseSpeed + Math.abs(deg) * 2.2;
            bullet.init(playerX, playerY - 4, rad, speed, palette);
        });

        this.playLaserSFX();
    }

    /**
     * 檢測子彈與遊戲掉落物/障礙物之碰撞擊中
     */
    checkCollisions() {
        if (typeof window === 'undefined' || !window.game || !window.game.enemyManager) return;
        const enemyManager = window.game.enemyManager;
        const items = enemyManager.activeItems;
        if (!items || items.length === 0) return;

        for (let b of this.bullets) {
            if (!b.active) continue;

            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i];
                if (!item.active) continue;

                const dx = b.x - item.x;
                const dy = b.y - item.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < (item.radius || 22) + b.radius + 6) {
                    // 命中敵人/掉落物！
                    b.active = false;

                    // 產生絢麗擊中爆炸火花群
                    for (let k = 0; k < 12; k++) {
                        const p = this.getParticle();
                        const pAngle = Math.random() * Math.PI * 2;
                        const pSpeed = Math.random() * 220 + 60;
                        p.init(
                            b.x, b.y,
                            Math.cos(pAngle) * pSpeed,
                            Math.sin(pAngle) * pSpeed,
                            Math.random() * 4 + 2,
                            b.palette.glow,
                            0.04
                        );
                    }

                    // 觸發擊中衝擊波光圈
                    const flash = this.getFlash();
                    flash.init(b.x, b.y, b.palette.glow);

                    // 連動遊戲消除掉落物並獎勵加分
                    if (typeof enemyManager.spawnParticles === 'function') {
                        enemyManager.spawnParticles(item.x, item.y, b.palette.glow);
                    }
                    if (typeof enemyManager.addFloatText === 'function') {
                        enemyManager.addFloatText(item.x, item.y, '+100 HIT!', b.palette.glow);
                    }

                    if (window.game.scoreValEl) {
                        window.game.score = (window.game.score || 0) + 100;
                        window.game.scoreValEl.innerText = window.game.score;
                    }

                    // 移除被擊破的掉落物
                    item.active = false;
                    items.splice(i, 1);
                    if (enemyManager.itemPool) {
                        enemyManager.itemPool.release(item);
                    }
                    break;
                }
            }
        }
    }

    /**
     * 更新動態物理並於畫布繪製動效 (Update & Render)
     * @param {CanvasRenderingContext2D} ctx 畫布上下文
     */
    update(ctx) {
        const now = performance.now();
        const dt = Math.min((now - this.lastTimestamp) / 1000, 0.05);
        this.lastTimestamp = now;

        // 1. 更新子彈軌跡與狀態
        for (let b of this.bullets) {
            if (b.active) {
                b.update(dt);
                // 飛行過程產生少量飄渺微粒子
                if (Math.random() < 0.45) {
                    const p = this.getParticle();
                    p.init(
                        b.x + (Math.random() - 0.5) * 4,
                        b.y + (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 20,
                        (Math.random() - 0.5) * 20,
                        Math.random() * 2.5 + 1,
                        b.palette.spark,
                        0.07
                    );
                }
            }
        }

        // 2. 更新微粒子
        for (let p of this.particles) {
            if (p.active) {
                p.update(dt);
            }
        }

        // 3. 更新光圈
        for (let f of this.flashes) {
            if (f.active) {
                f.update(dt);
            }
        }

        // 4. 碰撞檢測
        this.checkCollisions();

        // 5. 渲染至畫布
        if (ctx && typeof ctx.save === 'function') {
            this.draw(ctx);
        }
    }

    /**
     * 獨立繪製方法
     */
    draw(ctx) {
        if (!ctx) return;

        // 繪製開火光圈與衝擊波
        for (let f of this.flashes) {
            if (f.active) {
                f.draw(ctx);
            }
        }

        // 繪製拖曳微粒子
        for (let p of this.particles) {
            if (p.active) {
                p.draw(ctx);
            }
        }

        // 繪製子彈本體與曳尾
        for (let b of this.bullets) {
            if (b.active) {
                b.draw(ctx);
            }
        }
    }

    clear() {
        this.bullets.forEach(b => b.reset());
        this.particles.forEach(p => p.reset());
        this.flashes.forEach(f => f.reset());
    }
}

// 支援全域掛載與 ES 模組匯出
if (typeof window !== 'undefined') {
    window.BulletSystem = BulletSystem;
}

export default BulletSystem;
