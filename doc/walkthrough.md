# 인프라 전체 운영 문서 (Infra Walkthrough)

> 문서 성격: 패키지 경계를 넘는 인프라 전체 변경 이력 + 진척 관리
> 섹션 1 (현황 스냅샷)은 작업할 때마다 **덮어쓴다.**
> 섹션 2 (변경 이력)은 **위에 추가만** 한다. 수정하지 않는다.

---

## 섹션 1 — 현재 인프라 현황 스냅샷

> 마지막 업데이트: 2026-05-12 (TB 커스텀 관제 UI 완성 + Claude Code Hooks 구성)

### 1-1. 환경별 역할

| 환경 | 위치 | 역할 | 상태 |
|------|------|------|------|
| **클라우드** | Hetzner CX33, 46.62.155.122 (Helsinki) | 통합 관제(요약), 라이브뷰(go2rtc), 코드 관리 | ✅ 운영 중 |
| **LTE 현장** | 192.168.1.x (M2MNet LT7) | CCTV-1(TVT Dome), CCTV-3(VHT Dome) | ✅ 운영 중 |
| **에지 PC (임시: 개발PC)** | 192.168.1.111 (Linux) | Frigate 감지·녹화, 에지 관제, 로컬 이벤트 저장 | 🔧 구성 중 |
| **에지 PC (목표: 현장 전용)** | 현장 소형 PC | 위와 동일 역할, 개발PC 대체 | 🔲 3단계 예정 |
| **주택 현장** | 외부 공유기 하위 | CCTV-2(TVT Bullet) — 추가 예정 | 🔲 예정 |

### 1-2. 서비스 현황

**클라우드 (Hetzner):**

| 서비스 | 포트 | 상태 | 비고 |
|--------|------|------|------|
| Thingsboard 4.2.1.1 | 8080, 1884, 7070 | ✅ 운영 중 | 요약 관제·이벤트 수신 |
| go2rtc 1.9.9 | 1984(API), 8555(RTSP) | ✅ 운영 중 | 외부 라이브뷰 |
| Nginx | 80 | ✅ 운영 중 | go2rtc WebSocket 프록시 |

**에지 PC (개발PC 임시 운영):**

| 서비스 | 포트 | 상태 | 비고 |
|--------|------|------|------|
| Frigate 0.17.1 | 5000, 8554, 8555 | 🔧 재설정 필요 | 구 카메라 IP(192.168.0.x) → 신규(192.168.1.x) 업데이트 필요 |
| Mosquitto (Frigate용) | 1883 | ✅ 운영 중 | |
| TB-2 브리지 | — | ✅ 운영 중 | Frigate → 클라우드 TB MQTT |
| 에지 관제 UI | — | 🔲 개발 예정 | 라이브뷰 + 상세 이벤트·클립 |

### 1-3. 클라우드 서버 구성

| 항목 | 내용 |
|------|------|
| 서버 | Hetzner CX33 (ubuntu-8gb-hel1-1) |
| OS | Ubuntu 24.04 LTS |
| IP | 46.62.155.122 (공인) / 100.105.211.82 (Tailscale) |
| 접속 | `ssh hetzner` (~/.ssh/config 등록) |
| 코드 위치 | `/root/projects/siteguard-infra/` |
| Python venv | `/root/projects/siteguard-infra/thingsboard/.venv/` |

### 1-4. Tailscale 네트워크

| 기기 | Tailscale IP | 상태 |
|------|-------------|------|
| ubuntu-8gb-hel1-1 (Hetzner) | 100.105.211.82 | ✅ 연결됨 |
| visionlinux-alien (로컬 PC) | 100.118.143.92 | ✅ 연결됨 |

- 현장 카메라(192.168.1.x)는 LTE DDNS 경유 접근 — Tailscale 불필요
- Hetzner에서 에지 PC SSH: `ssh visionlinux` (`~/.ssh/config` 등록)
- Tailscale SSH 사용 (키 관리 불필요, 계정 인증으로 통합)
- 에지 PC → 클라우드 TB MQTT 연결은 공인망 직접 사용 (1884 포트)

### 1-5. Phase 진행 현황

**클라우드 레이어 (완료):**

| Phase | 내용 | 상태 |
|-------|------|------|
| **Phase A** | GitHub 연동, Tailscale 설치 | ✅ 완료 (2026-04-09/14) |
| **Phase B** | Hetzner 서버 구축 + Thingsboard 이전 | ✅ 완료 (2026-04-13) |
| **TB-2** | Frigate → Thingsboard MQTT 연동 | ✅ 완료 (2026-04-13) |
| **Phase C** | go2rtc + LTE DDNS 카메라 스트리밍 | ✅ 완료 (2026-05-11) |
| **Phase C 잔여** | TB 대시보드, 서브스트림, MSE 외부망 정상화 | ✅ 완료 (2026-05-11) |
| **Phase C-UI** | TB 커스텀 관제 UI — 기기 탭 패널 교체 + camera-detail/list | ✅ 완료 (2026-05-12) |
| **개발환경** | CLAUDE.md Behavioral Contract + Claude Code Hooks 자동화 | ✅ 완료 (2026-05-12) |

**에지 레이어 (진행 예정):**

| Phase | 내용 | 상태 |
|-------|------|------|
| **Phase D-1** | Frigate 카메라 IP 업데이트 (→ 192.168.1.x) + 감지 확인 | 🔲 다음 |
| **Phase D-2** | 에지 관제 UI — 라이브뷰 + 상세 이벤트·클립 재생 | 🔲 |
| **Phase D-3** | 클라우드 TB 요약 연동 — MQTT 브리지 재정비 | 🔲 |
| **Phase D-4** | 클라우드 → 에지 데이터 pull (배치·1회성) | 🔲 |
| **Phase E** | cctv-2 추가 (TVT Bullet, 주택 공유기 DDNS) | 🔲 |
| **Phase F** | 에지 PC → 현장 전용 소형 PC 이전 | 🔲 예정 |

**개발 환경 고도화 (Phase 독립):**

| 항목 | 내용 | 조건 |
|------|------|------|
| Elicitation | 카메라 신규 등록 시 Claude가 필요 정보 먼저 질문 → 자동 속성 세팅 | 지금 가능 |
| Multi-agent 핸드오프 | Hetzner 에이전트 코드 작성·push → 에지 에이전트 자동 pull·재시작 | Phase D 완료 후 |
| /loop 모니터링 | TB·go2rtc 헬스체크 주기 감시, 이상 시 알림 | Phase D 완료 후 |
| Open-Closed 파이프라인 | 신규 카메라·서비스 추가 시 patch 스크립트 무수정 확장 | Phase E 준비 시 |
| Harness Engineering | Hetzner/에지 에이전트 오케스트레이션 전체 자동화 | Phase F 이후 |
| /goal 배포 자동화 | 코드 변경 → 검증 → 배포 전 사이클 자율 실행 | Harness 완성 후 |

> **판단 기준:** 에지 레이어 미완성 상태에서 하네스 구축 시 복잡성만 증가. Phase D(에지 안정화) 완료를 전제로 순차 적용.

### 1-6. 아키텍처 설계 원칙

```
[에지단 — 현장 PC]                          [클라우드 — Hetzner]
┌─────────────────────────────────┐          ┌──────────────────────────────┐
│ Frigate (감지·녹화)              │          │ Thingsboard                  │
│ ├── 객체 감지 (OpenVINO GPU)     │  MQTT   │ ├── 요약 이벤트 수신          │
│ ├── 감지 클립·스냅샷 저장        │─(요약)─→│ ├── 기기 상태 모니터링        │
│ └── 상세 이벤트·로그 원본 보관   │          │ └── 간략 관제 대시보드        │
│                                 │◄─(요청)─│                              │
│ 에지 관제 UI                    │  필요시   │ go2rtc (외부 라이브뷰)        │
│ ├── 라이브뷰 (go2rtc 직접)      │  배치/   │ └── Nginx 포트 80 프록시      │
│ ├── 상세 이벤트 목록·검색        │  1회성   └──────────────────────────────┘
│ └── 클립·스냅샷 재생             │
│                                 │
│ [카메라]                         │
│ ├── CCTV-1 TVT Dome (LTE DDNS) │
│ ├── CCTV-3 VHT Dome (LTE DDNS) │
│ └── CCTV-2 TVT Bullet (예정)    │
└─────────────────────────────────┘
```

**데이터 계층 분리 원칙:**

| 데이터 | 에지단 (원본) | 클라우드 | 전송 방식 |
|--------|-------------|---------|---------|
| 영상 원본 (카메라 SD) | ✅ 상시 보관 | — | 카메라 자체 저장 |
| 감지 클립·스냅샷 | ✅ 에지 PC 저장 | 🔄 필요시 | 배치·1회성 pull |
| 상세 이벤트·로그 | ✅ 에지 DB | 🔄 필요시 | 배치·1회성 pull |
| 요약 이벤트 | ✅ 에지 보관 | ✅ 상시 | MQTT 실시간 push |
| 기기 상태 | ✅ 에지 | ✅ 상시 | MQTT 60초 주기 |
| 라이브뷰 | ✅ 에지 직접 | ✅ 상시 | go2rtc 재스트리밍 |

**핵심 설계 원칙:**
- **에지 자립**: 클라우드 연결 없어도 에지 단독 감지·저장·관제 완결
- **클라우드 경량**: 실시간은 요약만 수신, 상세 데이터는 필요 시 pull
- **코드 관리**: Hetzner에서 작성·push → 에지 PC `git pull` → 실행
- **단계적 이전**: 현재 개발 PC(임시) → 현장 전용 소형 PC(Phase F)

### 1-7. SiteGuard 관제 화면 접속

| 화면 | URL |
|------|-----|
| TB 통합 관리 UI | http://46.62.155.122:8080 (tenant@thingsboard.org / tenant) |
| **카메라 목록 관제** | http://46.62.155.122:8080/camera-list.html |
| **CCTV-1 상세** | http://46.62.155.122:8080/camera-detail.html?id=b24c2930-4cea-11f1-acfb-7d7ca6d1fbf3 |
| **CCTV-3 상세** | http://46.62.155.122:8080/camera-detail.html?id=b268b1e0-4cea-11f1-acfb-7d7ca6d1fbf3 |
| TB 기기 목록 (사이드 패널) | http://46.62.155.122:8080/entities/devices (기기 클릭 → 커스텀 패널 자동 표시) |
| 메인 관제 그리드 대시보드 | http://46.62.155.122:8080/dashboard/f1690ea0-4da6-11f1-b761-7d7ca6d1fbf3 |
| go2rtc Web UI (직접) | http://46.62.155.122:1984 |
| go2rtc (Nginx 경유) | http://46.62.155.122/go2rtc/ |

> **영상 스트리밍 방식:** MSE (Nginx 포트 80 → go2rtc 1984 프록시)  
> **TB 기기 탭 패널 교체:** Entities → Devices → 기기 클릭 시 Details/Attributes 탭 대신 camera-detail.html 자동 표시 (sg-inject.js)

### 1-8. 빠른 접속 명령어

```bash
# 클라우드 서버 SSH 접속
ssh hetzner

# 클라우드 전체 서비스 상태
docker ps --format "table {{.Names}}\t{{.Status}}"

# go2rtc 스트림 상태
curl -s http://localhost/go2rtc/api/streams | python3 -m json.tool

# 로컬 PC SSH (Hetzner에서)
ssh visionlinux

# 로컬 PC Frigate 상태 (Hetzner에서 원격 확인)
ssh visionlinux "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

---

## 섹션 2 — 변경 이력 (Changelog)

> 최신 항목이 위에 온다. 완료된 항목은 수정하지 않는다.

---

### [2026-05-12] Claude Code 개발환경 개선 — CLAUDE.md + Hooks

**배경:** 반복 작업(패치→재시작→검증) 자동화 및 Claude 세션 간 일관된 행동 기준 확립.

**완료 항목:**

1. **CLAUDE.md → Agent Behavioral Contract 재편 (118줄)**
   - WHY(철학) / WHAT(스택) / HOW(워크플로우) / Verification / Stop Conditions 5단 구조
   - 낡는 상태 테이블 제거 → `doc/walkthrough.md` Progressive Disclosure로 위임
   - Playwright 기반 자가 검증 명령 추가 (`탭 숨김: True | iframe: True` 기준)
   - Stop Conditions 명문화: git push·파괴적 작업·에지/클라우드 혼용 시 중단

2. **Claude Code Hooks 구성 (`.claude/`)**
   - `PostToolUse/Bash`: `patch_siteguard_ui.py` 성공 감지 → `docker restart thingsboard` 자동 실행 → 120초 기동 대기 → `additionalContext`로 결과 피드백
   - `PostToolUse/Edit|Write`: `siteguard-ui/` 파일 수정 시 패치 스크립트 실행 안내
   - `settings.local.json`(세션별 권한)은 `.gitignore`로 로컬 전용 유지

**효과:** 3단계 수동 작업(패치→재시작→헬스체크) → 패치 1단계로 단축

---

### [2026-05-12] TB 커스텀 관제 UI 완성 — Phase C-UI

**배경:** TB Entities → Devices → 기기 클릭 시 나타나는 기본 탭(Details, Attributes, Latest telemetry 등)을 숨기고, `camera-detail.html`로 교체.

**완료 항목:**

1. **sg-inject.js 완전 재작성 (Playwright DOM 분석 기반)**
   - 문제: `tb-device-tabs`가 엔티티 목록 사이드 패널에서 DOM에 없음 (URL 변경 없이 `mat-drawer` 방식)
   - Playwright 헤드리스로 실제 DOM 구조 확인 → `mat-tab-group` 타깃으로 변경
   - 기기 탭 즉시 숨김(`display:none!important`) → `div.mat-content`에 iframe 삽입
   - 기기명은 `span.tb-details-title-text`에서 추출

2. **JWT 토큰 키 수정 (3개 파일)**
   - TB 4.2.1.1 실측: `jwt_token` (Playwright로 localStorage 직접 확인)
   - `camera-detail.html`, `camera-list.html`, `sg-inject.js` 모두 `jwt_token` 우선으로 통일

3. **기기명 → UUID API 수정**
   - 기존: `/api/tenant/device?deviceName=` → TB 4.x에서 400 오류
   - 변경: `/api/tenant/devices?pageSize=20&page=0&textSearch={name}` + 정확한 이름 매칭

4. **시스템 정보 섹션 — 펌웨어 TBD 처리**
   - 외부 DDNS(0004312.m2mnet.kr:80) ONVIF 접근 불가 확인 (웹UI 리다이렉트만 응답)
   - 미수집 항목 `"ONVIF 갱신 필요"` → `"TBD"` 로 변경
   - `🔄 ONVIF 갱신` 버튼: TB RPC `getOnvifInfo` 전송 → 30초 폴링
   - 에지 핸들러: `thingsboard/scripts/edge_onvif_handler.py` 신규 작성 (에지 PC 실행용)

**검증 결과 (Playwright):**
```
tabGroup style: display: none !important  ✅
iframe src: /camera-detail.html?id={uuid} ✅
iframe 내용: cctv-1 기기 상세 정상 표시   ✅
```

---

### [2026-05-11] 에지·클라우드 이중 레이어 아키텍처 확정

**결정 사항:**

1. **에지단 자립 원칙 확정**
   - Frigate(감지·녹화) + 에지 관제 UI를 에지 PC에서 단독 운영
   - 클라우드 연결 없어도 현장 감지·저장·관제 완결 가능

2. **데이터 계층 분리**
   - 에지: 영상·클립·스냅샷·상세 이벤트 원본 보관
   - 클라우드: 요약 이벤트·기기 상태만 실시간 수신
   - 클라우드 → 에지 상세 데이터 pull은 필요 시 배치·1회성으로 처리

3. **코드 관리 워크플로우 확정**
   - 작성: Hetzner(이 세션) → git push
   - 실행: 에지 PC git pull → docker compose up
   - 에지 PC(192.168.1.111)와 카메라(192.168.1.x)가 동일 LAN — 직접 접근

4. **카메라 로드맵**
   - 현재: CCTV-1(TVT Dome, LTE), CCTV-3(VHT Dome, LTE)
   - 예정: CCTV-2(TVT Bullet, 주택 공유기 DDNS) — Phase E

5. **단계적 이전 계획**
   - 현재: 개발 PC(192.168.1.111)가 에지 PC 임시 역할
   - Phase F: 현장 전용 소형 PC로 이전

---

### [2026-05-11] Nginx 역방향 프록시 — 외부망 영상 정상화 완료

**배경:** 외부 PC(LTE망, 기업망 등)에서 go2rtc MSE 스트리밍이 "loading" 상태로 멈추는 현상 발생.  
원인: ISP/기업망 DPI(딥패킷검사)가 비표준 포트(1984) WebSocket을 차단.

**해결 방법:**  
Nginx를 포트 80 역방향 프록시로 설치 → `/go2rtc/*` 요청을 `127.0.0.1:1984`로 포워딩.  
WebSocket Upgrade 헤더를 그대로 통과시켜 MSE 스트리밍 정상화.

**완료 항목:**
- Nginx 설치 + `/etc/nginx/conf.d/go2rtc.conf` 작성 (WebSocket 프록시 포함)
- go2rtc STUN: Google → Cloudflare(`stun.cloudflare.com:3478`)
- camera-grid.html: 접속 URL `http://46.62.155.122/go2rtc`, mode=mse
- TB jar 재패치(clean replace) + 대시보드 3개 재생성
- **내부·외부 PC 모두 MSE 영상 정상 재생 확인**

**MSE 레이블:** go2rtc 플레이어 좌측 상단 "MSE" 표시는 현재 스트리밍 방식 안내 — 정상 동작

---

### [2026-05-11] Phase C 완료 — SiteGuard 대시보드 + go2rtc 서브스트림

**배경:** LTE 현장 카메라를 Thingsboard 관제 UI에 완전 통합. Phase C 잔여 작업 전체 완료.

**완료 항목:**

1. **실제 CCTV 기기 등록 (ip-camera 프로파일)**
   - cctv-1 (TVT TD-9421S4C), cctv-3 (Vision Hitech TBT-Dome F977)
   - 서버 속성 16개: 메인/서브 스트림 정보 분리 저장

2. **SiteGuard 로고 + camera-grid.html TB 임베드**
   - Thingsboard ui-ngx jar 패치로 로고 교체 및 정적 HTML 배포
   - go2rtc MSE 모드 멀티카메라 그리드 UI (2×2~4×5 레이아웃)

3. **대시보드 3개 구축**
   - 메인 관제 그리드: camera-grid.html iframe
   - CCTV-1/3 개별: 영상 + 메인/서브 스트림 스펙 나란히 표시
   - ip-camera 프로파일 기본 대시보드 연결

4. **CCTV 상태 모니터**
   - TCP 포트 체크 → TB MQTT 60초 주기 (`cctv_status_monitor.py`)

5. **go2rtc 서브스트림 전환**
   - cctv_1: profile2 (640×480/10fps), cctv_3: Ch2 (640×480/10fps)
   - 대역폭 20~30배 절감, lazy loading 유지

**접속 링크:**
- 메인: http://46.62.155.122:8080/dashboard/d665a8e0-4d13-11f1-839b-7d7ca6d1fbf3
- CCTV-1: http://46.62.155.122:8080/dashboard/d66a63d0-4d13-11f1-839b-7d7ca6d1fbf3
- CCTV-3: http://46.62.155.122:8080/dashboard/d67168b0-4d13-11f1-839b-7d7ca6d1fbf3

---

### [2026-05-11] LTE 현장 네트워크 구성 확정 및 go2rtc 연동 완료

**배경:** SKT LTE 인바운드 차단 문제를 NAT Free 설정으로 해소하고, 현장 네트워크 구성을 확정.

**완료 항목:**

1. **NAT Free 설정**
   - SKT 통신사에 NAT Free 요청 적용
   - 이전: 통신사 인바운드 차단으로 포트포워딩 불가
   - 이후: DDNS + 포트포워딩으로 외부 직접 접근 가능

2. **M2MNet DDNS 전환**
   - No-IP(siteguard01.ddns.net) → M2MNet 자체 DDNS(0004312.m2mnet.kr)
   - LT7 라우터 자체 갱신, 30일 이메일 확인 불필요

3. **현장 네트워크 구성 확정**
   - LT7 LAN 포트 2개 제약: AP 모드 공유기(ipTIME A2004MU) + POE 스위치로 확장
   - 모든 기기 192.168.1.x 단일 대역 (이중 NAT 제거)
   - CCTV-1 (TVT Dome, 192.168.1.51), CCTV-3 (VHT Dome F977, 192.168.1.53)

4. **포트포워딩 설정**
   - RTSP_TCP1: WAN:554 → 192.168.1.51:554 (CCTV-1)
   - RTSP_TCP3: WAN:555 → 192.168.1.53:554 (CCTV-3)

5. **go2rtc.yaml 업데이트**
   - 기존 cctv_1/2/3 (로컬 192.168.0.x) 제거
   - 신규 cctv_1, cctv_3 (0004312.m2mnet.kr 경유) 설정

6. **문서 업데이트**
   - `doc/system-architecture-roadmap.md`: 실제 네트워크 구성 반영
   - `doc/lte-router-considerations.md`: NAT Free 해결, M2MNet DDNS, 실제 포트포워딩 규칙 반영
   - `go2rtc/go2rtc.yaml`: 신규 스트림 적용

**영상 테스트 결과:**
| 항목 | 결과 |
|------|------|
| CCTV-1 VLC 로컬 재생 | ✅ |
| CCTV-3 VLC 로컬 재생 | ✅ |
| 외부 DDNS 접근 | ✅ |

**잔여 항목:**
- CCTV-1 비밀번호 변경 (보안 ⚠️)
- Phase C: Thingsboard 대시보드 구성

---

### [2026-04-14] Phase C — Tailscale + go2rtc 카메라 스트리밍 구축

**배경:** 클라우드에서 에지 PC 카메라를 라이브 스트리밍으로 접근하기 위한 네트워크·영상 중계 레이어 구축.

**완료 항목:**

1. **Tailscale 설치 (Hetzner)**
   - `curl -fsSL https://tailscale.com/install.sh | sh` 설치
   - `tailscale up --ssh --accept-routes` 로 인증 및 서브넷 라우트 수락
   - `frontiera333@gmail.com` 계정 테일넷에 합류
   - Hetzner Tailscale IP: `100.105.211.82`

2. **Tailscale SSH 활성화 (로컬 PC)**
   - `sudo tailscale up --ssh --advertise-routes=192.168.0.0/24` (로컬 PC에서 실행)
   - Tailscale 관리 콘솔에서 서브넷 라우트 승인
   - Hetzner → 로컬 PC SSH 연결 확인: `ssh visionlinux`
   - Hetzner → 카메라(192.168.0.x) 직접 접근 확인

3. **go2rtc 1.9.9 설치 및 카메라 연결**
   - `go2rtc/docker-compose.yml` + `go2rtc/go2rtc.yaml` 신규 작성
   - 카메라 3대 sub stream 연결 (640x480)
   - 접속: `http://46.62.155.122:1984`

**핵심 발견 — 로컬 vs 클라우드 카메라 연결 차이:**

| 항목 | 로컬 (Frigate) | 클라우드 (go2rtc) |
|------|--------------|----------------|
| 스트림 | main stream (고화질, 감지·녹화용) | sub stream (640x480, 라이브 뷰용) |
| 연결 방식 | 직접 LAN | Tailscale 서브넷 경유 |
| RTSP 전송 | UDP/TCP 모두 가능 | **TCP 강제 필수** (UDP RTP 역방향 불통) |
| 비트스트림 | 카메라 원본 그대로 | **MPEG-TS 래핑 필수** (제조사 포맷 차이 흡수) |

**시행착오 요약:**

| 시도 | 결과 | 원인 |
|------|------|------|
| `rtsp://...` plain RTSP | cctv_1만 성공, cctv_2/3 17초 후 종료 | Vision Hitech 카메라 UDP RTP가 Tailscale 경유 역방향 차단 |
| `?transport=tcp` URL 파라미터 | "wrong response on DESCRIBE" | 파라미터가 카메라에 그대로 전달되어 경로 오류 |
| `exec:ffmpeg -rtsp_transport tcp -f h264` | "unsupported header: 0000000100000000" | Vision Hitech 출력 포맷이 Annex B 아님 |
| `exec:ffmpeg -rtsp_transport tcp -f mpegts` | **성공** | MPEG-TS 컨테이너가 포맷 차이 흡수 |

**신규 카메라 추가 시 표준 템플릿:**
```yaml
# 제조사 무관 안전한 기본 패턴
new_cam: exec:ffmpeg -hide_banner -rtsp_transport tcp \
  -i rtsp://user:pass@192.168.0.x:554/substream \
  -c:v copy -f mpegts -
```

---

### [2026-04-13] TB-2 완료 — Frigate → 클라우드 Thingsboard 텔레메트리 브리지

**배경:** Frigate VMS 상태를 클라우드 Thingsboard(virtual_edge1)에 실시간 전달하는 MQTT 브리지 구축.
로컬 PC Frigate → 클라우드 TB(46.62.155.122:1884) 직접 연결.

**완료 항목:**
- `frigate/scripts/frigate_tb_bridge.py` 신규 작성 (REST API 폴링 + MQTT 이벤트 구독)
- `frigate/temp_test/test_tb2_bridge.py` 검증 통과 (PASS 11/11)
- 브리지 백그라운드 기동, 60초 주기 텔레메트리 전송 확인

**핵심 수집 방식:**
- Frigate REST API `/api/stats` → inference_ms, cameras_online, cpu_usage (60초 주기)
- Frigate MQTT `frigate/events` → person 감지 카운트 (실시간)
- 클라우드 TB MQTT `v1/devices/me/telemetry` → 7개 키 전송

---

### [2026-04-13] Phase B 완료 — 클라우드 서버 구축 + Thingsboard 이전

**배경:** 개발 PC가 자주 바뀌는 환경 + 여러 서비스 클라우드 운영을 감안하여
Hetzner CX33 서버를 구축하고 Thingsboard를 클라우드 운영 기준으로 이전.

**완료 항목:**

- Hetzner CX33 서버 생성 (Ubuntu 24.04, Helsinki, 46.62.155.122)
- SSH 키 생성 및 등록 (hetzner-fieldwatch-visionlinux)
- SSH config 등록 → `ssh hetzner` 한 줄 접속
- 서버 기본 설치: Git 2.43, Docker 29.4, Docker Compose v5.1.2, Node.js v22.14, Claude Code CLI 2.1.104
- Python 환경: python3.12-venv + paho-mqtt (thingsboard/.venv/)
- GitHub clone → `/root/projects/siteguard-infra/`
- Thingsboard 4.2.1.1 클라우드 기동 완료
- test_01~05 전 항목 클라우드에서 통과 (PASS 70/70)
- 클라우드 TB MQTT 토큰 문서화

**클라우드 Thingsboard 등록 기기:**

| 기기명 | Profile | MQTT Token |
|--------|---------|-----------|
| mobile-cctv-site-001 | mobile-cctv | Xl8KVvfv6Gj7DAxEXNz3 |
| virtual_settop1 | settop | eMx3nS1nhXnI1CFFhLM7 |
| virtual_cctv1 | ip-camera | 8SOsGhAdlVwXoXkaKzuh |
| virtual_edge1 | edge-controller | A3TPceILZWFqZGogYQ3j |

---

### [2026-04-13] 정기 검토 — 즉시 조치 항목 반영

**배경:** 제3자 관점 전체 검토 후 즉시 조치 5개 항목 처리.

**변경 항목:**
- `CLAUDE.md`: TB-1 완료 상태 반영, 표 형식으로 압축 (32줄→27줄)
- `frigate/docker-compose.yml`: 이미지 버전 고정 (`stable` → `0.17.1`)
- `thingsboard/docker-compose.yml`: 이미지 버전 고정 (`latest` → `4.2.1.1`)
- `doc/platform-strategy.md`: 미결사항 #1 GitHub 완료 처리
- `thingsboard/doc/architecture.md`: 상태 표시 수정 (Step 2 진행 중 → TB-1 완료)
- `thingsboard/doc/project-overview.md`: 텔레메트리 항목 "초안" → "TB-1 검증 완료"

**잔여 조치 항목 (나중에):**
- RTSP 자격증명 `.env` 분리 → Hetzner 구축 시점에 처리
- go2rtc 검증 → Phase C
- 컨테이너 네트워크 명시 → 통합 단계

---

### [2026-04-13] 외부 AI 2차 검토 반영 — 문서·설정 정확도 개선

**배경:** 두 번째 외부 AI 검토 결과를 반영하여 문서 및 설정 파일 정확도 개선.

**변경 항목:**
- `thingsboard/docker-compose.yml`: CoAP 포트 주석 처리
- `thingsboard/doc/architecture.md`: 포트 표기 명확화, MQTT 브릿지 확정
- `thingsboard/doc/project-overview.md`: MQTT 브릿지 `1순위 검토` → `확정`
- `frigate/doc/architecture.md`: Layer 1~3 미래 설계안 표기, Step 상태 현행화
- `frigate/doc/project-overview.md`: 네트워크 구성 2·3번 Hetzner 참조 추가
- `CLAUDE.md`: temp_test 변경 시 walkthrough PASS 횟수 동기화 규칙 추가

---

### [2026-04-09] Thingsboard TB-1 독립 검증 완료 (PASS 70/70)

**배경:** Fleet Management 백엔드(Thingsboard CE) 독립 검증 완료.
Frigate 통합 전 단독 기동·기기 모델·MQTT·알람·Device Profile 전 항목 검증.

**완료 항목:**
- Thingsboard CE 4.2.1.1 로컬 기동
- Device Profile 3종: settop(Android, USB 1대), ip-camera, edge-controller
- 가상기기 3대: virtual_settop1, virtual_cctv1, virtual_edge1
- MQTT 텔레메트리 6개 키, 알람 규칙 2종 검증
- 주요 API 차이 발견: TB 4.x `/ack` 엔드포인트, `DEVICE/` 엔티티 타입 필수
- `infra/doc/` 폴더 신설, `platform-strategy.md` 작성
- GitHub 저장소 연동 (brianroh2/Portable_CCTV_Infra)

**상세 내용:** `thingsboard/doc/walkthrough.md` 참조

---

### [2026-04-08] Frigate VMS Step 1 완료

**배경:** VMS 인프라 레이어 안정화 완료.

**완료 항목:**
- Frigate 0.17.1 + Mosquitto, Intel OpenVINO GPU 가속 (renderD129)
- 카메라 3대 이벤트 녹화 (pre 3초 + post 5초, 7일 보관)
- cctv_2 과감지 필터 (min_score 0.8, min_area 3600)
- 감지 시간 KST 08:00~19:00 (cron + MQTT 제어)
- 스토리지 200GB 상한 자동 정리 (6시간마다)
- WAL 체크포인트 매일 04:00

**상세 내용:** `frigate/doc/walkthrough.md` 참조
