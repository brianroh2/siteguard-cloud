"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Camera, MonitorSmartphone, Building2,
  Bell, Users, UserCog, Settings, MapPin, Box, Monitor,
  HelpCircle, Megaphone, Wrench, ChevronDown, Shield,
  CreditCard, Crown, Rocket, LogOut, Video,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuItem {
  label: string
  icon: React.ElementType
  href?: string
  children?: { label: string; href: string }[]
  tbd?: boolean
}

const menuItems: MenuItem[] = [
  { label: "Dashboard",  icon: LayoutDashboard, href: "/dashboard" },
  { label: "Camera",     icon: Camera,           href: "/camera" },
  {
    label: "Device", icon: MonitorSmartphone,
    children: [
      { label: "Devices",       href: "/devices" },
      { label: "Device Groups", href: "/device-groups" },
    ],
  },
  { label: "Alarm", icon: Bell, href: "/alarm" },
  {
    label: "Users", icon: Users,
    children: [
      { label: "Users",       href: "/users" },
      { label: "User Groups", href: "/user-groups" },
    ],
  },
  {
    label: "Settings", icon: Settings,
    children: [
      { label: "Site Mgmt",  href: "/settings/site" },
      { label: "Model Mgmt", href: "/settings/model" },
      { label: "Display",    href: "/settings/display" },
      { label: "Firmware",   href: "/settings/firmware" },
    ],
  },
  {
    label: "Help", icon: HelpCircle,
    children: [
      { label: "Notice", href: "/help/notice" },
      { label: "A/S",    href: "/help/as" },
    ],
  },
]

const tbdMenuItems: MenuItem[] = [
  { label: "Billing",       icon: CreditCard, tbd: true },
  { label: "Pricing Plan",  icon: Crown,      tbd: true },
  { label: "Advertisement", icon: Megaphone,  tbd: true },
  { label: "App Deploy",    icon: Rocket,     tbd: true },
]

interface SidebarProps {
  mode?: "cloud" | "edge"
}

export function Sidebar({ mode = "cloud" }: SidebarProps) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>(["Device"])

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    )
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isChildActive = (children?: { label: string; href: string }[]) => {
    if (!children) return false
    return children.some((c) => isActive(c.href))
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[220px] flex flex-col"
      style={{ background: "#0F1A2E", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* 로고 */}
      <div className="flex items-center gap-2.5 px-4 h-14"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "#0057FF" }}>
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-[15px] tracking-tight">SiteGuard</span>
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: "rgba(0,87,255,0.25)", color: "#93C5FD" }}>
          {mode === "edge" ? "EDGE" : "CLOUD"}
        </span>
      </div>

      {/* 사용자 프로필 */}
      <div className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#0057FF" }}>
          <UserCog className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-[13px] font-medium truncate">홍길동</div>
          <div className="text-[11px] truncate" style={{ color: "rgba(168,187,204,0.7)" }}>관리자</div>
        </div>
        <button className="flex items-center justify-center w-7 h-7 rounded"
          style={{ color: "rgba(168,187,204,0.6)" }}
          title="로그아웃">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5"
        style={{ scrollbarWidth: "none" }}>

        {menuItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                    isChildActive(item.children)
                      ? "text-white"
                      : "hover:text-white"
                  )}
                  style={{
                    background: isChildActive(item.children) ? "#0057FF" : "transparent",
                    color: isChildActive(item.children) ? "#fff" : "rgba(168,187,204,0.85)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isChildActive(item.children))
                      (e.currentTarget as HTMLElement).style.background = "#1A2D4A"
                  }}
                  onMouseLeave={(e) => {
                    if (!isChildActive(item.children))
                      (e.currentTarget as HTMLElement).style.background = "transparent"
                  }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 ml-auto transition-transform flex-shrink-0",
                    openMenus.includes(item.label) && "rotate-180"
                  )} />
                </button>

                {openMenus.includes(item.label) && (
                  <div className="ml-3 mt-0.5 space-y-0.5 pb-1">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors"
                        style={{
                          background: isActive(child.href) ? "rgba(0,87,255,0.2)" : "transparent",
                          color: isActive(child.href) ? "#60A5FA" : "rgba(168,187,204,0.7)",
                          fontWeight: isActive(child.href) ? 600 : 400,
                        }}>
                        <span className="w-1 h-1 rounded-full flex-shrink-0"
                          style={{ background: isActive(child.href) ? "#60A5FA" : "rgba(168,187,204,0.4)" }} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link href={item.href || "#"}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  background: isActive(item.href) ? "#0057FF" : "transparent",
                  color: isActive(item.href) ? "#fff" : "rgba(168,187,204,0.85)",
                }}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}

        {/* Edge 전용 메뉴 */}
        {mode === "edge" && (
          <>
            <div className="my-2 mx-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <div className="px-3 py-1 text-[10px] uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.3)" }}>Edge Only</div>
            <button onClick={() => toggleMenu("Recording")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium"
              style={{ color: "rgba(168,187,204,0.85)" }}>
              <Video className="w-4 h-4 flex-shrink-0" />
              <span>Recording</span>
              <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform",
                openMenus.includes("Recording") && "rotate-180")} />
            </button>
            {openMenus.includes("Recording") && (
              <div className="ml-3 mt-0.5 space-y-0.5 pb-1">
                <Link href="/recording/clips"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
                  style={{ color: "rgba(168,187,204,0.7)" }}>
                  <span className="w-1 h-1 rounded-full" style={{ background: "rgba(168,187,204,0.4)" }} />
                  Clips
                </Link>
                <Link href="/recording/timeline"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
                  style={{ color: "rgba(168,187,204,0.7)" }}>
                  <span className="w-1 h-1 rounded-full" style={{ background: "rgba(168,187,204,0.4)" }} />
                  Timeline
                </Link>
              </div>
            )}
          </>
        )}

        {/* TBD 구분선 */}
        <div className="my-2 mx-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="px-3 py-1 text-[10px] uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.25)" }}>TBD</div>

        {tbdMenuItems.map((item) => (
          <div key={item.label}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] cursor-not-allowed select-none"
            style={{ color: "rgba(168,187,204,0.35)", opacity: 0.5 }}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  )
}
