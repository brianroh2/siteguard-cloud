#!/bin/bash
# =============================================================================
# [테스트 목적] 이동형 CCTV 기기(Device) 모델 생성 및 속성 설정 검증
#
# 배경:
#   project-overview.md 섹션 3의 데이터 모델 설계안을 REST API로 실제 구현.
#   기기 1대(mobile-cctv-site-001) 생성 후 서버 속성과 공유 속성을 설정하고,
#   다시 조회하여 정상 반영 여부를 확인한다.
#   성공 시 MQTT 토큰도 출력해 test_03(MQTT 텔레메트리) 준비를 마친다.
#
# 검증 항목:
#   1. tenant 로그인 토큰 발급
#   2. Device 생성 (mobile-cctv-site-001)
#   3. 서버 속성(Server Attributes) 설정 — 메타정보
#   4. 공유 속성(Shared Attributes) 설정 — 운영 설정값
#   5. 속성 조회 — 설정값 일치 확인
#   6. Device MQTT Access Token 조회 (test_03 준비)
# =============================================================================

TB_URL="http://localhost:8080"
TENANT_EMAIL="tenant@thingsboard.org"
TENANT_PW="tenant"
DEVICE_NAME="mobile-cctv-site-001"

echo "=========================================="
echo " TB-2 기기 모델 생성 및 속성 검증"
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

# ── 1. 토큰 발급 ──────────────────────────────────────────────────
echo ""
echo "[1] tenant 로그인 토큰 발급"
TOKEN=$(curl -s -X POST "$TB_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PW\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -n "$TOKEN" ] && [ ${#TOKEN} -gt 20 ]; then
    check "토큰 발급" "PASS"
else
    check "토큰 발급" "실패 — 서버 응답 없음"
    echo " 중단: 토큰 없이 진행 불가"
    exit 1
fi

# ── 2. Device 생성 ────────────────────────────────────────────────
echo ""
echo "[2] Device 생성: $DEVICE_NAME"

# 기존 기기가 있으면 재사용
EXISTING_ID=$(curl -s -X GET "$TB_URL/api/tenant/devices?deviceName=$DEVICE_NAME" \
    -H "X-Authorization: Bearer $TOKEN" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',{}).get('id',''))" 2>/dev/null)

if [ -n "$EXISTING_ID" ] && [ ${#EXISTING_ID} -gt 5 ]; then
    DEVICE_ID="$EXISTING_ID"
    check "Device 존재 확인 (재사용)" "PASS"
    echo "     Device ID: $DEVICE_ID"
else
    CREATE_RESP=$(curl -s -X POST "$TB_URL/api/device" \
        -H "Content-Type: application/json" \
        -H "X-Authorization: Bearer $TOKEN" \
        -d "{\"name\":\"$DEVICE_NAME\",\"type\":\"mobile-cctv\"}")
    DEVICE_ID=$(echo "$CREATE_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',{}).get('id',''))" 2>/dev/null)
    if [ -n "$DEVICE_ID" ] && [ ${#DEVICE_ID} -gt 5 ]; then
        check "Device 생성" "PASS"
        echo "     Device ID: $DEVICE_ID"
    else
        check "Device 생성" "실패 — $CREATE_RESP"
        exit 1
    fi
fi

# ── 3. 서버 속성(Server Attributes) 설정 ─────────────────────────
echo ""
echo "[3] 서버 속성 설정 (메타정보)"
ATTR_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$TB_URL/api/plugins/telemetry/$DEVICE_ID/SERVER_SCOPE" \
    -H "Content-Type: application/json" \
    -H "X-Authorization: Bearer $TOKEN" \
    -d '{
        "site_name":     "본사 주차장",
        "site_address":  "서울시 강남구 테헤란로 1",
        "install_date":  "2026-04-09",
        "contact":       "관리자 010-0000-0000",
        "camera_count":  3
    }')
if [ "$ATTR_RESP" = "200" ]; then
    check "서버 속성 저장 (HTTP 200)" "PASS"
else
    check "서버 속성 저장" "HTTP $ATTR_RESP"
fi

# ── 4. 공유 속성(Shared Attributes) 설정 ─────────────────────────
echo ""
echo "[4] 공유 속성 설정 (운영 설정값)"
SHARED_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$TB_URL/api/plugins/telemetry/$DEVICE_ID/SHARED_SCOPE" \
    -H "Content-Type: application/json" \
    -H "X-Authorization: Bearer $TOKEN" \
    -d '{
        "detect_start_hour": 8,
        "detect_end_hour":   19,
        "storage_limit_gb":  200,
        "alarm_threshold_cpu": 90
    }')
if [ "$SHARED_RESP" = "200" ]; then
    check "공유 속성 저장 (HTTP 200)" "PASS"
else
    check "공유 속성 저장" "HTTP $SHARED_RESP"
fi

# ── 5. 속성 조회 검증 ─────────────────────────────────────────────
echo ""
echo "[5] 속성 조회 검증"
ATTR_DATA=$(curl -s \
    "$TB_URL/api/plugins/telemetry/DEVICE/$DEVICE_ID/values/attributes/SERVER_SCOPE" \
    -H "X-Authorization: Bearer $TOKEN" 2>/dev/null)
SITE_NAME=$(echo "$ATTR_DATA" | python3 -c "
import json,sys
data=json.load(sys.stdin)
vals={d['key']:d['value'] for d in data}
print(vals.get('site_name',''))
" 2>/dev/null)
if [ "$SITE_NAME" = "본사 주차장" ]; then
    check "서버 속성 조회 일치 (site_name)" "PASS"
else
    check "서버 속성 조회 일치 (site_name)" "값 불일치: '$SITE_NAME'"
fi

SHARED_DATA=$(curl -s \
    "$TB_URL/api/plugins/telemetry/DEVICE/$DEVICE_ID/values/attributes/SHARED_SCOPE" \
    -H "X-Authorization: Bearer $TOKEN" 2>/dev/null)
DETECT_HOUR=$(echo "$SHARED_DATA" | python3 -c "
import json,sys
data=json.load(sys.stdin)
vals={d['key']:d['value'] for d in data}
print(vals.get('detect_start_hour',''))
" 2>/dev/null)
if [ "$DETECT_HOUR" = "8" ]; then
    check "공유 속성 조회 일치 (detect_start_hour)" "PASS"
else
    check "공유 속성 조회 일치 (detect_start_hour)" "값 불일치: '$DETECT_HOUR'"
fi

# ── 6. MQTT Access Token 조회 ─────────────────────────────────────
echo ""
echo "[6] MQTT Access Token 조회 (test_03 준비)"
CREDS=$(curl -s "$TB_URL/api/device/$DEVICE_ID/credentials" \
    -H "X-Authorization: Bearer $TOKEN" 2>/dev/null)
MQTT_TOKEN=$(echo "$CREDS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d.get('credentialsId',''))
" 2>/dev/null)
if [ -n "$MQTT_TOKEN" ] && [ ${#MQTT_TOKEN} -gt 5 ]; then
    check "MQTT Access Token 조회" "PASS"
    echo "     MQTT Token: $MQTT_TOKEN"
    echo "     (이 토큰을 test_03에서 사용)"
else
    check "MQTT Access Token 조회" "토큰 없음"
fi

echo ""
echo "=========================================="
echo " 결과: PASS $PASS / FAIL $FAIL"
if [ $FAIL -eq 0 ]; then
    echo " ✅ 모든 검증 통과 — 기기 모델 정상"
else
    echo " ❌ 일부 검증 실패"
fi
echo " Device ID:  $DEVICE_ID"
echo " MQTT Token: $MQTT_TOKEN"
echo "=========================================="
