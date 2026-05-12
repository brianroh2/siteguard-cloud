"use client"

import { useState } from "react"
import { Search, Download, UserPlus } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

/* ── 타입 ── */
type UserRole = "관리자" | "설치자" | "고객"
type UserStatus = "활성" | "비활성"

interface User {
  id: string
  name: string
  loginId: string
  role: UserRole
  status: UserStatus
  group: string
  sites: string[]
  phone: string
  regDate: string
  lastLogin: string
}

/* ── 샘플 데이터 ── */
const users: User[] = [
  { id:"1", name:"홍길동",   loginId:"hong.gd",    role:"관리자", status:"활성",   group:"어드민그룹",   sites:["전체"],                         phone:"010-1234-5678", regDate:"25.01.01", lastLogin:"오늘 09:12" },
  { id:"2", name:"김철수",   loginId:"kim.cs",     role:"설치자", status:"활성",   group:"설치팀A",      sites:["서울A현장","부산B현장"],         phone:"010-2345-6789", regDate:"25.01.15", lastLogin:"오늘 08:44" },
  { id:"3", name:"이영희",   loginId:"lee.yh",     role:"설치자", status:"활성",   group:"설치팀B",      sites:["대구C현장","인천D현장"],         phone:"010-3456-7890", regDate:"24.12.01", lastLogin:"어제 15:30" },
  { id:"4", name:"박민준",   loginId:"park.mj",    role:"고객",   status:"활성",   group:"고객A그룹",    sites:["서울A현장"],                     phone:"010-4567-8901", regDate:"25.02.10", lastLogin:"3일 전"     },
  { id:"5", name:"최지원",   loginId:"choi.jw",    role:"고객",   status:"활성",   group:"고객B그룹",    sites:["부산B현장","광주E현장"],         phone:"010-5678-9012", regDate:"25.03.01", lastLogin:"1주 전"     },
  { id:"6", name:"정수현",   loginId:"jung.sh",    role:"설치자", status:"비활성", group:"설치팀A",      sites:["울산F현장"],                     phone:"010-6789-0123", regDate:"24.11.20", lastLogin:"2주 전"     },
  { id:"7", name:"강민서",   loginId:"kang.ms",    role:"고객",   status:"활성",   group:"고객C그룹",    sites:["수원G현장","전주H현장"],         phone:"010-7890-1234", regDate:"25.03.20", lastLogin:"오늘 07:55" },
  { id:"8", name:"윤태호",   loginId:"yoon.th",    role:"관리자", status:"활성",   group:"어드민그룹",   sites:["전체"],                         phone:"010-8901-2345", regDate:"24.12.15", lastLogin:"어제 22:10" },
]

/* ── 스타일 ── */
const roleStyle: Record<UserRole, { bg:string; color:string }> = {
  관리자: { bg:"#EFF6FF", color:"#2563EB" },
  설치자: { bg:"#F5F3FF", color:"#7C3AED" },
  고객:   { bg:"#F0FDF4", color:"#16A34A" },
}

const statusStyle: Record<UserStatus, { bg:string; color:string; dot:string }> = {
  활성:   { bg:"#ECFDF5", color:"#059669", dot:"#059669" },
  비활성: { bg:"#F1F5F9", color:"#64748B", dot:"#64748B" },
}

export default function UsersPage() {
  const [roleFilter, setRoleFilter]     = useState("전체")
  const [statusFilter, setStatusFilter] = useState("전체")
  const [groupFilter, setGroupFilter]   = useState("전체")
  const [search, setSearch]             = useState("")
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [allChecked, setAllChecked]     = useState(false)

  const groups = Array.from(new Set(users.map(u => u.group)))

  const filtered = users.filter(u => {
    if (roleFilter   !== "전체" && u.role   !== roleFilter)   return false
    if (statusFilter !== "전체" && u.status !== statusFilter) return false
    if (groupFilter  !== "전체" && u.group  !== groupFilter)  return false
    if (search && !u.name.includes(search) && !u.loginId.includes(search)) return false
    return true
  })

  const toggleAll = () => {
    if (allChecked) { setSelected(new Set()); setAllChecked(false) }
    else { setSelected(new Set(filtered.map(u => u.id))); setAllChecked(true) }
  }
  const toggleOne = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const counts = {
    관리자: users.filter(u => u.role === "관리자").length,
    설치자: users.filter(u => u.role === "설치자").length,
    고객:   users.filter(u => u.role === "고객").length,
    비활성: users.filter(u => u.status === "비활성").length,
  }

  const sel: React.CSSProperties = {
    height:30, border:"1px solid #E2E8F0", borderRadius:5,
    padding:"0 8px", fontSize:12, color:"#1A2330", background:"#fff", outline:"none",
  }

  return (
    <div className="min-h-screen" style={{ background:"#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="Users" />
      <main style={{ marginLeft:220, paddingTop:56 }}>
        <div className="p-5 space-y-4">

          {/* 페이지 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold" style={{ color:"#1A2330" }}>Users</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background:"#E8F0FF", color:"#0057FF" }}>전체 {users.length}명</span>
            </div>
            <button style={{ padding:"6px 14px", background:"#0057FF", color:"#fff",
              border:"none", borderRadius:5, fontSize:12, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", gap:5 }}>
              <UserPlus size={13} /> 사용자 추가
            </button>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label:"관리자", val:counts.관리자, ...roleStyle.관리자 },
              { label:"설치자", val:counts.설치자, ...roleStyle.설치자 },
              { label:"고객",   val:counts.고객,   ...roleStyle.고객   },
              { label:"비활성", val:counts.비활성, bg:"#F1F5F9", color:"#64748B" },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-4"
                style={{ background:"#fff", border:"1px solid #E2E8F0" }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color:"#5A6A7A" }}>{c.label}</div>
                <div className="flex items-end gap-2">
                  <span className="text-[28px] font-bold" style={{ color:"#1A2330", lineHeight:1 }}>{c.val}</span>
                  <span className="text-[12px] mb-0.5" style={{ color:"#5A6A7A" }}>명</span>
                </div>
                <span style={{
                  display:"inline-block", marginTop:6, fontSize:10, fontWeight:600,
                  padding:"1px 6px", borderRadius:4, background:c.bg, color:c.color,
                }}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* 검색 필터 */}
          <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl"
            style={{ background:"#fff", border:"1px solid #E2E8F0" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>역할</span>
              <select style={sel} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option>전체</option><option>관리자</option><option>설치자</option><option>고객</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>상태</span>
              <select style={sel} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option>전체</option><option>활성</option><option>비활성</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>그룹</span>
              <select style={sel} value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
                <option>전체</option>
                {groups.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] font-semibold" style={{ color:"#5A6A7A" }}>검색</span>
              <div className="relative flex-1" style={{ maxWidth:240 }}>
                <Search size={13} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#94A3B8" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="이름 / 로그인 ID" style={{ ...sel, width:"100%", paddingLeft:26 }} />
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
                (활성: <strong style={{ color:"#10B981" }}>{filtered.filter(u=>u.status==="활성").length}</strong>&nbsp;
                비활성: <strong style={{ color:"#94A3B8" }}>{filtered.filter(u=>u.status==="비활성").length}</strong>)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select style={sel}><option>10</option><option>20</option></select>
              <button style={{ height:30, padding:"0 10px", background:"#217346", color:"#fff",
                border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer",
                display:"flex", alignItems:"center", gap:4 }}>
                <Download size={12} /> Excel
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#F8FAFC", borderBottom:"1.5px solid #E2E8F0" }}>
                  <th style={{ width:36, padding:"9px 10px" }}>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </th>
                  {[["상태",72],["이름",90],["로그인 ID",110],["역할",76],["그룹",100],["접근 현장",null],["연락처",110],["등록일",80],["마지막 로그인",110]]
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
                {filtered.map(u => {
                  const rs = roleStyle[u.role]
                  const ss = statusStyle[u.status]
                  return (
                    <tr key={u.id} style={{ borderBottom:"1px solid #F1F5F9" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="#F8FAFC"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background="#fff"}>
                      <td style={{ padding:"9px 10px", textAlign:"center" }}>
                        <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} />
                      </td>
                      <td style={{ padding:"9px 10px" }}>
                        <span style={{
                          display:"inline-flex", alignItems:"center", gap:4,
                          fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:9,
                          background:ss.bg, color:ss.color,
                        }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background:ss.dot }} />
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding:"9px 10px", fontWeight:600, color:"#1A2330" }}>{u.name}</td>
                      <td style={{ padding:"9px 10px", fontFamily:"monospace", fontSize:11, color:"#5A6A7A" }}>{u.loginId}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <span style={{
                          fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4,
                          background:rs.bg, color:rs.color,
                        }}>{u.role}</span>
                      </td>
                      <td style={{ padding:"9px 10px", color:"#5A6A7A" }}>{u.group}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                          {u.sites.map(s => (
                            <span key={s} style={{
                              fontSize:10, padding:"1px 6px", borderRadius:3,
                              background:"#F1F5F9", color:"#5A6A7A",
                            }}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding:"9px 10px", color:"#5A6A7A" }}>{u.phone}</td>
                      <td style={{ padding:"9px 10px", color:"#5A6A7A" }}>{u.regDate}</td>
                      <td style={{ padding:"9px 10px", color:"#94A3B8", fontSize:11 }}>{u.lastLogin}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 하단 */}
          <div className="flex items-center justify-between">
            <button style={{ padding:"6px 14px", border:"1px solid #FCA5A5",
              borderRadius:5, background:"#FFF5F5", color:"#DC2626", fontSize:12,
              fontWeight:600, cursor:"pointer" }}>
              계정 삭제
            </button>
            <div className="flex gap-1">
              {["‹","1","›"].map((p,i) => (
                <button key={i} style={{
                  width:28, height:28, border:"1px solid #E2E8F0", borderRadius:5,
                  background:p==="1" ? "#0057FF" : "#fff",
                  color:p==="1" ? "#fff" : "#5A6A7A",
                  fontSize:12, cursor:"pointer", fontWeight:p==="1" ? 600 : 400,
                }}>{p}</button>
              ))}
            </div>
            <div style={{ width:80 }} />
          </div>
        </div>
      </main>
    </div>
  )
}
