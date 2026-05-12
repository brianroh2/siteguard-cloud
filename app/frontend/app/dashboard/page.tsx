"use client"

import { useState } from "react"
import { MonitorSmartphone, Building2, Camera, Bell, Users, TrendingUp, AlertTriangle, Info, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"

/* ── 샘플 데이터 ── */
const trendData = [
  { date: "4/7",  online: 135, offline: 7 },
  { date: "4/8",  online: 138, offline: 4 },
  { date: "4/9",  online: 136, offline: 6 },
  { date: "4/10", online: 140, offline: 2 },
  { date: "4/11", online: 137, offline: 5 },
  { date: "4/12", online: 139, offline: 3 },
  { date: "4/13", online: 138, offline: 4 },
]

const storageData = [
  { site: "서울A",  usage: 30 },
  { site: "부산B",  usage: 90 },
  { site: "대구C",  usage: 22 },
  { site: "인천D",  usage: 70 },
  { site: "광주E",  usage: 15 },
]

const recentAlarms = [
  { id: 1, type: "error",   msg: "edge-01 — 디스크 초과 (>180GB)",  time: "5분 전"  },
  { id: 2, type: "warning", msg: "stb-03 — CPU 과부하 (>90%)",       time: "12분 전" },
  { id: 3, type: "offline", msg: "ipc-07 — 오프라인 감지",           time: "34분 전" },
  { id: 4, type: "warning", msg: "edge-01 — 스토리지 경고 (>80%)",   time: "1시간 전"},
]

const siteStatus = [
  { name: "서울A현장", cnt: 12, status: "정상" },
  { name: "부산B현장", cnt: 8,  status: "이상" },
  { name: "대구C현장", cnt: 5,  status: "정상" },
  { name: "인천D현장", cnt: 7,  status: "경고" },
  { name: "광주E현장", cnt: 4,  status: "정상" },
]

const aiEvents = [
  { label: "오늘",    cnt: 128  },
  { label: "어제",    cnt: 89   },
  { label: "이번 주", cnt: 542  },
  { label: "이번 달", cnt: 2341 },
]

/* ── 헬퍼 ── */
const storageColor = (v: number) =>
  v >= 90 ? "#EF4444" : v >= 70 ? "#F59E0B" : "#0057FF"

const alarmDot: Record<string, string> = {
  error: "#EF4444", warning: "#F59E0B", offline: "#94A3B8", info: "#0057FF",
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  정상: { bg: "#ECFDF5", color: "#059669" },
  이상: { bg: "#FEF2F2", color: "#DC2626" },
  경고: { bg: "#FFFBEB", color: "#D97706" },
}

/* ── 통계 카드 데이터 ── */
const statCards = [
  {
    icon: MonitorSmartphone, label: "기기 현황", main: 142,
    subs: [{ label: "Online", val: 138, color: "#10B981" }, { label: "Offline", val: 4, color: "#94A3B8" }],
    href: "/devices",
  },
  {
    icon: Building2, label: "현장 현황", main: 23,
    subs: [{ label: "정상", val: 21, color: "#10B981" }, { label: "이상", val: 2, color: "#EF4444" }],
    href: "/device-groups",
  },
  {
    icon: Camera, label: "스트리밍", main: "정상",
    subs: [{ label: "RTSP", val: 89, color: "#64748B" }, { label: "WebRTC", val: 49, color: "#64748B" }],
    href: "/camera",
  },
  {
    icon: Bell, label: "활성 알람", main: 7,
    subs: [{ label: "긴급", val: 2, color: "#EF4444" }, { label: "경고", val: 5, color: "#F59E0B" }],
    href: "/alarm",
  },
]

export default function DashboardPage() {
  const [editMode, setEditMode] = useState(false)

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-[18px] font-bold" style={{ color: "#1A2330" }}>Dashboard</h1>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#E8F0FF", color: "#0057FF" }}>실시간</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all"
            style={editMode
              ? { background: "#0057FF", color: "#fff", borderColor: "#0057FF" }
              : { background: "#fff", color: "#5A6A7A", borderColor: "#E2E8F0" }}>
            <RefreshCw size={13} />
            {editMode ? "편집 완료" : "레이아웃 편집"}
          </button>
        </div>
      </div>

      {/* 편집 모드 안내 */}
      {editMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
          ✏️ 위젯을 드래그해서 위치를 변경하거나, 우상단 ✕로 제거할 수 있습니다.
          <a href="/settings/display" className="ml-auto underline font-medium">설정에서 구성 →</a>
        </div>
      )}

      {/* Row 1: 통계 카드 4개 */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((c) => (
          <a key={c.label} href={c.href}
            className="block rounded-xl p-4 transition-all hover:shadow-md"
            style={{ background: "#fff", border: "1px solid #E2E8F0",
              outline: editMode ? "2px dashed #0057FF" : "none" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg" style={{ background: "#E8F0FF" }}>
                <c.icon size={15} style={{ color: "#0057FF" }} />
              </div>
              <span className="text-[12px] font-semibold" style={{ color: "#5A6A7A" }}>{c.label}</span>
            </div>
            <div className="text-[28px] font-bold mb-2" style={{ color: "#1A2330", lineHeight: 1 }}>
              {c.main}
            </div>
            <div className="flex gap-3">
              {c.subs.map((s) => (
                <div key={s.label} className="flex items-center gap-1 text-[12px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: "#5A6A7A" }}>{s.label}</span>
                  <strong style={{ color: "#1A2330" }}>{s.val}</strong>
                </div>
              ))}
            </div>
          </a>
        ))}
      </div>

      {/* Row 2: 차트 2개 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 기기 온라인 추이 */}
        <Card style={{ border: "1px solid #E2E8F0", outline: editMode ? "2px dashed #0057FF" : "none" }}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-[13px] font-semibold" style={{ color: "#5A6A7A" }}>
              기기 온라인 추이 (7일)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} barSize={14} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E2E8F0" }} />
                <Bar dataKey="online"  name="Online"  fill="#0057FF" radius={[2,2,0,0]} opacity={0.85} />
                <Bar dataKey="offline" name="Offline" fill="#94A3B8" radius={[2,2,0,0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 에지 스토리지 사용률 */}
        <Card style={{ border: "1px solid #E2E8F0", outline: editMode ? "2px dashed #0057FF" : "none" }}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-[13px] font-semibold" style={{ color: "#5A6A7A" }}>
              에지 스토리지 사용률 (현장별)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={storageData} barSize={28} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="site" type="category" tick={{ fontSize: 11, fill: "#5A6A7A" }}
                  axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v) => [`${v}%`, "사용률"]}
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E2E8F0" }} />
                <Bar dataKey="usage" name="사용률" radius={[0,3,3,0]}>
                  {storageData.map((d, i) => (
                    <Cell key={i} fill={storageColor(d.usage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: 하단 3개 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 최근 알람 */}
        <Card style={{ border: "1px solid #E2E8F0", outline: editMode ? "2px dashed #0057FF" : "none" }}>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[13px] font-semibold" style={{ color: "#5A6A7A" }}>최근 알람</CardTitle>
            <a href="/alarm" className="text-[11px] font-medium" style={{ color: "#0057FF" }}>전체 보기 →</a>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {recentAlarms.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 py-1.5"
                style={{ borderBottom: "1px solid #F1F5F9" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: alarmDot[a.type] }} />
                <span className="flex-1 text-[12px]" style={{ color: "#1A2330" }}>{a.msg}</span>
                <span className="text-[11px] flex-shrink-0" style={{ color: "#94A3B8" }}>{a.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 현장별 상태 */}
        <Card style={{ border: "1px solid #E2E8F0", outline: editMode ? "2px dashed #0057FF" : "none" }}>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[13px] font-semibold" style={{ color: "#5A6A7A" }}>현장별 상태</CardTitle>
            <a href="/device-groups" className="text-[11px] font-medium" style={{ color: "#0057FF" }}>전체 보기 →</a>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {siteStatus.map((s) => (
              <div key={s.name} className="flex items-center gap-2 py-1.5"
                style={{ borderBottom: "1px solid #F1F5F9" }}>
                <span className="flex-1 text-[12px] font-medium" style={{ color: "#1A2330" }}>{s.name}</span>
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>{s.cnt}대</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ ...(statusStyle[s.status] ?? { bg: "#F1F5F9", color: "#64748B" }),
                    background: statusStyle[s.status]?.bg }}>
                  {s.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI 감지 이벤트 */}
        <Card style={{ border: "1px solid #E2E8F0", outline: editMode ? "2px dashed #0057FF" : "none" }}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-[13px] font-semibold" style={{ color: "#5A6A7A" }}>AI 감지 이벤트</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {aiEvents.map((ev) => (
              <div key={ev.label} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid #F1F5F9" }}>
                <span className="text-[12px]" style={{ color: "#5A6A7A" }}>{ev.label}</span>
                <span className="text-[18px] font-bold" style={{ color: "#1A2330" }}>
                  {ev.cnt.toLocaleString()}<span className="text-[11px] font-normal ml-1" style={{ color: "#94A3B8" }}>건</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
