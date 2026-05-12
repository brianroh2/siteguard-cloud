#!/usr/bin/env python3
# =============================================================================
# [테스트 목적] Thingsboard 알람 규칙 생성 및 트리거 검증
#
# 배경:
#   이동형 CCTV 기기 운영 중 CPU 과부하(>90%), 디스크 초과(>180GB),
#   기기 오프라인 상태를 자동 감지하여 알람을 발생시켜야 한다.
#   Thingsboard의 Device Profile에 Alarm Rule을 생성하고,
#   임계값 초과 텔레메트리를 MQTT로 전송해 알람이 실제 생성되는지 확인한다.
#
# 검증 항목:
#   1. "mobile-cctv" 디바이스 프로파일 생성 (또는 조회)
#   2. CPU 과부하 알람 규칙 추가 (cpu_usage > 90)
#   3. 디스크 초과 알람 규칙 추가 (disk_used_gb > 180)
#   4. 임계값 초과 텔레메트리 MQTT 전송
#   5. 알람 생성 확인 (REST API 조회)
#   6. 알람 정리 (acknowledge → clear)
# =============================================================================

import json
import sys
import time
import urllib.request
import urllib.error

# ── 설정값 ────────────────────────────────────────────────────────
TB_URL       = "http://localhost:8080"
MQTT_HOST    = "localhost"
MQTT_PORT    = 1884
MQTT_TOKEN   = "Xl8KVvfv6Gj7DAxEXNz3"  # 클라우드 TB mobile-cctv-site-001
DEVICE_ID    = "5631c920-370a-11f1-a479-f7cb8b0c250b"
TENANT_EMAIL = "tenant@thingsboard.org"
TENANT_PW    = "tenant"

PASS_COUNT = 0
FAIL_COUNT = 0

def check(label, ok, detail=""):
    global PASS_COUNT, FAIL_COUNT
    if ok:
        print(f"  ✅ {label}")
        PASS_COUNT += 1
    else:
        print(f"  ❌ {label} — {detail}")
        FAIL_COUNT += 1

def http_get(url, token):
    req = urllib.request.Request(url, headers={"X-Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def http_post(url, data, token=None, method="POST"):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}

# ── 메인 ──────────────────────────────────────────────────────────
print("==========================================")
print(" TB-4 알람 규칙 생성 및 트리거 검증")
print(f" 실행시각: {time.strftime('%Y-%m-%d %H:%M:%S KST')}")
print("==========================================")

# 토큰 발급
status, resp = http_post(f"{TB_URL}/api/auth/login",
                         {"username": TENANT_EMAIL, "password": TENANT_PW})
TOKEN = resp.get("token", "")
if not TOKEN:
    print("  ❌ 토큰 발급 실패 — 중단")
    sys.exit(1)

# ── 1. 디바이스 프로파일 조회 ─────────────────────────────────────
print("\n[1] 디바이스 프로파일 조회")
profiles = http_get(f"{TB_URL}/api/deviceProfiles?pageSize=20&page=0", TOKEN)
profile_id = None
for p in profiles.get("data", []):
    if p.get("name") == "mobile-cctv":
        profile_id = p["id"]["id"]
        break

if not profile_id:
    # 기본 프로파일 사용 (default)
    for p in profiles.get("data", []):
        if p.get("default"):
            profile_id = p["id"]["id"]
            profile_name = p["name"]
            break
    check(f"프로파일 조회 (기본 사용: {profile_name})", profile_id is not None, "프로파일 없음")
else:
    check("mobile-cctv 프로파일 조회", True)

# ── 2. 알람 규칙이 있는 프로파일 설정 ────────────────────────────
print("\n[2] 알람 규칙 설정 (CPU 과부하 / 디스크 초과)")
profile_detail = http_get(f"{TB_URL}/api/deviceProfile/{profile_id}", TOKEN)

alarm_rules = [
    {
        "id":             "cpu_overload_alarm",
        "alarmType":      "CPU 과부하",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [
                        {
                            "key":       {"type": "TIME_SERIES", "key": "cpu_usage"},
                            "valueType": "NUMERIC",
                            "predicate": {
                                "type":      "NUMERIC",
                                "operation": "GREATER",
                                "value":     {"defaultValue": 90.0, "dynamicValue": None}
                            }
                        }
                    ],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId":  None,
                "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False,
        "propagateToOwner": False,
        "propagateToTenant": False,
        "propagateRelationTypes": None
    },
    {
        "id":             "disk_overload_alarm",
        "alarmType":      "디스크 초과",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [
                        {
                            "key":       {"type": "TIME_SERIES", "key": "disk_used_gb"},
                            "valueType": "NUMERIC",
                            "predicate": {
                                "type":      "NUMERIC",
                                "operation": "GREATER",
                                "value":     {"defaultValue": 180.0, "dynamicValue": None}
                            }
                        }
                    ],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId":  None,
                "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False,
        "propagateToOwner": False,
        "propagateToTenant": False,
        "propagateRelationTypes": None
    }
]

profile_detail["profileData"]["alarms"] = alarm_rules
status, _ = http_post(f"{TB_URL}/api/deviceProfile", profile_detail, TOKEN, method="POST")
check("알람 규칙 저장 (CPU / 디스크)", status == 200, f"HTTP {status}")

# ── 3. 기기를 해당 프로파일에 연결 ───────────────────────────────
print("\n[3] 기기 프로파일 연결 확인")
device_detail = http_get(f"{TB_URL}/api/device/{DEVICE_ID}", TOKEN)
current_profile = device_detail.get("deviceProfileId", {}).get("id", "")
if current_profile == profile_id:
    check("기기가 알람 규칙 프로파일에 연결됨", True)
else:
    # 기기 프로파일 업데이트
    device_detail["deviceProfileId"] = {"id": profile_id, "entityType": "DEVICE_PROFILE"}
    status, _ = http_post(f"{TB_URL}/api/device", device_detail, TOKEN, method="POST")
    check("기기 프로파일 연결 업데이트", status == 200, f"HTTP {status}")

# ── 4. 임계값 초과 텔레메트리 MQTT 전송 ──────────────────────────
print("\n[4] 임계값 초과 텔레메트리 MQTT 전송")
try:
    import paho.mqtt.client as mqtt

    connected = {"ok": False}

    def on_connect(c, u, f, rc):
        connected["ok"] = (rc == 0)

    c = mqtt.Client()
    c.username_pw_set(MQTT_TOKEN)
    c.on_connect = on_connect
    c.connect(MQTT_HOST, MQTT_PORT, 10)
    c.loop_start()
    time.sleep(1.5)

    over_telemetry = {"cpu_usage": 95.0, "disk_used_gb": 185.0}
    info = c.publish("v1/devices/me/telemetry", json.dumps(over_telemetry), qos=1)
    info.wait_for_publish(timeout=5)
    check("임계값 초과 데이터 전송 (cpu=95, disk=185)", info.rc == 0, f"rc={info.rc}")

    c.loop_stop()
    c.disconnect()
    time.sleep(3)  # 알람 처리 대기

except Exception as e:
    check("MQTT 전송", False, str(e))

# ── 5. 알람 생성 확인 ─────────────────────────────────────────────
print("\n[5] 알람 생성 확인")
try:
    alarms = http_get(
        f"{TB_URL}/api/alarm/DEVICE/{DEVICE_ID}?pageSize=10&page=0&fetchOriginator=false",
        TOKEN
    )
    alarm_list = alarms.get("data", [])
    alarm_types = [a.get("type", "") for a in alarm_list]

    check("CPU 과부하 알람 생성", "CPU 과부하" in alarm_types,
          f"생성된 알람: {alarm_types}")
    check("디스크 초과 알람 생성", "디스크 초과" in alarm_types,
          f"생성된 알람: {alarm_types}")

    # 알람 ID 수집
    alarm_ids = [a["id"]["id"] for a in alarm_list
                 if a.get("type") in ("CPU 과부하", "디스크 초과")]

except Exception as e:
    check("알람 조회", False, str(e))
    alarm_ids = []

# ── 6. 알람 정리 (acknowledge) ────────────────────────────────────
print("\n[6] 알람 acknowledge (확인 처리)")
acked = 0
for aid in alarm_ids:
    # Thingsboard 4.x: /api/alarm/{id}/ack (POST)
    # 200 = 새로 ack, 400 "already acknowledged" = 이미 ack됨 (둘 다 성공)
    status, resp = http_post(f"{TB_URL}/api/alarm/{aid}/ack", {}, TOKEN)
    if status == 200 or (status == 400 and "already acknowledged" in resp.get("message", "")):
        acked += 1
check(f"알람 {acked}/{len(alarm_ids)}개 ack 처리 (이미 ack 포함)", acked == len(alarm_ids),
      f"{len(alarm_ids) - acked}개 실패")

# 정상 텔레메트리 재전송 (clear 트리거 — clearRule 없으면 수동 처리)
try:
    import paho.mqtt.client as mqtt
    c2 = mqtt.Client()
    c2.username_pw_set(MQTT_TOKEN)
    c2.connect(MQTT_HOST, MQTT_PORT, 10)
    c2.loop_start()
    time.sleep(1)
    c2.publish("v1/devices/me/telemetry",
               json.dumps({"cpu_usage": 23.5, "disk_used_gb": 42.1}), qos=1)
    time.sleep(1)
    c2.loop_stop()
    c2.disconnect()
    print("  ℹ️  정상 텔레메트리 재전송 완료 (수동 clear 필요 시 UI에서 처리)")
except Exception:
    pass

# ── 결과 ──────────────────────────────────────────────────────────
print("")
print("==========================================")
print(f" 결과: PASS {PASS_COUNT} / FAIL {FAIL_COUNT}")
if FAIL_COUNT == 0:
    print(" ✅ 모든 검증 통과 — 알람 규칙 정상 동작")
else:
    print(" ❌ 일부 검증 실패")
print(f" 알람 확인: http://localhost:8080 → 기기 → Alarms 탭")
print("==========================================")
