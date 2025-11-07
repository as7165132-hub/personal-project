/**
 * SURFACE DEBUT - 3D WebGL Layer
 * Three.js 기반 아이소메트릭 씬
 */

import * as THREE from 'three';
import type { AppState } from '@core/types';
import { eventBus } from '@core/event-bus';
import { anchorMap } from '@systems/anchor-map';
import settings from '@config/settings.json';

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
  private activeCardMesh: THREE.Mesh | null = null; // 카드 inflating 메시
  private bubbleAnimation: { scale: number; targetScale: number; time: number } | null = null;
  private cardInflationAnimation: {
    scaleXY: number;
    scaleZ: number;
    targetScaleXY: number;
    targetScaleZ: number;
    time: number
  } | null = null;

  constructor(canvasId: string = 'gl-canvas') {
    let canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      canvas.className = 'gl-canvas';
      document.body.appendChild(canvas);
    }

    this.canvas = canvas;
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
   * 아이소메트릭 카메라 설정
   */
  private setupIsometricCamera(): void {
    const config = settings.camera.iso;

    // 카메라 위치 (아이소메트릭 각도)
    const distance = 20;
    const rad = THREE.MathUtils.degToRad;

    this.camera.position.set(
      distance * Math.sin(rad(config.rz)),
      distance * Math.sin(rad(config.rx)),
      distance * Math.cos(rad(config.rz))
    );

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
    // 캔버스 표시
    this.canvas.style.opacity = '1';

    // 섬과 버블 표시
    if (this.islandMesh) {
      this.islandMesh.visible = true;
    }

    this.bubbles.forEach((bubble) => {
      bubble.visible = true;
    });

    this.startRenderLoop();
    console.log('GL3D Layer activated, canvas opacity set to 1');
  }

  /**
   * 비활성화
   */
  private deactivate(): void {
    // 캔버스 숨김
    this.canvas.style.opacity = '0';

    // 섬과 버블 숨김
    if (this.islandMesh) {
      this.islandMesh.visible = false;
    }

    this.bubbles.forEach((bubble) => {
      bubble.visible = false;
    });

    this.stopRenderLoop();
  }

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

    // 카드 형태의 3D 메시 생성 (둥근 박스) - 훨씬 크게
    const cardGeometry = new THREE.BoxGeometry(3, 4, 0.2, 8, 8, 1);
    const cardMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333, // 빨간색
      transparent: false, // 투명도 제거
      opacity: 1.0,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });

    this.activeCardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
    this.activeCardMesh.position.copy(position);
    this.activeCardMesh.position.z = 2; // 더 위로
    this.activeCardMesh.scale.set(1, 1, 1); // 큰 크기로 시작
    this.scene.add(this.activeCardMesh);
    console.log('Card mesh created at:', this.activeCardMesh.position);

    // 구형 풍선도 추가 (카드에서 튀어나오는 효과) - 훨씬 크게
    const bubbleGeometry = new THREE.SphereGeometry(2, 32, 32);
    const bubbleMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000, // 순수 빨간색
      transparent: false,
      opacity: 1.0,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });

    this.activeBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    this.activeBubble.position.copy(position);
    this.activeBubble.position.z = 4; // 훨씬 위로
    this.activeBubble.scale.set(1, 1, 1); // 큰 크기로 시작
    this.scene.add(this.activeBubble);
    console.log('Bubble created at:', this.activeBubble.position);

    // 카드 inflation 애니메이션 시작
    this.cardInflationAnimation = {
      scaleXY: 1.0,
      scaleZ: 1.0,
      targetScaleXY: 1.5, // 카드는 약간만 커짐
      targetScaleZ: 4.0, // Z 방향으로 크게 부풂
      time: 0,
    };

    // 풍선 애니메이션 시작
    this.bubbleAnimation = {
      scale: 1.0,
      targetScale: 3.0,
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

    // 카드 inflation 애니메이션
    if (this.cardInflationAnimation && this.activeCardMesh) {
      this.cardInflationAnimation.time += 0.016; // ~60fps
      const duration = 0.9; // 900ms

      if (this.cardInflationAnimation.time < duration) {
        const t = this.cardInflationAnimation.time / duration;
        const easeOut = 1 - Math.pow(1 - t, 3);

        // XY는 약간만, Z는 크게 부풀어오름 (pimple 효과)
        const scaleXY = this.cardInflationAnimation.scaleXY +
                       (this.cardInflationAnimation.targetScaleXY - this.cardInflationAnimation.scaleXY) * easeOut;
        const scaleZ = this.cardInflationAnimation.scaleZ +
                      (this.cardInflationAnimation.targetScaleZ - this.cardInflationAnimation.scaleZ) * easeOut;

        this.activeCardMesh.scale.set(scaleXY, scaleXY, scaleZ);

        // 약간 위로 떠오름
        this.activeCardMesh.position.z = 0.5 + (scaleZ * 0.15);
      } else {
        // 애니메이션 완료
        this.activeCardMesh.scale.set(
          this.cardInflationAnimation.targetScaleXY,
          this.cardInflationAnimation.targetScaleXY,
          this.cardInflationAnimation.targetScaleZ
        );
        this.cardInflationAnimation = null;
      }
    }

    // 활성 풍선 애니메이션
    if (this.bubbleAnimation && this.activeBubble) {
      this.bubbleAnimation.time += 0.016; // ~60fps
      const duration = 0.8; // 800ms

      if (this.bubbleAnimation.time < duration) {
        // Ease out elastic
        const t = this.bubbleAnimation.time / duration;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const bounce = Math.sin(t * Math.PI * 2) * 0.1 * (1 - t);
        const scale = this.bubbleAnimation.scale +
                     (this.bubbleAnimation.targetScale - this.bubbleAnimation.scale) * easeOut + bounce;

        this.activeBubble.scale.set(scale, scale, scale);

        // 위로 떠오름
        this.activeBubble.position.z += 0.02 * (1 - t);
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
