"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

/* ── localStorage 키 ── */
const STORAGE_KEY = "siteguard_display_settings"

interface DisplaySettings {
  fontSize: "small" | "medium" | "large"
  rowDensity: "compact" | "normal" | "relaxed"
}

const defaults: DisplaySettings = { fontSize: "medium", rowDensity: "normal" }
const fontMap = { small: "12px", medium: "14px", large: "16px" }
const rowMap  = { compact: "32px", normal: "44px", relaxed: "56px" }

const widgetPalette = [
  { id:"device-stat",   icon:"📡", name:"기기 현황",    desc:"Online/Offline" },
  { id:"site-stat",     icon:"🏢", name:"현장 현황",    desc:"정상/이상 수" },
  { id:"alarm-summary", icon:"🔔", name:"알람 요약",    desc:"긴급/경고/정보" },
  { id:"ai-events",     icon:"🤖", name:"AI 감지",     desc:"이벤트 수" },
  { id:"trend-chart",   icon:"📊", name:"추이 차트",    desc:"7일 온라인" },
  { id:"site-status",   icon:"📍", name:"현장 상태",    desc:"현장별 목록" },
  { id:"camera-thumb",  icon:"📷", name:"카메라 미니뷰",desc:"라이브 썸네일" },
  { id:"recent-alarms", icon:"⚠️", name:"최근 알람",    desc:"최신 목록" },
  { id:"storage",       icon:"💾", name:"스토리지 현황", desc:"디스크 사용률" },
  { id:"timeline",      icon:"⏱️", name:"이벤트 타임라인",desc:"시계열 로그" },
  { id:"type-dist",     icon:"🥧", name:"유형 분포",    desc:"파이 차트" },
  { id:"firmware",      icon:"🔧", name:"펌웨어 현황",  desc:"업데이트 필요" },
]

const defaultActive = widgetPalette.slice(0, 8).map(w => w.id)

const allColumns = [
  { key:"status",   label:"Status",         required:true,  width:"80px"  },
  { key:"type",     label:"유형",           required:true,  width:"90px"  },
  { key:"model",    label:"모델",           required:false, width:"120px" },
  { key:"name",     label:"기기명 (현장그룹)", required:true,  width:"auto"  },
  { key:"mac",      label:"MAC",            required:false, width:"140px" },
  { key:"ip",       label:"IP",             required:false, width:"120px" },
  { key:"storage",  label:"Storage",        required:false, width:"80px"  },
  { key:"ai",       label:"AI감지",         required:false, width:"70px"  },
  { key:"deviceId", label:"기기ID",         required:false, width:"110px" },
  { key:"regDate",  label:"등록일",         required:false, width:"90px"  },
  { key:"manager",  label:"담당자",         required:false, width:"80px"  },
  { key:"settings", label:"설정",           required:true,  width:"70px"  },
]

export default function DisplaySettingsPage() {
  const [tab, setTab] = useState(0)
  const [settings, setSettings] = useState<DisplaySettings>(defaults)
  const [activeWidgets, setActiveWidgets] = useState<string[]>(defaultActive)
  const [colVisible, setColVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(allColumns.map(c => [c.key, c.key !== "deviceId"]))
  )
  const [saved, setSaved] = useState(false)

  /* 마운트 시 localStorage 로드 */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.fontSize)    setSettings(s => ({ ...s, fontSize: parsed.fontSize }))
        if (parsed.rowDensity)  setSettings(s => ({ ...s, rowDensity: parsed.rowDensity }))
        if (parsed.activeWidgets) setActiveWidgets(parsed.activeWidgets)
        if (parsed.colVisible)  setColVisible(parsed.colVisible)
      }
    } catch {}
  }, [])

  /* CSS 변수 즉시 적용 */
  const applyFont = (v: "small"|"medium"|"large") => {
    setSettings(s => ({ ...s, fontSize: v }))
    document.documentElement.style.setProperty("--sg-font-base", fontMap[v])
  }
  const applyDensity = (v: "compact"|"normal"|"relaxed") => {
    setSettings(s => ({ ...s, rowDensity: v }))
    document.documentElement.style.setProperty("--sg-row-height", rowMap[v])
  }

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, activeWidgets, colVisible }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = ["폰트 & 밀도", "대시보드 위젯", "기기 목록 컬럼"]
  const seg = (v: string, cur: string, set: (v: any) => void, label: string) => (
    <button key={v} onClick={() => set(v)} style={{
      flex:1, padding:"7px 0", textAlign:"center", fontSize:12, fontWeight:500,
      border:"0.5px solid #E2E8F0",
      borderRadius: v === Object.keys(fontMap)[0] || v === "compact" ? "5px 0 0 5px"
        : v === Object.keys(fontMap)[2] || v === "relaxed" ? "0 5px 5px 0" : 0,
      marginLeft: v === Object.keys(fontMap)[0] || v === "compact" ? 0 : -1,
      background: cur === v ? "#0057FF" : "#fff",
      color: cur === v ? "#fff" : "#5A6A7A",
      cursor:"pointer", zIndex: cur===v ? 1 : 0, position:"relative",
    }}>{label}</button>
  )

  return (
    <div className="min-h-screen" style={{ background:"#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="Settings — Display" />
      <main style={{ marginLeft:220, paddingTop:56 }}>
        <div className="p-5 space-y-4">

          {/* 헤더 */}
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-bold" style={{ color:"#1A2330" }}>Display Settings</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background:"#E8F0FF", color:"#0057FF" }}>관리자 전용</span>
          </div>

          {/* 탭 */}
          <div style={{ display:"flex", borderBottom:"1px solid #E2E8F0" }}>
            {tabs.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                style={{
                  padding:"9px 20px", fontSize:13, fontWeight:500, border:"none",
                  background:"transparent", cursor:"pointer", marginBottom:-1,
                  borderBottom: tab===i ? "2px solid #0057FF" : "2px solid transparent",
                  color: tab===i ? "#0057FF" : "#5A6A7A",
                }}>{t}</button>
            ))}
          </div>

          {/* ── 탭 1: 폰트 & 밀도 ── */}
          {tab === 0 && (
            <div className="space-y-4">
              <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A2330", marginBottom:4 }}>폰트 크기</div>
                <div style={{ fontSize:11, color:"#94A3B8", marginBottom:12 }}>전체 UI에 적용됩니다</div>
                <div style={{ display:"flex" }}>
                  {seg("small", settings.fontSize, applyFont, "소 (12px)")}
                  {seg("medium", settings.fontSize, applyFont, "중 (14px)")}
                  {seg("large", settings.fontSize, applyFont, "대 (16px)")}
                </div>
                {/* 미리보기 */}
                <div style={{ marginTop:12, background:"#F8FAFC", border:"1px solid #E2E8F0",
                  borderRadius:6, padding:"10px 12px",
                  fontSize: fontMap[settings.fontSize], transition:"font-size 0.2s" }}>
                  <div style={{ fontWeight:600, color:"#1A2330", marginBottom:4 }}>
                    기기 목록 — stb-01 (서울A현장)
                  </div>
                  <div style={{ color:"#5A6A7A" }}>
                    IP: 192.168.1.101 &nbsp;|&nbsp; Storage: 12GB &nbsp;|&nbsp; 등록일: 25.03.01
                  </div>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:6,
                    fontSize:"0.85em", fontWeight:600, padding:"2px 7px", borderRadius:9,
                    background:"#ECFDF5", color:"#059669" }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#059669" }} />정상
                  </span>
                </div>
              </div>

              <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A2330", marginBottom:4 }}>테이블 행 밀도</div>
                <div style={{ fontSize:11, color:"#94A3B8", marginBottom:12 }}>목록 화면의 행 높이를 조정합니다</div>
                <div style={{ display:"flex" }}>
                  {seg("compact", settings.rowDensity, applyDensity, "Compact")}
                  {seg("normal",  settings.rowDensity, applyDensity, "Normal")}
                  {seg("relaxed", settings.rowDensity, applyDensity, "Relaxed")}
                </div>
                {/* 밀도 미리보기 */}
                <div style={{ marginTop:12, border:"1px solid #E2E8F0", borderRadius:6, overflow:"hidden" }}>
                  {[
                    { dot:"#10B981", name:"stb-01 (서울A현장)", model:"Smart3" },
                    { dot:"#F59E0B", name:"edge-01 (대구C현장)", model:"NUC13ANKi5" },
                    { dot:"#94A3B8", name:"phone-01 (광주E현장)", model:"Pixel Phone 12" },
                  ].map((r, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:8,
                      padding:`0 12px`,
                      height: rowMap[settings.rowDensity],
                      borderBottom: i < 2 ? "1px solid #F1F5F9" : "none",
                      fontSize:12, transition:"height 0.2s",
                    }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:r.dot, flexShrink:0 }} />
                      <span style={{ flex:1, color:"#1A2330", fontWeight:500 }}>{r.name}</span>
                      <span style={{ color:"#94A3B8", fontSize:11 }}>{r.model}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 탭 2: 대시보드 위젯 ── */}
          {tab === 1 && (
            <div className="space-y-4">
              <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A2330", marginBottom:4 }}>사용 가능한 위젯</div>
                <div style={{ fontSize:11, color:"#94A3B8", marginBottom:12 }}>클릭하여 추가/제거</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {widgetPalette.map((w) => {
                    const active = activeWidgets.includes(w.id)
                    return (
                      <div key={w.id} onClick={() => setActiveWidgets(prev =>
                        active ? prev.filter(id => id !== w.id) : [...prev, w.id]
                      )} style={{
                        background: active ? "#EFF6FF" : "#F8FAFC",
                        border: `1px solid ${active ? "#0057FF" : "#E2E8F0"}`,
                        borderRadius:8, padding:"10px 12px", cursor:"pointer",
                        position:"relative", transition:"all 0.15s",
                      }}>
                        {active && <span style={{ position:"absolute", top:5, right:8,
                          fontSize:10, color:"#0057FF", fontWeight:700 }}>✓</span>}
                        <div style={{ fontSize:16, marginBottom:4 }}>{w.icon}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:"#1A2330" }}>{w.name}</div>
                        <div style={{ fontSize:10, color:"#94A3B8" }}>{w.desc}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A2330", marginBottom:12 }}>활성 위젯 목록</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {activeWidgets.map((id) => {
                    const w = widgetPalette.find(p => p.id === id)!
                    if (!w) return null
                    return (
                      <div key={id} style={{ display:"flex", alignItems:"center", gap:10,
                        padding:"9px 12px", background:"#F8FAFC",
                        border:"1px solid #E2E8F0", borderRadius:7 }}>
                        <span style={{ color:"#94A3B8", cursor:"grab", fontSize:14 }}>⠿</span>
                        <span style={{ fontSize:14 }}>{w.icon}</span>
                        <span style={{ flex:1, fontSize:12, fontWeight:500, color:"#1A2330" }}>{w.name}</span>
                        <select style={{ height:24, border:"1px solid #E2E8F0", borderRadius:4,
                          padding:"0 4px", fontSize:11, color:"#5A6A7A", background:"#fff", outline:"none" }}>
                          <option>소 (3칸)</option><option>중 (6칸)</option><option>대 (12칸)</option>
                        </select>
                        <button onClick={() => setActiveWidgets(p => p.filter(x => x !== id))}
                          style={{ width:18, height:18, borderRadius:"50%", background:"#FEE2E2",
                            color:"#DC2626", border:"none", fontSize:10, cursor:"pointer",
                            display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── 탭 3: 기기 목록 컬럼 ── */}
          {tab === 2 && (
            <div className="space-y-4">
              <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A2330", marginBottom:4 }}>컬럼 표시 & 순서</div>
                <div style={{ fontSize:11, color:"#94A3B8", marginBottom:12 }}>
                  토글로 표시/숨김 · 필수 컬럼은 변경 불가
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {allColumns.map((col) => (
                    <div key={col.key} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"8px 12px", background:"#F8FAFC",
                      border:"1px solid #E2E8F0", borderRadius:6 }}>
                      <span style={{ color:"#94A3B8", cursor:"grab", fontSize:13 }}>⠿</span>
                      <span style={{ flex:1, fontSize:12, fontWeight:500, color:"#1A2330" }}>{col.label}</span>
                      {col.required && (
                        <span style={{ fontSize:9, color:"#94A3B8", background:"#F1F5F9",
                          padding:"1px 6px", borderRadius:6 }}>필수</span>
                      )}
                      <input defaultValue={col.width} style={{ width:60, height:22,
                        border:"1px solid #E2E8F0", borderRadius:4, padding:"0 6px",
                        fontSize:11, color:"#5A6A7A", background:"#fff", outline:"none" }} />
                      {/* 토글 */}
                      <div onClick={() => !col.required && setColVisible(v => ({ ...v, [col.key]: !v[col.key] }))}
                        style={{
                          width:30, height:17, borderRadius:9,
                          background: colVisible[col.key] ? "#0057FF" : "#CBD5E1",
                          position:"relative", cursor: col.required ? "not-allowed" : "pointer",
                          opacity: col.required ? 0.5 : 1, flexShrink:0, transition:"background 0.2s",
                        }}>
                        <div style={{
                          width:13, height:13, borderRadius:"50%", background:"#fff",
                          position:"absolute", top:2,
                          left: colVisible[col.key] ? 15 : 2,
                          transition:"left 0.2s",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 미리보기 */}
              <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"16px 18px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1A2330", marginBottom:10 }}>실시간 미리보기</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#F8FAFC", borderBottom:"1px solid #E2E8F0" }}>
                        {allColumns.filter(c => colVisible[c.key]).map(c => (
                          <th key={c.key} style={{ padding:"6px 8px", textAlign:"left",
                            fontSize:10, fontWeight:600, color:"#5A6A7A", whiteSpace:"nowrap" }}>
                            {c.label}
                          </th>
                        ))}
                        <th style={{ padding:"6px 8px", textAlign:"left", fontSize:10,
                          fontWeight:600, color:"#5A6A7A" }}>설정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { status:"정상", type:"셋탑", model:"Smart3", name:"stb-01 (서울A)", mac:"D8:12:66:D0:1A:32", ip:"192.168.1.101", storage:"12GB", ai:"ON", deviceId:"SG-0010001", regDate:"25.03.01", manager:"홍*길" },
                        { status:"경고", type:"에지PC", model:"NUC13ANKi5", name:"edge-01 (대구C)", mac:"D8:15:66:D0:1A:32", ip:"192.168.3.1", storage:"320GB", ai:"ON", deviceId:"SG-0010004", regDate:"24.12.01", manager:"이*영" },
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom:"1px solid #F1F5F9" }}>
                          {allColumns.filter(c => colVisible[c.key]).map(c => (
                            <td key={c.key} style={{ padding:"6px 8px", color:"#1A2330" }}>
                              {c.key === "status"
                                ? <span style={{ fontSize:10, fontWeight:600, padding:"1px 5px", borderRadius:8,
                                    background: row.status==="정상" ? "#ECFDF5" : "#FFFBEB",
                                    color: row.status==="정상" ? "#059669" : "#D97706" }}>{row.status}</span>
                                : c.key === "ai"
                                  ? <span style={{ fontSize:10, fontWeight:700,
                                      color: (row as any)[c.key]==="ON" ? "#0057FF" : "#94A3B8" }}>{(row as any)[c.key]}</span>
                                  : (row as any)[c.key]
                              }
                            </td>
                          ))}
                          <td style={{ padding:"6px 8px" }}>
                            <button style={{ fontSize:10, padding:"2px 7px", border:"1px solid #E2E8F0",
                              borderRadius:4, background:"#fff", color:"#5A6A7A", cursor:"pointer" }}>⚙</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 저장 바 */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, paddingTop:8 }}>
            <button style={{ padding:"8px 16px", border:"1px solid #E2E8F0", borderRadius:5,
              background:"#fff", color:"#5A6A7A", fontSize:13, cursor:"pointer" }}>취소</button>
            <button onClick={save}
              style={{ padding:"8px 20px", background: saved ? "#10B981" : "#0057FF",
                color:"#fff", border:"none", borderRadius:5, fontSize:13,
                fontWeight:600, cursor:"pointer", transition:"background 0.3s" }}>
              {saved ? "✓ 저장됨" : "설정 저장"}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
