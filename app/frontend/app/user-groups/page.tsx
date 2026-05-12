"use client"

import { useState } from "react"
import { Search, Users, Bell, BellOff, ChevronRight } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

/* ── 타입 ── */
interface UserGroup {
  id: string
  name: string
  description: string
  userCount: number
  siteCount: number
  sites: string[]
  alarmReceive: boolean
  regDate: string
  manager: string
}

/* ── 샘플 데이터 ── */
const groups: UserGroup[] = [
  {
    id:"1", name:"어드민그룹",   description:"시스템 전체 관리자 그룹",
    userCount:2, siteCount:0,  sites:["전체 현장"],
    alarmReceive:true,  regDate:"25.01.01", manager:"홍*길",
  },
  {
    id:"2", name:"설치팀A",      description:"서울/부산 담당 설치팀",
    userCount:2, siteCount:2,  sites:["서울A현장","부산B현장"],
    alarmReceive:true,  regDate:"25.01.15", manager:"김*수",
  },
  {
    id:"3", name:"설치팀B",      description:"대구/인천 담당 설치팀",
    userCount:1, siteCount:2,  sites:["대구C현장","인천D현장"],
    alarmReceive:true,  regDate:"24.12.01", manager:"이*영",
  },
  {
    id:"4", name:"고객A그룹",    description:"서울A현장 고객 전용 열람 그룹",
    userCount:1, siteCount:1,  sites:["서울A현장"],
    alarmReceive:false, regDate:"25.02.10", manager:"박*원",
  },
  {
    id:"5", name:"고객B그룹",    description:"부산/광주 현장 고객 그룹",
    userCount:1, siteCount:2,  sites:["부산B현장","광주E현장"],
    alarmReceive:false, regDate:"25.03.01", manager:"최*지",
  },
  {
    id:"6", name:"고객C그룹",    description:"수원/전주 현장 고객 그룹",
    userCount:1, siteCount:2,  sites:["수원G현장","전주H현장"],
    alarmReceive:true,  regDate:"25.03.20", manager:"강*서",
  },
]

/* ── 권한 설명 테이블 ── */
const permissions = [
  { label:"대시보드",   관리자:"✅", 설치자:"✅", 고객:"✅" },
  { label:"카메라뷰",   관리자:"✅", 설치자:"✅ (담당현장)", 고객:"✅ (담당현장)" },
  { label:"기기 관리",  관리자:"✅ (전체)", 설치자:"✅ (담당현장)", 고객:"❌" },
  { label:"사용자 관리",관리자:"✅", 설치자:"❌", 고객:"❌" },
  { label:"시스템 설정",관리자:"✅", 설치자:"❌", 고객:"❌" },
]

export default function UserGroupsPage() {
  const [search, setSearch] = useState("")
  const [alarmFilter, setAlarmFilter] = useState("전체")

  const filtered = groups.filter(g => {
    if (alarmFilter === "알람 수신") return g.alarmReceive && (g.name.includes(search) || !search)
    if (alarmFilter === "알람 미수신") return !g.alarmReceive && (g.name.includes(search) || !search)
    return !search || g.name.includes(search) || g.description.includes(search)
  })

  const sel: React.CSSProperties = {
    height:30, border:"1px solid #E2E8F0", borderRadius:5,
    padding:"0 8px", fontSize:12, color:"#1A2330", background:"#fff", outline:"none",
  }

  return (
    <div className="min-h-screen" style={{ background:"#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="User Groups" />
      <main style={{ marginLeft:220, paddingTop:56 }}>
        <div className="p-5 space-y-4">

          {/* 페이지 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold" style={{ color:"#1A2330" }}>User Groups</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background:"#E8F0FF", color:"#0057FF" }}>전체 {groups.length}개 그룹</span>
            </div>
            <button style={{ padding:"6px 14px", background:"#0057FF", color:"#fff",
              border:"none", borderRadius:5, fontSize:12, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", gap:5 }}>
              <Users size={13} /> 그룹 추가
            </button>
          </div>

          {/* 역할별 권한 요약 */}
          <div className="rounded-xl p-4" style={{ background:"#fff", border:"1px solid #E2E8F0" }}>
            <div className="text-[12px] font-semibold mb-3" style={{ color:"#5A6A7A" }}>역할별 접근 권한</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:500 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC", borderBottom:"1px solid #E2E8F0" }}>
                    <th style={{ padding:"7px 12px", textAlign:"left", color:"#5A6A7A", fontWeight:600 }}>기능</th>
                    {["관리자","설치자","고객"].map(r => (
                      <th key={r} style={{ padding:"7px 12px", textAlign:"center", color:"#5A6A7A", fontWeight:600 }}>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4,
                          background:r==="관리자"?"#EFF6FF":r==="설치자"?"#F5F3FF":"#F0FDF4",
                          color:r==="관리자"?"#2563EB":r==="설치자"?"#7C3AED":"#16A34A",
                        }}>{r}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map(p => (
                    <tr key={p.label} style={{ borderBottom:"1px solid #F1F5F9" }}>
                      <td style={{ padding:"7px 12px", color:"#1A2330" }}>{p.label}</td>
                      <td style={{ padding:"7px 12px", textAlign:"center", color:"#5A6A7A" }}>{p.관리자}</td>
                      <td style={{ padding:"7px 12px", textAlign:"center", color:"#5A6A7A" }}>{p.설치자}</td>
                      <td style={{ padding:"7px 12px", textAlign:"center", color:"#5A6A7A" }}>{p.고객}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 검색 필터 */}
          <div className="flex gap-3 items-center p-4 rounded-xl"
            style={{ background:"#fff", border:"1px solid #E2E8F0" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>알람 수신</span>
              <select style={sel} value={alarmFilter} onChange={e => setAlarmFilter(e.target.value)}>
                <option>전체</option><option>알람 수신</option><option>알람 미수신</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>검색</span>
              <div className="relative flex-1" style={{ maxWidth:240 }}>
                <Search size={13} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#94A3B8" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="그룹명 / 설명" style={{ ...sel, width:"100%", paddingLeft:26 }} />
              </div>
              <button style={{ height:30, padding:"0 14px", background:"#0057FF", color:"#fff",
                border:"none", borderRadius:5, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Search
              </button>
            </div>
          </div>

          {/* 그룹 카드 그리드 */}
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(g => (
              <div key={g.id} className="rounded-xl p-5 flex flex-col gap-3"
                style={{ background:"#fff", border:"1px solid #E2E8F0" }}>

                {/* 헤더 */}
                <div className="flex items-start justify-between">
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1A2330" }}>{g.name}</div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{g.description}</div>
                  </div>
                  {g.alarmReceive
                    ? <Bell size={15} style={{ color:"#F59E0B", flexShrink:0 }} />
                    : <BellOff size={15} style={{ color:"#CBD5E1", flexShrink:0 }} />
                  }
                </div>

                {/* 멤버 & 현장 수 */}
                <div className="flex gap-4">
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:700, color:"#1A2330", lineHeight:1 }}>{g.userCount}</div>
                    <div style={{ fontSize:10, color:"#94A3B8", marginTop:2 }}>사용자</div>
                  </div>
                  <div style={{ width:1, background:"#E2E8F0" }} />
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:700, color:"#1A2330", lineHeight:1 }}>
                      {g.sites[0] === "전체 현장" ? "전체" : g.siteCount}
                    </div>
                    <div style={{ fontSize:10, color:"#94A3B8", marginTop:2 }}>접근 현장</div>
                  </div>
                </div>

                {/* 접근 현장 태그 */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {g.sites.map(s => (
                    <span key={s} style={{
                      fontSize:10, padding:"2px 7px", borderRadius:4,
                      background: s === "전체 현장" ? "#E8F0FF" : "#F1F5F9",
                      color: s === "전체 현장" ? "#0057FF" : "#5A6A7A",
                      fontWeight: s === "전체 현장" ? 600 : 400,
                    }}>{s}</span>
                  ))}
                </div>

                {/* 알람 수신 */}
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#5A6A7A" }}>
                  {g.alarmReceive
                    ? <><span style={{ color:"#F59E0B" }}>●</span> 알람 수신 ON</>
                    : <><span style={{ color:"#CBD5E1" }}>●</span> 알람 수신 OFF</>
                  }
                </div>

                {/* 푸터 */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  paddingTop:12, borderTop:"1px solid #F1F5F9" }}>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>
                    담당: <strong style={{ color:"#5A6A7A" }}>{g.manager}</strong> · {g.regDate}
                  </div>
                  <button style={{
                    fontSize:11, padding:"4px 10px",
                    border:"1px solid #E2E8F0", borderRadius:5,
                    background:"#fff", color:"#5A6A7A", cursor:"pointer",
                    display:"inline-flex", alignItems:"center", gap:3,
                  }}>
                    편집 <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 하단 */}
          <div className="flex items-center justify-between">
            <button style={{ padding:"6px 14px", border:"1px solid #FCA5A5",
              borderRadius:5, background:"#FFF5F5", color:"#DC2626", fontSize:12,
              fontWeight:600, cursor:"pointer" }}>
              그룹 삭제
            </button>
            <div style={{ fontSize:12, color:"#94A3B8" }}>
              총 {filtered.length}개 그룹 표시 중
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
