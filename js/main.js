/**
 * 遊戲啟動入口模組 (Main Entry Point)
 */

import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
