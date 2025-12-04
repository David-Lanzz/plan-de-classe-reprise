"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getAdminSession } from "@/lib/admin-auth"

// Clé de session unifiée (même que dans custom-auth.ts)
const SESSION_KEY = "user_session"

export interface AuthUser {
  id: string
  establishmentId: string
  role: string
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  authType: "custom" | "admin" | "supabase"
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

export function useAuth(options?: { requireRole?: string; redirectTo?: string }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      if (typeof window === "undefined") {
        return
      }

      try {
        // Try cookie first (using unified SESSION_KEY)
        const cookieSession = getCookie(SESSION_KEY)
        
        let sessionData = null
        if (cookieSession) {
          try {
            sessionData = JSON.parse(decodeURIComponent(cookieSession))
          } catch (e) {
            console.error("Error parsing cookie session:", e)
          }
        }

        // Fallback to localStorage (using unified SESSION_KEY)
        if (!sessionData) {
          const localSession = localStorage.getItem(SESSION_KEY)

          if (localSession) {
            try {
              sessionData = JSON.parse(localSession)
            } catch (e) {
              console.error("Error parsing localStorage session:", e)
            }
          }
        }

        if (sessionData) {
          if (!sessionData.id || !sessionData.establishment_id || !sessionData.role) {
            console.error("Custom session missing required fields")
            localStorage.removeItem(SESSION_KEY)
            document.cookie = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          } else {
            const authUser: AuthUser = {
              id: sessionData.id,
              establishmentId: sessionData.establishment_id,
              role: sessionData.role,
              username: sessionData.username,
              firstName: sessionData.first_name,
              lastName: sessionData.last_name,
              email: sessionData.email,
              authType: "custom",
            }

            if (options?.requireRole && authUser.role !== options.requireRole) {
              router.push(options.redirectTo || "/dashboard")
              setIsLoading(false)
              return
            }

            setUser(authUser)
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.error("Error checking custom session:", error)
        localStorage.removeItem(SESSION_KEY)
        document.cookie = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      }

      try {
        const adminSession = getAdminSession()

        if (adminSession) {
          const supabase = createClient()
          const { data: establishment } = await supabase
            .from("establishments")
            .select("id")
            .eq("code", adminSession.code)
            .single()

          const authUser: AuthUser = {
            id: "admin-" + adminSession.code,
            establishmentId: establishment?.id || "mock-establishment-id",
            role: "vie-scolaire",
            username: adminSession.code,
            authType: "admin",
          }

          if (options?.requireRole && authUser.role !== options.requireRole) {
            router.push(options.redirectTo || "/dashboard")
            setIsLoading(false)
            return
          }

          setUser(authUser)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error("Error checking admin session:", error)
      }

      try {
        const supabase = createClient()
        const {
          data: { user: supabaseUser },
          error,
        } = await supabase.auth.getUser()

        if (!error && supabaseUser) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", supabaseUser.id).single()

          if (profile) {
            const authUser: AuthUser = {
              id: supabaseUser.id,
              establishmentId: profile.establishment_id,
              role: profile.role,
              username: profile.username,
              firstName: profile.first_name,
              lastName: profile.last_name,
              email: profile.email,
              authType: "supabase",
            }

            if (options?.requireRole && authUser.role !== options.requireRole) {
              router.push(options.redirectTo || "/dashboard")
              setIsLoading(false)
              return
            }

            setUser(authUser)
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.error("Error checking Supabase auth:", error)
      }

      setIsLoading(false)
      router.push(options?.redirectTo || "/auth/login")
    }

    checkAuth()
  }, [router, options?.requireRole, options?.redirectTo])

  return { user, isLoading }
}
