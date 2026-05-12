# SiteGuard — v0 패치 완료 패키지

## 변경 사항 요약

v0.dev 산출물에서 아래 내용을 SiteGuard 스펙으로 교체했습니다.

### 색상 전면 교체
| 항목 | v0 (분홍/카키) | SiteGuard (파랑) |
|---|---|---|
| Primary | #D97878 | #0057FF |
| 로그인 배경 | 밝은 베이지 | #0F1A2E 다크 네이비 |
| 사이드바 액센트 | #D97878 분홍 | #0057FF 파랑 |
| 버튼 | 분홍 그라데이션 | #0057FF 단색 |
| 카드 테두리 | 분홍 계열 | 회색 계열 |

### 신규 생성 파일
- `app/globals.css` — SiteGuard 디자인 토큰
- `components/layout/sidebar.tsx` — 색상 패치 + Edge 모드 지원
- `components/layout/header.tsx` — 실시간 시계 포함
- `components/login-page.tsx` — 다크 네이비 로그인
- `app/dashboard/page.tsx` — 파랑 계열 대시보드
- `app/dashboard/layout.tsx` — 레이아웃 래퍼
- `app/devices/page.tsx` — 기기 목록 + 5탭 설정 팝업
- `app/camera/page.tsx` — 카메라 그리드 (1×1/2×2/3×3)
- `app/settings/display/page.tsx` — localStorage 기반 Display 설정

## 실행 방법

```bash
# 1. 의존성 설치
pnpm install   # 또는 npm install

# 2. 개발 서버 실행
pnpm dev   # 또는 npm run dev

# 3. 브라우저에서 확인
# http://localhost:3000
```

## 화면별 URL
- 로그인: http://localhost:3000
- 대시보드: http://localhost:3000/dashboard
- 기기 목록: http://localhost:3000/devices
- 카메라뷰: http://localhost:3000/camera
- Display 설정: http://localhost:3000/settings/display

## 남은 작업 (Claude Code로 진행)
- [ ] 알람 목록 페이지 (/alarm)
- [ ] 사용자 목록 페이지 (/users)
- [ ] 현장 목록 페이지 (/device-groups)
- [ ] Thingsboard API 연동 (Phase B 완료 후)
- [ ] Frigate API 연동 (Edge 모드)
- [ ] VITE_MODE → Next.js env 분기 처리
