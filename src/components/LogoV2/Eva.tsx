import chalk from 'chalk'
import * as React from 'react'
import { Box, Text } from '../../ink.js'

export type EvaPose = 'default' | 'arms-up' | 'look-left' | 'look-right'

const NAVY      = '#0a1f6e'
const NAVY_LIGHT = '#1e3a8a'
const GOLD      = '#f5c842'

//  Eva — full body design
//
//  default (arms out):          arms-up:
//
//   ▗▄▄▄▄▄▖                   ╱▗▄▄▄▄▄▖╲
//   ▐◈   ◈▌                    ▐◈   ◈▌
//  ─▐▀▀▀▀▀▌─                   ▐▀▀▀▀▀▌
//   ▐─────▌                    ▐─────▌
//   ╰─────╯                    ╰─────╯
//    ╵ ╵ ╵                      ╵ ╵ ╵   <- hover jets
//
//  look-left / look-right: same arms, eyes shift

export function Eva({ pose = 'default' }: { pose?: EvaPose } = {}): React.ReactNode {
  const b  = chalk.hex(NAVY)
  const bl = chalk.hex(NAVY_LIGHT)
  const g  = chalk.hex(GOLD).bold
  const gh = chalk.hex(GOLD).dim

  const armsUp = pose === 'arms-up'

  // 5-char eye section between ▐ and ▌
  const eyeInner =
    pose === 'look-left'  ? g('◈') + g('◈') + b('   ') :
    pose === 'look-right' ? b('   ') + g('◈') + g('◈') :
                            g('◈') + b('   ') + g('◈')

  return (
    <Box flexDirection="column">
      {/* head top */}
      <Text>
        {armsUp ? bl('╱') : ' '}
        {b('▗▄▄▄▄▄▖')}
        {armsUp ? bl('╲') : ' '}
      </Text>
      {/* eyes */}
      <Text>{b(' ▐')}{eyeInner}{b('▌ ')}</Text>
      {/* head bottom — arm stubs when resting */}
      <Text>
        {armsUp ? ' ' : bl('─')}
        {b('▐▀▀▀▀▀▌')}
        {armsUp ? ' ' : bl('─')}
      </Text>
      {/* torso */}
      <Text>{b(' ▐─────▌ ')}</Text>
      {/* base */}
      <Text>{b(' ╰─────╯ ')}</Text>
      {/* hover jets */}
      <Text>{'  '}{gh('╵')}{' '}{gh('╵')}{' '}{gh('╵')}{'  '}</Text>
    </Box>
  )
}
