/**
 * SURFACE DEBUT - 2D DOM Layer (v41 - 재구현)
 * 간결하고 명확한 ISO 뷰 구현
 */

import { i18n } from '@systems/i18n';

export class Dom2DLayer {
  private container: HTMLElement;
  private grid!: HTMLElement;
  private cards: HTMLElement[] = [];

  // 스크롤 상태
  private scrollY: number = 0;
  private cardSetHeight: number = 0;

  // ISO 모드
  private isIsoMode: boolean = false;

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
    this.buildGrid();
    this.setupScrolling();
    this.setupIsoToggle();
  }

  /**
   * 그리드 생성
   */
  private buildGrid(): void {
    this.container.innerHTML = '';

    // 그리드 컨테이너
    this.grid = document.createElement('div');
    this.grid.className = 'surface-grid';

    // 카드 데이터
    const cardTexts = [
      i18n.t('PROLOGUE'),
      i18n.t('LAYERS'),
      i18n.t('THRESHOLD'),
      i18n.t('DEBUT'),
      i18n.t('EPILOGUE'),
      ...Array.from({ length: 211 }, (_, i) => `CARD ${String(i + 6).padStart(3, '0')}`)
    ];

    // 3세트 생성 (무한 스크롤용)
    for (let set = 0; set < 3; set++) {
      cardTexts.forEach(text => {
        const card = document.createElement('div');
        card.className = 'surface-card';

        const p = document.createElement('p');
        p.className = 'surface-card-text';
        p.textContent = text;

        card.appendChild(p);
        this.grid.appendChild(card);
        this.cards.push(card);
      });
    }

    this.container.appendChild(this.grid);

    // 높이 계산
    setTimeout(() => {
      this.cardSetHeight = this.grid.scrollHeight / 3;
      console.log('[INIT] Card set height:', this.cardSetHeight);
      this.updateTransform();
    }, 100);
  }

  /**
   * 스크롤 설정
   */
  private setupScrolling(): void {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();

      // 스크롤 누적
      this.scrollY += e.deltaY * 0.5;

      // 무한 스크롤: 3세트를 순환
      if (this.cardSetHeight > 0) {
        const totalHeight = this.cardSetHeight * 3;

        // 범위를 0 ~ totalHeight로 유지
        while (this.scrollY < 0) {
          this.scrollY += this.cardSetHeight;
        }
        while (this.scrollY >= totalHeight) {
          this.scrollY -= this.cardSetHeight;
        }
      }

      this.updateTransform();
    }, { passive: false });
  }

  /**
   * ISO 토글 버튼
   */
  private setupIsoToggle(): void {
    const toggleBtn = document.getElementById('iso-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      this.isIsoMode = !this.isIsoMode;

      if (this.isIsoMode) {
        document.body.classList.add('iso-mode');
        toggleBtn.classList.add('active');
        console.log('✨ ISO 뷰 활성화');
      } else {
        document.body.classList.remove('iso-mode');
        toggleBtn.classList.remove('active');
        console.log('📐 2D 뷰 활성화');
      }

      this.updateTransform();
    });
  }

  /**
   * Transform 업데이트
   */
  private updateTransform(): void {
    if (!this.grid) return;

    if (this.isIsoMode) {
      // ISO 뷰: 중앙 정렬 + 회전
      const centerOffset = window.innerHeight * 0.3;
      const yPos = centerOffset - this.scrollY;

      const transform = `
        rotateX(35deg)
        rotateZ(45deg)
        scale(0.6)
        translateY(${yPos}px)
      `.replace(/\s+/g, ' ').trim();

      this.grid.style.transform = transform;

      // 배경도 동일한 오프셋 적용
      document.body.style.setProperty('--scroll-offset', `${this.scrollY}px`);
      document.body.style.setProperty('--center-offset', `${centerOffset}px`);

      console.log('[ISO]', Math.round(this.scrollY));
    } else {
      // 2D 뷰: 단순 스크롤
      this.grid.style.transform = `translateY(${-this.scrollY}px)`;
      document.body.style.setProperty('--scroll-offset', `${this.scrollY}px`);

      console.log('[2D]', Math.round(this.scrollY));
    }
  }

  /**
   * 정리
   */
  destroy(): void {
    this.cards = [];
    this.container.innerHTML = '';
  }
}
