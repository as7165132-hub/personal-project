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
  private totalHeight: number = 0; // 전체 카드 그룹 높이 (컨베이어 벨트용)
  private originalCardCount: number = 0; // 원본 카드 수

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
      // ISO 모드로 전환 시 스크롤 위치 리셋 (중간 세트)
      this.scrollOffset = this.totalHeight;
      console.log('✨ ISO 뷰 활성화 (중간 세트로 리셋)');
    } else {
      document.body.classList.remove('iso-mode');
      toggleBtn?.classList.remove('active');
      // 2D 모드로 전환 시 스크롤 위치 리셋 (처음으로)
      this.scrollOffset = 0;
      console.log('📐 2D 뷰로 전환 (처음으로 리셋)');
    }

    // 리셋된 스크롤 오프셋으로 transform 다시 적용
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
   * Wheel 핸들러 - 컨베이어 벨트 스크롤 (복제된 그룹 순환)
   */
  private handleWheel(e: WheelEvent): void {
    // deltaY 값을 누적
    const beforeOffset = this.scrollOffset;
    this.scrollOffset += e.deltaY * 0.5; // 스크롤 속도 조절

    // ISO 모드에서만 컨베이어 벨트 wrapping 적용
    if (this.isIsoMode && this.totalHeight > 0) {
      // 아래로 스크롤: 3번째 세트 끝에 도달하면 2번째 세트로
      if (this.scrollOffset >= 2 * this.totalHeight) {
        this.scrollOffset -= this.totalHeight;
        console.log('[WRAP] 아래 → 중간:', beforeOffset.toFixed(0), '→', this.scrollOffset.toFixed(0));
      }
      // 위로 스크롤: 1번째 세트 시작 전이면 2번째 세트로
      else if (this.scrollOffset < this.totalHeight) {
        this.scrollOffset += this.totalHeight;
        console.log('[WRAP] 위 → 중간:', beforeOffset.toFixed(0), '→', this.scrollOffset.toFixed(0));
      }
    }

    // 2D 모드에서는 0 이하로 스크롤 방지
    if (!this.isIsoMode && this.scrollOffset < 0) {
      this.scrollOffset = 0;
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

    // ISO 모드 여부에 따라 다른 transform 적용
    if (this.isIsoMode) {
      // ISO 뷰: 기울기와 위치는 고정, 회전된 공간 안에서 스크롤
      // 중간 세트 기준으로 오프셋 조정 (totalHeight를 빼서 상대적 위치 계산)
      const relativeScroll = this.scrollOffset - this.totalHeight;
      const offsetY = 0 - relativeScroll;
      const transformStr = `rotateX(30deg) rotateZ(25deg) scale(2) translateX(0px) translateY(${offsetY}px)`;
      grid.style.transform = transformStr;
      console.log('[ISO DEBUG] scrollOffset:', this.scrollOffset.toFixed(0), 'relative:', relativeScroll.toFixed(0), 'offsetY:', offsetY.toFixed(0), 'scale: 2', 'transform:', transformStr);
    } else {
      // 2D 뷰: 단순 스크롤
      grid.style.transform = `translateY(-${this.scrollOffset}px)`;
    }

    // 배경도 정확히 동일한 속도로 이동 (CSS custom property 사용)
    if (this.isIsoMode && this.totalHeight > 0) {
      // ISO 모드에서는 중간 세트 기준 상대적 값 사용
      const relativeScroll = this.scrollOffset - this.totalHeight;
      document.body.style.setProperty('--scroll-offset', `${relativeScroll}px`);
    } else {
      document.body.style.setProperty('--scroll-offset', `${this.scrollOffset}px`);
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

    // 원본 카드 생성
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

    this.originalCardCount = this.cards.length;

    // 전체 카드 그룹을 2번 더 복제 (총 3세트)
    for (let clone = 0; clone < 2; clone++) {
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
    }

    console.log('[DEBUG] 카드 생성 완료:', this.cards.length, '개 (원본:', this.originalCardCount, '개 × 3세트)');
    this.container.appendChild(grid);
    console.log('[DEBUG] Grid가 container에 추가됨');

    // Transform 확인 및 컨베이어 벨트 높이 계산
    setTimeout(() => {
      // 전체 높이 계산
      this.totalHeight = grid.scrollHeight / 3; // 3세트 중 1세트 높이
      console.log('[DEBUG] 1세트 높이:', this.totalHeight, 'px');
      console.log('[DEBUG] 전체 높이:', grid.scrollHeight, 'px');

      // 2D 모드는 처음(0)에서 시작
      this.scrollOffset = 0;

      // 초기 위치 설정 (2D 모드 기준)
      grid.style.transform = `translateY(0px)`;
      document.body.style.setProperty('--scroll-offset', '0px');

      console.log('[DEBUG] 초기 scrollOffset:', this.scrollOffset, 'px (2D 모드 처음)');
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
