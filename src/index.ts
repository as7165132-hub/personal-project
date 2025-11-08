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

    // 브라우저 콘솔에서 접근 가능하도록 노출
    (window as any).surfaceDebut = this;
    (window as any).dom2d = this.dom2d;

    console.log('✨ SURFACE DEBUT — Ready');
    console.log('💡 Tip: 콘솔에서 dom2d.setCardImage(0, "/path/to/image.png") 로 카드 이미지 추가 가능');
  }

  /**
   * 카드에 이미지 추가 (편의 메서드)
   */
  setCardImage(cardIndex: number, imagePath: string): void {
    this.dom2d.setCardImage(cardIndex, imagePath);
  }

  /**
   * 여러 카드에 이미지 일괄 추가 (편의 메서드)
   */
  setCardImages(imageMap: Record<number, string>): void {
    this.dom2d.setCardImages(imageMap);
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
