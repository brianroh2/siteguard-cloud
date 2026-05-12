#!/usr/bin/env python3
# 개별 카메라 대시보드를 camera-detail.html iframe으로 교체
# 기존 그리드·목록 대시보드는 그대로 유지
# 실행: python3 thingsboard/scripts/update_camera_detail_db.py

import sys, os, requests, uuid
sys.path.insert(0, os.path.dirname(__file__))
from tb_siteguard_full_setup import (
    login, h, delete_dashboards_by_title, set_server_attributes,
    get_device_id, make_widget, _grid_settings, TB_URL, CAMERAS
)


def build_device_dashboard_v2(cam):
    """개별 카메라 대시보드 — camera-detail.html iframe (풀 인터랙티브)"""
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

    iframe_html = (
        f'<iframe src="/camera-detail.html?name={cam["name"]}" '
        f'style="width:100%;height:100%;border:none;display:block;" '
        f'allowfullscreen></iframe>'
    )
    wid, w = make_widget(
        "system.cards.html_card", "latest", cam["label"],
        {"cardHtml": iframe_html,
         "cardCss": "html,body{margin:0;padding:0;overflow:hidden;}"},
        row=0, col=0, sx=24, sy=21,
    )

    return {
        "title": f"SiteGuard — {cam['label']}",
        "configuration": {
            "description": f"{cam['label']} 상세 관제 (camera-detail.html)",
            "widgets": {wid: w},
            "states": {
                "default": {
                    "name": cam["label"],
                    "root": True,
                    "layouts": {
                        "main": {
                            "widgets": {wid: {"sizeX": 24, "sizeY": 21, "row": 0, "col": 0}},
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
    print("=== 개별 카메라 대시보드 업데이트 (camera-detail.html iframe) ===\n")
    token = login()

    for cam in CAMERAS:
        label = cam["label"]
        title = f"SiteGuard — {label}"

        print(f"[{cam['name']}] 기존 대시보드 삭제...")
        deleted = delete_dashboards_by_title(token, title)
        for did in deleted:
            print(f"  DEL: {did}")

        print(f"[{cam['name']}] 신규 대시보드 생성 (camera-detail.html?name={cam['name']})...")
        db = build_device_dashboard_v2(cam)
        r = requests.post(f"{TB_URL}/api/dashboard", headers=h(token), json=db)
        if r.status_code != 200:
            print(f"  FAIL: {r.status_code} — {r.text[:200]}")
            continue
        db_id = r.json()["id"]["id"]
        print(f"  OK: http://46.62.155.122:8080/dashboard/{db_id}")

        # 기기 속성에 대시보드 ID 갱신
        dev_id = get_device_id(token, cam["name"])
        if dev_id:
            set_server_attributes(token, dev_id, {"device_dashboard_id": db_id})

        print()

    print("완료! 접속 후 확인:")
    for cam in CAMERAS:
        print(f"  {cam['name']}: http://46.62.155.122:8080/camera-detail.html?name={cam['name']}")

if __name__ == "__main__":
    main()
