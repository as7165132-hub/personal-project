# 빨간색 원 착지 문제 해결 과정

## 문제 상황

ISO 모드에서 착지 애니메이션 시 다음과 같은 문제가 발생:

- **현상**: 빨간색 원(landing-spot), ghost, 스티커가 모두 함께 하늘에서 바닥으로 내려옴
- **원하는 동작**:
  - 빨간색 원은 처음부터 바닥에 고정
  - ghost와 스티커만 하늘에서 내려와 빨간색 원 위에 착지
- **제약 조건**: 빨간색 원을 다른 영역으로 옮기면 보이지 않으므로, 카드 내부에 위치해야 함

## 원인 분석

### 코드 구조 (`src/layers/dom2d/index.ts`)

```
card (surface-card)
  ├─ landing-spot (빨간색 원, z-index: 0)
  ├─ ghost-container (z-index: 2)
  └─ sticker-container (z-index: 1)
```

### 문제 원인

착지 애니메이션에서 **카드 전체에 transform이 적용**되어 모든 자식 요소가 함께 이동:

```typescript
// 초기 상태 (line 693)
card.style.transform = `translate(0, -1000px) rotate(...) scale(...)`;

// 착지 후 (line 707)
card.style.transform = `translate(0, 0) rotate(...) scale(...)`;
```

카드가 Y축으로 1000px 이동하면서 landing-spot, ghost, sticker가 모두 함께 내려옴.

## 해결 방법

### 완전한 Counter-Transform 기법 + 중앙 정렬 보존

빨간색 원에 **카드의 모든 transform(translate, rotate, scale)을 상쇄하는 역변환**을 적용하면서, CSS의 중앙 정렬도 유지:

**핵심 문제:**
1. CSS에서 landing-spot은 `transform: translate(-50%, -50%)`로 중앙 정렬
2. JavaScript에서 transform을 덮어쓰면 중앙 정렬이 사라짐
3. rotate 후 translate하면 translate 방향이 회전됨

**해결책:**
```
카드: translate(0, -1000px) rotate(R) scale(S)
↓ Counter-transform (오른쪽에서 왼쪽 실행):
1. rotate(-R) - 회전 상쇄하여 좌표계를 원래대로
2. translate(0, 1000px) - 원래 좌표계에서 이동 상쇄
3. scale(1/S) - 크기 상쇄
4. translate(-150px, -150px) - 중앙 정렬 (300px의 50%)

CSS: translate(-150px, -150px) scale(1/S) translate(0, 1000px) rotate(-R)
```

**중요**:
- Transform 순서가 중요함 (CSS transform은 오른쪽에서 왼쪽으로 실행)
- rotate를 **먼저** 상쇄해야 translate가 올바른 방향으로 적용됨
- 중앙 정렬을 픽셀 값으로 변환하여 포함시킴

이렇게 하면:
- 카드와 landing-spot의 transform이 서로 완전히 상쇄됨
- landing-spot은 시각적으로 중앙에 고정됨
- ghost와 sticker는 카드와 함께 내려옴
- **빨간색 원은 애니메이션 없이(transition: none) 처음부터 최종 위치에 고정**

### 코드 변경 사항

#### 1. 초기 상태 설정 (line 697-708)

```typescript
// 빨간색 원 완전 고정 (중앙 정렬 + 모든 transform 상쇄)
// landing-spot 크기: 300px → 중앙 정렬: -150px
// Transform 순서 (오른쪽에서 왼쪽 실행):
// 1. rotate(-R) - 회전 상쇄하여 좌표계를 원래대로
// 2. translate(0, 1000px) - 원래 좌표계에서 이동 상쇄
// 3. scale(1/S) - 크기 상쇄
// 4. translate(-150px, -150px) - 중앙 정렬
const inverseScale = 1 / pos.scale;
const centerOffset = -150; // -50% of 300px
landingSpot.style.transform = `translate(${centerOffset}px, ${centerOffset}px) scale(${inverseScale}) translate(0, 1000px) rotate(-${pos.rotation}deg)`;
landingSpot.style.transformOrigin = 'center center';
landingSpot.style.transition = 'none'; // 애니메이션 없음
```

#### 2. 착지 시 업데이트 (line 720-721)

```typescript
// 빨간색 원: 카드 착지 후에도 rotate/scale 상쇄 유지 (translate만 제거)
landingSpot.style.transform = `translate(${centerOffset}px, ${centerOffset}px) scale(${inverseScale}) rotate(-${pos.rotation}deg)`;
```

#### 3. 애니메이션 완료 후 정리 (line 744-747)

```typescript
const landingSpot = pos.card.querySelector('.landing-spot') as HTMLElement;
if (landingSpot) {
  landingSpot.style.transition = '';
}
```

## 동작 원리

### Transform 상쇄 계산 (정확한 순서)

CSS Transform은 **오른쪽에서 왼쪽으로** 실행되므로:

**카드의 transform:**
```
translate(0, -1000px) rotate(30deg) scale(1.5)
→ 실행 순서 (오른쪽에서 왼쪽):
→ 1. scale(1.5) 적용
→ 2. rotate(30deg) 적용 → 좌표계가 30도 회전됨
→ 3. translate(0, -1000px) 적용 (회전된 좌표계에서!)
```

**문제:** rotate 후 translate하면 translate 방향이 회전됨

**빨간색 원의 counter-transform (정확한 역변환):**
```
translate(-150px, -150px) scale(0.667) translate(0, 1000px) rotate(-30deg)
→ 실행 순서 (오른쪽에서 왼쪽):
→ 1. rotate(-30deg) 적용 → 회전 상쇄, 좌표계를 원래대로
→ 2. translate(0, 1000px) 적용 → 원래 좌표계에서 이동 상쇄
→ 3. scale(0.667) 적용 → 크기 상쇄
→ 4. translate(-150px, -150px) 적용 → 중앙 정렬
```

**핵심:** rotate를 **먼저** 상쇄해야 translate가 올바른 방향으로 작동함

### 애니메이션 타임라인

```
시간    카드 transform                           Landing Spot 상태
t=0     translate(0,-1000) rotate(R) scale(S)   애니메이션 없음, 최종 위치에 중앙 고정
                                                 (counter-transform으로 완전 상쇄)
t=0.5s  translate(0,-500) rotate(R) scale(S)    최종 위치 유지, 중앙 유지
t=1.0s  translate(0,0) rotate(R) scale(S)       최종 위치 유지, 중앙 유지
                                                 (rotate, scale 계속 상쇄 유지)
```

**핵심:** 빨간색 원은 `transition: none`으로 설정되어 **애니메이션 없이 처음부터 중앙의 최종 위치에 고정**됨

## 결과

- ✅ 빨간색 원이 처음부터 바닥에 고정됨
- ✅ 빨간색 원이 카드 중앙에 정확히 위치함
- ✅ 회전이나 크기 변화의 영향을 받지 않음
- ✅ ghost와 스티커가 하늘에서 내려와 빨간색 원 위에 착지
- ✅ 빨간색 원이 카드 내부에 있어 다른 영역으로 옮겨도 함께 이동
- ✅ 같은 그룹(카드)에 묶이면서도 독립적인 애니메이션 가능

## 기술적 인사이트

**CSS Transform의 누적 특성 활용:**
- 부모와 자식의 transform이 누적됨
- 자식에 부모의 역변환을 적용하면 시각적으로 독립적인 위치 제어 가능
- DOM 구조는 유지하면서 애니메이션만 분리

**적용 시나리오:**
- 부모 요소가 애니메이션되지만 특정 자식은 고정하고 싶을 때
- 복잡한 DOM 재구성 없이 시각적 효과만 분리하고 싶을 때

---

**수정 파일:** `src/layers/dom2d/index.ts`
**수정 라인:** 697-708 (초기 설정), 720-721 (착지 후), 744-747 (정리)
**키워드:** counter-transform, CSS transform, rotate, scale, 중앙 정렬, 착지 애니메이션, ISO 모드

## 버전 히스토리

### v3 (최종) - 정확한 Transform 순서 + 중앙 정렬 보존
- **문제:** rotate 후 translate하면 방향이 회전됨, 중앙 정렬이 사라짐
- **해결:** rotate를 먼저 상쇄, 중앙 정렬을 픽셀 값으로 포함
- Counter-transform: `translate(-150px, -150px) scale(1/S) translate(0, 1000px) rotate(-R)`
- 실행 순서: rotate 상쇄 → translate 상쇄 → scale 상쇄 → 중앙 정렬
- ✅ 빨간색 원이 중앙에 완전히 고정됨

### v2 - 완전한 Counter-Transform (순서 오류)
- translate, rotate, scale 모두 상쇄 시도
- **문제:** transform 순서가 잘못되어 여전히 움직임
- Counter-transform: `scale(1/S) rotate(-R) translate(0, 1000*S px)`
- 문제 해결 불완전

### v1 (초기) - Translate만 상쇄
- translate만 상쇄했으나 rotate와 scale의 영향으로 여전히 움직임
- 문제 해결 불완전
