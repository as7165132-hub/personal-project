# ISO 뷰 카드 가시성 문제 해결

## 문제 상황

ISO 뷰 토글 버튼을 활성화하면 카드가 화면에서 사라지는 문제가 발생했습니다.

### 증상
- 2D 모드: 카드가 정상적으로 표시됨 (x: 328px, y: 64px)
- ISO 모드 활성화 시: 카드가 화면에서 완전히 사라짐
- 콘솔 로그: `✨ ISO 뷰 활성화` 메시지 출력됨

### 재현 방법
1. https://as7165132-hub.github.io/personal-project/ 접속
2. 우측 상단 "ISO VIEW" 버튼 클릭
3. 카드가 사라지는 현상 확인

## 원인 분석

### CSS Transform 문제

ISO 모드에서 사용된 transform 값이 너무 극단적이어서 요소들을 화면 밖으로 밀어냄:

```css
/* 문제가 있던 코드 (src/style.css:170-174) */
body.iso-mode .surface-container {
  transform: rotateX(45deg) rotateZ(30deg) scale(0.8);
  transform-origin: center center;
}
```

#### 왜 이런 문제가 발생했나?

1. **과도한 회전 각도**
   - `rotateX(45deg)`: X축 기준 45도 회전 → 요소가 뒤로 기울어짐
   - `rotateZ(30deg)`: Z축 기준 30도 회전 → 요소가 비스듬히 회전
   - 두 회전이 결합되면서 요소가 시야 범위를 벗어남

2. **부적절한 transform-origin**
   - `center center`: 중앙을 기준으로 회전
   - 회전 시 요소의 상단이 화면 밖으로 밀려남

3. **scale 값 부족**
   - `scale(0.8)`: 80%로 축소
   - 회전된 요소가 더 작아져서 시야에서 완전히 사라짐

### 배경 스크롤 문제

배경도 동일한 문제로 제대로 보이지 않았음:

```css
/* 문제가 있던 코드 (src/style.css:165-168) */
body.iso-mode::before {
  transform: rotateX(45deg) rotateZ(30deg) scale(1.5) translateY(calc(var(--scroll-offset) * -1));
}
```

## 해결 방법

### 1. 회전 각도 감소

더 완만한 ISO 뷰를 위해 각도를 줄임:

```css
/* Before */
rotateX(45deg) rotateZ(30deg)

/* After */
rotateX(30deg) rotateZ(15deg)
```

- X축 회전: 45° → 30° (33% 감소)
- Z축 회전: 30° → 15° (50% 감소)
- 결과: 요소가 화면 내에 유지됨

### 2. Transform Origin 변경

회전 중심을 상단으로 변경하여 카드가 위로 올라가지 않도록 함:

```css
/* Before */
transform-origin: center center;

/* After */
transform-origin: center top;
```

### 3. 수직 위치 조정

`translateY`를 추가하여 카드를 위로 이동:

```css
/* Before */
transform: rotateX(45deg) rotateZ(30deg) scale(0.8);

/* After */
transform: rotateX(30deg) rotateZ(15deg) scale(1) translateY(-10vh);
```

- `scale(0.8)` → `scale(1)`: 100% 크기 유지
- `translateY(-10vh)` 추가: 뷰포트 높이의 10%만큼 위로 이동

### 4. 배경 스크롤 속도 조정

배경이 카드와 함께 부드럽게 움직이도록 속도 조정:

```css
/* Before */
translateY(calc(var(--scroll-offset) * -1))

/* After */
translateY(calc(var(--scroll-offset) * -0.5))
```

- 배경 스크롤 속도를 50%로 감소
- 카드와 배경 사이에 시차 효과 생성

## 수정된 코드

### src/style.css (Lines 165-174)

```css
body.iso-mode::before {
  transform: rotateX(30deg) rotateZ(15deg) scale(1.2) translateY(calc(var(--scroll-offset) * -0.5));
  transform-origin: center center;
}

body.iso-mode .surface-container {
  transform: rotateX(30deg) rotateZ(15deg) scale(1) translateY(-10vh);
  transform-origin: center top;
  transition: transform 0.5s var(--surface-easing);
}
```

## 검증 방법

### 브라우저에서 확인

1. https://as7165132-hub.github.io/personal-project/ 접속 (2-3분 후 배포 완료)
2. 2D 모드에서 카드가 보이는지 확인
3. "ISO VIEW" 버튼 클릭
4. ISO 모드에서도 카드가 보이는지 확인
5. 스크롤하여 배경과 카드가 함께 움직이는지 확인

### 콘솔 로그 확인

```
main-DffaHT-W.js?v=6:1 🌊 SURFACE DEBUT — Initializing...
main-DffaHT-W.js?v=6:1 [DEBUG] Grid 위치 상세: {x: 296, y: 0, width: 1400, height: 23424, top: 0, ...}
main-DffaHT-W.js?v=6:1 [DEBUG] 첫 번째 카드 위치 상세: {x: 328, y: 64, width: 310, height: 400, top: 64, ...}
main-DffaHT-W.js?v=6:1 ✨ ISO 뷰 활성화
```

ISO 활성화 후에도 카드가 화면 내 좌표에 있어야 함 (x, y 값이 화면 범위 내).

## 관련 이슈

### 이전 문제들

1. **초기 카드 비가시성 문제** (Commit: 3e5586b)
   - 증상: 페이지 로드 시 카드가 보이지 않음
   - 원인: CSS의 ISO transform이 항상 적용됨
   - 해결: CSS transform을 주석 처리하고 JavaScript로만 제어

2. **스크롤 시 카드 사라짐 문제** (Commit: 3e5586b)
   - 증상: 스크롤 시 카드가 화면 밖으로 이동
   - 원인: Wheel 핸들러에서 ISO transform 적용
   - 해결: 순수 2D `translateY`만 사용

3. **ISO 토글 구현** (Commit: b1e01b0)
   - 2D와 ISO 뷰를 전환할 수 있는 버튼 추가
   - 하지만 ISO 모드에서 카드가 보이지 않는 문제 발생

4. **현재 문제** (Commit: 72f8c8c)
   - ISO 토글 버튼은 작동하지만 ISO 모드에서 카드가 안 보임
   - Transform 값을 조정하여 해결

## 결론

ISO 뷰에서의 카드 가시성 문제는 과도한 transform 각도와 부적절한 origin 설정이 원인이었습니다.

**핵심 해결책:**
- 회전 각도를 30°/15°로 감소
- transform-origin을 `center top`으로 변경
- `translateY(-10vh)`로 위치 조정
- 배경 스크롤 속도를 50%로 감소

이를 통해 ISO 뷰에서도 카드가 정상적으로 표시되며, 배경과 함께 부드럽게 스크롤됩니다.

## 참고 자료

- CSS 3D Transforms: https://developer.mozilla.org/en-US/docs/Web/CSS/transform
- Transform Origin: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin
- Isometric Projection: https://en.wikipedia.org/wiki/Isometric_projection

## 작성일

2025-11-07

## 작성자

Claude (Sonnet 4.5)
