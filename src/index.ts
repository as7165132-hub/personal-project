/**
 * SURFACE DEBUT - Main Entry Point
 * 26SS: 아키타입 해체·겹의 자아 발현
 */

import './style.css';
import { StateMachine } from '@core/fsm';
import { Timeline } from '@core/timeline';
import { ThresholdTrigger } from '@core/threshold';
import { Dom2DLayer } from '@layers/dom2d';
import { GL3DLayer } from '@layers/gl3d';
import { eventBus } from '@core/event-bus';

class SurfaceDebut {
  private fsm: StateMachine;
  private timeline: Timeline;
  private threshold: ThresholdTrigger;
  private dom2d: Dom2DLayer;
  private gl3d: GL3DLayer;

  constructor() {
    console.log('🌊 SURFACE DEBUT — Initializing...');

    // 코어 시스템
    this.fsm = new StateMachine('DEFAULT_2D');
    this.timeline = new Timeline(this.fsm);
    this.threshold = new ThresholdTrigger();

    // 레이어
    this.dom2d = new Dom2DLayer('app');
    this.gl3d = new GL3DLayer('gl-canvas');

    // 트리거 요소 등록
    this.registerTriggers();

    // 디버그 정보
    this.setupDebug();

    console.log('✨ SURFACE DEBUT — Ready');
  }

  /**
   * 트리거 요소 등록
   */
  private registerTriggers(): void {
    const triggers = document.querySelectorAll('[data-threshold-trigger]');
    triggers.forEach((element) => {
      this.threshold.registerElement(element as HTMLElement);
    });
  }

  /**
   * 디버그 설정
   */
  private setupDebug(): void {
    // 개발 환경에서만
    if (import.meta.env.DEV) {
      // @ts-ignore
      window.surfaceDebut = {
        fsm: this.fsm,
        timeline: this.timeline,
        threshold: this.threshold,
        reset: () => eventBus.emit('state:reset-request', {}),
        trigger: () => eventBus.emit('threshold:reached', {}),
      };

      console.log('🔧 Debug: window.surfaceDebut available');
      console.log('  - surfaceDebut.reset() : Reset to DEFAULT_2D');
      console.log('  - surfaceDebut.trigger() : Trigger threshold');
    }
  }

  /**
   * 정리
   */
  destroy(): void {
    this.dom2d.destroy();
    this.gl3d.destroy();
    this.threshold.destroy();
    this.timeline.destroy();
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
