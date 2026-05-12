"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

const GO2RTC = process.env.NEXT_PUBLIC_GO2RTC_URL || "http://46.62.155.122:1984"

/* 실제 go2rtc 스트림 목록 */
const cameras = [
  { id:"cctv_1", name:"cctv_1", site:"로컬현장", label:"카메라 1" },
  { id:"cctv_2", name:"cctv_2", site:"로컬현장", label:"카메라 2" },
  { id:"cctv_3", name:"cctv_3", site:"로컬현장", label:"카메라 3" },
]

/* go2rtc JPEG 스냅샷을 일정 간격으로 갱신하는 카메라 셀 */
function CameraCell({ cam, refreshMs = 2000 }: {
  cam: typeof cameras[0]; refreshMs?: number
}) {
  const [ts, setTs] = useState(Date.now())
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTs(Date.now()), refreshMs)
    return () => clearInterval(t)
  }, [refreshMs])

  const src = `${GO2RTC}/api/frame.jpeg?src=${cam.id}&ts=${ts}`

  return (
    <div style={{
      background:"#0A1628", borderRadius:10, position:"relative",
      aspectRatio:"16/9", overflow:"hidden", cursor:"pointer",
      border:"1.5px solid rgba(255,255,255,0.06)", transition:"border-color 0.15s",
    }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor="#0057FF"}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.06)"}>

      {/* 스캔라인 텍스처 */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none", zIndex:2,
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.012) 3px,rgba(255,255,255,0.012) 6px)",
      }}/>

      {/* 실제 카메라 스냅샷 */}
      {online ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={cam.label}
          onError={() => setOnline(false)}
          onLoad={() => setOnline(true)}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
        />
      ) : (
        <div style={{
          position:"absolute", inset:0,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6,
        }}>
          <svg viewBox="0 -960 960 960" width="28" height="28" fill="rgba(255,255,255,0.25)">
            <path d="M880-260 720-420v67l-80-80v-287H160v480h480v-80l80 80h67l160 160-67 67L800-213v67H120q-33 0-56.5-23.5T40-226v-508q0-33 23.5-56.5T120-814h560q33 0 56.5 23.5T760-734v67l160-160 67 67-107 107v393Z"/>
          </svg>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>연결 없음</span>
        </div>
      )}

      {/* 상단 오버레이 */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, zIndex:3,
        padding:"8px 10px",
        background:"linear-gradient(rgba(0,0,0,0.6),transparent)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <span style={{ fontSize:11, fontWeight:600, color:"#fff" }}>
          {cam.label} · {cam.site}
        </span>
        {online && (
          <span style={{
            fontSize:9, fontWeight:800, color:"#fff", letterSpacing:0.5,
            background:"#EF4444", padding:"1px 5px", borderRadius:3,
          }}>LIVE</span>
        )}
        {!online && (
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>오프라인</span>
        )}
      </div>

      {/* 하단 오버레이 */}
      {online && (
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, zIndex:3,
          padding:"8px 10px",
          background:"linear-gradient(transparent,rgba(0,0,0,0.7))",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>
            {cam.id} · {(refreshMs/1000).toFixed(0)}s 갱신
          </span>
        </div>
      )}
    </div>
  )
}

export default function CameraPage() {
  const [grid, setGrid] = useState<1|2|3>(2)
  const count = grid * grid
  const visible = cameras.slice(0, count)

  return (
    <div className="min-h-screen" style={{ background:"#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="Camera" />
      <main style={{ marginLeft:220, paddingTop:56 }}>
        <div className="p-5 space-y-4">

          {/* 헤더 */}
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-bold" style={{ color:"#1A2330" }}>Camera</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background:"#E8F0FF", color:"#0057FF" }}>go2rtc Live</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background:"#F0FDF4", color:"#059669" }}>
              ● {cameras.length}대 연결
            </span>
          </div>

          {/* 툴바 */}
          <div className="flex items-center gap-3">
            <select style={{ height:32, border:"1px solid #E2E8F0", borderRadius:6,
              padding:"0 10px", fontSize:12, color:"#1A2330", background:"#fff", outline:"none" }}>
              <option>전체 현장</option>
              <option>로컬현장</option>
            </select>
            <div className="ml-auto flex">
              {([1,2,3] as const).map((g) => (
                <button key={g} onClick={() => setGrid(g)} style={{
                  width:36, height:32, fontSize:12, fontWeight:600,
                  border:"1px solid #E2E8F0",
                  borderRadius: g===1 ? "6px 0 0 6px" : g===3 ? "0 6px 6px 0" : 0,
                  marginLeft: g===1 ? 0 : -1,
                  background: grid===g ? "#0057FF" : "#fff",
                  color: grid===g ? "#fff" : "#5A6A7A",
                  cursor:"pointer", zIndex: grid===g ? 1 : 0, position:"relative",
                }}>
                  {g}×{g}
                </button>
              ))}
            </div>
          </div>

          {/* 카메라 그리드 */}
          <div style={{
            display:"grid",
            gridTemplateColumns:`repeat(${grid}, 1fr)`,
            gap:8,
          }}>
            {visible.map(cam => (
              <CameraCell key={cam.id} cam={cam} refreshMs={2000} />
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
