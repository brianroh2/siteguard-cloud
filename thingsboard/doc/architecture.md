# Thingsboard 아키텍처 (Architecture)

> 문서 성격: 시스템 구성·컴포넌트·데이터 흐름 (변경이 거의 없는 고정 정보)
> 최초 작성: 2026-04-09
> 변경 시 해당 섹션만 수정하고 하단에 수정 일시를 기록한다.

---

## 1. 전체 구성도

```
┌─────────────────────────────────────────────────────────────┐
│ infra/ (이동형 CCTV 관제 솔루션 인프라)                      │
│                                                             │
│  ┌──────────────────┐       ┌───────────────────────────┐  │
│  │  frigate/ (VMS)  │       │  thingsboard/ (Fleet)     │  │
│  │                  │       │                           │  │
│  │  Frigate 0.17.1  │       │  Thingsboard CE 4.2.1.1   │  │
│  │  Mosquitto 2.x   │       │  PostgreSQL (내장)         │  │
│  │  OpenVINO GPU    │       │                           │  │
│  │  카메라 3대      │       │  포트 8080 (UI/REST)       │  │
│  │  포트 5000 (UI)  │  ···> │  포트 1884 (MQTT)         │  │
│  │  포트 1883 (MQTT)│       │  포트 7070 (Edge RPC)     │  │
│  └──────────────────┘       └───────────────────────────┘  │
│        VMS 인프라                 Fleet Management           │
│        Step 1 완료               TB-1 완료, TB-2 예정        │
└─────────────────────────────────────────────────────────────┘
           ↑                              ↑
    현장 CCTV 영상                  현장 기기 상태
    이벤트 감지 (AI)                 텔레메트리 수집
                                     알람 관리
```

---

## 2. Thingsboard 내부 컴포넌트

```
┌─────────────────────────────────────────────────────────────┐
│ Thingsboard CE (Docker: thingsboard/tb-postgres)            │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────────────────┐ │
│  │ Web UI / API    │   │ Rule Engine                     │ │
│  │ (컨테이너 9090) │   │ - 알람 규칙 평가                 │ │
│  │                 │   │ - 텔레메트리 임계값 감지          │ │
│  │ REST API        │   │ - 알람 생성/clear                │ │
│  │ WebSocket       │   └─────────────────────────────────┘ │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────────────────┐ │
│  │ MQTT Broker     │   │ PostgreSQL DB (내장)             │ │
│  │ (포트 1883)     │   │ - Device 레지스트리              │ │
│  │                 │   │ - 텔레메트리 시계열               │ │
│  │ Access Token 인증│   │ - 알람 이력                     │ │
│  │ 토픽: v1/devices│   │ - Rule Engine 설정               │ │
│  │ /me/telemetry   │   └─────────────────────────────────┘ │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘

호스트 포트 매핑 (호스트 → 컨테이너 내부):
  8080 → 9090  (Web UI / REST API)   ← 브라우저는 :8080으로 접속
  1884 → 1883  (MQTT, frigate Mosquitto 1883 충돌 방지)
  7070 → 7070  (Edge RPC)
```

---

## 3. 현장 배포 시나리오 및 Device Profile

### 3-1. 배포 시나리오 3종

```
관리 서버 (중앙: Frigate + Thingsboard)
         │
         │ 인터넷
  ┌──────┼──────────────────┐
  │      │                  │
[S1]   [S2]               [S3]
  │      │                  │
셋탑    공유기             공유기
(USB    ├─ 셋탑             ├─ 소형 관제 PC
 카메라 │  (IP 카메라 관리)  │  (Frigate + 로컬 TB)
 1대)   └─ IP 카메라 N대   └─ IP 카메라 4대
                               (SD카드 자체 저장)
                               ※ 중앙에 상태 요약만 보고
```

### 3-2. Device Profile 3종

| Profile | 대상 기기 | OS | Scenario |
|---------|---------|-----|---------|
| `settop` | 셋탑 / Edge PC | **Android** | S1, S2 |
| `ip-camera` | IP CCTV 카메라 | 임베디드 Linux | S2, S3 |
| `edge-controller` | 소형 관제 PC | Linux (x86) | S3 |

> **settop 특이사항**: Android OS 기반. USB 카메라 **최대 1대** 제한 (USB 대역폭 + Frigate 추론 부하).
> Scenario 1(USB) ↔ Scenario 2(IP 카메라)는 `network_camera_count` 속성으로 구분.

### 3-3. Device Profile별 텔레메트리 스키마

**settop (Android 기반 셋탑)**
```
online              bool    기기 연결 상태
cpu_usage           float   CPU 사용률 (%)           알람: > 90
ram_usage_pct       float   RAM 사용률 (%)
disk_used_gb        float   스토리지 사용량 (GB)      알람: > 180
cameras_online      int     연결된 카메라 수           알람: < 1 (USB 끊김)
inference_ms        float   AI 추론 속도 (ms)
detect_events_today int     오늘 감지 이벤트 수

서버 속성: site_name, network_type, usb_camera_max(=1), network_camera_count, model
공유 속성: detect_start_hour, detect_end_hour, storage_limit_gb
```

**ip-camera (IP CCTV 카메라)**
```
online              bool    기기 연결 상태
stream_active       bool    스트림 활성 여부           알람: false
fps                 float   초당 프레임 수
recording_active    bool    녹화 중 여부

서버 속성: site_name, resolution, rtsp_url, storage_type(sd-card/nas/none), model
공유 속성: recording_enabled, detection_enabled
```

**edge-controller (소형 관제 PC, Frigate + 로컬 TB 탑재)**
```
online              bool    기기 연결 상태
cpu_usage           float   CPU 사용률 (%)
ram_usage_pct       float   RAM 사용률 (%)
disk_used_gb        float   OS/앱 디스크 사용량 (GB)
cameras_online      int     관리 중인 카메라 수
frigate_status      bool    Frigate 서비스 상태        알람: false
local_tb_status     bool    로컬 Thingsboard 상태
event_count_today   int     오늘 감지 이벤트 수
local_storage_gb    float   이벤트 영상 저장량 (GB)   알람: > 400

서버 속성: site_name, managed_cameras, frigate_version, local_tb_version, model
공유 속성: heartbeat_interval_sec, storage_limit_gb, report_to_central
```

### 3-4. 현재 등록 기기

> 환경별 MQTT 토큰이 다름 — Thingsboard DB가 분리되어 있으므로 로컬/클라우드 각각 발급됨.

**클라우드 Thingsboard (Hetzner 46.62.155.122:8080) — 운영 기준**
```
Tenant (테넌트: tenant@thingsboard.org)
├── Profile: settop
│   ├── mobile-cctv-site-001     MQTT: Xl8KVvfv6Gj7DAxEXNz3  ← 초기 검증용
│   └── virtual_settop1          MQTT: eMx3nS1nhXnI1CFFhLM7  ← S1 가상 기기
│
├── Profile: ip-camera
│   └── virtual_cctv1            MQTT: 8SOsGhAdlVwXoXkaKzuh  ← S2/S3 가상 기기
│
└── Profile: edge-controller
    └── virtual_edge1            MQTT: A3TPceILZWFqZGogYQ3j  ← S3 가상 기기
```

**로컬 Thingsboard (192.168.0.15:8080) — 테스트 전용**
```
├── mobile-cctv-site-001     MQTT: YSucuQSBC3VNgqEWZk5q
├── virtual_settop1          MQTT: ySaPv4sU2ZQPJuVYpwK9
├── virtual_cctv1            MQTT: g19dPQxZArjsACP02kRS
└── virtual_edge1            MQTT: Tdsw3bDUmzRc1Yd3cl3x
```

> `mobile-cctv-site-001`은 TB-1 검증 목적으로 생성. 향후 `settop` Profile로 정리 예정.

### 3-5. MQTT 인증 방식

```
기기(또는 시뮬레이터) → MQTT (호스트 1884) → Thingsboard

인증: username = MQTT Access Token (디바이스별 고유), 비밀번호 불필요
토픽: v1/devices/me/telemetry
페이로드: {"key": value, ...}  (JSON)
```

---

## 4. 향후 연동 구조 (Frigate → Thingsboard)

```
[계획 — TB-2 단계, 아직 미구현]

Frigate (포트 5000 REST API)
  ↓  (poll 또는 MQTT 이벤트)
연동 에이전트 (scripts/frigate_bridge.py 예정)
  ↓  (MQTT publish)
Thingsboard (포트 1884)
  └── 텔레메트리: detect_events_today, inference_ms, cameras_online

연동 방식: MQTT 브릿지 (확정)
  → Frigate가 이벤트 발생 시 MQTT publish → Thingsboard가 subscribe하여 텔레메트리 수집
  → REST poll 방식은 구현은 단순하나 실시간성 부족으로 채택 안함
```

---

## 5. 데이터 영속화

```
thingsboard/
└── data/
    ├── db/    → PostgreSQL 데이터 (컨테이너 /var/lib/thingsboard/data)
    └── logs/  → Thingsboard 로그 (컨테이너 /var/log/thingsboard)
               ※ 권한: 777 설정 필요 (컨테이너 내부 UID 799가 쓰기)
```

---

## 6. 포트 배치 (전체 인프라)

| 서비스 | 호스트 포트 | 역할 | 비고 |
|--------|-----------|------|------|
| Frigate | 5000 | VMS 웹 UI | |
| Mosquitto | 1883 | Frigate MQTT | |
| Thingsboard | 8080 | Fleet UI / REST API | |
| Thingsboard | 1884 | Fleet MQTT | 1883 충돌 방지 |
| Thingsboard | 7070 | Edge RPC | 이동형 기기 연결 |
