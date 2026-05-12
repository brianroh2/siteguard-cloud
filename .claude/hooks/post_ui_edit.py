#!/usr/bin/env python3
# Hook: siteguard-ui/ 파일 수정 시 패치 스크립트 실행 알림
# PostToolUse / Edit|Write 매처
import sys, json

def out(msg: str):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": msg
        }
    }), flush=True)

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

file_path = data.get("tool_input", {}).get("file_path", "")

if "siteguard-ui/" in file_path:
    fname = file_path.split("/")[-1]
    out(f"📦 [Hook] {fname} 수정됨 → TB 반영하려면: python3 temp/patch_siteguard_ui.py")
