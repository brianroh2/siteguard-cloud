#!/usr/bin/env python3
# SiteGuard Thingsboard 전체 설정 (Phase C 개선판)
# 수행: 기기 서버속성 27개 + 카메라 목록 대시보드 + 개별 카메라 대시보드 (5섹션)

import requests
import json
import uuid
from datetime import datetime, timezone

TB_URL = "http://localhost:8080"
TENANT_USER = "tenant@thingsboard.org"
TENANT_PASS = "tenant"
GO2RTC_EXT = "http://46.62.155.122/go2rtc"

CAMERAS = [
    {
        "name": "cctv-1",
        "label": "CCTV-1 TVT Dome",
        "stream": "cctv_1",
        # 기기 식별
        "site": "개발office 현장",
        "group": "개발자",
        "customer": "dev",
        "model": "TVT TD-9421S4C",
        "cam_type": "Dome",
        "location": "LTE 라우터 직접 연결 (포트1)",
        "mac_address": "none",
        "internal_ip": "192.168.1.51",
        "connection": "0004312.m2mnet.kr:554",
        # 스트림 프로파일
        "main_rtsp_profile": "profile1",
        "sub_rtsp_profile": "profile2",
        # Frigate 감지 기본값
        "frigate_enabled": True,
        "frigate_detect_fps": 5,
        "frigate_min_score": 0.5,
        "frigate_min_area": 1000,
        "frigate_record_pre": 3,
        "frigate_record_post": 5,
        "frigate_record_days": 7,
        "frigate_notify": True,
    },
    {
        "name": "cctv-3",
        "label": "CCTV-3 VHT Dome F977",
        "stream": "cctv_3",
        # 기기 식별
        "site": "개발office 현장",
        "group": "개발자",
        "customer": "dev",
        "model": "Vision Hitech TBT-Dome F977",
        "cam_type": "Dome",
        "location": "POE 스위치 연결 (192.168.1.53)",
        "mac_address": "f97",
        "internal_ip": "192.168.1.53",
        "connection": "0004312.m2mnet.kr:555",
        # 스트림 프로파일
        "main_rtsp_profile": "Ch1",
        "sub_rtsp_profile": "Ch2",
        # Frigate 감지 기본값
        "frigate_enabled": True,
        "frigate_detect_fps": 5,
        "frigate_min_score": 0.5,
        "frigate_min_area": 1000,
        "frigate_record_pre": 3,
        "frigate_record_post": 5,
        "frigate_record_days": 7,
        "frigate_notify": True,
    },
]

# DDNS/포트 파싱 헬퍼
def _ddns(cam):
    return cam["connection"].split(":")[0]

def _port(cam):
    return cam["connection"].split(":")[1]


def login():
    r = requests.post(f"{TB_URL}/api/auth/login",
                      json={"username": TENANT_USER, "password": TENANT_PASS})
    r.raise_for_status()
    return r.json()["token"]


def h(token):
    return {"X-Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def get_device_id(token, name):
    r = requests.get(f"{TB_URL}/api/tenant/devices?pageSize=100&page=0", headers=h(token))
    r.raise_for_status()
    for dev in r.json().get("data", []):
        if dev["name"] == name:
            return dev["id"]["id"]
    return None


def get_profile_id(token, name):
    r = requests.get(f"{TB_URL}/api/deviceProfiles?pageSize=50&page=0", headers=h(token))
    r.raise_for_status()
    for p in r.json().get("data", []):
        if p["name"] == name:
            return p["id"]["id"]
    return None


def set_server_attributes(token, device_id, attrs):
    r = requests.post(
        f"{TB_URL}/api/plugins/telemetry/DEVICE/{device_id}/SERVER_SCOPE",
        headers=h(token), json=attrs,
    )
    r.raise_for_status()


def delete_dashboards_by_title(token, title):
    r = requests.get(f"{TB_URL}/api/tenant/dashboards?pageSize=100&page=0", headers=h(token))
    r.raise_for_status()
    deleted = []
    for db in r.json().get("data", []):
        if db["title"] == title:
            db_id = db["id"]["id"]
            requests.delete(f"{TB_URL}/api/dashboard/{db_id}", headers=h(token))
            deleted.append(db_id)
    return deleted


def make_widget(type_fqn, widget_type, title, settings, row, col, sx, sy,
                datasources=None, show_title=False):
    wid = str(uuid.uuid4())
    w = {
        "id": wid,
        "typeFullFqn": type_fqn,
        "type": widget_type,
        "sizeX": sx,
        "sizeY": sy,
        "row": row,
        "col": col,
        "config": {
            "datasources": datasources or [],
            "settings": settings,
            "title": title,
            "showTitle": show_title,
            "dropShadow": False,
            "enableFullscreen": False,
            "titleStyle": {"fontSize": "13px", "fontWeight": "500"},
            "widgetStyle": {"padding": "0"},
            "actions": {},
        },
    }
    return wid, w


def _grid_settings():
    return {
        "columns": 24,
        "color": "#0f1117",
        "backgroundSize": "100%",
        "backgroundImageUrl": "",
        "mobileAutoFillHeight": False,
        "mobileRowHeight": 70,
    }


def build_grid_dashboard():
    """메인 관제 그리드 — camera-grid.html iframe"""
    card_html = (
        '<iframe src="/camera-grid.html" '
        'style="width:100%;height:100%;border:none;display:block;" '
        'allowfullscreen></iframe>'
    )
    wid, w = make_widget(
        "system.cards.html_card", "latest", "SiteGuard 현장 관제",
        {"cardHtml": card_html, "cardCss": "html,body{margin:0;padding:0;overflow:hidden;}"},
        row=0, col=0, sx=24, sy=21,
    )
    return wid, {
        "title": "SiteGuard 현장 관제",
        "configuration": {
            "description": "LTE 현장 CCTV 멀티카메라 그리드 관제",
            "widgets": {wid: w},
            "states": {
                "default": {
                    "name": "현장 관제",
                    "root": True,
                    "layouts": {
                        "main": {
                            "widgets": {wid: {"sizeX": 24, "sizeY": 21, "row": 0, "col": 0}},
                            "gridSettings": _grid_settings(),
                        }
                    },
                }
            },
            "entityAliases": {},
            "filters": {},
        },
    }


def build_camera_list_dashboard():
    """카메라 목록 대시보드 — camera-list.html iframe (TB API 동적 로드)"""
    card_html = (
        '<iframe src="/camera-list.html" '
        'style="width:100%;height:100%;border:none;display:block;" '
        'allowfullscreen></iframe>'
    )
    wid, w = make_widget(
        "system.cards.html_card", "latest", "SiteGuard 카메라 목록",
        {"cardHtml": card_html, "cardCss": "html,body{margin:0;padding:0;overflow:hidden;}"},
        row=0, col=0, sx=24, sy=18,
    )

    return wid, {
        "title": "SiteGuard 카메라 목록",
        "configuration": {
            "description": "SiteGuard 카메라 목록 대시보드",
            "widgets": {wid: w},
            "states": {
                "default": {
                    "name": "카메라 목록",
                    "root": True,
                    "layouts": {
                        "main": {
                            "widgets": {wid: {"sizeX": 24, "sizeY": 18, "row": 0, "col": 0}},
                            "gridSettings": _grid_settings(),
                        }
                    },
                }
            },
            "entityAliases": {},
            "filters": {},
        },
    }


def build_device_dashboard(cam):
    """개별 기기 대시보드 — 라이브뷰 + 5섹션 상세 패널"""
    alias_id = str(uuid.uuid4())
    alias = {
        alias_id: {
            "id": alias_id,
            "alias": cam["name"],
            "filter": {
                "type": "entityName",
                "resolveMultiple": False,
                "entityNameFilter": cam["name"],
            },
        }
    }

    ddns = _ddns(cam)
    port = _port(cam)
    rtsp_main = f"rtsp://{ddns}:{port}/{cam['main_rtsp_profile']}"
    rtsp_sub = f"rtsp://{ddns}:{port}/{cam['sub_rtsp_profile']}"
    stream_url = f"{GO2RTC_EXT}/stream.html?src={cam['stream']}&mode=mse"

    video_html = (
        f'<div style="width:100%;height:100%;background:#000;overflow:hidden;">'
        f'<iframe src="{stream_url}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>'
        f'</div>'
    )

    s_head = ('background:#1a1a2e;color:#4db6ac;font-size:11px;font-weight:700;'
              'letter-spacing:.5px;padding:6px 8px;margin-top:10px;'
              'border-left:3px solid #4db6ac;')
    s_tbl = 'width:100%;border-collapse:collapse;font-size:11px;margin-top:4px;'
    td_k = 'color:#888;width:42%;padding:3px 8px 3px 0;vertical-align:top;'
    td_v = 'color:#ddd;'

    frigate_on_color = "#4caf50" if cam["frigate_enabled"] else "#888"
    notify_on_color = "#4caf50" if cam["frigate_notify"] else "#888"

    detail_html = f"""
<div style="font-family:'Segoe UI',sans-serif;color:#ccc;background:#0f1117;
            height:100%;overflow-y:auto;padding:12px;box-sizing:border-box;">

  <div style="color:#4db6ac;font-size:14px;font-weight:600;margin-bottom:12px;
              border-bottom:1px solid #2a2a4a;padding-bottom:8px;">
    {cam['label']}
    &nbsp;<span style="color:#4caf50;font-size:11px;">● 정상</span>
  </div>

  <!-- ① 기기 식별 -->
  <div style="{s_head}">① 기기 식별</div>
  <table style="{s_tbl}">
    <tr><td style="{td_k}">현장(Site)</td><td style="{td_v}">{cam['site']}</td></tr>
    <tr><td style="{td_k}">그룹</td><td style="{td_v}">{cam['group']}</td></tr>
    <tr><td style="{td_k}">가입자</td><td style="{td_v}">{cam['customer']}</td></tr>
    <tr><td style="{td_k}">모델</td><td style="{td_v}">{cam['model']}</td></tr>
    <tr><td style="{td_k}">유형</td><td style="{td_v}">{cam['cam_type']}</td></tr>
    <tr><td style="{td_k}">위치</td><td style="{td_v}">{cam['location']}</td></tr>
    <tr><td style="{td_k}">MAC 주소</td><td style="{td_v}">{cam['mac_address']}</td></tr>
    <tr><td style="{td_k}">내부 IP</td><td style="{td_v}">{cam['internal_ip']}</td></tr>
    <tr><td style="{td_k}">외부 연결</td><td style="{td_v}">{cam['connection']}</td></tr>
  </table>

  <!-- ② 시스템 정보 -->
  <div style="{s_head}">② 시스템 정보</div>
  <table style="{s_tbl}">
    <tr><td style="{td_k}">펌웨어 버전</td>
        <td style="color:#888;font-style:italic;">— ONVIF 갱신 필요</td></tr>
    <tr><td style="{td_k}">펌웨어 날짜</td>
        <td style="color:#888;font-style:italic;">— ONVIF 갱신 필요</td></tr>
  </table>

  <!-- ③ 에지 저장소 -->
  <div style="{s_head}">③ 에지 저장소</div>
  <table style="{s_tbl}">
    <tr><td style="{td_k}">카메라 SD</td>
        <td style="color:#888;font-style:italic;">— 에지 스크립트 대기중</td></tr>
    <tr><td style="{td_k}">에지 PC</td>
        <td style="color:#888;font-style:italic;">— 에지 스크립트 대기중</td></tr>
  </table>

  <!-- ④ 스트림 URL -->
  <div style="{s_head}">④ 스트림 URL</div>
  <table style="{s_tbl}">
    <tr><td style="{td_k}">메인 RTSP</td>
        <td style="color:#aaa;font-size:10px;word-break:break-all;">{rtsp_main}</td></tr>
    <tr><td style="{td_k}">서브 RTSP</td>
        <td style="color:#aaa;font-size:10px;word-break:break-all;">{rtsp_sub}</td></tr>
    <tr><td style="{td_k}">라이브뷰</td>
        <td style="color:#aaa;font-size:10px;word-break:break-all;">{stream_url}</td></tr>
  </table>

  <!-- ⑤ Frigate 감지 설정 -->
  <div style="{s_head}">⑤ Frigate 감지 설정</div>
  <table style="{s_tbl}">
    <tr><td style="{td_k}">감지 활성화</td>
        <td style="color:{frigate_on_color};font-weight:600;">{'ON ●' if cam['frigate_enabled'] else 'OFF ○'}</td></tr>
    <tr><td style="{td_k}">감지 fps</td><td style="{td_v}">{cam['frigate_detect_fps']}</td></tr>
    <tr><td style="{td_k}">신뢰도 임계값</td><td style="{td_v}">{cam['frigate_min_score']}</td></tr>
    <tr><td style="{td_k}">최소 객체 면적</td><td style="{td_v}">{cam['frigate_min_area']} px²</td></tr>
    <tr><td style="{td_k}">녹화 전 (초)</td><td style="{td_v}">{cam['frigate_record_pre']}</td></tr>
    <tr><td style="{td_k}">녹화 후 (초)</td><td style="{td_v}">{cam['frigate_record_post']}</td></tr>
    <tr><td style="{td_k}">보관 기간 (일)</td><td style="{td_v}">{cam['frigate_record_days']}</td></tr>
    <tr><td style="{td_k}">알림</td>
        <td style="color:{notify_on_color};font-weight:600;">{'ON ●' if cam['frigate_notify'] else 'OFF ○'}</td></tr>
  </table>

  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #2a2a2a;">
    <button style="background:#3a1a1a;color:#f44336;border:1px solid #5a2a2a;
                   padding:5px 14px;border-radius:4px;font-size:11px;cursor:pointer;">
      🗑️ 카메라 삭제
    </button>
  </div>
</div>"""

    wid_v, w_v = make_widget(
        "system.cards.html_card", "latest", f"{cam['label']} 라이브",
        {"cardHtml": video_html, "cardCss": "html,body{margin:0;padding:0;overflow:hidden;}"},
        row=0, col=0, sx=16, sy=16,
    )
    wid_a, w_a = make_widget(
        "system.cards.html_card", "latest", f"{cam['label']} 기기 정보",
        {"cardHtml": detail_html, "cardCss": ""},
        row=0, col=16, sx=8, sy=16,
    )

    widgets_def = {wid_v: w_v, wid_a: w_a}
    layout_w = {
        wid_v: {"sizeX": 16, "sizeY": 16, "row": 0, "col": 0},
        wid_a: {"sizeX": 8,  "sizeY": 16, "row": 0, "col": 16},
    }

    return {
        "title": f"SiteGuard — {cam['label']}",
        "configuration": {
            "description": f"{cam['label']} 영상 및 5섹션 기기 정보",
            "widgets": widgets_def,
            "states": {
                "default": {
                    "name": cam["label"],
                    "root": True,
                    "layouts": {
                        "main": {
                            "widgets": layout_w,
                            "gridSettings": _grid_settings(),
                        }
                    },
                }
            },
            "entityAliases": alias,
            "filters": {},
        },
    }


def main():
    print("=== SiteGuard Thingsboard 전체 설정 (Phase C 개선판) ===\n")

    print("[1/6] TB 로그인...")
    token = login()
    print("   OK")

    print("\n[2/6] 기기 서버 속성 설정 (27개)...")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for cam in CAMERAS:
        dev_id = get_device_id(token, cam["name"])
        if not dev_id:
            print(f"   SKIP: 기기 없음 — {cam['name']}")
            continue
        ddns = _ddns(cam)
        port = _port(cam)
        attrs = {
            # 기기 식별 (10)
            "site":             cam["site"],
            "group":            cam["group"],
            "customer":         cam["customer"],
            "model":            cam["model"],
            "cam_type":         cam["cam_type"],
            "location":         cam["location"],
            "mac_address":      cam["mac_address"],
            "internal_ip":      cam["internal_ip"],
            "connection":       cam["connection"],
            "activated_at":     now_iso,
            # 시스템 (2)
            "firmware_version": "",
            "firmware_date":    "",
            # 저장소 (4) — 에지 스크립트 자동 갱신
            "sd_total_gb":      0,
            "sd_used_gb":       0,
            "edge_total_gb":    0,
            "edge_used_gb":     0,
            # 스트림 URL (3)
            "rtsp_url_main":    f"rtsp://{ddns}:{port}/{cam['main_rtsp_profile']}",
            "rtsp_url_sub":     f"rtsp://{ddns}:{port}/{cam['sub_rtsp_profile']}",
            "stream_url":       f"{GO2RTC_EXT}/stream.html?src={cam['stream']}&mode=mse",
            # Frigate 감지 (8)
            "frigate_enabled":      cam["frigate_enabled"],
            "frigate_detect_fps":   cam["frigate_detect_fps"],
            "frigate_min_score":    cam["frigate_min_score"],
            "frigate_min_area":     cam["frigate_min_area"],
            "frigate_record_pre":   cam["frigate_record_pre"],
            "frigate_record_post":  cam["frigate_record_post"],
            "frigate_record_days":  cam["frigate_record_days"],
            "frigate_notify":       cam["frigate_notify"],
        }
        set_server_attributes(token, dev_id, attrs)
        print(f"   OK: {cam['name']} — {len(attrs)}개 속성")

    print("\n[3/6] 기존 SiteGuard 대시보드 정리...")
    titles_to_delete = [
        "SiteGuard 현장 관제",
        "SiteGuard 카메라 목록",
        "SiteGuard — CCTV-1 TVT Dome",
        "SiteGuard — CCTV-3 VHT Dome F977",
    ]
    for title in titles_to_delete:
        ids = delete_dashboards_by_title(token, title)
        for did in ids:
            print(f"   DEL: {title} ({did})")
    print("   완료")

    print("\n[4/6] 메인 그리드 대시보드 생성...")
    _, grid_dashboard = build_grid_dashboard()
    r = requests.post(f"{TB_URL}/api/dashboard", headers=h(token), json=grid_dashboard)
    if r.status_code != 200:
        print(f"   FAIL: {r.status_code} — {r.text[:300]}")
        return
    grid_db_id = r.json()["id"]["id"]
    print(f"   OK: {grid_db_id}")

    print("\n[5/6] 카메라 목록 대시보드 생성...")
    _, list_dashboard = build_camera_list_dashboard()
    r = requests.post(f"{TB_URL}/api/dashboard", headers=h(token), json=list_dashboard)
    if r.status_code != 200:
        print(f"   FAIL: {r.status_code} — {r.text[:300]}")
    else:
        list_db_id = r.json()["id"]["id"]
        print(f"   OK: {list_db_id}")

    print("\n[6/6] 개별 카메라 대시보드 생성 (5섹션)...")
    for cam in CAMERAS:
        dev_id = get_device_id(token, cam["name"])
        dev_dashboard = build_device_dashboard(cam)
        r = requests.post(f"{TB_URL}/api/dashboard", headers=h(token), json=dev_dashboard)
        if r.status_code != 200:
            print(f"   FAIL ({cam['name']}): {r.status_code}")
            continue
        dev_db_id = r.json()["id"]["id"]
        print(f"   OK: {cam['name']} → {dev_db_id}")
        if dev_id:
            set_server_attributes(token, dev_id, {"device_dashboard_id": dev_db_id})

    # ip-camera 프로파일 기본 대시보드 → 그리드 대시보드
    profile_id = get_profile_id(token, "ip-camera")
    if profile_id:
        try:
            r = requests.get(f"{TB_URL}/api/deviceProfile/{profile_id}", headers=h(token))
            r.raise_for_status()
            profile = r.json()
            profile["defaultDashboardId"] = {"id": grid_db_id, "entityType": "DASHBOARD"}
            r2 = requests.post(f"{TB_URL}/api/deviceProfile", headers=h(token), json=profile)
            r2.raise_for_status()
            print(f"   OK: ip-camera 프로파일 기본 대시보드 → 그리드")
        except Exception as e:
            print(f"   WARN: 프로파일 대시보드 설정 실패 — {e}")

    print("\n" + "=" * 55)
    print("완료!")
    print(f"  현장 관제 그리드:  http://46.62.155.122:8080/dashboard/{grid_db_id}")
    print(f"  카메라 목록:       http://46.62.155.122:8080/dashboard/{list_db_id}")
    print(f"  camera-grid.html:  http://46.62.155.122/go2rtc/../camera-grid.html")

    return grid_db_id


if __name__ == "__main__":
    main()
