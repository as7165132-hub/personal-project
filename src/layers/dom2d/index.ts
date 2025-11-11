/**
 * SURFACE DEBUT - 2D DOM Layer (v54 - True infinite scroll with DOM reordering)
 * 컨베이어 벨트 방식 무한 스크롤 (DOM 재배치)
 */

import { i18n } from '@systems/i18n';

interface CardData {
  text: string;
  image?: string; // 선택적 이미지 경로
}

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

  // 카드 데이터 저장 (이미지 매핑용)
  private cardDataList: CardData[] = [];

  // 자동 스크롤 관련
  private autoScrollEnabled: boolean = true; // 자동 스크롤 기본 활성화
  private autoScrollSpeed: number = 0.9; // 스크롤 속도 (px/frame) - 3배 빠르게
  private autoScrollAnimationId: number | null = null;
  private userInteractionTimeout: number | null = null;

  // Dilate 마스크 캐시 (같은 이미지 재사용)
  private dilatedMaskCache: Map<string, string> = new Map();

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
    this.buildBackgroundTiles();

    // 비동기 초기화
    this.buildStructure().then(() => {
      this.setupScrolling();
      this.setupIsoToggle();
    });
  }

  /**
   * 배경 타일 생성 (8칸으로 분할)
   */
  private buildBackgroundTiles(): void {
    // 기존 배경 컨테이너 제거 (있다면)
    const existingBg = document.querySelector('.bg-tiles-container');
    if (existingBg) {
      existingBg.remove();
    }

    // 배경 타일 컨테이너 생성
    const bgContainer = document.createElement('div');
    bgContainer.className = 'bg-tiles-container';

    // 8개 타일 생성
    for (let i = 0; i < 8; i++) {
      const tile = document.createElement('div');
      tile.className = 'bg-tile';
      tile.dataset.tileIndex = String(i); // 나중에 랜덤 이미지 적용 시 사용

      // 임시로 기존 bg-gradient.svg 사용 (나중에 개별 타일 이미지로 교체 가능)
      tile.style.backgroundImage = `url('/personal-project/bg-gradient.svg')`;

      bgContainer.appendChild(tile);
    }

    // body 맨 앞에 추가 (모든 요소 뒤에 배경으로)
    document.body.insertBefore(bgContainer, document.body.firstChild);

    console.log('[BG] 8-tile background created');
  }

  /**
   * 참조 코드 구조: stage > camera > grid
   */
  private async buildStructure(): Promise<void> {
    this.container.innerHTML = '';

    // Camera wrapper (transform을 담당)
    this.camera = document.createElement('div');
    this.camera.className = 'surface-camera';

    // Grid (world)
    this.grid = document.createElement('div');
    this.grid.className = 'surface-grid';

    // 카드 데이터 (30개) - 이미지 경로 포함 가능
    this.cardDataList = [
      { text: i18n.t('PROLOGUE') },
      { text: i18n.t('LAYERS') },
      { text: i18n.t('THRESHOLD') },
      { text: i18n.t('DEBUT') },
      { text: i18n.t('EPILOGUE') },
      ...Array.from({ length: 25 }, (_, i) => ({
        text: `CARD ${String(i + 6).padStart(2, '0')}`
      }))
    ];

    // 3세트 생성 및 세트별로 분리 저장
    for (let set = 0; set < 3; set++) {
      for (let index = 0; index < this.cardDataList.length; index++) {
        const cardData = this.cardDataList[index];
        const card = await this.createCard(cardData, index);
        this.cardSets[set].push(card); // 세트별로 저장
      }
    }

    this.completeStructureSetup();
  }

  /**
   * ISO 모드에서 카드를 스티커로 변환
   */
  private convertCardToSticker(card: HTMLElement, index: number): void {
    // 스티커 이미지 (2개의 PNG를 번갈아 사용)
    const stickerImages = [
      '/personal-project/pngtree-white-t-shirt-mockup-realistic-t-shirt-png-image_9906363.png',
      '/personal-project/Black-Cargo-Pant-PNG-HD-Quality.png'
    ];
    const imageSrc = stickerImages[index % 2];

    // 기존 innerBox를 숨김
    const innerBox = card.querySelector('.surface-card-inner') as HTMLElement;
    if (innerBox) {
      innerBox.style.display = 'none';
    }

    // 스티커 컨테이너 생성
    const stickerContainer = document.createElement('div');
    stickerContainer.className = 'sticker-container';

    // 메인 스티커
    const stickerMain = document.createElement('div');
    stickerMain.className = 'sticker-main';

    const stickerLighting = document.createElement('div');
    stickerLighting.className = 'sticker-lighting';

    const stickerImage = document.createElement('img');
    stickerImage.src = imageSrc;
    stickerImage.className = 'sticker-image';
    stickerImage.alt = '';
    stickerImage.draggable = false;

    stickerLighting.appendChild(stickerImage);
    stickerMain.appendChild(stickerLighting);

    // Flap (벗겨진 부분)
    const flap = document.createElement('div');
    flap.className = 'flap';

    const flapLighting = document.createElement('div');
    flapLighting.className = 'flap-lighting';

    const flapImage = document.createElement('img');
    flapImage.src = imageSrc;
    flapImage.className = 'flap-image';
    flapImage.alt = '';
    flapImage.draggable = false;

    flapLighting.appendChild(flapImage);
    flap.appendChild(flapLighting);

    // 조립
    stickerContainer.appendChild(stickerMain);
    stickerContainer.appendChild(flap);
    card.appendChild(stickerContainer);

    // 클릭 이벤트: 스티커 완전히 벗겨지고 상세 페이지 표시
    let isAnimating = false;
    stickerContainer.addEventListener('click', (e) => {
      if (isAnimating) return;
      isAnimating = true;
      e.stopPropagation();

      // 1단계: 스티커 완전히 벗겨지는 애니메이션
      stickerContainer.classList.add('peeling-off');

      setTimeout(() => {
        // 2단계: 천천히 투명하게 사라지기
        stickerContainer.classList.add('fading-out');

        setTimeout(() => {
          // 3단계: 상품 상세 페이지 모달 표시
          this.showProductDetailModal(imageSrc, index);

          // 클린업
          stickerContainer.classList.remove('peeling-off', 'fading-out');
          isAnimating = false;
        }, 800);
      }, 600);
    });
  }

  /**
   * 상품 상세 페이지 모달 표시
   */
  private showProductDetailModal(imageSrc: string, index: number): void {
    // 배경 블러 오버레이
    const overlay = document.createElement('div');
    overlay.className = 'product-detail-overlay';

    // 상세 페이지 컨테이너
    const detailContainer = document.createElement('div');
    detailContainer.className = 'product-detail-container';

    // 왼쪽: 스티커 이미지
    const imageSection = document.createElement('div');
    imageSection.className = 'product-detail-image';

    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Product Image';
    imageSection.appendChild(img);

    // 오른쪽: 상품 설명 패널
    const infoSection = document.createElement('div');
    infoSection.className = 'product-detail-info';

    // 상품명
    const productName = document.createElement('div');
    productName.className = 'product-info-box';
    productName.innerHTML = `<h2>${index % 2 === 0 ? 'White T-Shirt' : 'Black Cargo Pants'}</h2>`;

    // 상품 설명
    const productDesc = document.createElement('div');
    productDesc.className = 'product-info-box';
    productDesc.innerHTML = `<p>${index % 2 === 0 ?
      'Premium cotton t-shirt with modern fit. Perfect for everyday wear.' :
      'Comfortable cargo pants with multiple pockets. Durable and stylish.'}</p>`;

    // 가격
    const productPrice = document.createElement('div');
    productPrice.className = 'product-info-box';
    productPrice.innerHTML = `<h3>${index % 2 === 0 ? '$29.99' : '$59.99'}</h3>`;

    // 사이즈 정보
    const productSize = document.createElement('div');
    productSize.className = 'product-info-box';
    productSize.innerHTML = `<p>Available Sizes: S, M, L, XL</p>`;

    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.className = 'product-detail-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    });

    infoSection.appendChild(productName);
    infoSection.appendChild(productDesc);
    infoSection.appendChild(productPrice);
    infoSection.appendChild(productSize);

    detailContainer.appendChild(imageSection);
    detailContainer.appendChild(infoSection);
    detailContainer.appendChild(closeBtn);

    overlay.appendChild(detailContainer);
    document.body.appendChild(overlay);

    // 애니메이션 시작
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // ESC 키로 닫기
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.classList.add('closing');
        setTimeout(() => {
          overlay.remove();
        }, 300);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    // 오버레이 클릭 시 닫기
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('closing');
        setTimeout(() => {
          overlay.remove();
        }, 300);
        document.removeEventListener('keydown', handleEsc);
      }
    });
  }

  /**
   * 카드 생성 (텍스트 + 선택적 이미지)
   */
  private async createCard(cardData: CardData, index: number): Promise<HTMLElement> {
    const card = document.createElement('div');
    card.className = 'surface-card';
    card.dataset.cardIndex = String(index); // 카드 인덱스 저장

    // 중앙 사각형 컨테이너 (실제 카드)
    const innerBox = document.createElement('div');
    innerBox.className = 'surface-card-inner';

    // 이미지가 있으면 추가
    if (cardData.image) {
      const img = document.createElement('img');
      img.src = cardData.image;
      img.className = 'surface-card-image';
      img.alt = cardData.text;
      innerBox.appendChild(img);
    }

    // 텍스트 추가
    const p = document.createElement('p');
    p.className = 'surface-card-text';
    p.textContent = cardData.text;
    innerBox.appendChild(p);

    card.appendChild(innerBox);

    return card;
  }

  private completeStructureSetup(): void {
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
    // 로그 간소화: 필요 시 주석 해제
    // console.log('[ROTATE ↓] base:', this.baseScrollOffset.toFixed(0));
  }

  /**
   * 컨베이어 벨트: 위로 스크롤 - 마지막 세트를 첫 번째로 이동
   */
  private rotateUp(): void {
    const lastSet = this.cardSets.pop()!;
    this.cardSets.unshift(lastSet);
    this.renderSets();
    this.baseScrollOffset -= this.cardSetHeight; // scrollY는 유지, base만 조정
    // 로그 간소화: 필요 시 주석 해제
    // console.log('[ROTATE ↑] base:', this.baseScrollOffset.toFixed(0));
  }

  private setupScrolling(): void {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();

      // 수동 스크롤 시 자동 스크롤 일시 정지
      if (this.isIsoMode && this.autoScrollEnabled) {
        this.pauseAutoScroll();
      }

      // ISO 모드에서는 스크롤 방향 반대로
      const scrollDelta = this.isIsoMode ? -e.deltaY * 0.5 : e.deltaY * 0.5;
      this.scrollY += scrollDelta;

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

      // 3초 후 자동 스크롤 재개
      if (this.isIsoMode && this.autoScrollEnabled) {
        this.resumeAutoScrollAfterDelay(3000);
      }
    }, { passive: false });
  }

  /**
   * 자동 스크롤 시작
   */
  private startAutoScroll(): void {
    if (this.autoScrollAnimationId !== null) return;

    const autoScroll = () => {
      if (!this.isIsoMode || !this.autoScrollEnabled) {
        this.autoScrollAnimationId = null;
        return;
      }

      // 천천히 스크롤 (ISO 모드에서는 위로)
      this.scrollY -= this.autoScrollSpeed;

      // 무한 스크롤 로직 적용
      if (this.cardSetHeight > 0) {
        const effectiveScroll = this.scrollY - this.baseScrollOffset;

        if (effectiveScroll >= 2 * this.cardSetHeight) {
          this.rotateDown();
        }
        else if (effectiveScroll < this.cardSetHeight) {
          this.rotateUp();
        }
      }

      this.updateTransform();
      this.autoScrollAnimationId = requestAnimationFrame(autoScroll);
    };

    this.autoScrollAnimationId = requestAnimationFrame(autoScroll);
  }

  /**
   * 자동 스크롤 중지
   */
  private stopAutoScroll(): void {
    if (this.autoScrollAnimationId !== null) {
      cancelAnimationFrame(this.autoScrollAnimationId);
      this.autoScrollAnimationId = null;
    }

    if (this.userInteractionTimeout !== null) {
      clearTimeout(this.userInteractionTimeout);
      this.userInteractionTimeout = null;
    }
  }

  /**
   * 자동 스크롤 일시 정지 (수동 스크롤 시)
   */
  private pauseAutoScroll(): void {
    this.stopAutoScroll();
  }

  /**
   * 지연 후 자동 스크롤 재개
   */
  private resumeAutoScrollAfterDelay(delayMs: number): void {
    if (this.userInteractionTimeout !== null) {
      clearTimeout(this.userInteractionTimeout);
    }

    this.userInteractionTimeout = window.setTimeout(() => {
      if (this.isIsoMode && this.autoScrollEnabled) {
        this.startAutoScroll();
      }
    }, delayMs);
  }

  private setupIsoToggle(): void {
    const btn = document.getElementById('iso-toggle');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      this.isIsoMode = !this.isIsoMode;
      document.body.classList.toggle('iso-mode', this.isIsoMode);
      btn.classList.toggle('active', this.isIsoMode);

      if (this.isIsoMode) {
        // ISO 모드: 랜덤 배치로 전환
        this.scrollY = this.cardSetHeight;
        this.baseScrollOffset = 0;
        console.log('✨ ISO 모드 활성화 (랜덤 배치)');

        // 그리드를 absolute positioning으로 변경하고 카드들을 랜덤 배치
        await this.applyRandomLayout();

        // 자동 스크롤 시작
        if (this.autoScrollEnabled) {
          if (this.cardSetHeight === 0) {
            setTimeout(() => {
              this.scrollY = this.cardSetHeight;
              this.startAutoScroll();
            }, 150);
          } else {
            this.startAutoScroll();
          }
        }
      } else {
        // 2D 모드: 그리드 레이아웃으로 복원
        this.scrollY = 0;
        this.baseScrollOffset = 0;
        console.log('📐 2D 모드로 전환 (그리드 레이아웃)');

        // 그리드 레이아웃으로 복원
        this.applyGridLayout();

        // 자동 스크롤 중지
        this.stopAutoScroll();
      }

      this.updateTransform();
    });
  }

  /**
   * ISO 모드: 카드들을 랜덤하게 배치
   */
  private async applyRandomLayout(): Promise<void> {
    this.grid.style.position = 'relative';
    this.grid.style.display = 'block';
    this.grid.style.height = `${this.grid.scrollHeight}px`; // 기존 높이 유지

    // 스티커 이미지 2개를 미리 dilate 처리 (캐시)
    const stickerImages = [
      '/personal-project/pngtree-white-t-shirt-mockup-realistic-t-shirt-png-image_9906363.png',
      '/personal-project/Black-Cargo-Pant-PNG-HD-Quality.png'
    ];

    console.log('[DILATE] Pre-processing sticker masks...');
    for (const imageSrc of stickerImages) {
      if (!this.dilatedMaskCache.has(imageSrc)) {
        const dilated = await this.createDilatedMask(imageSrc, 15);
        this.dilatedMaskCache.set(imageSrc, dilated);
      }
    }
    console.log('[DILATE] Mask cache ready');

    // 모든 카드에 랜덤 위치 적용
    const allCards = this.grid.querySelectorAll('.surface-card') as NodeListOf<HTMLElement>;
    const containerWidth = this.grid.offsetWidth || 1920;
    const cardWidth = 450; // 카드 너비 증가
    const columns = 6; // 6개 칼럼으로 증가
    const columnWidth = containerWidth / columns;
    const minRowHeight = 400; // 최소 줄 간격 감소
    const maxRowHeight = 600; // 최대 줄 간격 감소

    let currentY = 0;
    let cardsInCurrentRow = 0;
    let maxCardsForCurrentRow = 0; // 현재 줄의 최대 카드 수 (0, 1, 2 중 하나)
    let usedColumnsInRow: number[] = []; // 현재 줄에 사용된 칼럼

    // 카드 위치 정보를 저장할 배열
    const cardPositions: Array<{card: HTMLElement; x: number; y: number; rotation: number; scale: number}> = [];

    // 첫 번째 줄의 최대 카드 수 결정 (가중치: 0=40%, 1=40%, 2=20%)
    const getRandomMaxCards = () => {
      const rand = Math.random();
      if (rand < 0.4) return 0;
      else if (rand < 0.8) return 1;
      else return 2;
    };
    maxCardsForCurrentRow = getRandomMaxCards();

    allCards.forEach((card) => {
      card.style.position = 'absolute';
      card.style.width = `${cardWidth}px`;

      // 현재 줄의 최대 카드 수에 도달하면 다음 줄로
      if (cardsInCurrentRow >= maxCardsForCurrentRow) {
        currentY += Math.random() * (maxRowHeight - minRowHeight) + minRowHeight;
        cardsInCurrentRow = 0;
        usedColumnsInRow = []; // 새 줄에서 칼럼 리셋
        maxCardsForCurrentRow = getRandomMaxCards(); // 새 줄의 최대 카드 수 결정
      }

      // 현재 줄에 카드를 배치하지 않는 경우 (maxCardsForCurrentRow가 0)
      if (maxCardsForCurrentRow === 0) {
        currentY += Math.random() * (maxRowHeight - minRowHeight) + minRowHeight;
        cardsInCurrentRow = 0;
        usedColumnsInRow = [];
        maxCardsForCurrentRow = getRandomMaxCards();
      }

      // 6개 칼럼 중 사용하지 않은 칼럼 선택 (인접 칼럼 포함 체크)
      let randomColumn: number;
      let attempts = 0;
      do {
        randomColumn = Math.floor(Math.random() * columns);
        attempts++;
        // 같은 칼럼이나 바로 옆 칼럼이 이미 사용되었으면 재시도
        const isTooClose = usedColumnsInRow.some(usedCol =>
          Math.abs(usedCol - randomColumn) <= 1
        );
        if (!isTooClose || attempts > 30) break; // 30번 시도 후에는 포기
      } while (true);

      usedColumnsInRow.push(randomColumn);

      const baseX = randomColumn * columnWidth + (columnWidth / 2) - (cardWidth / 2);

      // 칼럼 내에서 약간의 랜덤 오프셋
      const randomX = baseX + (Math.random() * 100 - 50); // ±50px 랜덤
      const randomY = currentY + (Math.random() * 150 - 75); // ±75px 랜덤

      // 랜덤 회전 및 크기
      const randomRotation = Math.random() * 120 - 60; // -60도 ~ 60도
      const randomScale = Math.random() * 0.7 + 0.8; // 0.8 ~ 1.5

      const finalX = Math.max(0, Math.min(containerWidth - cardWidth, randomX));
      const finalY = randomY;

      // 위치 정보 저장
      cardPositions.push({
        card,
        x: finalX,
        y: finalY,
        rotation: randomRotation,
        scale: randomScale
      });

      cardsInCurrentRow++;
    });

    // Y 위치 기준으로 정렬 (하단부터 = Y가 큰 것부터)
    cardPositions.sort((a, b) => b.y - a.y);

    // 착지 애니메이션 전에 먼저 스티커로 변환
    for (let idx = 0; idx < cardPositions.length; idx++) {
      this.convertCardToSticker(cardPositions[idx].card, idx);
    }

    // 착지 애니메이션 (스티커와 ghost 같이 내려오고, ghost만 올라감)
    for (let index = 0; index < cardPositions.length; index++) {
      const pos = cardPositions[index];
      const card = pos.card;

      // ISO 모드 진입 시 ghost 생성 (스티커 구조와 동일하게 main과 flap 포함)
      const ghostContainer = document.createElement('div');
      ghostContainer.className = 'ghost-container';

      // Main ghost
      const ghostMain = document.createElement('div');
      ghostMain.className = 'ghost-main';

      const ghostBackground = document.createElement('div');
      ghostBackground.className = 'ghost-background';

      ghostMain.appendChild(ghostBackground);

      // Flap ghost (벗겨진 부분)
      const ghostFlap = document.createElement('div');
      ghostFlap.className = 'ghost-flap';

      const ghostFlapBackground = document.createElement('div');
      ghostFlapBackground.className = 'ghost-flap-background';

      ghostFlap.appendChild(ghostFlapBackground);

      // 스티커 이미지로 마스크 생성 (구멍 뚫기 - 미리 캐시된 dilate 마스크 사용)
      const stickerImageSrc = stickerImages[index % 2];
      const expandedMaskUrl = this.dilatedMaskCache.get(stickerImageSrc) || stickerImageSrc;
      const usingDilatedMask = this.dilatedMaskCache.has(stickerImageSrc);

      console.log('[MASK] Card', index, 'using', usingDilatedMask ? 'DILATED' : 'ORIGINAL', 'mask');
      console.log('[MASK] URL type:', expandedMaskUrl.substring(0, 50));

      // 디버깅: mask를 별도 이미지로 렌더링해서 확인
      if (index === 0 && usingDilatedMask) {
        const testImg = new Image();
        testImg.onload = () => {
          console.log('[MASK DEBUG] Dilated mask loaded successfully, size:', testImg.width, 'x', testImg.height);
        };
        testImg.onerror = () => {
          console.error('[MASK DEBUG] Failed to load dilated mask as image');
        };
        testImg.src = expandedMaskUrl;
      }

      // 확장된 마스크의 경우 더 큰 크기로 적용 (15px * 2 / 550px ≈ 5.5% 증가)
      // 원래 75% → 80.5%로 증가
      const maskSize = usingDilatedMask ? '80.5% 80.5%' : '75% 75%';

      // ghost-main과 ghost-flap에 마스크 적용
      const maskStyle = `
        radial-gradient(circle, white 100%, white 100%),
        url('${expandedMaskUrl}')
      `;
      ghostMain.style.maskImage = maskStyle;
      ghostMain.style.webkitMaskImage = maskStyle;
      ghostMain.style.maskSize = `cover, ${maskSize}`;
      ghostMain.style.webkitMaskSize = `cover, ${maskSize}`;
      ghostMain.style.maskPosition = 'center, center';
      ghostMain.style.webkitMaskPosition = 'center, center';
      ghostMain.style.maskRepeat = 'no-repeat, no-repeat';
      ghostMain.style.webkitMaskRepeat = 'no-repeat, no-repeat';
      ghostMain.style.maskComposite = 'exclude';
      ghostMain.style.webkitMaskComposite = 'source-out';

      ghostFlap.style.maskImage = maskStyle;
      ghostFlap.style.webkitMaskImage = maskStyle;
      ghostFlap.style.maskSize = `cover, ${maskSize}`;
      ghostFlap.style.webkitMaskSize = `cover, ${maskSize}`;
      ghostFlap.style.maskPosition = 'center, center';
      ghostFlap.style.webkitMaskPosition = 'center, center';
      ghostFlap.style.maskRepeat = 'no-repeat, no-repeat';
      ghostFlap.style.webkitMaskRepeat = 'no-repeat, no-repeat';
      ghostFlap.style.maskComposite = 'exclude';
      ghostFlap.style.webkitMaskComposite = 'source-out';

      // 조립
      ghostContainer.appendChild(ghostMain);
      ghostContainer.appendChild(ghostFlap);
      card.insertBefore(ghostContainer, card.firstChild); // 스티커 컨테이너 앞에 삽입

      // 착지 지점에 큰 원 생성 (300px) - 카드보다 먼저 DOM에 추가
      const landingSpot = document.createElement('div');
      landingSpot.className = 'landing-spot';
      landingSpot.style.left = `${pos.x + cardWidth / 2 - 150}px`; // 중앙 정렬 (300px 원)
      landingSpot.style.top = `${pos.y + 250}px`; // 카드 중앙 지점
      this.grid.insertBefore(landingSpot, card); // 카드 앞에 추가하여 카드 아래에 렌더링

      // 카드 초기 위치 (위쪽에서 시작, 투명)
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;
      card.style.zIndex = '1'; // 착지 지점 원 위에 표시
      card.style.transform = `translate(0, -1000px) scale(${pos.scale})`;
      card.style.opacity = '0';
      card.style.transition = 'transform 1s ease-out, opacity 1s ease-out';

      // ghost 초기 상태 (투명)
      ghostContainer.style.opacity = '0';
      ghostContainer.style.transition = 'opacity 1s ease-out';

      // 1단계: 스티커와 ghost 같이 하단부터 순차적으로 바닥에 내려앉기 (불투명해짐)
      setTimeout(() => {
        card.style.transform = `translate(0, 0) scale(${pos.scale})`;
        card.style.opacity = '1';
        ghostContainer.style.opacity = '1';

        // 2단계: 착지 후 ghost가 구석에서 벗겨지며 사라짐 (임시 비활성화 - 확인용)
        // setTimeout(() => {
        //   // 스티커와 동일한 벗겨지기 애니메이션
        //   ghostContainer.classList.add('peeling-off');
        //
        //   setTimeout(() => {
        //     // 벗겨진 후 투명하게
        //     ghostContainer.style.transition = 'opacity 0.4s ease-out';
        //     ghostContainer.style.opacity = '0';
        //
        //     // 완전히 제거
        //     setTimeout(() => {
        //       if (ghostContainer && ghostContainer.parentNode) {
        //         ghostContainer.remove();
        //       }
        //     }, 400);
        //   }, 600); // clipPath 애니메이션 완료 후
        // }, 1000); // 착지 1초 후
      }, index * 50); // 50ms 간격으로 순차 시작
    }

    // 애니메이션 완료 후 transition 제거
    setTimeout(() => {
      cardPositions.forEach((pos) => {
        pos.card.style.transition = '';
        const ghostContainer = pos.card.querySelector('.ghost-container') as HTMLElement;
        if (ghostContainer) {
          ghostContainer.style.transition = '';
        }
      });
    }, cardPositions.length * 50 + 2200);

    console.log(`[ISO] ${allCards.length} cards randomly positioned (0-2 cards per row, ${columns} columns)`);
  }

  /**
   * 2D 모드: 그리드 레이아웃으로 복원
   */
  private applyGridLayout(): void {
    this.grid.style.position = '';
    this.grid.style.display = '';
    this.grid.style.height = '';

    // 모든 카드의 inline 스타일 제거
    const allCards = this.grid.querySelectorAll('.surface-card') as NodeListOf<HTMLElement>;
    allCards.forEach(card => {
      card.style.position = '';
      card.style.width = '';
      card.style.left = '';
      card.style.top = '';
      card.style.zIndex = '';
      card.style.transform = '';
      card.style.opacity = '';
      card.style.transition = '';

      // 2D 모드에서는 ghost 제거
      const ghostContainer = card.querySelector('.ghost-container');
      if (ghostContainer) {
        ghostContainer.remove();
      }

      // 스티커 컨테이너 제거 및 innerBox 복원
      const stickerContainer = card.querySelector('.sticker-container');
      if (stickerContainer) {
        stickerContainer.remove();
      }

      const innerBox = card.querySelector('.surface-card-inner') as HTMLElement;
      if (innerBox) {
        innerBox.style.display = '';
      }
    });

    // 착지 지점 원들도 모두 제거
    const landingSpots = this.grid.querySelectorAll('.landing-spot');
    landingSpots.forEach(spot => spot.remove());

    console.log('[2D] Grid layout restored');
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

  /**
   * 특정 카드에 이미지 추가 (외부에서 호출 가능)
   * @param cardIndex 카드 인덱스 (0-119)
   * @param imagePath 이미지 경로
   */
  public setCardImage(cardIndex: number, imagePath: string): void {
    if (cardIndex < 0 || cardIndex >= this.cardDataList.length) {
      console.warn(`[CARD] Invalid card index: ${cardIndex}`);
      return;
    }

    // 카드 데이터에 이미지 추가
    this.cardDataList[cardIndex].image = imagePath;

    // 모든 세트의 해당 카드 업데이트
    this.cardSets.forEach(set => {
      const card = set[cardIndex];
      if (!card) return;

      const innerBox = card.querySelector('.surface-card-inner');
      if (!innerBox) return;

      // 기존 이미지 제거
      const existingImg = innerBox.querySelector('.surface-card-image');
      if (existingImg) {
        existingImg.remove();
      }

      // 새 이미지 추가
      const img = document.createElement('img');
      img.src = imagePath;
      img.className = 'surface-card-image';
      img.alt = this.cardDataList[cardIndex].text;

      // 텍스트 앞에 이미지 삽입
      const textElement = innerBox.querySelector('.surface-card-text');
      if (textElement) {
        innerBox.insertBefore(img, textElement);
      } else {
        innerBox.appendChild(img);
      }
    });

    console.log(`[CARD] Image set for card ${cardIndex}: ${imagePath}`);
  }

  /**
   * 여러 카드에 이미지 일괄 추가
   * @param imageMap 카드 인덱스 -> 이미지 경로 맵
   */
  public setCardImages(imageMap: Record<number, string>): void {
    Object.entries(imageMap).forEach(([index, path]) => {
      this.setCardImage(Number(index), path);
    });
  }

  /**
   * 자동 스크롤 토글
   */
  public toggleAutoScroll(): void {
    this.autoScrollEnabled = !this.autoScrollEnabled;

    if (this.autoScrollEnabled && this.isIsoMode) {
      this.startAutoScroll();
      console.log('[AUTO SCROLL] 활성화');
    } else {
      this.stopAutoScroll();
      console.log('[AUTO SCROLL] 비활성화');
    }
  }

  /**
   * 자동 스크롤 속도 설정
   * @param speed 스크롤 속도 (px/frame, 기본값: 0.3)
   */
  public setAutoScrollSpeed(speed: number): void {
    this.autoScrollSpeed = speed;
    console.log(`[AUTO SCROLL] 속도 설정: ${speed} px/frame`);
  }

  /**
   * 자동 스크롤 상태 확인
   */
  public getAutoScrollStatus(): { enabled: boolean; speed: number; isRunning: boolean } {
    return {
      enabled: this.autoScrollEnabled,
      speed: this.autoScrollSpeed,
      isRunning: this.autoScrollAnimationId !== null
    };
  }

  /**
   * SVG feMorphology를 사용한 테두리 스트로크 방식 확장
   * 이미지를 먼저 Canvas로 인라인화한 후 SVG 필터 적용
   * @param imageSrc 원본 이미지 경로
   * @param expandPx 확장할 픽셀 수 (테두리 두께)
   * @returns SVG 필터가 적용된 data URL
   */
  private createDilatedMask(imageSrc: string, expandPx: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        console.log('[DILATE] Processing image:', imageSrc, 'size:', img.width, 'x', img.height, 'expand:', expandPx);

        // 1단계: 이미지를 Canvas로 로드해서 인라인 data URL로 변환
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const inlineImageData = tempCanvas.toDataURL('image/png');

        // 2단계: 인라인 이미지를 사용한 SVG 필터 적용
        // feMorphology로 알파 채널을 확장한 후, 원본 이미지와 합성
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}" viewBox="0 0 ${img.width} ${img.height}">
            <defs>
              <filter id="expand" x="-50%" y="-50%" width="200%" height="200%">
                <!-- Step 1: 원본 알파 채널을 dilate로 확장 -->
                <feMorphology operator="dilate" radius="${expandPx}" in="SourceAlpha" result="expandedAlpha"/>
                <!-- Step 2: 확장된 알파를 원본 이미지로 채움 -->
                <feComposite operator="in" in="SourceGraphic" in2="expandedAlpha" result="expanded"/>
              </filter>
            </defs>
            <image href="${inlineImageData}" x="0" y="0" width="${img.width}" height="${img.height}"
                   filter="url(#expand)" preserveAspectRatio="xMidYMid meet"/>
          </svg>
        `;

        // 3단계: SVG를 base64 data URL로 변환하고 디버그 출력
        const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        console.log('[DILATE] SVG Filter applied with radius:', expandPx);
        console.log('[DILATE] Raw SVG (first 500 chars):', svg.substring(0, 500));
        resolve(svgDataUrl);
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageSrc}`));
      };

      img.src = imageSrc;
    });
  }

  destroy(): void {
    this.stopAutoScroll();
    this.cardSets = [[], [], []];
    this.container.innerHTML = '';

    // 배경 타일 제거
    const bgContainer = document.querySelector('.bg-tiles-container');
    if (bgContainer) {
      bgContainer.remove();
    }
  }
}
