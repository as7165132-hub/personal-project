/**
 * SURFACE DEBUT - 2D DOM Layer (v44 - 참조 구조 정확 구현)
 * 참조 코드 패턴: stage > camera > world
 */

import { i18n } from '@systems/i18n';

export class Dom2DLayer {
  private container: HTMLElement;
  private camera!: HTMLElement;
  private grid!: HTMLElement;
  private cards: HTMLElement[] = [];

  private scrollY: number = 0;
  private cardSetHeight: number = 0;
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

    // 카드 생성
    const cardTexts = [
      i18n.t('PROLOGUE'),
      i18n.t('LAYERS'),
      i18n.t('THRESHOLD'),
      i18n.t('DEBUT'),
      i18n.t('EPILOGUE'),
      ...Array.from({ length: 211 }, (_, i) => `CARD ${String(i + 6).padStart(3, '0')}`)
    ];

    // 3세트 생성 (무한 스크롤)
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

    this.camera.appendChild(this.grid);
    this.container.appendChild(this.camera);

    // 초기 transform 설정 (2D 모드)
    this.camera.style.transform = '';
    this.grid.style.transform = 'translateY(0px)';

    setTimeout(() => {
      this.cardSetHeight = this.grid.scrollHeight / 3;
      console.log('[INIT] Card set height:', this.cardSetHeight, 'px');
      this.updateTransform();
    }, 100);
  }

  private setupScrolling(): void {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrollY += e.deltaY * 0.5;

      // 무한 스크롤
      if (this.cardSetHeight > 0) {
        const total = this.cardSetHeight * 3;
        while (this.scrollY < 0) this.scrollY += this.cardSetHeight;
        while (this.scrollY >= total) this.scrollY -= this.cardSetHeight;
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

      // 모드 전환 시 스크롤 리셋
      this.scrollY = 0;

      this.updateTransform();
    });
  }

  /**
   * 참조 패턴: camera에 transform 적용
   */
  private updateTransform(): void {
    if (!this.camera || !this.grid) return;

    if (this.isIsoMode) {
      // ISO: 극단적으로 단순화 - rotateX만
      this.camera.style.transform = `rotateX(45deg) scale(0.8)`;
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
