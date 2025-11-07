/**
 * SURFACE DEBUT - 2D DOM Layer
 * 간결한 그리드 레이아웃
 */

import { i18n } from '@systems/i18n';

export class Dom2DLayer {
  private container: HTMLElement;
  private cards: HTMLElement[] = [];

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
    this.attachScrollListener();
  }

  /**
   * 스크롤 리스너 연결
   */
  private attachScrollListener(): void {
    window.addEventListener('scroll', () => {
      this.handleScroll();
    });
  }

  /**
   * 스크롤 핸들러 - 컨베이어 벨트 효과
   */
  private handleScroll(): void {
    const scrollY = window.scrollY;
    const grid = this.container.querySelector('.surface-grid') as HTMLElement;

    if (grid) {
      // ISO view 유지하면서 Y축으로만 이동 (컨베이어 효과)
      const offset = scrollY * 0.3; // 스크롤 속도 조절
      grid.style.transform = `rotateX(60deg) rotateZ(45deg) translateY(-${offset}px)`;
    }
  }

  /**
   * 레이아웃 구성
   */
  private buildLayout(): void {
    // 기존 로딩 메시지 제거
    this.container.innerHTML = '';

    // 그리드 컨테이너
    const grid = document.createElement('div');
    grid.className = 'surface-grid';

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

    this.container.appendChild(grid);
  }

  /**
   * 정리
   */
  destroy(): void {
    this.cards = [];
    this.container.innerHTML = '';
  }
}
