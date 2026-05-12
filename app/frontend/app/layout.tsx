import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SiteGuard — 현장 관제 시스템",
  description: "이동형 CCTV 현장 관제 솔루션",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
