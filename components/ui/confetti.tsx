"use client"

import { useEffect, useState, useRef } from "react"
import confetti from "canvas-confetti"

interface ConfettiProps {
  active?: boolean
  config?: confetti.Options
}

export function Confetti({ active = false, config }: ConfettiProps) {
  const [isActive, setIsActive] = useState(false)
  const timersRef = useRef<number[]>([])
  const isMountedRef = useRef(true)

  // Nettoyer tous les timers lors du démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  // Activer les confettis avec un délai pour éviter les problèmes de DOM
  useEffect(() => {
    if (active && !isActive) {
      const timer = window.setTimeout(() => {
        if (isMountedRef.current) {
          setIsActive(true)
        }
      }, 50)
      timersRef.current.push(timer)
    } else if (!active && isActive) {
      setIsActive(false)
    }
  }, [active, isActive])

  useEffect(() => {
    if (!isActive) return

    try {
      // Configuration allégée pour de meilleures performances
      const defaultConfig: confetti.Options = {
        particleCount: 50, // Réduit de 100 à 50
        spread: 50, // Réduit de 70 à 50
        origin: { y: 0.6 },
        colors: ["#1a71f5", "#20afa0", "#f59e0b"],
        disableForReducedMotion: true,
        gravity: 1.2, // Accélère la chute des confettis
        decay: 0.9, // Accélère la disparition
        ticks: 150, // Limite la durée d'animation
      }

      const mergedConfig = { ...defaultConfig, ...config }

      // Lancer les confettis une seule fois avec une configuration optimisée
      const timer = window.setTimeout(() => {
        try {
          if (isMountedRef.current && typeof window !== "undefined") {
            confetti(mergedConfig)
          }
        } catch (e) {
          console.error("Erreur lors du lancement des confettis:", e)
        }
      }, 100)
      timersRef.current.push(timer)

      // Désactiver rapidement après l'animation
      const timerEnd = window.setTimeout(() => {
        if (isMountedRef.current) {
          setIsActive(false)
        }
      }, 800) // Réduit de 2000ms à 800ms
      timersRef.current.push(timerEnd)

      return () => {
        // Nettoyer les timers si le composant est démonté pendant l'animation
        timersRef.current.forEach((timer) => window.clearTimeout(timer))
        timersRef.current = []
      }
    } catch (e) {
      console.error("Erreur générale dans le composant Confetti:", e)
      setIsActive(false)
    }
  }, [isActive, config])

  return null
}
