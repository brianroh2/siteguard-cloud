# 카메라 관제 UI 설계 문서

> 작성일: 2026-05-12  
> 목적: 클라우드 TB 관제 화면 및 에지 연동 기준 정의  
> 참조: `temp/Device Fleet mgt UI 참조안.pptx` (SKB VMS, Cloud VMS 패턴)  
> 상태: 설계 확정 — 구현 전 기준 문서

---

## 1. 전체 화면 구성

```
[메인 관제 그리드]          → 라이브뷰 멀티 카메라 그리드
[카메라 목록 대시보드]       → 카메라 등록·현황·필터·검색
  └─ [카메라 상세 패널]      → ⚙️ 클릭 시 — 5개 섹션, 탭 없는 단일 패널
```

---

## 2. 카메라 목록 대시보드

### 2-1. 요약 헤더

```
📷 SiteGuard 카메라 관제        전체 N대 | ● 정상 N | ● 오류 N
```

### 2-2. 필터 바

| 필터 | 선택지 | 참조 |
|------|--------|------|
| 그룹 | 전체 / 그룹명 | SKB VMS Device Group |
| 가입자 | 전체 / 가입자명 | SKB VMS Customer |
| 유형 | 전체 / Dome / Bullet / 기타 | SKB VMS Device Type |
| 라이브 | 전체 / ON / OFF | SKB VMS Cloud Recording |
| SD 상태 | 전체 / 정상 / 경고 / 가득참 | SKB VMS SD Status |
| 검색기준 | 카메라명 / MAC / IP / 가입자 | SKB VMS Search |

페이지당 표시: 10 / 20 / 40 / 60  
우측 상단: [📥 엑셀 내보내기] [+ 카메라 등록]

### 2-3. 목록 컬럼

| 컬럼 | 내용 | 비고 |
|------|------|------|
| 상태 | ● 정상 / ● 오류 / ● 오프라인 | 색상 표시 |
| 카메라명 | cctv-1, cctv-3 등 | 클릭 시 상세 이동 |
| 그룹 | LTE그룹, 주택그룹 등 | |
| 가입자 | 홍길동 등 (이름만) | |
| MAC / IP | AA:BB:CC:DD:EE:FF / 192.168.1.51 | 2줄 표시 |
| 라이브 | [ON ●] / [OFF ○] 인라인 토글 | go2rtc 스트림 |
| SD 상태 | ● 정상 / ● 경고 / ● 가득참 + 사용량 | 128/256 GB |
| 감지 | [ON ●] / [OFF ○] 인라인 토글 | Frigate 감지 |
| (설정) | [⚙️] | 카메라 상세 패널 오픈 |

> **라이브 / 감지 토글**: 목록에서 바로 ON/OFF 변경 가능  
> **[⚙️] 버튼**: 컬럼명 없이 아이콘만 표시

---

## 3. 카메라 상세 패널 (⚙️ 클릭)

탭 없는 단일 스크롤 패널. 5개 섹션으로 구성.  
기본: 전체 읽기 전용. [✏️ 편집] 클릭 시 해당 섹션 편집 모드 전환.

### 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ 카메라명   ● 상태                             [← 목록으로]  │
├─────────────────────┬────────────────────────────────────────┤
│                     │  ① 기기 식별                [✏️ 편집] │
│   [라이브뷰]         │  ② 시스템 정보                        │
│   [전체화면 ⛶]      │  ③ 에지 저장소                        │
│                     │  ④ 스트림 URL                         │
│                     │  ⑤ Frigate 감지 설정        [✏️ 편집] │
│                     │  [🗑️ 카메라 삭제]                     │
└─────────────────────┴────────────────────────────────────────┘
```

---

### ① 기기 식별 섹션 [✏️ 편집]

| 항목 | 속성명 | 입력 방식 | 비고 |
|------|--------|---------|------|
| 현장(Site) | `site` | 수동 | A현장, B현장 |
| 그룹 | `group` | 수동 | LTE그룹 등 |
| 가입자 | `customer` | 수동 | 이름만 |
| 모델 | `model` | 수동 | TVT TD-9421S4C |
| 유형 | `cam_type` | 수동 | Dome / Bullet |
| 위치 | `location` | 수동 | 설치 위치 설명 |
| MAC 주소 | `mac_address` | **등록 필수** | 최초 등록 시 의무 입력 |
| 내부 IP | `internal_ip` | 수동 / ONVIF | 192.168.1.51 |
| 외부 연결 | `connection` | 수동 | ddns:port 통합 표기 |
| 최초 등록일 | `activated_at` | 자동 (등록 시) | |

**편집 모드 동작:**
- [✏️ 편집] 클릭 → 입력 필드 활성화 + [저장] [취소] 버튼 표시
- [저장] → TB REST API `POST /api/plugins/telemetry/DEVICE/{id}/SERVER_SCOPE`
- inactive 상태가 되어도 기존 속성 값은 읽기 전용으로 계속 표시

---

### ② 시스템 정보 섹션

| 항목 | 속성명 | 입력 방식 |
|------|--------|---------|
| 펌웨어 버전 | `firmware_version` | ONVIF 자동 / 수동 |
| 펌웨어 날짜 | `firmware_date` | ONVIF 자동 / 수동 |

**버튼:**
- [🔄 ONVIF 갱신] → 에지 PC가 ONVIF 쿼리 → TB 속성 자동 업데이트
- [⬆️ 펌웨어 업그레이드] → 팝업 확인 후 실행

**펌웨어 업그레이드 확인 팝업:**
```
⚠️ 새 펌웨어 사용 가능
V2.4.0으로 업그레이드하시겠습니까?
[나중에]   [지금 업그레이드]
```

**ONVIF 자동 입수 항목 (에지 PC에서 실행):**

| 항목 | ONVIF 메서드 |
|------|-------------|
| MAC, 내부 IP | GetNetworkInterfaces |
| 펌웨어 버전·날짜 | GetDeviceInformation |
| 모델명 | GetDeviceInformation |

> 에지 PC(192.168.1.x)가 카메라에 직접 접근 → TB REST API로 속성 업데이트  
> 클라우드에서 직접 ONVIF 쿼리 불가 (LTE DDNS 경유, 에지 PC 담당)

---

### ③ 에지 저장소 섹션

| 항목 | 속성명 | 갱신 방식 |
|------|--------|---------|
| 카메라 SD 전체 용량 | `sd_total_gb` | 에지 스크립트 자동 |
| 카메라 SD 사용량 | `sd_used_gb` | 에지 스크립트 자동 |
| 에지 PC 전체 용량 | `edge_total_gb` | 에지 스크립트 자동 |
| 에지 PC 사용량 | `edge_used_gb` | 에지 스크립트 자동 |

**화면 표시:**
```
카메라 SD   ████████░░  128 / 256 GB   ● 정상
에지 PC     █████░░░░░   98 / 200 GB   ● 정상
[🗑️ 에지 저장소 정리]
```

**에지 저장소 정리 확인 팝업:**
```
⚠️ 에지 저장소 초기화
저장된 클립이 삭제됩니다. 진행하시겠습니까?
[취소]   [확인]
```

---

### ④ 스트림 URL 섹션

| 항목 | 속성명 | 생성 방식 |
|------|--------|---------|
| 메인 RTSP | `rtsp_url_main` | 자동 생성 (connection + 프로파일) |
| 서브 RTSP | `rtsp_url_sub` | 자동 생성 |
| 라이브뷰 | `stream_url` | 자동 생성 (go2rtc URL) |

각 항목 우측 [복사] 버튼 표시. 편집 불가 (자동 생성값).

---

### ⑤ Frigate 감지 설정 섹션 [✏️ 편집]

| 항목 | 속성명 | 기본값 | 설명 |
|------|--------|--------|------|
| 감지 활성화 | `frigate_enabled` | true | ON/OFF 토글 |
| 감지 fps | `frigate_detect_fps` | 5 | 감지 프레임 수 |
| 신뢰도 임계값 | `frigate_min_score` | 0.5 | 0.0~1.0 |
| 최소 객체 면적 | `frigate_min_area` | 1000 | 픽셀² |
| 녹화 전 (초) | `frigate_record_pre` | 3 | 감지 전 버퍼 |
| 녹화 후 (초) | `frigate_record_post` | 5 | 감지 후 버퍼 |
| 보관 기간 (일) | `frigate_record_days` | 7 | |
| 알림 | `frigate_notify` | true | ON/OFF 토글 |

**[💾 에지 config 적용] 버튼 동작:**
```
1. TB 서버 속성 저장 완료 확인
2. 에지 PC에서 generate_frigate_config.py 실행
   → TB REST API로 속성 읽기
   → Frigate config.yml 재생성
   → Frigate 컨테이너 재시작
3. 적용 완료 알림 표시
```

> Zone(감지 영역) 좌표는 Frigate 비주얼 에디터에서 직접 설정 — TB 미관리

---

### 카메라 삭제 확인 팝업

```
⚠️ 카메라 삭제
'CCTV-1'을 목록에서 제거하시겠습니까?
go2rtc 스트림 및 TB 기기 정보가 삭제됩니다.
[취소]   [삭제]
```

---

## 4. 속성 전체 목록 (23개)

| 그룹 | 속성명 | 편집 가능 | 필수 |
|------|--------|----------|------|
| **기기 식별** | `site` | ✅ | |
| | `group` | ✅ | |
| | `customer` | ✅ | |
| | `model` | ✅ | |
| | `cam_type` | ✅ | |
| | `location` | ✅ | |
| | `mac_address` | ✅ | **필수** |
| | `internal_ip` | ✅ | |
| | `connection` | ✅ | |
| | `activated_at` | ❌ 자동 | |
| **시스템** | `firmware_version` | ONVIF/수동 | |
| | `firmware_date` | ONVIF/수동 | |
| **저장소** | `sd_total_gb` | ❌ 자동 | |
| | `sd_used_gb` | ❌ 자동 | |
| | `edge_total_gb` | ❌ 자동 | |
| | `edge_used_gb` | ❌ 자동 | |
| **스트림** | `rtsp_url_main` | ❌ 자동 | |
| | `rtsp_url_sub` | ❌ 자동 | |
| | `stream_url` | ❌ 자동 | |
| **Frigate 감지** | `frigate_enabled` | ✅ | |
| | `frigate_detect_fps` | ✅ | |
| | `frigate_min_score` | ✅ | |
| | `frigate_min_area` | ✅ | |
| | `frigate_record_pre` | ✅ | |
| | `frigate_record_post` | ✅ | |
| | `frigate_record_days` | ✅ | |
| | `frigate_notify` | ✅ | |

---

## 5. 클라우드 ↔ 에지 데이터 흐름

```
[관리자 — TB 대시보드]
  속성 편집 → [저장]
       ↓
[Thingsboard 서버 속성 저장]
       ↓ (on-demand)
[에지 PC — generate_frigate_config.py]
  TB REST API 읽기
  → Frigate config.yml 생성
  → docker restart frigate
       ↑
[에지 PC — edge_status_reporter.py]  (주기적 push)
  저장소 사용량, 펌웨어 정보, 감지 이벤트 요약
  → TB MQTT 전송
```

**향후 자동화 (Phase D-3):**  
TB Rule Engine → MQTT → 에지 리스너 → 자동 config 재생성

---

## 6. 카메라 신규 등록 절차

```
[+ 카메라 등록] 클릭
  ↓
등록 폼 (필수 항목 *)
  카메라명 *        그룹 *
  가입자 *          현장(Site) *
  MAC 주소 *        내부 IP
  모델 *            유형 *
  외부 연결(DDNS:PORT) *
  위치 설명
  ↓
[🔍 연결 테스트] → ffprobe 실행 → ✅ 성공 / ❌ 실패
  ↓ 성공 시
  해상도·fps 자동 탐지 표시
  ↓
[등록하기]
  → go2rtc.yaml 항목 추가 + 컨테이너 재시작
  → TB 기기 생성 + 속성 23개 설정
  → 대시보드 재생성
  → activated_at 자동 기록
```

---

## 7. 미결 사항 (추후 검토)

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| ONVIF 자동 갱신 스크립트 | 에지 PC에서 실행, TB 속성 업데이트 | Phase D-2 |
| 에지 config 자동 적용 | [💾] 버튼 → 에지 원격 실행 연동 | Phase D-3 |
| SD 상태 실시간 수집 | 에지 스크립트 → TB MQTT 주기 전송 | Phase D-2 |
| 카메라 신규 등록 UI | 등록 폼 + 연결 테스트 버튼 | Phase E |
| cctv-2 추가 | TVT Bullet, 주택 공유기 DDNS | Phase E |
