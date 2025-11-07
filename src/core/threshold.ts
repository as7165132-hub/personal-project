/**
 * SURFACE DEBUT - Threshold Trigger
 * 임계값 도달 감지 및 전환 트리거
 */

import { eventBus } from './event-bus';
import settings from '@config/settings.json';

interface ThresholdState {
  clicks: number;
  hoverStart: number | null;
  dragCount: number;
  triggered: boolean;
}

export class ThresholdTrigger {
  private state: ThresholdState;
  private readonly config = settings.threshold;
  private elements: HTMLElement[] = [];

  constructor() {
    this.state = {
      clicks: 0,
      hoverStart: null,
      dragCount: 0,
      triggered: false,
    };

    this.init();
  }

  /**
   * 초기화
   */
  private init(): void {
    // 클릭 이벤트
    document.addEventListener('click', this.handleClick.bind(this));

    // 키보드 트리거 (접근성)
    eventBus.on<{ element: HTMLElement }>('threshold:keyboard-trigger', () => {
      this.handleClick();
    });
  }

  /**
   * 트리거 요소 등록
   */
  registerElement(element: HTMLElement): void {
    if (this.elements.includes(element)) return;

    element.addEventListener('mouseenter', this.handleHoverStart.bind(this));
    element.addEventListener('mouseleave', this.handleHoverEnd.bind(this));
    element.addEventListener('dragstart', this.handleDragStart.bind(this));

    this.elements.push(element);
  }

  /**
   * 클릭 처리
   */
  private handleClick(): void {
    if (this.state.triggered) return;

    this.state.clicks++;

    console.log(`[Threshold] Clicks: ${this.state.clicks}/${this.config.clicks}`);

    if (this.state.clicks >= this.config.clicks) {
      this.trigger();
    }
  }

  /**
   * 호버 시작
   */
  private handleHoverStart(): void {
    if (this.state.triggered) return;

    this.state.hoverStart = Date.now();

    // 타이머 설정
    setTimeout(() => {
      if (this.state.hoverStart && !this.state.triggered) {
        const elapsed = Date.now() - this.state.hoverStart;
        if (elapsed >= this.config.hoverMs) {
          console.log(`[Threshold] Hover: ${elapsed}ms/${this.config.hoverMs}ms`);
          this.trigger();
        }
      }
    }, this.config.hoverMs);
  }

  /**
   * 호버 종료
   */
  private handleHoverEnd(): void {
    this.state.hoverStart = null;
  }

  /**
   * 드래그 시작
   */
  private handleDragStart(): void {
    if (this.state.triggered) return;

    this.state.dragCount++;

    console.log(`[Threshold] Drags: ${this.state.dragCount}/${this.config.dragCount}`);

    if (this.state.dragCount >= this.config.dragCount) {
      this.trigger();
    }
  }

  /**
   * 임계값 트리거
   */
  private trigger(): void {
    if (this.state.triggered) return;

    this.state.triggered = true;

    console.log('[Threshold] Triggered! Emitting event...');

    eventBus.emit('threshold:reached', {
      clicks: this.state.clicks,
      dragCount: this.state.dragCount,
    });
  }

  /**
   * 리셋
   */
  reset(): void {
    this.state = {
      clicks: 0,
      hoverStart: null,
      dragCount: 0,
      triggered: false,
    };

    console.log('[Threshold] Reset');
  }

  /**
   * 트리거 여부
   */
  isTriggered(): boolean {
    return this.state.triggered;
  }

  /**
   * 정리
   */
  destroy(): void {
    document.removeEventListener('click', this.handleClick.bind(this));
    this.elements.forEach((element) => {
      element.removeEventListener('mouseenter', this.handleHoverStart.bind(this));
      element.removeEventListener('mouseleave', this.handleHoverEnd.bind(this));
      element.removeEventListener('dragstart', this.handleDragStart.bind(this));
    });
    this.elements = [];
  }
}
