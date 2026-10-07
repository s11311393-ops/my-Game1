/**
 * 遊戲整體設定參數 (Game Configuration)
 */

export const GAME_CONFIG = {
    INITIAL_LIVES: 3,
    POINTS_PER_LEVEL: 150,
    MAX_ACTIVE_ITEMS: 8,
    FRENZY_DURATION: 5.0, // 秒
    COMBO_TIMEOUT: 1.5,   // 秒
    HIGH_SCORE_STORAGE_KEY: 'catch_it_v2_highscore',
    BASE_ITEM_SPEED: 2.5,
    SPEED_PER_LEVEL: 0.7,
    MAX_SPAWN_DIFFICULTY_LEVEL: 5
};

export const BASKET_CONFIG = {
    width: 100,
    height: 46,
    speed: 10,
    bottomOffset: 65,
    lerpFactor: 0.25
};

export const ITEM_TYPES = [
    { name: '紅蘋果', symbol: '🍎', points: 10, type: 'fruit', prob: 0.25, radius: 21, glowColor: '#ff2a5f', bgColor: '#ffeef2' },
    { name: '黃香蕉', symbol: '🍌', points: 15, type: 'fruit', prob: 0.25, radius: 21, glowColor: '#ffcc00', bgColor: '#fffbe6' },
    { name: '紫葡萄', symbol: '🍇', points: 20, type: 'fruit', prob: 0.20, radius: 21, glowColor: '#a855f7', bgColor: '#f5f3ff' },
    { name: '大西瓜', symbol: '🍉', points: 30, type: 'fruit', prob: 0.10, radius: 25, glowColor: '#22c55e', bgColor: '#f0fdf4' },
    { name: '黃金星', symbol: '⭐', points: 50, type: 'golden', prob: 0.05, radius: 19, glowColor: '#fbbf24', bgColor: '#fef3c7' },
    { name: '危險炸彈', symbol: '💣', points: 0, type: 'bomb', prob: 0.15, radius: 23, glowColor: '#ef4444', bgColor: '#fef2f2' }
];

export const SHAKE_CONFIG = {
    catch: { intensity: 4, duration: 100 },
    bomb: { intensity: 7, duration: 200 },
    gameOver: { intensity: 8, duration: 250 }
};

export const POOL_CONFIG = {
    items: 50,
    particles: 200,
    floatTexts: 30
};
