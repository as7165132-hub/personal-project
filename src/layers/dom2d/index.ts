/**
 * SURFACE DEBUT - 2D DOM Layer
 * 잡지형 그리드 레이아웃
 */

import type { AppState } from '@core/types';
import { eventBus } from '@core/event-bus';
import { i18n } from '@systems/i18n';
import { anchorMap } from '@systems/anchor-map';

export class Dom2DLayer {
  private container: HTMLElement;
  private cards: HTMLElement[] = [];
  private statusLabel: HTMLElement | null = null;
  private currentState: AppState = 'DEFAULT_2D';

  constructor(containerId: string = 'app') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }
    this.container = container;
    this.init();
  }

  /**
   * 초기화
   */
  private init(): void {
    this.container.className = 'surface-container';
    this.buildLayout();
    this.attachListeners();
  }

  /**
   * 레이아웃 구성
   */
  private buildLayout(): void {
    // 기존 로딩 메시지 제거
    this.container.innerHTML = '';

    // 상태 라벨
    this.statusLabel = document.createElement('div');
    this.statusLabel.className = 'surface-status-label';
    this.statusLabel.textContent = i18n.t('MODE_ON');
    this.container.appendChild(this.statusLabel);

    // 그리드 컨테이너
    const grid = document.createElement('div');
    grid.className = 'surface-grid';
    grid.setAttribute('data-state', 'DEFAULT_2D');

    // 카드 생성 (다수의 샘플 카드)
    const totalCards = 216; // 4열 x 54행 그리드
    const cardData = [];

    // 처음 5개는 의미있는 텍스트
    cardData.push(
      { id: 'prologue', text: i18n.t('PROLOGUE') },
      { id: 'layers', text: i18n.t('LAYERS') },
      { id: 'threshold', text: i18n.t('THRESHOLD') },
      { id: 'debut', text: i18n.t('DEBUT') },
      { id: 'epilogue', text: i18n.t('EPILOGUE') }
    );

    // 나머지는 번호로 채움
    for (let i = 6; i <= totalCards; i++) {
      const num = String(i).padStart(3, '0');
      cardData.push({
        id: `card-${num}`,
        text: `CARD ${num}`
      });
    }

    cardData.forEach((data) => {
      const card = document.createElement('div');
      card.className = 'surface-card';
      card.setAttribute('data-card-id', data.id);
      card.setAttribute('data-threshold-trigger', '');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', data.text);

      const text = document.createElement('p');
      text.className = 'surface-card-text';
      text.textContent = data.text;

      card.appendChild(text);

      // 카드 클릭 시 3D 풍선 생성
      card.addEventListener('click', () => {
        const cardId = data.id;
        const anchor = anchorMap.get(cardId);

        if (anchor) {
          // 다른 활성화된 카드 비활성화
          this.cards.forEach(c => c.classList.remove('bubble-active'));
          card.classList.add('bubble-active');

          // 3D 풍선 생성 이벤트 발행
          eventBus.emit('card:clicked', {
            cardId,
            position: anchor.position3D.clone(),
          });
        }
      });

      grid.appendChild(card);
      this.cards.push(card);

      // 앵커 등록
      anchorMap.register(data.id, card);
    });

    this.container.appendChild(grid);
  }

  /**
   * 이벤트 리스너 연결
   */
  private attachListeners(): void {
    // 상태 전환 이벤트
    eventBus.on<{ from: AppState; to: AppState }>('state:enter:SWITCHING', () => {
      this.enterSwitchingState();
    });

    eventBus.on<{ from: AppState; to: AppState }>('state:enter:SURFACE_ISO', () => {
      this.enterSurfaceIsoState();
    });

    eventBus.on('state:reset', () => {
      this.reset();
    });

    // 스크롤 이벤트 (3D 모드에서 그리드 이동)
    this.container.addEventListener('scroll', () => {
      this.handleScroll();
    });
  }

  /**
   * 스크롤 핸들러
   */
  private handleScroll(): void {
    if (this.currentState !== 'SURFACE_ISO') return;
    // 3D transform 제거됨 - 순수 2D 스크롤만 사용
  }

  /**
   * SWITCHING 상태 진입
   */
  private enterSwitchingState(): void {
    this.currentState = 'SWITCHING';

    if (!this.statusLabel) return;

    // 라벨 업데이트
    this.statusLabel.textContent = i18n.t('MODE_SWITCHING');

    const grid = this.container.querySelector('.surface-grid') as HTMLElement;
    if (grid) {
      grid.setAttribute('data-state', 'SWITCHING');
    }

    // 3D 카드 변형 제거됨 - 순수 2D만 사용
  }

  /**
   * SURFACE_ISO 상태 진입
   */
  private enterSurfaceIsoState(): void {
    this.currentState = 'SURFACE_ISO';

    if (!this.statusLabel) return;

    // 라벨 업데이트
    this.statusLabel.textContent = i18n.t('MODE_OFF');

    const grid = this.container.querySelector('.surface-grid') as HTMLElement;
    if (grid) {
      grid.setAttribute('data-state', 'SURFACE_ISO');
      // 저채도, 저광 처리는 CSS로
    }

    // 카드의 개별 변형 초기화 (SWITCHING에서 적용된 skew/rotate 제거)
    this.cards.forEach((card) => {
      card.style.transform = 'none';
    });
  }

  /**
   * 리셋
   */
  private reset(): void {
    this.currentState = 'DEFAULT_2D';

    if (!this.statusLabel) return;

    this.statusLabel.textContent = i18n.t('MODE_ON');

    const grid = this.container.querySelector('.surface-grid') as HTMLElement;
    if (grid) {
      grid.setAttribute('data-state', 'DEFAULT_2D');
      // transform 초기화
      grid.style.transform = '';
    }

    // 카드 변형 초기화
    this.cards.forEach((card) => {
      card.style.transform = 'none';
    });
  }

  /**
   * 정리
   */
  destroy(): void {
    this.cards.forEach((card) => {
      const anchorId = card.getAttribute('data-card-id');
      if (anchorId) {
        anchorMap.unregister(anchorId);
      }
    });
    this.cards = [];
    this.container.innerHTML = '';
  }
}
