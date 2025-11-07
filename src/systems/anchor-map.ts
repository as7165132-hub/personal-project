/**
 * SURFACE DEBUT - Anchor Map
 * DOM 요소와 3D 좌표를 매핑하는 시스템
 */

import { Vector3 } from 'three';

export interface AnchorPoint {
  id: string;
  element: HTMLElement;
  position2D: { x: number; y: number };
  position3D: Vector3;
}

export class AnchorMap {
  private anchors: Map<string, AnchorPoint>;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.anchors = new Map();
    this.init();
  }

  /**
   * 초기화
   */
  private init(): void {
    // 리사이즈 시 앵커 업데이트
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.updateAllAnchors());

      // ResizeObserver로 개별 요소 크기 변화 감지
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          const anchorId = element.getAttribute('data-anchor');
          if (anchorId) {
            this.updateAnchor(anchorId);
          }
        });
      });
    }
  }

  /**
   * 앵커 등록
   */
  register(id: string, element: HTMLElement): void {
    if (this.anchors.has(id)) {
      console.warn(`[AnchorMap] Anchor already registered: ${id}`);
      return;
    }

    const anchor: AnchorPoint = {
      id,
      element,
      position2D: this.calculatePosition2D(element),
      position3D: new Vector3(),
    };

    // data-anchor 속성 설정
    element.setAttribute('data-anchor', id);

    // 3D 포지션 계산
    anchor.position3D = this.convert2Dto3D(anchor.position2D);

    this.anchors.set(id, anchor);

    // ResizeObserver 연결
    if (this.resizeObserver) {
      this.resizeObserver.observe(element);
    }
  }

  /**
   * 앵커 해제
   */
  unregister(id: string): void {
    const anchor = this.anchors.get(id);
    if (!anchor) return;

    if (this.resizeObserver) {
      this.resizeObserver.unobserve(anchor.element);
    }

    this.anchors.delete(id);
  }

  /**
   * 앵커 가져오기
   */
  get(id: string): AnchorPoint | undefined {
    return this.anchors.get(id);
  }

  /**
   * 모든 앵커 가져오기
   */
  getAll(): AnchorPoint[] {
    return Array.from(this.anchors.values());
  }

  /**
   * 2D 포지션 계산
   */
  private calculatePosition2D(element: HTMLElement): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return { x: centerX, y: centerY };
  }

  /**
   * 2D → 3D 좌표 변환
   * (화면 중앙을 원점으로, 정규화된 좌표계)
   */
  private convert2Dto3D(position2D: { x: number; y: number }): Vector3 {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 화면 중앙을 원점으로
    const x = (position2D.x - width / 2) / width;
    const y = -(position2D.y - height / 2) / height; // Y축 반전

    // 3D 공간으로 스케일링 (예: 10 유닛 = 화면 너비)
    const scale = 10;

    return new Vector3(x * scale, y * scale, 0);
  }

  /**
   * 특정 앵커 업데이트
   */
  private updateAnchor(id: string): void {
    const anchor = this.anchors.get(id);
    if (!anchor) return;

    anchor.position2D = this.calculatePosition2D(anchor.element);
    anchor.position3D = this.convert2Dto3D(anchor.position2D);
  }

  /**
   * 모든 앵커 업데이트
   */
  updateAllAnchors(): void {
    this.anchors.forEach((_, id) => this.updateAnchor(id));
  }

  /**
   * 3D 위치로 가장 가까운 앵커 찾기
   */
  findNearest(position: Vector3): AnchorPoint | null {
    let nearest: AnchorPoint | null = null;
    let minDistance = Infinity;

    this.anchors.forEach((anchor) => {
      const distance = anchor.position3D.distanceTo(position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = anchor;
      }
    });

    return nearest;
  }

  /**
   * 정리
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.anchors.clear();
  }
}

export const anchorMap = new AnchorMap();
