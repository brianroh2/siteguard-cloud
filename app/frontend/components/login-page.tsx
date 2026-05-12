"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [id, setId] = useState("")
  const [pw, setPw] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !pw) {
      setError("입력하신 ID 또는 Password가 일치하지 않습니다.")
      return
    }
    setError("")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)
    router.push("/dashboard")
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F1A2E",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif",
    }}>
      {/* 그리드 배경 */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,87,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,87,255,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      {/* 글로우 */}
      <div style={{
        position: "absolute", top: -160, right: -160,
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,87,255,0.12) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -120, left: -120,
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,87,255,0.08) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* 카드 */}
      <div style={{
        position: "relative", zIndex: 1,
        width: 400, maxWidth: "calc(100vw - 32px)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        padding: "44px 40px",
        backdropFilter: "blur(20px)",
      }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52,
            background: "linear-gradient(135deg, #0057FF, #003FB0)",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 8px 24px rgba(0,87,255,0.4)",
          }}>
            <Shield size={26} color="#fff" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
            SiteGuard
          </div>
          <div style={{ fontSize: 11, color: "rgba(168,187,204,0.6)", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
            현장 관제 시스템
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* ID */}
          <div style={{ position: "relative", display: "flex", alignItems: "center",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 8 }}>
            <span style={{ padding: "0 12px", display: "flex", alignItems: "center", color: "rgba(168,187,204,0.7)", flexShrink: 0 }}>
              <User size={17} />
            </span>
            <input
              type="text" placeholder="ID" value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "13px 14px 13px 0", color: "#fff", fontSize: 14,
              }}
            />
          </div>

          {/* PW */}
          <div style={{ position: "relative", display: "flex", alignItems: "center",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 8 }}>
            <span style={{ padding: "0 12px", display: "flex", alignItems: "center", color: "rgba(168,187,204,0.7)", flexShrink: 0 }}>
              <Lock size={17} />
            </span>
            <input
              type={showPw ? "text" : "password"} placeholder="Password" value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "13px 0", color: "#fff", fontSize: 14,
              }}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              style={{ padding: "0 12px", display: "flex", alignItems: "center",
                color: "rgba(168,187,204,0.7)", background: "none", border: "none", cursor: "pointer" }}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {/* 에러 */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 6,
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#FCA5A5", fontSize: 12,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* 버튼 */}
          <button type="submit" disabled={loading}
            style={{
              width: "100%", padding: "13px 0",
              background: loading ? "rgba(0,87,255,0.6)" : "#0057FF",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 4, transition: "background 0.2s",
              fontFamily: "inherit",
            }}>
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                로그인 중...
              </>
            ) : "Sign in"}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "22px 0" }} />

        {/* 링크 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          {[["회원가입", "#"], ["ID / PW 찾기", "#"]].map(([label, href], i) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {i > 0 && <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>}
              <a href={href} style={{ fontSize: 13, color: "rgba(168,187,204,0.7)", textDecoration: "none" }}>
                {label}
              </a>
            </span>
          ))}
        </div>

        {/* reCAPTCHA */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "rgba(168,187,204,0.35)" }}>
          Protected by reCAPTCHA · Privacy · Terms
        </div>
      </div>

      {/* 푸터 */}
      <footer style={{
        position: "relative", zIndex: 1, marginTop: 24,
        display: "flex", gap: 12, alignItems: "center",
        fontSize: 11, color: "rgba(168,187,204,0.35)",
      }}>
        <span>Help Desk: 1600-0000</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>Copyright 2026 SiteGuard. All Rights Reserved.</span>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>
    </div>
  )
}
