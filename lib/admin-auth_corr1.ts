/**
 * Authentification Admin
 * Ces codes permettent l'accès même si Supabase est hors ligne
 */

export interface AdminCredentials {
  code: string
  establishment: string
  role: "vie-scolaire" | "professeur" | "delegue"
  username: string
  displayName: string
}

// Codes admin hardcodés dans le code source
const ADMIN_CODES: Record<string, AdminCredentials> = {
  cpdc001: {
    code: "cpdc001",
    establishment: "ST-MARIE 14000",
    role: "delegue",
    username: "admin.delegue.stm",
    displayName: "Admin Délégué ST-MARIE",
  },
  cpdc002: {
    code: "cpdc002",
    establishment: "ST-MARIE 14000",
    role: "professeur",
    username: "admin.prof.stm",
    displayName: "Admin Professeur ST-MARIE",
  },
  cpdc003: {
    code: "cpdc003",
    establishment: "ST-MARIE 14000",
    role: "vie-scolaire",
    username: "admin.vs.stm",
    displayName: "Admin Vie Scolaire ST-MARIE",
  },
}

const ADMIN_SESSION_KEY = "admin_session"
const COOKIE_MAX_AGE_DAYS = 7

export function validateAdminCode(code: string): AdminCredentials | null {
  const normalizedCode = code.toLowerCase().trim()
  console.log("[AdminAuth] Validating code:", normalizedCode)
  
  const adminCreds = ADMIN_CODES[normalizedCode]
  
  if (adminCreds) {
    console.log("[AdminAuth] Valid admin code found")
  } else {
    console.log("[AdminAuth] Invalid admin code")
  }
  
  return adminCreds || null
}

export function isAdminSession(): boolean {
  if (typeof window === "undefined") return false
  const session = getCookieValue(ADMIN_SESSION_KEY)
  return !!session
}

export function getAdminSession(): AdminCredentials | null {
  if (typeof window === "undefined") return null
  
  const session = getCookieValue(ADMIN_SESSION_KEY)
  if (!session) return null
  
  try {
    return JSON.parse(decodeURIComponent(session))
  } catch {
    console.error("[AdminAuth] Error parsing admin session")
    return null
  }
}

export function setAdminSession(credentials: AdminCredentials): void {
  if (typeof window === "undefined") {
    console.log("[AdminAuth] Cannot set session on server side")
    return
  }
  
  const value = encodeURIComponent(JSON.stringify(credentials))
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  
  document.cookie = `${ADMIN_SESSION_KEY}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
  
  console.log("[AdminAuth] Admin session stored for:", credentials.displayName)
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return
  
  document.cookie = `${ADMIN_SESSION_KEY}=; path=/; max-age=0`
  
  console.log("[AdminAuth] Admin session cleared")
}

// Helper pour lire un cookie
function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return matches ? matches[1] : null
}
