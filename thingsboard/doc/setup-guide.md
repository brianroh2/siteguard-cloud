# 설치 가이드 (Setup Guide)

> 문서 성격: 처음부터 설치하는 전체 절차
> 최초 작성: 2026-04-09

---

## 0. 사전 요구사항

| 항목 | 요구사항 | 비고 |
|---|---|---|
| OS | Ubuntu 22.04 이상 | |
| Docker Engine | 20.x 이상 | |
| Docker Compose | 2.x 이상 | |
| 여유 RAM | 최소 2GB | Thingsboard JVM 기본 1.5GB |
| 여유 디스크 | 최소 10GB | DB + 로그 |

> **frigate와 동시 운영 시:** 포트 충돌 없음 (MQTT 1884로 분리됨)

---

## 1. 폴더 생성

```bash
mkdir -p /home/visionlinux/workspace/infra/thingsboard/{config,data/db,data/logs,scripts,temp_test,doc}
```

---

## 2. 설정 파일 작성

### 2-1. `docker-compose.yml`

```yaml
services:
  thingsboard:
    container_name: thingsboard
    image: thingsboard/tb-postgres:latest
    restart: unless-stopped
    ports:
      - "8080:9090"   # 웹 UI
      - "1884:1883"   # MQTT (frigate 1883 충돌 방지)
      - "7070:7070"   # Edge RPC
      - "5683-5688:5683-5688/udp"  # CoAP
    environment:
      TB_QUEUE_TYPE: in-memory
    volumes:
      - ./data/db:/var/lib/thingsboard/data
      - ./data/logs:/var/log/thingsboard
```

---

## 3. 컨테이너 기동

```bash
cd /home/visionlinux/workspace/infra/thingsboard

# 기동 (최초 1~2분 소요)
docker compose up -d

# 기동 완료 확인 — 아래 메시지가 나올 때까지 대기
docker compose logs -f thingsboard | grep -m1 "Started ThingsboardServerApplication"
```

---

## 4. 기동 후 검증

### 4-1. 컨테이너 상태

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 4-2. 웹 UI 접속

```
http://localhost:8080
```

테넌트 계정으로 로그인: `tenant@thingsboard.org` / `tenant`

### 4-3. REST API 토큰 발급 확인

```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('토큰 발급 성공:', d['token'][:30]+'...')"
```

### 4-4. 테스트 스크립트 실행

```bash
bash temp_test/test_01_startup_check.sh
```

---

## 5. 초기 설정 (웹 UI)

### 5-1. 비밀번호 변경

1. `sysadmin@thingsboard.org` 로그인 → 우측 상단 프로필 → 비밀번호 변경
2. `tenant@thingsboard.org` 로그인 → 동일하게 변경

### 5-2. 테넌트 확인

- sysadmin 로그인 → Tenants → `Tenant` 항목 확인
- 기기(Device) 등록은 테넌트 계정에서 진행

---

## 6. 트러블슈팅 빠른 참조

| 증상 | 원인 | 해결 |
|---|---|---|
| 8080 접속 안됨 | DB 초기화 진행 중 | 1~2분 후 재시도, 로그 확인 |
| 포트 1883 충돌 | frigate Mosquitto 점유 | docker-compose에서 1884:1883 확인 |
| data/ 권한 오류 | root 소유로 생성됨 | `sudo chown -R visionlinux:visionlinux data/` |
| 컨테이너 OOM | JVM 메모리 부족 | 가용 RAM 2GB 이상 확보 후 재기동 |

자세한 트러블슈팅 → [walkthrough.md](walkthrough.md) 섹션 4 참조
