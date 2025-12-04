import { createClient } from "@/lib/supabase/client"

// Clé de session unifiée
const SESSION_KEY = "user_session"

// Simple password hashing (matches SQL function)
// In production, use bcrypt or similar
function hashPassword(password: string): string {
  // This is a placeholder - the actual hashing happens in SQL
  return password
}

export interface AuthUser {
  id: string
  username: string
  role: "vie-scolaire" | "professeur" | "delegue"
  establishment_id: string
  establishment_code: string
  establishment_name: string
  first_name?: string
  last_name?: string
  email?: string
}

export async function authenticateUser(
  establishmentCode: string,
  role: string,
  username: string,
  password: string,
): Promise<{ user: AuthUser | null; error: string | null }> {
  const supabase = createClient()

  try {
    // First, verify the establishment code exists
    const { data: establishment, error: estError } = await supabase
      .from("establishments")
      .select("id, code, name")
      .eq("code", establishmentCode)
      .single()

    if (estError || !establishment) {
      return { user: null, error: "Code établissement invalide" }
    }

    // Check based on role
    if (role === "vie-scolaire") {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("establishment_id", establishment.id)
        .eq("role", "vie-scolaire")
        .single()

      if (profileError || !profile) {
        return { user: null, error: "Identifiant ou mot de passe incorrect" }
      }

      // Verify password using SQL function
      const { data: isValid, error: verifyError } = await supabase.rpc("verify_password", {
        password: password,
        password_hash: profile.password_hash,
      })

      if (verifyError || !isValid) {
        return { user: null, error: "Identifiant ou mot de passe incorrect" }
      }

      return {
        user: {
          id: profile.id,
          username: profile.username,
          role: "vie-scolaire",
          establishment_id: establishment.id,
          establishment_code: establishment.code,
          establishment_name: establishment.name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
        },
        error: null,
      }
    } else if (role === "professeur") {
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("*")
        .eq("username", username)
        .eq("establishment_id", establishment.id)
        .single()

      if (teacherError || !teacher) {
        return { user: null, error: "Identifiant ou mot de passe incorrect" }
      }

      const { data: isValid, error: verifyError } = await supabase.rpc("verify_password", {
        password: password,
        password_hash: teacher.password_hash,
      })

      if (verifyError || !isValid) {
        return { user: null, error: "Identifiant ou mot de passe incorrect" }
      }

      return {
        user: {
          id: teacher.id,
          username: teacher.username,
          role: "professeur",
          establishment_id: establishment.id,
          establishment_code: establishment.code,
          establishment_name: establishment.name,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          email: teacher.email,
        },
        error: null,
      }
    } else if (role === "delegue") {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("username", username)
        .eq("establishment_id", establishment.id)
        .single()

      if (studentError || !student) {
        return { user: null, error: "Identifiant ou mot de passe incorrect" }
      }

      const { data: isValid, error: verifyError } = await supabase.rpc("verify_password", {
        password: password,
        password_hash: student.password_hash,
      })

      if (verifyError || !isValid) {
        return { user: null, error: "Identifiant ou mot de passe incorrect" }
      }

      return {
        user: {
          id: student.id,
          username: student.username,
          role: "delegue",
          establishment_id: establishment.id,
          establishment_code: establishment.code,
          establishment_name: establishment.name,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
        },
        error: null,
      }
    }

    return { user: null, error: "Rôle invalide" }
  } catch (error) {
    console.error("Authentication error:", error)
    return { user: null, error: "Erreur de connexion - vérifiez votre configuration Supabase" }
  }
}

export function setUserSession(user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    // Also set a cookie for server-side access
    document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
  }
}

export function getUserSession(): AuthUser | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem(SESSION_KEY)
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
  }
  return null
}

export function clearUserSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY)
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
  }
}
