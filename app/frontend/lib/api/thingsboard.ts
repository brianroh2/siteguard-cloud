/**
 * Thingsboard REST API 클라이언트 (클라이언트 사이드)
 * 환경변수: NEXT_PUBLIC_TB_URL, NEXT_PUBLIC_TB_USER, NEXT_PUBLIC_TB_PW
 */

const TB_URL  = process.env.NEXT_PUBLIC_TB_URL  || "http://46.62.155.122:8080"
const TB_USER = process.env.NEXT_PUBLIC_TB_USER || "tenant@thingsboard.org"
const TB_PW   = process.env.NEXT_PUBLIC_TB_PW   || "tenant"

let _token: string | null = null
let _tokenTs = 0
const TOKEN_TTL = 50 * 60 * 1000 // 50분 (TB 기본 만료 60분)

async function getToken(): Promise<string> {
  if (_token && Date.now() - _tokenTs < TOKEN_TTL) return _token
  const res = await fetch(`${TB_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: TB_USER, password: TB_PW }),
  })
  const data = await res.json()
  _token  = data.token
  _tokenTs = Date.now()
  return _token!
}

async function tbGet(path: string) {
  const token = await getToken()
  const res = await fetch(`${TB_URL}${path}`, {
    headers: { "X-Authorization": `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`TB API ${path} → ${res.status}`)
  return res.json()
}

/** 기기 최신 텔레메트리 — { key: value } 형태로 반환 */
export async function getDeviceTelemetry(deviceId: string): Promise<Record<string, string | number | boolean>> {
  const data = await tbGet(
    `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`
  )
  return Object.fromEntries(
    Object.entries(data).map(([k, v]: [string, unknown]) => [
      k, (v as Array<{ value: string | number | boolean }>)[0]?.value
    ])
  )
}

/** 여러 기기 텔레메트리 동시 조회 */
export async function getMultiDeviceTelemetry(deviceIds: Record<string, string>) {
  const entries = await Promise.all(
    Object.entries(deviceIds).map(async ([name, id]) => {
      try {
        const tel = await getDeviceTelemetry(id)
        return [name, tel] as const
      } catch {
        return [name, { online: false }] as const
      }
    })
  )
  return Object.fromEntries(entries)
}
