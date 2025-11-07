/**
 * SURFACE DEBUT - 2D DOM Layer
 * 간결한 그리드 레이아웃
 */

import { i18n } from '@systems/i18n';

export class Dom2DLayer {
  private container: HTMLElement;
  private cards: HTMLElement[] = [];
  private scrollOffset: number = 0; // 누적 스크롤 오프셋

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
    this.attachWheelListener();
  }

  /**
   * Wheel 리스너 연결
   */
  private attachWheelListener(): void {
    window.addEventListener('wheel', (e) => {
      e.preventDefault(); // 기본 스크롤 동작 막기
      this.handleWheel(e);
    }, { passive: false });
  }

  /**
   * Wheel 핸들러 - 컨베이어 벨트 효과
   */
  private handleWheel(e: WheelEvent): void {
    // deltaY 값을 누적
    this.scrollOffset += e.deltaY * 0.5; // 스크롤 속도 조절

    // 최소값 제한 (위로 너무 많이 못가게)
    this.scrollOffset = Math.max(0, this.scrollOffset);

    const grid = this.container.querySelector('.surface-grid') as HTMLElement;
    if (grid) {
      // ISO view 유지하면서 Y축으로만 이동 (컨베이어 효과)
      // CSS 초기값과 동일한 transform 유지: rotateX(45deg) rotateZ(30deg) scale(0.7)
      grid.style.transform = `rotateX(45deg) rotateZ(30deg) scale(0.7) translateY(-${this.scrollOffset}px)`;
    }
  }

  /**
   * 레이아웃 구성
   */
  private buildLayout(): void {
    console.log('[DEBUG] buildLayout 시작');
    // 기존 로딩 메시지 제거
    this.container.innerHTML = '';

    // 그리드 컨테이너
    const grid = document.createElement('div');
    grid.className = 'surface-grid';
    console.log('[DEBUG] Grid element 생성:', grid);

    // 카드 생성
    const totalCards = 216;
    const cardData = [];

    // 처음 5개는 의미있는 텍스트
    cardData.push(
      { text: i18n.t('PROLOGUE') },
      { text: i18n.t('LAYERS') },
      { text: i18n.t('THRESHOLD') },
      { text: i18n.t('DEBUT') },
      { text: i18n.t('EPILOGUE') }
    );

    // 나머지는 번호로 채움
    for (let i = 6; i <= totalCards; i++) {
      const num = String(i).padStart(3, '0');
      cardData.push({
        text: `CARD ${num}`
      });
    }

    cardData.forEach((data) => {
      const card = document.createElement('div');
      card.className = 'surface-card';

      const text = document.createElement('p');
      text.className = 'surface-card-text';
      text.textContent = data.text;

      card.appendChild(text);
      grid.appendChild(card);
      this.cards.push(card);
    });

    console.log('[DEBUG] 카드 생성 완료:', this.cards.length, '개');
    this.container.appendChild(grid);
    console.log('[DEBUG] Grid가 container에 추가됨');

    // Transform 확인
    setTimeout(() => {
      const gridRect = grid.getBoundingClientRect();
      console.log('[DEBUG] Grid 위치 상세:', {
        x: gridRect.x,
        y: gridRect.y,
        width: gridRect.width,
        height: gridRect.height,
        top: gridRect.top,
        left: gridRect.left
      });

      if (this.cards.length > 0) {
        const firstCard = this.cards[0];
        const cardRect = firstCard.getBoundingClientRect();
        console.log('[DEBUG] 첫 번째 카드 위치 상세:', {
          x: cardRect.x,
          y: cardRect.y,
          width: cardRect.width,
          height: cardRect.height,
          top: cardRect.top,
          left: cardRect.left
        });
        console.log('[DEBUG] 화면 크기:', {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight
        });
      }
    }, 100);
  }

  /**
   * 정리
   */
  destroy(): void {
    this.cards = [];
    this.container.innerHTML = '';
  }
}
