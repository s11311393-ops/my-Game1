/**
 * 資源預加載與音訊管理系統 (Asset Preloader & Audio System)
 */

export class AssetManager {
    constructor() {
        this.images = {};
        this.sfxPool = {};
        this.bgm = null;
        this.isBgmMuted = false;
        this.isSfxMuted = false;
        this.userInteracted = false;
        this.audioCtx = null;
        this.sfxBuffers = {};
    }

    /**
     * 預加載所有圖像與音訊資源
     */
    async preload() {
        const imageList = [
            { key: 'player', src: './assets/images/player.png' },
            { key: 'background', src: './assets/images/background.png' }
        ];

        const audioList = [
            { key: 'point', src: './assets/audio/point.wav', fallback: './assets/audio/point.mp3' },
            { key: 'hit', src: './assets/audio/hit.wav', fallback: './assets/audio/hit.mp3' }
        ];

        // 載入圖片 Promise 列表
        const imagePromises = imageList.map(item => this.loadImage(item.key, item.src));

        // 初始化背景音樂
        this.initBGM('./assets/audio/bgm.mp3');

        // 載入音效
        const audioPromises = audioList.map(item => this.loadSFX(item.key, item.src, item.fallback));

        await Promise.allSettled([...imagePromises, ...audioPromises]);
        return this;
    }

    loadImage(key, src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`[AssetManager] 無法載入圖片: ${src}，將使用預設渲染。`);
                this.images[key] = null;
                resolve(null);
            };
            img.src = src;
        });
    }

    initBGM(src) {
        try {
            this.bgm = new Audio(src);
            this.bgm.loop = true;
            this.bgm.volume = 0.45;
            this.bgm.preload = 'auto';
        } catch (e) {
            console.warn('[AssetManager] BGM 初始化失敗:', e);
        }
    }

    async loadSFX(key, src, fallbackSrc) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!this.audioCtx) {
                this.audioCtx = new AudioContext();
            }

            let response;
            try {
                response = await fetch(src);
                if (!response.ok) throw new Error('Fetch failed');
            } catch {
                if (fallbackSrc) {
                    response = await fetch(fallbackSrc);
                }
            }

            if (response && response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                this.audioCtx.decodeAudioData(
                    arrayBuffer,
                    (decoded) => {
                        this.sfxBuffers[key] = decoded;
                    },
                    (err) => {
                        console.warn(`[AssetManager] 音訊解碼失敗 ${key}:`, err);
                    }
                );
            }
        } catch (e) {
            console.warn(`[AssetManager] 無法載入音效 ${key}:`, e);
        }
    }

    /**
     * 處理瀏覽器 Autoplay 政策：玩家首次操作後啟動音樂
     */
    handleFirstInteraction() {
        if (!this.userInteracted) {
            this.userInteracted = true;
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            if (!this.isBgmMuted && this.bgm) {
                this.bgm.play().catch(() => {});
            }
        }
    }

    playBGM() {
        if (this.isBgmMuted || !this.bgm) return;
        this.bgm.play().catch(() => {});
    }

    pauseBGM() {
        if (this.bgm) {
            this.bgm.pause();
        }
    }

    toggleBGM() {
        this.isBgmMuted = !this.isBgmMuted;
        if (this.isBgmMuted) {
            this.pauseBGM();
        } else {
            if (this.bgm) {
                this.bgm.play().catch(() => {});
            }
        }
        return !this.isBgmMuted;
    }

    toggleSFX() {
        this.isSfxMuted = !this.isSfxMuted;
        return !this.isSfxMuted;
    }

    /**
     * 精準觸發音效播放（多重發聲重疊支援）
     */
    playSFX(name, comboCount = 1) {
        if (this.isSfxMuted) return;

        // 若有解碼的 AudioBuffer 則以 Web Audio API 低延遲播放
        if (this.audioCtx && this.sfxBuffers[name]) {
            try {
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                const source = this.audioCtx.createBufferSource();
                const gain = this.audioCtx.createGain();
                source.buffer = this.sfxBuffers[name];

                // 若為得分音效，隨 combo 輕微提升音調增加刺激感
                if (name === 'point') {
                    const pitch = Math.min(1.0 + (comboCount - 1) * 0.05, 1.6);
                    source.playbackRate.value = pitch;
                    gain.gain.value = 0.6;
                } else {
                    gain.gain.value = 0.8;
                }

                source.connect(gain);
                gain.connect(this.audioCtx.destination);
                source.start(0);
                return;
            } catch (e) {
                console.warn('[AssetManager] WebAudio 播放出錯，切換至備援:', e);
            }
        }

        // 備援：HTMLAudioElement 播放
        try {
            const fallbackAudio = new Audio(`./assets/audio/${name}.wav`);
            fallbackAudio.volume = name === 'point' ? 0.6 : 0.8;
            fallbackAudio.play().catch(() => {});
        } catch (e) {}
    }

    getImage(key) {
        return this.images[key] || null;
    }
}
