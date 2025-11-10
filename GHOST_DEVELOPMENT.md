# Ghost Development Log

ISO 모드에서 스티커와 함께 착지하는 고스트 개발 과정 기록

## 요구사항

1. 스티커와 동일한 크기 (300x300px)
2. 스티커와 동일한 각도 및 회전
3. 스티커와 동일한 비율(scale)
4. 스티커와 함께 착지
5. 착지 1초 후 구석(corner)에서 벗겨지며 사라짐

## 시도 기록

### 시도 1: Transform Wrapper 구조 (v1.6.0)
**날짜**: 이전 세션
**방법**: 고스트를 별도의 transform wrapper 안에 생성

```typescript
const ghost = document.createElement('div');
ghost.style.position = 'absolute';
ghost.style.left = '50%';
ghost.style.top = '50%';
ghost.style.transform = 'translate(-50%, -50%)';
```

**결과**: ❌ 실패
**문제**: 고스트 위치가 제각각으로 나타남. 스티커는 transform wrapper로 회전/스케일 적용되지만, 고스트는 카드에 직접 위치가 설정되어 구조적 불일치 발생.

### 시도 2: clipPath를 이용한 벗겨지기 (v1.5.2 기반)
**날짜**: 이전 세션
**방법**: 고스트를 카드 내부에 생성하고 clipPath로 구석에서 벗겨지기

```css
.ghost-main {
  clip-path: polygon(
    calc(-1 * 10px) calc(-1 * 10px),
    calc(100% + 10px) calc(-1 * 10px),
    calc(100% + 10px) calc(100% + 10px),
    calc(-1 * 10px) calc(100% + 10px)
  );
}

.ghost-container.peeling-off .ghost-main {
  clip-path: polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%);
}
```

**결과**: ❌ 실패
**문제**:
- 고스트가 약 45도 회전하여 기울어짐
- 벗겨지는 애니메이션이 적용되지 않음

### 시도 3: scale(0) + transform-origin (v1.5.3)
**날짜**: 이전 세션
**방법**: clipPath 대신 scale(0)으로 구석으로 수축

```css
.ghost-main {
  transform-origin: 100% 0%;
  transition: transform 0.6s ease-out, opacity 0.4s ease-out 0.6s;
}

.ghost-container.peeling-off .ghost-main {
  transform: scale(0);
}
```

**결과**: ❌ 실패
**문제**: 시도 2와 동일하게 45도 회전 문제 재발

### 시도 4: 스티커 구조 완전 복제 (v1.5.4)
**날짜**: 현재 세션
**방법**: 스티커의 `.sticker-container` + `.sticker-main` 구조를 그대로 따라 `.ghost-container` + `.ghost-main` 생성

**결과**: ❌ 실패
**문제**: 여전히 고스트가 기울어지고 애니메이션 동일

## 🔍 근본 원인 발견

### 문제의 핵심

**카드 회전 메커니즘:**
```javascript
// dom2d/index.ts:678
card.style.transform = `rotate(${pos.rotation}deg) scale(${pos.scale})`;
```

카드가 회전하면 내부의 모든 자식 요소(스티커, 고스트)도 함께 회전합니다.

**스티커가 똑바로 보이는 이유:**
```css
/* style.css:208-239 */
--peel-direction: 0deg;

.sticker-container {
  transform: rotate(var(--peel-direction));  /* 컨테이너는 0deg 회전 */
}

.sticker-main > * {
  /* 내부 이미지를 역회전시켜 똑바로 유지 */
  transform: rotate(calc(-1 * var(--peel-direction)));
}
```

스티커는 **Counter-Rotation 패턴**을 사용합니다:
1. 카드가 회전 → 스티커 컨테이너도 회전
2. 스티커 내부 이미지는 `--peel-direction`의 반대 방향으로 회전
3. 결과: 이미지는 항상 똑바로 보임

**고스트가 기울어지는 이유:**
1. 고스트도 카드의 자식이므로 카드 회전을 상속받음
2. 하지만 고스트에는 역회전(counter-rotation) 메커니즘이 없음
3. 결과: `pos.rotation` 값만큼 기울어진 채로 표시됨

### 왜 모든 시도가 실패했는가?

- **시도 1**: 위치 구조는 달랐지만 역회전이 없어서 실패
- **시도 2, 3, 4**: 구조를 바꿔도 역회전을 적용하지 않아서 모두 동일한 회전 문제 발생

## 해결 방안

### 방법 A: CSS 변수를 통한 역회전 (권장)

1. JavaScript에서 고스트에 회전 값을 CSS 변수로 전달
2. 고스트 내부에 배경을 담을 자식 요소 생성
3. 자식 요소를 역회전시켜 똑바로 유지

```typescript
// 회전 값을 CSS 변수로 설정
ghostContainer.style.setProperty('--ghost-rotation', `${pos.rotation}deg`);
```

```css
/* 고스트 내부 요소 역회전 */
.ghost-main > * {
  transform: rotate(calc(-1 * var(--ghost-rotation)));
}
```

### 방법 B: 카드 외부 배치 (비권장)

고스트를 카드 밖에 배치하여 회전을 상속받지 않도록 함. 하지만 이 경우 위치 동기화가 복잡해짐.

## 다음 단계

방법 A를 적용하여 고스트에 역회전 메커니즘 구현 예정.
