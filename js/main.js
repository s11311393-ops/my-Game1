/**
 * 遊戲啟動入口模組 (Main Entry Point)
 */

import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    window.game = game; // 掛載全域供獨立模組與動效連動
    game.init();
});
