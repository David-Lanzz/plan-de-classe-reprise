"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Users, BookOpen } from "lucide-react"

const DashboardLayout = () => {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          pathname === "/dashboard" ? "bg-accent" : "transparent",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Accueil
      </Link>
      <Link
        href="/dashboard/students"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          pathname === "/dashboard/students" ? "bg-accent" : "transparent",
        )}
      >
        <Users className="h-4 w-4" />
        Élèves
      </Link>
      <Link
        href="/dashboard/teachers"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          pathname === "/dashboard/teachers" ? "bg-accent" : "transparent",
        )}
      >
        <Users className="h-4 w-4" />
        Professeurs
      </Link>
      <Link
        href="/dashboard/classes"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          pathname === "/dashboard/classes" ? "bg-accent" : "transparent",
        )}
      >
        <BookOpen className="h-4 w-4" />
        Classes
      </Link>
      <Link
        href="/dashboard/espace-classe"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          pathname === "/dashboard/espace-classe" ? "bg-accent" : "transparent",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Classe
      </Link>
      <Link
        href="/dashboard/seating-plans"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          pathname === "/dashboard/seating-plans" ? "bg-accent" : "transparent",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Plans de classe
      </Link>
    </nav>
  )
}

export default DashboardLayout
