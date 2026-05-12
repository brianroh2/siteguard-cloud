"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { getMultiDeviceTelemetry } from "@/lib/api/thingsboard"
import { RefreshCw, Wifi, WifiOff, Cpu, HardDrive, Camera } from "lucide-react"

const GO2RTC = process.env.NEXT_PUBLIC_GO2RTC_URL || "http://46.62.155.122:1984"

/* ── 현장 + 기기 구성 정의 ─────────────────────────────────── */
const SITES = [
  {
    id: "site-local",
    name: "로컬현장",
    location: "visionlinux (개발서버)",
    manager: "개발자",
    devices: [
      { key: "L1", tbId: "ecc65ea0-370a-11f1-a479-f7cb8b0c250b", type: "EDG", label: "edge-pc-01", cameras: ["cctv_1","cctv_2","cctv_3"] },
      { key: "L2", tbId: "ecc2dc30-370a-11f1-a479-f7cb8b0c250b", type: "IPC", label: "ipc-cctv1",  cameras: ["cctv_1"] },
      { key: "L3", tbId: "",                                       type: "IPC", label: "ipc-cctv2",  cameras: ["cctv_2"] },
      { key: "L4", tbId: "",                                       type: "IPC", label: "ipc-cctv3",  cameras: ["cctv_3"] },
    ],
  },
]

/* ── 타입 ── */
type Telemetry = Record<string, string | number | boolean>
type TelMap = Record<string, Telemetry>

/* ── 유형 색상 ── */
const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  EDG: { bg: "#EFF6FF", color: "#2563EB" },
  STB: { bg: "#F5F3FF", color: "#7C3AED" },
  IPC: { bg: "#F0FDF4", color: "#16A34A" },
  IOT: { bg: "#FFFBEB", color: "#D97706" },
  AND: { bg: "#FFF1F2", color: "#E11D48" },
}

/* ── 카메라 썸네일 ── */
function CameraThumb({ streamId }: { streamId: string }) {
  const [ts, setTs] = useState(Date.now())
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTs(Date.now()), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: "relative", aspectRatio: "16/9", borderRadius: 6,
      overflow: "hidden", background: "#0A1628",
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      {ok ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`${GO2RTC}/api/frame.jpeg?src=${streamId}&ts=${ts}`}
          alt={streamId}
          onError={() => setOk(false)}
          onLoad={() => setOk(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ width:"100%", height:"100%", display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
          <Camera size={16} style={{ color:"rgba(255,255,255,0.2)" }} />
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)" }}>연결 없음</span>
        </div>
      )}
      {/* 스트림명 라벨 */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        padding:"4px 6px",
        background:"linear-gradient(transparent,rgba(0,0,0,0.7))",
        fontSize:9, color:"rgba(255,255,255,0.7)", fontWeight:600,
      }}>
        {ok && <span style={{ color:"#EF4444", marginRight:4 }}>●</span>}
        {streamId}
      </div>
    </div>
  )
}

/* ── 기기 카드 ── */
function DeviceCard({ device, tel }: {
  device: typeof SITES[0]["devices"][0]
  tel: Telemetry
}) {
  const online  = tel?.online !== false
  const ts      = TYPE_STYLE[device.type] ?? { bg:"#F1F5F9", color:"#64748B" }

  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{
            fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:4,
            background:ts.bg, color:ts.color,
          }}>{device.type}</span>
          <span style={{ fontSize:13, fontWeight:600, color:"#1A2330" }}>{device.label}</span>
        </div>
        <span style={{
          display:"inline-flex", alignItems:"center", gap:4,
          fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:9,
          background: online ? "#ECFDF5" : "#F1F5F9",
          color:       online ? "#059669" : "#64748B",
        }}>
          {online
            ? <Wifi size={11} />
            : <WifiOff size={11} />}
          {online ? "온라인" : "오프라인"}
        </span>
      </div>

      {/* 텔레메트리 수치 */}
      {online && (
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          {tel.cpu_usage !== undefined && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Cpu size={12} style={{ color:"#94A3B8" }} />
              <span style={{ fontSize:12, color:"#5A6A7A" }}>CPU</span>
              <strong style={{
                fontSize:13, color: Number(tel.cpu_usage) > 80 ? "#DC2626" : "#1A2330"
              }}>{tel.cpu_usage}%</strong>
            </div>
          )}
          {tel.disk_used_gb !== undefined && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <HardDrive size={12} style={{ color:"#94A3B8" }} />
              <span style={{ fontSize:12, color:"#5A6A7A" }}>저장</span>
              <strong style={{ fontSize:13, color:"#1A2330" }}>{tel.disk_used_gb}GB</strong>
            </div>
          )}
          {tel.cameras_online !== undefined && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Camera size={12} style={{ color:"#94A3B8" }} />
              <span style={{ fontSize:12, color:"#5A6A7A" }}>카메라</span>
              <strong style={{ fontSize:13, color:"#1A2330" }}>{tel.cameras_online}대</strong>
            </div>
          )}
          {tel.detect_events_today !== undefined && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:12, color:"#5A6A7A" }}>AI감지</span>
              <strong style={{ fontSize:13, color:"#0057FF" }}>{tel.detect_events_today}건</strong>
            </div>
          )}
          {tel.fps !== undefined && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:12, color:"#5A6A7A" }}>FPS</span>
              <strong style={{ fontSize:13, color:"#1A2330" }}>{tel.fps}</strong>
            </div>
          )}
          {tel.stream_active !== undefined && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:3,
                background: tel.stream_active ? "#E8F0FF" : "#F1F5F9",
                color:      tel.stream_active ? "#0057FF" : "#94A3B8",
              }}>
                {tel.stream_active ? "스트리밍 중" : "대기"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 카메라 썸네일 */}
      {online && device.cameras.length > 0 && (
        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(${Math.min(device.cameras.length, 3)}, 1fr)`,
          gap:6,
        }}>
          {device.cameras.map(cam => (
            <CameraThumb key={cam} streamId={cam} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 현장 카드 ── */
function SiteSection({ site, telMap }: {
  site: typeof SITES[0]
  telMap: TelMap
}) {
  const onlineCount = site.devices.filter(d => telMap[d.key]?.online !== false).length

  return (
    <div style={{
      background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:12, padding:16,
      display:"flex", flexDirection:"column", gap:12,
    }}>
      {/* 현장 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:15, fontWeight:700, color:"#1A2330" }}>{site.name}</span>
            <span style={{
              fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:9,
              background: onlineCount === site.devices.length ? "#ECFDF5" : "#FFFBEB",
              color:      onlineCount === site.devices.length ? "#059669" : "#D97706",
            }}>
              {onlineCount}/{site.devices.length}대 온라인
            </span>
          </div>
          <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{site.location}</div>
        </div>
        <div style={{ fontSize:11, color:"#94A3B8" }}>담당: {site.manager}</div>
      </div>

      {/* 기기 카드 목록 */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {site.devices.map(dev => (
          <DeviceCard key={dev.key} device={dev} tel={telMap[dev.key] ?? {}} />
        ))}
      </div>
    </div>
  )
}

/* ── 메인 페이지 ── */
export default function DeviceGroupsPage() {
  const [telMap, setTelMap]   = useState<TelMap>({})
  const [loading, setLoading] = useState(true)
  const [lastAt, setLastAt]   = useState("")
  const [error, setError]     = useState("")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const ids: Record<string, string> = {}
      SITES.forEach(s => s.devices.forEach(d => { if (d.tbId) ids[d.key] = d.tbId }))
      const result = await getMultiDeviceTelemetry(ids)
      setTelMap(result)
      setLastAt(new Date().toLocaleTimeString("ko-KR"))
    } catch (e) {
      setError("TB 연결 실패 — 목업 데이터로 표시합니다")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const t = setInterval(fetchAll, 30_000) // 30초마다 갱신
    return () => clearInterval(t)
  }, [fetchAll])

  return (
    <div className="min-h-screen" style={{ background:"#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="Device Groups" />
      <main style={{ marginLeft:220, paddingTop:56 }}>
        <div className="p-5 space-y-4">

          {/* 페이지 헤더 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:"#1A2330" }}>Device Groups</h1>
              <span style={{
                fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:9,
                background:"#E8F0FF", color:"#0057FF",
              }}>{SITES.length}개 현장</span>
              {error && (
                <span style={{
                  fontSize:11, padding:"2px 8px", borderRadius:9,
                  background:"#FFFBEB", color:"#D97706",
                }}>⚠ {error}</span>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {lastAt && (
                <span style={{ fontSize:11, color:"#94A3B8" }}>마지막 갱신: {lastAt}</span>
              )}
              <button
                onClick={fetchAll}
                disabled={loading}
                style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"6px 12px", border:"1px solid #E2E8F0",
                  borderRadius:6, background:"#fff", color:"#5A6A7A",
                  fontSize:12, cursor:"pointer",
                  opacity: loading ? 0.6 : 1,
                }}>
                <RefreshCw size={12} style={{
                  animation: loading ? "spin 1s linear infinite" : "none"
                }} />
                새로고침
              </button>
            </div>
          </div>

          {/* CSS 애니메이션 */}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

          {/* 현장 섹션들 */}
          {loading && Object.keys(telMap).length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94A3B8" }}>
              TB 데이터 불러오는 중...
            </div>
          ) : (
            SITES.map(site => (
              <SiteSection key={site.id} site={site} telMap={telMap} />
            ))
          )}

        </div>
      </main>
    </div>
  )
}
