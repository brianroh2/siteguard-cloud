#!/usr/bin/env python3
# =============================================================================
# [테스트 목적] 3종 Device Profile 생성 및 가상 기기 등록·검증
#
# 배경:
#   실제 배포 시나리오 3종에 대응하는 Device Profile을 미리 정의하고,
#   각 타입별 가상 기기 1대씩 등록하여 속성·텔레메트리·알람 구조를 검증한다.
#
#   Scenario 1: 셋탑 + USB 카메라 1대 직결 (IP 카메라 없음)
#   Scenario 2: 셋탑 + IP 카메라 N대 (공유기 경유)
#   Scenario 3: 소형 관제 PC (Frigate + 로컬 TB) + IP 카메라 4대
#
# Device Profile 3종:
#   settop           → virtual_settop1  (Scenario 1/2, USB 카메라 최대 1대)
#   ip-camera        → virtual_cctv1   (Scenario 2/3, 독립 네트워크 카메라)
#   edge-controller  → virtual_edge1   (Scenario 3, 로컬 관제 PC)
#
# 검증 항목:
#   1. Device Profile 3종 생성 (알람 규칙 포함)
#   2. 가상 기기 3대 생성 + 각 Profile 연결
#   3. 서버/공유 속성 설정
#   4. MQTT 텔레메트리 시뮬레이션
#   5. 기기별 텔레메트리 REST API 조회 검증
#   6. settop 알람 (USB 카메라 연결 끊김) 트리거 확인
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

def mqtt_publish(token, payload):
    """MQTT로 텔레메트리 전송"""
    try:
        import paho.mqtt.client as mqtt
        connected = {"ok": False}
        def on_connect(c, u, f, rc):
            connected["ok"] = (rc == 0)
        c = mqtt.Client()
        c.username_pw_set(token)
        c.on_connect = on_connect
        c.connect(MQTT_HOST, MQTT_PORT, 10)
        c.loop_start()
        time.sleep(1.2)
        if connected["ok"]:
            info = c.publish("v1/devices/me/telemetry", json.dumps(payload), qos=1)
            info.wait_for_publish(timeout=5)
            time.sleep(0.8)
        c.loop_stop()
        c.disconnect()
        return connected["ok"]
    except Exception as e:
        print(f"     MQTT 오류: {e}")
        return False

def get_or_create_profile(token, name, alarm_rules):
    """프로파일 조회 후 없으면 생성, profile_id 반환"""
    profiles = http_get(f"{TB_URL}/api/deviceProfiles?pageSize=50&page=0", token)
    for p in profiles.get("data", []):
        if p.get("name") == name:
            return p["id"]["id"], False  # 기존 프로파일

    body = {
        "name": name,
        "type": "DEFAULT",
        "transportType": "MQTT",
        "provisionType": "DISABLED",
        "profileData": {
            "configuration":      {"type": "DEFAULT"},
            "transportConfiguration": {"type": "MQTT", "deviceTelemetryTopic": "v1/devices/me/telemetry"},
            "provisionConfiguration": {"type": "DISABLED"},
            "alarms": alarm_rules
        }
    }
    status, resp = http_post(f"{TB_URL}/api/deviceProfile", body, token)
    if status == 200:
        return resp["id"]["id"], True
    return None, False

def get_or_create_device(token, name, profile_id):
    """기기 조회 후 없으면 생성, device_id 반환"""
    try:
        existing = http_get(f"{TB_URL}/api/tenant/devices?deviceName={name}", token)
    except urllib.error.HTTPError as e:
        existing = {}  # 404: 기기 없음

    if existing.get("id", {}).get("id"):
        dev_id = existing["id"]["id"]
        if existing.get("deviceProfileId", {}).get("id") != profile_id:
            existing["deviceProfileId"] = {"id": profile_id, "entityType": "DEVICE_PROFILE"}
            http_post(f"{TB_URL}/api/device", existing, token)
        return dev_id, False

    body = {
        "name": name,
        "deviceProfileId": {"id": profile_id, "entityType": "DEVICE_PROFILE"}
    }
    status, resp = http_post(f"{TB_URL}/api/device", body, token)
    if status == 200:
        return resp["id"]["id"], True
    return None, False

def set_attributes(token, device_id, scope, attrs):
    status, _ = http_post(
        f"{TB_URL}/api/plugins/telemetry/DEVICE/{device_id}/{scope}",
        attrs, token
    )
    return status == 200

def get_mqtt_token(token, device_id):
    creds = http_get(f"{TB_URL}/api/device/{device_id}/credentials", token)
    return creds.get("credentialsId", "")

# ════════════════════════════════════════════════════════════════
# 알람 규칙 정의
# ════════════════════════════════════════════════════════════════

ALARM_SETTOP = [
    {
        "id": "settop_camera_lost",
        "alarmType": "USB 카메라 연결 끊김",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [{
                        "key":       {"type": "TIME_SERIES", "key": "cameras_online"},
                        "valueType": "NUMERIC",
                        "predicate": {
                            "type":      "NUMERIC",
                            "operation": "LESS",
                            "value":     {"defaultValue": 1.0, "dynamicValue": None}
                        }
                    }],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId": None, "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False, "propagateToOwner": False,
        "propagateToTenant": False, "propagateRelationTypes": None
    },
    {
        "id": "settop_cpu_overload",
        "alarmType": "CPU 과부하",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [{
                        "key":       {"type": "TIME_SERIES", "key": "cpu_usage"},
                        "valueType": "NUMERIC",
                        "predicate": {
                            "type":      "NUMERIC",
                            "operation": "GREATER",
                            "value":     {"defaultValue": 90.0, "dynamicValue": None}
                        }
                    }],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId": None, "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False, "propagateToOwner": False,
        "propagateToTenant": False, "propagateRelationTypes": None
    },
    {
        "id": "settop_disk_full",
        "alarmType": "디스크 초과",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [{
                        "key":       {"type": "TIME_SERIES", "key": "disk_used_gb"},
                        "valueType": "NUMERIC",
                        "predicate": {
                            "type":      "NUMERIC",
                            "operation": "GREATER",
                            "value":     {"defaultValue": 180.0, "dynamicValue": None}
                        }
                    }],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId": None, "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False, "propagateToOwner": False,
        "propagateToTenant": False, "propagateRelationTypes": None
    }
]

ALARM_IPCAM = [
    {
        "id": "ipcam_stream_down",
        "alarmType": "스트림 끊김",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [{
                        "key":       {"type": "TIME_SERIES", "key": "stream_active"},
                        "valueType": "BOOLEAN",
                        "predicate": {
                            "type":      "BOOLEAN",
                            "operation": "EQUAL",
                            "value":     {"defaultValue": False, "dynamicValue": None}
                        }
                    }],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId": None, "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False, "propagateToOwner": False,
        "propagateToTenant": False, "propagateRelationTypes": None
    }
]

ALARM_EDGE = [
    {
        "id": "edge_service_down",
        "alarmType": "관제 서비스 다운",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [{
                        "key":       {"type": "TIME_SERIES", "key": "frigate_status"},
                        "valueType": "BOOLEAN",
                        "predicate": {
                            "type":      "BOOLEAN",
                            "operation": "EQUAL",
                            "value":     {"defaultValue": False, "dynamicValue": None}
                        }
                    }],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId": None, "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False, "propagateToOwner": False,
        "propagateToTenant": False, "propagateRelationTypes": None
    },
    {
        "id": "edge_disk_full",
        "alarmType": "로컬 스토리지 초과",
        "createRules": {
            "CRITICAL": {
                "schedule": None,
                "condition": {
                    "condition": [{
                        "key":       {"type": "TIME_SERIES", "key": "local_storage_gb"},
                        "valueType": "NUMERIC",
                        "predicate": {
                            "type":      "NUMERIC",
                            "operation": "GREATER",
                            "value":     {"defaultValue": 400.0, "dynamicValue": None}
                        }
                    }],
                    "spec": {"type": "SIMPLE"}
                },
                "dashboardId": None, "alarmDetails": None
            }
        },
        "clearRule": None,
        "propagate": False, "propagateToOwner": False,
        "propagateToTenant": False, "propagateRelationTypes": None
    }
]

# ════════════════════════════════════════════════════════════════
# 기기별 속성·텔레메트리 정의
# ════════════════════════════════════════════════════════════════

DEVICES = {
    "virtual_settop1": {
        "profile":  "settop",
        "alarms":   ALARM_SETTOP,
        "server_attrs": {
            "site_name":            "현장A 입구",
            "network_type":         "LTE",
            "usb_camera_max":       1,       # USB 카메라 최대 1대 제한
            "network_camera_count": 0,       # Scenario 1: IP 카메라 없음
            "model":                "MiniPC-N100",
        },
        "shared_attrs": {
            "detect_start_hour":  8,
            "detect_end_hour":    19,
            "storage_limit_gb":   180,
        },
        "telemetry_normal": {
            "online":              True,
            "cpu_usage":           31.2,
            "ram_usage_pct":       48.5,
            "disk_used_gb":        55.3,
            "cameras_online":      1,        # USB 카메라 1대 정상
            "inference_ms":        12.4,
            "detect_events_today": 3,
        },
        "telemetry_alarm": {
            "cameras_online": 0,             # USB 카메라 연결 끊김 → 알람
        },
        "expected_alarm": "USB 카메라 연결 끊김",
    },
    "virtual_cctv1": {
        "profile":  "ip-camera",
        "alarms":   ALARM_IPCAM,
        "server_attrs": {
            "site_name":    "현장A 입구 — 카메라1",
            "resolution":   "1920x1080",
            "rtsp_url":     "rtsp://192.168.1.101:554/stream1",
            "storage_type": "sd-card",       # SD 카드 자체 저장
            "model":        "Hikvision DS-2CD2143G2",
        },
        "shared_attrs": {
            "recording_enabled":  True,
            "detection_enabled":  False,     # 감지는 셋탑/edge에서 처리
        },
        "telemetry_normal": {
            "online":          True,
            "stream_active":   True,
            "fps":             25.0,
            "recording_active": True,
        },
        "telemetry_alarm": {
            "stream_active": False,          # 스트림 끊김 → 알람
        },
        "expected_alarm": "스트림 끊김",
    },
    "virtual_edge1": {
        "profile":  "edge-controller",
        "alarms":   ALARM_EDGE,
        "server_attrs": {
            "site_name":        "현장B 종합관제",
            "managed_cameras":  4,
            "frigate_version":  "0.17.1",
            "local_tb_version": "4.2.1",
            "model":            "MiniPC-i5-1235U",
        },
        "shared_attrs": {
            "heartbeat_interval_sec": 30,
            "storage_limit_gb":       400,
            "report_to_central":      True,  # 중앙 TB에 상태만 보고
        },
        "telemetry_normal": {
            "online":            True,
            "cpu_usage":         44.7,
            "ram_usage_pct":     62.1,
            "disk_used_gb":      210.5,
            "cameras_online":    4,
            "frigate_status":    True,
            "local_tb_status":   True,
            "event_count_today": 11,
            "local_storage_gb":  210.5,
        },
        "telemetry_alarm": {
            "frigate_status": False,         # Frigate 다운 → 알람
        },
        "expected_alarm": "관제 서비스 다운",
    }
}

# ════════════════════════════════════════════════════════════════
# 메인
# ════════════════════════════════════════════════════════════════
print("==========================================")
print(" TB-5 가상 기기 3종 등록 및 검증")
print(f" 실행시각: {time.strftime('%Y-%m-%d %H:%M:%S KST')}")
print("==========================================")

# 토큰
_, resp = http_post(f"{TB_URL}/api/auth/login",
                    {"username": TENANT_EMAIL, "password": TENANT_PW})
TOKEN = resp.get("token", "")
if not TOKEN:
    print("  ❌ 토큰 발급 실패"); sys.exit(1)

profile_ids  = {}  # name → id
device_ids   = {}  # device_name → id
mqtt_tokens  = {}  # device_name → mqtt_token

# ── 1. Device Profile 생성 ────────────────────────────────────
print("\n[1] Device Profile 3종 생성")
profile_map = {
    "settop":           ALARM_SETTOP,
    "ip-camera":        ALARM_IPCAM,
    "edge-controller":  ALARM_EDGE,
}
for pname, alarms in profile_map.items():
    pid, created = get_or_create_profile(TOKEN, pname, alarms)
    if pid:
        profile_ids[pname] = pid
        label = "신규 생성" if created else "기존 재사용"
        check(f"Profile [{pname}] ({label})", True)
    else:
        check(f"Profile [{pname}]", False, "생성 실패")

# ── 2. 가상 기기 생성 + Profile 연결 ─────────────────────────
print("\n[2] 가상 기기 3대 생성")
for dname, cfg in DEVICES.items():
    pid = profile_ids.get(cfg["profile"])
    if not pid:
        check(f"{dname} 생성", False, f"Profile 없음: {cfg['profile']}")
        continue
    did, created = get_or_create_device(TOKEN, dname, pid)
    if did:
        device_ids[dname] = did
        label = "신규 생성" if created else "기존 재사용"
        check(f"{dname} [{cfg['profile']}] ({label})", True)
    else:
        check(f"{dname} 생성", False, "API 실패")

# ── 3. 속성 설정 ──────────────────────────────────────────────
print("\n[3] 서버/공유 속성 설정")
for dname, cfg in DEVICES.items():
    did = device_ids.get(dname)
    if not did:
        continue
    ok1 = set_attributes(TOKEN, did, "SERVER_SCOPE", cfg["server_attrs"])
    ok2 = set_attributes(TOKEN, did, "SHARED_SCOPE", cfg["shared_attrs"])
    check(f"{dname} 서버 속성", ok1)
    check(f"{dname} 공유 속성", ok2)
    mqtt_tokens[dname] = get_mqtt_token(TOKEN, did)

# ── 4. 정상 텔레메트리 MQTT 전송 ─────────────────────────────
print("\n[4] 정상 텔레메트리 MQTT 전송")
for dname, cfg in DEVICES.items():
    tok = mqtt_tokens.get(dname)
    if not tok:
        check(f"{dname} MQTT 토큰 없음", False); continue
    ok = mqtt_publish(tok, cfg["telemetry_normal"])
    check(f"{dname} 정상 텔레메트리 전송", ok)

# ── 5. 텔레메트리 REST 조회 검증 ──────────────────────────────
print("\n[5] 텔레메트리 REST 조회 검증")
time.sleep(1)
for dname, cfg in DEVICES.items():
    did = device_ids.get(dname)
    if not did: continue
    keys = ",".join(cfg["telemetry_normal"].keys())
    data = http_get(
        f"{TB_URL}/api/plugins/telemetry/DEVICE/{did}/values/timeseries?keys={keys}&limit=1",
        TOKEN
    )
    for key, expected in cfg["telemetry_normal"].items():
        entry  = data.get(key, [{}])[0]
        actual = entry.get("value")
        try:
            actual_cmp = type(expected)(actual)
        except Exception:
            actual_cmp = actual
        check(f"{dname}.{key} = {expected}", actual_cmp == expected,
              f"수신값={actual}")

# ── 6. 알람 트리거 검증 ───────────────────────────────────────
print("\n[6] 이상 텔레메트리 전송 → 알람 트리거 검증")
for dname, cfg in DEVICES.items():
    tok = mqtt_tokens.get(dname)
    if not tok: continue
    mqtt_publish(tok, cfg["telemetry_alarm"])
    print(f"     {dname}: {cfg['telemetry_alarm']} 전송 완료")

time.sleep(4)  # 알람 처리 대기

for dname, cfg in DEVICES.items():
    did = device_ids.get(dname)
    if not did: continue
    alarms = http_get(
        f"{TB_URL}/api/alarm/DEVICE/{did}?pageSize=10&page=0&fetchOriginator=false",
        TOKEN
    )
    types = [a.get("type","") for a in alarms.get("data", [])]
    check(f"{dname} 알람 [{cfg['expected_alarm']}] 생성",
          cfg["expected_alarm"] in types,
          f"생성된 알람: {types}")

# 정상 복구 텔레메트리 재전송
print("\n     정상 텔레메트리 복구 전송...")
for dname, cfg in DEVICES.items():
    tok = mqtt_tokens.get(dname)
    if tok:
        mqtt_publish(tok, cfg["telemetry_normal"])

# ── 결과 ──────────────────────────────────────────────────────
print("")
print("==========================================")
print(f" 결과: PASS {PASS_COUNT} / FAIL {FAIL_COUNT}")
if FAIL_COUNT == 0:
    print(" ✅ 모든 검증 통과 — 가상 기기 3종 정상")
else:
    print(" ❌ 일부 검증 실패")
print("")
print(" 등록된 기기 및 MQTT 토큰:")
for dname in DEVICES:
    did = device_ids.get(dname, "N/A")
    tok = mqtt_tokens.get(dname, "N/A")
    print(f"   {dname:<22} {tok}")
print(" UI: http://localhost:8080 → Devices")
print("==========================================")
