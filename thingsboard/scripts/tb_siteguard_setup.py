#!/usr/bin/env python3
# SiteGuard Thingsboard 초기 설정
# 목적: CCTV 기기 생성 + 현장 관제 대시보드 생성

import requests
import json
import uuid

TB_URL = "http://localhost:8080"
TENANT_USER = "tenant@thingsboard.org"
TENANT_PASS = "tenant"
GO2RTC_EXT = "http://46.62.155.122:1984"  # 브라우저가 직접 접근할 go2rtc 주소

CAMERAS = [
    {
        "name": "cctv-1",
        "label": "CCTV-1 TVT Dome",
        "stream": "cctv_1",
        "location": "LTE 라우터 직접 연결 (192.168.1.51)",
        "model": "TVT TD-9421S4C",
    },
    {
        "name": "cctv-3",
        "label": "CCTV-3 VHT Dome F977",
        "stream": "cctv_3",
        "location": "POE 스위치 연결 (192.168.1.53)",
        "model": "Vision Hitech TBT-Dome F977",
    },
]


# ── Thingsboard API 헬퍼 ──────────────────────────────────────────

def login():
    r = requests.post(f"{TB_URL}/api/auth/login",
                      json={"username": TENANT_USER, "password": TENANT_PASS})
    r.raise_for_status()
    return r.json()["token"]


def h(token):
    return {"X-Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def get_profile_id(token, name):
    r = requests.get(f"{TB_URL}/api/deviceProfiles?pageSize=50&page=0", headers=h(token))
    r.raise_for_status()
    for p in r.json().get("data", []):
        if p["name"] == name:
            return p["id"]["id"]
    return None


def get_existing_device(token, name):
    r = requests.get(f"{TB_URL}/api/tenant/devices?pageSize=100&page=0", headers=h(token))
    r.raise_for_status()
    for dev in r.json().get("data", []):
        if dev["name"] == name:
            return dev["id"]["id"]
    return None


def create_device(token, name, label, profile_name="ip-camera"):
    existing = get_existing_device(token, name)
    if existing:
        print(f"  [SKIP] 기기 이미 존재: {name}")
        return existing

    profile_id = get_profile_id(token, profile_name)
    payload = {"name": name, "label": label}
    if profile_id:
        payload["deviceProfileId"] = {"id": profile_id, "entityType": "DEVICE_PROFILE"}

    r = requests.post(f"{TB_URL}/api/device", headers=h(token), json=payload)
    r.raise_for_status()
    dev_id = r.json()["id"]["id"]
    print(f"  [OK] 기기 생성: {name} ({dev_id})")
    return dev_id


def get_device_token(token, device_id):
    r = requests.get(f"{TB_URL}/api/device/{device_id}/credentials", headers=h(token))
    r.raise_for_status()
    return r.json().get("credentialsId", "")


# ── 대시보드 JSON 생성 ────────────────────────────────────────────

def make_html_widget(widget_id, title, html, row, col, size_x=12, size_y=8):
    return {
        "id": widget_id,
        "widget": {
            "typeFullFqn": "cards.html_card",
            "type": "latest",
            "title": title,
            "config": {
                "datasources": [],
                "settings": {
                    "htmlTemplate": html,
                },
                "title": title,
                "showTitle": True,
                "dropShadow": True,
                "enableFullscreen": True,
                "titleStyle": {"fontSize": "16px", "fontWeight": 400},
                "widgetStyle": {},
                "actions": {},
            },
        },
        "row": row,
        "col": col,
        "sizeX": size_x,
        "sizeY": size_y,
    }


def make_simple_card_widget(widget_id, title, alias_id, key, row, col, size_x=12, size_y=3):
    return {
        "id": widget_id,
        "widget": {
            "typeFullFqn": "cards.simple_card",
            "type": "latest",
            "title": title,
            "config": {
                "datasources": [
                    {
                        "type": "entity",
                        "name": "",
                        "entityAliasId": alias_id,
                        "filterId": None,
                        "dataKeys": [
                            {
                                "name": key,
                                "type": "timeseries",
                                "label": "상태",
                                "color": "#2196F3",
                                "settings": {},
                            }
                        ],
                    }
                ],
                "settings": {"labelText": title},
                "title": title,
                "showTitle": True,
                "dropShadow": True,
                "enableFullscreen": False,
                "widgetStyle": {},
                "actions": {},
            },
        },
        "row": row,
        "col": col,
        "sizeX": size_x,
        "sizeY": size_y,
    }


def build_dashboard(cameras_info):
    """cameras_info: list of {name, label, stream, alias_id}"""
    widgets_def = {}
    layout_widgets = {}
    aliases = {}

    for i, cam in enumerate(cameras_info):
        alias_id = str(uuid.uuid4())
        aliases[alias_id] = {
            "id": alias_id,
            "alias": cam["name"],
            "filter": {
                "type": "entityName",
                "resolveMultiple": False,
                "entityNameFilter": cam["name"],
            },
        }
        cam["alias_id"] = alias_id

        col = i * 12  # 0 or 12

        # 영상 위젯
        video_id = str(uuid.uuid4())
        stream_url = f"{GO2RTC_EXT}/stream.html?src={cam['stream']}&mode=webrtc"
        html = (
            f'<div style="width:100%;height:100%;overflow:hidden;">'
            f'<iframe src="{stream_url}" '
            f'style="width:100%;height:100%;border:none;" '
            f'allowfullscreen allow="autoplay"></iframe>'
            f'</div>'
        )
        video_w = make_html_widget(video_id, f"{cam['label']} 라이브", html, row=0, col=col)
        widgets_def[video_id] = video_w["widget"]
        layout_widgets[video_id] = {
            "sizeX": video_w["sizeX"], "sizeY": video_w["sizeY"],
            "row": video_w["row"], "col": video_w["col"],
        }

        # 상태 위젯
        status_id = str(uuid.uuid4())
        status_w = make_simple_card_widget(
            status_id, f"{cam['label']} 상태", alias_id, "status",
            row=8, col=col
        )
        widgets_def[status_id] = status_w["widget"]
        layout_widgets[status_id] = {
            "sizeX": status_w["sizeX"], "sizeY": status_w["sizeY"],
            "row": status_w["row"], "col": status_w["col"],
        }

    dashboard = {
        "title": "SiteGuard 현장 관제",
        "configuration": {
            "description": "LTE 현장 CCTV 라이브 영상 및 상태 모니터링",
            "widgets": widgets_def,
            "states": {
                "default": {
                    "name": "현장 관제",
                    "root": True,
                    "layouts": {
                        "main": {
                            "widgets": layout_widgets,
                            "gridSettings": {
                                "columns": 24,
                                "color": "#aaaaaa",
                                "backgroundSize": "100%",
                                "backgroundImageUrl": "",
                                "mobileAutoFillHeight": False,
                                "mobileRowHeight": 70,
                            },
                        }
                    },
                }
            },
            "entityAliases": aliases,
            "filters": {},
        },
    }
    return dashboard


# ── 메인 ─────────────────────────────────────────────────────────

def main():
    print("Thingsboard 로그인...")
    token = login()
    print("  [OK]")

    print("\n기기 생성...")
    device_tokens = {}
    cameras_info = []
    for cam in CAMERAS:
        dev_id = create_device(token, cam["name"], cam["label"])
        dev_token = get_device_token(token, dev_id)
        device_tokens[cam["name"]] = dev_token
        cameras_info.append({**cam, "device_id": dev_id, "mqtt_token": dev_token})
        print(f"    MQTT 토큰: {dev_token}")

    print("\n대시보드 생성...")
    dashboard_json = build_dashboard(cameras_info)
    r = requests.post(f"{TB_URL}/api/dashboard",
                      headers=h(token),
                      json=dashboard_json)
    if r.status_code == 200:
        db_id = r.json()["id"]["id"]
        print(f"  [OK] 대시보드 생성: SiteGuard 현장 관제 ({db_id})")
    else:
        print(f"  [FAIL] {r.status_code}: {r.text[:300]}")
        return

    print("\n토큰 저장...")
    tokens_path = "/root/projects/siteguard-infra/temp/device_tokens.json"
    with open(tokens_path, "w") as f:
        json.dump(device_tokens, f, indent=2, ensure_ascii=False)
    print(f"  저장 위치: {tokens_path}")

    print("\n" + "="*50)
    print("완료!")
    print(f"  대시보드: http://localhost:8080/dashboards/{db_id}")
    print(f"  기기:")
    for cam in cameras_info:
        print(f"    {cam['name']} | MQTT 토큰: {cam['mqtt_token']}")


if __name__ == "__main__":
    main()
