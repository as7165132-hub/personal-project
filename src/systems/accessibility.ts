/**
 * SURFACE DEBUT - Accessibility
 * 접근성 지원 (키보드, reduced-motion 등)
 */

import { eventBus } from '@core/event-bus';
import settings from '@config/settings.json';

export class Accessibility {
  private keyboardEnabled: boolean;
  private reducedMotion: boolean;
  private focusableElements: HTMLElement[] = [];

  constructor() {
    this.keyboardEnabled = settings.a11y.keyboardEnabled;
    this.reducedMotion = this.checkReducedMotion();
    this.init();
  }

  /**
   * 초기화
   */
  private init(): void {
    if (!this.keyboardEnabled) return;

    // 키보드 이벤트 리스너
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Reduced motion 변경 감지
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        eventBus.emit('a11y:reduced-motion', { enabled: e.matches });
      });
    }
  }

  /**
   * Reduced motion 확인
   */
  private checkReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * 키보드 이벤트 처리
   */
  private handleKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;

    // Enter 또는 Space 키로 클릭 트리거
    if (e.key === 'Enter' || e.key === ' ') {
      if (target.hasAttribute('data-threshold-trigger')) {
        e.preventDefault();
        eventBus.emit('threshold:keyboard-trigger', { element: target });
      }
    }

    // Escape 키로 상태 리셋 (필요 시)
    if (e.key === 'Escape') {
      eventBus.emit('state:reset-request', {});
    }

    // Tab 키로 포커스 이동 추적
    if (e.key === 'Tab') {
      this.trackFocus();
    }
  }

  /**
   * 포커스 추적
   */
  private trackFocus(): void {
    setTimeout(() => {
      const focused = document.activeElement as HTMLElement;
      if (focused && focused !== document.body) {
        eventBus.emit('a11y:focus-changed', { element: focused });
      }
    }, 0);
  }

  /**
   * 포커스 가능한 요소 등록
   */
  registerFocusableElement(element: HTMLElement): void {
    if (!this.focusableElements.includes(element)) {
      this.focusableElements.push(element);

      // tabindex 설정
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }

      // ARIA 레이블이 없으면 경고
      if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
        console.warn('[a11y] Element missing aria-label:', element);
      }
    }
  }

  /**
   * 포커스 가능한 요소 해제
   */
  unregisterFocusableElement(element: HTMLElement): void {
    const index = this.focusableElements.indexOf(element);
    if (index > -1) {
      this.focusableElements.splice(index, 1);
    }
  }

  /**
   * Reduced motion 활성화 여부
   */
  isReducedMotion(): boolean {
    return this.reducedMotion;
  }

  /**
   * 키보드 지원 활성화 여부
   */
  isKeyboardEnabled(): boolean {
    return this.keyboardEnabled;
  }

  /**
   * ARIA 라이브 리전에 메시지 발표
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    let liveRegion = document.getElementById('a11y-live-region');

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    } else {
      liveRegion.setAttribute('aria-live', priority);
    }

    // Clear and announce
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion!.textContent = message;
    }, 100);
  }

  /**
   * 정리
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
    this.focusableElements = [];
  }
}

export const accessibility = new Accessibility();
