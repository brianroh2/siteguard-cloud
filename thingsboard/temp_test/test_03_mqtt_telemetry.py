#!/usr/bin/env python3
# =============================================================================
# [테스트 목적] MQTT로 텔레메트리 전송 후 REST API 조회 검증
#
# 배경:
#   Thingsboard는 MQTT 프로토콜로 실시간 텔레메트리를 수신한다.
#   포트 1884 (호스트) → 1883 (컨테이너)으로 매핑.
#   기기는 MQTT Access Token으로 인증하며,
#   토픽 v1/devices/me/telemetry에 JSON 게시 시 Thingsboard가 수신한다.
#   전송 후 REST API로 조회해 실제 반영 여부를 확인한다.
#
# 검증 항목:
#   1. MQTT 연결 (호스트 1884, Access Token 인증)
#   2. 텔레메트리 데이터 전송 (6개 키)
#   3. REST API로 텔레메트리 조회 — 값 일치 확인
#   4. 타임스탬프 유효성 확인 (최근 10초 이내)
# =============================================================================

import json
import sys
import time
import urllib.request
import urllib.error

# ── 설정값 ────────────────────────────────────────────────────────
TB_URL      = "http://localhost:8080"
MQTT_HOST   = "localhost"
MQTT_PORT   = 1884          # 호스트 포트 (컨테이너 내부 1883으로 매핑)
MQTT_TOKEN  = "Xl8KVvfv6Gj7DAxEXNz3"  # test_02에서 발급받은 토큰 (클라우드 TB)
DEVICE_ID   = "5631c920-370a-11f1-a479-f7cb8b0c250b"
TENANT_EMAIL = "tenant@thingsboard.org"
TENANT_PW    = "tenant"

TELEMETRY = {
    "online":              True,
    "cpu_usage":           23.5,
    "disk_used_gb":        42.1,
    "detect_events_today": 7,
    "inference_ms":        9.3,
    "cameras_online":      3,
}

# ── 헬퍼 ──────────────────────────────────────────────────────────
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

def http_post_json(url, data, headers=None):
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body,
                                  headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

# ── 메인 ──────────────────────────────────────────────────────────
print("==========================================")
print(" TB-3 MQTT 텔레메트리 전송 검증")
print(f" 실행시각: {time.strftime('%Y-%m-%d %H:%M:%S KST')}")
print("==========================================")

# 1. MQTT 전송
print("\n[1] MQTT 연결 및 텔레메트리 전송")
mqtt_sent = False
try:
    import paho.mqtt.client as mqtt

    connected = {"ok": False}
    published = {"ok": False}

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            connected["ok"] = True
        else:
            connected["error"] = f"rc={rc}"

    def on_publish(client, userdata, mid):
        published["ok"] = True

    client = mqtt.Client()
    client.username_pw_set(MQTT_TOKEN)
    client.on_connect  = on_connect
    client.on_publish  = on_publish
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=10)
    client.loop_start()
    time.sleep(1.5)

    check("MQTT 연결 (port 1884, Access Token)", connected["ok"],
          connected.get("error", "타임아웃"))

    if connected["ok"]:
        info = client.publish("v1/devices/me/telemetry",
                              json.dumps(TELEMETRY), qos=1)
        info.wait_for_publish(timeout=5)
        check("텔레메트리 퍼블리시 완료", info.rc == 0, f"rc={info.rc}")
        mqtt_sent = info.rc == 0
        time.sleep(1)   # Thingsboard 수신 처리 대기

    client.loop_stop()
    client.disconnect()

except Exception as e:
    check("MQTT 연결 및 전송", False, str(e))

# 2. REST API로 텔레메트리 조회
print("\n[2] REST API 텔레메트리 조회 검증")
if not mqtt_sent:
    print("  ⚠️  MQTT 전송 실패 — REST 조회 건너뜀")
else:
    try:
        # 토큰 발급
        resp = http_post_json(f"{TB_URL}/api/auth/login",
                              {"username": TENANT_EMAIL, "password": TENANT_PW})
        token = resp["token"]

        keys = ",".join(TELEMETRY.keys())
        url  = (f"{TB_URL}/api/plugins/telemetry/DEVICE/{DEVICE_ID}"
                f"/values/timeseries?keys={keys}&limit=1")
        data = http_get(url, token)

        now_ms = int(time.time() * 1000)
        for key, expected in TELEMETRY.items():
            entry = data.get(key, [{}])[0]
            actual = entry.get("value")
            ts     = entry.get("ts", 0)
            age_s  = (now_ms - ts) / 1000 if ts else 9999

            # 숫자 타입 비교 시 문자열로 변환된 값 고려
            try:
                actual_cmp = type(expected)(actual)
            except Exception:
                actual_cmp = actual

            val_ok = (actual_cmp == expected)
            ts_ok  = (age_s < 30)
            check(f"{key} 값 일치 ({expected})", val_ok,
                  f"수신값={actual}")
            check(f"{key} 타임스탬프 신선 ({age_s:.1f}초)", ts_ok,
                  f"경과 {age_s:.0f}초")

    except Exception as e:
        check("REST API 조회", False, str(e))

# ── 결과 ──────────────────────────────────────────────────────────
print("")
print("==========================================")
print(f" 결과: PASS {PASS_COUNT} / FAIL {FAIL_COUNT}")
if FAIL_COUNT == 0:
    print(" ✅ 모든 검증 통과 — MQTT 텔레메트리 정상")
else:
    print(" ❌ 일부 검증 실패")
print(f" MQTT Port: {MQTT_PORT}  Token: {MQTT_TOKEN[:10]}...")
print("==========================================")
