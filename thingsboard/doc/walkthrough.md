# Thingsboard 운영 문서 (Walkthrough)

> 문서 성격: 운영 변경 이력 + 트러블슈팅 모음
> 섹션 1 (현황 스냅샷)은 작업할 때마다 **덮어쓴다.**
> 섹션 3 (변경 이력)은 **위에 추가만** 한다. 수정하지 않는다.
> 섹션 2, 4는 새로운 교훈·문제가 생길 때만 추가한다.

---

## 섹션 1 — 현재 운영 현황 스냅샷

> 마지막 업데이트: 2026-05-11 (Nginx 프록시 적용)
> 이 섹션만 읽으면 현재 시스템 상태를 파악할 수 있다.

### 1-1. 컨테이너 상태

```
[클라우드: Hetzner 46.62.155.122]  ← 운영 기준
thingsboard  Up  — 포트 8080(웹/REST), 1884(MQTT), 7070(Edge RPC)

[로컬 PC]  ← 테스트 전용 (필요 시 기동)
```

### 1-2. 핵심 설정값

| 항목 | 현재 값 |
|---|---|
| 이미지 | thingsboard/tb-postgres:4.2.1.1 |
| 큐 방식 | in-memory |
| 웹 UI (클라우드) | http://46.62.155.122:8080 |
| 웹 UI (로컬) | http://localhost:8080 |
| MQTT 포트 | 1884 (Frigate Mosquitto 1883과 분리) |
| 데이터 경로 | ./data/db |
| 로그 경로 | ./data/logs (권한: 777) |
| 로고 | SiteGuard (ui-ngx jar 패치 적용) |

### 1-3. 등록 기기 — 클라우드 TB 기준 (운영)

**실제 현장 기기 (ip-camera 프로파일):**

| 기기명 | 모델 | MQTT Token | 내부 IP | WAN 포트 |
|--------|------|-----------|---------|---------|
| cctv-1 | TVT TD-9421S4C | `temp/device_tokens.json` 참조 | 192.168.1.51 | 554 |
| cctv-3 | Vision Hitech TBT-Dome F977 | `temp/device_tokens.json` 참조 | 192.168.1.53 | 555 |

**가상 기기 (TB-1 검증용):**

| Profile | 기기명 | MQTT Token | 용도 |
|---------|--------|-----------|------|
| mobile-cctv | mobile-cctv-site-001 | Xl8KVvfv6Gj7DAxEXNz3 | TB-1 초기 검증용 |
| settop | virtual_settop1 | eMx3nS1nhXnI1CFFhLM7 | S1/S2 가상 기기 (Android) |
| ip-camera | virtual_cctv1 | 8SOsGhAdlVwXoXkaKzuh | S2/S3 가상 기기 |
| edge-controller | virtual_edge1 | A3TPceILZWFqZGogYQ3j | S3 가상 기기 |

### 1-4. SiteGuard 대시보드 현황

| 대시보드 | 용도 | URL |
|---------|------|-----|
| SiteGuard 현장 관제 | 메인 그리드 (camera-grid.html iframe) | http://46.62.155.122:8080/dashboard/bd0e61b0-4d1e-11f1-bb6f-7d7ca6d1fbf3 |
| SiteGuard — CCTV-1 TVT Dome | 개별 영상 + 메인/서브 스트림 정보 | http://46.62.155.122:8080/dashboard/bd14a340-4d1e-11f1-bb6f-7d7ca6d1fbf3 |
| SiteGuard — CCTV-3 VHT Dome F977 | 개별 영상 + 메인/서브 스트림 정보 | http://46.62.155.122:8080/dashboard/bd1ce0a0-4d1e-11f1-bb6f-7d7ca6d1fbf3 |

**TB 통합 관리 UI 접속 구조:**
```
http://46.62.155.122:8080  (tenant@thingsboard.org / tenant)
├── Dashboards 메뉴 (/dashboards)
│   └── 위 3개 대시보드 목록 → 클릭으로 바로 진입
├── Devices 메뉴 (/devices)
│   ├── cctv-1 → Attributes 탭(16개 서버 속성) / Latest telemetry(status, rtsp_port)
│   ├── cctv-3 → (동일)
│   └── 기기 상세 대시보드 아이콘 → device_dashboard_id 로 개별 대시보드 연결
└── Device Profiles (/deviceProfiles)
    └── ip-camera → defaultDashboardId = 메인 그리드 대시보드
```

**cctv-1/cctv-3 서버 속성 구조 (16개):**
- 공통: `model`, `internal_ip`, `wan_port`, `codec`, `audio`, `location`, `ddns`
- 메인 스트림: `main_rtsp_profile`, `main_resolution`, `main_fps`, `rtsp_url_main`
- 서브 스트림: `sub_rtsp_profile`, `sub_resolution`, `sub_fps`, `rtsp_url_external`, `stream_url`

### 1-5. 현재 폴더 구조

```
infra/thingsboard/
├── docker-compose.yml
├── README.md
├── config/               ← 추가 설정 (현재 미사용)
├── data/
│   ├── db/               ← PostgreSQL 데이터 (영속화)
│   └── logs/             ← Thingsboard 로그 (권한 777)
├── scripts/
│   ├── tb_siteguard_setup.py       ← 초기 기기 생성 + 대시보드 (구버전)
│   ├── tb_siteguard_full_setup.py  ← 현행 — 서버 속성 + 대시보드 전체 재생성
│   └── cctv_status_monitor.py      ← CCTV TCP 상태 → TB MQTT (60초 주기)
├── temp_test/            ← 검증 테스트 코드
│   ├── test_01_startup_check.sh   ← 기동 검증 (PASS 4/4)
│   ├── test_02_device_model.sh    ← 기기 모델 검증 (PASS 7/7)
│   ├── test_03_mqtt_telemetry.py  ← MQTT 텔레메트리 (PASS 14/14)
│   ├── test_04_alarm_rule.py      ← 알람 규칙 (PASS 7/7)
│   └── test_05_virtual_devices.py ← 가상 기기 3종 (PASS 38/38)
└── doc/
    ├── architecture.md   ← 아키텍처 + Device Profile 스키마
    ├── project-overview.md
    ├── setup-guide.md
    └── walkthrough.md    ← 이 파일
```

### 1-6. 빠른 상태 확인 명령어

```bash
# 컨테이너 상태
docker ps --format "table {{.Names}}\t{{.Status}}"

# 로그 확인 (기동 중일 때)
docker compose logs -f thingsboard

# REST API 상태 확인
curl -s http://localhost:8080/api/noauth/activate | head -c 100

# 테넌트 토큰 발급 (API 사용 시)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])"

# 대시보드 목록 확인
TOKEN=$(위 명령어 결과)
curl -s "http://localhost:8080/api/tenant/dashboards?pageSize=20&page=0" \
  -H "X-Authorization: Bearer $TOKEN" | \
  python3 -c "import json,sys; [print(d['title'], d['id']['id']) for d in json.load(sys.stdin).get('data',[])]"

# CCTV 상태 모니터 (백그라운드 실행)
nohup python3 thingsboard/scripts/cctv_status_monitor.py \
  > temp/cctv_monitor.log 2>&1 &
echo $! > temp/cctv_monitor.pid
```

---

## 섹션 2 — 운영 지식 (Knowledge Base)

> 새로운 교훈이 생길 때만 추가한다.

### 2-C. TB 대시보드 위젯 typeFullFqn 주의사항

시스템 위젯(html_card 등)은 반드시 `system.` 접두사가 필요하다.

| 잘못된 FQN | 올바른 FQN | 증상 |
|-----------|-----------|------|
| `cards.html_card` | `system.cards.html_card` | "Problem loading widget configuration" 오류 |

**HTML Card 위젯 설정 키:**
```python
"settings": {
    "cardHtml": "<div>...</div>",   # HTML 내용 (htmlTemplate 아님!)
    "cardCss": "html,body{...}",    # CSS
}
```

**widget defaultConfig 조회 (FQN 검증):**
```bash
TOKEN=...
curl -s "http://localhost:8080/api/widgetType?fqn=system.cards.html_card" \
  -H "X-Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('name'))"
```

### 2-D. TB ui-ngx jar 패치 (로고·정적 파일 변경)

Thingsboard UI는 `thingsboard.jar` 안에 중첩된 `ui-ngx-*.jar`로 제공된다.  
정적 파일(로고, HTML) 변경 시 jar 패치 → 컨테이너에 복사 → 재시작이 필요하다.

```python
# Python zipfile로 중첩 jar 패치 — temp/ 폴더에서 작업
import zipfile, shutil, os

# 1. 컨테이너에서 jar 추출
os.system("docker cp thingsboard:/usr/share/thingsboard/bin/thingsboard.jar temp/thingsboard.jar")

# 2. ui-ngx jar 꺼내기
with zipfile.ZipFile("temp/thingsboard.jar") as outer:
    ui_name = [n for n in outer.namelist() if "ui-ngx" in n][0]
    outer.extract(ui_name, "temp/")

# 3. 정적 파일 수정 후 재삽입
# (파일 수정)
with zipfile.ZipFile("temp/thingsboard.jar", "a") as outer:
    outer.write("수정한파일", "BOOT-INF/lib/ui-ngx-*.jar")  # 덮어쓰기

# 4. 컨테이너 복사 + 재시작
os.system("docker cp temp/thingsboard.jar thingsboard:/usr/share/thingsboard/bin/")
os.system("docker restart thingsboard")
```

**포함된 정적 파일 위치 (ui-ngx jar 내부):**
- 로고: `public/assets/logo_title_white.svg`
- camera-grid.html: `public/camera-grid.html`

### 2-A. 초기 설치 시 반드시 확인할 것

| 순서 | 확인 항목 | 명령 / 방법 |
|---|---|---|
| 1 | 포트 충돌 (frigate MQTT 1883) | Thingsboard MQTT를 1884로 설정 |
| 2 | 최초 기동 1~2분 소요 | `docker compose logs -f` 로 `Started ThingsboardServerApplication` 메시지 확인 |
| 3 | data/logs 폴더 권한 | `chmod 777 data/logs` — 컨테이너 내부 UID 799(thingsboard)가 쓸 수 있어야 함 |
| 4 | 기본 비밀번호 변경 | sysadmin / tenant 계정 첫 접속 후 변경 |

### 2-B. Thingsboard 4.x API 변경 사항

| 기능 | 구 API (3.x) | 신 API (4.x) | 비고 |
|---|---|---|---|
| 알람 acknowledge | `POST /api/alarm/{id}/acknowledge` | `POST /api/alarm/{id}/ack` | 경로 단축 |
| 속성 조회 | `/api/plugins/telemetry/{id}/...` | `/api/plugins/telemetry/DEVICE/{id}/...` | 엔티티 타입 명시 필수 |

---

## 섹션 3 — 변경 이력 (Changelog)

> 최신 항목이 위에 온다. 완료된 항목은 수정하지 않는다.

---

### [2026-05-11] Nginx 프록시 — ISP DPI WebSocket 차단 우회

**배경:** 외부 PC에서 camera-grid.html 접속 시 영상이 로딩만 되고 재생 안 됨. 원인: ISP/기업망 DPI가 비표준 포트(1984)의 WebSocket(MSE 시그널링)을 차단. Nginx로 포트 80에서 프록시하여 우회.

**완료 항목:**
- Nginx 설치 및 `/etc/nginx/conf.d/go2rtc.conf` 구성
  - `GET /go2rtc/*` → `http://127.0.0.1:1984/` 역방향 프록시
  - WebSocket Upgrade 헤더 통과 설정
- go2rtc.yaml: STUN 서버 Google → Cloudflare(`stun:stun.cloudflare.com:3478`)
- camera-grid.html: `http://46.62.155.122:1984` → `http://46.62.155.122/go2rtc`, mode=mse 복귀
- tb_siteguard_full_setup.py: `GO2RTC_EXT` URL 및 mode=mse 동기화
- TB jar 재패치 (camera-grid.html 업데이트), 대시보드 3개 재생성

**현재 대시보드 ID:**
- 메인 그리드: `bd0e61b0-4d1e-11f1-bb6f-7d7ca6d1fbf3`
- CCTV-1: `bd14a340-4d1e-11f1-bb6f-7d7ca6d1fbf3`
- CCTV-3: `bd1ce0a0-4d1e-11f1-bb6f-7d7ca6d1fbf3`

**주의:** Hetzner Cloud Firewall 추후 생성 시 → TCP 80 인바운드 규칙 추가 필요

---

### [2026-05-11] SiteGuard 대시보드 구축 완료 — 현장 관제 UI 전체 구성

**배경:** LTE 현장 카메라(cctv-1, cctv-3) TB 연동 + 멀티카메라 관제 UI 완성. Phase C 잔여 작업 완료.

**완료 항목:**

1. **실제 기기 등록 (ip-camera 프로파일)**
   - cctv-1 (TVT TD-9421S4C), cctv-3 (Vision Hitech TBT-Dome F977)
   - MQTT 토큰: `temp/device_tokens.json` 저장
   - 서버 속성 16개: 메인/서브 스트림 정보, 기기 스펙, RTSP URL 포함

2. **SiteGuard 로고 적용 (ui-ngx jar 패치)**
   - 기존 Thingsboard 로고 → SiteGuard 쉴드+체크 SVG 로고
   - `public/assets/logo_title_white.svg` 교체

3. **camera-grid.html 구축 및 TB 임베드**
   - go2rtc MSE 모드 멀티카메라 그리드 UI (2×2~4×5 레이아웃 선택)
   - 카메라 ON/OFF 토글, 전체화면 버튼
   - TB jar 내 `public/camera-grid.html`로 배포 → 대시보드 iframe으로 참조

4. **대시보드 3개 생성**
   - 메인 그리드 (`d665a8e0...`): camera-grid.html iframe 전체 화면
   - CCTV-1 개별 (`d66a63d0...`): 영상(좌 2/3) + 메인/서브 스트림 정보(우 1/3)
   - CCTV-3 개별 (`d67168b0...`): 동일 구조
   - ip-camera 프로파일 기본 대시보드 = 메인 그리드 연결

5. **CCTV 상태 모니터 (cctv_status_monitor.py)**
   - TCP 포트 체크(554/555) → TB MQTT 텔레메트리 60초 주기 전송
   - PID: `temp/cctv_monitor.pid`, 로그: `temp/cctv_monitor.log`

6. **go2rtc 서브스트림 전환**
   - cctv_1: profile1(1080p/30fps) → profile2(640×480/10fps)
   - cctv_3: Ch1(1080p/30fps) → Ch2(640×480/10fps)
   - 대역폭 20~30배 절감, lazy loading 유지

**트러블슈팅 중 발견한 주요 사항:**
- widget `typeFullFqn`은 `system.` 접두사 필수 (없으면 "Problem loading widget configuration")
- html_card 설정 키는 `cardHtml`/`cardCss` (구버전 `htmlTemplate` 사용 불가)
- MJPEG(`mode=mjpeg`)는 H264 소스와 코덱 미스매치 → MSE(`mode=mse`) 사용
- dashboard `configuration.widgets`에 `id`, `sizeX`, `sizeY`, `row`, `col` 모두 포함 필수

**스크립트:**
- `thingsboard/scripts/tb_siteguard_full_setup.py` — 대시보드 재생성 시 실행
- `temp/update_substream_attrs.py` — 서브스트림 속성만 빠른 업데이트 시 사용

---

### [2026-04-13] 클라우드 Thingsboard 기동 및 전체 검증 완료 (PASS 70/70)

**배경:** Hetzner CX33 서버(46.62.155.122)에 Thingsboard를 이전하여 운영 기준 환경 구축.
로컬 Thingsboard는 테스트 전용으로 유지.

**완료 항목:**
- Hetzner 서버 기본 설정: Docker, Git, Node.js, Claude Code CLI 설치
- GitHub clone → `/root/projects/siteguard-infra/`
- Thingsboard 4.2.1.1 클라우드 기동 확인
- test_01~05 전 항목 통과 — 로컬과 동일한 구조 클라우드에 재현
- test_03/04 MQTT 토큰·Device ID 클라우드 기준으로 수정

**클라우드 TB MQTT 토큰:**
| 기기명 | MQTT Token |
|--------|-----------|
| mobile-cctv-site-001 | Xl8KVvfv6Gj7DAxEXNz3 |
| virtual_settop1 | eMx3nS1nhXnI1CFFhLM7 |
| virtual_cctv1 | 8SOsGhAdlVwXoXkaKzuh |
| virtual_edge1 | A3TPceILZWFqZGogYQ3j |

**테스트 결과:**
| 파일 | PASS | FAIL |
|------|------|------|
| test_01_startup_check.sh | 4 | 0 |
| test_02_device_model.sh | 7 | 0 |
| test_03_mqtt_telemetry.py | 14 | 0 |
| test_04_alarm_rule.py | 7 | 0 |
| test_05_virtual_devices.py | 38 | 0 |

---

### [2026-04-13] 외부 AI 검토 반영 — 문서·설정 정확도 개선

**배경:** 두 번째 외부 AI(Claude) 검토 결과를 반영하여 문서 및 설정 파일 정확도 개선.

**변경 항목:**
- `docker-compose.yml`: CoAP 포트(5683-5688/udp) 주석 처리 (이동형 CCTV 시나리오에 불필요)
- `doc/architecture.md`:
  - Section 2 포트 표기 명확화: `(포트 9090)` → `(컨테이너 9090)`, 포트 매핑 주석 보완
  - Section 4 연동 방식: `MQTT 브릿지 1순위 또는 REST poll 2순위` → `MQTT 브릿지 (확정)` + 이유 명시
- `doc/project-overview.md`: MQTT 브릿지 검토 상태 `1순위 검토` → `**확정**`

---

### [2026-04-09] Device Profile 3종 + 가상 기기 3대 등록 완료 (PASS 38/38)

**배경:** 실배포 3종 시나리오 대응 Device Profile 설계 및 가상 기기 검증.
settop = Android OS 기반 확인 → Profile 서버 속성에 반영.

**완료 항목:**
- Device Profile 3종 생성: `settop` (Android, USB 카메라 1대 제한), `ip-camera`, `edge-controller`
- 가상 기기 3대: `virtual_settop1`, `virtual_cctv1`, `virtual_edge1`
- 기기별 서버/공유 속성 + MQTT 텔레메트리 + 알람 트리거 전 항목 검증
- `doc/architecture.md` 배포 시나리오·Device Profile 스키마 전면 업데이트

**MQTT 토큰 (가상 기기):**
| 기기명 | MQTT Token |
|--------|-----------|
| virtual_settop1 | ySaPv4sU2ZQPJuVYpwK9 |
| virtual_cctv1   | g19dPQxZArjsACP02kRS |
| virtual_edge1   | Tdsw3bDUmzRc1Yd3cl3x |

---

### [2026-04-09] TB-1 독립 검증 완료 — 기기 모델·MQTT·알람 전 항목 PASS

**배경:** Fleet Management 백엔드 독립 검증 완료. 4개 테스트 파일 전 항목 통과.

**완료 항목:**
- Thingsboard CE 4.2.1.1 (`thingsboard/tb-postgres:latest`) 기동 확인
- `data/logs` 권한 777 설정 (컨테이너 UID 799 쓰기 권한)
- 기기 `mobile-cctv-site-001` 생성, 서버/공유 속성 설정 완료
- MQTT 텔레메트리 6개 키 전송 및 REST API 조회 검증 완료
- 알람 규칙 2개 (CPU 과부하 >90, 디스크 초과 >180) 생성 및 트리거 확인
- `doc/architecture.md` 신규 생성
- API 차이 문서화: Thingsboard 4.x에서 알람 ack 경로 `/ack`로 변경

**테스트 결과:**
| 파일 | PASS | FAIL |
|------|------|------|
| test_01_startup_check.sh | 4 | 0 |
| test_02_device_model.sh | 7 | 0 |
| test_03_mqtt_telemetry.py | 14 | 0 |
| test_04_alarm_rule.py | 7 | 0 |

---

### [2026-04-09] 초기 설치 및 기본 구성

**배경:** Fleet Management 백엔드 독립 검증 시작. Frigate 통합 전 단독 기동·데이터 모델 검증.

**설치 항목:**
- Thingsboard CE (`thingsboard/tb-postgres:latest`)
- docker-compose.yml — 포트 8080(UI), 1884(MQTT, frigate 1883 충돌 방지)
- 폴더 구조: frigate와 동일 기준 적용
- 문서 체계: README.md, project-overview.md, setup-guide.md, walkthrough.md

---

## 섹션 4 — 트러블슈팅 모음

> 문제 유형별로 분류. 재발 가능성 기준으로 관리.

---

### [TS-01] 최초 기동 후 웹 UI 접속 안됨

- **현상:** `docker compose up -d` 후 `http://localhost:8080` 접속 안됨
- **원인:** DB 초기화 시간 필요 (1~2분)
- **해결:** `docker compose logs -f thingsboard` 에서 `Started ThingsboardServerApplication` 확인 후 접속

---

### [TS-02] MQTT 포트 충돌

- **현상:** Thingsboard MQTT 1883 기동 실패
- **원인:** frigate의 Mosquitto가 이미 1883 점유
- **해결:** `docker-compose.yml` 에서 `"1884:1883"` 으로 매핑 (이미 적용됨)

---

### [TS-03] 컨테이너 기동 직후 GC 로그 Permission Denied로 JVM 실패

- **현상:** `docker compose up` 후 컨테이너가 즉시 종료, 로그에 `gc.log: Permission denied` + `Error: Could not create the Java Virtual Machine`
- **원인:** `data/logs` 폴더 소유자가 호스트 사용자(visionlinux, UID 1000)이고, 컨테이너 내부 Thingsboard 프로세스(UID 799)가 쓸 수 없음
- **해결:** `chmod 777 data/logs` 후 컨테이너 재시작
- **주의:** `sudo chown -R 799:799 data/logs` 도 가능하지만 sudo 필요

---

### [TS-04] Thingsboard 4.x 알람 acknowledge API 경로 변경

- **현상:** `POST /api/alarm/{id}/acknowledge` → HTTP 405 (Allow: GET)
- **원인:** Thingsboard 4.x에서 API 경로 변경
- **해결:** `POST /api/alarm/{id}/ack` 사용 (경로 단축)
- **추가:** 이미 ack된 알람 재ack 시 HTTP 400 `"Alarm was already acknowledged!"` 반환 — 정상 동작임

---

### [TS-05] 속성 조회 API에 엔티티 타입 명시 필요

- **현상:** `GET /api/plugins/telemetry/{deviceId}/values/attributes/SERVER_SCOPE` → 빈 배열 반환
- **원인:** Thingsboard 4.x에서 엔티티 타입을 경로에 명시해야 함
- **해결:** `GET /api/plugins/telemetry/DEVICE/{deviceId}/values/attributes/SERVER_SCOPE` 로 변경

---

### [TS-06] 위젯 "Problem loading widget configuration" 오류

- **현상:** 대시보드 위젯에 "Problem loading widget configuration. Probably associated widget type was removed." 표시
- **원인 1:** `typeFullFqn`에 `system.` 접두사 누락 — `cards.html_card` → `system.cards.html_card`
- **원인 2:** `configuration.widgets` 딕셔너리에서 `id`, `sizeX`, `sizeY`, `row`, `col` 필드 누락
- **원인 3:** 설정 키 오류 — `htmlTemplate` → `cardHtml` / `cardCss`
- **해결:** `GET /api/widgetType?fqn=system.cards.html_card` 로 FQN 존재 확인 후, 위 세 항목 모두 점검

---

### [TS-07] go2rtc 스트림 코덱 미스매치 오류

- **현상:** `mjpeg: streams: codecs not matched: video:H264 ==> video:JPEG` 오류
- **원인:** go2rtc `stream.html?mode=mjpeg` 사용 시 JPEG 코덱 요구, 카메라 소스가 H264
- **해결:** `mode=mjpeg` → `mode=mse` 변경 (MSE는 H264 그대로 브라우저 재생)

---

### [TS-08] 대시보드 삭제 실패 (FK 제약)

- **현상:** `DELETE /api/dashboard/{id}` → HTTP 4xx, 대시보드가 남아있음
- **원인:** Device Profile의 `defaultDashboardId`가 해당 대시보드를 참조 중
- **해결:** 먼저 프로파일의 `defaultDashboardId`를 다른 대시보드로 변경 후 삭제, 또는 새 대시보드 생성 후 프로파일 업데이트 → 구 대시보드 삭제
