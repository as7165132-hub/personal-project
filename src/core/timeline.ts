/**
 * SURFACE DEBUT - Timeline
 * 전환 타이밍 관리
 */

import type { AppState } from './types';
import { StateMachine } from './fsm';
import { eventBus } from './event-bus';
import { motionTokens } from '@systems/motion-tokens';
import { accessibility } from '@systems/accessibility';

export class Timeline {
  private fsm: StateMachine;
  private transitionTimeouts: Map<string, number> = new Map();

  constructor(fsm: StateMachine) {
    this.fsm = fsm;
    this.init();
  }

  /**
   * 초기화
   */
  private init(): void {
    // 임계값 도달 시 전환 시작
    eventBus.on('threshold:reached', () => {
      this.startTransition();
    });

    // 상태 리셋 요청
    eventBus.on('state:reset-request', () => {
      this.reset();
    });
  }

  /**
   * 전환 시작: DEFAULT_2D → SWITCHING → SURFACE_ISO
   */
  private startTransition(): void {
    console.log('[Timeline] Starting transition...');

    // 접근성 안내
    accessibility.announce('Switching mode', 'polite');

    // 1단계: DEFAULT_2D → SWITCHING
    if (this.fsm.transitionTo('SWITCHING')) {
      const duration = motionTokens.getSwitchDuration();

      // 2단계: SWITCHING → SURFACE_ISO (duration 후)
      const timeoutId = window.setTimeout(() => {
        if (this.fsm.transitionTo('SURFACE_ISO')) {
          this.fsm.completeTransition();
          accessibility.announce('Surface mode activated', 'polite');
        }
      }, duration);

      this.transitionTimeouts.set('switching-to-iso', timeoutId);
      this.fsm.completeTransition();
    }
  }

  /**
   * 리셋: SURFACE_ISO → DEFAULT_2D
   */
  private reset(): void {
    console.log('[Timeline] Resetting...');

    // 진행 중인 타이머 취소
    this.clearAllTimeouts();

    // 상태 리셋
    this.fsm.reset('DEFAULT_2D');

    accessibility.announce('Reset to default mode', 'polite');
  }

  /**
   * 모든 타이머 취소
   */
  private clearAllTimeouts(): void {
    this.transitionTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.transitionTimeouts.clear();
  }

  /**
   * 수동 상태 전환 (디버그용)
   */
  transitionTo(state: AppState): boolean {
    return this.fsm.transitionTo(state);
  }

  /**
   * 현재 상태 반환
   */
  getState(): AppState {
    return this.fsm.getState();
  }

  /**
   * 정리
   */
  destroy(): void {
    this.clearAllTimeouts();
  }
}
