/**
 * SURFACE DEBUT - 2D DOM Layer
 * 간결한 그리드 레이아웃
 */

import { i18n } from '@systems/i18n';

export class Dom2DLayer {
  private container: HTMLElement;
  private cards: HTMLElement[] = [];
  private scrollOffset: number = 0; // 누적 스크롤 오프셋
  private isIsoMode: boolean = false; // ISO 뷰 모드
  private gridHeight: number = 0; // 그리드 총 높이 (컨베이어 벨트용)

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
    this.setupIsoToggle();
  }

  /**
   * ISO 토글 버튼 설정
   */
  private setupIsoToggle(): void {
    const toggleBtn = document.getElementById('iso-toggle');
    if (!toggleBtn) {
      console.warn('ISO toggle button not found');
      return;
    }

    toggleBtn.addEventListener('click', () => {
      this.toggleIsoMode();
    });
  }

  /**
   * ISO 모드 전환
   */
  private toggleIsoMode(): void {
    this.isIsoMode = !this.isIsoMode;
    const toggleBtn = document.getElementById('iso-toggle');

    if (this.isIsoMode) {
      document.body.classList.add('iso-mode');
      toggleBtn?.classList.add('active');
      console.log('✨ ISO 뷰 활성화');
    } else {
      document.body.classList.remove('iso-mode');
      toggleBtn?.classList.remove('active');
      console.log('📐 2D 뷰로 전환');
    }

    // 현재 스크롤 오프셋 유지한 채로 transform 다시 적용
    this.updateTransform();
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
   * Wheel 핸들러 - 컨베이어 벨트 스크롤
   */
  private handleWheel(e: WheelEvent): void {
    // deltaY 값을 누적
    this.scrollOffset += e.deltaY * 0.5; // 스크롤 속도 조절

    // 그리드 높이 계산 (처음 한 번만)
    if (this.gridHeight === 0) {
      const grid = this.container.querySelector('.surface-grid') as HTMLElement;
      if (grid) {
        this.gridHeight = grid.scrollHeight;
      }
    }

    // 컨베이어 벨트: 무한 스크롤 (양방향)
    if (this.gridHeight > 0) {
      // 음수 방지 및 순환
      while (this.scrollOffset < 0) {
        this.scrollOffset += this.gridHeight;
      }
      while (this.scrollOffset >= this.gridHeight) {
        this.scrollOffset -= this.gridHeight;
      }
    } else {
      // gridHeight 계산 전에는 최소값만 제한
      this.scrollOffset = Math.max(0, this.scrollOffset);
    }

    // transform 업데이트 (2D or ISO 모드에 따라)
    this.updateTransform();
  }

  /**
   * Transform 업데이트 - 배경과 그리드 완전 동기화
   */
  private updateTransform(): void {
    const grid = this.container.querySelector('.surface-grid') as HTMLElement;
    if (!grid) return;

    // 그리드와 배경 모두 동일한 스크롤 오프셋 적용
    grid.style.transform = `translateY(-${this.scrollOffset}px)`;

    // 배경도 정확히 동일한 속도로 이동 (CSS custom property 사용)
    document.body.style.setProperty('--scroll-offset', `${this.scrollOffset}px`);
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

    // Transform 확인 및 컨베이어 벨트 높이 계산
    setTimeout(() => {
      // 그리드 높이 계산 (컨베이어 벨트용)
      this.gridHeight = grid.scrollHeight;
      console.log('[DEBUG] 컨베이어 벨트 높이:', this.gridHeight, 'px');

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
