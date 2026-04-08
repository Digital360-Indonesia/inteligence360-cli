import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Box } from '../../ink.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { Eva, type EvaPose } from './Eva.js'

type Frame = {
  pose: EvaPose
  offset: number
}

function hold(pose: EvaPose, offset: number, frames: number): Frame[] {
  return Array.from({ length: frames }, () => ({ pose, offset }))
}

// Click animation: crouch, spring up with arms raised. Twice.
const JUMP_WAVE: readonly Frame[] = [
  ...hold('default', 1, 2),    // crouch
  ...hold('arms-up', 0, 3),    // spring!
  ...hold('default', 0, 1),
  ...hold('default', 1, 2),    // crouch again
  ...hold('arms-up', 0, 3),    // spring!
  ...hold('default', 0, 1),
]

// Click animation: glance right, then left, then back.
const LOOK_AROUND: readonly Frame[] = [
  ...hold('look-right', 0, 5),
  ...hold('look-left', 0, 5),
  ...hold('default', 0, 1),
]

const CLICK_ANIMATIONS: readonly (readonly Frame[])[] = [JUMP_WAVE, LOOK_AROUND]
const IDLE: Frame = { pose: 'default', offset: 0 }
const FRAME_MS = 60
const EVA_HEIGHT = 6

function useEvaAnimation() {
  const reducedMotion = getInitialSettings().prefersReducedMotion ?? false
  const [frameIdx, setFrameIdx] = useState(0)
  const animRef = useRef<readonly Frame[] | null>(null)
  const clickCountRef = useRef(0)

  useEffect(() => {
    if (reducedMotion || !animRef.current) return
    const id = setInterval(() => {
      setFrameIdx(i => {
        const anim = animRef.current
        if (!anim) return i
        const next = i + 1
        if (next >= anim.length) {
          animRef.current = null
          return 0
        }
        return next
      })
    }, FRAME_MS)
    return () => clearInterval(id)
  }, [reducedMotion, animRef.current])

  const frame: Frame = animRef.current?.[frameIdx] ?? IDLE

  const onClick = () => {
    if (reducedMotion) return
    const idx = clickCountRef.current % CLICK_ANIMATIONS.length
    clickCountRef.current++
    animRef.current = CLICK_ANIMATIONS[idx] as Frame[]
    setFrameIdx(0)
  }

  return { pose: frame.pose, bounceOffset: frame.offset, onClick }
}

/**
 * Eva with click-triggered animations (crouch-jump or look-around).
 * Same container footprint as a bare <Eva /> so layout never shifts.
 */
export function AnimatedEva(): React.ReactNode {
  const { pose, bounceOffset, onClick } = useEvaAnimation()

  return (
    <Box height={EVA_HEIGHT} overflow="hidden" onClick={onClick}>
      <Box marginTop={bounceOffset} flexShrink={0}>
        <Eva pose={pose} />
      </Box>
    </Box>
  )
}
