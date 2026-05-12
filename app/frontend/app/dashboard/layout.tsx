import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#F4F6FA" }}>
      <Sidebar mode="cloud" />
      <Header title="Dashboard" />
      <main style={{ marginLeft: 220, paddingTop: 56 }}>
        <div className="p-5">{children}</div>
      </main>
    </div>
  )
}
