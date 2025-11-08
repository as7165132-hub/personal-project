# ISO VIEW 구현 방식 문서

## 개요
SURFACE DEBUT 프로젝트의 ISO 뷰는 CSS 3D transforms와 고정된 뷰포트를 사용하여 아이소메트릭 스크롤 효과를 구현합니다.

## 핵심 구조

### 1. HTML 구조
```
body
  └── .surface-stage (perspective container)
        └── .surface-camera (transform wrapper)
              └── .surface-grid (world/content)
                    └── .surface-card (items)
```

### 2. CSS Transform 계층

#### Stage (Perspective Container)
- `perspective: 8000px` - 거의 직교 투영에 가까운 투시 (원래 1200px에서 증가)
- `perspective-origin: 50% 50%` - 중앙 기준점
- `overflow: hidden` - 전체 뷰포트 클리핑

```css
.surface-stage {
  perspective: 8000px;
  perspective-origin: 50% 50%;
  overflow: hidden;
  min-height: 100vh;
}
```

#### Camera (Transform Wrapper)
- ISO 모드에서 `rotateX(45deg) rotateZ(45deg) scale(0.8)` 적용
- `height: 100vh` - 고정된 뷰포트 높이
- `overflow: visible` - **핵심**: 뷰포트 밖 카드도 보이게 함
- `transform-style: preserve-3d` - 3D 공간 유지

```css
.surface-camera {
  height: 100vh; /* 고정 뷰포트 */
  overflow: visible; /* 밖의 카드도 보임 */
  transform-style: preserve-3d;
}

/* ISO 모드 활성화 시 */
body.iso-mode .surface-camera {
  transform: rotateX(45deg) rotateZ(45deg) scale(0.8);
}
```

#### Grid (World/Content)
- `padding: 100vh 2rem` - 상하 100vh 패딩으로 스크롤 영역 확장
- `translateY()` 변환으로 스크롤 구현
- 4컬럼 그리드 레이아웃

```css
.surface-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 100vh 2rem; /* 스크롤 영역 확장 */
  width: 85%;
  max-width: 1600px;
  margin: 0 auto;
}
```

## 스크롤 메커니즘

### 2D 모드
```typescript
// camera는 변환 없음
this.camera.style.transform = 'none';

// grid만 Y축으로 이동
this.grid.style.transform = `translateY(${-this.scrollY}px)`;
```

### ISO 모드
```typescript
// camera에 isometric transform 적용
this.camera.style.transform = 'rotateX(45deg) rotateZ(45deg) scale(0.8)';

// grid는 동일하게 Y축으로 이동 (camera 내부에서)
this.grid.style.transform = `translateY(${-this.scrollY}px)`;
```

## 핵심 해결 방법

### 문제 1: 카드 개수 증가 시 ISO 뷰가 하단으로 이동
**원인**: 전체 그리드 높이를 기준으로 transform 적용

**해결**:
- Camera를 고정 높이(`100vh`)로 설정
- Grid에 상하 100vh 패딩 추가로 스크롤 영역만 확장
- ISO transform은 camera에만 적용하여 위치 고정

### 문제 2: 뷰포트 경계에서 카드가 잘려 보임
**원인**: `overflow: hidden`으로 100vh 밖의 카드 숨김

**해결**:
- Camera의 `overflow: visible`로 변경
- 뷰포트 크기는 100vh로 유지하되, 밖의 카드도 렌더링
- 결과: 7줄 → 더 많은 줄이 동시에 보임

### 문제 3: 투시 왜곡으로 인한 부자연스러움
**원인**: `perspective: 1200px`로 인한 과도한 원근감

**해결**:
- `perspective: 8000px`로 증가
- 거의 직교 투영에 가까운 아이소메트릭 뷰 구현

## 3D WebGL Layer (GL3DLayer)

ISO 모드에서 Three.js로 추가적인 3D 요소 렌더링:

### 카메라 설정
```typescript
private initialCameraPosition = new THREE.Vector3(0, 12, 15);
private lookAtTarget = new THREE.Vector3(0, 0, 0);

// 카메라와 씬은 완전히 고정
this.camera.position.copy(this.initialCameraPosition);
this.camera.lookAt(this.lookAtTarget);
this.scene.position.set(0, 0, 0);
```

### 특징
- 스크롤과 무관하게 카메라 위치 고정
- 씬 원점 고정 (스크롤에 따라 이동하지 않음)
- 카드 클릭 시 풍선 애니메이션만 렌더링

## 배경 동기화

CSS 변수로 배경도 스크롤에 맞춰 이동:

```typescript
document.body.style.setProperty('--scroll-offset', `${this.scrollY}px`);
```

```css
body::before {
  transform: translateY(calc(var(--scroll-offset) * -1px));
}

body.iso-mode::before {
  transform: rotateX(45deg) rotateZ(45deg) scale(0.8)
             translateY(calc(var(--scroll-offset) * -1px));
}
```

## 카드 구성

### 수량
- 총 120개 카드
- 5개 주요 카드 + 115개 넘버링 카드

### 레이아웃
- 데스크톱: 4컬럼
- 태블릿 (max-width: 1024px): 2컬럼
- 모바일 (max-width: 768px): 1컬럼

## 성능 최적화

1. **Transform 사용**: reflow 없이 GPU 가속 변환만 사용
2. **고정 뷰포트**: 실제 스크롤 없이 transform으로 구현
3. **Passive 이벤트**: wheel 이벤트를 `passive: false`로 설정하여 preventDefault 가능

## 주요 파일

- `src/style.css` - CSS transform 및 레이아웃
- `src/layers/dom2d/index.ts` - 2D DOM 레이어 및 스크롤 로직
- `src/layers/gl3d/index.ts` - 3D WebGL 레이어
- `index.html`, `index-surface.html` - 진입점

## 버전 히스토리

- v51: 50개 카드로 ISO 뷰 구현
- v52: 120개 카드로 확장, 고정 뷰포트 방식 도입
- v52.1: overflow visible로 변경하여 더 많은 카드 가시성 확보

## 참고사항

- ISO 뷰는 CSS transform만으로 구현 (실제 3D 씬 이동 없음)
- 스크롤은 wheel 이벤트를 가로채서 translateY로 구현
- 무한 스크롤 미구현 (향후 추가 예정)
