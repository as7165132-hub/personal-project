# SURFACE DEBUT

> **26SS: 아키타입 해체·겹의 자아 발현**
> A breakout isn't a flaw — it's a debut.

웹 기반 비주얼 아트 프로젝트. 2D(Top View)에서 3D(Isometric)로 전환되는 조용한 급진성을 경험합니다.

---

## 🌊 핵심 컨셉

- **은유**: 여드름(breakout) = 데뷔(debut) — 결점이 아닌 발현
- **톤**: 드라이·간결·차분한 급진성
- **경험**: DEFAULT_2D → SWITCHING → SURFACE_ISO

---

## 🏗️ 기술 스택

- **Vite** + **TypeScript**
- **Three.js** (3D 아이소메트릭)
- 바닐라 JavaScript (프레임워크 독립적)

---

## 📦 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 (localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

---

## 🗂️ 프로젝트 구조

```
src/
├─ core/              # 상태 머신, 이벤트 버스, 타임라인
│  ├─ fsm.ts          # Finite State Machine
│  ├─ event-bus.ts    # 이벤트 시스템
│  ├─ threshold.ts    # 임계값 트리거
│  ├─ timeline.ts     # 전환 타이밍 관리
│  └─ types.ts        # 타입 정의
│
├─ layers/            # 레이어 시스템
│  ├─ dom2d/          # 2D DOM 레이어
│  └─ gl3d/           # 3D WebGL 레이어 (Three.js)
│
├─ systems/           # 시스템 모듈
│  ├─ motion-tokens.ts    # 모션 토큰
│  ├─ i18n.ts             # 국제화
│  ├─ accessibility.ts    # 접근성
│  └─ anchor-map.ts       # DOM↔3D 좌표 매핑
│
├─ config/            # 설정 파일
│  ├─ settings.json   # 앱 설정
│  └─ copy.json       # 다국어 텍스트
│
├─ index.ts           # 메인 진입점
└─ style.css          # 스타일
```

---

## 🎮 사용법

### 임계값(Threshold) 트리거

다음 방법 중 하나로 전환을 트리거할 수 있습니다:

1. **클릭**: 화면을 6회 클릭
2. **호버**: 요소에 2.8초 이상 호버
3. **드래그**: 요소를 2회 드래그
4. **키보드**: 포커스 후 Enter/Space

### 디버그 명령어 (개발 모드)

```javascript
// 브라우저 콘솔에서 사용 가능
surfaceDebut.trigger()  // 즉시 전환 트리거
surfaceDebut.reset()    // 초기 상태로 리셋
```

---

## ⚙️ 설정

### `src/config/settings.json`

```json
{
  "threshold": {
    "clicks": 6,      // 클릭 횟수
    "hoverMs": 2800,  // 호버 시간 (ms)
    "dragCount": 2    // 드래그 횟수
  },
  "motion": {
    "switchMs": 1100,  // 전환 시간 (ms)
    "easing": "cubic-bezier(.22,.8,.26,1)"
  },
  "camera": {
    "iso": {
      "rx": 55,    // 아이소메트릭 X 회전
      "rz": 45,    // 아이소메트릭 Z 회전
      "tyVh": -5,  // Y 이동 (vh)
      "scale": 0.96
    }
  }
}
```

### `src/config/copy.json`

다국어 텍스트 관리 (KR/EN):

```json
{
  "KR": {
    "DEBUT": "브레이크아웃은 결점이 아니라 데뷔다.",
    "MODE_ON": "Archetype: On",
    "MODE_OFF": "Archetype: Off / Surface: On"
  }
}
```

---

## 🎨 브랜드 가이드

### 금지 사항

- ❌ 과장된 폭발/파열 표현
- ❌ "짜다", "압출", "염증" 같은 단어
- ❌ 혐오감 유발 비주얼

### 권장 사항

- ✅ **임계·발현·표면화·데뷔·겹·다성·비선형**
- ✅ 부풀고, 풀리고, 드러나는 모션
- ✅ 조용한 급진성

---

## ♿ 접근성

- **Reduced Motion**: `prefers-reduced-motion: reduce` 감지 시 페이드 전환
- **키보드 내비게이션**: Tab, Enter, Space, Escape 지원
- **ARIA**: 라이브 리전으로 상태 변경 안내
- **대비**: 최소 7:1 대비율 준수

---

## 🚀 성능

- **LCP** < 2.5s
- **CLS** < 0.02
- **TBT** < 150ms
- **Bundle** < 250KB (gzip)

---

## 📝 라이선스

MIT

---

## 🔗 관련 문서

- [요청서 원문](./docs/SURFACE-DEBUT-SPEC.md)
- [Vite 공식 문서](https://vitejs.dev/)
- [Three.js 공식 문서](https://threejs.org/)

---

**"전형은 가라앉고, 표면이 말한다."**
