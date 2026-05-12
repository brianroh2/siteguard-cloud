#!/usr/bin/env python3
# CCTV 상태 모니터 — TCP 포트 체크 후 Thingsboard MQTT 전송
# 실행: python cctv_status_monitor.py
# 주기: 60초마다 cctv-1, cctv-3 온라인 여부 확인 후 TB로 전송

import socket
import time
import json
import paho.mqtt.client as mqtt

TB_HOST = "localhost"
TB_MQTT_PORT = 1884

DDNS = "0004312.m2mnet.kr"

CAMERAS = [
    {
        "name": "cctv-1",
        "label": "CCTV-1 TVT Dome",
        "host": DDNS,
        "port": 554,
        "token": None,  # device_tokens.json 에서 로드
    },
    {
        "name": "cctv-3",
        "label": "CCTV-3 VHT Dome F977",
        "host": DDNS,
        "port": 555,
        "token": None,
    },
]

INTERVAL = 60  # 초


def load_tokens():
    tokens_path = "/root/projects/siteguard-infra/temp/device_tokens.json"
    with open(tokens_path) as f:
        return json.load(f)


def check_tcp(host, port, timeout=5):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def publish_status(token, telemetry: dict):
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(token)
    client.connect(TB_HOST, TB_MQTT_PORT, keepalive=10)
    client.loop_start()
    payload = json.dumps(telemetry)
    result = client.publish("v1/devices/me/telemetry", payload)
    result.wait_for_publish(timeout=5)
    client.loop_stop()
    client.disconnect()


def run():
    print("CCTV 상태 모니터 시작")
    tokens = load_tokens()
    for cam in CAMERAS:
        cam["token"] = tokens.get(cam["name"])
        if not cam["token"]:
            print(f"  [WARN] 토큰 없음: {cam['name']}")

    while True:
        ts = time.strftime("%H:%M:%S")
        for cam in CAMERAS:
            if not cam["token"]:
                continue
            online = check_tcp(cam["host"], cam["port"])
            status = "online" if online else "offline"
            telemetry = {
                "status": status,
                "camera_name": cam["label"],
                "rtsp_port": cam["port"],
            }
            try:
                publish_status(cam["token"], telemetry)
                icon = "✅" if online else "❌"
                print(f"[{ts}] {icon} {cam['name']}: {status}")
            except Exception as e:
                print(f"[{ts}] [ERR] {cam['name']}: {e}")

        time.sleep(INTERVAL)


if __name__ == "__main__":
    run()
