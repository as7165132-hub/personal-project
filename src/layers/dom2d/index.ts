/**
 * SURFACE DEBUT - 2D DOM Layer (v54 - True infinite scroll with DOM reordering)
 * 컨베이어 벨트 방식 무한 스크롤 (DOM 재배치)
 */

import { i18n } from '@systems/i18n';

export class Dom2DLayer {
  private container: HTMLElement;
  private camera!: HTMLElement;
  private grid!: HTMLElement;
  private cardSets: HTMLElement[][] = [[], [], []]; // 3개 세트로 분리

  private scrollY: number = 0;
  private baseScrollOffset: number = 0; // DOM 재배치 누적 오프셋
  private cardSetHeight: number = 0; // 1세트 높이 (무한 스크롤용)
  private isIsoMode: boolean = false;

  private readonly BG_REPEAT_HEIGHT = 2160; // 배경 반복 단위 (bg-gradient.svg 높이)

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

    // 3세트 생성 및 세트별로 분리 저장
    for (let set = 0; set < 3; set++) {
      cardTexts.forEach(text => {
        const card = document.createElement('div');
        card.className = 'surface-card';
        const p = document.createElement('p');
        p.className = 'surface-card-text';
        p.textContent = text;
        card.appendChild(p);
        this.cardSets[set].push(card); // 세트별로 저장
      });
    }

    // 초기 DOM 순서: [세트0][세트1][세트2]
    this.renderSets();

    console.log('[INIT] Total cards:', this.cardSets.flat().length, '(120 × 3 sets)');

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

  /**
   * DOM에 세트 렌더링 (현재 cardSets 순서대로)
   */
  private renderSets(): void {
    this.grid.innerHTML = '';
    this.cardSets.forEach(set => {
      set.forEach(card => this.grid.appendChild(card));
    });
  }

  /**
   * 컨베이어 벨트: 아래로 스크롤 - 첫 세트를 마지막으로 이동
   */
  private rotateDown(): void {
    const firstSet = this.cardSets.shift()!;
    this.cardSets.push(firstSet);
    this.renderSets();
    this.baseScrollOffset += this.cardSetHeight; // scrollY는 유지, base만 조정
    console.log('[ROTATE ↓] 첫 세트를 마지막으로 이동, scrollY:', this.scrollY.toFixed(0), 'base:', this.baseScrollOffset.toFixed(0));
  }

  /**
   * 컨베이어 벨트: 위로 스크롤 - 마지막 세트를 첫 번째로 이동
   */
  private rotateUp(): void {
    const lastSet = this.cardSets.pop()!;
    this.cardSets.unshift(lastSet);
    this.renderSets();
    this.baseScrollOffset -= this.cardSetHeight; // scrollY는 유지, base만 조정
    console.log('[ROTATE ↑] 마지막 세트를 첫 번째로 이동, scrollY:', this.scrollY.toFixed(0), 'base:', this.baseScrollOffset.toFixed(0));
  }

  private setupScrolling(): void {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrollY += e.deltaY * 0.5;

      // ISO 모드: 컨베이어 벨트 방식 무한 스크롤
      if (this.isIsoMode && this.cardSetHeight > 0) {
        // 현재 DOM 배치 기준으로 실제 스크롤 위치 계산
        const effectiveScroll = this.scrollY - this.baseScrollOffset;

        // 아래로 스크롤: 2세트 끝에 도달하면 DOM 재배치
        if (effectiveScroll >= 2 * this.cardSetHeight) {
          this.rotateDown();
        }
        // 위로 스크롤: 1세트 시작 미만이면 DOM 재배치
        else if (effectiveScroll < this.cardSetHeight) {
          this.rotateUp();
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
        this.baseScrollOffset = 0; // base도 리셋
        console.log('✨ ISO 모드 활성화 (중간 세트로 시작)');
      } else {
        // 2D 모드: 처음으로 리셋
        this.scrollY = 0;
        this.baseScrollOffset = 0; // base도 리셋
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

      // 시각적 오프셋: scrollY - baseScrollOffset (DOM 재배치를 고려한 실제 위치)
      const effectiveScroll = this.scrollY - this.baseScrollOffset;
      this.grid.style.transform = `translateY(${-effectiveScroll}px)`;
    } else {
      // 2D: camera 초기화, grid만 스크롤
      this.camera.style.transform = 'none';
      this.grid.style.transform = `translateY(${-this.scrollY}px)`;
    }

    // 배경 무한 스크롤: scrollY를 배경 높이로 modulo 연산
    const bgOffset = -this.scrollY % this.BG_REPEAT_HEIGHT;
    document.body.style.setProperty('--bg-offset', `${bgOffset}`);

    // 레거시 변수 (호환성)
    document.body.style.setProperty('--scroll-offset', `${this.scrollY}px`);
  }

  destroy(): void {
    this.cardSets = [[], [], []];
    this.container.innerHTML = '';
  }
}
