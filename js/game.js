/**
 * 遊戲主循環、狀態管理與音效模組 (Game Engine & State Management)
 */

import { GAME_CONFIG, SHAKE_CONFIG } from './config.js';
import { Player } from './player.js';
import { EnemyManager } from './enemy.js';

/**
 * Web Audio API 程序化音效引擎（無需任何外部音訊檔案）
 */
export class SoundEngine {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playCatch(comboCount = 1) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const now = this.ctx.currentTime;
            const baseFreq = 440 * Math.pow(1.12, Math.min(comboCount, 10));
            osc.type = comboCount >= 5 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    playBomb() {
        if (!this.enabled || !this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * 0.4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, this.ctx.currentTime);
            filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.4);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    playFrenzyStart() {
        if (!this.enabled || !this.ctx) return;
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                const now = this.ctx.currentTime + (idx * 0.06);
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            });
        } catch (e) {}
    }
}

export class Game {
    constructor() {
        // DOM 與畫布參照
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameWrapper = document.getElementById('gameWrapper');

        // UI 元素
        this.startOverlay = document.getElementById('startOverlay');
        this.gameOverOverlay = document.getElementById('gameOverOverlay');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.scoreValEl = document.getElementById('scoreVal');
        this.levelValEl = document.getElementById('levelVal');
        this.comboValEl = document.getElementById('comboVal');
        this.livesContainer = document.getElementById('livesContainer');
        this.finalScoreEl = document.getElementById('finalScore');
        this.highScoreEl = document.getElementById('highScore');
        this.soundToggle = document.getElementById('soundToggle');
        this.frenzyBarContainer = document.getElementById('frenzyBarContainer');
        this.frenzyFill = document.getElementById('frenzyFill');

        // 核心子模組
        this.soundEngine = new SoundEngine();
        this.player = new Player(this.canvas);
        this.enemyManager = new EnemyManager(this.canvas);

        // 狀態變數
        this.gameState = 'START';
        this.score = 0;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        this.level = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.frenzyTimeLeft = 0;
        this.highScore = parseInt(localStorage.getItem(GAME_CONFIG.HIGH_SCORE_STORAGE_KEY) || '0', 10);

        // 畫面震動
        this.screenShakeTime = 0;
        this.screenShakeIntensity = 0;

        // 時間記錄
        this.lastTimestamp = performance.now();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.startGame());
        this.soundToggle.addEventListener('click', () => this.toggleSound());

        this.updateLivesDisplay();
        this.startLoop();
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.player.onResize(this.gameState === 'START');
    }

    triggerScreenShake(intensity = 6, durationMs = 150) {
        this.screenShakeIntensity = intensity;
        this.screenShakeTime = durationMs;
    }

    toggleSound() {
        this.soundEngine.enabled = !this.soundEngine.enabled;
        this.soundToggle.innerHTML = this.soundEngine.enabled ? '<span>🔊 音效開</span>' : '<span>🔇 音效關</span>';
    }

    updateLivesDisplay() {
        this.livesContainer.innerHTML = '';
        for (let i = 0; i < GAME_CONFIG.INITIAL_LIVES; i++) {
            const heart = document.createElement('span');
            heart.className = `text-sm sm:text-base transition-all ${i < this.lives ? 'opacity-100 scale-100' : 'opacity-20 scale-75 grayscale'}`;
            heart.innerText = '❤️';
            this.livesContainer.appendChild(heart);
        }
    }

    startGame() {
        this.soundEngine.init();
        this.score = 0;
        this.lives = GAME_CONFIG.INITIAL_LIVES;
        this.level = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.frenzyTimeLeft = 0;

        this.player.reset(false);
        this.enemyManager.reset();

        this.scoreValEl.innerText = this.score;
        this.levelValEl.innerText = this.level;
        this.comboValEl.innerText = 'x1';
        this.frenzyBarContainer.classList.add('hidden');
        this.gameWrapper.classList.remove('frenzy-glow');
        this.updateLivesDisplay();

        this.startOverlay.classList.add('hidden');
        this.gameOverOverlay.classList.add('hidden');
        this.gameState = 'PLAYING';

        this.enemyManager.startSpawning(
            () => this.level,
            () => this.frenzyTimeLeft > 0
        );
    }

    gameOver() {
        this.gameState = 'GAMEOVER';
        this.enemyManager.stopSpawning();
        this.soundEngine.playBomb();
        this.triggerScreenShake(SHAKE_CONFIG.gameOver.intensity, SHAKE_CONFIG.gameOver.duration);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(GAME_CONFIG.HIGH_SCORE_STORAGE_KEY, this.highScore);
        }

        this.finalScoreEl.innerText = this.score;
        this.highScoreEl.innerText = this.highScore;
        this.gameOverOverlay.classList.remove('hidden');
        this.gameWrapper.classList.remove('frenzy-glow');
    }

    handleCollision(item) {
        if (item.config.type === 'bomb') {
            this.lives--;
            this.updateLivesDisplay();
            this.soundEngine.playBomb();
            this.triggerScreenShake(SHAKE_CONFIG.bomb.intensity, SHAKE_CONFIG.bomb.duration);
            this.enemyManager.addFloatText(item.x, item.y, '-1 ❤️ 💥', '#ef4444');
            this.enemyManager.spawnParticles(item.x, item.y, '#ef4444');
            this.combo = 0;
            this.comboValEl.innerText = 'x1';

            if (this.lives <= 0) {
                this.gameOver();
                return true; // 標記為遊戲結束
            }
            return false;
        } else {
            this.combo++;
            this.comboTimer = GAME_CONFIG.COMBO_TIMEOUT;
            this.comboValEl.innerText = `x${this.combo}`;

            const earnedPoints = item.config.points * this.combo;
            this.score += earnedPoints;
            this.scoreValEl.innerText = this.score;

            this.soundEngine.playCatch(this.combo);
            this.triggerScreenShake(SHAKE_CONFIG.catch.intensity, SHAKE_CONFIG.catch.duration);
            this.enemyManager.spawnParticles(item.x, item.y, item.config.glowColor);

            if (this.combo === 5 && this.frenzyTimeLeft <= 0) {
                this.frenzyTimeLeft = GAME_CONFIG.FRENZY_DURATION;
                this.frenzyBarContainer.classList.remove('hidden');
                this.gameWrapper.classList.add('frenzy-glow');
                this.soundEngine.playFrenzyStart();
                this.enemyManager.addFloatText(this.canvas.width / 2, this.canvas.height / 3, '⚡ FRENZY 狂熱模式！', '#06b6d4');
            } else {
                const suffix = this.combo > 1 ? ` (x${this.combo})` : '';
                this.enemyManager.addFloatText(item.x, item.y, `+${earnedPoints}${suffix}`, item.config.glowColor);
            }

            const newLevel = Math.floor(this.score / GAME_CONFIG.POINTS_PER_LEVEL) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.levelValEl.innerText = this.level;
                this.enemyManager.addFloatText(this.canvas.width / 2, this.canvas.height / 4, `LEVEL UP! Lv.${this.level}`, '#22d3ee');
            }
            return false;
        }
    }

    update(timestamp) {
        const dt = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        if (this.gameState !== 'PLAYING') return;

        // Combo 計時器
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.comboValEl.innerText = 'x1';
            }
        }

        // 狂熱模式計時器
        const isFrenzy = this.frenzyTimeLeft > 0;
        if (isFrenzy) {
            this.frenzyTimeLeft -= dt;
            const pct = (this.frenzyTimeLeft / GAME_CONFIG.FRENZY_DURATION) * 100;
            this.frenzyFill.style.width = `${Math.max(0, pct)}%`;
            if (this.frenzyTimeLeft <= 0) {
                this.frenzyBarContainer.classList.add('hidden');
                this.gameWrapper.classList.remove('frenzy-glow');
            }
        }

        // 畫面震動計時器
        if (this.screenShakeTime > 0) {
            this.screenShakeTime -= dt * 1000;
        }

        // 更新玩家
        this.player.update(isFrenzy);

        // 更新掉落物並檢測碰撞
        this.enemyManager.update(
            dt,
            this.player.getHitbox(),
            {
                onHit: (item) => this.handleCollision(item)
            }
        );
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        if (this.screenShakeTime > 0) {
            const offsetX = (Math.random() - 0.5) * this.screenShakeIntensity;
            const offsetY = (Math.random() - 0.5) * this.screenShakeIntensity;
            this.ctx.translate(offsetX, offsetY);
        }

        // 繪製背景網格線
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }

        // 繪製玩家籃子
        this.player.draw(this.ctx, this.frenzyTimeLeft > 0);

        // 繪製掉落物、粒子與浮動文字
        this.enemyManager.draw(this.ctx);

        this.ctx.restore();
    }

    startLoop() {
        const loop = (timestamp) => {
            this.update(timestamp);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}
