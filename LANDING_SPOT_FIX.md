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

### 완전한 Counter-Transform 기법

빨간색 원에 **카드의 모든 transform(translate, rotate, scale)을 상쇄하는 역변환**을 적용:

```
카드: translate(0, -1000px) rotate(R) scale(S)
↓ 역변환
Landing spot: scale(1/S) rotate(-R) translate(0, 1000*S px)
```

**중요**:
- Transform 순서가 중요함 (CSS transform은 오른쪽에서 왼쪽으로 적용)
- translate만 상쇄하면 rotation과 scale의 영향으로 여전히 움직임
- 모든 transform을 역순으로 상쇄해야 완전히 고정됨

이렇게 하면:
- 카드와 landing-spot의 transform이 서로 완전히 상쇄되어 **landing-spot은 시각적으로 최종 위치에 고정**
- ghost와 sticker는 카드와 함께 내려옴
- **빨간색 원은 애니메이션 없이(transition: none) 처음부터 최종 위치에 고정**

### 코드 변경 사항

#### 1. 초기 상태 설정 (line 697-703)

```typescript
// 빨간색 원은 카드의 모든 transform을 상쇄하여 바닥에 고정
// 카드의 scale과 rotation의 역변환을 적용 (translate는 1000px로 상쇄)
const inverseScale = 1 / pos.scale;
landingSpot.style.transform = `scale(${inverseScale}) rotate(-${pos.rotation}deg) translate(0, ${1000 * pos.scale}px)`;
landingSpot.style.transformOrigin = 'center center';
// 빨간색 원은 애니메이션 없이 처음부터 최종 위치에 고정
landingSpot.style.transition = 'none';
```

#### 2. 착지 시 업데이트 (line 715-716)

```typescript
// 빨간색 원: 카드가 착지하면 모든 transform 상쇄 제거 (이미 최종 위치에 있으므로)
landingSpot.style.transform = `scale(${inverseScale}) rotate(-${pos.rotation}deg)`;
```

#### 3. 애니메이션 완료 후 정리 (line 744-747)

```typescript
const landingSpot = pos.card.querySelector('.landing-spot') as HTMLElement;
if (landingSpot) {
  landingSpot.style.transition = '';
}
```

## 동작 원리

### Transform 상쇄 계산

CSS Transform은 **오른쪽에서 왼쪽으로** 적용되므로:

**카드의 transform:**
```
translate(0, -1000px) rotate(30deg) scale(1.5)
→ 1. scale(1.5) 적용
→ 2. rotate(30deg) 적용
→ 3. translate(0, -1000px) 적용
```

**빨간색 원의 counter-transform (완전한 역변환):**
```
scale(0.667) rotate(-30deg) translate(0, 1500px)
→ 1. translate(0, 1500px) 적용 (1000 * 1.5, scale 고려)
→ 2. rotate(-30deg) 적용 (카드 회전 상쇄)
→ 3. scale(0.667) 적용 (1/1.5, 카드 크기 상쇄)
```

**결과:** 모든 transform이 상쇄되어 빨간색 원은 원래 위치에 고정

### 애니메이션 타임라인

```
시간    카드 transform                           Landing Spot 상태
t=0     translate(0,-1000) rotate(R) scale(S)   애니메이션 없음, 최종 위치에 고정
                                                 (counter-transform으로 상쇄)
t=0.5s  translate(0,-500) rotate(R) scale(S)    최종 위치 유지
t=1.0s  translate(0,0) rotate(R) scale(S)       최종 위치 유지
                                                 (rotate, scale만 상쇄 유지)
```

**핵심:** 빨간색 원은 `transition: none`으로 설정되어 **애니메이션 없이 처음부터 최종 위치에 고정**됨

## 결과

- ✅ 빨간색 원이 처음부터 바닥에 고정됨
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
**수정 라인:** 697-703 (초기 설정), 715-716 (착지 후), 737-740 (정리)
**키워드:** counter-transform, CSS transform, rotate, scale, 착지 애니메이션, ISO 모드

## 버전 히스토리

### v2 (최종) - 완전한 Counter-Transform
- translate, rotate, scale 모두 상쇄
- `transition: none`으로 빨간색 원 애니메이션 제거
- 처음부터 최종 위치에 고정

### v1 (초기) - Translate만 상쇄
- translate만 상쇄했으나 rotate와 scale의 영향으로 여전히 움직임
- 문제 해결 불완전
