"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Download, Settings, RefreshCw } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { getMultiDeviceTelemetry } from "@/lib/api/thingsboard"

/* ── 타입 ── */
type DeviceType = "셋탑" | "IP카메라" | "에지PC" | "IoT센서" | "안드로이드"
type Status = "정상" | "경고" | "오프라인" | "오류"

interface Device {
  id: string; name: string; site: string; type: DeviceType
  model: string; mac: string; ip: string; storage: string
  ai: "ON" | "OFF" | "-"; deviceId: string; regDate: string; manager: string
  status: Status
  tbId?: string  // TB Device ID (있으면 실데이터, 없으면 목업)
}

/* ── 모델 맵 ── */
const modelMap: Record<string, string[]> = {
  "전체": [], "셋탑": ["Smart3", "AI-5"],
  "IP카메라": ["SKO-BM2IH-G", "DS-2CD2143G2-I"],
  "에지PC": ["NUC13ANKi5", "BRIX GB-BMPD-6005"],
  "IoT센서": ["TH-Sensor-v1", "Motion-PIR-v2"],
  "안드로이드": ["Galaxy Tab S4", "Galaxy Tab S9", "Pixel Phone 12"],
}

/* ── 기기 목록 (tbId 있는 항목은 TB 실데이터로 상태 갱신) ── */
const DEVICES_DEF: Device[] = [
  // ── 로컬현장 (실제 연결 기기) ──────────────────────────────
  { id:"L1", name:"edge-pc-01",  site:"로컬현장", type:"에지PC",   model:"visionlinux",     mac:"D8:15:66:D0:1A:32", ip:"192.168.0.15",  storage:"-", ai:"ON",  deviceId:"SG-0010004", regDate:"24.12.01", manager:"개발자", status:"정상", tbId:"ecc65ea0-370a-11f1-a479-f7cb8b0c250b" },
  { id:"L2", name:"ipc-cctv1",   site:"로컬현장", type:"IP카메라", model:"TBT-Dome",        mac:"00:12:51:D3:1A:D4", ip:"192.168.0.6",   storage:"-", ai:"ON",  deviceId:"SG-0010005", regDate:"25.01.15", manager:"개발자", status:"정상", tbId:"ecc2dc30-370a-11f1-a479-f7cb8b0c250b" },
  { id:"L3", name:"ipc-cctv2",   site:"로컬현장", type:"IP카메라", model:"TBT-Dome",        mac:"00:12:51:D3:1A:D5", ip:"192.168.0.7",   storage:"-", ai:"ON",  deviceId:"SG-0010006", regDate:"25.01.15", manager:"개발자", status:"정상" },
  { id:"L4", name:"ipc-cctv3",   site:"로컬현장", type:"IP카메라", model:"TBT-Dome",        mac:"00:12:51:D3:1A:D6", ip:"192.168.0.8",   storage:"-", ai:"ON",  deviceId:"SG-0010007", regDate:"25.01.15", manager:"개발자", status:"정상" },
  // ── 기타 현장 (데모) ───────────────────────────────────────
  { id:"4",  name:"stb-02",      site:"서울A현장", type:"셋탑",     model:"AI-5",            mac:"D8:12:66:D0:1A:33", ip:"192.168.1.102", storage:"32GB",  ai:"ON",  deviceId:"SG-0010002", regDate:"25.03.01", manager:"홍*길", status:"정상" },
  { id:"5",  name:"ipc-01",      site:"부산B현장", type:"IP카메라", model:"SKO-BM2IH-G",     mac:"00:12:51:D3:1A:E0", ip:"192.168.2.10",  storage:"-",     ai:"ON",  deviceId:"SG-0010008", regDate:"25.01.15", manager:"김*수", status:"정상" },
  { id:"6",  name:"sensor-01",   site:"인천D현장", type:"IoT센서",  model:"TH-Sensor-v1",    mac:"00:15:66:D0:1A:44", ip:"192.168.4.5",   storage:"-",     ai:"-",   deviceId:"SG-0010009", regDate:"24.11.20", manager:"이*영", status:"정상" },
  { id:"7",  name:"tab-01",      site:"광주E현장", type:"안드로이드",model:"Galaxy Tab S4",  mac:"A4:C2:F0:12:34:56", ip:"192.168.5.20",  storage:"64GB",  ai:"ON",  deviceId:"SG-0010010", regDate:"25.02.10", manager:"박*원", status:"정상" },
  { id:"8",  name:"phone-01",    site:"광주E현장", type:"안드로이드",model:"Pixel Phone 12", mac:"B4:D2:F0:34:56:78", ip:"192.168.5.21",  storage:"128GB", ai:"OFF", deviceId:"SG-0010011", regDate:"25.02.10", manager:"박*원", status:"오프라인" },
]

/* TB 텔레메트리 → Device 상태 변환 */
function telToStatus(tel: Record<string, unknown>): { status: Status; storage: string; ai: "ON"|"OFF"|"-" } {
  const online = tel.online !== false
  if (!online) return { status:"오프라인", storage:"-", ai:"OFF" }
  const cpu = Number(tel.cpu_usage ?? 0)
  const disk = tel.disk_used_gb !== undefined ? `${tel.disk_used_gb}GB` : "-"
  const status: Status = cpu > 80 ? "경고" : "정상"
  return { status, storage: disk, ai: "ON" }
}

/* ── 상태 스타일 ── */
const statusStyle: Record<Status, { bg: string; color: string; dot: string }> = {
  정상:    { bg: "#ECFDF5", color: "#059669", dot: "#059669" },
  경고:    { bg: "#FFFBEB", color: "#D97706", dot: "#D97706" },
  오프라인: { bg: "#F1F5F9", color: "#64748B", dot: "#64748B" },
  오류:    { bg: "#FEF2F2", color: "#DC2626", dot: "#DC2626" },
}

const storageColor = (v: string) =>
  v.includes("⚠") ? "#D97706" : v === "Err" ? "#DC2626" : "inherit"

export default function DevicesPage() {
  const [typeFilter, setTypeFilter] = useState("전체")
  const [modelFilter, setModelFilter] = useState("전체")
  const [aiFilter, setAiFilter] = useState("전체")
  const [storageFilter, setStorageFilter] = useState("전체")
  const [search, setSearch] = useState("")
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [allChecked, setAllChecked] = useState(false)
  const [showModal, setShowModal] = useState(false)

  /* ── TB 텔레메트리 ── */
  const [telMap, setTelMap] = useState<Record<string, Record<string, unknown>>>({})
  const [loading, setLoading] = useState(false)
  const [lastAt, setLastAt] = useState("")

  const fetchTelemetry = useCallback(async () => {
    setLoading(true)
    try {
      const ids: Record<string, string> = {}
      DEVICES_DEF.forEach(d => { if (d.tbId) ids[d.id] = d.tbId })
      const result = await getMultiDeviceTelemetry(ids)
      setTelMap(result)
      setLastAt(new Date().toLocaleTimeString("ko-KR"))
    } catch {
      // 실패 시 기본 상태 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTelemetry()
    const t = setInterval(fetchTelemetry, 30_000)
    return () => clearInterval(t)
  }, [fetchTelemetry])

  /* TB 텔레메트리 병합 */
  const devices: Device[] = DEVICES_DEF.map(d => {
    if (d.tbId && telMap[d.id]) {
      const merged = telToStatus(telMap[d.id])
      return { ...d, ...merged }
    }
    return d
  })

  const filtered = devices.filter((d) => {
    if (typeFilter !== "전체" && d.type !== typeFilter) return false
    if (modelFilter !== "전체" && d.model !== modelFilter) return false
    if (aiFilter !== "전체" && d.ai !== aiFilter) return false
    if (search && !d.name.includes(search) && !d.site.includes(search)) return false
    return true
  })

  const toggleAll = () => {
    if (allChecked) { setChecked(new Set()); setAllChecked(false) }
    else { setChecked(new Set(filtered.map((d) => d.id))); setAllChecked(true) }
  }

  const toggleOne = (id: string) => {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
  }

  const onTypeChange = (v: string) => { setTypeFilter(v); setModelFilter("전체") }

  const sel: React.CSSProperties = {
    height: 30, border: "1px solid #E2E8F0", borderRadius: 5,
    padding: "0 8px", fontSize: 12, color: "#1A2330", background: "#fff",
    outline: "none",
  }

  return (
    <div className="min-h-screen" style={{ background: "#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="Devices" />
      <main style={{ marginLeft: 220, paddingTop: 56 }}>
        <div className="p-5 space-y-4">

          {/* 페이지 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold" style={{ color: "#1A2330" }}>Devices</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#E8F0FF", color: "#0057FF" }}>전체 {devices.length}대</span>
            </div>
            <div className="flex items-center gap-3">
              {lastAt && (
                <span style={{ fontSize:11, color:"#94A3B8" }}>마지막 갱신: {lastAt}</span>
              )}
              <button
                onClick={fetchTelemetry}
                disabled={loading}
                style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"5px 12px", border:"1px solid #E2E8F0",
                  borderRadius:6, background:"#fff", color:"#5A6A7A",
                  fontSize:12, cursor:"pointer", opacity: loading ? 0.6 : 1,
                }}>
                <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                새로고침
              </button>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

          {/* 검색 필터 */}
          <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl"
            style={{ background: "#fff", border: "1px solid #E2E8F0" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color: "#5A6A7A" }}>현장</span>
              <select style={sel}>
                <option>전체</option>
                {["서울A현장","부산B현장","대구C현장","인천D현장","광주E현장"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color: "#5A6A7A" }}>유형</span>
              <select style={sel} value={typeFilter} onChange={(e) => onTypeChange(e.target.value)}>
                {Object.keys(modelMap).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color: "#5A6A7A" }}>모델</span>
              <select style={sel} value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
                <option>전체</option>
                {(modelMap[typeFilter] ?? []).map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color: "#5A6A7A" }}>AI감지</span>
              <select style={sel} value={aiFilter} onChange={(e) => setAiFilter(e.target.value)}>
                <option>전체</option><option>ON</option><option>OFF</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] font-semibold" style={{ color: "#5A6A7A" }}>검색</span>
              <div className="relative flex-1" style={{ maxWidth: 220 }}>
                <Search size={13} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#94A3B8" }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="기기명 / 현장명" style={{ ...sel, width:"100%", paddingLeft:26 }} />
              </div>
              <button style={{ height:30, padding:"0 14px", background:"#0057FF", color:"#fff",
                border:"none", borderRadius:5, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Search
              </button>
            </div>
          </div>

          {/* 목록 상단 */}
          <div className="flex items-center justify-between">
            <div className="text-[13px]" style={{ color: "#5A6A7A" }}>
              Total <strong style={{ color:"#1A2330", fontSize:15 }}>{filtered.length}</strong>
              <span style={{ margin:"0 4px" }}>
                (Online: <strong style={{ color:"#10B981" }}>
                  {filtered.filter(d=>d.status==="정상").length}
                </strong>&nbsp;Offline: <strong style={{ color:"#94A3B8" }}>
                  {filtered.filter(d=>d.status==="오프라인").length}
                </strong>)
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
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:960 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC", borderBottom:"1.5px solid #E2E8F0" }}>
                    {[
                      <th key="ck" style={{ width:36, padding:"9px 10px" }}>
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                      </th>,
                      ...[["Status",72],["유형",80],["모델",110],["기기명 (현장그룹)",null],
                           ["MAC",130],["IP",110],["Storage",76],["AI감지",62],
                           ["기기ID ↑↓",95],["등록일",80],["담당자",68],["설정",64]
                      ].map(([label, w]) => (
                        <th key={label as string} style={{
                          padding:"9px 10px", textAlign:"left",
                          fontSize:11, fontWeight:600, color:"#5A6A7A",
                          whiteSpace:"nowrap", width: w ? w : undefined,
                        }}>{label}</th>
                      ))
                    ]}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const ss = statusStyle[d.status]
                    return (
                      <tr key={d.id} style={{ borderBottom:"1px solid #F1F5F9" }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background="#F8FAFC"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background="#fff"}>
                        <td style={{ padding:"9px 10px", textAlign:"center" }}>
                          <input type="checkbox" checked={checked.has(d.id)}
                            onChange={() => toggleOne(d.id)} />
                        </td>
                        <td style={{ padding:"9px 10px" }}>
                          <span style={{
                            display:"inline-flex", alignItems:"center", gap:4,
                            fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:9,
                            background:ss.bg, color:ss.color,
                          }}>
                            <span style={{ width:6, height:6, borderRadius:"50%", background:ss.dot }} />
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding:"9px 10px", color:"#5A6A7A" }}>{d.type}</td>
                        <td style={{ padding:"9px 10px", color:"#1A2330" }}>{d.model}</td>
                        <td style={{ padding:"9px 10px" }}>
                          <a href="#" style={{ color:"#0057FF", fontWeight:500, textDecoration:"none" }}>
                            {d.name}
                          </a>
                          <span style={{ color:"#94A3B8", marginLeft:4 }}>({d.site})</span>
                        </td>
                        <td style={{ padding:"9px 10px", fontFamily:"monospace", fontSize:11, color:"#5A6A7A" }}>
                          {d.mac}
                        </td>
                        <td style={{ padding:"9px 10px", color:"#1A2330" }}>{d.ip}</td>
                        <td style={{ padding:"9px 10px", fontWeight: d.storage.includes("⚠") || d.storage==="Err" ? 600 : 400,
                          color: storageColor(d.storage) }}>
                          {d.storage}
                        </td>
                        <td style={{ padding:"9px 10px" }}>
                          {d.ai === "-"
                            ? <span style={{ color:"#94A3B8" }}>-</span>
                            : <span style={{
                                fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:3,
                                background: d.ai==="ON" ? "#E8F0FF" : "#F1F5F9",
                                color: d.ai==="ON" ? "#0057FF" : "#94A3B8",
                              }}>{d.ai}</span>
                          }
                        </td>
                        <td style={{ padding:"9px 10px", fontFamily:"monospace", fontSize:11, color:"#94A3B8" }}>
                          {d.deviceId}
                        </td>
                        <td style={{ padding:"9px 10px", color:"#5A6A7A" }}>{d.regDate}</td>
                        <td style={{ padding:"9px 10px", color:"#1A2330" }}>{d.manager}</td>
                        <td style={{ padding:"9px 10px" }}>
                          <button onClick={() => setShowModal(true)}
                            style={{
                              fontSize:11, padding:"4px 9px",
                              border:"1px solid #E2E8F0", borderRadius:5,
                              background:"#fff", color:"#5A6A7A", cursor:"pointer",
                              display:"inline-flex", alignItems:"center", gap:3,
                            }}>
                            <Settings size={11} /> 설정
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 하단 액션 */}
          <div className="flex items-center justify-between">
            <button style={{ padding:"6px 14px", border:"1px solid #FCA5A5",
              borderRadius:5, background:"#FFF5F5", color:"#DC2626", fontSize:12,
              fontWeight:600, cursor:"pointer" }}>
              기기 삭제
            </button>
            <div className="flex gap-1">
              {["‹","1","2","3","4","5","›"].map((p,i) => (
                <button key={i} style={{
                  width:28, height:28, border:"1px solid #E2E8F0", borderRadius:5,
                  background: p==="1" ? "#0057FF" : "#fff",
                  color: p==="1" ? "#fff" : "#5A6A7A",
                  fontSize:12, cursor:"pointer", fontWeight: p==="1" ? 600 : 400,
                }}>{p}</button>
              ))}
            </div>
            <button style={{ padding:"6px 16px", background:"#0057FF", color:"#fff",
              border:"none", borderRadius:5, fontSize:12, fontWeight:600, cursor:"pointer" }}>
              + 기기 등록
            </button>
          </div>
        </div>
      </main>

      {/* 기기 설정 팝업 */}
      {showModal && <DeviceSettingModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

/* ── 기기 설정 팝업 (5탭) ── */
function DeviceSettingModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState(0)
  const tabs = ["기본정보", "카메라", "스토리지", "AI감지", "펌웨어"]

  const overlayStyle: React.CSSProperties = {
    position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:200,
  }
  const modalStyle: React.CSSProperties = {
    background:"#fff", borderRadius:12, width:600, maxWidth:"calc(100vw - 40px)",
    maxHeight:"calc(100vh - 80px)", display:"flex", flexDirection:"column",
    overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* 헤더 */}
        <div style={{ padding:"16px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize:15, fontWeight:700, color:"#1A2330" }}>기기 설정</span>
            <span style={{ fontSize:11, background:"#F1F5F9", color:"#5A6A7A",
              padding:"2px 8px", borderRadius:6 }}>stb-01 (Smart3)</span>
          </div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:"50%",
            background:"#F1F5F9", border:"none", cursor:"pointer", fontSize:13, color:"#5A6A7A" }}>
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div style={{ display:"flex", padding:"0 20px", borderBottom:"1px solid #E2E8F0", marginTop:12 }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{
                padding:"8px 14px", fontSize:12, fontWeight:600, border:"none",
                background:"transparent", cursor:"pointer",
                borderBottom: tab===i ? "2px solid #0057FF" : "2px solid transparent",
                color: tab===i ? "#0057FF" : "#5A6A7A", marginBottom:-1,
              }}>{t}</button>
          ))}
        </div>

        {/* 탭 내용 */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {tab === 0 && <TabBasicInfo />}
          {tab === 1 && <TabCamera />}
          {tab === 2 && <TabStorage />}
          {tab === 3 && <TabAI />}
          {tab === 4 && <TabFirmware />}
        </div>

        {/* 푸터 */}
        <div style={{ padding:"12px 20px", borderTop:"1px solid #E2E8F0",
          display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button onClick={onClose} style={{ padding:"7px 16px", border:"1px solid #E2E8F0",
            borderRadius:5, background:"#fff", color:"#5A6A7A", fontSize:13, cursor:"pointer" }}>
            닫기
          </button>
          <button style={{ padding:"7px 20px", background:"#0057FF", color:"#fff",
            border:"none", borderRadius:5, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 탭 컴포넌트들 ── */
const VRow = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <tr style={{ borderBottom:"1px solid #F1F5F9" }}>
    <th style={{ width:"32%", padding:"9px 10px", background:"#F8FAFC",
      fontSize:11, fontWeight:600, color:"#5A6A7A", textAlign:"left", verticalAlign:"middle" }}>
      {label}{required && <span style={{ color:"#EF4444" }}> *</span>}
    </th>
    <td style={{ padding:"9px 10px", fontSize:12, color:"#1A2330", verticalAlign:"middle" }}>
      {children}
    </td>
  </tr>
)

const inputStyle: React.CSSProperties = {
  width:"100%", height:30, border:"1px solid #E2E8F0", borderRadius:5,
  padding:"0 8px", fontSize:12, color:"#1A2330", outline:"none",
}
const roStyle: React.CSSProperties = { ...inputStyle, background:"#F8FAFC", color:"#94A3B8" }

function TabBasicInfo() {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <tbody>
        <VRow label="기기명" required><input defaultValue="stb-01" style={inputStyle} /></VRow>
        <VRow label="유형"><input defaultValue="셋탑" readOnly style={roStyle} /></VRow>
        <VRow label="모델"><input defaultValue="Smart3" readOnly style={roStyle} /></VRow>
        <VRow label="제조사"><input defaultValue="Vision Hitech" readOnly style={roStyle} /></VRow>
        <VRow label="현장그룹"><input defaultValue="서울A현장" readOnly style={roStyle} /></VRow>
        <VRow label="기기ID"><input defaultValue="SG-0010001" readOnly style={roStyle} /></VRow>
        <VRow label="MAC 주소"><input defaultValue="D8:12:66:D0:1A:32" readOnly style={roStyle} /></VRow>
        <VRow label="IP 주소"><input defaultValue="192.168.1.101" readOnly style={roStyle} /></VRow>
        <VRow label="등록일"><input defaultValue="2025.03.01" readOnly style={roStyle} /></VRow>
        <VRow label="담당자"><input defaultValue="홍길동" readOnly style={roStyle} /></VRow>
      </tbody>
    </table>
  )
}

function TabCamera() {
  const [camType, setCamType] = useState<"usb"|"ip">("usb")
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <tbody>
        <VRow label="카메라 유형">
          <div style={{ display:"flex", gap:16 }}>
            {(["usb","ip"] as const).map((t) => (
              <label key={t} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, cursor:"pointer" }}>
                <input type="radio" name="camType" checked={camType===t} onChange={() => setCamType(t)} />
                {t === "usb" ? "USB 카메라 (기본)" : "IP 카메라 (대체)"}
              </label>
            ))}
          </div>
        </VRow>
        <VRow label="연결 상태">
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600,
            padding:"2px 7px", borderRadius:9, background:"#ECFDF5", color:"#059669" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#059669" }} /> 연결됨
          </span>
        </VRow>
        <VRow label="해상도"><input defaultValue="1920×1080 (FHD)" readOnly style={roStyle} /></VRow>
        <VRow label="프레임"><input defaultValue="25fps" readOnly style={roStyle} /></VRow>
      </tbody>
    </table>
  )
}

function TabStorage() {
  const pct = 37
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <tbody>
        <VRow label="스토리지 유형"><span style={{ fontSize:12 }}>내장 스토리지 (SD카드 없음)</span></VRow>
        <VRow label="사용 현황">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, height:8, background:"#E2E8F0", borderRadius:4, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:"#0057FF", borderRadius:4 }} />
            </div>
            <span style={{ fontSize:12, color:"#5A6A7A", whiteSpace:"nowrap" }}>12GB / 32GB ({pct}%)</span>
          </div>
        </VRow>
        <VRow label="관리">
          <button style={{ fontSize:11, padding:"4px 10px", border:"1px solid #FCA5A5",
            borderRadius:5, background:"#FFF5F5", color:"#DC2626", cursor:"pointer" }}>포맷</button>
        </VRow>
      </tbody>
    </table>
  )
}

function TabAI() {
  const [aiOn, setAiOn] = useState(true)
  const [targets, setTargets] = useState({ 사람:true, 차량:true, 동물:false })
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <tbody>
        <VRow label="AI 감지 모드">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div onClick={() => setAiOn(v => !v)} style={{
              width:36, height:20, borderRadius:10, background: aiOn ? "#0057FF" : "#CBD5E1",
              position:"relative", cursor:"pointer", transition:"background 0.2s",
            }}>
              <div style={{
                width:14, height:14, borderRadius:"50%", background:"#fff",
                position:"absolute", top:3, left: aiOn ? 19 : 3, transition:"left 0.2s",
                boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
            <span style={{ fontSize:12, color:"#5A6A7A" }}>{aiOn ? "ON" : "OFF"}</span>
          </div>
        </VRow>
        <VRow label="감지 대상">
          <div style={{ display:"flex", gap:14 }}>
            {(Object.keys(targets) as Array<keyof typeof targets>).map(k => (
              <label key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, cursor:"pointer" }}>
                <input type="checkbox" checked={targets[k]}
                  onChange={() => setTargets(v => ({ ...v, [k]: !v[k] }))} />
                {k}
              </label>
            ))}
          </div>
        </VRow>
        <VRow label="감지 시간">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input defaultValue="00:00" style={{ ...inputStyle, width:70 }} />
            <span style={{ color:"#5A6A7A", fontSize:12 }}>~</span>
            <input defaultValue="24:00" style={{ ...inputStyle, width:70 }} />
          </div>
        </VRow>
        <VRow label="민감도">
          <input type="range" min={1} max={5} defaultValue={3} style={{ width:120 }} />
          <span style={{ fontSize:12, color:"#5A6A7A", marginLeft:8 }}>중간 (3)</span>
        </VRow>
      </tbody>
    </table>
  )
}

function TabFirmware() {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <tbody>
        <VRow label="OS 유형"><span style={{ fontSize:12 }}>Android (APK)</span></VRow>
        <VRow label="현재 버전"><span style={{ fontSize:12, fontWeight:600 }}>v1.2.1</span></VRow>
        <VRow label="최신 버전">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:12, color:"#D97706", fontWeight:600 }}>v1.3.0 업데이트 가능</span>
            <button style={{ fontSize:11, padding:"4px 10px", border:"1px solid #93C5FD",
              borderRadius:5, background:"#E8F0FF", color:"#0057FF", cursor:"pointer" }}>업데이트</button>
          </div>
        </VRow>
        <VRow label="최종 업데이트"><span style={{ fontSize:12 }}>2025.04.01</span></VRow>
        <VRow label="업데이트 내역">
          <span style={{ fontSize:11, color:"#5A6A7A" }}>AI감지 성능 개선, 메모리 최적화</span>
        </VRow>
      </tbody>
    </table>
  )
}
