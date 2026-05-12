# SiteGuard 기기 데이터 매핑 정의서

> 목적: 현장·기기·카메라·텔레메트리 연결 규칙을 단일 문서로 관리
> 이 문서를 기준으로 UI 하드코딩 데이터, TB Device ID, go2rtc 스트림명을 맞춘다.
> 업데이트: 신규 현장/기기 추가 시 이 문서 먼저 작성 후 시스템 등록.

---

## 시트 A — 기기 유형 정의 (Device Type Registry)

### OS 분류 (APK 설치 가능 여부 결정)

| 유형코드 | 유형명 | OS | Tailscale APK | SiteGuard APK | 비고 |
|---------|-------|-----|--------------|--------------|------|
| STB | 셋탑 | **Android** | ✅ 설치 가능 | ✅ 설치 가능 | 카메라 없음, USB/IP 카메라 외장 연결 |
| AND | 안드로이드 단말 | **Android** | ✅ 설치 가능 | ✅ 설치 가능 | 태블릿·스마트폰, 내장 카메라 있음 |
| EDG | 에지 PC | **Linux** | ✅ 설치 가능 | ❌ (서버용) | 서브넷 라우터 역할, Frigate 운영 |
| IPC | IP 카메라 | 임베디드 펌웨어 | ❌ 설치 불가 | ❌ 설치 불가 | RTSP 스트림만 제공 |
| IOT | IoT 센서 | 임베디드 펌웨어 | ❌ 설치 불가 | ❌ 설치 불가 | MQTT 데이터만 전송 |

> **STB와 AND의 차이:** 둘 다 Android OS이지만, STB는 내장 카메라가 없어 외장 USB/IP 카메라를 연결하는 방식.
> 별도 유형 코드로 분리한 이유 = 카메라 연결 방식·UI 설정 탭이 다름.

### 유형별 상세 스펙

| 유형 | 카메라 연결 | 카메라 수 | 스토리지 | AI감지 | 네트워크 독립성 |
|------|-----------|---------|---------|-------|--------------|
| STB | **USB 카메라 (기본)** — USB 부재 시 **IP 카메라 1대 대체 가능** | 1대 | 내장 (SD 없음) | ✅ | Tailscale APK로 자체 연결 가능 |
| AND | 내장 전면 + 후면 | 2대 | 내장 | ✅ | Tailscale APK로 자체 연결 가능 |
| EDG | IP 카메라 최대 4대 + USB 1대 추가 가능 | 최대 5대 | HDD 400GB+ | ✅ | 서브넷 라우터 — 주변 IPC·IOT 게이트웨이 |
| IPC | 내장 카메라 1대 | 1대 | 내장 | ✅ | EDG 또는 STB 서브넷에 의존 |
| IOT | 없음 | 0대 | 없음 | ❌ | EDG 서브넷에 의존 |

> **STB 카메라 연결 상세:**
> - 1순위: USB 카메라 (UVC 표준, /dev/video0 직접 접근)
> - 2순위: IP 카메라 1대 (같은 LAN의 RTSP — STB가 로컬에서 pull → 클라우드로 push)
> - STB는 Android + Tailscale이므로 어느 방식이든 EDG 없이 독립적으로 클라우드 연결 가능

### 유형별 카메라 스트림 규칙

| 유형 | 카메라 소스 | 스트림 경로 | Tailscale 의존 |
|------|-----------|-----------|--------------|
| STB + USB cam | STB 내 USB(/dev/video0) | STB(Android Tailscale) → push → 클라우드 go2rtc | STB 자체 해결 |
| STB + IP cam | 로컬 LAN IPC RTSP pull → STB 릴레이 | STB(Android Tailscale) → push → 클라우드 go2rtc | STB 자체 해결 |
| AND | 안드로이드 내장 카메라 | AND(Android Tailscale) → push → 클라우드 go2rtc | AND 자체 해결 |
| EDG + IP cam | 로컬 LAN IPC RTSP | EDG Tailscale 서브넷 → pull → 클라우드 go2rtc | EDG 게이트웨이 |
| EDG + USB cam | EDG 내 USB | EDG Tailscale → push → 클라우드 go2rtc | EDG 자체 해결 |
| IPC (단독) | 카메라 자체 RTSP | **반드시 EDG 또는 STB 경유** | ❌ 자체 불가 |
| IOT | MQTT 데이터 | 인터넷 직접 → Thingsboard | Tailscale 불필요 |

```
Tailscale 설치 가능 기기 (자체 연결):
  STB (Android APK) ──────────────→ 클라우드 go2rtc (push)
  AND (Android APK) ──────────────→ 클라우드 go2rtc (push)
  EDG (Linux)       ──서브넷 광고──→ 클라우드 (IPC·IOT 게이트웨이)

Tailscale 설치 불가 기기 (EDG 의존):
  IPC ──RTSP──→ [EDG Tailscale] ──→ 클라우드 go2rtc (pull)
  IOT ──MQTT──→ 인터넷 직접 ──────→ Thingsboard (독립)
```

---

## 시트 B — 현장 목록 (Site Registry)

| 현장ID | 현장명 | 위치 | 담당자 | 로컬 서브넷 | Tailscale 서브넷 라우팅 | Edge PC | 비고 |
|-------|-------|------|-------|-----------|----------------------|---------|------|
| SITE-01 | 서울A현장 | 서울 강남구 | 홍*길 | 192.168.1.0/24 | ✅ (100.x.x.x) | edge-01 | 본사 인근 |
| SITE-02 | 부산B현장 | 부산 해운대구 | 김*수 | 192.168.2.0/24 | ✅ | edge-02 | |
| SITE-03 | 대구C현장 | 대구 중구 | 이*영 | 192.168.3.0/24 | ✅ | edge-03 | |
| *(개발)* | 로컬테스트 | visionlinux-alien | (개발자) | 192.168.0.0/24 | ✅ (100.118.143.92) | visionlinux | Tailscale 연결 확인됨 |

> **Tailscale 서브넷 라우팅 규칙:**
> - 각 현장 Edge PC가 `--advertise-routes=192.168.x.0/24` 로 서브넷 광고
> - Hetzner 클라우드(go2rtc, TB)는 해당 서브넷을 accept
> - 클라우드에서 `192.168.x.y` 직접 접근 가능

---

## 시트 C — 기기 매핑 (Device Registry)

| 기기ID | 현장ID | 유형 | 기기명 | 로컬 IP | Tailscale IP | TB Device ID | TB Access Token | 담당자 | 등록일 | 비고 |
|-------|-------|------|-------|--------|-------------|-------------|----------------|-------|-------|------|
| DEV-001 | SITE-01 | STB | stb-01 | 192.168.1.101 | - | SG-0010001 | (TB 토큰) | 홍*길 | 25.03.01 | |
| DEV-002 | SITE-01 | STB | stb-02 | 192.168.1.102 | - | SG-0010002 | (TB 토큰) | 홍*길 | 25.03.01 | |
| DEV-003 | SITE-02 | IPC | ipc-01 | 192.168.2.10 | - | SG-0010003 | (TB 토큰) | 김*수 | 25.01.15 | |
| DEV-004 | SITE-03 | EDG | edge-01 | 192.168.3.1 | - | SG-0010004 | (TB 토큰) | 이*영 | 24.12.01 | |
| *(개발)* | 로컬 | EDG | visionlinux | 192.168.0.15 | 100.118.143.92 | - | - | (개발자) | - | Frigate 서버 |
| *(개발)* | 로컬 | IPC | cctv_1 | 192.168.0.6 | - | - | - | (개발자) | - | TBT-Dome, profile2 |
| *(개발)* | 로컬 | IPC | cctv_2 | 192.168.0.7 | - | - | - | (개발자) | - | Vision Hitech, Ch2 |
| *(개발)* | 로컬 | IPC | cctv_3 | 192.168.0.8 | - | - | - | (개발자) | - | Vision Hitech, Ch2 |

---

## 시트 D — 카메라 스트림 매핑 (Camera Stream Registry)

| 스트림ID | 기기ID | 유형 | go2rtc 스트림명 | RTSP URL (원본) | 수집 방식 | 해상도 | FPS | go2rtc 설정 | 비고 |
|---------|-------|------|---------------|----------------|---------|-------|-----|-----------|------|
| CAM-001 | DEV-001 | STB | stb-01-usb | - | USB→UVC→RTSP | 1080p | 25 | `exec:ffmpeg -f v4l2 -i /dev/video0 ...` | USB 카메라 |
| CAM-002 | DEV-003 | IPC | ipc-01 | `rtsp://admin:pw@192.168.2.10:554/profile2` | RTSP TCP | 1080p | 30 | `exec:ffmpeg -rtsp_transport tcp -f mpegts` | |
| CAM-003 | DEV-004 | EDG | edge-01-cam1 | `rtsp://admin:pw@192.168.3.11:554/...` | RTSP TCP | 1080p | 25 | `exec:ffmpeg -rtsp_transport tcp -f mpegts` | Frigate 릴레이 |
| *(개발)* | cctv_1 | IPC | cctv_1 | `rtsp://admin:11qqaa..A@192.168.0.6:554/profile2` | RTSP TCP | 640×480 | 10 | `exec:ffmpeg -rtsp_transport tcp -f mpegts` | TBT-Dome |
| *(개발)* | cctv_2 | IPC | cctv_2 | `rtsp://admin:11qqaa..@192.168.0.7:554/Ch2` | RTSP TCP | 640×480 | 10 | `exec:ffmpeg -rtsp_transport tcp -f mpegts` | Vision Hitech |
| *(개발)* | cctv_3 | IPC | cctv_3 | `rtsp://admin1:11qqaa..@192.168.0.8:554/Ch2` | RTSP TCP | 640×480 | 10 | `exec:ffmpeg -rtsp_transport tcp -f mpegts` | Vision Hitech |

### go2rtc 카메라 연결 표준 패턴

```yaml
# 클라우드(Hetzner) go2rtc → 로컬 카메라 (Tailscale 경유)
# 원칙: 항상 TCP 강제 + MPEG-TS 래핑
# 이유: Tailscale 서브넷 라우팅 시 UDP RTP 역방향 차단됨
#       Vision Hitech 등 일부 카메라는 Annex-B 아닌 H.264 비트스트림 출력

streams:
  {stream_name}: exec:ffmpeg -hide_banner -rtsp_transport tcp -i {rtsp_url} -c:v copy -f mpegts -

# 신규 카메라 추가 시 체크리스트:
# 1. 이 문서 시트D에 먼저 등록
# 2. go2rtc.yaml에 위 패턴으로 추가
# 3. go2rtc 내장 플레이어(http://46.62.155.122:1984)에서 영상 확인
# 4. UI 카메라 목록에 스트림명 연결
```

---

## 시트 E — 텔레메트리 & 알람 매핑 (Telemetry & Alarm Registry)

| 기기유형 | TB 키명 | UI 표시명 | 타입 | 단위 | 수집주기 | 상한 알람 | 하한 알람 | 알람 심각도 | 대시보드 표출 |
|---------|--------|---------|------|------|---------|---------|---------|-----------|------------|
| STB/EDG/AND | `cpu_usage` | CPU 사용률 | float | % | 60s | 90 | - | 경고 | ✅ |
| STB/EDG/AND | `mem_usage` | 메모리 사용률 | float | % | 60s | 85 | - | 경고 | ✅ |
| STB/EDG | `disk_usage` | 스토리지 사용률 | float | % | 60s | 80 | - | 경고 | ✅ |
| STB/EDG | `disk_used_gb` | 스토리지 사용량 | float | GB | 60s | - | - | - | ✅ |
| STB/EDG/AND | `is_online` | 온라인 상태 | bool | - | 30s | - | - | 긴급 (offline) | ✅ |
| IPC | `is_streaming` | 스트리밍 상태 | bool | - | 30s | - | - | 경고 | ✅ |
| EDG | `ai_event_count` | AI 감지 건수 | int | 건 | 60s | - | - | 정보 | ✅ |
| IOT | `temperature` | 온도 | float | ℃ | 30s | 40 | 0 | 경고 | ✅ |
| IOT | `humidity` | 습도 | float | % | 30s | 80 | 20 | 경고 | ✅ |

### Thingsboard 알람 규칙 연계

```
TB Alarm Rule:
  기기 오프라인 → is_online == false → 긴급 알람 → UI 알람 페이지
  CPU 과부하   → cpu_usage > 90    → 경고 알람  → UI 알람 페이지
  스토리지 경고 → disk_usage > 80  → 경고 알람  → UI 알람 페이지
  스토리지 긴급 → disk_usage > 95  → 긴급 알람  → UI 알람 페이지
```

---

## 시트 F — 클라우드↔로컬 연결 규칙 (Connection Rules)

### 네트워크 아키텍처

```
[로컬 현장]
  Edge PC (visionlinux)
    ├── 192.168.0.6  IPC cctv_1 (TBT-Dome)
    ├── 192.168.0.7  IPC cctv_2 (Vision Hitech)
    └── 192.168.0.8  IPC cctv_3 (Vision Hitech)
    │
    └── Tailscale (100.118.143.92)
          --advertise-routes=192.168.0.0/24
          --ssh

[클라우드 Hetzner 46.62.155.122]
  ├── Thingsboard :8080   (기기 데이터 수집/저장)
  ├── go2rtc       :1984  (카메라 영상 중계)
  └── SiteGuard UI :3000  (Next.js 프론트엔드)
        │
        └── Tailscale (클라우드 노드)
              --accept-routes  ← 로컬 서브넷 192.168.x.0/24 접근 허용

[브라우저 / Vercel]
  SiteGuard UI
    ├── Thingsboard REST API → 기기 상태/알람
    └── go2rtc WebRTC       → 카메라 영상
```

### Tailscale 설치 위치 및 역할

> **Tailscale은 Edge PC에만 설치한다.**
> IP 카메라·셋탑·IoT 센서 등 임베디드 장치에는 설치 불가 (전용 펌웨어 장치).
> Edge PC가 `--advertise-routes`로 로컬 서브넷 전체를 Tailscale 네트워크에 노출하는
> **서브넷 라우터(게이트웨이)** 역할을 담당한다.

```
설치 가능 (Android/Linux):
  Edge PC  (Linux)   ← 서브넷 라우터 역할, 반드시 설치
  셋탑     (Android) ← APK 설치 가능, 자체 Tailscale 연결 가능
  안드로이드(Android) ← APK 설치 가능, 자체 Tailscale 연결 가능

설치 불가 (임베디드 펌웨어):
  IP 카메라           ← EDG 서브넷 라우팅에 의존
  IoT 센서            ← MQTT 직접 전송 (Tailscale 불필요)
```

**서브넷 라우팅 구조:**
```
[IP 카메라 192.168.x.6~8] ─┐
[셋탑       192.168.x.x  ] ─┤ 로컬 LAN (Tailscale 설치 불가)
[IoT 센서   192.168.x.x  ] ─┤
                             │ 같은 스위치/라우터
[Edge PC    192.168.x.15 ] ──┘  ← Tailscale 설치
    --advertise-routes=192.168.x.0/24   (서브넷 전체 광고)
    --ssh                               (원격 접속)
         ↕ Tailscale VPN 터널
[클라우드 Hetzner]
    go2rtc → 192.168.x.6 접근 가능  (Edge PC가 패킷 중계)
    TB     → Edge PC SSH 가능
```

### Tailscale 가용성 전제 조건

> **Tailscale(Edge PC)은 항시 연결을 보장하지 않는다.**
> 현장 네트워크 환경(방화벽, ISP, 라우터 설정)에 따라 연결 여부가 달라질 수 있음.
> 따라서 Tailscale 의존 기능과 비의존 기능을 명확히 구분해야 한다.

| 기능 | Tailscale 필요 여부 | 이유 | Tailscale 끊길 시 동작 |
|------|------------------|------|---------------------|
| **카메라 영상** (go2rtc pull) | ✅ Edge PC 경유 필수 | IP 카메라는 직접 Tailscale 불가 | 스트림 중단 → UI "연결 없음" |
| **기기 상태** (TB MQTT) | ❌ 불필요 | Edge PC가 인터넷으로 TB 직접 전송 | 정상 동작 |
| **알람** (TB Alarm) | ❌ 불필요 | TB 자체 처리 | 정상 동작 |
| **Edge PC SSH** | ✅ 필요 | Tailscale SSH 방식 | 원격 접속 불가 |
| **안드로이드 카메라** | 선택적 | 앱에서 직접 push 가능 | 앱 방식에 따라 다름 |

### 카메라 스트림 연결 방식 비교

| 방식 | 설명 | Tailscale 필요 | 현재 적용 |
|------|------|--------------|---------|
| **Pull (현재)** | 클라우드 go2rtc가 로컬 카메라 RTSP를 당겨옴 | ✅ 필요 | ✅ 사용 중 |
| **Push (대안)** | Edge PC가 스트림을 클라우드 go2rtc로 밀어올림 | ❌ 불필요 | ⏳ 미구현 |

```
Pull 방식 (현재):
  [로컬 카메라] ←RTSP(Tailscale)← [클라우드 go2rtc] ←WebRTC← [브라우저]

Push 방식 (대안):
  [로컬 카메라] →RTSP→ [Edge PC ffmpeg/go2rtc] →RTSP push→ [클라우드 go2rtc] ←WebRTC← [브라우저]
```

> **Push 방식 전환 고려 시점:**
> Tailscale 단절이 반복적으로 발생해 영상 안정성 문제가 생길 경우.
> Edge PC에서 `ffmpeg -re -i rtsp://카메라 -f rtsp rtsp://클라우드:8555/stream명` 으로 push 가능.

### 연결 방식별 규칙

| 연결 | 방식 | Tailscale 의존 | 주의사항 |
|------|------|--------------|---------|
| 클라우드 → 카메라 RTSP | Tailscale 서브넷 경유 | ✅ | **항상 TCP 강제** (`-rtsp_transport tcp`) |
| 클라우드 → 카메라 H.264 | MPEG-TS 래핑 | ✅ | `-f mpegts` (Annex-B 비호환 카메라 대응) |
| Edge PC → Thingsboard | MQTT 인터넷 직접 | ❌ | TB Access Token 인증, Tailscale 없어도 동작 |
| 브라우저 → go2rtc | WebRTC | ❌ (go2rtc만 살아있으면) | HTTPS 배포 시 go2rtc도 HTTPS 필요 |
| 클라우드 → Edge PC SSH | Tailscale SSH | ✅ | 키 불필요, Tailscale 인증 |

### 신규 현장 추가 체크리스트

```
□ 1. 이 문서 시트B (현장), 시트C (기기), 시트D (카메라) 항목 작성
□ 2. Edge PC에 Tailscale 설치 + 서브넷 라우팅 활성화 (가능한 경우)
□ 3. Edge PC → TB MQTT 연결 확인 (Tailscale 없이도 동작 검증)
□ 4. Thingsboard에 Device Profile + 기기 등록 → TB Token 발급
□ 5. go2rtc.yaml에 카메라 스트림 추가 (Tailscale 연결 상태에서 검증)
□ 6. go2rtc 내장 플레이어(http://46.62.155.122:1984)에서 영상 확인
□ 7. Tailscale 비연결 상태 시나리오 테스트 (기기 상태는 TB에서 조회되는지 확인)
□ 8. 이 문서 업데이트
```
