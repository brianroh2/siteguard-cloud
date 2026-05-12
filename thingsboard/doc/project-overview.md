# 프로젝트 개요 (Project Overview)

> 문서 성격: 목적·데이터 모델·연동 계획 (변경이 거의 없는 고정 정보)
> 최초 작성: 2026-04-09
> 변경이 생기면 해당 섹션만 수정하고 하단에 수정 일시를 기록한다.

---

## 1. 역할 및 목적

Thingsboard CE는 이동형 CCTV 관제 솔루션의 **Fleet Management 백엔드**로 사용한다.

| 구분 | 내용 |
|---|---|
| 역할 | 현장 기기(이동형 CCTV 장비) 상태 수집·관리·알람 |
| 사용 방식 | API 백엔드 전용 (Thingsboard 자체 UI는 개발·검증용) |
| 최종 목표 | mobile-cctv-vms 커스텀 UI가 Thingsboard REST API 호출 |
| 라이선스 | Apache 2.0 — 상용화 제약 없음 |

> Thingsboard CE 내장 UI는 **검증·개발 단계 전용**.
> 상용화 시 커스텀 UI(mobile-cctv-vms)가 Thingsboard를 API 백엔드로만 사용.
> 화이트라벨(유료 기능) 불필요.

---

## 2. 현재 진행 단계

```
[현재] 독립 검증 단계
  → Frigate 없이 Thingsboard 단독으로 기동
  → 기기 데이터 모델 설계 및 검증
  → 내장 대시보드로 Fleet 관리 흐름 파악

[다음] Frigate 연동
  → Frigate 이벤트(사람 감지) → Thingsboard 텔레메트리 전송
  → MQTT 브릿지 또는 REST API 방식 결정

[최종] mobile-cctv-vms 통합
  → 커스텀 UI에서 Thingsboard REST API 호출
```

---

## 3. 기기(Device) 데이터 모델 설계안

### 3-1. Device 구조

이동형 CCTV 현장 1개 = Thingsboard Device 1개

| Thingsboard 개념 | 의미 | 예시 |
|---|---|---|
| Device | 현장 기기 1대 | `mobile-cctv-site-001` |
| Attribute (server) | 고정 메타 정보 | 기기명, 설치 위치, 담당자 |
| Attribute (shared) | 운영 설정값 | 감지 시간대, 알람 임계값 |
| Telemetry | 실시간 측정값 | CPU 온도, 감지 이벤트 수, 연결 상태 |
| Alarm | 이상 상태 알람 | 연결 끊김, 디스크 부족 |

### 3-2. 텔레메트리 항목 (TB-1 검증 완료)

| 키 | 타입 | 설명 | 출처 |
|---|---|---|---|
| `online` | boolean | 기기 연결 상태 | heartbeat |
| `cpu_usage` | float | CPU 사용률 (%) | 기기 에이전트 |
| `disk_used_gb` | float | 스토리지 사용량 | 기기 에이전트 |
| `detect_events_today` | int | 오늘 감지 이벤트 수 | Frigate API |
| `inference_ms` | float | AI 추론 속도 (ms) | Frigate API |
| `cameras_online` | int | 연결된 카메라 수 | Frigate API |

### 3-3. 서버 속성 (메타정보)

| 키 | 예시 값 |
|---|---|
| `site_name` | `본사 주차장` |
| `site_address` | `서울시 강남구 ...` |
| `install_date` | `2026-04-09` |
| `contact` | `홍길동 010-xxxx-xxxx` |
| `camera_count` | `3` |

---

## 4. Frigate 연동 방식 (검토 중)

| 방식 | 장점 | 단점 | 검토 상태 |
|---|---|---|---|
| MQTT 브릿지 | 실시간, 설정 간단 | MQTT 포트 분리 필요 (1884) | **확정** |
| REST API (poll) | 구현 단순 | 주기적 polling 지연 | 2순위 |
| 직접 DB 접근 | 빠름 | frigate.db 스키마 의존 | 비권장 |

---

## 5. 소프트웨어 스택

| 항목 | 내용 |
|---|---|
| 이미지 | `thingsboard/tb-postgres:latest` |
| 내장 DB | PostgreSQL (별도 설치 불필요) |
| 큐 방식 | `in-memory` (개발용) → 운영 시 Kafka 전환 검토 |
| 포트 | 8080 (UI), 1884 (MQTT), 7070 (Edge RPC) |

---

## 6. 로드맵

| 단계 | 목표 | 상태 |
|---|---|---|
| **TB-1** | Thingsboard CE 단독 기동 + 기기 모델 검증 | ✅ 완료 (2026-04-09) |
| **TB-2** | Frigate → Thingsboard 텔레메트리 연동 | 🔲 예정 |
| **TB-3** | 알람 규칙 설정 (기기 오프라인, 디스크 임계값 등) | ✅ 완료 (TB-1에 포함) |
| **TB-4** | mobile-cctv-vms 커스텀 UI에서 API 호출 | 🔲 예정 |
