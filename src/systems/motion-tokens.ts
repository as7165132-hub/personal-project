/**
 * SURFACE DEBUT - Motion Tokens
 * 중앙 집중식 모션 파라미터 관리
 */

import type { MotionConfig, CameraConfig } from '@core/types';
import settings from '@config/settings.json';

export class MotionTokens {
  private config: MotionConfig;
  private reducedMotion: boolean;

  constructor() {
    this.config = settings.motion;
    this.reducedMotion = this.checkReducedMotion();

    // Listen for preference changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
      });
    }
  }

  /**
   * 사용자의 reduced motion 설정 확인
   */
  private checkReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * 전환 시간 (ms)
   */
  getSwitchDuration(): number {
    return this.reducedMotion ? 0 : this.config.switchMs;
  }

  /**
   * 이징 함수
   */
  getEasing(): string {
    return this.reducedMotion ? 'linear' : this.config.easing;
  }

  /**
   * 버블 플로트 시간 (ms)
   */
  getBubbleFloatDuration(): number {
    return this.reducedMotion ? 0 : this.config.bubbleFloatMs;
  }

  /**
   * 카드 스큐 최대값 (deg)
   */
  getCardSkewMax(): number {
    return this.reducedMotion ? 0 : this.config.cardSkewMax;
  }

  /**
   * 카드 Z 이동 (px)
   */
  getCardTranslateZ(): number {
    return this.reducedMotion ? 0 : this.config.cardTranslateZ;
  }

  /**
   * 카메라 설정 반환
   */
  getCameraConfig(mode: 'top' | 'iso'): CameraConfig {
    return settings.camera[mode];
  }

  /**
   * CSS 변환 문자열 생성 (2D → Iso 전환용)
   */
  buildCameraTransform(config: CameraConfig): string {
    const transforms: string[] = [];

    if (config.rx !== 0) {
      transforms.push(`rotateX(${config.rx}deg)`);
    }
    if (config.rz !== 0) {
      transforms.push(`rotateZ(${config.rz}deg)`);
    }
    if (config.ty !== undefined && config.ty !== 0) {
      transforms.push(`translateY(${config.ty}px)`);
    }
    if (config.tyVh !== undefined && config.tyVh !== 0) {
      transforms.push(`translateY(${config.tyVh}vh)`);
    }
    if (config.scale !== 1) {
      transforms.push(`scale(${config.scale})`);
    }

    return transforms.join(' ');
  }

  /**
   * Reduced motion 활성화 여부
   */
  isReducedMotion(): boolean {
    return this.reducedMotion;
  }

  /**
   * 카드 변형 CSS 생성 (SWITCHING 상태용)
   */
  generateCardTransform(index: number, total: number): string {
    if (this.reducedMotion) {
      return 'none';
    }

    // 인덱스에 따라 미묘하게 다른 변형 생성
    const skewX = (Math.sin(index / total * Math.PI) - 0.5) * this.getCardSkewMax();
    const skewY = (Math.cos(index / total * Math.PI) - 0.5) * this.getCardSkewMax();
    const rotate = (index % 2 === 0 ? 1 : -1) * (this.getCardSkewMax() * 0.5);
    const translateZ = this.getCardTranslateZ();

    return `
      skewX(${skewX}deg)
      skewY(${skewY}deg)
      rotate(${rotate}deg)
      translateZ(${translateZ}px)
    `.trim();
  }
}

export const motionTokens = new MotionTokens();
