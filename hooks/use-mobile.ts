"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hook pour détecter si l'écran est de taille mobile
 * Retourne undefined pendant le SSR, puis true/false côté client
 */
export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Écouter les changements
    mql.addEventListener("change", onChange)
    
    // Définir la valeur initiale
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

/**
 * Version avec valeur par défaut (pour éviter les checks undefined)
 * Retourne false pendant le SSR
 */
export function useIsMobileSafe(): boolean {
  const isMobile = useIsMobile()
  return isMobile ?? false
}
