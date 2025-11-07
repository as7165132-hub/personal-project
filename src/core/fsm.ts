/**
 * SURFACE DEBUT - Finite State Machine
 * 상태 전환 관리: DEFAULT_2D → SWITCHING → SURFACE_ISO
 */

import { AppState, StateTransitionEvent } from './types';
import { eventBus } from './event-bus';

export class StateMachine {
  private currentState: AppState;
  private previousState: AppState | null;
  private isTransitioning: boolean;

  // 허용된 상태 전환 맵
  private readonly transitions: Map<AppState, AppState[]> = new Map([
    ['DEFAULT_2D', ['SWITCHING']],
    ['SWITCHING', ['SURFACE_ISO']],
    ['SURFACE_ISO', ['DEFAULT_2D']], // 필요 시 역방향도 가능
  ]);

  constructor(initialState: AppState = 'DEFAULT_2D') {
    this.currentState = initialState;
    this.previousState = null;
    this.isTransitioning = false;
  }

  /**
   * 현재 상태 반환
   */
  getState(): AppState {
    return this.currentState;
  }

  /**
   * 이전 상태 반환
   */
  getPreviousState(): AppState | null {
    return this.previousState;
  }

  /**
   * 전환 중인지 확인
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * 상태 전환 가능 여부 확인
   */
  canTransitionTo(targetState: AppState): boolean {
    const allowedStates = this.transitions.get(this.currentState);
    return allowedStates ? allowedStates.includes(targetState) : false;
  }

  /**
   * 상태 전환 실행
   */
  transitionTo(targetState: AppState): boolean {
    // 이미 전환 중이면 무시
    if (this.isTransitioning) {
      console.warn('[FSM] Transition already in progress');
      return false;
    }

    // 같은 상태로의 전환 방지
    if (this.currentState === targetState) {
      console.warn(`[FSM] Already in state: ${targetState}`);
      return false;
    }

    // 허용되지 않은 전환 확인
    if (!this.canTransitionTo(targetState)) {
      console.error(
        `[FSM] Invalid transition: ${this.currentState} → ${targetState}`
      );
      return false;
    }

    // 전환 시작
    this.isTransitioning = true;
    this.previousState = this.currentState;
    const from = this.currentState;
    this.currentState = targetState;

    const event: StateTransitionEvent = {
      from,
      to: targetState,
      timestamp: Date.now(),
    };

    // 이벤트 발행
    eventBus.emit('state:transition:start', event);
    eventBus.emit(`state:enter:${targetState}`, event);
    eventBus.emit(`state:exit:${from}`, event);

    return true;
  }

  /**
   * 전환 완료 처리
   */
  completeTransition(): void {
    if (!this.isTransitioning) {
      console.warn('[FSM] No transition to complete');
      return;
    }

    this.isTransitioning = false;

    const event: StateTransitionEvent = {
      from: this.previousState!,
      to: this.currentState,
      timestamp: Date.now(),
    };

    eventBus.emit('state:transition:complete', event);
    console.log(`[FSM] Transition complete: ${event.from} → ${event.to}`);
  }

  /**
   * 특정 상태인지 확인
   */
  is(state: AppState): boolean {
    return this.currentState === state;
  }

  /**
   * 상태 머신 리셋
   */
  reset(initialState: AppState = 'DEFAULT_2D'): void {
    this.currentState = initialState;
    this.previousState = null;
    this.isTransitioning = false;
    eventBus.emit('state:reset', { to: initialState });
  }
}
