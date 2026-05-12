# app/ 운영 문서 (Walkthrough)

> 문서 성격: SiteGuard 응용서비스(UI·백엔드) 변경 이력 + 개발 가이드
> 섹션 1 (현황 스냅샷)은 작업할 때마다 **덮어쓴다.**
> 섹션 2 (변경 이력)은 **위에 추가만** 한다. 수정하지 않는다.

---

## 섹션 1 — 현재 개발 현황 스냅샷

> 마지막 업데이트: 2026-04-14 (2차)

### 1-1. 패키지 구조

```
app/
├── doc/              ← 이 문서 포함 개발 문서
├── frontend/         ← Next.js 16 웹 UI (주 개발 영역)
├── backend/          ← API 서버 (Phase B 이후 개발 예정)
└── temp_test/        ← 테스트 코드 (CLAUDE.md 규칙 적용)
```

### 1-2. frontend/ 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 16.2.0 + React 19 + TypeScript 5.7 |
| 스타일링 | Tailwind CSS v4 |
| UI 컴포넌트 | shadcn/ui (Radix UI 기반) |
| 차트 | recharts 2.15 |
| 테이블 | @tanstack/react-table v8 |
| 드래그 | react-grid-layout (대시보드), @dnd-kit (설정) |
| 아이콘 | lucide-react |
| 패키지매니저 | pnpm |
| 배포 예정 | Vercel |

### 1-3. frontend/ 폴더 구조

```
frontend/
├── app/                        ← Next.js App Router (페이지)
│   ├── page.tsx                ✅ 로그인
│   ├── layout.tsx              ✅
│   ├── globals.css             ✅ SiteGuard 디자인 토큰
│   ├── dashboard/              ✅ 대시보드
│   ├── camera/                 ✅ 카메라뷰
│   ├── devices/                ✅ 기기 목록 + 설정 팝업
│   ├── settings/display/       ✅ Display 설정
│   ├── alarm/                  ⏳ 미구현
│   ├── device-groups/          ⏳ 미구현
│   ├── users/                  ⏳ 미구현
│   ├── user-groups/            ⏳ 미구현
│   ├── settings/site/          ⏳ 미구현
│   ├── settings/model/         ⏳ 미구현
│   ├── settings/firmware/      ⏳ Phase C
│   ├── recording/clips/        ⏳ Edge 전용
│   ├── recording/timeline/     ⏳ Edge 전용
│   └── help/{notice,as}/       ⏳ TBD
│
├── components/
│   ├── layout/                 ✅ sidebar.tsx, header.tsx
│   ├── login-page.tsx          ✅
│   ├── features/               ← 화면별 컴포넌트 (점진적 이동)
│   │   ├── dashboard/widgets/
│   │   ├── devices/
│   │   ├── camera/
│   │   ├── alarm/
│   │   ├── users/
│   │   └── settings/
│   └── [shadcn/ui 컴포넌트들]  ✅ 30+ 컴포넌트
│
├── lib/
│   ├── utils.ts                ✅
│   ├── api/                    ⏳ Phase B (TB/Frigate/go2rtc 연동)
│   │   ├── thingsboard.ts
│   │   ├── frigate.ts
│   │   └── go2rtc.ts
│   └── stores/                 ⏳ 전역 상태 관리
│
├── hooks/                      ⏳ Custom hooks
├── types/                      ⏳ TypeScript 공통 타입
├── styles/                     ⏳ 추가 CSS
├── public/                     ← 정적 파일
└── .env.example                ← 환경 변수 템플릿
```

### 1-4. 화면 구현 현황

| 화면 | 경로 | 상태 |
|------|------|------|
| 로그인 | `/` | ✅ 완성 |
| 대시보드 | `/dashboard` | ✅ 완성 (위젯 드래그, 편집 모드) |
| 기기 목록 | `/devices` | ✅ 완성 (필터, 5탭 설정 팝업) |
| 카메라뷰 | `/camera` | ✅ 완성 (1×1/2×2/3×3 그리드) |
| Display 설정 | `/settings/display` | ✅ 완성 (localStorage) |
| 현장 목록 | `/device-groups` | ✅ 완성 (스토리지 바, 요약 카드) |
| 알람 | `/alarm` | ✅ 완성 (긴급/경고/정보 필터, 처리 상태) |
| 사용자 목록 | `/users` | ✅ 완성 (역할 필터, 접근 현장) |
| 사용자 그룹 | `/user-groups` | ✅ 완성 (카드형, 권한 테이블) |
| 모델 관리 | `/settings/model` | ⏳ Priority 3 |
| 현장 관리 | `/settings/site` | ⏳ Priority 3 |
| 녹화 클립 | `/recording/clips` | ⏳ Edge 전용 |
| 이벤트 타임라인 | `/recording/timeline` | ⏳ Edge 전용 |

### 1-5. 실행 방법

```bash
cd app/frontend
pnpm install
pnpm dev
# → http://localhost:3000
```

### 1-6. 모드 분기

```bash
# .env.local 생성
cp .env.example .env.local

# cloud 모드 (기본): Dashboard, Camera, Device, Alarm, Users, Settings
NEXT_PUBLIC_MODE=cloud

# edge 모드: cloud 메뉴 + Recording (Clips, Timeline) 추가
NEXT_PUBLIC_MODE=edge
```

### 1-7. 백엔드 연동 계획

| 데이터 | API | 시점 |
|--------|-----|------|
| 기기 상태·알람 | Thingsboard REST API | Phase B 완료 후 |
| 라이브 영상 | go2rtc WebRTC | 현재 클라우드 운영 중 |
| 녹화 클립·이벤트 | Frigate REST API | Phase C (Edge 전용) |
| Display 설정 | localStorage | ✅ 현재 동작 |

---

## 섹션 2 — 변경 이력 (Changelog)

---

### [2026-04-14 2차] Priority 1/2 화면 구현 + shadcn 경로 수정

**완료 항목:**
- `components/ui/` 디렉토리 신설 → shadcn/ui 컴포넌트 이동 (빌드 오류 수정)
- `/device-groups` — 현장 목록 구현 (요약 카드 4종, 스토리지 진행바, 상태 필터)
- `/alarm` — 알람 목록 구현 (긴급/경고/정보 요약, 처리 상태 워크플로, 일괄 처리)
- `/users` — 사용자 목록 구현 (역할 분류, 접근 현장 태그, 활성/비활성 필터)
- `/user-groups` — 사용자 그룹 구현 (카드형 레이아웃, 역할별 권한 요약 테이블)
- `pnpm build` 10개 라우트 전체 성공 확인

**현황:** Priority 1, 2 화면 완성. Priority 3 (설정/모델관리) 및 API 연동이 다음 단계.

---

### [2026-04-14] frontend 초기 셋업 — 프로토타입 이관 및 폴더 구조 확립

**배경:** v0.dev로 생성한 UI 프로토타입(siteguard_patched.zip)을 `app/frontend/`로 이관.
인프라 레포(siteguard-infra) 내 `app/` 서브패키지로 통합 관리.

**완료 항목:**
- `app/` 폴더 구조 신규 생성 (frontend/, backend/, doc/, temp_test/)
- `app/frontend/` — Next.js 16 프로젝트 배치 (5개 화면 완성 상태)
- `components/features/` 폴더 구조 확립 (화면별 컴포넌트 분리 예정)
- `lib/api/`, `lib/stores/`, `hooks/`, `types/` 폴더 사전 생성
- `package.json` 이름 `my-project` → `siteguard-frontend` 수정
- `.env.example` 신규 작성 (모드 분기, API 엔드포인트 템플릿)

**이관된 완성 화면:** 로그인, 대시보드, 기기 목록(+설정 팝업), 카메라뷰, Display 설정

**다음 작업 우선순위:**
1. `/device-groups` — 현장 목록
2. `/alarm` — 알람 목록
3. `/users`, `/user-groups` — 사용자 관리
4. Thingsboard API 연동 lib 작성
