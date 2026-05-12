# Thingsboard CE — Fleet Management 백엔드

이동형 CCTV 관제 솔루션의 Fleet Management 레이어.
기기 상태 관리·원격 제어·데이터 집계를 담당하며, 향후 Frigate VMS(infra/frigate)와 통합 예정.
현재 단계: **독립 검증 중** (Frigate 통합 전 별도 테스트)

---

## 빠른 시작

```bash
# 1. 이 폴더로 이동
cd /home/visionlinux/workspace/infra/thingsboard

# 2. 컨테이너 기동 (최초 기동 시 DB 초기화로 1~2분 소요)
docker compose up -d

# 3. 상태 확인
docker ps
docker compose logs -f thingsboard

# 4. 웹 UI 접속
http://localhost:8080
# 테넌트 계정: tenant@thingsboard.org / tenant
```

---

## 기본 계정

| 역할 | 이메일 | 비밀번호 | 용도 |
|---|---|---|---|
| 시스템 관리자 | sysadmin@thingsboard.org | sysadmin | 테넌트 생성·전체 관리 |
| 테넌트 관리자 | tenant@thingsboard.org | tenant | 기기 관리·대시보드 (주로 사용) |

> 첫 접속 후 비밀번호 변경 권장

---

## 포트 구성

| 포트 | 역할 | 비고 |
|---|---|---|
| 8080 | 웹 UI / REST API | 브라우저 접속 |
| 1884 | MQTT | frigate의 1883과 충돌 방지 |
| 7070 | Edge RPC | 이동형 기기 연결 시 사용 |

---

## 현재 운영 구성

| 항목 | 내용 |
|---|---|
| 이미지 | thingsboard/tb-postgres (PostgreSQL 내장) |
| 큐 방식 | in-memory (개발·테스트용) |
| 데이터 | ./data/db (영속화) |
| 로그 | ./data/logs |

---

## 문서 안내

| 문서 | 역할 | 언제 열어보나 |
|---|---|---|
| [doc/project-overview.md](doc/project-overview.md) | 목적·데이터 모델·로드맵 | 온보딩·설계 검토 시 |
| [doc/setup-guide.md](doc/setup-guide.md) | 처음부터 설치하는 전체 절차 | 새 환경 설치 시 |
| [doc/walkthrough.md](doc/walkthrough.md) | 운영 변경 이력 + 트러블슈팅 | 작업 중 수시로 |

---

## 폴더 구조

```
thingsboard/
├── README.md               ← 이 파일 (입구)
├── docker-compose.yml      ← 서비스 정의
├── config/                 ← 추가 설정 파일 (향후 사용)
├── data/
│   ├── db/                 ← PostgreSQL 데이터 (영속화)
│   └── logs/               ← Thingsboard 로그
├── scripts/                ← 운영 자동화 스크립트
├── temp_test/              ← 검증 테스트 코드
└── doc/                    ← 문서
```

---

## 관련 프로젝트

```
workspace/
├── infra/frigate/          ← VMS 인프라 (Frigate)
└── infra/thingsboard/      ← 여기 (Fleet Management)
```

통합 설계 → [infra/frigate/doc/architecture.md](../frigate/doc/architecture.md)
