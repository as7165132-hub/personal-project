/**
 * SURFACE DEBUT - 3D WebGL Layer
 * Three.js 기반 아이소메트릭 씬
 */

import * as THREE from 'three';
import type { AppState } from '@core/types';
import { eventBus } from '@core/event-bus';
import { anchorMap } from '@systems/anchor-map';

export class GL3DLayer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // 3D 요소들
  private islandMesh: THREE.Mesh | null = null;
  private bubbles: THREE.Mesh[] = [];
  private activeBubble: THREE.Mesh | null = null;
  private activeCardMesh: THREE.Mesh | null = null; // 임시 정리용 (제거 시 사용)
  private bubbleAnimation: { scale: number; targetScale: number; time: number } | null = null;

  // 스크롤 관련
  private isActive: boolean = false;
  private scrollContainer: HTMLElement | null = null;

  constructor(canvasId: string = 'gl-canvas') {
    let canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      canvas.className = 'gl-canvas';
      document.body.appendChild(canvas);
    }

    this.canvas = canvas;
    this.scrollContainer = document.getElementById('app');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });

    this.init();
  }

  /**
   * 초기화
   */
  private init(): void {
    // 렌더러 설정
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // 투명 배경

    // 카메라 아이소메트릭 설정
    this.setupIsometricCamera();

    // 씬 구성
    this.buildScene();

    // 이벤트 리스너
    this.attachListeners();

    // 리사이즈
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * 카메라 설정 (고정 - 2점 투시)
   */
  private setupIsometricCamera(): void {
    // 카메라를 위에서 내려다보는 각도로 고정
    // 2점 투시: 수직선은 평행, 수평 방향으로만 소실점
    // CSS rotateX(60deg)와 매치되도록 설정
    this.camera.position.set(0, 20, 25);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * 씬 구성
   */
  private buildScene(): void {
    // 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    // 아이소메트릭 섬 (간단한 평면)
    const islandGeometry = new THREE.PlaneGeometry(8, 8, 10, 10);
    const islandMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    this.islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
    this.islandMesh.rotation.x = -Math.PI / 2; // 수평으로
    this.islandMesh.visible = false; // 초기에는 숨김
    this.scene.add(this.islandMesh);

    // 버블 생성 (앵커에 매핑)
    this.createBubbles();
  }

  /**
   * 버블 생성
   */
  private createBubbles(): void {
    const anchors = anchorMap.getAll();

    anchors.forEach((anchor) => {
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.2,
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubble.position.copy(anchor.position3D);
      bubble.visible = false; // 초기에는 숨김
      bubble.userData = { anchorId: anchor.id };

      this.scene.add(bubble);
      this.bubbles.push(bubble);
    });
  }

  /**
   * 이벤트 리스너
   */
  private attachListeners(): void {
    eventBus.on<{ from: AppState; to: AppState }>('state:enter:SURFACE_ISO', () => {
      this.activate();
    });

    eventBus.on('state:reset', () => {
      this.deactivate();
    });

    // 카드 클릭 이벤트 (3D 풍선 생성)
    eventBus.on<{ cardId: string; position: THREE.Vector3 }>('card:clicked', (data) => {
      if (data) {
        console.log(`Card clicked: ${data.cardId}`);
        this.createBalloon(data.position);
      }
    });
  }

  /**
   * 활성화
   */
  private activate(): void {
    this.isActive = true;

    // 캔버스 표시
    this.canvas.style.opacity = '1';

    // 씬 위치 초기화 (현재 스크롤 위치에 맞춤)
    if (this.scrollContainer) {
      const scrollY = this.scrollContainer.scrollTop;
      const sceneOffset = scrollY * 0.015;
      this.scene.position.y = sceneOffset;
      this.scene.position.z = -sceneOffset * 0.5;
    }

    // 이전에 생성된 풍선/카드 메시 제거
    if (this.activeBubble) {
      this.scene.remove(this.activeBubble);
      this.activeBubble.geometry.dispose();
      (this.activeBubble.material as THREE.Material).dispose();
      this.activeBubble = null;
    }

    if (this.activeCardMesh) {
      this.scene.remove(this.activeCardMesh);
      this.activeCardMesh.geometry.dispose();
      (this.activeCardMesh.material as THREE.Material).dispose();
      this.activeCardMesh = null;
    }

    // 섬과 버블은 숨김 상태 유지 (카드 클릭 시 풍선만 표시)
    if (this.islandMesh) {
      this.islandMesh.visible = false;
    }

    this.bubbles.forEach((bubble) => {
      bubble.visible = false;
    });

    // 스크롤 이벤트 리스너 추가
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.handleScroll);
    }

    this.startRenderLoop();
    console.log('GL3D Layer activated, canvas opacity set to 1');
  }

  /**
   * 비활성화
   */
  private deactivate(): void {
    this.isActive = false;

    // 캔버스 숨김
    this.canvas.style.opacity = '0';

    // 씬 위치 완전히 초기화
    this.scene.position.set(0, 0, 0);

    // 섬과 버블 숨김
    if (this.islandMesh) {
      this.islandMesh.visible = false;
    }

    this.bubbles.forEach((bubble) => {
      bubble.visible = false;
    });

    // 스크롤 이벤트 리스너 제거
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll);
    }

    this.stopRenderLoop();
  }

  /**
   * 스크롤 핸들러 (화살표 함수로 this 바인딩)
   */
  private handleScroll = (): void => {
    if (!this.scrollContainer || !this.isActive) return;

    const scrollY = this.scrollContainer.scrollTop;

    // 스크롤 양에 비례하여 씬을 이동 (컨베이어 효과)
    // 2점 투시 효과를 유지하면서 씬만 움직임
    const sceneOffset = scrollY * 0.015; // 스크롤 민감도

    // Y축과 Z축을 함께 이동하여 2점 투시 효과 유지
    this.scene.position.y = sceneOffset;
    this.scene.position.z = -sceneOffset * 0.5;
  };

  /**
   * 렌더 루프 시작
   */
  private startRenderLoop(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.render();
    };

    animate();
  }

  /**
   * 렌더 루프 중지
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 3D 풍선 생성 - 카드가 부풀어 오르는 효과
   */
  private createBalloon(position: THREE.Vector3): void {
    console.log('createBalloon called with position:', position);

    // 렌더링 루프가 실행 중이 아니면 시작
    if (this.animationFrameId === null) {
      console.log('Starting render loop');
      this.startRenderLoop();
    }

    // 기존 활성 풍선 제거
    if (this.activeBubble) {
      this.scene.remove(this.activeBubble);
      this.activeBubble.geometry.dispose();
      (this.activeBubble.material as THREE.Material).dispose();
      this.activeBubble = null;
    }

    // 기존 카드 메시 제거
    if (this.activeCardMesh) {
      this.scene.remove(this.activeCardMesh);
      this.activeCardMesh.geometry.dispose();
      (this.activeCardMesh.material as THREE.Material).dispose();
      this.activeCardMesh = null;
    }

    // 풍선만 생성 (빨간색 구체)
    const bubbleGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const bubbleMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000, // 순수 빨간색
      transparent: true,
      opacity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0xff0000,
      emissiveIntensity: 0.4,
    });

    this.activeBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    this.activeBubble.position.copy(position);
    this.activeBubble.position.z = 2; // 카드 위에서 시작
    this.activeBubble.scale.set(0.1, 0.1, 0.1); // 작게 시작
    this.scene.add(this.activeBubble);
    console.log('Bubble created at:', this.activeBubble.position);

    // 풍선 애니메이션 시작 (작은 크기에서 크게 부풀어오름)
    this.bubbleAnimation = {
      scale: 0.1,
      targetScale: 2.5,
      time: 0,
    };

    console.log('Animation started');
  }

  /**
   * 렌더
   */
  private render(): void {
    // 버블 애니메이션 (부드러운 플로팅)
    const time = Date.now() * 0.001;
    this.bubbles.forEach((bubble, index) => {
      const offset = index * 0.5;
      bubble.position.y += Math.sin(time + offset) * 0.001;
    });

    // 활성 풍선 애니메이션
    if (this.bubbleAnimation && this.activeBubble) {
      this.bubbleAnimation.time += 0.016; // ~60fps
      const duration = 1.2; // 1200ms (더 천천히)

      if (this.bubbleAnimation.time < duration) {
        // Ease out elastic with bounce
        const t = this.bubbleAnimation.time / duration;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const bounce = Math.sin(t * Math.PI * 3) * 0.15 * (1 - t);
        const scale = this.bubbleAnimation.scale +
                     (this.bubbleAnimation.targetScale - this.bubbleAnimation.scale) * easeOut + bounce;

        this.activeBubble.scale.set(scale, scale, scale);

        // 위로 천천히 떠오름
        this.activeBubble.position.z += 0.015 * (1 - t);
      } else {
        // 애니메이션 완료
        const finalScale = this.bubbleAnimation.targetScale;
        this.activeBubble.scale.set(finalScale, finalScale, finalScale);
        this.bubbleAnimation = null;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 리사이즈 처리
   */
  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * 정리
   */
  destroy(): void {
    this.stopRenderLoop();

    // 메시 정리
    this.bubbles.forEach((bubble) => {
      bubble.geometry.dispose();
      (bubble.material as THREE.Material).dispose();
      this.scene.remove(bubble);
    });
    this.bubbles = [];

    if (this.activeBubble) {
      this.activeBubble.geometry.dispose();
      (this.activeBubble.material as THREE.Material).dispose();
      this.scene.remove(this.activeBubble);
    }

    if (this.activeCardMesh) {
      this.activeCardMesh.geometry.dispose();
      (this.activeCardMesh.material as THREE.Material).dispose();
      this.scene.remove(this.activeCardMesh);
    }

    if (this.islandMesh) {
      this.islandMesh.geometry.dispose();
      (this.islandMesh.material as THREE.Material).dispose();
      this.scene.remove(this.islandMesh);
    }

    this.renderer.dispose();
  }
}
