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

### Counter-Transform 기법

빨간색 원에 **카드의 이동을 상쇄하는 역변환**을 적용:

```
카드의 translate(0, -1000px) → landing-spot에 translate(0, 1000px) 적용
카드의 translate(0, 0)        → landing-spot에 translate(0, 0) 적용
```

이렇게 하면:
- 카드와 landing-spot의 transform이 서로 상쇄되어 **landing-spot은 시각적으로 최종 위치에 고정**
- ghost와 sticker는 카드와 함께 내려옴

### 코드 변경 사항

#### 1. 초기 상태 설정 (line 697-699)

```typescript
// 빨간색 원 초기 위치 (카드의 이동을 상쇄하여 바닥에 고정)
landingSpot.style.transform = 'translate(0, 1000px)';
landingSpot.style.transition = 'transform 1s ease-out';
```

#### 2. 착지 시 업데이트 (line 711-712)

```typescript
// 빨간색 원도 카드와 함께 움직이지만, counter-transform으로 위치 유지
landingSpot.style.transform = 'translate(0, 0)';
```

#### 3. 애니메이션 완료 후 정리 (line 744-747)

```typescript
const landingSpot = pos.card.querySelector('.landing-spot') as HTMLElement;
if (landingSpot) {
  landingSpot.style.transition = '';
}
```

## 동작 원리

### 시각적 계산

카드의 실제 위치 = `top: posY` + `translate(0, cardY)`
Landing spot의 실제 위치 = `top: posY` + `translate(0, cardY)` + `translate(0, spotY)`

**초기 상태:**
- Card: `top: 100px` + `translate(0, -1000px)` = **-900px** (화면 위)
- Landing spot: `-900px` + `translate(0, 1000px)` = **100px** (최종 위치에 고정)

**착지 후:**
- Card: `top: 100px` + `translate(0, 0)` = **100px**
- Landing spot: `100px` + `translate(0, 0)` = **100px** (위치 유지)

### 애니메이션 타임라인

```
시간    카드 translateY    Landing Spot translateY    Landing Spot 최종 위치
t=0     -1000px           1000px                     0px (고정)
t=0.5s  -500px            500px                      0px (고정)
t=1.0s  0px               0px                        0px (고정)
```

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
**수정 라인:** 697-699, 711-712, 744-747
**키워드:** counter-transform, CSS transform, 착지 애니메이션, ISO 모드
