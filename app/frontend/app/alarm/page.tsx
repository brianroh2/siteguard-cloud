"use client"

import { useState } from "react"
import { Search, Download, Bell, AlertTriangle, Info, CheckCircle } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

/* ── 타입 ── */
type Severity = "긴급" | "경고" | "정보"
type AlarmStatus = "미처리" | "처리중" | "처리완료"

interface Alarm {
  id: number
  severity: Severity
  type: string
  message: string
  site: string
  device: string
  time: string
  elapsed: string
  status: AlarmStatus
}

/* ── 샘플 데이터 ── */
const alarms: Alarm[] = [
  { id:1,  severity:"긴급", type:"스토리지",   message:"edge-01 — 디스크 초과 (>180GB)",        site:"대구C현장", device:"edge-01",   time:"2026-04-14 09:12", elapsed:"5분 전",    status:"미처리"  },
  { id:2,  severity:"경고", type:"CPU",        message:"stb-03 — CPU 과부하 (>90%)",             site:"서울A현장", device:"stb-03",    time:"2026-04-14 09:05", elapsed:"12분 전",   status:"처리중"  },
  { id:3,  severity:"경고", type:"오프라인",   message:"ipc-07 — 오프라인 감지",                 site:"부산B현장", device:"ipc-07",    time:"2026-04-14 08:43", elapsed:"34분 전",   status:"미처리"  },
  { id:4,  severity:"경고", type:"스토리지",   message:"edge-01 — 스토리지 경고 (>80%)",         site:"대구C현장", device:"edge-01",   time:"2026-04-14 08:17", elapsed:"1시간 전",  status:"처리중"  },
  { id:5,  severity:"정보", type:"AI감지",     message:"stb-01 — 사람 감지 이벤트 발생",         site:"서울A현장", device:"stb-01",    time:"2026-04-14 07:50", elapsed:"1시간 전",  status:"처리완료" },
  { id:6,  severity:"긴급", type:"네트워크",   message:"울산F현장 — 현장 전체 오프라인",         site:"울산F현장", device:"(전체)",    time:"2026-04-14 07:30", elapsed:"2시간 전",  status:"미처리"  },
  { id:7,  severity:"정보", type:"펌웨어",     message:"stb-02 — 펌웨어 v1.3.0 업데이트 가능",  site:"서울A현장", device:"stb-02",    time:"2026-04-14 06:00", elapsed:"3시간 전",  status:"처리완료" },
  { id:8,  severity:"경고", type:"오프라인",   message:"tab-01 — 배터리 부족 (12%)",             site:"광주E현장", device:"tab-01",    time:"2026-04-13 22:15", elapsed:"11시간 전", status:"처리완료" },
  { id:9,  severity:"정보", type:"AI감지",     message:"ipc-01 — 차량 감지 이벤트 발생",         site:"부산B현장", device:"ipc-01",    time:"2026-04-13 20:00", elapsed:"13시간 전", status:"처리완료" },
  { id:10, severity:"경고", type:"스토리지",   message:"ipc-02 — 스토리지 오류 감지",            site:"부산B현장", device:"ipc-02",    time:"2026-04-13 18:30", elapsed:"15시간 전", status:"미처리"  },
]

/* ── 스타일 ── */
const severityStyle: Record<Severity, { bg:string; color:string; dot:string; icon: typeof Bell }> = {
  긴급: { bg:"#FEF2F2", color:"#DC2626", dot:"#DC2626", icon:AlertTriangle },
  경고: { bg:"#FFFBEB", color:"#D97706", dot:"#F59E0B", icon:Bell },
  정보: { bg:"#EFF6FF", color:"#3B82F6", dot:"#3B82F6", icon:Info },
}

const statusStyle: Record<AlarmStatus, { bg:string; color:string }> = {
  미처리:   { bg:"#FEF2F2", color:"#DC2626" },
  처리중:   { bg:"#FFFBEB", color:"#D97706" },
  처리완료: { bg:"#ECFDF5", color:"#059669" },
}

export default function AlarmPage() {
  const [severityFilter, setSeverityFilter] = useState("전체")
  const [statusFilter, setStatusFilter]   = useState("전체")
  const [siteFilter, setSiteFilter]       = useState("전체")
  const [search, setSearch]               = useState("")
  const [selected, setSelected]           = useState<Set<number>>(new Set())
  const [allChecked, setAllChecked]       = useState(false)

  const sites = Array.from(new Set(alarms.map(a => a.site)))

  const filtered = alarms.filter(a => {
    if (severityFilter !== "전체" && a.severity !== severityFilter) return false
    if (statusFilter   !== "전체" && a.status   !== statusFilter)   return false
    if (siteFilter     !== "전체" && a.site     !== siteFilter)     return false
    if (search && !a.message.includes(search) && !a.device.includes(search)) return false
    return true
  })

  const toggleAll = () => {
    if (allChecked) { setSelected(new Set()); setAllChecked(false) }
    else { setSelected(new Set(filtered.map(a => a.id))); setAllChecked(true) }
  }
  const toggleOne = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const counts = {
    긴급: alarms.filter(a => a.severity === "긴급" && a.status === "미처리").length,
    경고: alarms.filter(a => a.severity === "경고" && a.status !== "처리완료").length,
    정보: alarms.filter(a => a.severity === "정보").length,
    미처리: alarms.filter(a => a.status === "미처리").length,
  }

  const sel: React.CSSProperties = {
    height:30, border:"1px solid #E2E8F0", borderRadius:5,
    padding:"0 8px", fontSize:12, color:"#1A2330", background:"#fff", outline:"none",
  }

  return (
    <div className="min-h-screen" style={{ background:"#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="Alarm" />
      <main style={{ marginLeft:220, paddingTop:56 }}>
        <div className="p-5 space-y-4">

          {/* 페이지 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold" style={{ color:"#1A2330" }}>Alarm</h1>
              {counts.미처리 > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background:"#FEF2F2", color:"#DC2626" }}>
                  미처리 {counts.미처리}건
                </span>
              )}
            </div>
            <button style={{ padding:"6px 14px", background:"#0057FF", color:"#fff",
              border:"none", borderRadius:5, fontSize:12, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", gap:5 }}>
              <CheckCircle size={13} /> 일괄 처리완료
            </button>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:"긴급 (미처리)", val:counts.긴급,   color:"#DC2626", bg:"#FEF2F2", border:"#FECACA" },
              { label:"경고 (활성)",   val:counts.경고,   color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
              { label:"정보",         val:counts.정보,   color:"#3B82F6", bg:"#EFF6FF", border:"#BFDBFE" },
              { label:"전체 알람",    val:alarms.length, color:"#5A6A7A", bg:"#F8FAFC", border:"#E2E8F0" },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-4" style={{
                background:c.bg, border:`1px solid ${c.border}`,
              }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color:c.color }}>{c.label}</div>
                <div className="text-[28px] font-bold" style={{ color:"#1A2330", lineHeight:1 }}>{c.val}</div>
                <div className="text-[11px] mt-1" style={{ color:c.color }}>
                  {c.label === "전체 알람" ? `처리완료 ${alarms.filter(a=>a.status==="처리완료").length}건` : "처리 필요"}
                </div>
              </div>
            ))}
          </div>

          {/* 검색 필터 */}
          <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl"
            style={{ background:"#fff", border:"1px solid #E2E8F0" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>심각도</span>
              <select style={sel} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                <option>전체</option><option>긴급</option><option>경고</option><option>정보</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>처리 상태</span>
              <select style={sel} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option>전체</option><option>미처리</option><option>처리중</option><option>처리완료</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>현장</span>
              <select style={sel} value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
                <option>전체</option>
                {sites.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>검색</span>
              <div className="relative flex-1" style={{ maxWidth:240 }}>
                <Search size={13} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#94A3B8" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="메시지 / 기기명" style={{ ...sel, width:"100%", paddingLeft:26 }} />
              </div>
              <button style={{ height:30, padding:"0 14px", background:"#0057FF", color:"#fff",
                border:"none", borderRadius:5, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Search
              </button>
            </div>
          </div>

          {/* 목록 상단 */}
          <div className="flex items-center justify-between">
            <div className="text-[13px]" style={{ color:"#5A6A7A" }}>
              Total <strong style={{ color:"#1A2330", fontSize:15 }}>{filtered.length}</strong>
              <span style={{ margin:"0 4px" }}>
                (미처리: <strong style={{ color:"#DC2626" }}>{filtered.filter(a=>a.status==="미처리").length}</strong>&nbsp;
                처리중: <strong style={{ color:"#F59E0B" }}>{filtered.filter(a=>a.status==="처리중").length}</strong>)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select style={sel}><option>10</option><option>20</option><option>40</option></select>
              <button style={{ height:30, padding:"0 10px", background:"#217346", color:"#fff",
                border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer",
                display:"flex", alignItems:"center", gap:4 }}>
                <Download size={12} /> Excel
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:900 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC", borderBottom:"1.5px solid #E2E8F0" }}>
                    <th style={{ width:36, padding:"9px 10px" }}>
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                    </th>
                    {[["#",48],["심각도",72],["유형",80],["알람 내용",null],["현장",90],["기기",90],["발생 시각",130],["경과",72],["처리 상태",90]]
                      .map(([label, w]) => (
                        <th key={label as string} style={{
                          padding:"9px 10px", textAlign:"left",
                          fontSize:11, fontWeight:600, color:"#5A6A7A",
                          whiteSpace:"nowrap", width:w ? w : undefined,
                        }}>{label}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const sv = severityStyle[a.severity]
                    const st = statusStyle[a.status]
                    const SvIcon = sv.icon
                    return (
                      <tr key={a.id}
                        style={{
                          borderBottom:"1px solid #F1F5F9",
                          background: a.severity === "긴급" && a.status === "미처리" ? "#FFFBEB" : "#fff",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="#F8FAFC"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background =
                          a.severity === "긴급" && a.status === "미처리" ? "#FFFBEB" : "#fff"}>
                        <td style={{ padding:"9px 10px", textAlign:"center" }}>
                          <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleOne(a.id)} />
                        </td>
                        <td style={{ padding:"9px 10px", color:"#94A3B8", fontSize:11 }}>#{a.id}</td>
                        <td style={{ padding:"9px 10px" }}>
                          <span style={{
                            display:"inline-flex", alignItems:"center", gap:4,
                            fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:9,
                            background:sv.bg, color:sv.color,
                          }}>
                            <SvIcon size={10} />
                            {a.severity}
                          </span>
                        </td>
                        <td style={{ padding:"9px 10px", color:"#5A6A7A", fontSize:11 }}>{a.type}</td>
                        <td style={{ padding:"9px 10px", color:"#1A2330" }}>{a.message}</td>
                        <td style={{ padding:"9px 10px", color:"#5A6A7A" }}>{a.site}</td>
                        <td style={{ padding:"9px 10px" }}>
                          <span style={{ fontFamily:"monospace", fontSize:11, color:"#1A2330" }}>{a.device}</span>
                        </td>
                        <td style={{ padding:"9px 10px", color:"#5A6A7A", fontSize:11, whiteSpace:"nowrap" }}>{a.time}</td>
                        <td style={{ padding:"9px 10px", color:"#94A3B8", fontSize:11, whiteSpace:"nowrap" }}>{a.elapsed}</td>
                        <td style={{ padding:"9px 10px" }}>
                          <span style={{
                            fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:9,
                            background:st.bg, color:st.color,
                          }}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 하단 */}
          <div className="flex items-center justify-between">
            <button style={{ padding:"6px 14px", border:"1px solid #FCA5A5",
              borderRadius:5, background:"#FFF5F5", color:"#DC2626", fontSize:12,
              fontWeight:600, cursor:"pointer" }}>
              선택 삭제
            </button>
            <div className="flex gap-1">
              {["‹","1","2","3","›"].map((p,i) => (
                <button key={i} style={{
                  width:28, height:28, border:"1px solid #E2E8F0", borderRadius:5,
                  background:p==="1" ? "#0057FF" : "#fff",
                  color:p==="1" ? "#fff" : "#5A6A7A",
                  fontSize:12, cursor:"pointer", fontWeight:p==="1" ? 600 : 400,
                }}>{p}</button>
              ))}
            </div>
            <div style={{ width:100 }} />
          </div>
        </div>
      </main>
    </div>
  )
}
