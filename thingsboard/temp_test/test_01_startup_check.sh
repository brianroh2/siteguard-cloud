#!/bin/bash
# =============================================================================
# [테스트 목적] Thingsboard CE 최초 기동 후 서비스 정상 동작 검증
#
# 배경:
#   Thingsboard CE(thingsboard/tb-postgres) 최초 기동 시
#   PostgreSQL DB 초기화로 1~2분 소요됨.
#   기동 완료 후 웹 UI(8080)와 REST API(로그인 토큰 발급)가
#   정상 동작하는지 확인한다.
#
# 검증 항목:
#   1. 컨테이너 Running 상태 확인
#   2. 웹 UI(http://localhost:8080) HTTP 응답 확인
#   3. REST API 로그인 토큰 발급 (tenant 계정)
#   4. REST API 로그인 토큰 발급 (sysadmin 계정)
# =============================================================================

TB_URL="http://localhost:8080"
TENANT_EMAIL="tenant@thingsboard.org"
TENANT_PW="tenant"
SYSADMIN_EMAIL="sysadmin@thingsboard.org"
SYSADMIN_PW="sysadmin"

echo "=========================================="
echo " Thingsboard CE 기동 검증 테스트"
echo " 실행시각: $(date '+%Y-%m-%d %H:%M:%S KST')"
echo "=========================================="

PASS=0
FAIL=0

check() {
    local label="$1"
    local result="$2"
    if [ "$result" = "PASS" ]; then
        echo "  ✅ $label"
        PASS=$((PASS+1))
    else
        echo "  ❌ $label — $result"
        FAIL=$((FAIL+1))
    fi
}

# 1. 컨테이너 상태
echo ""
echo "[1] 컨테이너 상태"
CONTAINER_STATUS=$(docker ps --filter "name=thingsboard" --format "{{.Status}}" 2>/dev/null)
if echo "$CONTAINER_STATUS" | grep -q "Up"; then
    check "thingsboard 컨테이너 Running" "PASS"
    echo "     상태: $CONTAINER_STATUS"
else
    check "thingsboard 컨테이너 Running" "컨테이너 없음 또는 종료 상태"
fi

# 2. 웹 UI HTTP 응답
echo ""
echo "[2] 웹 UI 응답 (http://localhost:8080)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$TB_URL" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    check "HTTP 응답" "PASS"
    echo "     HTTP 상태 코드: $HTTP_CODE"
else
    check "HTTP 응답" "HTTP $HTTP_CODE (서버 미응답 또는 기동 중)"
fi

# 3. REST API — tenant 로그인
echo ""
echo "[3] REST API 로그인 — tenant"
TENANT_TOKEN=$(curl -s -X POST "$TB_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PW\"}" \
    --max-time 10 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -n "$TENANT_TOKEN" ] && [ ${#TENANT_TOKEN} -gt 20 ]; then
    check "tenant 토큰 발급" "PASS"
    echo "     토큰: ${TENANT_TOKEN:0:30}..."
else
    check "tenant 토큰 발급" "토큰 없음 (비밀번호 변경 여부 확인)"
fi

# 4. REST API — sysadmin 로그인
echo ""
echo "[4] REST API 로그인 — sysadmin"
SYSADMIN_TOKEN=$(curl -s -X POST "$TB_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$SYSADMIN_EMAIL\",\"password\":\"$SYSADMIN_PW\"}" \
    --max-time 10 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -n "$SYSADMIN_TOKEN" ] && [ ${#SYSADMIN_TOKEN} -gt 20 ]; then
    check "sysadmin 토큰 발급" "PASS"
    echo "     토큰: ${SYSADMIN_TOKEN:0:30}..."
else
    check "sysadmin 토큰 발급" "토큰 없음"
fi

echo ""
echo "=========================================="
echo " 결과: PASS $PASS / FAIL $FAIL"
if [ $FAIL -eq 0 ]; then
    echo " ✅ 모든 검증 통과 — Thingsboard 정상 동작"
else
    echo " ❌ 일부 검증 실패 — walkthrough.md 섹션 4 확인"
    echo " 힌트: 최초 기동 후 1~2분 소요됨. 잠시 후 재실행 시도."
fi
echo " 웹 UI: http://localhost:8080"
echo " 계정: tenant@thingsboard.org / tenant"
echo "=========================================="
