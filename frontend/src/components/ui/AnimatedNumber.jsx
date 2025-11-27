import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function AnimatedNumber({ value, duration = 1, decimals = 2, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value)
      return
    }

    let startTime = null
    const startValue = displayValue
    const endValue = value

    const animate = (currentTime) => {
      if (startTime === null) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * easeOut
      
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, prefersReducedMotion])

  return (
    <span>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  )
}

