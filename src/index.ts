/**
 * SURFACE DEBUT - Main Entry Point
 * 간결한 2D 그리드만 표시
 */

import './style.css';
import { Dom2DLayer } from '@layers/dom2d';

class SurfaceDebut {
  private dom2d: Dom2DLayer;

  constructor() {
    console.log('🌊 SURFACE DEBUT — Initializing...');

    // 2D 레이어만 초기화
    this.dom2d = new Dom2DLayer('app');

    console.log('✨ SURFACE DEBUT — Ready');
  }

  /**
   * 정리
   */
  destroy(): void {
    this.dom2d.destroy();
  }
}

// 앱 초기화
let app: SurfaceDebut | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new SurfaceDebut();
});

// HMR (Vite)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) {
      app.destroy();
    }
  });
}
