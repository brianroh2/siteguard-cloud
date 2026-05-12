# go2rtc 운영 문서 (Walkthrough)

> 문서 성격: go2rtc 설정 이력 + 트러블슈팅 모음
> 섹션 1 (현황 스냅샷)은 작업할 때마다 **덮어쓴다.**
> 섹션 2 (지식 베이스)와 섹션 3 (변경 이력)은 **위에 추가만** 한다.

---

## 섹션 1 — 현재 운영 현황 스냅샷

> 마지막 업데이트: 2026-05-11 (Nginx 프록시 적용)

### 1-1. 서비스 상태

| 항목 | 내용 |
|------|------|
| 버전 | alexxit/go2rtc:1.9.9 |
| 위치 | Hetzner (46.62.155.122) |
| Web UI / API | http://46.62.155.122:1984 (직접) / http://46.62.155.122/go2rtc/ (Nginx 경유) |
| RTSP 재스트리밍 | rtsp://46.62.155.122:8555/{stream_name} |
| 설정 파일 | `go2rtc/go2rtc.yaml` |
| 네트워크 | host 모드 |
| 카메라 접근 방식 | LTE DDNS (0004312.m2mnet.kr) 경유 — Tailscale 불필요 |
| 스트리밍 방식 | MSE (Nginx 포트 80 경유) — 외부망 DPI 우회 |
| 영상 레이블 | 플레이어 좌측 상단 "MSE" 표시 = 정상 (스트리밍 방식 안내) |

### 1-2. 카메라 스트림 현황

| 스트림명 | 카메라 | 내부 IP | WAN 포트 | 서브스트림 | 해상도 | fps |
|---------|--------|---------|---------|-----------|--------|-----|
| cctv_1 | TVT TD-9421S4C Dome | 192.168.1.51 | 554 | profile2 | 640×480 | 10 |
| cctv_3 | Vision Hitech TBT-Dome F977 | 192.168.1.53 | 555 | Ch2 | 640×480 | 10 |

> **lazy loading**: 뷰어가 없으면 ffmpeg 미기동 → 상시 대역폭 소모 없음  
> **메인스트림(profile1/Ch1)** 정보는 TB 기기 서버 속성에 별도 저장, go2rtc는 서브스트림만 사용

### 1-3. 카메라 연결 표준 패턴 (LTE DDNS 기반)

```yaml
# LTE 현장 카메라 추가 시 표준 템플릿
# - DDNS: 0004312.m2mnet.kr (M2MNet LT7 자체 갱신)
# - WAN 포트: LT7에서 카메라별 분리 (현재: 554=CCTV-1, 555=CCTV-3)
# - -rtsp_transport tcp: LTE NAT 환경 UDP RTP 차단 우회
# - -f mpegts: 제조사별 비트스트림 포맷 차이 흡수
new_cam: exec:ffmpeg -hide_banner -rtsp_transport tcp \
  -i rtsp://user:pass@0004312.m2mnet.kr:<wan_port>/<sub_profile> \
  -c:v copy -f mpegts -
```

### 1-4. 빠른 상태 확인 명령어

```bash
# 컨테이너 상태
docker ps --format "table {{.Names}}\t{{.Status}}"

# 스트림 등록 상태
curl -s http://localhost:1984/api/streams | python3 -m json.tool

# 로그 확인
docker logs go2rtc --tail 30

# 신규 카메라 사전 검증 (Hetzner에서 실행)
docker run --rm --network host alexxit/go2rtc:1.9.9 \
  ffprobe -v quiet -rtsp_transport tcp \
  -i "rtsp://user:pass@192.168.0.x:554/substream" -show_streams
```

---

## 섹션 2 — 운영 지식 (Knowledge Base)

### 2-E. MSE(WebSocket) vs WebRTC — 외부망 스트리밍 선택 이유

**MSE 모드가 외부 망에서 실패하는 원인:**
- MSE는 WebSocket(TCP) 기반 데이터 스트림을 사용
- 페이지(HTTP)는 로드되지만 영상이 안 나오는 현상 발생
- 원인: ISP·기업망의 DPI(딥패킷검사)가 비표준 포트(1984)에서 WebSocket 프로토콜을 식별해 차단
- HTTP 요청은 통과하지만 WebSocket 업그레이드 이후 데이터 채널이 막힘

**WebRTC 모드가 이를 우회하는 이유:**

| 항목 | MSE | WebRTC |
|------|-----|--------|
| 시그널링 | WebSocket → DPI 차단 대상 | HTTP POST → 통과 |
| 미디어 전송 | WebSocket(TCP) → 차단 | UDP(DTLS/SRTP) → 별도 경로 |
| NAT 통과 | 불필요 | STUN으로 공인 IP 자동 탐색 |

**go2rtc WebRTC 설정 (go2rtc.yaml):**
```yaml
webrtc:
  listen: ":8555"          # WebRTC 미디어 UDP 포트
  ice_servers:
    - urls: [stun:stun.l.google.com:19302]
  candidates:
    - 46.62.155.122         # Hetzner 공인 IP 명시 (ICE candidate)
```

**방화벽 요구사항:** Hetzner Cloud Firewall에서 UDP 8555 인바운드 허용 필요  
(OS 레벨 iptables는 ACCEPT 정책 — 클라우드 콘솔 방화벽이 없으면 추가 조치 불필요)

### 2-A. 로컬 vs 클라우드 카메라 연결 차이

로컬 PC(Frigate)에서 정상 동작하는 카메라 설정이 클라우드(Hetzner)에서 그대로 통하지 않는다.

| 조건 | 로컬 직접 연결 | 클라우드 (Tailscale 서브넷 경유) |
|------|-------------|-------------------------------|
| RTSP 전송 | UDP/TCP 모두 가능 | TCP 강제 필수 |
| 영상 전송(RTP) | UDP 정상 | UDP 역방향 차단 → TCP interleaved 필수 |
| 비트스트림 | 카메라 원본 OK | 제조사 포맷 차이 → MPEG-TS 래핑 |
| 테스트 도구 | ffplay (로컬 터미널) | ffprobe -rtsp_transport tcp (Hetzner에서) |

**검증 순서:**
```
1. 로컬 PC: ffplay rtsp://... → 카메라 동작 확인
2. Hetzner: ffprobe -rtsp_transport tcp ... → 클라우드 접근 가능 여부 확인
3. go2rtc.yaml: exec:ffmpeg 패턴으로 작성 → 브라우저에서 최종 확인
```

### 2-B. 카메라 제조사별 연결 방식 정리

| 제조사 | 기본 전송 | LTE DDNS 경유 | 스트림 프로파일 |
|--------|---------|-------------|--------------|
| TVT TD-9421S4C (CCTV-1) | TCP 호환 | exec:ffmpeg 통일 | profile1(main), profile2(sub) |
| Vision Hitech TBT-Dome F977 (CCTV-3) | UDP 기본 | exec:ffmpeg 필수, `-f mpegts` 필수 | Ch1(main), Ch2(sub) |
| **신규 (미검증)** | 모름 | exec:ffmpeg 템플릿으로 시작 | 검증 후 최적화 |

---

## 섹션 3 — 변경 이력 (Changelog)

---

### [2026-05-11] Nginx 프록시 전환 — MSE WebSocket 포트 80 우회

**배경:** WebRTC 전환 시도 → WebRTC 시그널링도 동일 WebSocket(포트 1984)을 사용해 동일하게 DPI 차단됨. 근본 해결: Nginx로 `/go2rtc/*`를 포트 80에서 프록시, WebSocket 업그레이드 헤더 통과.

**완료 항목:**
- Nginx 설치: `/etc/nginx/conf.d/go2rtc.conf` (WebSocket 프록시 포함)
- `go2rtc.yaml`: STUN을 Cloudflare(`stun:stun.cloudflare.com:3478`)로 변경
- `siteguard-ui/camera-grid.html`: URL `http://46.62.155.122/go2rtc`, `mode=mse`로 복귀
- `tb_siteguard_full_setup.py`: `GO2RTC_EXT`, mode=mse 동기화
- TB jar 재패치 + 대시보드 3개 재생성

**Nginx 설정 요약 (`/etc/nginx/conf.d/go2rtc.conf`):**
```nginx
location /go2rtc/ {
    proxy_pass http://127.0.0.1:1984/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

**주의:** Hetzner Cloud Firewall 생성 시 TCP 80 인바운드 규칙 추가 필요

---

### [2026-05-11] LTE DDNS 전환 + 서브스트림 적용

**배경:** 현장 카메라 접근 방식이 Tailscale 서브넷(192.168.0.x) → LTE DDNS(0004312.m2mnet.kr)로 변경됨. 대역폭 절감을 위해 메인스트림 → 서브스트림 전환.

**완료 항목:**
- `go2rtc.yaml` 스트림 소스 전면 교체
  - cctv_1: `192.168.0.6/profile1` → `0004312.m2mnet.kr:554/profile2` (640×480, 10fps)
  - cctv_3: `192.168.0.8/Ch1` → `0004312.m2mnet.kr:555/Ch2` (640×480, 10fps)
  - cctv_2: 해당 현장에 없음 → 제거
- go2rtc 컨테이너 재시작 및 스트림 등록 확인
- TB 기기 서버 속성 업데이트: `sub_rtsp_profile`, `sub_resolution`, `sub_fps`, `rtsp_url_external`

**대역폭 절감 효과:** 1080p·30fps → 480p·10fps, 비트레이트 약 20~30배 감소 예상

---

### [2026-04-14] go2rtc 최초 구축 — 카메라 3대 클라우드 스트리밍

**배경:** Hetzner 클라우드에서 에지 PC 카메라를 라이브 뷰하기 위한 go2rtc 구축.
Tailscale 서브넷 경유로 카메라(192.168.0.x)에 직접 접근.

**완료 항목:**
- `go2rtc/docker-compose.yml` 신규 작성 (network_mode: host)
- `go2rtc/go2rtc.yaml` 신규 작성 — 카메라 3대 sub stream 연결
- cctv_1: profile2, cctv_2/3: Ch2 (640x480, 10fps)
- 모든 카메라 `exec:ffmpeg -rtsp_transport tcp -f mpegts` 패턴으로 통일

**시행착오:**

| 시도 | 오류 | 원인 |
|------|------|------|
| `rtsp://...` plain RTSP (cctv_2/3) | 17초 후 스트림 종료 | UDP RTP 역방향 차단 |
| `rtsp://...?transport=tcp` | DESCRIBE 404 | `?transport=tcp`가 카메라 경로로 전달됨 |
| `exec:ffmpeg -f h264` | unsupported header | Vision Hitech 비트스트림이 Annex B 아님 |
| `exec:ffmpeg -bsf:v h264_mp4toannexb -f h264` | 동일 오류 | 변환 필터 효과 없음 |
| `exec:ffmpeg -f mpegts` | **성공** | MPEG-TS가 포맷 차이 흡수 |

**결론:** cctv_1(TBT-Dome)도 plain RTSP로 동작하지만 통일성·신규 카메라 일관성을 위해 exec:ffmpeg 패턴으로 통일.
