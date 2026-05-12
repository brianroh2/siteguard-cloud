# SiteGuard 시스템 아키텍처 정리

> 작성: 2026-04-24 / 최종수정: 2026-05-11 / 상태: Phase A·B 완료

---

## 1. 전체 구성 개요

SiteGuard는 현장 영상 관제 시스템으로, **에지 현장 → 클라우드 → 관리자 단말** 3개 레이어로 구성된다. 현장과 클라우드 사이는 SKT LTE 회선으로 연결되며, M2MNet LT7 자체 DDNS와 NAT Free(통신사 인바운드 허용) 설정을 통해 외부 직접 접근이 가능하다.

---

## 2. 레이어별 구성

### 레이어 1 — 에지 현장 (현장 박스)

현장은 M2MNet LT7 LTE 라우터를 중심으로 구성된다. LAN 포트가 2개로 제한되어 AP 모드 공유기와 POE 스위치로 확장한다.

**네트워크 구성도 (192.168.1.x 단일 대역)**

```
LTE 라우터 (192.168.1.1) — DHCP: 100~200, LAN 포트 2개
├── [포트1] CCTV-1 (TVT Dome,      192.168.1.51 고정IP)
└── [포트2] 공유기A (ipTIME A2004MU, AP모드, 192.168.1.2)
              ├── 개발PC-1 (Windows/SKT,   192.168.1.179 유동)
              ├── 개발PC-2 (Linux,         192.168.1.111 유동)
              └── POE 스위치
                    └── CCTV-3 (VHT Dome F977, 192.168.1.53 고정IP)
```

**IP 대역 설계**

```
192.168.1.1        → LTE 라우터 (게이트웨이)
192.168.1.2        → 공유기A (AP모드 관리)
192.168.1.51~99    → CCTV/IoT 고정IP 구간
   .51 → CCTV-1 (TVT Dome)
   .53 → CCTV-3 (VHT Dome F977)
   .52, .54~99 → 추후 CCTV/센서/RPi 추가용
192.168.1.100~200  → DHCP 자동할당 구간 (PC 등)
```

**CCTV-1: TVT Dome (192.168.1.51)**
- RTSP: profile1 (main) / profile2 (sub)
- 포트포워딩: WAN 554 → 192.168.1.51:554
- 외부 접근: `rtsp://0004312.m2mnet.kr:554/profile1`

**CCTV-3: Vision Hitech Dome F977 (192.168.1.53)**
- RTSP: Ch1 (main) / Ch2 (sub)
- 포트포워딩: WAN 555 → 192.168.1.53:554
- 외부 접근: `rtsp://0004312.m2mnet.kr:555/Ch1`

**LTE 라우터 (M2MNet LT7)**
- SKT 4G LTE 회선 / 공인 IP / NAT Free 설정됨 (통신사 인바운드 허용)
- 게이트웨이: 192.168.1.1
- DDNS: 0004312.m2mnet.kr (M2MNet 자체 DDNS, 공인IP 자동갱신)
- 포트포워딩 정상 동작 (NAT Free로 SKT 인바운드 차단 해소)

**공유기A (ipTIME A2004MU, AP모드)**
- AP 모드 — NAT 없음, 스위치 역할만
- 관리 IP: 192.168.1.2
- 하위 기기 모두 192.168.1.x 대역으로 LT7 DHCP 할당

**라즈베리파이 (추후 Phase D 예정)**
- Baresip: SIP 통화 클라이언트
- Frigate: 로컬 AI 감지·녹화
- 현재 LTE 카메라는 DDNS+포트포워딩으로 클라우드에 직접 연동됨

---

### 연결 구간 — SKT LTE

NAT Free(통신사 인바운드 허용) 설정이 적용되어 있어, 포트포워딩을 통한 외부 직접 접근이 가능하다. DDNS(0004312.m2mnet.kr)로 유동 공인 IP 변동을 자동 처리한다.

```
[LTE 라우터] ──포트포워딩──→ [SKT LTE 망 NAT Free] ──→ 인터넷 ──→ [Hetzner go2rtc]
```

---

### 레이어 2 — 클라우드 (Hetzner CX33)

- 사양: 4 vCPU / 8GB RAM / Ubuntu 24.04
- 위치: Helsinki / 월 약 13,000원
- Docker Compose로 서비스 운영

**Thingsboard CE**
- 기기 상태 모니터링, 사용자 관리, 알람 관리, 대시보드 UI 제공
- 포트: 8080

**go2rtc**
- LTE 현장 카메라로부터 DDNS 경유 영상 스트림을 받아 관리자에게 중계
- 영상 저장 없음 — 라이브 스트리밍 전용
- 포트: 1984

**Asterisk (추후 Phase D)**
- SIP PBX 교환기
- 비상벨 호출, 현장 방송 기능 제공
- 포트: UDP 5060

**커스텀 UI — mobile-cctv-vms (추후 Phase D)**
- React/TypeScript 기반 관제 화면
- Thingsboard API + go2rtc 영상 통합

---

### 레이어 3 — 관리자 단말

**브라우저 관제**
- Thingsboard 대시보드로 기기 상태, 알람 확인
- go2rtc 라이브 영상 확인

**스마트폰 (추후)**
- Linphone 앱으로 SIP 통화 수신
- 비상벨 알림 수신

**개발 PC**
- VS Code Remote SSH로 클라우드 서버 직접 편집
- Claude Code로 AI 개발 보조

---

## 3. 핵심 설계 원칙

| 원칙 | 내용 |
|------|------|
| 영상 저장 | 에지 전용 (SD카드/HDD). 클라우드는 라이브 중계만 |
| 인바운드 연결 | NAT Free + DDNS + 포트포워딩. 카메라별 WAN 포트 분리 |
| 스택 최소화 | Docker Compose, GitHub, VS Code SSH |
| 단계적 확장 | 핵심 기능 먼저, SIP·커스텀 UI는 후속 단계 |

---

## 4. 단계별 구현 계획

**Phase A·B (완료)**
LTE 카메라 외부 접근 확인 → NAT Free 설정 → M2MNet DDNS 연동 → go2rtc 클라우드 스트리밍 확인

**Phase C (다음 단계)**
Thingsboard 텔레메트리 연동 → 기기 상태 대시보드 구성

**Phase D (추후)**
Asterisk SIP 구축 → 비상벨·현장 방송 → 커스텀 관제 UI 개발

---

## 5. 현재 확인된 사항

- CCTV-1 (TVT Dome, 192.168.1.51) VLC 로컬·DDNS 외부 재생 정상 ✅
- CCTV-3 (VHT Dome F977, 192.168.1.53) VLC 로컬·DDNS 외부 재생 정상 ✅
- NAT Free 설정으로 SKT LTE 인바운드 허용됨 ✅
- DDNS 0004312.m2mnet.kr 정상 동작 ✅
- 포트포워딩: CCTV-1 (WAN:554), CCTV-3 (WAN:555) ✅
- Hetzner CX33 서버 운영 중 ✅
- go2rtc 클라우드 스트림: cctv_1, cctv_3 설정 완료 ✅
- CCTV-1 비밀번호 변경 필요 ⚠️

---

## 6. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-23 | 초안 작성 (Phase 1~4 장기 로드맵) |
| 2026-04-24 | 전면 개정 — 현재 확정 아키텍처로 재작성, SKT 인바운드 차단 우회(Tailscale) 구조 반영 |
| 2026-05-11 | 네트워크 구성 확정 반영 — NAT Free, M2MNet DDNS, AP모드 공유기, 실제 카메라 IP/포트 |
