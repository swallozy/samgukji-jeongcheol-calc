# 삼국지: 천하결전 W2(남군의 봉화) 동맹 정철 계산기

《삼국지: 천하결전》 한국 서버 **W2 · 남군의 봉화** 시즌을 기준으로 동맹 정철의 시간당 수급량, 보유 상한(10,000), 공성 대영 소모량 및 관도 미연결 페널티, 연쇄 공성 스케줄을 시뮬레이션하는 도구입니다.

## 프로젝트 구조

* `core/` — 웹 앱과 향후 디스코드 봇이 함께 사용하는 **공용 계산 엔진 & W2 기준 데이터** (`@jeongcheol/core`)
* `web/` — 브라우저에서 바로 사용하는 **React + Vite 웹 계산기** (`@jeongcheol/web`)
* *(예정)* `bot/` — `@jeongcheol/core`를 그대로 재사용하는 디스코드 슬래시 커맨드 봇

## 실행 방법 (Windows PowerShell 기준)

PowerShell 실행 정책으로 `npm` 대신 `npm.cmd` 사용을 권장합니다.

```powershell
# 1. 의존성 설치 (최초 1회)
npm.cmd install

# 2. 코어 계산 로직 단위 테스트
npm.cmd test

# 3. 웹 앱 개발 서버 실행
npm.cmd run dev

# 4. 프로덕션 빌드
npm.cmd run build
```

## 데이터 수정 위치

인게임 패치나 미확인 수치(예: 3존 페널티 단가, 제철소 2렙 생산량, 동맹 주둔지 등)가 확인되면
[`core/src/w2Data.js`](core/src/w2Data.js)만 업데이트하면 됩니다.
