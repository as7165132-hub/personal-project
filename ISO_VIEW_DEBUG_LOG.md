# ISO View 디버깅 로그

ISO 뷰 구현 과정에서 발생한 문제들과 해결 방법을 기록합니다.

## 파일 위치
- **메인 로직**: `/src/layers/dom2d/index.ts`
- **스타일**: `/src/style.css`
- **배포 HTML**: `/index.html`

## Transform 구조 이해

### CSS Transform 적용 순서
CSS transforms는 **오른쪽에서 왼쪽**으로 적용됩니다:
```css
transform: rotateX(30deg) rotateZ(25deg) scale(1) translateX(-200px) translateY(400px);
```

실제 적용 순서:
1. `translateY(400px)` - Y축으로 400px 이동
2. `translateX(-200px)` - X축으로 -200px 이동
3. `scale(1)` - 크기 유지
4. `rotateZ(25deg)` - Z축 기준 25도 회전
5. `rotateX(30deg)` - X축 기준 30도 회전 (마지막)

### Transform Origin
```css
transform-origin: 50% 100%; /* 하단 중앙 기준 회전 */
```

## 스크롤 시스템

### 2D 모드
- **초기 scrollOffset**: `0`
- **wrapping**: 없음
- **transform**: `translateY(-scrollOffset)`
- **범위**: `0 ~ 무한` (하단 제한 없음)

### ISO 모드
- **초기 scrollOffset**: `totalHeight` (중간 세트)
- **wrapping**: `totalHeight ~ 2*totalHeight` 범위로 순환
- **transform**: `rotateX(30deg) rotateZ(25deg) scale(1) translateX(-200px) translateY(offsetY)`
- **offsetY 계산**:
  - `relativeScroll = scrollOffset - totalHeight`
  - `offsetY = BASE_Y - relativeScroll`
  - BASE_Y: 초기 Y 위치 상수

## 문제 해결 히스토리

### 문제 1: Transform 순서 오류
**증상**: ISO 뷰 전환 시 카드가 전혀 보이지 않음

**원인**: `translateY`가 rotation 전에 적용되어 회전 전 공간에서 이동

**해결**:
```typescript
// ❌ 잘못된 순서
transform: translateY(-scrollOffset) rotateX(30deg) rotateZ(25deg)

// ✅ 올바른 순서
transform: rotateX(30deg) rotateZ(25deg) translateY(offsetY)
```

### 문제 2: Transform Origin 위치
**증상**: 카드가 왼쪽 위로 회전하여 화면 밖으로 사라짐

**원인**: `transform-origin: 50% 50%` (중앙 기준)로 설정되어 회전 시 카드가 위로 이동

**해결**:
```css
/* ✅ 하단 기준으로 변경 */
.surface-grid {
  transform-origin: 50% 100%;
}
```

### 문제 3: 스크롤 정규화로 인한 느린 스크롤
**증상**: ISO 모드에서 스크롤이 거의 이동하지 않음

**원인**: `23360px` 범위를 `2000px`로 압축하여 스크롤 감도 극도로 감소

**이전 코드**:
```typescript
const isoScrollRange = 2000;
const normalizedScroll = ((scrollOffset - totalHeight) / totalHeight) * isoScrollRange;
const offsetY = -100 - normalizedScroll; // 최대 -2100px
```

**해결**: 정규화 제거, 실제 스크롤 값 사용
```typescript
const relativeScroll = scrollOffset - totalHeight;
const offsetY = BASE_Y - relativeScroll; // 자연스러운 스크롤
```

### 문제 4: 초기 scrollOffset으로 인한 2D 모드 빈 화면
**증상**: 페이지 로드 시 2D 모드에서 카드가 보이지 않음

**원인**: 초기 `scrollOffset = totalHeight (23360px)`로 설정되어 화면이 중간 세트부터 시작

**해결**:
```typescript
// 초기화 시
this.scrollOffset = 0; // 2D 모드는 0부터 시작

// ISO 전환 시
this.scrollOffset = this.totalHeight; // 중간 세트로 이동
```

### 문제 5: 모드 간 wrapping 충돌
**증상**: 2D 모드에서도 wrapping이 발생하여 흰 화면 등장

**해결**: ISO 모드에서만 wrapping 적용
```typescript
if (this.isIsoMode && this.totalHeight > 0) {
  // wrapping 로직
}

if (!this.isIsoMode && this.scrollOffset < 0) {
  this.scrollOffset = 0; // 2D는 0 이하 방지만
}
```

### 문제 6: ISO 모드 초기 Y 위치 (현재 디버깅 중)
**증상**: ISO 모드 전환 시 카드가 화면에 보이지 않음

**시도한 BASE_Y 값들**:
- `BASE_Y = -400`: 너무 위
- `BASE_Y = 200`: 여전히 보이지 않음
- `BASE_Y = -100`: 보이지 않음 (이전)
- `BASE_Y = 400`: 테스트 중 ← **현재**

**현재 코드**:
```typescript
const offsetY = 400 - relativeScroll;
```

## 디버깅 팁

### 콘솔 로그 확인 사항
```
[ISO DEBUG] scrollOffset: XXXX relative: YYYY offsetY: ZZZZ
```

- `scrollOffset`: 실제 스크롤 누적 값
- `relative`: 중간 세트 기준 상대 위치 (초기 0)
- `offsetY`: 최종 Y 변환 값

### BASE_Y 값 조정 가이드
- **양수**: 카드를 아래로 (화면 안으로)
- **음수**: 카드를 위로 (화면 밖으로)
- **권장 범위**: 200 ~ 600

### Transform Origin 확인
```css
/* Chrome DevTools에서 확인 */
.surface-grid {
  transform-origin: 50% 100%; /* 반드시 하단 */
}

body.iso-mode::before {
  transform-origin: 50% 100%; /* 배경도 동일 */
}
```

## 변경 이력

| 날짜 | BASE_Y | 결과 | 비고 |
|------|--------|------|------|
| 2024-11-08 | -400 | ❌ 너무 위 | 정규화 적용 시 |
| 2024-11-08 | 200 | ❌ 보이지 않음 | 정규화 적용 시 |
| 2024-11-08 | -100 | ❌ 보이지 않음 | 정규화 적용 시 |
| 2024-11-08 | 400 | ❌ 너무 아래 | 정규화 제거 후, 회전축 하단 확인 |
| 2024-11-08 | 0 | ❌ 보이지 않음 | 여전히 아래로 치우침 |
| 2024-11-08 | -200 | 🔄 테스트 중 | 위로 이동 시도 |

## 다음 시도할 값들

BASE_Y 후보 (-200이 안되면):
- -300 (더 위로)
- -100 (조금 아래로)
- -150 (중간)
- -250 (더 위로)

## 참고 코드

### updateTransform() 메서드
```typescript
private updateTransform(): void {
  const grid = this.container.querySelector('.surface-grid') as HTMLElement;
  if (!grid) return;

  if (this.isIsoMode) {
    const relativeScroll = this.scrollOffset - this.totalHeight;
    const offsetY = BASE_Y - relativeScroll; // ← 이 값 조정
    const transformStr = `rotateX(30deg) rotateZ(25deg) scale(1) translateX(-200px) translateY(${offsetY}px)`;
    grid.style.transform = transformStr;
    console.log('[ISO DEBUG] scrollOffset:', this.scrollOffset.toFixed(0), 'relative:', relativeScroll.toFixed(0), 'offsetY:', offsetY.toFixed(0));
  } else {
    grid.style.transform = `translateY(-${this.scrollOffset}px)`;
  }

  // 배경 동기화
  if (this.isIsoMode && this.totalHeight > 0) {
    const relativeScroll = this.scrollOffset - this.totalHeight;
    document.body.style.setProperty('--scroll-offset', `${relativeScroll}px`);
  } else {
    document.body.style.setProperty('--scroll-offset', `${this.scrollOffset}px`);
  }
}
```

### 배경 Transform (CSS)
```css
body.iso-mode::before {
  transform: rotateX(30deg) rotateZ(25deg) scale(1.05) translateX(-200px) translateY(calc(BASE_Y_SAME_AS_GRID - var(--scroll-offset) * 1px));
  transform-origin: 50% 100%;
}
```

## 빌드 & 배포

```bash
# 1. 소스 파일로 되돌리기
# index-surface.html에서 빌드 참조를 소스 참조로 변경

# 2. 빌드
npm run build

# 3. 파일 복사
cp dist/index-surface.html index-surface.html
cp dist/assets/main-*.js assets/
cp dist/assets/main-*.css assets/

# 4. index.html 업데이트 (v 번호 증가)
# ?v=XX 파라미터 증가

# 5. 커밋 & 푸시
git add -A
git commit -m "fix: ISO 뷰 BASE_Y 값 조정 (XXX → YYY)"
git push [URL] main
git push [URL] main:claude/surface-debut-implementation-011CUt8cR53VUpiS5a3XtCct
```
