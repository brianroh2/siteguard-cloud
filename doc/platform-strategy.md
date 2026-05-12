# 플랫폼 전략 (Platform Strategy)

> 문서 성격: 개발 환경·클라우드 전략 확정안
> 작성: 2026-04-09 / 최종 정리: 2026-04-09
> 상태: ✅ 확정된 항목, 🔲 미결 항목

---

## 1. 배경 및 제약 조건

| 항목 | 현재 상황 |
|------|---------|
| 실제 에지 기기 (settop, CCTV) | 미준비 — 추후 진행 |
| 개발 위치 | 유동적 — 고정 개발 PC + 원격지 수시 변경 |
| 개발자 수준 | 코딩·네트워크 초보 — 난이도·도구 수 최소화 우선 |
| 예산 | 최소화, 나중에 AWS 전환 가능성 열어둠 |

---

## 2. 확정된 핵심 방향

### 2-1. 개발 환경 — 두 가지 병행 ✅

```
방법 A: 로컬 개발 PC + Tailscale 원격 접속
  원격 개발자 ──Tailscale──> 로컬 개발 PC (현재 위치 고정)
                              └─ Frigate + Thingsboard 로컬 실행 중
  장점: 지금 당장 사용 가능, 추가 비용 없음
  단점: 개발 PC가 꺼지면 접근 불가

방법 B: 클라우드 서버 + VS Code Remote SSH
  원격 개발자 ──SSH──> 클라우드 서버 (항상 켜짐)
                        └─ Thingsboard + go2rtc 운영
  장점: 위치·PC 상태와 무관하게 항상 접근 가능
  단점: 월 비용 발생, 초기 구축 필요
```

> **병행 전략**: 방법 A로 즉시 원격 개발을 시작하고, 방법 B(클라우드)를 단계적으로 구축.
> 클라우드 구축 완료 후에는 방법 B가 주 개발 환경, 방법 A는 에지 기기 테스트용으로 전환.

---

### 2-2. 도구 스택 — 최소화 ✅

| 도구 | 역할 | 비고 |
|------|------|------|
| Tailscale | VPN 접속 (개발자↔PC, 개발자↔서버, 기기↔서버) | 무료 |
| GitHub | 코드 관리 + 개발 위치 간 동기화 | 무료 (현재 미설정) |
| Docker Compose | 서비스 컨테이너 관리 | 현재 사용 중 |
| VS Code Remote SSH | 클라우드 서버 원격 편집 | 현재 사용 중인 VS Code 그대로 |
| Claude Code | AI 개발 보조 | 현재 사용 중 |

> 제외: Node-RED (Thingsboard가 대체), Cloudflare (공개 서비스 단계에서 재검토),
> Gemini CLI / Antigravity (Claude Code로 충분)

---

### 2-3. 영상 저장 — 에지 전용 ✅

| 위치 | 역할 |
|------|------|
| 에지 (settop/edge-controller) | 이벤트 영상 로컬 저장 (SD카드/HDD), AI 감지 |
| 클라우드 | 영상 저장 없음 — 라이브 스트리밍 중계만 (go2rtc) |

> 근거: 클라우드 스토리지 비용 절감, GPU 없는 클라우드에서 Frigate 운영 불필요.

---

### 2-4. 최상단 관제 솔루션 구조 검토 ✅

#### 배경 — 역할 재정의가 필요했던 이유

초기에는 Frigate를 최상단 UI로 활용하려 했다.
그러나 Frigate는 "영상 저장·AI 감지" 전용 설계이므로,
영상보다 기기·사용자 상태 관리가 중심인 최상단에는 구조적으로 맞지 않는다.

**최상단에서 실제로 필요한 기능:**

| 기능 | 비중 |
|------|------|
| 기기 상태 모니터링 (온/오프, CPU, 디스크, 알람) | 높음 |
| 사용자 관리 (권한, 접속 이력) | 높음 |
| 알람 관리 (임계값 초과, 오프라인 감지) | 높음 |
| 라이브 영상 (일시적 확인, 저장 없음) | 낮음 |
| 에지 저장 클립 재생 (필요 시만) | 낮음 |

---

#### Option A — Thingsboard + go2rtc ✅ 채택

```
클라우드
  Thingsboard CE  ← 기기·사용자·알람 관리 (백엔드 + 대시보드)
  go2rtc          ← 라이브 영상 중계 (저장 없음)
                     에지 클립은 REST API로 가져와 재생

에지
  Frigate         ← 영상 저장·AI 감지 전담
  Thingsboard로 텔레메트리 전송
```

**장점:**
- Thingsboard가 기기 관리·알람·사용자 관리를 이미 모두 지원
- go2rtc는 경량 영상 중계 전용 — 클라우드 CPU 부담 최소
- 현재까지 검증 완료된 스택 그대로 활용
- 추가 학습 없이 진행 가능
- 나중에 커스텀 UI(Option B)로 전환 시 Thingsboard REST API 재사용 가능

**단점:**
- Thingsboard 내장 UI는 검증·개발용 — 상용화 시 UI 한계 존재
- 영상 클립 재생 기능은 별도 구현 필요

---

#### Option B — Thingsboard(백엔드) + 커스텀 UI

```
클라우드
  Thingsboard CE  ← API 백엔드만 사용
  커스텀 UI       ← React/Vue로 직접 제작
                     기기 상태 대시보드
                     go2rtc 라이브 영상 임베드
                     에지 클립 재생
```

**장점:**
- 원하는 UI/UX를 완전히 자유롭게 구성 가능
- 상용화 브랜딩 적용 가능
- Thingsboard 화이트라벨(유료) 불필요

**단점:**
- 프론트엔드 개발 역량 필요 (React/Vue)
- 개발 기간·비용 높음
- 현재 단계에서 진입 장벽 과도함

> 이 옵션은 Step 4~5 (mobile-cctv-vms 커스텀 UI) 단계에서 진행 예정.
> 지금은 Option A로 시작하고, Thingsboard REST API 구조를 익힌 후 전환.

---

#### Option C — 다른 오픈소스 관제 플랫폼

Thingsboard 대신 다른 플랫폼을 최상단에 쓰는 경우 검토.

| 플랫폼 | 특징 | 상용화 라이센스 | 단점 |
|--------|------|--------------|------|
| **Grafana** | 대시보드·시각화 최강, 알람 지원 | Apache 2.0 ✅ | 기기 관리·사용자 관리 기능 약함 |
| **Home Assistant** | IoT 기기 관리 강함, 영상 연동 지원 | Apache 2.0 ✅ | 상용화 시 라이센스 해석 복잡, 대규모 Fleet 관리 약함 |
| **OpenRemote** | Fleet 관제 특화 설계 | Apache 2.0 ✅ | 한국 사용 사례 드물고 러닝커브 높음 |
| **Netdata** | 시스템 모니터링 특화 | GPL 3.0 ⚠️ | 기기 관리·알람 약함, 상용화 시 라이센스 주의 |

**이 옵션을 선택하지 않은 이유:**
- Thingsboard가 이미 Fleet 관제에 필요한 기능(기기 관리, 알람, 사용자, REST API)을 모두 갖추고 있음
- 지금까지 검증 완료된 스택을 버리고 처음부터 다시 시작해야 함
- 초보 개발자 기준으로 새 플랫폼 학습 부담이 과도함
- 나중에 커스텀 UI(Option B)로 전환 시 Thingsboard API를 재사용할 수 있어 이전 작업이 낭비되지 않음

---

**최종 결정: Option A 채택, Option B는 Step 4~5에서 전환**

---

### 2-4. 클라우드 서버 선택 ✅ Hetzner CX32

| 항목 | 내용 |
|------|------|
| 사양 | 4 vCPU / 8GB RAM / 80GB SSD |
| 비용 | 월 약 13,000원 (€8.9) |
| 위치 | 싱가포르 (한국 근접) |
| OS | Ubuntu 24.04 LTS |
| 이유 | Docker Compose 그대로 이전 가능, x86 완벽 호환, 설정 단순 |
| AWS 전환 | 서비스 규모 확대 시 자연스럽게 이전 가능 |

> Oracle Free는 ARM 아키텍처 호환 확인 부담이 있어 초보 단계에서 제외.
> 월 13,000원은 서비스 안정성 대비 합리적 수준.

**CX22(낮은 사양) 시작 여부 검토 결과: CX32 유지**
- Thingsboard 기동 시 실사용 RAM 3~3.5GB → CX22(4GB)는 여유 없음
- go2rtc 함께 올리면 CX22에서 메모리 부족 위험
- Hetzner는 사양 올리기는 쉽지만 내리기는 불가 → 처음부터 안정적으로 시작

---

## 3. 목표 아키텍처

```
[원격 개발자 — 위치 무관]
  VS Code
  ├─ Remote SSH ─────────────────────────> [Hetzner CX32 클라우드]
  │   (클라우드 파일 직접 편집)              Ubuntu 24.04
  │                                         ├─ Thingsboard CE (관제 핵심)
  └─ Tailscale ──────────────────────────> [로컬 개발 PC]
      (로컬 PC 접속, 에지 테스트용)           ├─ Frigate (테스트)
                                            └─ Thingsboard (테스트)

[Tailscale 네트워크 — 모두 연결]
  로컬 개발 PC ──┐
  클라우드 서버 ──┼── Tailscale ── 원격 개발자
  에지 기기 ─────┘  (나중에 추가)

[클라우드 서버 서비스]
  Thingsboard CE  ← 전체 기기 상태 통합 관제
  go2rtc          ← 에지 카메라 라이브 스트리밍 중계

[에지 현장 기기 — 나중에]
  settop (Android)
  └─ Frigate + USB 카메라 1대
  └─ 이벤트 영상 로컬 저장
  └─ 텔레메트리 ──> 클라우드 Thingsboard

  edge-controller (소형 관제 PC)
  └─ Frigate + IP 카메라 4대
  └─ 이벤트 영상 로컬 저장
  └─ 상태 요약 ──> 클라우드 Thingsboard
```

---

## 4. 단계별 실행 계획

### Phase A — 지금 당장 (비용 0원)

```
A-1. GitHub 저장소 생성
     현재 infra/ 폴더가 git 저장소가 아님 → 즉시 필요
     이유: 어디서든 코드 동기화, Claude Code와 작업 이력 보존

A-2. Tailscale 설치 (로컬 개발 PC)
     원격지에서 개발 PC 바로 접속 가능
     설치: tailscale.com → 계정 생성 → PC에 설치 (5분)

A-3. 원격 개발 확인
     원격 PC에서 VS Code → Tailscale IP로 Remote SSH 접속 테스트
```

### Phase B — 클라우드 구축 (월 13,000원~)

```
B-1. Hetzner 서버 생성
     hetzner.com → 회원가입 → CX32 선택 → Ubuntu 24.04
     SSH 키 등록 (VS Code에서 자동 생성 가능)
     소요 시간: 10분

B-2. 서버 기본 설정 (Claude Code가 안내)
     Docker + Docker Compose 설치
     Tailscale 설치 → 기존 네트워크에 합류

B-3. Thingsboard 이전
     현재 thingsboard/docker-compose.yml 그대로 서버에 복사
     data/ 폴더 백업 → 서버로 이전
     소요 시간: 30분~1시간

B-4. VS Code Remote SSH 연결
     서버 IP로 Remote SSH 연결 → 지금과 동일하게 편집 가능
     Claude Code도 동일하게 사용 가능
```

### Phase C — 에지 연동 (기기 준비 후)

```
C-1. 에지 기기 Tailscale 설치
C-2. 에지 Frigate → 클라우드 Thingsboard 텔레메트리 연동
C-3. go2rtc 라이브 스트리밍 연결
```

---

## 5. 초보자 주의사항

**GitHub 설정 시:**
- `infra/` 전체를 올리되 `data/` 폴더, 민감 파일은 `.gitignore`에 추가 (현재 적용 완료)
- MQTT 토큰, DB 비밀번호 등 민감 정보는 `docker-compose.yml`에 직접 적지 않음
- `.env` 파일 활용 권장:
  ```
  .env          ← 실제 값 (gitignore로 GitHub 제외)
  .env.example  ← 키 이름만 기록한 샘플 (GitHub에 올림)
  ```
  → 새 서버로 이전 시 `.env.example`을 복사해 값만 채우면 됨
- 현재 docker-compose.yml에는 민감 정보 없음 → Hetzner 구축 시 비밀번호 설정할 때 도입

**Hetzner 서버 설정 시:**
- SSH 비밀번호 로그인 비활성화 → SSH 키만 허용 (Claude Code가 단계별 안내)
- Tailscale 설치하면 서버 공인 IP는 방화벽으로 닫아도 됨 → 보안 단순화

**Thingsboard DB 이전 시 (Phase B-3):**
- `data/db/` 폴더 단순 복사 금지 — PostgreSQL 바이너리 파일은 버전 불일치로 손상 위험
- 반드시 `pg_dump` 방식으로 덤프 후 새 서버에서 복구
- 현재는 검증 단계라 실운영 데이터 없음 → 새 서버에서 깨끗하게 시작
- 운영 데이터가 쌓이면 그때 pg_dump 스크립트 작성 (Claude Code에게 요청)

**클라우드 이전 후:**
- 로컬 PC의 Thingsboard는 테스트 전용으로 유지
- 운영 데이터는 클라우드 Thingsboard에만 쌓음
- 무거운 AI 감지·영상 처리는 로컬 PC(또는 에지)에서 → 클라우드 CPU 절약

---

## 6. 미결 사항

| # | 항목 | 우선순위 |
|---|------|--------|
| ~~1~~ | ~~GitHub 저장소 생성~~ | ✅ 완료 (2026-04-09) |
| 2 | Hetzner 서버 구축 시점 | Phase A 완료 후 |
| 3 | go2rtc 단독 vs 경량 Frigate 클라우드 배치 | Phase C에서 결정 |
| 4 | edge-controller 로컬 TB ↔ 클라우드 TB 연동 방식 | Phase C에서 결정 |

---

## 7. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-09 | 초안 작성 |
| 2026-04-09 | 전면 개정 — 병행 개발 방식 확정, 불필요 도구 제거, 초보자 가이드 추가 |
| 2026-04-09 | 외부 AI 검토 반영 — .env 관리 방식, DB 이전 주의사항(pg_dump), CX22 vs CX32 사양 검토 결과, 로컬 PC 역할 명확화 |
| 2026-04-13 | 미결사항 #1 완료 처리 (GitHub 저장소 생성 완료) |
