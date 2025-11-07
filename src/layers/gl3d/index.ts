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
  }

  /**
   * 활성화
   */
  private activate(): void {
    // 섬과 버블 표시
    if (this.islandMesh) {
      this.islandMesh.visible = true;
    }

    this.bubbles.forEach((bubble) => {
      bubble.visible = true;
    });

    this.startRenderLoop();
  }

  /**
   * 비활성화
   */
  private deactivate(): void {
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
   * 렌더
   */
  private render(): void {
    // 버블 애니메이션 (부드러운 플로팅)
    const time = Date.now() * 0.001;
    this.bubbles.forEach((bubble, index) => {
      const offset = index * 0.5;
      bubble.position.y += Math.sin(time + offset) * 0.001;
    });

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

    if (this.islandMesh) {
      this.islandMesh.geometry.dispose();
      (this.islandMesh.material as THREE.Material).dispose();
      this.scene.remove(this.islandMesh);
    }

    this.renderer.dispose();
  }
}
