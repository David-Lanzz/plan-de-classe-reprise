import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware Next.js pour la protection des routes
 * Vérifie la présence d'une session (cookie) avant d'autoriser l'accès
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Vérifier les sessions (admin ou custom)
  const adminSession = request.cookies.get("admin_session")?.value
  const userSession = request.cookies.get("user_session")?.value
  
  const isAuthenticated = !!(adminSession || userSession)

  // Routes publiques (toujours accessibles)
  const publicRoutes = ["/", "/auth/login", "/auth/register"]
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith("/auth/"))

  // Routes de partage (accessibles sans auth)
  const isShareRoute = pathname.startsWith("/partage/") || pathname.startsWith("/share/")

  // Si route publique ou partage → laisser passer
  if (isPublicRoute || isShareRoute) {
    return NextResponse.next()
  }

  // Si route protégée et non authentifié → rediriger vers login
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Sinon → laisser passer
  return NextResponse.next()
}

/**
 * Configuration du matcher
 * Exclut les fichiers statiques et API pour de meilleures performances
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
