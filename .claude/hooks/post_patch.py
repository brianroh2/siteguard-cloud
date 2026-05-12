#!/usr/bin/env python3
# Hook: patch_siteguard_ui.py 성공 후 TB 자동 재시작 + 헬스체크
# PostToolUse / Bash 매처 → additionalContext로 결과 피드백
import sys, json, subprocess, time

def out(msg: str, ok: bool = True):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": msg
        }
    }), flush=True)
    sys.exit(0 if ok else 1)

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd    = data.get("tool_input", {}).get("command", "")
output = data.get("tool_response", "") if isinstance(data.get("tool_response"), str) \
         else data.get("tool_response", {}).get("output", "")

# patch_siteguard_ui.py 실행이 아니면 무시
if "patch_siteguard_ui" not in cmd:
    sys.exit(0)

# 패치 실패 시 무시 (FAIL 포함 또는 '완료' 없음)
if "FAIL" in output or "완료" not in output:
    sys.exit(0)

# ── TB 재시작 ────────────────────────────────────────────────────────────
subprocess.run(["docker", "restart", "thingsboard"],
               capture_output=True, timeout=30)

# ── 기동 대기 (최대 120초) ───────────────────────────────────────────────
for i in range(40):
    time.sleep(3)
    r = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:8080/"],
        capture_output=True, text=True, timeout=5
    )
    if r.stdout.strip() == "200":
        out(f"✅ [Hook] TB 재시작 완료 ({(i+1)*3}초) — sg-inject.js 서빙 확인 후 계속 진행 가능")

out("⚠️ [Hook] TB 120초 내 미기동 — docker logs thingsboard 확인 필요", ok=False)
