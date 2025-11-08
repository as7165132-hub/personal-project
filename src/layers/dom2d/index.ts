/**
 * SURFACE DEBUT - 2D DOM Layer (v53 - 360 cards with infinite scroll)
 * 무한 스크롤 구현 (3세트 복제)
 */

import { i18n } from '@systems/i18n';

export class Dom2DLayer {
  private container: HTMLElement;
  private camera!: HTMLElement;
  private grid!: HTMLElement;
  private cards: HTMLElement[] = [];

  private scrollY: number = 0;
  private cardSetHeight: number = 0; // 1세트 높이 (무한 스크롤용)
  private isIsoMode: boolean = false;

  constructor(containerId: string = 'app') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }
    this.container = container;
    this.init();
  }

  private init(): void {
    this.container.className = 'surface-stage';
    this.buildStructure();
    this.setupScrolling();
    this.setupIsoToggle();
  }

  /**
   * 참조 코드 구조: stage > camera > grid
   */
  private buildStructure(): void {
    this.container.innerHTML = '';

    // Camera wrapper (transform을 담당)
    this.camera = document.createElement('div');
    this.camera.className = 'surface-camera';

    // Grid (world)
    this.grid = document.createElement('div');
    this.grid.className = 'surface-grid';

    // 카드 데이터 (120개)
    const cardTexts = [
      i18n.t('PROLOGUE'),
      i18n.t('LAYERS'),
      i18n.t('THRESHOLD'),
      i18n.t('DEBUT'),
      i18n.t('EPILOGUE'),
      ...Array.from({ length: 115 }, (_, i) => `CARD ${String(i + 6).padStart(3, '0')}`)
    ];

    // 3세트 복제 (무한 스크롤용)
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

    console.log('[INIT] Total cards:', this.cards.length, '(120 × 3 sets)');

    this.camera.appendChild(this.grid);
    this.container.appendChild(this.camera);

    // 초기 transform 설정 (2D 모드)
    this.camera.style.transform = '';
    this.grid.style.transform = 'translateY(0px)';

    setTimeout(() => {
      // 1세트 높이 = 전체 높이 / 3
      this.cardSetHeight = this.grid.scrollHeight / 3;
      console.log('[INIT] 1 set height:', this.cardSetHeight, 'px');
      console.log('[INIT] Total height:', this.grid.scrollHeight, 'px (3 sets)');
      this.updateTransform();
    }, 100);
  }

  private setupScrolling(): void {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const beforeScroll = this.scrollY;
      this.scrollY += e.deltaY * 0.5;

      // ISO 모드: 무한 스크롤 (3세트 wrapping)
      if (this.isIsoMode && this.cardSetHeight > 0) {
        // 아래로 스크롤: 2세트 끝에 도달하면 중간 세트로 점프
        if (this.scrollY >= 2 * this.cardSetHeight) {
          this.scrollY -= this.cardSetHeight;
          console.log('[WRAP ↓] 아래 → 중간:', beforeScroll.toFixed(0), '→', this.scrollY.toFixed(0));
        }
        // 위로 스크롤: 1세트 시작 미만이면 중간 세트로 점프
        else if (this.scrollY < this.cardSetHeight) {
          this.scrollY += this.cardSetHeight;
          console.log('[WRAP ↑] 위 → 중간:', beforeScroll.toFixed(0), '→', this.scrollY.toFixed(0));
        }
      }

      // 2D 모드: 음수 방지만
      if (!this.isIsoMode && this.scrollY < 0) {
        this.scrollY = 0;
      }

      this.updateTransform();
    }, { passive: false });
  }

  private setupIsoToggle(): void {
    const btn = document.getElementById('iso-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.isIsoMode = !this.isIsoMode;
      document.body.classList.toggle('iso-mode', this.isIsoMode);
      btn.classList.toggle('active', this.isIsoMode);

      if (this.isIsoMode) {
        // ISO 모드: 중간 세트로 시작 (무한 스크롤 대응)
        this.scrollY = this.cardSetHeight;
        console.log('✨ ISO 모드 활성화 (중간 세트로 시작)');
      } else {
        // 2D 모드: 처음으로 리셋
        this.scrollY = 0;
        console.log('📐 2D 모드로 전환 (처음으로 리셋)');
      }

      this.updateTransform();
    });
  }

  /**
   * 참조 패턴: camera에 transform 적용
   */
  private updateTransform(): void {
    if (!this.camera || !this.grid) return;

    if (this.isIsoMode) {
      // ISO: isometric view
      this.camera.style.transform = `rotateX(45deg) rotateZ(45deg) scale(0.8)`;
      this.grid.style.transform = `translateY(${-this.scrollY}px)`;
    } else {
      // 2D: camera 초기화, grid만 스크롤
      this.camera.style.transform = 'none';
      this.grid.style.transform = `translateY(${-this.scrollY}px)`;
    }

    // 배경 동기화
    document.body.style.setProperty('--scroll-offset', `${this.scrollY}px`);
  }

  destroy(): void {
    this.cards = [];
    this.container.innerHTML = '';
  }
}
