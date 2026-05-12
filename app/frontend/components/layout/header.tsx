"use client"

import { useEffect, useState } from "react"
import { Bell, Search } from "lucide-react"

export function Header({ title }: { title?: string }) {
  const [time, setTime] = useState("")

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      setTime(
        `${now.getFullYear()}. ${pad(now.getMonth() + 1)}. ${pad(now.getDate())} (${days[now.getDay()]}) ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="fixed top-0 left-[220px] right-0 z-30 flex items-center justify-between px-5"
      style={{
        height: 56,
        background: "#0F1A2E",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        {title && (
          <span className="text-white font-semibold text-[15px]">{title}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <time className="text-[12px]" style={{ color: "rgba(168,187,204,0.7)" }}>
          {time}
        </time>
        <button className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ color: "rgba(168,187,204,0.7)" }}>
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: "#0057FF" }}>
            홍
          </div>
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
            홍길동
          </span>
        </div>
      </div>
    </header>
  )
}
