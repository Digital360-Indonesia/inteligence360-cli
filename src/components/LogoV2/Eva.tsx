import chalk from 'chalk'
import * as React from 'react'
import { Box, Text } from '../../ink.js'

export type EvaPose = 'default' | 'arms-up' | 'look-left' | 'look-right'

const ELECTRIC   = '#4dabf7'
const ELECTRIC_DIM = '#2563eb'

//  Eva — Electric Blue variant (Option 2)
//
//  default:
//
//   █▒██▒╗
//   █⟨◉◉⟩
//   █▀██▀█
//

export function Eva({ pose = 'default' }: { pose?: EvaPose } = {}): React.ReactNode {
  const e  = chalk.hex(ELECTRIC)
  const eh = chalk.hex(ELECTRIC_DIM).dim

  // 5-char eye section
  const eyeInner =
    pose === 'look-left'  ? e('◉') + e('◉') + '   ' :
    pose === 'look-right' ? '   ' + e('◉') + e('◉') :
                            e('◉') + '   ' + e('◉')

  return (
    <Box flexDirection="column">
      {/* head top */}
      <Text>{e('█▒██▒╗')}</Text>
      {/* eyes */}
      <Text>{e('█')}{eyeInner}{e('⟩')}</Text>
      {/* head bottom */}
      <Text>{e('█▀██▀█')}</Text>
      {/* hover jets */}
      <Text>{'  '}{eh('╵')}{' '}{eh('╵')}{' '}{eh('╵')}{'  '}</Text>
    </Box>
  )
}
