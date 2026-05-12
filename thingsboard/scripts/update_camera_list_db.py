#!/usr/bin/env python3
# "SiteGuard 카메라 목록" 대시보드만 교체 — 다른 대시보드는 유지
# 실행: python3 update_camera_list_db.py

import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from tb_siteguard_full_setup import (
    login, h, delete_dashboards_by_title, build_camera_list_dashboard, TB_URL
)
import requests

def main():
    print("=== 카메라 목록 대시보드 업데이트 ===")
    token = login()

    print("[1/2] 기존 '카메라 목록' 대시보드 삭제...")
    deleted = delete_dashboards_by_title(token, "SiteGuard 카메라 목록")
    for did in deleted:
        print(f"  DEL: {did}")
    if not deleted:
        print("  (없음 — 신규 생성)")

    print("[2/2] 카메라 목록 대시보드 생성 (camera-list.html iframe)...")
    _, db = build_camera_list_dashboard()
    r = requests.post(f"{TB_URL}/api/dashboard", headers=h(token), json=db)
    if r.status_code != 200:
        print(f"  FAIL: {r.status_code} — {r.text[:200]}")
        return
    db_id = r.json()["id"]["id"]
    print(f"  OK: http://46.62.155.122:8080/dashboard/{db_id}")
    print("\n완료! TB 재시작 없이 즉시 반영됩니다.")

if __name__ == "__main__":
    main()
